// 聯絡表單後端：POST /api/contact
// 流程：同站來源檢查 → 讀 JSON（≤16 KB）→ 欄位檢查 → 蜜罐 → Turnstile 人機驗證 → 寄信（Resend）。
// 模式（wrangler.jsonc 的 CONTACT_MODE）：
//   preview ＝ 預覽站：全部檢查照做，但不寄信，回 delivered:false（給客戶看網站時表單不會真的寄）。
//   live    ＝ 正式站：要有 RESEND_API_KEY、TURNSTILE_SECRET_KEY（secret）與 CONTACT_TO、CONTACT_FROM（vars）。
// 不存資料庫、不做重試：寄不出去就回錯誤，畫面請訪客直接寫信。

const LIMITS = { name: 100, email: 255, phone: 50, message: 5000 };
const MAX_BODY = 16384;
const LANGS = new Set(['en', 'zh', 'es', 'fr', 'ru', 'ar']);
// Cloudflare 公開的測試金鑰（永遠通過），只給預覽與本機用；正式站換成真的 widget。
const TEST_SECRET_PREFIXES = ['1x0000', '2x0000', '3x0000'];

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' } });
const fail = (code, status = 400, errors) => json({ ok: false, code, ...(errors ? { errors } : {}) }, status);
const localhost = (request) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(request.url).hostname);

const isTestSecret = (key) => TEST_SECRET_PREFIXES.some((p) => String(key).startsWith(p));

/** live 少任何一項設定、或還掛著測試金鑰 → unavailable（畫面「表單暫停服務」），不會退成 preview 讓正式站訪客以為送出了。 */
export function contactMode(env) {
  if (env.CONTACT_MODE === 'live') {
    if (env.RESEND_API_KEY && env.TURNSTILE_SECRET_KEY && env.CONTACT_TO && env.CONTACT_FROM && !isTestSecret(env.TURNSTILE_SECRET_KEY)) return 'live';
    return 'unavailable';
  }
  if (env.CONTACT_MODE === 'preview') return 'preview';
  return 'unavailable';
}

async function readBody(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('type');
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new Error('size');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('size');
  return JSON.parse(text);
}

/** 欄位檢查；回 { data, errors }。欄位名照舊站表單（txt1 姓名、txt2 信箱、txt3 電話、t-area 留言）對應成 name/email/phone/message。 */
export function validateContact(input) {
  const errors = {};
  const data = {};
  const str = (k) => (typeof input?.[k] === 'string' ? input[k].replace(/\r\n?/g, '\n').trim() : '');
  for (const k of ['name', 'email', 'phone', 'message']) {
    data[k] = str(k);
    if (data[k].length > LIMITS[k]) errors[k] = 'too_long';
  }
  if (!data.name) errors.name = 'required';
  if (!data.message) errors.message = 'required';
  if (!data.email) errors.email = 'required';
  else if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) errors.email = 'invalid';
  if (/[\n\r]/.test(data.name) || /[\n\r]/.test(data.email)) errors.name = errors.name || 'invalid';
  data.lang = LANGS.has(input?.lang) ? input.lang : 'en';
  data.requestId = typeof input?.requestId === 'string' && /^[0-9a-f-]{36}$/.test(input.requestId) ? input.requestId : crypto.randomUUID();
  data.page = typeof input?.page === 'string' && input.page.length <= 200 ? input.page : '';
  return { data, errors };
}

async function verifyTurnstile(env, token, ip, hostname, fetcher) {
  if (typeof token !== 'string' || !token || token.length > 2048) return { ok: false, code: 'verify_required' };
  let result;
  try {
    const res = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10000),
    });
    result = await res.json();
  } catch {
    return { ok: false, code: 'verify_unavailable', status: 503 };
  }
  if (!result.success) return { ok: false, code: 'verify_failed' };
  if (!isTestSecret(env.TURNSTILE_SECRET_KEY) && (result.hostname !== hostname || result.action !== 'contact')) return { ok: false, code: 'verify_failed' };
  return { ok: true };
}

/** 信件內容：純文字，給客戶的收件信箱；reply_to＝訪客信箱，客戶直接回信即可。 */
export function mailPayload(data, env, meta) {
  const lines = [
    `網站聯絡表單（aquaskyplus.com /${data.lang}/contact）`,
    '',
    `姓名 Name：${data.name}`,
    `信箱 E-mail：${data.email}`,
    `電話 Phone：${data.phone || '（未填）'}`,
    '',
    '留言 Message：',
    data.message,
    '',
    '——',
    `時間：${meta.time}　來源 IP：${meta.ip}　語系：${data.lang}　頁面：${data.page || '-'}`,
    `編號：${data.requestId}`,
  ];
  return {
    from: env.CONTACT_FROM,
    to: String(env.CONTACT_TO).split(',').map((s) => s.trim()).filter(Boolean),
    reply_to: data.email,
    subject: `[aquaskyplus.com] 網站詢問 Website inquiry｜${data.name}`,
    text: lines.join('\n'),
  };
}

export async function handleContact(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return fail('method', 405);
  const self = new URL(request.url);
  if (request.headers.get('origin') !== self.origin) return fail('origin', 403);
  const mode = contactMode(env);
  if (mode === 'unavailable') return fail('unavailable', 503);

  let input;
  try { input = await readBody(request); } catch { return fail('bad_request', 400); }
  const { data, errors } = validateContact(input);
  if (Object.keys(errors).length) return fail('invalid', 422, errors);
  if (input.website) return fail('invalid', 422); // 蜜罐：真人看不到這欄，有填就是機器

  const ip = request.headers.get('CF-Connecting-IP') || (localhost(request) ? '127.0.0.1' : '');
  if (!ip) return fail('origin', 403);
  if (!env.TURNSTILE_SECRET_KEY) return fail('unavailable', 503);
  const v = await verifyTurnstile(env, input.turnstileToken, ip, self.hostname, fetcher);
  if (!v.ok) return fail(v.code, v.status || 422);

  if (mode === 'preview') return json({ ok: true, delivered: false, mode }, 200);

  const payload = mailPayload(data, env, { ip, time: new Date().toISOString() });
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `aquasky-contact/${data.requestId}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || typeof result.id !== 'string') return fail('send_failed', 502);
  } catch {
    return fail('send_failed', 502);
  }
  return json({ ok: true, delivered: true, mode }, 200);
}

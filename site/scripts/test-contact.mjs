// 聯絡表單後端單元測試：node scripts/test-contact.mjs（用假的 fetch，不連 Turnstile、不寄信）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, validateContact, contactMode, mailPayload } from '../worker/contact.mjs';

const ORIGIN = 'https://aquasky-site.cloundflare1.workers.dev';
const good = { requestId: '11111111-2222-4333-8444-555555555555', name: 'Ann', email: 'ann@example.com', phone: '', message: 'Hello', lang: 'en', turnstileToken: 'tok' };
const envPreview = { CONTACT_MODE: 'preview', TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' };
const envLive = { CONTACT_MODE: 'live', TURNSTILE_SECRET_KEY: 'real', RESEND_API_KEY: 'k', CONTACT_TO: 'a@x.tw, b@x.tw', CONTACT_FROM: 'AQUASKY <web@aquaskyplus.com>' };
const req = (body, { origin = ORIGIN, method = 'POST', ip = '1.2.3.4', type = 'application/json' } = {}) =>
  new Request(`${ORIGIN}/api/contact`, { method, headers: { 'content-type': type, origin, 'CF-Connecting-IP': ip }, ...(method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
const fakeFetch = (verify = { success: true, hostname: 'aquasky-site.cloundflare1.workers.dev', action: 'contact' }, send = { status: 200, body: { id: 'em_1' } }) => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    if (url.includes('siteverify')) return Response.json(verify);
    return Response.json(send.body, { status: send.status });
  };
  f.calls = calls;
  return f;
};

test('mode', () => {
  assert.equal(contactMode({}), 'unavailable');
  assert.equal(contactMode(envPreview), 'preview');
  assert.equal(contactMode({ CONTACT_MODE: 'live' }), 'unavailable'); // live 少設定→暫停服務，不會退成 preview 讓正式站訪客以為送出了
  assert.equal(contactMode({ ...envLive, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }), 'unavailable'); // live 還掛測試金鑰＝沒防機器人，直接暫停
  assert.equal(contactMode(envLive), 'live');
});

test('validate', () => {
  assert.deepEqual(validateContact({ name: 'A', email: 'a@b.co', message: 'm' }).errors, {});
  assert.deepEqual(validateContact({ name: '', email: 'bad', message: '' }).errors, { name: 'required', email: 'invalid', message: 'required' });
  assert.equal(validateContact({ name: 'x'.repeat(101), email: 'a@b.co', message: 'm' }).errors.name, 'too_long');
  assert.equal(validateContact({ name: 'A', email: 'a@b.co', message: 'm', lang: 'xx' }).data.lang, 'en');
  assert.equal(validateContact({ name: 'A', email: 'a@b.co', message: 'm', requestId: 'nope' }).data.requestId.length, 36);
  assert.equal(validateContact({ name: 'A', email: 'a@b.co', message: 'm' }).data.phone, '');
});

test('rejects wrong method / origin / body', async () => {
  assert.equal((await handleContact(req(good, { method: 'GET' }), envPreview)).status, 405);
  assert.equal((await handleContact(req(good, { origin: 'https://evil.example' }), envPreview)).status, 403);
  assert.equal((await handleContact(req('{bad', {}), envPreview)).status, 400);
  assert.equal((await handleContact(req(good, { type: 'text/plain' }), envPreview)).status, 400);
  assert.equal((await handleContact(req(good), {})).status, 503);
});

test('rejects invalid fields and honeypot', async () => {
  const r = await handleContact(req({ ...good, email: 'x' }), envPreview, fakeFetch());
  assert.equal(r.status, 422);
  assert.equal((await r.json()).errors.email, 'invalid');
  assert.equal((await handleContact(req({ ...good, website: 'spam' }), envPreview, fakeFetch())).status, 422);
});

test('turnstile', async () => {
  assert.equal((await (await handleContact(req({ ...good, turnstileToken: '' }), envPreview, fakeFetch())).json()).code, 'verify_required');
  assert.equal((await (await handleContact(req(good), envPreview, fakeFetch({ success: false }))).json()).code, 'verify_failed');
  // 正式金鑰要比 hostname 與 action；測試金鑰不比
  assert.equal((await (await handleContact(req(good), envLive, fakeFetch({ success: true, hostname: 'other.example', action: 'contact' }))).json()).code, 'verify_failed');
  assert.equal((await handleContact(req(good), envPreview, fakeFetch({ success: true, hostname: 'other.example' }))).status, 200);
  const down = async () => { throw new Error('net'); };
  assert.equal((await handleContact(req(good), envPreview, down)).status, 503);
});

test('preview mode: ok but not delivered, never calls Resend', async () => {
  const f = fakeFetch();
  const r = await handleContact(req(good), envPreview, f);
  assert.deepEqual(await r.json(), { ok: true, delivered: false, mode: 'preview' });
  assert.equal(f.calls.filter((c) => c.url.includes('resend')).length, 0);
});

test('live mode: sends via Resend with reply_to and idempotency key', async () => {
  const f = fakeFetch();
  const r = await handleContact(req(good), envLive, f);
  assert.deepEqual(await r.json(), { ok: true, delivered: true, mode: 'live' });
  const send = f.calls.find((c) => c.url.includes('resend'));
  const body = JSON.parse(send.init.body);
  assert.deepEqual(body.to, ['a@x.tw', 'b@x.tw']);
  assert.equal(body.reply_to, 'ann@example.com');
  assert.equal(send.init.headers['Idempotency-Key'], `aquasky-contact/${good.requestId}`);
  assert.match(body.text, /Hello/);
  assert.match(body.subject, /Ann/);
});

test('live mode: Resend failure → 502 send_failed', async () => {
  const r = await handleContact(req(good), envLive, fakeFetch(undefined, { status: 500, body: { message: 'x' } }));
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'send_failed');
});

test('mailPayload strips nothing but keeps newlines in message', () => {
  const p = mailPayload({ name: 'A', email: 'a@b.co', phone: '', message: 'line1\nline2', lang: 'zh', requestId: 'r', page: '/zh/contact' }, envLive, { ip: '1.1.1.1', time: 't' });
  assert.match(p.text, /line1\nline2/);
  assert.equal(p.from, envLive.CONTACT_FROM);
});

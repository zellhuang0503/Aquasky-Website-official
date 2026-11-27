// 【已被 build-faq.mjs 取代】2026-11-27 FAQ 換成溢康 2026-11-26 新版 30 題，這支一次性腳本不要再跑。
// 四語 FAQ 補題：舊站 es／fr／ru／ar 的 FAQ 只有 16 題（en／zh 29 題）。
// 把 ../translation/faq-missing-13.json 的 13 題 AI 譯稿，照 en 的題序插進 src/content/legacy/faq/<lang>.json：
//   - 正文 HTML：每題沿用 en 那一題的版型（題目圖示、news-title／news-content 結構），插在 en 順序的前一題後面
//   - FAQPage JSON-LD：同順序補上
//   - src/data/client-text-edits.json：每一處插入記一筆（verify 比對舊站文字時先套用）
// 只能跑一次；已經是 29 題就跳過。用法（site/）：node scripts/add-faq-missing.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tx = JSON.parse(readFileSync(resolve(root, '../translation/faq-missing-13.json'), 'utf8'));
const enBody = JSON.parse(readFileSync(resolve(root, 'src/content/legacy/faq/en.json'), 'utf8')).bodyHtml;
const editsFile = resolve(root, 'src/data/client-text-edits.json');
const edits = JSON.parse(readFileSync(editsFile, 'utf8'));
// 舊站四語 16 題分別是 en 的第幾題（照順序比對過題意）
const LANG_TO_EN = [1, 2, 6, 7, 8, 9, 13, 14, 15, 16, 17, 19, 21, 22, 23, 24];

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const plain = (s) => decode(s.replace(/<\/?font[^>]*>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<div[^>]*aria-hidden="true"[\s\S]*?<\/div>/g, '').replace(/<[^>]+>/g, ' ')).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const seg = (p) => (typeof p === 'string' ? esc(p) : `<strong>${esc(p.lead)}</strong> ${esc(p.text)}`);
const segText = (p) => (typeof p === 'string' ? p : `${p.lead} ${p.text}`);

// 每一題的範圍：<div class="news-title"> 起，到它的 collapse div 結束
function blocks(body) {
  const out = [];
  for (const m of body.matchAll(/<div class="news-title">/g)) {
    const c = body.indexOf('<div id="collapse_qa_', m.index);
    let depth = 0; const re = /<div\b|<\/div>/g; re.lastIndex = c; let end = -1;
    for (let x; (x = re.exec(body)); ) { depth += x[0] === '</div>' ? -1 : 1; if (depth === 0) { end = x.index + 6; break; } }
    out.push({ start: m.index, end });
  }
  return out;
}
const enBlocks = blocks(enBody);
if (enBlocks.length !== 29) throw new Error(`en FAQ has ${enBlocks.length} questions`);
const enIcon = (n) => enBody.slice(enBlocks[n - 1].start, enBlocks[n - 1].end).match(/<img src="([^"]+)"/)[1];
const enId = (n) => enBody.slice(enBlocks[n - 1].start, enBlocks[n - 1].end).match(/collapse_qa_(\d+)/)[1];

function blockHtml(item, lang) {
  const a = item.a[lang];
  let answer;
  if (item.list) answer = `<ul>\n\t<li>\n\t<p>${seg(a[0])}</p>\n${a.length > 1 ? `\n\t<ul>\n${a.slice(1).map((p) => `\t\t<li>\n\t\t<p>${seg(p)}</p>\n\t\t</li>\n`).join('')}\t</ul>\n` : ''}\t</li>\n</ul>`;
  else if (item.br) answer = `<p>${a.map(seg).join('<br />\n')}</p>`;
  else answer = a.map((p) => `<p>${seg(p)}</p>`).join('\n');
  const id = 100 + Number(enId(item.en));   // 加 100：舊站 es 已經用到 collapse_qa_17，避免重複
  return `<div class="news-title">\n\n        \t\t<div class="row">\n                    <div class="col-xs-2 col-md-2"><img src="${enIcon(item.en)}" class="img-responsive center-block" style="" loading="lazy"></div>\n                    <div class="col-xs-10 col-md-10">${esc(item.q[lang])}</div>\n                </div>\n\n        </div>\n    \t<div id="collapse_qa_${id}" aria-labelledby="qa_head_id_${id}" >\n        \t<div class="news-content">\n\t\t\t${answer}            </div>\n        </div>\n\n    \t`;
}

for (const lang of ['es', 'fr', 'ru', 'ar']) {
  const f = resolve(root, `src/content/legacy/faq/${lang}.json`);
  const c = JSON.parse(readFileSync(f, 'utf8'));
  const lb = blocks(c.bodyHtml);
  if (lb.length === 29) { console.log(`${lang}: already 29 questions, skip`); continue; }
  if (lb.length !== 16) throw new Error(`${lang}: expected 16 questions, got ${lb.length}`);
  lb.forEach((b, k) => { const icon = c.bodyHtml.slice(b.start, b.end).match(/<img src="([^"]+)"/)[1]; if (icon !== enIcon(LANG_TO_EN[k])) throw new Error(`${lang} Q${k + 1}: icon ${icon} ≠ en Q${LANG_TO_EN[k]} ${enIcon(LANG_TO_EN[k])}`); });
  // 依「前一題（en 順序）」分組
  const groups = new Map();
  for (const item of tx.items) {
    const prev = Math.max(...LANG_TO_EN.filter((e) => e < item.en));
    if (!groups.has(prev)) groups.set(prev, []);
    groups.get(prev).push(item);
  }
  let body = c.bodyHtml;
  const pageEdits = [];
  // 從後面往前插，前面的位置才不會跑掉
  for (const [prev, items] of [...groups].sort((x, y) => y[0] - x[0])) {
    const at = lb[LANG_TO_EN.indexOf(prev)].end;
    const ins = '\n\n    \t' + items.map((it) => blockHtml(it, lang)).join('');
    const nb = body.slice(0, at) + ins + body.slice(at);
    const o = plain(body), n = plain(nb);
    let i = 0; while (o[i] === n[i]) i++;
    let start = Math.max(0, o.lastIndexOf(' ', i - 30));
    let tail = 30;
    let from, to;
    for (;;) {
      from = o.slice(start, i + tail).trim();
      to = n.slice(start, i + tail + (n.length - o.length)).trim();
      if (o.split(from).length === 2) break;
      start = Math.max(0, o.lastIndexOf(' ', start - 2)); tail += 20;
    }
    if (o.split(from).join(to) !== n) throw new Error(`${lang}: edit after en Q${prev} does not reproduce the new text`);
    pageEdits.push({ prev, from, to, items });
    body = nb;
  }
  // JSON-LD：照 en 順序重排成 29 題
  const faq = c.legacyJsonLd.find((x) => x['@type'] === 'FAQPage');
  if (faq.mainEntity.length !== 16) throw new Error(`${lang}: JSON-LD has ${faq.mainEntity.length}`);
  const byEn = new Map(LANG_TO_EN.map((e, k) => [e, faq.mainEntity[k]]));
  for (const it of tx.items) byEn.set(it.en, { '@type': 'Question', name: it.q[lang], acceptedAnswer: { '@type': 'Answer', text: it.a[lang].map(segText).join(' ') } });
  faq.mainEntity = [...byEn.keys()].sort((x, y) => x - y).map((k) => byEn.get(k));
  c.bodyHtml = body;
  c._note += ' 2026-11-27：補上舊站本語系沒有的 13 題（en 第 3、4、5、10、11、12、18、20、25–29 題），照目前 en 由 AI 翻譯（來源 translation/faq-missing-13.json），未經審稿；插入位置記在 client-text-edits.json。現在 29 題，題序同 en。';
  writeFileSync(f, JSON.stringify(c, null, 2) + '\n', 'utf8');
  for (const e of pageEdits.reverse()) edits.edits.push({
    source: `梵亞 2026-11-27：四語 FAQ 補題（舊站 ${lang} 只有 16 題）。en 第 ${e.items.map((x) => x.en).join('、')} 題的 AI 譯稿，插在 en 第 ${e.prev} 題後面（translation/faq-missing-13.json）`,
    pages: [`/${lang}/FAQ`], replace: [{ from: e.from, to: e.to }],
  });
  console.log(`${lang}: now ${blocks(body).length} questions, JSON-LD ${faq.mainEntity.length}`);
}
writeFileSync(editsFile, JSON.stringify(edits, null, 2) + '\n', 'utf8');

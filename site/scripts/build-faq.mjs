// FAQ 2026-11-26 新版：Tiffany 11/27 LINE 傳來的 AQUASKY_FAQ_AI_Optimized_2026.11.26_Final.docx（30 題、7 類，只有英文）。
// 英文照原文（../translation/faq-2026-11-26/en.json，由 docx 轉出）；zh／es／fr／ru／ar 是梵亞翻譯（同資料夾 <lang>.json，draft-ai）。
// 這支腳本把六語 JSON 套進 src/content/legacy/faq/<lang>.json：
//   - bodyHtml：外框（標題帶、container）沿用各語系舊頁；7 個分類的 h2、分類圖（FAQ-01～07）、題目圖示（FAQ-08～14）、
//     news-title／news-content 結構都照舊站 FAQ 的版型重新產生（舊站剛好也是 7 類，圖示一類一張）
//   - legacyJsonLd：FAQPage 30 題，與頁面同順序
//   - status：en 改 approved（客戶原文），其他語系 draft-ai（譯稿待審）
// 內文來源改了，verify 不再跟 10/22 封存逐字比，改成跟這份翻譯檔比（src/data/pages/faq.json 的 textSource）。
// 可重跑：改了翻譯檔就再跑一次。用法（site/）：node scripts/build-faq.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(root, '../translation/faq-2026-11-26');
const meta = JSON.parse(readFileSync(resolve(srcDir, 'meta.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function faqLinks(lang) {
  return { selTools: `/${lang}/sel_tools`, download: `/download/${meta.downloadPage[lang]}` };
}
/** 行內標記：**粗體**、[文字](連結代號)。連結代號 {selTools}／{download} 依語系換成站內網址 */
export function inline(s, lang) {
  const links = faqLinks(lang);
  const bold = (t) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return esc(s).replace(/\[(.+?)\]\(\{(\w+)\}\)/g, (_m, text, key) => {
    if (!links[key]) throw new Error(`unknown link {${key}}`);
    return `<a href="${links[key]}">${bold(text)}</a>`;
  }).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
/** 純文字（JSON-LD 與 verify 用）：拿掉標記，清單項目以空格相接 */
export function plainOf(s) {
  return s.replace(/\[(.+?)\]\(\{\w+\}\)/g, '$1').replace(/\*\*/g, '');
}
export function answerPlain(blocks) {
  return blocks.map((b) => (b.ul ? b.ul.map(plainOf).join(' ') : plainOf(b.p))).join(' ');
}
export function loadFaq(lang) {
  const d = JSON.parse(readFileSync(resolve(srcDir, `${lang}.json`), 'utf8'));
  if (d.headings.length !== meta.sections.length) throw new Error(`${lang}: ${d.headings.length} headings`);
  const total = meta.sections.reduce((a, s) => a + s.count, 0);
  if (d.items.length !== total) throw new Error(`${lang}: ${d.items.length} items, expected ${total}`);
  return d;
}

function answerHtml(blocks, lang) {
  return blocks.map((b) => (b.ul
    ? `<ul>\n${b.ul.map((li) => `\t<li>${inline(li, lang)}</li>\n`).join('')}</ul>`
    : `<p>${inline(b.p, lang)}</p>`)).join('\n');
}

function bodyFor(lang, oldBody) {
  const d = loadFaq(lang);
  const start = oldBody.indexOf('<h2 class="news-h2');
  const end = oldBody.lastIndexOf('\n        </div>\n        <div class="col-md-1"></div>');
  if (start < 0 || end < 0) throw new Error(`${lang}: cannot find FAQ frame in old bodyHtml`);
  let n = 0;
  const sections = meta.sections.map((s, k) => {
    const qs = d.items.slice(n, n + s.count).map((it) => {
      n++;
      return `    \t<div class="news-title">\n\n        \t\t<div class="row">\n                    <div class="col-xs-2 col-md-2"><img src="${s.questionIcon}" class="img-responsive center-block" style="" loading="lazy"></div>\n                    <div class="col-xs-10 col-md-10">${inline(it.q, lang)}</div>\n                </div>\n\n        </div>\n    \t<div id="collapse_qa_${n}" aria-labelledby="qa_head_id_${n}" >\n        \t<div class="news-content">\n\t\t\t${answerHtml(it.a, lang)}            </div>\n        </div>\n`;
    }).join('\n');
    return `<h2 class="news-h2 ${s.line}">${esc(d.headings[k])}</h2>\n<div class="row page_spacing-3">\n\t<div class="col-md-3"><img src="${s.image}" class="img-responsive center-block" loading="lazy"></div>\n    <div class="col-md-9">\n${qs}\n    </div>\n</div>\n`;
  }).join('\n');
  return oldBody.slice(0, start) + sections + oldBody.slice(end);
}

function jsonLdFor(lang) {
  const d = loadFaq(lang);
  return [{
    '@type': 'FAQPage',
    '@id': `https://aquaskyplus.com/${lang}/FAQ#faqpage`,
    mainEntity: d.items.map((it) => ({ '@type': 'Question', name: plainOf(it.q), acceptedAnswer: { '@type': 'Answer', text: answerPlain(it.a) } })),
  }];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const lang of meta.langs) {
    const f = resolve(root, `src/content/legacy/faq/${lang}.json`);
    const c = JSON.parse(readFileSync(f, 'utf8'));
    c._note = `FAQ 2026-11-26 版（${meta.source}）。改字改 ../translation/faq-2026-11-26/${lang}.json，再跑 node scripts/build-faq.mjs；不要直接改 bodyHtml。`;
    c.status = lang === 'en' ? 'approved' : 'draft-ai';
    c.bodyHtml = bodyFor(lang, c.bodyHtml);
    c.legacyJsonLd = jsonLdFor(lang);
    writeFileSync(f, JSON.stringify(c, null, 2) + '\n');
    console.log(`${lang}: ${c.legacyJsonLd[0].mainEntity.length} questions`);
  }
}

// 「照抄型」頁面匯入：結構各不相同、數量又少的舊頁（supreme、dl-ce、asme-ht、GIGA-PLUS、accessories…），
// 把舊站 </header> 到 <footer 之間的主體 HTML 整段抄進內容檔，只做這些整理：
//   相對路徑改絕對、去掉 wow 動畫 class、第二個 <h1 class="h1-1"> 改成 <div>、禁止 <script>／<iframe>（出現就停下來人工看）。
// 產出：
//   src/data/pages/<id>.json            語系無關：路徑、頁面 <style>（legacyCss）、要複製的資源
//   src/content/legacy/<id>/{en,zh}.json  每語系：title、description、h1、bodyHtml
// 用法（site/ 目錄）：node scripts/import-legacy-page.mjs [--force] [path ...]   預設 5 頁
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const archive = resolve(root, '..', 'migration-2026-10-22');
const args = process.argv.slice(2);
const force = args.includes('--force');
const ORIGIN = 'https://aquaskyplus.com';
const DEFAULT = ['/supreme', '/dl-ce', '/asme-ht', '/GIGA-PLUS', '/accessories', '/products', '/about', '/feature', '/certification', '/FAQ', '/contact', '/downloadpage', '/videos', '/sel_tools'];
const paths = args.filter((a) => a.startsWith('/'));
const PAGES = (paths.length ? paths : DEFAULT).map((p) => ({ path: p, id: p.slice(1).toLowerCase() }));

const index = new Map();
for (const line of readFileSync(join(archive, 'success.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  index.set(row.url, row);
}
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–');
const text = (s) => unescape(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const absUrl = (u) => (/^(\/|https?:|#|mailto:|tel:|data:)/.test(u) ? u : '/' + u);

function parse(lang, p) {
  const row = index.get(`${ORIGIN}/${lang}${p.path}`);
  if (!row) throw new Error(`archive has no ${lang}${p.path}`);
  const html = readFileSync(join(archive, row.relative_path), 'utf8');
  const title = text(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = unescape(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  // 舊站 <head> 自己寫的 JSON-LD（Product），原樣搬過來；@context 拿掉，由 Seo.astro 的 @graph 統一給
  const headHtml = html.slice(0, html.indexOf('<body'));
  // 有的頁是單一物件（Product），有的是 @graph；攤平後，Organization／WebSite／BreadcrumbList 由新站統一產生，舊的不重複帶
  const legacyJsonLd = [...headHtml.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const parsed = JSON.parse(m[1]);
    const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
    return items.filter((o) => !['Organization', 'WebSite', 'BreadcrumbList'].includes(o['@type']));
  }).map((obj) => {
    delete obj['@context'];
    // 舊站把 BreadcrumbList 塞在 Product.breadcrumb 裡：schema.org 的 Product 沒有這個屬性（那是 WebPage 的），Google 不會讀；
    // 而且舊站的名稱跟選單對不上（zh 的「Home」是英文、「專用配件」vs 選單「安裝配件」）。新站只留 Seo.astro 頂層那份（用選單字樣）。
    delete obj.breadcrumb;
    return obj;
  });
  // 頁面 <style>
  let legacyCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.nav\s*>\s*li\s*>\s*a\s*\{[^}]*\}/g, '')
    .replace(/url\((['"]?)(?!\/|https?:|data:)/g, 'url($1/').replace(/\s+/g, ' ').replace(/\s*}\s*/g, '}\n').trim();
  const extraCss = [...html.matchAll(/<link[^>]+href="([^"]+\.css)(?:\?[^"]*)?"/g)].map((m) => absUrl(m[1]))
    .filter((h) => !['/css/bootstrap.css', '/css/bootstrap.min.css', '/css/style.css', '/css/animation.css', '/js/wow/css/libs/animate.css', '/css/a-hover.css'].includes(h))
    .filter((h) => { const ok = index.has(ORIGIN + h); if (!ok) console.log(`note: ${lang}${p.path} links ${h} but the old site has no such file; skipped`); return ok; });
  // 主體
  let body = html.slice(html.indexOf('</header>') + '</header>'.length, html.indexOf('<footer'));
  body = body.replace(/<!--[\s\S]*?-->/g, '');
  if (/<script|<iframe|<object|<embed/i.test(body)) throw new Error(`${lang}${p.path}: body has script/iframe — handle by hand`);
  if (/<form/i.test(body) && p.id !== 'contact') throw new Error(`${lang}${p.path}: unexpected <form>`);
  body = body.replace(/<div id="return-to-top"[\s\S]*$/, '');
  if (p.id === 'contact') {
    // 聯絡表單：舊站靠 PHP 驗證碼（recode.php）與 csrf 送到後端，新站是靜態站，先把這些拿掉、action 改 #；
    // 送出功能上線前另接 Worker API（整體規劃 §7.2：表單 Worker＋Turnstile）。表單外觀保留。
    const before = body;
    body = body
      .replace(/<div class="col-xs-6 col-sm-4">\s*<input[^>]*chk_code[^>]*>\s*<\/div>\s*<div class="col-xs-6 col-sm-8">[\s\S]*?<\/div>/, '')
      .replace(/<input type="hidden" name="csrf"[^>]*>/, '')
      .replace(/<div style="position:absolute;left:-9999px;top:-9999px;"[\s\S]*?<\/div>\s*(?=<\/form>)/, '')
      .replace(/<form([^>]*)action="[^"]*"/, '<form$1action="#" data-todo="form-not-wired"');
    if (before === body || /chk_code|csrf|recode\.php|onclick/.test(body)) throw new Error(`${lang}${p.path}: contact form cleanup did not apply`);
  }
  const h1s = [...body.matchAll(/<h1([^>]*)>([\s\S]*?)<\/h1>/g)];
  const h1 = h1s.map((m) => text(m[2])).find((t) => t) ?? '';
  // 只留第一個有字的 h1；其他 h1（包標題圖的）改成 div
  let seenMain = false;
  body = body.replace(/<h1([^>]*)>([\s\S]*?)<\/h1>/g, (m, attrs, inner) => {
    if (!seenMain && text(inner)) { seenMain = true; return m; }
    return `<div${attrs.includes('class=') ? attrs : ` class="h1-1"${attrs}`}>${inner}</div>`;
  });
  // 舊站每頁有一段 JS：#ImgAutoResponsive img 清掉 width/height、加 img-responsive center-block；這裡在匯入時做同樣的事
  body = body.replace(/(<div id="ImgAutoResponsive"[^>]*>)([\s\S]*?)(<\/div>)/g, (_m, open, inner, close) =>
    open + inner.replace(/<img([^>]*)>/g, (_i, attrs) => {
      let a = attrs.replace(/\sstyle="[^"]*"/g, '').replace(/\s(width|height)="[^"]*"/g, '').replace(/\s*\/\s*$/, '');
      if (/class="/.test(a)) a = a.replace(/class="([^"]*)"/, (_c, cls) => `class="${[...new Set([...cls.split(/\s+/), 'img-responsive', 'center-block'])].filter(Boolean).join(' ')}"`);
      else a += ' class="img-responsive center-block"';
      return `<img${a}>`;
    }) + close);
  body = body
    .replace(/\s(?:wow|fadeIn\w*|fadeOut\w*|zoomIn\w*|bounceIn\w*)(?=[\s"])/g, '')
    .replace(/\sdata-wow-[\w-]+="[^"]*"/g, '')
    .replace(/(src|href)="([^"]+)"/g, (_m, k, v) => `${k}="${absUrl(v)}"`)
    .replace(/url\((['"]?)(?!\/|https?:|data:)/g, 'url($1/')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // 舊站有的頁少關一個 div（accessories）；補上，否則瀏覽器會把頁尾吃進去（HYDRO-PLUS 經典頁同樣處理，README 有列）
  const opens = (body.match(/<div\b/g) || []).length, closes = (body.match(/<\/div>/g) || []).length;
  if (opens > closes) body += '\n' + '</div>'.repeat(opens - closes) + ' <!-- 補舊站少關的 div -->';
  if (closes > opens) throw new Error(`${lang}${p.path}: more </div> than <div>`);
  const assets = new Set();
  for (const m of body.matchAll(/(?:src|href)="(\/[^"]+\.(?:png|jpe?g|webp|gif|svg|pdf))"/gi)) assets.add(m[1]);
  for (const m of (body + legacyCss).matchAll(/url\(['"]?(\/[^'")]+)['"]?\)/g)) assets.add(m[1]);
  return { row, title, description, legacyCss, extraCss, h1, body, assets, hasH1: !!h1, legacyJsonLd };
}

// 舊站資料疑點（頁面照原樣，不改；要請客戶確認）。2026-10-24 審查官列出。
const DATA_QUESTIONS = {
  'dl-ce': ['規格表第 5 列型號寫「DL 750/16 CE」，數值卻是 5000 L／10 bar／Ø1550／H3315，且與第 6 列型號重複；應為 DL 5000/10 CE？', '小標「Procuct Specifications」錯字（舊站原樣）。'],
  'asme-ht': ['HTL-1000 寫 210.0 Gal／800 L，與 HTL-800 的容量相同（只有直徑 750 對 800 不同）。', 'HTL-300 的加侖寫「80」，其他列都有小數「.0」。', 'CHARACTERISTICS 寫工作溫度 -29°／+93°C，規格表 Maximum Temperature 卻是 115。', '小標「Procuct Specifications」錯字（舊站原樣）。'],
  'giga-plus': ['GIGA-60 寫 60 L＝14 gal（換算約 15.9）；GIGA-100 寫 100 L＝28 gal（換算約 26.4）。'],
  accessories: ['「Horizontal Pump Stand」與「Vertical Pressure Tank Stand」用同一張圖 Vertical Pressure Tank Stand.jpg。'],
  supreme: [],
};

let written = 0;
for (const p of PAGES) {
  const en = parse('en', p);
  const zh = parse('zh', p);
  if (en.legacyCss !== zh.legacyCss) console.log(`note: ${p.path} en/zh page <style> differ; using en`);
  const page = {
    _note: `照抄型頁面（舊站結構獨特，不做資料化）。主體 HTML 在 src/content/legacy/${p.id}/<lang>.json 的 bodyHtml；本檔是語系無關的部分。來源：2026-10-22 封存 /en${p.path} 與 /zh${p.path}。`,
    id: p.id,
    path: p.path,
    template: 'legacy',
    source: { url: `${ORIGIN}/en${p.path}`, archive: 'migration-2026-10-22', retrieved: en.row.retrieved_at.slice(0, 10) },
    legacyCss: en.legacyCss,
    extraCss: en.extraCss,
    assets: [...new Set([...en.assets, ...zh.assets])],
    dataQuestions: DATA_QUESTIONS[p.id] ?? [],
  };
  const content = (lang, d) => ({
    _note: lang === 'zh'
      ? `舊站 /zh${p.path} 已上線的中文頁主體，整段照抄（含它的產品列）。改文字直接改 bodyHtml。${d.hasH1 ? '' : '舊站這頁沒有 h1，頁面會補一個看不見的 h1＝title。'}`
      : `Old /en${p.path} page body copied verbatim (incl. its product line). Edit bodyHtml to change text.${d.hasH1 ? '' : ' The old page had no h1; the page adds a visually-hidden h1 = title.'}`,
    template: 'legacy',
    lang,
    status: 'approved-legacy',
    seo: { title: d.title, description: d.description },
    h1: d.h1 || d.title,
    hasVisibleH1: d.hasH1,
    legacyJsonLd: d.legacyJsonLd,
    bodyHtml: d.body,
  });
  for (const [rel, data] of [[`src/data/pages/${p.id}.json`, page], [`src/content/legacy/${p.id}/en.json`, content('en', en)], [`src/content/legacy/${p.id}/zh.json`, content('zh', zh)]]) {
    const target = resolve(root, rel);
    if (existsSync(target) && !force) { console.log(`skip (exists): ${rel}`); continue; }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
    written++;
  }
  console.log(`${p.id}: en body ${en.body.length} chars, zh ${zh.body.length}, h1 "${en.h1.slice(0, 40)}", assets ${page.assets.length}, extraCss ${page.extraCss.join(',') || '-'}`);
}
console.log(`wrote ${written} files`);

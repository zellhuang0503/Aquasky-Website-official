// 建置後驗收：只讀 dist/ 與資料檔，不連網。用法（site/ 目錄）：npm run build && npm run verify
// 檢查：
//  1. 舊站網址對應的檔案都有產生（/、/en、/zh、/en/LQCOL-PLUS、/zh/LQCOL-PLUS）
//  2. 每頁 <html lang>、唯一 <h1>、title、description、canonical、hreflang、JSON-LD 可解析
//  3. 規格表的每個數字與 src/data/products/lqcol-plus.json 一致（en、zh 都是），JSON-LD 的型號數＝表格列數
//  4. 頁內引用的圖片／PDF 都存在於 dist
//  5. 內部連結：列出指向「還沒搬的頁」的連結（預覽期正常，不算失敗）
//  6. 預覽階段一定有 noindex；production 階段一定沒有
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const product = JSON.parse(readFileSync(join(root, 'src/data/products/lqcol-plus.json'), 'utf8'));
const stage = process.env.SITE_STAGE === 'production' ? 'production' : 'preview';
// 封存的舊站頁（只讀）：拿來比 DM 張數等「新站自己的資料檔比不出來」的東西
const archiveDir = join(root, '..', 'migration-2026-10-22');
let archiveIndex = null;
function archivedPage(code, path) {
  if (!existsSync(join(archiveDir, 'success.jsonl'))) return null;
  if (!archiveIndex) {
    archiveIndex = new Map();
    for (const line of readFileSync(join(archiveDir, 'success.jsonl'), 'utf8').split('\n')) {
      if (line.trim()) { const r = JSON.parse(line); archiveIndex.set(r.url, r.relative_path); }
    }
  }
  const rel = archiveIndex.get(`https://aquaskyplus.com/${code}${path}`);
  return rel ? readFileSync(join(archiveDir, rel), 'utf8') : null;
}

import { readdirSync } from 'node:fs';
const LANGS = [['en', 'en'], ['zh', 'zh-Hant']];
const products = readdirSync(join(root, 'src/data/products')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'src/data/products', f), 'utf8')));
const legacyPages = existsSync(join(root, 'src/data/pages'))
  ? readdirSync(join(root, 'src/data/pages')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(root, 'src/data/pages', f), 'utf8')))
  : [];
const PAGES = [
  { url: '/', file: 'index.html', lang: 'en' },
  { url: '/en', file: 'en.html', lang: 'en' },
  { url: '/zh', file: 'zh.html', lang: 'zh-Hant' },
  ...products.flatMap((p) => LANGS.map(([code, htmlLang]) => ({
    url: `/${code}${p.path}`, file: `${code}${p.path}.html`, lang: htmlLang, code,
    series: p.template === 'lqcol', classic: p.template === 'classic' ? p : null,
  }))),
  ...legacyPages.flatMap((p) => LANGS.map(([code, htmlLang]) => ({
    url: `/${code}${p.path}`, file: `${code}${p.path}.html`, lang: htmlLang, code, legacy: p,
  }))),
];
const built = new Set(PAGES.map((p) => p.url));
let problems = 0;
const fail = (msg) => { problems++; console.log('✗ ' + msg); };
const pending = new Map();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

for (const page of PAGES) {
  const path = join(dist, page.file);
  if (!existsSync(path)) { fail(`${page.url}: ${page.file} not built`); continue; }
  const html = readFileSync(path, 'utf8');
  const where = page.url;
  const htmlLang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
  if (htmlLang !== page.lang) fail(`${where}: <html lang="${htmlLang}"> expected ${page.lang}`);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(`${where}: ${h1s.length} <h1>`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  if (!title) fail(`${where}: no <title>`);
  const desc = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  if (!desc || desc.length < 40) fail(`${where}: description missing or short`);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const expectCanon = 'https://aquaskyplus.com' + (page.url === '/' ? '/en' : page.url);
  if (canonical !== expectCanon) fail(`${where}: canonical ${canonical} expected ${expectCanon}`);
  const hreflangs = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1]);
  for (const h of ['en', 'zh-Hant', 'x-default']) if (!hreflangs.includes(h)) fail(`${where}: hreflang ${h} missing`);
  const noindex = /<meta name="robots" content="noindex/.test(html);
  if (stage === 'preview' && !noindex) fail(`${where}: preview build without noindex`);
  if (stage === 'production' && noindex) fail(`${where}: production build has noindex`);
  if (stage === 'production' && !html.includes('googletagmanager')) fail(`${where}: production build without GA4`);
  if (stage === 'preview' && html.includes('googletagmanager')) fail(`${where}: preview build loads GA4`);

  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let graph = [];
  for (const m of ld) {
    try { graph = graph.concat(JSON.parse(m[1])['@graph'] || []); } catch (e) { fail(`${where}: JSON-LD parse error ${e.message}`); }
  }
  if (!graph.some((n) => n['@type'] === 'Organization')) fail(`${where}: JSON-LD Organization missing`);

  // 引用資源
  for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]+\.(?:png|jpe?g|webp|gif|svg|pdf|css|js))"/g)) {
    const file = join(dist, decodeURIComponent(m[1]));
    if (!existsSync(file)) fail(`${where}: missing asset ${m[1]}`);
  }
  // 內部頁面連結
  for (const m of html.matchAll(/<a[^>]+href="(\/[^"#?]*)"/g)) {
    const target = m[1];
    if (/\.(png|jpe?g|webp|pdf)$/.test(target)) continue;
    if (built.has(target)) continue;
    pending.set(target, (pending.get(target) || 0) + 1);
  }

  if (page.series) {
    // 規格表數字＝產品 JSON
    const tbodies = [...html.matchAll(/<table class="series-spec"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/g)].map((m) => m[1]);
    const expectRows = [product.specs.carbonSteel, product.specs.stainlessSteel];
    if (tbodies.length !== 2) fail(`${where}: expected 2 spec tables, got ${tbodies.length}`);
    tbodies.forEach((tb, ti) => {
      const trs = [...tb.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => decode(c[1].trim())));
      const exp = expectRows[ti] || [];
      if (trs.length !== exp.length) fail(`${where}: table ${ti + 1} has ${trs.length} rows, data has ${exp.length}`);
      trs.forEach((cells, ri) => {
        const r = exp[ri];
        if (!r) return;
        const want = [r.model, r.volumeL, r.volumeGal, r.diameterCm, r.diameterIn, r.heightCm, r.heightIn, r.boxLengthCm, r.boxLengthIn,
          r.boxWidthCm, r.boxWidthIn, r.boxHeightCm, r.boxHeightIn, r.netWeightKg, r.netWeightLb, r.grossWeightKg, r.grossWeightLb,
          r.shippingVolumeCuf, r.connection];
        want.forEach((w, ci) => {
          const got = cells[ci];
          const ok = got === String(w);   // 字串逐字比（"14" 與 "14.0" 不同）
          if (!ok) fail(`${where}: ${r.model} column ${ci + 1} shows "${got}", data is "${w}"`);
        });
      });
    });
    const group = graph.find((n) => n['@type'] === 'ProductGroup');
    const models = [...product.specs.carbonSteel, ...product.specs.stainlessSteel].map((m) => m.model);
    if (!group) fail(`${where}: ProductGroup missing`);
    else {
      const skus = (group.hasVariant || []).map((v) => v.sku);
      if (skus.join() !== models.join()) fail(`${where}: JSON-LD skus ${skus} != ${models}`);
    }
    if (!graph.some((n) => n['@type'] === 'FAQPage' && n.mainEntity?.length === 7)) fail(`${where}: FAQPage with 7 questions missing`);
    for (const k of ['factoryPrecharge', 'maxWorkingPressure']) {
      if (!html.includes(product.specs.common[k])) fail(`${where}: ${k} "${product.specs.common[k]}" not on page`);
    }
  }
  if (page.classic) {
    // 經典系列頁：en 的型號數＝資料檔；zh 沒型號清單但要有介紹文；ProductGroup 的型號數＝資料檔
    const models = page.classic.groups.flatMap((g) => g.models);
    const h3s = [...html.matchAll(/<h3 class="page_pd_name_p2">([^<]*)<\/h3>/g)].map((m) => decode(m[1]));
    const content = JSON.parse(readFileSync(join(root, `src/content/series/${page.classic.id}/${page.code}.json`), 'utf8'));
    if (content.showModels) {
      if (h3s.join() !== models.map((m) => m.model).join()) fail(`${where}: model list on page ${h3s.length} != data ${models.length}`);
    } else if (h3s.length) fail(`${where}: content says no model grid but page has ${h3s.length}`);
    if (!html.includes('class="pd-about-text')) fail(`${where}: about text block missing`);
    const group = graph.find((n) => n['@type'] === 'ProductGroup');
    if (!group) fail(`${where}: ProductGroup missing`);
    else {
      // 頁面有型號清單才輸出 hasVariant（zh 沒有清單就不標）
      const expectVariants = content.showModels ? models.length : 0;
      if ((group.hasVariant || []).length !== expectVariants) fail(`${where}: JSON-LD variants ${(group.hasVariant || []).length} != ${expectVariants}`);
    }
    for (const e of content.edmImages || []) if (!html.includes(`src="${e.src}"`)) fail(`${where}: DM image ${e.src} not on page`);
    // DM 張數要等於封存裡同一頁 #ImgAutoResponsive 的 <img> 數（不能只比內容檔自己）
    const archived = archivedPage(page.code, page.classic.path);
    if (archived) {
      const block = archived.replace(/<!--[\s\S]*?-->/g, '').match(/<div id="ImgAutoResponsive"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
      // 正規化後逐字比結構：<p …>、</p>、&nbsp;、<img src>；舊站 img 的尺寸與 class 由其 JS 改掉，所以只留 src
      const norm = (s) => s.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (_m, src) => `<img ${src.startsWith('/') ? src : '/' + src}>`)
        .replace(/<p[^>]*>/g, '<p>').replace(/\s+/g, '').trim();
      const gotBlock = html.match(/<div id="ImgAutoResponsive"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
      if (norm(block) !== norm(gotBlock)) fail(`${where}: DM block structure differs from archived page\n    old: ${norm(block).slice(0, 160)}\n    new: ${norm(gotBlock).slice(0, 160)}`);
    }
  }
  if (page.legacy) {
    // 照抄型：<main> 的純文字要跟封存舊頁 </header>…<footer 之間的純文字一字不差
    const archived = archivedPage(page.code, page.legacy.path);
    if (!archived) fail(`${where}: archived page not found for text comparison`);
    else {
      const plain = (s) => decode(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
      const oldText = plain(archived.slice(archived.indexOf('</header>') + 9, archived.indexOf('<footer')));
      const mainHtml = html.match(/<main id="main">([\s\S]*?)<\/main>/)?.[1] ?? '';
      const content = JSON.parse(readFileSync(join(root, `src/content/legacy/${page.legacy.id}/${page.code}.json`), 'utf8'));
      let newText = plain(mainHtml);
      if (!content.hasVisibleH1) newText = newText.replace(plain(content.h1), '').replace(/\s+/g, ' ').trim();   // 補的隱藏 h1 不算
      if (oldText !== newText) {
        let i = 0; while (i < oldText.length && oldText[i] === newText[i]) i++;
        fail(`${where}: body text differs from archived page at char ${i}
    old: …${oldText.slice(Math.max(0, i - 40), i + 80)}
    new: …${newText.slice(Math.max(0, i - 40), i + 80)}`);
      }
    }
  }
  console.log(`✓ ${where}  ${title?.slice(0, 70)}`);
}

if (existsSync(join(dist, 'sitemap-index.xml'))) console.log('✓ sitemap-index.xml');
else fail('sitemap-index.xml missing');

console.log(`\n內部連結指向尚未搬遷的頁（預覽期正常）：${pending.size} 個路徑`);
for (const [p, n] of [...pending].sort()) console.log(`  ${p} (${n})`);
console.log(problems ? `\n${problems} problem(s), stage=${stage}` : `\nOK: ${PAGES.length} pages verified, stage=${stage}`);
process.exit(problems ? 1 : 0);

// 一次性匯入「經典模板」系列頁（PUMPLUS、RO-PLUS、THERMAL-PLUS、HYDRO-PLUS、PREMIUM-PLUS、MEGA-PLUS、SOLAR-PLUS）：
// 從 ../migration-2026-10-22 封存的 en／zh 頁面抽出 h1、介紹文、型號清單、DM 圖、頁面 <style>，寫成新站資料檔。
// 舊站 zh 頁沒有型號清單（只有介紹文＋DM 圖），照原樣保留（黃老闆 2026-10-24：先以原本狀態呈現）。
// 產出：
//   src/data/products/<id>.json           語系無關：型號、圖片、連結、頁面專用 CSS、要複製的資源
//   src/content/series/<id>/{en,zh}.json  文字（都是舊站已上線文字，status approved-legacy）
// 匯入後以產出檔為準；重跑加 --force 會覆蓋。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const archive = resolve(root, '..', 'migration-2026-10-22');
const force = process.argv.includes('--force');
const ORIGIN = 'https://aquaskyplus.com';

const SERIES = [
  { id: 'pumplus', path: '/PUMPLUS', key: 'PUMPLUS' },
  { id: 'ro-plus', path: '/RO-PLUS', key: 'RO-PLUS' },
  { id: 'thermal-plus', path: '/THERMAL-PLUS', key: 'THERMAL-PLUS' },
  { id: 'hydro-plus', path: '/HYDRO-PLUS', key: 'HYDRO-PLUS' },
  { id: 'premium-plus', path: '/PREMIUM-PLUS', key: 'PREMIUM-PLUS' },
  { id: 'mega-plus', path: '/MEGA-PLUS', key: 'MEGA-PLUS' },
  { id: 'solar-plus', path: '/SOLAR-PLUS', key: 'SOLAR-PLUS' },
];

const index = new Map();
for (const line of readFileSync(join(archive, 'success.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  index.set(row.url, row);
}
const page = (lang, path) => {
  const row = index.get(`${ORIGIN}/${lang}${path}`);
  if (!row) throw new Error(`archive has no ${lang}${path}`);
  return { html: readFileSync(join(archive, row.relative_path), 'utf8'), row };
};
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '’').replace(/&ndash;/g, '–');
const text = (s) => unescape(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const abs = (src) => (src.startsWith('/') || src.startsWith('http') ? src : '/' + src);

function parse(lang, s) {
  const { html, row } = page(lang, s.path);
  let h = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const title = text(h.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
  const description = unescape(h.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  // 頁面 <style>：丟掉選單那一行，相對路徑改絕對
  const styles = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  let legacyCss = styles.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.nav\s*>\s*li\s*>\s*a\s*\{[^}]*\}/g, '');
  legacyCss = legacyCss.replace(/url\((['"]?)(?!\/|https?:)/g, 'url($1/').replace(/\s+/g, ' ').replace(/\s*}\s*/g, '}\n').trim();
  const cssAssets = [...legacyCss.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)].map((m) => m[1]);
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  const start = h.indexOf('<div class="h1-custom-style');
  const end = h.indexOf('id="pd-more-info"');
  if (start < 0 || end < 0) throw new Error(`${lang}${s.path}: main block not found`);
  const main = h.slice(start, end).replace(/\s+/g, ' ');
  const h1 = text(main.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const titleImg = main.match(/pd-aquasky-text[^>]*>\s*<h1[^>]*>\s*<img[^>]+src="([^"]+)"[^>]*class="([^"]+)"/);
  // 舊站有沒有 .pd-aquasky-text 外框（PREMIUM-PLUS 整段被註解掉＝沒有）；MEGA-PLUS 把它包在 <p> 裡、後面再一個 <p>&nbsp;</p>，
  // 瀏覽器會各多出一個空段落的間距，照抄這些純間距標籤（只允許 <p>、</p>、&nbsp;）
  const titleStart = main.indexOf('<div class="pd-aquasky-text');
  const hasTitleBlock = titleStart >= 0;
  let spacerBefore = '', spacerAfter = '';
  if (hasTitleBlock) {
    const before = main.slice(Math.max(0, titleStart - 80), titleStart).match(/((?:<p>\s*)+)$/);
    spacerBefore = before ? before[1].trim() : '';
    const titleEnd = main.indexOf('</h1>', titleStart);
    const closeDiv = main.indexOf('</div>', titleEnd) + '</div>'.length;
    const after = main.slice(closeDiv, closeDiv + 200).match(/^((?:\s*(?:<\/p>|<p>&nbsp;<\/p>|<p>\s*<\/p>))+)/);
    spacerAfter = after ? after[1].replace(/\s+/g, ' ').trim() : '';
  }
  const aboutHeading = text(main.match(/<h2 class="h2_2hline lang_rtl">([\s\S]*?)<\/h2>/)?.[1] ?? '');
  // 標題圖之後、介紹文之前的大圖區塊：<div class="pd-aquasky-<系列>">（可能是空的 div，背景在 CSS）
  const headSeg = main.slice(0, main.indexOf('<h2 class="h2_2hline lang_rtl">'));
  const heroBlocks = [...headSeg.matchAll(/<div class="([^"]+)">\s*(?:<img[^>]+src="([^"]+)"[^>]*class="([^"]+)"[^>]*>)?\s*<\/div>/g)]
    .filter((m) => !m[1].startsWith('pd-aquasky-text') && !m[1].startsWith('container'))
    .map((m) => ({ class: m[1], image: m[2] ? { src: abs(m[2]), class: m[3] } : null }));
  // PREMIUM-PLUS：h1 色條與 #pd-container-01 之間有一條滿版橫幅圖
  const pre = main.slice(0, main.indexOf('id="pd-container-01"')).match(/<div style="background-color:(#[0-9A-Fa-f]{3,6});">\s*<img[^>]+src="([^"]+)"[^>]*class="([^"]+)"[^>]*>\s*<\/div>/);
  const preBanner = pre ? { bg: pre[1], image: { src: abs(pre[2]), class: pre[3] } } : null;
  const aboutRaw = main.match(/pd-about-text[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  if (/<(?!br\b)[a-z]/i.test(aboutRaw)) throw new Error(`${lang}${s.path}: about text contains tags, extend the importer: ${aboutRaw.slice(0, 120)}`);
  const about = unescape(aboutRaw.replace(/<br\s*\/?>/gi, '\n')).replace(/[ \t]+/g, ' ').trim();
  // 型號清單：每個 <h2 …margin…>標題</h2> 後面接一個 .row.page_pd_item
  const groups = [];
  const parts = main.split(/<div class="(row page_pd_item[^"]*)">/);   // [前文, rowClass, 內容, rowClass, 內容…]
  const chunks = [parts[0]];
  const rowClasses = [];
  for (let i = 1; i < parts.length; i += 2) { rowClasses.push(parts[i]); chunks.push(parts[i + 1]); }
  for (let i = 1; i < chunks.length; i++) {
    const headings = [...chunks[i - 1].matchAll(/<h2 class="h2_2hline h2_2hline_margin2?">([\s\S]*?)<\/h2>/g)];
    const heading = text(headings.at(-1)?.[1] ?? '');
    const rowClass = rowClasses[i - 1];
    const colClass = chunks[i].match(/^\s*<div class="(col-[^"]+)">/)?.[1] ?? 'col-6 col-md-3';
    const itemWrapper = /^\s*<div class="col-[^"]+">\s*<div class="pd_item_margin">/.test(chunks[i]);
    const models = [...chunks[i].matchAll(/<a href="([^"]+)">\s*<img[^>]+src="([^"]+)"[^>]*>\s*<p class="page_pd_name_p1">([^<]*)<\/p>\s*<h3 class="page_pd_name_p2">([^<]*)<\/h3>/g)].map((m) => {
      const volumeText = text(m[3]);
      const nums = volumeText.match(/Liter\s*([\d.]+)\s*\/\s*Gal\s*([\d.]+)/);
      return { model: text(m[4]), volumeText, volumeL: nums ? Number(nums[1]) : null, volumeGal: nums ? Number(nums[2]) : null, image: abs(m[2]), detailPath: m[1].replace(/^\/en/, '') };
    });
    if (!models.length) throw new Error(`${lang}${s.path}: model row ${i} parsed 0 models`);
    groups.push({ heading, rowClass, colClass, itemWrapper, models });
  }
  // DM 圖：#ImgAutoResponsive 裡所有 <img>（舊站有的帶 width/height 寫在 style，有的只有 img-responsive；舊站的 JS 會把尺寸清掉、一律 img-responsive）
  const dmBlock = main.match(/<div id="ImgAutoResponsive"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  const edm = [...dmBlock.matchAll(/<img([^>]+)>/g)].map((m) => {
    const attrs = m[1];
    const src = attrs.match(/src="([^"]+)"/)?.[1];
    const size = attrs.match(/style="width:\s*(\d+)px;\s*height:\s*(\d+)px/);
    return { src: abs(src), ...(size ? { width: Number(size[1]), height: Number(size[2]) } : {}) };
  });
  if (/ImgAutoResponsive/.test(main) && !edm.length) throw new Error(`${lang}${s.path}: ImgAutoResponsive present but no img parsed`);
  return { row, title, description, legacyCss, cssAssets, h1, heroBlocks, preBanner, hasTitleBlock, spacerBefore, spacerAfter, titleImage: titleImg ? { src: abs(titleImg[1]), class: titleImg[2] } : null, aboutHeading, about, groups, edm };
}

let written = 0;
for (const s of SERIES) {
  const en = parse('en', s);
  const zh = parse('zh', s);
  if (!en.groups.length) throw new Error(`${s.id}: no model groups on en page`);
  const assets = new Set([...en.cssAssets, ...zh.cssAssets]);
  if (en.titleImage) assets.add(en.titleImage.src);
  for (const b of en.heroBlocks) if (b.image) assets.add(b.image.src);
  if (en.preBanner) assets.add(en.preBanner.image.src);
  for (const g of en.groups) for (const m of g.models) assets.add(m.image);
  for (const e of zh.edm) assets.add(e.src);
  const product = {
    _note: `語系無關的產品資料，從 2026-10-22 封存的 /en${s.path} 抄出；型號清單與圖片未經客戶重新核對。legacyCss 是舊頁的 <style>，照抄只改成絕對路徑。改型號只改這裡。`,
    id: s.id,
    series: s.key,
    path: s.path,
    template: 'classic',
    source: { url: `${ORIGIN}/en${s.path}`, archive: 'migration-2026-10-22', retrieved: en.row.retrieved_at.slice(0, 10) },
    legacyCss: en.legacyCss,
    titleBlock: { present: en.hasTitleBlock, spacerBefore: en.spacerBefore, spacerAfter: en.spacerAfter },
    titleImage: en.titleImage,
    heroBlocks: en.heroBlocks,
    preBanner: en.preBanner,
    groups: en.groups.map((g, i) => ({ key: `g${i + 1}`, rowClass: g.rowClass, colClass: g.colClass, itemWrapper: g.itemWrapper, models: g.models })),
    // 舊站資料疑點（照原樣保留，不改）：公升換加侖對不上的型號自動列出，要請客戶確認
    dataQuestions: en.groups.flatMap((g) => g.models).filter((m) => m.volumeL !== null && m.volumeGal !== null).flatMap((m) => {
      const expected = m.volumeL * 0.2641721;
      const off = Math.abs(m.volumeGal - expected);
      return off > Math.max(0.06, expected * 0.08)
        ? [`${m.model} 舊站寫「${m.volumeText}」，${m.volumeL} L 換算約 ${expected.toFixed(2)} gal，要請客戶確認。`]
        : [];
    }),
    assets: [...assets],
  };
  const content = (lang, p) => ({
    _note: lang === 'zh'
      ? `舊站 /zh${s.path} 已上線的中文文字，照抄。舊站中文頁沒有型號清單${p.edm.length ? '、改放 DM 圖' : ''}，先照原樣（黃老闆 2026-10-24）。`
      : `English text verbatim from the 2026-10-22 archive of /en${s.path}.`,
    template: 'classic',
    lang,
    status: 'approved-legacy',
    seo: { title: p.title, description: p.description },
    h1: p.h1,
    about: { heading: p.aboutHeading, body: p.about },
    showModels: p.groups.length > 0,
    groupHeadings: p.groups.map((g) => g.heading),
    edmImages: p.edm.map((e, i) => ({ ...e, alt: `${s.key} DM ${i + 1}` })),
  });
  const outputs = [
    [`src/data/products/${s.id}.json`, product],
    [`src/content/series/${s.id}/en.json`, content('en', en)],
    [`src/content/series/${s.id}/zh.json`, content('zh', zh)],
  ];
  for (const [rel, data] of outputs) {
    const target = resolve(root, rel);
    if (existsSync(target) && !force) { console.log(`skip (exists): ${rel}`); continue; }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
    written++;
  }
  console.log(`${s.id}: en groups ${en.groups.map((g) => g.models.length).join('+')} models, zh ${zh.groups.length ? 'has grid' : 'no grid'}, edm ${zh.edm.length}, assets ${assets.size}`);
}
console.log(`wrote ${written} files`);

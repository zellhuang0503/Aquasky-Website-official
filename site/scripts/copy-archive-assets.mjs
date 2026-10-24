// 從 ../migration-2026-10-22 封存把新站需要的舊站圖片／PDF 複製到 public/，路徑照舊站網址保留。
// 只讀封存檔，不連網。用法（在 site/ 目錄）：node scripts/copy-archive-assets.mjs [--archive ../migration-2026-10-22]
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const archive = resolve(here, '..', args[args.indexOf('--archive') + 1] || '../migration-2026-10-22');
const publicDir = resolve(here, '..', 'public');
const ORIGIN = 'https://aquaskyplus.com';

/** [舊站路徑, public 內目標路徑（省略＝相同）] */
const ASSETS = [
  // 舊站 CSS（照抄沿用；這幾個會進 Git，其他圖片不進）
  ['/css/bootstrap.min.css'],
  ['/css/style.css'],
  ['/css/series_content.css'],
  ['/css/a-hover.css'],
  ['/css/bootstrap-grid.min.css'],   // 經典系列頁用的 Bootstrap 4 grid（col-6 col-md-3）
  ['/css/all.min.css'],
  ['/webfonts/fa-solid-900.woff2'],
  ['/webfonts/fa-regular-400.woff2'],
  ['/fonts/segoeui.ttf'],
  // 舊 CSS 用到的背景圖
  ['/images/header-bg.jpg'],
  ['/images/hbg-01-11.jpg'],
  ['/images/hbg-01-2.jpg'],
  ['/images/hbg-02.jpg'],
  ['/images/title-line-01.png'],
  ['/images/pd-title-line-01.png'],
  ['/images/footer-bg.jpg'],
  ['/images/products/LQCOLPLUS/LQCOLPLUS_bg.png'],
  // 共用
  ['/images/logo.png'],
  ['/images/aquasky-text.png'],
  ['/upfile/Images/footer-logo-200.png'],
  // 首頁輪播
  ['/upfile/Images/S_0089_2022.jpg'],
  ['/upfile/Images/banner201906.jpg'],
  ['/upfile/Images/s0010.jpg'],
  ['/upfile/Images/S_0109_2022.jpg'],
  ['/upfile/Images/S_0104_2022.jpg'],
  ['/upfile/Images/S_0182_2022.jpg'],
  // 首頁產品線
  ['/images/pdg-01.png'],
  ['/images/pdg-mega-2022.png'],
  ['/images/pdg-03.png'],
  ['/images/pdg-04.png'],
  ['/images/pdg-05.png'],
  ['/images/pdg-06.png'],
  ['/images/pdg-premiumplus2.png'],
  ['/images/products/LQCOLPLUS/LQCOLPLUS_pdlline2.png'],
  ['/images/products/GIGAPLUS/WEB_PRODUCT_LINE_GIGAPLUS_B.png'],
  ['/images/Elbi_2022.png'],
  ['/images/SupremePlus_2023A.png'],
  ['/images/products/accessories/accessories6.png'],
  ['/images/selection%20tools_en.png', '/images/selection-tools_en.png'],
  ['/images/selection%20tools_zh.png', '/images/selection-tools_zh.png'],
  // 首頁認證圖示
  ['/images/home-service/s2-img-01.png'],
  ['/images/home-service/s2-img-02.png'],
  ['/images/home-service/s2-img-03.png'],
  ['/images/home-service/s2-img-04.png'],
  ['/images/home-service/s2-img-05.png'],
  ['/images/home-service/N2.png'],
  ['/images/home-service/unnamed2.png'],
  ['/images/home-service/s2-img-08.png'],
  // 系列頁產品線（webp 小圖）
  ['/images/products_line/pdg-plus2.webp'],
  ['/images/products_line/pdg-mega2-2022.webp'],
  ['/images/products_line/pdg-thermal2.webp'],
  ['/images/products_line/pdg-rot2.webp'],
  ['/images/products_line/pdg-hydro2.webp'],
  ['/images/products_line/pdg-solar2.webp'],
  ['/images/products_line/pdg-premiumplus.webp'],
  ['/images/products_line/LQCOLPLUS_pdlline1.webp'],
  ['/images/products_line/WEB_PRODUCT_LINE_GIGAPLUS.webp'],
  ['/images/products_line/Elbi_B2022.webp'],
  ['/images/products_line/SupremePlus_2023B.webp'],
  ['/images/products_line/accessories3.webp'],
  // 各系列頁最上方的獨立 logo／標題圖（2026-10-24 盤點：8 個系列有 logo 檔，PUMPLUS／RO／PREMIUM 用文字圖，accessories 沒有）
  ['/images/products/PRODUCT_PUMPLUS_200209_txt2.png'],      // PUMPLUS（文字圖）
  // RO-PLUS 的文字圖 /images/products/ROT-txt-01.png 兩次封存都漏抓（階段 C 要補進種子清單）；2026-10-24 先從線上站直接存到 public/images/products/
  ['/images/products/Thermal/thermal_logo.png'],
  ['/images/products/HYDRO_logo.png'],
  ['/images/products/Premium-PLUS_20221228-01.jpg'],         // PREMIUM-PLUS（標題圖）
  ['/images/products/mega/mega_logo.png'],
  ['/images/products/solar/solar_logo.png'],
  ['/images/products/supreme/supreme_logo.png'],
  ['/images/products/ELBI/ELBI_logo.png'],                   // dl-ce 與 asme-ht 共用
  ['/images/products/GIGAPLUS/webp/WEB_PRODUCT_GIGAPLUS_202512_logo.webp'],
  // LQCOL-PLUS
  ['/images/products/LQCOLPLUS/LQCOLPLUS_logo.png'],
  ['/images/products/LQCOLPLUS/SET1.png'],
  ['/uploads/series/lqcol-plus/lqc_structure.png'],
  ['/uploads/series/lqcol-plus/20261020_222802_5e8f42ca9a.png'],
  ['/uploads/series/pdf/SERIES_lqcol-plus_1_20261020_222652.jpg'],
  ['/uploads/series/pdf/SERIES_lqcol-plus_1_20261020_222652.pdf'],
  ['/uploads/series/pdf/SERIES_lqcol-plus_2_20261020_222359.jpg'],
  ['/uploads/series/pdf/SERIES_lqcol-plus_2_20261020_222359.pdf'],
];

// 各產品資料檔自己列的資源（import-classic-series.mjs 產生的 assets 陣列）也一起複製
import { readdirSync } from 'node:fs';
const productsDir = resolve(here, '..', 'src', 'data', 'products');
for (const f of readdirSync(productsDir)) {
  if (!f.endsWith('.json')) continue;
  const data = JSON.parse(readFileSync(join(productsDir, f), 'utf8'));
  for (const a of data.assets ?? []) ASSETS.push([a]);
}

const index = new Map();
for (const line of readFileSync(join(archive, 'success.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  index.set(row.url, row);
}

let copied = 0, missing = [];
for (const [src, dest = src] of ASSETS) {
  const row = index.get(ORIGIN + src);
  if (!row) { missing.push(src); continue; }
  const target = join(publicDir, decodeURIComponent(dest));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(archive, row.relative_path), target);
  copied++;
}
console.log(`copied ${copied} files from ${archive} -> ${publicDir}`);
if (missing.length) console.log('not in archive (skipped):\n  ' + missing.join('\n  '));
if (!existsSync(join(publicDir, 'images', 'logo.png'))) process.exit(1);

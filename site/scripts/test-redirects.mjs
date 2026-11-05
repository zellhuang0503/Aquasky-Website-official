// 舊站 .php 網址 → 新站網址轉址表的測試。用法（site/）：node scripts/test-redirects.mjs
// 最後一組測試會對照 dist/：轉址表裡每個 en／zh 目標都必須真的有頁（dist 不在就跳過並提示）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legacyRedirect, redirectTable, SUPPORTED_LANGS } from '../worker/redirects.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const r = (path) => legacyRedirect(new URL(path, 'https://aquaskyplus.com'));

test('首頁 index.php：lang 對應與預設 en', () => {
  assert.equal(r('/index.php'), '/en');
  assert.equal(r('/index.php?lang=en'), '/en');
  assert.equal(r('/index.php?lang=zh'), '/zh');
  assert.equal(r('/index.php?lang=es'), '/es');
  assert.equal(r('/index.php?lang=fr'), '/fr');
  assert.equal(r('/index.php?lang=ru'), '/ru');
  assert.equal(r('/index.php?lang=ar-XA'), '/ar');
  assert.equal(r('/index.php?lang=xx'), '/en');
  assert.equal(r('/index.php?lang='), '/en');
});

test('系列頁 <SERIES>.php → /<lang>/<SERIES>', () => {
  assert.equal(r('/LQCOL-PLUS.php?lang=en'), '/en/LQCOL-PLUS');
  assert.equal(r('/MEGA-PLUS.php'), '/en/MEGA-PLUS');
  assert.equal(r('/SOLAR-PLUS.php?lang=zh'), '/zh/SOLAR-PLUS');
  assert.equal(r('/PUMPLUS.php?lang=zh'), '/zh/PUMPLUS');
  assert.equal(r('/GIGA-PLUS.php'), '/en/GIGA-PLUS');
  assert.equal(r('/HYDRO-PLUS.php?lang=en'), '/en/HYDRO-PLUS');
  assert.equal(r('/THERMAL-PLUS.php?lang=ar-XA'), '/ar/THERMAL-PLUS');
  assert.equal(r('/RO-PLUS.php'), '/en/RO-PLUS');
  assert.equal(r('/PREMIUM-PLUS.php'), '/en/PREMIUM-PLUS');
});

test('文字頁 <name>.php → /<lang>/<name>（檔名不分大小寫，輸出新站真正的大小寫）', () => {
  assert.equal(r('/products.php'), '/en/products');
  assert.equal(r('/products.php?lang=ar-XA'), '/ar/products');
  assert.equal(r('/certification.php'), '/en/certification');
  assert.equal(r('/downloadpage.php'), '/en/downloadpage');
  assert.equal(r('/dl-ce.php?lang=en'), '/en/dl-ce');
  assert.equal(r('/asme-ht.php'), '/en/asme-ht');
  assert.equal(r('/sel_tools.php?lang=zh'), '/zh/sel_tools');
  assert.equal(r('/contact.php?lang=en'), '/en/contact');
  assert.equal(r('/accessories.php?lang=en'), '/en/accessories');
  assert.equal(r('/about.php?lang=en'), '/en/about');
  assert.equal(r('/feature.php?lang=zh'), '/zh/feature');
  assert.equal(r('/faq.php'), '/en/FAQ');
  assert.equal(r('/FAQ.php?lang=zh'), '/zh/FAQ');
  assert.equal(r('/videos.php'), '/en/videos');
  assert.equal(r('/supreme.php'), '/en/supreme');
  assert.equal(r('/mega-plus.php'), '/en/MEGA-PLUS');
  assert.equal(r('/news.php?lang=zh'), '/zh/news/INDUSTRY');
});

test('沒有語系前綴的乾淨路徑（只有 run_worker_first 列的兩條會進 Worker）→ /en/…；已是新站網址回 null', () => {
  assert.equal(r('/LQCOL-PLUS'), '/en/LQCOL-PLUS');
  assert.equal(r('/certification'), '/en/certification');
  assert.equal(r('/en/LQCOL-PLUS'), null);
  assert.equal(r('/zh/certification'), null);
});

test('news-detail.php?sid=N → 該語系那篇新聞', () => {
  assert.equal(r('/news-detail.php?sid=82&cid=2&page=17&lang=en'), '/en/news-detail/INDUSTRY/stainless-steel-connector-water-tank-aquasky-82');
  assert.equal(r('/news-detail.php?sid=1'), '/en/news-detail/EXHIBITIONS/2016-ahr-expo-orlando-1');
  assert.equal(r('/news-detail.php?sid=176&cid=2&page=5&lang=zh'), '/zh/news-detail/INDUSTRY/aquasky-176');
  assert.equal(r('/news-detail.php?sid=172&cid=2&page=1&lang=zh'), '/zh/news-detail/INDUSTRY/pp-aquasky-172');
  assert.equal(r('/news-detail.php?sid=161&cid=0&page=1&lang=en'), '/en/news-detail/INDUSTRY/mega-plus-16-bar-pressure-tanks-revolutionizing-water-management-across-industriesaquasky-161');
});

test('news-detail.php：sid 每個語系各自一套編號，同 sid 不同文章，不能跨語系', () => {
  // zh 177 是 ISH 展覽文、en 177 是關稅文；zh 161 是 PUMPLUS、en 161 是 MEGA-PLUS
  assert.equal(r('/news-detail.php?sid=177&lang=zh'), '/zh/news-detail/EXHIBITIONS/2025ish-aquasky-177');
  assert.equal(r('/news-detail.php?sid=177&lang=en'), '/en/news-detail/INDUSTRY/trumps-2025-tariff-policy-what-it-means-for-global-trade-aquasky-177');
  assert.equal(r('/news-detail.php?sid=161&cid=2&page=1&lang=zh'), '/zh/news-detail/INDUSTRY/pumplus-aquasky-161');
});

test('news-detail.php：找不到的 sid → 該語系新聞列表', () => {
  assert.equal(r('/news-detail.php?sid=70&lang=en'), '/en/news/INDUSTRY'); // en 沒有 70
  assert.equal(r('/news-detail.php?sid=1&lang=zh'), '/zh/news/INDUSTRY'); // zh 只有 143–189
  assert.equal(r('/news-detail.php?sid=99999'), '/en/news/INDUSTRY');
  assert.equal(r('/news-detail.php'), '/en/news/INDUSTRY');
  assert.equal(r('/news-detail.php?sid=abc&lang=zh'), '/zh/news/INDUSTRY');
  assert.equal(r('/news-detail.php?sid=42&cid=2&page=1&lang=ru'), '/ru/news/INDUSTRY'); // ru 還沒建
});

test('videos-detail.php?sid=N → 影片明細', () => {
  assert.equal(r('/videos-detail.php?sid=9&lang=zh'), '/zh/videos-detail/aquasky-painting-quality-inspectionro-tank-pressure-tank-pumplus-9');
  assert.equal(r('/videos-detail.php?sid=9'), '/en/videos-detail/Aquasky-Painting-Quality-InspectionRO-Tank-Pressure-Tank-PUMPLUS');
  assert.equal(r('/videos-detail.php?sid=15&lang=en'), '/en/videos-detail/Aquasky-online-selection-toolsPressure-Tank-Pumplus-Aquasky');
  assert.equal(r('/videos-detail.php?sid=5&lang=zh'), '/zh/videos-detail/aquaskyaquasky-enterprise-corp-pump-tank-pressure-tankro-tank-water-storage-tank-5');
  assert.equal(r('/videos-detail.php?sid=99'), '/en/videos');
  assert.equal(r('/videos-detail.php?sid=9&lang=fr'), '/fr/videos');
  assert.equal(r('/videos-detail.php'), '/en/videos');
});

test('products-det.php?sid=N → 英文產品明細（只有英文有）；不認得 → /en/products', () => {
  assert.equal(r('/products-det.php?sid=107&pdcl=24&lang=en'), '/en/products-det/premium-plus/ROT-4SS');
  assert.equal(r('/products-det.php?sid=108&pdcl=24&lang=en'), '/en/products-det/premium-plus/ROT-6SS');
  assert.equal(r('/products-det.php?sid=109&pdcl=24&lang=en'), '/en/products-det/premium-plus/APT-18SS');
  assert.equal(r('/products-det.php?sid=110&pdcl=24&lang=en'), '/en/products-det/premium-plus/APT-24SS');
  assert.equal(r('/products-det.php?sid=111&pdcl=24&lang=en'), '/en/products-det/premium-plus/APT-18HSS');
  assert.equal(r('/products-det.php?sid=112&pdcl=24&lang=en'), '/en/products-det/premium-plus/APT-24HSS');
  assert.equal(r('/products-det.php?sid=119&pdcl=24&lang=zh'), '/en/products-det/premium-plus/APT-8SS');
  assert.equal(r('/products-det.php?sid=5'), '/en/products');
  assert.equal(r('/products-det.php'), '/en/products');
});

test('certification_page.php?sid=N → 認證明細；其他 → /<lang>/certification', () => {
  assert.equal(r('/certification_page.php?sid=4'), '/en/certification-page/iso-9001-eurocert');
  assert.equal(r('/certification_page.php?sid=6'), '/en/certification-page/kc-korea');
  assert.equal(r('/certification_page.php?sid=7&lang=zh'), '/zh/certification-page/acs-france');
  assert.equal(r('/certification_page.php?sid=9'), '/en/certification-page/watermark-australia');
  assert.equal(r('/certification_page.php?sid=10&lang=zh'), '/zh/certification-page/psb-singapore');
  assert.equal(r('/certification_page.php?sid=5'), '/en/certification');
  assert.equal(r('/certification_page.php?lang=zh'), '/zh/certification');
});

test('accessories-det.php → /en/accessories（封存裡沒這種網址，保險）', () => {
  assert.equal(r('/accessories-det.php?sid=3'), '/en/accessories');
  assert.equal(r('/accessories-det.php'), '/en/accessories');
});

test('選型工具後端／列印頁 → /<lang>/sel_tools；sel_contact.php → /<lang>/contact', () => {
  for (const php of ['sizing.php', 'sizing_bar.php', 'select_api2.php', 'select_api_vsd.php', 'select_api_thermal.php', 'printpdf.php', 'printpdfvsd.php', 'printpdfthermal.php']) {
    assert.equal(r(`/${php}`), '/en/sel_tools', php);
  }
  assert.equal(r('/printpdfvsd.php?lang=zh'), '/zh/sel_tools');
  assert.equal(r('/sizing.php?unit=bar&lang=zh'), '/zh/sel_tools');
  assert.equal(r('/sel_contact.php'), '/en/contact');
  assert.equal(r('/sel_contact.php?lang=zh'), '/zh/contact');
});

test('recode.php（驗證碼圖）→ null 讓它 404', () => {
  assert.equal(r('/recode.php?act=captcha'), null);
  assert.equal(r('/recode.php?act=captcha&'), null);
  assert.equal(r('/recode.php'), null);
  assert.equal(r('/en/recode.php'), null);
});

test('路徑帶語系目錄：語系以路徑為準，query 的 lang 次之', () => {
  assert.equal(r('/en/sel_tools.php'), '/en/sel_tools');
  assert.equal(r('/zh/contact.php'), '/zh/contact');
  assert.equal(r('/zh/contact.php?lang=en'), '/zh/contact');
  assert.equal(r('/ar-XA/index.php'), '/ar');
  assert.equal(r('/zh/news-detail.php?sid=176'), '/zh/news-detail/INDUSTRY/aquasky-176');
  assert.equal(r('/zh/certification_page.php?sid=6'), '/zh/certification-page/kc-korea');
  assert.equal(r('/en/foo.php'), '/en');
  assert.equal(r('/zh/foo.php'), '/zh');
});

test('其餘 .php 一律兜底回首頁', () => {
  assert.equal(r('/foo.php'), '/en');
  assert.equal(r('/series_content.php'), '/en');
  assert.equal(r('/include/function/series_figures.php'), '/en');
  assert.equal(r('/admin/login.php?x=1'), '/en');
  assert.equal(r('/whatever.php?lang=zh'), '/zh');
});

test('不是舊網址的回 null', () => {
  assert.equal(r('/'), null);
  assert.equal(r('/en'), null);
  assert.equal(r('/zh'), null);
  assert.equal(r('/en/news/INDUSTRY'), null);
  assert.equal(r('/en/news-detail/INDUSTRY/stainless-steel-connector-water-tank-aquasky-82'), null);
  assert.equal(r('/images/logo.png'), null);
  assert.equal(r('/upfile/Images/news/x.jpg'), null);
  assert.equal(r('/robots.txt'), null);
  assert.equal(r('/not-a-page'), null);
  assert.equal(r('/en/not-a-page'), null);
});

test('對照表筆數', () => {
  const news = Object.values(redirectTable.newsBySid);
  assert.equal(news.length, 188);
  assert.equal(news.filter((x) => x.en).length, 183);
  assert.equal(news.filter((x) => x.zh).length, 47);
  assert.equal(Object.keys(redirectTable.videosBySid).length, 11);
  assert.equal(Object.keys(redirectTable.productsBySid).length, 7);
  assert.equal(Object.keys(redirectTable.certificationBySid).length, 5);
  assert.deepEqual(SUPPORTED_LANGS, ['en', 'zh', 'es', 'fr', 'ru', 'ar']);
});

test('轉址表裡每個 en／zh 目標在 dist/ 都真的有頁', { skip: existsSync(dist) ? false : 'dist/ 不在，先 npm run build' }, () => {
  const builtLangs = ['en', 'zh'];
  const targets = new Set();
  for (const lang of builtLangs) {
    targets.add(`/${lang}`);
    for (const p of Object.values(redirectTable.pages)) targets.add(`/${lang}${p}`);
    for (const p of Object.values(redirectTable.certificationBySid)) targets.add(`/${lang}${p}`);
    targets.add(`/${lang}${redirectTable.certificationFallback}`);
    targets.add(`/${lang}${redirectTable.newsFallback}`);
    targets.add(`/${lang}${redirectTable.videosFallback}`);
    for (const byLang of Object.values(redirectTable.newsBySid)) if (byLang[lang]) targets.add(`/${lang}${byLang[lang]}`);
    for (const byLang of Object.values(redirectTable.videosBySid)) if (byLang[lang]) targets.add(`/${lang}${byLang[lang]}`);
  }
  for (const p of Object.values(redirectTable.productsBySid)) targets.add(`/en${p}`);
  targets.add(`/en${redirectTable.productsFallback}`);
  targets.add(`/en${redirectTable.accessoriesDetFallback}`);

  const missing = [...targets].filter((p) => !existsSync(join(dist, `${p}.html`)));
  assert.deepEqual(missing, [], `dist 裡找不到：\n${missing.join('\n')}`);
  console.log(`  dist 核對：${targets.size} 個目標頁全部存在`);
});

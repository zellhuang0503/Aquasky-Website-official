// 從舊站封存（../migration-2026-10-22）匯入新聞：列表頁（EXHIBITIONS／INDUSTRY，每頁 5 篇）與每篇明細。
// 產出：
//   src/data/news/<lang>-<CAT>.json      列表設定：標題帶、兩個 h4、「更多」字樣、右欄固定 5 篇、文章順序、SEO、舊站 CollectionPage
//   src/data/news/common.json             列表頁與明細頁的舊站 <style>（兩種各一份，全部頁面相同）
//   src/content/news/<lang>/<CAT>/<slug>.json  每篇：日期字樣、標題、封面、摘要 HTML、正文 HTML、SEO、舊站 NewsArticle、用到的圖
// 用法（site/）：node scripts/import-news.mjs [--force]
// 原則：文字照抄，不改字；只做舊站 JS 在瀏覽器裡本來就會做的事（去掉圖片 inline 寬高＋加 img-responsive、還原 Cloudflare email 混淆）。
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const archive = resolve(root, '..', 'migration-2026-10-22');
const ORIGIN = 'https://aquaskyplus.com';
const force = process.argv.includes('--force');
const LANGS = ['en', 'zh'];
const CATS = ['EXHIBITIONS', 'INDUSTRY'];
const PER_PAGE = 5;   // 舊站每頁 5 篇（頁尾還有一段註解掉的範本 <div class="row news-item">，不算）

const index = new Map();
for (const line of readFileSync(join(archive, 'success.jsonl'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line);
  index.set(row.url, row);
}
const page = (path) => {
  const row = index.get(ORIGIN + path);
  if (!row) return null;
  const html = readFileSync(join(archive, row.relative_path), 'utf8');
  return { html, head: html.slice(0, html.indexOf('</head>')), body: html.slice(html.indexOf('</header>') + 9, html.indexOf('<footer')) };
};

// HTML 實體還原成純文字（只用在 JSON-LD／SEO 字串；正文 HTML 原樣保留）
const NAMED = { amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', deg: '°', hellip: '…', copy: '©', reg: '®', trade: '™', times: '×', middot: '·', bull: '•', apos: "'", asymp: '≈', laquo: '«', raquo: '»' };
const unescape = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => { if (!(n in NAMED)) throw new Error(`unknown entity ${m}`); return NAMED[n]; });
const text = (s) => unescape(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const decodeCfEmail = (hex) => { const k = parseInt(hex.slice(0, 2), 16); let out = ''; for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k); return out; };
// 舊站有的圖檔名含空格（20260730_Liquid Cooling … (1).png），網址裡改成 %20（瀏覽器看到的一樣；copy 腳本兩種都認）
const absUrl = (u) => { u = u.replace(/[\r\n\t]+/g, '').replace(/ /g, '%20'); return /^(\/|https?:|#|mailto:|tel:|data:)/.test(u) ? u : '/' + u.replace(/^(\.\.\/)+/, ''); };

const headMeta = (head) => ({
  title: unescape(head.match(/<title>([\s\S]*?)<\/title>/)[1].trim()),
  description: unescape((head.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1]).replace(/\s+/g, ' ').trim(),
  jsonLd: [...head.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const parsed = JSON.parse(m[1]);
    const items = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
    // Organization／WebSite／BreadcrumbList 新站統一產生；舊站 CollectionPage 每頁都指第 1 頁（@id 不分頁），新站自己產生，不搬
    return items.filter((o) => !['Organization', 'Corporation', 'LocalBusiness', 'WebSite', 'BreadcrumbList', 'CollectionPage'].includes(o['@type']));
  }).map((o) => { delete o['@context']; return o; }),
  style: [...head.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].trim()).join('\n'),
});

// 正文清理：只做舊站瀏覽器端 JS 本來就會做的事
const cleanBody = (html, where) => {
  let b = html;
  // 舊站 JS：$('#ImgAutoResponsive img').css({'width':'','height':''}).addClass('img-responsive')
  b = b.replace(/<img\b[^>]*>/g, (tag) => {
    let t = tag.replace(/\sstyle="([^"]*)"/, (_m, css) => {
      const kept = css.split(';').map((x) => x.trim()).filter((x) => x && !/^(width|height)\s*:/i.test(x)).join('; ');
      return kept ? ` style="${kept}"` : '';
    });
    if (/\sclass="/.test(t)) t = t.replace(/\sclass="([^"]*)"/, (_m, c) => ` class="${/\bimg-responsive\b/.test(c) ? c : c + ' img-responsive'}"`);
    else t = t.replace(/^<img/, '<img class="img-responsive"');
    return t;
  });
  // Cloudflare email 混淆：<a href="/cdn-cgi/l/email-protection#hex"> <span class="__cf_email__" data-cfemail="hex">[email protected]</span></a>
  // 舊站的 email-decode.min.js 會把 href 換成 mailto:、span 換成純文字
  b = b.replace(/<a([^>]*)href="\/cdn-cgi\/l\/email-protection#([0-9a-f]+)"([^>]*)>([\s\S]*?)<\/a>/g, (_m, pre, hex, post, inner) => `<a${pre}href="mailto:${decodeCfEmail(hex).trim()}"${post}>${inner}</a>`);   // 舊資料 email 前有空白，mailto 去掉
  b = b.replace(/<span[^>]*class="__cf_email__"[^>]*data-cfemail="([0-9a-f]+)"[^>]*>[\s\S]*?<\/span>/g, (_m, hex) => decodeCfEmail(hex));
  // 另一種寫法：<a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="hex">[email protected]</a> → 舊站還原成純文字（不是連結）
  b = b.replace(/<a[^>]*href="\/cdn-cgi\/l\/email-protection"[^>]*data-cfemail="([0-9a-f]+)"[^>]*>[\s\S]*?<\/a>/g, (_m, hex) => decodeCfEmail(hex));
  if (/cdn-cgi|__cf_email__|data-cfemail|email&#160;protected/.test(b)) throw new Error(`${where}: Cloudflare email obfuscation left`);
  b = b.replace(/(src|href)="([^"]+)"/g, (_m, k, v) => `${k}="${absUrl(v)}"`);
  if (/<script\b|<object\b|<embed\b|\son\w+=/i.test(b)) throw new Error(`${where}: script/object/embed/on* in body`);
  for (const m of b.matchAll(/<iframe[^>]*src="([^"]+)"/g)) {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//.test(m[1])) throw new Error(`${where}: iframe not YouTube: ${m[1]}`);
  }
  return b.trim();
};

const assetsOf = (html) => [...new Set([...html.matchAll(/<img[^>]+src="(\/[^"]+)"/g)].map((m) => m[1]))];

const common = { listCss: null, detailCss: null };
let articles = 0, lists = 0;
for (const lang of LANGS) {
  for (const cat of CATS) {
    const base = `/news/${cat}`;
    // ---- 列表頁（第 1 頁＝/news/CAT，之後 /news/CAT/pageN）----
    const first = page(`/${lang}${base}`);
    if (!first) throw new Error(`no archive for /${lang}${base}`);
    const pager = first.body.match(/<ul class="pagination">([\s\S]*?)<\/ul>/);
    const pageCount = pager ? Math.max(...[...pager[1].matchAll(/>(\d+)<\/a>/g)].map((m) => Number(m[1]))) : 1;
    const titleBand = text(first.body.match(/id="about-top-title">([\s\S]*?)<\/div>/)[1]);
    const h4s = [...first.body.matchAll(/<h4 class="news-h4">([\s\S]*?)<\/h4>/g)].map((m) => text(m[1]));
    if (h4s.length !== 2) throw new Error(`/${lang}${base}: expected 2 h4, got ${h4s.length}`);
    const moreLabel = text(first.body.match(/class="text-right news-item-more"><a[^>]*>([\s\S]*?)<\/a>/)[1]);
    // 右欄固定 5 篇（每頁相同，下面會比對）
    const sideHtml = first.body.slice(first.body.indexOf('block-bg-02'));
    const sidebar = [...sideHtml.matchAll(/<div class="news-right-list"><p class="news-time-style-1">([^<]*)<\/p><p class="news-right-list-title"><a href="([^"]+)">([\s\S]*?)<\/a><\/p><\/div>/g)]
      .map((m) => ({ dateText: m[1], href: absUrl(m[2]), title: unescape(m[3].trim()) }));
    if (sidebar.length < 1 || sidebar.length > 5) throw new Error(`/${lang}${base}: sidebar has ${sidebar.length} items`);   // 舊站最多 5 篇；zh 展覽訊息只有 1 篇
    const meta = headMeta(first.head);
    if (common.listCss === null) common.listCss = meta.style;
    else if (common.listCss !== meta.style) throw new Error(`/${lang}${base}: list <style> differs from the first list page`);

    const order = [];
    const listItems = new Map();   // slug → 列表上的資料（日期、封面、摘要）
    for (let n = 1; n <= pageCount; n++) {
      const p = n === 1 ? first : page(`/${lang}${base}/page${n}`);
      if (!p) throw new Error(`no archive for /${lang}${base}/page${n}`);
      const pm = headMeta(p.head);
      if (pm.title !== meta.title || pm.description !== meta.description) throw new Error(`/${lang}${base}/page${n}: SEO differs from page 1`);
      const side = p.body.slice(p.body.indexOf('block-bg-02')).replace(/\s+/g, ' ');
      if (side !== sideHtml.replace(/\s+/g, ' ')) throw new Error(`/${lang}${base}/page${n}: sidebar differs from page 1`);
      const listBody = p.body.replace(/<!--[\s\S]*?-->/g, '');   // 註解掉的範本拿掉再抓
      const items = [...listBody.matchAll(/<div class="row news-item">([\s\S]*?)<\/div><div class="text-right news-item-more"><a href="([^"]+)">/g)];
      if (n < pageCount && items.length !== PER_PAGE) throw new Error(`/${lang}${base}/page${n}: ${items.length} items, expected ${PER_PAGE}`);
      for (const [, it, moreHref] of items) {
        const href = absUrl(it.match(/<a href="([^"]+)">/)[1]);
        if (href !== absUrl(moreHref)) throw new Error(`${href}: more link differs`);
        const slug = href.split('/').pop();
        if (!href.startsWith(`/${lang}/news-detail/${cat}/`)) throw new Error(`${href}: not under /${lang}/news-detail/${cat}/`);
        const dateText = it.match(/<p class="news-time-style-1">([^<]*)<\/p>/)[1];
        if (!/^\d\d \d\d \d{4}$/.test(dateText)) throw new Error(`${href}: date "${dateText}"`);
        const cover = absUrl(it.match(/<img src="([^"]+)"/)[1]);
        const title = unescape(it.match(/<p class="news-title-style"><a[^>]*>([\s\S]*?)<\/a><\/p>/)[1].trim());
        const excerptHtml = cleanBody(it.match(/<div class="news-text">([\s\S]*?)<\/div><\/div>$/)[1], href);
        if (listItems.has(slug)) throw new Error(`${href}: listed twice`);
        listItems.set(slug, { dateText, cover, title, excerptHtml });
        order.push(slug);
      }
    }

    // ---- 明細頁 ----
    const dir = join(root, 'src', 'content', 'news', lang, cat);
    if (force && existsSync(dir)) rmSync(dir, { recursive: true });
    mkdirSync(dir, { recursive: true });
    const outDir = join(root, 'src', 'data', 'news');
    mkdirSync(outDir, { recursive: true });
    let backLabel = null;
    for (const slug of order) {
      const path = `/news-detail/${cat}/${slug}`;
      const p = page(`/${lang}${path}`);
      if (!p) throw new Error(`no archive for /${lang}${path}`);
      const li = listItems.get(slug);
      const dm = headMeta(p.head);
      if (common.detailCss === null) common.detailCss = dm.style;
      else if (common.detailCss !== dm.style) throw new Error(`/${lang}${path}: detail <style> differs`);
      const head = p.body.match(/<div class="row news-title-border">([\s\S]*?)<\/div>\s*<div id="ImgAutoResponsive"/);
      if (!head) throw new Error(`/${lang}${path}: title block not found`);
      const dateText = head[1].match(/news-time-style-1">([^<]*)<\/div>/)[1];
      const title = unescape(head[1].match(/news-title-style">([\s\S]*?)<\/div>/)[1].trim());
      const back = head[1].match(/<a id="newsBackBtn" href="([^"]+)">([^<]*)<\/a>/);
      if (absUrl(back[1]) !== `/${lang}${base}`) throw new Error(`/${lang}${path}: back link ${back[1]}`);
      backLabel = backLabel ?? back[2];
      if (back[2] !== backLabel) throw new Error(`/${lang}${path}: back label "${back[2]}"`);
      if (dateText !== li.dateText || title !== li.title) throw new Error(`/${lang}${path}: date/title differ from the list`);
      const band = text(p.body.match(/id="about-top-title">([\s\S]*?)<\/div>/)[1]);
      if (band !== titleBand) throw new Error(`/${lang}${path}: title band "${band}"`);
      const h4 = text(p.body.match(/<h4 class="news-h4">([\s\S]*?)<\/h4>/)[1]);
      if (h4 !== h4s[0]) throw new Error(`/${lang}${path}: h4 "${h4}"`);
      const bodyStart = p.body.indexOf('<div id="ImgAutoResponsive" style="padding-top:20px;">');
      if (bodyStart < 0) throw new Error(`/${lang}${path}: #ImgAutoResponsive not found`);
      const bodyEnd = p.body.indexOf('</div>\n\t\t\t\t<!--<div class="row news-item">', bodyStart);
      if (bodyEnd < 0) throw new Error(`/${lang}${path}: end of #ImgAutoResponsive not found`);
      const bodyHtml = cleanBody(p.body.slice(bodyStart + '<div id="ImgAutoResponsive" style="padding-top:20px;">'.length, bodyEnd), `/${lang}${path}`);
      const news = dm.jsonLd.filter((o) => o['@type'] === 'NewsArticle');
      if (news.length !== 1 || !news[0].datePublished) throw new Error(`/${lang}${path}: NewsArticle JSON-LD missing`);
      const assets = [...new Set([li.cover, ...assetsOf(bodyHtml)])];
      const entry = {
        lang, category: cat, slug, path, status: 'approved-legacy',
        dateText, datePublished: news[0].datePublished, title, cover: li.cover, excerptHtml: li.excerptHtml,
        seo: { title: dm.title, description: dm.description },
        legacyJsonLd: dm.jsonLd, bodyHtml, assets,
      };
      writeFileSync(join(dir, `${slug}.json`), JSON.stringify(entry, null, 2) + '\n');
      articles++;
    }
    const list = {
      id: `${lang}-${cat}`, lang, category: cat, path: base, perPage: PER_PAGE, pageCount,
      titleBand, h4Recent: h4s[0], h4Side: h4s[1], moreLabel, backLabel, sidebar, order,
      seo: { title: meta.title, description: meta.description },
    };
    writeFileSync(join(outDir, `${lang}-${cat}.json`), JSON.stringify(list, null, 2) + '\n');
    lists++;
    console.log(`${lang} ${cat}: ${pageCount} list page(s), ${order.length} articles`);
  }
}
writeFileSync(join(root, 'src', 'data', 'news', 'common.json'), JSON.stringify(common, null, 2) + '\n');
console.log(`wrote ${lists} lists, ${articles} articles, common.json`);

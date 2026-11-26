// 首頁 es／fr／ru／ar：從 2026-10-22 封存的舊站 /<lang> 首頁抽 title、description、產品系列標題、選擇工具標題／按鈕／圖、8 個認證說明，
// 寫成 src/content/home/<lang>.json（結構同 en.json／zh.json）。
// 舊站沒有的欄位（h1 取 title 去掉「AQUASKY - 」，跟 en／zh 一樣；slidesAlt、selectionTools.alt、certifications.heading 是 2026-11-26 AI 譯）。
// 用法（site/ 目錄）：node scripts/import-home-langs.mjs [--force] [es fr ru ar]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const archive = resolve(root, '..', 'migration-2026-10-22');
const force = process.argv.includes('--force');
const picked = process.argv.slice(2).filter((a) => ['es', 'fr', 'ru', 'ar'].includes(a));
const LANGS = picked.length ? picked : ['es', 'fr', 'ru', 'ar'];
const ORIGIN = 'https://aquaskyplus.com';
const ENT = JSON.parse(readFileSync(join(here, 'html-entities.json'), 'utf8'));
const unescape = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z0-9]+);/gi, (m, n) => ({ amp: '&', quot: '"', lt: '<', gt: '>', apos: "'", nbsp: ' ', ...ENT })[n] ?? (() => { throw new Error(`unknown entity ${m}`); })());
// <br> → \n（頁面再轉回 <br>），其他標籤拿掉，每行去頭尾空白
const lines = (s) => unescape(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');

const AI = {
  es: { slidesAlt: 'Fábrica de AQUASKY y producción de tanques de presión', selAlt: 'Herramientas de selección de tanques de presión en línea de AQUASKY', certHeading: 'Certificaciones y tecnología' },
  fr: { slidesAlt: 'Usine AQUASKY et production de réservoirs sous pression', selAlt: 'Outils de sélection en ligne des réservoirs sous pression AQUASKY', certHeading: 'Certifications et technologie' },
  ru: { slidesAlt: 'Завод AQUASKY и производство напорных баков', selAlt: 'Онлайн-инструменты выбора напорных баков AQUASKY', certHeading: 'Сертификаты и технологии' },
  ar: { slidesAlt: 'مصنع AQUASKY وإنتاج خزانات الضغط', selAlt: 'أدوات AQUASKY الإلكترونية لاختيار خزانات الضغط', certHeading: 'الشهادات والتقنية' },
};

const index = new Map();
for (const line of readFileSync(join(archive, 'success.jsonl'), 'utf8').split('\n')) if (line.trim()) { const r = JSON.parse(line); index.set(r.url, r); }
const enHome = JSON.parse(readFileSync(resolve(root, 'src/content/home/en.json'), 'utf8'));

for (const lang of LANGS) {
  const row = index.get(`${ORIGIN}/${lang}`);
  if (!row) throw new Error(`archive has no /${lang}`);
  const html = readFileSync(join(archive, row.relative_path), 'utf8');
  const title = lines(html.match(/<title>([\s\S]*?)<\/title>/)[1]);
  const description = unescape(html.match(/<meta name="description" content="([^"]*)"/)[1]);
  const body = html.slice(html.indexOf('</header>'), html.indexOf('<footer'));
  const company = lines(body.match(/class="company_lang_txt"><strong>([\s\S]*?)<\/strong>/)?.[1] ?? '');
  const headings = [...body.matchAll(/class="pd_title_line">([\s\S]*?)<\/div>/g)].map((m) => lines(m[1]));
  if (headings.length !== 2) throw new Error(`/${lang}: expected 2 pd_title_line, got ${headings.length}`);
  const sel = body.slice(body.indexOf('fef9ee'));
  const cta = lines(sel.match(/<a[^>]*sel_tools[^>]*>([\s\S]*?)<\/a>/)[1]);
  const caps = [...body.matchAll(/<img src="([^"]*home-service\/[^"]+)"[^>]*>\s*<p class="ca_txt">([\s\S]*?)<\/p>/g)].map((m) => ({ icon: '/' + m[1].replace(/^\.?\//, ''), label: lines(m[2]) }));
  if (caps.length !== 8 || caps.some((c) => !c.label)) throw new Error(`/${lang}: expected 8 non-empty captions, got ${caps.length}`);
  caps.forEach((c, i) => { if (c.icon !== enHome.certifications.items[i].icon) throw new Error(`/${lang}: caption ${i + 1} icon ${c.icon} ≠ en ${enHome.certifications.items[i].icon}`); });
  if (!title.startsWith('AQUASKY - ')) throw new Error(`/${lang}: title does not start with "AQUASKY - ": ${title}`);
  const out = {
    _note: `首頁 ${lang}。title、description、產品系列與選擇工具標題、按鈕字樣（\\n＝舊站 <br>）、8 個認證說明一字不差沿用 2026-10-22 封存的舊站 /${lang} 首頁（ISO 那句的「//」是舊站原文）；h1＝title 去掉「AQUASKY - 」（同 en／zh 做法）。slidesAlt、selectionTools.alt、certifications.heading 舊站沒有，2026-11-26 AI 譯，未經審稿。`,
    lang,
    status: 'approved-legacy',
    seo: { title, description },
    h1: title.slice('AQUASKY - '.length),
    companyName: company,
    productLineHeading: headings[0],
    selectionTools: { heading: headings[1], cta, image: `/images/selection-tools_${lang}.png`, alt: AI[lang].selAlt },
    slidesAlt: AI[lang].slidesAlt,
    certifications: { heading: AI[lang].certHeading, items: caps },
  };
  const target = resolve(root, `src/content/home/${lang}.json`);
  if (existsSync(target) && !force) { console.log(`skip (exists): ${lang}`); continue; }
  writeFileSync(target, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`wrote ${lang}: "${out.h1}", cta "${cta.replace(/\n/g, ' / ')}", captions ${caps.map((c) => c.label.replace(/\n/g, ' / ')).join(' | ')}`);
}

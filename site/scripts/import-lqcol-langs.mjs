// LQCOL-PLUS 西／法／俄／阿：把 translation/lqcol-plus/LQCOL-PLUS.<lang>.md 的 AI 初稿轉成 src/content/series/lqcol-plus/<lang>.json。
// 結構跟 import-lqcol.mjs 的 textFor() 一樣（區塊 B01–B75 對到同一個欄位）；規格數字仍只在 src/data/products/lqcol-plus.json。
// 安全檢查：先用同一份 md 的 EN 行組出「英文版」，跟目前的 en.json 逐欄比對；
//   不一樣＝英文後來改過（例如 Tiffany 11/20 改字）而 md 沒跟上，會停下來列出，不會產生過時譯文。
// 用法（site/ 目錄）：node scripts/import-lqcol-langs.mjs [--force] [es fr ru ar]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const repo = resolve(root, '..');
const force = process.argv.includes('--force');
const langs = process.argv.slice(2).filter((a) => ['es', 'fr', 'ru', 'ar'].includes(a));
const LANGS = langs.length ? langs : ['es', 'fr', 'ru', 'ar'];

// 結構圖六個標示裡，舊站英文是寫死的三句（不在區塊檔），各語系 AI 譯；另兩個 alt 也是
const FIXED = {
  es: { leak: 'Tecnología patentada\nantifugas con conector\nde acero inoxidable 304\nsoldado.', n2: 'Precarga de nitrógeno (N₂)\npersonalizable', valve: 'Cubierta patentada de la\nválvula con tapa sellada\ncon junta tórica (O-ring).', structureAlt: 'Diagrama estructural de LQCOL PLUS', appAlt: 'Aplicaciones de LQCOL PLUS' },
  fr: { leak: 'Technologie brevetée\nanti-fuite avec raccord\nen acier inoxydable 304\nsoudé.', n2: 'Précharge d’azote (N₂)\npersonnalisable', valve: 'Capot de valve breveté\navec bouchon étanche\nà joint torique (O-ring).', structureAlt: 'Schéma de structure LQCOL PLUS', appAlt: 'Applications LQCOL PLUS' },
  ru: { leak: 'Запатентованная\nтехнология защиты от утечек\nсо сварным соединением\nиз нержавеющей стали 304.', n2: 'Настраиваемая\nпредварительная закачка азота (N₂)', valve: 'Запатентованная защитная\nкрышка клапана с уплотнением\nуплотнительным кольцом (O-ring).', structureAlt: 'Схема конструкции LQCOL PLUS', appAlt: 'Применение LQCOL PLUS' },
  ar: { leak: 'تقنية حاصلة على براءة اختراع\nلمنع التسرب مع وصلة\nملحومة من الفولاذ\nالمقاوم للصدأ 304.', n2: 'شحن مسبق بالنيتروجين (N₂)\nقابل للتخصيص', valve: 'غطاء صمام حاصل على براءة اختراع\nمع سدادة محكمة\nبحلقة O-ring.', structureAlt: 'مخطط هيكل LQCOL PLUS', appAlt: 'تطبيقات LQCOL PLUS' },
};
const NAME = { es: 'español', fr: 'français', ru: 'русский', ar: 'العربية' };

const stripBullet = (s) => s.replace(/^•\s*/, '');
const splitLead = (s) => {
  const t = stripBullet(s);
  const m = t.match(/^(.+?)[:：]\s*(.*)$/);
  if (m) return { lead: m[1].trim(), text: m[2].trim() };
  const c = t.match(/^(.+?,)\s*(.*)$/);
  return c ? { lead: c[1].trim(), text: c[2].trim() } : { lead: '', text: t };
};

function readBlocks(lang) {
  const tx = readFileSync(resolve(repo, `translation/lqcol-plus/LQCOL-PLUS.${lang}.md`), 'utf8');
  const blocks = {};
  let cur = null;
  const tag = `${lang.toUpperCase()}: `;
  for (const line of tx.split(/\r?\n/)) {
    const h = line.match(/^### (B\d+)/);
    if (h) { cur = h[1]; blocks[cur] = {}; continue; }
    if (!cur) continue;
    if (line.startsWith('EN: ')) blocks[cur].en = line.slice(4).trim();
    if (line.startsWith(tag)) blocks[cur][lang] = line.slice(tag.length).trim();
  }
  return blocks;
}

function build(blocks, lang, base) {
  const b = (id) => {
    const v = blocks[id]?.[lang];
    if (!v) throw new Error(`missing ${id} ${lang}`);
    return v;
  };
  const f = FIXED[lang];
  const structureLabels = lang === 'en'
    ? base.structure.labels
    : [f.leak, `${b('B07')}\n${b('B18')}`, `${b('B07')}\n${b('B19')}`, b('B11'), f.n2, f.valve];
  return {
    template: 'lqcol',
    lang,
    seo: { title: b('B01'), description: b('B02') },
    h1: b('B03'),
    about: { heading: b('B04'), body: b('B05') },
    features: {
      heading: b('B06'),
      groups: [
        { label: b('B07'), items: ['B08', 'B09', 'B10'].map((id) => splitLead(b(id))) },
        { label: b('B11'), items: ['B12', 'B13'].map((id) => splitLead(b(id))) },
        { label: b('B14'), items: ['B15', 'B16'].map((id) => splitLead(b(id))) },
      ],
    },
    structure: { alt: lang === 'en' ? base.structure.alt : f.structureAlt, labels: structureLabels },
    applications: { heading: b('B22'), alt: lang === 'en' ? base.applications.alt : f.appAlt, items: ['B23', 'B24', 'B25', 'B26', 'B27'].map((id) => splitLead(b(id))) },
    specs: {
      heading: b('B28'), tableTitle: b('B29'), captionCarbon: b('B30'), captionStainless: b('B31'),
      columns: {
        model: b('B32'), volume: b('B33'), diameter: b('B34'), height: b('B35'),
        boxLength: b('B36'), boxWidth: b('B37'), boxHeight: b('B38'),
        netWeight: b('B39'), grossWeight: b('B40'), shippingVolume: b('B41'), connection: b('B42'),
      },
      props: {
        shell: b('B43'), shellValue: b('B44'), systemConnection: b('B45'), systemConnectionValue: b('B46'),
        coating: b('B47'), coatingValue: b('B48'), diaphragm: b('B49'), diaphragmValue: b('B50'),
        factoryPrecharge: b('B51'), maxWorkingTemp: b('B52'), maxWorkingTempCarbon: b('B53'), maxWorkingTempStainless: b('B54'),
        maxWorkingPressure: b('B55'),
      },
    },
    faq: {
      heading: b('B56'),
      items: [57, 59, 61, 63, 65, 67, 69].map((n) => ({
        q: b(`B${n}`).replace(/^(Q|P|В|س)\d*\s*[:：]\s*/, ''),   // 法文冒號前有空格（Q1 : …）
        a: b(`B${n + 1}`).replace(/^(A|R|О|ج)\s*[:：]\s*/, ''),
      })),
    },
    downloads: { heading: b('B71'), brochure: b('B72').replace('Brchure', 'Brochure'), manual: b('B73') },
    productLineHeading: b('B74'),
  };
}

// 比較時去掉 en.json 的 **粗體** 標記
const plain = (o) => JSON.parse(JSON.stringify(o).replace(/\*\*/g, ''));
function diff(a, b, path = '') {
  if (typeof a !== 'object' || a === null) return a === b ? [] : [`${path}: md "${a}" ≠ en.json "${b}"`];
  return Object.keys(a).flatMap((k) => (b && k in b ? diff(a[k], b[k], `${path}.${k}`) : [`${path}.${k}: missing in en.json`]));
}

const enJson = JSON.parse(readFileSync(resolve(root, 'src/content/series/lqcol-plus/en.json'), 'utf8'));
let bad = 0;
for (const lang of LANGS) {
  const blocks = readBlocks(lang);
  const fromMd = build(Object.fromEntries(Object.entries(blocks).map(([k, v]) => [k, { en: v.en }])), 'en', enJson);
  const drift = diff(fromMd, plain(enJson));
  if (drift.length) { bad++; console.log(`${lang}: md EN lines differ from current en.json — update the md first:\n  ${drift.join('\n  ')}`); continue; }
  const out = {
    _note: `LQCOL-PLUS ${NAME[lang]}。來源：translation/lqcol-plus/LQCOL-PLUS.${lang}.md（梵亞 AI 初稿，未經母語審稿；英文對照已確認＝目前 en.json）。舊站 /${lang}/LQCOL-PLUS 是舊版（HVAC）內容，不沿用。結構圖三句固定標示與兩個 alt 是 2026-11-26 AI 譯。數字、型號、單位不要改，規格數字在 src/data/products/lqcol-plus.json。`,
    ...build(blocks, lang, enJson),
    status: 'draft-ai',
  };
  const { template, lang: l, status, _note, ...rest } = out;
  const ordered = { _note, template, lang: l, status, ...rest };
  const target = resolve(root, `src/content/series/lqcol-plus/${lang}.json`);
  if (existsSync(target) && !force) { console.log(`skip (exists): ${lang}`); continue; }
  writeFileSync(target, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  console.log(`wrote ${lang}`);
}
if (bad) process.exit(1);

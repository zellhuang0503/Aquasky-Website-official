// 一次性匯入：把 LQCOL-PLUS 的規格數字與 en／zh 文字轉成新站的資料檔。
// 來源（都在 repo 內，不連網）：
//   ../translation/sources/LQCOL-PLUS.md        舊站 10/22 封存的英文規格表（數字只從這裡取）
//   ../translation/lqcol-plus/LQCOL-PLUS.zh.md  區塊化的英文原文＋中文 AI 初稿（B01–B75）
// 產出：
//   src/data/products/lqcol-plus.json           語系無關：型號、規格數字、圖片、PDF
//   src/content/series/lqcol-plus/en.json       英文文字
//   src/content/series/lqcol-plus/zh.json       中文文字
// 匯入後以這三個檔為準；之後改內容直接改它們，不要再跑這支（會覆蓋）。要重跑加 --force。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const repo = resolve(root, '..');
const force = process.argv.includes('--force');

// ---------- 規格表：從英文來源的 [td] 序列切出型號列 ----------
const src = readFileSync(resolve(repo, 'translation/sources/LQCOL-PLUS.md'), 'utf8');
const enSection = src.split(/^## zh$/m)[0];
const tds = [...enSection.matchAll(/^\[td\] (.*)$/gm)].map((m) => m[1].trim());
const COLS = 19; // 型號、L、Gal、直徑 cm/in、高 cm/in、箱長 cm/in、箱寬 cm/in、箱高 cm/in、淨重 kg/lb、毛重 kg/lb、材積 CUF、接頭
const normModel = (s) => s.replace(/\s+/g, '').replace(/^LQC-?/, 'LQC-');
const rows = [];
let i = 0;
while (i < tds.length && /^LQC/.test(tds[i])) {
  const r = tds.slice(i, i + COLS);
  if (r.length < COLS) throw new Error(`spec row at td#${i} is short`);
  const n = (k) => Number(r[k]);
  rows.push({
    model: normModel(r[0]),
    modelOnOldSite: r[0],
    volumeL: n(1), volumeGal: n(2),
    diameterCm: n(3), diameterIn: n(4),
    heightCm: n(5), heightIn: n(6),
    boxLengthCm: n(7), boxLengthIn: n(8),
    boxWidthCm: n(9), boxWidthIn: n(10),
    boxHeightCm: n(11), boxHeightIn: n(12),
    netWeightKg: n(13), netWeightLb: n(14),
    grossWeightKg: n(15), grossWeightLb: n(16),
    shippingVolumeCuf: n(17),
    connection: r[18],
  });
  i += COLS;
}
for (const row of rows) for (const [k, v] of Object.entries(row)) {
  if (typeof v === 'number' && Number.isNaN(v)) throw new Error(`${row.model}.${k} is not a number`);
}
const carbon = rows.filter((r) => !r.model.endsWith('SS'));
const stainless = rows.filter((r) => r.model.endsWith('SS'));
if (carbon.length !== 5 || stainless.length !== 4) throw new Error(`expected 5+4 models, got ${carbon.length}+${stainless.length}`);

const product = {
  _note: '語系無關的產品事實。數字從 2026-10-22 封存英文頁抄出，未經客戶重新核對（見 dataQuestions）。改規格只改這裡，兩個語系與 JSON-LD 一起變。',
  id: 'lqcol-plus',
  series: 'LQCOL-PLUS',
  path: '/LQCOL-PLUS',
  source: { url: 'https://aquaskyplus.com/en/LQCOL-PLUS', archive: 'migration-2026-10-22', retrieved: '2026-10-22' },
  images: {
    logo: '/images/products/LQCOLPLUS/LQCOLPLUS_logo.png',
    hero: '/images/products/LQCOLPLUS/SET1.png',
    structure: '/uploads/series/lqcol-plus/lqc_structure.png',
    applications: '/uploads/series/lqcol-plus/20261020_222802_5e8f42ca9a.png',
  },
  downloads: [
    { key: 'brochure', pdf: '/uploads/series/pdf/SERIES_lqcol-plus_1_20261020_222652.pdf', cover: '/uploads/series/pdf/SERIES_lqcol-plus_1_20261020_222652.jpg', sizeBytes: 856160 },
    { key: 'manual', pdf: '/uploads/series/pdf/SERIES_lqcol-plus_2_20261020_222359.pdf', cover: '/uploads/series/pdf/SERIES_lqcol-plus_2_20261020_222359.jpg', sizeBytes: 7989999 },
  ],
  specs: {
    carbonSteel: carbon,
    stainlessSteel: stainless,
    common: {
      factoryPrecharge: '30 PSI / 2 Bar',
      maxWorkingPressure: '150PSI / 10bar',
      maxWorkingTempCarbon: '90°C / 194°F',
      maxWorkingTempStainless: '120°C / 248°F',
    },
  },
  dataQuestions: [
    'LQC-3 的淨重 4.1 kg、外箱 31×31×24 cm 都比 LQC-8（1.9 kg、21×21×32 cm）大，疑似舊站資料錯誤，要請客戶確認。',
    'LQC-60SS 的 Gal 寫 14，60 L 換算約 15.9 gal，要請客戶確認。',
    '內文寫有 0.5L / 1L / 3L 與 100L+ 機型，規格表只有 3–60 L，要請客戶確認哪些型號實際販售。',
  ],
};

// ---------- 文字：從譯稿區塊檔取 EN 與 ZH ----------
const tx = readFileSync(resolve(repo, 'translation/lqcol-plus/LQCOL-PLUS.zh.md'), 'utf8');
const blocks = {};
let cur = null;
for (const line of tx.split(/\r?\n/)) {
  const h = line.match(/^### (B\d+)/);
  if (h) { cur = h[1]; blocks[cur] = {}; continue; }
  if (!cur) continue;
  if (line.startsWith('EN: ')) blocks[cur].en = line.slice(4).trim();
  if (line.startsWith('ZH: ')) blocks[cur].zh = line.slice(4).trim();
}
const need = (id, lang) => {
  const v = blocks[id]?.[lang];
  if (!v) throw new Error(`missing ${id} ${lang}`);
  return v;
};
const stripBullet = (s) => s.replace(/^•\s*/, '');
const splitLead = (s) => {
  // 「• All-Stainless Steel: SUS304 shell…」→ { lead, text }；中文用全形冒號
  const t = stripBullet(s);
  const m = t.match(/^(.+?)[:：]\s*(.*)$/);
  return m ? { lead: m[1].trim(), text: m[2].trim() } : { lead: '', text: t };
};

function textFor(lang) {
  const b = (id) => need(id, lang);
  return {
    _note: lang === 'zh'
      ? 'LQCOL-PLUS 中文文字。來源：translation/lqcol-plus/LQCOL-PLUS.zh.md（梵亞 AI 初稿，待 Tiffany 審）。數字、型號、單位不要改，規格數字在 src/data/products/lqcol-plus.json。'
      : 'LQCOL-PLUS English text, verbatim from the 2026-10-22 archive (translation/sources/LQCOL-PLUS.md). Spec numbers live in src/data/products/lqcol-plus.json.',
    lang,
    status: lang === 'zh' ? 'draft-ai' : 'approved-legacy',
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
    structure: {
      alt: lang === 'zh' ? 'LQCOL PLUS 結構圖' : 'LQCOL PLUS structure diagram',
      labels: [
        b('B17'),
        `${b('B07')}：${b('B18')}`.replace('：', lang === 'zh' ? '：' : ': '),
        `${b('B07')}：${b('B19')}`.replace('：', lang === 'zh' ? '：' : ': '),
        b('B11'),
        b('B20'),
        b('B21'),
      ],
    },
    applications: {
      heading: b('B22'),
      alt: lang === 'zh' ? 'LQCOL PLUS 應用情境' : 'LQCOL PLUS applications',
      items: ['B23', 'B24', 'B25', 'B26', 'B27'].map((id) => splitLead(b(id))),
    },
    specs: {
      heading: b('B28'),
      tableTitle: b('B29'),
      captionCarbon: b('B30'),
      captionStainless: b('B31'),
      columns: {
        model: b('B32'), volume: b('B33'), diameter: b('B34'), height: b('B35'),
        boxLength: b('B36'), boxWidth: b('B37'), boxHeight: b('B38'),
        netWeight: b('B39'), grossWeight: b('B40'), shippingVolume: b('B41'), connection: b('B42'),
      },
      props: {
        shell: b('B43'), shellValue: b('B44'),
        systemConnection: b('B45'), systemConnectionValue: b('B46'),
        coating: b('B47'), coatingValue: b('B48'),
        diaphragm: b('B49'), diaphragmValue: b('B50'),
        factoryPrecharge: b('B51'),
        maxWorkingTemp: b('B52'), maxWorkingTempCarbon: b('B53'), maxWorkingTempStainless: b('B54'),
        maxWorkingPressure: b('B55'),
      },
    },
    faq: {
      heading: b('B56'),
      items: [57, 59, 61, 63, 65, 67, 69].map((n) => ({
        q: b(`B${n}`).replace(/^Q\d+[:：]\s*/, ''),
        a: b(`B${n + 1}`).replace(/^(A|R|О|ج)[:：]\s*/, ''),
      })),
    },
    downloads: {
      heading: b('B71'),
      // 英文原文「Brchure」是舊站錯字，新站修正
      brochure: b('B72').replace('Brchure', 'Brochure'),
      manual: b('B73'),
    },
    productLineHeading: b('B74'),
  };
}

const outputs = [
  ['src/data/products/lqcol-plus.json', product],
  ['src/content/series/lqcol-plus/en.json', textFor('en')],
  ['src/content/series/lqcol-plus/zh.json', textFor('zh')],
];
for (const [rel, data] of outputs) {
  const target = resolve(root, rel);
  if (existsSync(target) && !force) { console.log(`skip (exists): ${rel}  — use --force to overwrite`); continue; }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`wrote ${rel}`);
}
console.log(`models: ${rows.map((r) => r.model).join(', ')}`);

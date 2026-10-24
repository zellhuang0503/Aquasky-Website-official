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
  // 數字以舊站原字串保存（例如 "14.0" 與 "14" 不同），頁面照字串顯示；要算數時再 Number()
  const n = (k) => { if (!/^\d+(\.\d+)?$/.test(r[k])) throw new Error(`${r[0]} cell ${k} not numeric: ${r[k]}`); return r[k]; };
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
const carbon = rows.filter((r) => !r.model.endsWith('SS'));
const stainless = rows.filter((r) => r.model.endsWith('SS'));
if (carbon.length !== 5 || stainless.length !== 4) throw new Error(`expected 5+4 models, got ${carbon.length}+${stainless.length}`);

const product = {
  _note: '語系無關的產品事實。數字從 2026-10-22 封存英文頁抄出，未經客戶重新核對（見 dataQuestions）。改規格只改這裡，兩個語系與 JSON-LD 一起變。',
  id: 'lqcol-plus',
  series: 'LQCOL-PLUS',
  path: '/LQCOL-PLUS',
  template: 'lqcol',
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
  _legacyCssNote: '舊站 /en/LQCOL-PLUS 頁面 <style> 照抄，只把相對路徑改絕對。',
  legacyCss: [
    '.h1-custom-style { width:100%; text-align:center; background-color:#251b19; color:#FFF; padding:10px;}',
    '.h1-custom-style h1 { margin:0; font-size:24px;}',
    '#pd-container-01 { background:url(/images/products/LQCOLPLUS/LQCOLPLUS_bg.png) top center no-repeat #251b19; background-size:100% auto;}',
    '.pd-aquasky-text { padding:6% 10px 5% 10px; width:55%; margin:0 auto;}',
    '.pd-aquasky-LQCOL-all { padding-top:5%; padding-bottom:8%; width:100%; max-width:750px; margin:0 auto;}',
    '@media (max-width: 767px){ .pd-aquasky-text { width:80%;}}',
  ].join('\n'),
  structureFigure: {
    _note: '結構圖的線與標示位置，照抄舊站 /en/LQCOL-PLUS 的 sf-stage（百分比座標，六個標示順序＝content 的 structure.labels）。',
    stagePaddingTop: '47.396%', font: '1.6667cqw',
    img: { left: '20.375%', top: '12.02%', width: '59.285%' },
    viewBox: '0 25 960 455',
    lines: [
      { points: '218.4,79.6 218.4,94.5 340.5,94.5', dots: [[218.4, 79.6], [340.5, 94.5]] },
      { points: '135.6,298.3 135.6,356.4 243.3,356.4', dots: [[135.6, 298.3], [243.3, 356.4]] },
      { points: '785.6,85.2 707.4,85.2 707.4,139.7', dots: [[785.6, 85.2], [707.4, 139.7]] },
      { points: '792.4,207 792.4,265 684.8,265', dots: [[792.4, 207], [684.8, 265]] },
      { points: '808.5,408.2 808.5,310.3 684.8,310.3', dots: [[808.5, 408.2], [684.8, 310.3]] },
      { points: '118.1,445.4 439,445.4 439,408.3', dots: [[118.1, 445.4], [439, 408.3]] },
    ],
    labels: [
      { left: '6.573%', top: '2.044%' }, { left: '3.896%', top: '50.264%' }, { left: '80.385%', top: '3.429%' },
      { left: '81.073%', top: '34.22%' }, { left: '84.063%', top: '88%', center: true }, { left: '6.573%', top: '94.22%' },
    ],
    mobileMarkers: [
      { left: '25.459%', top: '4.368%' }, { left: '8.381%', top: '81.618%' }, { left: '89.925%', top: '17.7%' },
      { left: '85.954%', top: '54.659%' }, { left: '85.954%', top: '68.021%' }, { left: '42.766%', top: '96.927%' },
    ],
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
  if (m) return { lead: m[1].trim(), text: m[2].trim() };
  // 舊站 Applications 第 4 條沒有冒號，粗體到第一個逗號為止（"Tailored for both In-Rack and In-Row CDUs,"）
  const c = t.match(/^(.+?,)\s*(.*)$/);
  return c ? { lead: c[1].trim(), text: c[2].trim() } : { lead: '', text: t };
};

// 舊站正文裡有 <strong> 的字，用 **…** 標起來，頁面會轉成 <strong>
const BOLD = {
  en: { B05: ['LQCOL PLUS'], B09: ['Triple-Grade Paint'], B62: ['Triple-Grade Protective Coating'], B64: ['10+ year maintenance-free'] },
  zh: { B05: ['LQCOL PLUS'], B09: ['三層防護塗裝'], B62: ['三層防護塗層'], B64: ['10 年以上免維護'] },
};
function textFor(lang) {
  const b = (id) => {
    let v = need(id, lang);
    for (const phrase of BOLD[lang]?.[id] ?? []) {
      if (!v.includes(phrase)) throw new Error(`${lang} ${id}: bold phrase not found: ${phrase}`);
      v = v.replace(phrase, `**${phrase}**`);
    }
    return v;
  };
  return {
    _note: lang === 'zh'
      ? 'LQCOL-PLUS 中文文字。來源：translation/lqcol-plus/LQCOL-PLUS.zh.md（梵亞 AI 初稿，待 Tiffany 審）。數字、型號、單位不要改，規格數字在 src/data/products/lqcol-plus.json。'
      : 'LQCOL-PLUS English text, verbatim from the 2026-10-22 archive (translation/sources/LQCOL-PLUS.md). Spec numbers live in src/data/products/lqcol-plus.json.',
    template: 'lqcol',
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
      // \n＝舊站的 <br>；舊站英文的斷行位置照抄，中文自行斷在相近處
      labels: lang === 'en'
        ? ['Patented Leak Safe\nTechnology with\nWelded 304 Stainless\nSteel Connector.', `${b('B07')}\n${b('B18')}`, `${b('B07')}\n${b('B19')}`, b('B11'), 'Customizable Nitrogen (N₂)\nPre-charge', b('B21')]
        : ['專利防漏技術，\n搭配焊接式 304 不鏽鋼接頭。', `${b('B07')}\n${b('B18')}`, `${b('B07')}\n${b('B19')}`, b('B11'), '可客製的氮氣（N₂）\n預充', '專利氣閥結構護蓋，\n附 O-ring 密封蓋。'],
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

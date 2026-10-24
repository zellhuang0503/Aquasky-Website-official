// 內容集合：每個語系一個 JSON 檔。schema 只驗格式（欄位有沒有、型別對不對），
// 不驗事實；規格數字的事實來源是 src/data/products/*.json。
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const lang = z.enum(['en', 'zh', 'es', 'fr', 'ru', 'ar']);
// draft-ai＝AI 初稿未審；approved-legacy＝沿用舊站已上線文字；approved＝客戶審過
const status = z.enum(['draft-ai', 'approved-legacy', 'approved']);
const seo = z.object({ title: z.string().min(10), description: z.string().min(40).max(220) });
const leadItem = z.object({ lead: z.string(), text: z.string().min(1) });

// 模板 lqcol：2025 新版系列頁（深色底、特色、結構圖、規格表、FAQ）。目前只有 LQCOL-PLUS。
const lqcol = z.object({
  template: z.literal('lqcol'),
  lang,
  status,
  seo,
  h1: z.string(),
  about: z.object({ heading: z.string(), body: z.string().min(50) }),
  features: z.object({
    heading: z.string(),
    groups: z.array(z.object({ label: z.string(), items: z.array(leadItem).min(1) })).min(1),
  }),
  structure: z.object({ alt: z.string(), labels: z.array(z.string()).length(6) }),
  applications: z.object({ heading: z.string(), alt: z.string(), items: z.array(leadItem).min(1) }),
  specs: z.object({
    heading: z.string(),
    tableTitle: z.string(),
    captionCarbon: z.string(),
    captionStainless: z.string(),
    columns: z.object({
      model: z.string(), volume: z.string(), diameter: z.string(), height: z.string(),
      boxLength: z.string(), boxWidth: z.string(), boxHeight: z.string(),
      netWeight: z.string(), grossWeight: z.string(), shippingVolume: z.string(), connection: z.string(),
    }),
    props: z.object({
      shell: z.string(), shellValue: z.string(),
      systemConnection: z.string(), systemConnectionValue: z.string(),
      coating: z.string(), coatingValue: z.string(),
      diaphragm: z.string(), diaphragmValue: z.string(),
      factoryPrecharge: z.string(),
      maxWorkingTemp: z.string(), maxWorkingTempCarbon: z.string(), maxWorkingTempStainless: z.string(),
      maxWorkingPressure: z.string(),
    }),
  }),
  faq: z.object({ heading: z.string(), items: z.array(z.object({ q: z.string(), a: z.string() })).min(1) }),
  downloads: z.object({ heading: z.string(), brochure: z.string(), manual: z.string() }),
  productLineHeading: z.string(),
});

// 模板 classic：舊版系列頁（彩色底圖、標題圖、介紹文、型號清單）。PUMPLUS、RO-PLUS、THERMAL、HYDRO、PREMIUM、MEGA、SOLAR。
// 舊站 zh 頁沒有型號清單（showModels false），部分放 DM 圖（edmImages）。
const classic = z.object({
  template: z.literal('classic'),
  lang,
  status,
  seo,
  h1: z.string().min(3),
  about: z.object({ heading: z.string().min(3), body: z.string().min(50) }),
  showModels: z.boolean(),
  groupHeadings: z.array(z.string()),
  // width/height 是舊站寫在 style 的原值（有的頁沒有）；頁面一律用 img-responsive，不輸出尺寸（同舊站 JS 的行為）
  edmImages: z.array(z.object({ src: z.string().startsWith('/'), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), alt: z.string() })),
});

const series = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/series' }),
  schema: z.discriminatedUnion('template', [lqcol, classic]),
});

const home = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/home' }),
  schema: z.object({
    lang,
    status,
    seo,
    h1: z.string(),
    companyName: z.string(),
    productLineHeading: z.string(),
    selectionTools: z.object({ heading: z.string(), cta: z.string(), image: z.string(), alt: z.string() }),
    slidesAlt: z.string(),
    certifications: z.object({
      heading: z.string(),
      // label 可空（舊站 en 首頁圖示沒有說明文字）；draftLabel 是待客戶審的建議文字，不會輸出
      items: z.array(z.object({ icon: z.string(), label: z.string(), draftLabel: z.string().optional() })).length(8),
    }),
  }),
});

// 產品資料（src/data/products/*.json）：規格數字的唯一事實來源，也要過 schema。
const numStr = z.string().regex(/^\d+(\.\d+)?$/, '數字以舊站原字串保存');
const lqcolRow = z.object({
  model: z.string().regex(/^LQC-\d+(SS)?$/), modelOnOldSite: z.string(),
  volumeL: numStr, volumeGal: numStr, diameterCm: numStr, diameterIn: numStr, heightCm: numStr, heightIn: numStr,
  boxLengthCm: numStr, boxLengthIn: numStr, boxWidthCm: numStr, boxWidthIn: numStr, boxHeightCm: numStr, boxHeightIn: numStr,
  netWeightKg: numStr, netWeightLb: numStr, grossWeightKg: numStr, grossWeightLb: numStr, shippingVolumeCuf: numStr,
  connection: z.string().min(1),
});
const sitePath = z.string().regex(/^\/[^\s]*$/);
const img = z.object({ src: sitePath, class: z.string() });
const productBase = { id: z.string().min(1), series: z.string().min(1), path: sitePath, legacyCss: z.string(), assets: z.array(z.string()).optional() };
const lqcolProduct = z.object({
  ...productBase,
  template: z.literal('lqcol'),
  images: z.object({ logo: sitePath, hero: sitePath, structure: sitePath, applications: sitePath }),
  downloads: z.array(z.object({ key: z.enum(['brochure', 'manual']), pdf: sitePath, cover: sitePath, sizeBytes: z.number().int().positive() })).length(2),
  specs: z.object({
    carbonSteel: z.array(lqcolRow).min(1), stainlessSteel: z.array(lqcolRow).min(1),
    common: z.object({ factoryPrecharge: z.string(), maxWorkingPressure: z.string(), maxWorkingTempCarbon: z.string(), maxWorkingTempStainless: z.string() }),
  }),
  structureFigure: z.object({
    stagePaddingTop: z.string(), font: z.string(), img: z.object({ left: z.string(), top: z.string(), width: z.string() }), viewBox: z.string(),
    lines: z.array(z.object({ points: z.string(), dots: z.array(z.tuple([z.number(), z.number()])) })).length(6),
    labels: z.array(z.object({ left: z.string(), top: z.string(), center: z.boolean().optional() })).length(6),
    mobileMarkers: z.array(z.object({ left: z.string(), top: z.string() })).length(6),
  }),
  dataQuestions: z.array(z.string()),
});
const classicProduct = z.object({
  ...productBase,
  template: z.literal('classic'),
  titleBlock: z.object({ present: z.boolean(), spacerBefore: z.string().regex(/^(<p>\s*)*$/), spacerAfter: z.string().regex(/^(\s*(<\/p>|<p>&nbsp;<\/p>|<p>\s*<\/p>))*$/) }),
  titleImage: img.nullable(),
  heroBlocks: z.array(z.object({ class: z.string(), image: img.nullable() })),
  preBanner: z.object({ bg: z.string().regex(/^#[0-9A-Fa-f]{3,6}$/), image: img }).nullable(),
  groups: z.array(z.object({
    key: z.string(), rowClass: z.string().startsWith('row page_pd_item'), colClass: z.string().startsWith('col-'), itemWrapper: z.boolean(),
    models: z.array(z.object({
      model: z.string().min(1), volumeText: z.string(), volumeL: z.number().nullable(), volumeGal: z.number().nullable(),
      image: sitePath, detailPath: sitePath,
    })).min(1),
  })).min(1),
  dataQuestions: z.array(z.string()),
});
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/products' }),
  schema: z.discriminatedUnion('template', [lqcolProduct, classicProduct]),
});

export const collections = { series, home, products };

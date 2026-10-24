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
  // DM 區塊的 HTML 照舊站結構（含空段落），只允許 p、&nbsp;、img 三種東西
  edmHtml: z.string().regex(/^((<p( style="text-align: ?center;")?>|<\/p>|&nbsp;|<img src="\/[^"]+" alt="" class="img-responsive center-block" loading="lazy">|\s)*)$/),
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
const img = z.object({ src: sitePath, class: z.string(), alt: z.string().optional() });
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

// 照抄型頁面：舊站主體 HTML 整段（src/content/legacy/<id>/<lang>.json）＋語系無關設定（src/data/pages/<id>.json）
const legacy = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/legacy' }),
  schema: z.object({
    template: z.literal('legacy'),
    lang,
    status,
    // 舊站下載子頁的 description 長到 2927 字，照抄；其餘頁本來就在 220 字內
    seo: z.object({ title: z.string().min(10), description: z.string().min(40) }),
    h1: z.string().min(3),
    hasVisibleH1: z.boolean(),
    /** 頁內第一個 h2（下載子頁的「EDM English」），給麵包屑用 */
    subtitle: z.string().optional(),
    // 舊站 <head> 的 JSON-LD（Product），原樣搬來（無 @context）
    legacyJsonLd: z.array(z.object({ '@type': z.string() }).passthrough()),
    // 主體 HTML：不准有 script／iframe／form／事件屬性；相對路徑都已改絕對
    bodyHtml: z.string().min(200)
      .refine((s) => !/<(script|object|embed)\b/i.test(s), 'bodyHtml 不能有 script/object/embed')
      .refine((s) => [...s.matchAll(/<iframe[^>]*src="([^"]*)"/g)].every((m) => /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//.test(m[1])), 'iframe 只准 YouTube')
      .refine((s) => !/<form\b(?![^>]*action="#")/i.test(s), '表單只能 action="#"（新站是靜態站，送出要另接 Worker API）')
      .refine((s) => !/\son\w+=/i.test(s), 'bodyHtml 不能有 on* 事件屬性')
      .refine((s) => !/cdn-cgi|__cf_email__/.test(s), 'bodyHtml 不能留 Cloudflare email 混淆')
      .refine((s) => !/(src|href)="(?!\/|https?:|#|mailto:|tel:)/.test(s), 'bodyHtml 的 src/href 必須是絕對路徑'),
  }),
});
const pages = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/data/pages' }),
  schema: z.object({
    id: z.string().min(1),
    path: sitePath,
    template: z.literal('legacy'),
    legacyCss: z.string(),
    extraCss: z.array(sitePath),
    // 舊站首頁／products 載 bootstrap.min.css，其他內頁載客製 bootstrap.css
    bootstrap: z.enum(['min', 'full']).default('full'),
    /** 網址沒有語系前綴、只有一個版本（/download/<language>，舊站一律英文介面）；內容檔只有 en.json */
    neutral: z.boolean().default(false),
    /** 這頁有哪些語系（產品明細、配件明細、下載子頁只有 en） */
    langs: z.array(lang).min(1).default(['en', 'zh']),
    assets: z.array(z.string()),
    dataQuestions: z.array(z.string()),
  }),
});

// 新聞：每篇一檔（src/content/news/<lang>/<CAT>/<slug>.json，import-news.mjs 從舊站封存產生）
const newsCategory = z.enum(['EXHIBITIONS', 'INDUSTRY', 'VIDEOS']);
const newsKind = z.enum(['news', 'videos']);
const news = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/news' }),
  schema: z.object({
    kind: newsKind,
    lang,
    category: newsCategory,
    slug: z.string().regex(/^[A-Za-z0-9._-]+$/),
    path: sitePath.regex(/^\/(news-detail|videos-detail)\//),
    status,
    /** 舊站列表與明細顯示的日期字樣，MM DD YYYY，照抄 */
    dateText: z.string().regex(/^\d\d \d\d \d{4}$/),
    // 舊站影片的 Article 沒有 datePublished
    datePublished: z.string().regex(/^\d{4}-\d\d-\d\dT/).nullable(),
    title: z.string().min(3),
    cover: sitePath,
    excerptHtml: z.string(),
    // 舊站新聞的 description 長短不一（13～1235 字），照抄；之後整理再收緊
    seo: z.object({ title: z.string().min(3), description: z.string().min(1) }),
    legacyJsonLd: z.array(z.object({ '@type': z.string() }).passthrough()).min(1),
    // 正文照抄；只准 YouTube 的 iframe，其餘跟照抄頁一樣的限制
    bodyHtml: z.string().min(50)
      .refine((s) => !/<(script|object|embed)\b/i.test(s), 'bodyHtml 不能有 script/object/embed')
      .refine((s) => !/<form\b/i.test(s), 'bodyHtml 不能有表單')
      .refine((s) => !/\son\w+=/i.test(s), 'bodyHtml 不能有 on* 事件屬性')
      .refine((s) => !/cdn-cgi|__cf_email__/.test(s), 'bodyHtml 不能留 Cloudflare email 混淆')
      .refine((s) => [...s.matchAll(/<iframe[^>]*src="([^"]*)"/g)].every((m) => /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//.test(m[1])), 'iframe 只准 YouTube')
      .refine((s) => !/(src|href)="(?!\/|https?:|#|mailto:|tel:)/.test(s), 'bodyHtml 的 src/href 必須是絕對路徑'),
    assets: z.array(z.string()),
  }),
});
// 新聞列表設定：每個語系＋分類一檔（src/data/news/<lang>-<CAT>.json）
const newsLists = defineCollection({
  loader: glob({ pattern: '*-*.json', base: './src/data/news' }),
  schema: z.object({
    id: z.string(),
    kind: newsKind,
    lang,
    category: newsCategory,
    path: sitePath.regex(/^\/(news\/|videos$)/),
    perPage: z.literal(5),
    pageCount: z.number().int().min(1),
    titleBand: z.string().min(1),
    h4Recent: z.string().min(1),
    h4Side: z.string().min(1),
    /** 明細頁的 h4（新聞＝h4Recent；影片是「VIDEOS／影片專區」） */
    h4Detail: z.string().min(1),
    moreLabel: z.string().min(1),
    backLabel: z.string().min(1),
    sidebar: z.array(z.object({ dateText: z.string().min(1), href: sitePath, title: z.string().min(1) })).min(1).max(5),
    order: z.array(z.string()).min(1),
    seo,
  }).refine((l) => Math.ceil(l.order.length / l.perPage) === l.pageCount, '頁數要等於 ceil(篇數/5)'),
});

export const collections = { series, home, products, legacy, pages, news, newsLists };

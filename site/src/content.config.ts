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

const series = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/series' }),
  schema: z.object({
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
  }),
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
      items: z.array(z.object({ icon: z.string(), label: z.string() })).length(8),
    }),
  }),
});

export const collections = { series, home };

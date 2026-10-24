// 不是「內容集合」的資料檔（品牌事實、選單）在這裡用 zod 驗一次格式；欄位錯了 build 就會失敗。
// 產品資料在 src/data/products/*.json，走 content.config.ts 的 products 集合。
import { z } from 'astro/zod';
import brandJson from '../data/brand.json';
import navJson from '../data/nav.json';

const lang = z.enum(['en', 'zh', 'es', 'fr', 'ru', 'ar']);
const localized = z.object({ en: z.string().min(1), zh: z.string().min(1) });
const path = z.string().regex(/^\/[^\s]*$/, '路徑要以 / 開頭、無空白');

const brandSchema = z.object({
  _note: z.string().optional(),
  brand: z.string().min(1),
  legalName: localized,
  shortName: localized,
  tagline: localized,
  founded: z.string().regex(/^\d{4}$/),
  url: z.string().regex(/^https:\/\//),
  logo: path,
  footerLogo: path,
  address: localized.extend({
    postal: z.object({ streetAddress: z.string(), addressLocality: z.string(), postalCode: z.string(), addressCountry: z.string().length(2) }),
  }),
  tel: z.string().regex(/^[\d-]+$/),
  fax: z.string().regex(/^[\d-]+$/),
  sameAs: z.array(z.string().regex(/^https:\/\//)).min(1),
  ga4: z.string().regex(/^G-[A-Z0-9]+$/),
  languages: z.array(z.object({ code: lang, label: z.string(), htmlLang: z.string(), dir: z.enum(['ltr', 'rtl']), live: z.boolean() })).min(1),
});

const navLink = z.object({ key: z.string().min(1), path, langs: z.array(lang).optional() });
const navSchema = z.object({
  _note: z.string().optional(),
  items: z.array(z.object({
    key: z.string().min(1),
    path: path.optional(),
    children: z.array(navLink).optional(),
    groups: z.array(z.object({ key: z.string().min(1), children: z.array(navLink).min(1) })).optional(),
    langs: z.array(lang).optional(),
  })).min(1),
  productLine: z.array(z.object({
    key: z.string().min(1), path, image: path, thumb: path,
    also: z.object({ key: z.string().min(1), path }).optional(),
  })).min(1),
});

export const brand = brandSchema.parse(brandJson);
export const nav = navSchema.parse(navJson);
export type NavItem = (typeof nav)['items'][number];

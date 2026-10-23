// 語系工具：語系清單、介面文字、網址組合。介面文字在 src/i18n/<lang>.json。
import brand from '../data/brand.json';
import en from '../i18n/en.json';
import zh from '../i18n/zh.json';

export type Lang = 'en' | 'zh' | 'es' | 'fr' | 'ru' | 'ar';
export type Dict = typeof en;

const dicts: Partial<Record<Lang, Dict>> = { en, zh: zh as Dict };

export const languages = brand.languages as { code: Lang; label: string; htmlLang: string; dir: 'ltr' | 'rtl'; live: boolean }[];
/** 這一版有建置的語系（brand.json 裡 live: true）。加語系＝補 i18n/<lang>.json、內容檔，再把 live 改 true。 */
export const liveLangs = languages.filter((l) => l.live).map((l) => l.code);

export function langInfo(code: Lang) {
  const info = languages.find((l) => l.code === code);
  if (!info) throw new Error(`unknown language ${code}`);
  return info;
}

export function t(lang: Lang): Dict {
  const d = dicts[lang];
  if (!d) throw new Error(`no UI strings for ${lang}`);
  return d;
}

/** /en + /LQCOL-PLUS → /en/LQCOL-PLUS；path 為 '' 時是語系首頁 /en */
export function href(lang: Lang, path = ''): string {
  return `/${lang}${path}`;
}

export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function pick<T extends Record<string, unknown>>(obj: T, lang: Lang): string {
  const v = (obj as Record<string, unknown>)[lang] ?? (obj as Record<string, unknown>).en;
  return String(v ?? '');
}

/** 部署階段：preview（預設，noindex、不載 GA）或 production。build 時用 SITE_STAGE=production 切換。 */
export const stage: 'preview' | 'production' =
  import.meta.env.SITE_STAGE === 'production' ? 'production' : 'preview';

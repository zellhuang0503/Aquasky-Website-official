// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 網址規則：舊站沒有結尾斜線（/en、/en/LQCOL-PLUS），
// 用 build.format 'file' + trailingSlash 'never' 產生 /en.html、/en/LQCOL-PLUS.html，
// Cloudflare Workers Static Assets（html_handling: auto-trailing-slash）會以 /en、/en/LQCOL-PLUS 提供，舊網址一個都不變。
export default defineConfig({
  site: 'https://aquaskyplus.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // 語系路由自己用 [lang] 動態頁處理（/en、/zh…），不開 Astro i18n 路由，避免它對 / 做自動導向。
  integrations: [
    sitemap({
      filter: (page) => !/\/404(\.html)?$/.test(page),
      i18n: { defaultLocale: 'en', locales: { en: 'en', zh: 'zh-Hant' } },
    }),
  ],
});

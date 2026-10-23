# site／AQUASKY 新官網（代表頁試作）

建立：2026-10-23。整體規劃 §12 第 2 階段「代表頁試作」。技術棧：Astro 7 ＋ TypeScript ＋ JSON 內容檔 ＋ Cloudflare Workers Static Assets（純靜態，沒有 Worker 程式）。設定照 `E:\CascadeProjects\RSG\rsg-site`。

## 目前有的頁

| 網址（與舊站相同） | 檔案 | 狀態 |
| --- | --- | --- |
| `/`（英文首頁，canonical 指 `/en`） | `src/pages/index.astro` | 舊站文字 |
| `/en`、`/zh` | `src/pages/[lang].astro` | 舊站文字；英文認證說明是新補的，待審 |
| `/en/LQCOL-PLUS` | `src/pages/[lang]/LQCOL-PLUS.astro` | 舊站英文原文 |
| `/zh/LQCOL-PLUS` | 同上 | **AI 初稿**，頁面上有黃色提示，待 Tiffany 審 |

其他選單項目（PUMPLUS、about…）還沒搬，點了會到 404。`npm run verify` 會列出這些連結。

## 指令（在 site/ 目錄）

```powershell
npm install
npm run assets:copy     # 從 ../migration-2026-10-22 封存複製舊站圖片／PDF 到 public/（不進 Git）
npm run build           # 產生 dist/（預設預覽階段：noindex、不載 GA）
npm run verify          # 驗收 dist：網址、lang、h1、canonical、hreflang、JSON-LD、規格數字＝資料檔、圖片存在
npm run cf:preview      # 用 Cloudflare 本機模擬跑 dist：http://127.0.0.1:8788/en
npm run check           # 型別與模板檢查
```

正式上線用 `SITE_STAGE=production npm run build`：拿掉 noindex、輸出 GA4（沿用舊站 G-TJ6TEMQRJE）。

## 內容放哪（改內容只改這些檔）

| 要改什麼 | 檔案 |
| --- | --- |
| 公司名稱、地址、電話、社群連結、語系清單 | `src/data/brand.json` |
| 選單結構、首頁產品系列與圖片 | `src/data/nav.json` |
| 選單與共用按鈕文字 | `src/i18n/en.json`、`src/i18n/zh.json` |
| 首頁文字 | `src/content/home/en.json`、`zh.json` |
| LQCOL-PLUS 文字 | `src/content/series/lqcol-plus/en.json`、`zh.json` |
| LQCOL-PLUS 型號與規格數字 | `src/data/products/lqcol-plus.json`（兩個語系、JSON-LD 共用這一份） |

內容檔有 schema（`src/content.config.ts`），欄位少了或型別錯，`npm run build` 會直接失敗。schema 只驗格式，不驗事實。

## 部署（還沒做）

`wrangler.jsonc` 只設了 assets，沒有掛 aquaskyplus.com。上線前要做的：

1. Cloudflare Workers Builds 連 GitHub：根目錄 `site`、組建命令 `npm ci && npm run assets:copy && npm run build`、部署命令 `npx wrangler deploy`。注意 `assets:copy` 讀的是 repo 裡沒有的封存資料夾，正式流程要改成把圖片放 R2 或另一個來源（待決）。
2. 帳戶歸屬（客戶名下或梵亞名下）待合約決定。
3. 切換時加 routes，並逐項解除舊 `aquasky-edge-aeo` Worker 的路由（規劃 §13）。

## 已知的資料問題（舊站本來就這樣，沒有改，要問客戶）

列在 `src/data/products/lqcol-plus.json` 的 `dataQuestions`：LQC-3 重量與外箱比 LQC-8 大、LQC-60SS 的加侖數、內文提到的 0.5L／1L／100L+ 機型規格表沒有。

## 跟舊站不一樣的地方（刻意的）

- hreflang 逐頁對應（舊站全部指首頁，是 SEO 錯誤）。
- 型號統一寫 `LQC-3`（舊站 `LQC- 3`、`LQC -12` 空格亂）；下載連結「Brchure」錯字改成「Brochure」。
- 結構圖的六個標示改成圖下編號清單（舊站是疊在圖上的絕對定位文字，手機會亂）。
- 原生輸出 JSON-LD：Organization、WebSite、BreadcrumbList、ProductGroup（9 個型號）、FAQPage。舊站靠 AEO Worker 從外面注入。
- 預覽版頁頂有黃色 PREVIEW 條，正式版沒有。

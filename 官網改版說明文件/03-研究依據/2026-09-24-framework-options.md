# AquaSkyPlus 官網遷移：框架與 Cloudflare 官方資料研究

研究日期：2026-09-24。定位：架構評估資料，不是已核准實作規格。本文只確認框架與平台能力；未以本文證明既有站台的頁數、PHP 框架、資料庫、表單或會員功能。

## 建議結論

若盤點確認以公開產品、公司介紹、文章、FAQ、下載資料及詢問表單為主，建議採 **Astro + TypeScript + Git 內的 Markdown／JSON 內容 + Cloudflare Workers Static Assets**。互動或表單需求另用小型 Worker API；需要時才加 Astro Cloudflare adapter。這是根據使用者「不要 CMS、由 AI agent 協助維護」與內容型官網情境做出的架構判斷，不是聲稱 Astro 在所有網站都優於其他框架。

Astro 可預先產生 HTML；完全靜態的部署只需把 `dist` 設為 Workers assets 目錄，無需 Worker 渲染程式與 Astro adapter。[Cloudflare Astro 指南](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)

## 三個框架方向

| 方案 | 官方已確認能力 | 本案判斷與使用條件 |
| --- | --- | --- |
| Astro | 靜態預先產生頁面，也可依需求加入伺服器渲染；支援局部互動 islands | 首選。公開內容先靜態化，讓維護重點落在內容、版型、導向與驗收 |
| SvelteKit | 官方 `@sveltejs/adapter-cloudflare` 提供 Cloudflare 部署方式 | 若盤點出大量互動工具、複雜表單與應用程式流程，可列備選；目前沒有證據需要為此加重主站 |
| Next.js 路線 | Cloudflare 官方目前以 vinext 為預設路線；OpenNext 仍有維護既有應用的部署指南 | 若團隊已重度投資 React／Next.js 或確認有複雜應用需求，再評估；單純內容站無須先選最複雜路線 |

來源：[Astro on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)、[SvelteKit 官方 Cloudflare adapter](https://svelte.dev/docs/kit/adapter-cloudflare)、[Next.js on Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)、[OpenNext adapter](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)。表中本案適用性是研究建議，不是官方框架排名。

### 需要避免沿用的過時說法

- **「新 Astro SSR 專案直接部署 Pages」**：目前 Astro Cloudflare adapter 文件已移除 Pages 支援，建議 Workers；這不等於所有純靜態 HTML 都不能放 Pages。本案新架構直接選 Workers Static Assets，減少日後再遷移的需求。[Astro adapter 文件](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- **「Cloudflare 新 Next.js 專案一律推薦 OpenNext」**：2026-08-25 更新的官方指南改為推薦 vinext，且文件仍將 vinext 標為 beta。OpenNext 指南的定位是維護既有專案；因此不應把 vinext 當成熟度無須驗證的透明替換。[Next.js 指南](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)、[OpenNext 指南](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- **「Workers 就是完整 Node.js 主機」**：Workers 只支援 Node API 的一部分，有的模組是可匯入、呼叫時卻出錯的相容 stub；相容性須用實際依賴與 Workers runtime 驗證。[Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)

## 不用 CMS，內容仍需有結構

Astro Content Collections 可讀取本機 Markdown、MDX、JSON、YAML 等檔案，以 schema 驗證欄位，並提供 TypeScript 型別；建置時計算的 collections 在重新建置後才反映內容更新。[Content Collections](https://docs.astro.build/en/guides/content-collections/)

建議內容設計（待正式盤點後定案）：

- 產品：穩定產品 ID、語系、名稱、型號、分類、規格、圖片、下載檔、SEO 欄位；固定規格用 JSON 或 YAML。
- 文章與 FAQ：Markdown 加明確欄位；需要嵌入受控互動元件時才使用 MDX。
- 版型：Astro components 與 layouts；同類頁面共用版型，讓 AI 修改單一內容檔就能更新頁面。
- 網址：獨立記錄舊網址與新網址映射，避免內容改名時偷偷改變已收錄 URL。
- 商業事實：型號、認證、效能數字、聯絡資訊需保留來源與人工確認；schema 只能檢查格式，不能證明事實正確。

上述欄位是建議資料模型，不代表既有站已有所有欄位。無 CMS 代表移除瀏覽器內容編輯後台，仍保留內容檔、版本管理、預覽與發布程序。

## AI agent 修改與發布流程建議

1. 黃老闆提出修改需求；AI 讀取專案規則與內容來源。
2. 在分支修改限定檔案，產出差異與預覽。
3. 自動檢查內容 schema、建置、內部連結、圖片／附件、SEO 欄位及關鍵流程。
4. 人工看預覽，確認內容與版面後合併。
5. 正式分支觸發部署；驗證公開網址、導向與表單實際送達。若失敗，回復已知良好版本。

Cloudflare GitHub integration 支援 push 建置部署、PR 建置狀態，以及執行 `wrangler preview` 的建置所產生的預覽網址。流程必須明確區分預覽分支與正式部署，不能假設「任何 push 都只是預覽」。[Cloudflare GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/)

GitHub protected branches 可要求通過檢查與審核；私有倉庫的可用性需核對 GitHub 方案，管理員是否能繞過也必須確認。[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

這套流程不要求網站訪客端執行 AI，也不要求一開始建立 AI 自動發佈系統。AI 的第一個職責是修改可審查的內容與程式碼。

## Cloudflare 部署與遷移邊界

### 靜態頁與動態服務分開估計

Workers Static Assets 的靜態請求免費且不限次數；呼叫 Worker 程式（例如 SSR）的請求依 Workers 計費。`run_worker_first` 會讓匹配的請求先進 Worker，免費額度耗盡可回 429，不能把整站預估成永久零成本。[Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

目前每個 Worker version 的資源檔案上限為 Free 20,000、Paid 100,000，單檔最大 25 MiB。需先盤點大型 PDF、圖片與下載檔；超限檔案另選合適儲存方式。[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

若加 Astro adapter，SSR 在 `workerd` 執行；adapter 的預先渲染預設也使用 `workerd`，必要時可設定 `prerenderEnvironment: 'node'`。這是「使用 adapter」的限制，不應錯套到沒有 adapter 的純靜態建置。[Astro Cloudflare runtime](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

### PHP 舊網址不能只看副檔名

若舊站頁面以 `product.php?id=123` 等 query string 區別內容，Workers Static Assets 的 `_redirects` 不支援以 query 參數匹配規則；需用 Worker 程式或適用的 Cloudflare 規則讀取 query，逐筆映射與驗收。`_redirects` 也不會自動套用在 Worker 程式所回傳的回應上。[Static Assets redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)

因此，保留 PHP 形式的公開 URL 並不等於保留 PHP 引擎；也不能把所有 `.php` 頁一律導回首頁。這是依 URL 匹配能力推導的遷移原則，實際需要哪些規則仍待舊網址清冊確認。

### 無 CMS 不等於無後端

若現站有詢價、表單寄信、會員、庫存、訂單、搜尋或串接外部系統，各功能須各自確認保留、替換或移除。靜態內容遷移與動態商業流程重做應分項估時；未證實存在的功能不列為已確定需求。

## 規劃時應明列的變更

| 層面 | 可能保留 | 需要重做或轉換 |
| --- | --- | --- |
| 品牌與內容 | 經確認的文字、產品資料、品牌素材 | 內容抽取、結構化、缺漏補齊與來源核對 |
| 前台版面 | 可依需求保留既有視覺與操作習慣 | PHP template 改為 Astro 元件；互動程式逐一驗證 |
| 網址與 SEO | 已有有效 URL、標題、描述、結構化資料意圖 | 路由、canonical、sitemap、301、404、hreflang 的新實作與比對 |
| 內容更新 | 原有內容審查責任 | CMS 操作改為 AI 提交差異、預覽、人工確認與 Git 發布 |
| 主機與服務 | 既有網域與必要第三方帳號 | 靜態主站、動態 API、Secrets、日誌與部署配置 |
| 復原與維運 | 原站保留作切換初期復原來源 | 發布紀錄、部署回復、轉址與關鍵轉換監測 |

以上是工作分解，不是比例估算。沒有原始碼／資料庫匯出、上傳素材、功能清單及舊 URL 清冊前，不能誠實宣稱「只改 20%」或「一鍵複製完成」。

## 最小驗證範圍與未驗證事項

正式重建前，先用首頁、一個產品列表、一個產品內頁、一篇文章與一組舊 PHP URL 做最小試作；若有表單，再加入完整送達驗證。驗收包括：內容欄位一致、手機版可用、關鍵 URL 與狀態碼正確、舊 query URL 單次正確轉址、實際 Cloudflare runtime 可執行，以及只改內容檔即可完成一次預覽發布循環。

本次只完成官方文件查證與架構研究；沒有安裝框架、建置網站、測量效能、建立 Cloudflare 資源、設定 GitHub 保護、驗證郵件送達或部署。框架版本與部署相容性仍需在試作時鎖定並實測。

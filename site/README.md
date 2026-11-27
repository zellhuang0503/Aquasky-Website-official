# site／AQUASKY 新官網（代表頁試作）

建立：2026-10-23。整體規劃 §12 第 2 階段「代表頁試作」。技術棧：Astro 7 ＋ TypeScript ＋ JSON 內容檔 ＋ Cloudflare Workers Static Assets（純靜態，沒有 Worker 程式）。設定照 `E:\CascadeProjects\RSG\rsg-site`。

## 目前有的頁

| 網址（與舊站相同） | 檔案 | 狀態 |
| --- | --- | --- |
| `/`（英文首頁，canonical 指 `/en`） | `src/pages/index.astro` | 舊站文字 |
| `/en`、`/zh` | `src/pages/[lang].astro` | 舊站文字；英文認證說明是新補的，待審 |
| `/en/LQCOL-PLUS` | `src/pages/[lang]/LQCOL-PLUS.astro` | 舊站英文原文＋Tiffany 2026-11-20 指定改字（搜尋標題／描述、容量那句） |
| `/zh/LQCOL-PLUS` | 同上 | Tiffany 2026-11-13 審過（approved）；11/20 改字照英文同步 |
| `/en/PUMPLUS`、`/en/RO-PLUS`、`/en/THERMAL-PLUS`、`/en/HYDRO-PLUS`、`/en/PREMIUM-PLUS`、`/en/MEGA-PLUS`、`/en/SOLAR-PLUS` | `src/pages/[lang]/[page].astro` → `ClassicSeries.astro`（經典模板） | 舊站英文原文＋型號清單 |
| 同上 7 頁的 `/zh/…` | 同上 | 舊站中文原文；**照舊站沒有型號清單**，7 頁都放舊站的兩張 DM 大圖（照舊站 JS 的行為用 img-responsive：圖比欄寬就滿版，比欄窄就原尺寸置中）；DM 區塊的段落與空段落結構照舊站保存在 `edmHtml` |
| `/en`、`/zh` 的 supreme、dl-ce、asme-ht、GIGA-PLUS、accessories | `src/pages/[lang]/[page].astro` → `LegacyPage.astro`（照抄模板） | 舊站主體 HTML 整段照抄，verify 會把頁面純文字跟封存逐字比 |
| `/en`、`/zh` 的 products、about、feature、certification、FAQ、contact、downloadpage、sel_tools | 同上（照抄模板） | 同上。contact 表單 HTML 照舊站（拿掉 PHP 驗證碼列與隱藏欄位），送出打 `/api/contact`（Worker＋Turnstile，見「聯絡表單與舊網址轉址」）；sel_tools 只是入口頁，三個計算器另做 |
| `/en/products-det/<series>/<model>` 90 頁、`/en/accessories-det/<item>` 6 頁（舊站只有英文版；中文系列頁照舊站沒有型號清單，不連明細） | `src/pages/[lang]/products-det/[series]/[model].astro`、`[lang]/accessories-det/[item].astro` → `LegacyPage.astro`（照抄模板，`langs: ['en']`） | 主體照抄，verify 逐字比。匯入時拿掉 Google 翻譯殘留的 `<font>` 包裝（90 頁合計 6 萬多個、單頁最多約 1,100 個；APT-3 從 57 KB 變 15 KB）；配件頁「<<back」改連 `/en/accessories`；YouTube iframe 保留；hreflang 只列 en；麵包屑 首頁›產品系列›該系列›型號 |
| `/en/sel_unit_ps`、`/en/sel_unit_vsd`、`/en/sel_unit_thermal`（zh 同）選型計算器 3 個 | `src/pages/[lang]/[page].astro` → `LegacyPage.astro`（照抄模板，`calculator: ps/vsd/thermal`）＋ `public/js/selection-tools.js` ＋ `src/data/selection-tools.json` | 表單 HTML 照抄舊站；計算從舊站的 jQuery＋AJAX（select_api*.php）改成純 JS 在瀏覽器算，算式照溢康 2022-04-13 文件（`官網改版說明文件/05-舊站資料擷取/selection-tools-原始算式/README.md`），型號對照照 2020 Excel。`npm run test:tools` 跑公式單元測試 |
| `/en/certification-page/<slug>`、`/zh/…` 6 張認證（iso-9001-eurocert、kc-korea、acs-france、wras-uk、watermark-australia、psb-singapore） | `src/pages/[lang]/certification-page/[slug].astro` → `LegacyPage.astro`（照抄模板） | 舊站是 `certification_page.php?sid=N`（查詢字串，靜態站做不了），封存也沒抓到；10/25 從線上抓（`migration-2026-10-22/live-2026-10-25/`，索引用新網址當 key）。wras-uk（sid=8）舊站有頁但總覽沒連，Tiffany 2026-11-20 要求補上，11/26 抓到 `live-2026-11-26/`。title／description 是 Tiffany 11/20 給的英文，zh 由梵亞照意思翻。認證頁的「CERTIFICATION LINK」匯入時改連新網址；切換時舊網址要 Worker 轉址 |
| `/en/sel_unit_container`（六語）貨櫃裝載計算工具（2026-11-27 新增，舊站沒有） | `src/pages/[lang]/sel_unit_container.astro` ＋ `public/js/container-calculator.js` ＋ `src/data/container-calculator.json` | 依溢康 2026-11-23 Excel「AQUASKY PRESSURE TANK Container Capacity calculator」：輸入立式 20 種、臥式 6 種容量的數量，算總材積（CUF）、總重、20GP／40GP／40HQ 裝載率（建議 85%），並建議最小可裝的貨櫃。Excel 數字疑點 4 項記在該檔 `dataQuestions`（待 Tiffany，Google 文件 152CG…）。外觀沿用選型工具頁；sel_tools 入口加第 4 顆按鈕（client-text-edits 有登記）。文字六語都是 draft-ai。`npm run test:tools` 驗算 |
| `/download/english` … 14 個語系子頁（網址沒有語系前綴） | `src/pages/download/[language].astro` → `LegacyPage.astro`（照抄模板，`neutral: true`） | 舊站這些頁一律英文介面、沒有 canonical、hreflang 7 個全指各語系首頁（錯的）；新站英文介面、canonical 指自己、不輸出 hreflang、語言選單回各語系首頁。83 個 EDM PDF（66 MB）與封面圖由 copy 腳本複製 |
| `/en/news/EXHIBITIONS`、`/en/news/INDUSTRY`、`/en/news/<CAT>/pageN`（zh 同） | `src/pages/[lang]/news/[category].astro`、`[category]/[page].astro` → `NewsList.astro` | 舊站列表照抄：每頁 5 篇、右欄固定幾篇「熱門文章」、分頁列全頁碼；en 6＋33 頁、zh 1＋10 頁 |
| `/en/news-detail/<CAT>/<slug>`（241 篇：en 189、zh 52；四語另各 64 篇） | `src/pages/[lang]/news-detail/[category]/[slug].astro` → `NewsDetail.astro` | 正文整段照抄（`src/content/news/<lang>/<CAT>/<slug>.json`），verify 逐字比。每篇只有一個語系，沒有對應翻譯 |
| `/en/videos`、`/en/videos/page2`、`page3`（zh 同）；`/en/videos-detail/<slug>` 11 篇（zh 11 篇，slug 不同） | `src/pages/[lang]/videos.astro`、`videos/[page].astro`、`videos-detail/[slug].astro` → 同新聞的 `NewsList`／`NewsDetail`（`kind: videos`） | 版型與新聞完全相同（CSS 同一份）；明細 JSON-LD 是舊站的 Article＋VideoObject；返回鈕用 `videos_back` |

**西／法／俄／阿（es／fr／ru／ar，2026-11-26 起，本機建置、還沒部署）**：上表凡是有 `/zh/…` 的頁，四語也都有（首頁、LQCOL、7 個經典系列頁、照抄模板 13 頁＋3 個計算器、6 張認證單頁、新聞與影片列表）；網址規則相同（`/es/PUMPLUS`…）。新聞明細每語 64 篇、影片 11 篇（slug 跟 en 不同，各自只有一個語系）。產品明細 90 頁、配件明細 6 頁、`/download/<language>` 14 頁舊站只有英文，四語不做。來源與刻意差異見下面「跟舊站不一樣的地方」四語那段。

舊站的頁全部搬完：en／zh 490 頁，加四語共 985 頁（`npm run verify` 的頁數）；「尚未搬遷」是 0。2026-11-27 補抓了 10/22 封存之後舊站新發的 2 篇 INDUSTRY 新聞（立式與臥式壓力桶、UNEP 升溫峰值，六語都有），列表頁也重抓線上最新版（`migration-2026-10-22/live-2026-11-27/`）。以後舊站再發新文章：先把線上列表頁與新文章抓進封存（success.jsonl 後面加一列取代舊列），再跑 `node scripts/import-news.mjs --update-list INDUSTRY`——六語都只寫還沒有的文章，已有的文章與列表的 seo 不動。「立式與臥式壓力桶」那篇舊站六語都把圖片用 base64 直接嵌在正文，照舊站保留（`content.config.ts` 為 `data:image/` 開例外）。

## 三種系列頁模板

| 模板 | 頁 | 資料從哪來 |
| --- | --- | --- |
| `lqcol` | LQCOL-PLUS | `scripts/import-lqcol.mjs`（從 translation/ 匯入） |
| `classic` | PUMPLUS、RO-PLUS、THERMAL-PLUS、HYDRO-PLUS、PREMIUM-PLUS、MEGA-PLUS、SOLAR-PLUS | `scripts/import-classic-series.mjs`（直接解析封存的 en／zh 頁面：h1、介紹文、型號清單、DM 圖、頁面 `<style>`） |
| `news` | 新聞列表與 237 篇明細、影片列表與 22 篇明細（`kind: news`／`videos`，同一套） | `scripts/import-news.mjs`：從封存解析列表（順序、日期字樣、封面、摘要、右欄、分頁數、SEO）與明細（標題列、`#ImgAutoResponsive` 正文、舊站 NewsArticle）。只做舊站 JS 本來會做的事：圖去 inline 寬高＋加 img-responsive、Cloudflare email 還原；檔名有空格的圖改 `%20` |
| `legacy` | supreme、dl-ce、asme-ht、GIGA-PLUS、accessories（結構各不同、數量少） | `scripts/import-legacy-page.mjs`：舊頁 `</header>`…`<footer` 整段抄進 `src/content/legacy/<id>/<lang>.json` 的 `bodyHtml`（相對路徑改絕對、去 wow 動畫 class、第二個 h1 改 div、#ImgAutoResponsive 的圖照舊站 JS 改 img-responsive）；頁面樣式在 `src/data/pages/<id>.json`。schema 禁止 script／iframe／on* 屬性，表單只允許 action="#"。改文字直接改 bodyHtml |

每個系列頁自己的樣式（h1 色條顏色、底圖、標題圖位置）照舊站頁面的 `<style>` 抄在 `src/data/products/<id>.json` 的 `legacyCss`，由頁面以 `headStyle` 輸出；共用的 `src/styles/site.css` 不放任何系列專用規則，免得互相蓋到。匯入腳本只跑一次，之後改內容直接改 JSON；要重跑加 `--force`。

## 指令（在 site/ 目錄）

```powershell
npm install
npm run assets:copy     # 從 ../migration-2026-10-22 封存複製舊站圖片／PDF 到 public/（不進 Git）
npm run build           # 產生 dist/（預設預覽階段：noindex、不載 GA）
npm run test:worker     # Worker 單元測試：聯絡表單後端（scripts/test-contact.mjs）、舊網址轉址表（scripts/test-redirects.mjs）
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
| 7 個經典系列的型號清單、圖片、頁面樣式、資料疑點 | `src/data/products/<id>.json`（`dataQuestions` 自動列出公升換加侖對不上的型號） |
| 首頁頁面樣式與輪播設定 | `src/data/home.json` |
| 新聞／影片每篇文字（標題、日期字樣、摘要、正文、SEO） | `src/content/news/<lang>/<CAT>/<slug>.json`（影片的 CAT 是 VIDEOS）；新文章＝新增一檔並把 slug 加進列表 `order` 最前面 |
| 英文產品明細／配件明細的文字 | `src/content/legacy/products-det-<series>-<model>/en.json`、`accessories-det-<item>/en.json` 的 bodyHtml（id 裡的「.」改成「-」：APT-1.3 → apt-1-3，網址不變） |
| FAQ 30 題（2026-11-26 版，六語） | `../translation/faq-2026-11-26/<lang>.json`（en 照溢康 docx 原文，其他語系梵亞翻譯），改完跑 `node scripts/build-faq.mjs` 產生 `src/content/legacy/faq/<lang>.json`；verify 逐題比對翻譯檔，不再跟封存比 |
| 貨櫃裝載計算工具的數字與文字 | `src/data/container-calculator.json`（改完跑 `npm run test:tools`） |
| 選型計算器的算式參數、型號對照、結果區文字 | `src/data/selection-tools.json`（改完跑 `npm run test:tools`） |
| 下載子頁的文字與 PDF 清單 | `src/content/legacy/download-<language>/en.json` 的 bodyHtml（PDF 放 `public/download/EDM/<Language>/`，封面在 `cover/`） |
| 新聞列表：順序、右欄「熱門文章」、標題帶、按鈕字樣、SEO | `src/data/news/<lang>-<CAT>.json`（`pageCount` 要＝ceil(篇數/5)，schema 會檢查） |
| 新聞列表／明細的頁面樣式 | `src/data/news/common.json` |
| 7 個經典系列頁的「產品規格」段落（DM 圖文字轉成網頁文字：材質性能、認證標章、規格表、注意事項，六語） | `src/data/edm-specs.json`（2026-11-27 從溢康 2026-07-17 版六語 DM PDF 轉錄；頁面由 `src/components/EdmSpecs.astro` 輸出，DM 圖照留、文字放圖下方，en 放在型號清單前；verify 會檢查每個型號列與材質性能值都在頁面上。待溢康確認 3 點：Google 文件「AQUASKY 新官網｜圖片文字轉網頁文字 待確認（2026-11-27）」） |

內容檔有 schema（`src/content.config.ts`），欄位少了或型別錯，`npm run build` 會直接失敗。schema 只驗格式，不驗事實。

## 部署

### 預覽網址（2026-10-26 起上線）

**https://aquasky-site.cloundflare1.workers.dev** — 梵亞的 Cloudflare 帳戶（cloundflare1，登入者 zell.huang@gmail.com），Worker 名稱 `aquasky-site`，靜態資源＋一支小 Worker（`worker/index.mjs`，只接聯絡表單 API 與舊網址轉址，見下一節），沒有掛任何 routes；每頁 `noindex, nofollow`、不載 GA（預覽階段）。

重新部署（從本機，每次改完內容都這樣做）：

```powershell
cd "E:\CascadeProjects\Aquasky Websit official\site"; npm run build; npx wrangler deploy
```

- `npm run build` 預設就是 preview 階段（黃色 PREVIEW 條＋noindex）。**不要**用 `SITE_STAGE=production` 建置後 deploy 到這個網址。
- 圖片 PDF 跟著 `dist/` 一起上傳（1,450 檔、427 MB；Workers 靜態資源上限 20,000 檔、單檔 25 MB，目前最大 8 MB）。wrangler 只上傳有變的檔，第一次 95 秒、之後幾秒。所以**不需要 R2**，也不需要 Workers Builds；要在雲端自動建置的話，封存資料夾不在 repo 裡，`assets:copy` 會沒東西可抄——先維持本機 deploy。
- 預覽網址沒有密碼；靠 noindex 與不公開連結。要鎖的話可在 Cloudflare Zero Trust 加 Access 規則（Email OTP 給 Tiffany），再決定。

### 正式上線前要做的

1. 帳戶歸屬（客戶名下或梵亞名下）待合約決定；若要搬帳戶，就是在新帳戶重跑一次 `wrangler deploy`。
2. 建置改 `SITE_STAGE=production`（拿掉 PREVIEW 條與 noindex、載 GA），`wrangler.jsonc` 加 `routes`（aquaskyplus.com/*），並逐項解除舊 `aquasky-edge-aeo` Worker 的路由（規劃 §13）。
3. 舊網址 301 轉址已在 `worker/redirects.mjs`（2026-11-05），掛上正式網域時自動生效；切換後抽查 `aquaskyplus.com/PUMPLUS.php`、`news-detail.php?sid=82&lang=en` 等有沒有 301 到新頁。
4. 聯絡表單切成正式：`wrangler.jsonc` 的 `CONTACT_MODE` 改 `live`、`CONTACT_TO`（2026-11-14 已填 frankwang@aquasky.com.tw，照舊站）、Turnstile 真金鑰、Resend 金鑰與寄件網域（下一節）。

## 聯絡表單與舊網址轉址（`worker/`，2026-11-05）

`wrangler.jsonc` 的 `main` 指到 `worker/index.mjs`；`assets.run_worker_first` 只列 `/api/*`、`*.php`、`/LQCOL-PLUS`、`/certification`，其他請求不經 Worker（免費額度每天 10 萬次 Worker 請求，靜態檔不算）。

**聯絡表單**（`/en/contact`、`/zh/contact`）：表單 HTML 照舊站一字不改，`public/js/contact-form.js` 載入後把送出改成 `fetch('/api/contact')`，並在送出鈕上面補 Cloudflare Turnstile 驗證框、下面補狀態訊息、再加一個看不見的蜜罐欄位。後端 `worker/contact.mjs`：同站來源檢查 → 欄位檢查（姓名／信箱／留言必填，長度照舊站 maxlength）→ 蜜罐 → Turnstile 伺服器端驗證 → 用 Resend 寄純文字信給 `CONTACT_TO`（逗號分隔多個），`reply_to` 是訪客信箱，客戶直接回信即可。不存資料庫、不重試：寄不出去回錯誤，畫面請訪客直接用本頁信箱來信。訊息文字在 `src/i18n/<lang>.json` 的 `contact`。

- 現在是 `CONTACT_MODE: preview`：全部檢查照做但**不寄信**，畫面顯示「預覽站：表單可以送出，但正式上線前不會寄信」。Turnstile 用 Cloudflare 公開測試金鑰（site key 在 `src/data/contact-form.json`，secret 在 `.dev.vars`／`wrangler secret`，永遠通過）。
- 存 secret 在 Windows 上**不要用** `echo "值" | npx wrangler secret put NAME`（PowerShell 的管線會多帶換行，2026-11-05 存進去的金鑰因此驗證一直失敗）。改成寫一個 JSON 檔 `{"NAME":"值"}`（放 repo 外，例如 Temp），跑 `npx wrangler secret bulk "路徑.json"`；或直接 `npx wrangler secret put NAME` 不接管線、在提示後貼值。多帳戶登入時先 `$env:CLOUDFLARE_ACCOUNT_ID = '00b64e29ee78f15e15cfbfd95748f66d'`（cloundflare1）免得選錯帳戶。
- 正式上線前：① Cloudflare 儀表板 → Turnstile 建 widget（hostnames：aquaskyplus.com、預覽網址），site key 填 `src/data/contact-form.json`、`TURNSTILE_SECRET_KEY` 依上一條方式存；② Resend 帳戶加 aquaskyplus.com 寄件網域（DNS 在梵亞手上，加它給的 DKIM／SPF 紀錄），`wrangler secret put RESEND_API_KEY`；③ `wrangler.jsonc` vars：`CONTACT_MODE: live`、`CONTACT_TO`＝frankwang@aquasky.com.tw（已填）、`CONTACT_FROM` 用已驗證網域；④ 寄一封測試看客戶有沒有收到。
- 本機測：`.dev.vars` 寫 `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`，`npm run build; npm run cf:preview`，開 `http://127.0.0.1:8788/en/contact` 送一次，應顯示預覽站訊息。單元測試 `npm run test:worker`。
- 沒做的：速率限制（靠 Turnstile；要的話在 Cloudflare WAF 對 `/api/contact` 加 rate limiting 規則）、舊站選型結果「轉詢價」帶入資料（待 Tiffany 回答要不要保留）。

**舊網址轉址**：`worker/redirects.mjs` 的 `legacyRedirect(url)` 把舊站 `.php` 網址（`index.php?lang=`、`<系列>.php`、`news-detail.php?sid=`、`products-det.php?sid=`、`certification_page.php?sid=`、選型工具的 `sizing.php`／`select_api*.php`／`printpdf*.php`／`sel_contact.php` 等）與無語系前綴的 `/LQCOL-PLUS`、`/certification` 對到新站網址，回 301；對照表與規則在同一個檔，測試 `scripts/test-redirects.mjs`。認不得的 `.php` 兜底到 `/en`；`recode.php`（舊驗證碼圖）故意 404。新聞正文裡約 130 處連到舊站 `.php` 的絕對網址不改，切換後靠這張表接住。

## 已知的資料問題（舊站本來就這樣，沒有改，要問客戶）

**Tiffany 2026-11-20 已回覆**（Google 文件「網站確認事項整理（2026-11-17 v2）」）：LQCOL 搜尋標題／描述改液冷版；LQCOL 內文改成「compact designs (3L+)…(24L / 60L)」（0.5L／1L／100L+ 拿掉）；ROT-1 改 0.8 gal；認證頁 title／description 照她給的字、補 WRAS 頁；過長 meta description 由我們縮短（見刻意差異）。原本的 LQCOL、ROT-1 疑點都已從 `dataQuestions` 拿掉。

**Tiffany 2026-11-13 已回覆**（`../網站回覆 2026.11.13.docx`）：
- 舊站數字是對的、不改：LQC-3 比 LQC-8 重／外箱大（LQC-3 一箱裝 4 個）、LQC-60SS 60 L＝14 gal；APT-60、APT-60H、ROT-14、MEGA-60 的 14 gal，GIGA-60、GIGA-100 的加侖數。已從 `dataQuestions` 拿掉。
- APT-3 改成 0.8 gal（明細頁內文本來就是 0.8，只剩系列頁型號下方與主圖 alt 寫 0.5）：已改 `pumplus.json`、APT-3 明細頁 alt、`selection-tools.json`。
- dl-ce、asme-ht、accessories：「此頁暫不修改，維持現狀，目前不販售」。疑點留在各頁 `dataQuestions`，前面加【暫不改】；「Procuct」錯字也先不動（那筆也加了【暫不改】）。

## 版型原則（黃老闆 2026-10-24 指示：跟舊站盡量一樣，不改編排）

- 新聞：meta description 2026-11-26 已縮短（見刻意差異），2 篇中文不到 40 字（`2025-aquasky-173`、`apt-40-aquasky-155`）沒動；NewsArticle JSON-LD 裡的 description 仍是舊站原句；zh 展覽訊息只有 1 篇、右欄「熱門文章」只有 1 篇。全部照舊站，要不要整理由客戶決定。
- 單張認證頁證書大圖是 inline 寬高（500～848px），桌機 1280 放得下；手機會撐寬整頁（舊站同），site.css 限欄寬（見刻意差異）。
- 新聞正文裡舊站本來就壞的連結，原樣保留：`en/INDUSTRY/introduction-to-premium-plus-series-tank-of-aquasky-aquasky-176` 的 `mailto:frankwang@aquasky`（舊站混淆碼就少 `.com.tw`，畫面文字是完整信箱）與 `href="http://Commercial%20and%20Business…"`；另一篇 `href="http://https://aquaskyplus.com/sizing.php"`。切換時連同 `.php` 連結一起改。
- 直接沿用舊站的 CSS：`public/css/bootstrap.min.css`（舊站首頁用）、`bootstrap.css`（舊站內頁用的客製版，`.container` padding 0，Base 的 `bootstrap="full"`）、`bootstrap-grid.min.css`（經典系列頁）、`style.css`、`series_content.css`、`a-hover.css`、`all.min.css`（Font Awesome）。這幾個檔從封存複製後**進 Git**，不要改；新站自己的補充只放 `src/styles/site.css`。
- HTML 結構與 class 名稱照舊站同一頁抄（navbar-default、#home-container-01…、series-sec、sf-stage、h2_2hline、btn-link）。搬新頁時先開舊站同頁對照。
- 舊站靠 jQuery＋bootstrap.js 的行為（漢堡選單、下拉、輪播一次一張每 3 秒換）改成 `Header.astro`／`HomePage.astro` 裡各 20 行純 JS，外觀不變。首頁專用樣式（米色底、44pt 公司名）在 `src/data/home.json` 的 legacyCss。
- 結構圖的線與標示座標存在 `src/data/products/lqcol-plus.json` 的 `structureFigure`，照舊站百分比座標；手機版同舊站改成編號圖＋清單。

## 跟舊站不一樣的地方（刻意的）

審查官（`.claude/agents/aquasky-site-reviewer.md`）B1 項以這份清單為準：不在清單上的差異都算不通過。

- hreflang 逐頁對應（舊站全部指首頁，是 SEO 錯誤）。
- 型號統一寫 `LQC-3`（舊站 `LQC- 3`、`LQC -12` 空格亂）；下載連結「Brchure」錯字改成「Brochure」；THERMAL-PLUS 大圖 alt「HERMAL-PLUS」改成「THERMAL-PLUS」。
- JSON-LD：舊站每個系列頁 `<head>` 自己有一段 Product（另有 AEO Worker 從外面注入的）。新站：照抄頁把那段 Product 原樣搬來；資料化的頁（LQCOL、7 個經典頁）改輸出 ProductGroup（含型號）取代它；全站另有 Organization、WebSite、BreadcrumbList，LQCOL 有 FAQPage。
- 每頁只有一個 `<h1>`：首頁 h1 是字標圖（同舊站）；系列頁舊站有兩個 h1（色條一個、標題圖又包一個），新站標題圖改用 `<div class="h1-1">`。
- 西／法／俄／阿（es／fr／ru／ar，2026-11-26 起在本機建置，**還沒部署**）：舊站本來就有的頁照搬舊站該語系原文（首頁、11 個系列頁、16 個照抄頁、6 張認證單頁、新聞 62＋影片 11 篇與列表），verify 逐字比封存。跟舊站不同的只有下面這些：
  - 客戶指定改字同 en／zh 一起套：保固一律 5 年（FAQ 保固題、FAQ 與 RO-PLUS 的 description、LQCOL 新聞「3 年」）、認證總覽 WRAS 那格補「認證連結」按鈕（舊站這格有空的按鈕容器）。正文改字記在 `client-text-edits.json`；新句是 AI 譯（內容檔 `_note` 有寫、FAQ 的 `status` 改 `draft-ai`）。
  - 阿拉伯文：黃老闆 2026-11-26 說溢康不懂阿拉伯文、舊站寫得對不對沒把握，請梵亞特別注意。梵亞看過主要頁（首頁、公司、產品結構、認證、FAQ、產品總覽、7 個系列頁），改了 16 處明顯錯誤：「vessel」譯成「船」、cut-in／cut-out 直譯成「切斷點／出口點」、「淋浴與浴缸」兩個都譯成「洗澡」、「在坐著的範圍內」、NSF 名稱前後不一、錯字與文法、MEGA 標題前多一個 T（「[16بار]」也補了空格成「[16 بار]」）。系列頁這 4 處（PUMPLUS、MEGA 的淋浴句、SOLAR 的「安全範圍」、MEGA 標題）系列頁不做逐字比對，所以沒進 `client-text-edits.json`，就記在這裡。都記在 `client-text-edits.json`（或系列頁內容檔 `_note`），是 AI 判斷、未經母語審稿。新聞 73 篇沒逐篇看。
  - 舊站四語 WRAS 單頁放的是 ACS 證書與報告 4 張圖（舊站錯誤），新站換成 en／zh 那張 WRAS 證書；文字不變。
  - 認證單頁舊站 title 是全站通用那句英文，新站用 Tiffany 2026-11-20 的英文 title／description 的 AI 譯（`status: draft-ai`）。
  - LQCOL-PLUS 四語不用舊站（舊站四語還是 HVAC 舊內容），改用 `translation/lqcol-plus/LQCOL-PLUS.<lang>.md` 的 AI 初稿（`import-lqcol-langs.mjs` 會先確認 md 的英文＝目前 en.json），頁頂會出現「Draft translation, pending review.」。
  - 首頁 h1＝title 去掉「AQUASKY - 」（同 en／zh）；首頁 slidesAlt、選擇工具圖 alt、隱藏的認證標題，以及介面文字裡舊站沒有的字（`src/i18n/<lang>.json` 的 `_note` 列了哪些）是 AI 譯。
  - 樣式：舊站 es／fr／ru 每頁 `<style>` 有「選單 padding 5px、標題線換 pd-title-line-02.png」，ar 有「.lang_rtl、#footer-content、.about-top-title、.pd-btn-info-link 改 direction:rtl」，新站放進 `site.css`（用 `html[lang=…]`）。**阿拉伯文改成整頁由右到左**（黃老闆 2026-11-26 指示；舊站 `<html lang="ar">` 沒有 dir、只有那幾塊文字改方向）：`brand.json` 的 ar 是 `dir: rtl`，`site.css` 最後一段把 Bootstrap 3 的欄位浮動、選單、下拉、左右對齊對調；舊站那一行照留。
  - 頁尾的公司中文名那行只有 zh 有（舊站四語頁尾沒有這行）；四語頁尾地址用英文、TEL／FAX 用英文（同舊站）。
  - 舊站四語 FAQ 只有 16 題（en／zh 29 題）。2026-11-27 黃老闆要先做，不等 Tiffany：少的 13 題照目前 en 由 AI 翻成四語，插在 en 題序的對應位置（`../translation/faq-missing-13.json`、`scripts/add-faq-missing.mjs`，插入處記在 `client-text-edits.json`），現在四語都是 29 題。原本 16 題（含舊版的壓力／溫度表）還是舊站原文。客製化說法 Tiffany 給了以後，en／zh 與四語要一起改。四語 meta description 超過 160 字的 310 段已縮到 ≤155（只用原句事實、數字型號照抄；英文影片的描述直接用 en 已縮好的那句）。
- AI 譯字怎麼標：整頁都是 AI 初稿的頁（LQCOL 四語）`status: draft-ai`，頁頂顯示黃色提示。照抄頁的主體是舊站已上線的原文，只有 title／description 或一兩句是 AI 譯的（四語 FAQ、四語認證單頁）也標 `draft-ai`，但**不顯示**頁頂提示——頁面上看到的幾乎全是舊站原文，掛「AI 初稿」會誤導；改了哪幾句寫在 `_note`，正文改字另記在 `client-text-edits.json`。只補了 alt、隱藏標題這類看不到的字的頁（四語首頁）維持 `approved-legacy`，`_note` 記哪些是 AI 譯。
- 選單會把目前所在的頁反白（`li.active`），舊站沒有；en／zh 一開始就這樣做，四語沿用。
- 加語系的匯入指令（只寫新語系的檔，en／zh 不動）：`import-legacy-page.mjs --langs es,fr,ru,ar`、`import-classic-series.mjs --langs …`、`import-news.mjs --langs …`、`import-home-langs.mjs`、`import-lqcol-langs.mjs`。在 Git Bash 跑記得先 `export MSYS_NO_PATHCONV=1`，不然 `/FAQ` 這種參數會被改成 Windows 路徑。**`import-news.mjs` 不加 `--langs` 會重寫 en／zh 全部新聞**（後來縮短的 meta 會被蓋回去）。
- 首頁認證圖示的說明文字，**每個語系都一定要有**（黃老闆 2026-11-17 決定；`content.config.ts` 強制不可空白）。理由：對 SEO／AEO／GEO 有幫助——圖示是圖片、沒有 alt，機器讀不到圖裡的字；舊站 zh／es／fr／ru／ar 本來都有這排字，只有英文是空的，所以英文首頁內文原本完全沒有 CE、ISO 9001、UPC、KC、Lead-Free 這些字。英文說明由梵亞依中文說明＋圖示上的標章名稱寫（`src/content/home/en.json`），Tiffany 可改用字，但不問留不留（2026-11-17 她還沒看過這 8 句，en.json 的 `_note` 有標「新補、待審」）。做 es／fr／ru／ar 時直接用舊站該語系的原文。說明字較長，`site.css` 只在英文頁讓 `.ca_txt` 從固定 50px 改成至少 50px，手機兩欄時每列第一格清除浮動；中文頁不套，照舊站固定 50px。
- 中文 LQCOL-PLUS 頁：Tiffany 2026-11-13 審過，`status` 改 `approved`，頁頂黃色「AI 初稿」提示拿掉。她改的字：特色三格標題（頂級桶身材質／EPDM 橡膠隔膜／氮氣預充氣壓）、結構圖三個標示、FAQ Q3、Q4。她寫的「不銹鋼」照全站慣例用「不鏽鋼」、「EPDM橡膠隔膜」照全站慣例在英中之間加空格。「氮氣預充氣壓」「可客製化氮氣預充氣壓」沒有 N₂，是禁譯詞的已知例外（`../translation/lqcol-plus/do-not-translate.md` 第 10 節）。`translation/lqcol-plus/LQCOL-PLUS.zh.md` 沒同步，網站以 zh.json 為準；`import-lqcol.mjs --force` 會蓋掉客戶的字。
- 中文選單與產品列：MEGA-PLUS「16BAR高壓泵浦壓力桶」、GIGA-PLUS「25BAR高壓泵浦壓力桶」（舊站兩個都叫「高壓泵浦壓力桶」；Tiffany 2026-11-13 指定）。照抄頁裡寫死的產品列按鈕、產品總覽頁 h2、中文下載頁按鈕一起改；新聞內文不改。照抄頁這類「客戶指定改字」記在 `src/data/client-text-edits.json`（每筆寫來源），`npm run verify` 比對舊頁文字前先套用；清單外的差異照樣不通過。
- APT-3 系列頁型號下方、明細頁主圖 alt、選型工具結果寫 Gal 0.8（舊站 0.5；Tiffany 2026-11-13 指定）。ROT-1 系列頁型號下方、明細頁主圖 alt 也改 0.8（Tiffany 2026-11-20 指定）。alt 是屬性，verify 的照抄頁文字比對看不到，所以記在這裡、不放 `client-text-edits.json`。
- 保固一律 5 年，RO 桶也一樣。這是黃老闆和溢康 2026-11-19 月會的決定，黃老闆會後也確認過。舊站有三種說法：FAQ「RO 3 年、Well／Thermal／Hydronic 5 年」，26 個英文 PUMPLUS 明細頁「3-year factory warranty」，LQCOL 新聞「3-Year」「三年保固」。AI 讀到這些就會講成兩種年限。改到的地方：
  - 26 個 APT 明細頁
  - FAQ（en、zh）的頁面文字、FAQPage 答案、meta description
  - RO-PLUS 系列頁（en、zh）的 description
  - 兩篇 LQCOL 新聞（en 173、zh 175）

  FAQ 另外刪掉兩句：「標準色無 MOQ」和「經銷最少一個 20 呎貨櫃」。經銷那題的 20 呎櫃那句，換成「Pricing is based on FOB Taichung terms.／價格以 FOB 台中計價。」，後面的付款條件不變。客製化說法等 Tiffany 寫初稿，梵亞補強之後再加。「客製色每批 400 件」「可混裝型號」會議沒提，維持原樣。

  正文的改字記在 `client-text-edits.json`（7 筆）。meta description 是屬性，verify 比不到，所以只記在這裡。es／fr／ru／ar 上線時要套同樣的改法，`translation/sources/FAQ.md`、`RO-PLUS.md` 那四個語系的原文還是舊說法。FAQ 第 9 題原本寫「warranty differs in market…請洽當地經銷商」，黃老闆 11/19 會後決定也改成 5 年：「All AQUASKY tanks (RO, Well, Thermal and Hydronic) come with a 5-year warranty.／溢康所有罐體（含 RO 罐）皆提供 5 年保固。」，原本的經銷商那句一起拿掉（client-text-edits.json 另 2 筆）。es／fr／ru／ar 的第 9 題也一樣要改。
- 經典系列頁的型號連到 `/en/products-det/...`（舊站也是只有英文明細頁）；中文系列頁照舊站沒有型號清單，不連明細。
- LQCOL-PLUS（Tiffany 2026-11-20 第 4、6 題）：en／zh 搜尋標題改「…Liquid Cold System Expansion Tank | Data Center Liquid Cooling…」「…液冷系統膨脹水箱 | 資料中心液冷專用…」，description 改講液冷；In-Rack／In-Row 那句改成她給的「compact designs (3L+)…(24L / 60L)」，拿掉 0.5L／1L／100L+。zh 那句（精巧機型（3L 以上））與 zh 標題以外的 description 是梵亞照英文改的，她還沒看過中文。
- meta description 縮短（Tiffany 2026-11-20 第 12 題「依照貴司建議執行」）：超過英文 160／中日文 80 字的 340 段（下載子頁 14、新聞與影片約 220、產品明細、各系列與文字頁）縮到英文 ≤155、中日文 ≤80，只用同頁內容（原句、title、正文）裡有的事實，型號與數字照抄。只改 description，正文不動。schema 的長度上限還沒收緊（新聞與下載子頁仍放寬），之後新增內容要自己控制長度。
- 認證總覽 WRAS 那格：補「CERTIFICATION LINK／認證連結」到新建的 wras-uk 頁（舊站那格沒有按鈕）；中文那格的證書圖舊站是「Under Process」，新站換成跟英文同一張 WRAS 證書。中文 WRAS 單頁舊站誤放 ACS 證書圖，新站也改放 WRAS 證書。
- 沒有 cookie 同意列與「回到頂端」鈕（預覽期先不做；正式版要不要留 cookie 列待決）。
- 舊站 accessories、products、FAQ、contact、downloadpage、videos 頁沒有 `<h1>`，新站各補一個看不見的 h1（＝title），版面不變。
- 聯絡頁 email：舊站經 Cloudflare 混淆（/cdn-cgi/l/email-protection）再靠 JS 還原；新站匯入時直接解碼成純文字（同舊站還原後的樣子）。
- feature 頁六個說明面板的切換，舊站是 jQuery；新站在 LegacyPage 裡用 10 行純 JS 做同樣的事。
- FAQ 頁的 FAQPage 結構化資料，舊站是 AEO Worker 注入的。新站從內容檔 `legacyJsonLd` 輸出，29 題、HTML 實體都還原成純文字。verify 只比題數、不比答案，所以**改 FAQ 答案要頁面文字和 `legacyJsonLd` 兩邊一起改**。
- 舊站頁面或 Worker 帶的 Organization／Corporation／WebSite／BreadcrumbList 一律不搬；全站只有新站自己產生的 `#organization` 一個，麵包屑一份。
- 麵包屑規則：產品系列頁＝首頁›產品系列›該系列；/products＝首頁›產品系列；其他文字頁＝首頁›該頁選單字樣（不掛 PRODUCTS）。
- 舊站 style.css／a-hover.css 裡 url() 用到的圖（文字頁藍色標題帶、about 底圖）由 copy-archive-assets 一起複製，verify 檢查存在。
- 照抄頁載哪個 bootstrap 照舊站（products 與首頁是 min，其他是客製 full）；series_content.css 只有 LQCOL 載。
- 新聞：hreflang 只列真的有這一頁的語系（明細只有自己；列表第 N 頁要兩個語系都有 N 頁才互列），語言選單切到沒有這頁的語系時回該語系首頁（舊站語言選單一律回首頁）。列表封面圖補 alt＝標題（舊站沒有）。CollectionPage 每頁指自己的網址（舊站每頁都指第 1 頁）；NewsArticle 原樣搬並補 publisher。列表與明細各補一個看不見的 h1（列表＝標題帶字樣、明細＝文章標題）。
- 新聞正文裡 YouTube 的 iframe 保留（schema 只准 youtube／youtube-nocookie）；正文裡連到舊站 `.php` 的連結照舊（約 130 處），切換時要改。
- 英文產品明細（90 頁）：匯入時拿掉 `<font dir="auto" style="vertical-align: inherit;">` 層層包裝（Google 翻譯殘留，90 頁合計 6 萬多個；唯一的視覺影響是規格表每列矮 2px，APT-3 整頁 5846 vs 舊站 5862，肉眼看不出），verify 比對時兩邊都先去掉；配件明細的「<<back」從 `accessories.php?lang=en` 改成 `/en/accessories`；頁內「Price Inquiry」「Contact us」連 `/en/sel_tools`、`/en/contact`（舊站是相對路徑，同一處）。68 頁正文裡的 YouTube iframe（width=560）在手機會撐寬整頁（舊站同），site.css 讓它不超過欄寬。舊站這些頁 head 沒有 JSON-LD（AEO Worker 注入的不搬），新站只有全站的 Organization／WebSite／BreadcrumbList。
- 選型計算器：舊站把算出的容積 POST 到 select_api*.php 由伺服器挑型號、回一段 HTML，再可 POST 到 printpdf*.php 產 PDF、sel_contact.php 轉詢價；新站全部在瀏覽器算（結果區自己畫：Proper Tank Size、Model Number、Series、Total Tank Volume、連到產品明細、預充壓與免責句照 2021 列印 PDF），「Print Technical File」改成瀏覽器列印（印出表單與結果，藏掉選單與頁尾），「contact us」改成連到聯絡頁（不帶入選型資料）。Pressure Switch PSI 預充壓照舊站的 `Cut-in − 2.8`（客戶 2022 文件寫 − 2；2026-11-08 黃老闆決定照現在網站、不問客戶，數字在 `src/data/selection-tools.json`）；預充壓數字四捨五入到 2 位（舊站直接印浮點數會出現 2.0999999）。Thermal 的型號對照客戶沒給，用 THERMAL-PLUS 型號清單套「容積 ≥ 算出值的最小型號」。STEP 2／3 的中間值與預充壓句載入就先算好顯示（舊站 VSD／Thermal 要按送出才顯示；PS 頁的 AF 與 Total 載入時空白），結果區連到英文產品明細（產品明細只有英文版，zh 頁也連 /en/）。PS PSI 區塊照抄來的「11.7 PSI」靜態字與 JS 算出的 11.7 一致（11/8 改回 − 2.8 之後）。黃老闆 11/8 另決定：舊站的「列印 PDF」與「轉詢價」兩個功能都要做（待辦）。舊站 head 的 WebPage（指到 /sel_tools）不搬。
- 單張認證頁：網址從 `certification_page.php?sid=N` 改成 `/<lang>/certification-page/<slug>`（舊網址切換時要 Worker 301）；舊站沒有 h1、title 五頁都是同一句全站通用的，新站補看不見的 h1＝標題帶字樣（CERTIFICATION | Eurocert）；title／description 用 Tiffany 2026-11-20 給的英文（6 頁含 WRAS），zh 由梵亞照意思翻，她還沒看過中文。證書大圖 inline 寬高在手機撐寬整頁（舊站同），site.css 讓它不超過欄寬、高度等比；桌機只有 WaterMark 兩張 600px 的縮成 570。
- 影片明細的 JSON-LD：舊站 zh 影片的 `@id`／`mainEntityOfPage` 還寫 `videos-detail.php?sid=…`，匯入時改成新站乾淨網址；Article 補 publisher。
- 下載子頁（/download/<language>）：舊站線上版的選單語言會跟著 cookie 走（看過中文頁再開就變中文選單），封存版是英文；新站固定英文介面。這些頁舊站沒有 canonical、hreflang 7 個全指各語系首頁（錯的）；新站 canonical 指自己、不輸出 hreflang（14 頁各是一種型錄語言，不是網站語系）。麵包屑：首頁›DOWNLOAD›EDM English。
- 新聞明細手機版：8 篇正文有固定寬度的表格或 iframe，舊站會把整頁撐寬（390 寬變 515～815）；新站在 site.css 讓 `#news-container #ImgAutoResponsive` 橫向捲、iframe max-width 100%，桌機版面不變。
- 聯絡表單：舊站驗證碼那一列（*CODE＋recode.php 圖）與 csrf 隱藏欄位拿掉，換成 Cloudflare Turnstile 框（送出鈕上方）；鈕下方多一行狀態訊息、另加看不見的蜜罐欄（都由 contact-form.js 載入後補上，表單 HTML 不變）；送出改打 `/api/contact`（整體規劃 §7.2；細節見「聯絡表單與舊網址轉址」）。
- 下載頁有 6 張國旗圖檔名是非英文（例如 Україна.jpg），封存裡是百分比編碼，複製腳本兩種寫法都認；`--fetch-missing` 可從線上舊站補封存沒有的檔。
- 中文經典系列頁頁面上沒有型號清單（同舊站），所以 JSON-LD 的 ProductGroup 不帶 hasVariant；英文頁才有（結構化資料只標頁面看得到的東西）。
- 舊站 HYDRO-PLUS 頁與英文 accessories 頁 HTML 各少關一個 div（頁尾被吃進去）；新站不照抄這個錯（照抄模板會自動補上）。
- 照抄頁搬回的舊站 Product JSON-LD 原本夾一個 `breadcrumb`（schema.org 的 Product 沒有這個屬性，Google 不讀，而且名稱跟選單對不上）；新站拿掉它，全站只有 @graph 頂層一份 BreadcrumbList，名稱用選單字樣（黃老闆 2026-10-24 決定留一份）。
- 經典系列頁舊站的型號 `.pd_item_margin` 包裝、每列欄數（PUMPLUS 橫式 col-md-4）、MEGA 標題圖外面多出的 `<p>` 間距，都照舊站逐頁存在資料檔（`titleBlock`、`colClass`、`itemWrapper`）。
- 不做 WOW.js 進場動畫（舊站首頁字標、認證圖示、系列頁標題區有 fadeInDown／fadeInRight）。靜止版面相同，只差動畫；少一支 JS，也避免載入時版面位移。黃老闆要一樣再加。
- 首頁多一個看不見的 h2「認證與技術」（給螢幕閱讀器與大綱用），舊站沒有。
- 預覽版頁頂有黃色 PREVIEW 條，正式版沒有。

已還原成跟舊站一樣、不再是差異的：產品列區塊在深色區內（白字白框）；首頁米色底、公司名 44pt、字標原尺寸、輪播一次一張；選單結構（SELECTION TOOLS 只在下拉裡、ACCESSORIES 是 PRODUCTS 直屬、zh 多 ESG產品）、選單 padding、logo 尺寸；結構圖標示照舊站斷行、無冒號；規格表數字照舊站原字串（`14` 不是 `14.0`）；中文選單、認證說明、頁尾地址一字不差；正文粗體（`**…**` 記號）。

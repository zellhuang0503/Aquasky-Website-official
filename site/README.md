# site／AQUASKY 新官網（代表頁試作）

建立：2026-10-23。整體規劃 §12 第 2 階段「代表頁試作」。技術棧：Astro 7 ＋ TypeScript ＋ JSON 內容檔 ＋ Cloudflare Workers Static Assets（純靜態，沒有 Worker 程式）。設定照 `E:\CascadeProjects\RSG\rsg-site`。

## 目前有的頁

| 網址（與舊站相同） | 檔案 | 狀態 |
| --- | --- | --- |
| `/`（英文首頁，canonical 指 `/en`） | `src/pages/index.astro` | 舊站文字 |
| `/en`、`/zh` | `src/pages/[lang].astro` | 舊站文字；英文認證說明是新補的，待審 |
| `/en/LQCOL-PLUS` | `src/pages/[lang]/LQCOL-PLUS.astro` | 舊站英文原文 |
| `/zh/LQCOL-PLUS` | 同上 | **AI 初稿**，頁面上有黃色提示，待 Tiffany 審 |
| `/en/PUMPLUS`、`/en/RO-PLUS`、`/en/THERMAL-PLUS`、`/en/HYDRO-PLUS`、`/en/PREMIUM-PLUS`、`/en/MEGA-PLUS`、`/en/SOLAR-PLUS` | `src/pages/[lang]/[page].astro` → `ClassicSeries.astro`（經典模板） | 舊站英文原文＋型號清單 |
| 同上 7 頁的 `/zh/…` | 同上 | 舊站中文原文；**照舊站沒有型號清單**，7 頁都放舊站的兩張 DM 大圖（照舊站 JS 的行為用 img-responsive：圖比欄寬就滿版，比欄窄就原尺寸置中）；DM 區塊的段落與空段落結構照舊站保存在 `edmHtml` |
| `/en`、`/zh` 的 supreme、dl-ce、asme-ht、GIGA-PLUS、accessories | `src/pages/[lang]/[page].astro` → `LegacyPage.astro`（照抄模板） | 舊站主體 HTML 整段照抄，verify 會把頁面純文字跟封存逐字比 |

還沒搬：products、about、feature、certification、sel_tools、news、videos、downloadpage、FAQ、contact，以及 90 頁英文產品明細（`/en/products-det/...`，型號清單點進去會 404）。`npm run verify` 會列出這些連結。

## 三種系列頁模板

| 模板 | 頁 | 資料從哪來 |
| --- | --- | --- |
| `lqcol` | LQCOL-PLUS | `scripts/import-lqcol.mjs`（從 translation/ 匯入） |
| `classic` | PUMPLUS、RO-PLUS、THERMAL-PLUS、HYDRO-PLUS、PREMIUM-PLUS、MEGA-PLUS、SOLAR-PLUS | `scripts/import-classic-series.mjs`（直接解析封存的 en／zh 頁面：h1、介紹文、型號清單、DM 圖、頁面 `<style>`） |
| `legacy` | supreme、dl-ce、asme-ht、GIGA-PLUS、accessories（結構各不同、數量少） | `scripts/import-legacy-page.mjs`：舊頁 `</header>`…`<footer` 整段抄進 `src/content/legacy/<id>/<lang>.json` 的 `bodyHtml`（相對路徑改絕對、去 wow 動畫 class、第二個 h1 改 div、#ImgAutoResponsive 的圖照舊站 JS 改 img-responsive）；頁面樣式在 `src/data/pages/<id>.json`。schema 禁止 script／iframe／form／on* 屬性。改文字直接改 bodyHtml |

每個系列頁自己的樣式（h1 色條顏色、底圖、標題圖位置）照舊站頁面的 `<style>` 抄在 `src/data/products/<id>.json` 的 `legacyCss`，由頁面以 `headStyle` 輸出；共用的 `src/styles/site.css` 不放任何系列專用規則，免得互相蓋到。匯入腳本只跑一次，之後改內容直接改 JSON；要重跑加 `--force`。

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
| 7 個經典系列的型號清單、圖片、頁面樣式、資料疑點 | `src/data/products/<id>.json`（`dataQuestions` 自動列出公升換加侖對不上的型號） |
| 首頁頁面樣式與輪播設定 | `src/data/home.json` |

內容檔有 schema（`src/content.config.ts`），欄位少了或型別錯，`npm run build` 會直接失敗。schema 只驗格式，不驗事實。

## 部署（還沒做）

`wrangler.jsonc` 只設了 assets，沒有掛 aquaskyplus.com。上線前要做的：

1. Cloudflare Workers Builds 連 GitHub：根目錄 `site`、組建命令 `npm ci && npm run assets:copy && npm run build`、部署命令 `npx wrangler deploy`。注意 `assets:copy` 讀的是 repo 裡沒有的封存資料夾，正式流程要改成把圖片放 R2 或另一個來源（待決）。
2. 帳戶歸屬（客戶名下或梵亞名下）待合約決定。
3. 切換時加 routes，並逐項解除舊 `aquasky-edge-aeo` Worker 的路由（規劃 §13）。

## 已知的資料問題（舊站本來就這樣，沒有改，要問客戶）

列在 `src/data/products/lqcol-plus.json` 的 `dataQuestions`：LQC-3 重量與外箱比 LQC-8 大、LQC-60SS 的加侖數、內文提到的 0.5L／1L／100L+ 機型規格表沒有。

經典頁的 `dataQuestions` 由匯入腳本自動算（公升換加侖不符）：APT-3、APT-60、APT-60H、ROT-1、ROT-14、MEGA-60。照抄頁的在 `src/data/pages/<id>.json`：dl-ce 第 5 列型號與數值對不上（DL 750/16 應為 DL 5000/10？）、asme-ht 的 HTL-1000 與 HTL-800 相同／HTL-300 加侖格式／工作溫度 93 對 115、GIGA-60 與 GIGA-100 的加侖數、accessories 兩個配件同一張圖，以及 dl-ce／asme-ht 的「Procuct」錯字。

## 版型原則（黃老闆 2026-10-24 指示：跟舊站盡量一樣，不改編排）

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
- 語言選單裡還沒上線的語系（es／fr／ru／ar）是灰字不能點，舊站是連結。等那些語系做好再開。
- 英文首頁認證圖示下面舊站沒有文字，新站也不顯示；建議的英文說明放在 `src/content/home/en.json` 的 `draftLabel`，客戶審過才會改成 `label` 顯示。
- 中文 LQCOL-PLUS 頁是 AI 初稿，頁頂多一條黃色「AI 初稿」提示；審過後拿掉。
- 經典系列頁的型號連到 `/en/products-det/...`（舊站也是只有英文明細頁），中文頁同樣連英文明細。
- 沒有 cookie 同意列與「回到頂端」鈕（預覽期先不做；正式版要不要留 cookie 列待決）。
- 舊站 accessories 頁沒有 `<h1>`，新站補一個看不見的 h1（＝title），版面不變。
- 中文經典系列頁頁面上沒有型號清單（同舊站），所以 JSON-LD 的 ProductGroup 不帶 hasVariant；英文頁才有（結構化資料只標頁面看得到的東西）。
- 舊站 HYDRO-PLUS 頁與英文 accessories 頁 HTML 各少關一個 div（頁尾被吃進去）；新站不照抄這個錯（照抄模板會自動補上）。
- 照抄頁搬回的舊站 Product JSON-LD 原本夾一個 `breadcrumb`（schema.org 的 Product 沒有這個屬性，Google 不讀，而且名稱跟選單對不上）；新站拿掉它，全站只有 @graph 頂層一份 BreadcrumbList，名稱用選單字樣（黃老闆 2026-10-24 決定留一份）。
- 經典系列頁舊站的型號 `.pd_item_margin` 包裝、每列欄數（PUMPLUS 橫式 col-md-4）、MEGA 標題圖外面多出的 `<p>` 間距，都照舊站逐頁存在資料檔（`titleBlock`、`colClass`、`itemWrapper`）。
- 不做 WOW.js 進場動畫（舊站首頁字標、認證圖示、系列頁標題區有 fadeInDown／fadeInRight）。靜止版面相同，只差動畫；少一支 JS，也避免載入時版面位移。黃老闆要一樣再加。
- 首頁多一個看不見的 h2「認證與技術」（給螢幕閱讀器與大綱用），舊站沒有。
- 預覽版頁頂有黃色 PREVIEW 條，正式版沒有。

已還原成跟舊站一樣、不再是差異的：產品列區塊在深色區內（白字白框）；首頁米色底、公司名 44pt、字標原尺寸、輪播一次一張；選單結構（SELECTION TOOLS 只在下拉裡、ACCESSORIES 是 PRODUCTS 直屬、zh 多 ESG產品）、選單 padding、logo 尺寸；結構圖標示照舊站斷行、無冒號；規格表數字照舊站原字串（`14` 不是 `14.0`）；中文選單、認證說明、頁尾地址一字不差；正文粗體（`**…**` 記號）。

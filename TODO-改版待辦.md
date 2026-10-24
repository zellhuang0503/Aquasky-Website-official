# AQUASKY 官網改版 待辦清單（梵亞內部）

建立日期：2026-10-22。放「梵亞自己要做的事」，不是要客戶提供的清單（那份在 10/22 講話重點第六節）。

## 搬站前：舊站資料擷取（方案見 官網改版說明文件/05-舊站資料擷取/，執行結果見 migration-2026-10-22/RUN_REPORT.md）

- [x] **A1 重核 10/9 封存**：2026-10-22 完成，`integrity_issues` 為空，3,248 個 URL 全部雜湊相符。
- [x] **A2 zip 備份搬到 Google Drive**：2026-10-22 晚間已上傳到 `G:\我的雲端硬碟\梵亞\AQUASKY-AEO\`（`aquaskyplus-archive-2026-10-09.zip` ＋ `.sha256.json`）。10/23 用 Drive 連接器核對雲端檔案大小 681,081,554 bytes 與本機一致。原封存在 E 槽、zip 在 E 槽與 Drive，共三份。
  - [x] 收尾：2026-10-23 在本機對 G 槽那份重算 SHA-256 = `7653c6181e84109c98c80de2726e2fdb94a473c1d593698fe25a3a2f9c7b9e26`，與搬移前記錄的值**完全相符**，檔案大小 681,081,554 bytes 亦相同。**異地備份結案。**
- [x] **A3 選型工具公式**：2026-10-22 確認三類公式全在前端 inline JS（`sel_unit_ps`／`sel_unit_vsd`／`sel_unit_thermal`），已抄錄在 RUN_REPORT §A3。**不必向工程師要公式。** 伺服器端只做「容積 → 型號」查表與 PDF，可用產品規格表自建。
  - [ ] **Thermal 的 PSI 分支公式疑似舊站 bug**（`(P+0.1)×0.65`，與同頁 Bar 分支 `P−0.2` 及 VSD 的 `(P+1.5)×0.65` 都不一致），要客戶或工程師確認哪一條才對。
- [x] **A4 產品明細語系**：確認只有英文 90 頁，其他語系系列頁連明細連結都沒有；hreflang 全指首頁（既有 SEO 錯誤，新站要修）。
- [x] **A5 種子清單**：`build_seed_urls.py` 產出 2,597 筆，挖出 10/9 漏掉的 205 個網址（含 18 頁選型計算器、11 個仍回 200 的舊 `.php` 網址、106 個列表分頁）。**階段 C 一定要沿用這套做法。**
- [x] **B 進行中快照**：2026-10-22 完成，`migration-2026-10-22/` 2,629 個 URL，無完整性問題。比對 10/9：文字真正有變 96 頁＝LQCOL-PLUS 六個系列頁擴寫＋88 個英文產品頁新增「Certification Conformity」區塊（APT-1.3 反而少一項 WaterMark）。「消失」的 855 筆全是 10/9 的重複副本，沒有頁面消失。
- [ ] **C 最終版快照**：**種子清單要補 `/images/products/ROT-txt-01.png`**（RO-PLUS 頁頂的文字圖，10/09 與 10/22 兩次都漏抓，10/24 先從線上站手動存到 site/public）。等客戶窗口回「本輪完成」再跑。從 10/22 證據看工程師還沒做完：下載專區還沒掛 LQCOL PDF、LQCOL／GIGA 沒有產品明細頁、sitemap 一個位元組都沒變。指令見 RUN_REPORT §5；**基準改用 `migration-2026-10-22`，不要再用 10/9**。
- [ ] **D 結構化抽取**：C 之後寫 `extract/` 解析器，產出 products.json、articles/*.md、assets_manifest.csv、routes.csv、i18n_map.json；先每頁型抽一頁驗證再全跑。routes.csv 要納入 11 個舊 `.php` 網址與 `/LQCOL-PLUS`、`/certification` 兩個寫錯的無語系連結（都要 301）。
- [ ] **E 向客戶要 EDM／手冊 PDF 最新原檔**（黃老闆 10/22 決定：不以網站壓縮版為準，直接向客戶要全部 EDM）；向工程師要資料庫匯出對照還欠什麼。清單見 05-舊站資料擷取/2026-10-22-向客戶與工程師索取的資料清單.md。
- [ ] **E 向客戶確認認證清單**：88 個產品頁 10/22 新增的認證區塊要逐系列確認正確性與有效期；APT-1.3 被拿掉 WaterMark 要問原因。
- [ ] **LQCOL-PLUS 六語系翻譯：梵亞出 AI 初稿**（黃老闆 10/23 決定，不向客戶要譯文）。步驟：① 從 10/22 封存各語系既有頁面抽術語表（附來源頁）→ ② AI 翻六語系，規格／數字／認證／型號／單位列禁譯清單，翻完程式比對一致 → ③ 附英文對照送客戶各語系審稿人 → ④ 客戶改完回傳＝定稿。阿拉伯文另驗 RTL 版面。
  - [x] ① 2026-10-23 完成：27 頁六語系文字在 `translation/sources/`；術語表 `translation/glossary/`（201 條，附來源頁，舊站自相矛盾的譯法另列 inconsistencies.md）。
  - [x] ② 2026-10-23 完成：`translation/lqcol-plus/LQCOL-PLUS.{zh,es,fr,ru,ar}.md`，75 區塊 × 5 語系，每區塊附英文；`do-not-translate.md` 禁譯清單；`check_lqcol.py` 375 區塊全數通過。標題與 meta 沿用舊站既有在地化版本未重翻。
  - [ ] ③ 送審：**審稿人＝Tiffany，只審中文（附英文原文）**（黃老闆 10/23：客戶人少，不必各語系找人）。把 `LQCOL-PLUS.zh.md`＋`do-not-translate.md` 給 Tiffany，只改 ZH 行；回傳後再跑一次 `check_lqcol.py`。
  - [ ] 西／法／俄／阿：AI 初稿先放著，上線前黃老闆決定「照上並標示 AI 譯稿」或「先保留英文」。
  - [ ] 要問客戶：英文標題寫「Chilled Water Expansion Vessel／HVAC」，內文全是資料中心液冷，各語系標題要不要跟著改。
  - [ ] 新站上線前要修：英文頁下載連結錯字「Brchure」；規格表型號空格不一致（`LQC- 3`、`LQC - 8`、`LQC -12`）統一成 `LQC-3`。
- [ ] **E 補公開抓不到的**：GSC 網頁報表（帶參數舊網址）、產品圖原檔、詢價表單收件信箱、後台公開網址清單最新版。
- 限制：雲端 Claude 工作區連不到 aquaskyplus.com（代理 403），抓取要在黃老闆電腦上跑（本機 Claude Code 或手動跑附錄指令）。10/22 已用本機 Claude Code 跑過一輪，流程可行。
- 新站要修的既有問題（從 10/22 快照發現）：sitemap 是手動維護、內容改了也不更新 → 新站自動產生；hreflang 全指首頁；非英文使用者在系列頁走不到任何規格。

## 新站開發（技術棧 2026-09-24 定案，10/23 確認還沒動工）

- 技術棧：**Astro + TypeScript + Markdown／JSON 內容檔 + Cloudflare Workers Static Assets**（不是 Pages、不做全站 SSR、不用 CMS）。表單／選型工具若需後端另設小型 Worker API。依據：官網改版說明文件/02-作業模式與整體規劃/2026-09-24-AQUASKY官網改版與AI維護整體規劃.md §1、§7、§12。
- 程式碼放哪：本 repo 新開 `site/` 子目錄（規劃 §7.3 的目錄結構），跟 translation/、路由清冊同一個 repo。Cloudflare 用 Workers Builds 從 GitHub 建置，root 指到 site/。
- 現成範本：`E:\CascadeProjects\RSG\rsg-site`（Astro 7 + wrangler 4 + assets.directory=./dist + run_worker_first + D1 + Turnstile），wrangler.jsonc 可照抄。
- [ ] **第 2 階段「代表頁試作」**（規劃 §12）：首頁、LQCOL-PLUS 系列頁、一個產品明細頁、一篇文章；zh／en／ar 三種版型（ar 驗 RTL）；Cloudflare 預覽可開、URL 與舊站一致、schema 一致、走完一次「改內容檔→預覽→審→發布」。工作天估 3–5。
  - [x] 2026-10-23：`site/` 建好（Astro 7.4 + Workers Static Assets）。首頁與 LQCOL-PLUS 系列頁 en／zh 共 5 個網址，`wrangler dev` 實測 `/`、`/en`、`/zh`、`/en/LQCOL-PLUS`、`/zh/LQCOL-PLUS` 都回 200、網址與舊站相同；`npm run verify` 驗規格數字＝資料檔（故意改錯一格會被抓到）；`astro check` 0 錯誤；桌面與手機寬度看過。說明見 site/README.md，AI 規則見 site/AGENTS.md。
  - [x] 2026-10-24：依黃老闆指示把版型改回**跟舊站一樣**（沿用舊站 bootstrap／style.css／series_content.css，HTML 結構照抄；首頁藍底字標＋輪播、系列頁深咖啡底）。桌面與手機並排比對過，選單行為同舊站。
  - [x] 2026-10-24：7 個經典模板系列頁 en／zh 做完（PUMPLUS、RO、THERMAL、HYDRO、PREMIUM、MEGA、SOLAR，共 14 頁；加首頁與 LQCOL 共 19 頁），`import-classic-series.mjs` 直接從封存解析，版型與舊站逐頁比對過。中文頁照舊站沒型號清單、放 DM 大圖。
  - [ ] **開發順序（黃老闆 10/24）：先把所有頁面的 en＋zh 做完給客戶確認，客戶 OK 後才做 es／fr／ru／ar。**
  - [x] 2026-10-24：supreme、dl-ce、asme-ht、GIGA-PLUS、accessories 五頁 en／zh 做完（照抄模板 `import-legacy-page.mjs`，主體 HTML 整段抄，verify 逐字比純文字），新站共 29 頁。
  - [x] 2026-10-24 第五次審查（5 個照抄頁）：版型／文字／SEO 全過，2 項記錄問題已修：照抄頁加 dataQuestions（dl-ce 型號與數值對不上、asme-ht 三處、GIGA 加侖、accessories 同圖）、README 修 3 處；另把舊站 head 的 Product JSON-LD 搬回照抄頁、accessories 補少關的 div。
  - [x] 2026-10-24 照抄頁複審：**可以交付**（29 頁）。
  - [x] 2026-10-24 麵包屑決定：只留新站頂層 BreadcrumbList（選單字樣）；舊站 Product.breadcrumb 是不合規屬性且名稱不一致，匯入時拿掉。舊站 body 裡 AEO Worker 注入的 @graph 沒搬，切換時跟 Worker 一起處理。
  - [x] 2026-10-24：products、about、feature、certification、FAQ、contact、downloadpage、videos、sel_tools 九頁 en／zh 做完（照抄模板），新站共 47 頁。contact 表單先不接後端（上線前 Worker API＋Turnstile）。
  - [x] 2026-10-24 第六次審查（9 個文字頁）：要修 6 項，已全修（commit 947fd19）：聯絡頁 email 解開 Cloudflare 混淆成純文字、feature 頁六面板點圖切換補純 JS、FAQ 從頁面 29 題產生 FAQPage（verify 比題數）、舊站 Corporation 型 JSON-LD 不再帶進來、麵包屑改查選單（非產品頁不再掛 PRODUCTS）、bootstrap 照舊站 min／full 且 series_content.css 只給 LQCOL。複審再抓 2 項也修了：FAQ 答案的 &deg; 等 HTML 實體還原成純文字（匯入時通用解碼）、style.css 用到的 12 張圖（8 個文字頁藍色標題帶、about 水泡底圖、feature 底圖）沒複製進來→copy 腳本改成連 CSS url() 的圖一起複製、verify 檢查 CSS 圖存在。第二輪複審：**可以交付**（47 頁 en／zh；頁高與舊站恰差 21px＝預覽條）。
  - [x] 2026-10-24：新聞做完（`import-news.mjs`、`NewsList.astro`、`NewsDetail.astro`）：列表 en 39 頁＋zh 11 頁、明細 237 篇，新站共 334 頁；verify 逐字比正文、比分頁列、比篇數，兩階段全過；1280 寬列表與明細頁高跟舊站只差預覽條 20px。語言選單切到沒有這頁的語系回該語系首頁。第七次審查：A／C／D／E 全過、1280 版型逐值同舊站；1 項不通過已修：8 篇正文有固定寬表格或影片在手機撐寬（舊站同）→ site.css 讓正文框橫向捲、影片不超過框寬。**可以交付**。切換時要改：新聞正文約 130 處連到舊站 .php 網址、3 個舊站本來就壞的連結（README 已列）。
  - [x] 2026-10-24：影片列表（en/zh 各 3 頁）＋明細 22 篇、下載子頁 14 頁（/download/<language>，無語系前綴、英文介面）做完，新站共 374 頁；verify 兩階段全過、check 0 錯誤；1280 寬頁高與舊站只差預覽條。待審查。
  - [ ] 還沒搬的頁：選型工具三個計算器 sel_unit_ps／vsd／thermal（公式在 RUN_REPORT §A3）；配件明細 6；90 頁英文產品明細 /en/products-det/…；認證頁連去的 `/certification_page.php?sid=N`（舊站沒封存到，verify 現在會列成尚未搬遷，要先抓線上版）。
  - [ ] **圖片瘦身（全部頁面做完之後再做，黃老闆 10/24）**：系列頁底圖 1–3 MB（LQCOLPLUS_bg.png 3.1 MB、首頁 hbg-01-11.jpg 1.1 MB）、中文系列頁 DM 圖每張 1–1.7 MB，以前就拖累 PageSpeed。做法候選：壓縮／轉 WebP、responsive srcset、lazy、底圖改 CSS 漸層＋小圖。先照原樣，不要在搬頁時動。
  - [ ] 還沒做：ar 版型（RTL）；部署到 Cloudflare 預覽網址（帳戶歸屬未定）；走一次「改內容檔→預覽→審→發布」。
  - [x] 2026-10-24 第一次審查（首頁＋LQCOL）：網址／SEO／JSON-LD／工程衛生全過，版型 9 項不通過已全部修掉：產品列回深色區、首頁米色底＋44pt 公司名＋字標原尺寸＋輪播一次一張、選單結構與 padding 與 logo 照舊站、正文粗體、規格數字照原字串、結構圖標示照舊站斷行、中文選單／認證說明／地址一字不差、zh ASME 按鈕兩行（手機不再溢出）、en 首頁認證說明先不顯示（舊站沒有）、產品／品牌／選單資料檔都加 schema。
  - [x] 2026-10-24 第二次審查（19 頁）：9 項已修：zh 7 頁 DM 圖補齊並照舊站 JS 用 img-responsive 滿版、PUMPLUS 橫式一列三張（colClass）、RO 型號無包裝層／MEGA 標題外 <p> 間距／PREMIUM 無標題外框（照舊站逐頁存旗標）、內頁改載舊站客製 bootstrap.css、en 首頁補空的公司名段落、home.json 加 schema、classic 加 dataQuestions（自動列公升換加侖不符：APT-3、ROT-1 的 3 L＝0.5 gal；APT-60／APT-60H／ROT-14／MEGA-60 的 60 L＝14 gal）、zh 經典頁 JSON-LD 不帶 hasVariant、README 補 HYDRO 舊站 HTML 未閉合一條。
  - [x] 2026-10-24 第三次審查：上輪 9 項全過；新 2 項已修：zh DM 區塊照舊站結構含空段落（edmHtml，verify 與封存逐字比）、README 補「不做 WOW 進場動畫」；標題圖 alt 改用舊站原文。
  - [x] 2026-10-24 第四次審查：**可以交付**（19 頁 en/zh；頁高與舊站差 3–4px 像素誤差，zh/LQCOL 因 AI 初稿文字長度不同）。
  - [ ] 問客戶（規格疑點彙整）：LQCOL 三項＋上述 6 個型號的加侖數＋MEGA／GIGA 中文都叫「高壓泵浦壓力桶」。
  - [ ] 審查流程：每做完一頁用 `.claude/agents/aquasky-site-reviewer.md` 審（10/24 建；本 session 建的要重開 session 才會被 Agent 工具認得，過渡期用 general-purpose agent 讀該檔執行）。
  - [ ] 2026-10-24 已擬 LINE 訊息向 Tiffany 要三樣：所有 Banner 原圖、所有下載 PDF 原檔、Selection Tools 最終版 Excel（草稿在 官網改版說明文件/05-舊站資料擷取/2026-10-24-LINE給Tiffany-索取Banner-PDF-選型Excel.md）。黃老闆傳出後改成「等回覆」。收件用 Drive 資料夾已開：`梵亞/AQUASKY-AEO/溢康提供素材-20261024/`（三個子資料夾），Tiffany 要求存取權時記得給「編輯者」。
  - [ ] 要決定：舊站圖片／PDF 正式部署時放哪（現在從本機封存複製，不進 Git；Workers Builds 在雲端拿不到封存）。選項：放 R2，或把需要的圖片 commit 進 site/public（LQCOL 用到的約 10 MB，主要是 8 MB 的使用手冊 PDF）。
  - [ ] 問客戶：LQCOL 規格表三個疑點（LQC-3 重量／外箱比 LQC-8 大、LQC-60SS 加侖數 14 對不上 60 L、內文說有 0.5L／1L／100L+ 但表上沒有）。已記在 site/src/data/products/lqcol-plus.json 的 dataQuestions。
  - [x] 2026-10-24 盤點各系列獨立 logo 檔：8 個系列有（Thermal、HYDRO、MEGA、SOLAR、SUPREME、ELBI＝dl-ce 與 asme-ht 共用、GIGA webp、LQCOL），PUMPLUS／RO／PREMIUM 用文字或標題圖，accessories 沒有獨立 logo。全部已列入 assets:copy。首頁產品系列 12 張圖本身就含 logo，顯示正常（黃老闆截到的空白是圖還沒載完）。
  - [ ] 英文首頁認證圖示的說明文字是新補的（舊站英文版沒有），從中文說明翻過來，要 Tiffany 一起看。
- [ ] 待決：Cloudflare 帳戶放客戶名下還是梵亞名下（規劃 §8.4，合約事）。定案前先用梵亞帳戶做預覽。
- [ ] 切換時要逐項解除舊 AEO Worker（`Aquasky Edge AEO On Cloudflare Project/worker/wrangler.toml`，掛在 aquaskyplus.com 六語系路由）的 HTML 注入（規劃 §13）。

## 搬站前：原始碼與資料調查

- [ ] **向原工程師索取原始碼／資料庫備份**（梵亞的事，不是業主的事，已從 10/22 講話重點第六節移除）
  - 初步判斷：靜態內容照現成的複製即可，已封存 813 頁 HTML＋173 PDF 作底（`migration-2026-10-09/`）。
  - 真正要原始碼的是下面的選型工具。
- [x] **選型／規格計算工具（selection / sizing）公式來源** → 2026-10-22 已從前端 JS 取得（見上方 A3），不必再向工程師要。
  - 剩下要做的：拿客戶的「選型工具驗證案例」驗證；Thermal 的 PSI 分支公式要先問清楚。
- [ ] **GSC 與網站分析的唯讀權限**（請客戶把 GSC、GA 唯讀權限開給梵亞）
- [x] **舊主機是否兼跑信箱** → 確認不用處理。客戶信箱是 Gmail 掛在 Google Workspace，網域再掛進去；沒有信箱要綁，只有 DNS 要設定，DNS 本來就是梵亞在管。

## Slack 作業模式

- [ ] **Slack 席次費用確認**：每加一位成員就多一席付費。客戶兩個窗口（預覽審核人、資料確認人）是否真的要兩個 Slack 帳號，或先一個就好。
  - **2026-10-22 確認：梵亞行銷工作區（vai-marketing.slack.com）目前是免費版**，所以沒有訪客選項，成員只有擁有者／管理員／一般成員。免費版不收費，「多加一人多付一人」是 Pro 升級報價按成員數算。
  - [ ] 決定路線：A 留免費版（成員看得到所有公開頻道、只保留 90 天紀錄、App 上限 10 個）或 **B 升級 Pro 只付一席**（先升級 → 再把天翔與客戶改成單一頻道訪客 → 付費席次只剩 Zell）。建議 B，一席約每月 8.75 美元。
  - 省錢方案（2026-10-22 查 Slack 官方說明）：把客戶兩位窗口加成**單一頻道訪客（Single-Channel Guest）**，在 Pro 方案免費、不占付費席次；每位付費成員可帶 5 位訪客。只能看一個頻道，正好符合「一個 AQUASKY 專案頻道」的用法。
  - 不要用多頻道訪客（Multi-Channel Guest），那是按正式成員計費。
  - Slack Connect 不適合：客戶自己的工作區也要是付費方案（免費版只有一次 90 天試用）。
  - [ ] 實測重點：**訪客能不能在頻道貼訊息、上傳檔案**（提供要修改的資料與圖檔）。這才是關鍵需求；Slack 說明寫訪客可在所屬頻道發訊息與分享檔案，要實際驗證。
  - 訪客 @Claude 反而不必可行：理想分工是客戶只負責貼資料，由梵亞在同一工作區驅動 Claude 整理修改單、出預覽。若訪客 @Claude 沒反應，正好就是這個分工。
- [ ] **搞懂 Slack「工作區（Workspace）」怎麼建立與使用**（目前在介面裡找不到位置）
  - 工作區＝最上層的團隊空間（網址像 `xxx.slack.com`），頻道都開在工作區裡；付 Pro 方案也是以工作區為單位。梵亞現在付費的那個就是一個工作區，專案頻道直接開在裡面即可，不必為 AQUASKY 另建工作區。
  - 要看或切換工作區：桌面版左上角點工作區名稱 → 下拉選單會列出所有工作區，最下面有「新增工作區」；或到 slack.com/create 建立新的。
  - 邀請客戶當訪客：左上角工作區名稱 → 「邀請成員加入 ○○」→ 選「訪客」→ 指定單一頻道（只有付費方案才有訪客選項）。
  - 已加成正式成員的人**不用踢掉**：左上角工作區名稱 → 管理成員（slack.com/admin）→ 該成員列的「⋯」→「變更帳號類型」→ 單一頻道訪客 → 指定頻道。改完就不占付費席次，多付的部分依比例退成餘額。只能在桌面版操作，手機 App 不行。
  - [ ] 決定頻道名稱與成員：例如 `#aquasky-官網`，成員＝梵亞＋Claude App＋客戶訪客。
- [ ] 啟用前先走一次完整流程給客戶看：一次換檔＋一次文案修改（講話重點第三節的承諾）。

## AEO／AI 回答月測（Cloudflare 雲端自動檢核）

- [ ] **10/8 完整月測失敗，至今沒人處理**（2026-10-22 查核）。72 筆只取得 1 筆、71 筆失敗或待處理；10/9 抽查 OpenAI 與 Claude 回「模型服務錯誤」。之後的 10/13 月報定稿、人工複核都沒做，監測專案最後一筆 commit 停在 9/24。
  - 取數本身是自動的（`aquasky-monitor` Worker，每 5 分鐘 cron，結果存 D1 與私人儀表板，不進 Git），所以不是「忘了跑」，是「跑了但壞了、沒人看」。
  - **2026-10-22 08:30 已登入儀表板查明原因（兩個問題疊加）：**
    1. **OpenRouter 餘額用完**：10/1 起五個走 OpenRouter 的模型（OpenAI、Google、Claude、Grok、DeepSeek）全回 HTTP 402 Payment Required；Perplexity 走自己的金鑰，正常。10/1 重點複查就已 18 答 6 失敗。
    2. **程式 bug：失敗的請求不釋放 US$2 預留**。供應商回錯誤時沒有費用回報，`reported_usd` 留 NULL，預算公式就一直算 `reserved_usd` 2 美元。10 筆 402 失敗卡住 US$20，加上實際花費 US$3.32，10 月預算 25 美元被記成 23.32，10/8 剩下 66 筆全被 `budget_blocked`。
    - 今天 09:00 的重點複查也會被同一個門檻整輪擋掉（23.32 + 2 > 25）。
  - [x] OpenRouter 帳號已重建（2026-10-22 上午，Zell）。推測原帳號未收到費用或被砍，才會全回 402。
  - [ ] **今天（10/22）下午：把新的 OpenRouter 金鑰放上 Worker**。用 `scripts/set-aiqa-secrets.py --config <config.ini 路徑>` 從 stdin 寫入 `OPENROUTER_API_KEY`，金鑰不進 Git、不貼命令列。放上去後用一題 × 六模型做小量驗收，標成「上線驗收」。
  - [ ] **修 bug**：`monitor/src/aiqa-runner.mjs` 第 57–64 行，供應商回錯誤且無費用回報時，把該筆 attempt 的 `reported_usd` 設 0 釋放預留；部署 Worker。
  - [ ] **清掉已卡住的 US$20**：對 D1 `aiqa_attempts` 把 10 月 `reported_usd IS NULL` 且對應 item 為 failed/402 的 10 筆設 `reported_usd=0`。
  - [ ] 修好後補跑一輪完整 72 筆（依文件 40：中斷不自動補跑數週，要人工決定），並重新做人工複核與 10 月月報。
  - [ ] 11 月預排：11/12 完整月測、11/17 定稿、11/19 月會。這次要在 11/13 看一眼有沒有跑成。
  - 監測專案位置：`E:\CascadeProjects\Aquasky Edge AEO On Cloudflare Project`（節奏見 docs/40、雲端實作見 docs/41）。（10/23 更正：原本寫的 C 槽路徑不存在。）

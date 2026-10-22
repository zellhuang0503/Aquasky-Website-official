# 舊站資料擷取：階段 A ＋ 階段 B 執行報告

執行日期：2026-10-22。執行人：Claude（本機 Claude Code，黃老闆電腦）。
依據：`官網改版說明文件/05-舊站資料擷取/2026-10-22-舊站資料擷取-現況分析與執行方案.md` 階段 A、階段 B。
抓取方式：只對公開頁面 GET、自我標示 UA（`AquaSkyPublicArchive/1.0`）、每秒一次、不碰後台、不送任何表單、不存 Cookie。與 10/9 相同。

---

## 0. 一句話結論

階段 A、B 全部完成，**10/9 的封存完整無損（已多一份 zip 備份）**；10/22 的新快照抓到 2,629 個 URL，比對結果證實工程師正在改的就是 **LQCOL-PLUS 六個系列頁**（內容增加約 4,500 字）。另外有兩件 10/9 沒發現的事要處理：

1. **10/9 漏抓了真正的選型工具頁面。** `sel_tools` 只是入口頁，計算器在 `sel_unit_ps` / `sel_unit_vsd` / `sel_unit_thermal`，這三頁不在 sitemap、也不在後台清單，所以 10/9 沒抓到。本次已補齊 18 頁（六語系 × 三類），**三類計算公式全部在前端 JS，已經在我們手上**。
2. **88 個英文產品明細頁在 10/9 到 10/22 之間新增了「Certification Conformity」認證區塊**，另有 1 頁（APT-1.3）被移除一項認證。認證是合規主張，新站必須採用 10/22（或更新）版本，不能用 10/9 版。

---

## 1. 階段 A：保全與檢查既有封存

### A1 10/9 封存完整性重核 ✅

`python audit_archive.py "." --verify-hashes --inventory aquasky_public_url_inventory.json`

| 項目 | 結果 |
| --- | ---: |
| `integrity_issues` | **空陣列（全部通過）** |
| 成功 URL | 3,248 |
| 封存位元組 | 690,935,703 |
| sitemap 791 筆覆蓋 | 791 / 791 |
| 後台清單 797 筆覆蓋 | 797 / 797 |
| 仍被引用但抓不到 | 1（`font-awesome/css/font-awesome.min.css`，回 404，不影響內容） |

每個檔案逐一重算 SHA-256 並與 manifest 比對，沒有缺檔、沒有雜湊不符。

### A2 第二份備份（zip ＋ SHA-256）✅

| 項目 | 值 |
| --- | --- |
| 檔名 | `aquaskyplus-archive-2026-10-09.zip` |
| 目前位置 | `E:\CascadeProjects\aquaskyplus-archive-2026-10-09.zip` |
| 大小 | 681,081,554 bytes（約 650 MB） |
| **SHA-256** | **`7653c6181e84109c98c80de2726e2fdb94a473c1d593698fe25a3a2f9c7b9e26`** |
| 內含檔案 | 3,268 個（整個 `migration-2026-10-09` 資料夾，含 content／jsonl／run.log／報告／腳本） |
| 完整性 | CRC 全數通過（`zipfile.testzip()` 回 `None`） |

雜湊也另存為 `E:\CascadeProjects\aquaskyplus-archive-2026-10-09.sha256.json`。

> ⚠️ **待黃老闆指定 Google Drive 路徑後搬移。** 目前仍只在 E 槽（和原封存同一顆硬碟），**嚴格說還不算「第二份」**，硬碟掛掉兩份一起沒。建議放 `G:\我的雲端硬碟\梵亞\客戶\溢康企業\舊站封存\`；指定後我可以搬，或您直接拖過去再核對上面的 SHA-256。

### A3 選型工具的計算邏輯在哪裡 ✅

**結論：三類計算公式全部在前端 inline JS，公式已經在我們手上。伺服器端只負責「用算出來的容積去挑型號」與「產生 PDF」。**

查核過程：

1. 封存的 51 個 JS 檔全部是通用函式庫（jQuery、bootstrap、owl.carousel、wow、backstretch、jquery.cookie、jquery.validate，六語系各一份＋根目錄一份）＋ 2 個 Cloudflare 腳本。對 `sel_tools`／`pressure switch`／`VSD`／`VFD`／`expansion`／`calc`／`drawdown`／`acceptance` 等關鍵字搜尋，**命中 0 個檔案**。
2. 讀六個 `sel_tools` 頁，發現它只是入口頁，三顆按鈕連到 `sel_unit_ps`、`sel_unit_vsd`、`sel_unit_thermal`。這三頁**不在 10/9 封存裡**（不在 sitemap、也不在後台 797 筆清單）。
3. 補抓三頁英文版（各回 HTTP 200），公式就寫在頁面的 inline `<script>` 裡。

#### 公式（所在檔案＝頁面本身的 inline script；函式名如下）

**① Pressure Switch — `sel_unit_ps`**
函式：`PSS_stpe2()`、`PSS_stpe3()`、`$("#submit_s1").click`；PSI 版 `PSI_stpe2()`、`PSI_stpe3()`、`$("#submit_s2").click`

```
Acceptance Factor  = (cut_out - cut_in) / (cut_out + 1)        → 乘 100 顯示為 %
建議預充壓（Bar）  = cut_in - 0.2
Total Water Needed = Minimum_Run_Time × Litre_per_Minute
Proper Tank Size   = Total_Water_Needed / Acceptance_Factor
PSI 版：先 cut_in ÷ 14.5、cut_out ÷ 14.5 換成 Bar 再套同一式
         建議預充壓（PSI）= cut_in - 2.8
防呆：cut_out ≤ cut_in 時，自動改成 cut_in + 1
```

**② VSD（VFD）— `sel_unit_vsd`**
函式：`VSD_step2()`、`$("#submit_s1").click`；PSI 版 `VSD_step2_PSI()`、`$("#submit_s2").click`

```
Proper Tank Size   = water_flow / 36
建議預充壓（Bar）  = (set_pressure + 0.1) × 0.65
建議預充壓（PSI）  = (set_pressure + 1.5) × 0.65
防呆：water_flow 與 set_pressure 小於 1 時一律視為 1
```

**③ Thermal Expansion Tank — `sel_unit_thermal`**
函式：`THL_step2()`、`$("#submit_s1").click`；PSI 版 `THL_step2_PSI()`、`$("#submit_s2").click`

```
Proper Tank Size   = Total_Water_Volume × 0.044
建議預充壓（Bar）  = Operating_Pressure - 0.2
建議預充壓（PSI）  = (Operating_Pressure + 0.1) × 0.65
```

> 注意兩件事，都是我們讀到的事實，不是推測：
> - Thermal 的 PSI 分支用 `(P + 0.1) × 0.65`，和同頁 Bar 分支的 `P - 0.2` 不是同一條式子，也和 VSD 的 PSI 分支（`(P + 1.5) × 0.65`）不一致。**看起來是舊站的 bug。** 新站重做時要請客戶／工程師確認哪一條才對。
> - Thermal 的 `Max_Working_Temperature` 與 `Safety_Relief_Valve` 兩個欄位有收值、會送到伺服器，但前端完全沒拿來算容積。

#### 伺服器端（公開 GET 拿不到，若要完全還原需工程師的程式）

| 用途 | 端點（AJAX URL 或表單 action） |
| --- | --- |
| 依算出的容積挑型號、回傳結果 HTML | `select_api2.php`（PS）、`select_api_vsd.php`（VSD）、`select_api_thermal.php`（Thermal）；另頁面上有 `sizing_bar.php` 作為部分 `<form action>` |
| 產生選型結果 PDF | `printpdf.php`（PS）、`printpdfvsd.php`（VSD）、`printpdfthermal.php`（Thermal） |
| 選型結果轉詢價 | `sel_contact.php` |

本次**沒有**對這些端點送出任何 POST（規則：不送表單）。它們做的是「容積 → 型號」的對照查表，新站可以用產品規格表自己重建；**真正的計算公式不需要再向工程師索取**。

另外全站掃過一遍，**只有聯絡表單一種 `<form>`**（action = `/<lang>/contact`，六語系各一）。影片全部是 YouTube 外站嵌入（14 個不重複影片 ID）。

### A4 產品明細是否只有英文 ✅

**結論：是，產品明細只有英文，而且其他語系連過去的路都沒有。**

| 查核點 | 結果 |
| --- | --- |
| 封存中 `products-det` 頁數 | 90，**全部在 `/en/` 底下**，沒有任何其他語系 |
| 開三頁實查（`/en/products-det/pumplus/APT-1.3`、`/mega-plus/MEGA-8`、`/hydro-plus/HP-8`） | 三頁結果一致 |
| 語言切換選單指向 | `/en`、`/zh`、`/es`、`/fr`、`/ru`、`/ar` ——**各語言首頁**，不是該產品的翻譯頁 |
| `hreflang` alternate 指向 | 同樣全部指各語言**首頁**（連 `x-default` 也是 `/en`） |
| `canonical` | 指自己（`/en/products-det/...`），正確 |
| 中文系列頁 `/zh/PUMPLUS` 裡的明細頁連結 | **0 個**（英文版 `/en/PUMPLUS` 有 26 個） |

兩個順帶發現，新站要處理：

- `hreflang` 把每一頁都指到首頁，是 SEO 設定錯誤（正確做法是指向對應語言的同一頁，沒有對應就不要宣告）。
- 非英文使用者在系列頁就走不下去，看不到任何規格。這不只是「沒翻譯」，是斷路。

### A5 第二次抓取的種子清單 ✅

`python build_seed_urls.py . --out seed_urls_2026-10-22.json --url-file combined_public_urls.json --sitemap-file ../migration-2026-10-22/sitemap_2026-10-22.xml`

| 來源 | 筆數 |
| --- | ---: |
| 後台清單聯集 `combined_public_urls.json` | 811 |
| 10/22 最新 sitemap | 791 |
| 封存 HTML 內的頁面連結（`<a href>`） | 677 |
| 封存 HTML／CSS 內的素材引用 | 1,644 |
| **去重後總計 → `seed_urls_2026-10-22.json`** | **2,597** |
| 其中 sitemap 與後台清單都沒有的 | 1,785 |
| 其中 10/9 完全沒抓到的 | **205** |

那 205 筆就是 10/9 的覆蓋漏洞：文章／影片列表分頁 106、font-awesome 字型 64、**選型工具計算器頁 18**、舊 `.php` 網址 12、`GDPR/index.html`、`/LQCOL-PLUS`（無語系前綴）、`/certification`（無語系前綴）等。

> 說明：`archive_public.py` 與 `audit_archive.py` 的引用解析**只跟隨「素材」連結**（css／js／圖／pdf…），不跟隨指向頁面的 `<a href>`，所以 `sel_unit_*` 這類頁面永遠不會被自動發現。本次新增 `build_seed_urls.py` 補上頁面連結解析，順便輸出全站 `<form action>` 與 `<iframe src>` 清單。**這是 10/9 漏抓的根本原因，階段 C 一定要沿用這份種子清單。**

---

## 2. 階段 B：進行中快照（`migration-2026-10-22`）

### B6 最新 sitemap 與 10/9 比對

| 項目 | 結果 |
| --- | --- |
| 存檔 | `migration-2026-10-22/sitemap_2026-10-22.xml`（165,052 bytes） |
| URL 筆數 | 791（10/9 也是 791） |
| 新增 | **0** |
| 移除 | **0** |
| `lastmod` 有變 | **0** |
| 檔案 SHA-256 | `a4e27b8f69ae5b0b8c0da0f1b744c2c4114270875e00ec241e205a3c27510ef5` |

**sitemap 與 10/9 位元組完全相同。** 也就是說工程師改了 LQCOL-PLUS 的內容，但沒更新 sitemap——sitemap 不是自動產生的，不能當作「網站改了什麼」的訊號，也不能單靠它當種子。新站必須改成自動產生。

### B7 全站封存

`python archive_public.py --output ../migration-2026-10-22 --sitemap-file ...sitemap_2026-10-22.xml --url-file seed_urls_2026-10-22.json --max-items 4000 --delay 1`

| 項目 | 結果 |
| --- | ---: |
| 本次嘗試 | 2,635（含補抓 5 筆） |
| 成功 | **2,629** |
| 佇列剩餘 | 0（跑完，沒有中斷） |
| 封存位元組 | 619,540,567 |
| 失敗 | 5（全部 404，詳下） |

失敗的 5 筆都是 404，都不是內容損失：

| URL | 判讀 |
| --- | --- |
| `font-awesome/css/font-awesome.min.css` | 與 10/9 同一個已知 404，六個 `sel_tools` 頁引用，不影響內容 |
| `/LQCOL-PLUS`、`/certification` | 無語系前綴的網址，站上不存在（站內連結寫錯），**新站要列入 301 對照** |
| `/sizing.php`、`/cdn-cgi/l/email-protection` | 舊網址／Cloudflare 信箱保護端點，正常 404 |

另有 1 筆 `/es/images/about/about-gb-03.jpg` 曾因連線被對方重置而失敗，**已重抓成功**。

### B8 對帳與完整性

`python audit_archive.py "../migration-2026-10-22" --verify-hashes --inventory aquasky_public_url_inventory.json --write-report`

| 項目 | 結果 |
| --- | ---: |
| `integrity_issues` | **空陣列（全部通過）** |
| sitemap 791 筆覆蓋 | **791 / 791** |
| 後台清單 797 筆覆蓋 | **797 / 797** |
| 仍被引用但抓不到 | 1（同上 font-awesome） |

內容組成變化（10/9 → 10/22）：**HTML 813 → 949（＋136）**、PDF 173 → 175（＋2）、CSS 70 → 17、JS 51 → 9、圖片 2,062 → 1,364。
CSS／JS／圖片「變少」不是內容消失，原因見下一節第 ③ 點。

### B9 與 10/9 逐頁比對（`diff_report.md`）

| 項目 | 數量 | 判讀 |
| --- | ---: | --- |
| 新增 URL | 236 | 多數是 10/9 的覆蓋漏洞被補上 |
| 消失 URL | 855 | **全部是 10/9 的重複副本，不是真的消失** |
| **內容有變（文字真的不同）** | **96** | **這才是工程師這段時間真正改的東西** |
| 只有標記變、文字相同 | 717 | Cloudflare Rocket Loader 每次請求產生的隨機 token，純噪音 |
| 完全相同 | 1,580 | — |

#### ① 新增了哪些頁（236 筆）

| 類別 | 筆數 | 說明 |
| --- | ---: | --- |
| 文章／影片列表分頁 | 106 | `/news/INDUSTRY/page2`…`page33`、`/videos/page2,3` 等六語系 |
| font-awesome 字型檔 | 64 | `webfonts/fa-*.{ttf,woff,woff2,eot,svg}` |
| 圖片 | 33 | 多為舊文章配圖（`/upfile/Images/news/…`） |
| **選型工具計算器頁 `sel_unit_*`** | **18** | 六語系 × 三類，**10/9 漏抓的那批** |
| 舊 `.php` 網址（仍回 200） | 11 | `PUMPLUS.php`、`MEGA-PLUS.php`、`GIGA-PLUS.php`、`RO-PLUS.php`、`THERMAL-PLUS.php`、`PREMIUM-PLUS.php`、`products.php`、`certification.php`、`downloadpage.php`、`dl-ce.php`、`sel_tools.php` ——**都還活著，新站必須做 301** |
| **新 PDF** | **2** | 見第 ④ 點 |
| 其他 | 2 | `GDPR/index.html`（Cookie 政策頁）、`css/series_content.css` |

**沒有新的產品明細頁。** LQCOL-PLUS 與 GIGA-PLUS 到今天為止仍然只有系列頁、沒有 `products-det` 明細頁。

#### ② 哪些頁文字有變（96 筆）

**(a) LQCOL-PLUS 系列頁 6 頁 ← 這就是工程師正在做的事**

| 頁面 | 文字字數 | 增加 |
| --- | ---: | ---: |
| `/zh/LQCOL-PLUS` | 2,383 → 7,881 | +5,498 |
| `/en/LQCOL-PLUS` | 3,557 → 8,259 | +4,702 |
| `/ar/LQCOL-PLUS` | 3,670 → 8,220 | +4,550 |
| `/ru/LQCOL-PLUS` | 3,920 → 8,364 | +4,444 |
| `/es/LQCOL-PLUS` | 4,013 → 8,400 | +4,387 |
| `/fr/LQCOL-PLUS` | 4,144 → 8,404 | +4,260 |

新增內容：產品定位改寫（明確鎖定「資料中心液冷 ＋ CDU 二次迴路 ＋ AI/HPC 高密度運算」）、新增「Key Features & Advantages」（SUS304 電解拋光殼體、三層塗裝碳鋼、304 不鏽鋼接頭、EPDM 對 PG25 100% 相容、耐 90°C、氮氣預充 2 bar／30 psi、10 年免維護）、新增「Applications」段落、新增結構圖與型錄下載。引用了 2 張新圖（`/uploads/series/lqcol-plus/20261020_222802_5e8f42ca9a.png`、`lqc_structure.png`）與 2 份新 PDF。

> ⚠️ **六個語系的本文都是英文。** 只有導覽選單是翻譯的，About／Key Features／Applications 全是英文原文。新站如果要六語系，這段文字要重新翻譯——這是客戶要補的內容，不是我們抓漏。

**(b) 英文產品明細頁 89 頁 ← 認證內容變動，合規相關**

- **88 頁新增了「Certification Conformity」認證區塊**（10/9 版完全沒有這個區塊）。各系列列出的認證不同，例如：

| 系列（抽樣頁） | 10/22 新增的認證清單 |
| --- | --- |
| PUMPLUS（APT-100） | NSF 61、Eurocert、Korea KC Mark、ACS、WRAS、WaterMark、NSF/ANSI 372 |
| MEGA-PLUS（MEGA-8） | NSF 61、Eurocert、ACS、WaterMark、NSF/ANSI 372 |
| THERMAL-PLUS（TP-8） | NSF 61、Eurocert、UPC、NSF/ANSI 372 |
| RO-PLUS（ROT-2） | NSF 58、Eurocert、NSF/ANSI 372 |
| PREMIUM-PLUS（APT-18SS） | Eurocert、UPC、NSF/ANSI 372 |
| HYDRO-PLUS（HP-8）／SOLAR-PLUS（SP-8） | Eurocert |

- **1 頁（`APT-1.3`）原本就有這個區塊，本次被移除「WaterMark Certification Scheme」一項**（文字 -31 字）。

> ⚠️ 認證是合規主張，不能猜也不能沿用舊版。**新站搬遷必須以 10/22（或階段 C 的最終版）為準**，並請客戶逐一確認每個系列的認證清單與有效期。APT-1.3 被拿掉 WaterMark 這件事特別要問清楚原因。

**(c) `/ar/news/INDUSTRY` 1 頁**

側欄「最新文章」輪替清單換了一則（2023-09-27 那篇換成 2024-03-18 的 MEGA-PLUS 16 bar 文章）。動態區塊，不是內容修改。

#### ③ 哪些頁消失（855 筆）

**沒有任何頁面真的消失。** 855 筆全部是素材檔（png 411、jpg 252、webp 96、css 54、js 42），**一個 HTML 頁面都沒有**。

原因：10/9 的抓取腳本在跑到一半時才修好 `<base href="/">` 的處理（留下 `failed_references_pre_base.json` 這個痕跡）。修好之前，頁面裡的 `css/style.css` 被誤解成 `/ar/css/style.css`；修好之後才正確解析成 `/css/style.css`。所以 10/9 的封存同時含有「根目錄正確版」與「語系前綴錯誤版」兩份同樣的檔案。

逐一驗證：855 筆**全部**的 SHA-256 與根目錄同名檔案完全相同（例：`/ar/css/a-hover.css` 的雜湊 ＝ `/css/a-hover.css` 的雜湊），而根目錄版在 10/22 的封存裡**全部都在、雜湊也相同**。所以這 855 筆是重複計數，不是遺失。10/9 真實的不重複 URL 數應該是 3,248 − 855 ＝ **2,393**。

#### ④ 新增哪些 PDF（2 份）

| PDF | 大小 | 備註 |
| --- | ---: | --- |
| `/uploads/series/pdf/SERIES_lqcol-plus_1_20261020_222652.pdf` | 856,160 bytes | LQCOL-PLUS 型錄，上傳時間 2026-10-20 22:26 |
| `/uploads/series/pdf/SERIES_lqcol-plus_2_20261020_222359.pdf` | 7,989,999 bytes | **與專案根目錄的 `241216-2-LQCOL PLUS Series-IO 4 RE.pdf` 位元組完全相同（SHA-256 一致）**，是客戶自己提供的那份 |

兩份都掛在 LQCOL-PLUS 系列頁上，**但「下載專區」（`/en/downloadpage`、`/zh/downloadpage`）還沒掛上去**。工程師這一輪顯然還沒做完。

---

## 3. 產出檔案清單

進 Git（腳本、清單、報告）：

| 檔案 | 內容 |
| --- | --- |
| `migration-2026-10-09/build_seed_urls.py` | 新腳本：從封存建種子清單，含頁面連結解析與 form／iframe 清單 |
| `migration-2026-10-09/seed_urls_2026-10-22.json` | 2,597 筆種子清單 |
| `migration-2026-10-22/sitemap_2026-10-22.xml` | 10/22 的 sitemap |
| `migration-2026-10-22/RUN_REPORT.md` | 本報告 |
| `migration-2026-10-22/coverage_report.json` | B8 對帳結果 |
| `migration-2026-10-22/diff_report.md` / `.json` | B9 比對結果（完整逐筆清單） |
| `migration-2026-10-22/failed_references.json`、`obsolete_failure_attempts.json`、`pending_references.json` | 失敗引用分類 |
| `.gitignore` | 改成 `migration-*/` 通用規則，以後每個快照自動排除 |

不進 Git（依指示）：`migration-2026-10-22/content/`（619 MB）、`*.jsonl`、`run.log`。
不在 Git 倉庫內：`E:\CascadeProjects\aquaskyplus-archive-2026-10-09.zip` 與 `.sha256.json`。

---

## 4. 要黃老闆決定或處理的

1. **zip 搬到 Google Drive 哪個資料夾。** 現在還在 E 槽，和原封存同一顆硬碟，等於還沒有異地備份。這是階段 A 唯一沒收尾的事。
2. **向客戶確認認證清單。** 88 個產品頁新增認證區塊、APT-1.3 少一項 WaterMark——要逐系列確認正確性與有效期。
3. **向客戶要 LQCOL-PLUS 六語系翻譯。** 工程師放的是英文本文，六個語系都一樣。
4. **「本輪完成」的確認。** 從證據看工程師還在做（下載專區還沒掛 LQCOL PDF、沒有 LQCOL／GIGA 明細頁、sitemap 沒更新）。階段 C 的最終版快照要等客戶窗口回一句確認再跑。
5. **選型工具的驗證案例。** 公式已經在手上，但 Thermal 的 PSI 分支公式與 Bar 分支不一致（疑似舊站 bug），需要客戶提供幾組「輸入 → 正確答案」來驗證新站。

---

## 5. 下一輪怎麼跑（階段 C）

```powershell
cd "E:\CascadeProjects\Aquasky Websit official\migration-2026-10-09"

# 1. 下載新 sitemap 到 ..\migration-<新日期>\sitemap_<新日期>.xml

# 2. 以 10/22 封存重建種子清單
python build_seed_urls.py "..\migration-2026-10-22" --out "seed_urls_<新日期>.json" --url-file combined_public_urls.json --sitemap-file "..\migration-<新日期>\sitemap_<新日期>.xml"

# 3. 全站封存
python archive_public.py --output "..\migration-<新日期>" --sitemap-file "..\migration-<新日期>\sitemap_<新日期>.xml" --url-file "seed_urls_<新日期>.json" --max-items 4000 --delay 1

# 4. 對帳
python audit_archive.py "..\migration-<新日期>" --verify-hashes --inventory aquasky_public_url_inventory.json --write-report

# 5. 與 10/22 比對（基準改用 10/22，不要再用 10/9）
python diff_archives.py "..\migration-2026-10-22" "..\migration-<新日期>" --write-report
```

基準改用 `migration-2026-10-22`（不要再用 10/9，它有 855 筆重複副本會干擾判讀），種子清單改用 `build_seed_urls.py` 從 10/22 封存重建。別忘了把 `sitemap.xml` 本身也抓進封存（`audit_archive.py` 要靠它算 sitemap 覆蓋率）。機器時間約 50 分鐘。

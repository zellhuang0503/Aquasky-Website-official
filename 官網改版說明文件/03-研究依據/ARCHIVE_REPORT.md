# AQUASKY 公開網站來源封存（2026-10-09）

目的地：`E:\CascadeProjects\Aquasky Websit official\migration-2026-10-09`

## 已保存

- 後台提供的公開網址清單：797/797 頁，清單為 `aquasky_public_url_inventory.json`，SHA-256 `7242539dbfc657fd058adc5198d9e4dc51e2d6d421d09332f50289bd3a41a817`。
- 公開 sitemap：791/791 頁。兩份清單聯集有 798 個網址；差異見 `coverage_report.json`（後台清單獨有 7 個，sitemap 獨有 1 個）。
- 公開下載頁額外發現的 14 個語言頁，以及首頁。HTML 合計 813 份。
- 頁面直接引用的同站素材，包含 173 份通過 `%PDF-` 檔頭驗證的 PDF。成功封存總計 3,248 個 URL、690,935,703 bytes。
- 所有成功檔案的 SHA-256 均已重新計算核對，沒有不符或遺失；正確解析的引用沒有待抓網址。

## 實際缺口與舊嘗試

- 真正仍被頁面引用而回傳 404 的網址只有 `https://aquaskyplus.com/font-awesome/css/font-awesome.min.css`。來源頁與原始連結見 `failed_references.json`。
- `failures.jsonl` 另保留 393 個舊擷取器錯誤解析出的不同網址（共 445 次舊嘗試）；它們目前都不是依 HTML `<base href="/">` 正確解析後的引用。見 `obsolete_failure_attempts.json` 與 `failed_references_pre_base.json`，不可當成原站缺檔。
- `pdf_base_validation.json` 逐項列出 5 筆產品 PDF：原始 href、頁面 base、正確 URL、最終 URL、HTTP 200 與 `application/pdf`。

## 檔案與範圍

- `success.jsonl` 保存來源 URL、擷取時間、HTTP 狀態、內容類型、大小、SHA-256 與 `content/` 下的相對路徑。
- `coverage_report.json` 是最終對帳與完整性結果；`pending_references.json` 應為空陣列。
- 只對公開頁面使用 GET，未儲存 Cookie、登入／管理內容或私人詢問資料；未抓取外站影片和分析追蹤網址。
- 這是公開來源封存，尚未還原 CMS、表單、搜尋、產品篩選等網站功能，也未部署或更動原站。

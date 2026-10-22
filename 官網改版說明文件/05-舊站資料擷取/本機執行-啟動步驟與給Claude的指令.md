# 本機執行：啟動步驟與給 Claude Code 的指令

適用：黃老闆在辦公室電腦（E 槽）執行階段 A 與階段 B。雲端 Claude 連不到 aquaskyplus.com，所以這兩段要在本機跑。

## 一、先把 repo 更新到最新

```powershell
cd "E:\CascadeProjects\Aquasky Websit official"
git pull origin main
```

確認 `migration-2026-10-09\diff_archives.py` 與 `官網改版說明文件\05-舊站資料擷取\` 都已出現。

## 二、在這個資料夾開本機 Claude Code，把下面整段貼給它

> 請依 `官網改版說明文件/05-舊站資料擷取/2026-10-22-舊站資料擷取-現況分析與執行方案.md` 執行階段 A 與階段 B，完成後把結果寫成一頁報告放在 `migration-2026-10-<今天日期>/RUN_REPORT.md`，並 commit。規則：只對公開頁面 GET、每秒一次、不碰後台、不送表單；封存內容（content/、*.jsonl、run.log）不進 Git。
>
> 階段 A：
> 1. 用 `audit_archive.py` 加 `--verify-hashes` 重核 `migration-2026-10-09`，確認 `integrity_issues` 為空。
> 2. 把整個 `migration-2026-10-09` 資料夾壓成 zip，檔名 `aquaskyplus-archive-2026-10-09.zip`，算出 SHA-256 寫進報告。zip 放到我指定的 Google Drive 資料夾（我會告訴你路徑；沒說就先放在 `E:\CascadeProjects\` 下，提醒我搬）。
> 3. 在 `migration-2026-10-09/content` 裡的 JS 與六個 `sel_tools` 頁找選型工具的計算邏輯（關鍵字 sel_tools、pressure switch、VSD、VFD、expansion、calc、formula）。結論寫清楚：公式在前端 JS（列出檔案與函式名）、或是送到伺服器算（列出表單 action 或 AJAX 網址）。
> 4. 開三頁英文產品明細（例如 APT-1.3、MP-xx、HP-xx），看語言切換連結指到哪裡，回答「產品明細是否只有英文」。
> 5. 用 `audit_archive.py` 的引用解析，把封存 HTML 內所有站內連結，與 `combined_public_urls.json` 聯集，存成 `seed_urls_<日期>.json`。
>
> 階段 B：
> 6. 下載最新 `https://aquaskyplus.com/sitemap.xml` 存到新資料夾 `migration-2026-10-<日期>/sitemap_<日期>.xml`，與 10/9 的 791 筆比對新增與移除。
> 7. 執行 `archive_public.py --output ../migration-2026-10-<日期> --sitemap-file <新 sitemap> --url-file seed_urls_<日期>.json --max-items 4000 --delay 1`。中斷可重跑，會自動接續。
> 8. 跑 `audit_archive.py <新資料夾> --verify-hashes --inventory aquasky_public_url_inventory.json --write-report`。
> 9. 跑 `diff_archives.py migration-2026-10-09 migration-2026-10-<日期> --write-report`，讀 `diff_report.md`，在 RUN_REPORT 裡用一頁講清楚：新增了哪些頁（預期 LQCOL-PLUS）、哪些頁文字有變、哪些頁消失、新增哪些 PDF。
>
> 做完不要自己 push，先給我看 RUN_REPORT。

## 三、預期時間

- 階段 A：約 30 到 60 分鐘，其中 zip 與上傳佔多數。
- 階段 B：機器跑 1 到 1.5 小時，人不用顧；中途可以關掉再重跑。

## 四、做完之後

把 `RUN_REPORT.md` 與 `diff_report.md` 貼回雲端這邊的對話，或 push 上 GitHub，雲端 Claude 會接著整理「異動清單」給客戶窗口核對，並把階段 D 的抽取腳本依實際 HTML 結構寫出來。

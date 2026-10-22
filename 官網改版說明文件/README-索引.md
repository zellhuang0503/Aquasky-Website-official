# AQUASKY 官網改版 說明文件集（索引）

整理日期：2026-10-21。這裡只放「說明」類文件：為什麼改、改什麼、有什麼好處、怎麼進行、以後怎麼維護。
**報價單不在這裡**，一律看 `G:\我的雲端硬碟\梵亞\業務文件\報價單\溢康企業\`（最新：VY-2026-0924 V5 整站重建）。

各檔案都是從原專案**複製**過來的；原檔仍在原位（路徑見下）。若原檔日後更新，請重新複製。

## 01-會議提案｜改什麼、為什麼、有什麼好處
| 檔案 | 用途 | 原始位置 |
| --- | --- | --- |
| AQUASKY_官網改善行動圖解_2026-10-09.html | 10/22 業主會議主文件。買家問題→新站怎麼改→架構→**以後內容怎麼改（Slack＋Claude，10/21 新增第 05 節）**→切換→要講定的四件事 | 本資料夾根目錄 |

## 02-作業模式與整體規劃｜怎麼進行、以後怎麼維護
| 檔案 | 用途 | 原始位置 |
| --- | --- | --- |
| 2026-09-24-AQUASKY官網改版客戶版摘要.md | 給客戶看的精簡版：目的、保留／改善對照、更新流程、資產交接、時程、要客戶協助的事 | Aquasky Edge AEO On Cloudflare Project/docs |
| 2026-09-24-AQUASKY官網改版與AI維護整體規劃.md | 內部完整版（第 8 節＝內容資料模型與 AI 維護規則、第 12 節＝分階段工期、第 18 節＝Cloudflare 費用） | 同上 |
| 官網改版-工程報價需求文件-20260827.md | 8 月原本要發給工程師的需求（LQCOL-PLUS 改版＋CMS 需求），可對照「原本打算怎麼做」 | 本資料夾根目錄 |
| 官網改版-GEO-AEO工作清單-梵亞自理-20260827.md | 梵亞自理的 SEO/GEO/AEO 待辦 | 本資料夾根目錄 |

## 03-研究依據｜為什麼這樣選
| 檔案 | 用途 | 原始位置 |
| --- | --- | --- |
| 2026-09-24-migration-assessment.md | 搬站可行性與風險評估 | Cloudflare 專案 docs/research |
| 2026-09-24-framework-options.md | 框架比較（為何選 Astro 靜態站） | 同上 |
| 2026-09-24-aeo-geo-requirements.md | 新站的 SEO／AI 搜尋技術要求 | 同上 |
| 2026-09-24-monitor-informed-architecture.md | 監測資料如何影響官網優先順序 | 同上 |
| 2026-09-24-query-language-primary-sources.md | 查詢語言與一手來源研究 | 同上 |
| ARCHIVE_REPORT.md | 2026-10-09 全站公開內容封存報告（813 頁＋173 PDF，封存檔在 ../migration-2026-10-09/content，不進 Git） | ../migration-2026-10-09 |

## 04-監測報表與簡報｜現況證據
| 檔案 | 用途 | 原始位置 |
| --- | --- | --- |
| AQUASKY-營運監測儀表板-20260924.html | 營運監測儀表板（離線版） | Cloudflare 專案 reports/operations-dashboard/dist/index.html |
| AQUASKY-月度報告-20260921.md／客戶會議簡報 PDF／口語講稿 | 9/21 月度 AEO/GEO 報告與簡報 | Cloudflare 專案 docs/reports/2026-09-21 |
| AQUASKY-Cloudflare導入前後與維護-20260923.html／口語講稿 | 導入前後對比 | Cloudflare 專案 docs/reports/2026-09-23 |
| 39-每月客戶回顧與改善行動、40-AI十二問每月固定檢核節奏 | 月度檢核節奏 | Cloudflare 專案 docs |
| AQUASKY_AIQA_客戶會議簡報_20260924.html／逐頁講稿.md | AI 問答監測簡報 | Aquasky-AIQA-Monitor/presentations/20260924 |

## 05-舊站資料擷取｜舊站內容怎麼抓、怎麼比對、怎麼轉成新站資料
| 檔案 | 用途 | 原始位置 |
| --- | --- | --- |
| 2026-10-22-舊站資料擷取-現況分析與執行方案.md | 10/22 會議後的擷取方案：10/9 封存現況、公開抓取拿不到的、A 保全→B 進行中快照→C 最終版快照→D 結構化抽取→E 補資料；附本機執行指令 | 本資料夾（原檔） |
| 本機執行-啟動步驟與給Claude的指令.md | 回辦公室後：git pull → 開本機 Claude Code → 貼整段指令，跑階段 A＋B | 本資料夾（原檔） |
| 2026-10-22-向客戶與工程師索取的資料清單.md | 階段 E：EDM／手冊 PDF 原檔、新系列資料、資料庫匯出、上傳資料夾、導向規則；附「封存已有 vs 還要要」對照表 | 本資料夾（原檔） |
| （報告）../migration-2026-10-22/RUN_REPORT.md | 10/22 階段 A＋B 執行報告：封存重核與 zip、選型公式（在前端 JS）、產品只有英文、種子清單 2,597、10/22 快照 2,629 URL 與 10/9 比對結果（LQCOL-PLUS 擴寫、88 頁新增認證） | ../migration-2026-10-22 |
| （腳本）../migration-2026-10-09/build_seed_urls.py | 從封存 HTML 解析頁面連結建種子清單（10/9 漏抓的根本原因），順便輸出 form／iframe 清單 | ../migration-2026-10-09 |
| （腳本）../migration-2026-10-09/diff_archives.py | 兩次封存比對：新增、消失、文字有變、只有標記變 | ../migration-2026-10-09 |

## 其他相關專案（未複製）
- `E:\CascadeProjects\Aquasky Edge AEO On Cloudflare Project`：現行 Cloudflare Worker、監測腳本、所有 docs 原檔
- `E:\CascadeProjects\Aquasky-AIQA-Monitor`：AI 問答監測程式
- `E:\CascadeProjects\Aquasky Marketing Moniter`：行銷監測報表

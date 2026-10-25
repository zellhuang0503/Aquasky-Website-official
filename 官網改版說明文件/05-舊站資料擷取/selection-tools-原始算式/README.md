# 選型工具（Selection Tools）原始算式 — 來源與比對

整理日期：2026-10-25。目的：新站重做三個計算器（sel_unit_ps／sel_unit_vsd／sel_unit_thermal）前，確認「照舊站 JS 算」是不是就等於「照客戶的算式算」。

## 結論（先看這段）

1. **可以照舊站 JS 做。** 客戶 2022-04-13 寄來的正式算式文件（`SELECTION TOOL 計算式列表.docx`，本資料夾）跟舊站程式比對，三種系統、BAR／PSI 六條路徑裡 **五條完全相同**。
2. **Thermal 的 PSI 預充壓 `(Operating Pressure + 0.1) × 0.65` 不是 bug**，是客戶文件寫的；RUN_REPORT §A3 的「看起來是舊站的 bug」可以撤回。
3. **唯一不同的一條：Pressure Switch 的 PSI 預充壓。** 客戶文件寫 `Cut-in − 2`，舊站程式寫 `Cut-in − 2.8`（工程師大概用 0.2 bar × 14.5 ≈ 2.9 換算）。差 0.8 psi。要問 Tiffany 要哪一個；新站先照客戶文件（−2），在程式裡留一行註解。
4. 「算出容積 → 推薦哪個型號」的對照表在 2020 的 Excel（Drive `Selection Tool-20200923.xlsx`），規則＝「挑容積 ≥ 算出值的最小型號」，Cut-in／Set pressure 高的推 MEGA 系列；Thermal 的型號對照客戶沒給過文件，用同一規則套 THERMAL-PLUS 型號清單即可（新站做好請 Tiffany 核）。

## 來源

| 來源 | 日期 | 在哪 | 內容 |
| --- | --- | --- | --- |
| `SELECTION TOOL 計算式列表.docx` | 2022-04-13，Gill Hsu（溢康）寄給黃總監，主旨「Re: SELECTION TOOL頁面更新」 | 本資料夾（從 Gmail 原始郵件抽出）；Gmail thread `17ee7b6fb616a432` | 三種系統 × BAR／PSI 的正式算式。**這是最終版**（2022 年改版就是照這份做的，報價單 `梵亞網站程式新增報價單-Selection Tools改版-20220419` 寫「梵亞必須依據溢康所附之演算公式編寫」） |
| 六份 PRINT PDF 版面（PS BAR／PSI、VSD BAR／PSI、THERMAL BAR／PSI） | 2022-03～04 | 本資料夾（PDF 不進 Git，只在本機；Gmail 同一封信） | 選型結果列印 PDF 的版面，Minimum／Ideal／Proper 三項 |
| `Selection Tool-20200923.xlsx`、`Tank Sizing pumplus mega-20200619.xlsx` | 2020-06～09 | Google Drive 資料夾「Selection Tools」（id `1HhQRTjzGGj35L-22PxvC4AN6PKbAM9cX`）與 `1Cgh_rP3jf6ZAwnvuFY-SfSCKb0md64ZO` | 2020 第一版：PS 與 VSD 的算式、**容積→型號對照表**、MEGA 門檻 |
| 2020-12-23 Gill「Seletion Tool網頁調整」 | 2020-12 | Gmail thread `1768d4593de662e5` | 加 BAR／PSI 選單、即時顯示、建議預充壓文字、轉出 PDF 的需求來源 |
| 舊站三頁 inline JS | 2026-10-22 補抓 | `migration-2026-10-22/RUN_REPORT.md` §A3 | 舊站實際跑的程式 |

## 算式比對（客戶文件 vs 舊站 JS）

| 系統 | 單位 | 容積（Proper Tank Size） | 建議預充壓 | 客戶文件 | 舊站 JS | 一致？ |
| --- | --- | --- | --- | --- | --- | --- |
| Pressure Switch | BAR | AF = (cut_out − cut_in) / (cut_out + 1)；Total = 運轉分鐘 × 每分鐘公升；Size = Total / AF | cut_in − 0.2 | 「計算式維持舊版」 | 同 | ✓ |
| Pressure Switch | PSI | 先 ÷14.5 換成 bar 再套上式 | **cut_in − 2** | 「計算式維持舊版」＋ −2 | **cut_in − 2.8** | ✗ 差 0.8 psi |
| VSD／VFD | BAR | Size = water_flow / 36（36 固定） | (set + 0.1) × 0.65 | 同 | 同 | ✓ |
| VSD／VFD | PSI | Size = water_flow / 36 | (set + 1.5) × 0.65 | 同 | 同 | ✓ |
| Thermal | BAR | Size = total_water_volume × 0.044（0.044 固定） | operating − 0.2 | 同 | 同 | ✓ |
| Thermal | PSI | Size = total_water_volume × 0.044 | **(operating + 0.1) × 0.65** | 同 | 同 | ✓（不是 bug） |

防呆（舊站 JS，客戶文件沒寫，照舊）：PS 的 cut_out ≤ cut_in 時自動改 cut_in + 1；VSD 的 water_flow 與 set_pressure < 1 視為 1。

## 容積 → 型號（2020 Excel「推薦條件」）

規則：算出的 C 落在哪一格就推薦那一格的型號（＝容積 ≥ C 的最小型號）。Cut-in < 9 bar 推 APT（PUMPLUS），≥ 9 推 MEGA；VSD 的 Set pressure ≥ 8.5 bar／≥ 120 psi 推 MEGA（2022 文件）。

| C（公升） | APT | MEGA |
| --- | --- | --- |
| 0.1～1.3 | APT-1.3 | — |
| 1.4～3 | APT-3 | — |
| 4～8 | APT-8 | MEGA-8 |
| 9～12 | APT-12 | MEGA-12 |
| 13～18 | APT-18 | MEGA-18 |
| 19～24 | APT-24 | MEGA-24 |
| 25～40 | APT-40 | MEGA-40 |
| 41～60 | APT-60 | MEGA-60 |
| 61～80 | APT-80 | MEGA-80 |
| 81～100 | APT-100 | MEGA-100 |
| 101～120 | APT-120 | MEGA-120 |
| 121～130 | APT-130 | MEGA-130 |
| 131～160 | APT-160 | MEGA-160 |
| 161～200 | APT-200 | MEGA-200 |
| 201～240 | APT-240 | MEGA-240 |
| 241～300 | APT-300 | MEGA-300 |
| 301～450 | APT-450 | MEGA-450 |
| > 450 | 顯示紅字「Select multiple tanks with a total volume of at least ___ L」 | 同 |

Thermal 沒有對照表：用同一規則套 THERMAL-PLUS 型號（TP-3／8／18／24／40／60／80／100…依 `site/src/data/products/thermal-plus.json`），超過最大型號也顯示「多桶」紅字。**要請 Tiffany 核。**

## 要問 Tiffany 的

1. Pressure Switch PSI 的建議預充壓：`Cut-in − 2`（2022 文件）還是 `Cut-in − 2.8`（舊站程式）？
2. Thermal 的型號對照是否就是「容積 ≥ 算出值的最小 TP 型號」？
3. 列印 PDF 的 Minimum／Ideal／Proper 三個值怎麼定義（2022 報價單提到，但算式文件沒寫）；新站是否仍要「轉成 PDF」與「選型結果轉詢價」功能（舊站是伺服器產 PDF，新站要另做）。

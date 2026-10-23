# translation／六語系翻譯工作區

建立：2026-10-23。黃老闆決定 LQCOL-PLUS 六語系翻譯由梵亞用 AI 出初稿，客戶審稿後定稿。

## 資料夾

| 路徑 | 內容 | 誰產生 |
| --- | --- | --- |
| `sources/` | 從 10/22 封存抽出的六語系頁面文字對照檔（每頁一個 `.md`，六語系各一節，每行 `[元素] 文字`） | 本機跑 `migration-2026-10-09/extract_i18n_text.py` |
| `glossary/` | 術語表：舊站各語系的既有用語，附來源頁（`glossary.md`／`glossary.json`）；同一字串多種譯法的清單（`inconsistencies.md`）；非英文頁仍是英文的字串（`still-english.md`） | 本機跑 `translation/build_glossary.py` |
| `lqcol-plus/` | LQCOL-PLUS 譯稿：`LQCOL-PLUS.{zh,es,fr,ru,ar}.md` 每區塊附英文對照（75 區塊 × 5 語系）、`do-not-translate.md` 禁譯清單、`check_lqcol.py` 一致性檢查 | 梵亞 AI 初稿（2026-10-23），待客戶各語系審稿人 |

## 進度（2026-10-23）

- ① 抽取六語系既有文字 → 完成（`sources/`，27 頁）。
- ② 術語表＋LQCOL-PLUS 五語系 AI 初稿 → 完成，`check_lqcol.py` 375 個區塊全數通過（數字、型號、單位、禁譯詞與英文一致）。
- ③ 送客戶各語系審稿人 → 待辦。要先向客戶要審稿人名單（見 TODO-改版待辦.md）。
- ④ 客戶改完回傳＝定稿；回傳後再跑一次 `check_lqcol.py`。

## 指令（都在 repo 根目錄跑，只讀本機檔案，不連網）

```powershell
python migration-2026-10-09\extract_i18n_text.py migration-2026-10-22 --out translation\sources
python translation\build_glossary.py
python translation\lqcol-plus\check_lqcol.py
```

## 術語表怎麼讀

- 英文頁與其他語系頁用「元素順序＋兩邊都一樣的字串（產品名、數字）」對齊，選單另用固定對照（舊站各語系選單多寡不同：中文多「關於溢康」「ESG產品」，西／法／俄把「LARGE SIZE DL TANK」拆成兩行）。
- **可信的列**：選單（li）、頁首標題（title／h1）、FAQ 問句、規格摘要（td 裡的「外殼：…」「出廠預存氣壓：…」）。
- **有雜訊的列**：GIGA-PLUS 規格表欄位標題（舊站把表頭拆成兩列，對齊會錯一格，例如 Box Width 對到「箱長」）、FAQ 頁的產品對照表。用這些列前先回 `sources/` 看原頁。
- 舊站本身的不一致（`inconsistencies.md`）：MEGA-PLUS 與 GIGA-PLUS 中文都叫「高壓泵浦壓力桶」；PRODUCT FEATURE 在 GIGA-PLUS 頁譯法與其他頁不同。新站翻譯時要挑一種。

## 譯稿檔格式

每個區塊三行：`### B編號 · 元素`、`EN: 原文`、`ZH: 譯文`（語系代碼大寫）。審稿人只改譯文那一行。`check_lqcol.py` 會檢查：五個檔的英文完全相同、沒有空譯文、數字多重集合一致、型號一致、禁譯詞逐字出現次數一致、數字＋單位組合一致、阿拉伯文用西方數字。

## 本機抽取指令（在 repo 根目錄）

```powershell
python migration-2026-10-09\extract_i18n_text.py migration-2026-10-22 --out translation\sources
```

預設抽 27 個頁面（首頁、九個系列頁、products、accessories、about、feature、certification、FAQ、contact、三個選型工具頁與入口頁、downloadpage、supreme、asme-ht、dl-ce、news、videos），每頁六語系。只讀封存檔，不連網。

## 規則

- 規格、數字、認證名稱、型號、單位、品牌名一律不翻、不動；翻完用程式比對原文與譯文的數字與型號完全相同。
- 譯稿附英文對照送審；客戶各語系審稿人改完回傳的版本才是定稿。
- 阿拉伯文另驗 RTL 版面。

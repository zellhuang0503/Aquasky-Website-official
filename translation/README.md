# translation／六語系翻譯工作區

建立：2026-10-23。黃老闆決定 LQCOL-PLUS 六語系翻譯由梵亞用 AI 出初稿，客戶審稿後定稿。

## 資料夾

| 路徑 | 內容 | 誰產生 |
| --- | --- | --- |
| `sources/` | 從 10/22 封存抽出的六語系頁面文字對照檔（每頁一個 `.md`，六語系各一節，每行 `[元素] 文字`） | 本機跑 `migration-2026-10-09/extract_i18n_text.py` |
| `glossary/` | 術語表：各語系的既有用語，附來源頁 | 雲端 Claude 依 `sources/` 整理 |
| `lqcol-plus/` | LQCOL-PLUS 六語系譯稿、英文對照、數字與型號一致性檢查結果 | 雲端 Claude |

## 本機抽取指令（在 repo 根目錄）

```powershell
python migration-2026-10-09\extract_i18n_text.py migration-2026-10-22 --out translation\sources
```

預設抽 27 個頁面（首頁、九個系列頁、products、accessories、about、feature、certification、FAQ、contact、三個選型工具頁與入口頁、downloadpage、supreme、asme-ht、dl-ce、news、videos），每頁六語系。只讀封存檔，不連網。

## 規則

- 規格、數字、認證名稱、型號、單位、品牌名一律不翻、不動；翻完用程式比對原文與譯文的數字與型號完全相同。
- 譯稿附英文對照送審；客戶各語系審稿人改完回傳的版本才是定稿。
- 阿拉伯文另驗 RTL 版面。

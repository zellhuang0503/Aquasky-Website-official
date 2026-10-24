# AI 維護規則（site/）

給任何修改這個網站的 AI agent（Claude、Codex…）。人看 README.md。

## 可以改

- 內容：`src/content/**/*.json`、`src/i18n/*.json`。
- 事實：`src/data/brand.json`、`src/data/products/*.json`——**只能依客戶提供或已核准的來源改**，在 commit 訊息寫來源（誰、哪天、哪份文件）。
- 版型與樣式：`src/components`、`src/layouts`、`src/pages`、`src/styles`，改完要跑完整檢查。

## 不要做

- 不要改網址。新頁的路徑要和舊站一樣（`/en/<舊路徑>`、`/zh/<舊路徑>`）；要改路徑先問。
- 不要在譯文裡改數字、型號、單位、材料代號、認證名稱（禁譯清單：`../translation/lqcol-plus/do-not-translate.md`）。
- 不要把 AI 譯稿標成 `approved`。只有客戶審過才改 `status`。
- 不要把封存的圖片／PDF commit 進 Git（`public/images`、`public/uploads`、`public/upfile` 已 ignore）。
- 不要 `wrangler deploy` 到正式網域，也不要 push，除非黃老闆在對話裡明說。

## 每次修改後一定要跑

```powershell
npm run build
npm run verify
npm run check
```

三個都過才算完成。verify 失敗時不要改 verify 讓它通過，要找原因。

然後用 Agent 工具呼叫專案審查官 `aquasky-site-reviewer`（`../.claude/agents/aquasky-site-reviewer.md`），告訴它這次審哪些路徑。報告寫「要先修 N 項」就修完再審一次；「可以交付」才 commit、才回報做完。新的檢查條件加進那個 agent 檔，不要只放在對話裡。

## 加一個新語系

1. `src/i18n/<lang>.json`（複製 en.json 改）。
2. 每個頁面的 `src/content/.../<lang>.json`。
3. `src/data/brand.json` 該語系 `live: true`。
4. `src/lib/i18n.ts` 的 `dicts` 加上新語系。
5. 阿拉伯文（ar）頁面 `dir="rtl"` 會自動帶出，要另外用手機和桌面看一遍。

# 提問語言與 AI 引用來源：原始資料查核

查核日期：2026-09-24。範圍：公開官方說明與原始研究；未執行付費模型實驗、未讀寫監測中心。本文件只支持對外官網的語言策略判斷。

## 可支持的結論

提問語言可能改變檢索與引用來源分布，值得將繁體中文與英文分開評估；但不能把它說成所有 AI 都遵循「中文問一定先查中文、英文問一定先查英文」的固定規則。必須分清楚使用者提問、實際搜尋字串、來源網頁與最後回答四個層次的語言。

## 來源與證據邊界

### 1. OpenAI：搜尋字串可被改寫

[Searching the web with ChatGPT](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt)，章節 Information shared with search providers，說明 ChatGPT 搜尋通常會把提問改寫成一個或多個搜尋字串，並可能在查看第一批结果後進一步搜尋；地點與已啟用的記憶也可能參與改寫。

- 能證明：使用者的原句不必等於真正的搜尋字串，觀察引用時須注意情境因素。
- 不能證明：官方未在這份文件承諾固定的來源語言優先順序，亦未給出繁中相對英文的引用比例。

### 2. Perplexity Search API：語言與國家是可分開設定的參數

[Search the Web API reference](https://docs.perplexity.ai/api-reference/search-post) 列出 `search_language_filter`（ISO 639-1 二字元語言代碼）及 `country`（ISO 3166-1 國家代碼）。同頁明確區分 Search API 的搜尋結果陣列，與 Sonar 的帶引用文字回答。

- 能證明：應用程式可以透過 API 明確設定語言篩選；國家與語言並非同一個控制項。
- 不能證明：一般 Perplexity 網站會依提問語言自動設定該參數，或 Sonar／ChatGPT 使用完全相同預設。
- 字形限制：二字元 `zh` 不能直接表達 `zh-Hant`；不能據此承諾只取繁體中文、排除簡體中文。

### 3. 原始研究：受測檢索器偏好提問與文件同語言

Park et al., 2026, [Enhancing Multilingual RAG Systems with Debiased Language Preference-Guided Query Fusion](https://aclanthology.org/2026.findings-acl.1353/)，Findings of ACL。作者指出，英文資源分布會混淆語言偏好的測量；調整這些因素後，其實驗中的檢索器顯示提問與文件同語言的偏好。

- 能證明：語言是多語言檢索中真實且值得控制的變因；不能把英文表現較好一概歸因於 AI 天生偏愛英文。
- 不能證明：這是目前 ChatGPT、Gemini、Perplexity 消費者服務對 AQUASKY 的實測結果，或專門驗證了繁體中文。

### 4. 原始研究：重排序也可能有語言偏好

Wang et al., 2026, [All Languages Matter: Understanding and Mitigating Language Bias in Multilingual RAG](https://aclanthology.org/2026.acl-long.338/)，ACL。研究在其受測的多語言 RAG 重排序流程觀察到偏向英文及提問原語言的情況。

- 能證明：取得候選資料之後，重排序仍可能影響哪些語言的資料進入回答。
- 不能證明：所有 AI 的封閉商業搜尋系統均採用相同重排序器或相同比例。

### 5. Google：查詢語言是重要訊號，但結果可以跨語言

[How Google knows what language to show in search results](https://support.google.com/websearch/answer/13511324?hl=en) 明確說查詢語言是重要因素，同時考慮內容是否有用、語言設定、裝置與所在地；結果可以包含不同於查詢語言的內容。

- 能證明：Google 網頁搜尋的來源語言不是完全隨機，也不是只限提問語言。
- 不能證明：所有 AI 平台均沿用 Google 的機制，或繁中題目會排除簡體中文。

## 對 AQUASKY 的判斷（推論，尚非實測成效）

- 繁中測試不能單獨代表英文採購市場的被發現機會；英文亦不能取代繁中測試。
- 應以意思相同、採購條件相同的雙語題組比較；固定平台、模型／模式、日期、地區及是否點名品牌，重複測量並分開報告。
- 至少記錄品牌提及、正確品牌辨識、官網引用、被引用頁面的實際語言；有來源清單不等於看見完整的檢索過程，不能據此斷言「先查哪種語言」。
- 官網應為目標市場提供足夠且一致的英文及繁中產品／合作內容，而不依賴 AI 一定會跨語言找到或正確翻譯另一版本。
- 本次沒有取得 AQUASKY 的雙語配對實驗，因此目前不能量化語言影響，也不能宣稱已找出既有誤答的原因。

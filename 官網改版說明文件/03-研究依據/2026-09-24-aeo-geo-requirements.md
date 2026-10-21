# AquaSky：AEO／GEO 與 SEO 的實作要求

查證日期：2026-09-24。本文只研究英文官方資料，不包含會議 dashboard 內容判讀，也未登入 AquaSky Search Console、Cloudflare 或分析帳號。延續同目錄 `2026-09-24-framework-options.md`，不重複框架比較。

## 架構判斷

仍建議「Astro 預先產生公開 HTML＋Git 內容檔＋Cloudflare 靜態託管＋必要 Worker API」。這是針對內容官網、無 CMS 與 AI agent 維護需求的工程選擇，**不是 Astro 擁有搜尋引擎偏好的排名加分**。AEO／GEO 應落在可信內容、可讀取的頁面、可追蹤的實際曝光與商機；換框架本身不能保證被 AI 引用。

以下「建議」是本案設計推論；官方可核對的行為另附來源。

## 八項可執行結論

1. **以既有 SEO 為基礎建置 AI 可讀內容。** Google 的生成式搜尋仍依賴搜尋索引及品質系統；頁面必須能被收錄並允許摘要。新版官方指南沒有指定某種網站框架、特殊 schema 或固定文章長度。建議將型號、規格、適用情境與限制直接輸出到產品 HTML，並保有清楚的內部連結；無須等待前端 JavaScript 才取得主要文字。[Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

2. **讓 AI agent 編輯受控的內容來源。** 建議產品規格、單位、認證來源、有效日期、翻譯對照與審核人有固定欄位；正文、規格表及 JSON-LD 由相同資料產生。自動驗證只能檢查欄位格式與一致性，不能取代技術人員確認效能或認證真實性。Google 要求結構化資料符合頁面實際可見內容，不能標示虛構評價或誤導資訊；格式正確亦不保證 rich result。[Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

3. **內容投資放在客戶真的需要的證據。** 建議優先做有原始資料的產品選擇比較、使用限制、技術問題與案例，附適用條件及來源；FAQ 是閱讀設計選項，不是每頁都要堆問答。Google 明確反對為操縱搜尋而大量製造查詢變體頁；`llms.txt` 對 Google Search 不帶來特殊可見性效果。[Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

4. **分開管理「搜尋」與「訓練」機器人。** OpenAI 的 OAI-SearchBot 用於搜尋，GPTBot 用於可能的模型訓練；可以允許前者、拒絕後者。ChatGPT-User 是使用者觸發的讀取，不能把它等同自動搜尋爬蟲。建議依商業目標分開設定 robots.txt 與存取規則，再確認公開 IP 範圍與實際回應，不能只依 User-Agent 字串宣稱來源已驗證。[OpenAI Crawlers](https://developers.openai.com/api/docs/bots)

5. **Cloudflare 上線驗收必須包含爬蟲存取。** AI Crawl Control 可記錄允許、失敗請求及 referral，部分 referral 指標限付費方案；其網站範圍是 Cloudflare zone。建議分 URL 驗收 CDN、WAF、robots.txt 與頁面狀態碼，而不是只確認一般瀏覽器能開啟。WAF 等上游規則可能影響流量，但未必完整出現在 AI Crawl Control 報表。[Cloudflare analytics](https://developers.cloudflare.com/ai-crawl-control/features/analyze-ai-traffic/)、[WAF interaction](https://developers.cloudflare.com/ai-crawl-control/configuration/ai-crawl-control-with-waf/)

6. **核對 Google 新的生成式搜尋開關。** 官方稱截至 2026-08-31 已向全球網站推出 Search generative AI control，預設允許，子資源可能繼承上層設定。它與模型訓練控制不同。建議遷移前後都記錄正式網域與相關 URL-prefix property 的實際值；本次未登入，不能推定 AquaSky 的設定。[Search generative AI control](https://support.google.com/webmasters/answer/16908024)

7. **量測要採新版官方定義。** Google 現有 Generative AI performance report 可看 AI Overviews／AI Mode 的曝光，按頁面、國家、日期、裝置觀察；頁面數據通常歸到 canonical URL，日期使用太平洋時間。文件說明曝光不足可能看不到報表。這不是已驗證有各 AI 平台完整點擊或成交數的報表。建議接資料時先驗證帳號畫面、匯出欄位與可用歷史期間，不預設 API 已支援。[Generative AI performance report](https://support.google.com/webmasters/answer/16984139)

8. **商業成效以真人與有效詢問判斷。** OpenAI 官方說 ChatGPT referral URL 帶有 `utm_source=chatgpt.com`。建議保留來源資訊直到表單成功提交，並以實際送達、排除垃圾／重複資料及業務確認來定義有效詢問；不要只用「按下送出」計成功。歸因資訊可能遺失或被轉傳，宜保留「來源未知」，不能強迫全部歸因。[OpenAI publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)

## 監測資料的四層證據

以下是建議的分析定義，避免把不同資料混成單一「AI 成效」。

| 層次 | 能回答的問題 | 所需證據 | 不能推出的結論 |
| --- | --- | --- | --- |
| 爬蟲活動 | 哪個服務請求哪些頁面，是否成功？ | 經辨識的 crawler、URL、日期、狀態碼、資料來源 | 不能證明使用者看見引用或有人進站 |
| AI 曝光／引用 | 是否在指定觀測中出現品牌或連結？ | 官方曝光報表；或記錄平台、問題、語系、日期與引用 URL 的回答快照 | 一次回答不能代表全球排名或穩定引用率 |
| 真人來源流量 | 有多少可識別為 AI 來源的網站造訪？ | Referral／UTM、排除機器人的分析資料 | 不是全部 AI 曝光，亦不是有效商機 |
| 有效詢問 | 來訪是否帶來可跟進需求？ | 成功送達的表單、業務資格判定、去重後詢問紀錄 | 不能單靠 crawler 數量或頁面點擊推算 |

Cloudflare 的官方資料亦把 crawler requests 與 referrals 分開呈現；本表的引用／詢問驗證是本案建議，不是聲稱 Cloudflare 已提供整套成交分析。[Cloudflare analytics](https://developers.cloudflare.com/ai-crawl-control/features/analyze-ai-traffic/)

## 持續決策與驗收建議

- 每份觀測保存期間、取得時間、來源、指標定義、缺漏、相關 URL 與改版版本。不要把「未提供」填成 0；不同時區或不同期間先對齊再比較。
- 每次修改寫下假設，例如「產品規格缺少單位，可能降低理解與詢問品質」，連結佐證、預期改善指標及回復版本；缺乏資料時標「目前資料不足」。
- 發布前：內容事實確認、可見正文與 JSON-LD 一致、舊 URL 對應、canonical、語系、robots/noindex、連結與附件，以及實際表單送達。沿用框架研究的預覽與人工審查流程。
- 發布後：同時看既有自然搜尋、重要舊 URL、AI 曝光／引用、真人 referral 與有效詢問。以多次觀測判斷趨勢，並記錄其他活動與季節因素；單純前後差異不能證明改版造成成效。
- 不承諾收錄、引用次數、排名或商機提升幅度；沒有 CMS 也不妨礙以上流程，但內容與事實仍需有人負責確認。

## 官方文件時效差異

較舊的 Google `AI features and your website` 頁仍說 AI 資料合併在 Web performance。本文改以較新的 AI optimization guide 及其連結的 Search Console help 為準，將「生成式搜尋曝光報表」納入待驗證資料來源；不擅自擴張成 AI 分項點擊／CTR 報表。新報表說明本身亦同時保留全球推出與部分資源尚無報表的文字，因此仍需核對 AquaSky 實際帳號，而非僅憑文件認定已可取得資料。

本次僅新增研究文件；未修改正式站、爬蟲控制、Search Console 設定、dashboard、部署或任何外部資料。

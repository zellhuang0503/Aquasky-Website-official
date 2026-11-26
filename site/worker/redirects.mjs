// 舊站 .php 網址 → 新站網址的 301 轉址表與查詢函式。
// 純 ES module：沒有 npm 依賴、沒有 Node API，給 Cloudflare Worker 直接 import。
//
// 用法：
//   import { legacyRedirect } from './worker/redirects.mjs';
//   const to = legacyRedirect(new URL(request.url));   // 回傳新路徑字串，或 null（不是舊網址、或要讓它 404）
//   if (to) return Response.redirect(new URL(to, request.url), 301);
//
// 規則摘要（細節見 redirectTable）：
//   1. 語系：路徑第一段若是語系（/en/…、/zh/…、/ar-XA/…）以它為準；否則看 ?lang=；都沒有或不認得 → en。
//      lang=en|zh|es|fr|ru 照用，ar-XA → ar。新站網址一律 /<lang>/<path>。
//   2. index.php → /<lang>
//   3. <name>.php → /<lang>/<新站路徑>（redirectTable.pages；.php 檔名不分大小寫，輸出用新站真正的大小寫，例如 faq.php → /FAQ）
//   4. 沒有語系前綴的乾淨路徑 /LQCOL-PLUS、/certification → /en/<新站路徑>。
//      注意：沒有 .php 的路徑只有列在 wrangler.jsonc run_worker_first 的才會進 Worker（目前就這兩條）；
//      函式本身也能修 /faq、/en/faq 這類大小寫，但線上不會進來，不要以此為準。
//   5. news-detail.php?sid=N → 該語系那篇新聞；該語系沒有 → 該語系新聞列表 /<lang>/news/INDUSTRY
//      （注意：舊站 sid 是「每個語系各自一套編號」，zh 的 sid=161 與 en 的 sid=161 是不同文章，
//        所以不能跨語系退到 en 那篇，只能退到列表。）
//   6. videos-detail.php?sid=N → 該語系影片明細；沒有 → /<lang>/videos
//   7. products-det.php?sid=N → /en/products-det/<系列>/<型號>（只有英文有明細）；不認得的 sid → /en/products
//   8. certification_page.php?sid=4|6|7|8|9|10 → /<lang>/certification-page/<slug>；其他 sid → /<lang>/certification
//   9. accessories-det.php（封存裡沒出現過這種網址，保險起見）→ /en/accessories
//  10. 選型工具的後端／列印頁（sizing.php、select_api*.php、printpdf*.php…）→ /<lang>/sel_tools；sel_contact.php → /<lang>/contact
//  11. recode.php（驗證碼圖）→ null，讓它 404
//  12. 其餘任何 .php（含子目錄裡的）→ /<lang>（兜底，lang 不明就是 /en）
//
// 新聞／影片 sid 對照表由 src/content/news/<lang>/<CATEGORY>/*.json 掃出來（slug 結尾就是舊 sid），
// 每個目標都在 dist/ 驗證過真的存在。新站目前只建了 en、zh；es/fr/ru/ar 的頁還沒做，
// 等做好前若要先把這些語系全部導到 en，把 SUPPORTED_LANGS 改成 ['en', 'zh'] 即可。

export const SUPPORTED_LANGS = ['en', 'zh', 'es', 'fr', 'ru', 'ar'];
const LANG_ALIASES = { 'ar-xa': 'ar', 'zh-tw': 'zh', 'zh-hant': 'zh', 'zh-hans': 'zh' };
const DEFAULT_LANG = 'en';

export const redirectTable = {
  // 首頁
  home: { php: 'index.php', to: '/<lang>' },

  // <name>.php（鍵一律小寫）→ /<lang> + 值。也用於沒有語系前綴的乾淨路徑（/LQCOL-PLUS → /en/LQCOL-PLUS）。
  pages: {
    'pumplus': '/PUMPLUS',
    'mega-plus': '/MEGA-PLUS',
    'giga-plus': '/GIGA-PLUS',
    'ro-plus': '/RO-PLUS',
    'thermal-plus': '/THERMAL-PLUS',
    'premium-plus': '/PREMIUM-PLUS',
    'solar-plus': '/SOLAR-PLUS',
    'hydro-plus': '/HYDRO-PLUS',
    'lqcol-plus': '/LQCOL-PLUS',
    'products': '/products',
    'certification': '/certification',
    'downloadpage': '/downloadpage',
    'dl-ce': '/dl-ce',
    'asme-ht': '/asme-ht',
    'sel_tools': '/sel_tools',
    'sel_unit_ps': '/sel_unit_ps',
    'sel_unit_vsd': '/sel_unit_vsd',
    'sel_unit_thermal': '/sel_unit_thermal',
    'contact': '/contact',
    'accessories': '/accessories',
    'about': '/about',
    'feature': '/feature',
    'faq': '/FAQ',
    'videos': '/videos',
    'supreme': '/supreme',
    'news': '/news/INDUSTRY',
  },

  // 選型工具的後端 API／列印頁 → /<lang>/sel_tools
  selectionTools: ['sizing.php', 'sizing_bar.php', 'select_api2.php', 'select_api_vsd.php', 'select_api_thermal.php', 'printpdf.php', 'printpdfvsd.php', 'printpdfthermal.php'],
  selContact: { php: 'sel_contact.php', to: '/<lang>/contact' },

  // 驗證碼圖：不轉址，回 null 讓它 404
  notFound: ['recode.php'],

  // certification_page.php?sid=N → /<lang>/certification-page/<slug>（來源：src/data/pages/certification-page-*.json 的 source.url）
  certificationBySid: {
    4: '/certification-page/iso-9001-eurocert',
    6: '/certification-page/kc-korea',
    7: '/certification-page/acs-france',
    8: '/certification-page/wras-uk',
    9: '/certification-page/watermark-australia',
    10: '/certification-page/psb-singapore',
  },
  certificationFallback: '/certification',

  // products-det.php?sid=N&pdcl=24 → /en/products-det/<系列>/<型號>（只有英文有明細）
  // 來源：封存新聞正文（PREMIUM-PLUS 介紹文）裡的連結文字；其他系列舊站本來就用乾淨網址 /en/products-det/<系列>/<型號>，沒有 sid 形式。
  productsBySid: {
    107: '/products-det/premium-plus/ROT-4SS',
    108: '/products-det/premium-plus/ROT-6SS',
    109: '/products-det/premium-plus/APT-18SS',
    110: '/products-det/premium-plus/APT-24SS',
    111: '/products-det/premium-plus/APT-18HSS',
    112: '/products-det/premium-plus/APT-24HSS',
    119: '/products-det/premium-plus/APT-8SS',
  },
  productsFallback: '/products',

  // accessories-det.php：封存裡沒有這種網址；有的話一律回配件列表
  accessoriesDetFallback: '/accessories',

  // news-detail.php?sid=N → { lang: 新路徑 }。sid 每個語系各自一套編號，只查該語系；沒有就退到 newsFallback。
  newsFallback: '/news/INDUSTRY',
  newsBySid: {
  1: { en: "/news-detail/EXHIBITIONS/2016-ahr-expo-orlando-1" },
  2: { en: "/news-detail/EXHIBITIONS/wqa-convention-exposition-2016-2" },
  3: { en: "/news-detail/EXHIBITIONS/mce-exhibition-2016-3" },
  4: { en: "/news-detail/EXHIBITIONS/asean-sustainable-energy-week-2016-4" },
  5: { en: "/news-detail/EXHIBITIONS/ngwa-2016-groundwater-week-5" },
  6: { en: "/news-detail/INDUSTRY/the-shield-coating-tank-6" },
  7: { en: "/news-detail/EXHIBITIONS/las-vegas-convention-center-las-vegas-usa-7" },
  8: { en: "/news-detail/EXHIBITIONS/wqa-aquatech-usa-8" },
  9: { en: "/news-detail/INDUSTRY/nitrosamines-free-technology-9" },
  10: { en: "/news-detail/INDUSTRY/pumplus-series-certified-by-nsf-10" },
  11: { en: "/news-detail/INDUSTRY/obtained-the-kc-certificate-for-the-pressure-tanks-11" },
  12: { en: "/news-detail/EXHIBITIONS/2018-ahr-exhibition-12" },
  13: { en: "/news-detail/EXHIBITIONS/aquaskysuccessful-ahr-2018-13" },
  14: { en: "/news-detail/EXHIBITIONS/aquaskymce-mostra-convegno-expocomfort-14" },
  15: { en: "/news-detail/INDUSTRY/aquasky2018-pumplus-catalog-available-for-download-now-15" },
  16: { en: "/news-detail/INDUSTRY/how-to-select-pressure-tank-sizeaquasky-pumplus-16" },
  17: { en: "/news-detail/INDUSTRY/how-to-set-a-correct-air-pressure-inside-your-pressure-tankaquasky-pumplus-17" },
  18: { en: "/news-detail/INDUSTRY/nsf-structure-test-passedaquasky-is-the-world-leader-in-pressure-tank-safety-18" },
  19: { en: "/news-detail/INDUSTRY/aquaskys-pressure-tank-is-certified-by-nsf-international-19" },
  20: { en: "/news-detail/INDUSTRY/how-does-a-pressure-tank-work-inside-a-pump-system-20" },
  21: { en: "/news-detail/INDUSTRY/what-is-a-pressure-tank-aquasky-pumplus-pressure-tank-21" },
  22: { en: "/news-detail/EXHIBITIONS/the-big-5-international-building-construction-show-2018-in-dubai-22" },
  23: { en: "/news-detail/EXHIBITIONS/new-product-shows-in-ngwa-2018-groundwater-week-23" },
  24: { en: "/news-detail/INDUSTRY/aquasky-new-product-apt-450-launched-24" },
  25: { en: "/news-detail/INDUSTRY/benefits-of-potable-water-pressure-tank-filling-with-nitrogen-pre-charge-25" },
  26: { en: "/news-detail/EXHIBITIONS/aquasky-is-going-to-ahr-expo-2019-26" },
  27: { en: "/news-detail/INDUSTRY/how-to-know-your-reverse-osmosis-tank-is-not-functioning-27" },
  28: { en: "/news-detail/EXHIBITIONS/aquasky-successful-ahr-expo-2019-28" },
  29: { en: "/news-detail/EXHIBITIONS/ish-trade-fair-in-frankfurt-29" },
  30: { en: "/news-detail/EXHIBITIONS/wqa-convention-exposition-pressure-tanks-in-aquasky-30" },
  31: { en: "/news-detail/INDUSTRY/contact-with-aquasky-in-australia-ozwater-exhibition-31" },
  32: { en: "/news-detail/INDUSTRY/how-can-you-check-if-the-internal-rubber-diaphragm-of-an-expansion-vessel-is-broken-32" },
  33: { en: "/news-detail/INDUSTRY/about-california-proposition-65-prop-65-aquasky-33" },
  34: { en: "/news-detail/INDUSTRY/aquasky-new-product-packaging-released-34" },
  35: { en: "/news-detail/EXHIBITIONS/aquatech-amsterdam-exhibitionaquasky-pumplus-pressure-tank-35" },
  36: { en: "/news-detail/EXHIBITIONS/aquasky-successful-aquatech-amsterdam-2019-36" },
  37: { en: "/news-detail/EXHIBITIONS/the-big-5-international-building-construction-show-2019-in-dubai-37" },
  38: { en: "/news-detail/EXHIBITIONS/aqausky-attending-ngwa-2019-groundwater-week-38" },
  39: { en: "/news-detail/EXHIBITIONS/successful-ngwa-2019-groundwater-week-39" },
  40: { en: "/news-detail/INDUSTRY/getting-ce-certified-aquaksky-40" },
  41: { en: "/news-detail/INDUSTRY/aquasky-getting-acs-sanitary-conformity-certified-attestation-de-conformit-sanitaire-in-french-41" },
  42: { en: "/news-detail/EXHIBITIONS/ahr-expo-2020aquasky-42" },
  43: { en: "/news-detail/INDUSTRY/aquasky-pressure-tank-100l-design-change-notice-43" },
  44: { en: "/news-detail/INDUSTRY/aquasky-pumplus-new-product-apt-100h-44" },
  45: { en: "/news-detail/INDUSTRY/how-big-a-pressure-tank-do-i-need-aquasky-45" },
  46: { en: "/news-detail/INDUSTRY/what-is-a-pressure-tank-used-for-aquasky-46" },
  47: { en: "/news-detail/INDUSTRY/how-long-does-a-good-pressure-tank-last-aquasky-47" },
  48: { en: "/news-detail/INDUSTRY/is-a-bigger-water-pressure-tank-better-aquasky-tells-you-48" },
  49: { en: "/news-detail/INDUSTRY/will-a-bigger-pressure-tank-increase-water-pressure-aquasky-pressure-tank-49" },
  50: { en: "/news-detail/INDUSTRY/is-a-pressure-tank-necessary-aquasky-pressure-tank-50" },
  51: { en: "/news-detail/INDUSTRY/aquasky-has-passed-peds-annual-audit-51" },
  52: { en: "/news-detail/INDUSTRY/getting-watermark-certified-australia-new-zealandaquasky-52" },
  53: { en: "/news-detail/INDUSTRY/aquasky-new-online-selection-tool-is-ready-53" },
  54: { en: "/news-detail/INDUSTRY/why-aquasky-only-fills-pure-nitrogen-in-the-pressure-tankpressure-tank-aquasky-54" },
  55: { en: "/news-detail/INDUSTRY/the-water-storage-zoom-secret-of-the-diaphragm-pressure-tanksaquasky-55" },
  56: { en: "/news-detail/INDUSTRY/covid-19-news-aquasky-56" },
  57: { en: "/news-detail/INDUSTRY/why-do-we-need-a-pressure-tank-aquasky-57" },
  58: { en: "/news-detail/INDUSTRY/shipping-trends-newsaquasky-58" },
  59: { en: "/news-detail/INDUSTRY/how-do-you-check-your-pressure-tanks-air-pressure-aquasky-59" },
  60: { en: "/news-detail/INDUSTRY/what-is-the-pressure-equipment-directive-ped-aquasky-60" },
  61: { en: "/news-detail/INDUSTRY/covid-19-vaccine-injection-rate-and-business-travel-openingaquasky-61" },
  62: { en: "/news-detail/INDUSTRY/theory-of-pressure-controlleraquasky-62" },
  63: { en: "/news-detail/INDUSTRY/international-commodities-soaring-steel-paper-pulp-plastic-rubber-aquasky-63" },
  64: { en: "/news-detail/INDUSTRY/rubber-diaphragm-elongation-aquasky-64" },
  65: { en: "/news-detail/INDUSTRY/about-iapmo-rtaquasky-65" },
  66: { en: "/news-detail/INDUSTRY/aquasky-has-passed-nsf-58s-annual-audit-66" },
  67: { en: "/news-detail/INDUSTRY/aquasky-has-successfully-passed-the-quality-management-systems-iso-90012015-annual-audit-67" },
  68: { en: "/news-detail/INDUSTRY/vaccination-rate-in-different-countries-part-ii-aquasky-68" },
  69: { en: "/news-detail/INDUSTRY/the-impact-of-the-2021-suez-canal-obstruction-on-shippingaquasky-69" },
  71: { en: "/news-detail/INDUSTRY/the-difference-between-bladder-and-diaphragm-pressure-tanksaquasky-71" },
  72: { en: "/news-detail/INDUSTRY/lithuania-presents-vaccine-to-taiwan-aquasky-72" },
  73: { en: "/news-detail/INDUSTRY/price-trend-of-raw-materials-steel-copper-and-paper-aquasky-73" },
  74: { en: "/news-detail/INDUSTRY/about-nsf-international-aquasky-74" },
  75: { en: "/news-detail/INDUSTRY/how-does-pp-liner-work-in-a-diaphragm-pressure-tank-aquasky-75" },
  76: { en: "/news-detail/INDUSTRY/simple-vaccine-principle-why-does-the-vaccine-need-two-doses-to-have-complete-protection-aquasky-76" },
  77: { en: "/news-detail/INDUSTRY/the-difference-between-pressure-controller-and-float-aquasky-77" },
  78: { en: "/news-detail/INDUSTRY/aquasky-pressure-tank-80l-design-change-notice-aquasky-78" },
  79: { en: "/news-detail/INDUSTRY/can-the-air-pre-charge-pressure-of-the-tank-be-modified-aquasky-79" },
  80: { en: "/news-detail/INDUSTRY/is-a-variable-frequency-system-water-pump-better-than-a-pressure-tank-operation-aquasky-80" },
  81: { en: "/news-detail/INDUSTRY/aquasky-has-passed-watermark-annual-audit-aquasky-81" },
  82: { en: "/news-detail/INDUSTRY/stainless-steel-connector-water-tank-aquasky-82" },
  83: { en: "/news-detail/INDUSTRY/reasons-for-the-tokyo-olympics-not-to-be-put-off-and-follow-up-development-aquasky-83" },
  84: { en: "/news-detail/INDUSTRY/what-is-a-diaphragm-pressure-tank-aquasky-84" },
  85: { en: "/news-detail/INDUSTRY/why-the-iron-pressure-tank-does-not-get-rusty-and-pollute-the-water-inside-the-tank-aquasky-85" },
  86: { en: "/news-detail/INDUSTRY/what-psi-should-the-pressure-tank-be-aquasky-86" },
  87: { en: "/news-detail/INDUSTRY/the-relationship-between-pressure-controller-and-pump-and-barrel-87" },
  88: { en: "/news-detail/INDUSTRY/2022-happy-new-year-aquasky-88" },
  89: { en: "/news-detail/INDUSTRY/is-it-better-to-have-a-larger-pressure-tank-aquasky-89" },
  90: { en: "/news-detail/EXHIBITIONS/the-2022-ahr-expo-will-take-place-on-jan-31-feb-2-2022-in-las-vegas-aquasky-90" },
  91: { en: "/news-detail/INDUSTRY/hydraulic-head-of-the-pump-and-the-relative-relationship-between-water-pressure-and-water-volumeaquasky-91" },
  92: { en: "/news-detail/INDUSTRY/happy-chinese-new-year-aquasky-92" },
  93: { en: "/news-detail/INDUSTRY/about-panama-canal-infrastructure-upgrade-aquasky-93" },
  94: { en: "/news-detail/INDUSTRY/the-unresolved-port-congestion-in-the-usa-aquasky-94" },
  95: { en: "/news-detail/INDUSTRY/what-size-well-pump-do-you-need-aquasky-95" },
  96: { en: "/news-detail/INDUSTRY/what-are-pressure-tank-and-expansion-tank-aquasky-96" },
  97: { en: "/news-detail/INDUSTRY/what-are-the-types-of-pressure-vessel-tanks-aquasky-97" },
  98: { en: "/news-detail/INDUSTRY/covax-vaccine-platform-program-aquasky-98" },
  99: { en: "/news-detail/INDUSTRY/how-to-properly-adjust-your-pressure-switch-aquasky-99" },
  100: { en: "/news-detail/INDUSTRY/what-is-water-thermal-expansion-aquasky-100" },
  101: { en: "/news-detail/INDUSTRY/australias-covid-19-lifting-lockdowns-aquasky-101" },
  102: { en: "/news-detail/INDUSTRY/frequency-introduction-aquasky-102" },
  103: { en: "/news-detail/INDUSTRY/the-situation-in-the-uk-after-the-covid-19-lockdownaquasky-103" },
  104: { en: "/news-detail/INDUSTRY/is-a-bigger-water-pressure-tank-better-aquasky-104" },
  105: { en: "/news-detail/INDUSTRY/simple-principle-of-water-pumpaquasky-105" },
  106: { en: "/news-detail/INDUSTRY/afghan-regime-transfer-and-current-situation-aquasky-106" },
  107: { en: "/news-detail/INDUSTRY/instructions-of-entry-restrictions-for-foreigners-to-taiwanaquasky-107" },
  108: { en: "/news-detail/INDUSTRY/why-you-should-care-about-pressure-tank-problems-aquasky-108" },
  109: { en: "/news-detail/EXHIBITIONS/mce-mostra-convegno-expocomfort-2022-aquasky-109" },
  110: { en: "/news-detail/INDUSTRY/what-you-can-do-to-prevent-excessive-cycling-on-your-water-pumpaquasky-110" },
  111: { en: "/news-detail/INDUSTRY/what-is-the-principle-of-a-reverse-osmosis-tank-aquasky-111" },
  112: { en: "/news-detail/INDUSTRY/aquasky-has-passed-iso-90012015-annual-audit-aquasky-112" },
  113: { en: "/news-detail/INDUSTRY/summer-holiday-notice-aquasky-113" },
  114: { en: "/news-detail/INDUSTRY/aquasky-has-passed-the-singapore-psb-certification-aquasky-114" },
  115: { en: "/news-detail/INDUSTRY/what-is-pressure-tank-do-in-a-water-system-aquasky-115" },
  116: { en: "/news-detail/INDUSTRY/how-do-i-change-the-pressure-setting-of-my-well-booster-system-aquasky-116" },
  117: { en: "/news-detail/INDUSTRY/what-is-the-difference-between-a-relief-valve-and-a-safety-valve-aquasky-117" },
  118: { en: "/news-detail/INDUSTRY/about-green-policy-green-economy-development-aquasky-118" },
  119: { en: "/news-detail/INDUSTRY/how-can-i-increase-my-water-pressure-at-home-aquasky-119" },
  120: { en: "/news-detail/INDUSTRY/2022-european-american-heat-waves-120" },
  121: { en: "/news-detail/INDUSTRY/taiwan-set-to-ditch-quarantine-restrictions-for-arrivals-aquasky-121" },
  122: { en: "/news-detail/INDUSTRY/aquasky-has-passed-kc-annual-audit-aquasky-122" },
  123: { en: "/news-detail/INDUSTRY/aquasky-has-passed-peds-annual-audit-aquasky-123" },
  124: { en: "/news-detail/INDUSTRY/droughts-and-water-shortages-in-2022-aquasky-124" },
  125: { en: "/news-detail/INDUSTRY/introducing-butyl-rubber-aquasky-125" },
  126: { en: "/news-detail/INDUSTRY/what-is-a-pressure-switch-aquasky-126" },
  127: { en: "/news-detail/INDUSTRY/nitrogen-introduction-aquasky-127" },
  128: { en: "/news-detail/INDUSTRY/new-product-supremeplus-aquasky-128" },
  129: { en: "/news-detail/INDUSTRY/merry-christmas-and-happy-new-year-aquasky-129" },
  130: { en: "/news-detail/INDUSTRY/what-are-water-head-and-water-pressure-aquasky-130" },
  131: { en: "/news-detail/INDUSTRY/aquasky-2023-chinese-new-year-holiday-notice-aquasky-131" },
  132: { en: "/news-detail/INDUSTRY/carbon-neutral-vs-net-zero-aquasky-132" },
  133: { en: "/news-detail/INDUSTRY/what-is-a-pressure-switch-aquasky-133" },
  134: { en: "/news-detail/EXHIBITIONS/ish-frankfurt-2023-aquasky-134" },
  135: { en: "/news-detail/INDUSTRY/diaphragm-pressure-tank-introduction-aquasky-135" },
  136: { en: "/news-detail/INDUSTRY/what-is-the-difference-between-steel-and-stainless-steel-aquasky-136" },
  137: { en: "/news-detail/INDUSTRY/about-diaphragm-pressure-tank-aquasky-137" },
  138: { en: "/news-detail/INDUSTRY/what-is-the-difference-between-bladder-pressure-tanks-and-diaphragm-pressure-tanks-aquasky-138" },
  139: { en: "/news-detail/INDUSTRY/about-thermal-expansion-tanks-aquasky-139" },
  140: { en: "/news-detail/INDUSTRY/carbon-neutrality-giving-sustainable-development-green-wing-aquasky-140" },
  141: { en: "/news-detail/INDUSTRY/how-to-choose-the-right-size-pressure-tank-for-your-well-system-aquasky-141" },
  142: { en: "/news-detail/INDUSTRY/about-the-diaphragm-tank-aquasky-142" },
  143: { en: "/news-detail/INDUSTRY/ensuring-clean-and-potable-water-nsf-certified-pressure-tanks-aquasky-143", zh: "/news-detail/INDUSTRY/aquasky-143" },
  144: { en: "/news-detail/INDUSTRY/enhancing-water-flow-efficiency-the-key-role-of-pressure-tanks-aquasky-144", zh: "/news-detail/INDUSTRY/aquasky-144" },
  145: { en: "/news-detail/INDUSTRY/high-pressure-pressure-tanks-mega-plus-16-bar-ensuring-reliable-water-supply-for-high-rise-buildings-145", zh: "/news-detail/INDUSTRY/aquasky-145" },
  146: { en: "/news-detail/INDUSTRY/aquasky-pumplus-series-certified-by-nsfansi-372-drinking-water-system-components-lead-contentaquasky-146", zh: "/news-detail/INDUSTRY/aquasky-146" },
  147: { en: "/news-detail/INDUSTRY/aquasky-attains-iso-14064-12018-verification-report-opinion-for-greenhouse-gas-emissions-an-essential-move-towards-sustainable-operation-aquasky-147", zh: "/news-detail/INDUSTRY/mega-plus-16-baraquasky-147" },
  148: { en: "/news-detail/INDUSTRY/troubleshooting-and-maintenance-of-ro-storage-tanks-ensuring-optimal-water-filtration-efficiency-aquasky-148", zh: "/news-detail/INDUSTRY/nsfansi-372-aquasky-148" },
  149: { en: "/news-detail/INDUSTRY/merry-christmas-and-happy-new-year-2024-aquasky-149", zh: "/news-detail/INDUSTRY/roaquasky-149" },
  150: { en: "/news-detail/INDUSTRY/hydronic-heating-excellence-elevate-your-home-comfort-with-hydro-plus-tanks-aquasky-150", zh: "/news-detail/INDUSTRY/iso-14064-12018-aquasky-150" },
  151: { en: "/news-detail/INDUSTRY/aquasky-pressure-tank-40l-design-change-notice-aquasky-151", zh: "/news-detail/INDUSTRY/aquasky-151" },
  152: { en: "/news-detail/INDUSTRY/balancing-profit-and-purpose-the-role-of-esg-in-modern-businesses-aquasky-152", zh: "/news-detail/INDUSTRY/nsf-aquasky-152" },
  153: { en: "/news-detail/INDUSTRY/happy-year-of-the-dragon-aquasky-153", zh: "/news-detail/INDUSTRY/2024-aquasky-153" },
  154: { en: "/news-detail/INDUSTRY/agriculture-utilizing-pressure-tanks-for-irrigation-and-water-storage-aquasky-154", zh: "/news-detail/INDUSTRY/hydro-plus-aquasky-154" },
  155: { en: "/news-detail/INDUSTRY/enhancing-mining-operations-with-mega-plus-high-pressure-pressure-tanks-aquasky-155", zh: "/news-detail/INDUSTRY/apt-40-aquasky-155" },
  156: { en: "/news-detail/INDUSTRY/why-sustainability-matters-now-more-than-ever-aquaskys-role-aquasky-156", zh: "/news-detail/INDUSTRY/esg-aquasky-156" },
  157: { en: "/news-detail/INDUSTRY/introduction-to-the-pumplus-well-tank-aquasky-157", zh: "/news-detail/INDUSTRY/aquasky-157" },
  158: { en: "/news-detail/INDUSTRY/eu-carbon-border-adjustment-mechanism-cbam-aquasky-158", zh: "/news-detail/INDUSTRY/aquasky-158" },
  159: { zh: "/news-detail/INDUSTRY/mega-plus-aquasky-159" },
  160: { en: "/news-detail/INDUSTRY/us-climate-policy-clean-competition-act-ccaaquasky-160", zh: "/news-detail/INDUSTRY/aquasky-160" },
  161: { en: "/news-detail/INDUSTRY/mega-plus-16-bar-pressure-tanks-revolutionizing-water-management-across-industriesaquasky-161", zh: "/news-detail/INDUSTRY/pumplus-aquasky-161" },
  162: { zh: "/news-detail/INDUSTRY/cbam-aquasky-162" },
  163: { en: "/news-detail/INDUSTRY/thermal-plus-tanks-safeguarding-your-hot-water-system-aquasky-163", zh: "/news-detail/INDUSTRY/ccaaquasky-163" },
  164: { en: "/news-detail/INDUSTRY/why-sea-freight-is-increasing-in-mid-of-2024-aquasky-164", zh: "/news-detail/INDUSTRY/mega-plus-16-bar-aquasky-164" },
  165: { en: "/news-detail/INDUSTRY/the-importance-of-esg-for-the-future-of-businesses-aquasky-as-a-model-for-esg-standards-aquasky-165", zh: "/news-detail/INDUSTRY/thermal-plus-aquasky-165" },
  166: { en: "/news-detail/INDUSTRY/data-center-cooling-solutions-aquaskys-lqcolplus-expansion-tanks-in-liquid-cooling-systems-aquasky-166", zh: "/news-detail/INDUSTRY/2024-aquasky-166" },
  167: { en: "/news-detail/INDUSTRY/exploring-solar-heating-systemsaquasky-167", zh: "/news-detail/INDUSTRY/esgesg-aquasky-167" },
  168: { en: "/news-detail/INDUSTRY/differences-between-solar-expansion-tank-and-hydronic-heating-tankaquasky-168", zh: "/news-detail/INDUSTRY/lqcolplus-aquasky-168" },
  169: { en: "/news-detail/INDUSTRY/merry-christmas-and-happy-new-year-2025-aquasky-169", zh: "/news-detail/INDUSTRY/aquasky-169" },
  170: { en: "/news-detail/INDUSTRY/introducing-polypropylene-pp-aquasky-170", zh: "/news-detail/INDUSTRY/aquasky-170" },
  171: { en: "/news-detail/INDUSTRY/happy-year-of-the-snake-2025-aquasky-171", zh: "/news-detail/INDUSTRY/2025-aquasky-171" },
  172: { en: "/news-detail/INDUSTRY/aquasky-successfully-completes-iso-90012015-annual-audit-in-2024-aquasky-172", zh: "/news-detail/INDUSTRY/pp-aquasky-172" },
  173: { en: "/news-detail/INDUSTRY/introduction-to-liquid-cold-system-expansion-tank-lqcol-plus-aquasky-173", zh: "/news-detail/INDUSTRY/2025-aquasky-173" },
  174: { en: "/news-detail/INDUSTRY/kaohsiung-water-outage-why-water-storage-system-is-essential-174", zh: "/news-detail/INDUSTRY/2024iso-90012015-aquasky-174" },
  175: { en: "/news-detail/EXHIBITIONS/ish-frankfurt-2025-solutions-for-a-sustainable-future-aquasky-175", zh: "/news-detail/INDUSTRY/lqcol-plus-aquasky-175" },
  176: { en: "/news-detail/INDUSTRY/introduction-to-premium-plus-series-tank-of-aquasky-aquasky-176", zh: "/news-detail/INDUSTRY/aquasky-176" },
  177: { en: "/news-detail/INDUSTRY/trumps-2025-tariff-policy-what-it-means-for-global-trade-aquasky-177", zh: "/news-detail/EXHIBITIONS/2025ish-aquasky-177" },
  178: { en: "/news-detail/INDUSTRY/asia-sees-new-covid-19-wave-rising-cases-in-hong-kong-singapore-china-and-thailand-aquasky-178", zh: "/news-detail/INDUSTRY/premium-plus-aquasky-178" },
  179: { en: "/news-detail/INDUSTRY/surge-of-the-taiwanese-dollar-in-may-and-june-2025-aquasky-179", zh: "/news-detail/INDUSTRY/2025-aquasky-179" },
  180: { en: "/news-detail/INDUSTRY/summer-holiday-notice-2025aquasky-180", zh: "/news-detail/INDUSTRY/covid-19-aquasky-180" },
  181: { en: "/news-detail/INDUSTRY/aquasky-container-lands-on-gujarat-beach-india-an-unplanned-demonstration-of-durability-aquasky-181", zh: "/news-detail/INDUSTRY/202556aquasky-181" },
  182: { en: "/news-detail/INDUSTRY/watermark-certification-now-upgraded-to-watermark-lead-free-lf-australia-new-zealand-aquasky-182", zh: "/news-detail/INDUSTRY/2025-aquasky-182" },
  183: { en: "/news-detail/INDUSTRY/merry-christmas-and-happy-new-year-2026aquasky-183", zh: "/news-detail/INDUSTRY/aquasky-183" },
  184: { en: "/news-detail/INDUSTRY/successful-renewal-of-acs-certification-attestation-de-conformit-sanitaire-ensuring-continued-compliance-in-france-aquasky-184", zh: "/news-detail/INDUSTRY/watermark-watermark-lf-aquasky-184" },
  185: { en: "/news-detail/INDUSTRY/aquasky-honored-with-the-24th-taichung-golden-hand-awardaquasky-185", zh: "/news-detail/INDUSTRY/2026-aquasky-185" },
  186: { en: "/news-detail/INDUSTRY/welcoming-2026-happy-new-year-and-the-year-of-the-horse-aquasky-186", zh: "/news-detail/INDUSTRY/acs-attestation-de-conformit-sanitaireaquasky-186" },
  187: { zh: "/news-detail/INDUSTRY/24-aquasky-187" },
  188: { zh: "/news-detail/INDUSTRY/2026-aquasky-188" },
  189: { zh: "/news-detail/INDUSTRY/giga-plus-25-bar-aquasky-189" },
  },

  // videos-detail.php?sid=N → { lang: 新路徑 }（zh slug 結尾是 sid；en 以同名影片對應）
  videosFallback: '/videos',
  videosBySid: {
  5: { zh: "/videos-detail/aquaskyaquasky-enterprise-corp-pump-tank-pressure-tankro-tank-water-storage-tank-5", en: "/videos-detail/AQUASKYAQUASKY-Enterprise-Corp-pump-tank-pressure-tankRO-tank-water-storage-tank" },
  6: { zh: "/videos-detail/aquaskyaquasky-enterprise-corp-nsf-tank-reserve-osmosis-tank-thermal-expansion-tank-6", en: "/videos-detail/AQUASKYAQUASKY-Enterprise-Corp-NSF-Tank-Reserve-Osmosis-Tank-Thermal-Expansion-Tank" },
  7: { zh: "/videos-detail/rot-4-installationpressure-tank-ro-tank-pumplusaquasky-7", en: "/videos-detail/ROT-4-installation-pressure-tank-ro-tank-pumplus-Aquasky" },
  8: { zh: "/videos-detail/rot-4-unboxing-reviewpressure-tank-ro-tank-roplusaquasky-8", en: "/videos-detail/ROT-4-Unboxing-ReviewPressure-tank-RO-Tank-ROPlus-Aquasky" },
  9: { zh: "/videos-detail/aquasky-painting-quality-inspectionro-tank-pressure-tank-pumplus-9", en: "/videos-detail/Aquasky-Painting-Quality-InspectionRO-Tank-Pressure-Tank-PUMPLUS" },
  10: { zh: "/videos-detail/multiple-color-selectionsro-tank-pressure-tank-roplusaquasky-10", en: "/videos-detail/Multiple-Color-SelectionsRo-Tank-Pressure-Tank-ROPLUS-Aquasky" },
  11: { zh: "/videos-detail/aquasky-pumplus-seriespump-tank-pressure-tankro-tank-water-storage-tank-11", en: "/videos-detail/Aquasky-PumPlus-Seriespump-tank-pressure-tankRO-tank-water-storage-tank" },
  12: { zh: "/videos-detail/aquaskyro-plus-pumplus-thermal-plus-hydro-pluspressure-tank-ro-tank-12", en: "/videos-detail/AQUASKYRo-plus-Pumplus-Thermal-Plus-Hydro-PlusPressure-Tank-RO-Tank" },
  13: { zh: "/videos-detail/n2-filling-testpressure-tank-pump-tank-energy-savingaquasky-13", en: "/videos-detail/N2-Filling-TestPressure-Tank-Pump-tank-Energy-Saving-Aquasky" },
  14: { zh: "/videos-detail/rot-4-pressure-tank-standard-reverse-osmosis-tankwater-storage-tankaquasky-14", en: "/videos-detail/ROT-4-Pressure-Tank-Standard-Reverse-Osmosis-TankWater-storage-tank-Aquasky" },
  15: { zh: "/videos-detail/aquasky-online-selection-toolspressure-tank-pumplus-aquasky-15", en: "/videos-detail/Aquasky-online-selection-toolsPressure-Tank-Pumplus-Aquasky" },
  },

  // 其餘 .php 兜底
  fallback: '/<lang>',
};

function normalizeLang(raw) {
  if (!raw) return null;
  const k = String(raw).trim().toLowerCase();
  const l = LANG_ALIASES[k] ?? k;
  return SUPPORTED_LANGS.includes(l) ? l : null;
}

function sidOf(url) {
  const s = url.searchParams.get('sid');
  return s && /^\d+$/.test(s.trim()) ? String(Number(s.trim())) : null;
}

/**
 * 舊站網址 → 新站路徑。
 * @param {URL} url 只看 pathname 與 searchParams，不管 host。
 * @returns {string|null} 新路徑（例如 '/en/LQCOL-PLUS'），或 null（不是舊網址／要讓它 404）。
 */
export function legacyRedirect(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { pathname = url.pathname; }
  const segments = pathname.split('/').filter(Boolean);

  // 語系：路徑第一段優先，其次 ?lang=，都沒有 → en
  let pathLang = null;
  if (segments.length && normalizeLang(segments[0])) pathLang = normalizeLang(segments.shift());
  const lang = pathLang ?? normalizeLang(url.searchParams.get('lang')) ?? DEFAULT_LANG;
  const T = redirectTable;

  if (segments.length === 0) return null; // "/"、"/en"：新站本來就有，不是舊網址

  const last = segments[segments.length - 1];
  const isPhp = /\.php$/i.test(last);

  // ── 沒有 .php 的乾淨路徑 ───────────────────────────────────────
  if (!isPhp) {
    if (segments.length !== 1) return null;
    const canonical = T.pages[last.toLowerCase()];
    if (!canonical) return null;
    if (!pathLang) return `/${lang}${canonical}`; // /LQCOL-PLUS → /en/LQCOL-PLUS
    if (canonical !== `/${last}`) return `/${lang}${canonical}`; // /en/faq → /en/FAQ（大小寫修正）
    return null; // 已經是新站網址
  }

  // ── .php ──────────────────────────────────────────────────────
  if (segments.length !== 1) return `/${lang}`; // 子目錄裡的 .php（include/…）一律兜底
  const php = last.toLowerCase();
  const name = php.slice(0, -4);

  if (T.notFound.includes(php)) return null;
  if (php === 'index.php') return `/${lang}`;
  if (T.pages[name]) return `/${lang}${T.pages[name]}`;
  if (T.selectionTools.includes(php)) return `/${lang}${T.pages.sel_tools}`;
  if (php === 'sel_contact.php') return `/${lang}${T.pages.contact}`;

  const sid = sidOf(url);
  if (php === 'news-detail.php') {
    const hit = sid && T.newsBySid[sid]?.[lang];
    return `/${lang}${hit ?? T.newsFallback}`;
  }
  if (php === 'videos-detail.php') {
    const hit = sid && T.videosBySid[sid]?.[lang];
    return `/${lang}${hit ?? T.videosFallback}`;
  }
  if (php === 'products-det.php') {
    const hit = sid && T.productsBySid[sid];
    return `/en${hit ?? T.productsFallback}`;
  }
  if (php === 'accessories-det.php') return `/en${T.accessoriesDetFallback}`;
  if (php === 'certification_page.php') {
    const hit = sid && T.certificationBySid[sid];
    return `/${lang}${hit ?? T.certificationFallback}`;
  }

  return `/${lang}`; // 其餘 .php 兜底
}

// 選型工具算式的單元測試：對照溢康 2022 文件與舊站 JS 算出來的數字。用法（site/）：node scripts/test-selection-tools.mjs
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// 瀏覽器用的純 JS（不是 ES module），用 Function 載進來拿 module.exports
const selModule = { exports: {} };
new Function('module', 'exports', readFileSync(join(root, 'public/js/selection-tools.js'), 'utf8'))(selModule, selModule.exports);
const sel = selModule.exports;
const d = JSON.parse(readFileSync(join(root, 'src/data/selection-tools.json'), 'utf8'));

let fails = 0;
const eq = (name, got, want) => { if (String(got) !== String(want)) { fails++; console.log(`✗ ${name}: got ${got}, want ${want}`); } else console.log(`✓ ${name}`); };

// ① Pressure Switch（舊站預設值：cut-in 1、cut-out 2、1 分鐘、1 L → 2021 列印 PDF 範例：AF 33.33%、Total 1 L、Size 3 L、APT-3、預充 0.8 bar）
let r = sel.calc.ps(d, 'bar', 1, 2, 1, 1);
eq('PS bar AF', r.afPercent, '33.33'); eq('PS bar total', r.total, '1.00'); eq('PS bar size', r.sizeText, '3'); eq('PS bar precharge', r.precharge, '0.8');
eq('PS bar model', sel.pickModel(d.models[r.series], r.size).model, 'APT-3');
// 2020 Excel 範例：cut-in 14、cut-out 16、2 分鐘、66 L → AF 11.76%、Total 132、Size 1122 → 超過 450 → 多桶；cut-in ≥ 9 → MEGA
r = sel.calc.ps(d, 'bar', 14, 16, 2, 66);
eq('PS excel AF', r.afPercent, '11.76'); eq('PS excel total', r.total, '132.00'); eq('PS excel size', r.sizeText, '1122'); eq('PS excel series', r.series, 'mega');
eq('PS excel >450 → null', sel.pickModel(d.models[r.series], r.size), null);
// 防呆：cut-out ≤ cut-in → cut-in + 1
r = sel.calc.ps(d, 'bar', 3, 3, 1, 10); eq('PS cutout fix', r.cutOutFixed, 4);
// PSI：14.5／29 psi＝1／2 bar → 同 AF；預充壓＝14.5 − 2（客戶文件；舊站 − 2.8 會是 11.7）
r = sel.calc.ps(d, 'psi', 14.5, 29, 1, 1);
eq('PS psi AF', r.afPercent, '33.33'); eq('PS psi size', r.sizeText, '3'); eq('PS psi precharge (docx −2)', r.precharge, '12.5');
eq('PS psi cut-in 130 → MEGA', sel.calc.ps(d, 'psi', 130, 150, 1, 1).series, 'mega');
eq('PS bar cut-in 8.9 → APT', sel.calc.ps(d, 'bar', 8.9, 10, 1, 1).series, 'apt');

// ② VSD：舊站 water_flow 36 L/min、set 2 bar → 1.00 L、預充 (2+0.1)×0.65＝1.37（toFixed 2）
r = sel.calc.vsd(d, 'bar', 36, 2);
eq('VSD bar size', r.sizeText, '1.00'); eq('VSD bar precharge', r.precharge, '1.37'); eq('VSD bar model', sel.pickModel(d.models[r.series], r.size).model, 'APT-1.3');
r = sel.calc.vsd(d, 'psi', 100, 120);
eq('VSD psi size', r.sizeText, '2.78'); eq('VSD psi precharge', r.precharge, ((120 + 1.5) * 0.65).toFixed(2)); eq('VSD psi set 120 → MEGA', r.series, 'mega');
eq('VSD mega smallest is MEGA-8', sel.pickModel(d.models.mega, 2.78).model, 'MEGA-8');
eq('VSD <1 → 1', sel.calc.vsd(d, 'bar', 0, 0).flow, 1);

// ③ Thermal：100 L、operating 3 bar → 4.40 L → TP-8、預充 2.80；psi：(3+0.1)×0.65＝2.02（客戶文件寫法，不是 bug）
r = sel.calc.thermal(d, 'bar', 100, 3);
eq('TH bar size', r.sizeText, '4.40'); eq('TH bar precharge', r.precharge, '2.80'); eq('TH bar model', sel.pickModel(d.models.thermal, r.size).model, 'TP-8');
r = sel.calc.thermal(d, 'psi', 100, 3);
eq('TH psi precharge', r.precharge, '2.02');
eq('TH >100 L → null', sel.pickModel(d.models.thermal, 4.41 * 30), null);

// 型號表遞增且有連結
for (const k of ['apt', 'mega', 'thermal']) {
  const list = d.models[k];
  for (let i = 1; i < list.length; i++) if (list[i].max <= list[i - 1].max) { fails++; console.log(`✗ ${k} not ascending at ${list[i].model}`); }
  for (const m of list) if (!m.path.startsWith('/products-det/')) { fails++; console.log(`✗ ${m.model} path`); }
}
// 結果 HTML 有型號與連結
const html = sel.resultHtml(d, 'en', { ...sel.calc.ps(d, 'bar', 1, 2, 1, 1), unit: 'bar' });
eq('result html has model', /APT-3/.test(html) && /\/en\/products-det\/pumplus\/APT-3/.test(html), true);

console.log(fails ? `\n${fails} failing` : '\nOK: selection-tools formulas');
process.exit(fails ? 1 : 0);

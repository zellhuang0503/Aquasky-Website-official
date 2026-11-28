/* 貨櫃裝載計算工具（/<lang>/sel_unit_container），純 JS。
   數字在 src/data/container-calculator.json（頁面用 <script type="application/json" id="container-calc-data"> 帶進來）。
   算式照溢康 2026-11-23 Excel：每列材積＝單位材積×數量、每列重量＝單位重量×數量、裝載率＝目前總材積÷貨櫃總材積×100。
   「建議貨櫃」是新站加的：裝載率 ≤ 85%（targetPercent）的最小貨櫃；都裝不下就以 40HQ 的 85% 估要幾櫃。
   同一支檔案也給 scripts/test-selection-tools.mjs 驗算（module.exports）。 */
(function (root) {
  'use strict';

  function round(n, digits) { var k = Math.pow(10, digits); return Math.round(n * k) / k; }

  // qty：{ 'vertical:24L': 100, ... }；回傳每列小計與每種貨櫃的裝載率
  function compute(d, qty) {
    var rows = [], totalQty = 0, totalCuf = 0, totalKg = 0;
    d.groups.forEach(function (g) {
      g.models.forEach(function (m) {
        var key = g.key + ':' + m.litre;
        var q = Math.max(0, Math.floor(Number(qty[key]) || 0));
        var cuf = m.unitCuf * q, kg = m.unitKg * q;
        rows.push({ key: key, qty: q, cuf: cuf, kg: kg });
        totalQty += q; totalCuf += cuf; totalKg += kg;
      });
    });
    var containers = d.containers.map(function (c) {
      var pct = totalCuf / c.totalCuf * 100;
      return { key: c.key, totalCuf: c.totalCuf, avgLoadCuf: c.avgLoadCuf, percent: pct,
        state: totalCuf === 0 ? 'empty' : pct <= d.targetPercent ? 'ok' : pct <= 100 ? 'high' : 'over' };
    });
    var fit = null;
    for (var i = 0; i < containers.length; i++) if (totalCuf > 0 && containers[i].percent <= d.targetPercent) { fit = containers[i]; break; }
    var biggest = d.containers[d.containers.length - 1];
    var needed = totalCuf > 0 && !fit ? Math.ceil(totalCuf / (biggest.totalCuf * d.targetPercent / 100)) : 0;
    return { rows: rows, totalQty: totalQty, totalCuf: round(totalCuf, 2), totalKg: round(totalKg, 2), containers: containers, fit: fit, needed: needed };
  }

  var api = { compute: compute, round: round };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  // ---- 瀏覽器 ----
  var dataEl = document.getElementById('container-calc-data');
  if (!dataEl) return;
  var cfg = JSON.parse(dataEl.textContent);
  var d = cfg.data, tx = cfg.text;
  var nf = function (n, digits) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }); };
  var fill = function (tpl, v) { return tpl.replace(/\{(\w)\}/g, function (_m, k) { return v[k] != null ? v[k] : ''; }); };
  var inputs = Array.prototype.slice.call(document.querySelectorAll('.cc-qty'));
  var byKey = {};
  inputs.forEach(function (el) { byKey[el.getAttribute('data-key')] = el; });
  var $ = function (id) { return document.getElementById(id); };

  function current() {
    var q = {};
    inputs.forEach(function (el) { q[el.getAttribute('data-key')] = el.value; });
    return compute(d, q);
  }

  function render() {
    var r = current();
    r.rows.forEach(function (row) {
      var tr = byKey[row.key].closest('tr');
      tr.querySelector('.cc-row-cuf').textContent = row.qty ? nf(row.cuf, 2) : '';
      tr.querySelector('.cc-row-kg').textContent = row.qty ? nf(row.kg, 1) : '';
      tr.classList.toggle('cc-has-qty', row.qty > 0);
    });
    $('cc-total-qty').textContent = nf(r.totalQty, 0);
    $('cc-total-cuf').textContent = nf(r.totalCuf, 2) + ' CUF';
    $('cc-total-m3').textContent = '≈ ' + nf(r.totalCuf * d.cufToM3, 2) + ' m³';
    $('cc-total-kg').textContent = nf(r.totalKg, 1) + ' kg';
    $('cc-total-lb').textContent = '≈ ' + nf(r.totalKg * d.kgToLb, 0) + ' lb';
    r.containers.forEach(function (c) {
      var card = document.querySelector('.cc-container[data-key="' + c.key + '"]');
      card.setAttribute('data-state', c.state);
      card.querySelector('.cc-pct').textContent = c.state === 'empty' ? '0%' : nf(c.percent, 1) + '%';
      var bar = card.querySelector('.cc-bar-fill');
      bar.style.width = Math.min(100, c.percent) + '%';
      card.querySelector('.cc-bar').setAttribute('aria-valuenow', String(Math.round(c.percent)));
      card.querySelector('.cc-status').textContent = fill(tx['status' + c.state.charAt(0).toUpperCase() + c.state.slice(1)], { p: d.targetPercent });
    });
    var rec = $('cc-recommend');
    if (r.totalCuf === 0) rec.textContent = '';
    else if (r.fit) rec.textContent = fill(tx.recommend, { c: r.fit.key, p: nf(r.fit.percent, 1) });
    else rec.textContent = fill(tx.recommendNone, { n: r.needed, p: d.targetPercent });
    return r;
  }

  function listText(r) {
    var lines = [tx.listTitle];
    d.groups.forEach(function (g) {
      g.models.forEach(function (m) {
        var row = r.rows.filter(function (x) { return x.key === g.key + ':' + m.litre; })[0];
        if (row.qty) lines.push(tx[g.key] + ' ' + m.litre + ' (' + m.gallon + ') × ' + row.qty + ' = ' + nf(row.cuf, 2) + ' CUF / ' + nf(row.kg, 1) + ' kg');
      });
    });
    lines.push(tx.totalQty + ': ' + nf(r.totalQty, 0));
    lines.push(tx.totalCuf + ': ' + nf(r.totalCuf, 2) + ' CUF');
    lines.push(tx.totalKg + ': ' + nf(r.totalKg, 1) + ' kg');
    r.containers.forEach(function (c) { lines.push(c.key + ' ' + tx.loading + ': ' + nf(c.percent, 1) + '%'); });
    return lines.join('\n');
  }

  inputs.forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('focus', function () { if (el.value === '0') el.select(); });
  });
  $('cc-reset').addEventListener('click', function () { inputs.forEach(function (el) { el.value = ''; }); render(); });
  $('cc-copy').addEventListener('click', function () {
    var text = listText(current());
    var done = function () { var b = $('cc-copy'); var old = b.textContent; b.textContent = tx.copied; setTimeout(function () { b.textContent = old; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('', text); });
    else window.prompt('', text);
  });
  render();
})(this);

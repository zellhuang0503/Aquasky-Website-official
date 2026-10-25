/* 選型工具（Pressure Switch／VSD／Thermal）的計算與推薦，純 JS，沒有 jQuery。
   參數與型號對照在 src/data/selection-tools.json（頁面用 <script type="application/json" id="sel-tools-data"> 帶進來）。
   算式照溢康 2022-04-13「SELECTION TOOL 計算式列表」；舊站是 inline jQuery＋AJAX 到 select_api*.php，新站全部在瀏覽器算。
   同一支檔案也給 scripts/test-selection-tools.mjs 做單元測試（module.exports）。 */
(function (root) {
  'use strict';

  // 數字顯示：最多 2 位小數、去掉尾端的 0（舊站直接印 JS 浮點數，會出現 2.0999999999999996）
  function fmt(n, digits) { return Number(n.toFixed(digits == null ? 2 : digits)).toString(); }
  function fill(tpl, v) { return tpl.replace('{v}', v); }

  // 挑「容積 ≥ 算出值」的第一個型號；超過最後一個回 null（顯示多桶文字）
  function pickModel(list, size) {
    for (var i = 0; i < list.length; i++) if (size <= list[i].max) return list[i];
    return null;
  }

  var calc = {
    // ① Pressure Switch。unit: 'bar' | 'psi'。回傳顯示用的字串都已算好。
    ps: function (d, unit, cutIn, cutOut, minutes, litres) {
      var f = d.formulas.ps, K = d.formulas.psiPerBar;
      var inRaw = cutIn, outRaw = cutOut;
      // 防呆（舊站）：cut-out ≤ cut-in 時改成 cut-in + 1（同單位）
      if (outRaw <= inRaw) outRaw = parseInt(inRaw, 10) + 1;
      var inBar = unit === 'psi' ? inRaw / K : inRaw;
      var outBar = unit === 'psi' ? outRaw / K : outRaw;
      var af = (outBar - inBar) / (outBar + 1);
      var total = parseInt(minutes, 10) * parseInt(litres, 10);
      var size = total / af;
      // 建議預充壓：bar＝cut-in − 0.2；psi＝cut-in − 2（客戶 2022 文件；舊站程式是 − 2.8，待 Tiffany 確認）
      var pre = unit === 'psi' ? inRaw - f.prechargePsiOffset : inRaw - f.prechargeBarOffset;
      var mega = unit === 'psi' ? inRaw >= f.megaFromCutInPsi : inRaw >= f.megaFromCutInBar;
      return {
        cutOutFixed: outRaw, afPercent: (af * 100).toFixed(2), total: total.toFixed(2),
        size: size, sizeText: String(parseInt(size, 10)),   // 舊站 STEP 4 用 parseInt 取整
        precharge: fmt(pre), series: mega ? 'mega' : 'apt',
      };
    },
    // ② VSD／VFD
    vsd: function (d, unit, flow, setP) {
      var f = d.formulas.vsd;
      if (flow < 1) flow = 1;
      if (setP < 1) setP = 1;
      var size = flow / f.flowDivisor;
      var p = unit === 'psi' ? f.prechargePsi : f.prechargeBar;
      var pre = (setP + p.add) * p.mul;
      var mega = unit === 'psi' ? setP >= f.megaFromSetPsi : setP >= f.megaFromSetBar;
      return { flow: flow, setP: setP, size: size, sizeText: size.toFixed(2), precharge: pre.toFixed(2), series: mega ? 'mega' : 'apt' };
    },
    // ③ Thermal Expansion（Max Working Temperature 與 Safety Relief Valve 舊站有收但沒拿來算，照舊）
    thermal: function (d, unit, volume, operating) {
      var f = d.formulas.thermal;
      if (volume < 1) volume = 1;
      if (operating < 1) operating = 1;
      var size = volume * f.volumeFactor;
      var pre = unit === 'psi' ? (operating + f.prechargePsi.add) * f.prechargePsi.mul : operating - f.prechargeBarOffset;
      return { volume: volume, operating: operating, size: size, sizeText: size.toFixed(2), precharge: pre.toFixed(2), series: 'thermal' };
    },
  };

  function resultHtml(d, lang, r) {
    var t = d.text, list = d.models[r.series], m = pickModel(list, r.size);
    var h = '<p class="sel-result-size">' + fill(t.properSize, r.sizeText) + '</p>';
    if (!m) {
      h += '<p class="text-danger sel-result-multi">' + fill(t.multipleTanks, r.sizeText) + '</p>';
    } else {
      h += '<table class="table sel-result-table"><tbody>' +
        '<tr><th>' + t.modelNumber + '</th><td>' + m.model + '</td></tr>' +
        '<tr><th>' + t.series + '</th><td>' + t.seriesName[r.series] + '</td></tr>' +
        '<tr><th>' + t.totalVolume + '</th><td>' + m.volumeL + ' L / ' + m.volumeGal + ' Gal</td></tr>' +
        '</tbody></table>' +
        '<p><a class="btn btn-link btn_active" href="/' + lang + m.path + '">' + t.viewDetails + '</a></p>';
    }
    h += '<p class="text-danger">' + fill(r.unit === 'psi' ? t.prechargePsi : t.prechargeBar, r.precharge) + '<br>' + t.disclaimer + '</p>';
    return h;
  }

  // ---------- 頁面接線（只在瀏覽器） ----------
  function wire() {
    var el = document.getElementById('sel-tools-data');
    if (!el) return;
    var d = JSON.parse(el.textContent), kind = d.kind, lang = d.lang;
    var $ = function (id) { return document.getElementById(id); };
    var num = function (id) { return parseFloat($(id).value); };
    // 舊站 CSS 把 #show_print_A／B 與 PSI 區塊預設藏起來，要顯示得明確設 block
    var show = function (id, on) { var e = $(id); if (e) e.style.display = on ? 'block' : 'none'; };

    // STEP 1 單位切換（ps 頁的 id 跟 vsd／thermal 不同，舊站就這樣）
    var ids = kind === 'ps'
      ? { barBtn: 'btn_select_bar', psiBtn: 'btn_select_psi', barBox: 'select_bar', psiBox: 'select_psi' }
      : { barBtn: 'btn_selectA', psiBtn: 'btn_selectB', barBox: 'select_A', psiBox: 'select_B' };
    function selectUnit(unit) {
      $(ids.barBtn).classList.toggle('btn_active', unit === 'bar');
      $(ids.psiBtn).classList.toggle('btn_active', unit === 'psi');
      show(ids.barBox, unit === 'bar'); show(ids.psiBox, unit === 'psi');
    }
    $(ids.barBtn).addEventListener('click', function () { selectUnit('bar'); });
    $(ids.psiBtn).addEventListener('click', function () { selectUnit('psi'); });
    selectUnit('bar');

    // 兩組表單：A＝bar、B＝psi。每組：即時更新中間欄位；按「Click here to Submit」才顯示 STEP 結果
    var groups = [
      { unit: 'bar', sfx: '', submit: 'submit_s1', result: 'show_select_A', print: 'show_print_A', printBtn: 'prints_btn_A', contactBtn: 'contact_btn_A', remark: kind === 'ps' ? 'setp4_remark' : 'setp_remark' },
      { unit: 'psi', sfx: '_PSI', submit: 'submit_s2', result: 'show_select_B', print: 'show_print_B', printBtn: 'prints_btn_B', contactBtn: 'contact_btn_B', remark: kind === 'ps' ? 'setp4_remark_PSI' : 'setp_remark_PSI' },
    ];
    groups.forEach(function (g) {
      var s = g.sfx, r;
      function compute() {
        if (kind === 'ps') {
          r = calc.ps(d, g.unit, num('input_cut_in' + s), num('input_cut_out' + s), num('input_Minimum' + s), num('input_Litre' + s));
          $('input_cut_out' + s).value = r.cutOutFixed;
          $('out_Acceptance_Factor' + s).textContent = r.afPercent + '%';
          $('out_total_WN' + s).textContent = r.total;
        } else if (kind === 'vsd') {
          r = calc.vsd(d, g.unit, num('water_flow' + s), num('set_pressure' + s));
          $('water_flow' + s).value = r.flow; $('set_pressure' + s).value = r.setP;
        } else {
          r = calc.thermal(d, g.unit, num('Total_Water_Volume' + s), num('Operating_Pressure' + s));
          $('Total_Water_Volume' + s).value = r.volume; $('Operating_Pressure' + s).value = r.operating;
        }
        r.unit = g.unit;
        var rem = $(g.remark);
        if (rem) rem.textContent = fill(g.unit === 'psi' ? d.text.prechargePsi : d.text.prechargeBar, r.precharge);
        return r;
      }
      // 舊站：STEP 2／3 的中間欄位在輸入時就更新（2020-12 客戶要求），STEP 4 的容積按送出才出來
      var form = $(g.submit) && $(g.submit).closest('form');
      if (form) {
        form.addEventListener('submit', function (e) { e.preventDefault(); });
        form.querySelectorAll('input[type=number]').forEach(function (inp) { inp.addEventListener('change', compute); });
      }
      compute();
      var out = $('out_proper_tank_size' + s);
      $(g.submit).addEventListener('click', function () {
        var r = compute();
        if (out) out.textContent = r.sizeText;
        $(g.result).innerHTML = resultHtml(d, lang, r);
        show(g.print, true);
      });
      show(g.print, false);
      // 列印：瀏覽器列印（舊站是伺服器產 PDF）；諮詢：到聯絡頁
      if ($(g.printBtn)) $(g.printBtn).addEventListener('click', function () {
        document.body.classList.add('printing-tool');
        window.addEventListener('afterprint', function () { document.body.classList.remove('printing-tool'); }, { once: true });
        window.print();
      });
      if ($(g.contactBtn)) $(g.contactBtn).addEventListener('click', function () { location.href = '/' + lang + '/contact'; });
    });
  }

  var api = { calc: calc, pickModel: pickModel, resultHtml: resultHtml, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.AquaskySelectionTools = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }
})(typeof window !== 'undefined' ? window : globalThis);

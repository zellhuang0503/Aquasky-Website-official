// 聯絡頁表單（舊站 #fchk1）接到 /api/contact。表單 HTML 照舊站不動，這裡在載入後補上：
// Turnstile 人機驗證框（送出鈕上面）、狀態訊息（送出鈕下面）、看不見的蜜罐欄位。
// 設定（金鑰、文字）從頁面的 #contact-form-data 讀。
(function () {
  var form = document.getElementById('fchk1');
  var cfgEl = document.getElementById('contact-form-data');
  if (!form || !cfgEl) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var text = cfg.text;
  form.removeAttribute('data-todo');

  var btn = form.querySelector('#send-btn');
  var holder = document.createElement('div');
  holder.className = 'contact-turnstile';
  btn.parentNode.insertBefore(holder, btn);
  var status = document.createElement('p');
  status.className = 'contact-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  btn.parentNode.appendChild(status);
  var hp = document.createElement('input');
  hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off';
  hp.setAttribute('aria-hidden', 'true');
  hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  form.appendChild(hp);

  var token = '';
  var widgetId = null;
  window.__aqTurnstileReady = function () {
    if (!window.turnstile || widgetId !== null) return;
    widgetId = window.turnstile.render(holder, {
      sitekey: cfg.sitekey,
      action: 'contact',
      language: cfg.lang === 'zh' ? 'zh-tw' : cfg.lang,
      callback: function (t) { token = t; },
      'expired-callback': function () { token = ''; },
      'error-callback': function () { token = ''; }
    });
  };
  if (window.turnstile) window.__aqTurnstileReady();

  function show(kind, msg) {
    status.textContent = msg;
    status.className = 'contact-status contact-status-' + kind;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { show('', ''); form.reportValidity(); return; }
    if (!token) { show('error', text.verify); return; }
    var body = {
      requestId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
      name: form.querySelector('#txt1').value,
      email: form.querySelector('#txt2').value,
      phone: form.querySelector('#txt3').value,
      message: form.querySelector('#t-area').value,
      lang: cfg.lang,
      page: location.pathname,
      website: hp.value,
      turnstileToken: token
    };
    btn.disabled = true;
    show('info', text.sending);
    fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, code: 'error' }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          show('ok', res.delivered ? text.sent : text.sentPreview);
        } else {
          show('error', text.codes[res.code] || text.failed);
        }
      })
      .catch(function () { show('error', text.failed); })
      .then(function () {
        btn.disabled = false;
        token = '';
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      });
  });
})();

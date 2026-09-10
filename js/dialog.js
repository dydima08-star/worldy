// Wordle Duo — единая система модалок и тостов: замена нативных alert/prompt/confirm.
// На телефоне системные диалоги ломают поток и выглядят грубо.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= МОДАЛКА (showAlert / showConfirm / showPrompt) =================

    let __modalResolve = null;

    function __closeModal(result) {
      document.getElementById('app-modal').classList.add('hidden');
      document.removeEventListener('keydown', __modalKeyDown);
      const resolve = __modalResolve;
      __modalResolve = null;
      if (resolve) resolve(result);
    }

    function __modalKeyDown(e) {
      if (e.key === 'Escape') { __closeModal(null); return; }
      if (e.key === 'Enter') {
        const okBtn = document.querySelector('#app-modal-buttons .modal-btn-ok');
        if (okBtn) okBtn.click();
      }
    }

    // buttons: [{ label, value, ok?, secondary? }]
    function __openModal(title, html, buttons) {
      return new Promise((resolve) => {
        __modalResolve = resolve;
        document.getElementById('app-modal-title').innerText = title;
        document.getElementById('app-modal-body').innerHTML = html || '';
        const buttonsEl = document.getElementById('app-modal-buttons');
        buttonsEl.innerHTML = '';
        buttons.forEach(b => {
          const btn = document.createElement('button');
          btn.innerText = b.label;
          if (b.secondary) btn.className = 'secondary';
          if (b.ok) btn.classList.add('modal-btn-ok');
          btn.style.margin = '0 0 8px 0';
          btn.onclick = () => __closeModal(b.value);
          buttonsEl.appendChild(btn);
        });
        document.getElementById('app-modal').classList.remove('hidden');
        document.addEventListener('keydown', __modalKeyDown);
      });
    }

    document.getElementById('app-modal').addEventListener('click', (e) => {
      if (e.target.id === 'app-modal') __closeModal(null);
    });

    // Одна кнопка «Понятно»
    function showAlert(title, html) {
      return __openModal(title, html, [{ label: 'Понятно', value: true, ok: true }]);
    }

    // Кнопки подтверждения/отмены -> Promise<bool>
    function showConfirm(title, html, okLabel) {
      return __openModal(title, html, [
        { label: okLabel || 'Да', value: true, ok: true },
        { label: 'Отмена', value: false, secondary: true }
      ]).then(v => v === true);
    }

    // opts.buttons — список значений для кнопок (например, позиции 1..len) -> Promise<value|null>
    function showPrompt(title, opts) {
      opts = opts || {};
      const buttons = (opts.buttons || []).map(b => ({ label: String(b), value: b }));
      buttons.push({ label: 'Отмена', value: null, secondary: true });
      return __openModal(title, opts.html || '', buttons);
    }

    // ================= ТОСТЫ (showToast) =================

    const TOAST_COLORS = { info: 'var(--accent-color)', ok: '#2ecc71', warn: '#f39c12', err: '#e74c3c' };
    let __activeToasts = [];

    function showToast(text, type) {
      type = type || 'info';
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast';
      el.style.borderColor = TOAST_COLORS[type] || TOAST_COLORS.info;
      el.innerText = text;

      const close = () => {
        el.classList.add('toast-hide');
        setTimeout(() => { el.remove(); __activeToasts = __activeToasts.filter(t => t !== el); }, 200);
      };
      el.onclick = close;

      container.appendChild(el);
      __activeToasts.push(el);

      // Не больше 3 тостов одновременно — старые уходят раньше срока
      while (__activeToasts.length > 3) {
        const oldest = __activeToasts.shift();
        oldest.classList.add('toast-hide');
        setTimeout(() => oldest.remove(), 200);
      }

      setTimeout(close, 4000);
    }

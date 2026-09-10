// Wordle Duo — проверка ПИН-кода доступа через экран-заглушку #pin-gate вместо prompt(). Подключается ПЕРВЫМ.
// Разметка #pin-gate стоит в начале body, выше этого скрипта, поэтому getElementById безопасен сразу.

    // 1. ПРОВЕРКА ПИН-КОДА
    const SECRET_PIN = "15130711";
    const __pinAlreadyOk = localStorage.getItem('wordle_pin_ok') === '1';

    if (__pinAlreadyOk) {
      document.getElementById('pin-gate').classList.add('hidden');
    } else {
      // ПИН ещё не подтверждён в этом браузере: блокируем остальные скрипты (как раньше при неверном ПИНе),
      // до успешного ввода и перезагрузки страницы — так порядок выполнения скриптов не ломается.
      window.__wordleAccessDenied = true;

      const pinInput = document.getElementById('pin-gate-input');
      const pinError = document.getElementById('pin-gate-error');

      function pinGateSubmit() {
        if (pinInput.value === SECRET_PIN) {
          localStorage.setItem('wordle_pin_ok', '1');
          location.reload();
        } else {
          pinError.innerText = 'Неверный ПИН-код';
          pinInput.value = '';
          pinInput.focus();
        }
      }

      document.getElementById('pin-gate-submit').addEventListener('click', pinGateSubmit);
      pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pinGateSubmit(); });
      pinInput.focus();
    }

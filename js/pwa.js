// Wordle Duo — регистрация service worker (sw.js) и тост об обновлении PWA.
// Путь регистрации относительный ('./sw.js'), т.к. GitHub Pages отдаёт сайт из подпапки /<repo>/.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          // Уже есть версия, ожидающая активации (пришла раньше этой вкладки)
          if (reg.waiting) showPwaUpdateToast(reg.waiting);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              // Показываем тост только если это ОБНОВЛЕНИЕ (уже был активный SW),
              // а не самая первая установка — обновлять тогда нечего
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showPwaUpdateToast(newWorker);
              }
            });
          });
        }).catch(() => {
          // file:// или HTTPS недоступен — молча пропускаем, игра работает и без SW
        });

        let __pwaReloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (__pwaReloading) return;
          __pwaReloading = true;
          location.reload();
        });
      });
    }

    // Тост-приглашение обновиться: клик отправляет новому воркеру команду занять место активного
    function showPwaUpdateToast(worker) {
      showToast('🔄 Доступно обновление · нажмите, чтобы обновить', 'info');
      const toasts = document.querySelectorAll('#toast-container .toast');
      const el = toasts[toasts.length - 1];
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => { worker.postMessage('SKIP_WAITING'); }, { once: true });
      }
    }

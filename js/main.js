// Wordle Duo — инициализация: привязка обработчиков, таймеры, подписка на Firebase. Подключается ПОСЛЕДНИМ.
// Перенесено из index.html без изменений: строки 2752-2807, 2908-2908, 2910-2920, 2922-2957, 3278-3283, 3364-3364, 3367-3375, 3777-3790.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ПЕРЕХОД К ЭКРАНУ СОЗДАНИЯ СЛОВ
    document.getElementById('btn-go-create').addEventListener('click', () => {
      showScreen(screenCreate);
    });

    // Обработчик кнопки перехода к созданию слов
    document.getElementById('btn-submit-words').addEventListener('click', () => {
      const todayISO = new Date().toISOString().slice(0, 10);
      
      // Считаем, сколько слов этот игрок УЖЕ загадал сегодня
      const myWordsToday = Object.values(globalState?.words || {}).filter(w => 
        w.author === myRole && w.date === todayISO
      );

      // Собираем слова, которые игрок вписал в инпуты сейчас
      let wordsToAdd = [];
      let invalidWords = [];
      [1, 2, 3, 4, 5, 6, 7].forEach(i => {
        const val = document.getElementById(`word-in-${i}`).value.trim().toUpperCase().replace(/Ё/g, 'Е');
        if (!val) return;
        if (!/^[А-Я]+$/.test(val)) { invalidWords.push(val + ' (только русские буквы)'); return; }
        // Слово должно быть в словаре, иначе соперник не сможет его ввести/отгадать
        if (!isValidWord(val)) { invalidWords.push(val + ' (нет в словаре)'); return; }
        wordsToAdd.push({ val: val, index: i });
      });

      if (invalidWords.length) {
        alert('Эти слова нельзя загадать:\n• ' + invalidWords.join('\n• ') + '\n\nЗагадывайте только слова из словаря игры.');
        return;
      }

      // Если игрок пытается отправить больше, чем разрешено (всего 7 в день)
      if (myWordsToday.length + wordsToAdd.length > 7) {
        alert(`Лимит исчерпан! Вы уже загадали ${myWordsToday.length} слов(а) сегодня. Можно добавить еще максимум ${7 - myWordsToday.length}.`);
        return;
      }

      // Добавляем слова в базу
      wordsToAdd.forEach(item => {
        const ref = gameRef.child('words').push();
        ref.set({
          id: ref.key, 
          author: myRole, 
          target: myRole === 1 ? 2 : 1,
          secret: item.val, 
          len: item.val.length, 
          status: 'pending', 
          attempts: [],
          date: todayISO // Обязательно сохраняем дату!
        });
        // Очищаем инпуты
        document.getElementById(`word-in-${item.index}`).value = '';
      });
      
      showScreen(screenMenu);
    });

    if (!myRole) document.getElementById('role-modal').classList.remove('hidden');

    // Таймер сезона
    setInterval(() => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diff = nextMonth - now;
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      document.getElementById('season-timer').innerText = `${d}д ${h}ч ${m}м`;
    }, 1000);

    // Слушатель БД и логика сброса месяца
    gameRef.on('value', (snapshot) => {
      let data = snapshot.val();
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${now.getMonth() + 1}`;

      if (!data) {
        data = { rp: {1:0, 2:0}, coins: {1:0, 2:0}, combos: {1:0, 2:0}, score: {1:0, 2:0}, seasonInfo: { lastReset: currentMonthStr } };
        gameRef.set(data);
        // Не возвращаемся, продолжаем рендерить UI с начальными данными
        globalState = data;
        renderUI(data);
        return;
      }

      if (data.seasonInfo?.lastReset !== currentMonthStr) {
        let p1RP = data.rp?.[1] || 0;
        let p2RP = data.rp?.[2] || 0;
        let newCoins = { 1: data.coins?.[1] || 0, 2: data.coins?.[2] || 0 };

        if (p1RP > p2RP) { newCoins[1] += 1500; newCoins[2] += 750; }
        else if (p2RP > p1RP) { newCoins[2] += 1500; newCoins[1] += 750; }
        else { newCoins[1] += 1000; newCoins[2] += 1000; }

        gameRef.update({
          rp: {1:0, 2:0},
          combos: {1:0, 2:0},
          coins: newCoins,
          'seasonInfo/lastReset': currentMonthStr
        });
        // Не возвращаемся, рендерим с обновлёнными данными
      }

      globalState = data;
      renderUI(data);
    });

    // Обновление таймера майнера каждую секунду
    setInterval(() => {
      if (!screenMiner.classList.contains('hidden') && myRole) {
        renderMiner();
      }
    }, 1000);

    // МАГАЗИН И ПОКУПКИ

    document.getElementById('btn-go-shop').addEventListener('click', () => {
      renderShop();
      showScreen(screenShop);
    });

    document.getElementById('btn-go-stats').addEventListener('click', () => {
      showScreen(screenStats);
      showPlayerStats(currentStatsPlayer); // Показываем статистику выбранного игрока
    });

    // ---- Клавиатура и ввод (буквы можно ставить в любую позицию) ----
    document.addEventListener('keydown', (e) => {
      if (screenGame.classList.contains('hidden') || !activeWordId) return;
      const k = e.key.toUpperCase();
      if (k === 'ENTER') handleInput('ENTER');
      else if (k === 'BACKSPACE') handleInput('BACKSPACE');
      else if (/^[А-ЯЁ]$/.test(k)) handleInput(k === 'Ё' ? 'Е' : k);
    });

    document.getElementById('keyboard').addEventListener('click', (e) => {
      const btn = e.target.closest('.key');
      if (!btn || btn.classList.contains('disabled')) return;
      handleInput(btn.dataset.key);
    });

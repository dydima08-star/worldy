// Wordle Duo — список доступных слов, очистка устаревших и логика Слова дня.
// Перенесено из index.html без изменений: строки 3286-3362.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // СЛОВА И ИГРА
    function renderWords(wordsObj) {
      const list = document.getElementById('pending-words-list');
      list.innerHTML = '';
      
      const todayISO = new Date().toISOString().slice(0, 10);

      // ОЧИСТКА СТАРЫХ СЛОВ (И системы, и игроков)
      for (const key in wordsObj) {
        const w = wordsObj[key];
        
        // Флаг для старого системного слова
        let isOldSystem = w.id && w.id.startsWith('daily_') && !w.id.includes(todayISO);
        // Флаг для старого слова от игрока (если дата есть, но она не сегодняшняя)
        let isOldPlayer = w.date && w.date !== todayISO;

        if (isOldSystem || isOldPlayer) {
          db.ref(`wordle_season_v1/words/${key}`).remove(); // Удаляем из БД
          // Подсказки кейсов привязаны к wordId — иначе caseHints рос бы вечно
          db.ref(`wordle_season_v1/caseHints/1/${key}`).remove();
          db.ref(`wordle_season_v1/caseHints/2/${key}`).remove();
          delete wordsObj[key]; // Удаляем из локального объекта, чтобы не рендерилось
        }
      }

      const arr = Object.values(wordsObj).filter(w => w.status === 'pending' && w.target === myRole);
      
      if(arr.length === 0) list.innerHTML = '<p style="text-align:center; color:#777; padding:10px;">Нет активных слов от соперника</p>';
      arr.forEach(w => {
        const card = document.createElement('div');
        card.className = 'word-card';
        card.innerHTML = `<div><b>Слово от ${w.author === 'Система' ? 'Системы 📅' : playerName(w.author)}</b><br><small>Длина: ${w.len} букв</small></div> <button style="width:auto; margin:0; padding:6px 12px;">Играть</button>`;
        card.onclick = () => startWord(w.id);
        list.appendChild(card);
      });
    }

    // ЛОГИКА "СЛОВО ДНЯ"
    function startDailyWord() {
      if (!myRole) {
        document.getElementById('role-modal').classList.remove('hidden');
        return;
      }
      const todayStr = new Date().toISOString().slice(0, 10);
      const dayIndex = Math.abs(hashCode(todayStr)) % DAILY_POOL.length;
      const secretWord = DAILY_POOL[dayIndex].toUpperCase();
      const dailyWordId = `daily_${todayStr}_p${myRole}`;

      const wordRef = db.ref(`wordle_season_v1/words/${dailyWordId}`);
      wordRef.once('value', (snap) => {
        const wordData = snap.val() || {
          id: dailyWordId,
          author: 'Система',
          target: myRole,
          secret: secretWord,
          len: secretWord.length,
          status: 'pending',
          attempts: []
        };
        
        if (!snap.exists()) {
          wordRef.set(wordData);
        }

        if (!globalState) globalState = { words: {} };
        if (!globalState.words) globalState.words = {};
        globalState.words[dailyWordId] = wordData;

        startWord(dailyWordId);
      });
    }

    function hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }

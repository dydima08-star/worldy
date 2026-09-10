// Wordle Duo — экран статистики игрока: ранг, победы/поражения, распределение по попыткам.
// Перенесено из index.html без изменений: строки 4072-4072, 4075-4213.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= СТАТИСТИКА ИГРОКА =================

    // Фильтр «Всё время / Этот сезон» — сезон совпадает с календарным месяцем сброса сезона (main.js)
    function setStatsFilter(filterType, btnEl) {
      statsFilter = filterType;
      document.querySelectorAll('#screen-stats .shop-tab-btn').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      showPlayerStats(currentStatsPlayer);
    }

    function showPlayerStats(playerNum) {
      currentStatsPlayer = playerNum;

      // Обновляем кнопки переключателя
      document.getElementById('stats-btn-p1').innerText = `${playerAvatar(1)} ${playerName(1)}`;
      document.getElementById('stats-btn-p1').style.background = playerNum === 1 ? 'var(--accent-color)' : '#272729';
      document.getElementById('stats-btn-p1').style.color = playerNum === 1 ? 'white' : '#aaa';
      document.getElementById('stats-btn-p1').style.border = playerNum === 1 ? 'none' : '1px solid var(--border-color)';

      document.getElementById('stats-btn-p2').innerText = `${playerAvatar(2)} ${playerName(2)}`;
      document.getElementById('stats-btn-p2').style.background = playerNum === 2 ? 'var(--accent-color)' : '#272729';
      document.getElementById('stats-btn-p2').style.color = playerNum === 2 ? 'white' : '#aaa';
      document.getElementById('stats-btn-p2').style.border = playerNum === 2 ? 'none' : '1px solid var(--border-color)';

      // Проверяем наличие globalState
      if (!globalState) {
        document.getElementById('stats-container').innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">Загрузка данных...</div>';
        return;
      }

      // Собираем статистику: постоянная история (history) + сегодняшние completed-слова,
      // которые чистка ещё не удалила и которые ещё не попали в историю (слияние по id слова)
      const historyEntries = globalState.history?.[playerNum] || {};
      const mergedWords = {};
      Object.entries(historyEntries).forEach(([id, h]) => { mergedWords[id] = h; });
      Object.entries(globalState.words || {}).forEach(([id, w]) => {
        if (w.target === playerNum && w.status === 'completed' && !mergedWords[id]) {
          mergedWords[id] = { len: w.len, attempts: (w.attempts || []).length, win: isSolved(w), date: w.date, author: w.author };
        }
      });
      const playerWords = Object.values(mergedWords).filter(w => {
        if (statsFilter !== 'season') return true;
        if (!w.date) return false;
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return w.date.slice(0, 7) === curMonth;
      });

      const wins = playerWords.filter(w => w.win).length;

      const losses = playerWords.length - wins;
      const winRate = playerWords.length > 0 ? Math.round((wins / playerWords.length) * 100) : 0;

      // Распределение по попыткам
      const attemptsDistribution = [0, 0, 0, 0, 0, 0, 0, 0]; // 1-8 попыток
      playerWords.forEach(w => {
        if (w.win && w.attempts >= 1 && w.attempts <= 8) {
          attemptsDistribution[w.attempts - 1]++;
        }
      });

      // Средняя длина слова
      const avgLength = playerWords.length > 0
        ? (playerWords.reduce((sum, w) => sum + (w.len || 0), 0) / playerWords.length).toFixed(1)
        : 0;

      // Текущий ранг
      const playerRP = globalState.rp?.[playerNum] || 0;
      const rank = getRankByRP(playerRP);

      // Рекорд комбо (максимальное комбо за сезон - нужно хранить в БД)
      const maxCombo = globalState.maxCombo?.[playerNum] || (globalState.combos?.[playerNum] || 0);

      // Рендерим статистику
      const container = document.getElementById('stats-container');
      container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 3rem; margin-bottom: 5px;">${rank.icon}</div>
          <div style="font-size: 1.3rem; font-weight: bold; color: ${rank.color};">${rank.name}</div>
          <div style="font-size: 0.85rem; color: #888; margin-top: 3px;">${playerRP} RP</div>
          ${rank.maxRP !== Infinity ? `<div style="font-size: 0.75rem; color: #666;">До ${RANKS[RANKS.indexOf(rank) + 1].name}: ${RANKS[RANKS.indexOf(rank) + 1].minRP - playerRP} RP</div>` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div style="background: #272729; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #2ecc71;">${wins}</div>
            <div style="font-size: 0.8rem; color: #aaa;">Победы</div>
          </div>
          <div style="background: #272729; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #e74c3c;">${losses}</div>
            <div style="font-size: 0.8rem; color: #aaa;">Поражения</div>
          </div>
        </div>

        <div style="background: #272729; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 0.85rem; color: #aaa;">Процент побед</span>
            <span style="font-size: 0.9rem; font-weight: bold; color: ${winRate >= 70 ? '#2ecc71' : winRate >= 50 ? '#f39c12' : '#e74c3c'};">${winRate}%</span>
          </div>
          <div style="width: 100%; height: 8px; background: #1a1a1b; border-radius: 4px; overflow: hidden;">
            <div style="width: ${winRate}%; height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60); transition: width 0.3s;"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 15px;">
          <div style="background: #272729; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: #4ab8e2;">${playerWords.length}</div>
            <div style="font-size: 0.75rem; color: #aaa;">Всего игр</div>
          </div>
          <div style="background: #272729; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: #9b59b6;">${avgLength}</div>
            <div style="font-size: 0.75rem; color: #aaa;">Ср. длина</div>
          </div>
          <div style="background: #272729; padding: 10px; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.3rem; font-weight: bold; color: #ff9f43;">${maxCombo}/5</div>
            <div style="font-size: 0.75rem; color: #aaa;">Рекорд комбо</div>
          </div>
        </div>

        <div style="background: #272729; padding: 12px; border-radius: 8px;">
          <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; color: #fff;">📈 Распределение побед по попыткам</div>
          ${attemptsDistribution.map((count, i) => {
            const maxCount = Math.max(...attemptsDistribution);
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return `
              <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <div style="width: 25px; font-size: 0.8rem; color: #aaa;">${i + 1}</div>
                <div style="flex: 1; height: 20px; background: #1a1a1b; border-radius: 4px; overflow: hidden; margin: 0 8px;">
                  <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #4ab8e2, #357abd); display: flex; align-items: center; justify-content: flex-end; padding-right: 5px;">
                    ${count > 0 ? `<span style="font-size: 0.75rem; color: #fff; font-weight: bold;">${count}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Обновляем видимость и текст кнопки подарка
      const giftBtn = document.getElementById('btn-gift-coins');

      // Показываем кнопку только если смотрим на соперника
      if (playerNum !== myRole) {
        giftBtn.style.display = 'block';
        giftBtn.innerHTML = `🎁 Подарить монеты ${playerName(playerNum)}`;
      } else {
        giftBtn.style.display = 'none';
      }
    }

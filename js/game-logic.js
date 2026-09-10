// Wordle Duo — правила игры: попытки, стартовые эффекты улучшений, запуск слова, отправка попытки и подсчёт наград.
// Перенесено из index.html без изменений: строки 3670-3670, 3673-3695, 3697-3775, 3838-3850, 3986-4070.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= ИГРОВОЙ ПРОЦЕСС =================


    function getMaxAttempts() {
      let base = MAX_ATTEMPTS;
      if (isActiveById('perm_extra_step')) base += 1;
      if (isActiveById('week_all_in')) base += 1;
      base += sessionExtraAttempts;
      return base;
    }

    // Игра завершена? (отгадано или закончились попытки)
    function isSolved(w) {
      const s = w.secret.toUpperCase();
      return (w.attempts || []).some(a => String(a).toUpperCase() === s);
    }
    function isGameOver(w) {
      return w.status === 'completed' || isSolved(w) || (w.attempts || []).length >= getMaxAttempts();
    }

    function pickRandom(arr, n) {
      const copy = arr.slice(); const out = [];
      while (n-- > 0 && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
      return out;
    }

    // Стартовые эффекты активных улучшений
    function computeStartEffects(wordObj) {
      const eff = { greenIdx: new Set(), greenRandom: 0, orange: 0, vowel: false, gray: 0 };
      const A = id => isActiveById(id);
      const len = wordObj.len;
      const addIdx = i => { if (i < len) eff.greenIdx.add(i); };
      if (A('perm_pos1')) addIdx(0);
      if (A('perm_pos2')) addIdx(1);
      if (A('perm_pos3')) addIdx(2);
      if (A('day_pos4')) addIdx(3);
      if (A('day_pos5')) addIdx(4);
      if (A('day_long_start') && len >= 7) addIdx(0);
      if (A('perm_orange1')) eff.orange += 1;
      if (A('perm_orange2')) eff.orange += 2;
      if (A('day_orange_boom')) eff.orange += 3;
      if (A('week_erudit')) { eff.orange += 1; eff.gray += 1; }
      if (A('week_all_in')) { eff.orange += 1; eff.gray += 1; }
      if (A('perm_vowel_detect')) eff.vowel = true;
      if (A('perm_gray1')) eff.gray += 1;
      if (A('perm_gray2')) eff.gray += 2;
      if (A('perm_gray3')) eff.gray += 3;
      if (A('day_radar4')) eff.gray += 4;
      if (A('week_long_scanner') && len >= 6) eff.gray += 2;
      return eff;
    }

    function applyStartEffects(wordObj) {
      const secret = wordObj.secret.toUpperCase();
      const len = wordObj.len;
      const eff = computeStartEffects(wordObj);

      eff.greenIdx.forEach(i => { sessionGreens[i] = secret[i]; });
      const freeIdx = [];
      for (let i = 0; i < len; i++) if (!(i in sessionGreens)) freeIdx.push(i);
      pickRandom(freeIdx, eff.greenRandom).forEach(i => { sessionGreens[i] = secret[i]; });

      const greenLetters = new Set(Object.values(sessionGreens));
      let candidates = [...new Set(secret.split(''))].filter(l => !greenLetters.has(l));
      if (eff.vowel) {
        const v = candidates.filter(l => VOWELS.includes(l));
        if (v.length) { const p = pickRandom(v, 1)[0]; sessionPresent.push(p); candidates = candidates.filter(l => l !== p); }
      }
      pickRandom(candidates, eff.orange).forEach(l => sessionPresent.push(l));

      // Редкий подбор: буквы Ъ, Ь, Э подсвечиваются автоматически, если есть в слове
      if (isActiveById('perm_rare_detect')) {
        ['Ъ', 'Ь', 'Э'].forEach(l => { if (secret.includes(l) && !sessionPresent.includes(l) && !greenLetters.has(l)) sessionPresent.push(l); });
      }

      const notInWord = RUS_ALPHABET.filter(l => !secret.includes(l));
      sessionRemoved = pickRandom(notInWord, eff.gray);

      // Чистый лист: буквы Ъ, Ь убираются с клавиатуры, если их нет в слове
      if (isActiveById('day_clean_sheet')) {
        ['Ъ', 'Ь'].forEach(l => { if (!secret.includes(l) && !sessionRemoved.includes(l)) sessionRemoved.push(l); });
      }
    }

    function startWord(id) {
      activeWordId = id;
      const wObj = globalState.words[id];
      sessionGreens = {}; sessionPresent = []; sessionRemoved = []; sessionExtraAttempts = 0;
      selectedIndex = 0;
      applyStartEffects(wObj);
      currentGuess = buildGuessTemplate(wObj.len);   // открытые буквы подставлены, но их можно стереть/заменить
      selectedIndex = firstEmpty(wObj.len);
      const msgEl = document.getElementById('game-status-msg');
      msgEl.dataset.base = '';
      msgEl.style.color = 'var(--accent-color)';
      msgEl.innerText = isGameOver(wObj)
        ? '✅ Это слово уже сыграно'
        : (wObj.author === 'Система' ? '📅 Слово дня' : `Слово от Игрока ${wObj.author} (${wObj.len} букв)`);
      showScreen(screenGame);
      renderConsumableBar();
      renderBoard();
    }

    // Шаблон текущей попытки: клетки всегда пустые.
    // Известные зелёные буквы показываются только как подсказка (подсветка позиции + панель подсказок),
    // но НЕ подставляются в клетку — игрок вводит их сам.
    function buildGuessTemplate(len) {
      return Array(len).fill('');
    }
    function firstEmpty(len) { for (let i = 0; i < len; i++) if (!currentGuess[i]) return i; return len - 1; }
    function nextEmpty(from, len) {
      for (let i = from; i < len; i++) if (!currentGuess[i]) return i;
      for (let i = 0; i < len; i++) if (!currentGuess[i]) return i;
      return Math.min(from, len - 1);
    }

    function trySubmit() {
      const wordObj = globalState.words[activeWordId];
      if (isGameOver(wordObj)) return;
      const guess = currentGuess.join('').toUpperCase();
      const secret = wordObj.secret.toUpperCase();
      if (guess !== secret && !isValidWord(guess)) {
        showGameMsg('❌ Нет такого слова в словаре');
        const grid = document.getElementById('grid');
        grid.classList.remove('shake'); void grid.offsetWidth; grid.classList.add('shake');
        return;
      }
      submitAttempt(guess);
    }

    function submitAttempt(guess) {
      const wordObj = globalState.words[activeWordId];
      const attempts = wordObj.attempts || [];
      attempts.push(guess);
      wordObj.attempts = attempts;   // фиксируем локально, чтобы сразу заблокировать повторный ввод
      const maxAtt = getMaxAttempts();

      const isWin = guess === wordObj.secret.toUpperCase();
      const isLose = !isWin && attempts.length >= maxAtt;

      if (isWin || isLose) wordObj.status = 'completed';

      currentGuess = buildGuessTemplate(wordObj.len);
      selectedIndex = firstEmpty(wordObj.len);

      if (isWin || isLose) {
        let rpChange = 0, coinsEarned = 0, pointsEarned = 0;
        let newCombo = globalState.combos?.[myRole] || 0;
        let shieldUsedToday = false;

        if (isWin) {
          const baseRP = wordObj.len * 60;
          const attemptMults = [1.8, 1.4, 1.2, 0.9, 0.7, 0.5, 0.4, 0.3];
          const mult = attemptMults[Math.min(attempts.length - 1, attemptMults.length - 1)];
          newCombo = Math.min(5, newCombo + 1);
          const comboMults = [1.0, 1.15, 1.3, 1.45, 1.7];
          const cMult = comboMults[Math.max(0, newCombo - 1)];
          rpChange = Math.round(baseRP * mult * cMult);

          const rew = rewardEffects();
          // Монеты за отгаданное слово НЕ начисляются — монеты добываются только обменом очков.
          coinsEarned = 0;

          let boostMult = 1.0;
          const activeBoost = globalState?.boosts?.[myRole];
          if (activeBoost && activeBoost.until > getNow()) boostMult = activeBoost.mult;
          pointsEarned = Math.round(rpChange * boostMult * rew.pointMult);
          if (isActiveById('week_giant_hunter') && wordObj.len >= 7) pointsEarned *= 2;
        } else {
          // Штраф за поражение с учётом улучшений магазина
          let penalty = 300;
          if (isActiveById('day_zero_risk') || isActiveById('week_credit')) penalty = 0;
          rpChange = -penalty; pointsEarned = 0; coinsEarned = 0;

          const today = getToday();
          const shielded = (isActiveById('perm_combo_shield') || isActiveById('week_immunity')) && globalState?.comboShield?.[myRole] !== today;
          if (shielded) { shieldUsedToday = today; }
          else if (isActiveById('week_combo_freeze')) { newCombo = Math.max(2, newCombo); } // комбо не падает ниже 2/5
          else { newCombo = 0; }
        }

        const oldRP = globalState.rp?.[myRole] || 0;
        const newRP = Math.max(0, oldRP + rpChange);
        const oldScore = globalState.score?.[myRole] || 0;
        const newScore = Math.max(0, oldScore + pointsEarned);
        const newCoins = (globalState.coins?.[myRole] || 0) + coinsEarned;

        const updates = {
          [`wordle_season_v1/rp/${myRole}`]: newRP,
          [`wordle_season_v1/score/${myRole}`]: newScore,
          [`wordle_season_v1/coins/${myRole}`]: newCoins,
          [`wordle_season_v1/combos/${myRole}`]: newCombo,
          [`wordle_season_v1/words/${activeWordId}/status`]: 'completed',
          [`wordle_season_v1/words/${activeWordId}/attempts`]: attempts,
          [`wordle_season_v1/history/${wordObj.target}/${activeWordId}`]: {
            len: wordObj.len,
            attempts: attempts.length,
            win: isWin,
            date: wordObj.date || new Date().toISOString().slice(0, 10),
            author: wordObj.author
          }
        };
        if (shieldUsedToday) updates[`wordle_season_v1/comboShield/${myRole}`] = shieldUsedToday;
        db.ref().update(updates);

        document.getElementById('result-title').innerText = isWin ? '🎉 Победа!' : '❌ Поражение!';
        document.getElementById('result-desc').innerHTML =
          `Слово было: <b>${wordObj.secret}</b><br><br>` +
          `Рейтинг: <b>${rpChange > 0 ? '+' + rpChange : rpChange} RP</b><br>` +
          `Очки: <b>+${pointsEarned} 🎯</b><br>` +
          `🔥 Комбо: <b>${newCombo}/5</b><br>` +
          `<span style="font-size:0.8rem;color:#888;">Монеты добываются обменом очков в магазине 💱</span>`;
        document.getElementById('result-modal').classList.remove('hidden');
        renderBoard();
      } else {
        db.ref(`wordle_season_v1/words/${activeWordId}/attempts`).set(attempts);
        renderBoard();
      }
    }
    function closeResult() {
      document.getElementById('result-modal').classList.add('hidden');
      activeWordId = null;
      showScreen(screenMenu);
    }

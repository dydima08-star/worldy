// Wordle Duo — отрисовка игрового поля, подсветка клавиатуры и панель подсказок.
// Перенесено из index.html без изменений: строки 3912-3984.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    function renderHintBar() {
      const bar = document.getElementById('game-hint-bar');
      const parts = [];
      const greens = Object.keys(sessionGreens).map(Number).sort((a, b) => a - b);
      if (greens.length) parts.push('🟩 Открыто: ' + greens.map(i => `<b>${i + 1}-я = ${sessionGreens[i]}</b>`).join(', '));
      if (sessionPresent.length) parts.push('🟧 Есть в слове: <b>' + [...new Set(sessionPresent)].join(', ') + '</b>');
      if (sessionRemoved.length) parts.push('⛔ Убрано с клавиатуры букв: <b>' + sessionRemoved.length + '</b>');
      const extra = getMaxAttempts() - MAX_ATTEMPTS;
      if (extra > 0) parts.push('➕ Доп. попыток: <b>' + extra + '</b>');
      if (parts.length) { bar.innerHTML = parts.join('<br>'); bar.classList.remove('hidden'); }
      else bar.classList.add('hidden');
    }

    function renderBoard() {
      const wordObj = globalState.words[activeWordId];
      const grid = document.getElementById('grid');
      const len = wordObj.len;
      const maxAtt = getMaxAttempts();
      grid.innerHTML = '';
      grid.style.setProperty('--cols', len);
      grid.style.gridTemplateColumns = '';   // размер и колонки задаются в CSS через --cols

      const attempts = wordObj.attempts || [];
      const keyStates = {};
      Object.values(sessionGreens).forEach(l => keyStates[l] = 'correct');
      sessionPresent.forEach(l => { if (keyStates[l] !== 'correct') keyStates[l] = 'present'; });

      const secret = wordObj.secret.toUpperCase();
      const over = isGameOver(wordObj);
      const curRow = over ? -1 : attempts.length;   // после отгадывания активной строки нет — ввод закрыт

      for (let r = 0; r < maxAtt; r++) {
        let statuses = Array(len).fill('absent');
        let guessLetters = [];
        if (attempts[r]) {
          guessLetters = attempts[r].split('');
          let t = secret.split('');
          for (let i = 0; i < len; i++) { if (guessLetters[i] === t[i]) { statuses[i] = 'correct'; t[i] = null; } }
          for (let i = 0; i < len; i++) { if (statuses[i] === 'correct') continue; const ti = t.indexOf(guessLetters[i]); if (ti !== -1) { statuses[i] = 'present'; t[ti] = null; } }
        }
        for (let c = 0; c < len; c++) {
          const tile = document.createElement('div');
          tile.className = 'tile';
          if (attempts[r]) {
            const l = guessLetters[c]; tile.innerText = l; tile.dataset.state = statuses[c];
            if (statuses[c] === 'correct') keyStates[l] = 'correct';
            else if (statuses[c] === 'present') { if (keyStates[l] !== 'correct') keyStates[l] = 'present'; }
            else { if (keyStates[l] !== 'correct' && keyStates[l] !== 'present') keyStates[l] = 'absent'; }
          } else if (r === curRow) {
            const l = currentGuess[c] || '';
            tile.innerText = l;
            if (l) tile.classList.add('cur-filled');
            else if (c in sessionGreens) tile.classList.add('green-hint'); // пустая клетка с известной зелёной буквой: только подсветка
            if (c === selectedIndex) tile.classList.add('selected');
            tile.style.cursor = 'pointer';
            tile.onclick = () => selectCell(c);
          }
          grid.appendChild(tile);
        }
      }

      document.querySelectorAll('.key').forEach(btn => {
        const k = btn.dataset.key;
        btn.removeAttribute('data-state');
        btn.classList.remove('disabled');
        if (sessionRemoved.includes(k)) { btn.classList.add('disabled'); btn.dataset.state = 'absent'; }
        else if (keyStates[k]) btn.dataset.state = keyStates[k];
      });

      renderHintBar();
    }

// Wordle Duo — обработка ввода букв: вставка в любую позицию, выбор клетки, всплывающие сообщения.
// Перенесено из index.html без изменений: строки 3792-3836.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    function handleInput(key) {
      const wordObj = globalState.words[activeWordId];
      if (isGameOver(wordObj)) return;   // слово уже отгадано/закончено — ввод заблокирован
      const len = wordObj.len;

      if (key === 'ENTER') {
        if (currentGuess.every(Boolean)) trySubmit();
        else showGameMsg('Заполните все клетки!');
        return;
      }
      if (key === 'BACKSPACE') {
        if (currentGuess[selectedIndex]) { currentGuess[selectedIndex] = ''; }
        else {
          let i = selectedIndex - 1;
          while (i >= 0 && !currentGuess[i]) i--;
          if (i >= 0) { currentGuess[i] = ''; selectedIndex = i; }
        }
        renderBoard();
        return;
      }
      if (sessionRemoved.includes(key)) return;
      if (selectedIndex < len) {
        currentGuess[selectedIndex] = key;                 // можно перезаписать даже открытую зелёную букву
        selectedIndex = nextEmpty(selectedIndex + 1, len);
      }
      renderBoard();
    }

    function selectCell(i) {
      const wordObj = globalState.words[activeWordId];
      if (isGameOver(wordObj)) return;
      selectedIndex = i; renderBoard();
    }

    function showGameMsg(msg) {
      const el = document.getElementById('game-status-msg');
      if (!el.dataset.base) el.dataset.base = el.innerText;
      el.style.color = 'var(--rp-color)';
      el.innerText = msg;
      clearTimeout(window.__msgT);
      window.__msgT = setTimeout(() => {
        el.style.color = 'var(--accent-color)';
        el.innerText = el.dataset.base; el.dataset.base = '';
      }, 1600);
    }

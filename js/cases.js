// Wordle Duo — кейсы с буквами: бесплатный суточный барабан прямо в игровом экране.
// 2 кейса в сутки на всё, независимо от слова. Результат пишется в базу СРАЗУ,
// до анимации — в отличие от колеса фортуны (js/bonus.js), где приз можно потерять,
// закрыв вкладку до конца setTimeout. Подсказки переживают перезагрузку (caseHints/{role}/{wordId}).

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    let isCaseSpinning = false;
    let caseReelTimer = null;

    // ================= ЛИМИТ И СОСТОЯНИЕ =================

    function casesUsedToday() {
      const c = globalState?.cases?.[myRole];
      if (!c || c.date !== getToday()) return 0;
      return c.used || 0;
    }

    function casesLeft() {
      return Math.max(0, DAILY_CASES - casesUsedToday());
    }

    // ================= ПУЛ БУКВ =================

    // Буквы, которые игрок уже знает по этому слову: открытые кейсом/бустерами зелёные,
    // оранжевые подсказки, убранные серые, плюс все буквы из уже сыгранных попыток.
    function knownLetters(wordObj) {
      const known = new Set();
      Object.values(sessionGreens).forEach(l => known.add(l));
      sessionPresent.forEach(l => known.add(l));
      sessionRemoved.forEach(l => known.add(l));
      (wordObj.attempts || []).forEach(a => String(a).toUpperCase().split('').forEach(l => known.add(l)));
      return known;
    }

    function casePool(wordObj) {
      const known = knownLetters(wordObj);
      return CASE_ALPHABET.filter(l => !known.has(l));
    }

    // ================= РОЗЫГРЫШ (чистая функция, без UI и без записи в БД) =================

    // Возвращает массив 1-3 объектов {letter, kind: 'correct'|'present'|'absent', idx?}.
    // idx задан только для kind === 'correct' — конкретная открытая позиция.
    function rollCase(wordObj) {
      const secret = wordObj.secret.toUpperCase();
      const len = wordObj.len;
      const pool = casePool(wordObj);
      const drops = [];
      const openedIdx = new Set(Object.keys(sessionGreens).map(Number));

      for (let spin = 0; spin < CASE_MAX_SPINS; spin++) {
        if (spin > 0 && Math.random() >= CASE_EXTRA_SPIN_CHANCE) break;
        if (!pool.length) break;

        const li = Math.floor(Math.random() * pool.length);
        const letter = pool.splice(li, 1)[0];

        if (!secret.includes(letter)) {
          drops.push({ letter, kind: 'absent' });
          continue;
        }

        if (Math.random() < CASE_GREEN_CHANCE) {
          const freeIdx = [];
          for (let i = 0; i < len; i++) if (secret[i] === letter && !openedIdx.has(i)) freeIdx.push(i);
          if (freeIdx.length) {
            const idx = freeIdx[Math.floor(Math.random() * freeIdx.length)];
            openedIdx.add(idx);
            drops.push({ letter, kind: 'correct', idx });
            continue;
          }
          // Все вхождения этой буквы уже открыты зелёным — падаем на оранжевую подсказку.
        }
        drops.push({ letter, kind: 'present' });
      }

      return drops;
    }

    // ================= ПРИМЕНЕНИЕ К СЕССИОННОМУ СОСТОЯНИЮ =================

    function applyCaseDrops(drops) {
      drops.forEach(d => {
        if (d.kind === 'correct') sessionGreens[d.idx] = d.letter;
        else if (d.kind === 'present') { if (!sessionPresent.includes(d.letter)) sessionPresent.push(d.letter); }
        else { if (!sessionRemoved.includes(d.letter)) sessionRemoved.push(d.letter); }
      });
      renderBoard();
    }

    // Восстанавливает подсказки кейса из БД — вызывается из startWord() после applyStartEffects(),
    // чтобы буквы, открытые кейсом, переживали перезагрузку страницы (в отличие от бустерных).
    function applyCaseHints(wordId, wordObj) {
      const saved = globalState?.caseHints?.[myRole]?.[wordId];
      if (!saved) return;
      Object.entries(saved.greens || {}).forEach(([idx, letter]) => { sessionGreens[Number(idx)] = letter; });
      Object.keys(saved.present || {}).forEach(l => { if (!sessionPresent.includes(l)) sessionPresent.push(l); });
      Object.keys(saved.gray || {}).forEach(l => { if (!sessionRemoved.includes(l)) sessionRemoved.push(l); });
    }

    // Сливает новые дропы в уже сохранённый узел caseHints/{role}/{wordId} (для одного update()).
    function mergeCaseHintsPatch(wordId, drops) {
      const saved = globalState?.caseHints?.[myRole]?.[wordId] || {};
      const greens = Object.assign({}, saved.greens);
      const present = Object.assign({}, saved.present);
      const gray = Object.assign({}, saved.gray);
      drops.forEach(d => {
        if (d.kind === 'correct') greens[d.idx] = d.letter;
        else if (d.kind === 'present') present[d.letter] = true;
        else gray[d.letter] = true;
      });
      return { greens, present, gray };
    }

    // ================= МОДАЛКА =================

    function renderCaseBar() {
      const bar = document.getElementById('case-bar');
      if (!bar) return;
      const wordObj = globalState?.words?.[activeWordId];
      if (!wordObj || isGameOver(wordObj)) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      const left = casesLeft();
      const btn = document.getElementById('btn-open-case');
      if (left > 0) {
        btn.disabled = false;
        btn.classList.remove('disabled');
        btn.innerText = `🎁 Кейс (${left})`;
      } else {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.innerText = '🎁 Кейсы: 0 · завтра';
      }
    }

    function openCaseModal() {
      const wordObj = globalState?.words?.[activeWordId];
      if (!wordObj || isGameOver(wordObj)) { showToast('Слово уже сыграно', 'warn'); return; }
      if (casesLeft() <= 0) { showToast('Кейсы закончатся до завтра', 'warn'); return; }
      if (!casePool(wordObj).length) { showToast('Все буквы этого слова уже открыты', 'info'); return; }

      document.getElementById('case-modal').classList.remove('hidden');
      document.getElementById('case-result').innerHTML = '';
      document.getElementById('case-result').classList.add('hidden');
      document.getElementById('case-reel').innerHTML = '';
      document.getElementById('case-status').innerText = `Осталось кейсов сегодня: ${casesLeft()}`;
      document.getElementById('btn-case-spin').classList.remove('hidden');
      document.getElementById('btn-case-spin').disabled = false;
    }

    function closeCaseModal() {
      if (isCaseSpinning) return; // не даём закрыть модалку посреди анимации
      clearTimeout(caseReelTimer);
      document.getElementById('case-modal').classList.add('hidden');
    }

    // Один "прокрут" барабана: летящая лента букв, которая тормозит на итоговой букве.
    // Сдвиг считаем от РЕАЛЬНОЙ ширины окошка, чтобы буква-победитель вставала точно
    // по центру под стрелкой-указателем, а не у левого края (окошко может быть уже 260px
    // на узких экранах, поэтому ширину нельзя зашивать константой).
    function animateReel(letter, onDone) {
      const reel = document.getElementById('case-reel');
      const windowEl = reel.parentElement; // .case-reel-window
      const ITEM_W = 44;
      const strip = [];
      for (let i = 0; i < 24; i++) strip.push(CASE_ALPHABET[Math.floor(Math.random() * CASE_ALPHABET.length)]);
      strip.push(letter);
      reel.innerHTML = strip.map(l => `<span>${l}</span>`).join('');
      reel.style.transition = 'none';
      reel.style.transform = 'translateX(0)';
      void reel.offsetWidth;

      const winnerCenter = (strip.length - 1) * ITEM_W + ITEM_W / 2;
      const targetX = windowEl.clientWidth / 2 - winnerCenter;

      requestAnimationFrame(() => {
        reel.style.transition = 'transform 1.1s cubic-bezier(0.12, 0.75, 0.2, 1)';
        reel.style.transform = `translateX(${targetX}px)`;
      });
      caseReelTimer = setTimeout(onDone, 1200);
    }

    // Своя копия анимации конфетти колеса (js/bonus.js:fireConfetti) — на отдельном контейнере
    // #case-confetti, т.к. id должны быть уникальны на странице.
    function fireCaseConfetti() {
      const box = document.getElementById('case-confetti');
      const colors = ['#6AAA64', '#ffd700', '#4ab8e2', '#ffffff'];
      box.innerHTML = '';
      for (let i = 0; i < 28; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = (Math.random() * 0.25) + 's';
        p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
        box.appendChild(p);
      }
      setTimeout(() => { box.innerHTML = ''; }, 1800);
    }

    function dropCardHtml(d) {
      const label = d.kind === 'correct' ? `${d.idx + 1}-я позиция` : (d.kind === 'present' ? 'есть в слове' : 'нет в слове');
      return `<div class="case-drop-card" data-state="${d.kind}"><b>${d.letter}</b><span>${label}</span></div>`;
    }

    function spinCase() {
      if (isCaseSpinning) return;
      const wordObj = globalState?.words?.[activeWordId];
      if (!wordObj || isGameOver(wordObj)) return;
      if (casesLeft() <= 0) return; // дублируем проверку лимита — против вызова из консоли в обход кнопки

      const drops = rollCase(wordObj);
      if (!drops.length) { showToast('Все буквы этого слова уже открыты', 'info'); return; }

      isCaseSpinning = true;
      document.getElementById('btn-case-spin').disabled = true;
      document.getElementById('case-status').innerText = '🎰 Крутим...';
      document.getElementById('case-result').classList.add('hidden');
      document.getElementById('case-result').innerHTML = '';

      // Запись в БД сразу, до анимации: если вкладка закроется посреди прокрута, результат не потеряется.
      const usedToday = casesUsedToday();
      const hintsPatch = mergeCaseHintsPatch(activeWordId, drops);
      const updates = {
        [`wordle_season_v1/cases/${myRole}`]: { date: getToday(), used: usedToday + 1 },
        [`wordle_season_v1/caseHints/${myRole}/${activeWordId}`]: hintsPatch
      };
      if (drops.length >= 3) updates[`wordle_season_v1/caseJackpot/${myRole}`] = true; // для достижения "Джекпот"
      db.ref().update(updates);

      const cards = [];
      const playNext = (i) => {
        if (i >= drops.length) {
          applyCaseDrops(drops);
          renderCaseBar();
          document.getElementById('case-status').innerHTML = '<span style="color:#6AAA64;">🎉 Готово!</span>';
          document.getElementById('case-result').innerHTML = cards.join('');
          document.getElementById('case-result').classList.remove('hidden');
          document.getElementById('btn-case-spin').classList.add('hidden');
          if (drops.length >= 3) fireCaseConfetti();
          isCaseSpinning = false;
          checkAchievements();
          return;
        }
        animateReel(drops[i].letter, () => {
          cards.push(dropCardHtml(drops[i]));
          playNext(i + 1);
        });
      };
      playNext(0);
    }

// Wordle Duo — режим «♾️ Марафон»: 20 уровней в день, слова всё длиннее и реже.
// Сброс в 00:00 по местному времени. Один проигрыш — марафон на сегодня окончен,
// но очки за уже пройденные уровни остаются (начисляются сразу после каждого уровня).
// Настройки уровней и наград — MARATHON_LEVELS в config.js, слова — js/marathon-words.js.
//
// Данные в БД: wordle_season_v1/marathon/{роль} = {
//   date:   'YYYY-MM-DD' (местная дата забега),
//   level:  текущий уровень 1..20 (после финала — 21),
//   status: 'playing' | 'failed' | 'done',
//   earned: очки 🎯, заработанные в сегодняшнем забеге,
//   best:   рекорд — максимальный пройденный уровень за всё время,
//   word:   { level, secret, len, attempts[], status, author, target } — слово текущего уровня
// }
// Игровой экран общий с обычными словами: на время уровня activeWordId = MARATHON_WORD_ID,
// а getActiveWord() (game-logic.js) отдаёт marathon/{роль}/word вместо words/{id}.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    const MARATHON_TOTAL = MARATHON_LEVELS.length;

    // ================= ДАТА И СЛОВО ДНЯ =================

    // Местная дата (а не UTC, как у getToday): марафон обновляется ровно в 00:00 у игрока.
    // Время берём серверное (getNow), чтобы перевод часов не давал лишний забег.
    function marathonToday() {
      const d = new Date(getNow());
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function marathonDayNumber(dateStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    }

    // Слово уровня на конкретный день. У обоих игроков в один день одинаковые слова —
    // так честно сравнивать, кто прошёл дальше. Списки перемешаны заранее, поэтому
    // сдвиг на номер дня даёт новое слово каждый день без повторов внутри уровня.
    function marathonSecretFor(dateStr, level) {
      const list = MARATHON_WORDS[level - 1];
      const day = marathonDayNumber(dateStr);
      return list[((day % list.length) + list.length) % list.length];
    }

    function makeMarathonWord(dateStr, level) {
      const secret = marathonSecretFor(dateStr, level);
      return { level, secret, len: secret.length, attempts: [], status: 'pending', author: 'Марафон', target: myRole };
    }

    // ================= СОСТОЯНИЕ =================

    // Сырое состояние из БД (может быть вчерашним)
    function marathonRaw(role) {
      return globalState?.marathon?.[role] || null;
    }

    // Состояние на сегодня: если забег вчерашний или его не было — «чистый» забег (в БД пока не пишем).
    function marathonState(role) {
      const raw = marathonRaw(role);
      const today = marathonToday();
      if (raw && raw.date === today) return raw;
      return { date: today, level: 1, status: 'new', earned: 0, best: raw?.best || 0, word: null };
    }

    // Слово текущего уровня — для getActiveWord()
    function marathonActiveWord() {
      return marathonRaw(myRole)?.word || null;
    }

    function marathonLevelCfg(level) {
      return MARATHON_LEVELS[Math.min(Math.max(level, 1), MARATHON_TOTAL) - 1];
    }

    function lettersWord(n) {
      const m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return 'буква';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'буквы';
      return 'букв';
    }

    // ================= ЗАПУСК УРОВНЯ =================

    function openMarathon() {
      if (!myRole) {
        document.getElementById('role-modal').classList.remove('hidden');
        return;
      }
      showScreen(screenMarathon);
      renderMarathon();
    }

    function startMarathon() {
      if (!myRole || !globalState) return;
      const today = marathonToday();
      const raw = marathonRaw(myRole);
      const ref = db.ref(`wordle_season_v1/marathon/${myRole}`);
      let st;

      if (!raw || raw.date !== today) {
        // Новый день — новый забег с 1-го уровня, рекорд сохраняем
        st = { date: today, level: 1, status: 'playing', earned: 0, best: raw?.best || 0, word: makeMarathonWord(today, 1) };
        ref.set(st);
      } else {
        st = raw;
        if (st.status !== 'playing') { renderMarathon(); return; }
        // Предыдущий уровень пройден — выдаём слово следующего
        if (!st.word || st.word.level !== st.level) {
          st.word = makeMarathonWord(st.date, st.level);
          ref.child('word').set(st.word);
        }
      }

      // Кладём в локальное состояние сразу, не дожидаясь снапшота из БД
      if (!globalState.marathon) globalState.marathon = {};
      globalState.marathon[myRole] = st;

      startWord(MARATHON_WORD_ID);
    }

    // Следующий уровень прямо из модалки результата
    function marathonNext() {
      document.getElementById('result-modal').classList.add('hidden');
      document.getElementById('result-next-btn').classList.add('hidden');
      startMarathon();
    }

    // Заголовок над полем во время уровня
    function marathonStatusLine(wordObj) {
      const cfg = marathonLevelCfg(wordObj.level);
      return `♾️ Марафон · уровень ${wordObj.level}/${MARATHON_TOTAL} · ${wordObj.len} ${lettersWord(wordObj.len)}, ${cfg.tier} · +${cfg.reward} 🎯`;
    }

    // ================= ПОПЫТКА И ИТОГ УРОВНЯ =================

    // Вызывается из submitAttempt() вместо обычного подсчёта наград.
    // RP, комбо и history не трогаем: марафон — отдельный режим со своими очками.
    function marathonSubmit(wordObj, attempts, isWin, isLose) {
      const base = `wordle_season_v1/marathon/${myRole}`;

      if (!isWin && !isLose) {
        db.ref(`${base}/word/attempts`).set(attempts);
        renderBoard();
        return;
      }

      const st = marathonRaw(myRole);
      const level = wordObj.level;
      const cfg = marathonLevelCfg(level);
      const updates = {
        [`${base}/word/attempts`]: attempts,
        [`${base}/word/status`]: 'completed'
      };

      let reward = 0;
      let isFinal = false;
      if (isWin) {
        reward = cfg.reward;
        isFinal = level >= MARATHON_TOTAL;
        const newScore = (globalState.score?.[myRole] || 0) + reward;
        updates[`wordle_season_v1/score/${myRole}`] = newScore;
        updates[`${base}/earned`] = (st?.earned || 0) + reward;
        updates[`${base}/level`] = level + 1;
        updates[`${base}/best`] = Math.max(st?.best || 0, level);
        if (isFinal) updates[`${base}/status`] = 'done';
      } else {
        updates[`${base}/status`] = 'failed';
      }
      db.ref().update(updates);

      const earnedTotal = (st?.earned || 0) + reward;
      const nextBtn = document.getElementById('result-next-btn');
      if (isWin && !isFinal) {
        const next = marathonLevelCfg(level + 1);
        document.getElementById('result-title').innerText = `✅ Уровень ${level} пройден!`;
        document.getElementById('result-desc').innerHTML =
          `Слово было: <b>${wordObj.secret}</b><br><br>` +
          `Награда: <b>+${reward} 🎯</b><br>` +
          `За сегодня: <b>${earnedTotal} 🎯</b><br><br>` +
          `Дальше — уровень ${level + 1}: ${next.len} ${lettersWord(next.len)}, ${next.tier}, +${next.reward} 🎯`;
        nextBtn.innerText = `▶️ Уровень ${level + 1}`;
        nextBtn.classList.remove('hidden');
      } else if (isWin) {
        document.getElementById('result-title').innerText = '🏆 Марафон пройден!';
        document.getElementById('result-desc').innerHTML =
          `Все ${MARATHON_TOTAL} уровней за день!<br>Последнее слово: <b>${wordObj.secret}</b><br><br>` +
          `Награда: <b>+${reward} 🎯</b><br>` +
          `За сегодня: <b>${earnedTotal} 🎯</b>`;
        nextBtn.classList.add('hidden');
        showToast('🏆 Марафон пройден целиком!', 'ok');
      } else {
        document.getElementById('result-title').innerText = '❌ Марафон окончен';
        document.getElementById('result-desc').innerHTML =
          `Слово было: <b>${wordObj.secret}</b><br><br>` +
          `Пройдено уровней: <b>${level - 1}/${MARATHON_TOTAL}</b><br>` +
          `Заработано сегодня: <b>${earnedTotal} 🎯</b><br><br>` +
          `<span style="font-size:0.8rem;color:#888;">Новый марафон — завтра в 00:00</span>`;
        nextBtn.classList.add('hidden');
      }
      document.getElementById('result-close-btn').innerText = '♾️ К марафону';
      document.getElementById('result-modal').classList.remove('hidden');
      renderBoard();
      renderCaseBar();
    }

    // ================= ЭКРАН МАРАФОНА =================

    function msToMidnight() {
      const now = new Date(getNow());
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return midnight - now;
    }

    function formatCountdown(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    // Короткое описание чужого/своего забега для строки «Соперник сегодня»
    function marathonSummary(st) {
      if (st.status === 'new') return 'ещё не начинал(а)';
      const cleared = st.status === 'done' ? MARATHON_TOTAL : st.level - 1;
      if (st.status === 'done') return `🏆 прошёл(а) все ${MARATHON_TOTAL} уровней`;
      if (st.status === 'failed') return `остановился(ась) на уровне ${st.level} · пройдено ${cleared}`;
      return `в процессе · пройдено ${cleared}`;
    }

    function renderMarathon() {
      const box = document.getElementById('marathon-body');
      if (!box || !myRole) return;
      if (!globalState) { box.innerHTML = '<p style="text-align:center;color:#888;">Загрузка...</p>'; return; }

      const st = marathonState(myRole);
      const opp = myRole === 1 ? 2 : 1;
      const oppSt = marathonState(opp);
      const cleared = st.status === 'done' ? MARATHON_TOTAL : st.level - 1;

      // Статус и главная кнопка
      let statusHtml, btnHtml;
      if (st.status === 'new') {
        statusHtml = 'Сегодняшний марафон ещё не начат. 20 уровней — от лёгких слов из 4 букв до редких длинных.';
        btnHtml = '<button class="gold marathon-go" onclick="startMarathon()">▶️ Начать марафон</button>';
      } else if (st.status === 'playing') {
        statusHtml = `Пройдено: <b>${cleared}/${MARATHON_TOTAL}</b> · заработано <b>${st.earned || 0} 🎯</b>`;
        const inProgress = st.word && st.word.level === st.level && (st.word.attempts || []).length > 0;
        btnHtml = `<button class="gold marathon-go" onclick="startMarathon()">▶️ ${inProgress ? 'Продолжить' : 'Играть'}: уровень ${st.level}</button>`;
      } else {
        const title = st.status === 'done' ? '🏆 Все уровни пройдены!' : `❌ Остановка на уровне ${st.level}`;
        statusHtml = `${title}<br>Заработано сегодня: <b>${st.earned || 0} 🎯</b>`;
        btnHtml = `<button class="gold marathon-go disabled" disabled>Новый марафон через <span id="marathon-countdown">${formatCountdown(msToMidnight())}</span></button>`;
      }

      // Лестница уровней
      const rows = MARATHON_LEVELS.map((cfg, i) => {
        const lvl = i + 1;
        let cls = 'locked', icon = '🔒';
        if (lvl <= cleared) { cls = 'passed'; icon = '✅'; }
        else if (lvl === st.level && st.status === 'failed') { cls = 'failed'; icon = '❌'; }
        else if (lvl === st.level && (st.status === 'playing' || st.status === 'new')) { cls = 'current'; icon = '▶️'; }
        return `<div class="marathon-row ${cls}">
          <span class="marathon-lvl">${icon} ${lvl}</span>
          <span class="marathon-desc">${cfg.len} ${lettersWord(cfg.len)} · ${cfg.tier}</span>
          <span class="marathon-reward">+${cfg.reward} 🎯</span>
        </div>`;
      }).join('');

      box.innerHTML = `
        <div class="marathon-status">${statusHtml}</div>
        ${btnHtml}
        <div class="marathon-meta">
          <div>🏅 Ваш рекорд: <b>${st.best ? 'уровень ' + st.best : '—'}</b></div>
          <div>${playerAvatar(opp)} ${playerName(opp)} сегодня: <b>${marathonSummary(oppSt)}</b></div>
          <div style="color:#888;">Рекорд соперника: ${oppSt.best ? 'уровень ' + oppSt.best : '—'}</div>
        </div>
        <div class="marathon-ladder">${rows}</div>
        <p class="marathon-rules">6 попыток на слово, улучшения из магазина работают. Проиграл уровень — марафон на сегодня окончен,
        но очки за пройденные уровни остаются. Обновление каждый день в 00:00. RP и комбо марафон не меняет.</p>`;
    }

    // Обратный отсчёт до полуночи на экране марафона; в полночь экран сам «открывает» новый забег
    let __marathonLastDay = null;
    setInterval(() => {
      if (!screenMarathon || screenMarathon.classList.contains('hidden')) return;
      const today = marathonToday();
      if (__marathonLastDay && __marathonLastDay !== today) renderMarathon();
      __marathonLastDay = today;
      const el = document.getElementById('marathon-countdown');
      if (el) el.innerText = formatCountdown(msToMidnight());
    }, 1000);

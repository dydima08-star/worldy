// Wordle Duo — ежедневный бонус: три сундука, открыть можно один.
// Представление переписано на сундуки (было: колесо фортуны).
// Экономика (DAILY_REWARDS, pickWeightedReward, lastSpin, начисление) не изменена:
// приз выбирается по тем же шансам в момент выбора сундука, какой именно сундук
// нажат — не влияет. Два других сундука показывают «что могло быть» (только картинка).

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    const CHEST_COUNT = 3;
    let bonusTimerId = null;

    // Как приз выглядит на открытом сундуке
    function prizeFace(r) {
      if (r.type === 'boost') return { tier: 'boost', icon: '⚡', val: `×${r.val}`, sub: 'буст на 24ч' };
      const tier = r.val >= 2000 ? 'jackpot' : r.val >= 1000 ? 'epic' : r.val >= 500 ? 'rare' : r.val >= 250 ? 'uncommon' : 'common';
      return { tier, icon: tier === 'jackpot' ? '💎' : '🎯', val: String(r.val), sub: tier === 'jackpot' ? 'джекпот!' : 'очков' };
    }

    function fillChestBack(chestEl, reward, note) {
      const f = prizeFace(reward);
      const back = chestEl.querySelector('.chest-back');
      back.dataset.tier = f.tier;
      back.innerHTML = `<span class="prize-icon">${f.icon}</span><span class="prize-val">${f.val}</span>` +
                       `<span class="prize-sub">${note || f.sub}</span>`;
    }

    // Призы для невыбранных сундуков: по тем же шансам, но без повторов, чтобы было видно разнообразие
    function pickDecoys(win, n) {
      const used = new Set([win]);
      const out = [];
      for (let k = 0; k < n; k++) {
        const pool = DAILY_REWARDS.filter(r => !used.has(r));
        if (!pool.length) { out.push(DAILY_REWARDS[0]); continue; }
        const total = pool.reduce((a, r) => a + r.chance, 0);
        let rand = Math.random() * total, pick = pool[pool.length - 1];
        for (const r of pool) { rand -= r.chance; if (rand <= 0) { pick = r; break; } }
        used.add(pick); out.push(pick);
      }
      return out;
    }

    function fireConfetti() {
      const box = document.getElementById('confetti');
      const colors = ['#ffd35c', '#ff7ac0', '#5fd4ff', '#b77bff', '#ffffff'];
      box.innerHTML = '';
      for (let i = 0; i < 34; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = (Math.random() * 0.25) + 's';
        p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
        box.appendChild(p);
      }
      setTimeout(() => { box.innerHTML = ''; }, 1800);
    }

    // Таймер до завтра — на серверном времени (getNow), как и остальная экономика бонуса.
    function startBonusTimer() {
      const el = document.getElementById('bonus-timer');
      clearInterval(bonusTimerId);
      const tick = () => {
        const now = new Date(getNow());
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        let s = Math.max(0, Math.floor((next - now) / 1000));
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        el.textContent = `${h}:${m}:${sec}`;
        if (s === 0) clearInterval(bonusTimerId);
      };
      tick();
      bonusTimerId = setInterval(tick, 1000);
    }

    // ЕЖЕДНЕВНЫЙ БОНУС (СУНДУКИ)
    function chestEls() { return [...document.querySelectorAll('#chest-row .chest')]; }

    function openDailyBonus() {
      document.getElementById('bonus-modal').classList.remove('hidden');
      const lastSpinDate = globalState?.lastSpin?.[myRole];
      const todayDate = getToday(); // Формат: YYYY-MM-DD

      const row = document.getElementById('chest-row');
      const timerBox = document.getElementById('bonus-timer-box');
      const statusEl = document.getElementById('bonus-status');
      document.getElementById('bonus-prize').classList.add('hidden');
      document.getElementById('bonus-close-btn').classList.remove('hidden');
      if (isSpinning) return;   // идёт открытие — не сбрасываем анимацию

      chestEls().forEach(c => {
        c.classList.remove('picked', 'open', 'winner', 'missed');
        c.disabled = false;
        c.querySelector('.chest-back').innerHTML = '';
      });

      if (lastSpinDate && lastSpinDate === todayDate) {
        // Бонус уже получен сегодня
        row.classList.add('spent');
        timerBox.classList.remove('hidden');
        startBonusTimer();
        statusEl.innerText = '🔒 Сегодня сундук уже открыт';
      } else {
        row.classList.remove('spent');
        timerBox.classList.add('hidden');
        clearInterval(bonusTimerId);
        statusEl.innerText = 'Выбери один сундук';
      }
    }

    function closeDailyBonus() {
      clearInterval(bonusTimerId);
      document.getElementById('bonus-modal').classList.add('hidden');
    }

    // Взвешенный выбор награды: чем больше значение, тем меньше шанс (см. chance)
    function pickWeightedReward() {
      let rand = Math.random() * 100, cumulative = 0;
      for (let reward of DAILY_REWARDS) {
        cumulative += reward.chance;
        if (rand <= cumulative) return reward;
      }
      return DAILY_REWARDS[0];
    }

    function openChest(i) {
      if (isSpinning || !myRole) return;
      // Дублируем проверку даты здесь: иначе прямой вызов openChest() из консоли
      // (в обход openDailyBonus) начислял бы награду без суточного ограничения.
      const todayDate = getToday(); // Формат: YYYY-MM-DD
      if (globalState?.lastSpin?.[myRole] === todayDate) return;

      const statusEl = document.getElementById('bonus-status');
      const chests = chestEls();
      const picked = chests[i];
      if (!picked) return;

      isSpinning = true;
      chests.forEach(c => { c.disabled = true; });
      document.getElementById('bonus-close-btn').classList.add('hidden');
      statusEl.innerText = '🔑 Открываем...';

      // 1) Приз — по шансам DAILY_REWARDS, и сразу записываем: закрытие окна или
      //    перезагрузка во время анимации не дадут открыть второй сундук.
      const win = pickWeightedReward();
      const updates = { [`wordle_season_v1/lastSpin/${myRole}`]: todayDate };
      if (win.type === 'score') {
        const currentScore = globalState?.score?.[myRole] || 0;
        updates[`wordle_season_v1/score/${myRole}`] = currentScore + win.val;
      } else if (win.type === 'boost') {
        const boostUntil = getNow() + (24 * 60 * 60 * 1000);
        updates[`wordle_season_v1/boosts/${myRole}`] = { mult: win.val, until: boostUntil };
      }
      db.ref().update(updates);

      // 2) Анимация: тряска → переворот выбранного → через паузу открываются остальные
      fillChestBack(picked, win);
      const decoys = pickDecoys(win, CHEST_COUNT - 1);
      chests.filter(c => c !== picked).forEach((c, k) => fillChestBack(c, decoys[k], 'могло быть'));
      picked.classList.add('picked');

      setTimeout(() => {
        picked.classList.remove('picked');
        picked.classList.add('open', 'winner');
        fireConfetti();
        statusEl.innerHTML = win.chance <= 9 ? '🤩 Вот это удача!' : '🎉 Поздравляем!';
      }, 650);

      setTimeout(() => {
        chests.filter(c => c !== picked).forEach(c => c.classList.add('open', 'missed'));
        document.getElementById('bonus-prize-label').innerText = win.label;
        document.getElementById('bonus-prize').classList.remove('hidden');
        isSpinning = false;
      }, 1700);
    }

// Wordle Duo — ежедневный бонус: колесо фортуны и начисление награды.
// Представление переписано на колесо (было: горизонтальная лента-рулетка).
// Экономика (DAILY_REWARDS, pickWeightedReward, lastSpin, начисление) не изменена.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // 8 секторов из 6 призов: два частых приза дублируются (chance НЕ трогаем —
    // он живёт в DAILY_REWARDS, дубли нужны только для картинки колеса).
    const WHEEL_SECTORS = [0, 1, 2, 0, 3, 1, 4, 5]; // индексы в DAILY_REWARDS
    const SECTOR_DEG = 360 / WHEEL_SECTORS.length;   // 45
    const SECTOR_COLORS = ['#1f2a1e', '#2b3a28']; // чередование, тёмно-зелёное
    const SHORT_LABEL = { 100: '100', 250: '250', 500: '500', 1000: '1000',
                          2000: '💎 2000', 1.35: '⚡ x1.35' };

    let bonusTimerId = null;
    let wheelRotation = 0;

    function sectorColor(i, r) {
      if (r.type === 'boost') return '#3a3320';
      if (r.val >= 1000) return '#2f4a2b';
      return SECTOR_COLORS[i % 2];
    }

    // Строит визуальное колесо (цвета секторов + подписи). Вероятности не меняет.
    function buildWheel() {
      const wheel = document.getElementById('wheel');
      const labels = document.getElementById('wheel-labels');
      const stops = WHEEL_SECTORS.map((ri, i) =>
        `${sectorColor(i, DAILY_REWARDS[ri])} ${i * SECTOR_DEG}deg ${(i + 1) * SECTOR_DEG}deg`
      ).join(', ');
      wheel.style.background = `conic-gradient(from -${SECTOR_DEG / 2}deg, ${stops})`;
      labels.innerHTML = '';
      WHEEL_SECTORS.forEach((ri, i) => {
        const el = document.createElement('div');
        el.className = 'wheel-label';
        // подпись по центру сектора, «от центра наружу»
        el.style.transform = `rotate(${i * SECTOR_DEG}deg)`;
        el.innerHTML = `<span>${SHORT_LABEL[DAILY_REWARDS[ri].val] || DAILY_REWARDS[ri].label}</span>`;
        labels.appendChild(el);
      });
    }

    // Стрелка сверху (0deg). Сектор i центрируется под стрелкой при повороте
    // -i*SECTOR_DEG (mod 360) + целые обороты.
    function sectorIndexFor(win) {
      const ri = DAILY_REWARDS.indexOf(win);
      const cands = WHEEL_SECTORS.map((v, i) => v === ri ? i : -1).filter(i => i >= 0);
      return cands[Math.floor(Math.random() * cands.length)];
    }

    function fireConfetti() {
      const box = document.getElementById('confetti');
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

    // ЕЖЕДНЕВНЫЙ БОНУС (КОЛЕСО ФОРТУНЫ)
    function openDailyBonus() {
      document.getElementById('bonus-modal').classList.remove('hidden');
      const lastSpinDate = globalState?.lastSpin?.[myRole];
      const todayDate = getToday(); // Формат: YYYY-MM-DD

      buildWheel();
      const wheelWrap = document.getElementById('wheel-wrap');
      const wheelRotor = document.getElementById('wheel-rotor');
      const timerBox = document.getElementById('bonus-timer-box');
      const prizeBox = document.getElementById('bonus-prize');
      prizeBox.classList.add('hidden');
      wheelRotor.style.transition = 'none';
      wheelRotation = 0;
      wheelRotor.style.transform = 'rotate(0deg)';

      if (lastSpinDate && lastSpinDate === todayDate) {
        // Бонус уже получен сегодня
        wheelWrap.classList.add('spent');
        timerBox.classList.remove('hidden');
        startBonusTimer();
        document.getElementById('bonus-status').innerText = '🎁 Бонус уже получен сегодня';
        document.getElementById('btn-spin').classList.add('hidden');
      } else {
        wheelWrap.classList.remove('spent');
        timerBox.classList.add('hidden');
        clearInterval(bonusTimerId);
        document.getElementById('bonus-status').innerText = '🎁 Испытайте удачу!';
        document.getElementById('btn-spin').classList.remove('hidden');
        document.getElementById('btn-spin').disabled = false;
        document.getElementById('btn-spin').style.opacity = '1';
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

    function spinDailyBonus() {
      if (isSpinning) return;
      // Дублируем проверку даты здесь: иначе прямой вызов spinDailyBonus() из консоли
      // (в обход кнопки/openDailyBonus) начислял бы награду без суточного ограничения.
      const todayDate = getToday(); // Формат: YYYY-MM-DD
      if (globalState?.lastSpin?.[myRole] === todayDate) return;

      const statusEl = document.getElementById('bonus-status');
      const btnSpin = document.getElementById('btn-spin');
      const wheelRotor = document.getElementById('wheel-rotor');

      isSpinning = true;
      btnSpin.disabled = true;
      btnSpin.style.opacity = '0.5';
      statusEl.innerText = '🎰 Крутим колесо...';

      // 1) Определяем выигрыш заранее по шансам
      const win = pickWeightedReward();
      // 2) Находим сектор этого приза на колесе и считаем угол доводки
      const idx = sectorIndexFor(win);
      const jitter = (Math.random() * 2 - 1) * (SECTOR_DEG * 0.32); // не у самой границы
      const turns = 5 + Math.floor(Math.random() * 3);              // 5..7 оборотов
      wheelRotation = turns * 360 - idx * SECTOR_DEG + jitter;

      // 3) Запускаем анимацию вращения с плавным замедлением
      requestAnimationFrame(() => {
        wheelRotor.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.75, 0.2, 1)';
        wheelRotor.style.transform = `rotate(${wheelRotation}deg)`;
      });

      // 4) По завершении — начисляем награду
      setTimeout(() => {
        const updates = { [`wordle_season_v1/lastSpin/${myRole}`]: todayDate };

        if (win.type === 'score') {
          const currentScore = globalState?.score?.[myRole] || 0;
          updates[`wordle_season_v1/score/${myRole}`] = currentScore + win.val;
        } else if (win.type === 'boost') {
          const boostUntil = getNow() + (24 * 60 * 60 * 1000);
          updates[`wordle_season_v1/boosts/${myRole}`] = { mult: win.val, until: boostUntil };
        }
        db.ref().update(updates);

        fireConfetti();
        statusEl.innerHTML = `<span style="color:#6AAA64;">🎉 Поздравляем!</span>`;
        document.getElementById('bonus-prize-label').innerText = win.label;
        document.getElementById('bonus-prize').classList.remove('hidden');
        btnSpin.classList.add('hidden');
        isSpinning = false;
      }, 4400);
    }

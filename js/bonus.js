// Wordle Duo — ежедневный бонус: анимированная рулетка и начисление награды.
// Перенесено из index.html без изменений: строки 3555-3577, 3583-3668.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ЕЖЕДНЕВНЫЙ БОНУС (РУЛЕТКА)
    function openDailyBonus() {
      document.getElementById('bonus-modal').classList.remove('hidden');
      const lastSpinDate = globalState?.lastSpin?.[myRole];
      const todayDate = new Date().toISOString().slice(0, 10); // Формат: YYYY-MM-DD

      resetRoulette();
      if (lastSpinDate && lastSpinDate === todayDate) {
        // Бонус уже получен сегодня
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const hoursLeft = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
        document.getElementById('bonus-status').innerText = `⏳ Следующий бонус через ${hoursLeft} ч.`;
        document.getElementById('btn-spin').disabled = true;
        document.getElementById('btn-spin').style.opacity = '0.5';
      } else {
        document.getElementById('bonus-status').innerText = '🎁 Испытайте удачу!';
        document.getElementById('btn-spin').disabled = false;
        document.getElementById('btn-spin').style.opacity = '1';
      }
    }

    function closeDailyBonus() { document.getElementById('bonus-modal').classList.add('hidden'); }

    // Взвешенный выбор награды: чем больше значение, тем меньше шанс (см. chance)
    function pickWeightedReward() {
      let rand = Math.random() * 100, cumulative = 0;
      for (let reward of DAILY_REWARDS) {
        cumulative += reward.chance;
        if (rand <= cumulative) return reward;
      }
      return DAILY_REWARDS[0];
    }

    function rewardColor(r) { return r.type === 'boost' ? '#ffd700' : (r.val >= 1000 ? '#2ecc71' : '#4ab8e2'); }

    // Заполняет ленту рулетки; возвращает индекс, на котором остановится выигрыш
    function buildRouletteReel(winner) {
      const track = document.getElementById('roulette-track');
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      track.innerHTML = '';
      const total = 48;
      const winIndex = total - 5; // выигрыш ближе к концу ленты
      for (let i = 0; i < total; i++) {
        const r = (i === winIndex) ? winner : DAILY_REWARDS[Math.floor(Math.random() * DAILY_REWARDS.length)];
        const cell = document.createElement('div');
        cell.className = 'roulette-item';
        cell.style.color = rewardColor(r);
        cell.innerText = r.label;
        track.appendChild(cell);
      }
      return winIndex;
    }

    function resetRoulette() {
      const win = pickWeightedReward(); // предпросмотр (не выигрыш) — просто чтобы лента не была пустой
      buildRouletteReel(win);
      // сдвигаем ленту так, чтобы что-то было под указателем
      const track = document.getElementById('roulette-track');
      const winEl = document.getElementById('roulette-window');
      const center = (winEl.clientWidth || 360) / 2;
      track.style.transform = `translateX(${center - ROULETTE_ITEM_W / 2}px)`;
    }

    function spinDailyBonus() {
      if (isSpinning) return;
      // Дублируем проверку даты здесь: иначе прямой вызов spinDailyBonus() из консоли
      // (в обход кнопки/openDailyBonus) начислял бы награду без суточного ограничения.
      const todayDate = new Date().toISOString().slice(0, 10); // Формат: YYYY-MM-DD
      if (globalState?.lastSpin?.[myRole] === todayDate) return;

      const statusEl = document.getElementById('bonus-status');
      const btnSpin = document.getElementById('btn-spin');
      const track = document.getElementById('roulette-track');
      const winEl = document.getElementById('roulette-window');

      isSpinning = true;
      btnSpin.disabled = true;
      btnSpin.style.opacity = '0.5';
      statusEl.innerText = '🎰 Крутим рулетку...';

      // 1) Определяем выигрыш заранее по шансам
      const win = pickWeightedReward();
      // 2) Строим ленту так, чтобы выигрыш оказался под указателем
      const winIndex = buildRouletteReel(win);

      const center = (winEl.clientWidth || 360) / 2;
      // небольшой случайный сдвиг внутри ячейки для реалистичности
      const jitter = (Math.random() * 2 - 1) * (ROULETTE_ITEM_W * 0.3);
      const targetX = -(winIndex * ROULETTE_ITEM_W + ROULETTE_ITEM_W / 2 - center) + jitter;

      // 3) Запускаем анимацию вращения с плавным замедлением
      requestAnimationFrame(() => {
        track.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.75, 0.2, 1)';
        track.style.transform = `translateX(${targetX}px)`;
      });

      // 4) По завершении — начисляем награду
      setTimeout(() => {
        const updates = { [`wordle_season_v1/lastSpin/${myRole}`]: todayDate };

        if (win.type === 'score') {
          const currentScore = globalState?.score?.[myRole] || 0;
          updates[`wordle_season_v1/score/${myRole}`] = currentScore + win.val;
        } else if (win.type === 'boost') {
          const boostUntil = Date.now() + (24 * 60 * 60 * 1000);
          updates[`wordle_season_v1/boosts/${myRole}`] = { mult: win.val, until: boostUntil };
        }
        db.ref().update(updates);

        statusEl.innerHTML = `<span style="color:#2ecc71;">🎉 Поздравляем!</span><br>${win.label}`;
        isSpinning = false;
      }, 4400);
    }

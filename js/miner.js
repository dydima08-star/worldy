// Wordle Duo — майнер монет: статус цикла работа/отдых, покупка, сбор монет, улучшения дохода и батареи.
// Перенесено из index.html без изменений: строки 3005-3276.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= МАЙНЕР МОНЕТ =================
    function renderMiner() {
      if (!myRole) return;
      const minerData = globalState?.miner?.[myRole] || {};
      const myCoins = globalState?.coins?.[myRole] || 0;

      const hasMiner = minerData.purchased === true;
      const earningLevel = minerData.earningLevel || 1;
      const batteryLevel = minerData.batteryLevel || 1;

      document.getElementById('btn-buy-miner').style.display = hasMiner ? 'none' : 'block';
      document.getElementById('btn-collect-miner').style.display = hasMiner ? 'block' : 'none';
      document.getElementById('miner-upgrades-box').style.display = hasMiner ? 'block' : 'none';

      if (!hasMiner) {
        document.getElementById('miner-status-text').innerText = 'Майнер не куплен';
        document.getElementById('miner-earnings').innerText = 'Доход: 0 🪙/час';
        document.getElementById('miner-battery').innerText = 'Батарея: 0ч работы / 0ч отдыха';
        document.getElementById('miner-timer').innerText = '';
        return;
      }

      // Вычисляем текущий доход
      let coinsPerHour = 10;
      if (earningLevel <= 5) {
        coinsPerHour = EARNING_UPGRADES[earningLevel - 1].coinsPerHour;
      } else {
        coinsPerHour = 40 + (earningLevel - 5);
      }

      // Получаем параметры батареи
      const battery = BATTERY_UPGRADES[Math.min(batteryLevel - 1, BATTERY_UPGRADES.length - 1)];
      const workMs = battery.workHours * 60 * 60 * 1000;
      const restMs = battery.restHours * 60 * 60 * 1000;

      const now = getNow();
      const startTime = minerData.cycleStartTime || now;
      const accumulated = minerData.accumulatedCoins || 0;
      const lastCollect = minerData.lastCollectTime || now;

      // Определяем текущую фазу цикла
      const elapsed = now - startTime;
      let isWorking = false;
      let timeLeft = 0;

      if (elapsed < workMs) {
        // Фаза работы
        isWorking = true;
        timeLeft = workMs - elapsed;
        // База начисления — момент последнего сбора, а не начало цикла, иначе «Накоплено»
        // показывает то, что уже выплачено.
        const base = Math.max(startTime, lastCollect);
        const workElapsed = Math.max(0, now - base);
        const newAccumulated = Math.floor((workElapsed / (60 * 60 * 1000)) * coinsPerHour);

        document.getElementById('miner-status-text').innerText = '⚡ Майнер работает';
        document.getElementById('miner-status-text').style.color = '#2ecc71';
        document.getElementById('miner-earnings').innerText = `Накоплено: ${newAccumulated} 🪙 (${coinsPerHour} 🪙/час)`;
      } else if (elapsed < workMs + restMs) {
        // Фаза отдыха
        isWorking = false;
        timeLeft = workMs + restMs - elapsed;

        document.getElementById('miner-status-text').innerText = '💤 Майнер отдыхает';
        document.getElementById('miner-status-text').style.color = '#e74c3c';
        document.getElementById('miner-earnings').innerText = `Доход: ${coinsPerHour} 🪙/час`;
      } else {
        // Цикл завершён, начинаем новый
        db.ref(`wordle_season_v1/miner/${myRole}/cycleStartTime`).set(now);
        db.ref(`wordle_season_v1/miner/${myRole}/accumulatedCoins`).set(0);
        db.ref(`wordle_season_v1/miner/${myRole}/lastCollectTime`).set(now);
        renderMiner();
        return;
      }

      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const mins = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      const secs = Math.floor((timeLeft % (60 * 1000)) / 1000);

      if (isWorking) {
        document.getElementById('miner-timer').innerText = `⏳ До отдыха: ${hours}ч ${mins}м ${secs}с`;
      } else {
        document.getElementById('miner-timer').innerText = `⏳ До работы: ${hours}ч ${mins}м ${secs}с`;
      }

      document.getElementById('miner-battery').innerText = `🔋 Батарея: ${battery.workHours}ч работы / ${battery.restHours}ч отдыха`;

      // Рендерим улучшения
      renderEarningUpgrades(earningLevel, myCoins, coinsPerHour);
      renderBatteryUpgrades(batteryLevel, myCoins, battery);
    }

    function renderEarningUpgrades(currentLevel, myCoins, currentEarning) {
      const container = document.getElementById('earning-upgrades');
      container.innerHTML = '';

      for (let level = currentLevel + 1; level <= currentLevel + 3; level++) {
        let upgrade;
        if (level <= 5) {
          upgrade = EARNING_UPGRADES[level - 1];
        } else {
          const extraCoins = level - 5;
          upgrade = {
            level: level,
            coinsPerHour: 40 + extraCoins,
            price: 55000 + (extraCoins * 10000)
          };
        }

        const canAfford = myCoins >= upgrade.price;
        const card = document.createElement('div');
        card.style.cssText = 'background:#272729;border:1px solid #2ecc71;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
        card.innerHTML = `
          <div>
            <div style="font-weight:bold;color:#fff;">💰 Уровень ${upgrade.level}</div>
            <div style="font-size:0.8rem;color:#aaa;">${currentEarning} → ${upgrade.coinsPerHour} 🪙/час</div>
          </div>
          <button onclick="upgradeMinerEarning(${upgrade.level})" style="padding:8px 12px;background:${canAfford ? '#2ecc71' : '#555'};color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:${canAfford ? 'pointer' : 'not-allowed'};" ${!canAfford ? 'disabled' : ''}>
            ${upgrade.price.toLocaleString()} 🪙
          </button>
        `;
        container.appendChild(card);
      }
    }

    function renderBatteryUpgrades(currentLevel, myCoins, currentBattery) {
      const container = document.getElementById('battery-upgrades');
      container.innerHTML = '';

      if (currentLevel >= BATTERY_UPGRADES.length) {
        container.innerHTML = '<p style="text-align:center;color:#2ecc71;padding:10px;">✅ Максимальный уровень батареи достигнут!</p>';
        return;
      }

      for (let level = currentLevel + 1; level <= Math.min(currentLevel + 2, BATTERY_UPGRADES.length); level++) {
        const upgrade = BATTERY_UPGRADES[level - 1];
        const canAfford = myCoins >= upgrade.price;

        const card = document.createElement('div');
        card.style.cssText = 'background:#272729;border:1px solid #f39c12;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
        card.innerHTML = `
          <div>
            <div style="font-weight:bold;color:#fff;">🔋 Уровень ${upgrade.level}</div>
            <div style="font-size:0.8rem;color:#aaa;">${currentBattery.workHours}ч/${currentBattery.restHours}ч → ${upgrade.workHours}ч/${upgrade.restHours}ч</div>
          </div>
          <button onclick="upgradeMinerBattery(${upgrade.level})" style="padding:8px 12px;background:${canAfford ? '#f39c12' : '#555'};color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:${canAfford ? 'pointer' : 'not-allowed'};" ${!canAfford ? 'disabled' : ''}>
            ${upgrade.price.toLocaleString()} 🪙
          </button>
        `;
        container.appendChild(card);
      }
    }

    function buyMiner() {
      if (!myRole) return;
      const myCoins = globalState?.coins?.[myRole] || 0;
      if (myCoins < MINER_COST) {
        showToast(`Недостаточно монет! Требуется ${MINER_COST.toLocaleString()} 🪙`, 'err');
        return;
      }

      const now = getNow();
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins - MINER_COST,
        [`wordle_season_v1/miner/${myRole}/purchased`]: true,
        [`wordle_season_v1/miner/${myRole}/earningLevel`]: 1,
        [`wordle_season_v1/miner/${myRole}/batteryLevel`]: 1,
        [`wordle_season_v1/miner/${myRole}/cycleStartTime`]: now,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: 0,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: now
      });
      showToast('✅ Майнер успешно куплен! Он начал работу.', 'ok');
    }

    function collectMinerCoins() {
      if (!myRole) return;
      const minerData = globalState?.miner?.[myRole] || {};
      if (!minerData.purchased) return;

      const earningLevel = minerData.earningLevel || 1;
      let coinsPerHour = 10;
      if (earningLevel <= 5) {
        coinsPerHour = EARNING_UPGRADES[earningLevel - 1].coinsPerHour;
      } else {
        coinsPerHour = 40 + (earningLevel - 5);
      }

      const batteryLevel = minerData.batteryLevel || 1;
      const battery = BATTERY_UPGRADES[Math.min(batteryLevel - 1, BATTERY_UPGRADES.length - 1)];
      const workMs = battery.workHours * 60 * 60 * 1000;

      const now = getNow();
      const startTime = minerData.cycleStartTime || now;
      const lastCollectTime = minerData.lastCollectTime || 0;
      const elapsed = now - startTime;

      if (elapsed >= workMs) {
        showToast('⚠️ Майнер сейчас отдыхает! Подождите, пока он снова начнёт работать.', 'warn');
        return;
      }

      // Начисляем только за период с последнего сбора (не с начала цикла) и не дальше конца
      // рабочей фазы — иначе повторные нажатия «Забрать» выплачивали бы один период заново.
      const base = Math.max(startTime, lastCollectTime);
      const cappedNow = Math.min(now, startTime + workMs);
      const workElapsed = Math.max(0, cappedNow - base);
      const accumulated = Math.floor((workElapsed / (60 * 60 * 1000)) * coinsPerHour);

      if (accumulated === 0) {
        showToast('⚠️ Майнер ещё не накопил монеты. Подождите немного!', 'warn');
        return;
      }

      const myCoins = globalState?.coins?.[myRole] || 0;
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins + accumulated,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: 0,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: cappedNow
      });

      showToast(`✅ Собрано ${accumulated} 🪙 с майнера!`, 'ok');
    }

    function upgradeMinerEarning(targetLevel) {
      if (!myRole) return;
      const minerData = globalState?.miner?.[myRole] || {};
      const currentLevel = minerData.earningLevel || 1;

      if (targetLevel !== currentLevel + 1) return;

      let upgrade;
      if (targetLevel <= 5) {
        upgrade = EARNING_UPGRADES[targetLevel - 1];
      } else {
        const extraCoins = targetLevel - 5;
        upgrade = {
          level: targetLevel,
          coinsPerHour: 40 + extraCoins,
          price: 55000 + (extraCoins * 10000)
        };
      }

      const myCoins = globalState?.coins?.[myRole] || 0;
      if (myCoins < upgrade.price) {
        showToast(`Недостаточно монет! Требуется ${upgrade.price.toLocaleString()} 🪙`, 'err');
        return;
      }

      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins - upgrade.price,
        [`wordle_season_v1/miner/${myRole}/earningLevel`]: targetLevel
      });

      showToast(`✅ Доход майнера улучшен до ${upgrade.coinsPerHour} 🪙/час!`, 'ok');
    }

    function upgradeMinerBattery(targetLevel) {
      if (!myRole) return;
      const minerData = globalState?.miner?.[myRole] || {};
      const currentLevel = minerData.batteryLevel || 1;

      if (targetLevel !== currentLevel + 1 || targetLevel > BATTERY_UPGRADES.length) return;

      const upgrade = BATTERY_UPGRADES[targetLevel - 1];
      const myCoins = globalState?.coins?.[myRole] || 0;

      if (myCoins < upgrade.price) {
        showToast(`Недостаточно монет! Требуется ${upgrade.price.toLocaleString()} 🪙`, 'err');
        return;
      }

      const now = getNow();
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins - upgrade.price,
        [`wordle_season_v1/miner/${myRole}/batteryLevel`]: targetLevel,
        [`wordle_season_v1/miner/${myRole}/cycleStartTime`]: now,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: 0,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: now
      });

      showToast(`✅ Батарея улучшена! Теперь ${upgrade.workHours}ч работы / ${upgrade.restHours}ч отдыха.`, 'ok');
    }

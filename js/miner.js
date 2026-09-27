// Wordle Duo — майнер монет: статус цикла работа/отдых, покупка, сбор монет, улучшения дохода и батареи.
// Циклы идут сами по времени, монеты копятся без захода в игру (см. minerState).

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= МАЙНЕР МОНЕТ =================
    // Циклы «работа → отдых» идут сами по часам от cycleStartTime — заходить и запускать не нужно.
    // Монеты за все рабочие фазы копятся и не сгорают; забрать можно в любой момент, и во время отдыха.
    //   miner/{роль}/cycleStartTime   — начало отсчёта циклов (покупка или смена батареи)
    //   miner/{роль}/lastCollectTime  — до какого момента доход уже учтён
    //   miner/{роль}/accumulatedCoins — «копилка»: учтённые, но ещё не забранные монеты
    //                                   (дробные — сюда откладывается доход при смене уровня дохода)

    const HOUR_MS = 60 * 60 * 1000;

    // Уровень дохода: 1–5 из таблицы, дальше без предела (+2 🪙/ч, цена растёт на 1000)
    function minerEarningUpgrade(level) {
      if (level <= EARNING_UPGRADES.length) return EARNING_UPGRADES[level - 1];
      const extra = level - EARNING_UPGRADES.length;
      return {
        level,
        coinsPerHour: EARNING_UPGRADES[EARNING_UPGRADES.length - 1].coinsPerHour + extra * MINER_EXTRA_RATE,
        price: MINER_EXTRA_PRICE_START + (extra - 1) * MINER_EXTRA_PRICE_STEP
      };
    }

    function minerRate(level) { return minerEarningUpgrade(level).coinsPerHour; }

    function minerBattery(level) {
      return BATTERY_UPGRADES[Math.min(level - 1, BATTERY_UPGRADES.length - 1)];
    }

    // Сколько мс майнер проработал от начала циклов (anchor) до момента t
    function minerWorkedMs(anchor, t, workMs, restMs) {
      const d = Math.max(0, t - anchor);
      const period = workMs + restMs;
      if (restMs <= 0) return d;
      return Math.floor(d / period) * workMs + Math.min(d % period, workMs);
    }

    // Текущее состояние майнера: фаза, время до смены фазы, накоплено (дробное)
    function minerState(m, now) {
      const rate = minerRate(m.earningLevel || 1);
      const battery = minerBattery(m.batteryLevel || 1);
      const workMs = battery.workHours * HOUR_MS;
      const restMs = battery.restHours * HOUR_MS;
      const anchor = m.cycleStartTime || now;
      const from = Math.max(anchor, m.lastCollectTime || anchor);

      const worked = minerWorkedMs(anchor, now, workMs, restMs) - minerWorkedMs(anchor, from, workMs, restMs);
      const pending = (Number(m.accumulatedCoins) || 0) + worked / HOUR_MS * rate;

      const period = workMs + restMs;
      const pos = Math.max(0, now - anchor) % period;
      const alwaysOn = restMs <= 0;
      const isWorking = alwaysOn || pos < workMs;
      const timeLeft = alwaysOn ? 0 : (isWorking ? workMs - pos : period - pos);
      return { rate, battery, pending, isWorking, alwaysOn, timeLeft };
    }

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

      const st = minerState(minerData, getNow());
      const statusEl = document.getElementById('miner-status-text');
      statusEl.innerText = st.isWorking ? '⚡ Майнер работает' : '💤 Майнер отдыхает';
      statusEl.style.color = st.isWorking ? '#2ecc71' : '#ff8fa3';
      document.getElementById('miner-earnings').innerHTML =
        `Накоплено: <b style="color:#ffd35c;">${Math.floor(st.pending)} 🪙</b> · доход ${st.rate} 🪙/час`;

      const h = Math.floor(st.timeLeft / HOUR_MS);
      const mnt = Math.floor((st.timeLeft % HOUR_MS) / 60000);
      const sec = Math.floor((st.timeLeft % 60000) / 1000);
      document.getElementById('miner-timer').innerText = st.alwaysOn
        ? '♾️ Работает без отдыха'
        : `⏳ ${st.isWorking ? 'До отдыха' : 'До работы'}: ${h}ч ${mnt}м ${sec}с`;

      document.getElementById('miner-battery').innerText = `🔋 Батарея: ${st.battery.workHours}ч работы / ${st.battery.restHours}ч отдыха`;
      document.getElementById('btn-collect-miner').innerText = `Забрать ${Math.floor(st.pending)} 🪙`;

      // Рендерим улучшения
      renderEarningUpgrades(earningLevel, myCoins, st.rate);
      renderBatteryUpgrades(batteryLevel, myCoins, st.battery);
    }

    function renderEarningUpgrades(currentLevel, myCoins, currentEarning) {
      const container = document.getElementById('earning-upgrades');
      container.innerHTML = '';

      for (let level = currentLevel + 1; level <= currentLevel + 3; level++) {
        const upgrade = minerEarningUpgrade(level);

        const canAfford = myCoins >= upgrade.price;
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--surface-2);border:1px solid #2ecc71;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
        card.innerHTML = `
          <div>
            <div style="font-weight:bold;color:#fff;">💰 Уровень ${upgrade.level}</div>
            <div style="font-size:0.8rem;color:#aaa;">${currentEarning} → ${upgrade.coinsPerHour} 🪙/час</div>
          </div>
          <button onclick="upgradeMinerEarning(${upgrade.level})" style="width:auto;margin:0 0 0 10px;flex-shrink:0;padding:8px 12px;background:${canAfford ? '#2ecc71' : '#555'};color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:${canAfford ? 'pointer' : 'not-allowed'};" ${!canAfford ? 'disabled' : ''}>
            ${upgrade.price.toLocaleString('ru-RU')} 🪙
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
        card.style.cssText = 'background:var(--surface-2);border:1px solid #f39c12;border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
        card.innerHTML = `
          <div>
            <div style="font-weight:bold;color:#fff;">🔋 Уровень ${upgrade.level}</div>
            <div style="font-size:0.8rem;color:#aaa;">${currentBattery.workHours}ч/${currentBattery.restHours}ч → ${upgrade.workHours}ч/${upgrade.restHours}ч</div>
          </div>
          <button onclick="upgradeMinerBattery(${upgrade.level})" style="width:auto;margin:0 0 0 10px;flex-shrink:0;padding:8px 12px;background:${canAfford ? '#f39c12' : '#555'};color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:${canAfford ? 'pointer' : 'not-allowed'};" ${!canAfford ? 'disabled' : ''}>
            ${upgrade.price.toLocaleString('ru-RU')} 🪙
          </button>
        `;
        container.appendChild(card);
      }
    }

    function buyMiner() {
      if (!myRole) return;
      const myCoins = globalState?.coins?.[myRole] || 0;
      if (myCoins < MINER_COST) {
        showToast(`Недостаточно монет! Требуется ${MINER_COST.toLocaleString('ru-RU')} 🪙`, 'err');
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

    // Забрать накопленное — в любой момент, в т.ч. во время отдыха. Дробный остаток остаётся в копилке.
    // Возвращает, сколько целых монет забрано (0 — нечего забирать).
    function collectMinerCoins(silent) {
      if (!myRole) return 0;
      const minerData = globalState?.miner?.[myRole] || {};
      if (!minerData.purchased) return 0;

      const now = getNow();
      const { pending } = minerState(minerData, now);
      const whole = Math.floor(pending);

      if (whole <= 0) {
        if (!silent) showToast('⚠️ Майнер ещё не накопил монеты. Загляните чуть позже!', 'warn');
        return 0;
      }

      const myCoins = globalState?.coins?.[myRole] || 0;
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins + whole,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: pending - whole,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: now
      });
      checkAchievements();

      if (!silent) showToast(`✅ Собрано ${whole} 🪙 с майнера!`, 'ok');
      return whole;
    }

    function upgradeMinerEarning(targetLevel) {
      if (!myRole) return;
      const minerData = globalState?.miner?.[myRole] || {};
      const currentLevel = minerData.earningLevel || 1;

      if (targetLevel !== currentLevel + 1) return;

      const upgrade = minerEarningUpgrade(targetLevel);

      const myCoins = globalState?.coins?.[myRole] || 0;
      if (myCoins < upgrade.price) {
        showToast(`Недостаточно монет! Требуется ${upgrade.price.toLocaleString('ru-RU')} 🪙`, 'err');
        return;
      }

      // Всё, что намайнено по старой ставке, откладываем в копилку — новая ставка действует с этого момента
      const now = getNow();
      const { pending } = minerState(minerData, now);
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins - upgrade.price,
        [`wordle_season_v1/miner/${myRole}/earningLevel`]: targetLevel,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: pending,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: now
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
        showToast(`Недостаточно монет! Требуется ${upgrade.price.toLocaleString('ru-RU')} 🪙`, 'err');
        return;
      }

      // Сначала забираем накопленное на счёт (со старой батареей), затем новый цикл начинается с работы
      const now = getNow();
      const { pending } = minerState(minerData, now);
      const whole = Math.floor(pending);
      db.ref().update({
        [`wordle_season_v1/coins/${myRole}`]: myCoins - upgrade.price + whole,
        [`wordle_season_v1/miner/${myRole}/batteryLevel`]: targetLevel,
        [`wordle_season_v1/miner/${myRole}/cycleStartTime`]: now,
        [`wordle_season_v1/miner/${myRole}/accumulatedCoins`]: pending - whole,
        [`wordle_season_v1/miner/${myRole}/lastCollectTime`]: now
      });
      checkAchievements();

      showToast(`✅ Батарея улучшена! Теперь ${upgrade.workHours}ч работы / ${upgrade.restHours}ч отдыха.` +
                (whole > 0 ? ` Накопленные ${whole} 🪙 зачислены на счёт.` : ''), 'ok');
    }

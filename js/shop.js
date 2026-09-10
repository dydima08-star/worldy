// Wordle Duo — магазин улучшений, инвентарь, множители наград и обменник очков на монеты.
// Перенесено из index.html без изменений: строки 3377-3473, 3477-3526, 3528-3553.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    function setShopFilter(filterType, btnEl) {
      currentShopFilter = filterType;
      document.querySelectorAll('.shop-tab-btn').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      renderShop();
    }

    function renderShop() {
      const cont = document.getElementById('shop-items-container');
      const myCoins = globalState?.coins?.[myRole] || 0;
      const myScore = globalState?.score?.[myRole] || 0;

      document.getElementById('shop-my-coins').innerText = myCoins;
      document.getElementById('shop-my-score').innerText = myScore;
      cont.innerHTML = '';

      if (currentShopFilter === 'owned') { cont.style.display = 'block'; renderOwned(cont); return; }
      cont.style.display = 'grid';

      const filteredItems = SHOP_ITEMS.filter(item => {
        // week_pos1 дублирует уже купленный perm_pos1 — прятать, чтобы не платили за то, что уже есть
        if (item.id === 'week_pos1' && isActiveById('perm_pos1') && !isActive(item)) return false;
        return currentShopFilter === 'all' ? true : item.type === currentShopFilter;
      });

      if (filteredItems.length === 0) {
        cont.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#777;">Нет товаров в этой категории</div>';
        return;
      }

      filteredItems.forEach(item => {
        const active = isActive(item);
        const e = invEntry(item.id);
        const canAfford = myCoins >= item.price;

        let btnLabel = item.price + ' 🪙';
        let disabled = false;
        let cornerBadge = '';

        if (item.type === 'permanent') {
          if (active) { btnLabel = '✓ Куплено'; disabled = true; }
        } else if (item.type === 'daily' || item.type === 'weekly') {
          if (active) { cornerBadge = '<span class="shop-owned-badge">активно</span>'; btnLabel = 'Продлить · ' + item.price + ' 🪙'; }
        } else if (item.type === 'consumable') {
          const cnt = (e && typeof e === 'object') ? (e.count || 0) : 0;
          if (cnt > 0) cornerBadge = '<span class="shop-owned-badge">×' + cnt + '</span>';
        }
        if (!disabled && !canAfford) disabled = true;

        const card = document.createElement('div');
        card.className = 'shop-card';
        card.dataset.type = item.type;
        card.innerHTML = `
          <div>
            <div class="shop-card-header">
              <span class="cat-badge">${item.catName}</span>
              ${cornerBadge}
            </div>
            <div class="shop-card-title">${item.name}</div>
            <div class="shop-card-desc">${item.desc}</div>
          </div>
          <button class="shop-buy-btn" onclick="buyItem('${item.id}')" ${disabled ? 'disabled' : ''}>
            ${btnLabel}
          </button>
        `;
        cont.appendChild(card);
      });
    }

    function renderOwned(cont) {
      const owned = SHOP_ITEMS.filter(item => isActive(item));
      if (owned.length === 0) {
        cont.innerHTML = '<div style="text-align:center; padding:24px; color:#777;">У вас пока нет активных улучшений.<br>Загляните в другие вкладки магазина! 🛒</div>';
        return;
      }
      const order = { permanent: 0, weekly: 1, daily: 2, consumable: 3 };
      owned.sort((a, b) => order[a.type] - order[b.type]);
      owned.forEach(item => {
        const e = invEntry(item.id);
        let meta = '';
        if (item.type === 'permanent') meta = '♾️ Активно навсегда';
        else if (item.type === 'daily' || item.type === 'weekly') meta = '⏳ Осталось: ' + fmtRemaining(e.until);
        else if (item.type === 'consumable') meta = '📦 В наличии: ' + (e.count || 0) + ' шт.';
        const div = document.createElement('div');
        div.className = 'inv-card ' + item.type;
        div.innerHTML = `<div class="inv-title">${item.name}</div>
          <div class="inv-desc">${item.desc}</div>
          <div class="inv-meta">${meta}</div>`;
        cont.appendChild(div);
      });
    }

    function fmtRemaining(until) {
      let ms = until - getNow(); if (ms < 0) ms = 0;
      const d = Math.floor(ms / 86400000);
      const h = Math.floor(ms / 3600000) % 24;
      const m = Math.floor(ms / 60000) % 60;
      return (d ? d + 'д ' : '') + h + 'ч ' + m + 'м';
    }

    function invEntry(id) { return globalState?.inventory?.[myRole]?.[id]; }
    function isActive(item) {
      const e = invEntry(item.id); if (!e) return false;
      if (item.type === 'permanent') return e === true;
      if (item.type === 'daily' || item.type === 'weekly') return typeof e === 'object' && e.until > getNow();
      if (item.type === 'consumable') return typeof e === 'object' && (e.count || 0) > 0;
      return false;
    }
    function isActiveById(id) { const it = SHOP_ITEMS.find(i => i.id === id); return it ? isActive(it) : false; }

    // Множители наград от активных улучшений
    function rewardEffects() {
      let coinMult = 1, pointMult = 1;
      if (isActiveById('perm_investor')) coinMult *= 1.15;
      if (isActiveById('day_double_reward')) coinMult *= 1.5;
      if (isActiveById('week_lord_title')) { coinMult *= 1.10; pointMult *= 1.10; }
      if (isActiveById('day_night_fever') && new Date().getHours() >= 20) pointMult *= 1.5;
      if (isActiveById('day_morning_boost') && new Date().getHours() < 12) pointMult *= 1.5;
      return { coinMult, pointMult };
    }

    function buyItem(id) {
      const item = SHOP_ITEMS.find(i => i.id === id);
      if (!item) return;
      const myCoins = globalState?.coins?.[myRole] || 0;
      if (myCoins < item.price) { showToast('Недостаточно монет!', 'err'); return; }

      // Дорогая покупка (от 10000 монет) — подтверждение, чтобы не списать монеты случайным кликом
      if (item.price >= 10000) {
        showConfirm('Подтвердите покупку', `«${item.name}» за ${item.price.toLocaleString()} 🪙?`, 'Купить').then(ok => {
          if (ok) completeBuyItem(item, myCoins);
        });
        return;
      }
      completeBuyItem(item, myCoins);
    }

    function completeBuyItem(item, myCoins) {
      const invRef = `wordle_season_v1/inventory/${myRole}/${item.id}`;
      const now = getNow();

      if (item.type === 'permanent') {
        if (isActive(item)) return;
        db.ref(invRef).set(true);
      } else if (item.type === 'daily') {
        const cur = invEntry(item.id);
        const base = (cur && cur.until > now) ? cur.until : now;
        db.ref(invRef).set({ until: base + 24 * 60 * 60 * 1000 });
      } else if (item.type === 'weekly') {
        const cur = invEntry(item.id);
        const base = (cur && cur.until > now) ? cur.until : now;
        db.ref(invRef).set({ until: base + 7 * 24 * 60 * 60 * 1000 });
      } else if (item.type === 'consumable') {
        const qty = CONSUMABLE_QTY[item.id] || 1;
        const cur = invEntry(item.id);
        const curCount = (cur && typeof cur === 'object') ? (cur.count || 0) : 0;
        db.ref(invRef).set({ count: curCount + qty });
      }
      db.ref(`wordle_season_v1/coins/${myRole}`).set(myCoins - item.price);
      checkAchievements();
    }

    // ОБМЕННИК
    function openExchange() { document.getElementById('exchange-modal').classList.remove('hidden'); }
    function closeExchange() { document.getElementById('exchange-modal').classList.add('hidden'); }

    function exchangeRP(pointsCost, coinsGain) {
      const myScore = globalState?.score?.[myRole] || 0;
      if (myScore < pointsCost) {
        showToast(`Недостаточно очков! У вас ${myScore}, а требуется ${pointsCost}.`, 'err');
        return;
      }

      // Бонусные улучшения (Инвестор, Удвоитель наград и т.д.) увеличивают выход монет при обмене
      const mult = rewardEffects().coinMult;
      const finalGain = Math.floor(coinsGain * mult);
      const bonus = finalGain - coinsGain;

      const myCoins = globalState?.coins?.[myRole] || 0;
      db.ref().update({
        [`wordle_season_v1/score/${myRole}`]: myScore - pointsCost,
        [`wordle_season_v1/coins/${myRole}`]: myCoins + finalGain
      });
      checkAchievements();

      showToast(`Успешный обмен! Получено +${finalGain} 🪙` + (bonus > 0 ? ` (в т.ч. +${bonus} бонус)` : ''), 'ok');
      renderShop();
      closeExchange();
    }

// Wordle Duo — расходники, применяемые прямо в игре: панель и эффекты.
// Перенесено из index.html без изменений: строки 3852-3852, 3856-3910.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ---- Расходники, используемые прямо в игре ----

    function renderConsumableBar() {
      const bar = document.getElementById('game-consumables');
      bar.innerHTML = '';
      const wordObj = globalState.words[activeWordId];
      const inv = globalState?.inventory?.[myRole] || {};
      let any = false;
      if (!isGameOver(wordObj)) {
        IN_GAME_CONSUMABLES.forEach(id => {
          const e = inv[id];
          const count = (e && typeof e === 'object') ? (e.count || 0) : 0;
          if (count > 0) {
            any = true;
            const item = SHOP_ITEMS.find(i => i.id === id);
            const b = document.createElement('button');
            b.innerText = `🧪 ${item.name} ×${count}`;
            b.onclick = () => useConsumable(id);
            bar.appendChild(b);
          }
        });
      }
      bar.style.display = any ? 'flex' : 'none';
    }

    function useConsumable(id) {
      const wordObj = globalState.words[activeWordId];
      if (isGameOver(wordObj)) return;
      const secret = wordObj.secret.toUpperCase();
      const len = wordObj.len;
      const e = globalState?.inventory?.[myRole]?.[id];
      let count = (e && typeof e === 'object') ? (e.count || 0) : 0;
      if (count <= 0) return;

      // Открыть букву как зелёную подсказку (клетку по-прежнему можно перезаписать)
      const revealCell = (i) => { if (i >= 0 && i < len && !(i in sessionGreens)) { sessionGreens[i] = secret[i]; return true; } return false; };

      // Точечный прицел: выбор позиции через модалку-Promise, отдельная ветка (спрашивает асинхронно)
      if (id === 'cons_target') {
        const buttons = []; for (let i = 1; i <= len; i++) buttons.push(i);
        showPrompt(`Какую позицию открыть? (1-${len})`, { buttons }).then(p => {
          if (!p) return;
          if (!revealCell(p - 1)) { showGameMsg('Эта буква уже открыта'); return; }
          finishConsumable(id, count);
        });
        return;
      }

      let used = true;

      if (id === 'cons_finish_mark') { if (!revealCell(len - 1)) { showGameMsg('Последняя буква уже открыта'); used = false; } }
      else if (id === 'cons_rand_green') { const free = []; for (let i = 0; i < len; i++) if (!(i in sessionGreens)) free.push(i); if (free.length) revealCell(pickRandom(free, 1)[0]); else used = false; }
      else if (id === 'cons_deep_clean' || id === 'cons_pack_clean') { const n = id === 'cons_pack_clean' ? 3 : 5; const avail = RUS_ALPHABET.filter(l => !secret.includes(l) && !sessionRemoved.includes(l)); pickRandom(avail, n).forEach(l => sessionRemoved.push(l)); }
      else if (id === 'cons_life_saver') { sessionExtraAttempts += 1; showGameMsg('➕ Добавлена попытка'); }
      else if (id === 'cons_xray' || id === 'cons_pack_xray') { const cnt = {}; secret.split('').forEach(l => cnt[l] = (cnt[l] || 0) + 1); const rep = Object.entries(cnt).filter(([, n]) => n > 1); showAlert('🔬 Рентген', rep.length ? 'Повторяющиеся буквы: ' + rep.map(([l, n]) => `${l}×${n}`).join(', ') : 'В слове нет повторяющихся букв.'); }
      else if (id === 'cons_vowel_scan') { const vs = [...new Set(secret.split('').filter(l => VOWELS.includes(l)))]; vs.forEach(l => { if (!sessionPresent.includes(l) && !Object.values(sessionGreens).includes(l)) sessionPresent.push(l); }); }
      else if (id === 'cons_va_bank') { if ((wordObj.attempts || []).length < getMaxAttempts() - 1) { showGameMsg('Доступно только на последней попытке'); used = false; } else { const free = []; for (let i = 0; i < len; i++) if (!(i in sessionGreens)) free.push(i); if (free.length) revealCell(pickRandom(free, 1)[0]); else used = false; } }

      if (used) finishConsumable(id, count);
    }

    // Списывает расходник и обновляет экран — общий хвост для синхронной и асинхронной (cons_target) веток
    function finishConsumable(id, count) {
      if (!globalState.inventory) globalState.inventory = {};
      if (!globalState.inventory[myRole]) globalState.inventory[myRole] = {};
      globalState.inventory[myRole][id] = { count: count - 1 };
      db.ref(`wordle_season_v1/inventory/${myRole}/${id}`).set({ count: count - 1 });
      selectedIndex = firstEmpty(globalState.words[activeWordId].len);
      renderConsumableBar();
      renderBoard();
    }

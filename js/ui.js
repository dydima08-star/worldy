// Wordle Duo — выбор роли игрока и отрисовка шапки (RP, очки, монеты, комбо, ранги, косметика).
// Перенесено из index.html без изменений: строки 2900-2907, 2959-3003.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    function selectRole(role) {
      myRole = role;
      localStorage.setItem('wordle_role', role);
      showProfileModal();
    }

    // ================= ПРОФИЛЬ ИГРОКА (имя + аватар) =================

    const PROFILE_AVATARS = ['🦊', '🐻', '🐼', '🐸', '🐙', '🦉', '🐺', '🦁', '🐧', '🐬', '🦄', '🐲'];
    let __profileSelectedAvatar = '';

    function playerName(role) { return globalState?.players?.[role]?.name || ('Игрок ' + role); }
    function playerAvatar(role) { return globalState?.players?.[role]?.avatar || (role === 1 ? '🔵' : '🟣'); }

    // Открывает шаг 2 модалки выбора роли (имя + аватар). Используется и при первом входе, и из «👤 Профиль».
    function showProfileModal() {
      document.getElementById('role-modal').classList.remove('hidden');
      document.getElementById('role-modal-step1').classList.add('hidden');
      document.getElementById('role-modal-step2').classList.remove('hidden');

      const existing = globalState?.players?.[myRole] || {};
      document.getElementById('profile-name-input').value = existing.name || '';
      __profileSelectedAvatar = existing.avatar || '';

      const grid = document.getElementById('profile-avatar-grid');
      grid.innerHTML = '';
      PROFILE_AVATARS.forEach(a => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = a;
        btn.className = 'avatar-btn' + (a === __profileSelectedAvatar ? ' selected' : '');
        btn.onclick = () => {
          __profileSelectedAvatar = a;
          grid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
        grid.appendChild(btn);
      });
    }

    function closeProfileModal() {
      document.getElementById('role-modal').classList.add('hidden');
      document.getElementById('role-modal-step1').classList.remove('hidden');
      document.getElementById('role-modal-step2').classList.add('hidden');
      if (globalState) renderUI(globalState);
    }

    function saveProfile() {
      const name = document.getElementById('profile-name-input').value.trim().slice(0, 16);
      const updates = {};
      if (name) updates[`wordle_season_v1/players/${myRole}/name`] = name;
      if (__profileSelectedAvatar) updates[`wordle_season_v1/players/${myRole}/avatar`] = __profileSelectedAvatar;
      if (Object.keys(updates).length) db.ref().update(updates);
      closeProfileModal();
    }

    function skipProfile() {
      closeProfileModal();
    }

    function renderUI(data) {
      globalState = data;

      // Обновляем максимальное комбо (если текущее больше)
      if (data.combos) {
        [1, 2].forEach(p => {
          const currentCombo = data.combos[p] || 0;
          const maxCombo = data.maxCombo?.[p] || 0;
          if (currentCombo > maxCombo) {
            db.ref(`wordle_season_v1/maxCombo/${p}`).set(currentCombo);
          }
        });
      }

      // Обновляем карточки игроков с рангами
      [1, 2].forEach(p => {
        const rp = data.rp?.[p] || 0;
        const rank = getRankByRP(rp);

        document.getElementById(`p${p}-name`).innerText = `${playerAvatar(p)} ${playerName(p)}`;
        document.getElementById(`p${p}-rp`).innerHTML = `<span style="color: ${rank.color};">${rank.icon} ${rp} RP</span>`;
        document.getElementById(`p${p}-score`).innerText = data.score?.[p] || 0;
        document.getElementById(`p${p}-coins`).innerText = `${data.coins?.[p] || 0} 🪙`;
        document.getElementById(`p${p}-combo`).textContent = `🔥 Комбо: ${data.combos?.[p] || 0}/5`;
      });

      // Корона победителю
      const rp1 = data.rp?.[1] || 0, rp2 = data.rp?.[2] || 0;
      document.getElementById('p1-crown').style.display = rp1 > rp2 ? 'block' : 'none';
      document.getElementById('p2-crown').style.display = rp2 > rp1 ? 'block' : 'none';

      // Косметика: Золотой статус / Титул Лорда
      [1, 2].forEach(r => {
        const card = document.getElementById('p' + r + '-card');
        const inv = data.inventory?.[r] || {};
        const gold = inv['perm_gold_nick'] === true;
        const lord = inv['week_lord_title'] && typeof inv['week_lord_title'] === 'object' && inv['week_lord_title'].until > getNow();
        card.style.borderColor = lord ? '#9b59b6' : (gold ? 'var(--gold-color)' : '');
        card.style.boxShadow = lord ? '0 0 12px rgba(155,89,182,0.6)' : (gold ? '0 0 10px rgba(255,215,0,0.45)' : '');
      });

      renderWords(data.words || {});
      if (!screenShop.classList.contains('hidden')) renderShop();
      if (!screenGame.classList.contains('hidden') && activeWordId) renderBoard();
      if (!screenMiner.classList.contains('hidden')) renderMiner();
    }

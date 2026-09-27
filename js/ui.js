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

      // Аватары: 12 базовых + открытые уровнями (js/levels.js); закрытые — с замком и номером уровня
      const myLevel = playerLevel(myRole);
      const grid = document.getElementById('profile-avatar-grid');
      grid.innerHTML = '';
      const all = PROFILE_AVATARS.map(a => ({ avatar: a, level: 1 })).concat(levelAvatars());
      all.forEach(({ avatar: a, level }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const locked = level > myLevel;
        btn.className = 'avatar-btn' + (a === __profileSelectedAvatar ? ' selected' : '') + (locked ? ' locked' : '');
        btn.innerHTML = locked ? `<span>${a}</span><small>ур. ${level}</small>` : a;
        btn.onclick = () => {
          if (locked) { showToast(`Аватар ${a} откроется на ${level}-м уровне`, 'info'); return; }
          __profileSelectedAvatar = a;
          grid.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
        grid.appendChild(btn);
      });

      renderProfileCosmetics(myLevel);
    }

    // Цвет имени (12/23/31 ур.) и подпись под именем (36 ур.) — см. LEVEL_REWARDS
    let __profileNameColor = null;
    function renderProfileCosmetics(myLevel) {
      const box = document.getElementById('profile-cosmetics');
      if (!box) return;
      const cos = globalState?.cosmetics?.[myRole] || {};
      const allowed = allowedNameColors(myLevel);
      __profileNameColor = allowed.includes(cos.nameColor) ? cos.nameColor : null;

      const swatch = (c, lvl) => {
        const locked = lvl > myLevel;
        const style = c === NAME_SHIMMER ? '' : `background:${c};`;
        return `<button type="button" class="color-swatch${c === NAME_SHIMMER ? ' shimmer' : ''}${locked ? ' locked' : ''}${c === __profileNameColor ? ' selected' : ''}"
                  data-c="${c}" data-lvl="${lvl}" style="${style}" title="${locked ? 'Уровень ' + lvl : ''}">${locked ? '🔒' : ''}</button>`;
      };
      const tagOpen = hasReward(myLevel, 'tagline');
      box.innerHTML = `
        <div class="pc-section-title">🎨 Цвет имени</div>
        <div class="color-swatches">
          <button type="button" class="color-swatch none${!__profileNameColor ? ' selected' : ''}" data-c="" data-lvl="1" title="Обычный">✕</button>
          ${NAME_COLORS_1.map(c => swatch(c, 12)).join('')}
          ${NAME_COLORS_2.map(c => swatch(c, 23)).join('')}
          ${swatch(NAME_SHIMMER, 31)}
        </div>
        ${allowed.length ? '' : '<div class="pc-locked-note">Цвета открываются с 12-го уровня</div>'}
        <div class="pc-section-title">✍️ Подпись под именем</div>
        <input type="text" id="profile-tagline-input" maxlength="20" ${tagOpen ? '' : 'disabled'}
          placeholder="${tagOpen ? 'До 20 символов' : '🔒 Откроется на 36-м уровне'}" value="${tagOpen ? escapeHtml(cos.tagline || '') : ''}">`;

      box.querySelectorAll('.color-swatch').forEach(b => {
        b.onclick = () => {
          const lvl = +b.dataset.lvl;
          if (lvl > myLevel) { showToast(`Этот цвет откроется на ${lvl}-м уровне`, 'info'); return; }
          __profileNameColor = b.dataset.c || null;
          box.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
        };
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
      // Косметика уровня: пишем только то, что открыто (при первом входе раздела ещё нет)
      if (document.getElementById('profile-cosmetics')?.innerHTML) {
        updates[`wordle_season_v1/cosmetics/${myRole}/nameColor`] = __profileNameColor || null;
        const tagInput = document.getElementById('profile-tagline-input');
        if (tagInput && !tagInput.disabled) updates[`wordle_season_v1/cosmetics/${myRole}/tagline`] = tagInput.value.trim().slice(0, 20) || null;
      }
      if (Object.keys(updates).length) db.ref().update(updates);
      closeProfileModal();
    }

    function skipProfile() {
      closeProfileModal();
    }

    // Подписи под крупными кнопками меню и аватар в кнопке профиля
    function renderMenuStatus(data) {
      const profileBtn = document.getElementById('btn-go-profile');
      if (profileBtn) profileBtn.textContent = myRole ? playerAvatar(myRole) : '👤';
      if (!myRole) return;

      // Слово дня: id как в startDailyWord() (words.js) — по UTC-дате устройства
      const dailyId = `daily_${new Date().toISOString().slice(0, 10)}_p${myRole}`;
      const dailyDone = !!data.history?.[myRole]?.[dailyId] || data.words?.[dailyId]?.status === 'completed';
      const dailySub = document.getElementById('menu-daily-sub');
      if (dailySub) dailySub.textContent = dailyDone ? '✅ Сыграно сегодня' : 'Ещё не сыграно сегодня';

      const marSub = document.getElementById('menu-marathon-sub');
      if (marSub && typeof marathonState === 'function') {
        const st = marathonState(myRole);
        marSub.textContent =
          st.status === 'done'    ? `🏆 Все ${MARATHON_TOTAL} уровней пройдены!` :
          st.status === 'failed'  ? `Остановка на ${st.level}-м · завтра новый` :
          st.status === 'playing' ? `Уровень ${st.level} из ${MARATHON_TOTAL}` :
                                    `${MARATHON_TOTAL} уровней · начни забег`;
      }
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

        document.getElementById(`p${p}-rp`).innerHTML = `<span style="color: ${rank.color};">${rank.icon} ${rp} RP</span>`;
        document.getElementById(`p${p}-score`).innerText = data.score?.[p] || 0;
        document.getElementById(`p${p}-coins`).innerText = `${data.coins?.[p] || 0} 🪙`;
        document.getElementById(`p${p}-combo`).textContent = `🔥 Комбо: ${data.combos?.[p] || 0}/5`;
        document.getElementById(`p${p}-streak`).textContent = `📆 Серия: ${computeStreaks(data.history?.[p] || {}).dayStreak} дн.`;
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

      renderPlayerLevels();
      renderMenuStatus(data);
      renderWords(data.words || {});
      if (!screenShop.classList.contains('hidden')) renderShop();
      if (!screenGame.classList.contains('hidden') && activeWordId && getActiveWord()) { renderBoard(); renderCaseBar(); }
      if (!screenMarathon.classList.contains('hidden')) renderMarathon();
      if (!screenMiner.classList.contains('hidden')) renderMiner();
      if (!document.getElementById('screen-history').classList.contains('hidden')) renderHistory();
      if (!document.getElementById('screen-levels').classList.contains('hidden')) renderLevels(false);
      checkLevelUp();
    }

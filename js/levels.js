// Wordle Duo — уровень игрока: опыт ✨ (XP), 40 уровней, награды и экран «Уровни».
// Уровень НЕ сбрасывается сезоном (в отличие от RP). Опыт нельзя потратить.
//
// Данные в БД:
//   wordle_season_v1/xp/{роль}              — всего опыта (число, пишется только transaction)
//   wordle_season_v1/levels/{роль}/claimed  — до какого уровня награды уже выданы (с 1)
//   wordle_season_v1/cosmetics/{роль}       — { nameColor, tagline } — выбор в профиле
//   wordle_season_v1/caseBonus/{роль}       — кейсы с буквами «в запасе» сверх суточных (js/cases.js)
//
// Награды выдаёт только клиент самого игрока: при каждом renderUI сравниваем уровень по опыту
// с levels/claimed. claimed двигается транзакцией, поэтому награда за уровень выдаётся ровно
// один раз, даже при двух открытых вкладках и опыте, начисленном соперником (+3 за доигранное слово).

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= КРИВАЯ ОПЫТА =================

    const LEVEL_MAX = 40;
    const LEVEL_BASE_XP = 100;   // с 1-го на 2-й
    const LEVEL_STEP_XP = 60;    // каждый следующий уровень дороже на столько

    // Сколько опыта всего нужно, чтобы БЫТЬ на уровне L: сумма (100 + 60·(k-1)) по k = 1..L-1
    function xpForLevel(L) {
      const n = Math.max(0, Math.min(L, LEVEL_MAX) - 1);
      return n * LEVEL_BASE_XP + LEVEL_STEP_XP * n * (n - 1) / 2;
    }

    function levelFromXP(xp) {
      let L = 1;
      while (L < LEVEL_MAX && xp >= xpForLevel(L + 1)) L++;
      return L;
    }

    function playerXP(role) { return Math.max(0, Number(globalState?.xp?.[role]) || 0); }
    function playerLevel(role) { return levelFromXP(playerXP(role)); }

    // ================= ОПЫТ ЗА ДЕЙСТВИЯ =================

    const XP_RULES = {
      winBase: 10, winPerLetter: 2,   // победа: 10 + 2 за букву
      fastWin: 10, thirdTry: 5,       // +10 за 1–2 попытки, +5 за 3-ю
      loss: 3,                        // за участие
      daily: 15,                      // слово дня — сверху, при любом исходе
      marathonBase: 5,                // уровень марафона: 5 + номер уровня
      authorFinished: 3,              // соперник доиграл моё слово
      chest: 10,                      // сундук дня
      achievement: 50
    };

    function xpForWord(len, attempts, isWin, isDaily) {
      let xp = isWin ? XP_RULES.winBase + XP_RULES.winPerLetter * len : XP_RULES.loss;
      if (isWin && attempts <= 2) xp += XP_RULES.fastWin;
      else if (isWin && attempts === 3) xp += XP_RULES.thirdTry;
      if (isDaily) xp += XP_RULES.daily;
      return xp;
    }

    // Транзакция: опыт может прийти одновременно от обоих игроков (+3 автору слова)
    function addXP(role, amount) {
      if (!role || !(amount > 0)) return;
      db.ref(`wordle_season_v1/xp/${role}`).transaction(v => (Number(v) || 0) + amount);
    }

    // ================= НАГРАДЫ =================

    // Аватары 🐯..👑 открываются уровнями (базовые 12 — в PROFILE_AVATARS, js/ui.js)
    const LEVEL_REWARDS = {
      2:  { avatar: '🐯' },
      3:  { items: { cons_life_saver: 1 } },
      4:  { avatar: '🦅' },
      5:  { title: 'Книголюб', frame: 'bronze' },
      6:  { items: { cons_xray: 1 } },
      7:  { avatar: '🐝' },
      8:  { confetti: true },
      9:  { avatar: '🦋' },
      10: { title: 'Грамотей', colorBadge: true },
      11: { items: { cons_rand_green: 1 } },
      12: { nameColors: true },
      13: { avatar: '🐉' },
      14: { items: { cons_deep_clean: 1 } },
      15: { title: 'Эрудит', frame: 'silver' },
      16: { items: { cons_finish_mark: 1 } },
      17: { avatar: '🦖' },
      18: { glow: true },
      19: { cases: 1 },
      20: { title: 'Лингвист', pointBonus: 4 },
      21: { items: { cons_target: 1 } },
      22: { avatar: '🦈' },
      23: { moreNameColors: true },
      24: { items: { cons_life_saver: 1 } },
      25: { title: 'Профессор', frame: 'gold' },
      26: { timed: { week_giant_hunter: 1 } },
      27: { avatar: '🦚' },
      28: { starConfetti: true },
      29: { items: { cons_xray: 1, cons_deep_clean: 1 } },
      30: { title: 'Академик', pointBonus: 6 },
      31: { shimmerName: true },
      32: { timed: { day_double_reward: 1 } },
      33: { avatarGlow: true },
      34: { cases: 1 },
      35: { title: 'Мудрец', frame: 'crystal' },
      36: { tagline: true },
      37: { timed: { week_all_in: 1 } },
      38: { avatar: '🐲👑' },
      39: { animBadge: true },
      40: { title: 'Легенда словаря', frame: 'rainbow', avatar: '👑', pointBonus: 10, bonusCoins: 1000 }
    };

    const LEVEL_COINS_PER = 20;   // монеты за уровень = номер уровня × 20

    function levelCoins(L) { return L * LEVEL_COINS_PER + (LEVEL_REWARDS[L]?.bonusCoins || 0); }

    // Цвета имени: 4 с 12-го уровня, ещё 4 с 23-го, переливающееся — с 31-го
    const NAME_COLORS_1 = ['#7fd8ff', '#7dffa8', '#ffd86b', '#ff9ec7'];
    const NAME_COLORS_2 = ['#c9a2ff', '#ffab5e', '#ff6b6b', '#e8f0ff'];
    const NAME_SHIMMER = 'shimmer';

    // «Ступенчатые» свойства — берём последнее значение не выше уровня
    function lastRewardValue(L, key) {
      for (let k = Math.min(L, LEVEL_MAX); k >= 1; k--) if (LEVEL_REWARDS[k]?.[key] !== undefined) return LEVEL_REWARDS[k][key];
      return null;
    }
    function hasReward(L, key) {
      for (let k = Math.min(L, LEVEL_MAX); k >= 1; k--) if (LEVEL_REWARDS[k]?.[key]) return true;
      return false;
    }

    function levelTitle(L) { return lastRewardValue(L, 'title'); }
    function levelFrame(L) { return lastRewardValue(L, 'frame'); }
    function levelPointBonus(L) { return lastRewardValue(L, 'pointBonus') || 0; }   // проценты

    function levelAvatars() {
      return Object.entries(LEVEL_REWARDS).filter(([, r]) => r.avatar).map(([L, r]) => ({ level: +L, avatar: r.avatar }));
    }
    function avatarUnlockLevel(a) { return levelAvatars().find(x => x.avatar === a)?.level || 1; }

    function allowedNameColors(L) {
      const out = [];
      if (hasReward(L, 'nameColors')) out.push(...NAME_COLORS_1);
      if (hasReward(L, 'moreNameColors')) out.push(...NAME_COLORS_2);
      if (hasReward(L, 'shimmerName')) out.push(NAME_SHIMMER);
      return out;
    }

    // Выбранный цвет имени — только если он ещё разрешён уровнем
    function playerNameColor(role) {
      const c = globalState?.cosmetics?.[role]?.nameColor;
      return c && allowedNameColors(playerLevel(role)).includes(c) ? c : null;
    }
    function playerTagline(role) {
      if (!hasReward(playerLevel(role), 'tagline')) return '';
      return String(globalState?.cosmetics?.[role]?.tagline || '').slice(0, 20);
    }

    const ITEM_NAME = id => SHOP_ITEMS.find(i => i.id === id)?.name || id;
    const FRAME_NAME = { bronze: '🥉 Бронзовая рамка', silver: '🥈 Серебряная рамка', gold: '🥇 Золотая рамка',
                         crystal: '💎 Кристальная рамка', rainbow: '🌈 Радужная рамка' };

    // Список наград уровня словами — для лестницы и окна «Новый уровень»
    function levelRewardLines(L) {
      const r = LEVEL_REWARDS[L] || {};
      const lines = [];
      if (r.title) lines.push(`🏷️ Титул «${r.title}»`);
      if (r.frame) lines.push(FRAME_NAME[r.frame]);
      if (r.avatar) lines.push(`Аватар ${r.avatar}`);
      if (r.pointBonus) lines.push(`📈 +${r.pointBonus}% к очкам за слова`);
      if (r.colorBadge) lines.push('🔰 Цветной значок уровня');
      if (r.confetti) lines.push('🎊 Конфетти при победе');
      if (r.starConfetti) lines.push('⭐ Звёздное конфетти');
      if (r.nameColors) lines.push('🎨 Цвет имени (4 на выбор)');
      if (r.moreNameColors) lines.push('🎨 Ещё 4 цвета имени');
      if (r.shimmerName) lines.push('✨ Переливающееся имя');
      if (r.glow) lines.push('💡 Свечение карточки');
      if (r.avatarGlow) lines.push('🌟 Сияние аватара');
      if (r.tagline) lines.push('✍️ Своя подпись под именем');
      if (r.animBadge) lines.push('🌀 Анимированный значок уровня');
      if (r.cases) lines.push(`🎁 Кейс с буквами в запас ×${r.cases}`);
      Object.entries(r.items || {}).forEach(([id, n]) => lines.push(`🧪 ${ITEM_NAME(id)} ×${n}`));
      Object.keys(r.timed || {}).forEach(id => lines.push(`⏳ «${ITEM_NAME(id)}» на 1 день`));
      if (r.bonusCoins) lines.push(`💰 Бонус ${r.bonusCoins.toLocaleString('ru-RU')} 🪙`);
      return lines;
    }

    // ================= ВЫДАЧА НАГРАД =================

    let __levelClaiming = false;

    // Вызывается из renderUI(): если опыта хватает на новые уровни — выдаём награды за них
    function checkLevelUp() {
      if (!myRole || !globalState || __levelClaiming || !__liveDataReceived) return;
      const target = playerLevel(myRole);
      const claimed = Number(globalState.levels?.[myRole]?.claimed) || 1;
      if (target <= claimed) return;

      __levelClaiming = true;
      let from = claimed;
      db.ref(`wordle_season_v1/levels/${myRole}/claimed`).transaction(cur => {
        const c = Number(cur) || 1;
        if (c >= target) return;          // уже выдано (другой вкладкой) — отмена
        from = c;
        return target;
      }, (err, committed) => {
        __levelClaiming = false;
        if (err || !committed) return;
        grantLevelRewards(from + 1, target);
      });
    }

    function grantLevelRewards(fromL, toL) {
      const base = `wordle_season_v1`;
      let coins = 0, cases = 0;
      const items = {}, timed = {};
      for (let L = fromL; L <= toL; L++) {
        const r = LEVEL_REWARDS[L] || {};
        coins += levelCoins(L);
        cases += r.cases || 0;
        Object.entries(r.items || {}).forEach(([id, n]) => { items[id] = (items[id] || 0) + n; });
        Object.entries(r.timed || {}).forEach(([id, d]) => { timed[id] = (timed[id] || 0) + d; });
      }

      // Всё через транзакции: монеты и инвентарь параллельно могут меняться магазином/подарками
      if (coins) db.ref(`${base}/coins/${myRole}`).transaction(v => (Number(v) || 0) + coins);
      if (cases) db.ref(`${base}/caseBonus/${myRole}`).transaction(v => (Number(v) || 0) + cases);
      Object.entries(items).forEach(([id, n]) => {
        db.ref(`${base}/inventory/${myRole}/${id}`).transaction(cur => {
          const cnt = (cur && typeof cur === 'object') ? (cur.count || 0) : 0;
          return { count: cnt + n };
        });
      });
      Object.entries(timed).forEach(([id, days]) => {
        db.ref(`${base}/inventory/${myRole}/${id}`).transaction(cur => {
          const now = getNow();
          const from = (cur && typeof cur === 'object' && cur.until > now) ? cur.until : now;
          return { until: from + days * 24 * 60 * 60 * 1000 };
        });
      });

      showLevelUp(fromL, toL, coins);
    }

    // ================= ОКНО «НОВЫЙ УРОВЕНЬ» =================

    // Если открыт результат слова — окно уровня ждёт его закрытия (flushLevelUp), чтобы не перекрыть итог партии
    let __pendingLevelUp = null;

    function flushLevelUp() {
      if (!__pendingLevelUp) return;
      const p = __pendingLevelUp;
      __pendingLevelUp = null;
      setTimeout(() => showLevelUp(p.fromL, p.toL, p.coins), 250);
    }

    function showLevelUp(fromL, toL, coins) {
      if (!document.getElementById('result-modal').classList.contains('hidden')) {
        const p = __pendingLevelUp;
        __pendingLevelUp = p ? { fromL: Math.min(p.fromL, fromL), toL: Math.max(p.toL, toL), coins: p.coins + coins } : { fromL, toL, coins };
        return;
      }
      const lines = [];
      for (let L = fromL; L <= toL; L++) lines.push(...levelRewardLines(L));
      document.getElementById('levelup-num').innerText = toL;
      document.getElementById('levelup-title').innerText = toL - fromL > 0 ? `Уровни ${fromL}–${toL}!` : `Уровень ${toL}!`;
      const title = levelTitle(toL);
      document.getElementById('levelup-sub').innerText = title ? `Титул: ${title}` : 'Так держать!';
      document.getElementById('levelup-rewards').innerHTML =
        `<div class="levelup-reward coins">🪙 +${coins.toLocaleString('ru-RU')} монет</div>` +
        lines.map(t => `<div class="levelup-reward">${t}</div>`).join('');
      document.getElementById('levelup-modal').classList.remove('hidden');
      burstConfetti(document.getElementById('levelup-confetti'), toL >= 28 ? 'star' : 'dots');
    }

    function closeLevelUp() {
      document.getElementById('levelup-modal').classList.add('hidden');
    }

    // Конфетти в произвольный контейнер (position:absolute; inset:0). kind: 'dots' | 'star'
    function burstConfetti(box, kind, color) {
      if (!box) return;
      const colors = color ? [color, '#ffffff', color] : ['#ffd35c', '#ff7ac0', '#5fd4ff', '#b77bff', '#7dffa8'];
      box.innerHTML = '';
      for (let i = 0; i < 36; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = (Math.random() * 0.3) + 's';
        p.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px');
        if (kind === 'star') {
          p.className = 'star';
          p.textContent = '★';
          p.style.color = colors[i % colors.length];
        } else {
          p.style.background = colors[i % colors.length];
        }
        box.appendChild(p);
      }
      setTimeout(() => { box.innerHTML = ''; }, 2000);
    }

    // Конфетти при победе в слове — награда 8-го (обычное) и 28-го (звёздное) уровня
    function winConfetti() {
      const L = playerLevel(myRole);
      if (!hasReward(L, 'confetti')) return;
      const c = playerNameColor(myRole);
      burstConfetti(document.getElementById('result-confetti'), hasReward(L, 'starConfetti') ? 'star' : 'dots',
                    c && c !== NAME_SHIMMER ? c : null);
    }

    // Строка «✨ Опыт» для окон результата
    function xpResultLine(xp) {
      return `✨ Опыт: <b>+${xp}</b><br>`;
    }

    // ================= КАРТОЧКИ ИГРОКОВ =================

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    // Имя с цветом/переливом — для карточек и экрана уровней
    function playerNameHtml(role) {
      const c = playerNameColor(role);
      const name = escapeHtml(playerName(role));
      if (c === NAME_SHIMMER) return `<span class="name-shimmer">${name}</span>`;
      return c ? `<span style="color:${c};">${name}</span>` : name;
    }

    function levelBadgeHtml(L) {
      const cls = ['lvl-badge'];
      if (hasReward(L, 'colorBadge')) cls.push('lvl-badge-color');
      if (hasReward(L, 'animBadge')) cls.push('lvl-badge-anim');
      return `<span class="${cls.join(' ')}">Ур. ${L}</span>`;
    }

    function renderPlayerLevels() {
      [1, 2].forEach(p => {
        const L = playerLevel(p);
        const xp = playerXP(p);
        const card = document.getElementById(`p${p}-card`);
        const title = levelTitle(L);
        const tagline = playerTagline(p);

        const avatarCls = hasReward(L, 'avatarGlow') ? 'pc-avatar glow' : 'pc-avatar';
        document.getElementById(`p${p}-name`).innerHTML = `<span class="${avatarCls}">${playerAvatar(p)}</span> ${playerNameHtml(p)}`;
        document.getElementById(`p${p}-level`).innerHTML =
          levelBadgeHtml(L) + (title ? `<span class="lvl-title">${title}</span>` : '') +
          (tagline ? `<div class="pc-tagline">«${escapeHtml(tagline)}»</div>` : '');

        const cur = xpForLevel(L), next = xpForLevel(L + 1);
        const pct = L >= LEVEL_MAX ? 100 : Math.round((xp - cur) / (next - cur) * 100);
        document.getElementById(`p${p}-xpbar`).style.width = pct + '%';

        card.classList.remove('frame-bronze', 'frame-silver', 'frame-gold', 'frame-crystal', 'frame-rainbow', 'card-glow');
        const frame = levelFrame(L);
        if (frame) card.classList.add('frame-' + frame);
        if (hasReward(L, 'glow')) card.classList.add('card-glow');
      });

      // Полоса уровня в главном меню
      const L = playerLevel(myRole), xp = playerXP(myRole);
      const strip = document.getElementById('menu-level-text');
      if (strip && myRole) {
        const title = levelTitle(L);
        document.getElementById('menu-level-num').innerText = L;
        strip.innerHTML = `<b>Уровень ${L}</b>${title ? ' · ' + title : ''}`;
        const cur = xpForLevel(L), next = xpForLevel(L + 1);
        document.getElementById('menu-level-xp').innerText = L >= LEVEL_MAX
          ? 'максимум ✨'
          : `${(xp - cur).toLocaleString('ru-RU')} / ${(next - cur).toLocaleString('ru-RU')} ✨`;
        document.getElementById('menu-level-bar').style.width =
          (L >= LEVEL_MAX ? 100 : Math.round((xp - cur) / (next - cur) * 100)) + '%';
      }
    }

    // ================= ЭКРАН «УРОВНИ» =================

    function openLevels() {
      if (!myRole) { document.getElementById('role-modal').classList.remove('hidden'); return; }
      showScreen(document.getElementById('screen-levels'));
      renderLevels(true);
    }

    function renderLevels(scrollToCurrent) {
      const hero = document.getElementById('levels-hero');
      const ladder = document.getElementById('levels-ladder');
      if (!hero || !ladder || !myRole) return;

      const L = playerLevel(myRole), xp = playerXP(myRole);
      const cur = xpForLevel(L), next = xpForLevel(L + 1);
      const isMax = L >= LEVEL_MAX;
      const pct = isMax ? 100 : Math.round((xp - cur) / (next - cur) * 100);
      const title = levelTitle(L);
      const bonus = levelPointBonus(L);
      const opp = myRole === 1 ? 2 : 1;
      const oppL = playerLevel(opp);
      const nextBonusAt = [20, 30, 40].find(x => x > L);

      hero.innerHTML = `
        <div class="lv-hero">
          <div class="lv-ring" style="--pct:${pct};"><div class="lv-ring-inner"><small>уровень</small><b>${L}</b></div></div>
          <div class="lv-hero-info">
            <div class="lv-hero-name">${playerAvatar(myRole)} ${playerNameHtml(myRole)}</div>
            <div class="lv-hero-title">${title ? '🏷️ ' + title : 'Титул откроется на 5-м уровне'}</div>
            <div class="lv-hero-xp">${isMax ? 'Максимальный уровень!' :
              `<b>${(xp - cur).toLocaleString('ru-RU')}</b> / ${(next - cur).toLocaleString('ru-RU')} ✨ до ${L + 1}-го`}</div>
            <div class="lv-bar"><i style="width:${pct}%"></i></div>
          </div>
        </div>
        <div class="lv-chips">
          <span class="lv-chip">✨ Всего: ${xp.toLocaleString('ru-RU')}</span>
          <span class="lv-chip">📈 Бонус к очкам: ${bonus ? '+' + bonus + '%' : 'нет'}${nextBonusAt ? ` · след. на ${nextBonusAt}-м` : ''}</span>
          <span class="lv-chip">${playerAvatar(opp)} ${playerNameHtml(opp)}: ур. ${oppL}</span>
        </div>`;

      let rows = '';
      for (let k = 1; k <= LEVEL_MAX; k++) {
        const state = k < L ? 'passed' : k === L ? 'current' : 'locked';
        const r = LEVEL_REWARDS[k] || {};
        const milestone = !!r.title;
        const lines = k === 1 ? ['Старт'] : [`🪙 ${levelCoins(k).toLocaleString('ru-RU')}`, ...levelRewardLines(k)];
        const icon = state === 'passed' ? '✓' : state === 'current' ? '★' : '🔒';
        rows += `
          <div class="lv-row ${state}${milestone ? ' milestone' : ''}" id="lv-row-${k}">
            <div class="lv-num">${k}</div>
            <div class="lv-info">
              ${milestone ? `<div class="lv-row-title">${r.title}</div>` : ''}
              <div class="lv-rewards">${lines.join(' · ')}</div>
              <div class="lv-need">${k === 1 ? '0' : xpForLevel(k).toLocaleString('ru-RU')} ✨</div>
            </div>
            <div class="lv-state">${icon}</div>
          </div>`;
      }
      ladder.innerHTML = rows;

      if (scrollToCurrent && L > 3) {
        const row = document.getElementById('lv-row-' + L);
        if (row) setTimeout(() => row.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
      }
    }

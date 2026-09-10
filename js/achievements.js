// Wordle Duo — достижения (18 шт.) и стрики, всё на уже собираемых данных (history, combos,
// rp, inventory, miner, gifts). Новых полей минимум: achievements/{роль}/{id} = дата разблокировки.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= СТРИКИ (серия дней со словом дня, серия побед) =================

    function __isoDate(d) { return d.toISOString().slice(0, 10); }
    function __isNextDay(prevIso, curIso) {
      const prev = new Date(prevIso + 'T00:00:00');
      prev.setDate(prev.getDate() + 1);
      return __isoDate(prev) === curIso;
    }

    // Считает текущую и рекордную серию дней со «словом дня» + текущую и рекордную серию побед
    // из history/{роль}. Ничего не хранит в БД — пересчитывается на лету при каждом вызове.
    function computeStreaks(history) {
      const entries = Object.values(history || {});
      const systemDates = new Set(entries.filter(e => e.author === 'Система' && e.date).map(e => e.date));

      // Текущая серия дней: считаем от сегодня назад; если сегодня ещё не сыграно — начинаем со вчера
      // (иначе серия обнулялась бы каждое утро ещё до того, как игрок успел сыграть).
      let dayStreak = 0;
      {
        let cursor = new Date(getToday() + 'T00:00:00');
        if (!systemDates.has(__isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
        while (systemDates.has(__isoDate(cursor))) {
          dayStreak++;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      // Рекордная серия дней за всё время — самый длинный забег подряд идущих дат
      let maxDayStreak = 0;
      {
        const sortedDates = [...systemDates].sort();
        let run = 0, prevDate = null;
        sortedDates.forEach(d => {
          run = (prevDate && __isNextDay(prevDate, d)) ? run + 1 : 1;
          if (run > maxDayStreak) maxDayStreak = run;
          prevDate = d;
        });
      }
      maxDayStreak = Math.max(maxDayStreak, dayStreak);

      // Серия побед — по записям с известным временем (ts), в хронологическом порядке
      const withTs = entries.filter(e => typeof e.ts === 'number').sort((a, b) => a.ts - b.ts);

      let winStreak = 0;
      for (let i = withTs.length - 1; i >= 0; i--) {
        if (withTs[i].win) winStreak++; else break;
      }

      let maxWinStreak = 0;
      {
        let run = 0;
        withTs.forEach(e => {
          run = e.win ? run + 1 : 0;
          if (run > maxWinStreak) maxWinStreak = run;
        });
      }
      maxWinStreak = Math.max(maxWinStreak, winStreak);

      return { dayStreak, maxDayStreak, winStreak, maxWinStreak };
    }

    // ================= ДОСТИЖЕНИЯ (18 шт.) =================
    // check(history, ctx) — history: массив записей history/{myRole}; ctx: агрегаты, см. checkAchievements()

    const ACHIEVEMENTS = [
      { id: 'first_win', name: 'Первая кровь', icon: '🩸', desc: '1 победа', check: (h, ctx) => ctx.wins >= 1 },
      { id: 'games_10', name: 'Разминка', icon: '🔥', desc: '10 партий', check: (h) => h.length >= 10 },
      { id: 'games_50', name: 'Завсегдатай', icon: '📅', desc: '50 партий', check: (h) => h.length >= 50 },
      { id: 'games_200', name: 'Ветеран', icon: '🎖️', desc: '200 партий', check: (h) => h.length >= 200 },
      { id: 'wins_25', name: 'Четвертак', icon: '🏆', desc: '25 побед', check: (h, ctx) => ctx.wins >= 25 },
      { id: 'wins_100', name: 'Сотня', icon: '💯', desc: '100 побед', check: (h, ctx) => ctx.wins >= 100 },
      { id: 'sniper', name: 'Снайпер', icon: '🎯', desc: 'Победа с 1-й попытки', check: (h) => h.some(e => e.win && e.attempts === 1) },
      { id: 'clutch', name: 'На флажке', icon: '⏱️', desc: 'Победа на последней попытке', check: (h) => h.some(e => e.win && e.attempts >= MAX_ATTEMPTS) },
      { id: 'giant', name: 'Гигантомания', icon: '🦣', desc: 'Победа на слове из 8 букв', check: (h) => h.some(e => e.win && e.len === 8) },
      { id: 'blitz', name: 'Блиц', icon: '⚡', desc: 'Победа быстрее 60 секунд', check: (h) => h.some(e => e.win && e.ms && e.ms < 60000) },
      { id: 'combo_max', name: 'Огонь 5/5', icon: '🔥', desc: 'Комбо 5/5', check: (h, ctx) => ctx.maxCombo >= 5 },
      { id: 'streak_7', name: 'Неделя без пропусков', icon: '📆', desc: 'Серия дней со словом дня ≥ 7', check: (h, ctx) => ctx.streaks.maxDayStreak >= 7 },
      { id: 'streak_30', name: 'Месяц без пропусков', icon: '🗓️', desc: 'Серия дней со словом дня ≥ 30', check: (h, ctx) => ctx.streaks.maxDayStreak >= 30 },
      { id: 'winstreak_10', name: 'Безупречно', icon: '🌟', desc: '10 побед подряд', check: (h, ctx) => ctx.streaks.maxWinStreak >= 10 },
      { id: 'rank_master', name: 'Мастер', icon: '🔥', desc: `Ранг «${RANKS[3].name}» (${RANKS[3].minRP} RP)`, check: (h, ctx) => ctx.rp >= RANKS[3].minRP },
      { id: 'shopaholic', name: 'Шопоголик', icon: '🛍️', desc: '10 разных улучшений в инвентаре', check: (h, ctx) => ctx.invCount >= 10 },
      { id: 'miner_boss', name: 'Энергокризис решён', icon: '🔋', desc: 'Максимальный уровень батареи майнера', check: (h, ctx) => ctx.minerBattery >= 7 },
      { id: 'generous', name: 'Щедрая душа', icon: '🎁', desc: 'Отправлен хотя бы 1 подарок', check: (h, ctx) => ctx.gaveGift }
    ];

    // Проверяет и записывает новые достижения — только для своей роли. Вызывается после:
    // завершения партии, покупки в магазине, обмена очков, сбора монет майнера, апгрейда
    // батареи майнера, отправки подарка. Первый прогон (узла achievements/{myRole} ещё нет)
    // выдаёт всё уже заслуженное молча, без тостов.
    function checkAchievements() {
      if (!myRole || !globalState) return;

      const firstRun = globalState.achievements?.[myRole] === undefined;
      const existing = globalState.achievements?.[myRole] || {};

      const history = Object.values(globalState.history?.[myRole] || {});
      const wins = history.filter(e => e.win).length;
      const maxCombo = globalState.maxCombo?.[myRole] || globalState.combos?.[myRole] || 0;
      const rp = globalState.rp?.[myRole] || 0;
      const invCount = Object.keys(globalState.inventory?.[myRole] || {}).length;
      const minerBattery = globalState.miner?.[myRole]?.batteryLevel || 0;
      const gaveGift = Object.values(globalState.gifts || {}).some(toRole => Object.values(toRole || {}).some(g => g.from === myRole));
      const streaks = computeStreaks(globalState.history?.[myRole] || {});

      const ctx = { wins, maxCombo, rp, invCount, minerBattery, gaveGift, streaks };

      const updates = {};
      ACHIEVEMENTS.forEach(a => {
        if (existing[a.id]) return;
        if (a.check(history, ctx)) {
          updates[`wordle_season_v1/achievements/${myRole}/${a.id}`] = getToday();
        }
      });

      if (!Object.keys(updates).length) return;
      db.ref().update(updates);

      if (!firstRun) {
        Object.keys(updates).forEach(path => {
          const id = path.split('/').pop();
          const def = ACHIEVEMENTS.find(x => x.id === id);
          showToast(`🏅 Достижение разблокировано: «${def.name}»`, 'ok');
        });
      }
    }

    // Полка достижений на экране истории — своя или соперника (playerNum как в showHistoryFor)
    function renderAchievements(playerNum) {
      const grid = document.getElementById('achievements-grid');
      if (!grid) return;

      const unlocked = globalState?.achievements?.[playerNum] || {};
      grid.innerHTML = ACHIEVEMENTS.map(a => {
        const got = unlocked[a.id];
        const boxStyle = got
          ? 'background:#272729; border:2px solid var(--gold-color); color:#fff;'
          : 'background:#1a1a1b; border:2px solid var(--border-color); color:#666;';
        const dateLabel = (got && got !== true) ? `<div style="font-size:0.6rem; color:#999; margin-top:2px;">${got}</div>` : '';
        return `
          <div title="${a.name}: ${a.desc}" style="${boxStyle} border-radius:8px; padding:8px 4px; text-align:center;">
            <div style="font-size:1.4rem; ${got ? '' : 'filter:grayscale(1); opacity:0.5;'}">${a.icon}</div>
            <div style="font-size:0.62rem; margin-top:3px; line-height:1.15;">${a.name}</div>
            ${dateLabel}
          </div>
        `;
      }).join('');
    }

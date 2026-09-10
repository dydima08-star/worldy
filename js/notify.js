// Wordle Duo — уведомления о действиях соперника через дифф снапшотов RTDB.
// Единственная подписка на БД — gameRef.on('value') в main.js; здесь только сравнение
// предыдущего слепка состояния с новым, без новых подписок к Firebase.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // Компактный слепок состояния для сравнения — не храним весь снапшот целиком
    function snapshotDigest(d) {
      return {
        words: Object.fromEntries(Object.entries(d.words || {}).map(([id, w]) =>
          [id, { t: w.target, a: w.author, s: w.status, n: (w.attempts || []).length, len: w.len }])),
        hist: Object.fromEntries([1, 2].map(r => [r, Object.keys(d.history?.[r] || {})])),
        gifts: Object.keys(d.gifts?.[myRole] || {}),
        ach: Object.keys(d.achievements?.[myRole === 1 ? 2 : 1] || {}),
        rp: { 1: d.rp?.[1] || 0, 2: d.rp?.[2] || 0 }
      };
    }

    // Сравнивает предыдущий слепок с новым полным состоянием и показывает тосты о событиях
    // от соперника. Вызывается из main.js перед каждым renderUI(), новых подписок не создаёт.
    function diffAndNotify(prev, data) {
      if (!prev) return;   // первый снапшот за сессию — не сыпем историю накопленных событий
      if (!myRole) return;

      const opp = myRole === 1 ? 2 : 1;

      // Новое слово от соперника мне / соперник сделал ход по моему слову
      Object.entries(data.words || {}).forEach(([id, w]) => {
        const prevW = prev.words[id];
        if (!prevW) {
          if (w.target === myRole && w.status === 'pending' && w.author !== 'Система') {
            showToast(`🎯 ${playerName(w.author)} загадал(а) вам слово из ${w.len} букв`, 'info');
          }
          return;
        }
        const n = (w.attempts || []).length;
        if (n > prevW.n && w.author === myRole) {
          showToast(`✍️ ${playerName(opp)} сделал(а) ход по вашему слову (${n}/${MAX_ATTEMPTS})`, 'info');
        }
      });

      // Соперник доиграл моё слово (появилась новая запись в history/{opp})
      const prevHistOpp = new Set(prev.hist[opp] || []);
      Object.entries(data.history?.[opp] || {}).forEach(([id, h]) => {
        if (prevHistOpp.has(id)) return;
        if (h.author !== myRole) return;
        const word = h.word || (h.len + ' букв');
        if (h.win) showToast(`🎉 ${playerName(opp)} отгадал(а) ваше слово ${word} за ${h.attempts} попыток`, 'ok');
        else showToast(`😈 ${playerName(opp)} не смог(ла) отгадать ${word}`, 'warn');
      });

      // Соперник обогнал меня по RP (переход через границу)
      const myRP = data.rp?.[myRole] || 0;
      const oppRP = data.rp?.[opp] || 0;
      const prevMyRP = prev.rp[myRole] || 0;
      const prevOppRP = prev.rp[opp] || 0;
      if (prevOppRP <= prevMyRP && oppRP > myRP) {
        showToast(`👑 ${playerName(opp)} вышел(шла) вперёд: ${oppRP} RP против ваших ${myRP}`, 'warn');
      }

      // Подарок от соперника
      const prevGifts = new Set(prev.gifts || []);
      Object.entries(data.gifts?.[myRole] || {}).forEach(([id, g]) => {
        if (prevGifts.has(id)) return;
        showToast(`🎁 ${playerName(g.from)} подарил(а) вам ${g.amount} 🪙`, 'ok');
      });

      // Новое достижение соперника (achievements появятся в Э6 — до этого просто не сработает)
      const prevAch = new Set(prev.ach || []);
      Object.keys(data.achievements?.[opp] || {}).forEach(id => {
        if (prevAch.has(id)) return;
        const def = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS.find(a => a.id === id) : null;
        showToast(`🏅 ${playerName(opp)} получил(а) достижение «${def ? def.name : id}»`, 'ok');
      });
    }

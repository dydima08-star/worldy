// Wordle Duo — экран истории матчей: список последних партий с фильтром по времени.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= ИСТОРИЯ МАТЧЕЙ =================

    const HISTORY_PAGE = 50;
    let currentHistoryPlayer = 1;
    let __historyRenderCount = HISTORY_PAGE;

    // Переключатель «Мои партии / Партии соперника» — по номеру роли, как в статистике
    function showHistoryFor(playerNum) {
      currentHistoryPlayer = playerNum;
      __historyRenderCount = HISTORY_PAGE;

      document.getElementById('history-btn-p1').style.background = playerNum === 1 ? 'var(--accent-color)' : '#272729';
      document.getElementById('history-btn-p1').style.color = playerNum === 1 ? 'white' : '#aaa';
      document.getElementById('history-btn-p1').style.border = playerNum === 1 ? 'none' : '1px solid var(--border-color)';

      document.getElementById('history-btn-p2').style.background = playerNum === 2 ? 'var(--accent-color)' : '#272729';
      document.getElementById('history-btn-p2').style.color = playerNum === 2 ? 'white' : '#aaa';
      document.getElementById('history-btn-p2').style.border = playerNum === 2 ? 'none' : '1px solid var(--border-color)';

      renderHistory();
    }

    function setHistoryFilter(filterType, btnEl) {
      historyFilter = filterType;
      __historyRenderCount = HISTORY_PAGE;
      document.querySelectorAll('#screen-history .shop-tab-btn').forEach(b => b.classList.remove('active'));
      if (btnEl) btnEl.classList.add('active');
      renderHistory();
    }

    function loadMoreHistory() {
      __historyRenderCount += HISTORY_PAGE;
      renderHistory();
    }

    // Фильтр по времени: сезон = текущий календарный месяц (как сброс сезона в main.js),
    // неделя = последние 7 дней. Старые записи без ts сравниваются по дате.
    function historyMatchesFilter(h) {
      if (historyFilter === 'all') return true;
      if (!h.date) return false;

      if (historyFilter === 'season') {
        const now = new Date();
        const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return h.date.slice(0, 7) === curMonth;
      }

      if (historyFilter === 'week') {
        const weekAgoTs = getNow() - 7 * 24 * 60 * 60 * 1000;
        if (h.ts) return h.ts >= weekAgoTs;
        const weekAgoDate = new Date(weekAgoTs).toISOString().slice(0, 10);
        return h.date >= weekAgoDate;
      }

      return true;
    }

    function formatHistoryDate(iso) {
      const parts = iso.split('-');
      const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]}`;
    }

    function historyCardHtml(h) {
      const resultIcon = h.win ? '🟩' : '🟥';
      const word = h.word || '—';
      const authorName = h.author === 'Система' ? 'Системы 📅' : playerName(h.author);
      const dateLabel = h.date ? formatHistoryDate(h.date) : '—';
      const durationLabel = h.ms ? ' · ' + formatDuration(h.ms) : '';
      return `
        <div style="background:#272729; border:1px solid var(--border-color); border-radius:8px; padding:10px 12px;">
          <div style="font-weight:bold; color:#fff;">${resultIcon} ${word} <span style="font-weight:normal; color:#aaa; font-size:0.8rem;">(${h.len} букв)</span></div>
          <div style="font-size:0.78rem; color:#999; margin-top:4px;">от ${authorName} · ${h.attempts}/${MAX_ATTEMPTS} попыток · ${dateLabel}${durationLabel}</div>
        </div>
      `;
    }

    function renderHistory() {
      renderAchievements(currentHistoryPlayer);

      const list = document.getElementById('history-list');
      if (!globalState) {
        list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Загрузка данных...</div>';
        return;
      }

      const entries = Object.values(globalState.history?.[currentHistoryPlayer] || {})
        .filter(historyMatchesFilter)
        .sort((a, b) => (b.ts || 0) - (a.ts || 0) || (b.date || '').localeCompare(a.date || ''));

      const moreBtn = document.getElementById('history-load-more');

      if (!entries.length) {
        list.innerHTML = '<div style="text-align:center;color:#777;padding:20px;">Партий пока нет</div>';
        moreBtn.classList.add('hidden');
        return;
      }

      const shown = entries.slice(0, __historyRenderCount);
      list.innerHTML = shown.map(historyCardHtml).join('');

      if (entries.length > shown.length) moreBtn.classList.remove('hidden');
      else moreBtn.classList.add('hidden');
    }

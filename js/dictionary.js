// Wordle Duo — словарь допустимых слов. ВАЖНО: грузится строго после words-data.js (DAILY_POOL и VALID_WORDS вычисляются сразу).
// Перенесено из index.html без изменений: строки 2706-2716.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // Слова дня берём из основного пула (удобные длины 4-8 букв)
    const DAILY_POOL = DAILY_WORDS_POOL.filter(w => w.length >= 4 && w.length <= 8);

    // Единый словарь допустимых слов (нормализация: нижний регистр, ё -> е)
    const VALID_WORDS = new Set(
      [...DAILY_WORDS_POOL, ...EXTRA_WORDS].map(w => w.toLowerCase().replace(/ё/g, 'е'))
    );
    function isValidWord(w) {
      const n = (w || '').toLowerCase().replace(/ё/g, 'е');
      return VALID_WORDS.has(n);
    }

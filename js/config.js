// Wordle Duo — неизменяемые константы и данные: ранги, товары магазина, награды рулетки, улучшения майнера, алфавит.
// Перенесено из index.html без изменений: строки 2728-2728, 2730-2744, 2809-2891, 3475-3475, 3579-3580, 3671-3672, 3853-3854.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    const MAX_ATTEMPTS = 6;

    // СИСТЕМА РАНГОВ
    const RANKS = [
      { name: 'Новичок', minRP: 0, maxRP: 999, color: '#95a5a6', icon: '🌱' },
      { name: 'Любитель', minRP: 1000, maxRP: 4999, color: '#3498db', icon: '⭐' },
      { name: 'Профи', minRP: 5000, maxRP: 14999, color: '#9b59b6', icon: '💎' },
      { name: 'Мастер', minRP: 15000, maxRP: 29999, color: '#e74c3c', icon: '🔥' },
      { name: 'Гроссмейстер', minRP: 30000, maxRP: Infinity, color: '#f39c12', icon: '👑' }
    ];

    function getRankByRP(rp) {
      for (let rank of RANKS) {
        if (rp >= rank.minRP && rp <= rank.maxRP) return rank;
      }
      return RANKS[0];
    }

    // БАЗА ИЗ 50 ТОВАРОВ МАГАЗИНА
    const SHOP_ITEMS = [
      // --- КАТЕГОРИЯ: НАВСЕГДА ---
      { id: 'perm_gray1', type: 'permanent', name: 'Разведка I (1 серая)', desc: 'Навсегда: 1 серая буква убирается в начале игры.', price: 8000, catName: 'Навсегда' },
      { id: 'perm_gray2', type: 'permanent', name: 'Разведка II (2 серые)', desc: 'Навсегда: 2 серые буквы убираются на старте.', price: 15000, catName: 'Навсегда' },
      { id: 'perm_gray3', type: 'permanent', name: 'Разведка III (3 серые)', desc: 'Навсегда: 3 серые буквы убираются на старте.', price: 30000, catName: 'Навсегда' },
      { id: 'perm_pos1', type: 'permanent', name: 'Первый шаг: Позиция 1', desc: 'Навсегда: 1-я буква всегда сразу открыта зелёным.', price: 60000, catName: 'Навсегда' },
      { id: 'perm_pos2', type: 'permanent', name: 'Первый шаг: Позиция 2', desc: 'Навсегда: 2-я буква всегда сразу открыта зелёным.', price: 54000, catName: 'Навсегда' },
      { id: 'perm_pos3', type: 'permanent', name: 'Первый шаг: Позиция 3', desc: 'Навсегда: 3-я буква всегда сразу открыта зелёным.', price: 48000, catName: 'Навсегда' },
      { id: 'perm_orange1', type: 'permanent', name: 'Сигнал I (1 оранжевая)', desc: 'Навсегда: 1 оранжевая буква подсвечена на старте.', price: 31500, catName: 'Навсегда' },
      { id: 'perm_orange2', type: 'permanent', name: 'Сигнал II (2 оранжевые)', desc: 'Навсегда: 2 оранжевые буквы подсвечены на старте.', price: 62000, catName: 'Навсегда' },
      { id: 'perm_extra_step', type: 'permanent', name: 'Запасной ход', desc: 'Навсегда: Дает +1 попытку на каждые 2 слова.', price: 37000, catName: 'Навсегда' },
      { id: 'perm_combo_shield', type: 'permanent', name: 'Страховка комбо', desc: 'Навсегда: 1 раз в сутки проигрыш не сбрасывает комбо.', price: 35000, catName: 'Навсегда' },
      { id: 'perm_investor', type: 'permanent', name: 'Инвестор', desc: 'Навсегда: +15% монет при обмене очков на монеты.', price: 4000, catName: 'Навсегда' },
      { id: 'perm_rare_detect', type: 'permanent', name: 'Редкий подбор', desc: 'Навсегда: Авто-открытие букв Ъ, Ь, Э при наличии.', price: 20000, catName: 'Навсегда' },
      { id: 'perm_vowel_detect', type: 'permanent', name: 'Детектор гласных', desc: 'Навсегда: 1 гласная буква подсвечена оранжевым.', price: 17000, catName: 'Навсегда' },
      { id: 'perm_gold_nick', type: 'permanent', name: 'Золотой статус', desc: 'Навсегда: Золотая рамка и значок 👑 в профиле.', price: 5000, catName: 'Навсегда' },

      // --- КАТЕГОРИЯ: НА ДЕНЬ ---
      { id: 'day_pos4', type: 'daily', name: 'Дневная 4-я позиция', desc: '24 часа: 4-я буква всегда открыта зелёным.', price: 400, catName: 'На день' },
      { id: 'day_pos5', type: 'daily', name: 'Дневная 5-я позиция', desc: '24 часа: 5-я буква всегда открыта зелёным.', price: 350, catName: 'На день' },
      { id: 'day_orange_boom', type: 'daily', name: 'Оранжевый бум', desc: '24 часа: 3 оранжевые буквы подсвечены в начале игры.', price: 600, catName: 'На день' },
      { id: 'day_radar4', type: 'daily', name: 'Дневной радар (4 серые)', desc: '24 часа: Убирает 4 серые буквы с клавиатуры на старте.', price: 490, catName: 'На день' },
      { id: 'day_long_start', type: 'daily', name: 'Длинный старт', desc: '24 часа: Первая буква бесплатна для слов от 7 букв.', price: 200, catName: 'На день' },
      { id: 'day_double_reward', type: 'daily', name: 'Удвоитель наград', desc: '24 часа: +50% монет при обмене очков на монеты.', price: 280, catName: 'На день' },
      { id: 'day_clean_sheet', type: 'daily', name: 'Чистый лист', desc: '24 часа: Буквы Ъ и Ь убираются, если их нет в слове.', price: 100, catName: 'На день' },
      { id: 'day_morning_boost', type: 'daily', name: 'Утренний буст', desc: '24 часа: Первые 3 победы за день дают x2 очков.', price: 100, catName: 'На день' },
      { id: 'day_zero_risk', type: 'daily', name: 'Нулевой риск', desc: '24 часа: За поражения очковый штраф равен 0.', price: 40, catName: 'На день' },
      { id: 'day_night_fever', type: 'daily', name: 'Ночной азарт', desc: '24 часа: С 20:00 до 00:00 все очки умножаются на 1.5.', price: 210, catName: 'На день' },
      { id: 'day_blitz_hunt', type: 'daily', name: 'Охота на блиц', desc: '24 часа: +150 🪙 за победу быстрее 60 секунд (до 3 раз в сутки).', price: 500, catName: 'На день' },

      // --- КАТЕГОРИЯ: НА НЕДЕЛЮ ---
      { id: 'week_erudit', type: 'weekly', name: 'Набор Эрудита', desc: '7 дней: Подсвечены 1 серая + 1 оранжевая буква.', price: 1600, catName: 'На неделю' },
      { id: 'week_immunity', type: 'weekly', name: 'Недельный иммунитет', desc: '7 дней: Сброс комбо только после 2 поражений подряд.', price: 1750, catName: 'На неделю' },
      { id: 'week_credit', type: 'weekly', name: 'Кредитный лимит', desc: '7 дней: Можно уходить в минус по очкам без сброса комбо.', price: 2900, catName: 'На неделю' },
      { id: 'week_long_scanner', type: 'weekly', name: 'Сканер длинных слов', desc: '7 дней: В словах от 6 букв гасятся 2 серые буквы.', price: 700, catName: 'На неделю' },
      { id: 'week_all_in', type: 'weekly', name: 'Набор "Всё включено"', desc: '7 дней: +1 ход + 1 оранжевая + 1 серая на старте.', price: 3400, catName: 'На неделю' },
      { id: 'week_combo_freeze', type: 'weekly', name: 'Заморозка комбо', desc: '7 дней: Комбо не падает ниже 2/5 при поражении.', price: 1700, catName: 'На неделю' },
      { id: 'week_giant_hunter', type: 'weekly', name: 'Охотник за гигантами', desc: '7 дней: Двойные очки за угадывание слов 7+ букв.', price: 700, catName: 'На неделю' },
      { id: 'week_lord_title', type: 'weekly', name: 'Титул Лорда', desc: '7 дней: Неоновая рамка + 10% бонус ко всем наградам.', price: 300, catName: 'На неделю' },
      { id: 'week_pos1', type: 'weekly', name: 'Недельная позиция 1', desc: '7 дней: 1-я буква всегда сразу открыта зелёным.', price: 3000, catName: 'На неделю' },

      // --- КАТЕГОРИЯ: РАЗОВЫЕ ТОВАРЫ ---
      { id: 'cons_target', type: 'consumable', name: 'Точечный прицел', desc: 'Разово: Выбираете позицию (1, 2 или 3) и открываете её.', price: 150, catName: 'Разовый' },
      { id: 'cons_deep_clean', type: 'consumable', name: 'Глубокая чистка', desc: 'Разово: Убирает 5 серых букв с клавиатуры.', price: 300, catName: 'Разовый' },
      { id: 'cons_vowel_scan', type: 'consumable', name: 'Сканер гласных (3 игры)', desc: 'На 3 игры: Подсвечивает гласные оранжевым.', price: 220, catName: 'Разовый' },
      { id: 'cons_life_saver', type: 'consumable', name: 'Спасательный круг', desc: 'Разово: Дает дополнительную 7-ю попытку.', price: 100, catName: 'Разовый' },
      { id: 'cons_xray', type: 'consumable', name: 'Рентген', desc: 'Разово: Показывает точное количество повторов букв.', price: 95, catName: 'Разовый' },
      { id: 'cons_finish_mark', type: 'consumable', name: 'Финишный маркер', desc: 'Разово: Открывает самую последнюю букву слова.', price: 130, catName: 'Разовый' },
      { id: 'cons_rand_green', type: 'consumable', name: 'Случайный зелёный', desc: 'Разово: Открывает 1 любую правильную букву.', price: 135, catName: 'Разовый' },
      { id: 'cons_pack_xray', type: 'consumable', name: 'Пакет «Рентген» (5 шт)', desc: 'Набор из 5 одноразовых проверок на повторы.', price: 360, catName: 'Разовый' },
      { id: 'cons_pack_clean', type: 'consumable', name: 'Пакет «Чистка» (3 шт)', desc: 'Набор из 3 чисток по 3 серые буквы.', price: 190, catName: 'Разовый' },
      { id: 'cons_va_bank', type: 'consumable', name: 'Ва-банк', desc: 'Разово: На 6-й попытке бесплатно открывает 1 букву.', price: 180, catName: 'Разовый' }
    ];

    // ЕЖЕДНЕВНЫЕ НАГРАДЫ РУЛЕТКИ
    // Шансы монотонно убывают: чем больше награда, тем реже она выпадает (сумма = 100)
    const DAILY_REWARDS = [
      { type: 'score', val: 100, label: '100 Очков 🎯', chance: 40 },
      { type: 'score', val: 250, label: '250 Очков 🎯', chance: 27 },
      { type: 'score', val: 500, label: '500 Очков 🎯', chance: 16 },
      { type: 'score', val: 1000, label: '1000 Очков 🎯', chance: 9 },
      { type: 'score', val: 2000, label: '💎 ДЖЕКПОТ: 2000 Очков!', chance: 4 },
      { type: 'boost', val: 1.35, label: '⚡ БУСТ x1.35 очков на 24ч', chance: 4 }
    ];

    // УЛУЧШЕНИЯ МАЙНЕРА
    const MINER_COST = 20000;
    const EARNING_UPGRADES = [
      { level: 1, coinsPerHour: 10, price: 0 }, // базовый уровень после покупки
      { level: 2, coinsPerHour: 20, price: 5000 },
      { level: 3, coinsPerHour: 30, price: 15000 },
      { level: 4, coinsPerHour: 35, price: 30000 },
      { level: 5, coinsPerHour: 40, price: 55000 }
      // далее: +10000 за каждый +1 монету/час
    ];

    const BATTERY_UPGRADES = [
      { level: 1, workHours: 4, restHours: 24, price: 0 }, // базовый уровень
      { level: 2, workHours: 5, restHours: 22, price: 10000 },
      { level: 3, workHours: 6, restHours: 20, price: 20000 },
      { level: 4, workHours: 8, restHours: 18, price: 35000 },
      { level: 5, workHours: 12, restHours: 12, price: 50000 },
      { level: 6, workHours: 20, restHours: 4, price: 100000 },
      { level: 7, workHours: 24, restHours: 0, price: 155000 } // всегда работает
    ];

    const CONSUMABLE_QTY = { cons_pack_xray: 5, cons_pack_clean: 3, cons_vowel_scan: 3 };

    // Ширина одной ячейки рулетки (должна совпадать с .roulette-item в CSS)
    const ROULETTE_ITEM_W = 140;

    const VOWELS = ['А', 'Е', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'];
    const RUS_ALPHABET = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');

    // КЕЙСЫ С БУКВАМИ (бесплатный суточный барабан прямо в игре)
    const DAILY_CASES = 2;                  // кейсов в сутки на игрока, на все слова сразу
    const CASE_EXTRA_SPIN_CHANCE = 0.10;    // шанс доп. прокрута (и на 2-й, и на 3-й) => 90% / 9% / 1%
    const CASE_MAX_SPINS = 3;
    const CASE_GREEN_CHANCE = 0.10;         // из букв, которые есть в слове, доля зелёных (с позицией)
    const CASE_ALPHABET = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split(''); // 32, без Ё (игра приводит Ё к Е)

    const IN_GAME_CONSUMABLES = ['cons_target', 'cons_finish_mark', 'cons_rand_green', 'cons_deep_clean',
      'cons_pack_clean', 'cons_vowel_scan', 'cons_life_saver', 'cons_xray', 'cons_pack_xray', 'cons_va_bank'];

// Wordle Duo — глобальное изменяемое состояние. Читается и пишется из всех остальных файлов.
// Перенесено из index.html без изменений: строки 2718-2727, 3365-3365, 3581-3581, 4073-4073.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
    let myRole = localStorage.getItem('wordle_role') ? parseInt(localStorage.getItem('wordle_role')) : null;
    let globalState = null;
    let activeWordId = null;
    let currentGuess = [];      // текущая попытка как массив (буквы по позициям)
    let selectedIndex = 0;      // активная клетка (для вставки в любое место)
    let sessionGreens = {};    // {idx: буква} — открытые зелёные буквы (подсказка, но клетку можно перезаписать)
    let sessionPresent = [];    // буквы-подсказки (оранжевые)
    let sessionRemoved = [];    // серые буквы, убранные с клавиатуры
    let sessionExtraAttempts = 0;

    let currentShopFilter = 'all';

    let isSpinning = false;

    let currentStatsPlayer = 1;

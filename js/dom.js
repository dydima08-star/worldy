// Wordle Duo — ссылки на экраны и переключение между ними. Скрипты стоят в конце body, поэтому getElementById здесь безопасен.
// Перенесено из index.html без изменений: строки 2746-2750, 2893-2898.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    const screenMenu = document.getElementById('screen-menu');
    const screenCreate = document.getElementById('screen-create');
    const screenGame = document.getElementById('screen-game');
    const screenShop = document.getElementById('screen-shop');
    const screenStats = document.getElementById('screen-stats');

    const screenMiner = document.getElementById('screen-miner');

    function showScreen(sc) {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      sc.classList.remove('hidden');
    }

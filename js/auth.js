// Wordle Duo — проверка ПИН-кода доступа. Подключается ПЕРВЫМ.
// Перенесено из index.html без изменений: строки 528-534.

    // 1. ПРОВЕРКА ПИН-КОДА
    const SECRET_PIN = "15130711";
    let userPin = prompt("Введите ПИН-код для доступа к игре:");
    if (userPin !== SECRET_PIN) {
      document.body.innerHTML = "<h2 style='color:white; text-align:center; margin-top:50px;'>Доступ закрыт!</h2>";
      window.__wordleAccessDenied = true;   // ДОБАВЛЕНО при рефакторинге: сигнал остальным файлам оборваться
      throw new Error("Неверный пин-код");
    }

// Wordle Duo — подарки монет сопернику.
// Перенесено из index.html без изменений: строки 4215-4253.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // ================= СИСТЕМА ПОДАРКОВ =================
    function openGiftModal() {
      document.getElementById('gift-modal').classList.remove('hidden');
      const myCoins = globalState?.coins?.[myRole] || 0;
      document.getElementById('gift-my-coins').innerText = myCoins;
    }

    function closeGiftModal() {
      document.getElementById('gift-modal').classList.add('hidden');
    }

    function sendGift(amount) {
      const myCoins = globalState?.coins?.[myRole] || 0;
      const targetPlayer = currentStatsPlayer;

      if (myCoins < amount) {
        showToast(`У вас недостаточно монет! Нужно ${amount}, а у вас ${myCoins} 🪙`, 'err');
        return;
      }

      if (targetPlayer === myRole) {
        showToast('Нельзя подарить монеты самому себе! 😅', 'warn');
        return;
      }

      showConfirm('Подарить монеты?', `Подарить ${amount} 🪙 монет Игроку ${targetPlayer}?`, 'Подарить').then(ok => {
        if (!ok) return;

        const targetCoins = globalState?.coins?.[targetPlayer] || 0;

        db.ref().update({
          [`wordle_season_v1/coins/${myRole}`]: myCoins - amount,
          [`wordle_season_v1/coins/${targetPlayer}`]: targetCoins + amount
        });

        showToast(`✅ Вы подарили ${amount} 🪙 Игроку ${targetPlayer}!`, 'ok');
        closeGiftModal();
      });
    }

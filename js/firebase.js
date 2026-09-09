// Wordle Duo — инициализация Firebase: db и gameRef.
// Перенесено из index.html без изменений: строки 536-550.

// Предохранитель: в исходнике throw при неверном ПИНе обрывал весь <script>.
// После разбиения на файлы каждый файл обрывает себя сам — поведение то же.
if (window.__wordleAccessDenied) throw new Error("Неверный пин-код");

    // 2. FIREBASE
    const firebaseConfig = {
      apiKey: "AIzaSyANgUxDFqTiITrbEQon6wh9rjLrptf1fjU",
      authDomain: "wordly-b9ae3.firebaseapp.com",
      databaseURL: "https://wordly-b9ae3-default-rtdb.firebaseio.com",
      projectId: "wordly-b9ae3",
      storageBucket: "wordly-b9ae3.firebasestorage.app",
      messagingSenderId: "1051522093123",
      appId: "1:1051522093123:web:885d80a6735904d54c04f6",
      measurementId: "G-N73KMXPL4Z"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const gameRef = db.ref('wordle_season_v1');

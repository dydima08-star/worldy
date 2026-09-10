// Wordle Duo — service worker: офлайн app-shell кэш. Живёт в корне репозитория,
// чтобы его scope покрывал index.html на GitHub Pages (сайт лежит в подпапке /<repo>/,
// поэтому здесь и в manifest.json используются только относительные пути).

// Версию поднимать вручную в каждом коммите, который меняет состав кэша или сам sw.js —
// иначе у уже установивших PWA игроков останется старый шелл.
const CACHE = 'wordle-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/auth.js',
  './js/firebase.js',
  './js/words-data.js',
  './js/dictionary.js',
  './js/config.js',
  './js/state.js',
  './js/dom.js',
  './js/dialog.js',
  './js/achievements.js',
  './js/history.js',
  './js/notify.js',
  './js/ui.js',
  './js/words.js',
  './js/shop.js',
  './js/bonus.js',
  './js/miner.js',
  './js/game-logic.js',
  './js/game-input.js',
  './js/game-render.js',
  './js/consumables.js',
  './js/stats.js',
  './js/gifts.js',
  './js/pwa.js',
  './js/main.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon-180.png',
  './assets/icons/favicon-32.png'
];

// Firebase SDK с gstatic — кэшируем отдельно и мягко: opaque-ответ (no-cors) не должен
// провалить всю установку, если обычный fetch с CORS не прошёл.
const FIREBASE_URLS = [
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      const ownFiles = cache.addAll(PRECACHE_URLS);
      const firebaseFiles = Promise.allSettled(
        FIREBASE_URLS.map((url) =>
          fetch(url)
            .then((res) => cache.put(url, res))
            .catch(() => fetch(url, { mode: 'no-cors' }).then((res) => cache.put(url, res)).catch(() => {}))
        )
      );
      return Promise.allSettled([ownFiles, firebaseFiles]);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Ждём команды со страницы (клик по тосту «Доступно обновление» в pwa.js), а не обновляем сами —
// чтобы не выбросить игрока из партии посреди хода.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Firebase RTDB и прочие API-запросы — никогда не кэшировать, всегда идут в сеть
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('googleapis.com')) return;

  // Навигация (открытие страницы): network-first, чтобы игра всегда была свежей онлайн,
  // а офлайн — фоллбэк на закэшированный index.html (app-shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isGstatic = url.hostname === 'www.gstatic.com';
  if (!sameOrigin && !isGstatic) return;

  // Статика (свой origin + gstatic): cache-first с фоновым обновлением (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

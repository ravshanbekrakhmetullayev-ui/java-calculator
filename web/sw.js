// Service worker: приложение открывается и считает без интернета.
// Файлы приложения берутся из кэша и обновляются в фоне; данные (data/*.json) — сначала из сети.
// Отчёты Allure и JaCoCo не кэшируются — это отдельные сайты в папках allure/ и coverage/.
const CACHE = 'qa-calc-v1';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/engine.js', 'js/suite.js', 'js/integrations.js', 'js/stations.js',
  'tests/cases.json', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const base = new URL(self.registration.scope).pathname;
  const path = url.pathname.slice(base.length);
  if (path.startsWith('allure/') || path.startsWith('coverage/')) return;

  if (path.startsWith('data/')) {
    // данные: свежие из сети, без сети — последние сохранённые
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }

  // приложение: сразу из кэша, в фоне — обновление
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((r) => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});

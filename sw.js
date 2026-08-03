const CACHE = 'finanzapp-v8';
const FIREBASE_CACHE = 'finanzapp-firebase';
const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/';
const ASSETS = [
  'index.html',
  'chart.min.js',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg',
  'css/styles.css',
  'js/app.js',
  'js/state.js',
  'js/config.js',
  'js/utils.js',
  'js/data.js',
  'js/members.js',
  'js/categories.js',
  'js/firebase-sync.js',
  'js/firebase-room.js',
  'js/ui-daily.js',
  'js/ui-analysis.js',
  'js/ui-charts.js',
  'js/ui-budgets.js',
  'js/ui-stats.js',
  'js/ui-modals.js',
  'js/ui-members.js',
  'js/ui-accounts.js',
  'js/ui-categories.js',
  'js/ui-theme.js',
  'js/ui-navigation.js',
  'js/setup-daily.js',
  'js/setup-analysis.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== FIREBASE_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes(FIREBASE_CDN)) {
    e.respondWith(
      caches.open(FIREBASE_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const fetchPromise = fetch(e.request).then(resp => {
            cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' })))
  );
});

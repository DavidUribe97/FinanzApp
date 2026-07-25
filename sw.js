const CACHE = 'finanzapp-v3';
const FIREBASE_CACHE = 'finanzapp-firebase';
const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/';
const ASSETS = [
  'index.html',
  'chart.min.js',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg'
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
        cache.match(e.request).then(cached =>
          fetch(e.request).then(resp => {
            cache.put(e.request, resp.clone());
            return resp;
          }).catch(() => cached || new Response('', { status: 503 }))
        )
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});

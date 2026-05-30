const CACHE = 'padelconnect-v1';
const OFFLINE = '/offline.html';

// Cache the offline page on install
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Skip non-GET and API requests — never cache those
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .catch(() =>
        // Network failed → serve offline page for navigation requests
        e.request.mode === 'navigate'
          ? caches.match(OFFLINE)
          : Response.error()
      )
  );
});

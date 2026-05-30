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
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .catch(() =>
        e.request.mode === 'navigate'
          ? caches.match(OFFLINE)
          : Response.error()
      )
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch { data = { title: 'PadelConnect', body: e.data?.text() ?? '' }; }

  const title   = data.title ?? 'PadelConnect';
  const options = {
    body:    data.body   ?? '',
    icon:    '/icon-192x192.png',
    badge:   '/favicon.svg',
    tag:     data.type   ?? 'general',
    data:    { url: data.url ?? '/' },
    vibrate: [200, 100, 200],
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: open or focus the app ─────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

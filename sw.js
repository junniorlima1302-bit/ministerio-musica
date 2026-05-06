const CACHE_NAME = 'musica-geral-v2';

const ARQUIVOS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/supabase.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARQUIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Exibe a notificação push ──
self.addEventListener('push', event => {
  let dados = {
    title: 'Música Geral Fortaleza',
    body: 'Você tem uma nova notificação.',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    data: { url: '/' }
  };

  if (event.data) {
    try { dados = { ...dados, ...JSON.parse(event.data.text()) }; } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      icon: dados.icon,
      badge: dados.badge,
      data: dados.data,
      vibrate: [200, 100, 200]
    })
  );
});

// ── Clique na notificação abre o app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const client of lista) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
/* global caches, clients, fetch, self, URL */

const CACHE_NAME = 'gemstone-app-v2';
const APP_SHELL = ['/', '/index.html', '/url_icon.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      )),
      clients.claim(),
    ]),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {};
  }

  const data = payload.data || {};
  const title = payload.notification?.title || data.title || 'GEMSTONE Reward';
  const body = payload.notification?.body || data.body || 'You have a new account update.';
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { route: data.route || '/notifications' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = event.notification.data?.route;
  const targetUrl = typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')
    ? route
    : '/notifications';

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
    for (const client of windowClients) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        if ('navigate' in client) await client.navigate(targetUrl).catch(() => undefined);
        return client.focus();
      }
    }
    return clients.openWindow(targetUrl);
  }));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && new URL(event.request.url).origin === self.location.origin) {
          const responseClone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone))
              .catch(() => undefined),
          );
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match('/index.html'))),
  );
});
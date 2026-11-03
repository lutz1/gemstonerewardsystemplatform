/* global clients, self */

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
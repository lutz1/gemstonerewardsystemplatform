self.addEventListener('push', (event) => {
  const payload = event.data && event.data.json ? event.data.json() : {};
  const title = payload.notification?.title || 'GEMSTONE Reward';
  const body = payload.notification?.body || payload.data?.body || 'You have a new GEM reward update.';
  const options = {
    body,
    icon: '/icons.svg',
    badge: '/icons.svg',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.route || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});

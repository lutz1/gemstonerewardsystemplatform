self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data?.json ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'GEMSTONE Reward';
  const body = notification.body || data.body || 'You have a new GEM reward update.';
  const options = {
    body,
    icon: '/icons.svg',
    badge: '/icons.svg',
    data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const targetUrl = typeof data.route === 'string' && data.route.trim()
    ? data.route.trim()
    : '/notifications';

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

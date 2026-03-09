// OpenResearch Service Worker — Web Push Handler

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'OpenResearch', body: e.data.text() }; }

  const options = {
    body: data.body ?? '',
    icon: '/oprs_logo.jpeg',
    badge: '/oprs_logo.jpeg',
    tag: data.tag ?? 'openresearch',
    data: { url: data.url ?? '/' },
    requireInteraction: false,
    silent: false,
  };

  e.waitUntil(
    self.registration.showNotification(data.title ?? 'OpenResearch', options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // 이미 열린 탭이 있으면 포커스
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // 없으면 새 탭
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

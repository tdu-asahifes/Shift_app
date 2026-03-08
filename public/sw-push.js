// Service Worker - Web Push通知受信処理
// next-pwaが自動登録します

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || '文化祭シフト管理';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'festival-shift',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // 既存のウィンドウがあればフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // なければ新しいウィンドウを開く
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

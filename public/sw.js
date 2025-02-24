self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
          self.registration.showNotification(data.notification.title, {
            icon: '/lumir.png',
            requireInteraction: true,
            vibrate: [100, 50, 100],
            body: "test",
            data: {
              priority: "high",
            },
            actions: [
              {
                action: 'close',
                title: '닫기',
              },
              
            ]
          })
        );
      }
  });

  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('/')
    );
  });
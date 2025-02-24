self.addEventListener('push', (event) => {
    console.log(event);
    const options = {
      body: event.data.text(),
      icon: '/icon.png',
      badge: '/icon.png',
      requireInteraction: false,
      silent: true,
      priority: 'high',
      tag: 'lumir',
      renotify: true,
      timestamp: Date.now(),
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: '자세히 보기'
        }
      ]
    };
  
    event.waitUntil(
      self.registration.showNotification('Push Notification', options)
    );
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('/')
    );
  });
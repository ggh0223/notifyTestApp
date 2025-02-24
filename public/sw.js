self.addEventListener('push', (event) => {
    const options = {
      body: event.data.text(),
      icon: '/icon.png',
      badge: '/icon.png',
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
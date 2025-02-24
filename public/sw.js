self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
          self.registration.showNotification(data.notification.title, {
            badge: data.notification.badge  ,
            icon: data.notification.icon,
            requireInteraction: data.notification.requireInteraction,
            vibrate: data.notification.vibrate,
            silent: data.notification.silent,
            body: data.notification.body,
            data: data.notification.data,
            actions: data.notification.actions,
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
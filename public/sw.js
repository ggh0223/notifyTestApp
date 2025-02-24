self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        console.log(data);
        const options = {
          ...data.notification,
          // 알림 우선순위 설정
          priority: 2, // 최대 우선순위
          // 화면이 잠겨있을 때도 표시
          showTrigger: Date.now(),
          // 알림음 설정
        //   sound: '/notification-sound.mp3',
          // 알림 표시 시간
          timestamp: Date.now()
        };
    
        event.waitUntil(
          self.registration.showNotification(data.notification.title, options)
        );
      }
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.openWindow('/')
    );
  });
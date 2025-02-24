const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  // 실제 존재하는 아이콘 파일들
  '/android-icon-36x36.png',
  '/android-icon-48x48.png',
  '/android-icon-72x72.png',
  '/android-icon-96x96.png',
  '/android-icon-144x144.png',
  '/android-icon-192x192.png',
  '/apple-icon-57x57.png',
  '/apple-icon-60x60.png',
  '/apple-icon-72x72.png',
  '/apple-icon-76x76.png',
  '/apple-icon-114x114.png',
  '/apple-icon-120x120.png',
  '/apple-icon-144x144.png',
  '/apple-icon-152x152.png',
  '/apple-icon-180x180.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-96x96.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // 각 파일을 개별적으로 캐시하여 일부 파일이 없더라도 계속 진행
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => 
              console.warn(`Failed to cache ${url}:`, err)
            )
          )
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const options = {
    ...event.data.notification,
    icon: '/android-icon-192x192.png',
    badge: '/android-icon-96x96.png',
  };

  event.waitUntil(
    self.registration.showNotification(event.data.notification.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
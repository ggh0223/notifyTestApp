const CACHE_NAME = "my-pwa-cache-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  // 실제 존재하는 아이콘 파일들
  "/android-icon-36x36.png",
  "/android-icon-48x48.png",
  "/android-icon-72x72.png",
  "/android-icon-96x96.png",
  "/android-icon-144x144.png",
  "/android-icon-192x192.png",
  "/apple-icon-57x57.png",
  "/apple-icon-60x60.png",
  "/apple-icon-72x72.png",
  "/apple-icon-76x76.png",
  "/apple-icon-114x114.png",
  "/apple-icon-120x120.png",
  "/apple-icon-144x144.png",
  "/apple-icon-152x152.png",
  "/apple-icon-180x180.png",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/favicon-96x96.png",
  "/firebase-messaging-sw.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.allSettled(
          urlsToCache.map((url) =>
            cache
              .add(url)
              .catch((err) => console.warn(`Failed to cache ${url}:`, err))
          )
        );
      }),
      // 서비스 워커 설치 즉시 활성화
      self.skipWaiting(),
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // 새로운 서비스 워커가 즉시 제어권을 가져가도록 함
      self.clients.claim(),
      // 이전 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => fetch(event.request))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log("push notification received:", data);

    const options = {
      ...data,
      icon: "/android-icon-192x192.png",
      badge: "/android-icon-96x96.png",
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "열기",
        },
        {
          action: "close",
          title: "닫기",
        },
      ],
    };
    console.log("options", options);
    event.waitUntil(self.registration.showNotification(data.title, options));
  } catch (err) {
    console.error("Push event handling failed:", err);
  }
});

// FCM 메시지 처리
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FCM_MSG") {
    const payload = event.data.payload;
    console.log("FCM message received:", payload);

    const options = {
      ...payload.notification,
      icon: "/android-icon-192x192.png",
      badge: "/android-icon-96x96.png",
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "열기",
        },
        {
          action: "close",
          title: "닫기",
        },
      ],
      data: payload.data,
    };

    self.registration.showNotification(payload.notification.title, options);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow("/");
      })
  );
});

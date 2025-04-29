// Firebase Cloud Messaging Service Worker
// 이 파일은 Firebase Cloud Messaging에 필요한 파일입니다
// FCM 라이브러리는 이 파일 경로를 기본값으로 참조합니다

// Firebase SDK 가져오기
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// Firebase 구성 관리를 위한 설정
// 모든 실제 알림 처리는 main service worker(sw.js)에서 처리됩니다
// 이 파일은 FCM이 요구하는 기본 서비스 워커 파일 경로입니다

// 메인 서비스 워커 파일에 등록되는 내용을 연결하기 위한 변수
self.fcmConfig = null;

// IndexedDB에서 FCM 구성 읽기
function getFCMConfigFromDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open("fcm-config-db", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("config", "readonly");
      const store = transaction.objectStore("config");
      const getRequest = store.get("current-config");

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.config);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        console.error("FCM 구성을 불러오는데 실패했습니다");
        resolve(null);
      };
    };

    request.onerror = () => {
      console.error("IndexedDB를 열 수 없습니다");
      resolve(null);
    };
  });
}

// Firebase 초기화 및 백그라운드 메시지 수신 설정
async function initializeFirebase() {
  try {
    // IndexedDB에서 FCM 구성 가져오기
    const config = await getFCMConfigFromDB();

    if (!config) {
      console.warn("FCM 구성을 찾을 수 없습니다");
      return;
    }

    // Firebase 초기화
    firebase.initializeApp(config);

    // FCM 설정
    const messaging = firebase.messaging();

    // 백그라운드 메시지 처리
    messaging.onBackgroundMessage((payload) => {
      console.log("백그라운드 메시지 수신:", payload);

      // 알림 옵션 설정
      const notificationOptions = {
        body: payload.notification?.body || "메시지 내용 없음",
        icon: payload.notification?.icon || "/icon-192x192.png",
        badge: "/icon-96x96.png",
        vibrate: [100, 50, 100],
        tag: "fcm-notification",
        data: payload.data || {},
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

      // 알림 표시
      self.registration.showNotification(
        payload.notification?.title || "알림",
        notificationOptions
      );
    });

    console.log("Firebase Messaging 초기화 완료");
  } catch (error) {
    console.error("Firebase 초기화 오류:", error);
  }
}

// 서비스 워커 시작 시 Firebase 초기화
initializeFirebase();

// 알림 클릭 이벤트 처리
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  // If there's a URL in the data, navigate to it
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }

      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Clear old caches on activation
const CACHE_VERSION = "v1.0.1";

// Basic service worker setup
self.addEventListener("install", (event) => {
  console.log("Installing Firebase Messaging Service Worker");

  // Force activation without waiting
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("Firebase Messaging Service Worker now active");

  // Take control of all clients
  event.waitUntil(self.clients.claim());

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith("fcm-") && cacheName !== CACHE_VERSION;
          })
          .map((cacheName) => {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
});

// Handle push messages
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log("Push message received:", data);

    const title = data.notification?.title || "Notification";
    const body = data.notification?.body || "";
    const icon = "/ms-icon-144x144.png";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        data: data.data,
      })
    );
  } catch (error) {
    console.error("Error handling push event:", error);
  }
});

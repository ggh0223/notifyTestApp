const CACHE_NAME = "fcm-test-app-cache-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-icon-180x180.png",
  "/favicon.ico",
];

// Install event - cache app shell
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
      // Activate new service worker immediately
      self.skipWaiting(),
    ])
  );
  console.log("Service Worker installed");
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),
      // Remove old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      }),
    ])
  );
  console.log("Service Worker activated");
});

// Fetch event - serve from cache when possible
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => fetch(event.request))
  );
});

// Push event - handle web push notifications
self.addEventListener("push", (event) => {
  console.log("Push received:", event);

  if (!event.data) {
    console.log("Push event has no data");
    return;
  }

  try {
    // Parse the data from the push event
    const data = event.data.json();
    console.log("Push notification data:", data);

    // Create notification options
    const options = {
      // Use data.notification properties if they exist
      body: data.body || data.notification?.body || "No message content",
      icon: data.icon || data.notification?.icon || "/icon-192x192.png",
      badge: data.badge || data.notification?.badge || "/icon-96x96.png",
      image: data.image || data.notification?.image,
      vibrate: [100, 50, 100],
      data: data.data || {},
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || true,
      renotify: data.renotify || false,
      actions: data.actions || [
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

    // Get title from data or notification object
    const title = data.title || data.notification?.title || "알림";

    // Show the notification
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error handling push event:", err);

    // Fallback if JSON parsing fails
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("알림", {
        body: text,
        icon: "/icon-192x192.png",
      })
    );
  }
});

// Handle FCM messages from Firebase
self.addEventListener("message", (event) => {
  console.log("Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === "FCM_MSG") {
    // Firebase Cloud Messaging sends messages with this format
    const payload = event.data.firebaseMessaging?.payload || event.data.payload;
    console.log("FCM message payload:", payload);

    if (!payload) return;

    try {
      // For FCM messages, the structure is different
      let title = "알림";
      let options = {
        body: "No message content",
        icon: "/icon-192x192.png",
      };

      // Handle FCM payload format differences
      if (payload.notification) {
        // Standard FCM format
        title = payload.notification.title || "알림";
        options = {
          body: payload.notification.body || "No message content",
          icon: payload.notification.icon || "/icon-192x192.png",
          badge: "/icon-96x96.png",
          vibrate: [100, 50, 100],
          data: payload.data || {},
          requireInteraction: true,
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
      } else if (typeof payload === "string") {
        // Some FCM implementations send string payload
        try {
          const parsedPayload = JSON.parse(payload);
          title = parsedPayload.title || "알림";
          options.body = parsedPayload.body || "No message content";
          options.data = parsedPayload.data || {};
        } catch {
          options.body = payload;
        }
      } else if (payload.data) {
        // Sometimes the notification is in the data field for data messages
        try {
          const notificationData =
            typeof payload.data.notification === "string"
              ? JSON.parse(payload.data.notification)
              : payload.data.notification;

          title = payload.data.title || notificationData?.title || "알림";
          options.body =
            payload.data.body || notificationData?.body || "No message content";
          options.data = payload.data || {};
        } catch (error) {
          console.error("Error parsing notification data:", error);
          options.body = JSON.stringify(payload.data);
        }
      }

      // Show the notification
      self.registration.showNotification(title, options);
    } catch (err) {
      console.error("Error handling FCM message:", err);
    }
  }
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  // Handle close action
  if (event.action === "close") {
    return;
  }

  // Handle click or open action
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Get URL from notification data if available
        const notificationData = event.notification.data || {};
        const url = notificationData.url || "/";

        // Check if a window is already open
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // If no window is open, open a new one
        return clients.openWindow(url);
      })
  );
});

// Notification close event
self.addEventListener("notificationclose", () => {
  console.log("Notification closed by user");
});

// Log any errors
self.addEventListener("error", (event) => {
  console.error("Service Worker error:", event.error);
});

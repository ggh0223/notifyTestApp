importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

// # FIREBASE_API_KEY=AIzaSyBQ1xJlVCd43FB9xJE591MdVqoq6be_7XA
// # FIREBASE_AUTH_DOMAIN=lumir-notification.firebaseapp.com
// # FIREBASE_PROJECT_ID=lumir-notification
// # FIREBASE_STORAGE_BUCKET=lumir-notification.firebasestorage.app
// # FIREBASE_MESSAGING_SENDER_ID=217443719677
// # FIREBASE_APP_ID=1:217443719677:web:f2b5ab79c2ec1c4cf76194
// # FIREBASE_MEASUREMENT_ID=G-ZG3T4FVWE2

firebase.initializeApp({
  apiKey: "AIzaSyBQ1xJlVCd43FB9xJE591MdVqoq6be_7XA",
  authDomain: "lumir-notification.firebaseapp.com",
  projectId: "lumir-notification",
  messagingSenderId: "217443719677",
  appId: "1:217443719677:web:f2b5ab79c2ec1c4cf76194",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);

  const notificationOptions = {
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

  self.registration.showNotification(
    payload.notification.title,
    notificationOptions
  );
});

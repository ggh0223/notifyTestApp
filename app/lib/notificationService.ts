// Notification service to safely handle Firebase functionality

import { ServerConfig } from "./storage";

// Type for notification payload
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// 실제 서버로 알림을 전송하는 함수
export async function sendNotification(
  serverConfig: ServerConfig,
  authToken: string,
  payload: NotificationPayload
): Promise<void> {
  console.log("Sending notification to server:", {
    server: serverConfig.name,
    notifyUrl: serverConfig.notifyUrl,
    payload,
  });

  try {
    // 서버에 실제 HTTP 요청 보내기
    const response = await fetch(serverConfig.notifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken ? `Bearer ${authToken}` : "",
      },
      body: JSON.stringify({
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
      }),
    });

    if (!response.ok) {
      // 서버에서 오류 응답이 돌아온 경우
      const errorText = await response.text();
      throw new Error(`서버 응답 오류 (${response.status}): ${errorText}`);
    }

    // 정상 응답 처리
    const result = await response.json();
    console.log("알림 전송 성공:", result);

    // 로컬 알림도 함께 표시 (선택 사항)
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(payload.title, {
        body: payload.body,
        data: payload.data,
      });
    }
  } catch (error) {
    console.error("알림 전송 실패:", error);
    throw error; // 상위 함수에서 오류 처리할 수 있도록 다시 던지기
  }
}

// Safely loads Firebase modules only when needed
const loadFirebase = async () => {
  // Make sure we're in browser environment
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be loaded in a browser environment");
  }

  try {
    // Use a more reliable dynamic import pattern
    const firebaseApp = await import("firebase/app");
    const firebaseMessaging = await import("firebase/messaging");

    return {
      firebase: firebaseApp,
      messaging: firebaseMessaging,
    };
  } catch (error) {
    console.error(
      "Failed to load Firebase:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
};

// Initialize Firebase messaging (safely loaded only when needed)
export async function initializeFirebaseMessaging(
  firebaseConfig: ServerConfig["firebaseConfig"]
): Promise<string | null> {
  try {
    // Safely check if we're in a browser environment
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("Notifications are not supported in this environment");
      return null;
    }

    // Load Firebase modules
    const { firebase, messaging } = await loadFirebase();

    // Initialize app
    const app = firebase.initializeApp(firebaseConfig, "notification-app");
    const messagingInstance = messaging.getMessaging(app);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    // Get token
    const token = await messaging.getToken(messagingInstance, {
      vapidKey: "YOUR_VAPID_KEY", // Replace with your actual VAPID key
    });

    return token;
  } catch (error) {
    console.error(
      "Failed to initialize Firebase messaging:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

// Subscribe to FCM messages (won't be used in the current app but provided for reference)
export async function subscribeToMessages(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  callback: (payload: NotificationPayload) => void
): Promise<() => void> {
  // This is a mock implementation
  // In a real app, we would use Firebase onMessage

  console.log("Subscribing to messages");

  // Return an unsubscribe function
  return () => {
    console.log("Unsubscribing from messages");
  };
}

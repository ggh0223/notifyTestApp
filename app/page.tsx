"use client";
import { useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface LoginFormProps {
  onLoginSuccess: (token: string) => void;
}

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });

      console.log("response", response);

      if (!response.ok) {
        throw new Error("로그인 실패");
      }

      const data = await response.json();
      console.log("data", data);
      onLoginSuccess(data.data.accessToken);
      setError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "로그인 실패";
      setError(errorMessage);
    }
  }

  return (
    <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 mb-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          이메일
        </label>
        <input
          type="email"
          id="email"
          value={loginForm.email}
          onChange={(e) =>
            setLoginForm((prev) => ({ ...prev, email: e.target.value }))
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          비밀번호
        </label>
        <input
          type="password"
          id="password"
          value={loginForm.password}
          onChange={(e) =>
            setLoginForm((prev) => ({ ...prev, password: e.target.value }))
          }
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        로그인
      </button>
    </form>
  );
};

interface NotificationControlProps {
  authToken: string;
}

const NotificationControl = ({ authToken }: NotificationControlProps) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBrowserSupport();
    registerServiceWorker();
    checkNotificationPermission();
  }, []);

  const checkBrowserSupport = () => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window &&
      (window.location.protocol === "https:" ||
        window.location.hostname === "localhost");
    setIsSupported(supported);
  };

  const checkNotificationPermission = async () => {
    const result = await navigator.permissions.query({ name: "notifications" });
    if (result.state === "denied") {
      setError(
        "알림이 차단되었습니다. 크롬 설정에서 '팝업으로 표시'를 활성화하세요."
      );
    }
  };

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await registration.update();
      checkSubscription(registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  async function checkSubscription(registration: ServiceWorkerRegistration) {
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
    setSubscription(subscription);
  }

  async function subscribeToNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("알림 권한이 거부되었습니다.");
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      const existingSubscription =
        await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      });

      const response = await fetch(`${apiUrl}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error("서버에 구독 정보 전송 실패");
      }

      setIsSubscribed(true);
      setSubscription(subscription);
      setError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 에러가 발생했습니다.";
      setError(errorMessage);
    }
  }

  async function unsubscribeFromNotifications() {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`${apiUrl}/notifications/unsubscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(subscription),
        });

        setIsSubscribed(false);
        setSubscription(null);
        setError(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 에러가 발생했습니다.";
      setError(errorMessage);
    }
  }

  async function sendTestNotification() {
    try {
      const response = await fetch(`${apiUrl}/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("테스트 알림 전송 실패");
      }
      setError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 에러가 발생했습니다.";
      setError(errorMessage);
    }
  }

  if (!isSupported) {
    return (
      <div className="text-red-500">
        브라우저가 웹 푸시 알림을 지원하지 않습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {isSupported && !isSubscribed ? (
        <button
          onClick={subscribeToNotifications}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          알림 구독하기
        </button>
      ) : (
        isSupported && (
          <div className="space-x-4">
            <button
              onClick={unsubscribeFromNotifications}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              구독 취소하기
            </button>
            <button
              onClick={sendTestNotification}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              테스트 알림 보내기
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // 초기 로드 시 localStorage에서 토큰 확인
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      setAuthToken(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    console.log("Login success, token:", token);
    // localStorage에 토큰 저장
    localStorage.setItem("authToken", token);
    setAuthToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setAuthToken(null);
    setIsLoggedIn(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold mb-4">Web Push 데모</h1>

      {!isLoggedIn ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="block sm:inline">로그인 완료</span>
                <div className="mt-2 text-xs font-mono break-all">
                  <div>Token: {authToken?.slice(0, 20)}...</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                로그아웃
              </button>
            </div>
          </div>
          {authToken && <NotificationControl authToken={authToken} />}
        </>
      )}
    </div>
  );
}

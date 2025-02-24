'use client';
import { useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface BrowserSupport {
  serviceWorker: boolean;
  pushManager: boolean;
  notifications: boolean;
  https: boolean;
}

interface CheckStatus {
  notificationPermission: boolean;
  serviceWorkerRegistered: boolean;
  pushSubscribed: boolean;
}

export default function Home() {
  const [isSupported, setIsSupported] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [supportDetails, setSupportDetails] = useState<BrowserSupport>({
    serviceWorker: false,
    pushManager: false,
    notifications: false,
    https: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('prompt');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>({
    notificationPermission: false,
    serviceWorkerRegistered: false,
    pushSubscribed: false
  });

  useEffect(() => {
    navigator.permissions.query({ name: "notifications" }).then((result) => {
      setNotificationPermission(result.state);
      
      // 권한 상태 변경 감지
      result.addEventListener('change', () => {
        setNotificationPermission(result.state);
      });

      if (result.state === "denied") {
        setError("알림이 차단되었습니다. 크롬 설정에서 '팝업으로 표시'를 활성화하세요.");
      }
    });
    checkBrowserSupport();
    registerServiceWorker();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // PWA 설치 감지
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // 필요한 경우 설치 프롬프트를 나중에 표시하기 위해 이벤트를 저장
      // deferredPrompt = e;
    });

    // PWA가 설치되었을 때
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    checkAllStatus();
  }, []);

  const checkBrowserSupport = () => {
    const details: BrowserSupport = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
      https: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    };

    setSupportDetails(details);
    setIsSupported(Object.values(details).every(Boolean));
  };

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();
      
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      checkSubscription(registration);
      setError(null); // 성공 시 에러 초기화
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.';
      console.error('Service Worker 등록 실패:', error);
      setError(`Service Worker 등록 실패: ${errorMessage}`);
    }
  }

  async function checkSubscription(registration: ServiceWorkerRegistration) {
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
    setSubscription(subscription);
  }

  async function subscribeToNotifications() {
    try {
      // 먼저 알림 권한 요청
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('알림 권한이 거부되었습니다.');
      }

      // Service Worker 등록 확인
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await registration.update();
      }

      // 기존 구독이 있다면 제거
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // 새로운 구독 생성
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      // NestJS 서버로 subscription 정보 전송
      const response = await fetch(`${apiUrl}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('서버에 구독 정보 전송 실패');
      }
      
      setIsSubscribed(true);
      setSubscription(subscription);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.';
      console.error('알림 구독 실패:', error);
      setError(`알림 구독 실패: ${errorMessage}`);
    }
  }

  async function unsubscribeFromNotifications() {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        
        // 서버에 구독 취소 요청
        await fetch(`${apiUrl}/notifications/unsubscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(subscription)
        });

        setIsSubscribed(false);
        setSubscription(null);
        setError(null); // 성공 시 에러 초기화
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.';
      console.error('알림 구독 취소 실패:', error);
      setError(`알림 구독 취소 실패: ${errorMessage}`);
    }
  }

  async function sendTestNotification() {
    try {
      const response = await fetch(`${apiUrl}/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('테스트 알림 전송 실패');
      }
      setError(null); // 성공 시 에러 초기화
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 에러가 발생했습니다.';
      console.error('테스트 알림 전송 실패:', error);
      setError(`테스트 알림 전송 실패: ${errorMessage}`);
    }
  }

  const getPermissionText = (state: PermissionState) => {
    const texts = {
      'granted': '알림 권한이 허용되었습니다',
      'denied': '알림 권한이 차단되었습니다',
      'prompt': '알림 권한을 요청할 수 있습니다'
    };
    return texts[state];
  };

  const getPermissionColor = (state: PermissionState) => {
    const colors = {
      'granted': 'bg-green-100 text-green-700 border-green-400',
      'denied': 'bg-red-100 text-red-700 border-red-400',
      'prompt': 'bg-yellow-100 text-yellow-700 border-yellow-400'
    };
    return colors[state];
  };

  const checkAllStatus = async () => {
    // 알림 권한 확인
    const permission = await Notification.permission;
    
    // 서비스 워커 등록 확인
    const registration = await navigator.serviceWorker.getRegistration();
    
    // 푸시 구독 상태 확인
    const subscription = registration ? await registration.pushManager.getSubscription() : null;

    setCheckStatus({
      notificationPermission: permission === 'granted',
      serviceWorkerRegistered: !!registration,
      pushSubscribed: !!subscription
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold mb-4">Web Push 데모</h1>
      
      {/* 상태 체크 결과 */}
      <div className="mb-4 w-full max-w-md">
        <h2 className="font-bold mb-2">상태 체크:</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border rounded">
            <span>알림 권한</span>
            <span className={checkStatus.notificationPermission ? "text-green-600" : "text-red-600"}>
              {checkStatus.notificationPermission ? "✓ 허용됨" : "✗ 허용되지 않음"}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 border rounded">
            <span>서비스 워커</span>
            <span className={checkStatus.serviceWorkerRegistered ? "text-green-600" : "text-red-600"}>
              {checkStatus.serviceWorkerRegistered ? "✓ 등록됨" : "✗ 등록되지 않음"}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 border rounded">
            <span>푸시 구독</span>
            <span className={checkStatus.pushSubscribed ? "text-green-600" : "text-red-600"}>
              {checkStatus.pushSubscribed ? "✓ 구독중" : "✗ 구독되지 않음"}
            </span>
          </div>
        </div>
      </div>

      {/* 알림 권한 상태 표시 */}
      <div className={`border px-4 py-3 rounded relative mb-4 ${getPermissionColor(notificationPermission)}`}>
        <strong className="font-bold">알림 권한 상태: </strong>
        <span className="block sm:inline">{getPermissionText(notificationPermission)}</span>
      </div>

      {/* 브라우저 지원 현황 */}
      {!isSupported && (
        <div className="text-red-500 mb-4">
          <p className="font-bold mb-2">브라우저 지원 현황:</p>
          <ul className="list-disc pl-5">
            {!supportDetails.serviceWorker && (
              <li>Service Worker가 지원되지 않습니다.</li>
            )}
            {!supportDetails.pushManager && (
              <li>Push API가 지원되지 않습니다.</li>
            )}
            {!supportDetails.notifications && (
              <li>Notifications API가 지원되지 않습니다.</li>
            )}
            {!supportDetails.https && (
              <li>HTTPS 연결이 필요합니다.</li>
            )}
          </ul>
        </div>
      )}

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">에러 발생! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* 기존 버튼들 */}
      {isSupported && !isSubscribed ? (
        <button
          onClick={subscribeToNotifications}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          알림 구독하기
        </button>
      ) : isSupported && (
        <>
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
        </>
      )}
    </div>
  );
}
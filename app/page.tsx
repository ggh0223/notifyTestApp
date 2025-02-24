'use client';
import { useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export default function Home() {
  const [isSupported, setIsSupported] = useState(true);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    // 브라우저 지원 여부 확인
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }

    // HTTPS 확인
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setIsSupported(false);
      return;
    }

    registerServiceWorker();
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`);
      checkSubscription(registration);
    } catch (error) {
      console.error('Service Worker 등록 실패:', error);
    }
  }

  async function checkSubscription(registration: ServiceWorkerRegistration) {
    const subscription = await registration.pushManager.getSubscription();
    setIsSubscribed(!!subscription);
    setSubscription(subscription);
  }

  async function subscribeToNotifications() {
    try {
      
      // Service Worker 등록 확인
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`);
      }
      
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('알림 권한이 거부되었습니다.');
      }

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
    } catch (error) {
      console.error('알림 구독 실패:', error);
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
      }
    } catch (error) {
      console.error('알림 구독 취소 실패:', error);
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
    } catch (error) {
      console.error('테스트 알림 전송 실패:', error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold mb-4">Web Push 데모</h1>
      {!isSupported ? (
          <p className="text-red-500">
            이 브라우저는 웹 푸시 알림을 지원하지 않습니다.
          </p>
        ) : !isSubscribed ? (
        <button
          onClick={subscribeToNotifications}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          알림 구독하기
        </button>
      ) : (
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
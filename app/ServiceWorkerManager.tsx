"use client";

import { useEffect, useState } from "react";
import {
  registerServiceWorkers,
  unregisterAllServiceWorkers,
} from "./lib/sw-register";

export default function ServiceWorkerManager() {
  const [message, setMessage] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    async function initServiceWorkers() {
      try {
        await registerServiceWorkers();
        setMessage("서비스 워커가 등록되었습니다.");

        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error("서비스 워커 등록 실패:", error);
        setMessage("서비스 워커 등록에 실패했습니다.");
      }
    }

    // Only register in browser environment
    if (typeof window !== "undefined") {
      initServiceWorkers();

      // Listen for service worker lifecycle events
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log(
            "Service worker controller has changed - new content is available"
          );
          setMessage("새 버전이 적용되었습니다!");

          // Clear message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        });
      }
    }
  }, []);

  const handleUnregister = async () => {
    try {
      await unregisterAllServiceWorkers();
      setMessage("서비스 워커가 제거되었습니다. 페이지가 새로고침됩니다...");
    } catch (error) {
      console.error("서비스 워커 제거 실패:", error);
      setMessage("서비스 워커 제거에 실패했습니다.");
    }
  };

  const handleForceUpdate = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let updated = false;

      for (const registration of registrations) {
        try {
          await registration.update();
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            updated = true;
          }
        } catch (error) {
          console.error("서비스 워커 업데이트 실패:", error);
        }
      }

      if (updated) {
        setMessage("서비스 워커 업데이트 중...");
      } else {
        setMessage("이미 최신 버전입니다.");
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleHardReload = () => {
    if (typeof window !== "undefined") {
      // Force a hard reload by clearing cache
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {message && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm">
          {message}
        </div>
      )}

      <button
        onClick={() => setShowControls(!showControls)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg"
        aria-label="서비스 워커 관리"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {showControls && (
        <div className="bg-white rounded-lg shadow-lg p-3 mb-2 flex flex-col space-y-2">
          <button
            onClick={handleForceUpdate}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            서비스 워커 업데이트
          </button>
          <button
            onClick={handleHardReload}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
          >
            강력 새로고침
          </button>
          <button
            onClick={handleUnregister}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            서비스 워커 제거
          </button>
        </div>
      )}
    </div>
  );
}

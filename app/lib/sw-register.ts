// Service Worker Registration Utility

/**
 * Register service workers with cache busting
 */
export async function registerServiceWorkers(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("Service workers are not supported in this environment");
    return;
  }

  try {
    // Add timestamp to service worker URL to bust cache
    const timestamp = new Date().getTime();

    // Register main service worker
    const mainSwRegistration = await navigator.serviceWorker.register(
      `/sw.js?v=${timestamp}`,
      { scope: "/" }
    );
    console.log(
      "Main Service Worker registered with scope:",
      mainSwRegistration.scope
    );

    // Register Firebase Messaging Service Worker
    const fcmSwRegistration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?v=${timestamp}`,
      { scope: "/" }
    );
    console.log(
      "FCM Service Worker registered with scope:",
      fcmSwRegistration.scope
    );

    // Force service worker update
    await forceServiceWorkerUpdate(mainSwRegistration);
    await forceServiceWorkerUpdate(fcmSwRegistration);
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

/**
 * Forces a service worker to update
 */
async function forceServiceWorkerUpdate(
  registration: ServiceWorkerRegistration
): Promise<void> {
  try {
    // Check for updates
    await registration.update();

    if (registration.waiting) {
      // If there's a waiting worker, force it to become active
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  } catch (error) {
    console.error("Failed to update service worker:", error);
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    for (const registration of registrations) {
      await registration.unregister();
      console.log("Unregistered service worker:", registration.scope);
    }

    // Force page reload to ensure clean state
    window.location.reload();
  } catch (error) {
    console.error("Error unregistering service workers:", error);
  }
}

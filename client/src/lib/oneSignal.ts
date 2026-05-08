// Lightweight OneSignal Web SDK helper. The SDK script is loaded via
// <script defer> in index.html. We delay init until window load + user known.

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

let initialized = false;
let initPromise: Promise<void> | null = null;

export function initOneSignal(appId: string): Promise<void> {
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = new Promise<void>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: "/OneSignalSDKWorker.js",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });
        initialized = true;
        resolve();
      } catch (e) {
        console.error("[OneSignal] init failed", e);
        resolve();
      }
    });
  });
  return initPromise;
}

export async function loginOneSignalUser(externalUserId: string | number): Promise<void> {
  if (!window.OneSignal) return;
  try {
    await window.OneSignal.login(String(externalUserId));
  } catch (e) {
    console.warn("[OneSignal] login failed", e);
  }
}

export async function logoutOneSignalUser(): Promise<void> {
  if (!window.OneSignal) return;
  try {
    await window.OneSignal.logout();
  } catch (e) {
    console.warn("[OneSignal] logout failed", e);
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!window.OneSignal) return false;
  try {
    const browserPerm: NotificationPermission =
      typeof Notification !== "undefined" ? Notification.permission : "default";

    // If permission was previously denied, the browser will not re-prompt.
    if (browserPerm === "denied") {
      console.warn("[OneSignal] Notifications previously blocked by the browser.");
      return false;
    }

    // v16 prefers the Slidedown prompt to trigger the native dialog reliably.
    // Fall back to direct requestPermission if Slidedown is unavailable.
    if (window.OneSignal.Slidedown?.promptPush) {
      try {
        await window.OneSignal.Slidedown.promptPush({ force: true });
      } catch (e) {
        console.warn("[OneSignal] Slidedown failed, falling back", e);
      }
    }
    if (typeof window.OneSignal.Notifications?.requestPermission === "function") {
      try { await window.OneSignal.Notifications.requestPermission(); } catch {}
    }

    // Wait briefly for the SDK to register the subscription after consent.
    for (let i = 0; i < 20; i++) {
      if (isPushOptedIn()) return true;
      await new Promise(r => setTimeout(r, 250));
    }
    return isPushOptedIn();
  } catch (e) {
    console.error("[OneSignal] requestPermission failed", e);
    return false;
  }
}

export function isPushOptedIn(): boolean {
  if (!window.OneSignal) return false;
  try {
    return !!window.OneSignal.User?.PushSubscription?.optedIn;
  } catch {
    return false;
  }
}

export function getOneSignalSubscriptionId(): string | null {
  if (!window.OneSignal) return null;
  try {
    return window.OneSignal.User?.PushSubscription?.id || null;
  } catch {
    return null;
  }
}

export function onSubscriptionChange(cb: (id: string | null) => void): () => void {
  if (!window.OneSignal) return () => {};
  const handler = (event: any) => {
    cb(event?.current?.id ?? null);
  };
  try {
    window.OneSignal.User.PushSubscription.addEventListener("change", handler);
    return () => window.OneSignal.User.PushSubscription.removeEventListener("change", handler);
  } catch {
    return () => {};
  }
}

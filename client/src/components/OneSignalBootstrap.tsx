import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-auth";
import {
  initOneSignal,
  loginOneSignalUser,
  logoutOneSignalUser,
  getOneSignalSubscriptionId,
  onSubscriptionChange,
} from "@/lib/oneSignal";
import { apiRequest } from "@/lib/queryClient";

export function OneSignalBootstrap() {
  const { data: user } = useUser();
  const initRef = useRef(false);
  const lastUserRef = useRef<number | null>(null);
  const lastRegisteredIdRef = useRef<string | null>(null);

  useEffect(() => {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId || initRef.current) return;
    initRef.current = true;
    initOneSignal(appId);
  }, []);

  // Login/logout external user when auth changes
  useEffect(() => {
    if (!import.meta.env.VITE_ONESIGNAL_APP_ID) return;
    const currentId = user?.id ?? null;
    if (currentId === lastUserRef.current) return;
    lastUserRef.current = currentId;

    (async () => {
      await initOneSignal(import.meta.env.VITE_ONESIGNAL_APP_ID);
      if (currentId) {
        await loginOneSignalUser(currentId);
        const subId = await getOneSignalSubscriptionId();
        if (subId && subId !== lastRegisteredIdRef.current) {
          lastRegisteredIdRef.current = subId;
          try {
            await apiRequest("POST", "/api/notifications/register", {
              oneSignalPlayerId: subId,
              platform: "web",
            });
          } catch (e) {
            console.warn("[OneSignal] register failed", e);
          }
        }
      } else {
        await logoutOneSignalUser();
        lastRegisteredIdRef.current = null;
      }
    })();
  }, [user?.id]);

  // React to subscription change events (e.g., user grants permission later).
  // Wait for SDK init to complete before binding so the listener actually attaches.
  useEffect(() => {
    if (!user?.id) return;
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!appId) return;
    let off: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      await initOneSignal(appId);
      if (cancelled) return;
      off = onSubscriptionChange(async (subId) => {
        if (!subId || subId === lastRegisteredIdRef.current) return;
        lastRegisteredIdRef.current = subId;
        try {
          await apiRequest("POST", "/api/notifications/register", {
            oneSignalPlayerId: subId,
            platform: "web",
          });
        } catch (e) {
          console.warn("[OneSignal] subscription register failed", e);
        }
      });
    })();
    return () => { cancelled = true; if (off) off(); };
  }, [user?.id]);

  return null;
}

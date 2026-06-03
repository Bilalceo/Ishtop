"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Web Push subscription state. Backend wiring (VAPID + /push/subscribe) is
 * optional — the hook gracefully no-ops if no public key is configured.
 */
export type PushStatus = "unsupported" | "default" | "granted" | "denied";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const SUBSCRIBE_ENDPOINT = "/api/push/subscribe";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushStatus);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, []);

  const subscribe = useCallback(async () => {
    if (status === "unsupported") return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub && VAPID_PUBLIC_KEY) {
        const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
        // Best-effort POST to backend — silently ignored if endpoint missing.
        try {
          await fetch(SUBSCRIBE_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(sub.toJSON()),
          });
        } catch {
          // ignore — local notification permission still works
        }
      }
      setSubscribed(!!sub);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [status]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, subscribed, busy, subscribe, unsubscribe };
}

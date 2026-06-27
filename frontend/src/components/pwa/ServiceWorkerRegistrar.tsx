"use client";

import { useEffect } from "react";

/**
 * Registers the IshTop service worker (sw.js) for offline + push.
 * Skips in development to avoid stale-cache pain during HMR.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // In development, actively tear down any leftover service worker + caches.
    // A production build (or preview) previously run on the same origin/port
    // registers an origin-scoped SW that otherwise survives into dev and serves
    // stale, hashed-but-immutable chunks — silently breaking HMR and shipping an
    // out-of-date bundle (wrong API URL, missing fixes) to the running tab.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => null);
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}

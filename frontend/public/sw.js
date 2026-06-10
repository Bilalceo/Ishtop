/* =============================================================================
   IshTop Service Worker — offline-first cache for shell + jobs API
   Strategy:
     - App shell: cache-first (static assets, /offline)
     - Jobs API GETs: stale-while-revalidate (instant load + background refresh)
     - Everything else: network-first with cache fallback
   ============================================================================= */

const VERSION = "v1.0.1";
const SHELL_CACHE = `ishtop-shell-${VERSION}`;
const API_CACHE = `ishtop-api-${VERSION}`;
const RUNTIME_CACHE = `ishtop-runtime-${VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/logo-mark.png",
  "/favicon-32x32.png",
];

// ---------------- Install: precache shell ----------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => null))
      .then(() => self.skipWaiting()),
  );
});

// ---------------- Activate: clean old caches ----------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("ishtop-") && !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ---------------- Helpers ----------------
function isJobsApi(url) {
  return /\/api\/(v\d+\/)?jobs(\/|\?|$)/.test(url);
}
function isNextStatic(url) {
  return url.includes("/_next/static/");
}
function isImage(req) {
  return req.destination === "image";
}

// stale-while-revalidate
async function swrFetch(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone()).catch(() => null);
      return res;
    })
    .catch(() => null);
  return cached || network || new Response(JSON.stringify({ offline: true }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

// network-first with cache fallback
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok && request.method === "GET") {
      cache.put(request, res.clone()).catch(() => null);
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match("/offline");
      if (offline) return offline;
    }
    throw new Error("offline");
  }
}

// cache-first
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone()).catch(() => null);
  return res;
}

// ---------------- Fetch routing ----------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;

  // Skip cross-origin auth & payment requests (Stripe, Google)
  if (
    url.includes("stripe.com") ||
    url.includes("google.com") ||
    url.includes("googleusercontent.com")
  ) {
    return;
  }

  // Next.js static assets — cache-first (immutable hashed)
  if (isNextStatic(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Jobs API — stale-while-revalidate
  if (isJobsApi(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Images — cache-first
  if (isImage(request)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Navigations — network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }
});

// ---------------- Web Push handler ----------------
self.addEventListener("push", (event) => {
  let data = { title: "IshTop", body: "Yangi xabar bor." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo-mark.png",
      badge: "/favicon-32x32.png",
      tag: data.tag || "ishtop-notification",
      data: { url: data.url || "/student/notifications" },
      requireInteraction: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/student/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

// ---------------- Skip waiting trigger from app ----------------
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

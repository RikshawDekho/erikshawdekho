// ErikshawDekho Service Worker — PWA offline + update support
const CACHE_VERSION = "v6";
const STATIC_CACHE = `erikshaw-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `erikshaw-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/rickshaw.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isNavigationRequest = (request) => request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");

async function cacheRuntime(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response);
}

// Install: pre-cache app shell and offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => null)
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Let unrelated cross-origin requests pass through
  if (!sameOrigin && !isApiRequest(url)) return;

  if (isNavigationRequest(request)) {
    // Always network-first for HTML; never cache navigation responses (avoids stale JS bundle refs after deploy)
    event.respondWith(
      fetch(request)
        .catch(async () => {
          return (await caches.match("/")) || (await caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Avoid storing authenticated responses to reduce sensitive cache footprint.
          if (!request.headers.has("Authorization")) {
            cacheRuntime(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({ detail: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          cacheRuntime(request, response.clone());
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Handle push notifications (Firebase FCM)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'ErikshawDekho', {
      body:  data.body  || 'You have a new notification',
      icon:  '/rickshaw.svg',
      badge: '/rickshaw.svg',
      tag:   data.tag || 'erikshaw-notification',
      data:  { url: data.url || '/' },
    })
  );
});

// Notification click → open relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

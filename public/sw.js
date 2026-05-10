// BotForge Mini App — Service Worker.
// Strategy:
//   - Static assets (/_next/static/*): cache-first (fast load on repeat)
//   - API (/api/public/*): network-first with stale-fallback (always try fresh, fall back to cache offline)
//   - HTML (/c/*): network-first with offline shell fallback
//   - Push: show notification, on click open Mini App

const VERSION = "v3";
const STATIC_CACHE = `bf-static-${VERSION}`;
const RUNTIME_CACHE = `bf-runtime-${VERSION}`;
const OFFLINE_FALLBACK = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      try {
        await cache.add(OFFLINE_FALLBACK);
      } catch (_) {
        /* offline.html may not exist on first install */
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp")
  );
}

function isApiPublic(url) {
  return url.pathname.startsWith("/api/public/");
}

function isMiniAppHtml(url) {
  return url.pathname.startsWith("/c/") && !url.pathname.includes(".");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (isApiPublic(url)) {
    // Manifest/icon — cache-first (static-like). Boshqa API'lar — network-first.
    if (url.pathname.endsWith("/manifest") || url.pathname.includes("/icon")) {
      event.respondWith(cacheFirst(req, RUNTIME_CACHE));
    } else {
      event.respondWith(networkFirst(req, RUNTIME_CACHE));
    }
    return;
  }

  if (isMiniAppHtml(url)) {
    event.respondWith(networkFirstWithOfflineFallback(req));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw e;
  }
}

async function networkFirstWithOfflineFallback(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (_) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    const offlineCache = await caches.open(STATIC_CACHE);
    const offline = await offlineCache.match(OFFLINE_FALLBACK);
    if (offline) return offline;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

// ───── Push notifications ─────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "BotForge", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "BotForge";
  const options = {
    body: data.body || "",
    icon: data.icon || "/api/public/" + (data.bot_username || "") + "/icon?size=192",
    badge: data.badge || data.icon || "/api/public/" + (data.bot_username || "") + "/icon?size=192",
    data: { url: data.url || "/", ...(data.data || {}) },
    tag: data.tag,
    renotify: !!data.renotify,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Mavjud Mini App tab'iga focus qilamiz
      for (const client of allClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

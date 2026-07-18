/* Style Studio service worker — makes the app installable & usable offline.
   Bump CACHE when the app shell changes so clients pick up new files. */
const CACHE = "style-studio-v3";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/three.module.js",
  "./vendor/OrbitControls.js",
  "./vendor/RoomEnvironment.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // never cache POST/DELETE (saving designs)
  const url = new URL(req.url);
  // Always go to network for the designs API (and never cache it)
  if (url.pathname.startsWith("/api/") || url.pathname === "/healthz") {
    e.respondWith(fetch(req).catch(() => new Response("[]", { headers: { "Content-Type": "application/json" } })));
    return;
  }
  // App shell / assets: cache-first, fall back to network, then to cached index for navigations
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => (req.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});

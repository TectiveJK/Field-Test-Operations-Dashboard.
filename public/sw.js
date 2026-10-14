const CACHE = "ftod-shell-v5";
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");
const SHELL = [
  "/",
  "/plan/",
  "/tests/",
  "/fleet/",
  "/issues/",
  "/deploy/",
  "/reports/",
  "/manifest.webmanifest",
  "/icon.svg",
].map((path) => `${BASE}${path === "/" ? "/" : path}`);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(`${BASE}/`))
      )
  );
});

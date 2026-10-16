const APP_VERSION = "0.2.17";
const CACHE = `ftod-shell-${APP_VERSION}`;
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
  "/tective-banner.png",
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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith("/sw.js") || url.pathname.endsWith("/version.json")) return;
  const navigate = event.request.mode === "navigate";
  event.respondWith(
    fetch(navigate ? url.href : event.request, { cache: navigate ? "no-store" : "no-cache" })
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

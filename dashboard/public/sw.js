const CACHE = "marketpulse-v1";
const STATIC = ["/", "/index.html"];

self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC)))
);

self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/v1/")) return; // never cache API
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request))
  );
});

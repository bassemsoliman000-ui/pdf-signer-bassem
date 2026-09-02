// Service worker for "قلم التوقيع" (PDF signer) — makes the installed app
// launch and work fully offline after the first successful visit.
//
// Strategy: cache-first for anything already cached (fast, works offline),
// falling back to the network for anything new — and whatever the network
// returns gets cached for next time. Bump CACHE_NAME when the app shell
// files change so old caches are cleaned up automatically.
var CACHE_NAME = "pdf-signer-v1";
var APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // cache normal same-origin responses and opaque cross-origin ones
        // (e.g. the pdf-lib/pdf.js/Google Fonts requests) so they're
        // available next time we're offline
        if (response && (response.ok || response.type === "opaque")) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        // offline and never cached — nothing we can do for this request
        return cached;
      });
    })
  );
});

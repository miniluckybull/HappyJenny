const CACHE = "happyjenny-assets-v1";
const ASSET_DESTINATIONS = new Set(["style", "script", "image", "font", "manifest", "worker"]);

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations and HTML always come from the network so updates and rollbacks
  // are never hidden behind an old cached entry page.
  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(fetch(request));
    return;
  }

  if (!ASSET_DESTINATIONS.has(request.destination)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      return cached || network;
    }),
  );
});

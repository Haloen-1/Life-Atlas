const CACHE_NAME = "life-atlas-v17-habit-times";
const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./journal.js",
  "./habits.js",
  "./controls.js",
  "./controls.css",
  "./area-map.js",
  "./vendor/d3.v7.min.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("notificationclick", (event) => {
  if (!event.notification.data?.journal) return;
  event.notification.close();
  const url = new URL("./index.html#journal", self.registration.scope);
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window" });
    const client = clients.find((item) => item.url.startsWith(self.registration.scope));
    if (client) { await client.focus(); client.postMessage("open-journal"); }
    else await self.clients.openWindow(url.href);
  })());
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

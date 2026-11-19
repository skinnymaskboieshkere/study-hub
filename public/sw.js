/* global self, caches */
// Study Hub service worker (SPEC §3: PWA). The app needs its local server for every screen,
// so nothing is cached for offline use: when the server is not running, a page opened from
// the installed app shows how to start it instead of the browser's error page.

const CACHE = "study-hub-v2";
const OFFLINE_PAGE = "/offline.html";
const OFFLINE_ICON = "/icons/icon-192.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_PAGE, OFFLINE_ICON]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_PAGE)));
    return;
  }
  // The icon of the offline page; API calls, scripts and YouTube go to the network untouched.
  if (new URL(request.url).pathname === OFFLINE_ICON) {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_ICON)));
  }
});

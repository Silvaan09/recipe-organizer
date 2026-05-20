const CACHE_NAME = 'recipe-organizer-v5';
const APP_START_URL = new URL('.', self.registration.scope).pathname;
const withBase = (path) => new URL(path, self.registration.scope).pathname;
const APP_SHELL = [
  APP_START_URL,
  withBase('manifest.webmanifest'),
  withBase('recipe-icon.svg'),
  withBase('pwa/icon-any.svg'),
  withBase('pwa/icon-maskable.svg'),
  withBase('pwa/splash.svg'),
  withBase('recipe-images/mock-breakfast-cover.svg'),
  withBase('recipe-images/mock-chicken-cover.svg'),
  withBase('recipe-images/mock-pasta-cover.svg'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(APP_START_URL, responseClone);
          });

          return response;
        })
        .catch(() => caches.match(APP_START_URL)),
    );
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      const networkResponsePromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return networkResponse;
        })
        .catch(() => undefined);

      if (cachedResponse) {
        event.waitUntil(networkResponsePromise);
        return cachedResponse;
      }

      return (await networkResponsePromise) ?? Response.error();
    }),
  );
});

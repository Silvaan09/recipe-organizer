const CACHE_NAME = 'recipe-organizer-v4';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/recipe-icon.svg',
  '/pwa/icon-any.svg',
  '/pwa/icon-maskable.svg',
  '/pwa/splash.svg',
  '/recipe-images/mock-breakfast-cover.svg',
  '/recipe-images/mock-chicken-cover.svg',
  '/recipe-images/mock-pasta-cover.svg',
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
            cache.put('/', responseClone);
          });

          return response;
        })
        .catch(() => caches.match('/')),
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

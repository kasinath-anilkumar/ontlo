const CACHE_NAME = 'ontlo-cache-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

/**
 * INSTALL
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

/**
 * FETCH
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET requests
  if (request.method !== 'GET') return;

  // Ignore unsupported schemes
  if (!request.url.startsWith('http')) return;

  // Ignore browser extensions
  if (
    request.url.includes('chrome-extension') ||
    request.url.includes('extension')
  ) {
    return;
  }

  // Ignore API calls
  if (request.url.includes('/api/')) {
    return;
  }

  /**
   * NETWORK FIRST FOR HTML
   * Prevents old app shell after deployments
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match(request)) ||
            (await caches.match('/index.html'))
          );
        })
    );

    return;
  }

  /**
   * CACHE FIRST FOR STATIC ASSETS
   */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Skip invalid responses
        if (
          !networkResponse ||
          networkResponse.status !== 200
        ) {
          return networkResponse;
        }

        // Don't cache opaque cross-origin responses
        if (networkResponse.type === 'opaque') {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return networkResponse;
      });
    })
  );
});

/**
 * ACTIVATE
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
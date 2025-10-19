const CACHE_NAME = 'festflow-cache-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignore Firestore requests.
  if (event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If the resource is not in the cache, fetch it from the network.
        return fetch(event.request).then(networkResponse => {
            // Check if we received a valid response to cache
            if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
              return networkResponse;
            }

            // Clone the response stream.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

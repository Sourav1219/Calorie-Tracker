const CACHE_NAME = 'pureintake-cache-v1';
const FOOD_API_CACHE = 'pureintake-food-api-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== FOOD_API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache Food Database API calls
  if (url.pathname.includes('/api/food/')) {
    event.respondWith(
      caches.open(FOOD_API_CACHE).then(cache => {
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // If offline, try to get from cache
          return cache.match(event.request);
        });
      })
    );
    return;
  }

  // Network first, fallback to cache for other requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

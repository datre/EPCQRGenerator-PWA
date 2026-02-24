const CACHE_NAME = 'epc-qr-v1';

// All resources to pre-cache for offline support
const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/iban.js',
  './js/epc.js',
  './js/storage.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './icons/icon-maskable.svg'
];

// External resources to cache on first fetch
const EXTERNAL_URLS = [
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js'
];

// Install: pre-cache all local resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local resources
      return cache.addAll(PRECACHE_URLS).then(() => {
        // Try to cache external resources too (may fail if offline)
        return Promise.allSettled(
          EXTERNAL_URLS.map(url =>
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local, network-first for external with cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For same-origin requests: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For external requests (CDN): network-first with cache fallback
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});

const CACHE_NAME = 'travelpilot-v2.1';
const RUNTIME_CACHE = 'travelpilot-runtime-v2.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './manifest.json',
  './travelpilot_single_file.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME && k !== RUNTIME_CACHE) return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }

        // Runtime caching for Leaflet CDN, Google Fonts, and OpenStreetMap tiles
        const url = e.request.url;
        if (url.includes('unpkg.com/leaflet') || url.includes('openstreetmap.org') || url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});

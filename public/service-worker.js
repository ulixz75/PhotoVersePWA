const CACHE_NAME = 'photoverse-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  console.log('SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('SW: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            if (!event.request.url.includes('generativelanguage')) {
              cache.put(event.request, responseToCache);
            }
          });
          return networkResponse;
        });
      })
      .catch(() => {
        // Fallback offline
        return caches.match('/index.html');
      })
  );
});
```

### 3. **Verifica tu estructura de proyecto:**
```
photo-verse-pwa/
├── public/
│   ├── manifest.json          ← Aquí
│   ├── service-worker.js      ← Aquí
│   ├── icon-48x48.png         ← Aquí
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png       ← Verifica que este exista
│   ├── icon-192x192.png
│   ├── icon-256x256.png
│   ├── icon-384x384.png
│   └── icon-512x512.png
├── src/
│   ├── App.tsx
│   ├── index.tsx
│   └── ...
├── index.html
├── vite.config.ts
└── package.json

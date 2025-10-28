const CACHE_NAME = 'photoverse-v1';

self.addEventListener('install', event => {
  console.log('SW: Install');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  console.log('SW: Activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Por ahora, solo pasa las peticiones sin cachear
  event.respondWith(fetch(event.request));
});

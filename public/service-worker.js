const CACHE_NAME = 'photoverse-cache-v5';
const URLS_TO_CACHE = [
  // App Shell
  '/',
  '/index.html',
  '/manifest.json',
  // Icons
  '/icon-48x48.png',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
  
  // Scripts & Styles (Local)
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.tsx',
  '/translations.ts',
  '/services/geminiService.ts',
  '/components/SplashScreen.tsx',
  '/components/UploadScreen.tsx',
  '/components/ProcessingScreen.tsx',
  '/components/ResultScreen.tsx',
  '/components/ClayButton.tsx',
  '/components/SelectionCard.tsx',
  '/components/GalleryScreen.tsx',
  // CDN Resources
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap',
  'https://esm.sh/jspdf@2.5.1',
  'https://aistudiocdn.com/@google/genai@^1.20.0',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/lucide-react@^0.544.0'
];

// Instala el service worker y cachea los recursos principales de la aplicación
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Cache populated, skipping waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Intercepta las peticiones de red y responde con los recursos cacheados si están disponibles
self.addEventListener('fetch', event => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          // Cache hit - retornar respuesta cacheada
          return response;
        }
        
        // No está en cache - obtener de red
        return fetch(event.request)
          .then(networkResponse => {
            // Verificar respuesta válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }
            
            // Clonar la respuesta
            const responseToCache = networkResponse.clone();
            
            // Cachear la respuesta (sin bloquear)
            caches.open(CACHE_NAME)
              .then(cache => {
                // No cachear llamadas a APIs externas o sospechosas
                if (!event.request.url.includes('generativelanguage') &&
                    !event.request.url.includes('shoukigaigoors') && 
                    !event.request.url.includes('github')) {
                  cache.put(event.request, responseToCache);
                }
              })
              .catch(error => {
                // Silenciar errores de cache (extensiones pueden interferir)
                console.log('[SW] Cache put failed (expected with extensions):', error.message);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('[SW] Fetch failed:', error);
            throw error;
          });
      })
  );
});

// Activa el service worker y elimina cachés antiguas
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated, claiming clients');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Manejar mensajes (prevenir errores de extensiones)
self.addEventListener('message', event => {
  try {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (error) {
    console.log('[SW] Message handling error (expected with extensions):', error.message);
  }
});

// Prevenir errores no manejados
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

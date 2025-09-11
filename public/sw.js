const CACHE_NAME = 'group-harmony-v3'; // Updated to force SW refresh
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // CRITICAL: Bypass service worker for all Supabase requests to prevent cache race
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/')) {
    return; // Let browser handle Supabase REST API requests directly
  }
  
  // Skip all other API requests, auth, and realtime requests - let browser handle them
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/auth/') ||
      event.request.url.includes('/realtime/') ||
      event.request.url.includes('/api/') ||
      event.request.url.includes('/rest/v1/') ||
      event.request.url.includes('?') || // Skip any requests with query params
      event.request.url.includes('.json') ||
      event.request.url.includes('.js') ||
      event.request.url.includes('.css') ||
      event.request.url.includes('.png') ||
      event.request.url.includes('.jpg') ||
      event.request.url.includes('.svg') ||
      event.request.url.includes('.ico')) {
    return; // Let browser handle these requests without service worker interference
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network with error handling
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response for caching
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.log('Fetch failed:', error);
            // Return a fallback response for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            throw error;
          });
      })
  );
});

// Handle push notifications (if needed)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/placeholder.svg',
    badge: '/placeholder.svg'
  };

  event.waitUntil(
    self.registration.showNotification('Group Harmony', options)
  );
});
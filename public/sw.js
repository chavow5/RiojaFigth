// Service Worker for Caudillo Fight PWA
const CACHE_NAME = 'caudillo-fight-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser fetch normally, with fallback if needed
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

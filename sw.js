// CL Finanzas — Service Worker v1.0
const CACHE = 'cl-finanzas-v7';
const OFFLINE_ASSETS = [
  '/finanzas/',
  '/finanzas/index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        OFFLINE_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate — clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for assets, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Skip non-GET and external APIs (Yahoo, CoinGecko, DolarApi)
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('yahoo') ||
      url.hostname.includes('coingecko') ||
      url.hostname.includes('dolarapi') ||
      url.hostname.includes('argentinadatos') ||
      url.hostname.includes('allorigins') ||
      url.hostname.includes('corsproxy')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchFresh = fetch(e.request)
        .then(res => {
          if (res.ok && url.origin === self.location.origin) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached); // fallback to cache if offline
      
      // For the main app — return cache instantly, update in background
      if (url.pathname.includes('/finanzas')) {
        return cached || fetchFresh;
      }
      return fetchFresh || cached;
    })
  );
});

// CL Finanzas — Service Worker v2.0
// Network-first para HTML, cache-first para assets estáticos
const CACHE = 'cl-finanzas-v10';
const STATIC_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

// Install — cachear solo assets estáticos (NO el HTML)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

// Activate — limpiar cachés viejos y tomar control inmediatamente
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - HTML principal → NETWORK FIRST (siempre baja la versión más nueva)
// - Assets estáticos → CACHE FIRST (fuentes, Chart.js)
// - APIs externas → bypass (sin caché)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo GET
  if (e.request.method !== 'GET') return;

  // Bypass total para APIs externas y Firebase
  if (url.hostname.includes('yahoo') ||
      url.hostname.includes('coingecko') ||
      url.hostname.includes('dolarapi') ||
      url.hostname.includes('argentinadatos') ||
      url.hostname.includes('allorigins') ||
      url.hostname.includes('corsproxy') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') && url.pathname.includes('/identitytoolkit') ||
      url.hostname.includes('gstatic') && url.pathname.includes('/firebasejs')) return;

  // HTML principal → network first, fallback a caché
  if (url.pathname === '/finanzas/' || url.pathname === '/finanzas/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Guardar la versión fresca en caché
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request)) // offline: usar caché
    );
    return;
  }

  // Assets estáticos → cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});

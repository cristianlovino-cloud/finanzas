// CL Finanzas — Service Worker v3.0
// Estrategia: NETWORK FIRST para todo — siempre descarga lo nuevo
// Cache solo como fallback offline

const CACHE = 'cl-finanzas-v20';

// Al instalar: activar inmediatamente sin esperar
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// Al activar: eliminar TODOS los cachés anteriores y tomar control
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // Notificar a todos los clientes que hay nueva versión
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// Fetch: Network first, cache solo como fallback offline
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Solo GET
  if (e.request.method !== 'GET') return;

  // Bypass total para APIs externas, Firebase y fuentes
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('yahoo') ||
    url.hostname.includes('coingecko') ||
    url.hostname.includes('dolarapi') ||
    url.hostname.includes('argentinadatos') ||
    url.hostname.includes('allorigins') ||
    url.hostname.includes('corsproxy') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Guardar copia fresca en caché para uso offline
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Sin red: usar caché si existe
        return caches.match(e.request);
      })
  );
});

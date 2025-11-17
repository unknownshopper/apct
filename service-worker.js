const CACHE_NAME = 'apct-cache-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './inspeccion.html',
  './reginspecciones.html',
  './actividad.html',
  './ingral.html',
  './tareas.html',
  './pruebas.html',
  './listapruebas.html',
  './stockpruebas.html',
  './reportes.html',
  './login.html',

  './styles.css',
  './script.js',
  './manifest.webmanifest',
  './img/logopctch.png',
  './img/logotus.jpg'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only cache same-origin requests
  if (url.origin !== location.origin) return;
  // Network-first for HTML; cache-first for assets/CSV
  if (req.destination === 'document' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
  }
});

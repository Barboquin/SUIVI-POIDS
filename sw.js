// Service Worker — Suivi du poids
const CACHE = 'poids-v1';
const ASSETS = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png'
];

// Installation : on met en cache les fichiers locaux
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activation : on nettoie les anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : stratégie "réseau d'abord, cache de secours" pour le HTML,
// "cache d'abord" pour les icônes. Les appels Firebase passent toujours par le réseau.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase / Chart.js / Google Fonts : toujours réseau
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('cloudflare') ||
      url.hostname.includes('fonts.g')) {
    return; // laisse passer normalement
  }

  // HTML : réseau d'abord (pour avoir la dernière version), cache de secours
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Autres ressources locales : cache d'abord
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return resp;
    }))
  );
});

// Service worker de Seedrift (ex-BlockCraft Daily) : rend le jeu installable et jouable
// hors ligne (Blueprint §23 : "le cœur du jeu doit rester jouable hors
// connexion"). Stratégie RÉSEAU D'ABORD : en ligne, le joueur reçoit
// toujours la dernière version publiée ; le cache ne sert qu'en secours,
// hors connexion. Aucune donnée de jeu ici : la progression reste dans
// localStorage, jamais dans ce cache.
const CACHE = 'bcd-shell-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ressources externes (polices Google) : comportement réseau normal.
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

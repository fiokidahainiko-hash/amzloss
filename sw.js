/* AmzLoss service worker — caches static assets for faster repeat visits.
   Network-first for pages (so content stays fresh after deploys),
   cache-first for styles, scripts, images and fonts. */
const VERSION = 'amzloss-v3';
const ASSETS = [
  'assets/css/style.css',
  'js/rates.js',
  'js/networks.js',
  'js/directory.js',
  'js/paystack.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests. Third-party (GA, fonts, Paystack) passes through.
  if (url.origin !== self.location.origin) return;

  // Pages: network-first so you always get the newest content.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  // Static assets: network-first for scripts/styles (so updates go live),
  // cache-first for everything else.
  const isScriptOrStyle = /\.(js|css)$/.test(url.pathname);
  if (isScriptOrStyle) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});

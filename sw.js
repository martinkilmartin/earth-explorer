// @ts-check

const CACHE_NAME = 'earth-explorer-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/game.js',
  '/js/countryColors.js',
  '/assets/world.geo.json',
  'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js'
];

self.addEventListener('install', event => {
  const installEvent = /** @type {any} */ (event);
  installEvent.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  const activateEvent = /** @type {any} */ (event);
  activateEvent.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  const fetchEvent = /** @type {any} */ (event);
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(response =>
      response || fetch(fetchEvent.request)
    )
  );
});

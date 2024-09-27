const cacheName = 'staticCache';
const toCache = [
  '/',
  '/gallery',
  '/styles/styles.css',
  '/scripts/photo.js',
  'manifest.json',
  '/html/offline.html',
  '/favicon.ico'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName)
    .then(cache => {
      cache.addAll(toCache);
    })
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== cacheName) return caches.delete(cache);
        }
      ));
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method === 'POST') {
    e.respondWith(
      fetch(e.request)
      .then(response => {return response;})
      .catch(() => { return caches.match('/html/offline.html') })
    );
  } else {
    e.respondWith(
      fetch(e.request.url)
      .then(response => {
        let clone = response.clone();
        caches.open(cacheName).then(cache => cache.put(e.request.url, clone));
        return response;
      })
      .catch(() => { 
        return caches
        .match(e.request.url)
        .catch(() => { return caches.match('/html/offline.html') })
       })
    );
  }
});

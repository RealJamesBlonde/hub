// Service worker: pozwala zainstalować hub i otwierać go nawet bez internetu.
// Strategia "najpierw sieć": zawsze próbujemy pobrać najnowszą wersję (żeby aktualizacje docierały same),
// a gdy nie ma internetu – pokazujemy ostatnią zapisaną.
const CACHE = 'hub-v2';
const PLIKI = ['./', './index.html', './style.css', './app.js', './dane.js', './manifest.json',
  './ikona-192.png', './ikona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PLIKI.map(u => new Request(u, { cache: 'no-cache' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // cache: 'no-cache' – zawsze pytamy serwer o najnowszą wersję (inaczej aktualizacje docierałyby z opóźnieniem)
    fetch(e.request, { cache: 'no-cache' })
      .then(r => { const kopia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopia)); return r; })
      .catch(() => caches.match(e.request))
  );
});

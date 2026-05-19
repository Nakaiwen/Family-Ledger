// 家庭帳本 · Service Worker
// 純本機應用，service worker 只是讓 App 可以離線開啟（資料一直存在 localStorage）

const CACHE = 'family-ledger-v1';

const SHELL = [
  './',
  './index.html',
  './ledger-manifest.json',
  './ledger-icon-192.png',
  './ledger-icon-512.png',
  './ledger-icon-maskable-512.png',
];

// 安裝：預先快取 shell（個別處理，失敗不擋整體安裝）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(
        SHELL.map((url) => cache.add(url).catch((err) => {
          console.warn('[SW] skip caching', url, err.message);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

// 啟用：清掉舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 取得：stale-while-revalidate（快取優先，背景更新）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((resp) => {
        if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'cors')) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

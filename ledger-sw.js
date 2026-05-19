// 家庭帳本 · Service Worker
// 快取 App 殼層（HTML/icon/manifest）讓首次開啟之後可以離線載入；
// 資料本身存在 Supabase，需要網路才會同步。

const CACHE = 'family-ledger-v3';

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

// 取得：對 shell 用 stale-while-revalidate；Supabase 一律走網路，不快取
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 永遠不快取 Supabase REST / Realtime（資料才會新鮮）
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return;
  }

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

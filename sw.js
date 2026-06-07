/**
 * sw.js — Service Worker
 * 预缓存静态资源，离线运行，更新通知
 */
const CACHE_NAME = 'fitness-pwa-v13';
const ASSETS = [
  '/',
  '/index.html?v=0.38',
  '/css/main.css?v=0.38',
  '/css/components.css?v=0.38',
  '/js/models.js?v=0.38',
  '/js/storage.js?v=0.38',
  '/js/timer.js?v=0.38',
  '/js/tags.js?v=0.38',
  '/js/exercises.js?v=0.38',
  '/js/records.js?v=0.38',
  '/js/stats.js?v=0.38',
  '/js/settings.js?v=0.38',
  '/js/training.js?v=0.38',
  '/js/backup.js?v=0.38',
  '/js/ui.js?v=0.38',
  '/js/app.js?v=0.38',
  '/assets/manifest.json',
  '/assets/icons/favicon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// 安装：预缓存所有资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求：缓存优先，网络回退
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // 离线时返回缓存的首页
        return caches.match('/index.html');
      });
    })
  );
});

// 更新通知
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

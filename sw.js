/**
 * sw.js — Service Worker
 * 预缓存静态资源，离线运行，更新通知
 * 注意：ASSETS 使用相对路径（无前导 /），以兼容 GitHub Pages 子路径部署（/fitness-pwa/）。
 *      缓存解析基于 SW 注册作用域，绝对路径 '/index.html' 会错误解析到站点根。
 */
const CACHE_NAME = 'fitness-pwa-v16';
const VERSION = '0.41';
const ASSETS = [
  './',
  './index.html?v=' + VERSION,
  './css/main.css?v=' + VERSION,
  './css/components.css?v=' + VERSION,
  './js/models.js?v=' + VERSION,
  './js/storage.js?v=' + VERSION,
  './js/timer.js?v=' + VERSION,
  './js/tags.js?v=' + VERSION,
  './js/exercises.js?v=' + VERSION,
  './js/records.js?v=' + VERSION,
  './js/stats.js?v=' + VERSION,
  './js/settings.js?v=' + VERSION,
  './js/training.js?v=' + VERSION,
  './js/backup.js?v=' + VERSION,
  './js/ui.js?v=' + VERSION,
  './js/app.js?v=' + VERSION,
  './assets/manifest.json',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
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
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // 离线时回退到缓存的首页（相对路径，兼容子路径部署）
        return caches.match('./index.html') || caches.match('./');
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
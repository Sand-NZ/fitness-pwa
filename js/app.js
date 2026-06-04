/**
 * app.js — 路由、事件总线、初始化
 */
const App = {
  currentPage: 'training',
  pages: ['training', 'plans', 'exercises', 'stats', 'settings'],
  listeners: {},
  _initialized: false
};

// ---------- 事件总线 ----------
App.on = function(event, fn) {
  if (!this.listeners[event]) this.listeners[event] = [];
  this.listeners[event].push(fn);
  return () => {
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  };
};

App.emit = function(event, data) {
  (this.listeners[event] || []).forEach(fn => {
    try { fn(data); } catch (e) { console.warn('事件错误:', event, e); }
  });
};

// ---------- 路由 ----------
App.navigate = function(page) {
  if (!this.pages.includes(page)) return;
  this.currentPage = page;

  // 切换页面
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // 更新导航
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // 保存设置
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  settings.lastActiveTab = page;
  STORAGE.set(STORAGE.keys.settings, settings);

  this.emit('pageChange', page);
};

App.initRouter = function() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      this.navigate(el.dataset.page);
    });
  });
};

// ---------- toast ----------
App.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, duration);
};

// ---------- 模态框 ----------
App.showModal = function(html) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return;
  overlay.classList.remove('hidden');
  container.classList.remove('hidden');
  container.innerHTML = '<div class="modal">' + html + '</div>';
  // 点击遮罩关闭
  overlay.onclick = () => this.closeModal();
  return container;
};

App.closeModal = function() {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (overlay) overlay.classList.add('hidden');
  if (container) { container.classList.add('hidden'); container.innerHTML = ''; }
};

// ---------- 初始化 ----------
App.init = function() {
  if (this._initialized) return;
  this._initialized = true;

  // 确保数据存在
  if (!STORAGE.get(STORAGE.keys.settings)) {
    STORAGE.set(STORAGE.keys.settings, defaultSettings());
  }
  ['tags', 'exercises', 'plans', 'records'].forEach(k => {
    if (!STORAGE.get(STORAGE.keys[k])) {
      STORAGE.set(STORAGE.keys[k], []);
    }
  });

  // 初始化主题
  if (window.Theme) Theme.init();

  // 初始化训练模块
  if (window.Training) Training.init();

  // 初始化路由
  this.initRouter();

  // 恢复上次页面
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  this.navigate(settings.lastActiveTab || 'training');

  // 检查是否需要首次引导
  if (window.Onboarding && Onboarding.shouldShow()) {
    Onboarding.start();
  }

  // 注册页面渲染
  this.on('pageChange', (page) => {
    switch (page) {
      case 'exercises': if (window.Exercises) Exercises.renderPage(); break;
      case 'plans': if (window.Plans) Plans.renderPage(); break;
      case 'stats': if (window.Stats) Stats.renderPage(); break;
      case 'settings': if (window.Settings) Settings.renderPage(); break;
      case 'training': if (window.Training) Training.renderPage(); break;
    }
  });

  // 渲染当前页面
  this.emit('pageChange', this.currentPage);

  // 注册服务 worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => {
      console.warn('SW 注册失败:', e);
    });
  }

  console.log('✅ Fitness PWA 已初始化');
};

// DOM 加载完成后启动
document.addEventListener('DOMContentLoaded', () => App.init());

if (typeof window !== 'undefined') {
  window.App = App;
}

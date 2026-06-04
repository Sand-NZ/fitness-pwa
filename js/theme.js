/**
 * theme.js — 深色模式切换（系统/手动/日出日落）
 */
const Theme = {
  current: 'auto', // 'auto' | 'light' | 'dark' | 'amber'
  _watchMedia: null,
  _watchGeo: null
};

Theme.init = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  this.current = settings.darkMode || 'auto';
  this.apply(this.current);
};

Theme.apply = function(mode) {
  this.current = mode;
  document.documentElement.setAttribute('data-theme', mode);

  // 更新 meta theme-color
  const meta = document.getElementById('meta-theme-color');
  if (meta) {
    const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const isAmber = mode === 'amber';
    if (isAmber) meta.content = '#1a1508';
    else if (isDark) meta.content = '#0d0d0f';
    else meta.content = '#f5f5f7';
  }

  // 保存设置
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  settings.darkMode = mode;
  STORAGE.set(STORAGE.keys.settings, settings);

  // 系统跟随监听
  if (mode === 'auto') {
    this._watchSystem();
  } else {
    this._unwatchSystem();
  }

  App.emit('themeChanged', mode);
};

Theme.cycle = function() {
  const order = ['auto', 'light', 'dark', 'amber'];
  const idx = order.indexOf(this.current);
  const next = order[(idx + 1) % order.length];
  this.apply(next);
  return next;
};

Theme._watchSystem = function() {
  if (this._watchMedia) return;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  this._watchMedia = () => {
    if (this.current === 'auto') {
      document.documentElement.setAttribute('data-theme', 'auto');
    }
  };
  mq.addEventListener('change', this._watchMedia);
};

Theme._unwatchSystem = function() {
  if (this._watchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', this._watchMedia);
    this._watchMedia = null;
  }
};

// 简化的日出日落计算（基于纬度近似）
Theme.computeSunriseSunset = function(lat) {
  // 近似值：日出 6:00，日落 18:00，根据纬度微调
  const now = new Date();
  const hour = now.getHours();
  // 夏季（6-8月）日出早；冬季晚
  const month = now.getMonth();
  let sunrise = 6;
  let sunset = 18;
  if (month >= 5 && month <= 7) { sunrise = 5; sunset = 19; }
  else if (month >= 11 || month <= 1) { sunrise = 7; sunset = 17; }

  return { isDaytime: hour >= sunrise && hour < sunset };
};

Theme.applySunriseSunset = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  if (!settings.sunriseSunsetEnabled) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { isDaytime } = this.computeSunriseSunset(pos.coords.latitude);
      this.apply(isDaytime ? 'light' : 'dark');
    },
    () => {
      // 用户拒绝授权，回退到 auto
      this.apply('auto');
    },
    { timeout: 5000 }
  );
};

if (typeof window !== 'undefined') {
  window.Theme = Theme;
}

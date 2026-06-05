/**
 * storage.js — localStorage 封装（精简版）
 */
const STORAGE = {
  keys: { tags:'fitness_tags', exercises:'fitness_exercises', plans:'fitness_plans', records:'fitness_records', settings:'fitness_settings', version:'fitness_version' },
  currentVersion: 1,
  maxSize: 4 * 1024 * 1024
};

STORAGE.get = function(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
};

STORAGE.set = function(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    this.checkCapacity();
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') alert('⚠️ 本地存储空间不足，请导出备份后清理数据。');
    return false;
  }
};

STORAGE.remove = function(key) { localStorage.removeItem(key); };

STORAGE.clear = function() { Object.values(this.keys).forEach(k => localStorage.removeItem(k)); };

STORAGE.checkCapacity = function() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) total += (localStorage.getItem(key) || '').length * 2;
  }
  if (total > this.maxSize) {
    const el = document.createElement('div');
    el.className = 'toast toast-warning'; el.textContent = '⚠️ 存储空间即将用尽，建议导出备份';
    const c = document.getElementById('toast-container');
    if (c) { c.appendChild(el); setTimeout(() => el.remove(), 5000); }
  }
  return total;
};

STORAGE.migrate = function() {
  const ver = parseInt(localStorage.getItem(this.keys.version) || '0', 10);
  if (ver >= this.currentVersion) return;
  for (let v = ver + 1; v <= this.currentVersion; v++) {
    const fn = this._migrations[v];
    if (fn) {
      ['tags','exercises','plans','records','settings'].forEach(key => {
        const data = this.get(this.keys[key]);
        if (data) this.set(this.keys[key], fn(key, data));
      });
    }
  }
  localStorage.setItem(this.keys.version, String(this.currentVersion));
};

STORAGE.registerMigration = function(version, fn) { this._migrations[version] = fn; };

STORAGE._migrations = {};

STORAGE.migrate = STORAGE.migrate.bind(STORAGE);
STORAGE.migrate();

if (typeof window !== 'undefined') { window.STORAGE = STORAGE; }

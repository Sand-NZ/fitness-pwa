/**
 * storage.js — localStorage 封装
 * 功能：读写、版本管理、容量警告、加密桩
 */

const STORAGE = {
  keys: {
    tags: 'fitness_tags',
    exercises: 'fitness_exercises',
    plans: 'fitness_plans',
    records: 'fitness_records',
    settings: 'fitness_settings',
    version: 'fitness_version'
  },
  currentVersion: 1,
  maxSize: 4 * 1024 * 1024, // 4MB 警告阈值
  _encryptionAvailable: typeof crypto !== 'undefined' && crypto.subtle
};

// ---------- 读写 ----------

STORAGE.get = function(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('storage.get 解析失败:', key, e);
    return null;
  }
};

STORAGE.set = function(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    this.checkCapacity();
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert('⚠️ 本地存储空间不足，请导出备份后清理数据。');
    } else {
      console.error('storage.set 失败:', key, e);
    }
    return false;
  }
};

STORAGE.remove = function(key) {
  localStorage.removeItem(key);
};

STORAGE.clear = function() {
  Object.values(this.keys).forEach(k => localStorage.removeItem(k));
};

// ---------- 版本迁移（增量更新核心） ----------

// 迁移注册表：version -> function(oldData) => newData
// 每新增一个版本，在这里加一条迁移函数
STORAGE._migrations = {
  // 示例: 2: function(data) { ... 转换逻辑 ... return data; }
};

STORAGE.migrate = function() {
  const ver = parseInt(localStorage.getItem(this.keys.version) || '0', 10);
  if (ver >= this.currentVersion) return;

  console.log(`📦 存储版本迁移: v${ver} → v${this.currentVersion}`);

  // 逐版本递增迁移
  for (let v = ver + 1; v <= this.currentVersion; v++) {
    const fn = this._migrations[v];
    if (fn) {
      try {
        // 对每个存储键执行迁移
        ['tags', 'exercises', 'plans', 'records', 'settings'].forEach(key => {
          const data = this.get(this.keys[key]);
          if (data) {
            const migrated = fn(key, data);
            this.set(this.keys[key], migrated);
          }
        });
        console.log(`  ✅ 迁移 v${v} 完成`);
      } catch (e) {
        console.error(`  ❌ 迁移 v${v} 失败:`, e);
      }
    }
  }

  localStorage.setItem(this.keys.version, String(this.currentVersion));
};

STORAGE.registerMigration = function(version, fn) {
  this._migrations[version] = fn;
};

// 初始化版本迁移
STORAGE.migrate = STORAGE.migrate.bind(STORAGE);
STORAGE.migrate();

/* ====== 迁移示例（增量更新数据模型的模板） ======
 *
 * 场景：将版本升到 2，给每条 record 加一个 `source` 字段
 *
 * 1. 先改 currentVersion
 *    STORAGE.currentVersion = 2;
 *
 * 2. 再注册迁移函数
 *    STORAGE.registerMigration(2, function(key, data) {
 *      if (key === 'records' && Array.isArray(data)) {
 *        return data.map(r => {
 *          if (!r.source) r.source = 'manual';
 *          return r;
 *        });
 *      }
 *      if (key === 'settings') {
 *        if (data.themeAccent == null) data.themeAccent = 'blue';
 *      }
 *      return data;
 *    });
 *
 * 工作流：
 *   改模型 → currentVersion++ → 注册迁移 → 重启自动执行，用户无感
 */

// ---------- 容量检查 ----------

STORAGE.checkCapacity = function() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += (localStorage.getItem(key) || '').length * 2; // UTF-16
    }
  }
  if (total > this.maxSize) {
    console.warn(`⚠️ 存储使用超过 ${this.maxSize / 1024 / 1024}MB (当前约 ${(total / 1024 / 1024).toFixed(1)}MB)`);
    this._showCapacityWarning();
  }
  return total;
};

STORAGE._showCapacityWarning = function() {
  const toast = document.getElementById('toast-container');
  if (!toast) return;
  const el = document.createElement('div');
  el.className = 'toast toast-warning';
  el.textContent = '⚠️ 存储空间即将用尽，建议导出备份';
  toast.appendChild(el);
  setTimeout(() => el.remove(), 5000);
};

// ---------- 加密桩 (Web Crypto API AES-GCM) ----------

STORAGE.encrypt = async function(data, password) {
  if (!this._encryptionAvailable || !password) return { encrypted: false, data };
  try {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(JSON.stringify(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return {
      encrypted: true,
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  } catch (e) {
    console.warn('加密失败，回退到明文:', e);
    return { encrypted: false, data };
  }
};

STORAGE.decrypt = async function(payload, password) {
  if (!payload.encrypted) return payload.data;
  if (!this._encryptionAvailable || !password) return null;
  try {
    const encoder = new TextEncoder();
    const salt = new Uint8Array(payload.salt.match(/.{2}/g).map(b => parseInt(b, 16)));
    const iv = new Uint8Array(payload.iv.match(/.{2}/g).map(b => parseInt(b, 16)));
    const encrypted = new Uint8Array(payload.data.match(/.{2}/g).map(b => parseInt(b, 16)));
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (e) {
    console.warn('解密失败:', e);
    return null;
  }
};

// 初始化版本
// 初始化版本迁移（上面的 bind + migrate 已执行）
// 此处的重复调用已移除

if (typeof window !== 'undefined') {
  window.STORAGE = STORAGE;
}

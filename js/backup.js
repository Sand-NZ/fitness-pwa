/**
 * backup.js — 导入/导出
 * 独立导出：动作、计划、记录、单次计划导出
 */
const Backup = {};

Backup._download = function(content, filename) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

Backup._date = function() { return new Date().toISOString().slice(0, 10); };

// 导出动作库
Backup.exportExercises = function() {
  const data = STORAGE.get(STORAGE.keys.exercises) || [];
  this._download(JSON.stringify(data, null, 2), `exercises-${this._date()}.json`);
};

// 导出计划
Backup.exportPlans = function() {
  const data = STORAGE.get(STORAGE.keys.plans) || [];
  this._download(JSON.stringify(data, null, 2), `plans-${this._date()}.json`);
};

// 导出训练记录
Backup.exportRecords = function() {
  const data = STORAGE.get(STORAGE.keys.records) || [];
  this._download(JSON.stringify(data, null, 2), `records-${this._date()}.json`);
};

// 导出单个计划（从计划详情页调用）
Backup.exportSinglePlan = function(planId) {
  const plan = (STORAGE.get(STORAGE.keys.plans) || []).find(p => p.id === planId);
  if (!plan) { App.showToast('计划不存在', 'warning'); return; }
  const safeName = String(plan.name).replace(/[<>:"/\\|?*]/g, '_');
  this._download(JSON.stringify(plan, null, 2), `plan-${safeName}-${this._date()}.json`);
};

// 全量导出
Backup.exportFull = async function() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tags: STORAGE.get(STORAGE.keys.tags) || [],
    exercises: STORAGE.get(STORAGE.keys.exercises) || [],
    plans: STORAGE.get(STORAGE.keys.plans) || [],
    records: STORAGE.get(STORAGE.keys.records) || [],
    settings: STORAGE.get(STORAGE.keys.settings) || defaultSettings()
  };
  const json = JSON.stringify(data, null, 2);
  this._download(json, `fitness-backup-${this._date()}.json`);
};

// 导入
Backup.importFile = function(file, mode = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this._applyImport(data, mode);
        resolve(data);
      } catch (err) { reject(new Error('文件解析失败: ' + err.message)); }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

Backup._applyImport = function(data, mode) {
  const merge = mode === 'merge';

  const mergeOrSet = (key, items) => {
    const existing = STORAGE.get(STORAGE.keys[key]) || [];
    // 对导入的动作执行字段清理（BUG 7）
    if (key === 'exercises' && Array.isArray(items)) {
      items = items.map(e => typeof window.sanitizeFields === 'function' ? window.sanitizeFields(e) : e);
    }
    if (merge && Array.isArray(items)) {
      const ids = new Set(existing.map(x => x.id));
      items.forEach(x => { if (!ids.has(x.id)) existing.push(x); });
      STORAGE.set(STORAGE.keys[key], existing);
    } else if (Array.isArray(items)) {
      STORAGE.set(STORAGE.keys[key], items);
    }
  };

  mergeOrSet('tags', data.tags);
  mergeOrSet('exercises', data.exercises);
  mergeOrSet('plans', data.plans);
  mergeOrSet('records', data.records);

  if (data.settings && !merge) STORAGE.set(STORAGE.keys.settings, data.settings);

  App.showToast(`导入完成（${merge ? '合并' : '覆盖'}模式）`, 'success');
};

Backup.clearAllData = function() {
  STORAGE.clear();
  STORAGE.set(STORAGE.keys.settings, defaultSettings());
  ['tags', 'exercises', 'plans', 'records'].forEach(k => STORAGE.set(STORAGE.keys[k], []));
  App.showToast('所有数据已清空', 'info');
};

if (typeof window !== 'undefined') { window.Backup = Backup; }

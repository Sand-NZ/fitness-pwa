/**
 * backup.js — 导入/导出（全量、增量、加密）
 * 依赖：storage.js, models.js
 */
const Backup = {};

// ---------- 全量导出 ----------
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

  const settings = data.settings;
  let output;

  if (settings.backupPassword) {
    output = await STORAGE.encrypt(data, settings.backupPassword);
  } else {
    output = { encrypted: false, data };
  }

  const json = JSON.stringify(output, null, 2);
  this._download(json, `fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  return json;
};

// ---------- 增量导出 ----------
Backup.exportIncremental = async function() {
  const lastExport = localStorage.getItem('fitness_last_export_date');
  const since = lastExport ? new Date(lastExport) : new Date(0);

  const allRecords = STORAGE.get(STORAGE.keys.records) || [];
  const newRecords = allRecords.filter(r => new Date(r.date) > since);

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    sinceDate: since.toISOString(),
    records: newRecords,
    tags: STORAGE.get(STORAGE.keys.tags) || [],
    exercises: STORAGE.get(STORAGE.keys.exercises) || []
  };

  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  let output;
  if (settings.backupPassword) {
    output = await STORAGE.encrypt(data, settings.backupPassword);
  } else {
    output = { encrypted: false, data };
  }

  const json = JSON.stringify(output, null, 2);
  this._download(json, `fitness-incremental-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');

  // 更新导出日期
  localStorage.setItem('fitness_last_export_date', new Date().toISOString());
  return json;
};

// ---------- 导入 ----------
Backup.importFile = function(file, mode = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        let data;

        if (parsed.encrypted) {
          const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
          if (!settings.backupPassword) {
            reject(new Error('需要备份密码'));
            return;
          }
          data = await STORAGE.decrypt(parsed, settings.backupPassword);
          if (!data) {
            reject(new Error('解密失败，密码错误'));
            return;
          }
        } else {
          data = parsed.data || parsed;
        }

        this._applyImport(data, mode);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

Backup._applyImport = function(data, mode) {
  const merge = mode === 'merge';

  // tags
  if (data.tags) {
    const existing = STORAGE.get(STORAGE.keys.tags) || [];
    if (merge) {
      const existingIds = new Set(existing.map(t => t.id));
      data.tags.forEach(t => { if (!existingIds.has(t.id)) existing.push(t); });
      STORAGE.set(STORAGE.keys.tags, existing);
    } else {
      STORAGE.set(STORAGE.keys.tags, data.tags);
    }
  }

  // exercises
  if (data.exercises) {
    const existing = STORAGE.get(STORAGE.keys.exercises) || [];
    if (merge) {
      const existingIds = new Set(existing.map(e => e.id));
      data.exercises.forEach(e => { if (!existingIds.has(e.id)) existing.push(e); });
      STORAGE.set(STORAGE.keys.exercises, existing);
    } else {
      STORAGE.set(STORAGE.keys.exercises, data.exercises);
    }
  }

  // plans
  if (data.plans) {
    const existing = STORAGE.get(STORAGE.keys.plans) || [];
    if (merge) {
      const existingIds = new Set(existing.map(p => p.id));
      data.plans.forEach(p => { if (!existingIds.has(p.id)) existing.push(p); });
      STORAGE.set(STORAGE.keys.plans, existing);
    } else {
      STORAGE.set(STORAGE.keys.plans, data.plans);
    }
  }

  // records
  if (data.records) {
    const existing = STORAGE.get(STORAGE.keys.records) || [];
    if (merge) {
      const existingIds = new Set(existing.map(r => r.id));
      data.records.forEach(r => { if (!existingIds.has(r.id)) existing.push(r); });
      STORAGE.set(STORAGE.keys.records, existing);
    } else {
      STORAGE.set(STORAGE.keys.records, data.records);
    }
  }

  // settings
  if (data.settings && !merge) {
    STORAGE.set(STORAGE.keys.settings, data.settings);
  }

  App.showToast(`导入完成（${merge ? '合并' : '覆盖'}模式）`, 'success');
};

// ---------- 清空数据 ----------
Backup.clearAllData = function() {
  STORAGE.clear();
  // 重新初始化空数据
  STORAGE.set(STORAGE.keys.settings, defaultSettings());
  ['tags', 'exercises', 'plans', 'records'].forEach(k => {
    STORAGE.set(STORAGE.keys[k], []);
  });
  App.showToast('所有数据已清空', 'info');
};

// ---------- 文件下载 ----------
Backup._download = function(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ---------- 从其他应用导入（CSV/Hevy/Strong 桩） ----------
Backup.importHevy = function(csvText) {
  // Hevy 导出格式示例: Date,Exercise,Set,Weight,Reps,Distance,Duration...
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return;
  const headers = lines[0].split(',');
  const records = [];
  const exercisesMap = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const date = cols[0]?.trim();
    const exName = cols[1]?.trim();
    if (!exName) continue;

    const weight = parseFloat(cols[3]) || 0;
    const reps = parseInt(cols[4]) || 0;

    if (!exercisesMap[exName]) {
      const ex = newExercise(exName, [
        newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5 }),
        newField('reps', '次数', 'number', { unit: '次', step: 1 })
      ]);
      exercisesMap[exName] = ex;
      const existing = STORAGE.get(STORAGE.keys.exercises) || [];
      existing.push(ex);
      STORAGE.set(STORAGE.keys.exercises, existing);
    }

    // 简化：按日期聚合为一次记录
  }

  App.showToast('Hevy 导入完成（桩实现，需完善）', 'info');
};

if (typeof window !== 'undefined') {
  window.Backup = Backup;
}

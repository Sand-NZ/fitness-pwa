/**
 * records.js — 记录管理 + 统计聚合
 * 依赖：models.js, storage.js
 */
const Records = {
  data: [],
  _loaded: false
};

// ---------- 加载/保存 ----------
Records.load = function() {
  this.data = STORAGE.get(STORAGE.keys.records) || [];
  this._loaded = true;
  return this.data;
};

Records.save = function() {
  STORAGE.set(STORAGE.keys.records, this.data);
  App.emit('recordsChanged', this.data);
};

Records.getAll = function() {
  if (!this._loaded) this.load();
  return this.data;
};

Records.getById = function(id) {
  return this.getAll().find(r => r.id === id);
};

// ---------- CRUD ----------
Records.add = function(record) {
  this.getAll();
  this.data.unshift(record); // 最新的在前面
  this.save();
  return record;
};

Records.remove = function(id) {
  this.getAll();
  this.data = this.data.filter(r => r.id !== id);
  this.save();
  return true;
};

Records.update = function(id, updates) {
  this.getAll();
  const idx = this.data.findIndex(r => r.id === id);
  if (idx === -1) return null;
  Object.assign(this.data[idx], updates);
  this.save();
  return this.data[idx];
};

// ---------- 查询与筛选 ----------
Records.query = function(opts = {}) {
  let results = this.getAll();

  if (opts.startDate) {
    const start = new Date(opts.startDate).getTime();
    if (isNaN(start)) return results; // BUG 9: 无效日期不筛选
    results = results.filter(r => {
      const t = new Date(r.date).getTime();
      return !isNaN(t) && t >= start;
    });
  }
  if (opts.endDate) {
    const end = new Date(opts.endDate).getTime() + 86400000;
    if (isNaN(end)) return results;
    results = results.filter(r => {
      const t = new Date(r.date).getTime();
      return !isNaN(t) && t < end;
    });
  }
  if (opts.mode && opts.mode !== 'all') {
    if (opts.mode === 'free') results = results.filter(r => r.mode === 'free' || r.planName === '自由训练');
    else results = results.filter(r => r.mode === 'plan' || r.planName !== '自由训练');
  }
  if (opts.tagIds && opts.tagIds.length) {
    results = results.filter(r =>
      r.exercisesCompleted.some(ec =>
        (ec.tags || []).some(t => opts.tagIds.includes(t))
      )
    );
  }
  if (opts.limit) {
    results = results.slice(0, opts.limit);
  }

  return results;
};

// ---------- 统计聚合 ----------
Records.getStats = function(records) {
  const list = records || this.getAll();
  if (!list.length) {
    return {
      totalSessions: 0,
      totalDuration: 0,
      totalSets: 0,
      totalVolume: 0,
      avgRpe: 0,
      avgWeight: 0,
      weightTrend: [],
      byDate: {}
    };
  }

  let totalSets = 0;
  let totalVolume = 0;
  const weights = [];
  const weightTrend = [];
  const byDate = {};

  list.forEach(r => {
    if (r.weight) weights.push(r.weight);

    const dateKey = r.date.slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = { sessions: 0, sets: 0, volume: 0, duration: 0 };
    byDate[dateKey].sessions++;
    byDate[dateKey].duration += r.totalDuration || 0;

    (r.exercisesCompleted || []).forEach(ec => {
      const sets = ec.sets || [];
      totalSets += sets.length;
      byDate[dateKey].sets += sets.length;

      sets.forEach(s => {
        const w = parseFloat(s.weight) || 0;
        const reps = parseFloat(s.reps) || 0;
        totalVolume += w * reps;
        byDate[dateKey].volume += w * reps;
      });
    });
  });

  const sortedDates = Object.keys(byDate).sort();
  weightTrend.push(...sortedDates.map(d => ({ date: d, weight: byDate[d].volume })));

  return {
    totalSessions: list.length,
    totalDuration: list.reduce((s, r) => s + (r.totalDuration || 0), 0),
    totalSets,
    totalVolume,
    avgWeight: weights.length ? (weights.reduce((s, v) => s + v, 0) / weights.length) : 0,
    weightTrend,
    byDate
  };
};

// ---------- 导出 CSV ----------
Records.exportCSV = function(records) {
  const list = records || this.getAll();
  let csv = '日期,计划,用时(秒),体重(kg),备注\n';
  list.forEach(r => {
    const date = r.date.slice(0, 19).replace('T', ' ');
    const note = (r.note || '').replace(/,/g, '，');
    csv += `${date},${r.planName},${r.totalDuration || 0},${r.weight || 0},${note}\n`;

    // 各组详情
    (r.exercisesCompleted || []).forEach(ec => {
      (ec.sets || []).forEach((s, i) => {
        const details = Object.entries(s).map(([k, v]) => `${k}:${v}`).join(' ');
        csv += `,,,动作:${ec.name},组${i+1},${details}\n`;
      });
    });
  });
  return csv;
};

// ---------- 统计页面渲染（桩 - 由 stats 页面补充） ----------
Records.renderStats = function(container, opts = {}) {
  if (!container) return;
  const records = this.query(opts);
  const stats = this.getStats(records);

  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';

  const cards = [
    { label: '训练次数', value: stats.totalSessions },
    { label: '总组数', value: stats.totalSets },
    { label: '总时长', value: UI.formatDuration(stats.totalDuration) },
    { label: '总容量', value: (stats.totalVolume / 1000).toFixed(1) + 'k' },
    { label: '平均体重', value: stats.avgWeight.toFixed(1) + 'kg' },
    { label: '总动作', value: stats.totalSessions }
  ];

  cards.forEach(c => {
    html += `<div class="stat-card"><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`;
  });

  html += '</div>';

  // 记录列表
  if (records.length === 0) {
    html += UI.emptyState('📊', '暂无训练记录', '');
  } else {
    html += '<div style="font-weight:600;margin:16px 0 8px">训练记录</div>';
    records.slice(0, 50).forEach(r => {
      const exNames = (r.exercisesCompleted || []).map(ec => ec.name).join(', ');
      html += `<div class="card" style="font-size:0.85rem;cursor:pointer" onclick="Records._toggleDetail('${r.id}')">
        <div style="display:flex;justify-content:space-between">
          <span>${UI.formatDate(r.date)}</span>
          <span style="color:var(--text-secondary)">${Esc.html(r.planName)}</span>
        </div>
        <div style="margin-top:4px;color:var(--text-secondary)">体重 ${r.weight}kg · ${UI.formatDuration(r.totalDuration || 0)}</div>
        <div style="margin-top:2px;color:var(--text-secondary)">${Esc.html(exNames)}</div>
        <div id="record-detail-${r.id}" class="hidden" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"></div>
      </div>`;
    });
  }

  container.innerHTML = html;
};

Records._toggleDetail = function(id) {
  const detail = document.getElementById('record-detail-' + id);
  if (!detail) return;
  if (!detail.classList.contains('hidden')) { detail.classList.add('hidden'); return; }
  const r = this.getById(id);
  if (!r) return;

  let html = '';
  (r.exercisesCompleted || []).forEach(ec => {
    // 查找字段定义
    let fields = [];
    if (ec.exerciseId) { const ex = Exercises.getById(ec.exerciseId); if (ex) fields = ex.fields; }
    if (!fields.length) { const ex = Exercises.getAll().find(e => e.name === ec.name); if (ex) fields = ex.fields; }
    html += `<div style="margin-bottom:8px"><strong>${Esc.html(ec.name)}</strong> <span style="font-weight:400;color:var(--text-secondary);font-size:0.75rem">#${exIdx+1}</span></div>`;
    (ec.sets || []).forEach((s, i) => {
      const vals = fields.length
        ? fields.map(f => { const v = s[f.key]; return v != null && v !== '' ? `${v}${f.unit || ''}` : null; }).filter(Boolean).join(' · ')
        : Object.values(s).filter(v => v != null && v !== '').join(' · ');
      html += `<div style="padding:2px 0">组 ${i+1}: ${Esc.html(String(vals))}</div>`;
    });
  });
  if (r.note) html += `<div style="margin-top:4px;color:var(--text-secondary)">💬 ${Esc.html(r.note)}</div>`;

  detail.innerHTML = html;
  detail.classList.remove('hidden');
};

if (typeof window !== 'undefined') {
  window.Records = Records;
}

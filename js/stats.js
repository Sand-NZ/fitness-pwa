/**
 * stats.js — 统计页面（仪表盘、图表、筛选、导出）
 * 依赖：records.js, tags.js, ui.js
 */
const Stats = {
  filter: {
    mode: 'all',
    tagIds: [],
    startDate: null,
    endDate: null,
    preset: '30',
    viewMode: 'card' // 'card' | 'timeline'
  }
};

Stats.renderPage = function() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  Records.load();
  Tags.load();

  let html = '';

  // ====== 筛选区域 ======
  html += `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button class="btn btn-sm ${this.filter.preset === '7' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setPreset('7')">7天</button>
      <button class="btn btn-sm ${this.filter.preset === '30' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setPreset('30')">30天</button>
      <button class="btn btn-sm ${this.filter.preset === '90' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setPreset('90')">90天</button>
      <button class="btn btn-sm ${this.filter.preset === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setPreset('all')">全部</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
      <button class="btn btn-sm ${this.filter.mode === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setMode('all')">全部</button>
      <button class="btn btn-sm ${this.filter.mode === 'free' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setMode('free')">自由训练</button>
    </div>`;

  // 标签筛选
  html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
  Tags.getAll().forEach(t => {
    const active = this.filter.tagIds.includes(t.id) ? 'active' : '';
    html += `<span class="tag-filter-item ${active}" style="border-color:${t.color}" onclick="Stats.toggleTag('${t.id}')">${Esc.html(t.name)}</span>`;
  });
  html += '</div></div>';

  // 视图切换
  html += `<div style="display:flex;gap:6px;margin-bottom:8px">
    <button class="btn btn-sm ${this.filter.viewMode === 'card' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setView('card')">📋 卡片</button>
    <button class="btn btn-sm ${this.filter.viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}" onclick="Stats.setView('timeline')">📅 时间轴</button>
  </div>`;

  // ====== 计算筛选参数 ======
  const now = new Date();
  let startDate = null;
  if (this.filter.preset !== 'all') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - parseInt(this.filter.preset));
  }

  const queryOpts = {
    startDate: startDate ? startDate.toISOString() : null,
    endDate: now.toISOString(),
    mode: this.filter.mode,
    tagIds: this.filter.tagIds
  };

  const records = Records.query(queryOpts);
  const stats = Records.getStats(records);

  // ====== 统计卡片 ======
  html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
    <div class="stat-card"><div class="stat-value">${stats.totalSessions}</div><div class="stat-label">训练次数</div></div>
    <div class="stat-card"><div class="stat-value">${stats.totalSets}</div><div class="stat-label">总组数</div></div>
    <div class="stat-card"><div class="stat-value">${UI.formatDuration(stats.totalDuration)}</div><div class="stat-label">总时长</div></div>
    <div class="stat-card"><div class="stat-value">${(stats.totalVolume / 1000).toFixed(1)}k</div><div class="stat-label">总容量</div></div>
    <div class="stat-card"><div class="stat-value">${stats.avgWeight.toFixed(1)}</div><div class="stat-label">平均体重</div></div>
    <div class="stat-card"><div class="stat-value">${stats.totalExercises || 0}</div><div class="stat-label">总动作</div></div>
  </div>`;

  // ====== 简单图表（用 div 条代替） ======
  const trend = stats.weightTrend;
  if (trend.length > 0) {
    const maxVal = Math.max(...trend.map(t => t.weight), 1);
    html += `<div class="card" style="margin-bottom:12px">
      <div class="card-title" style="margin-bottom:8px">📈 容量趋势</div>
      <div style="display:flex;align-items:flex-end;gap:3px;height:100px;padding:4px 0">`;

    // 最多显示 30 个点
    const points = trend.slice(-30);
    points.forEach(p => {
      const h = Math.max(4, (p.weight / maxVal) * 96);
      html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center">
        <div style="width:100%;background:var(--accent);border-radius:2px;height:${h}px;min-height:4px" title="${p.date}: ${(p.weight/1000).toFixed(1)}k"></div>
        <span style="font-size:0.5rem;color:var(--text-secondary);margin-top:2px;transform:rotate(-45deg);white-space:nowrap">${UI.formatShortDate(p.date)}</span>
      </div>`;
    });

    html += `</div></div>`;

    // 导出按钮
    html += `<div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-secondary btn-sm" onclick="Stats.exportCSV()">📥 导出 CSV</button>
      <button class="btn btn-secondary btn-sm" onclick="Stats.exportChartPNG()">📷 导出图表</button>
    </div>`;
  }

  // ====== 记录列表 ======
  html += `<div style="font-weight:600;margin:8px 0">📋 记录列表 (${records.length})</div>`;

  if (records.length === 0) {
    html += UI.emptyState('📊', '暂无训练记录', '');
  } else if (this.filter.viewMode === 'timeline') {
    html += this._renderTimeline(records.slice(0, 50));
  } else {
    records.slice(0, 50).forEach(r => {
      const exNames = (r.exercisesCompleted || []).map((ec, i) => `#${i+1} ${Esc.html(ec.name)}`).join(' · ');
      html += `<div class="card" style="font-size:0.85rem;margin-bottom:6px" onclick="Stats._toggleDetail('${r.id}')">
        <div style="display:flex;justify-content:space-between">
          <span>${UI.formatDate(r.date)}</span>
          <span style="color:var(--text-secondary)">${Esc.html(r.planName)}</span>
        </div>
        <div style="margin-top:2px;color:var(--text-secondary)">体重 ${r.weight}kg · ${UI.formatDuration(r.totalDuration || 0)}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">${exNames}</div>
        <div id="stats-record-detail-${r.id}" class="hidden" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)"></div>
        <div style="margin-top:6px;text-align:right">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Stats.editRecord('${r.id}')" style="color:var(--accent);font-size:0.75rem">✏️ 编辑</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Stats.deleteRecord('${r.id}')" style="color:var(--danger);font-size:0.75rem">🗑️ 删除</button>
        </div>
      </div>`;
    });

    if (records.length > 50) {
      html += `<div style="text-align:center;padding:8px;color:var(--text-secondary);font-size:0.85rem">仅显示最近 50 条记录</div>`;
    }
  }

  container.innerHTML = html;
};

// 辅助：获取动作的字段定义
Stats._getFieldsFor = function(ec) {
  let ex = null;
  if (ec.exerciseId) ex = Exercises.getById(ec.exerciseId);
  if (!ex) ex = Exercises.getAll().find(e => e.name === ec.name);
  return ex ? ex.fields : [];
};

// 辅助：按字段顺序渲染一组值（含单位）
Stats._renderSetValues = function(s, fields) {
  if (!fields || !fields.length) {
    return Object.values(s).filter(v => v != null && v !== '').join(' · ');
  }
  return fields.map(f => {
    const val = s[f.key];
    if (val == null || val === '') return null;
    return `${val}${f.unit || ''}`;
  }).filter(Boolean).join(' · ');
};

// ---------- 记录详情 ----------
Stats._toggleDetail = function(id) {
  const detail = document.getElementById('stats-record-detail-' + id);
  if (!detail) return;
  if (!detail.classList.contains('hidden')) { detail.classList.add('hidden'); return; }
  const r = Records.getById(id);
  if (!r) return;

  let html = '';
  (r.exercisesCompleted || []).forEach((ec, exIdx) => {
    const fields = this._getFieldsFor(ec);
    html += `<div style="margin-bottom:8px"><strong>${Esc.html(ec.name)}</strong> <span style="font-weight:400;color:var(--text-secondary);font-size:0.75rem">#${exIdx+1}</span>`;
    if (ec.targetReps) {
      const totalReps = (ec.sets || []).reduce((s, set) => s + (parseInt(set.reps) || 0), 0);
      const done = totalReps >= ec.targetReps ? '✅' : '⏳';
      html += ` <span style="font-size:0.75rem;color:var(--text-secondary)">${done} ${totalReps}/${ec.targetReps}</span>`;
    }
    html += `</div>`;
    (ec.sets || []).forEach((s, i) => {
      const vals = this._renderSetValues(s, fields);
      const dropBadge = s._dropGroup ? ' <span style="color:#e68a2e;font-size:0.7rem">🔽递减</span>' : '';
      html += `<div style="padding:2px 0;font-size:0.8rem">组 ${i+1}: ${Esc.html(String(vals))}${dropBadge}</div>`;
    });
  });
  if (r.note) html += `<div style="margin-top:4px;font-size:0.8rem;color:var(--text-secondary)">💬 ${Esc.html(r.note)}</div>`;

  detail.innerHTML = html;
  detail.classList.remove('hidden');
};

// ---------- 编辑记录（↑↓箭头排序 + 可删动作 + 可补删组） ----------
Stats.editRecord = function(id) {
  const r = Records.getById(id);
  if (!r) return;
  const total = (r.exercisesCompleted || []).length;
  let html = `<h2>编辑训练记录</h2>
    <form id="edit-record-form">
      <div class="form-group">
        <label class="form-label">体重 (kg)</label>
        <input type="number" class="form-input" name="weight" value="${r.weight || 0}" step="0.1">
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" name="note" placeholder="训练感受">${Esc.html(r.note || '')}</textarea>
      </div>`;

  (r.exercisesCompleted || []).forEach((ec, exIdx) => {
    const fields = this._getFieldsFor(ec);
    const keys = fields.length ? fields : Object.keys(ec.sets?.[0] || {}).map(k => ({key:k,label:k,unit:''}));
    html += `<div class="form-section exercise-block" data-idx="${exIdx}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:4px">
          ${exIdx > 0 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="var b=this.closest('.exercise-block');var p=b.previousElementSibling;if(p&&p.classList.contains('exercise-block')){p.parentElement.insertBefore(b,p)}" style="font-size:0.9rem">↑</button>` : '<span style="width:28px"></span>'}
          ${exIdx < total - 1 ? `<button type="button" class="btn btn-ghost btn-sm" onclick="var b=this.closest('.exercise-block');var n=b.nextElementSibling;if(n&&n.classList.contains('exercise-block')){n.parentElement.insertBefore(n,b)}" style="font-size:0.9rem">↓</button>` : '<span style="width:28px"></span>'}
          <span style="font-weight:600;font-size:0.9rem">${Esc.html(ec.name)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.exercise-block').remove()" style="color:var(--danger);font-size:0.75rem">🗑️ 删除</button>
      </div>`;
    html += `<div class="existing-sets" data-ex="${exIdx}">`;
    (ec.sets || []).forEach((s, setIdx) => {
      html += `<div class="set-row" style="display:flex;gap:4px;align-items:center;margin-bottom:6px;flex-wrap:wrap">`;
      html += `<span style="font-size:0.75rem;color:var(--text-secondary);min-width:28px">${setIdx+1}</span>`;
      keys.forEach(f => {
        const val = s[f.key] ?? '';
        html += `<input type="text" class="form-input set-input" style="width:64px;flex:1;min-width:48px" data-ex="${exIdx}" data-set="${setIdx}" data-key="${f.key}" value="${Esc.html(String(val))}"><span style="font-size:0.65rem;color:var(--text-secondary);margin-right:2px">${Esc.html(f.unit)}</span>`;
      });
      html += `<button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('.set-row').remove()" style="color:var(--danger);font-size:0.7rem;padding:2px 6px">✕</button>`;
      html += `</div>`;
    });
    html += `</div>`;
    html += `<button type="button" class="btn btn-secondary btn-sm" onclick="
      var container=this.previousElementSibling;
      var tpl=container.querySelector('.set-row');
      if(tpl){var c=tpl.cloneNode(true);c.querySelectorAll('input.set-input').forEach(function(i){
        i.value=''; var ex=i.dataset.ex; var si=container.children.length; i.name=''; i.dataset.set=si;
      });container.appendChild(c)}
    " style="margin-top:4px">+ 补一组</button>`;
    html += `</div>`;
  });

  html += `<div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Stats._saveEdit('${id}')">保存</button>
      </div>
    </form>`;
  App.showModal(html);
};

Stats._saveEdit = function(id) {
  const r = Records.getById(id);
  const form = document.getElementById('edit-record-form');
  if (!form || !r) return;
  const fd = new FormData(form);
  const updates = {
    weight: parseFloat(fd.get('weight')) || 0,
    note: fd.get('note') || ''
  };

  // 按 DOM 视觉顺序重构 exercisesCompleted
  const blocks = form.querySelectorAll('.exercise-block');
  const newCompleted = [];
  blocks.forEach(block => {
    const idx = parseInt(block.dataset.idx);
    const ec = r.exercisesCompleted[idx];
    if (!ec) return;
    const sets = [];
    const setRows = block.querySelectorAll('.set-row');
    setRows.forEach(row => {
      const set = {};
      row.querySelectorAll('.set-input').forEach(inp => {
        set[inp.dataset.key] = inp.value;
      });
      if (Object.keys(set).length) sets.push(set);
    });
    if (sets.length) newCompleted.push({ ...ec, sets });
  });
  if (newCompleted.length) updates.exercisesCompleted = newCompleted;

  Records.update(id, updates);
  App.closeModal();
  this.renderPage();
  App.showToast('已更新', 'success');
};

// ---------- 删除记录 ----------
Stats.deleteRecord = function(id) {
  const r = Records.getById(id);
  if (!r) return;
  App.showModal(UI.confirmModal('删除记录', `确定删除 ${UI.formatDate(r.date)} 的训练记录吗？`, '删除', '取消', true));
  const btn = document.getElementById('modal-confirm-btn');
  if (btn) btn.addEventListener('click', () => {
    Records.remove(id);
    App.closeModal();
    this.renderPage();
    App.showToast('已删除', 'info');
  }, { once: true });
};

// ---------- 筛选操作 ----------
Stats.setPreset = function(preset) {
  this.filter.preset = preset;
  this.renderPage();
};

Stats.setMode = function(mode) {
  this.filter.mode = mode;
  this.renderPage();
};

Stats.toggleTag = function(tagId) {
  const idx = this.filter.tagIds.indexOf(tagId);
  if (idx >= 0) this.filter.tagIds.splice(idx, 1);
  else this.filter.tagIds.push(tagId);
  this.renderPage();
};

Stats.setView = function(mode) {
  this.filter.viewMode = mode;
  this.renderPage();
};

// ---------- 时间轴视图（按训练记录展开每个动作的组数据） ----------
Stats._renderTimeline = function(records) {
  let html = '<div style="position:relative;padding-left:24px">';
  html += '<div style="position:absolute;left:10px;top:0;bottom:0;width:2px;background:var(--border)"></div>';

  records.forEach(r => {
    const dateStr = r.date.slice(0, 10);
    const timeStr = r.date.slice(11, 16);

    // 时间轴节点——训练记录头部
    html += `<div style="position:relative;margin-bottom:16px;padding-left:18px">`;
    html += `<div style="position:absolute;left:-14px;top:4px;width:12px;height:12px;border-radius:50%;background:var(--accent);border:2px solid var(--bg)"></div>`;
    html += `<div style="font-size:0.75rem;color:var(--text-secondary)">${dateStr} ${timeStr}</div>`;
    html += `<div style="font-size:0.85rem;font-weight:500;margin:2px 0">体重 ${r.weight}kg · ${UI.formatDuration(r.totalDuration || 0)}</div>`;

    // 展开每个动作及其组
    (r.exercisesCompleted || []).forEach((ec, exIdx) => {
      const fields = Stats._getFieldsFor(ec);
      html += `<div style="margin:6px 0 4px 8px;padding:6px 10px;background:var(--bg-card);border-radius:var(--radius-sm);border:1px solid var(--border)">`;
      html += `<div style="font-size:0.8rem;font-weight:600;margin-bottom:4px">#${exIdx+1} ${Esc.html(ec.name)}</div>`;
      (ec.sets || []).forEach((s, setIdx) => {
        const vals = Stats._renderSetValues(s, fields);
        html += `<div style="font-size:0.75rem;padding:2px 0;color:var(--text-secondary)">组 ${setIdx+1}: ${Esc.html(String(vals))}</div>`;
      });
      html += `</div>`;
    });

    // 编辑/删除
    html += `<div style="margin-top:4px;display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Stats.editRecord('${r.id}')" style="color:var(--accent);font-size:0.7rem">✏️ 编辑</button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Stats.deleteRecord('${r.id}')" style="color:var(--danger);font-size:0.7rem">🗑️ 删除</button>
    </div>`;
    html += `</div>`;
  });

  html += '</div>';
  return html;
};

// ---------- 导出 ----------
Stats.exportCSV = function() {
  const now = new Date();
  let startDate = null;
  if (this.filter.preset !== 'all') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - parseInt(this.filter.preset));
  }
  const records = Records.query({
    startDate: startDate ? startDate.toISOString() : null,
    endDate: now.toISOString(),
    mode: this.filter.mode,
    tagIds: this.filter.tagIds
  });
  const csv = Records.exportCSV(records);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitness-stats-${now.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

Stats.exportChartPNG = function() {
  const container = document.getElementById('stats-content');
  if (!container) return;
  // 简单截图：使用 html2canvas（未集成时提示）
  App.showToast('图表导出需集成 html2canvas 库', 'info');
};

if (typeof window !== 'undefined') {
  window.Stats = Stats;
}

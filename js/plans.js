/**
 * plans.js — 计划管理（CRUD、排序、字段覆盖）
 * 依赖：models.js, storage.js, exercises.js, tags.js
 */
const Plans = {
  data: [],
  _loaded: false
};

// ---------- 加载/保存 ----------
Plans.load = function() {
  this.data = STORAGE.get(STORAGE.keys.plans) || [];
  this._loaded = true;
  return this.data;
};

Plans.save = function() {
  STORAGE.set(STORAGE.keys.plans, this.data);
  App.emit('plansChanged', this.data);
};

Plans.getAll = function() {
  if (!this._loaded) this.load();
  return this.data;
};

Plans.getById = function(id) {
  return this.getAll().find(p => p.id === id);
};

// ---------- CRUD ----------
Plans.add = function(plan) {
  this.getAll();
  this.data.push(plan);
  this.save();
  return plan;
};

Plans.update = function(id, updates) {
  this.getAll();
  const idx = this.data.findIndex(p => p.id === id);
  if (idx === -1) return null;
  Object.assign(this.data[idx], updates);
  this.save();
  return this.data[idx];
};

Plans.remove = function(id) {
  this.getAll();
  this.data = this.data.filter(p => p.id !== id);
  // 清除关联的 activePlanId
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  if (settings.activePlanId === id) {
    settings.activePlanId = null;
    STORAGE.set(STORAGE.keys.settings, settings);
  }
  this.save();
  return true;
};

Plans.setActive = function(id) {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  settings.activePlanId = id;
  STORAGE.set(STORAGE.keys.settings, settings);
  this.renderPage();
  App.showToast(id ? '已设为当前计划' : '已取消激活', 'success');
};

Plans.getActiveId = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  return settings.activePlanId;
};

// ---------- 页面渲染 ----------
Plans.renderPage = function() {
  const container = document.getElementById('plans-content');
  if (!container) return;

  this.load();
  Exercises.load();
  Tags.load();

  const plans = this.getAll();
  const activeId = this.getActiveId();

  let html = '';

  if (plans.length === 0) {
    html += UI.emptyState('📋', '还没有训练计划，点击上方按钮创建第一个', '<button class="btn btn-primary btn-sm" onclick="Plans.showAddForm()">+ 新建计划</button>');
  } else {
    plans.forEach(p => {
      const isActive = p.id === activeId;
      const exNames = p.exercises.map(pe => {
        const ex = Exercises.getById(pe.exerciseId);
        return ex ? ex.name : '(已删除)';
      });

      html += `<div class="card" style="${isActive ? 'border-color:var(--accent)' : ''}">
        <div class="card-header">
          <div>
            <span class="card-title">${Esc.html(p.name)}</span>
            ${isActive ? '<span style="color:var(--accent);font-size:0.75rem;margin-left:6px">⭐ 当前</span>' : ''}
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" data-plan-id="${p.id}" data-action="${isActive ? 'deactivate' : 'activate'}">${isActive ? '取消激活' : '⭐'}</button>
            <button class="btn btn-ghost btn-sm" onclick="Plans.showEditForm('${p.id}')">✏️</button>
            <button class="btn btn-ghost btn-sm" onclick="Plans.confirmRemove('${p.id}')" style="color:var(--danger)">🗑️</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Backup.exportSinglePlan('${p.id}')" style="color:var(--text-secondary)">📤</button>
          </div>
        </div>
        <div class="card-subtitle">${p.exercises.length} 个动作</div>
        <div style="margin-top:6px;font-size:0.8rem;color:var(--text-secondary)">
          ${exNames.join(' → ')}
        </div>
      </div>`;
    });
  }

  container.innerHTML = html;

  // 绑定：使用事件委托避免重复监听
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.planId;
      Plans.setActive(this.dataset.action === 'activate' ? id : null);
    });
  });

  // 绑定新建按钮（用一次性的）
  const addBtn = document.getElementById('btn-add-plan');
  if (addBtn && !addBtn._listenerAttached) {
    addBtn.addEventListener('click', () => Plans.showAddForm());
    addBtn._listenerAttached = true;
  }
};

// ---------- 添加/编辑表单 ----------
Plans.showAddForm = function() {
  this._showForm(null);
};

Plans.showEditForm = function(id) {
  const p = this.getById(id);
  if (p) this._showForm(p);
};

Plans.confirmRemove = function(id) {
  const p = this.getById(id);
  if (!p) return;
  App.showModal(UI.confirmModal('删除计划', `确定删除「${p.name}」吗？`, '删除', '取消', true));
  document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
    this.remove(id);
    App.closeModal();
    this.renderPage();
    App.showToast('已删除', 'info');
  });
};

Plans._showForm = function(existing) {
  const isEdit = !!existing;
  const plan = existing || { id: '', name: '', exercises: [] };
  Exercises.load();

  let html = `<h2>${isEdit ? '编辑计划' : '新建计划'}</h2>
    <form id="plan-form" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">计划名称 *</label>
        <input type="text" class="form-input" name="name" value="${Esc.html(plan.name)}" placeholder="例如：推拉腿" required>
      </div>
      <div class="form-section">
        <div class="form-section-title">选择动作（按顺序）</div>
        <div id="plan-exercise-list">`;

  // 已选动作
  plan.exercises.forEach((pe, i) => {
    const ex = Exercises.getById(pe.exerciseId);
    html += `<div class="list-item" data-ex-id="${pe.exerciseId}">
      <span style="cursor:grab;color:var(--text-secondary)">⋮⋮</span>
      <span class="list-item-content">${ex ? Esc.html(ex.name) : '(已删除)'}</span>
      <button type="button" class="btn btn-ghost btn-sm" onclick="Plans._removePlanExercise(this)" style="color:var(--danger)">✕</button>
    </div>`;
  });

  html += `</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="Plans._showExercisePicker()" style="margin-top:8px">+ 添加动作</button>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Plans._saveForm('${plan.id || ''}')">${isEdit ? '保存' : '创建'}</button>
      </div>
    </form>`;

  App.showModal(html);
};

Plans._showExercisePicker = function() {
  const exercises = Exercises.getAll();
  let html = `<h2>选择动作</h2>
    <div style="margin-bottom:12px">${UI.searchBar('搜索…')}</div>
    <div id="exercise-picker-list" style="max-height:300px;overflow-y:auto">`;

  if (exercises.length === 0) {
    html += '<p style="color:var(--text-secondary)">动作库为空，请先创建动作</p>';
  } else {
    exercises.forEach(ex => {
      html += `<div class="list-item picker-item" data-ex-id="${ex.id}" style="cursor:pointer">
        <input type="checkbox" class="picker-checkbox" data-ex-id="${ex.id}">
        <span class="list-item-content">${Esc.html(ex.name)}</span>
        <span style="font-size:0.75rem;color:var(--text-secondary)">${(ex.fields||[]).length} 字段</span>
      </div>`;
    });
  }

  html += `</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      <button class="btn btn-primary" onclick="Plans._addSelectedExercises()">添加选中</button>
    </div>`;

  App.showModal(html);

  // 搜索过滤
  setTimeout(() => {
    document.querySelector('#modal-container .search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.picker-item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
      });
    });
  }, 0);
};

Plans._addSelectedExercises = function() {
  const list = document.getElementById('plan-exercise-list');
  if (!list) return;
  document.querySelectorAll('.picker-checkbox:checked').forEach(cb => {
    const exId = cb.dataset.exId;
    if (!list.querySelector(`[data-ex-id="${exId}"]`)) {
      const ex = Exercises.getById(exId);
      list.insertAdjacentHTML('beforeend', `<div class="list-item" data-ex-id="${exId}">
        <span style="cursor:grab;color:var(--text-secondary)">⋮⋮</span>
        <span class="list-item-content">${Esc.html(ex ? ex.name : '?')}</span>
        <button type="button" class="btn btn-ghost btn-sm" onclick="Plans._removePlanExercise(this)" style="color:var(--danger)">✕</button>
      </div>`);
    }
  });
  App.closeModal();
};

Plans._removePlanExercise = function(btn) {
  const item = btn.closest('.list-item');
  if (item) item.remove();
};

Plans._saveForm = function(existingId) {
  const form = document.getElementById('plan-form');
  if (!form) return;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  if (!name) { App.showToast('请输入计划名称', 'warning'); return; }

  const exerciseIds = [];
  form.querySelectorAll('#plan-exercise-list .list-item').forEach(el => {
    const exId = el.dataset.exId;
    if (exId) exerciseIds.push({ exerciseId: exId, overrideFields: [] });
  });

  if (exerciseIds.length === 0) {
    App.showToast('请至少添加一个动作', 'warning');
    return;
  }

  const data = { name, exercises: exerciseIds };

  if (existingId) {
    this.update(existingId, data);
    App.showToast('已更新', 'success');
  } else {
    data.id = generateId();
    this.add(data);
    App.showToast('已创建', 'success');
  }

  App.closeModal();
  this.renderPage();
};

if (typeof window !== 'undefined') {
  window.Plans = Plans;
}

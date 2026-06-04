/**
 * exercises.js — 动作管理（含自定义字段 CRUD、模板）
 * 依赖：models.js, storage.js, tags.js
 */
const Exercises = {
  data: [],
  _loaded: false
};

// ---------- 加载/保存 ----------
Exercises.load = function() {
  this.data = STORAGE.get(STORAGE.keys.exercises) || [];
  this._loaded = true;
  return this.data;
};

Exercises.save = function() {
  STORAGE.set(STORAGE.keys.exercises, this.data);
  App.emit('exercisesChanged', this.data);
};

Exercises.getAll = function() {
  if (!this._loaded) this.load();
  return this.data;
};

Exercises.getById = function(id) {
  return this.getAll().find(e => e.id === id);
};

// ---------- CRUD ----------
Exercises.add = function(exercise) {
  this.getAll();
  const errors = validateExercise(exercise);
  if (errors.length) { console.warn('动作验证失败:', errors); return null; }
  this.data.push(exercise);
  this.save();
  return exercise;
};

Exercises.update = function(id, updates) {
  this.getAll();
  const idx = this.data.findIndex(e => e.id === id);
  if (idx === -1) return null;
  Object.assign(this.data[idx], updates);
  this.save();
  return this.data[idx];
};

Exercises.remove = function(id) {
  this.getAll();
  this.data = this.data.filter(e => e.id !== id);
  this.save();
  return true;
};

// ---------- 搜索与筛选 ----------
Exercises.search = function(query) {
  const q = query.toLowerCase();
  return this.getAll().filter(e =>
    e.name.toLowerCase().includes(q) ||
    e.category.toLowerCase().includes(q) ||
    e.note.toLowerCase().includes(q)
  );
};

Exercises.filterByTags = function(tagIds) {
  if (!tagIds.length) return this.getAll();
  return this.getAll().filter(e =>
    tagIds.some(tid => e.tags.includes(tid))
  );
};

Exercises.filterByCategory = function(category) {
  if (!category) return this.getAll();
  return this.getAll().filter(e => e.category === category);
};

// ---------- 字段管理 ----------
Exercises.addField = function(exerciseId, field) {
  const ex = this.getById(exerciseId);
  if (!ex) return null;
  const errors = validateField(field);
  if (errors.length) { console.warn('字段验证失败:', errors); return null; }
  ex.fields.push(field);
  this.update(exerciseId, { fields: ex.fields });
  return field;
};

Exercises.removeField = function(exerciseId, fieldKey) {
  const ex = this.getById(exerciseId);
  if (!ex) return null;
  ex.fields = ex.fields.filter(f => f.key !== fieldKey);
  this.update(exerciseId, { fields: ex.fields });
  return true;
};

Exercises.reorderFields = function(exerciseId, fromIdx, toIdx) {
  const ex = this.getById(exerciseId);
  if (!ex) return null;
  const [moved] = ex.fields.splice(fromIdx, 1);
  ex.fields.splice(toIdx, 0, moved);
  this.update(exerciseId, { fields: ex.fields });
  return true;
};

// ---------- 模板 ----------
Exercises.saveAsTemplate = function(exercise) {
  const templates = JSON.parse(localStorage.getItem('fitness_templates') || '[]');
  const tmpl = { ...exercise, id: generateId(), name: exercise.name + ' (模板)', isTemplate: true };
  templates.push(tmpl);
  localStorage.setItem('fitness_templates', JSON.stringify(templates));
  return tmpl;
};

Exercises.getTemplates = function() {
  return JSON.parse(localStorage.getItem('fitness_templates') || '[]');
};

// ---------- 分类列表 ----------
Exercises.getCategories = function() {
  const cats = new Set();
  this.getAll().forEach(e => { if (e.category) cats.add(e.category); });
  return Array.from(cats).sort();
};

// ---------- 渲染辅助（返回 HTML） ----------
Exercises.renderFieldInput = function(field, value) {
  const val = value ?? field.default ?? '';
  const requiredAttr = field.required ? 'required' : '';
  const stepAttr = field.step ? `step="${field.step}"` : '';
  const placeholder = field.unit ? `例如: ${field.unit}` : '';

  switch (field.type) {
    case 'number':
      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <input type="number" class="form-input" name="${field.key}" value="${val}" ${stepAttr} placeholder="${placeholder}" ${requiredAttr}>
      </div>`;

    case 'text':
      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <input type="text" class="form-input" name="${field.key}" value="${val}" placeholder="${placeholder || '请输入'}" ${requiredAttr}>
      </div>`;

    case 'boolean':
      return `<div class="form-group">
        <label class="form-checkbox">
          <input type="checkbox" name="${field.key}" ${val ? 'checked' : ''}>
          <span>${field.label}</span>
        </label>
      </div>`;

    case 'select':
      const options = (field.options || []).map(o =>
        `<option value="${o}" ${String(val) === String(o) ? 'selected' : ''}>${o}</option>`
      ).join('');
      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <select class="form-select" name="${field.key}" ${requiredAttr}>
          <option value="">请选择</option>
          ${options}
        </select>
      </div>`;

    case 'duration':
    case 'time':
      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <input type="number" class="form-input" name="${field.key}" value="${val}" ${stepAttr} placeholder="${field.unit || '秒'}" ${requiredAttr}>
      </div>`;

    default:
      return `<div class="form-group">
        <label class="form-label">${field.label}</label>
        <input type="text" class="form-input" name="${field.key}" value="${val}" placeholder="${placeholder}" ${requiredAttr}>
      </div>`;
  }
};

// ---------- 页面渲染 ----------
let _searchQuery = '';
let _selectedTagIds = [];

Exercises.renderPage = function() {
  const container = document.getElementById('exercises-content');
  if (!container) return;

  Tags.load();
  this.load();

  let html = '';

  // 搜索
  html += UI.searchBar('搜索动作名称、分类…', _searchQuery);

  // 标签筛选
  html += '<div class="tag-filter-strip" id="exercise-tag-filter">';
  Tags.getAll().forEach(t => {
    const active = _selectedTagIds.includes(t.id) ? 'active' : '';
    html += `<span class="tag-filter-item ${active}" data-tag-id="${t.id}" style="border-color:${t.color};${active ? 'background:'+t.color+';color:#fff' : 'color:'+t.color}">${Esc.html(t.name)}</span>`;
  });
  html += '</div>';

  // 动作列表
  let filtered = this.getAll();
  if (_searchQuery) filtered = this.search(_searchQuery);
  if (_selectedTagIds.length) filtered = this.filterByTags(_selectedTagIds);

  if (filtered.length === 0) {
    html += UI.emptyState('🏗️', this.getAll().length === 0 ? '还没有动作，点击下方按钮添加第一个' : '没有匹配的动作', '<button class="btn btn-primary btn-sm" onclick="Exercises.showAddForm()">+ 添加动作</button>');
  } else {
    html += filtered.map(ex => this._renderCard(ex)).join('\n');
  }

  // 浮动添加按钮
  html += '<div style="position:sticky;bottom:16px;text-align:right;margin-top:16px">';
  html += '<button class="btn btn-primary btn-lg" onclick="Exercises.showAddForm()" style="border-radius:50%;width:56px;height:56px;font-size:1.5rem;box-shadow:var(--shadow-lg)">+</button>';
  html += '</div>';

  container.innerHTML = html;

  // 绑定标签筛选
  container.querySelectorAll('#exercise-tag-filter .tag-filter-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.tagId;
      const idx = _selectedTagIds.indexOf(id);
      if (idx >= 0) _selectedTagIds.splice(idx, 1);
      else _selectedTagIds.push(id);
      this.renderPage();
    });
  });

  // 绑定搜索
  container.querySelector('.search-input')?.addEventListener('input', (e) => {
    _searchQuery = e.target.value;
    this.renderPage();
  });
};

Exercises._renderCard = function(ex) {
  const tagsHtml = Tags.renderBadgesForExercise(ex);
  const fieldSummary = (ex.fields || []).map(f => `${f.label}(${f.type})`).join(', ');
  return `<div class="card" onclick="Exercises.showEditForm('${ex.id}')" style="cursor:pointer">
    <div class="card-header">
      <span class="card-title">${Esc.html(ex.name)}</span>
      <div>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Exercises.remove('${ex.id}');Exercises.renderPage();App.showToast('已删除','info')">🗑️</button>
      </div>
    </div>
    ${ex.category ? `<div class="card-subtitle">分类: ${Esc.html(ex.category)}</div>` : ''}
    <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${tagsHtml}</div>
    ${fieldSummary ? `<div style="margin-top:6px;font-size:0.75rem;color:var(--text-secondary)">字段: ${Esc.html(fieldSummary)}</div>` : ''}
    ${ex.note ? `<div style="margin-top:4px;font-size:0.75rem;color:var(--text-secondary)">💬 ${Esc.html(ex.note)}</div>` : ''}
  </div>`;
};

// ---------- 添加/编辑表单 ----------
Exercises.showAddForm = function() {
  this._showForm(null);
};

Exercises.showEditForm = function(id) {
  const ex = this.getById(id);
  if (ex) this._showForm(ex);
};

Exercises._showForm = function(existing) {
  const isEdit = !!existing;
  // 新建动作时默认添加重量和次数两个字段
  const defaultFields = [
    { key: 'weight', label: '重量 (kg)', type: 'number', unit: 'kg', step: 0.5, required: true, default: null, options: [], dependsOn: null },
    { key: 'reps', label: '次数', type: 'number', unit: '次', step: 1, required: true, default: null, options: [], dependsOn: null }
  ];
  const ex = existing || { id: '', name: '', category: '', tags: [], note: '', defaultRest: 90, fields: JSON.parse(JSON.stringify(defaultFields)) };
  Tags.load();

  let html = `<h2>${isEdit ? '编辑动作' : '新建动作'}</h2>
    <form id="exercise-form" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">名称 *</label>
        <input type="text" class="form-input" name="name" value="${Esc.html(ex.name)}" placeholder="例如：杠铃卧推" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">分类</label>
          <input type="text" class="form-input" name="category" value="${Esc.html(ex.category || '')}" placeholder="例如：胸部" list="category-list">
          <datalist id="category-list">
            <option value="胸">
            <option value="肩">
            <option value="背">
            <option value="腿">
            <option value="手臂">
            <option value="腹部">
            <option value="有氧">
            <option value="全身">
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">默认休息 (秒)</label>
          <input type="number" class="form-input" name="defaultRest" value="${ex.defaultRest || 90}" step="5">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">标签</label>
        <div class="chip-group">`;

  Tags.getAll().forEach(t => {
    const selected = ex.tags.includes(t.id) ? 'selected' : '';
    html += `<span class="chip ${selected}" data-tag-id="${t.id}" style="border-color:${t.color}">${Esc.html(t.name)}</span>`;
  });

  html += `</div></div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" name="note" placeholder="备注说明…">${Esc.html(ex.note || '')}</textarea>
      </div>
      <div class="form-section">
        <div class="form-section-title">自定义字段</div>
        <div id="field-list">`;

  (ex.fields || []).forEach((f, i) => {
    html += this._renderFieldEditorRow(f, i);
  });

  html += `</div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="Exercises._addFieldRow()" style="margin-top:8px">+ 添加字段</button>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Exercises._saveForm('${ex.id || ''}')">${isEdit ? '保存' : '创建'}</button>
      </div>
    </form>`;

  App.showModal(html);

  // 绑定标签点击
  document.querySelectorAll('#exercise-form .chip').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
    });
  });
};

Exercises._renderFieldEditorRow = function(field) {
  const typeOptions = ['number','text','boolean','select','time','duration'].map(t =>
    `<option value="${t}" ${field.type === t ? 'selected' : ''}>${t}</option>`
  ).join('');
  return `<div class="field-row" style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
    <input type="text" class="form-input field-key" style="width:80px;flex:1;min-width:60px" value="${Esc.html(field.key)}" placeholder="标识">
    <input type="text" class="form-input field-label" style="width:80px;flex:1;min-width:60px" value="${Esc.html(field.label)}" placeholder="显示名">
    <select class="form-select field-type" style="width:90px">${typeOptions}</select>
    <input type="text" class="form-input field-unit" style="width:50px" value="${Esc.html(field.unit || '')}" placeholder="单位">
    <input type="number" class="form-input field-step" style="width:60px" value="${field.step || 0.5}" step="0.1" placeholder="步进">
    <label class="form-checkbox" style="white-space:nowrap">
      <input type="checkbox" class="field-required" ${field.required ? 'checked' : ''}> 必填
    </label>
    <button type="button" class="btn btn-ghost btn-sm" onclick="Exercises._removeFieldRow(this)" style="color:var(--danger)">✕</button>
  </div>`;
};

Exercises._addFieldRow = function() {
  const list = document.getElementById('field-list');
  if (!list) return;
  const dummy = { key: '', label: '', type: 'number', unit: 'kg', step: 0.5, required: false };
  list.insertAdjacentHTML('beforeend', this._renderFieldEditorRow(dummy));
};

Exercises._removeFieldRow = function(btn) {
  const row = btn.closest('.field-row');
  if (row) row.remove();
};

Exercises._saveForm = function(existingId) {
  const form = document.getElementById('exercise-form');
  if (!form) return;

  // 收集字段（使用 DOM 相对查询，不再依赖索引）
  const fields = [];
  const fieldRows = form.querySelectorAll('.field-row');
  fieldRows.forEach(row => {
    const key = row.querySelector('.field-key')?.value?.trim();
    if (!key) return;
    fields.push({
      key,
      label: row.querySelector('.field-label')?.value?.trim() || key,
      type: row.querySelector('.field-type')?.value || 'number',
      unit: row.querySelector('.field-unit')?.value?.trim() || '',
      step: parseFloat(row.querySelector('.field-step')?.value) || 0.5,
      required: row.querySelector('.field-required')?.checked || false,
      default: null,
      options: [],
      dependsOn: null
    });
  });

  // 收集标签
  const tags = [];
  form.querySelectorAll('.chip.selected').forEach(el => {
    tags.push(el.dataset.tagId);
  });

  const nameInput = form.querySelector('[name="name"]');
  if (!nameInput || !nameInput.value.trim()) {
    App.showToast('请输入动作名称', 'warning');
    nameInput?.focus();
    return;
  }

  const data = {
    name: nameInput.value.trim(),
    category: form.querySelector('[name="category"]')?.value?.trim() || '',
    tags,
    note: form.querySelector('[name="note"]')?.value?.trim() || '',
    defaultRest: parseInt(form.querySelector('[name="defaultRest"]')?.value) || 90,
    fields
  };

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
  window.Exercises = Exercises;
}

/**
 * ui.js — 渲染函数、空状态、提示生成
 */
const UI = {};

// ---------- 空状态 ----------
UI.emptyState = function(icon, text, actionHtml = '') {
  return `<div class="empty-state">
    <div class="empty-icon">${icon}</div>
    <div class="empty-text">${Esc.html(text)}</div>
    ${actionHtml ? `<div class="empty-action">${actionHtml}</div>` : ''}
  </div>`;
};

// ---------- 卡片列表 ----------
UI.cardList = function(items, renderCard) {
  if (!items || items.length === 0) return '';
  return items.map(item => `<div class="card">${renderCard(item)}</div>`).join('\n');
};

// ---------- 确认对话框 ----------
UI.confirmModal = function(title, message, confirmText = '确认', cancelText = '取消', danger = false) {
  return `<h2>${Esc.html(title)}</h2>
    <p style="margin-bottom:16px;color:var(--text-secondary)">${Esc.html(message)}</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="App.closeModal()">${Esc.html(cancelText)}</button>
      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${Esc.html(confirmText)}</button>
    </div>`;
};

// ---------- Toast 辅助 ----------
UI.toast = function(msg, type = 'info') {
  App.showToast(msg, type);
};

// ---------- 搜索框 ----------
UI.searchBar = function(placeholder, value = '') {
  return `<div class="search-bar">
    <input type="text" class="search-input" value="${Esc.html(value)}" placeholder="${Esc.html(placeholder)}" oninput="App.emit('search', this.value)">
  </div>`;
};

// ---------- 标签筛选条 ----------
UI.tagFilterStrip = function(selectedTagIds = [], tagList) {
  const tags = tagList || Tags.getAll();
  const items = tags.map(t => {
    const active = selectedTagIds.includes(t.id) ? 'active' : '';
    return `<span class="tag-filter-item ${active}" data-tag-id="${t.id}" onclick="UI.toggleTagFilter('${t.id}')" style="border-color:${t.color};color:${active ? '#fff' : t.color};${active ? 'background:' + t.color : ''}">${Esc.html(t.name)}</span>`;
  }).join('');
  return `<div class="tag-filter-strip">${items || ''}</div>`;
};

UI.toggleTagFilter = function(tagId) {
  App.emit('tagFilterToggle', tagId);
};

// ---------- 值格式化 ----------
UI.formatDuration = function(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
};

UI.formatDate = function(isoStr) {
  const d = new Date(isoStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

UI.formatShortDate = function(isoStr) {
  const d = new Date(isoStr);
  return `${d.getMonth()+1}/${d.getDate()}`;
};

UI.renderSetData = function(setData, fields) {
  return (fields || []).map(f => {
    const val = setData[f.key];
    if (val == null) return '';
    const unit = f.unit || '';
    return `${f.label}: ${val}${unit}`;
  }).filter(Boolean).join(' · ');
};

// ====== 通用表单构建器 ======
UI.formGroup = function(label, inputHtml, helpText = '') {
  return `<div class="form-group">
    <label class="form-label">${Esc.html(label)}</label>
    ${inputHtml}
    ${helpText ? `<small style="color:var(--text-secondary);font-size:0.75rem">${Esc.html(helpText)}</small>` : ''}
  </div>`;
};

UI.formInput = function(name, value, placeholder, type = 'text', opts = {}) {
  return `<input type="${type}" class="form-input" name="${name}" value="${Esc.html(value ?? '')}" placeholder="${Esc.html(placeholder || '')}" ${opts.required ? 'required' : ''} ${opts.step ? 'step="'+opts.step+'"' : ''}>`;
};

UI.formSelect = function(name, value, options, placeholder) {
  const opts = (options || []).map(o => {
    const sel = String(o) === String(value) ? 'selected' : '';
    return `<option value="${Esc.html(o)}" ${sel}>${Esc.html(o)}</option>`;
  }).join('');
  return `<select class="form-select" name="${name}"><option value="">${Esc.html(placeholder || '请选择')}</option>${opts}</select>`;
};

UI.formTextarea = function(name, value, placeholder) {
  return `<textarea class="form-textarea" name="${name}" placeholder="${Esc.html(placeholder || '')}">${Esc.html(value ?? '')}</textarea>`;
};

// ====== 简单转义 ======
const Esc = {
  html: function(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }
};

if (typeof window !== 'undefined') {
  window.UI = UI;
  window.Esc = Esc;
}

/**
 * ui.js — 渲染辅助函数 + HTML 转义
 */
const UI = {};

UI.emptyState = function(icon, text, actionHtml = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-text">${Esc.html(text)}</div>${actionHtml ? `<div class="empty-action">${actionHtml}</div>` : ''}</div>`;
};

UI.confirmModal = function(title, message, confirmText = '确认', cancelText = '取消', danger = false) {
  return `<h2>${Esc.html(title)}</h2><p style="margin-bottom:16px;color:var(--text-secondary)">${Esc.html(message)}</p><div class="modal-actions"><button class="btn btn-secondary" onclick="App.closeModal()">${Esc.html(cancelText)}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm-btn">${Esc.html(confirmText)}</button></div>`;
};

UI.searchBar = function(placeholder, value = '') {
  return `<div class="search-bar"><input type="text" class="search-input" value="${Esc.html(value)}" placeholder="${Esc.html(placeholder)}"></div>`;
};

UI.formatDuration = function(s) {
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
};

UI.formatDate = function(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

UI.formatShortDate = function(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()}`;
};

UI.renderSetData = function(set, fields) {
  return (fields || []).map(f => {
    const val = set[f.key];
    return val != null ? `${f.label}: ${val}` : '';
  }).filter(Boolean).join(' · ') || '—';
};

const Esc = {
  html: function(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }
};

if (typeof window !== 'undefined') { window.UI = UI; window.Esc = Esc; }

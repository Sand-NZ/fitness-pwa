/**
 * tags.js — 标签管理（含层级、颜色、渐变）
 * 依赖：models.js, storage.js
 */
const Tags = {
  data: [],
  _loaded: false
};

// ---------- 加载/保存 ----------
Tags.load = function() {
  this.data = STORAGE.get(STORAGE.keys.tags) || [];
  this._loaded = true;
  return this.data;
};

Tags.save = function() {
  STORAGE.set(STORAGE.keys.tags, this.data);
  App.emit('tagsChanged', this.data);
};

Tags.getAll = function() {
  if (!this._loaded) this.load();
  return this.data;
};

// ---------- CRUD ----------
Tags.add = function(tag) {
  this.getAll();
  const errors = validateTag(tag);
  if (errors.length) { console.warn('标签验证失败:', errors); return null; }
  this.data.push(tag);
  this.save();
  return tag;
};

Tags.update = function(id, updates) {
  this.getAll();
  const idx = this.data.findIndex(t => t.id === id);
  if (idx === -1) return null;
  Object.assign(this.data[idx], updates);
  this.save();
  return this.data[idx];
};

Tags.remove = function(id) {
  this.getAll();
  // 也删除子标签
  const toRemove = [id, ...this.getChildrenIds(id)];
  this.data = this.data.filter(t => !toRemove.includes(t.id));
  this.save();
  // 从动作中移除引用
  const exercises = Exercises.getAll();
  let changed = false;
  exercises.forEach(ex => {
    const before = ex.tags.length;
    ex.tags = ex.tags.filter(tid => !toRemove.includes(tid));
    if (ex.tags.length !== before) changed = true;
  });
  if (changed) STORAGE.set(STORAGE.keys.exercises, exercises);
  return true;
};

// ---------- 层级 ----------
Tags.getChildren = function(parentId) {
  return this.data.filter(t => t.parentId === parentId);
};

Tags.getChildrenIds = function(parentId, includeSelf = false) {
  const ids = [];
  const children = this.getChildren(parentId);
  for (const child of children) {
    ids.push(child.id);
    ids.push(...this.getChildrenIds(child.id));
  }
  if (includeSelf) ids.unshift(parentId);
  return ids;
};

Tags.getTree = function() {
  const roots = this.data.filter(t => !t.parentId);
  return roots.map(r => this._buildSubTree(r));
};

Tags._buildSubTree = function(tag) {
  const children = this.getChildren(tag.id);
  return {
    ...tag,
    children: children.map(c => this._buildSubTree(c))
  };
};

Tags.getFlatWithDepth = function() {
  const result = [];
  const walk = (tags, depth = 0) => {
    tags.forEach(t => {
      result.push({ ...t, depth });
      walk(this.getChildren(t.id), depth + 1);
    });
  };
  walk(this.data.filter(t => !t.parentId));
  return result;
};

// ---------- 渲染辅助 ----------
Tags.renderBadge = function(tag, small = false) {
  const gradient = tag.gradient ? `background: ${tag.gradient};` : `background: ${tag.color};`;
  return `<span class="tag-badge ${small ? 'tag-badge-sm' : ''}" style="${gradient}">${this.esc(tag.name)}</span>`;
};

Tags.renderBadgesForExercise = function(exercise, max = 3) {
  const tags = exercise.tags || [];
  const tagObjects = tags.map(id => this.data.find(t => t.id === id)).filter(Boolean);
  const shown = tagObjects.slice(0, max);
  const extra = tagObjects.length - max;
  let html = shown.map(t => this.renderBadge(t, true)).join(' ');
  if (extra > 0) html += `<span class="tag-badge tag-badge-sm" style="background:var(--text-secondary)">+${extra}</span>`;
  return html;
};

Tags.esc = function(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

if (typeof window !== 'undefined') {
  window.Tags = Tags;
}

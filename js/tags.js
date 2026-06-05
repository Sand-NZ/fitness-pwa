/**
 * tags.js — 标签管理（精简版）
 */
const Tags = { data: [], _loaded: false };

Tags.load = function() {
  this.data = STORAGE.get(STORAGE.keys.tags) || [];
  this._loaded = true;
  return this.data;
};

Tags.save = function() { STORAGE.set(STORAGE.keys.tags, this.data); App.emit('tagsChanged', this.data); };

Tags.getAll = function() { if (!this._loaded) this.load(); return this.data; };

Tags.add = function(tag) {
  this.getAll();
  if (!tag.id || !tag.name) return null;
  this.data.push(tag); this.save(); return tag;
};

Tags.update = function(id, updates) {
  this.getAll();
  const idx = this.data.findIndex(t => t.id === id);
  if (idx === -1) return null;
  Object.assign(this.data[idx], updates); this.save(); return this.data[idx];
};

Tags.remove = function(id) {
  this.getAll();
  const children = this.data.filter(t => t.parentId === id);
  const allIds = [id, ...children.map(c => c.id)];
  this.data = this.data.filter(t => !allIds.includes(t.id));
  this.save();
  // 从动作中移除引用
  const exercises = Exercises.getAll();
  exercises.forEach(ex => { ex.tags = ex.tags.filter(tid => !allIds.includes(tid)); });
  STORAGE.set(STORAGE.keys.exercises, exercises);
  return true;
};

// 带深度的扁平列表（设置页用）
Tags.getFlatWithDepth = function() {
  const result = [];
  const walk = (parentId, depth) => {
    this.data.filter(t => t.parentId === parentId).forEach(t => {
      result.push({ ...t, depth });
      walk(t.id, depth + 1);
    });
  };
  walk(null, 0);
  return result;
};

if (typeof window !== 'undefined') { window.Tags = Tags; }

/**
 * models.js — 数据模型定义与验证
 * 包含：tags, exercises, plans, records, settings
 */

const MODELS = {
  version: 1
};

// ---------- 默认值 ----------

function defaultSettings() {
  return {
    activePlanId: null,
    lastActiveTab: 'training',
    lastMode: 'free',
    autoDefaultWeight: null,
    webdavUrl: null,
    webdavUsername: null,
    webdavPassword: null
  };
}

// ---------- 验证函数 ----------

function validateTag(tag) {
  const errors = [];
  if (!tag.id || typeof tag.id !== 'string') errors.push('tag.id 必填');
  if (!tag.name || typeof tag.name !== 'string') errors.push('tag.name 必填');
  if (tag.color && !/^#[0-9a-fA-F]{6}$/.test(tag.color)) errors.push('tag.color 格式无效');
  return errors;
}

function validateField(field) {
  const errors = [];
  if (!field.key) errors.push('field.key 必填');
  if (!field.label) errors.push('field.label 必填');
  if (!['number','text','boolean','select','time','duration'].includes(field.type)) {
    errors.push(`field.type 无效: ${field.type}`);
  }
  return errors;
}

function validateExercise(ex) {
  const errors = [];
  if (!ex.id) errors.push('exercise.id 必填');
  if (!ex.name) errors.push('exercise.name 必填');
  if (!Array.isArray(ex.fields)) errors.push('exercise.fields 必须是数组');
  if (ex.fields) {
    ex.fields.forEach((f, i) => {
      validateField(f).forEach(e => errors.push(`fields[${i}]: ${e}`));
    });
  }
  return errors;
}

function validateRecord(rec) {
  const errors = [];
  if (!rec.id) errors.push('record.id 必填');
  if (rec.weight == null) errors.push('record.weight 必填');
  if (rec.rpe == null || rec.rpe < 1 || rec.rpe > 10) errors.push('record.rpe 必须在 1-10');
  return errors;
}

// ---------- 创建新对象 ----------

function newTag(name, color = '#4a90d9', parentId = null) {
  return { id: generateId(), name, color, parentId, gradient: null };
}

function newField(key, label, type = 'number', opts = {}) {
  return {
    key,
    label,
    type,
    required: opts.required || false,
    default: opts.default ?? null,
    unit: opts.unit || '',
    step: opts.step || (type === 'number' ? 0.5 : 1),
    options: opts.options || [],
    dependsOn: opts.dependsOn || null
  };
}

function newExercise(name, fields = [], opts = {}) {
  return {
    id: generateId(),
    name,
    category: opts.category || '',
    tags: opts.tags || [],
    note: opts.note || '',
    defaultRest: opts.defaultRest || 90,
    fields
  };
}

function newPlan(name, exercises = []) {
  return {
    id: generateId(),
    name,
    exercises: exercises.map(e => ({
      exerciseId: e.exerciseId,
      overrideFields: e.overrideFields || []
    }))
  };
}

function newRecord(opts = {}) {
  return {
    id: generateId(),
    planName: opts.planName || '自由训练',
    date: opts.date || new Date().toISOString(),
    totalDuration: opts.totalDuration || 0,
    weight: opts.weight ?? 0,
    rpe: opts.rpe ?? 5,
    note: opts.note || '',
    exercisesCompleted: opts.exercisesCompleted || []
  };
}

// 简易 UUID
let _idCounter = Date.now();
function generateId() {
  return 'id_' + (_idCounter++) + '_' + Math.random().toString(36).slice(2, 8);
}

// ---------- 导出 ----------
if (typeof window !== 'undefined') {
  window.defaultSettings = defaultSettings;
  window.validateTag = validateTag;
  window.validateField = validateField;
  window.validateExercise = validateExercise;
  window.validateRecord = validateRecord;
  window.newTag = newTag;
  window.newField = newField;
  window.newExercise = newExercise;
  window.newPlan = newPlan;
  window.newRecord = newRecord;
  window.generateId = generateId;
}

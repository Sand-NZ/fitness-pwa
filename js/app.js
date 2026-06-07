/**
 * app.js — 路由、事件总线、初始化 + 预置种子数据
 */
const App = {
  currentPage: 'training',
  pages: ['training', 'exercises', 'stats', 'settings'],
  listeners: {},
  _initialized: false
};

// ---------- 事件总线 ----------
App.on = function(event, fn) {
  if (!this.listeners[event]) this.listeners[event] = [];
  this.listeners[event].push(fn);
  return () => {
    this.listeners[event] = this.listeners[event].filter(f => f !== fn);
  };
};

App.emit = function(event, data) {
  (this.listeners[event] || []).forEach(fn => {
    try { fn(data); } catch (e) { console.warn('事件错误:', event, e); }
  });
};

// ---------- 路由 ----------
App.navigate = function(page) {
  if (!this.pages.includes(page)) return;
  this.currentPage = page;

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  settings.lastActiveTab = page;
  STORAGE.set(STORAGE.keys.settings, settings);

  this.emit('pageChange', page);
};

App.initRouter = function() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      this.navigate(el.dataset.page);
    });
  });
};

// ---------- toast ----------
App.showToast = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.remove();
  }, duration);
};

// ---------- 模态框 ----------
App.showModal = function(html) {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (!overlay || !container) return;
  overlay.classList.remove('hidden');
  container.classList.remove('hidden');
  container.innerHTML = '<div class="modal">' + html + '</div>';
  overlay.onclick = () => this.closeModal();
  return container;
};

App.closeModal = function() {
  const overlay = document.getElementById('modal-overlay');
  const container = document.getElementById('modal-container');
  if (overlay) overlay.classList.add('hidden');
  if (container) { container.classList.add('hidden'); container.innerHTML = ''; }
};

// ============== 预置种子数据 ==============
// 字段模板索引: 0=仅次数, 1=重量+次数, 2=仅时长, 3=时长+次数, 4=重量+次数(必填)
const F = [
  [['reps','次数','number',{unit:'次',step:1}]],
  [['weight','重量 (kg)','number',{unit:'kg',step:.5}],['reps','次数','number',{unit:'次',step:1}]],
  [['dur','时长 (秒)','number',{unit:'秒',step:5}]],
  [['dur','时长 (秒)','number',{unit:'秒',step:5}],['reps','次数','number',{unit:'次',step:1}]],
  [['weight','重量 (kg)','number',{unit:'kg',step:.5,required:true}],['reps','次数','number',{unit:'次',step:1,required:true}]]
];
// [name, category, rest, note, fieldIdx]
const SE = [
  // 热身 (7)
  ['猫牛式','热身',30,'脊柱灵活性',0],['单杠拉背','热身',30,'肩胛激活',0],
  ['蜘蛛趴','热身',30,'髋关节灵活性',0],['弹力带训练','热身',30,'大臂外展+推肩',0],
  ['呼吸训练','热身',15,'腹式/剑突/单腿/折刀/后纵隔/侧纵隔',3],
  ['伟大者拉伸','热身',15,'胸椎+髋屈肌',0],['俯身臂屈伸','热身',30,'',1],
  // 胸 (6)
  ['杠铃卧推','胸',120,'主项',4],['哑铃卧推','胸',90,'主项',4],
  ['双杠臂屈伸（助力）','胸',90,'辅助',4],['上斜哑铃卧推','胸',90,'辅助',4],
  ['蝴蝶机夹胸','胸',60,'可选',4],['器械直臂下压','胸',60,'可选',4],
  // 肩 (4)
  ['反向飞鸟','肩',60,'体态（铁律首位）',4],['俯身哑铃后束飞鸟','肩',60,'可选',4],
  ['面拉','肩',60,'体态（铁律首位）',4],['哑铃推肩','肩',90,'',4],
  // 背 (6)
  ['助力引体向上','背',120,'主项',4],['高位下拉','背',90,'辅助',4],
  ['T杆划船','背',90,'辅助',4],['钢索划船','背',90,'辅助',4],
  ['单臂哑铃划船','背',90,'辅助',4],['静态悬挂','背',30,'握力训练',2],
  // 腿 (5)
  ['保加利亚蹲','腿',120,'主项',4],['罗马尼亚硬拉','腿',120,'辅助',4],
  ['后腿弓步蹲','腿',90,'辅助',4],['山羊挺身','腿',60,'辅助',1],
  ['哥本哈根支撑','腿',60,'辅助',2],
  // 腹部/核心 (4)
  ['平板支撑','腹部/核心',45,'',2],['锯式俯卧撑','腹部/核心',60,'',0],
  ['卷腹','腹部/核心',45,'',1],['仰卧抬腿','腹部/核心',45,'',0]
];

function seedDefaultData() {
  const SEED_VER = 7;
  const seeded = parseInt(localStorage.getItem('fitness_seed_version') || '0', 10);
  if (seeded >= SEED_VER) return;

  localStorage.removeItem('fitness_pending_training');

  // v4: 清理旧记录中的 rpe 字段
  const allRecords = STORAGE.get(STORAGE.keys.records) || [];
  let recordsChanged = false;
  allRecords.forEach(r => {
    if (r.rpe !== undefined || r.avgRpe !== undefined) {
      delete r.rpe; delete r.avgRpe;
      recordsChanged = true;
    }
  });
  if (recordsChanged) STORAGE.set(STORAGE.keys.records, allRecords);

  // v5: 将分类 '核心' 重命名为 '腹部/核心'
  const allExercises = STORAGE.get(STORAGE.keys.exercises) || [];
  let exChanged = false;
  allExercises.forEach(e => {
    if (e.category === '核心') { e.category = '腹部/核心'; exChanged = true; }
  });
  if (exChanged) STORAGE.set(STORAGE.keys.exercises, allExercises);

  // v7: 彻底清除推/拉分类 + 腹部→腹部/核心
  const allExercisesV7 = STORAGE.get(STORAGE.keys.exercises) || [];
  let exChangedV7 = false;
  const exCatMapV7 = {
    '杠铃卧推':'胸','哑铃卧推':'胸','双杠臂屈伸（助力）':'胸','上斜哑铃卧推':'胸','蝴蝶机夹胸':'胸','器械直臂下压':'胸',
    '反向飞鸟':'肩','俯身哑铃后束飞鸟':'肩','面拉':'肩','哑铃推肩':'肩',
    '助力引体向上':'背','高位下拉':'背','T杆划船':'背','钢索划船':'背','单臂哑铃划船':'背','静态悬挂':'背'
  };
  allExercisesV7.forEach(e => {
    if (e.category === '推' || e.category === '拉' || exCatMapV7[e.name]) {
      const newCat = exCatMapV7[e.name];
      if (newCat && e.category !== newCat) { e.category = newCat; exChangedV7 = true; }
    }
    if (e.category === '腹部' || e.category === '腹部 ') { e.category = '腹部/核心'; exChangedV7 = true; }
  });
  if (exChangedV7) STORAGE.set(STORAGE.keys.exercises, allExercisesV7);

  // 构造动作: SE = [name, category, rest, note, fieldIdx], F[fieldIdx] = fields
  const exMap = {};
  const newExercises = SE.map(e => {
    const fields = F[e[4]].map(f => newField(f[0], f[1], f[2], f[3]));
    const ex = newExercise(e[0], fields, { category:e[1], defaultRest:e[2], note:e[3], tags:[] });
    exMap[e[0]] = ex.id;
    return ex;
  });

  // 种子升级：替换旧种子，保留用户自建
  const seedNames = new Set(SE.map(e => e[0]));
  const existing = STORAGE.get(STORAGE.keys.exercises) || [];

  const oldToNewId = {};
  existing.filter(e => seedNames.has(e.name)).forEach(old => {
    if (exMap[old.name]) oldToNewId[old.id] = exMap[old.name];
  });

  const userExercises = existing.filter(e => !seedNames.has(e.name)).map(sanitizeFields);
  const merged = [...userExercises, ...newExercises];
  STORAGE.set(STORAGE.keys.exercises, merged);

  // 计划：重映射旧引用（保留已有计划）
  const existingPlans = STORAGE.get(STORAGE.keys.plans) || [];
  let plansChanged = false;
  existingPlans.forEach(p => {
    (p.exercises || []).forEach(pe => {
      if (oldToNewId[pe.exerciseId]) { pe.exerciseId = oldToNewId[pe.exerciseId]; plansChanged = true; }
    });
  });
  if (plansChanged) STORAGE.set(STORAGE.keys.plans, existingPlans);

  localStorage.setItem('fitness_seed_version', String(SEED_VER));
  localStorage.setItem('fitness_onboarding_complete', 'true');
  console.log('✅ 预置数据已合并 (v' + SEED_VER + ')');
}

// 修复旧数据：如果字段存成了数组 [key,label,type,opts] 则转成对象 {key,label,type,...}
function sanitizeFields(ex) {
  if (!ex || !Array.isArray(ex.fields)) return ex;
  ex.fields = ex.fields.map(f => {
    if (Array.isArray(f)) {
      const opts = f[3] || {};
      return {
        key: f[0] || '',
        label: f[1] || '',
        type: f[2] || 'number',
        unit: opts.unit || '',
        step: opts.step || 0.5,
        required: opts.required || false,
        default: opts.default ?? null,
        options: opts.options || [],
        dependsOn: opts.dependsOn || null
      };
    }
    // 已经是对象的，确保所有必要字段存在
    if (typeof f === 'object' && f !== null) {
      if (f.step == null) f.step = 0.5; // BUG 12: 用 == null 避免把 0 覆盖
      if (!f.required) f.required = false;
      if (!f.options) f.options = [];
      if (!f.unit) f.unit = '';
      if (f.default === undefined) f.default = null;
      if (!f.dependsOn) f.dependsOn = null;
    }
    return f;
  });
  return ex;
}

// 全局暴露，供其他模块（如 training.js）使用
window.sanitizeFields = sanitizeFields;

// ---------- 初始化 ----------
App.init = function() {
  if (this._initialized) return;
  this._initialized = true;

  // 确保 settings 存在
  if (!STORAGE.get(STORAGE.keys.settings)) {
    STORAGE.set(STORAGE.keys.settings, defaultSettings());
  }

  // 填充预置数据（内联，不依赖外部文件）
  seedDefaultData();

  // 确保空数组
  ['tags','exercises','plans','records'].forEach(k => {
    if (!STORAGE.get(STORAGE.keys[k])) STORAGE.set(STORAGE.keys[k], []);
  });

  // 固定浅色主题
  document.documentElement.setAttribute('data-theme', 'light');
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.content = '#f5f5f7';
  if (window.Training) Training.init();
  this.initRouter();

  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  this.navigate(settings.lastActiveTab || 'training');

  this.on('pageChange', (page) => {
    switch (page) {
      case 'exercises': if (window.Exercises) Exercises.renderPage(); break;
      case 'stats':     if (window.Stats) Stats.renderPage(); break;
      case 'settings':  if (window.Settings) Settings.renderPage(); break;
      case 'training':  if (window.Training) Training.renderPage(); break;
    }
  });

  this.emit('pageChange', this.currentPage);

  // Service Worker + 更新通知
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            App.showToast('🔄 新版本已就绪，请刷新页面', 'info', 6000);
          }
        });
      });
    }).catch(e => console.warn('SW 注册失败:', e));
  }

  console.log('✅ Fitness PWA 已初始化');
};

document.addEventListener('DOMContentLoaded', () => App.init());

if (typeof window !== 'undefined') { window.App = App; }

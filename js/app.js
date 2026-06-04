/**
 * app.js — 路由、事件总线、初始化 + 预置种子数据
 */
const App = {
  currentPage: 'training',
  pages: ['training', 'plans', 'exercises', 'stats', 'settings'],
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
const SEED_EXERCISES = [
  // 热身 (7)
  { name:'猫牛式', category:'热身', defaultRest:30, note:'脊柱灵活性', fields:[['reps','次数','number',{unit:'次',step:1}]] },
  { name:'单杠拉背', category:'热身', defaultRest:30, note:'肩胛激活', fields:[['reps','次数','number',{unit:'次',step:1}]] },
  { name:'蜘蛛趴', category:'热身', defaultRest:30, note:'髋关节灵活性', fields:[['reps','次数','number',{unit:'次',step:1}]] },
  { name:'弹力带训练', category:'热身', defaultRest:30, note:'大臂外展+推肩', fields:[['reps','次数','number',{unit:'次',step:1}]] },
  { name:'呼吸训练', category:'热身', defaultRest:15, note:'腹式/剑突/单腿/折刀/后纵隔/侧纵隔', fields:[['dur','时长 (秒)','number',{unit:'秒',step:5}],['reps','次数','number',{unit:'次',step:1}]] },
  { name:'伟大者拉伸', category:'热身', defaultRest:15, note:'胸椎+髋屈肌', fields:[['reps','次数','number',{unit:'次/侧',step:1}]] },
  { name:'俯身臂屈伸', category:'热身', defaultRest:30, note:'', fields:[['weight','重量 (kg)','number',{unit:'kg',step:.5}],['reps','次数','number',{unit:'次',step:1}]] },
  // 推 (8)
  { name:'杠铃卧推', category:'推', defaultRest:120, note:'主项', fields:1 },
  { name:'哑铃卧推', category:'推', defaultRest:90, note:'主项', fields:1 },
  { name:'双杠臂屈伸（助力）', category:'推', defaultRest:90, note:'辅助', fields:1 },
  { name:'上斜哑铃卧推', category:'推', defaultRest:90, note:'辅助', fields:1 },
  { name:'反向飞鸟', category:'推', defaultRest:60, note:'体态（铁律首位）', fields:1 },
  { name:'蝴蝶机夹胸', category:'推', defaultRest:60, note:'可选', fields:1 },
  { name:'器械直臂下压', category:'推', defaultRest:60, note:'可选', fields:1 },
  { name:'俯身哑铃后束飞鸟', category:'推', defaultRest:60, note:'可选', fields:1 },
  // 拉 (8)
  { name:'助力引体向上', category:'拉', defaultRest:120, note:'主项', fields:1 },
  { name:'高位下拉', category:'拉', defaultRest:90, note:'辅助', fields:1 },
  { name:'T杆划船', category:'拉', defaultRest:90, note:'辅助', fields:1 },
  { name:'钢索划船', category:'拉', defaultRest:90, note:'辅助', fields:1 },
  { name:'单臂哑铃划船', category:'拉', defaultRest:90, note:'辅助', fields:1 },
  { name:'面拉', category:'拉', defaultRest:60, note:'体态（铁律首位）', fields:1 },
  { name:'哑铃推肩', category:'拉', defaultRest:90, note:'记录在拉日', fields:1 },
  { name:'静态悬挂', category:'拉', defaultRest:30, note:'握力训练', fields:[['dur','时长 (秒)','number',{unit:'秒',step:5}]] },
  // 腿 (5)
  { name:'保加利亚蹲', category:'腿', defaultRest:120, note:'主项', fields:1 },
  { name:'罗马尼亚硬拉', category:'腿', defaultRest:120, note:'辅助', fields:1 },
  { name:'后腿弓步蹲', category:'腿', defaultRest:90, note:'辅助', fields:1 },
  { name:'山羊挺身', category:'腿', defaultRest:60, note:'辅助', fields:[['weight','重量 (kg)','number',{unit:'kg',step:.5}],['reps','次数','number',{unit:'次',step:1,required:true}]] },
  { name:'哥本哈根支撑', category:'腿', defaultRest:60, note:'辅助', fields:[['dur','时长 (秒)','number',{unit:'秒',step:5}]] },
  // 核心 (4)
  { name:'平板支撑', category:'核心', defaultRest:45, note:'', fields:[['dur','时长 (秒)','number',{unit:'秒',step:5}]] },
  { name:'锯式俯卧撑', category:'核心', defaultRest:60, note:'', fields:[['reps','次数','number',{unit:'次',step:1}]] },
  { name:'卷腹', category:'核心', defaultRest:45, note:'', fields:[['weight','负重 (kg)','number',{unit:'kg',step:.5}],['reps','次数','number',{unit:'次',step:1,required:true}]] },
  { name:'仰卧抬腿', category:'核心', defaultRest:45, note:'', fields:[['reps','次数','number',{unit:'次',step:1}]] }
];
// fields: 1 表示标准 [weight, reps]
const STD = [['weight','重量 (kg)','number',{unit:'kg',step:.5,required:true}],['reps','次数','number',{unit:'次',step:1,required:true}]];

const SEED_PLANS = [
  { name:'推日', ex:['杠铃卧推','哑铃卧推','双杠臂屈伸（助力）','上斜哑铃卧推','反向飞鸟','蝴蝶机夹胸','器械直臂下压','俯身哑铃后束飞鸟'] },
  { name:'拉日', ex:['助力引体向上','高位下拉','T杆划船','钢索划船','单臂哑铃划船','面拉','哑铃推肩','静态悬挂'] },
  { name:'腿日', ex:['保加利亚蹲','罗马尼亚硬拉','后腿弓步蹲','山羊挺身','哥本哈根支撑'] }
];

function seedDefaultData() {
  // 种子版本标记——不受 SW 缓存影响，即使旧版 app.js 也能检测缺失
  const SEED_VER = 1;
  const seeded = parseInt(localStorage.getItem('fitness_seed_version') || '0', 10);
  if (seeded >= SEED_VER) return;

  // 构造动作
  const exMap = {};
  const newExercises = SEED_EXERCISES.map(e => {
    const fields = e.fields === 1 ? STD : e.fields.map(f => newField(f[0], f[1], f[2], f[3]));
    const ex = newExercise(e.name, fields, { category:e.category, defaultRest:e.defaultRest, note:e.note, tags:[] });
    exMap[e.name] = ex.id;
    return ex;
  });

  // 合并已有动作（按名称去重，不覆盖自建）
  const existing = STORAGE.get(STORAGE.keys.exercises) || [];
  const existingNames = new Set(existing.map(e => e.name));
  const merged = [...existing];
  newExercises.forEach(e => {
    if (!existingNames.has(e.name)) merged.push(e);
  });
  if (merged.length !== existing.length) {
    STORAGE.set(STORAGE.keys.exercises, merged);
  }

  // 合并已有计划（按名称去重）
  const newPlans = SEED_PLANS.map(p =>
    newPlan(p.name, p.ex.map(n => ({ exerciseId: exMap[n] || generateId(), overrideFields:[] })))
  );
  const existingPlans = STORAGE.get(STORAGE.keys.plans) || [];
  const planNames = new Set(existingPlans.map(p => p.name));
  const mergedPlans = [...existingPlans];
  newPlans.forEach(p => {
    if (!planNames.has(p.name)) mergedPlans.push(p);
  });
  if (mergedPlans.length !== existingPlans.length) {
    STORAGE.set(STORAGE.keys.plans, mergedPlans);
  }

  localStorage.setItem('fitness_seed_version', String(SEED_VER));
  localStorage.setItem('fitness_onboarding_complete', 'true');
  console.log('✅ 预置数据已合并');
}

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

  if (window.Theme) Theme.init();
  if (window.Training) Training.init();
  this.initRouter();

  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  this.navigate(settings.lastActiveTab || 'training');

  if (window.Onboarding && Onboarding.shouldShow()) Onboarding.start();

  this.on('pageChange', (page) => {
    switch (page) {
      case 'exercises': if (window.Exercises) Exercises.renderPage(); break;
      case 'plans':     if (window.Plans) Plans.renderPage(); break;
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

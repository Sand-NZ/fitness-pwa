/**
 * training.js — 训练状态机（计划模式/自由模式）
 * 依赖：timer.js, exercises.js, plans.js, records.js, ui.js
 */
const Training = {
  mode: 'free',           // 'free' | 'plan'
  planId: null,
  currentExerciseIndex: 0,
  currentSet: 0,
  setData: [],            // 当前动作已完成的组 [{ fieldKey: value }]
  setsRemaining: 0,       // 计划模式的预设组数
  totalSets: 0,
  startedAt: null,
  isActive: false,
  currentExercise: null,   // 当前动作对象副本
  _currentExerciseId: null,
  // 自由模式缓存
  _freeExerciseName: '',
  _freeExerciseId: null
};

// ---------- 初始化 ----------
Training.init = function() {
  this.mode = 'free';
  this.isActive = false;
  this.currentExercise = null;
  this.setData = [];
  this.currentSet = 0;
  this._completedExercises = [];
  Timer.init({});

  // 绑定训练页顶部模式切换按钮
  this._wireToggleButtons();
};

Training._wireToggleButtons = function() {
  const toggleBtns = document.querySelectorAll('.training-mode-toggle .toggle-btn');
  toggleBtns.forEach(btn => {
    if (btn._listenerAttached) return;
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (this.isActive) {
        App.showToast('请先结束当前训练再切换模式', 'warning');
        return;
      }
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.mode = mode;
      App.emit('pageChange', 'training');
    });
    btn._listenerAttached = true;
  });
};

// ---------- 开始训练 ----------
Training.startFree = function() {
  this.mode = 'free';
  this.isActive = true;
  this.startedAt = new Date().toISOString();
  this.currentExercise = null;
  this.currentSet = 0;
  this.setData = [];
  Timer.reset();
  Timer.start();
  this.renderPage();
  App.showToast('自由训练已开始', 'success');
};

Training.startPlan = function(planId) {
  const plan = Plans.getById(planId);
  if (!plan || !plan.exercises.length) {
    App.showToast('该计划没有动作', 'warning');
    return;
  }
  this.mode = 'plan';
  this.planId = planId;
  this.isActive = true;
  this.startedAt = new Date().toISOString();
  this.currentExerciseIndex = 0;
  this._completedExercises = [];
  this._loadPlanExercise(0);
  Timer.reset();
  Timer.start();
  this.renderPage();
  App.showToast('计划训练已开始', 'success');
};

Training._loadPlanExercise = function(index) {
  // 保存当前动作的完成数据
  if (this.currentExercise && this.setData.length > 0) {
    if (!this._completedExercises) this._completedExercises = [];
    this._completedExercises.push({
      exerciseId: this.currentExercise.id,
      name: this.currentExercise.name,
      tags: this.currentExercise.tags || [],
      sets: this.setData.map(s => ({ ...s })),
      restDuration: this.currentExercise.defaultRest || 90
    });
  }

  const plan = Plans.getById(this.planId);
  if (!plan || !plan.exercises[index]) return;
  const planEx = plan.exercises[index];
  const ex = Exercises.getById(planEx.exerciseId);
  if (!ex) return;
  this.currentExerciseIndex = index;
  this.currentSet = 0;
  this.setData = [];

  // 应用覆盖字段
  this.currentExercise = JSON.parse(JSON.stringify(ex));
  if (planEx.overrideFields) {
    planEx.overrideFields.forEach(of => {
      const field = this.currentExercise.fields.find(f => f.key === of.key);
      if (field) field.default = of.value;
    });
  }

  this.currentSet = 0;
  this.setsRemaining = 3; // 默认3组
  this._applyWeightMemory(planEx.exerciseId);
  this.renderPage();
};

// ---------- 选择动作（自由模式） ----------
Training.selectExercise = function(exerciseId) {
  const ex = Exercises.getById(exerciseId);
  if (!ex) return;
  this.currentExercise = JSON.parse(JSON.stringify(ex));
  this._currentExerciseId = exerciseId;
  this.currentSet = 0;
  this.setData = [];
  // 重量记忆：查找最近一次该动作的重量记录
  this._applyWeightMemory(exerciseId);
  this.renderPage();
};

// 重量记忆：从最近的训练记录中查找该动作的上次重量
Training._applyWeightMemory = function(exerciseId) {
  const records = STORAGE.get(STORAGE.keys.records) || [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const ec = (r.exercisesCompleted || []).find(e => e.exerciseId === exerciseId);
    if (ec && ec.sets && ec.sets.length > 0) {
      const lastSet = ec.sets[ec.sets.length - 1];
      if (lastSet.weight != null) {
        this._lastWeight = lastSet.weight;
      }
      return;
    }
  }
  this._lastWeight = null;
};

Training.selectFreeExerciseByName = function(name) {
  // 允许自由输入名称创建临时动作
  this.currentExercise = newExercise(name, [
    newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5, required: true }),
    newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })
  ]);
  this._freeExerciseName = name;
  this._currentExerciseId = this.currentExercise.id;
  this.currentSet = 0;
  this.setData = [];
  // 尝试匹配库中同名动作的重量记忆
  const match = Exercises.getAll().find(e => e.name === name);
  if (match) this._applyWeightMemory(match.id);
  this.renderPage();
};

// ---------- 记录一组 ----------
Training.recordSet = function(formData) {
  if (!this.currentExercise) return;
  
  // 收集字段数据
  const set = {};
  let valid = true;
  this.currentExercise.fields.forEach(f => {
    let val = formData[f.key];
    if (f.type === 'number') {
      val = parseFloat(val);
      if (isNaN(val)) val = null;
    } else if (f.type === 'boolean') {
      val = !!val;
    }
    set[f.key] = val;
    // 检查必填
    if (f.required && (val == null || val === '')) {
      valid = false;
    }
  });

  if (!valid) {
    App.showToast('请填写所有必填字段', 'warning');
    return false;
  }

  this.setData.push(set);
  this.currentSet++;
  this.renderPage();
  return true;
};

// ---------- 换动作（自由模式） ----------
Training._switchExercise = function() {
  // 保存当前动作的已记录组到临时列表
  if (this.currentExercise && this.setData.length > 0) {
    if (!this._completedExercises) this._completedExercises = [];
    this._completedExercises.push({
      exerciseId: this.currentExercise.id,
      name: this.currentExercise.name,
      tags: this.currentExercise.tags || [],
      sets: this.setData.map(s => ({ ...s })),
      restDuration: this.currentExercise.defaultRest || 90
    });
  }
  this.currentExercise = null;
  this.setData = [];
  this.currentSet = 0;
  Timer.stop();
  this.renderPage();
};

// ---------- 跳过动作 ----------
Training.skipExercise = function() {
  if (this.mode === 'plan') {
    this.nextExercise();
  } else {
    this.currentExercise = null;
    this.setData = [];
    this.currentSet = 0;
    this.renderPage();
  }
};

// ---------- 下一个动作（计划模式） ----------
Training.nextExercise = function() {
  const plan = Plans.getById(this.planId);
  if (!plan) return;
  if (this.currentExerciseIndex < plan.exercises.length - 1) {
    this._loadPlanExercise(this.currentExerciseIndex + 1);
  } else {
    // 所有动作完成
    this.showEndModal();
  }
};

// ---------- 结束训练 ----------
Training.endTraining = function() {
  this.showEndModal();
};

Training.showEndModal = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  const defaultWeight = settings.autoDefaultWeight || '';

  const html = `<h2>🏁 训练结束</h2>
    <p style="margin-bottom:16px;color:var(--text-secondary)">请填写本次训练总结</p>
    <form id="end-training-form" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">体重 (kg) *</label>
        <input type="number" class="form-input" name="weight" value="${defaultWeight}" placeholder="例如：75" step="0.1" required>
      </div>
      <div class="form-group">
        <label class="form-label">RPE (1-10) *</label>
        <input type="range" name="rpe" min="1" max="10" value="5" oninput="this.nextElementSibling.textContent=this.value">
        <span style="font-size:1.2rem;font-weight:700;color:var(--accent)">5</span>
      </div>
      <div class="form-group">
        <label class="form-label">备注</label>
        <textarea class="form-textarea" name="note" placeholder="训练感受…"></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal();Training.renderPage()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Training._saveAndEnd()">保存记录</button>
      </div>
    </form>`;

  App.showModal(html);
};

Training._saveAndEnd = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  // 读取结束弹窗表单（如果存在）
  const form = document.getElementById('end-training-form');
  let weight = settings.autoDefaultWeight || 0;
  let rpe = 5;
  let note = '';
  if (form) {
    const w = parseFloat(form.querySelector('[name="weight"]')?.value);
    if (w && w > 0) weight = w;
    const r = parseInt(form.querySelector('[name="rpe"]')?.value);
    if (r >= 1 && r <= 10) rpe = r;
    note = form.querySelector('[name="note"]')?.value || '';
  }

  // 构建记录
  const exercisesCompleted = [];

  // 在计划模式下，访问一个全局数组来记录所有已完成的动作
  // 对于当前动作，如果它有记录组，就保存
  if (this.currentExercise && this.setData.length > 0) {
    exercisesCompleted.push({
      exerciseId: this.currentExercise.id,
      name: this.currentExercise.name,
      tags: this.currentExercise.tags || [],
      sets: this.setData.map(s => ({ ...s })),
      restDuration: this.currentExercise.defaultRest || 90
    });
  }

  // 追加之前完成的动作（换动作积累的）
  if (this._completedExercises) {
    this._completedExercises.forEach(ec => {
      exercisesCompleted.push(ec);
    });
  }

  const totalDuration = this.startedAt ? (() => {
    const d = new Date(this.startedAt);
    return isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d) / 1000);
  })() : 0;

  const record = newRecord({
    planName: this.mode === 'plan' ? (Plans.getById(this.planId)?.name || '计划训练') : '自由训练',
    mode: this.mode, // BUG 11: 存储模式以便统计筛选
    totalDuration,
    weight,
    rpe,
    note,
    exercisesCompleted
  });

  Records.add(record);

  // 重置训练状态
  this.isActive = false;
  this.currentExercise = null;
  this.setData = [];
  this.currentSet = 0;
  Timer.stop();

  localStorage.removeItem('fitness_pending_training'); // BUG 1+5
  App.closeModal();
  this.renderPage();
  App.showToast('✅ 训练记录已保存', 'success');
};

// ---------- 自动保存（中断时） ----------
Training.autoSave = function() {
  if (!this.isActive) return;
  // 简单中断保存在本地的 pending 字段
  const pending = {
    mode: this.mode,
    planId: this.planId,
    currentExercise: this.currentExercise,
    currentSet: this.currentSet,
    setData: this.setData,
    _completedExercises: this._completedExercises, // BUG 6: 保存积累的已完成动作
    startedAt: this.startedAt,
    timestamp: Date.now()
  };
  localStorage.setItem('fitness_pending_training', JSON.stringify(pending));
};

Training.restorePending = function() {
  const raw = localStorage.getItem('fitness_pending_training');
  if (!raw) return false;
  try {
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp > 86400000) {
      localStorage.removeItem('fitness_pending_training');
      return false;
    }
    if (p.currentExercise && Array.isArray(p.currentExercise.fields)) {
      const hasArrayFields = p.currentExercise.fields.some(f => Array.isArray(f));
      if (hasArrayFields) {
        localStorage.removeItem('fitness_pending_training');
        return false;
      }
    }
    this.mode = p.mode;
    this.planId = p.planId;
    this.currentExercise = p.currentExercise ? sanitizeFields(JSON.parse(JSON.stringify(p.currentExercise))) : null;
    this.currentSet = p.currentSet;
    this.setData = Array.isArray(p.setData) ? p.setData : [];
    this.startedAt = p.startedAt;
    this.isActive = true;
    return true;
  } catch (_) {
    localStorage.removeItem('fitness_pending_training');
    return false;
  }
};

// ---------- 页面渲染 ----------
Training.renderPage = function() {
  const container = document.getElementById('training-content');
  if (!container) return;

  // 更新切换按钮状态
  const toggleBtns = document.querySelectorAll('.training-mode-toggle .toggle-btn');
  toggleBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === this.mode));

  // 读取设置中的模式
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  if (!this.isActive) {
    // 尝试恢复（restorePending 返回 true 表示恢复成功，不再重复渲染）
    const restored = this.restorePending();
    if (restored) {
      App.showToast('检测到未完成训练，已恢复', 'info');
    }
    if (!this.isActive) {
      container.innerHTML = this._renderInactive();
      return;
    }
  }

  container.innerHTML = this._renderActive();
};

Training._renderInactive = function() {
  // 今日概览
  const today = new Date().toISOString().slice(0, 10);
  const allRecords = STORAGE.get(STORAGE.keys.records) || [];
  const todayRecords = allRecords.filter(r => r.date.slice(0, 10) === today);
  const todaySessions = todayRecords.length;
  const todaySets = todayRecords.reduce((sum, r) =>
    sum + (r.exercisesCompleted || []).reduce((s, ec) => s + (ec.sets || []).length, 0), 0);

  let html = '<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0">';

  // 今日卡片
  html += `<div class="card" style="width:100%;max-width:320px;text-align:center;margin-bottom:8px">
    <div style="font-size:0.8rem;color:var(--text-secondary)">📅 ${today}</div>
    <div style="display:flex;justify-content:center;gap:24px;margin:8px 0">
      <div><div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${todaySessions}</div><div style="font-size:0.7rem;color:var(--text-secondary)">今日训练</div></div>
      <div><div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${todaySets}</div><div style="font-size:0.7rem;color:var(--text-secondary)">今日组数</div></div>
    </div>
  </div>`;

  // 自由模式按钮
  html += `<button class="btn btn-primary btn-lg" onclick="Training.startFree()" style="width:200px">🎯 开始自由训练</button>`;

  // 计划模式按钮
  const plans = (window.Plans ? Plans.getAll() : []);
  if (plans.length > 0) {
    html += `<div style="width:100%;max-width:320px">
      <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">或选择计划：</div>`;
    plans.forEach(p => {
      html += `<div class="card" onclick="Training.startPlan('${p.id}')" style="cursor:pointer;margin-bottom:8px">
        <span>${Esc.html(p.name)}</span> <span style="color:var(--text-secondary);font-size:0.8rem">(${p.exercises.length} 个动作)</span>
      </div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return html;
};

Training._renderActive = function() {
  let html = '<div style="display:flex;flex-direction:column;gap:16px">';

  // 顶部信息
  const ex = this.currentExercise;
  if (!ex) {
    // 选择动作（自由模式）
    html += this._renderExerciseSelector();
    html += '</div>';
    return html;
  }

  // 动作名 + 组数
  html += `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:1.2rem;font-weight:700">${Esc.html(ex.name)}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">第 ${this.currentSet + 1} 组</div>
      </div>
      <div style="display:flex;gap:4px">
        ${this.mode === 'free' ? `<button class="btn btn-ghost btn-sm" onclick="Training._switchExercise()" style="color:var(--accent)">🔄 换动作</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="Training.skipExercise()" style="color:var(--text-secondary)">⏭ 跳过</button>
      </div>
    </div>`;

  // 计时器（总用时）
  html += `<div style="text-align:center;padding:8px 0">
    <div style="font-size:0.8rem;color:var(--text-secondary)">⏱ 训练用时</div>
    <div id="timer-display" style="font-size:2rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent)">${Timer.format()}</div>
  </div>`;

  html += '</div>'; // end card

  // 字段输入面板
  html += `<div class="card">
    <div style="font-weight:600;margin-bottom:12px">📝 记录本组数据</div>
    <form id="set-form" onsubmit="return false">`;

  (ex.fields || []).forEach(f => {
    let defaultValue = null;
    if (f.key === 'weight' && this._lastWeight != null) defaultValue = this._lastWeight;
    html += Exercises.renderFieldInput(f, defaultValue);
  });

  html += `<button type="button" class="btn btn-primary btn-lg" onclick="Training._submitSet()" style="width:100%;margin-top:8px">✅ 记录本组</button>
    </form>
  </div>`;

  // 已记录的组
  if (this.setData.length > 0) {
    html += `<div class="card">
      <div style="font-weight:600;margin-bottom:8px">已完成组 (${this.setData.length})</div>`;
    this.setData.forEach((s, i) => {
      const summary = UI.renderSetData(s, ex.fields);
      html += `<div style="font-size:0.85rem;padding:4px 0;border-bottom:1px solid var(--border)">组 ${i+1}: ${summary || '—'}</div>`;
    });
    html += '</div>';
  }

  // 结束训练按钮
  html += `<button class="btn btn-danger" onclick="Training.endTraining()" style="width:100%">🏁 结束训练</button>`;

  html += '</div>';
  return html;
};

Training._renderExerciseSelector = function() {
  let html = '<div style="max-width:400px;margin:0 auto">';
  html += '<div style="font-weight:600;margin-bottom:12px">选择动作</div>';

  // 搜索已有的动作
  html += UI.searchBar('搜索动作…', '');
  const exercises = Exercises.getAll();
  if (exercises.length > 0) {
    html += exercises.map(ex =>
      `<div class="card" onclick="Training.selectExercise('${ex.id}')" style="cursor:pointer;margin-bottom:8px">
        <span>${Esc.html(ex.name)}</span>
        <span style="color:var(--text-secondary);font-size:0.8rem;margin-left:8px">(${(ex.fields||[]).length} 个字段)</span>
      </div>`
    ).join('');
  }

  // 或直接输入名称
  html += `<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
    <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">或直接输入动作名称：</div>
    <div style="display:flex;gap:8px">
      <input type="text" class="form-input" id="free-ex-name" placeholder="例如：俯卧撑" style="flex:1">
      <button class="btn btn-primary" onclick="Training.selectFreeExerciseByName(document.getElementById('free-ex-name').value)">开始</button>
    </div>
  </div>`;

  html += '<div style="margin-top:16px"><button class="btn btn-secondary" onclick="Training._cancelTraining()" style="width:100%">取消训练</button></div>';
  html += '</div>';

  // 绑定搜索
  setTimeout(() => {
    document.querySelector('#training-content .search-input')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#training-content .card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
      });
    });
  }, 0);

  return html;
};

Training._submitSet = function() {
  const form = document.getElementById('set-form');
  if (!form) return;
  const fd = new FormData(form);
  const data = {};
  fd.forEach((v, k) => { data[k] = v; });
  Training.recordSet(data);
};

// ---------- 取消训练 ----------
Training._cancelTraining = function() {
  localStorage.removeItem('fitness_pending_training'); // BUG 5
  this.isActive = false;
  this.currentExercise = null;
  this.setData = [];
  this._completedExercises = [];
  Timer.stop();
  this.renderPage();
};

// 页面离开时自动保存
window.addEventListener('beforeunload', () => {
  if (window.Training) Training.autoSave();
});

if (typeof window !== 'undefined') {
  window.Training = Training;
}

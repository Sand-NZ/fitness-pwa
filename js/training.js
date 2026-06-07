/**
 * training.js — 训练状态机（仅自由模式）
 * 依赖：timer.js, exercises.js, records.js, ui.js
 */
const Training = {
  currentSet: 0,
  setData: [],
  startedAt: null,
  isActive: false,
  currentExercise: null,
  _currentExerciseId: null,
  _freeExerciseName: '',
  _lastWeight: null,
  _completedExercises: []
};

// ---------- 初始化 ----------
Training.init = function() {
  this.isActive = false;
  this.currentExercise = null;
  this.setData = [];
  this.currentSet = 0;
  this._completedExercises = [];
  Timer.init({});
};

// ---------- 开始训练 ----------
Training.startFree = function() {
  this.isActive = true;
  this.startedAt = new Date().toISOString();
  this.currentExercise = null;
  this.currentSet = 0;
  this.setData = [];
  this._completedExercises = [];
  localStorage.removeItem('fitness_pending_training');
  Timer.reset();
  Timer.start();
  this.renderPage();
  App.showToast('训练已开始', 'success');
};

// ---------- 选择动作 ----------
Training.selectExercise = function(exerciseId) {
  const ex = Exercises.getById(exerciseId);
  if (!ex) return;
  this.currentExercise = JSON.parse(JSON.stringify(ex));
  this._currentExerciseId = exerciseId;
  this.currentSet = 0;
  this.setData = [];
  this._applyWeightMemory(exerciseId);
  this.renderPage();
};

Training._applyWeightMemory = function(exerciseId) {
  const records = STORAGE.get(STORAGE.keys.records) || [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const ec = (r.exercisesCompleted || []).find(e => e.exerciseId === exerciseId);
    if (ec && ec.sets && ec.sets.length > 0) {
      const lastSet = ec.sets[ec.sets.length - 1];
      if (lastSet.weight != null) { this._lastWeight = lastSet.weight; }
      return;
    }
  }
  this._lastWeight = null;
};

Training.selectFreeExerciseByName = function(name) {
  this.currentExercise = newExercise(name, [
    newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5, required: true }),
    newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })
  ]);
  this._freeExerciseName = name;
  this._currentExerciseId = this.currentExercise.id;
  this.currentSet = 0;
  this.setData = [];
  const match = Exercises.getAll().find(e => e.name === name);
  if (match) {
    this.currentExercise.id = match.id;
    this._currentExerciseId = match.id;
    this._applyWeightMemory(match.id);
  }
  this.renderPage();
};

// ---------- 记录一组 ----------
Training.recordSet = function(formData) {
  if (!this.currentExercise) return;
  const set = {};
  let valid = true;
  this.currentExercise.fields.forEach(f => {
    let val = formData[f.key];
    if (f.type === 'number') { val = parseFloat(val); if (isNaN(val)) val = null; }
    else if (f.type === 'boolean') { val = !!val; }
    set[f.key] = val;
    if (f.required && (val == null || val === '')) valid = false;
  });
  if (!valid) { App.showToast('请填写所有必填字段', 'warning'); return false; }
  this.setData.push(set);
  this.currentSet++;
  this.renderPage();
  return true;
};

// ---------- 换动作 ----------
Training._switchExercise = function() {
  if (this.currentExercise && this.setData.length > 0) {
    if (!this._completedExercises) this._completedExercises = [];
    this._completedExercises.push({
      exerciseId: this.currentExercise.id, name: this.currentExercise.name,
      tags: this.currentExercise.tags || [], sets: this.setData.map(s => ({ ...s })),
      restDuration: this.currentExercise.defaultRest || 90
    });
  }
  this.currentExercise = null; this.setData = []; this.currentSet = 0;
  Timer.stop(); this.renderPage();
};

// ---------- 跳过动作 ----------
Training.skipExercise = function() {
  this.currentExercise = null; this.setData = []; this.currentSet = 0; this.renderPage();
};

// ---------- 结束训练 ----------
Training.endTraining = function() { this.showEndModal(); };

Training.showEndModal = function() {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  const html = `<h2>🏁 训练结束</h2>
    <p style="margin-bottom:16px;color:var(--text-secondary)">请填写体重</p>
    <form id="end-training-form" onsubmit="return false">
      <div class="form-group">
        <label class="form-label">体重 (kg) *</label>
        <input type="number" class="form-input" name="weight" value="${settings.autoDefaultWeight || ''}" placeholder="例如：75" step="0.1" required>
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
  const form = document.getElementById('end-training-form');
  let weight = 0; let note = '';
  if (form) {
    const w = parseFloat(form.querySelector('[name="weight"]')?.value);
    if (w && w > 0) weight = w;
    note = form.querySelector('[name="note"]')?.value || '';
  }
  const exercisesCompleted = [];
  if (this.currentExercise && this.setData.length > 0) {
    exercisesCompleted.push({
      exerciseId: this.currentExercise.id, name: this.currentExercise.name,
      tags: this.currentExercise.tags || [], sets: this.setData.map(s => ({ ...s })),
      restDuration: this.currentExercise.defaultRest || 90
    });
  }
  if (this._completedExercises) this._completedExercises.forEach(ec => exercisesCompleted.push(ec));

  const totalDuration = this.startedAt ? (() => {
    const d = new Date(this.startedAt); return isNaN(d.getTime()) ? 0 : Math.floor((Date.now() - d) / 1000);
  })() : 0;

  Records.add(newRecord({ planName: '自由训练', mode: 'free', totalDuration, weight, note, exercisesCompleted }));
  this.isActive = false; this.currentExercise = null; this.setData = []; this.currentSet = 0;
  this._completedExercises = []; Timer.stop();
  localStorage.removeItem('fitness_pending_training');
  App.closeModal(); this.renderPage();
  App.showToast('✅ 训练记录已保存', 'success');
};

// ---------- 自动保存 ----------
Training.autoSave = function() {
  if (!this.isActive) return;
  localStorage.setItem('fitness_pending_training', JSON.stringify({
    currentExercise: this.currentExercise, currentSet: this.currentSet,
    setData: this.setData, _completedExercises: this._completedExercises,
    startedAt: this.startedAt, timestamp: Date.now()
  }));
};

Training.restorePending = function() {
  const raw = localStorage.getItem('fitness_pending_training');
  if (!raw) return false;
  try {
    const p = JSON.parse(raw);
    if (Date.now() - p.timestamp > 86400000) { localStorage.removeItem('fitness_pending_training'); return false; }
    if (p.currentExercise && Array.isArray(p.currentExercise.fields)) {
      if (p.currentExercise.fields.some(f => Array.isArray(f))) { localStorage.removeItem('fitness_pending_training'); return false; }
    }
    this.currentExercise = p.currentExercise ? sanitizeFields(JSON.parse(JSON.stringify(p.currentExercise))) : null;
    this.currentSet = p.currentSet; this.setData = Array.isArray(p.setData) ? p.setData : [];
    this._completedExercises = Array.isArray(p._completedExercises) ? p._completedExercises : [];
    this.startedAt = p.startedAt; this.isActive = true;
    localStorage.removeItem('fitness_pending_training');
    return true;
  } catch (_) { localStorage.removeItem('fitness_pending_training'); return false; }
};

// ---------- 渲染 ----------
Training.renderPage = function() {
  const container = document.getElementById('training-content');
  if (!container) return;
  if (!this.isActive) {
    if (this.restorePending()) App.showToast('检测到未完成训练，已恢复', 'info');
    if (!this.isActive) { container.innerHTML = this._renderInactive(); return; }
  }
  container.innerHTML = this._renderActive();
  Timer._displayEl = document.getElementById('timer-display');
};

Training._renderInactive = function() {
  const today = new Date().toISOString().slice(0, 10);
  const allRecords = STORAGE.get(STORAGE.keys.records) || [];
  const todayRecords = allRecords.filter(r => r.date.slice(0, 10) === today);
  const todaySets = todayRecords.reduce((sum, r) =>
    sum + (r.exercisesCompleted || []).reduce((s, ec) => s + (ec.sets || []).length, 0), 0);

  return `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0">
    <div class="card" style="width:100%;max-width:320px;text-align:center;margin-bottom:8px">
      <div style="font-size:0.8rem;color:var(--text-secondary)">📅 ${today}</div>
      <div style="display:flex;justify-content:center;gap:24px;margin:8px 0">
        <div><div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${todayRecords.length}</div><div style="font-size:0.7rem;color:var(--text-secondary)">今日训练</div></div>
        <div><div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${todaySets}</div><div style="font-size:0.7rem;color:var(--text-secondary)">今日组数</div></div>
      </div>
    </div>
    <button class="btn btn-primary btn-lg" onclick="Training.startFree()" style="width:200px">🎯 开始训练</button>
  </div>`;
};

Training._renderActive = function() {
  let html = '<div style="display:flex;flex-direction:column;gap:16px">';
  const ex = this.currentExercise;
  if (!ex) { html += this._renderExerciseSelector(); html += '</div>'; return html; }

  html += `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:1.2rem;font-weight:700">${Esc.html(ex.name)}</div>
        <div style="font-size:0.8rem;color:var(--text-secondary)">第 ${this.currentSet + 1} 组</div>
      </div>
      <div>
        <button class="btn btn-ghost btn-sm" onclick="Training.skipExercise()" style="color:var(--text-secondary)">⏭ 跳过</button>
      </div>
    </div>
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:0.8rem;color:var(--text-secondary)">⏱ 训练用时</div>
      <div id="timer-display" style="font-size:2rem;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent)">${Timer.format()}</div>
    </div>
  </div>`;

  // 字段输入
  html += `<div class="card">
    <div style="font-weight:600;margin-bottom:12px">📝 记录本组数据</div>
    <form id="set-form" onsubmit="return false">`;
  const lastSet = this.setData.length > 0 ? this.setData[this.setData.length - 1] : null;
  (ex.fields || []).forEach(f => {
    let def = null;
    if (f.key === 'weight' && this._lastWeight != null) def = this._lastWeight;
    if (lastSet && lastSet[f.key] != null) def = lastSet[f.key];
    html += Exercises.renderFieldInput(f, def);
  });
  html += `<button type="button" class="btn btn-primary btn-lg" onclick="Training._submitSet()" style="width:100%;margin-top:8px">✅ 记录本组</button>
    <button type="button" class="btn btn-primary btn-lg" onclick="Training._switchExercise()" style="width:100%;margin-top:8px">🔄 换动作</button>
    </form>
  </div>`;

  if (this.setData.length > 0) {
    html += `<div class="card"><div style="font-weight:600;margin-bottom:8px">已完成组 (${this.setData.length})</div>`;
    this.setData.forEach((s, i) => {
      html += `<div style="font-size:0.85rem;padding:4px 0;border-bottom:1px solid var(--border)">组 ${i+1}: ${UI.renderSetData(s, ex.fields) || '—'}</div>`;
    });
    html += '</div>';
  }
  html += `<button class="btn btn-danger" onclick="Training.endTraining()" style="width:100%">🏁 结束训练</button></div>`;
  return html;
};

Training._renderExerciseSelector = function() {
  let html = '<div style="max-width:400px;margin:0 auto"><div style="font-weight:600;margin-bottom:12px">选择动作</div>';
  html += UI.searchBar('搜索动作…', '');

  const exercises = Exercises.getAll();
  const categories = {};
  const catOrder = ['热身','推','拉','腿','腹部/核心'];
  exercises.forEach(ex => {
    const cat = ex.category || '未分类';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(ex);
  });
  const sortedCats = Object.keys(categories).sort((a, b) => {
    const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1; if (ib >= 0) return 1;
    return a.localeCompare(b);
  });

  if (exercises.length === 0) {
    html += '<div style="color:var(--text-secondary);text-align:center;padding:16px">动作库为空，请先在动作库中添加</div>';
  } else {
    sortedCats.forEach(cat => {
      const items = categories[cat];
      html += `<div class="card" style="margin-bottom:8px;padding:10px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
          <span style="font-weight:600;font-size:0.9rem">${Esc.html(cat)} <span style="font-weight:400;color:var(--text-secondary);font-size:0.8rem">(${items.length})</span></span>
          <span style="color:var(--text-secondary)">▾</span>
        </div>
        <div style="margin-top:6px">`;
      items.forEach(ex => {
        html += `<div class="list-item" style="cursor:pointer;padding:8px 0" onclick="Training.selectExercise('${ex.id}')">
          <div class="list-item-content">
            <div class="list-item-title" style="font-size:0.9rem">${Esc.html(ex.name)}</div>
            <div class="list-item-desc" style="font-size:0.75rem">${(ex.fields||[]).length} 字段</div>
          </div>
        </div>`;
      });
      html += `</div></div>`;
    });
  }

  html += `<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
    <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">或直接输入动作名称：</div>
    <div style="display:flex;gap:8px">
      <input type="text" class="form-input" id="free-ex-name" placeholder="例如：俯卧撑" style="flex:1">
      <button class="btn btn-primary" onclick="Training.selectFreeExerciseByName(document.getElementById('free-ex-name').value)">开始</button>
    </div>
  </div>`;
  html += '<div style="margin-top:16px"><button class="btn btn-secondary" onclick="Training._cancelTraining()" style="width:100%">取消训练</button></div></div>';

  // 绑定搜索
  setTimeout(() => {
    const input = document.querySelector('#training-content .search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#training-content .card').forEach(card => {
          if (card.querySelector('[onclick^="Training.selectExercise"]')) {
            const name = card.querySelector('.list-item-title')?.textContent?.toLowerCase() || '';
            card.style.display = name.includes(q) ? 'block' : 'none';
          }
        });
      });
    }
  }, 0);

  return html;
};

Training._submitSet = function() {
  const form = document.getElementById('set-form');
  if (!form) return;
  const fd = new FormData(form); const data = {};
  fd.forEach((v, k) => { data[k] = v; });
  Training.recordSet(data);
};

Training._cancelTraining = function() {
  localStorage.removeItem('fitness_pending_training');
  this._freeExerciseName = ''; this._currentExerciseId = null; this._lastWeight = null;
  this.isActive = false; this.currentExercise = null; this.setData = [];
  this._completedExercises = []; Timer.stop(); this.renderPage();
};

window.addEventListener('beforeunload', () => { if (window.Training) Training.autoSave(); });

if (typeof window !== 'undefined') { window.Training = Training; }

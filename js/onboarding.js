/**
 * onboarding.js — 首次使用引导（两步完成）
 * 依赖：tags.js, exercises.js, ui.js
 */
const Onboarding = {
  _completed: false
};

Onboarding.shouldShow = function() {
  if (this._completed) return false;
  const flag = localStorage.getItem('fitness_onboarding_complete');
  if (flag === 'true') {
    this._completed = true;
    return false;
  }
  // 仅在没有任何数据时显示
  const tags = Tags.getAll();
  const exercises = Exercises.getAll();
  return tags.length === 0 && exercises.length === 0;
};

Onboarding.start = function() {
  this.showStep1();
};

Onboarding.complete = function() {
  this._completed = true;
  localStorage.setItem('fitness_onboarding_complete', 'true');
};

// ---------- 第一步：欢迎 ----------
Onboarding.showStep1 = function() {
  const html = `<div style="text-align:center;padding:16px 0">
    <div style="font-size:3rem;margin-bottom:12px">🏋️</div>
    <h2>欢迎使用健身实况记录</h2>
    <p style="color:var(--text-secondary);margin:12px 0;line-height:1.6">
      这是一款完全离线的健身记录工具。<br>
      所有数据存储在您的设备上，无需注册账号。<br>
      让我们快速完成初始设置。
    </p>
    <div style="margin-top:24px">
      <button class="btn btn-primary btn-lg" onclick="Onboarding.showStep2()">开始设置 →</button>
      <br><br>
      <button class="btn btn-ghost btn-sm" onclick="Onboarding.skip()">跳过引导</button>
    </div>
  </div>`;

  App.showModal(html);
};

// ---------- 第二步：创建第一个标签 ----------
Onboarding.showStep2 = function() {
  App.closeModal();
  const html = `<h2>创建您的第一个标签</h2>
    <p style="color:var(--text-secondary);margin-bottom:16px">
      标签用于给动作分类，例如「上肢」「下肢」「推」「拉」。
    </p>
    <form id="onboarding-tag-form">
      <div class="form-group">
        <label class="form-label">标签名称 *</label>
        <input type="text" class="form-input" name="name" placeholder="例如：上肢" required autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">颜色</label>
        <input type="color" class="form-input" name="color" value="#4a90d9" style="height:40px;padding:4px">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="Onboarding.skip()">跳过</button>
        <button type="button" class="btn btn-primary" onclick="Onboarding._createTag()">创建并继续</button>
      </div>
    </form>`;

  App.showModal(html);
};

Onboarding._createTag = function() {
  const form = document.getElementById('onboarding-tag-form');
  if (!form) return;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  if (!name) { App.showToast('请输入标签名称', 'warning'); return; }
  Tags.add(newTag(name, form.querySelector('[name="color"]')?.value || '#4a90d9'));
  App.closeModal();
  this.showStep3();
};

// ---------- 第三步：创建第一个动作 ----------
Onboarding.showStep3 = function() {
  const html = `<h2>创建您的第一个动作</h2>
    <p style="color:var(--text-secondary);margin-bottom:16px">
      动作可以自定义字段，例如「重量」「次数」「时长」等。
    </p>
    <form id="onboarding-ex-form">
      <div class="form-group">
        <label class="form-label">动作名称 *</label>
        <input type="text" class="form-input" name="name" placeholder="例如：杠铃卧推" required autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">分类（可选）</label>
        <input type="text" class="form-input" name="category" placeholder="例如：胸部" list="onboarding-category-list">
        <datalist id="onboarding-category-list">
          <option value="胸"><option value="肩"><option value="背"><option value="腿">
          <option value="手臂"><option value="腹部"><option value="有氧"><option value="全身">
        </datalist>
      </div>
      <div class="form-group">
        <label class="form-label">标签</label>
        <div class="chip-group">`;
  const tags = Tags.getAll();
  tags.forEach(t => {
    html += `<span class="chip selected" data-tag-id="${t.id}" style="border-color:${t.color}">${Esc.html(t.name)}</span>`;
  });
  html += `</div></div>
      <div class="form-group">
        <label class="form-label">默认休息 (秒)</label>
        <input type="number" class="form-input" name="defaultRest" value="90" step="5">
      </div>
      <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">
        ⚡ 默认包含「重量」和「次数」字段，之后可以在动作库中编辑。
      </p>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="Onboarding.finish()">跳过</button>
        <button type="button" class="btn btn-primary" onclick="Onboarding._createExercise()">创建并完成</button>
      </div>
    </form>`;

  App.showModal(html);

  // 绑定标签选择
  setTimeout(() => {
    document.querySelectorAll('#onboarding-ex-form .chip').forEach(el => {
      el.addEventListener('click', () => el.classList.toggle('selected'));
    });
  }, 0);
};

Onboarding._createExercise = function() {
  const form = document.getElementById('onboarding-ex-form');
  if (!form) return;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  if (!name) { App.showToast('请输入动作名称', 'warning'); return; }

  const tags = [];
  form.querySelectorAll('.chip.selected').forEach(el => {
    tags.push(el.dataset.tagId);
  });

  const ex = newExercise(name, [
    newField('weight', '重量 (kg)', 'number', { unit: 'kg', step: 0.5, required: true }),
    newField('reps', '次数', 'number', { unit: '次', step: 1, required: true })
  ], {
    category: form.querySelector('[name="category"]')?.value?.trim() || '',
    tags,
    defaultRest: parseInt(form.querySelector('[name="defaultRest"]')?.value) || 90
  });

  Exercises.add(ex);
  App.closeModal();
  this.finish();
};

// ---------- 完成 ----------
Onboarding.finish = function() {
  App.closeModal();
  this.complete();
  App.showToast('🎉 设置完成，开始训练吧！', 'success');
  // 刷新页面
  const current = App.currentPage;
  App.navigate(current);
};

Onboarding.skip = function() {
  App.closeModal();
  this.complete();
  App.showToast('欢迎随时通过设置重新引导', 'info');
};

if (typeof window !== 'undefined') {
  window.Onboarding = Onboarding;
}

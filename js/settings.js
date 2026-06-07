/**
 * settings.js — 设置页面渲染
 * 依赖：backup.js, tags.js
 */
const Settings = {};

Settings.renderPage = function() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  Tags.load();

  let html = '';

  // ====== 标签管理 ======
  html += `<div class="card" style="margin-bottom:12px">
    <div class="form-section-title">🏷️ 标签管理</div>`;

  const flatTags = Tags.getFlatWithDepth();
  if (flatTags.length === 0) {
    html += '<div style="color:var(--text-secondary);font-size:0.85rem;padding:8px 0">暂无标签</div>';
  } else {
    flatTags.forEach(t => {
      html += `<div class="setting-item" style="padding-left:${t.depth * 20}px">
        <div>
          <span class="tag-badge tag-badge-sm" style="background:${t.color}">${Esc.html(t.name)}</span>
          <span style="font-size:0.75rem;color:var(--text-secondary)">${t.parentId ? '(子标签)' : ''}</span>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="Settings.editTag('${t.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="Settings.deleteTag('${t.id}')" style="color:var(--danger)">🗑️</button>
        </div>
      </div>`;
    });
  }

  html += `<button class="btn btn-secondary btn-sm" onclick="Settings.addTag()" style="margin-top:8px">+ 添加标签</button>
  </div>`;

  // ====== 数据管理 ======
  html += `<div class="card" style="margin-bottom:12px">
    <div class="form-section-title">💾 数据管理</div>

    <div class="setting-item">
      <div>
        <div class="setting-label">导出动作库</div>
        <div class="setting-desc">所有动作为 JSON</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Backup.exportExercises()">导出</button>
    </div>
    <div class="setting-item">
      <div>
        <div class="setting-label">导出训练记录</div>
        <div class="setting-desc">所有记录为 JSON</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Backup.exportRecords()">导出</button>
    </div>
    <div class="setting-item">
      <div>
        <div class="setting-label">全量备份</div>
        <div class="setting-desc">导出所有数据</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="Backup.exportFull()">导出</button>
    </div>
    <div class="setting-item">
      <div>
        <div class="setting-label">导入数据</div>
        <div class="setting-desc">支持 JSON 备份文件</div>
      </div>
      <div>
        <select class="form-select" style="width:auto;margin-right:6px" id="import-mode">
          <option value="merge">合并</option>
          <option value="overwrite">覆盖</option>
        </select>
        <input type="file" accept=".json" style="display:none" id="import-file-input" onchange="Settings.doImport()">
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('import-file-input').click()">导入</button>
      </div>
    </div>
    <div class="setting-item" style="border-bottom:none">
      <div>
        <div class="setting-label" style="color:var(--danger)">清空所有数据</div>
        <div class="setting-desc">此操作不可恢复</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="Settings.confirmClear()">清空</button>
    </div>
  </div>`;

  // ====== 自动填充 ======
  html += `<div class="card" style="margin-bottom:12px">
    <div class="form-section-title">⚡ 快捷设置</div>

    <div class="setting-item">
      <div>
        <div class="setting-label">默认体重</div>
        <div class="setting-desc">训练结束时自动填充</div>
      </div>
      <input type="number" class="form-input" style="width:80px" value="${settings.autoDefaultWeight || ''}" step="0.1" placeholder="kg" onchange="Settings.updateSetting('autoDefaultWeight', parseFloat(this.value) || null)">
    </div>
  </div>`;

  // ====== 存储信息 ======
  const totalSize = STORAGE.checkCapacity();
  html += `<div class="card" style="margin-bottom:12px">
    <div class="form-section-title">📦 存储信息</div>
    <div class="setting-item">
      <div>
        <div class="setting-label">已用空间</div>
        <div class="setting-desc">${(totalSize / 1024).toFixed(1)} KB / 4 MB</div>
      </div>
      <div class="progress-bar" style="width:100px">
        <div class="progress-bar-fill" style="width:${Math.min(100, totalSize / (4*1024*1024) * 100)}%"></div>
      </div>
    </div>
  </div>`;

  // ====== 关于 ======
  html += `<div class="card" style="text-align:center;font-size:0.8rem;color:var(--text-secondary)">
    <div style="font-size:1.5rem;margin-bottom:4px">🏋️</div>
    <div>健身实况记录 <span id="app-version">v0.38</span></div>
    <div>Fitness Logger PWA</div>
    <div style="margin-top:4px">纯前端 · 无后端 · 全部数据存储在本地</div>
  </div>`;

  container.innerHTML = html;
};

// ---------- 设置操作 ----------
Settings.updateSetting = function(key, value) {
  const settings = STORAGE.get(STORAGE.keys.settings) || defaultSettings();
  settings[key] = value;
  STORAGE.set(STORAGE.keys.settings, settings);
};

// ---------- 标签管理 ----------
Settings.addTag = function() {
  const html = `<h2>新建标签</h2>
    <form id="tag-form">
      <div class="form-group">
        <label class="form-label">名称 *</label>
        <input type="text" class="form-input" name="name" placeholder="例如：上肢" required>
      </div>
      <div class="form-group">
        <label class="form-label">颜色</label>
        <input type="color" class="form-input" name="color" value="#4a90d9" style="height:40px;padding:4px">
      </div>
      <div class="form-group">
        <label class="form-label">父标签（可选）</label>
        <select class="form-select" name="parentId">
          <option value="">无（顶级标签）</option>
          ${Tags.getAll().filter(t => !t.parentId).map(t => `<option value="${t.id}">${Esc.html(t.name)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Settings._saveTag()">创建</button>
      </div>
    </form>`;
  App.showModal(html);
};

Settings._saveTag = function() {
  const form = document.getElementById('tag-form');
  if (!form) return;
  const name = form.querySelector('[name="name"]')?.value?.trim();
  if (!name) { App.showToast('请输入标签名称', 'warning'); return; }
  Tags.add(newTag(name, form.querySelector('[name="color"]')?.value || '#4a90d9', form.querySelector('[name="parentId"]')?.value || null));
  App.closeModal();
  this.renderPage();
  App.showToast('标签已创建', 'success');
};

Settings.editTag = function(id) {
  const t = Tags.getAll().find(tag => tag.id === id);
  if (!t) return;
  const html = `<h2>编辑标签</h2>
    <form id="tag-form">
      <div class="form-group">
        <label class="form-label">名称</label>
        <input type="text" class="form-input" name="name" value="${Esc.html(t.name)}">
      </div>
      <div class="form-group">
        <label class="form-label">颜色</label>
        <input type="color" class="form-input" name="color" value="${t.color}" style="height:40px;padding:4px">
      </div>
      <div class="form-group">
        <label class="form-label">父标签</label>
        <select class="form-select" name="parentId">
          <option value="">无（顶级标签）</option>
          ${Tags.getAll().filter(tag => tag.id !== id && !tag.parentId).map(tag => `<option value="${tag.id}" ${tag.id === t.parentId ? 'selected' : ''}>${Esc.html(tag.name)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">取消</button>
        <button type="button" class="btn btn-primary" onclick="Settings._updateTag('${id}')">保存</button>
      </div>
    </form>`;
  App.showModal(html);
};

Settings._updateTag = function(id) {
  const form = document.getElementById('tag-form');
  if (!form) return;
  Tags.update(id, {
    name: form.querySelector('[name="name"]')?.value?.trim() || '',
    color: form.querySelector('[name="color"]')?.value || '#4a90d9',
    parentId: form.querySelector('[name="parentId"]')?.value || null
  });
  App.closeModal();
  this.renderPage();
  App.showToast('已更新', 'success');
};

Settings.deleteTag = function(id) {
  const t = Tags.getAll().find(tag => tag.id === id);
  if (!t) return;
  App.showModal(UI.confirmModal('删除标签', `确定删除「${t.name}」及其所有子标签吗？`, '删除', '取消', true));
  document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
    Tags.remove(id);
    App.closeModal();
    this.renderPage();
    App.showToast('已删除', 'info');
  });
};

// ---------- 清空数据 ----------
Settings.confirmClear = function() {
  App.showModal(`<h2>⚠️ 清空所有数据</h2>
    <p style="color:var(--text-secondary);margin-bottom:16px">此操作将删除所有训练数据，且不可恢复。</p>
    <p style="margin-bottom:16px">请输入 "确认清空" 继续：</p>
    <input type="text" class="form-input" id="clear-confirm-input" placeholder="输入：确认清空">
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      <button class="btn btn-danger" onclick="Settings._doClear()">清空</button>
    </div>`);
};

Settings._doClear = function() {
  const input = document.getElementById('clear-confirm-input');
  if (!input || input.value !== '确认清空') {
    App.showToast('请正确输入确认文字', 'warning');
    return;
  }
  Backup.clearAllData();
  App.closeModal();
  this.renderPage();
};

// ---------- 导入处理 ----------
Settings.doImport = function() {
  const input = document.getElementById('import-file-input');
  if (!input || !input.files[0]) return;
  const mode = document.getElementById('import-mode')?.value || 'merge';
  Backup.importFile(input.files[0], mode).then(() => {
    this.renderPage();
    App.showToast('导入成功', 'success');
  }).catch(err => {
    App.showToast('导入失败: ' + err.message, 'error');
  });
  input.value = '';
};

if (typeof window !== 'undefined') {
  window.Settings = Settings;
}

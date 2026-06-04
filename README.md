# 🏋️ 健身实况记录 — Fitness Logger PWA

> 纯前端 · 无后端 · 全部数据存储在本地 · 离线可用

一款完全离线的渐进式 Web 应用（PWA），用于记录健身训练。支持自由训练与计划模式，动作字段可自定义，所有数据存储在浏览器本地。

---

## ✨ 功能

| 功能 | 说明 |
|---|---|
| **🏗️ 自定义动作库** | 动作为自由创建，字段（重量/次数/时长等）完全自定义 |
| **🏷️ 层级标签系统** | 标签支持父子层级、颜色和渐变，用于分类与筛选 |
| **🏋️ 自由训练** | 选动作即练，从动作库选取或直接输入名称 |
| **📋 计划模式** | 先建计划，按顺序逐个执行动作 |
| **⏱️ 组间计时器** | 倒计时/秒表，结束时发声 + 振动 |
| **📝 训练记录** | 每次训练强制记录体重与 RPE（1-10），自动统计 |
| **📊 统计面板** | 训练次数、总组数、总容量、平均 RPE、体重趋势 |
| **🌙 深色模式** | 跟随系统 / 浅色 / 深色 / 护眼琥珀四模式，支持日出日落自动切换 |
| **💾 数据备份** | 全量/增量导出 JSON，导入支持合并或覆盖模式 |
| **🔒 加密导出** | 可设置密码，导出时使用 Web Crypto API (AES-GCM) 加密 |
| **📱 PWA 安装** | 添加到主屏幕后全屏运行，离线可用 |
| **🎉 首次引导** | 三步快速上手 |

---

## 🚀 快速开始

### 方式一：直接打开

```bash
# 用任意 HTTP 服务器启动
npx serve fitness-pwa

# 或用 Python
cd fitness-pwa && python3 -m http.server 8080
```

然后在浏览器打开 `http://localhost:8080`。

### 方式二：部署到 GitHub Pages

1. 将仓库推送到 GitHub
2. 仓库 Settings → Pages → 选择 main 分支
3. 访问 `https://<用户名>.github.io/<仓库名>/`

### 方式三：在手机上安装

1. 用 Chrome 或 Safari 打开部署好的地址
2. 地址栏出现安装图标（或菜单 → 添加到主屏幕）
3. 安装后像原生 App 一样全屏使用，**离线完全可用**

---

## 📁 项目结构

```
fitness-pwa/
├── index.html              # SPA 入口（5 页面 + 底部导航）
├── sw.js                   # Service Worker（离线缓存）
├── assets/
│   ├── manifest.json       # PWA 清单
│   └── icons/              # 应用图标
├── css/
│   ├── main.css            # 全局布局与变量
│   ├── theme.css           # 深色/浅色/琥珀色主题变量
│   └── components.css      # 组件样式（卡片、表单、按钮等）
└── js/
    ├── app.js              # 路由、事件总线、初始化
    ├── models.js           # 数据模型与验证
    ├── storage.js          # localStorage 封装 + 版本迁移
    ├── tags.js             # 标签管理（层级、颜色）
    ├── exercises.js        # 动作管理（自定义字段）
    ├── timer.js            # 计时器引擎
    ├── training.js         # 训练状态机
    ├── plans.js            # 计划管理
    ├── records.js          # 记录保存与统计
    ├── stats.js            # 统计仪表盘
    ├── settings.js         # 设置页面
    ├── theme.js            # 深色模式切换
    ├── backup.js           # 导入/导出/加密
    ├── ui.js               # 渲染辅助函数
    └── onboarding.js       # 首次引导
```

---

## 🧩 数据模型

所有数据使用 **localStorage** 持久化，共 5 个集合：

| 集合 | 说明 |
|---|---|
| `tags` | 标签（层级、颜色、渐变） |
| `exercises` | 动作（自定义字段数组） |
| `plans` | 训练计划（引用动作 + 字段覆盖） |
| `records` | 训练记录（体重、RPE、各组数据） |
| `settings` | 设置（主题、模式、密码等） |

详细的模型结构见 [`js/models.js`](js/models.js)。

---

## 🔄 版本与迁移

版本号记录在 `STORAGE.currentVersion`。当数据模型发生变更时：

1. 递增版本号
2. 用 `STORAGE.registerMigration(version, fn)` 注册迁移函数
3. 下次启动自动执行，用户无感

参见 [`js/storage.js`](js/storage.js) 中的迁移示例。

---

## 🏷️ 版本历史

| 版本 | 日期 | 说明 |
|---|---|---|
| v0.1 | — | 初始版本：核心框架、动作库、训练、计划、统计、设置、PWA |

---

## 📄 许可

本项目为开源项目，基于 MIT 许可。

/**
 * theme.js — 主题管理（仅浅色模式）
 * 简化版：固定浅色主题，无深色/琥珀/日出日落
 */
const Theme = {};

Theme.init = function() {
  document.documentElement.setAttribute('data-theme', 'light');
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.content = '#f5f5f7';
};

if (typeof window !== 'undefined') { window.Theme = Theme; }

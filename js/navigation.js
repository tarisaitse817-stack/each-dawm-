/* ==========================================================================
   光之回响 (Echoes of Light) — Navigation 导航系统
   ========================================================================== */

import { AppState } from './state.js?v=17';

/**
 * 视图路由配置
 */
const views = [
  { id: 'scene',       label: '场景', icon: 'map-pin' },
  { id: 'companions',  label: '伙伴', icon: 'heart' },
  // 背包已隐藏（用户要求：只藏 UI，inventory 数据层保留）
  // { id: 'inventory',   label: '背包', icon: 'briefcase' },
];

/**
 * 当前激活的视图 ID
 */
let _currentViewId = null;

/**
 * 侧边栏 DOM 元素引用
 */
let _sidebarEl = null;

/**
 * 防止导航重入（AppState.set → subscriber → navigateTo 循环）
 */
let _isNavigating = false;

/**
 * Navigation 单例 — 侧边栏渲染、视图切换、角标管理
 */
export const Navigation = {

  /**
   * 初始化侧边栏：渲染 DOM、绑定事件
   */
  init() {
    _sidebarEl = document.getElementById('sidebar');
    if (!_sidebarEl) {
      console.error('[Navigation] #sidebar 元素不存在');
      return;
    }

    // 清空侧边栏
    _sidebarEl.innerHTML = '';

    // --- 渲染导航项 ---
    views.forEach(function (view) {
      var item = document.createElement('div');
      item.className = 'nav-item';
      item.dataset.view = view.id;

      item.innerHTML =
        '<i data-lucide="' + view.icon + '" class="nav-icon"></i>' +
        '<span class="nav-label">' + view.label + '</span>' +
        '<span class="nav-badge hidden"></span>';

      item.addEventListener('click', function () {
        Navigation.navigateTo(view.id);
      });

      _sidebarEl.appendChild(item);
    });

    // --- 渲染设置按钮（底部固定） ---
    var settingsItem = document.createElement('div');
    settingsItem.className = 'nav-item';
    settingsItem.id = 'nav-settings';
    settingsItem.innerHTML =
      '<i data-lucide="settings" class="nav-icon"></i>' +
      '<span class="nav-label">设置</span>';

    settingsItem.addEventListener('click', function () {
      // 占位 — Task 后续实现设置面板
      console.log('[Navigation] 打开设置弹窗');
    });

    _sidebarEl.appendChild(settingsItem);

    // --- 当前场景角色区块（scene.js _renderAvatars 渲染头像列表到这里）---
    var charSection = document.createElement('div');
    charSection.id = 'sidebar-characters';
    charSection.innerHTML =
      '<div class="sidebar-char-title">当前场景角色</div>' +
      '<div id="sidebar-char-list"></div>';
    _sidebarEl.appendChild(charSection);

    // --- 悬停展开/收起 ---
    _sidebarEl.addEventListener('mouseenter', function () {
      _sidebarEl.classList.add('expanded');
    });

    _sidebarEl.addEventListener('mouseleave', function () {
      _sidebarEl.classList.remove('expanded');
    });

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /**
   * 导航到指定视图
   * @param {string} viewId - 视图标识（'scene' | 'companions' | 'inventory'）
   */
  navigateTo(viewId) {
    if (!viewId || viewId === _currentViewId || _isNavigating) return;

    _isNavigating = true;

    // 更新全局状态
    AppState.set('currentView', viewId);

    // 更新侧边栏 active 样式
    var items = _sidebarEl.querySelectorAll('.nav-item:not(#nav-settings)');
    items.forEach(function (item) {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // 隐藏所有视图面板
    var panels = document.querySelectorAll('.view-panel');
    panels.forEach(function (panel) {
      panel.classList.remove('active');
      panel.style.visibility = 'hidden';
      panel.style.position = 'absolute';
    });

    // 显示目标面板
    var targetPanel = document.getElementById('panel-' + viewId);
    if (targetPanel) {
      targetPanel.classList.add('active');
      targetPanel.style.visibility = 'visible';
      targetPanel.style.position = 'relative';
      // 强制重绘，确保过渡动画触发
      void targetPanel.offsetHeight;
    } else {
      console.warn('[Navigation] 面板不存在: #panel-' + viewId);
    }

    // 隐藏标题界面 + 封面轮播
    var titleScreen = document.getElementById('title-screen');
    if (titleScreen && !titleScreen.classList.contains('hidden')) {
      titleScreen.classList.add('hidden');
    }
    var cover = document.getElementById('cover-slideshow');
    if (cover) cover.classList.add('hidden');

    _currentViewId = viewId;
    _isNavigating = false;
  },

  /**
   * 重置导航状态（清档后回到标题界面时调用）
   * 清空 _currentViewId 防止清档后 navigateTo 因同视图早退而无法重新激活面板
   */
  reset() {
    _currentViewId = null;
    _isNavigating = false;
  },

  /**
   * 更新角标：检查新物品和新卡牌
   * 只有在有数据时显示角标，后续可扩展"新获得"标记逻辑
   */
  updateBadges() {
    if (!_sidebarEl) return;

    var state = AppState.get();
    if (!state) return;

    // 背包角标
    var invBadge = _sidebarEl.querySelector('[data-view="inventory"] .nav-badge');
    if (invBadge && state.inventory && state.inventory.length > 0) {
      invBadge.classList.remove('hidden');
    }

    // 伙伴角标（有已解锁伙伴时显示）
    var compBadge = _sidebarEl.querySelector('[data-view="companions"] .nav-badge');
    if (compBadge && state.companions) {
      var hasUnlocked = state.companions.some(function (c) { return c.unlocked; });
      if (hasUnlocked) {
        compBadge.classList.remove('hidden');
      }
    }
  }
};

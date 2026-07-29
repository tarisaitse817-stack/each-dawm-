/* ==========================================================================
   光之回响 (Echoes of Light) — App 应用入口
   ========================================================================== */

import { AppState } from './state.js';
import { StorageManager } from './storage.js';
import { Navigation } from './navigation.js';
import { Particles } from './particles.js';
import { TitleScreen } from './title.js';
import { EventPanel } from './event.js';

export const App = {

  /**
   * 应用初始化入口（异步）
   * 执行顺序：存档恢复 → 粒子 Canvas → 面板容器 → 侧边栏 → 标题 → 事件面板 → 订阅 → 图标 → 首屏
   */
  async init() {
    // 1. 检查并恢复存档
    if (StorageManager.hasSave()) {
      var saveData = StorageManager.load();
      if (saveData) {
        var currentState = AppState.get();
        Object.keys(saveData).forEach(function (key) {
          if (key !== 'timestamp' && currentState[key] !== undefined) {
            AppState.set(key, saveData[key]);
          }
        });
      }
    }

    // 2. 初始化粒子系统（Canvas 占位 + CSS 驱动环境粒子）
    this.initParticlesCanvas();
    Particles.init();

    // 3. 渲染主面板容器（各模块的 render() 后续注入内容到对应面板）
    this.renderPanels();

    // 4. 初始化侧边栏导航
    Navigation.init();

    // 5. 初始化标题界面
    TitleScreen.init();

    // 6. 初始化事件对话面板
    EventPanel.init();

    // 7. 注册视图切换订阅 — 其他模块通过 AppState.set('currentView', id) 触发导航
    AppState.subscribe('currentView', function (newView) {
      if (newView && newView !== 'title') {
        Navigation.navigateTo(newView);
      }
    });

    // 8. 渲染全页 Lucide 图标（侧边栏 + 面板内的图标）
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 9. 判断首屏：有存档则进入事件视图，无存档则显示标题界面
    var titleScreen = document.getElementById('title-screen');
    if (StorageManager.hasSave()) {
      if (titleScreen) {
        titleScreen.classList.add('hidden');
      }
      Navigation.navigateTo('event');
      Navigation.updateBadges();
    } else {
      // 无存档：标题界面可见（默认即为可见，无需额外操作）
      // 确保所有面板保持隐藏
      if (titleScreen) {
        titleScreen.classList.remove('hidden');
      }
    }
  },

  /**
   * 渲染主内容区的视图面板容器
   * 创建 5 个面板占位，后续由各功能模块的 render() 方法填充内容
   */
  renderPanels() {
    var mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[App] #main-content 元素不存在');
      return;
    }

    // 防止重复创建
    if (mainContent.querySelector('.view-panel')) return;

    var viewIds = ['event', 'inventory', 'deck', 'companions', 'map'];
    var viewNames = ['事件', '背包', '卡组', '伙伴', '地图'];

    viewIds.forEach(function (id, index) {
      var panel = document.createElement('div');
      panel.id = 'panel-' + id;
      panel.className = 'view-panel';

      // 占位提示 — 后续由各模块 render() 覆盖
      panel.innerHTML =
        '<div style="padding:2rem;text-align:center;color:#666;font-family:var(--font-ui);font-size:0.9rem;margin-top:4rem;">' +
        '&#8212; ' + viewNames[index] + ' &#8212;<br>' +
        '<span style="font-size:0.75rem;color:#444;">模块加载中…</span></div>';

      mainContent.appendChild(panel);
    });
  },

  /**
   * 初始化粒子 Canvas（占位方法 — Task 14 实现完整粒子系统）
   */
  initParticlesCanvas() {
    var canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
  }
};

// 应用启动
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});

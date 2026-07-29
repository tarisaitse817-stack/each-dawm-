/* ==========================================================================
   光之回响 (Echoes of Light) — App 应用入口
   设置面板 + 右键菜单 + 键盘快捷键 + 全模块集成
   ========================================================================== */

import { AppState } from './state.js';
import { StorageManager } from './storage.js';
import { Navigation } from './navigation.js';
import { Particles } from './particles.js';
import { TitleScreen } from './title.js';
import { EventPanel } from './event.js';
import { BattleStage } from './battle.js';
import { DeckPanel } from './deck.js';
import { CompanionsPanel } from './companions.js';
import { InventoryPanel } from './inventory.js';
import { MapPanel } from './map.js';
import { Notifications } from './notifications.js';

export const App = {

  /* ---- 内部状态 ---- */
  _settingsVisible: false,
  _currentContextCardId: null,
  _currentContextType: null,

  /* ======================================================================
     init — 应用初始化入口（异步）
     执行顺序：存档恢复 → 粒子 → 面板容器 → 导航 → 设置面板 → 右键菜单 → 键盘快捷键 →
     标题 → 事件 → 对战 → 卡组 → 伙伴 → 背包 → 地图 → 订阅 → 图标 → 首屏
     ====================================================================== */
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

    // 2. 初始化粒子系统
    this.initParticlesCanvas();
    Particles.init();

    // 3. 渲染主面板容器
    this.renderPanels();

    // 4. 初始化侧边栏导航
    Navigation.init();

    // 5. 渲染设置面板 HTML
    this._renderSettingsModal();

    // 6. 绑定设置面板事件
    this._initSettingsEvents();

    // 7. 初始化自定义右键菜单
    this._initContextMenu();

    // 8. 初始化键盘快捷键
    this._initKeyboardShortcuts();

    // 9. 绑定导航栏设置按钮
    this._wireSettingsButton();

    // 10. 初始化标题界面
    TitleScreen.init();

    // 11. 初始化事件对话面板
    EventPanel.init();

    // 12. 初始化对战舞台
    BattleStage.init();

    // 13. 初始化卡组编辑面板
    DeckPanel.init();

    // 14. 初始化伙伴面板
    CompanionsPanel.init();

    // 15. 初始化背包面板
    InventoryPanel.init();

    // 16. 初始化地图面板
    MapPanel.init();

    // 17. 注册视图切换订阅
    AppState.subscribe('currentView', function (newView) {
      if (newView && newView !== 'title') {
        Navigation.navigateTo(newView);
      }
    });

    // 18. 渲染全页 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 19. 判断首屏
    var titleScreen = document.getElementById('title-screen');
    if (StorageManager.hasSave()) {
      if (titleScreen) {
        titleScreen.classList.add('hidden');
      }
      Navigation.navigateTo('event');
      Navigation.updateBadges();
    } else {
      if (titleScreen) {
        titleScreen.classList.remove('hidden');
      }
    }
  },

  /* ======================================================================
     renderPanels — 渲染主内容区的视图面板容器
     ====================================================================== */
  renderPanels() {
    var mainContent = document.getElementById('main-content');
    if (!mainContent) {
      console.error('[App] #main-content 元素不存在');
      return;
    }

    if (mainContent.querySelector('.view-panel')) return;

    var viewIds = ['event', 'inventory', 'deck', 'companions', 'map'];
    var viewNames = ['事件', '背包', '卡组', '伙伴', '地图'];

    viewIds.forEach(function (id, index) {
      var panel = document.createElement('div');
      panel.id = 'panel-' + id;
      panel.className = 'view-panel';

      panel.innerHTML =
        '<div style="padding:2rem;text-align:center;color:#666;font-family:var(--font-ui);font-size:0.9rem;margin-top:4rem;">' +
        '&#8212; ' + viewNames[index] + ' &#8212;<br>' +
        '<span style="font-size:0.75rem;color:#444;">模块加载中…</span></div>';

      mainContent.appendChild(panel);
    });
  },

  /* ======================================================================
     initParticlesCanvas — 初始化粒子 Canvas
     ====================================================================== */
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
  },

  /* ======================================================================
     ====================== 设置面板 ======================================
     ====================================================================== */

  /**
   * _renderSettingsModal — 渲染设置面板 HTML 到 #settings-modal
   */
  _renderSettingsModal: function () {
    var modal = document.getElementById('settings-modal');
    if (!modal) return;

    var settings = AppState.get('settings');

    // 将 0-1 值转为 0-100
    var bgmVal = Math.round((settings.bgmVolume || 0.7) * 100);
    var sfxVal = Math.round((settings.sfxVolume || 0.8) * 100);

    // 文本速度映射
    var textSpeedOptions = [
      { value: 'slow', label: '慢' },
      { value: 'normal', label: '正常' },
      { value: 'fast', label: '快' }
    ];

    // 动画强度映射
    var animOptions = [
      { value: 'minimal', label: '简约' },
      { value: 'standard', label: '标准' },
      { value: 'lavish', label: '华丽' }
    ];

    // 卡牌动画速度映射
    var cardAnimOptions = [
      { value: 'normal', label: '正常' },
      { value: 'fast', label: '快速' },
      { value: 'skip', label: '跳过' }
    ];

    function buildOptions(options, selectedValue) {
      var html = '';
      for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var selected = opt.value === selectedValue ? ' selected' : '';
        html += '<option value="' + opt.value + '"' + selected + '>' + opt.label + '</option>';
      }
      return html;
    }

    modal.innerHTML =
      '<div class="settings-panel">' +
        '<button class="settings-close" id="settings-close-btn" aria-label="关闭设置" onclick="window.App.closeSettings()">' +
          '<i data-lucide="x" style="width:18px;height:18px;"></i>' +
        '</button>' +
        '<h2 class="settings-title">设置</h2>' +
        '<div class="settings-body">' +

          /* 文本速度 */
          '<div class="settings-row">' +
            '<label for="setting-text-speed">文本速度</label>' +
            '<select id="setting-text-speed">' +
              buildOptions(textSpeedOptions, settings.textSpeed || 'normal') +
            '</select>' +
          '</div>' +

          /* 动画强度 */
          '<div class="settings-row">' +
            '<label for="setting-anim-intensity">动画强度</label>' +
            '<select id="setting-anim-intensity">' +
              buildOptions(animOptions, settings.animationIntensity || 'standard') +
            '</select>' +
          '</div>' +

          /* 背景音乐音量 */
          '<div class="settings-row">' +
            '<label for="setting-bgm-volume">背景音乐音量</label>' +
            '<div style="display:flex;align-items:center;">' +
              '<input type="range" id="setting-bgm-volume" min="0" max="100" value="' + bgmVal + '">' +
              '<span class="settings-range-value" id="setting-bgm-value">' + bgmVal + '</span>' +
            '</div>' +
          '</div>' +

          /* 音效音量 */
          '<div class="settings-row">' +
            '<label for="setting-sfx-volume">音效音量</label>' +
            '<div style="display:flex;align-items:center;">' +
              '<input type="range" id="setting-sfx-volume" min="0" max="100" value="' + sfxVal + '">' +
              '<span class="settings-range-value" id="setting-sfx-value">' + sfxVal + '</span>' +
            '</div>' +
          '</div>' +

          /* 卡牌动画速度 */
          '<div class="settings-row">' +
            '<label for="setting-card-anim-speed">卡牌动画速度</label>' +
            '<select id="setting-card-anim-speed">' +
              buildOptions(cardAnimOptions, settings.cardAnimSpeed || 'normal') +
            '</select>' +
          '</div>' +

          /* 分割线 */
          '<div class="settings-divider"></div>' +

          /* 清除存档 */
          '<div id="settings-clear-area">' +
            '<button id="settings-clear-btn" class="settings-clear-btn">清除存档</button>' +
            '<div id="settings-clear-confirm" class="settings-clear-confirm hidden">' +
              '<p>确定要清除所有存档吗？此操作不可撤销。</p>' +
              '<div class="settings-confirm-actions">' +
                '<button id="settings-confirm-yes" class="btn-danger">确认清除</button>' +
                '<button id="settings-confirm-no" class="btn-secondary">取消</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    // 渲染模态框内的 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: modal });
    }
  },

  /**
   * openSettings — 打开设置面板
   */
  openSettings: function () {
    if (this._settingsVisible) return;

    // 关闭可能已打开的右键菜单
    this._hideContextMenu();

    var modal = document.getElementById('settings-modal');
    if (!modal) return;

    // 重新填充表单（确保与最新状态同步）
    this._loadSettingsIntoForm();

    // 重置清除存档确认状态
    var clearBtn = document.getElementById('settings-clear-btn');
    var confirmArea = document.getElementById('settings-clear-confirm');
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (confirmArea) confirmArea.classList.add('hidden');

    modal.classList.remove('hidden', 'closing');
    this._settingsVisible = true;

    // 渲染图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: modal });
    }
  },

  /**
   * closeSettings — 关闭设置面板
   */
  closeSettings: function () {
    var modal = document.getElementById('settings-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    modal.classList.add('closing');
    var self = this;
    setTimeout(function () {
      modal.classList.add('hidden');
      modal.classList.remove('closing');
      self._settingsVisible = false;
    }, 150);
  },

  /**
   * _loadSettingsIntoForm — 将 AppState 中的设置填充到表单
   */
  _loadSettingsIntoForm: function () {
    var settings = AppState.get('settings');

    var textSpeedEl = document.getElementById('setting-text-speed');
    var animEl = document.getElementById('setting-anim-intensity');
    var bgmEl = document.getElementById('setting-bgm-volume');
    var sfxEl = document.getElementById('setting-sfx-volume');
    var cardAnimEl = document.getElementById('setting-card-anim-speed');

    if (textSpeedEl) textSpeedEl.value = settings.textSpeed || 'normal';
    if (animEl) animEl.value = settings.animationIntensity || 'standard';
    if (bgmEl) {
      bgmEl.value = Math.round((settings.bgmVolume || 0.7) * 100);
      var bgmVal = document.getElementById('setting-bgm-value');
      if (bgmVal) bgmVal.textContent = bgmEl.value;
    }
    if (sfxEl) {
      sfxEl.value = Math.round((settings.sfxVolume || 0.8) * 100);
      var sfxVal = document.getElementById('setting-sfx-value');
      if (sfxVal) sfxVal.textContent = sfxEl.value;
    }
    if (cardAnimEl) cardAnimEl.value = settings.cardAnimSpeed || 'normal';
  },

  /**
   * _initSettingsEvents — 绑定设置面板表单事件
   */
  _initSettingsEvents: function () {
    var self = this;
    var modal = document.getElementById('settings-modal');
    if (!modal) return;

    // ---- 关闭按钮 ----
    modal.addEventListener('click', function (e) {
      // 点击遮罩关闭
      if (e.target === modal) {
        self.closeSettings();
        return;
      }

      // 关闭按钮
      if (e.target.closest('#settings-close-btn')) {
        self.closeSettings();
        return;
      }
    });

    // ---- select 变更 ----
    modal.addEventListener('change', function (e) {
      var target = e.target;
      var settings = AppState.get('settings');
      var changed = false;

      if (target.id === 'setting-text-speed') {
        settings.textSpeed = target.value;
        changed = true;
      } else if (target.id === 'setting-anim-intensity') {
        settings.animationIntensity = target.value;
        changed = true;
      } else if (target.id === 'setting-card-anim-speed') {
        settings.cardAnimSpeed = target.value;
        changed = true;
      }

      if (changed) {
        AppState.set('settings', settings);
        var fullState = AppState.get();
        StorageManager.save(fullState);
      }
    });

    // ---- range 滑块输入（实时更新 + 存储） ----
    modal.addEventListener('input', function (e) {
      var target = e.target;
      if (target.type !== 'range') return;

      var settings = AppState.get('settings');
      var value = parseInt(target.value, 10);

      if (target.id === 'setting-bgm-volume') {
        settings.bgmVolume = value / 100;
        var bgmLabel = document.getElementById('setting-bgm-value');
        if (bgmLabel) bgmLabel.textContent = value;
      } else if (target.id === 'setting-sfx-volume') {
        settings.sfxVolume = value / 100;
        var sfxLabel = document.getElementById('setting-sfx-value');
        if (sfxLabel) sfxLabel.textContent = value;
      }

      AppState.set('settings', settings);
      var fullState = AppState.get();
      StorageManager.save(fullState);
    });

    // ---- 清除存档按钮 ----
    modal.addEventListener('click', function (e) {
      if (e.target.id === 'settings-clear-btn') {
        var clearBtn = document.getElementById('settings-clear-btn');
        var confirmArea = document.getElementById('settings-clear-confirm');
        if (clearBtn) clearBtn.classList.add('hidden');
        if (confirmArea) confirmArea.classList.remove('hidden');
        return;
      }

      if (e.target.id === 'settings-confirm-no') {
        var clearBtn = document.getElementById('settings-clear-btn');
        var confirmArea = document.getElementById('settings-clear-confirm');
        if (clearBtn) clearBtn.classList.remove('hidden');
        if (confirmArea) confirmArea.classList.add('hidden');
        return;
      }

      if (e.target.id === 'settings-confirm-yes') {
        self._onClearSave();
        return;
      }
    });
  },

  /**
   * _onClearSave — 清除存档：清空 StorageManager + 重置 AppState + 返回标题界面
   */
  _onClearSave: function () {
    // 清除存档
    StorageManager.clear();
    AppState.reset();

    // 关闭设置面板
    this.closeSettings();

    // 隐藏所有面板，显示标题界面
    var panels = document.querySelectorAll('.view-panel');
    panels.forEach(function (p) {
      p.classList.remove('active');
    });

    var titleScreen = document.getElementById('title-screen');
    if (titleScreen) {
      titleScreen.classList.remove('hidden');
    }

    // 移除侧边栏 active 状态
    var navItems = document.querySelectorAll('#sidebar .nav-item');
    navItems.forEach(function (item) {
      item.classList.remove('active');
    });

    // 重新渲染全部面板（重置内容）
    this.renderPanels();

    // 重新初始化各面板
    EventPanel.init();
    DeckPanel.init();
    CompanionsPanel.init();
    InventoryPanel.init();
    MapPanel.init();

    // 更新 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 通知
    Notifications.show('success', '存档已清除', '所有游戏数据已重置', 2000);
  },

  /* ======================================================================
     ====================== 自定义右键菜单 ================================
     ====================================================================== */

  /**
   * _initContextMenu — 初始化全局自定义右键菜单
   */
  _initContextMenu: function () {
    var self = this;
    var contextMenuEl = document.getElementById('context-menu');
    if (!contextMenuEl) return;

    // ---- 关闭菜单：点击页面任意处 ----
    document.addEventListener('click', function (e) {
      var menu = document.getElementById('context-menu');
      if (!menu || !menu.classList.contains('active')) return;

      // 点击菜单内部不关闭（由菜单项处理）
      if (menu.contains(e.target)) return;

      self._hideContextMenu();
    });

    // ---- 关闭菜单：滚动 ----
    document.addEventListener('scroll', function () {
      self._hideContextMenu();
    }, true);

    // ---- 在卡组编辑界面拦截右键，显示自定义菜单 ----
    document.addEventListener('contextmenu', function (e) {
      var thumb = e.target.closest('.card-thumb');
      if (!thumb) return;

      // 仅在卡组面板编辑模式中触发生效
      var panel = e.target.closest('#panel-deck');
      if (!panel) return;

      var editView = panel.querySelector('[data-view="edit"]');
      if (!editView || !editView.classList.contains('active')) return;

      e.preventDefault();
      e.stopPropagation();

      var isDeckCard = !!thumb.closest('.deck-current-list');
      var cardId = thumb.dataset.cardId;

      self._showContextMenu(e.clientX, e.clientY, cardId, isDeckCard ? 'deck' : 'library');
    }, true); // capture phase — 在 deck.js 处理之前拦截
  },

  /**
   * _showContextMenu — 在指定位置显示右键菜单
   * @param {number} x - 鼠标 X 坐标
   * @param {number} y - 鼠标 Y 坐标
   * @param {string} cardId - 目标卡牌 ID
   * @param {'library'|'deck'} context - 卡牌来源
   */
  _showContextMenu: function (x, y, cardId, context) {
    this._currentContextCardId = cardId;
    this._currentContextType = context;

    var menu = document.getElementById('context-menu');
    if (!menu) return;

    // 构建菜单项
    var html = '';

    if (context === 'library') {
      html +=
        '<div class="context-item" data-action="context-show-detail" data-card-id="' + cardId + '">' +
          '<i data-lucide="info" class="context-item-icon"></i> 查看详情' +
        '</div>' +
        '<div class="context-item" data-action="context-add-to-deck" data-card-id="' + cardId + '">' +
          '<i data-lucide="plus-circle" class="context-item-icon"></i> 添加到卡组' +
        '</div>';
    } else if (context === 'deck') {
      html +=
        '<div class="context-item" data-action="context-show-detail" data-card-id="' + cardId + '">' +
          '<i data-lucide="info" class="context-item-icon"></i> 查看详情' +
        '</div>' +
        '<div class="context-item" data-action="context-remove-from-deck" data-card-id="' + cardId + '">' +
          '<i data-lucide="minus-circle" class="context-item-icon"></i> 从卡组移除' +
        '</div>';
    }

    html +=
      '<div class="context-divider"></div>' +
      '<div class="context-item" data-action="context-cancel">' +
        '取消' +
      '</div>';

    menu.innerHTML = html;

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: menu });
    }

    // 定位 — 确保不超出视口
    var rect = menu.getBoundingClientRect();
    var menuWidth = rect.width || 160;
    var menuHeight = rect.height || 120;

    var posX = Math.min(x, window.innerWidth - menuWidth - 8);
    var posY = Math.min(y, window.innerHeight - menuHeight - 8);

    menu.style.left = Math.max(8, posX) + 'px';
    menu.style.top = Math.max(8, posY) + 'px';

    // 显示菜单
    menu.classList.add('active');

    // 绑定菜单项事件
    var self = this;
    menu.querySelectorAll('.context-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var action = item.dataset.action;
        self._handleContextAction(action, item.dataset.cardId);
      });
    });
  },

  /**
   * _hideContextMenu — 隐藏右键菜单
   */
  _hideContextMenu: function () {
    var menu = document.getElementById('context-menu');
    if (menu) {
      menu.classList.remove('active');
      menu.innerHTML = '';
    }
    this._currentContextCardId = null;
    this._currentContextType = null;
  },

  /**
   * _handleContextAction — 处理右键菜单项点击
   * @param {string} action
   * @param {string} cardId
   */
  _handleContextAction: function (action, cardId) {
    this._hideContextMenu();

    switch (action) {
      case 'context-show-detail':
        // 调用 DeckPanel 的详情弹出方法
        if (typeof DeckPanel._showCardDetailByCardId === 'function' && cardId) {
          DeckPanel._showCardDetailByCardId(cardId);
        }
        break;

      case 'context-add-to-deck':
        if (cardId && typeof DeckPanel._addCardToDeck === 'function') {
          DeckPanel._addCardToDeck(cardId);
        }
        break;

      case 'context-remove-from-deck':
        if (cardId && typeof DeckPanel._removeCardFromDeck === 'function') {
          DeckPanel._removeCardFromDeck(cardId);
        }
        break;

      case 'context-cancel':
      default:
        // 仅关闭菜单
        break;
    }
  },

  /* ======================================================================
     ====================== 键盘快捷键 ====================================
     ====================================================================== */

  /**
   * _initKeyboardShortcuts — 初始化全局键盘快捷键
   */
  _initKeyboardShortcuts: function () {
    var self = this;

    document.addEventListener('keydown', function (e) {
      // Escape 键处理
      if (e.key === 'Escape') {
        // 1. 关闭设置面板
        if (self._settingsVisible) {
          self.closeSettings();
          e.preventDefault();
          return;
        }

        // 2. 关闭右键菜单
        var contextMenu = document.getElementById('context-menu');
        if (contextMenu && contextMenu.classList.contains('active')) {
          self._hideContextMenu();
          e.preventDefault();
          return;
        }

        // 3. 关闭对战舞台
        var battleOverlay = document.getElementById('battle-overlay');
        if (battleOverlay && battleOverlay.classList.contains('active')) {
          if (typeof BattleStage.hide === 'function') {
            BattleStage.hide();
          } else {
            battleOverlay.classList.remove('active');
          }
          e.preventDefault();
          return;
        }

        // 4. 关闭卡牌详情弹出框
        var detailPopup = document.getElementById('card-detail-popup');
        if (detailPopup) {
          if (typeof DeckPanel._hideCardDetail === 'function') {
            DeckPanel._hideCardDetail();
          }
          e.preventDefault();
          return;
        }
      }
    });
  },

  /* ======================================================================
     _wireSettingsButton — 绑定侧边栏设置按钮
     ====================================================================== */
  _wireSettingsButton: function () {
    var self = this;
    var navSettings = document.getElementById('nav-settings');
    if (navSettings) {
      navSettings.addEventListener('click', function (e) {
        self.openSettings();
      });
    }
  }
};

// 暴露到全局作用域，供其他模块（如 title.js）直接调用
window.App = App;

// 应用启动
document.addEventListener('DOMContentLoaded', function () {
  App.init();
});

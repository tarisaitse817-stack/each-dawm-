/* ==========================================================================
   光之回响 (Echoes of Light) — App 应用入口
   设置面板 + 键盘快捷键 + 全模块集成
   ========================================================================== */

import { AppState } from './state.js?v=40';
import { StorageManager } from './storage.js?v=40';
import { Navigation } from './navigation.js?v=40';
import { Particles } from './particles.js?v=40';
import { TitleScreen } from './title.js?v=40';
import { EventPanel } from './event.js?v=40';
import { AiClient, BattleBridge } from './ai.js?v=40';
import { CompanionsPanel } from './companions.js?v=40';
import { InventoryPanel } from './inventory.js?v=40';
import { SceneView } from './scene.js?v=40';
import { CloseupView } from './closeup.js?v=40';
import { Notifications } from './notifications.js?v=40';

export const App = {

  /* ---- 内部状态 ---- */
  _settingsVisible: false,
  _bgm: null,
  _bgmTitle: null,
  _bgmGame: null,
  _bgmStarted: false,
  _bgmCurrent: 'title',
  _timeEl: null,

  /* ======================================================================
     init — 应用初始化入口（异步）
     执行顺序：存档恢复 → 粒子 → 面板容器 → 导航 → 设置面板 → 键盘快捷键 →
     标题 → 事件 → 伙伴 → 背包 → 场景 → 特写 → 订阅 → 图标 → 首屏
     ====================================================================== */
  async init() {
    // 0. 初始化 BGM（splash 已在 HTML 中，由内联脚本控制）
    this._initBgm();

    // 0.5. splash 结束时尝试播放 BGM
    var self = this;
    if (window.__splashDone) {
      self._tryPlayBgm();
    } else {
      window.addEventListener('splashdone', function () {
        self._tryPlayBgm();
      }, { once: true });
    }

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

    // 7. 初始化键盘快捷键
    this._initKeyboardShortcuts();

    // 9. 绑定导航栏设置按钮
    this._wireSettingsButton();

    // 10. 初始化标题界面
    TitleScreen.init();

    // 11. 事件对话引擎懒初始化：首次打开特写（closeup-open）时渲染
    // 12. 对战由 MDPro3 处理
    // 13. 卡组由玩家在 MDPro3 中设定

    // 14. 初始化伙伴面板
    CompanionsPanel.init();

    // 15. 初始化背包面板 —— 背包 UI 已隐藏（用户要求，只藏 UI 不动数据层），
    //     inventory 数据仍随状态保存/参与 AI game_state
    // InventoryPanel.init();

    // 16. 初始化场景视图
    SceneView.init();

    // 16.6 初始化近景特写层
    CloseupView.init();

    // 16.7 监听场景立绘点击 → 打开特写层（首次打开时懒初始化对话引擎）
    //      characterId 为空 = 环境模式（无人场景进入对话，仅背景+对话区）
    window.addEventListener('closeup-open', function (e) {
      var detail = e.detail || {};
      if (detail.characterId) {
        CloseupView.open(detail.characterId);
      } else {
        CloseupView.openScene(detail.sceneName || '');
      }
      EventPanel.init();
    });

    // 17. 注册视图切换订阅（进入游戏视图时显示右上角时间戳；标题界面隐藏）
    var self2 = this;
    AppState.subscribe('currentView', function (newView) {
      if (newView && newView !== 'title') {
        Navigation.navigateTo(newView);
        self2.updateTimeDisplay();
      }
    });

    // 18. 渲染全页 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 19. 始终显示标题界面（有存档时显示"继续冒险"按钮）
    TitleScreen.show();

    // 20. 初始化时间显示引用（用户要求：标题界面不显示时间戳，
    //     进入游戏时由 currentView 订阅触发显示）
    this._timeEl = document.getElementById('time-display');
    // this.updateTimeDisplay();

    // 21. SillyTavern AI 聊天集成（异步，不阻塞启动）
    this._initSillytavern();
  },

  /* ======================================================================
     _initSillytavern — SillyTavern Web 集成
     初始化 IndexedDB 数据层 → 继承游戏 AI 设置 → 世界书种子导入 →
     侧边栏追加「AI 聊天」入口
     ====================================================================== */
  async _initSillytavern() {
    try {
      var storeMod = await import('./sillytavern/store.js?v=40');
      var uiMod = await import('./sillytavern/ui/index.js?v=40');
      var seedMod = await import('./sillytavern/seed.js?v=40');
      var store = storeMod.sillytavernStore;
      await store.loadAll();

      // 继承游戏 AI 设置（ST 未配置 API Key 时）
      var gameSettings = AppState.get().settings || {};
      var stSettings = store.settings;
      if (stSettings && !stSettings.api.apiKey && gameSettings.aiApiKey) {
        await store.updateSettings({
          api: {
            ...stSettings.api,
            apiKey: gameSettings.aiApiKey,
            baseUrl: gameSettings.aiEndpoint || stSettings.api.baseUrl,
            model: gameSettings.aiModel || stSettings.api.model
          }
        });
      }

      // 首次启动导入世界书种子（data/worldbook.json → IndexedDB）
      var seeded = await seedMod.seedWorldbookIfEmpty();
      if (seeded) await store.loadAll(); // 刷新 lorebooks 列表

      // 侧边栏入口：插到设置按钮上方
      var sidebar = document.getElementById('sidebar');
      var settingsItem = document.getElementById('nav-settings');
      if (sidebar && settingsItem) {
        var chatItem = document.createElement('div');
        chatItem.className = 'nav-item';
        chatItem.id = 'nav-st-chat';
        chatItem.innerHTML =
          '<i data-lucide="message-circle" class="nav-icon"></i>' +
          '<span class="nav-label">AI 聊天</span>';
        chatItem.addEventListener('click', function () {
          uiMod.openChatModal();
        });
        sidebar.insertBefore(chatItem, settingsItem);
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
          lucide.createIcons();
        }
      }
    } catch (err) {
      console.error('[sillytavern] 初始化失败:', err);
    }
  },

  /* ======================================================================
     advanceTime — 推进游戏时间（每次行动调用）
     ====================================================================== */
  advanceTime: function (minutes) {
    if (!minutes) minutes = 20 + Math.floor(Math.random() * 40); // 20-60 minutes
    var t = AppState.get('gameTime');
    if (!t) return;

    t.minute += minutes;
    while (t.minute >= 60) { t.minute -= 60; t.hour += 1; }
    while (t.hour >= 24) {
      t.hour -= 24;
      t.day += 1;
      t.weekday = t.weekday >= 7 ? 1 : t.weekday + 1;
    }
    AppState.set('gameTime', t);
    window.dispatchEvent(new CustomEvent('game-time-advanced'));
    this.updateTimeDisplay();
  },

  /* ======================================================================
     updateTimeDisplay — 刷新左上角时间显示
     ====================================================================== */
  updateTimeDisplay: function () {
    if (!this._timeEl) this._timeEl = document.getElementById('time-display');
    var el = this._timeEl;
    if (!el) return;

    var t = AppState.get('gameTime');
    if (!t) t = { day: 1, weekday: 1, hour: 8, minute: 0 };

    var weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    var period;
    var h = t.hour;
    if (h >= 6 && h < 8) period = '清晨';
    else if (h >= 8 && h < 12) period = '上午';
    else if (h >= 12 && h < 14) period = '中午';
    else if (h >= 14 && h < 18) period = '下午';
    else if (h >= 18 && h < 20) period = '傍晚';
    else if (h >= 20 && h < 23) period = '晚上';
    else period = '深夜';

    var hh = t.hour < 10 ? '0' + t.hour : '' + t.hour;
    var mm = t.minute < 10 ? '0' + t.minute : '' + t.minute;

    el.innerHTML = '☀ ' + weekdays[t.weekday - 1] + ' ' + period + ' ' + hh + ':' + mm + '  Day ' + t.day;
    el.classList.remove('hidden');
  },

  /* ======================================================================
     _initBgm — 初始化背景音乐（预加载标题 + 游戏双轨）
     ====================================================================== */
  _initBgm: function () {
    var self = this;
    var vol = (AppState.get('settings').bgmVolume !== undefined)
      ? AppState.get('settings').bgmVolume
      : 0.7;

    // 标题画面 BGM（延迟加载，不阻塞页面）
    var titleAudio = new Audio('assets/bgm/dashing-and-bashing.mp3');
    titleAudio.loop = true;
    titleAudio.volume = vol;
    titleAudio.preload = 'none';
    this._bgmTitle = titleAudio;

    // 默认使用标题 BGM
    this._bgm = titleAudio;

    // 浏览器自动播放限制：首次用户交互时兜底启动
    function fallbackPlay() {
      if (!self._bgmStarted && self._bgm) {
        self._bgm.play().then(function () {
          self._bgmStarted = true;
        }).catch(function () {});
      }
    }
    document.addEventListener('click', fallbackPlay, { once: true });
    document.addEventListener('keydown', fallbackPlay, { once: true });
  },

  /* ======================================================================
     switchBgm — 切换 BGM 曲目
     @param {'title'|'game'} track
     ====================================================================== */
  switchBgm: function (track) {
    if (track === this._bgmCurrent) return;
    var self = this;

    var current = this._bgm;
    var next = track === 'title' ? this._bgmTitle : this._bgmGame;

    if (!next) return;

    // 交叉淡入淡出
    if (current && this._bgmStarted) {
      // 淡出当前
      var fadeOut = setInterval(function () {
        if (current.volume > 0.02) {
          current.volume = Math.max(0, current.volume - 0.03);
        } else {
          clearInterval(fadeOut);
          current.pause();
          current.currentTime = 0;
          current.volume = self._getStoredVolume();
        }
      }, 30);

      // 淡入新曲
      next.volume = 0;
      next.play().then(function () {
        self._bgmStarted = true;
        var fadeIn = setInterval(function () {
          var target = self._getStoredVolume();
          if (next.volume < target - 0.02) {
            next.volume = Math.min(target, next.volume + 0.03);
          } else {
            clearInterval(fadeIn);
            next.volume = target;
          }
        }, 30);
      }).catch(function () {});
    } else {
      next.volume = this._getStoredVolume();
      next.play().then(function () {
        self._bgmStarted = true;
      }).catch(function () {});
    }

    this._bgm = next;
    this._bgmCurrent = track;
  },

  /* ======================================================================
     _getStoredVolume — 读取存储的音量设置
     ====================================================================== */
  _getStoredVolume: function () {
    return (AppState.get('settings').bgmVolume !== undefined)
      ? AppState.get('settings').bgmVolume
      : 0.7;
  },

  /* ======================================================================
     _refreshTokenStats — 刷新设置面板中的 token 统计显示
     ====================================================================== */
  _refreshTokenStats: function () {
    var stats = AppState.get('tokenStats') || { promptTokens: 0, completionTokens: 0, totalTokens: 0, turns: 0 };
    var turns = stats.turns || 0;

    var elTurns = document.getElementById('stat-turns');
    var elAvgPrompt = document.getElementById('stat-avg-prompt');
    var elAvgCompletion = document.getElementById('stat-avg-completion');
    var elAvgTotal = document.getElementById('stat-avg-total');
    var elCumulative = document.getElementById('stat-cumulative');

    if (elTurns) elTurns.textContent = turns;

    if (turns > 0) {
      var avgPrompt = Math.round(stats.promptTokens / turns);
      var avgCompletion = Math.round(stats.completionTokens / turns);
      var avgTotal = Math.round(stats.totalTokens / turns);
      if (elAvgPrompt) elAvgPrompt.textContent = avgPrompt.toLocaleString();
      if (elAvgCompletion) elAvgCompletion.textContent = avgCompletion.toLocaleString();
      if (elAvgTotal) elAvgTotal.textContent = avgTotal.toLocaleString();
    } else {
      if (elAvgPrompt) elAvgPrompt.textContent = '—';
      if (elAvgCompletion) elAvgCompletion.textContent = '—';
      if (elAvgTotal) elAvgTotal.textContent = '—';
    }

    if (elCumulative) elCumulative.textContent = (stats.totalTokens || 0).toLocaleString();
  },

  /* ======================================================================
     _tryPlayBgm — 尝试播放 BGM（可能被浏览器拦截）
     ====================================================================== */
  _tryPlayBgm: function () {
    if (!this._bgm || this._bgmStarted) return;
    var self = this;
    this._bgm.play().then(function () {
      self._bgmStarted = true;
    }).catch(function () {
      // 浏览器拦截 — 等待用户交互兜底
    });
  },

  /* ======================================================================
     stopBgm — 停止 BGM（离开标题界面时调用）
     ====================================================================== */
  stopBgm: function () {
    if (this._bgm) {
      this._bgm.pause();
      this._bgm.currentTime = 0;
    }
    if (this._bgmTitle) {
      this._bgmTitle.pause();
      this._bgmTitle.currentTime = 0;
    }
    if (this._bgmGame) {
      this._bgmGame.pause();
      this._bgmGame.currentTime = 0;
    }
    this._bgmStarted = false;
    this._bgmCurrent = 'title';
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

    var viewIds = ['scene', 'companions']; // 背包面板已隐藏
    var viewNames = ['场景', '伙伴'];

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

          /* AI 配置 */
          '<div class="settings-section-title">AI 叙事引擎</div>' +
          '<div class="settings-row">' +
            '<label for="setting-ai-enabled">启用 AI 叙事</label>' +
            '<input type="checkbox" id="setting-ai-enabled" ' + (settings.aiEnabled !== false ? 'checked' : '') + '>' +
          '</div>' +
          '<div class="settings-row">' +
            '<label for="setting-ai-endpoint">API 端点</label>' +
            '<input type="text" id="setting-ai-endpoint" value="' + (settings.aiEndpoint || 'http://localhost:9999') + '" placeholder="http://localhost:9999">' +
          '</div>' +
          '<div class="settings-row">' +
            '<label for="setting-ai-apikey">API Key</label>' +
            '<input type="password" id="setting-ai-apikey" value="' + (settings.aiApiKey || '') + '" placeholder="sk-...">' +
          '</div>' +
          '<div class="settings-row">' +
            '<label for="setting-ai-model">模型</label>' +
            '<div style="display:flex;align-items:center;gap:8px;flex:1;">' +
              '<input type="text" id="setting-ai-model" value="' + (settings.aiModel || 'deepseek-chat') + '" placeholder="deepseek-chat" style="flex:1;">' +
              '<button id="setting-fetch-models" class="settings-fetch-btn" title="从 API 获取可用模型">获取模型</button>' +
            '</div>' +
          '</div>' +
          '<div class="settings-row hidden" id="settings-models-row">' +
            '<label for="setting-ai-model-select">选择模型</label>' +
            '<select id="setting-ai-model-select" style="flex:1;"></select>' +
          '</div>' +
          '<div class="settings-row">' +
            '<label for="setting-mdpro3-deck">MDPro3 卡组</label>' +
            '<input type="text" id="setting-mdpro3-deck" value="' + (settings.mdpro3Deck || 'PlayerInsect') + '" placeholder="PlayerInsect">' +
          '</div>' +
          '<div class="settings-row" id="ai-status-row">' +
            '<span>AI Bridge 状态</span>' +
            '<span class="ai-status-dot offline" id="ai-status-dot"></span> <span id="ai-status-text">未检测</span>' +
            '<button id="setting-ai-test" class="settings-test-btn" style="margin-left:8px;padding:4px 12px;border-radius:6px;border:1px solid var(--color-spirit);background:transparent;color:var(--color-spirit);cursor:pointer;">测试连接</button>' +
          '</div>' +

          /* Token 统计 */
          '<div class="settings-section-title">Token 用量统计</div>' +
          '<div class="token-stats" id="token-stats">' +
            '<div class="token-stat-row"><span class="token-stat-label">AI 对话轮数</span><span class="token-stat-value" id="stat-turns">0</span></div>' +
            '<div class="token-stat-row"><span class="token-stat-label">平均 Prompt Tokens</span><span class="token-stat-value" id="stat-avg-prompt">—</span></div>' +
            '<div class="token-stat-row"><span class="token-stat-label">平均 Completion Tokens</span><span class="token-stat-value" id="stat-avg-completion">—</span></div>' +
            '<div class="token-stat-row"><span class="token-stat-label">平均 总 Tokens / 轮</span><span class="token-stat-value" id="stat-avg-total">—</span></div>' +
            '<div class="token-stat-divider"></div>' +
            '<div class="token-stat-row"><span class="token-stat-label">累计 Tokens</span><span class="token-stat-value" id="stat-cumulative">0</span></div>' +
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

    var modal = document.getElementById('settings-modal');
    if (!modal) return;

    // 重新填充表单（确保与最新状态同步）
    this._loadSettingsIntoForm();

    // 重置清除存档确认状态
    var clearBtn = document.getElementById('settings-clear-btn');
    var confirmArea = document.getElementById('settings-clear-confirm');
    if (clearBtn) clearBtn.classList.remove('hidden');
    if (confirmArea) confirmArea.classList.add('hidden');

    // 刷新 token 统计
    this._refreshTokenStats();

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

    var aiEnabledEl = document.getElementById('setting-ai-enabled');
    if (aiEnabledEl) aiEnabledEl.checked = settings.aiEnabled !== false;
    var aiEndpointEl = document.getElementById('setting-ai-endpoint');
    if (aiEndpointEl) aiEndpointEl.value = settings.aiEndpoint || 'http://localhost:9999';
    var aiApiKeyEl = document.getElementById('setting-ai-apikey');
    if (aiApiKeyEl) aiApiKeyEl.value = settings.aiApiKey || '';
    var aiModelEl = document.getElementById('setting-ai-model');
    if (aiModelEl) aiModelEl.value = settings.aiModel || 'deepseek-chat';
    var mdpro3DeckEl = document.getElementById('setting-mdpro3-deck');
    if (mdpro3DeckEl) mdpro3DeckEl.value = settings.mdpro3Deck || 'PlayerInsect';
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
      } else if (target.id === 'setting-ai-endpoint') {
        settings.aiEndpoint = target.value;
        changed = true;
      } else if (target.id === 'setting-ai-model') {
        settings.aiModel = target.value;
        changed = true;
      } else if (target.id === 'setting-mdpro3-deck') {
        settings.mdpro3Deck = target.value;
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
        if (self._bgm) { self._bgm.volume = value / 100; }
        if (self._bgmTitle) { self._bgmTitle.volume = value / 100; }
        if (self._bgmGame) { self._bgmGame.volume = value / 100; }
      } else if (target.id === 'setting-sfx-volume') {
        settings.sfxVolume = value / 100;
        var sfxLabel = document.getElementById('setting-sfx-value');
        if (sfxLabel) sfxLabel.textContent = value;
      }

      AppState.set('settings', settings);
      var fullState = AppState.get();
      StorageManager.save(fullState);
    });

    // ---- AI checkbox & input ----
    modal.addEventListener('change', function (e) {
      if (e.target.id === 'setting-ai-enabled') {
        var s = AppState.get('settings');
        s.aiEnabled = e.target.checked;
        AppState.set('settings', s);
        StorageManager.save(AppState.get());
      }
    });
    modal.addEventListener('input', function (e) {
      if (e.target.id === 'setting-ai-apikey') {
        var s = AppState.get('settings');
        s.aiApiKey = e.target.value;
        AppState.set('settings', s);
        StorageManager.save(AppState.get());
      }
    });

    // ---- AI 获取模型列表 ----
    modal.addEventListener('click', async function (e) {
      if (e.target.id === 'setting-fetch-models') {
        e.preventDefault();
        var btn = e.target;
        var apiKeyEl = document.getElementById('setting-ai-apikey');
        var endpointEl = document.getElementById('setting-ai-endpoint');
        var key = (apiKeyEl ? apiKeyEl.value : '').trim();
        var ep = (endpointEl ? endpointEl.value : '').trim();

        if (!ep || !key) {
          alert('请先填写 API 端点和 API Key');
          return;
        }

        btn.textContent = '获取中…';
        btn.disabled = true;

        try {
          var resp = await fetch('http://localhost:9999/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key, endpoint: ep })
          });
          var data = await resp.json();

          var selectEl = document.getElementById('setting-ai-model-select');
          var selectRow = document.getElementById('settings-models-row');
          var textInput = document.getElementById('setting-ai-model');

          if (data.ok && data.models && data.models.length > 0) {
            selectEl.innerHTML = '';
            data.models.forEach(function (m) {
              var opt = document.createElement('option');
              opt.value = m;
              opt.textContent = m;
              if (m === textInput.value) opt.selected = true;
              selectEl.appendChild(opt);
            });
            selectRow.classList.remove('hidden');
            // 如果当前输入不在列表中，添加一个选项
            if (textInput.value && !data.models.includes(textInput.value)) {
              var customOpt = document.createElement('option');
              customOpt.value = textInput.value;
              customOpt.textContent = textInput.value + ' (自定义)';
              customOpt.selected = true;
              selectEl.insertBefore(customOpt, selectEl.firstChild);
            }
          } else {
            alert('获取模型失败: ' + (data.message || '未知错误'));
          }
        } catch (err) {
          alert('无法连接桥接服务器 (localhost:9999)，请确保 bridge.py 正在运行');
        }

        btn.textContent = '获取模型';
        btn.disabled = false;
      }
    });

    // ---- 模型下拉选择同步到文本输入 ----
    modal.addEventListener('change', function (e) {
      if (e.target.id === 'setting-ai-model-select') {
        var textInput = document.getElementById('setting-ai-model');
        if (textInput) {
          textInput.value = e.target.value;
          // 触发 change 事件以保存设置
          var evt = new Event('change', { bubbles: true });
          textInput.dispatchEvent(evt);
        }
      }
    });

    // ---- AI 测试连接 ----
    modal.addEventListener('click', async function (e) {
      if (e.target.id === 'setting-ai-test') {
        var btn = e.target;
        btn.textContent = '检测中…'; btn.disabled = true;
        var result = await AiClient.health();
        var dot = document.getElementById('ai-status-dot');
        var text = document.getElementById('ai-status-text');
        if (result && result.ok) {
          if (dot) dot.className = 'ai-status-dot online';
          if (text) text.textContent = '已连接 (' + (result.decks ? result.decks.length + '卡组' : 'OK') + ')';
        } else {
          if (dot) dot.className = 'ai-status-dot offline';
          if (text) text.textContent = '未连接';
        }
        btn.textContent = '测试连接'; btn.disabled = false;
      }
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

    TitleScreen.show();

    // 移除侧边栏 active 状态
    var navItems = document.querySelectorAll('#sidebar .nav-item');
    navItems.forEach(function (item) {
      item.classList.remove('active');
    });

    // 重置导航状态，避免下次 navigateTo('scene') 因同视图早退而不激活面板
    Navigation.reset();

    // 重新渲染全部面板（重置内容）
    this.renderPanels();

    // 重新初始化各面板（对话引擎随特写懒初始化，此处关闭特写即可）
    CloseupView.close();
    CompanionsPanel.init();
    // InventoryPanel.init(); —— 背包 UI 已隐藏
    SceneView.render();

    // 更新 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 通知
    Notifications.show('success', '存档已清除', '所有游戏数据已重置', 2000);
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
        // 关闭设置面板
        if (self._settingsVisible) {
          self.closeSettings();
          e.preventDefault();
          return;
        }

        // 关闭角色详情弹层
        if (CompanionsPanel._detailEl && CompanionsPanel._detailEl.classList.contains('active')) {
          CompanionsPanel._closeDetail();
          return;
        }

        e.preventDefault();
        return;
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

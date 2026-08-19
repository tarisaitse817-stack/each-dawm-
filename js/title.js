/* ==========================================================================
   光之回响 (Echoes of Light) — TitleScreen 标题界面
   ========================================================================== */

import { AppState } from './state.js?v=31';
import { StorageManager } from './storage.js?v=31';
import { Navigation } from './navigation.js?v=31';
import { showInitialBackground } from './scene.js?v=31';
import { TransitionView } from './transition.js?v=31';
import { EventPanel } from './event.js?v=31';
import { playOpeningGreeting } from './greeting.js?v=31';

/* 开场字幕（新游戏转场）：世界书 first_mes 前 3 句；失败回退内置默认文本前 3 句 */
const MAX_OPENING_LINES = 3;

var OPENING_LINES_FALLBACK = [
  '你在无尽的黑暗中睁开了双眼。不——你甚至不确定自己是否还有"眼睛"这个东西。只有光。微弱而温暖的光，从遥远的地方流淌而来，轻轻拂过你的意识。',
  '"你醒了。"一个声音，像是风穿过水晶的风铃，又像是远山的回响。你试图寻找声音的来源，却发现自己的身体正缓缓飘浮在一片星辉之中。',
  '"来吧，牌佬。属于你的奇妙冒险在等待着你。"'
];

/** 按中文标点断句：保留句尾标点、过滤空白句 */
function _splitSentences(text) {
  var parts = text.split(/([。！？…；]["'”’」』]?)/);
  var sentences = [];
  for (var i = 0; i < parts.length; i += 2) {
    var s = (parts[i] + (parts[i + 1] || '')).replace(/\s+/g, ' ').trim();
    if (s) sentences.push(s);
  }
  return sentences;
}

var _cachedOpeningLines = null;

/**
 * 开场字幕接口 — 世界书 first_mes 前 3 句（用户改世界书设定自动生效）
 * 加载失败/为空 → 回退内置默认文本前 3 句
 * @returns {Promise<string[]>}
 */
async function loadOpeningLines() {
  if (_cachedOpeningLines) return _cachedOpeningLines;
  var sentences = [];
  try {
    var resp = await fetch('data/worldbook.json');
    if (resp.ok) {
      var wb = await resp.json();
      var raw = (wb.first_mes || '').replace(/<\/?maintext>/g, '').split('\\n').join('\n');
      sentences = _splitSentences(raw);
    }
  } catch (e) {
    console.log('[TitleScreen] 世界书开场加载失败，使用默认字幕');
  }
  if (sentences.length === 0) {
    sentences = _splitSentences(OPENING_LINES_FALLBACK.join('\n'));
  }
  _cachedOpeningLines = sentences.slice(0, MAX_OPENING_LINES);
  console.log('[TitleScreen] 开场字幕: ' + _cachedOpeningLines.length + ' 句');
  return _cachedOpeningLines;
}

export const TitleScreen = {

  /** @type {HTMLElement|null} */
  _el: null,

  /** @type {boolean} 是否正在打字机动画中 */
  _isTyping: false,

  /**
   * 初始化标题界面
   * 渲染 DOM、绑定事件
   */
  init() {
    this._el = document.getElementById('title-screen');
    if (!this._el) {
      console.error('[TitleScreen] #title-screen 元素不存在');
      return;
    }

    this.render();
    loadOpeningLines();
  },

  /**
   * 渲染标题界面 HTML
   */
  render() {
    if (!this._el) return;

    var hasSave = StorageManager.hasSave();

    this._el.innerHTML =
      '<div class="title-content">' +
        '<img class="title-logo-img" id="title-logo-text" src="assets/covers/标题.png" alt="当妹卡降临到我身边">' +
        '<div class="title-btn-container">' +
          (hasSave
            ? '<button class="title-btn card-btn" id="btn-continue" aria-label="继续冒险" title="继续冒险">' +
                '<span class="card-face card-front"></span>' +
                '<span class="card-face card-back">继续冒险</span>' +
              '</button>'
            : '') +
          '<button class="title-btn card-btn" id="btn-newgame" aria-label="开始冒险" title="开始冒险">' +
            '<span class="card-face card-front"></span>' +
            '<span class="card-face card-back">开始冒险</span>' +
          '</button>' +
          '<button class="title-btn card-btn" id="btn-settings" aria-label="设置" title="设置">' +
            '<span class="card-face card-front"></span>' +
            '<span class="card-face card-back">设置</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="title-narrative hidden"></div>';

    // 标题字符拆分：每个字独立动画
    this._splitTitleChars();

    this._bindEvents();
  },

  /**
   * 将标题文字拆分为独立字符（每个字随机动画延迟）
   */
  _splitTitleChars: function () {
    var logo = document.getElementById('title-logo-text');
    if (!logo || logo.tagName === 'IMG') return; // 图片 logo 无需逐字拆分

    // 活泼配色：暖金、珊瑚、粉、天蓝、薄荷、紫、橙
    var colors = [
      '#D4A574', '#FF8A80', '#FF80AB', '#80D8FF',
      '#B9F6CA', '#B388FF', '#FFAB40', '#40C4FF',
      '#FF6E6E', '#64FFDA'
    ];

    var text = logo.textContent.trim();
    logo.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement('span');
      span.className = 'char';
      span.textContent = text[i];
      span.style.color = colors[i % colors.length];
      // 随机延迟，让每个字跳动不同步
      span.style.setProperty('--char-delay', (Math.random() * 0.8).toFixed(2) + 's');
      logo.appendChild(span);
    }
  },

  /**
   * 绑定按钮事件
   */
  _bindEvents() {
    var self = this;

    var btnContinue = document.getElementById('btn-continue');
    var btnNewGame = document.getElementById('btn-newgame');
    var btnSettings = document.getElementById('btn-settings');

    if (btnContinue) {
      btnContinue.addEventListener('click', function (e) {
        e.stopPropagation();
        self._onContinue();
      });
    }

    if (btnNewGame) {
      btnNewGame.addEventListener('click', function (e) {
        e.stopPropagation();
        self._onNewGame();
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener('click', function (e) {
        e.stopPropagation();
        self._onSettings();
      });
    }
  },

  /**
   * "继续冒险" — 从存档恢复并进入事件视图
   */
  _onContinue() {
    // 停止标题 BGM
    if (window.App && typeof window.App.stopBgm === 'function') {
      window.App.stopBgm();
    }
    // 立即显示侧边栏（无开场白）
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('sidebar-hidden');
    var main = document.getElementById('main-content');
    if (main) main.classList.remove('full-width');

    var saveData = StorageManager.load();
    if (saveData) {
      var currentState = AppState.get();
      Object.keys(saveData).forEach(function (key) {
        if (key !== 'timestamp' && currentState[key] !== undefined) {
          AppState.set(key, saveData[key]);
        }
      });
    }
    showInitialBackground();
    this._hideCover();
    Navigation.navigateTo('scene');
    this.hide();

    // 读档入口：仅光晕转场（无开场字幕）
    TransitionView.play({ lines: null });
  },

  /**
   * "设置" — 打开设置面板（Task 13 实现完整面板）
   */
  _onSettings() {
    // 委托给 App 全局实例，确保 _settingsVisible 标志位正确
    if (window.App && typeof window.App.openSettings === 'function') {
      window.App.openSettings();
    } else {
      var settingsModal = document.getElementById('settings-modal');
      if (settingsModal) {
        settingsModal.classList.remove('hidden');
      }
    }
  },

  /**
   * 开始新游戏
   * 重置状态 → 切场景 + 侧边栏立即可见 → 逐句字幕 + 光晕转场渐入
   */
  _startNewGame() {
    // 停止标题 BGM
    if (window.App && typeof window.App.stopBgm === 'function') {
      window.App.stopBgm();
    }

    AppState.reset();
    EventPanel.resetDisplay();
    this._hideCover();
    Navigation.navigateTo('scene');

    // 立即显示侧边栏（无打字机开场白；开场镜头感由转场字幕承担，与读档路径一致）
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('sidebar-hidden');
    var main = document.getElementById('main-content');
    if (main) main.classList.remove('full-width');
    showInitialBackground();

    this.hide();

    // 开场字幕 → 光晕铺满 → 渐入场景 → 开场寒暄（在场角色立绘问候，点击推进）
    loadOpeningLines().then(function (lines) {
      TransitionView.play({ lines: lines, onDone: playOpeningGreeting });
    });
  },

  /**
   * "新的旅程" — 新游戏：重置状态 → 切场景 → 逐句字幕+光晕转场
   */
  _onNewGame() {
    this._startNewGame();
  },

  /**
   * 显示标题界面
   */
  show() {
    if (!this._el) return;
    this._showCover();
    this._el.classList.remove('hidden');

    // 回到标题界面时隐藏右上角时间戳（用户要求：仅游戏中显示）
    var timeEl = document.getElementById('time-display');
    if (timeEl) timeEl.classList.add('hidden');

    // 隐藏侧边栏 — 标题画面期间不可见
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('sidebar-hidden');
    var main = document.getElementById('main-content');
    if (main) main.classList.add('full-width');

    // 恢复主内容显示
    var contentEl = this._el.querySelector('.title-content');
    if (contentEl) {
      contentEl.style.display = '';
    }

    // 隐藏叙事区域
    var narrativeEl = this._el.querySelector('.title-narrative');
    if (narrativeEl) {
      narrativeEl.classList.add('hidden');
    }

    this._isTyping = false;
  },

  /**
   * 隐藏标题界面
   */
  hide() {
    if (!this._el) return;
    this._el.classList.add('hidden');
  },

  _hideCover() {
    var cover = document.getElementById('cover-slideshow');
    if (cover) cover.classList.add('hidden');
  },

  _showCover() {
    var cover = document.getElementById('cover-slideshow');
    if (cover) cover.classList.remove('hidden');
  }
};

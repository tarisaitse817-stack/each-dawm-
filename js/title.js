/* ==========================================================================
   光之回响 (Echoes of Light) — TitleScreen 标题界面
   ========================================================================== */

import { AppState } from './state.js';
import { StorageManager } from './storage.js';
import { Navigation } from './navigation.js';

/* 开场叙事文本（3 段话） */
/**
 * 开场叙事 — 优先从世界书加载，否则使用默认
 */
var OPENING_NARRATIVE = [
  '你在无尽的黑暗中睁开了双眼。不——你甚至不确定自己是否还有"眼睛"这个东西。只有光。微弱而温暖的光，从遥远的地方流淌而来，轻轻拂过你的意识。',
  '"你醒了。"一个声音，像是风穿过水晶的风铃，又像是远山的回响。你试图寻找声音的来源，却发现自己的身体正缓缓飘浮在一片星辉之中。',
  '"来吧，牌佬。属于你的奇妙冒险在等待着你。"'
];

async function loadOpeningNarrative() {
  try {
    var resp = await fetch('data/worldbook.json');
    if (resp.ok) {
      var wb = await resp.json();
      var raw = (wb.first_mes || '').replace(/<\/?maintext>/g, '').replace(/\\n/g, '\n');
      // Split into paragraphs (> 50 chars each)
      var paragraphs = raw.split(/\n\n+/).filter(function(p) { return p.trim().length > 50; });
      if (paragraphs.length >= 3) {
        OPENING_NARRATIVE = paragraphs;
        console.log('[TitleScreen] 加载世界书开场叙事: ' + paragraphs.length + ' 段');
      }
    }
  } catch (e) {
    console.log('[TitleScreen] 使用默认开场叙事');
  }
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
    loadOpeningNarrative();
  },

  /**
   * 渲染标题界面 HTML
   */
  render() {
    if (!this._el) return;

    var hasSave = StorageManager.hasSave();

    this._el.innerHTML =
      '<div class="title-content">' +
        '<div class="title-logo" id="title-logo-text">当妹卡降临到我身边</div>' +
        '<div class="title-btn-container">' +
          (hasSave
            ? '<button class="title-btn primary" id="btn-continue">继续冒险</button>'
            : '') +
          '<button class="title-btn secondary" id="btn-newgame">新的旅程</button>' +
          '<button class="title-btn secondary" id="btn-settings">设置</button>' +
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
    if (!logo) return;

    // 活泼配色：暖金、珊瑚、粉、天蓝、薄荷、紫、橙
    var colors = [
      '#FFD54F', '#FF8A80', '#FF80AB', '#80D8FF',
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
    var saveData = StorageManager.load();
    if (saveData) {
      var currentState = AppState.get();
      Object.keys(saveData).forEach(function (key) {
        if (key !== 'timestamp' && currentState[key] !== undefined) {
          AppState.set(key, saveData[key]);
        }
      });
    }
    if (window.App && typeof window.App.switchBgm === 'function') {
      window.App.switchBgm('game');
    }
    Navigation.navigateTo('event');
    this.hide();
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
   * 重置状态 → 跳转到事件视图 → 开场叙事在事件面板中以打字机展示
   */
  _startNewGame() {
    AppState.reset();
    if (window.App && typeof window.App.switchBgm === 'function') {
      window.App.switchBgm('game');
    }
    Navigation.navigateTo('event');

    // 开场叙事直接在事件面板中以打字机效果展示
    var history = AppState.get('narrativeHistory') || [];
    history = history.concat(OPENING_NARRATIVE);
    AppState.set('narrativeHistory', history);

    this.hide();
  },

  /**
   * "新的旅程" — 直接进入事件面板展示开场叙事
   */
  _onNewGame() {
    this._startNewGame();
  },

  /**
   * 显示标题界面
   */
  show() {
    if (!this._el) return;
    this._el.classList.remove('hidden');

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
  }
};

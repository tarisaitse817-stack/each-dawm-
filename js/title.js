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
        '<div class="title-logo">当妹卡降临到我身边</div>' +
        '<div class="title-subtitle">AI 文字冒险 × 卡牌对战</div>' +
        '<div class="title-btn-container">' +
          (hasSave
            ? '<button class="title-btn primary" id="btn-continue">继续冒险</button>'
            : '') +
          '<button class="title-btn secondary" id="btn-newgame">新的旅程</button>' +
          '<button class="title-btn secondary" id="btn-settings">设置</button>' +
        '</div>' +
      '</div>' +
      '<div class="title-narrative hidden"></div>';

    this._bindEvents();
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
   * "新的旅程" — 展示开场叙事（打字机效果）
   */
  _onNewGame() {
    this._showOpeningNarrative();
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
   * 展示开场叙事（打字机效果）
   * 逐字显示三段开场文本，完成后显示"点击继续"提示
   */
  _showOpeningNarrative() {
    if (this._isTyping) return;
    this._isTyping = true;

    var self = this;
    var contentEl = this._el.querySelector('.title-content');
    var narrativeEl = this._el.querySelector('.title-narrative');

    if (!narrativeEl) return;

    // 隐藏主内容区域
    if (contentEl) {
      contentEl.style.display = 'none';
    }

    // 清空并显示叙事区域
    narrativeEl.innerHTML = '';
    narrativeEl.classList.remove('hidden');

    var totalParagraphs = OPENING_NARRATIVE.length;
    var currentPara = 0;

    /**
     * 逐段打字
     */
    function typeNextParagraph() {
      if (currentPara >= totalParagraphs) {
        // 所有段落打完 — 显示点击提示
        self._isTyping = false;
        var hint = document.createElement('div');
        hint.className = 'click-hint';
        hint.textContent = '— 点击继续 —';
        narrativeEl.appendChild(hint);

        // 点击后进入游戏
        var clickHandler = function () {
          narrativeEl.removeEventListener('click', clickHandler);
          self._startNewGame();
        };
        narrativeEl.addEventListener('click', clickHandler);
        return;
      }

      var p = document.createElement('p');
      narrativeEl.appendChild(p);

      var text = OPENING_NARRATIVE[currentPara];
      var charIndex = 0;

      /**
       * 逐字输出
       */
      function typeChar() {
        if (charIndex < text.length) {
          p.textContent += text[charIndex];
          charIndex++;
          setTimeout(typeChar, 30);
        } else {
          // 当前段落完成，等待后继续下一段
          currentPara++;
          setTimeout(typeNextParagraph, 400);
        }
      }

      typeChar();
    }

    typeNextParagraph();
  },

  /**
   * 开始新游戏
   * 重置状态 → 跳转到事件视图 → 添加开场叙事到历史
   */
  _startNewGame() {
    AppState.reset();
    if (window.App && typeof window.App.switchBgm === 'function') {
      window.App.switchBgm('game');
    }
    Navigation.navigateTo('event');

    // 添加开场叙事到历史
    var history = AppState.get('narrativeHistory') || [];
    history = history.concat(OPENING_NARRATIVE);
    AppState.set('narrativeHistory', history);

    this.hide();
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

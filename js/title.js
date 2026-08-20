/* ==========================================================================
   光之回响 (Echoes of Light) — TitleScreen 标题界面
   ========================================================================== */

import { AppState } from './state.js?v=62';
import { StorageManager } from './storage.js?v=62';
import { Navigation } from './navigation.js?v=62';
import { showInitialBackground } from './scene.js?v=62';
import { TransitionView } from './transition.js?v=62';
import { EventPanel } from './event.js?v=62';
// 开局寒暄已停用（用户要求）：js/greeting.js 保留，想恢复时重新引入
// import { playOpeningGreeting } from './greeting.js?v=62';

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
    var resp = await fetch('data/worldbook.json?v=1');
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
        '<img class="title-logo-img" id="title-logo-text" src="assets/covers/标题.png?v=14" alt="当妹卡降临到我身边">' +
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

    // 开场黑屏文本（用户文档「开场白.txt」）：逐句点击推进
    var OPENING_BLACK_LINES = [
      '客厅里响起了新闻播报声，虽然我刚开始不是很习惯，但这样的日子过了几天后，也逐渐喜欢上了这种更有生气的氛围，',
      '不知道从什么时候开始，家里住进了一些只有我看得见的房客。',
      '就好像著名美食家迪奥先生所讲的那样"替身使者之间是会互相吸引的。"我和妹卡之间有着一股若有若无的引力，无论我走到哪里，哪里就会有妹卡刷新到哪里。'
    ];
    // 进入客厅后的开场白（用户文档「开场白.txt」全文，段落以空行分隔）
    var SCENE_OPENING = [
      '彩虹小姐娴静的坐在沙发上，电视上播放着无聊的早间新闻。阳台的方向飘来睡鼠若有若无的鼾声，卧室里的露世似乎早就醒了。听见房门的动静，彩虹转过头，看向了你。她脸上依旧是那副温柔大姐姐的模样，彩虹色的长发柔顺的披散着，真的好像雨后的彩虹。',
      '"早饭想吃什么？"她大方的发问，看起来好像她才是这间房屋的女主人。',
      '我凑近她的脸颊，轻声说："想吃你，"',
      '她的脸颊瞬间就红了，刚才那副知心姐姐的模样荡然无存，像个纯情小女孩一样支支吾吾的说："现在..现在不行~"',
      '我掐了掐她的脸颊，轻声说:"好了不逗你了，我去做早餐。"',
      '对方用细微的声音回应了一声，还是害羞的不肯抬起脸。',
      '在走进厨房时，旁边的露世一脸怨气的看着我，小声说:"刚睡醒就去和别的女人调情，master还是好男孩吗？"',
      '"还真是~早上想吃什么？"',
      '"气饱了！"',
      '露世还是那一脸怨气的模样。',
      '"下午带你和零依去逛街怎么样？"',
      '露世别过脸，看起来是不太满意。',
      '"那你有什么愿望吗？"',
      '过了一会儿，她才小声说:"我不想睡沙发。"',
      '"这个啊"我尴尬的摸了摸头，"家里经费有限嘛，那要不今晚我睡沙发？"',
      '对方还是不回应，一脸怨气的看着我。',
      '我试探性的说:"那咱们一起睡？"',
      '这时候对方才收起了那埋怨的目光。',
      '我做了一顿还算丰盛的早饭，掐了掐睡鼠还在熟睡的脸颊，但很可惜没有要醒来的意思，只好给他预留一份早餐了。',
      '在饭桌上，我给天童多加了一点菜，嘱咐道:"不要饿到自己，其他几个姐姐很和善的，不要总是躲着她们。"',
      '天童怯生生的看了我一眼，轻轻的点了点头。',
      '"master~"',
      '零依高兴的举起手，一脸期待的问："下午要不要去逛街啊？"',
      '"不行哦~master已经答应和我去森林写生了。"彩虹对我眨了眨眼，优雅的神情里带着些意义不明的味道。',
      '正当我头疼的时候，天童举起了她白嫩的小手，小声:"master昨天不是说今天下午要带我玩电子游戏...."',
      '这时，你决定：'
    ].join('\n\n');

    // 开场 CG 轮切（用户要求）：黑屏阶段轮播已解锁角色的 CG 图
    var self = this;
    fetch('data/characters.json?v=1')
      .then(function (r) { return r.ok ? r.json() : { characters: [] }; })
      .catch(function () { return { characters: [] }; })
      .then(function (data) {
        var unlockedIds = {};
        (AppState.get('companions') || []).forEach(function (c) {
          if (c.unlocked !== false) unlockedIds[c.id] = true;
        });
        var slides = (data.characters || []).filter(function (ch) {
          return unlockedIds[ch.id] && ch.introImage;
        }).map(function (ch) { return ch.introImage + '?v=1'; });

        TransitionView.play({
          lines: OPENING_BLACK_LINES,
          clickAdvance: true,
          cgSlides: slides,
          onDone: function () {
            // 彩虹立绘登场（对话层随之初始化），开场白入叙事队列
            window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: 'caihong' } }));
            AppState.push('narrativeHistory', SCENE_OPENING);
            // 世界观 V4：彩虹为初始同伴（已解锁，不会对主角抱有抵触）——
            // 仅当她的解锁状态异常（未解锁）时才触发初见黑暗决斗兜底
            var caihongComp = (AppState.get('companions') || []).find(function (c) { return c.id === 'caihong'; });
            if (!caihongComp || caihongComp.unlocked === false) {
              var encounterAiText = '（系统提示：你在自家客厅遇见了从未见过的精灵彩虹——只有你能看见她的本体。你表现出的惊讶让她认定你就是一切的源头，她向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场突如其来的初见，不要输出角色对话，不要输出任何标签。）';
              setTimeout(function () {
                window.dispatchEvent(new CustomEvent('scene-narration-request', {
                  detail: { aiText: encounterAiText, encounterName: '彩虹' },
                }));
              }, 4000);
            }
          }
        });
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

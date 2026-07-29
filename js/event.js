/* ==========================================================================
   光之回响 (Echoes of Light) — EventPanel 事件对话界面
   ========================================================================== */

import { AppState } from './state.js';

/* ==========================================================================
   常量
   ========================================================================== */

/** 玩家行动的前缀标记 */
var PLAYER_PREFIX = '【玩家】';

/** 默认建议选项 */
var DEFAULT_SUGGESTIONS = [
  '探索周围环境',
  '向前方前进',
  '与灵曦对话',
  '查看星辉湖畔'
];

/** 打字机速度映射（毫秒/字） */
var SPEED_MAP = {
  slow: 80,
  normal: 40,
  fast: 15
};

/* --------------------------------------------------------------------------
   预设叙事文本库
   -------------------------------------------------------------------------- */

var EXPLORE_RESPONSES = [
  '你环顾四周，发现晨曦森林的树木散发着微弱的荧光。空气中的灵辉粒子如同萤火虫般飘舞，在幽暗的林中勾勒出一条蜿蜒的小径。',
  '透过树冠的间隙，你看到天空呈现出奇异的紫色。远处传来若有若无的歌声，仿佛在指引着前进的方向。',
  '脚下的土地松软而温暖，每一步都激起一圈淡淡的光晕。你注意到有些树木的根系纠缠成古老的符文形状。',
  '林间的雾气缓缓流动，时而聚拢时而散开。你隐约看到雾气中浮现出幻影——似乎是远古的景象在眼前重现。'
];

var TALK_RESPONSES = [
  '灵曦从光芒中显现，她那半透明的身影在空气中轻轻摇曳。"你感受到了吗？这片森林在呼唤着什么。"她的声音如同风铃般清脆。',
  '灵曦微微侧首，目光穿透了林间的迷雾。"每一个生命都有自己的光芒，"她轻声说道，"即使是最微弱的星光，也能照亮前行的路。"',
  '"在这片森林的深处，有一座古老的石碑。"灵曦指向远方，"我能感受到它的力量——那是远古时代留下的回响。"',
  '灵曦轻轻抬手，一串光点从她的指尖飘出，在空中形成了一个古老的符文。"看，这是光之回响的印记。它指引着我们前进的方向。"'
];

var FORWARD_RESPONSES = [
  '你沿着小径继续前行，周围的景色逐渐变化。树木变得稀疏，取而代之的是一片开阔的湖畔。月光洒在湖面上，泛起粼粼波光。',
  '穿过一片茂密的灌木丛，你发现了一座古老的石碑。碑面上刻满了你无法解读的文字，但中央的圆形凹槽似乎在等待着什么。',
  '前方的道路渐渐开阔，空气中弥漫着淡淡的花香。远处似乎有一座建筑的身影若隐若现。',
  '你穿过一片光幕，眼前的景象豁然开朗。星辉在头顶流淌，如同一条璀璨的河流。地面上的纹路散发着微光，形成一个巨大的法阵。'
];

var USE_RESPONSES = [
  '你取出物品，微弱的光芒在掌心亮起。一股温暖的力量沿着手臂流淌，仿佛与这片森林产生了共鸣。',
  '物品在你的手中微微发热，散发出柔和的光晕。周围的灵辉粒子似乎被吸引过来，在空中形成美丽的光旋。',
  '当你拿出那个物品时，周围的光线似乎变得更加明亮了。你能感受到其中蕴含的力量在轻轻脉动。'
];

var DEFAULT_RESPONSES = [
  '你的声音在森林中回荡，仿佛惊起了某种沉睡的存在。周围的灵辉粒子微微颤动，似乎在回应着你。',
  '风穿过树梢，带来了一阵低语般的声音。你无法分辨那究竟是风声，还是某种古老的语言。',
  '空气中弥漫着一种奇异的气息。你感觉到自己正在被什么注视着——那是一种古老而深邃的目光。',
  '你的脚步声在林间回响，每一步都踏在柔软的土地上。远处传来流水的声音，指引着前进的方向。'
];

/** 关键词 → 行为映射 */
var KEYWORD_MAP = [
  {
    keywords: ['战斗', '攻击', '挑战', '决斗'],
    action: 'battle',
    response: null
  },
  {
    keywords: ['探索', '查看', '观察', '环顾', '周围', '环境', '搜索', '检查'],
    action: 'response',
    responses: EXPLORE_RESPONSES
  },
  {
    keywords: ['对话', '说话', '灵曦', '交谈', '询问', '呼唤'],
    action: 'response',
    responses: TALK_RESPONSES
  },
  {
    keywords: ['前进', '向前', '走去', '前行', '出发', '移动', '继续'],
    action: 'response',
    responses: FORWARD_RESPONSES
  },
  {
    keywords: ['使用', '拿出', '物品', '道具', '装备', '碎片', '药剂'],
    action: 'response',
    responses: USE_RESPONSES
  }
];

/* ==========================================================================
   工具函数
   ========================================================================== */

/**
 * 从数组中随机取一个元素
 * @param {Array} arr
 * @returns {*}
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 截断字符串到指定长度
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '…';
}

/* ==========================================================================
   EventPanel 单例
   ========================================================================== */

export const EventPanel = {

  /* --- DOM 引用 --- */
  _el: null,
  _narrativeEl: null,
  _suggestToggle: null,
  _suggestionsPanel: null,
  _suggestArrow: null,
  _inputEl: null,
  _sendBtn: null,

  /* --- 状态 --- */
  _isTyping: false,
  _suggestionsOpen: false,
  _displayQueue: [],
  _lastDisplayedIndex: 0,
  _pendingResponses: 0,
  _isInternalUpdate: false,

  /**
   * 初始化事件面板
   * 渲染 DOM、绑定事件、显示已有叙事历史
   */
  init() {
    this._el = document.getElementById('panel-event');
    if (!this._el) {
      console.error('[EventPanel] #panel-event 元素不存在');
      return;
    }

    this._renderDOM();
    this._bindEvents();

    // 显示已有的叙事历史
    var existingHistory = AppState.get('narrativeHistory') || [];
    if (existingHistory.length > 0) {
      this._lastDisplayedIndex = existingHistory.length;
      this._enqueueDisplay(existingHistory);
    }

    // 初始化默认氛围
    this.setAtmosphere('calm');

    // 订阅叙事历史变更 — 自动显示新增内容
    var self = this;
    AppState.subscribe('narrativeHistory', function (newHistory, oldHistory) {
      if (self._isInternalUpdate) return;

      var oldLen = oldHistory ? oldHistory.length : 0;
      var newItems = newHistory.slice(oldLen);
      if (newItems.length > 0) {
        self._enqueueDisplay(newItems);
      }
    });
  },

  /* ===================================================================
     渲染
     =================================================================== */

  /**
   * 渲染事件对话界面 HTML
   */
  _renderDOM() {
    this._el.innerHTML =
      '<div class="event-atmosphere"></div>' +
      '<div class="event-dialog">' +
        '<div class="narrative-text"></div>' +
        '<div class="divider-glow"></div>' +
        '<div class="suggest-toggle">' +
          '<span>展开建议</span>' +
          '<i data-lucide="chevron-down" class="suggest-arrow"></i>' +
        '</div>' +
        '<div class="suggestions-panel"></div>' +
        '<div class="input-area">' +
          '<textarea id="narrative-input" placeholder="输入你的行动…" rows="1"></textarea>' +
          '<button class="send-btn" id="send-btn">' +
            '<i data-lucide="send"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    // 缓存 DOM 引用
    this._narrativeEl = this._el.querySelector('.narrative-text');
    this._suggestToggle = this._el.querySelector('.suggest-toggle');
    this._suggestArrow = this._el.querySelector('.suggest-arrow');
    this._suggestionsPanel = this._el.querySelector('.suggestions-panel');
    this._inputEl = document.getElementById('narrative-input');
    this._sendBtn = document.getElementById('send-btn');

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ===================================================================
     事件绑定
     =================================================================== */

  /**
   * 绑定所有交互事件
   */
  _bindEvents() {
    var self = this;

    // --- 建议 toggle ---
    this._suggestToggle.addEventListener('click', function () {
      self.toggleSuggestions();
    });

    // --- 输入框键盘事件 ---
    this._inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        self._onSubmit();
      }
    });

    // --- 输入框自动调整高度 ---
    this._inputEl.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // --- 发送按钮 ---
    this._sendBtn.addEventListener('click', function () {
      self._onSubmit();
    });
  },

  /* ===================================================================
     核心逻辑
     =================================================================== */

  /**
   * 提交输入框内容
   */
  _onSubmit() {
    if (this._isTyping || this._pendingResponses > 0) return;

    var text = this._inputEl.value.trim();
    if (!text) return;

    // 清空输入框，重置高度
    this._inputEl.value = '';
    this._inputEl.style.height = 'auto';

    this.submitAction(text);
  },

  /**
   * 提交行动 — 将文本加入叙事历史、触发模拟响应
   * @param {string} text
   */
  submitAction(text) {
    var self = this;

    // 1. 保存玩家行动到叙事历史
    var playerText = PLAYER_PREFIX + truncate(text, 200);
    this._isInternalUpdate = true;
    AppState.push('narrativeHistory', playerText);
    this._isInternalUpdate = false;

    // 2. 直接显示玩家行动
    this._addPlayerActionText(text);

    // 3. 关闭建议面板
    if (this._suggestionsOpen) {
      this.toggleSuggestions();
    }

    // 4. 模拟响应延迟
    this._pendingResponses++;

    setTimeout(function () {
      // 生成响应
      var response = self._generateResponse(text);

      // 保存到叙事历史
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', response);
      self._isInternalUpdate = false;

      // 显示响应
      self._addNarratorText(response, undefined, function () {
        self._pendingResponses--;

        // 响应完毕后显示建议
        if (self._pendingResponses === 0) {
          self.showSuggestions(DEFAULT_SUGGESTIONS);
        }
      });
    }, 600 + Math.random() * 400);
  },

  /**
   * 触发战斗 — 调用 BattleStage（Task 8）
   * TODO: Task 8 实现后应调用 BattleStage.show(enemy) 而非仅存储数据。
   *       BattleStage 应订阅 AppState('pendingBattle') 以响应触发。
   * @param {Object} [enemyData] - 对手数据
   */
  triggerBattle(enemyData) {
    var enemy = enemyData || {
      name: '暗影斥候',
      lp: 3000,
      maxLp: 3000,
      description: '黑暗中诞生的灵体，散发着不祥的气息。'
    };

    // 存储战斗数据供 BattleStage（Task 8）使用
    AppState.set('pendingBattle', enemy);

    console.log('[EventPanel] 触发战斗: ' + enemy.name + '（等待 Task 8 BattleStage 接管）');
  },

  /* ===================================================================
     叙事文本显示
     =================================================================== */

  /**
   * 公共 API — 以打字机效果显示叙事文本
   * @param {string} text - 文本内容
   * @param {number} [speed] - 每字毫秒数，默认从设置读取
   */
  addNarratorText(text, speed) {
    this._addNarratorText(text, speed, null);
  },

  /**
   * 内部 —— 打字机效果显示叙事文本
   * @param {string} text
   * @param {number} [speed]
   * @param {Function} [doneCallback] - 完成回调
   */
  _addNarratorText(text, speed, doneCallback) {
    if (!text) {
      if (doneCallback) doneCallback();
      return;
    }

    var self = this;

    // 确定打字速度
    if (speed === undefined || speed === null) {
      var settings = AppState.get('settings');
      speed = SPEED_MAP[settings.textSpeed] || SPEED_MAP.normal;
    }

    var p = document.createElement('p');
    p.classList.add('typing-cursor');
    this._narrativeEl.appendChild(p);
    this._scrollToBottom();

    var index = 0;

    function typeChar() {
      if (index < text.length) {
        p.textContent += text[index];
        index++;
        self._scrollToBottom();
        setTimeout(typeChar, speed);
      } else {
        p.classList.remove('typing-cursor');
        if (doneCallback) {
          doneCallback();
        }
      }
    }

    typeChar();
  },

  /**
   * 公共 API — 显示玩家行动文本
   * @param {string} text
   */
  addPlayerAction(text) {
    this._addPlayerActionText(text);
  },

  /**
   * 内部 —— 添加玩家行动文本（右对齐、暖金色）
   * @param {string} text
   */
  _addPlayerActionText(text) {
    var p = document.createElement('p');
    p.className = 'player-action';
    p.textContent = truncate(text, 200);
    this._narrativeEl.appendChild(p);
    this._scrollToBottom();
  },

  /* ===================================================================
     建议选项系统
     =================================================================== */

  /**
   * 设置场景氛围 — 改变背景色调和分割线粒子颜色
   * @param {'calm'|'tense'|'mysterious'} mood - 情绪基调
   */
  setAtmosphere(mood) {
    if (!this._el) return;

    // 设置氛围背景
    var atmoEl = this._el.querySelector('.event-atmosphere');
    if (atmoEl) {
      atmoEl.className = 'event-atmosphere';
      if (mood && mood !== 'calm') {
        atmoEl.classList.add('mood-' + mood);
      }
    }

    // 设置分割线粒子颜色
    var divider = this._el.querySelector('.divider-glow');
    if (divider) {
      divider.className = 'divider-glow';
      if (mood && mood !== 'calm') {
        divider.classList.add('particle-' + mood);
      }
    }
  },

  /**
   * 展开建议选项
   * @param {string[]} options - 建议文本数组（2-4 个）
   */
  showSuggestions(options) {
    if (!options || options.length === 0) return;

    this._suggestionsPanel.innerHTML = '';

    var self = this;

    options.slice(0, 4).forEach(function (text, index) {
      var card = document.createElement('div');
      card.className = 'suggestion-card';
      card.textContent = text;
      // 交错入场延迟（递增 60ms）
      card.style.animationDelay = (index * 60) + 'ms';

      card.addEventListener('click', function () {
        // 单击：填入输入框
        self._inputEl.value = text;
        self._inputEl.style.height = 'auto';
        self._inputEl.style.height = Math.min(self._inputEl.scrollHeight, 120) + 'px';
        self._inputEl.focus();
      });

      card.addEventListener('dblclick', function () {
        // 双击：直接提交
        self._inputEl.value = text;
        self.submitAction(text);
      });

      self._suggestionsPanel.appendChild(card);
    });

    // 自动展开建议面板
    if (!this._suggestionsOpen) {
      this.toggleSuggestions();
    }
  },

  /**
   * 切换建议面板展开/收起状态
   */
  toggleSuggestions() {
    this._suggestionsOpen = !this._suggestionsOpen;

    this._suggestionsPanel.classList.toggle('open', this._suggestionsOpen);
    this._suggestArrow.classList.toggle('open', this._suggestionsOpen);

    var label = this._suggestionsOpen ? '收起建议' : '展开建议';
    this._suggestToggle.querySelector('span').textContent = label;
  },

  /* ===================================================================
     响应生成
     =================================================================== */

  /**
   * 根据玩家输入关键词生成响应文本
   * @param {string} input - 玩家输入
   * @returns {string} 响应文本
   */
  _generateResponse(input) {
    if (!input) return randomPick(DEFAULT_RESPONSES);

    var lowerInput = input.toLowerCase();

    // 遍历关键词映射
    for (var i = 0; i < KEYWORD_MAP.length; i++) {
      var entry = KEYWORD_MAP[i];
      for (var j = 0; j < entry.keywords.length; j++) {
        if (lowerInput.indexOf(entry.keywords[j].toLowerCase()) !== -1) {
          // 命中关键词 — 根据情景切换氛围
          if (entry.action === 'battle') {
            this.setAtmosphere('tense');
            this.triggerBattle();
            return '一股强大的气息突然出现！暗影斥候从黑暗中显现，战斗一触即发！';
          }
          if (entry.responses && entry.responses.length > 0) {
            // 探索/对话 → 宁静；前进 → 神秘
            if (entry.keywords.indexOf('战斗') >= 0 || entry.keywords.indexOf('攻击') >= 0) {
              this.setAtmosphere('tense');
            } else if (entry.keywords.indexOf('前进') >= 0 || entry.keywords.indexOf('向前') >= 0) {
              this.setAtmosphere('mysterious');
            } else {
              this.setAtmosphere('calm');
            }
            return randomPick(entry.responses);
          }
        }
      }
    }

    // 无匹配 — 返回默认响应（神秘氛围）
    this.setAtmosphere('mysterious');
    return randomPick(DEFAULT_RESPONSES);
  },

  /* ===================================================================
     显示队列
     =================================================================== */

  /**
   * 将一组文本加入显示队列
   * @param {string[]} items
   */
  _enqueueDisplay(items) {
    var self = this;

    items.forEach(function (item) {
      self._displayQueue.push(item);
    });

    if (!this._isTyping) {
      this._processQueue();
    }
  },

  /**
   * 处理队列中的下一个显示项
   */
  _processQueue() {
    var self = this;

    if (this._displayQueue.length === 0) {
      this._isTyping = false;
      // 队列空闲且无待处理响应时显示建议
      if (this._pendingResponses === 0) {
        this.showSuggestions(DEFAULT_SUGGESTIONS);
      }
      return;
    }

    this._isTyping = true;
    var text = this._displayQueue.shift();

    if (text.indexOf(PLAYER_PREFIX) === 0) {
      // 玩家行动 — 直接显示，无需打字机
      this._addPlayerActionText(text.substring(PLAYER_PREFIX.length));
      // 继续处理下一项
      setTimeout(function () {
        self._processQueue();
      }, 200);
    } else {
      // 叙事文本 — 打字机效果
      this._addNarratorText(text, undefined, function () {
        self._scrollToBottom();
        // 每段之间稍作停顿
        setTimeout(function () {
          self._processQueue();
        }, 300);
      });
    }
  },

  /* ===================================================================
     工具方法
     =================================================================== */

  /**
   * 滚动叙事区域到底部
   */
  _scrollToBottom() {
    var self = this;
    // 使用 requestAnimationFrame 确保 DOM 更新后平滑滚动
    requestAnimationFrame(function () {
      if (self._narrativeEl) {
        self._narrativeEl.scrollTo({
          top: self._narrativeEl.scrollHeight,
          behavior: 'smooth'
        });
      }
    });
  }
};

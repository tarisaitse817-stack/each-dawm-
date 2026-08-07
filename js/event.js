/* ==========================================================================
   光之回响 (Echoes of Light) — EventPanel 事件对话界面
   ========================================================================== */

import { AppState } from './state.js';
import { AiClient, BattleBridge } from './ai.js';

/* ==========================================================================
   常量
   ========================================================================== */

/** 玩家行动的前缀标记 */
var PLAYER_PREFIX = '【玩家】';

/** 默认建议选项（AI 离线时） */
var DEFAULT_SUGGESTIONS = [
  '去鱼缸看看塞壬',
  '准备出门上班',
  '查看手机消息',
  '去厨房弄点吃的'
];

/** 打字机速度映射（毫秒/字） */
var SPEED_MAP = {
  slow: 80,
  normal: 40,
  fast: 15
};

/* --------------------------------------------------------------------------
   预设叙事文本库（现代都市 × 妹卡同居）
   -------------------------------------------------------------------------- */

var HOME_RESPONSES = [
  '你穿上拖鞋，揉着惺忪的睡眼走出卧室。客厅角落的鱼缸里，塞壬正趴在缸沿上，灰蓝色的发丝湿漉漉地贴在白皙的肩头。看到你出来，她那双紫水晶般的眼睛立刻亮了起来。"master~早上好……"她软糯的声音还带着刚睡醒的鼻音，臂鳍在水面上轻轻拍出一串小水花。',
  '周末的阳光透过窗帘洒进客厅，在地板上投下温暖的光斑。你窝在沙发上刷着手机，忽然感觉肩头一沉——塞壬不知什么时候从鱼缸里爬了出来，正用湿漉漉的脑袋靠着你的肩膀，长长的灰发把你的T恤洇出一片水渍。"塞壬，你又把沙发弄湿了……"你无奈地叹气，她却只是蹭了蹭你，假装没听见。',
  '客厅里飘着一股淡淡的洗衣液香味。你刚把晾干的衣服收进来，就看到鱼缸里的塞壬正一脸羡慕地盯着你手里的柔软毛巾。"想要？"你笑着把毛巾递过去，她立刻把脸埋进毛巾里，发出满足的叹息。',
  '你窝在沙发上看着无聊的电视节目，茶几上散落着几包空了的薯片袋。鱼缸里传来轻微的水声——塞壬正在水里转着圈，时不时偷偷瞟你一眼。你假装没注意到她，片刻后，一条细细的水柱精准地溅到了你的后颈上。'
];

var OUTSIDE_RESPONSES = [
  '你推开公寓的门，清晨的凉风裹挟着城市的喧嚣扑面而来。楼下便利店的老板娘虹天气正在门口浇花，看到你出来，她金发间那抹彩虹刘海微微一颤，脸噌地红了。"早、早上好！今天有新鲜的三明治……要、要不要来一份？"她的声音越来越小，手里的喷壶差点掉在地上。',
  '下班回家的路上，你拐进了虹天气的便利店。她正站在收银台后面整理货架，听到自动门的叮咚声，立刻转过身来。看到是你，那双温柔的眼睛笑得弯成了月牙。"啊，你来了！我特意给你留了你爱吃的布丁……"她从收银台下面掏出一个小盒子，脸颊绯红。',
  '街角的包子铺飘来诱人的肉香。艾克利西娅正系着围裙在门口招呼客人，金色的超长发髻在阳光下闪闪发光。她一眼就看到了人群中的你，呆毛猛地竖了起来。"啊，常客先生！今天的肉包子刚出笼，要尝尝吗？"她说着自己先咽了口口水。',
  '你在附近的便利店采购日用品。虹天气一边给你结账一边偷偷往购物袋里多塞了两包你常买的饼干。"诶，这个是……""嘘——"她竖起食指贴在嘴唇上，彩虹色的刘海下，那张温柔的脸红得像个苹果，"员工福利！"'
];

var SEREN_RESPONSES = [
  '塞壬趴在鱼缸边上，双臂交叠垫着下巴，紫色的眼眸直勾勾地盯着你。你今天好像特别忙，回来后就一直对着电脑加班，连看都没看她一眼。她不满地用尾巴拍了一下水面，溅起一小片水花。"master……你是不是忘了什么事情？"她把脸埋进臂弯里，只露出两只委屈巴巴的眼睛。',
  '"塞壬，该喂食了。"你拿着她最爱的小鱼干走到鱼缸前。她却把头扭向一边，故意摆出一副高傲的神情——可惜肚子不争气地叫了一声，让她瞬间破功。你忍不住笑出声来，她气鼓鼓地用尾巴甩了你一脸水。',
  '你坐在鱼缸旁的地板上，背靠着玻璃，手里拿着一本书。塞壬从水里游到你身后，隔着玻璃用手指在你的后脑勺上画圈圈。凉凉的触感透过玻璃传来，你一回头，她立刻装作若无其事的样子望着天花板。',
  '夜深了，你躺在沙发上快要睡着。迷迷糊糊中，听到鱼缸里传来轻柔的哼唱声——那是塞壬在唱一首没有歌词的旋律。水波在月光下泛着淡淡的荧光，她的歌声像是从很远很远的地方飘来的海风。'
];

var WORK_RESPONSES = [
  '周一的早晨总是格外残酷。闹钟响了第三遍，你才勉强从床上爬起来。客厅里，塞壬已经醒了，正趴在缸沿上用担忧的眼神看着你手忙脚乱地找领带。"master昨晚又熬夜了……"她轻声嘟囔着，尾巴在水里不安地摆动。',
  '你拖着疲惫的身体回到家，一头栽进沙发里。今天在公司被主管训了一整个下午，脑袋嗡嗡作响。塞壬安静地待在鱼缸里，没有像平时那样撒娇。过了一会儿，你感觉到一只湿凉的小手轻轻搭在你的额头上——她不知什么时候爬了出来，正跪在沙发旁，用那双紫眸温柔地注视着你。',
  '加班到深夜，你推开家门，发现客厅的灯还亮着。塞壬蜷在沙发的角落，身上裹着你昨天落在那里的外套，已经睡着了。她的睫毛在灯光下投下淡淡的阴影，呼吸轻柔得像海边的微风。你轻手轻脚地走过去，把滑落的外套重新盖好。'
];

var KEYWORD_MAP = [
  { keywords: ['战斗', '攻击', '挑战', '决斗', '黑暗决斗'], action: 'battle', response: null },
  { keywords: ['探索', '查看', '观察', '环顾', '周围', '环境', '搜索', '检查', '看看', '客厅', '房间', '家里', '回家', '公寓'], action: 'response', responses: HOME_RESPONSES },
  { keywords: ['出门', '上班', '下班', '公司', '外面', '街道', '便利店', '超市', '包子', '包子铺', '虹天气', '艾克利西娅', '出去', '走路', '街上'], action: 'response', responses: OUTSIDE_RESPONSES },
  { keywords: ['塞壬', '鱼缸', '人鱼', '鱼鱼', '喂食', '小鱼干', '水'], action: 'response', responses: SEREN_RESPONSES },
  { keywords: ['工作', '加班', '公司', '社畜', '累', '疲惫', '休息', '睡觉', '熬夜', '周一', '上班'], action: 'response', responses: WORK_RESPONSES },
  { keywords: ['对话', '说话', '交谈', '询问', '呼唤', '聊天', '聊聊'], action: 'response', responses: SEREN_RESPONSES },
  { keywords: ['前进', '向前', '走去', '前行', '出发', '移动', '继续'], action: 'response', responses: OUTSIDE_RESPONSES },
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

    // 重置开场白侧边栏触发标志（支持清除存档后重新开始）
    this._sidebarRevealed = false;
    this._displayQueue = [];
    this._isTyping = false;

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

    // 监听新游戏开始事件 — 重置侧边栏触发标志
    window.addEventListener('newgame-start', function () {
      self._sidebarRevealed = false;
      self._displayQueue = [];
      self._isTyping = false;
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
    // 推进游戏时间
    if (window.App && typeof window.App.advanceTime === 'function') {
      window.App.advanceTime();
    }
    var state = AppState.get();
    var aiOn = state.settings && state.settings.aiEnabled !== false;
    var playerText = PLAYER_PREFIX + truncate(text, 200);
    this._isInternalUpdate = true;
    AppState.push('narrativeHistory', playerText);
    this._isInternalUpdate = false;
    this._addPlayerActionText(text);
    if (this._suggestionsOpen) { this.toggleSuggestions(); }
    if (aiOn) { this._callAI(text); }
    else { this._callFallback(text); }
  },

  async _callAI(text) {
    var self = this;
    this._pendingResponses++;
    this._showThinking();
    try {
      var result = await AiClient.chat(text);
      this._hideThinking();
      // 累积 token 统计
      this._accumulateTokenUsage(result.usage);
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', result.narrative);
      self._isInternalUpdate = false;
      self._addNarratorText(result.narrative, undefined, function () {
        self._pendingResponses--;
        if (result.battle) { self._showBattleTrigger(); }
        else if (self._pendingResponses === 0) { self.showSuggestions(DEFAULT_SUGGESTIONS); }
      });
    } catch (err) {
      this._hideThinking();
      this._pendingResponses--;
      this._callFallback(text);
    }
  },

  /**
   * 累积 token 统计到 AppState
   */
  _accumulateTokenUsage: function (usage) {
    if (!usage || !usage.total_tokens) return;
    var stats = AppState.get('tokenStats') || {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      turns: 0
    };
    stats.promptTokens += usage.prompt_tokens || 0;
    stats.completionTokens += usage.completion_tokens || 0;
    stats.totalTokens += usage.total_tokens || 0;
    stats.turns += 1;
    AppState.set('tokenStats', stats);
  },

  _showThinking() {
    var c = document.querySelector('#panel-event .narrative-container');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'ai-thinking';
    el.innerHTML = '<span class="ai-thinking-dot"></span><span class="ai-thinking-dot"></span><span class="ai-thinking-dot"></span> 小猫之神思考中\u2026';
    c.appendChild(el); this._thinkingEl = el;
    c.scrollTop = c.scrollHeight;
  },

  _hideThinking() {
    if (this._thinkingEl) { this._thinkingEl.remove(); this._thinkingEl = null; }
  },

  _showBattleTrigger() {
    var c = document.querySelector('#panel-event .narrative-container');
    if (!c) return;
    var deck = BattleBridge.getDeckName();
    var el = document.createElement('div');
    el.className = 'battle-trigger-container';
    el.innerHTML = '<div class="battle-trigger-card"><div class="battle-trigger-glow"></div><div class="battle-trigger-text">黑暗决斗即将开始</div><div class="battle-trigger-deck">使用卡组: ' + deck + '</div><button class="battle-trigger-btn" id="battle-trigger-btn">开始对战</button></div>';
    c.appendChild(el); this._battleTriggerEl = el;
    c.scrollTop = c.scrollHeight;
    var btn = el.querySelector('#battle-trigger-btn');
    if (btn) { btn.addEventListener('click', function () { self._launchBattle(btn); }); }
  },

  async _launchBattle(btn) {
    btn.disabled = true; btn.textContent = '正在启动 MDPro3\u2026';
    var result = await BattleBridge.launch(BattleBridge.getDeckName());
    if (result.ok) {
      btn.textContent = '决斗已开启 (对手: ' + result.ai + ')';
      btn.className = 'battle-trigger-btn launched';
    } else { btn.textContent = '启动失败，请手动运行 MDPro3'; btn.disabled = false; }
  },

  _callFallback(text) {
    var self = this;
    this._pendingResponses++;
    setTimeout(function () {
      var response = self._generateResponse(text);
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', response);
      self._isInternalUpdate = false;
      self._addNarratorText(response, undefined, function () {
        self._pendingResponses--;
        if (self._pendingResponses === 0) { self.showSuggestions(DEFAULT_SUGGESTIONS); }
      });
    }, 600 + Math.random() * 400);
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
    if (!input) return randomPick(HOME_RESPONSES);

    var lowerInput = input.toLowerCase();

    // 遍历关键词映射
    for (var i = 0; i < KEYWORD_MAP.length; i++) {
      var entry = KEYWORD_MAP[i];
      for (var j = 0; j < entry.keywords.length; j++) {
        if (lowerInput.indexOf(entry.keywords[j].toLowerCase()) !== -1) {
          if (entry.action === 'battle') {
            this.setAtmosphere('tense');
            return '【离线模式】一股无形的力量在空气中凝聚——似乎有什么重大的变故即将发生。但此刻你的手机突然震动了一下，是码丽丝发来的消息："这么晚了还在外面？明天早上有早会，别迟到了。"';
          }
          if (entry.responses && entry.responses.length > 0) {
            this.setAtmosphere('calm');
            this._updateSuggestions(entry.keywords);
            return randomPick(entry.responses);
          }
        }
      }
    }

    // 无匹配 — 返回通用日常叙事
    this.setAtmosphere('calm');
    return randomPick(HOME_RESPONSES);
  },

  /**
   * 根据场景关键词更新建议选项
   */
  _updateSuggestions: function (matchedKeywords) {
    var kw = matchedKeywords.join('');
    var suggestions;
    if (kw.indexOf('塞壬') >= 0 || kw.indexOf('鱼缸') >= 0 || kw.indexOf('水') >= 0) {
      suggestions = ['摸摸塞壬的头', '喂她吃小鱼干', '跟她聊聊天', '坐在鱼缸旁边'];
    } else if (kw.indexOf('出门') >= 0 || kw.indexOf('上班') >= 0 || kw.indexOf('下班') >= 0) {
      suggestions = ['去便利店看看', '买点晚饭回家', '路过包子铺', '回家找塞壬'];
    } else if (kw.indexOf('客厅') >= 0 || kw.indexOf('房间') >= 0 || kw.indexOf('家里') >= 0) {
      suggestions = ['去鱼缸看看塞壬', '在沙发上休息一会', '准备出门上班', '看看窗外的风景'];
    } else {
      suggestions = DEFAULT_SUGGESTIONS;
    }
    this.showSuggestions(suggestions);
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

      // 开场白播放完毕 — 触发侧边栏渐显
      if (!this._sidebarRevealed) {
        this._sidebarRevealed = true;
        window.dispatchEvent(new CustomEvent('sidebar-reveal'));
      }

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

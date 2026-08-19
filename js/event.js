/* ==========================================================================
   光之回响 (Echoes of Light) — EventPanel 对话引擎
   渲染进近景特写层的对话区（CloseupView.getDialogEl()），对外 API 保持不变
   ========================================================================== */

import { AppState } from './state.js?v=23';
import { AiClient, BattleBridge } from './ai.js?v=23';
import { CloseupView } from './closeup.js?v=23';
import { SceneView } from './scene.js?v=23';
import { mapEmotion } from './emotion.js?v=23';
import { CHARACTERS } from './scenes-data.js?v=23';
import { countPresent } from './schedules.js?v=23';

/* ==========================================================================
   常量
   ========================================================================== */

/** 玩家行动的前缀标记 */
var PLAYER_PREFIX = '【玩家】';

/* ==========================================================================
   行动建议系统 — 按当前位置 + 四分类生成
   正经 / 恶作剧 / 色色(有女主角时显示) / 跑路
   ========================================================================== */

/** 场景 id → 行动桶映射（公司场景已删除；twins_room 归 home 行为桶） */
var SCENE_BUCKET = {
  home_living: 'home', home_bed: 'home', home_door: 'home', twins_room: 'home',
  food_bunshop: 'food', food_st: 'food',
  market_hall: 'market', market_door: 'market',
  cardshop_inside: 'card_shop', cardshop_door: 'card_shop',
  mall_st: 'mall', mall_dessert: 'mall',
  suburb_st: 'suburb', suburb_station: 'suburb', church: 'suburb', forest: 'suburb'
};

/** 各地点的四分类行动（每个分类随机抽一条） */
var LOCATION_ACTIONS = {
  'home': {
    '正经':   ['整理一下杂乱的客厅', '去厨房做点吃的', '把堆积的衣服洗了', '清理鱼缸换水', '认真整理卡组构筑', '看看窗外的天色'],
    '恶作剧': ['偷吃零依藏在冰箱里的布丁', '把她的校服裙子藏到衣柜深处', '在她追剧时突然换到新闻台', '趁她不注意把空调调低两度', '在她的拖鞋里塞一张冰凉的湿纸巾', '在沙发上故意占满所有位置'],
    '色色':   ['从背后轻轻环住窝在沙发角落看书的露世', '夸她"今天穿的白丝很可爱"', '故意只围着浴巾走出浴室', '假装睡着，等她偷偷靠近时一把拉住她', '在她耳边低声问"今晚要不要一起看恐怖片"'],
    '跑路':   ['借口买酱油溜出家门', '躲进卧室反锁房门戴上耳机', '假装已经睡熟了怎么叫都不醒', '"突然想起来还有个快递要取"']
  },
  'market': {
    '正经':   ['挑选今晚做饭要用的食材', '看看有没有新到的零食和饮料', '帮店员把新到的货品搬上货架', '买点纸巾牙膏之类的日用品', '跟店员聊聊最近街坊的趣事'],
    '恶作剧': ['故意拿起一箱最重的饮料让她帮忙搬', '在她专心整理货架时突然从背后"哇"一声', '把她刚摆好的薯片偷偷换到隔壁货架', '假装找不到自己的钱包看她着急翻找的样子'],
    '色色':   ['在她踮脚够高层货架时走到身后帮她拿', '夸她"今天身上的味道很好闻，换了新洗发水吗"', '在狭窄的货架间不经意贴近她，轻声问"最近有没有想我"', '结账时指尖轻轻擦过她的手心，假装不经意'],
    '跑路':   ['买完东西头也不回地走了', '假装接了个紧急电话快步离开', '"啊我忘了带钱包，下次再来！"', '趁她招呼其他客人时悄悄放下东西溜走']
  },
  'food': {
    '正经':   ['买两个刚出笼的热腾腾的肉包子', '坐下来慢慢吃一顿午饭', '看看今天有没有推出新口味', '帮艾克利西亚收拾隔壁桌的碗筷', '跟隔壁摊位的大叔打个招呼'],
    '恶作剧': ['趁她转身时从笼屉里多顺走一个包子', '故意板着脸说"今天的馅儿没上次好吃"然后看她慌张', '在她忙得团团转的时候点菜单上最复杂的那道小吃', '偷偷往她的围裙口袋里塞了一张写着"加油"的小纸条'],
    '色色':   ['目不转睛地看她认真干活的样子，被她发现后笑着说"你比包子好看"', '从她手里接过包子时指尖轻轻碰触她的手指', '"今天的包子特别甜……是不是你偷偷加了料？"', '夸她吃东西的样子很可爱，呆毛都竖起来了'],
    '跑路':   ['改成打包带走，不坐店里吃了', '"突然想起来还有个会，先走了"', '趁她进后厨端蒸笼时悄悄放下钱离开', '假装接到催命电话快步消失在人群里']
  },
  'card_shop': {
    '正经':   ['看看橱窗里新到的卡包', '跟老板聊聊最近的环境和禁卡表', '坐下来研究新卡组的构筑思路', '翻翻柜台里的二手卡册看有没有好货', '拿出卡组测试一下起手手感'],
    '恶作剧': ['跟老板开一个关于栗子球的冷到爆的冷笑话', '假装是纯新手问老板"青眼白龙厉害吗"', '跟旁边常客吹牛说昨天一包开出白龙', '偷偷把展示柜里几张卡的价格标签对调位置'],
    '色色':   [],
    '跑路':   ['收起卡组起身离开', '"今天手气不好，改天再来"', '假装手机响了说有约会匆匆告别', '趁老板跟别的客人聊得火热时悄悄溜走']
  },
  'mall': {
    '正经':   ['逛逛新开的服装店看看有没有合适的衣服', '在咖啡店买杯拿铁坐下来歇会儿', '在书店翻翻新出的漫画和轻小说', '看看有没有打折的日用品和家电', '找个安静的角落刷会儿手机'],
    '恶作剧': ['在自动扶梯上倒着站，看路人诧异的眼神', '在甜品店点一个最匪夷所思的口味组合', '在抓娃娃机前花光所有零钱然后气急败坏', '假装是神秘顾客给导购提一些离谱的问题'],
    '色色':   [],
    '跑路':   ['逛了一圈觉得无聊直接坐地铁回家了', '"人太多了喘不过气，还是回家吧"', '假装收到紧急工作消息快步离开商场', '从侧门溜出去避免在正门碰到熟人']
  },
  'suburb': {
    '正经':   ['沿着河边的碎石小路慢慢散步', '在草地上坐下来看天上的云缓缓飘过', '蹲下来仔细观察路边的野花和草丛', '做几个深呼吸，感受郊外的新鲜空气', '找一棵大树靠着坐下，闭上眼睛放空'],
    '恶作剧': ['往平静的河面上打几个水漂', '对着水边的草丛自言自语，假装在跟看不见的人对话', '故意在河边来回踱步，踩出很大的脚步声', '学青蛙"呱呱"叫，然后等着看有没有回应'],
    '色色':   [],
    '跑路':   ['散够了步，拍拍裤子上的草屑回城', '"风越来越大了，还是早点回去吧"', '假装接了个电话借故匆匆返回', '天色渐暗，快步往车站走去']
  }
};

/** 分类的视觉配置 */
var CATEGORY_STYLES = {
  '正经':   { emoji: '📋', cssClass: 'cat-serious',  label: '正经' },
  '恶作剧': { emoji: '😜', cssClass: 'cat-prank',   label: '恶作剧' },
  '色色':   { emoji: '💋', cssClass: 'cat-lewd',    label: '色色' },
  '跑路':   { emoji: '🚪', cssClass: 'cat-escape',  label: '跑路' }
};

/** 从当前位置生成分类建议列表（场景 id → 行动桶；色色按行程表在场判断） */
function getLocationSuggestions() {
  var state = AppState.get();
  var sceneId = state.currentSceneId || 'cardshop_inside';
  var bucket = SCENE_BUCKET[sceneId] || 'card_shop';
  var actions = LOCATION_ACTIONS[bucket] || LOCATION_ACTIONS['card_shop'];
  var heroines = countPresent(sceneId, state.gameTime);

  var result = [];
  var categories = ['正经', '恶作剧', '色色', '跑路'];

  categories.forEach(function (cat) {
    var pool = actions[cat];
    // 色色：当前时段没有女主角在场时不显示
    if (cat === '色色' && heroines === 0) return;
    // 该分类没有行动时跳过
    if (!pool || pool.length === 0) return;

    var text = pool[Math.floor(Math.random() * pool.length)];
    var style = CATEGORY_STYLES[cat];
    result.push({
      category: cat,
      emoji: style.emoji,
      cssClass: style.cssClass,
      label: style.label,
      text: text
    });
  });

  return result;
}

/** 打字机速度映射（毫秒/字） */
var SPEED_MAP = {
  slow: 80,
  normal: 40,
  fast: 15
};

/* --------------------------------------------------------------------------
   预设叙事文本库 — 按当前位置 + 行动类别组织
   -------------------------------------------------------------------------- */

/** 各场景的通用叙事（用于 AI 离线/超时时的兜底响应，按场景 ID 分组） */
var SCENE_FALLBACKS = {
  home_living: [
    '客厅里静悄悄的，只有挂钟的滴答声。',
    '你环顾四周，暂时没有新的状况。',
  ],
  home_bed: [
    '卧室里的空气安静而温暖。',
    '你靠在门边，决定先不打扰这份安宁。',
  ],
  home_door: [
    '门前的小路很安静，远处传来小河的水声。',
    '你站在家门口，晚风轻轻吹过。',
  ],
  food_bunshop: [
    '蒸笼冒着热气，包子的香气弥漫开来。',
    '店铺里很热闹，但没人注意到你。',
  ],
  food_st: [
    '小吃街上人声鼎沸，摊贩的吆喝声此起彼伏。',
    '你在人流中穿行，暂时没有目标。',
  ],
  market_hall: [
    '卖场里灯火通明，货架一眼望不到头。',
    '你推着购物车，随便逛了逛。',
  ],
  market_door: [
    '超市门口进进出出的顾客络绎不绝。',
    '你站在门口，犹豫着要不要进去。',
  ],
  cardshop_inside: [
    '牌店里弥漫着卡包特有的纸墨味。',
    '对战桌前空无一人，只有灯光静静亮着。',
  ],
  cardshop_door: [
    '牌店的招牌在夜色里泛着微光。',
    '你看了看橱窗里的新卡包，没有进去。',
  ],
  mall_st: [
    '商业街的霓虹灯层层叠叠，人流如织。',
    '你漫无目的地走在街上。',
  ],
  mall_dessert: [
    '甜品店里飘着奶油和焦糖的甜香。',
    '柜台后的店员正忙着招呼客人。',
  ],
  suburb_st: [
    '城郊的街道很安静，偶尔有车驶过。',
    '你沿着人行道慢慢走着。',
  ],
  suburb_station: [
    '站台上电子屏刷新着时刻表，列车缓缓进站。',
    '你站在月台上，风从轨道方向吹来。',
  ],
  twins_room: [
    '双子房间的门虚掩着，里面传来直播的声音。',
    '你站在门口，没有贸然打扰。',
  ],
  church: [
    '教堂里很安静，只有彩窗漏下的光。',
    '你放轻了脚步，生怕打破这份宁静。',
  ],
  forest: [
    '森林里静悄悄的，只有风吹树叶的沙沙声。',
    '你在林间小径上慢慢走着。',
  ],
};

/** 通用行动确认句（用于拼合玩家行动 + 场景叙事） */
var ACTION_ACKNOWLEDGMENTS = [
  '你试着{action}。',
  '你决定{action}。',
  '你{action}。',
  '你一边想着，一边{action}。',
  '你没多想，{action}。'
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
  _initialized: false,
  _isTyping: false,
  _isSubmitting: false,
  _typewriterTimer: null,
  _suggestionsOpen: false,
  _displayQueue: [],
  _lastDisplayedIndex: 0,
  _pendingResponses: 0,
  _isInternalUpdate: false,

  /**
   * 初始化对话引擎（懒初始化：首次打开特写（closeup-open）时调用）
   * 渲染 DOM 到近景特写的对话容器、绑定事件、显示已有叙事历史
   */
  init() {
    if (this._initialized) return;
    this._el = CloseupView.getDialogEl();
    if (!this._el) return;

    this._renderDOM();
    this._bindEvents();
    this._initialized = true;
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

    // Check for pending duel result on load
    this._checkPendingDuelResult();

    // 场景旁白请求（scene.js 进入场景时派发）：AI 描述在场角色反应或环境
    window.addEventListener('scene-narration-request', function (e) {
      self.requestSceneNarration(e.detail || {});
    });
  },

  /**
   * 重置显示状态 — 新游戏开始时清空对话队列与打字状态（防跨局残留）
   */
  resetDisplay: function () {
    this._displayQueue = [];
    this._isTyping = false;
    if (this._typewriterTimer) {
      clearTimeout(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    if (this._narrativeEl) this._narrativeEl.innerHTML = '';
  },

  /* ===================================================================
     渲染
     =================================================================== */

  /**
   * 渲染对话引擎 HTML 到近景特写的对话容器（#closeup-dialog）
   * 叙事区 / 建议 / 输入区 / 对战卡片均渲染在 .event-dialog 内部
   */
  _renderDOM() {
    this._el.innerHTML =
      '<div class="event-atmosphere"></div>' +
      '<div class="event-dialog">' +
        '<div class="narrative-text" id="narrative-text"></div>' +
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
    if (this._isTyping || this._pendingResponses > 0 || this._isSubmitting) return;
    var text = this._inputEl.value.trim();
    if (!text) return;

    this._isSubmitting = true;
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
      console.log('[EventPanel] AI result — battle:', result.battle, '| narrative_len:', (result.narrative||'').length, '| detectIntent:', self._detectBattleIntent(result.narrative));
      // 表情系统：AI 情感标签 → 立绘差分切换（每次 AI 响应都会触发）
      const emo = mapEmotion(result.emotion);
      CloseupView.setEmotion(emo);
      const cs = AppState.get('closeup');
      if (cs && cs.characterId) SceneView.setCharacterEmotion(cs.characterId, emo);
      // 累积 token 统计
      this._accumulateTokenUsage(result.usage);
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', result.narrative);
      self._isInternalUpdate = false;
      self._lastAISuggestions = result.suggestions || [];
      self._addNarratorText(result.narrative, undefined, function () {
        self._pendingResponses--;
        self._isSubmitting = false;
        if (result.battle || self._detectBattleIntent(result.narrative)) {
          self._showBattleTrigger(self._extractOpponentName(result.narrative));
        }
        else if (self._pendingResponses === 0) {
          self.showSuggestions(self._lastAISuggestions.length > 0 ? self._lastAISuggestions : getLocationSuggestions());
          // Add regenerate button
          self._addRegenerateBtn();
        }
      });
    } catch (err) {
      this._hideThinking();
      this._pendingResponses--;
      this._isSubmitting = false;
      var errMsg = err.message || String(err);
      console.error('[EventPanel] AI 调用失败:', errMsg);
      // 显示错误原因 + 友好提示，再走离线兜底
      this._addNarratorText('💬 API 连不上哦，再检查一下网站和密钥吧\n（' + errMsg + '）', 0, function () {
        self._callFallback(text);
      });
    }
  },

  /**
   * 场景旁白：进入场景时请求 AI 描述在场角色反应 / 环境（用户要求）
   * 不在叙事历史中写入玩家行动，AI 失败时静默（不打断输入状态）
   * 兜底文案统一为「api连接错误，检查一下api哦~」（AI 关闭/失败均用此文案）
   * @param {{ aiText: string }} detail
   */
  requestSceneNarration: function (detail) {
    var self = this;
    var aiText = detail.aiText;
    var fallbackText = 'api连接错误，检查一下api哦~';
    if (!aiText) return;
    // 有请求在途/正在提交时不叠加旁白
    if (this._pendingResponses > 0 || this._isSubmitting) return;

    var state = AppState.get();
    var aiOn = state.settings && state.settings.aiEnabled !== false;
    if (!aiOn) {
      if (fallbackText) this._addNarratorText(fallbackText);
      return;
    }

    this._pendingResponses++;
    this._showThinking();
    AiClient.chat(aiText).then(function (result) {
      self._hideThinking();
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', result.narrative);
      self._isInternalUpdate = false;
      self._lastAISuggestions = result.suggestions || [];
      self._addNarratorText(result.narrative, undefined, function () {
        self._pendingResponses--;
        self._isSubmitting = false;
        if (self._pendingResponses === 0) {
          self.showSuggestions(self._lastAISuggestions.length > 0 ? self._lastAISuggestions : getLocationSuggestions());
          self._addRegenerateBtn();
        }
      });
    }).catch(function (err) {
      self._hideThinking();
      self._pendingResponses--;
      self._isSubmitting = false;
      console.warn('[EventPanel] 场景旁白失败:', err.message);
      if (fallbackText) self._addNarratorText(fallbackText);
    });
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
    var c = this._narrativeEl;
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

  /**
   * 从叙事文本中提取对手角色名
   */
  _extractOpponentName(narrative) {
    if (!narrative) return null;
    var chars = ['塞壬', '零依', '露世', '姬丝吉尔', '璃拉', '艾克利西亚', '天童', '理', '彩虹'];
    for (var i = 0; i < chars.length; i++) {
      if (narrative.indexOf(chars[i]) >= 0) return chars[i];
    }
    return null;
  },

  /**
   * 查找角色对战配置：优先匹配伙伴，否则生成随机 NPC
   */
  _resolveBattleOpponent(opponentName) {
    var companions = AppState.get('companions');
    for (var i = 0; i < companions.length; i++) {
      if (companions[i].name === opponentName) {
        var c = companions[i];
        return {
          name: c.name,
          deck: c.deck || 'BlueEyes',
          battleLines: c.battleLines || { opening: '', victory: '', defeat: '' }
        };
      }
    }
    // 随机 NPC
    var NPC_NAMES = ['牌店常客', '路过的决斗者', '公司后辈', '超市顾客', '小吃街食客',
                     '商业街路人', '城郊少年', '神秘旅人', '流浪卡牌师', '街头艺人',
                     '退休老伯', '高中生', '竞技场新手', '卡店老板', '深夜牌友'];
    var NPC_DECKS = ['Blackwing','CyberDragon','DarkMagician','BlueEyes','Salamangreat',
                     'Trickstar','Mathmech','Swordsoul','SkyStriker','ThunderDragon',
                     'Witchcraft','Zoodiac','Monarch506','Qliphort','Nekroz',
                     'SuperheavySamurai','Dragunity','Evilswarm','Gravekeeper','Yosenju',
                     'Exosister','Dogmatika','Horus','Kashtira','Altergeist',
                     'PureWinds','Timethief','Trickstar','Yubel','Zefra',
                     'Frog','Graydle','Phantasm','ChainBurn','Burn'];
    var name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
    var deck = NPC_DECKS[Math.floor(Math.random() * NPC_DECKS.length)];
    return {
      name: name,
      deck: deck,
      battleLines: {
        opening: '来一局决斗吧！让我看看你的实力！',
        victory: '不错的决斗，承让了！',
        defeat: '学到了很多，你果然很强！'
      }
    };
  },

  /**
   * 兜底检测：即使 AI 没设 battle=true，只要叙事中提到决斗触发词，也弹出对战按钮
   */
  _detectBattleIntent(narrative) {
    if (!narrative) return false;
    var keywords = ['决斗即将开始', 'DUEL', '抽牌', '我的回合', '你的回合',
                    '决斗盘', '召唤怪兽', '发动魔法', '盖放', '战斗阶段',
                    '结束回合', '通常召唤', '场地魔法'];
    var count = 0;
    for (var i = 0; i < keywords.length; i++) {
      if (narrative.indexOf(keywords[i]) >= 0) count++;
    }
    return count >= 2;  // 至少命中 2 个关键词才触发
  },

  _showBattleTrigger(opponentName) {
    var c = this._narrativeEl;
    if (!c) return;
    var opp = this._resolveBattleOpponent(opponentName);
    var playerDeck = BattleBridge.getDeckName();
    var el = document.createElement('div');
    el.className = 'battle-trigger-container';
    var lineHtml = opp.battleLines && opp.battleLines.opening
      ? '<div class="battle-trigger-line">"' + opp.battleLines.opening + '"</div>'
      : '';
    el.innerHTML =
      '<div class="battle-trigger-card">' +
        '<div class="battle-trigger-glow"></div>' +
        '<div class="battle-trigger-text">黑暗决斗即将开始</div>' +
        '<div class="battle-trigger-deck">对手: ' + opp.name + ' | 使用卡组: ' + playerDeck + '</div>' +
        lineHtml +
        '<button class="battle-trigger-btn" id="battle-trigger-btn">开始对战</button>' +
      '</div>';
    c.appendChild(el); this._battleTriggerEl = el;
    c.scrollTop = c.scrollHeight;
    var that = this;
    var btn = el.querySelector('#battle-trigger-btn');
    if (btn) { btn.addEventListener('click', function () { that._launchBattle(btn, opp.name); }); }
  },

  async _launchBattle(btn, opponent) {
    // btn 为 null 时（⚔ 提出决斗按钮路径）跳过按钮态，直接启动对战
    var isBtnMode = !!btn;
    if (isBtnMode) { btn.disabled = true; btn.textContent = '正在启动 MDPro3…'; }
    console.log('[EventPanel] _launchBattle: sending /battle, deck:', BattleBridge.getDeckName(), 'opponent:', opponent);
    try {
      var result = await BattleBridge.launch(BattleBridge.getDeckName(), opponent);
      console.log('[EventPanel] _launchBattle result:', JSON.stringify(result));
      if (result.ok) {
        if (isBtnMode) {
          btn.textContent = '决斗已开启 (对手: ' + result.ai + ')';
          btn.className = 'battle-trigger-btn launched';
        } else {
          this._addNarratorText('⚔️ 黑暗决斗开始——' + opponent + ' 接受了你的挑战！');
        }
        BattleBridge.startPolling(function(r) {
          console.log('[EventPanel] Duel callback fired:', r);
          var playerWon = r.winner === 'player';
          var reasonNames = {0: '认输', 1: '生命值归零', 2: '卡组抽空', 3: '特殊胜利', 4: '连接断开'};
          var reasonText = reasonNames[r.reason] || ('原因#' + r.reason);
          var resultMsg = playerWon
            ? '你击败了' + r.botName + '（' + reasonText + '）'
            : '你败给了' + r.botName + '（' + reasonText + '）';
          // 注入角色胜负台词
          var opp = EventPanel._resolveBattleOpponent(opponent);
          var charLine = '';
          if (opp && opp.battleLines) {
            charLine = playerWon ? opp.battleLines.defeat : opp.battleLines.victory;
          }
          var fullMsg = '⚔️ 决斗结束 — ' + resultMsg;
          if (charLine) fullMsg += '\n\n「' + charLine + '」';
          if (isBtnMode) {
            btn.textContent = playerWon ? '胜利！' : '败北…';
            btn.className = 'battle-trigger-btn finished';
            btn.disabled = true;
          }
          EventPanel._addNarratorText(fullMsg, null, function () {
            EventPanel.submitAction('决斗结束了，我' + (playerWon ? '赢了' : '输了') + '，生成后续叙事');
          });
        });
      } else {
        console.error('[EventPanel] Battle launch FAILED:', result.error, result.message);
        if (isBtnMode) {
          btn.textContent = '启动失败: ' + (result.message || result.error || '未知');
          btn.disabled = false;
        } else {
          this._addNarratorText('⚠️ 决斗启动失败：' + (result.message || result.error || '未知'));
        }
      }
    } catch (err) {
      console.error('[EventPanel] _launchBattle error:', err);
      if (isBtnMode) {
        btn.textContent = '启动出错，请重试'; btn.disabled = false;
      } else {
        this._addNarratorText('⚠️ 决斗启动出错，请重试。');
      }
    }
  },

  _addRegenerateBtn() {
    var self = this;
    var container = this._el.querySelector('.narrative-text');
    if (!container) return;
    // Remove existing regenerate buttons
    var existing = container.querySelectorAll('.regenerate-btn');
    existing.forEach(function (e) { e.remove(); });

    var btn = document.createElement('button');
    btn.className = 'regenerate-btn';
    btn.textContent = '🔄 重新生成';
    btn.style.cssText = 'display:block;margin:12px auto 0;padding:6px 16px;font-size:13px;border:1px solid #666;border-radius:20px;background:transparent;color:#aaa;cursor:pointer;transition:all 0.2s;';
    btn.addEventListener('mouseenter', function () { btn.style.color = '#fff'; btn.style.borderColor = '#ccc'; });
    btn.addEventListener('mouseleave', function () { btn.style.color = '#aaa'; btn.style.borderColor = '#666'; });
    btn.addEventListener('click', function () { self._regenerate(); });
    container.appendChild(btn);
  },

  _regenerate() {
    var self = this;
    if (this._isSubmitting || this._pendingResponses > 0) {
      console.log('[Regenerate] Blocked: submitting=' + this._isSubmitting + ' pending=' + this._pendingResponses);
      return;
    }
    console.log('[Regenerate] Starting...');
    var state = AppState.get();
    var history = state.narrativeHistory || [];
    console.log('[Regenerate] History before pop:', history.length, 'entries');
    // Remove last AI response
    while (history.length > 0) {
      var last = history[history.length - 1];
      if (last.startsWith('【玩家】')) break;
      console.log('[Regenerate] Popping AI:', last.substring(0, 50));
      history.pop();
    }
    // Get last player action
    var lastPlayer = history.length > 0 ? history[history.length - 1] : '';
    console.log('[Regenerate] Last player:', lastPlayer ? lastPlayer.substring(0, 50) : '(none)');
    history.pop();
    AppState.set('narrativeHistory', history);
    // Remove UI bubbles
    var container = this._el.querySelector('.narrative-text');
    if (container) {
      var bubbles = container.querySelectorAll('.narrative-bubble.ai');
      if (bubbles.length > 0) { bubbles[bubbles.length - 1].remove(); }
      var playerBubbles = container.querySelectorAll('.narrative-bubble.player');
      if (playerBubbles.length > 0) { playerBubbles[playerBubbles.length - 1].remove(); }
      container.querySelectorAll('.regenerate-btn').forEach(function (e) { e.remove(); });
    }
    var text = lastPlayer.replace('【玩家】', '').trim();
    console.log('[Regenerate] Resubmitting:', text ? text.substring(0, 50) : '(empty)');
    if (text) {
      self._isSubmitting = true;
      self._showThinking();
      self._callAI(text);
    }
  },

  _checkPendingDuelResult() {
    var self = this;
    fetch(AiClient.endpoint + '/duel-status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok && data.result && !data.battle_running) {
          var r = data.result;
          var playerWon = r.winner === 'player';
          var reasonNames = {0: '认输', 1: '生命值归零', 2: '卡组抽空', 3: '特殊胜利', 4: '连接断开'};
          var reasonText = reasonNames[r.reason] || ('原因#' + r.reason);
          var resultMsg = playerWon
            ? '你击败了' + r.botName + '（' + reasonText + '）'
            : '你败给了' + r.botName + '（' + reasonText + '）';
          console.log('[EventPanel] Found pending duel result:', r);
          self._addNarratorText('⚔️ 决斗结束 — ' + resultMsg, null, function () {
            self.submitAction('决斗结束了，我' + (playerWon ? '赢了' : '输了') + '，生成后续叙事');
          });
        }
      }).catch(function (e) { console.log('[EventPanel] No pending result'); });
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
        self._isSubmitting = false;
        if (self._pendingResponses === 0) { self.showSuggestions(getLocationSuggestions()); }
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
        self._typewriterTimer = setTimeout(typeChar, speed);
      } else {
        p.classList.remove('typing-cursor');
        self._typewriterTimer = null;
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
   * 展开建议选项 — 分类卡片样式
   * @param {Array<{category:string, emoji:string, cssClass:string, label:string, text:string}>} options
   */
  showSuggestions: function (options) {
    if (!options || options.length === 0) return;

    this._suggestionsPanel.innerHTML = '';

    var self = this;

    // AI suggestions come as strings, legacy format as objects
    var items = options.map(function (opt) {
        if (typeof opt === 'string') {
            return { text: opt, emoji: '💬', label: '建议', cssClass: '' };
        }
        return opt;
    });

    items.forEach(function (opt, index) {
      var card = document.createElement('div');
      card.className = 'suggestion-card ' + (opt.cssClass || '');
      card.style.animationDelay = (index * 60) + 'ms';

      card.innerHTML =
        '<span class="suggestion-cat">' + opt.emoji + ' ' + opt.label + '</span>' +
        '<span class="suggestion-text">' + opt.text + '</span>';

      card.addEventListener('click', function () {
        self._inputEl.value = opt.text;
        self._inputEl.style.height = 'auto';
        self._inputEl.style.height = Math.min(self._inputEl.scrollHeight, 120) + 'px';
        self._inputEl.focus();
      });

      card.addEventListener('dblclick', function () {
        self._inputEl.value = opt.text;
        self.submitAction(opt.text);
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
   * 生成兜底叙事 — 根据当前场景返回合理的场景叙事
   * @param {string} input - 玩家输入
   * @returns {string} 响应文本
   */
  _generateResponse: function (input) {
    var sceneId = AppState.get('currentSceneId') || 'home_living';
    var pool = SCENE_FALLBACKS[sceneId] || SCENE_FALLBACKS['home_living'];

    this.setAtmosphere('calm');

    // 战斗关键词
    var lowerInput = (input || '').toLowerCase();
    if (lowerInput.indexOf('战斗') >= 0 || lowerInput.indexOf('决斗') >= 0 || lowerInput.indexOf('挑战') >= 0) {
      this.setAtmosphere('tense');
      return '你察觉到空气中凝聚着一股无形的力量——这是黑暗决斗即将开启的前兆。你的决斗盘微微发热，卡组在呼唤着你。';
    }

    // 直接返回当前场景的兜底叙事
    return randomPick(pool);
  },

  /**
   * 根据场景关键词更新建议选项
   */
  _updateSuggestions: function (matchedKeywords) {
    // 统一使用基于当前位置的分类建议
    this.showSuggestions(getLocationSuggestions());
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
        this.showSuggestions(getLocationSuggestions());
      }
      return;
    }

    this._isTyping = true;
    // 对话开始通知：特写层据此安排「对话 2 秒后 CG」（每次打开仅触发一次，内部有守卫）
    CloseupView.onDialogueStarted();
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

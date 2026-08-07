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

/* ==========================================================================
   行动建议系统 — 按当前位置 + 四分类生成
   正经 / 恶作剧 / 色色(有女主角时显示) / 跑路
   ========================================================================== */

/** 每个地点存在的女主角（用于判断色色分类是否显示） */
var LOCATION_HEROINES = {
  'home':      ['白月'],
  'company':   ['林仪', '柳月'],
  'market':    ['苏昀'],
  'food':      ['艾克利西娅'],
  'card_shop': [],
  'mall':      [],
  'suburb':    []
};

/** 各地点的四分类行动（每个分类随机抽一条） */
var LOCATION_ACTIONS = {
  'home': {
    '正经':   ['整理一下杂乱的客厅', '去厨房做点吃的', '把堆积的衣服洗了', '清理鱼缸换水', '认真整理卡组构筑', '看看窗外的天色'],
    '恶作剧': ['偷吃白月藏在冰箱里的布丁', '把她的校服裙子藏到衣柜深处', '在她追剧时突然换到新闻台', '趁她不注意把空调调低两度', '在她的拖鞋里塞一张冰凉的湿纸巾', '在沙发上故意占满所有位置'],
    '色色':   ['从背后轻轻环住窝在沙发上的白月', '夸她"今天穿的白丝很可爱"', '故意只围着浴巾走出浴室', '假装睡着，等她偷偷靠近时一把拉住她', '在她耳边低声问"今晚要不要一起看恐怖片"'],
    '跑路':   ['借口买酱油溜出家门', '躲进卧室反锁房门戴上耳机', '假装已经睡熟了怎么叫都不醒', '"突然想起来还有个快递要取"']
  },
  'company': {
    '正经':   ['专心写完堆积的报告', '整理桌面杂乱的文件和报表', '回复积压了一周的邮件', '准备下周的汇报PPT', '泡杯咖啡继续埋头工作'],
    '恶作剧': ['趁柳月去洗手间把她的鼠标灵敏度调到最低', '偷偷往林仪的咖啡里多加三块糖', '把复印机操作语言改成日语', '在茶水间贴一张"本月零食免费"的假通知', '给柳月发消息"林总找你"然后看她慌张跑上楼'],
    '色色':   ['去林仪办公室敲门说"想和你单独谈谈"', '经过柳月工位时低头在她耳边说"今天的香水很好闻"', '给林仪发消息"关于上次那个提案，下班后私下聊聊？"', '在无人的楼梯间等柳月经过'],
    '跑路':   ['借口头疼提前下班回家', '趁林仪开会时从侧门偷偷溜走', '"突然胃不舒服，今天先回去了"', '躲进消防通道刷手机熬到下班']
  },
  'market': {
    '正经':   ['挑选今晚做饭要用的食材', '看看有没有新到的零食和饮料', '帮苏昀把新到的货品搬上货架', '买点纸巾牙膏之类的日用品', '跟苏昀聊聊最近街坊的趣事'],
    '恶作剧': ['故意拿起一箱最重的饮料让她帮忙搬', '在她专心整理货架时突然从背后"哇"一声', '把她刚摆好的薯片偷偷换到隔壁货架', '假装找不到自己的钱包看她着急翻找的样子'],
    '色色':   ['在她踮脚够高层货架时走到身后帮她拿', '夸她"今天身上的味道很好闻，换了新洗发水吗"', '在狭窄的货架间不经意贴近她，轻声问"最近有没有想我"', '结账时指尖轻轻擦过她的手心，假装不经意'],
    '跑路':   ['买完东西头也不回地走了', '假装接了个紧急电话快步离开', '"啊我忘了带钱包，下次再来！"', '趁她招呼其他客人时悄悄放下东西溜走']
  },
  'food': {
    '正经':   ['买两个刚出笼的热腾腾的肉包子', '坐下来慢慢吃一顿午饭', '看看今天有没有推出新口味', '帮艾克利西娅收拾隔壁桌的碗筷', '跟隔壁摊位的大叔打个招呼'],
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

/** 从当前位置生成分类建议列表 */
function getLocationSuggestions() {
  var state = AppState.get();
  var locId = state.currentLocation || 'card_shop';
  var actions = LOCATION_ACTIONS[locId] || LOCATION_ACTIONS['card_shop'];
  var heroines = LOCATION_HEROINES[locId] || [];

  var result = [];
  var categories = ['正经', '恶作剧', '色色', '跑路'];

  categories.forEach(function (cat) {
    var pool = actions[cat];
    // 色色：没有女主角时不显示
    if (cat === '色色' && heroines.length === 0) return;
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

/** 各地点的通用叙事（用于 AI 离线时的兜底响应） */
var LOCATION_FALLBACKS = {
  'card_shop': [
    '牌店里冷气开得很足，空气中弥漫着卡包开封后的油墨香。几个常客围在桌边争论着新禁卡表对环境的冲击，老板靠在柜台上悠闲地刷着手机。你在熟悉的牌桌前坐下，手指习惯性地敲了敲桌面。',
    '你推开牌店的玻璃门，风铃叮咚响了一声。老板抬头冲你点了点头，又继续低头整理新到的卡包。展示柜里的稀有卡牌在射灯下泛着微微的珠光，墙上那张磨损的决斗垫记录着无数次激战。',
    '牌店角落的自动售货机嗡嗡作响。你投了一罐冰咖啡，坐在靠窗的位置。玻璃窗外是来来往往的行人，店内是空调的嗡鸣和洗牌的沙沙声——这是你为数不多能彻底放松的地方。'
  ],
  'home': [
    '你推开家门，熟悉的气息扑面而来。白月的校服外套搭在沙发扶手上，茶几上摆着没喝完的奶茶。她从手机屏幕上抬起眼，瞥了你一眼："杂鱼哥哥终于回来了？冰箱里有剩的炒饭，自己热。"',
    '客厅里安安静静的，只有鱼缸过滤器的轻微水声。白月正窝在沙发上追剧，两条白丝小腿翘在扶手上晃来晃去。看到你走过来，她连姿势都没换，只是往旁边挪了半个身位——算是给你让了座。',
    '你走进厨房，水槽里堆着白月吃完没洗的碗。冰箱门上的便利贴是她歪歪扭扭的字迹："冰箱里的布丁是我的！偷吃的话今晚别想睡觉——月月"。你笑了笑，还是伸手拿了一个。'
  ],
  'company': [
    '写字楼的空调温度永远调得太低。你坐在工位上，面前的显示器泛着苍白的荧光。斜对面的柳月正低着头假装在处理文件，但那双粉色的眸子每隔几秒就往你这边偷瞄一眼。',
    '公司的茶水间永远是最热闹的地方。你端着杯子走进去的时候，正好跟从里面出来的林仪打了个照面。她今天穿了一件贴身的白紫连衣裙，看到你时那双蓝瞳里闪过一丝难以察觉的波动。"……别在茶水间摸鱼太久。"她冷冷地丢下一句，高跟鞋的声音渐渐远去。',
    '午休时间，大部分同事都下楼吃饭了。你留在工位上整理下周的汇报材料，忽然闻到一阵淡淡的甜香——柳月不知什么时候站在你旁边，手里捧着两杯奶茶。"前辈……我多买了一杯，不介意的话……"她的声音越来越小，耳根肉眼可见地红了。'
  ],
  'market': [
    '便利店的自动门叮咚一声。苏昀正在货架间整理新到的商品，彩虹色的长发松松地挽在脑后。听到门铃声她下意识地说了句"欢迎光临"，转过头看到是你，那张温柔的脸上立刻绽开了笑容。',
    '你在货架间穿行，手指从一排排商品上滑过。收银台后面的苏昀正托着腮看你挑选，那双金色的眼眸里含着说不清的情愫。你每拿起一样东西，她就悄悄在收银系统里打一个折扣。',
    '傍晚的超市里没什么人，只有冰柜的嗡嗡声和你踩在地板上的脚步声。苏昀搬着一箱饮料从仓库里出来，看到你时险些绊了一跤。你快步上前扶住了箱子——也扶住了她微微颤抖的手腕。'
  ],
  'food': [
    '小吃街永远飘着诱人的香气。蒸笼里的包子冒着白蒙蒙的热气，艾克利西娅正系着围裙在摊前忙得脚不沾地。看到你走过来，她头顶那根呆毛猛地竖了起来，银色的眼眸亮晶晶的。',
    '你找了个角落的位子坐下，点了一屉刚出笼的鲜肉包子。艾克利西娅端着蒸笼小跑过来，放下时还不忘用袖子擦了擦桌面上不存在的灰。"趁热吃！这笼是我特意挑的，馅最大……"她说着自己先咽了口口水。',
    '小吃街上人来人往，各色摊位的吆喝声此起彼伏。艾克利西娅忙完了午市的高峰，终于有空坐下来歇口气。她把围裙解下来搭在椅背上，用手背擦了擦额头的汗，冲你露出一个累并快乐着的笑容。'
  ],
  'mall': [
    '商业街上人来人往，霓虹灯和橱窗把整条街照得五光十色。咖啡店飘来的香气混着面包店刚出炉的甜腻，让人不自觉地放慢了脚步。你在人群中穿行，偶尔瞥一眼身旁橱窗里的倒影。',
    '商场的冷气很足，跟外面闷热的街道形成鲜明对比。你沿着自动扶梯一层一层往上逛，经过服装店、书店、甜品屋。身边都是拎着购物袋的路人，没人注意你——这种感觉反而让人轻松。',
    '你在咖啡店里找了个靠窗的位置坐下来。玻璃窗外是川流不息的人群，玻璃窗内是你手中的热拿铁和耳机里放着的轻音乐。难得的闲暇时光，什么都不用想，什么都不用管。'
  ],
  'suburb': [
    '城郊的空气比市区清新了许多。你沿着河边的小路慢慢走着，脚下是碎石子铺成的小径，两旁是高高的野草。河水在夕阳下泛着碎金般的光，远处隐约能听见水流冲刷石头的声响。',
    '你在河边的草地上坐下来，背后靠着一棵歪脖子柳树。微风吹过，草叶沙沙作响。水面时不时泛起一圈圈涟漪——也许是鱼，也许是别的什么东西。这里安静得能听见自己的呼吸声。',
    '天色渐暗，城郊的虫鸣开始此起彼伏。河水倒映着橘红色的晚霞，像一条流动的丝带。你站起身拍拍裤子上的草屑，回头望了一眼那条安静的小河。明天你还会再来的。'
  ]
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
  _skipBtn: null,
  _suggestToggle: null,
  _suggestionsPanel: null,
  _suggestArrow: null,
  _inputEl: null,
  _sendBtn: null,

  /* --- 状态 --- */
  _isTyping: false,
  _isSkipping: false,
  _isSubmitting: false,
  _typewriterTimer: null,
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
      self._isSkipping = false;
      if (self._typewriterTimer) {
        clearTimeout(self._typewriterTimer);
        self._typewriterTimer = null;
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
        '<button class="skip-intro-btn hidden" id="skip-intro-btn">跳过 ▸▸</button>' +
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
    this._skipBtn = document.getElementById('skip-intro-btn');
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

    // --- 跳过开场白按钮 ---
    if (this._skipBtn) {
      this._skipBtn.addEventListener('click', function () {
        self._skipIntro();
      });
    }
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
      // 累积 token 统计
      this._accumulateTokenUsage(result.usage);
      self._isInternalUpdate = true;
      AppState.push('narrativeHistory', result.narrative);
      self._isInternalUpdate = false;
      self._addNarratorText(result.narrative, undefined, function () {
        self._pendingResponses--;
        self._isSubmitting = false;
        if (result.battle) { self._showBattleTrigger(); }
        else if (self._pendingResponses === 0) { self.showSuggestions(getLocationSuggestions()); }
      });
    } catch (err) {
      this._hideThinking();
      this._pendingResponses--;
      this._isSubmitting = false;
      var errMsg = err.message || String(err);
      console.error('[EventPanel] AI 调用失败:', errMsg);
      // 显示友好提示，走离线兜底
      this._addNarratorText('💬 API 连不上哦，再检查一下网站和密钥吧\n（已切换到离线模式）', 0, function () {
        self._callFallback(text);
      });
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

    // 跳过模式：瞬间完成，无打字机
    if (this._isSkipping) {
      var p = document.createElement('p');
      p.textContent = text;
      this._narrativeEl.appendChild(p);
      this._scrollToBottom();
      if (doneCallback) doneCallback();
      return;
    }

    // 确定打字速度
    if (speed === undefined || speed === null) {
      var settings = AppState.get('settings');
      speed = SPEED_MAP[settings.textSpeed] || SPEED_MAP.normal;
    }

    // 显示跳过按钮（仅开场阶段）
    if (!this._sidebarRevealed && this._skipBtn) {
      this._skipBtn.classList.remove('hidden');
    }

    var p = document.createElement('p');
    p.classList.add('typing-cursor');
    this._narrativeEl.appendChild(p);
    this._scrollToBottom();

    var index = 0;

    function typeChar() {
      if (self._isSkipping) {
        // 跳过：直接填满剩余文字
        p.textContent = text;
        p.classList.remove('typing-cursor');
        self._scrollToBottom();
        if (doneCallback) doneCallback();
        return;
      }
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
     跳过开场白
     =================================================================== */

  /**
   * 跳过开场白 — 瞬间显示所有剩余文本，立即触发侧边栏
   */
  _skipIntro: function () {
    this._isSkipping = true;

    // 清除正在进行的打字机计时器
    if (this._typewriterTimer) {
      clearTimeout(this._typewriterTimer);
      this._typewriterTimer = null;
    }

    // 移除当前段落的打字光标
    var cursors = this._narrativeEl.querySelectorAll('.typing-cursor');
    cursors.forEach(function (el) {
      el.classList.remove('typing-cursor');
    });

    // 瞬间渲染队列中所有剩余文本
    while (this._displayQueue.length > 0) {
      var text = this._displayQueue.shift();
      if (text.indexOf(PLAYER_PREFIX) === 0) {
        this._addPlayerActionText(text.substring(PLAYER_PREFIX.length));
      } else {
        var p = document.createElement('p');
        p.textContent = text;
        this._narrativeEl.appendChild(p);
      }
    }

    // 立即触发侧边栏显示
    if (!this._sidebarRevealed) {
      this._sidebarRevealed = true;
      window.dispatchEvent(new CustomEvent('sidebar-reveal'));
    }

    this._isTyping = false;
    this._scrollToBottom();

    // 隐藏跳过按钮
    if (this._skipBtn) {
      this._skipBtn.classList.add('hidden');
    }

    // 显示建议
    if (this._pendingResponses === 0) {
      this.showSuggestions(getLocationSuggestions());
    }
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

    options.forEach(function (opt, index) {
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
   * 生成兜底叙事 — 根据当前位置返回合理的场景叙事
   * @param {string} input - 玩家输入
   * @returns {string} 响应文本
   */
  _generateResponse: function (input) {
    var state = AppState.get();
    var locId = state.currentLocation || 'card_shop';
    var pool = LOCATION_FALLBACKS[locId] || LOCATION_FALLBACKS['card_shop'];

    this.setAtmosphere('calm');

    // 战斗关键词
    var lowerInput = (input || '').toLowerCase();
    if (lowerInput.indexOf('战斗') >= 0 || lowerInput.indexOf('决斗') >= 0 || lowerInput.indexOf('挑战') >= 0) {
      this.setAtmosphere('tense');
      return '你察觉到空气中凝聚着一股无形的力量——这是黑暗决斗即将开启的前兆。你的决斗盘微微发热，卡组在呼唤着你。';
    }

    // 直接返回当前地点的场景叙事
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

      // 隐藏跳过按钮
      if (this._skipBtn) {
        this._skipBtn.classList.add('hidden');
      }

      // 开场白播放完毕 — 触发侧边栏渐显
      if (!this._sidebarRevealed) {
        this._sidebarRevealed = true;
        window.dispatchEvent(new CustomEvent('sidebar-reveal'));
      }

      // 队列空闲且无待处理响应时显示建议
      if (this._pendingResponses === 0) {
        this.showSuggestions(getLocationSuggestions());
      }
      return;
    }

    this._isTyping = true;
    var text = this._displayQueue.shift();

    if (text.indexOf(PLAYER_PREFIX) === 0) {
      // 玩家行动 — 直接显示，无需打字机
      this._addPlayerActionText(text.substring(PLAYER_PREFIX.length));
      // 继续处理下一项
      var delay = this._isSkipping ? 0 : 200;
      setTimeout(function () {
        self._processQueue();
      }, delay);
    } else {
      // 叙事文本 — 打字机效果
      this._addNarratorText(text, undefined, function () {
        self._scrollToBottom();
        // 每段之间稍作停顿（跳过模式无延迟）
        var delay = self._isSkipping ? 0 : 300;
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

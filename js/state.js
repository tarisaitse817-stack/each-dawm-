/* ==========================================================================
   光之回响 (Echoes of Light) — AppState 响应式全局状态管理
   ========================================================================== */

/**
 * 深拷贝工具函数
 * @param {*} value
 * @returns {*} 深拷贝后的值
 */
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * 生成默认初始状态
 * @returns {Object}
 */
function createDefaultState() {
  return {

    /* --- 视图状态 --- */
    currentView: 'title',             // 'title' | 'scene' | 'inventory' | 'companions'

    /* --- 玩家数据 --- */
    player: {
      name: '旅人',
      lp: 8000,
      maxLp: 8000,
      spiritGems: 1280
    },

    /* --- 游戏进度 --- */
    // 遗留字段：bridge 上下文仍引用，保留
    gamePhase: {
      chapter: 1,
      scene: 1,
      totalScenes: 15
    },

    /* --- 叙事历史 --- */
    narrativeHistory: [],

    /* --- 伙伴列表 --- */
    companions: [
      { id: 'siren',    name: '塞壬',       affection: 40, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/siren.png',    deck: 'Tearlaments',    background: '伴随奇异现象降临在主角出租屋里的妹卡精灵，天性慵懒，喜欢缩在鱼缸里享受安逸，并暗自贪恋着主人的气味。' },
      { id: 'lingyi',   name: '零依',       affection: 30, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/lingyi.png',   deck: 'Sky Striker',    background: '穿越到现实的元气卡片精灵，主角家里活跃气氛的开心果，每天用元气满满的笑容和偶尔的小调皮试图霸占主人的注意力。' },
      { id: 'lushi',    name: '露世',       affection: 30, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/lushi.png',    deck: 'Labrynth',       background: '穿越而来的高冷型羁绊精灵，外表冷淡生人勿近，实则内心极度渴望主人的关爱。' },
      { id: 'kisikil',  name: '姬丝吉尔',   affection: 20, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/kisikil.png',  deck: 'Live Twin',      background: '白天是对门的人气主播邻居，夜晚是潜入房间的魅魔怪盗，最大的目标是不择手段地偷走主角的身体和心。' },
      { id: 'lilla',    name: '璃拉',       affection: 20, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/lilla.png',    deck: 'Live Twin',      background: '姬丝吉尔的搭档，白天直播总是一副半梦半醒的样子，夜晚的怪盗行动中一旦发现姬丝吉尔想偷跑就会吃醋暴走。' },
      { id: 'ecclesia', name: '艾克利西亚', affection: 20, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/ecclesia.png', deck: 'Albaz',          background: '跨越次元来到现世的羁绊精灵，彻底暴露了吃货本性，靠在小吃街帮忙换取零食，每天最期待回家讨要抱抱和投喂。' },
      { id: 'tiantong', name: '天童',       affection: 30, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/tiantong.png', deck: 'Tenyi',          background: '带着一身华丽日式装扮来到现世，生性胆小怯懦，总在精灵们吵架时硬着头皮劝架，心里最渴望躲在主角怀里被安全感包围。' },
      { id: 'li',       name: '理',         affection: 20, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/li.png',       deck: 'Voiceless Voice', background: '降临现世的圣洁精灵，对现代社会的运作充满好奇，总用悲天悯人的目光观察人类。' },
      { id: 'caihong',  name: '彩虹',       affection: 20, location: '未知', status: '休整', unlocked: true, avatar: 'assets/companions/caihong.png',  deck: 'Maliss',         background: '暂住主角家的异次元画师，被收留后怀着极大的感激包揽了家里的许多家务，逐渐融入了这个修罗场。' }
    ],

    /* --- MDPro3 卡组由玩家在 MDPro3 中自行设定 --- */

    /* activeDeckId removed — 卡组由 MDPro3 管理 */

    /* --- 背包物品 --- */
    inventory: [
      { id: 'item-key-001', name: '房屋钥匙', type: 'key', rarity: 'common', count: 1, effect: '公寓房间的钥匙，上面挂着一个褪色的企鹅挂件' },
      { id: 'item-elec-001', name: '手机', type: 'tool', rarity: 'common', count: 1, effect: '一部屏幕边角有裂纹的智能手机，桌面壁纸是某个卡牌游戏的立绘' },
      { id: 'item-elec-002', name: '充电宝', type: 'tool', rarity: 'common', count: 1, effect: '10000mAh 快充充电宝，侧面的指示灯只剩一格了' },
      { id: 'item-elec-003', name: '耳机', type: 'tool', rarity: 'common', count: 1, effect: '蓝牙降噪耳机，戴上后世界瞬间安静，只剩下BGM和你自己' },
      { id: 'item-wallet-001', name: '钱包', type: 'tool', rarity: 'common', count: 1, effect: '棕色皮质钱包，里面塞着身份证、银行卡和几张皱巴巴的零钱' },
      { id: 'item-card-001', name: '备用卡组盒', type: 'tool', rarity: 'rare', count: 1, effect: '黑色卡盒，装着几套备用的对战卡组，盒面有磨损的痕迹' }
    ],

    /* --- 设置 --- */
    settings: {
      textSpeed: 'normal',
      animationIntensity: 'standard',
      bgmVolume: 0.7,
      sfxVolume: 0.8,
      cardAnimSpeed: 'normal',
      aiEnabled: true,
      aiEndpoint: 'http://localhost:9999',
      aiApiKey: '',
      aiModel: 'deepseek-chat',
      mdpro3Deck: 'PlayerInsect'
    },

    /* --- 时间系统 --- */
    gameTime: {
      day: 1,
      weekday: 1,     // 1=周一...7=周日
      hour: 8,        // 0-23
      minute: 0
    },

    /* --- 当前位置 --- */
    currentLocation: 'card_shop',

    /* --- 场景状态 --- */
    currentSceneId: 'home_living',
    sceneCharacters: {}, // 派生态：由行程表按时间重建（scene.js _renderAvatars），勿手写初始值
    closeup: { active: false, characterId: null, emotion: 'neutral' },

    /* --- Token 统计 --- */
    tokenStats: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      turns: 0
    },

    /* --- 通知队列 --- */
    notifications: []
  };
}

/* ==========================================================================
   阵容对账支持（存档恢复时重建标准 9 人阵容）
   ========================================================================== */

/** 当前阵容标准 9 人 id 列表（与 data/characters.json 一致） */
export const DEFAULT_COMPANION_IDS = [
  'siren',
  'lingyi',
  'lushi',
  'kisikil',
  'lilla',
  'ecclesia',
  'tiantong',
  'li',
  'caihong'
];

/**
 * 获取默认伙伴列表（深拷贝）— 供存档阵容对账重建使用
 * @returns {Array}
 */
export function getDefaultCompanions() {
  return deepClone(createDefaultState().companions);
}

/* ==========================================================================
   私有状态
   ========================================================================== */

let _state = createDefaultState();
const _subscribers = {};
const _ALL_KEYS = Object.keys(_state);

/* ==========================================================================
   AppState — 响应式状态管理单例
   ========================================================================== */

export const AppState = {

  /**
   * 注册状态变更监听器
   * @param {string} key - 要监听的顶层状态键
   * @param {Function} callback - 回调函数 (newValue, oldValue) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(key, callback) {
    if (!_subscribers[key]) {
      _subscribers[key] = new Set();
    }
    _subscribers[key].add(callback);

    // 返回取消订阅函数
    return function unsubscribe() {
      if (_subscribers[key]) {
        _subscribers[key].delete(callback);
      }
    };
  },

  /**
   * 获取指定键的状态（深拷贝）
   * @param {string} [key] - 状态键；不传则返回完整状态对象的深拷贝
   * @returns {*} 对应状态的深拷贝
   */
  get(key) {
    if (key === undefined) {
      return deepClone(_state);
    }
    return deepClone(_state[key]);
  },

  /**
   * 更新指定键的状态并触发所有已注册的监听器
   * @param {string} key - 顶层状态键
   * @param {*} value - 新值
   */
  set(key, value) {
    const oldValue = deepClone(_state[key]);
    _state[key] = deepClone(value);

    const subscribers = _subscribers[key];
    if (subscribers) {
      const newValue = deepClone(value);
      subscribers.forEach(function (cb) {
        try {
          cb(newValue, oldValue);
        } catch (e) {
          console.error('[AppState] subscriber error for key "' + key + '":', e);
        }
      });
    }
  },

  /**
   * 向指定键的数组追加元素
   * @param {string} key - 顶层状态键（必须为数组）
   * @param {*} item - 要追加的元素
   */
  push(key, item) {
    if (!Array.isArray(_state[key])) {
      console.error('[AppState] Cannot push: key "' + key + '" is not an array');
      return;
    }
    const newArray = _state[key].concat([item]);
    this.set(key, newArray);
  },

  /**
   * 重置状态为默认值，并触发所有键的监听器
   * 注意：settings（含 API 配置）会被保留，不会被重置
   */
  reset() {
    const oldState = _state;
    const savedSettings = deepClone(oldState['settings']);
    _state = createDefaultState();
    _state['settings'] = savedSettings;

    _ALL_KEYS.forEach(function (key) {
      const subscribers = _subscribers[key];
      if (subscribers && subscribers.size > 0) {
        const newValue = deepClone(_state[key]);
        const oldValue = deepClone(oldState[key]);
        subscribers.forEach(function (cb) {
          try {
            cb(newValue, oldValue);
          } catch (e) {
            console.error('[AppState] subscriber error during reset for key "' + key + '":', e);
          }
        });
      }
    });
  }
};

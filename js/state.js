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
    currentView: 'title',             // 'title' | 'event' | 'inventory' | 'companions' | 'map'

    /* --- 玩家数据 --- */
    player: {
      name: '旅人',
      lp: 8000,
      maxLp: 8000,
      spiritGems: 1280
    },

    /* --- 游戏进度 --- */
    gamePhase: {
      chapter: 1,
      scene: 1,
      totalScenes: 15
    },

    /* --- 叙事历史 --- */
    narrativeHistory: [],

    /* --- 伙伴列表 --- */
    companions: [
      {
        id: 'liuyue',
        name: '柳月',
        affection: 45,
        location: '公司·地铁口',
        status: '暗中窥视',
        unlocked: true,
        avatar: 'assets/companions/柳月.png',
        background: '公司新来的后辈，粉发粉瞳，总是一副文弱天真的模样。每天在地铁口"偶遇"你，白裙下的纤细双腿总是怯生生地并拢着。但那双无辜的眸子里，似乎藏着某种令人不安的执着——她的手机里，据说有一个能改写现实的催眠APP。'
      },
      {
        id: 'linyi',
        name: '林仪',
        affection: 40,
        location: '公司·总裁办公室',
        status: '职场施压',
        unlocked: true,
        avatar: 'assets/companions/林仪.png',
        background: '你的直属上司，23岁便坐上管理层的天才。白发蓝瞳，白紫连衣裙勾勒出成熟的曲线，黑丝包裹的修长双腿在办公桌下总是不安分地交叠。两年前你拒绝了她酒后的大胆告白，从此她变得愈发冰冷——但每次训话时，她的指尖都在掌心里掐出了血痕。'
      },
      {
        id: 'suyun',
        name: '苏昀',
        affection: 55,
        location: '街角·便利超市',
        status: '温柔守望',
        unlocked: true,
        avatar: 'assets/companions/苏昀.png',
        background: '街角便利超市的店长，彩虹色的长发松松挽在脑后，金色的眼眸总是含着水一样温柔的关切。两年前你从劫匪手中救下了她，从此她就把你最爱吃的零食永远摆在收银台最近的位置。25岁的她身上有种熟透了的醇香，却连初吻都还留着——据说那次醉酒告白，不是醉话。'
      },
      {
        id: 'baiyue',
        name: '白月',
        affection: 70,
        location: '主角家中',
        status: '兄控模式',
        unlocked: true,
        avatar: 'assets/companions/白月.png',
        background: '你的亲妹妹，16岁的高中生。绿发绿瞳，学校制服配着超短百褶裙和白色过膝袜，每天放学后就霸占你的沙发打滚。嘴上总是一口一个"杂鱼哥哥"，但分开那一年的深夜，她总是抱着你的旧衬衫才能入睡。今年考上你所在城市的高中后，就再也没打算从你家搬出去过。'
      },
      {
        id: 'sairen',
        name: '塞壬',
        affection: 0,
        location: '家附近的河岸',
        status: '未曾谋面',
        unlocked: false,
        avatar: 'assets/companions/塞壬.png',
        background: '珠泪哀歌的卡片精灵，灰蓝色的发丝间挑染着幽幽的紫，一双紫水晶般的眼眸总是汪着怯生生的水光。她藏在你家附近的小河里，每天傍晚趴在浅滩上，远远地望着你的窗户亮起灯。她还不知道你的名字，只是固执地觉得——你是她在现世唯一想等的人。'
      },
      {
        id: 'ecclesia',
        name: '艾克利西娅',
        affection: 0,
        location: '小吃街·包子铺',
        status: '未曾谋面',
        unlocked: false,
        avatar: 'assets/companions/艾克利西娅.png',
        background: '流落现世的金发圣女，华丽的发髻上缀着蓝色花朵，银色的眼眸清澈得不染纤尘。为了每天吃上热腾腾的包子，她在这家铺子里当了帮工。她还不认识你——只把你当成每天来买早饭的常客，但每次你点单的时候，她头顶那根呆毛总是不自觉地多晃几下。'
      }
    ],

    /* --- MDPro3 卡组由玩家在 MDPro3 中自行设定 --- */

    /* activeDeckId removed — 卡组由 MDPro3 管理 */

    /* --- 背包物品 --- */
    inventory: [
      { id: 'item-cons-001', name: '光之露滴', type: 'consumable', rarity: 'rare', count: 3, effect: '恢复300LP' },
      { id: 'item-cons-002', name: '森林药草', type: 'consumable', rarity: 'common', count: 5, effect: '恢复100LP' },
      { id: 'item-cons-003', name: '星辉粉尘', type: 'consumable', rarity: 'rare', count: 8, effect: '清除所有异常状态' },
      { id: 'item-key-001', name: '神殿碎片', type: 'key', rarity: 'common', count: 2, effect: '记载着失落神殿的秘密碎片' },
      { id: 'item-mat-001', name: '暗影结晶', type: 'material', rarity: 'rare', count: 1, effect: '蕴含着暗影能量的结晶' },
      { id: 'item-mat-002', name: '古老卷轴', type: 'material', rarity: 'legendary', count: 1, effect: '记载着远古咒文的卷轴' },
      { id: 'item-mat-003', name: '风之羽', type: 'material', rarity: 'common', count: 3, effect: '轻盈的风元素羽毛' },
      { id: 'item-mat-004', name: '大地结晶', type: 'material', rarity: 'common', count: 2, effect: '大地的力量凝聚而成' },
      { id: 'item-pack-001', name: '基础卡包', type: 'pack', rarity: 'common', count: 2, effect: '打开获得随机卡牌' }
    ],

    /* --- 地图节点 --- */
    mapNodes: [
      { id: 'node-01', name: '初始之地',   type: 'start', x: 400, y: 700, status: 'completed', connections: ['node-02', 'node-03'] },
      { id: 'node-02', name: '晨曦森林',   type: 'event', x: 200, y: 550, status: 'locked',    connections: ['node-04'] },
      { id: 'node-03', name: '星辉湖畔',   type: 'event', x: 600, y: 550, status: 'locked',    connections: ['node-05'] },
      { id: 'node-04', name: '风吟山谷',   type: 'battle', x: 150, y: 380, status: 'locked',   connections: ['node-06'] },
      { id: 'node-05', name: '幻光遗迹',   type: 'event', x: 650, y: 380, status: 'locked',    connections: ['node-07'] },
      { id: 'node-06', name: '断崖之桥',   type: 'battle', x: 300, y: 250, status: 'locked',   connections: ['node-08'] },
      { id: 'node-07', name: '月影神殿',   type: 'rest', x: 550, y: 250, status: 'locked',     connections: ['node-08'] },
      { id: 'node-08', name: '光之回廊',   type: 'event', x: 420, y: 150, status: 'locked',    connections: ['node-09', 'node-10'] },
      { id: 'node-09', name: '灵辉圣殿',   type: 'rest', x: 260, y: 80, status: 'locked',      connections: ['node-11'] },
      { id: 'node-10', name: '暗影深渊',   type: 'battle', x: 580, y: 80, status: 'locked',    connections: ['node-11'] },
      { id: 'node-11', name: '试炼之塔',   type: 'event', x: 420, y: 40, status: 'locked',     connections: ['node-12'] },
      { id: 'node-12', name: '终焉之庭',   type: 'boss', x: 420, y: 10, status: 'locked',      connections: [] }
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
   */
  reset() {
    const oldState = _state;
    _state = createDefaultState();

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

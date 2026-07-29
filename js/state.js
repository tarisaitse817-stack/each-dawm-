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
    currentView: 'title',             // 'title' | 'event' | 'inventory' | 'deck' | 'companions' | 'map'

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
        id: 'lingxi',
        name: '灵曦',
        affection: 0,
        location: '初始之地',
        status: 'idle',
        unlocked: true,
        background: '破晓时分的第一缕光凝结而成的灵体，拥有看穿虚妄的能力。'
      },
      {
        id: 'xingli',
        name: '星璃',
        affection: 0,
        location: '初始之地',
        status: 'idle',
        unlocked: false,
        background: '远古星辰破碎后留下的碎片，在夜空中流浪了千年。沉默寡言，但内心温柔。'
      },
      {
        id: 'yelan',
        name: '夜澜',
        affection: 0,
        location: '未知',
        status: 'idle',
        unlocked: false,
        background: '来自深渊之海的浪花精灵，性情桀骜不驯，掌握着潮汐的神秘力量。'
      },
      {
        id: 'shuangyue',
        name: '霜月',
        affection: 0,
        location: '未知',
        status: 'idle',
        unlocked: false,
        background: '极寒之地的月华化身，清冷孤傲，为了寻找失落的记忆而踏上旅途。'
      }
    ],

    /* --- 卡组 --- */
    decks: [
      {
        id: 'radiance-shield',
        name: '辉光之盾',
        mainCards: [
          { id: 'card-001', name: '光之护盾', cost: 1, type: 'defense', power: 200, description: '凝聚光元素形成护盾，吸收即将到来的伤害。' },
          { id: 'card-002', name: '灵辉治愈', cost: 2, type: 'heal', power: 300, description: '以灵辉之力恢复自身生命值。' },
          { id: 'card-003', name: '圣光裁决', cost: 3, type: 'attack', power: 400, description: '召唤圣光之剑，对敌人造成致命打击。' }
        ],
        extraCards: [],
        sideCards: []
      },
      {
        id: 'spark-flame',
        name: '星火燎原',
        mainCards: [
          { id: 'card-004', name: '星火术', cost: 1, type: 'attack', power: 150, description: '召唤点点星火灼烧敌人。' },
          { id: 'card-005', name: '烈焰冲击', cost: 2, type: 'attack', power: 350, description: '释放熊熊烈焰冲击敌人。' },
          { id: 'card-006', name: '燎原之势', cost: 4, type: 'attack', power: 600, description: '引燃全场，对敌人造成毁灭性的范围伤害。' }
        ],
        extraCards: [],
        sideCards: []
      }
    ],

    activeDeckId: null,

    /* --- 背包物品 --- */
    inventory: [
      { id: 'item-001', name: '灵辉碎片', type: 'consumable', rarity: 'common', count: 5, effect: '恢复100LP' },
      { id: 'item-002', name: '星辰之露', type: 'consumable', rarity: 'rare', count: 2, effect: '恢复300LP' },
      { id: 'item-003', name: '光之结晶', type: 'material', rarity: 'rare', count: 1, effect: '用于强化光属性卡牌' },
      { id: 'item-004', name: '残破古卷', type: 'key', rarity: 'common', count: 1, effect: '记载着失落的知识碎片' },
      { id: 'item-005', name: '灵犀之羽', type: 'quest', rarity: 'epic', count: 1, effect: '灵曦赠予的信物，蕴含着温暖的光芒' },
      { id: 'item-006', name: '黯星碎片', type: 'material', rarity: 'epic', count: 1, effect: '来自陨落星辰的残骸，散发着幽暗的光' },
      { id: 'item-007', name: '回响药剂', type: 'consumable', rarity: 'common', count: 3, effect: '短时间内提升对灵辉的感知力' },
      { id: 'item-008', name: '契约之印', type: 'key', rarity: 'legendary', count: 1, effect: '通往终焉之庭的钥匙，刻着古老的誓言' }
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
      cardAnimSpeed: 'normal'
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

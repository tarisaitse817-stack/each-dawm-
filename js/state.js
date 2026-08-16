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
        deck: 'Maliss',
        background: '公司新来的后辈，粉发粉瞳，总是一副文弱天真的模样。每天在地铁口"偶遇"你，白裙下的纤细双腿总是怯生生地并拢着。但那双无辜的眸子里，似乎藏着某种令人不安的执着——她的手机里，据说有一个能改写现实的催眠APP。',
        battleLines: {
          opening: '前辈……终于能和你决斗了呢。别担心，我下手会很轻的——大概。',
          victory: '赢了……对不起前辈，我不是故意的。但是这样，前辈就欠我一个要求了呢～',
          defeat: '输掉了……不过没关系，只要能和前辈一起玩卡牌，输赢都不重要……对吧？'
        }
      },
      {
        id: 'linyi',
        name: '林仪',
        affection: 40,
        location: '公司·总裁办公室',
        status: '职场施压',
        unlocked: true,
        avatar: 'assets/companions/林仪.png',
        deck: 'Ryzeal',
        background: '你的直属上司，23岁便坐上管理层的天才。白发蓝瞳，白紫连衣裙勾勒出成熟的曲线，黑丝包裹的修长双腿在办公桌下总是不安分地交叠。两年前你拒绝了她酒后的大胆告白，从此她变得愈发冰冷——但每次训话时，她的指尖都在掌心里掐出了血痕。',
        battleLines: {
          opening: '在职场你归我管，在决斗场上也一样。让我看看这两年你长进了多少——别让我失望。',
          victory: '啧，还是老样子。不过……能让我认真起来的，也只有你了。下班后来办公室一趟。',
          defeat: '你果然一直在藏拙。两年前是这样，现在还是这样……这次我不会再让你逃掉了。'
        }
      },
      {
        id: 'suyun',
        name: '苏昀',
        affection: 55,
        location: '街角·便利超市',
        status: '温柔守望',
        unlocked: true,
        avatar: 'assets/companions/苏昀.png',
        deck: 'Orcust',
        background: '街角便利超市的店长，彩虹色的长发松松挽在脑后，金色的眼眸总是含着水一样温柔的关切。两年前你从劫匪手中救下了她，从此她就把你最爱吃的零食永远摆在收银台最近的位置。25岁的她身上有种熟透了的醇香，却连初吻都还留着——据说那次醉酒告白，不是醉话。',
        battleLines: {
          opening: '啊，你来啦～今天店里不忙，陪我玩一局吧。输了的人请吃关东煮哦～',
          victory: '我赢了诶！那关东煮就由你请客啦——开玩笑的，冰箱里早就给你留好你最爱的口味了。',
          defeat: '果然比不过你呢……不过看你赢得开心的样子，比我自己赢了还高兴。来，这是今天的便当，偷偷多放了一个布丁。'
        }
      },
      {
        id: 'baiyue',
        name: '白月',
        affection: 70,
        location: '主角家中',
        status: '兄控模式',
        unlocked: true,
        avatar: 'assets/companions/白月.png',
        deck: 'Labrynth',
        background: '你的亲妹妹，16岁的高中生。绿发绿瞳，学校制服配着超短百褶裙和白色过膝袜，每天放学后就霸占你的沙发打滚。嘴上总是一口一个"杂鱼哥哥"，但分开那一年的深夜，她总是抱着你的旧衬衫才能入睡。今年考上你所在城市的高中后，就再也没打算从你家搬出去过。',
        battleLines: {
          opening: '杂鱼哥哥！你的卡组不会是网上抄的吧～看我白银城把你的怪全都弹回手牌！',
          victory: '哼哼～杂鱼就是杂鱼，跟你一个屋檐下住着这么久，你的套路我早就摸透了！……喂别垂头丧气的啦，晚饭我做你最喜欢的炸猪排。',
          defeat: '呜……不算不算！三局两胜！……好吧，我输了。作为惩罚，今晚别锁房门——我想挨着你睡。'
        }
      },
      {
        id: 'sairen',
        name: '塞壬',
        affection: 0,
        location: '家附近的河岸',
        status: '未曾谋面',
        unlocked: false,
        avatar: 'assets/companions/塞壬.png',
        deck: 'Tearlaments',
        background: '珠泪哀歌的卡片精灵，灰蓝色的发丝间挑染着幽幽的紫，一双紫水晶般的眼眸总是汪着怯生生的水光。她藏在你家附近的小河里，每天傍晚趴在浅滩上，远远地望着你的窗户亮起灯。她还不知道你的名字，只是固执地觉得——你是她在现世唯一想等的人。',
        battleLines: {
          opening: '那个……你、你好……我从河里……想、想和你玩一局卡牌……可以吗？',
          victory: '我……我赢了？对不起！我不是故意要赢的……你不要讨厌我好不好……',
          defeat: '输了也没关系……能和你说上话，我已经很开心了。下次……还能再来河边找我吗？'
        }
      },
      {
        id: 'ecclesia',
        name: '艾克利西娅',
        affection: 0,
        location: '小吃街·包子铺',
        status: '未曾谋面',
        unlocked: false,
        avatar: 'assets/companions/艾克利西娅.png',
        deck: 'Albaz',
        background: '流落现世的金发圣女，华丽的发髻上缀着蓝色花朵，银色的眼眸清澈得不染纤尘。为了每天吃上热腾腾的包子，她在这家铺子里当了帮工。她还不认识你——只把你当成每天来买早饭的常客，但每次你点单的时候，她头顶那根呆毛总是不自觉地多晃几下。',
        battleLines: {
          opening: '异界的旅人啊，以烙印之名，请与我一战。输了的人……要请吃一星期的包子！',
          victory: '烙印的圣女之名绝非虚饰。不过你放心，包子的事就算了——你明早来，我给你留刚出笼的。',
          defeat: '看来这个世界的卡牌……比圣域的术式还要有趣。能再教教我吗？作为交换，包子给你永久半价！'
        }
      }
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

    /* --- 场景状态 --- */
    currentSceneId: 'home_living',
    sceneCharacters: {
      baiyue:   { present: true,  emotion: 'neutral' },
      linyi:    { present: true,  emotion: 'neutral' },
      liuyue:   { present: true,  emotion: 'neutral' },
      suyun:    { present: true,  emotion: 'neutral' },
      siren:    { present: true,  emotion: 'neutral' },
      ecclesia: { present: true,  emotion: 'neutral' },
    },
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

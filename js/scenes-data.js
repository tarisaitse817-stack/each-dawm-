// 场景图静态数据：16 节点（13 旧 + 3 新） + 角色 + 表情约定
// 坐标一律百分比（0~1）；dir 取值 left/right/top/bottom

export const EMOTION_LIST = ['neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire'];

export const CHARACTERS = {
  siren:    { name: '塞壬',       portrait: 'assets/characters/siren/neutral.png' },
  lingyi:   { name: '零依',       portrait: 'assets/characters/lingyi/neutral.png' },
  lushi:    { name: '露世',       portrait: 'assets/characters/lushi/neutral.png' },
  kisikil:  { name: '姬丝吉尔',   portrait: 'assets/characters/kisikil/neutral.png' },
  lilla:    { name: '璃拉',       portrait: 'assets/characters/lilla/neutral.png' },
  ecclesia: { name: '艾克利西亚', portrait: 'assets/characters/ecclesia/neutral.png' },
  tiantong: { name: '天童',       portrait: 'assets/characters/tiantong/neutral.png' },
  li:       { name: '理',         portrait: 'assets/characters/li/neutral.png' },
  caihong:  { name: '彩虹',       portrait: 'assets/characters/caihong/neutral.png' },
};

/** 头像锚点：站位坐标上抬 12%（头部位置），y 下界夹 0；纯函数供 scene.js 与校验脚本复用 */
export function avatarAnchor(spot) {
  return { x: spot.x, y: Math.max(0, spot.y - 0.12) };
}

export function emotionFile(charId, emotion) {
  return `assets/characters/${charId}/${emotion}.png`;
}

/**
 * 营业时间表（用户要求）：部分地图有营业时间，非营业时间进入提示打烊。
 * 起止小时 [start, end)，未列出的场景 24 小时可进入。
 * 牌店 20 点关门、超市 22 点关门、商业街/甜品店 22 点、小吃 22 点。
 */
export const OPEN_HOURS = {
  food_bunshop:    { start: 6,  end: 22 },
  food_st:         { start: 6,  end: 22 },
  market_hall:     { start: 8,  end: 22 },
  market_door:     { start: 8,  end: 22 },
  cardshop_inside: { start: 10, end: 20 },
  cardshop_door:   { start: 10, end: 20 },
  mall_st:         { start: 10, end: 22 },
  mall_dessert:    { start: 10, end: 22 },
};

/** 场景当前小时是否营业（无营业时间的场景视为 24h 开放） */
export function isSceneOpen(scene, hour) {
  var oh = scene ? OPEN_HOURS[scene.id] : null;
  if (!oh) return true;
  var h = ((hour % 24) + 24) % 24;
  return h >= oh.start && h < oh.end;
}

/** 营业时间文案（地图卡片提示/角标用） */
export function openHoursLabel(sceneId) {
  var oh = OPEN_HOURS[sceneId];
  return oh ? (oh.start + ':00 - ' + oh.end + ':00') : '全天开放';
}

export const SCENES = {
  // ===== 家（3）=====
  home_living: {
    id: 'home_living', name: '客厅', bg: 'assets/scenes/home_living.png',
    description: '温暖的客厅，众人的日常据点。',
    exits: [
      { dir: 'left',   to: 'home_bed',  label: '卧室' },
      { dir: 'right',  to: 'home_door', label: '家门' },
      { dir: 'bottom', to: 'suburb_st', label: '出门' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'sofa', label: '沙发', x: 0.35, y: 0.72, desc: '蓬松的沙发，经常有人在这里打盹。' },
      { id: 'cards', label: '卡组', x: 0.68, y: 0.6, desc: '你的备用卡组，整齐地码在茶几上。' },
    ],
  },
  home_bed: {
    id: 'home_bed', name: '卧室', bg: 'assets/scenes/home_bed.png',
    description: '你的卧室，全城唯一能隔绝催眠 APP 信号的净土。',
    exits: [{ dir: 'right', to: 'home_living', label: '客厅' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'bed', label: '床', x: 0.4, y: 0.7, desc: '松软的床铺，带着晒过太阳的味道。' },
      { id: 'wardrobe', label: '衣柜', x: 0.75, y: 0.45, desc: '衣柜里塞满了换洗衣物。' },
    ],
  },
  home_door: {
    id: 'home_door', name: '家门前', bg: 'assets/scenes/home_door.png',
    description: '家门前的小路，不远处能听见小河的水声。',
    exits: [
      { dir: 'left',  to: 'home_living', label: '客厅' },
      { dir: 'right', to: 'suburb_st',   label: '小河方向' },
      { dir: 'top',   to: 'twins_room',  label: '双子房间' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'river', label: '小河', x: 0.85, y: 0.6, desc: '清澈的小河，塞壬总爱在这里吐泡泡。' },
    ],
  },

  // ===== 双子（1）=====
  twins_room: {
    id: 'twins_room', name: '双子的房间', bg: 'assets/scenes/twins_room.png',
    description: '双子租住的房间，直播设备摆满一桌。',
    exits: [{ dir: 'bottom', to: 'home_door', label: '家门前' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'pc', label: '直播设备', x: 0.5, y: 0.6, desc: '补光灯和麦克风一应俱全。' },
      { id: 'plush', label: '鲨鱼玩偶', x: 0.3, y: 0.68, desc: '一只被抱到褪色的鲨鱼玩偶。' },
    ],
  },

  // ===== 小吃街（2）=====
  food_bunshop: {
    id: 'food_bunshop', name: '包子铺', bg: 'assets/scenes/food_bunshop.png',
    description: '香气扑鼻的包子铺，小吃街的帮工在这里忙碌。',
    exits: [{ dir: 'left', to: 'food_st', label: '街道' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'steamer', label: '蒸笼', x: 0.4, y: 0.6, desc: '热气腾腾的蒸笼，肉包的香气直往鼻子里钻。' },
    ],
  },
  food_st: {
    id: 'food_st', name: '小吃街街道', bg: 'assets/scenes/food_st.png',
    description: '人声鼎沸的小吃街，各种食物的香气交织在一起。',
    exits: [
      { dir: 'right', to: 'food_bunshop', label: '包子铺' },
      { dir: 'left',  to: 'mall_st',    label: '商业街' },
      { dir: 'bottom', to: 'suburb_st', label: '城郊方向' },
      { dir: 'top', to: 'mall_dessert', label: '甜品店' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'stall', label: '小摊', x: 0.6, y: 0.6, desc: '排着长队的烤串摊。' },
    ],
  },

  // ===== 超市（2）=====
  market_hall: {
    id: 'market_hall', name: '超市卖场', bg: 'assets/scenes/market_hall.png',
    description: '灯火通明的超市卖场，货架一眼望不到头。',
    exits: [{ dir: 'bottom', to: 'market_door', label: '门口' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'shelf', label: '货架', x: 0.3, y: 0.6, desc: '摆满零食的货架。' },
      { id: 'counter', label: '收银台', x: 0.7, y: 0.65, desc: '收银台前排着短队。' },
    ],
  },
  market_door: {
    id: 'market_door', name: '超市门口', bg: 'assets/scenes/market_door.png',
    description: '超市的入口，购物袋的摩擦声不绝于耳。',
    exits: [
      { dir: 'top',   to: 'market_hall', label: '卖场' },
      { dir: 'right', to: 'food_st',     label: '小吃街' },
      { dir: 'left', to: 'suburb_st',    label: '城郊街道' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'cart', label: '购物车', x: 0.4, y: 0.65, desc: '一辆空着的购物车。' },
    ],
  },

  // ===== 牌店（2）=====
  cardshop_inside: {
    id: 'cardshop_inside', name: '牌店店内', bg: 'assets/scenes/cardshop_inside.png',
    description: '熟悉的牌店，卡柜里陈列着各种稀有卡包。',
    exits: [{ dir: 'bottom', to: 'cardshop_door', label: '店门口' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'cabinet', label: '卡柜', x: 0.35, y: 0.55, desc: '玻璃卡柜，最上层摆着限定卡包。' },
      { id: 'dueltable', label: '对战桌', x: 0.65, y: 0.68, desc: '牌店中央的对战桌，桌面有些许磨损。' },
    ],
  },
  cardshop_door: {
    id: 'cardshop_door', name: '牌店门口', bg: 'assets/scenes/cardshop_door.png',
    description: '牌店的招牌在夜色里泛着微光。',
    exits: [
      { dir: 'top',   to: 'cardshop_inside', label: '店内' },
      { dir: 'right', to: 'mall_st',  label: '商业街' },
    ],
    characters: [],
    characterSpots: {},
    objects: [],
  },

  // ===== 商业街（2）=====
  mall_st: {
    id: 'mall_st', name: '商业街街道', bg: 'assets/scenes/mall_st.png',
    description: '繁华的商业街，霓虹灯牌层层叠叠。',
    exits: [
      { dir: 'left',  to: 'cardshop_door', label: '牌店' },
      { dir: 'right', to: 'church',       label: '教堂' },
      { dir: 'top',   to: 'food_st',       label: '小吃街' },
      { dir: 'bottom', to: 'suburb_st',    label: '城郊方向' },
    ],
    characters: [],
    characterSpots: {},
    objects: [],
  },
  mall_dessert: {
    id: 'mall_dessert', name: '甜品店', bg: 'assets/scenes/mall_dessert.png',
    description: '空气里漂浮着奶油甜香的甜品店。',
    exits: [{ dir: 'left', to: 'food_st', label: '小吃街' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'cakecase', label: '蛋糕柜', x: 0.4, y: 0.6, desc: '玻璃柜里摆满了精致的蛋糕。' },
    ],
  },

  // ===== 教堂（1）=====
  church: {
    id: 'church', name: '教堂', bg: 'assets/scenes/church.jpg',
    description: '安静的教堂，阳光透过彩窗洒在长椅上。',
    exits: [{ dir: 'left', to: 'mall_st', label: '商业街' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'window', label: '彩窗', x: 0.5, y: 0.4, desc: '彩绘玻璃窗，光斑落在地上。' },
      { id: 'pew', label: '长椅', x: 0.4, y: 0.65, desc: '一排空着的长椅。' },
    ],
  },

  // ===== 城郊（2）=====
  suburb_st: {
    id: 'suburb_st', name: '城郊街道', bg: 'assets/scenes/suburb_st.png',
    description: '通往各处的城郊街道，行人稀少。',
    exits: [
      { dir: 'left',  to: 'home_door', label: '家门前' },
      { dir: 'top',   to: 'mall_st',   label: '商业街' },
      { dir: 'right', to: 'suburb_station', label: '站台' },
      { dir: 'bottom', to: 'market_door', label: '超市' },
    ],
    characters: [],
    characterSpots: {},
    objects: [],
  },
  suburb_station: {
    id: 'suburb_station', name: '城郊站台', bg: 'assets/scenes/suburb_station.png',
    description: '连接全城的枢纽站台，列车缓缓驶入。',
    exits: [
      { dir: 'left',   to: 'suburb_st',    label: '街道' },
      { dir: 'top',    to: 'forest',       label: '森林' },
      { dir: 'right',  to: 'food_st',      label: '小吃街方向' },
      { dir: 'bottom', to: 'cardshop_door', label: '牌店方向' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'ticket', label: '售票机', x: 0.5, y: 0.6, desc: '无人售票机，屏幕亮着。' },
    ],
  },

  // ===== 森林（1）=====
  forest: {
    id: 'forest', name: '森林', bg: 'assets/scenes/forest.jpg',
    description: '幽静的森林，阳光从枝叶间洒下。',
    exits: [{ dir: 'bottom', to: 'suburb_station', label: '站台' }],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'tree', label: '古树', x: 0.35, y: 0.55, desc: '一棵参天古树，树皮上长着青苔。' },
      { id: 'trail', label: '小径', x: 0.65, y: 0.7, desc: '蜿蜒的林间小径，通往更深处。' },
    ],
  },
};

export function getScene(id) {
  return SCENES[id] || null;
}

// 场景图静态数据：16 节点 + 角色 + 表情约定
// 坐标一律百分比（0~1）；dir 取值 left/right/top/bottom

export const EMOTION_LIST = ['neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire'];

export const CHARACTERS = {
  baiyue:   { name: '白月',       portrait: 'assets/characters/baiyue/neutral.png' },
  linyi:    { name: '林仪',       portrait: 'assets/characters/linyi/neutral.png' },
  liuyue:   { name: '柳月',       portrait: 'assets/characters/liuyue/neutral.png' },
  suyun:    { name: '苏昀',       portrait: 'assets/characters/suyun/neutral.png' },
  siren:    { name: '塞壬',       portrait: 'assets/characters/siren/neutral.png' },
  ecclesia: { name: '艾克利西娅', portrait: 'assets/characters/ecclesia/neutral.png' },
};

/** 头像锚点：站位坐标上抬 12%（头部位置），y 下界夹 0；纯函数供 scene.js 与校验脚本复用 */
export function avatarAnchor(spot) {
  return { x: spot.x, y: Math.max(0, spot.y - 0.12) };
}

export function emotionFile(charId, emotion) {
  return `assets/characters/${charId}/${emotion}.png`;
}

export const SCENES = {
  // ===== 家（3）=====
  home_living: {
    id: 'home_living', name: '客厅', bg: 'assets/scenes/home_living.png',
    description: '温暖的客厅，白月和塞壬的日常据点。',
    exits: [
      { dir: 'left',   to: 'home_bed',  label: '卧室' },
      { dir: 'right',  to: 'home_door', label: '家门' },
      { dir: 'bottom', to: 'suburb_st', label: '出门' },
    ],
    characters: ['baiyue', 'siren'],
    characterSpots: { baiyue: { x: 0.62, y: 0.52, scale: 0.85 }, siren: { x: 0.3, y: 0.55, scale: 0.8 } },
    objects: [
      { id: 'sofa', label: '沙发', x: 0.35, y: 0.72, desc: '蓬松的沙发，白月经常在这里打盹。' },
      { id: 'cards', label: '卡组', x: 0.68, y: 0.6, desc: '你的备用卡组，整齐地码在茶几上。' },
    ],
  },
  home_bed: {
    id: 'home_bed', name: '卧室', bg: 'assets/scenes/home_bed.png',
    description: '你的卧室，全城唯一能隔绝催眠 APP 信号的净土。',
    exits: [{ dir: 'right', to: 'home_living', label: '客厅' }],
    characters: ['baiyue'],
    characterSpots: { baiyue: { x: 0.5, y: 0.55, scale: 0.85 } },
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
    ],
    characters: ['siren'],
    characterSpots: { siren: { x: 0.55, y: 0.55, scale: 0.8 } },
    objects: [
      { id: 'river', label: '小河', x: 0.85, y: 0.6, desc: '清澈的小河，塞壬总爱在这里吐泡泡。' },
    ],
  },

  // ===== 公司（3）=====
  company_cubicle: {
    id: 'company_cubicle', name: '工位', bg: 'assets/scenes/company_cubicle.png',
    description: '你的工位。开放办公区里键盘声此起彼伏。',
    exits: [
      { dir: 'left',  to: 'company_door',   label: '门口' },
      { dir: 'right', to: 'company_office', label: '上司办公室' },
    ],
    characters: ['linyi', 'liuyue'],
    characterSpots: { liuyue: { x: 0.55, y: 0.52, scale: 0.85 }, linyi: { x: 0.85, y: 0.5, scale: 0.8 } },
    objects: [
      { id: 'pc', label: '电脑', x: 0.35, y: 0.6, desc: '堆积如山的待办事项在屏幕上闪烁。' },
      { id: 'files', label: '文件', x: 0.45, y: 0.68, desc: '一摞还没批完的文件。' },
    ],
  },
  company_office: {
    id: 'company_office', name: '上司办公室', bg: 'assets/scenes/company_office.png',
    description: '林仪的办公室，冷色调的装潢透着一丝压迫感。',
    exits: [{ dir: 'left', to: 'company_cubicle', label: '工位' }],
    characters: ['linyi'],
    characterSpots: { linyi: { x: 0.5, y: 0.5, scale: 0.85 } },
    objects: [
      { id: 'desk', label: '办公桌', x: 0.45, y: 0.65, desc: '宽大的办公桌，一尘不染。' },
      { id: 'window', label: '落地窗', x: 0.85, y: 0.4, desc: '透过落地窗能俯瞰整座城市。' },
    ],
  },
  company_door: {
    id: 'company_door', name: '公司门口', bg: 'assets/scenes/company_door.png',
    description: '公司大楼的门口，通勤族行色匆匆。',
    exits: [
      { dir: 'right', to: 'company_cubicle', label: '工位' },
      { dir: 'left',  to: 'mall_st',  label: '商业街' },
      { dir: 'bottom', to: 'suburb_st', label: '城郊方向' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'gate', label: '门禁', x: 0.5, y: 0.6, desc: '刷卡才能进出的门禁闸机。' },
    ],
  },

  // ===== 小吃街（2）=====
  food_bunshop: {
    id: 'food_bunshop', name: '包子铺', bg: 'assets/scenes/food_bunshop.png',
    description: '香气扑鼻的包子铺，艾克利西娅在这里当帮工。',
    exits: [{ dir: 'left', to: 'food_st', label: '街道' }],
    characters: ['ecclesia'],
    characterSpots: { ecclesia: { x: 0.5, y: 0.52, scale: 0.85 } },
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
    characters: ['suyun'],
    characterSpots: { suyun: { x: 0.5, y: 0.55, scale: 0.85 } },
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
      { dir: 'right', to: 'company_door',  label: '公司' },
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
    characters: ['ecclesia'],
    characterSpots: { ecclesia: { x: 0.55, y: 0.52, scale: 0.85 } },
    objects: [
      { id: 'cakecase', label: '蛋糕柜', x: 0.4, y: 0.6, desc: '玻璃柜里摆满了精致的蛋糕。' },
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
      { dir: 'top',    to: 'company_door', label: '公司方向' },
      { dir: 'right',  to: 'food_st',      label: '小吃街方向' },
      { dir: 'bottom', to: 'cardshop_door', label: '牌店方向' },
    ],
    characters: [],
    characterSpots: {},
    objects: [
      { id: 'ticket', label: '售票机', x: 0.5, y: 0.6, desc: '无人售票机，屏幕亮着。' },
    ],
  },
};

export function getScene(id) {
  return SCENES[id] || null;
}

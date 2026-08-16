# 场景交互式重构实施计划（光之回响）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把光之回响从聊天流形态重构为场景交互式前端游戏：16 节点场景图导航 + 场景内全身立绘合成 + 近景特写对话 + 8 表情差分 + AI 情感标签换表情，素材全部本地 ComfyUI 生成。

**Architecture:** 渐进式改造（方案 A）。保留 AppState 订阅体系 / Navigation / 存档 / 标题、背包、伙伴、设置、BGM、粒子；新增 scene.js（场景视图）、closeup.js（近景特写）、scenes-data.js（16 节点数据）；event.js 重构为对话引擎（渲染进特写层）；删除 map.js；bridge.py 增加 emotion 标签解析。

**Tech Stack:** 原生 ES Modules（无框架、无构建）、Node v24（数据校验脚本）、Python 3.11（ComfyUI 生成脚本）、ComfyUI API（127.0.0.1:8188，Comfy Desktop app 内嵌服务器）、miaomiaoHarem_anima15 + jirai_v2 LoRA + ModelSamplingAuraFlow 3.6。

**规格：** `docs/superpowers/specs/2026-08-16-scene-interactive-refactor-design.md`（155 行，12 节）

## Global Constraints

- 场景节点数 = **16**（家3/公司3/小吃街2/超市2/牌店2/商业街2/城郊2）；素材总量 = **70** 张（16 场景 + 6 全身 + 48 表情）
- 表情 8 种，key 固定：`neutral/smile/happy/blushing/angry/sad/surprised/desire`（AI 标签白名单同此 8 个）
- 角色 id 固定：`baiyue/linyi/liuyue/suyun/siren/ecclesia`
- 素材命名固定：`assets/scenes/<scene_id>.png`、`assets/characters/<id>/fullbody.png`、`assets/characters/<id>/<emotion>.png`
- 所有生成图片同步复制到桌面 `C:\Users\Administrator\Desktop\` 供审查
- ⚠️ 不要另起 headless ComfyUI 服务器占 8188（会撞 Comfy Desktop app）；生成走 `http://127.0.0.1:8188`
- AI 不推进剧情：场景视图零 AI 调用；AI 只在近景特写对话中工作
- 热区/锚点坐标一律百分比（0~1）
- 现有 `window.App` / `'splashdone'` / `'sidebar-reveal'` / `'newgame-start'` 契约保持不动
- 生成参数（Anima Base 配方）：UNETLoader(Harem anima15, default) → LoraLoaderModelOnly(jirai_v2, 1) → ModelSamplingAuraFlow(3.6) → CFGNorm(1, False) → KSampler(cfg 1, 20 步, euler, simple) → VAEDecodeTiled(512,64,64,8)；CLIP 用 `qwen_image` 类型；VAE 用 `qwenImage_qwenImageVAE.safetensors`

---

### Task 1: 场景图数据模型 `js/scenes-data.js` + 校验脚本

**Files:**
- Create: `js/scenes-data.js`
- Create: `scripts/validate-scenes.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export const EMOTION_LIST` — 8 表情 key 数组
  - `export const CHARACTERS` — `{ [charId]: { name, fullbody } }`
  - `export const SCENES` — 16 场景节点（见下方完整数据）
  - `export function getScene(id)` → 节点或 null
  - `export function emotionFile(charId, emotion)` → 表情图路径字符串

- [ ] **Step 1: 创建 `js/scenes-data.js`**

```js
// 场景图静态数据：16 节点 + 角色 + 表情约定
// 坐标一律百分比（0~1）；dir 取值 left/right/top/bottom

export const EMOTION_LIST = ['neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire'];

export const CHARACTERS = {
  baiyue:   { name: '白月',       fullbody: 'assets/characters/baiyue/fullbody.png' },
  linyi:    { name: '林仪',       fullbody: 'assets/characters/linyi/fullbody.png' },
  liuyue:   { name: '柳月',       fullbody: 'assets/characters/liuyue/fullbody.png' },
  suyun:    { name: '苏昀',       fullbody: 'assets/characters/suyun/fullbody.png' },
  siren:    { name: '塞壬',       fullbody: 'assets/characters/siren/fullbody.png' },
  ecclesia: { name: '艾克利西娅', fullbody: 'assets/characters/ecclesia/fullbody.png' },
};

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
    exits: [{ dir: 'left', to: 'mall_st', label: '街道' }],
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
```

- [ ] **Step 2: 创建校验脚本 `scripts/validate-scenes.mjs`**

```js
// 校验场景数据完整性：node scripts/validate-scenes.mjs
import { SCENES, CHARACTERS, EMOTION_LIST, getScene, emotionFile } from '../js/scenes-data.js';

let errors = [];
const ids = Object.keys(SCENES);
if (ids.length !== 16) errors.push(`场景数应为 16，实际 ${ids.length}`);

for (const [id, s] of Object.entries(SCENES)) {
  if (s.id !== id) errors.push(`${id}: id 字段不一致`);
  if (!s.bg || !s.bg.startsWith('assets/scenes/')) errors.push(`${id}: bg 路径非法`);
  if (!s.name || !s.description) errors.push(`${id}: 缺 name/description`);
  for (const e of s.exits) {
    if (!['left', 'right', 'top', 'bottom'].includes(e.dir)) errors.push(`${id}: 非法出口方向 ${e.dir}`);
    if (!SCENES[e.to]) errors.push(`${id}: 出口指向不存在的场景 ${e.to}`);
  }
  for (const c of s.characters) {
    if (!CHARACTERS[c]) errors.push(`${id}: 角色 ${c} 不在 CHARACTERS`);
  }
  for (const [c, spot] of Object.entries(s.characterSpots)) {
    if (!s.characters.includes(c)) errors.push(`${id}: characterSpots 有未声明角色 ${c}`);
    for (const k of ['x', 'y']) {
      if (typeof spot[k] !== 'number' || spot[k] < 0 || spot[k] > 1) errors.push(`${id}: ${c}.${k} 越界`);
    }
  }
  for (const o of s.objects) {
    if (o.x < 0 || o.x > 1 || o.y < 0 || o.y > 1) errors.push(`${id}: 物件 ${o.id} 坐标越界`);
  }
}
if (EMOTION_LIST.length !== 8) errors.push('表情数应为 8');
for (const e of EMOTION_LIST) {
  const f = emotionFile('liuyue', e);
  if (!f.endsWith(`/liuyue/${e}.png`)) errors.push(`emotionFile 路径错误: ${f}`);
}
if (!getScene('home_living') || getScene('nonexistent')) errors.push('getScene 行为错误');

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('PASS: 16 场景、出口引用、角色/物件坐标、表情路径全部有效');
```

- [ ] **Step 3: 运行校验**

Run: `cd C:/Users/Administrator/each-dawm- && node scripts/validate-scenes.mjs`
Expected: `PASS: 16 场景、出口引用、角色/物件坐标、表情路径全部有效`

- [ ] **Step 4: 提交**

```bash
git add js/scenes-data.js scripts/validate-scenes.mjs
git commit -m "feat: 场景图数据模型（16 节点）+ 校验脚本"
```

---

### Task 2: 状态与存档扩展（state.js / storage.js）

**Files:**
- Modify: `js/state.js`（createDefaultState）
- Modify: `js/storage.js`（SAVE_KEYS）
- Create: `scripts/validate-state.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  - `AppState` 新增顶层键：`currentSceneId: string`、`sceneCharacters: { [charId]: { present: boolean, emotion: string } }`、`closeup: { active: boolean, characterId: string|null, emotion: string }`（closeup 不存档）

- [ ] **Step 1: 修改 `js/state.js`**

在 `createDefaultState()` 中 `currentLocation` 定义附近插入：

```js
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
```

（`present` 的语义：该角色当前是否可在场景中出场；场景 `characters` 数组决定哪些角色显示，`present=false` 时即使场景声明了也不显示。）

- [ ] **Step 2: 修改 `js/storage.js`**

`SAVE_KEYS` 改为：

```js
const SAVE_KEYS = ['player', 'gamePhase', 'companions', 'inventory', 'mapNodes', 'settings',
                   'currentSceneId', 'sceneCharacters', 'gameTime'];
```

（`closeup` 是瞬时 UI 状态，不入存档。）

- [ ] **Step 3: 创建 `scripts/validate-state.mjs`**

```js
// node scripts/validate-state.mjs
// 通过静态文本校验 state.js/storage.js 的字段契约
import { readFileSync } from 'node:fs';
const state = readFileSync('js/state.js', 'utf-8');
const storage = readFileSync('js/storage.js', 'utf-8');
let errors = [];
for (const needle of ["currentSceneId: 'home_living'", 'sceneCharacters: {', 'closeup: { active: false']) {
  if (!state.includes(needle)) errors.push(`state.js 缺少: ${needle}`);
}
for (const needle of ["'currentSceneId'", "'sceneCharacters'", "'gameTime'"]) {
  if (!storage.includes(needle)) errors.push(`storage.js SAVE_KEYS 缺少: ${needle}`);
}
if (storage.includes("'closeup'")) errors.push('closeup 不应入存档');
if (errors.length) { console.error('FAIL'); errors.forEach(e => console.error(' -', e)); process.exit(1); }
console.log('PASS: 状态字段与存档白名单契约正确');
```

- [ ] **Step 4: 运行校验**

Run: `node scripts/validate-state.mjs`
Expected: `PASS: 状态字段与存档白名单契约正确`

- [ ] **Step 5: 提交**

```bash
git add js/state.js js/storage.js scripts/validate-state.mjs
git commit -m "feat: 状态与存档扩展（currentSceneId/sceneCharacters/closeup）"
```

---

### Task 3: 场景视图骨架 `js/scene.js`（背景/出口/旁白/物件）

**Files:**
- Create: `js/scene.js`
- Create: `css/scene.css`
- Modify: `index.html`（链接 scene.css）
- Modify: `js/app.js`（renderPanels 增加 panel-scene；订阅 currentView 时初始化 SceneView；`viewIds` 加 `'scene'`）

**Interfaces:**
- Consumes: `SCENES/getScene`（Task 1）、`AppState`（Task 2）、`window.App.advanceTime`
- Produces:
  - `export const SceneView = { init(), render(), showScene(sceneId), travelTo(sceneId), showSubtitle(text), setCharacterEmotion(charId, emotion) }`
  - `export function showInitialBackground()` — 兼容 app.js 现有调用，实现为 `SceneView.showScene(AppState.get('currentSceneId').currentSceneId)` 的包装（注意 `AppState.get(key)` 返回深拷贝值本身，用 `AppState.get('currentSceneId')`）

- [ ] **Step 1: 创建 `css/scene.css`**

```css
/* 场景视图：全屏三层（背景/立绘/热点） */
#panel-scene { position: relative; }
.scene-canvas { position: relative; width: 100%; height: 100vh; overflow: hidden; }
.scene-character-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.scene-sprite { position: absolute; transform: translate(-50%, -100%); pointer-events: auto; cursor: pointer; }
.scene-sprite .sprite-img { height: 55vh; display: block; margin: 0 auto; filter: drop-shadow(0 6px 12px rgba(0,0,0,.45)); }
.scene-sprite .sprite-shadow { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%); width: 60%; height: 14px; background: radial-gradient(ellipse, rgba(0,0,0,.35), transparent 70%); }
.scene-sprite .sprite-name { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity .2s; padding: 2px 10px; border-radius: 999px; background: rgba(18,20,42,.75); color: #F5ECD7; font-size: 12px; white-space: nowrap; }
.scene-sprite:hover .sprite-name { opacity: 1; }
.scene-sprite:hover .sprite-img { filter: drop-shadow(0 0 14px rgba(212,165,116,.9)) drop-shadow(0 6px 12px rgba(0,0,0,.45)); }
.scene-sprite.sprite-missing { display: flex; align-items: center; justify-content: center; width: 110px; height: 150px; background: rgba(18,20,42,.6); border: 1px dashed #D4A574; border-radius: 8px; }
.scene-exit { position: absolute; top: 50%; transform: translateY(-50%); width: 56px; height: 42%; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity .25s; z-index: 8; }
.scene-exit:hover { opacity: 1; }
.scene-exit .exit-label { padding: 3px 10px; border-radius: 999px; background: rgba(18,20,42,.8); color: #F5ECD7; font-size: 13px; }
.scene-exit.exit-left  { left: 0; }
.scene-exit.exit-right { right: 0; }
.scene-exit.exit-top   { top: 0; left: 50%; transform: translateX(-50%); width: 42%; height: 56px; }
.scene-exit.exit-bottom{ bottom: 0; left: 50%; transform: translateX(-50%); width: 42%; height: 56px; }
.scene-object { position: absolute; width: 46px; height: 46px; transform: translate(-50%, -50%); cursor: pointer; opacity: 0; transition: opacity .25s; z-index: 6; }
.scene-canvas:hover .scene-object { opacity: .75; }
.scene-object:hover { opacity: 1; }
.scene-object .obj-dot { width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle, rgba(212,165,116,.85), rgba(212,165,116,.25)); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #12142a; }
.scene-subtitle { position: absolute; top: 9%; left: 50%; transform: translateX(-50%); z-index: 10; max-width: 70%; padding: 8px 22px; background: rgba(18,20,42,.55); backdrop-filter: blur(6px); border-radius: 999px; color: #F5ECD7; font-size: 15px; opacity: 0; transition: opacity .5s; pointer-events: none; text-align: center; }
.scene-subtitle.visible { opacity: 1; }
```

- [ ] **Step 2: 创建 `js/scene.js`**

```js
// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（立绘逻辑在 Task 4 补全）
import { AppState } from './state.js';
import { SCENES, getScene } from './scenes-data.js';

const _subtitleTimer = null;
let _currentSceneId = 'home_living';

function _bgUrl(scene) {
  return `url('${scene.bg}')`;
}

function _renderExits(scene) {
  const layer = document.getElementById('scene-exit-layer');
  layer.innerHTML = '';
  for (const e of scene.exits) {
    const div = document.createElement('div');
    div.className = `scene-exit exit-${e.dir}`;
    div.innerHTML = `<span class="exit-label">${e.label}</span>`;
    div.addEventListener('click', () => SceneView.travelTo(e.to));
    layer.appendChild(div);
  }
}

function _renderObjects(scene) {
  const layer = document.getElementById('scene-object-layer');
  layer.innerHTML = '';
  for (const o of scene.objects) {
    const div = document.createElement('div');
    div.className = 'scene-object';
    div.style.left = `${o.x * 100}%`;
    div.style.top = `${o.y * 100}%`;
    div.innerHTML = `<span class="obj-dot">✦</span>`;
    div.title = o.label;
    div.addEventListener('click', () => SceneView.showSubtitle(o.desc));
    layer.appendChild(div);
  }
}

export const SceneView = {
  init() {
    document.getElementById('panel-scene').innerHTML = `
      <div class="scene-canvas">
        <div id="scene-exit-layer"></div>
        <div id="scene-character-layer" class="scene-character-layer"></div>
        <div id="scene-object-layer"></div>
        <div id="scene-subtitle" class="scene-subtitle"></div>
      </div>`;
    this.showScene(AppState.get('currentSceneId'));
  },

  render() { this.showScene(AppState.get('currentSceneId')); },

  showScene(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return;
    _currentSceneId = sceneId;
    AppState.set('currentSceneId', sceneId);
    const bg = document.getElementById('location-bg');
    bg.classList.remove('active');
    requestAnimationFrame(() => {
      bg.style.backgroundImage = _bgUrl(scene);
      bg.classList.add('active');
    });
    _renderExits(scene);
    _renderObjects(scene);
    this.showSubtitle(`${scene.name} · ${scene.description}`);
  },

  travelTo(sceneId) {
    const from = getScene(_currentSceneId);
    const to = getScene(sceneId);
    if (!to) return;
    if (window.App && typeof window.App.advanceTime === 'function') window.App.advanceTime();
    this.showScene(sceneId);
    if (from) {
      const here = document.querySelector('.scene-exit'); // 到达提示已在 showScene 字幕中
    }
  },

  showSubtitle(text) {
    const el = document.getElementById('scene-subtitle');
    if (!el) return;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(SceneView._subtitleTimer);
    SceneView._subtitleTimer = setTimeout(() => el.classList.remove('visible'), 4200);
  },

  setCharacterEmotion(charId, emotion) {
    const sc = AppState.get('sceneCharacters');
    if (sc && sc[charId]) {
      sc[charId].emotion = emotion;
      AppState.set('sceneCharacters', sc);
    }
  },
};

export function showInitialBackground() {
  SceneView.showScene(AppState.get('currentSceneId'));
}
```

- [ ] **Step 3: 修改 `index.html`**

在 `<link rel="stylesheet" href="css/map.css">` 一行后加：

```html
  <link rel="stylesheet" href="css/scene.css">
```

- [ ] **Step 4: 修改 `js/app.js` 接线（最小化，让场景视图可见可测）**

用 Grep 定位后修改三处：
1. `renderPanels()` 里 `viewIds = ['event','inventory','companions','map']` → `['scene','inventory','companions','map']`，并确保生成的 panel 容器带 `id="panel-scene"`
2. 模块导入区加：`import { SceneView, showInitialBackground } from './scene.js?v=10';`；若 `showInitialBackground` 此前从 map.js 导入，替换 import 来源
3. `App.init()` 中面板 init 循环附近加 `SceneView.init();`

- [ ] **Step 5: 浏览器验收（场景骨架）**

- 服务器已在跑（bridge:9999 + http.server:8080，若不在：`start "Frontend" /min /D "C:\Users\Administrator\each-dawm-" python -m http.server 8080`）
- 打开 `http://127.0.0.1:8080` → 开始新游戏 → 侧边栏出现「场景」入口，主视图为场景视图
- 验证：进入游戏后显示 `assets/scenes/home_living.png`（此时素材未生成 → 背景 404 属预期，字幕照常显示「客厅 · 温暖的客厅……」）；悬停画面边缘出现出口标签；点击出口 → 字幕切换为新场景名+描述、时间推进（右上角时间变化）；点击物件热点 → 显示物件描述字幕；出口连跳 3 次无报错（F12 console 无红）

- [ ] **Step 6: 提交**

```bash
git add js/scene.js css/scene.css index.html js/app.js
git commit -m "feat: 场景视图骨架（背景/出口/物件/旁白字幕）"
```

---

### Task 4: 立绘合成层（场景内全身立绘 + 降级）

**Files:**
- Modify: `js/scene.js`（补立绘渲染）
- Modify: `css/scene.css`（补 sprite-missing 等已在 Task 3 加入，本任务按需微调）

**Interfaces:**
- Consumes: `SCENES/CHARACTERS/emotionFile`（Task 1）、`AppState.sceneCharacters`（Task 2）
- Produces: `SceneView.renderCharacters()`（新增）、`window` 事件 `'closeup-open'`（`new CustomEvent('closeup-open', { detail: { characterId } })`）

- [ ] **Step 1: 在 `js/scene.js` 顶部 import 行加入 `CHARACTERS`，并新增立绘渲染**

```js
import { SCENES, CHARACTERS, getScene } from './scenes-data.js';

function _renderCharacters(scene) {
  const layer = document.getElementById('scene-character-layer');
  layer.innerHTML = '';
  const sc = AppState.get('sceneCharacters') || {};
  for (const charId of scene.characters) {
    const meta = CHARACTERS[charId];
    const st = sc[charId];
    if (!meta || !st || !st.present) continue;
    const spot = (scene.characterSpots || {})[charId];
    if (!spot) continue;
    const sprite = document.createElement('div');
    sprite.className = 'scene-sprite';
    sprite.style.left = `${spot.x * 100}%`;
    sprite.style.top = `${spot.y * 100}%`;
    const img = new Image();
    img.className = 'sprite-img';
    img.src = meta.fullbody;
    img.onload = () => {
      if (spot.scale) img.style.height = `${55 * spot.scale}vh`;
    };
    img.onerror = () => { sprite.classList.add('sprite-missing'); img.remove(); };
    sprite.appendChild(img);
    sprite.insertAdjacentHTML('beforeend',
      `<span class="sprite-shadow"></span><span class="sprite-name">${meta.name}</span>`);
    sprite.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: charId } }));
    });
    layer.appendChild(sprite);
  }
}
```

- [ ] **Step 2: 在 `showScene()` 内、`_renderObjects(scene)` 之后调用 `_renderCharacters(scene)`**

- [ ] **Step 3: 浏览器验收（立绘层）**

- `home_living` 有 `baiyue/siren` 两个 spot：此时素材未生成 → 显示虚线剪影占位（`.sprite-missing`），悬停出现名字「白月」「塞壬」
- 点击剪影 → F12 console 里 `window.addEventListener('closeup-open', ...)` 能收到事件（可临时在 console 执行 `window.addEventListener('closeup-open', e => console.log(e.detail))` 验证）
- 场景无 characters（如 `mall_st`）→ 立绘层为空
- 临时把 `assets/characters/baiyue/fullbody.png` 放一张测试图（任意 PNG）→ 立绘按锚点/缩放显示、悬停金光、脚下阴影正常

- [ ] **Step 4: 提交**

```bash
git add js/scene.js
git commit -m "feat: 场景内全身立绘合成层（锚点/阴影/悬停/点击/降级剪影）"
```

---

### Task 5: 近景特写层 `js/closeup.js`

**Files:**
- Create: `js/closeup.js`
- Create: `css/closeup.css`
- Modify: `index.html`（链接 closeup.css）
- Modify: `js/app.js`（import CloseupView；监听 `'closeup-open'`/`'closeup-close'` 事件）

**Interfaces:**
- Consumes: `CHARACTERS/emotionFile`（Task 1）、`AppState.closeup`（Task 2）
- Produces:
  - `export const CloseupView = { init(), open(characterId), close(), setEmotion(emotion), getDialogEl() }`
  - `getDialogEl()` 返回 `#closeup-dialog`——Task 6 对话引擎的渲染目标

- [ ] **Step 1: 创建 `css/closeup.css`**

```css
/* 近景特写层：全屏覆盖，背景模糊压暗 */
#closeup-overlay { position: fixed; inset: 0; z-index: 90; display: none; }
#closeup-overlay.active { display: block; }
.closeup-backdrop { position: absolute; inset: 0; background: rgba(10, 12, 28, .65); backdrop-filter: blur(10px); }
.closeup-portrait { position: absolute; left: 6%; bottom: 0; height: 82vh; z-index: 2; }
.closeup-portrait img { height: 100%; display: block; filter: drop-shadow(0 10px 24px rgba(0,0,0,.5)); transition: opacity .35s; }
.closeup-portrait.sprite-missing { width: 240px; height: 340px; border: 1px dashed #D4A574; background: rgba(18,20,42,.6); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #F5ECD7; }
.closeup-header { position: absolute; top: 22px; left: 6%; z-index: 3; color: #F5ECD7; }
.closeup-header .char-name { font-size: 22px; margin-right: 14px; }
.closeup-dialog { position: absolute; right: 5%; bottom: 9%; width: 46%; max-width: 620px; height: 62%; background: rgba(18, 20, 42, .78); border: 1px solid rgba(212, 165, 116, .35); border-radius: 14px; padding: 18px 22px; display: flex; flex-direction: column; z-index: 3; }
.closeup-close { position: absolute; top: 18px; right: 22px; z-index: 4; background: rgba(18,20,42,.7); color: #F5ECD7; border: 1px solid rgba(212,165,116,.4); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
```

- [ ] **Step 2: 创建 `js/closeup.js`**

```js
// 近景特写层：大立绘 + 表情差分 + 对话区（对话引擎在 Task 6 接入）
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';

let _charId = null;

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-dialog" id="closeup-dialog"></div>
      <button class="closeup-duel" id="closeup-duel-btn">⚔ 提出决斗</button>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
    // 决斗按钮占位：Task 6 对话引擎接入时接 BattleBridge.launch + startPolling 链路
    document.getElementById('closeup-duel-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-duel', { detail: { characterId: _charId } }));
    });
  },

  open(characterId) {
    _charId = characterId;
    const meta = CHARACTERS[characterId];
    if (!meta) return;
    AppState.set('closeup', { active: true, characterId, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = meta.name;
    document.getElementById('closeup-overlay').classList.add('active');
    this.setEmotion('neutral');
  },

  close() {
    AppState.set('closeup', { active: false, characterId: null, emotion: 'neutral' });
    document.getElementById('closeup-overlay').classList.remove('active');
    _charId = null;
  },

  setEmotion(emotion) {
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    el.classList.remove('sprite-missing');
    const img = new Image();
    img.src = emotionFile(_charId, emotion);
    img.onerror = () => { el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
    el.appendChild(img);
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};
```

- [ ] **Step 3: 修改 `index.html`** 加 `<link rel="stylesheet" href="css/closeup.css">`

- [ ] **Step 4: 修改 `js/app.js` 接线**

- import `CloseupView`
- `App.init()` 中加 `CloseupView.init();`
- 监听事件：

```js
window.addEventListener('closeup-open', (e) => CloseupView.open(e.detail.characterId));
```

- [ ] **Step 5: 浏览器验收（特写层）**

- 场景中点击角色剪影/立绘 → 特写层弹出：背景模糊压暗、左侧立绘位（素材缺失 → 「立绘缺失」占位）、右上关闭按钮、右侧空对话区
- 点击「关闭 ✕」→ 回场景视图，无报错
- 打开特写时点击画面外无操作（世界静止）

- [ ] **Step 6: 提交**

```bash
git add js/closeup.js css/closeup.css index.html js/app.js
git commit -m "feat: 近景特写层（大立绘位/表情切换接口/对话容器/关闭）"
```

---

### Task 6: event.js 重构为对话引擎（接入特写层）

**Files:**
- Modify: `js/event.js`（核心重构，48KB → 目标 20KB 内）
- Modify: `js/app.js`（EventPanel 初始化目标调整；remove event 视图面板 DOM）

**Interfaces:**
- Consumes: `CloseupView.getDialogEl()`（Task 5）、`AppState`
- Produces（对外接口保持不变，实现内迁）：
  - `EventPanel.init()` — 渲染 DOM 到 `CloseupView.getDialogEl()` 而非 `#panel-event`
  - `EventPanel.addNarratorText(text, speed, doneCallback)`
  - `EventPanel.addPlayerAction(text)`
  - `EventPanel.submitAction(text)`
  - `EventPanel.showSuggestions()` / `toggleSuggestions()` / `setAtmosphere(mood)`

- [ ] **Step 1: 用 Grep 定位 event.js 中所有面板显隐/定位逻辑**

Run: `grep -n "panel-event\|view-panel\|visibility" js/event.js`
Expected: 命中 `_renderDOM` 及相关 CSS 类操作。重构原则：对话引擎只渲染 `.event-dialog` 内部结构（叙事区/建议/输入区/对战卡片），容器由 closeup 提供。

- [ ] **Step 2: 重构 `_renderDOM()`**

将 `_renderDOM()` 改为：

```js
function _renderDOM() {
  const host = CloseupView.getDialogEl();
  if (!host) return;
  host.innerHTML = `
    <div class="event-dialog">
      <div class="narrative-text" id="narrative-text"></div>
      <div class="divider-glow"></div>
      <button id="skip-intro-btn" class="hidden">跳过开场白</button>
      <div class="suggest-toggle">展开建议</div>
      <div class="suggestions-panel hidden"></div>
      <div class="input-area">
        <textarea id="narrative-input" placeholder="说点什么……"></textarea>
        <button id="send-btn">发送</button>
      </div>
    </div>`;
  // 事件绑定代码从原 _renderDOM 平移过来（保持原有 id 绑定逻辑不变）
}
```

- [ ] **Step 3: 删除 event 视图的 panel 管理**

- 删除 event.js 中对 `#panel-event` 的显隐控制（`EventPanel` 不再自己切换面板可见性）
- `Navigation.navigateTo('event')` 相关调用改为打开场景视图（见 Task 9 统一处理；本任务只保证不再有 JS 报错：将 app.js 中订阅 `currentView` 后的 `EventPanel` 面板切换分支改为 no-op 或删除）

- [ ] **Step 4: 修改 `js/app.js`**

- `EventPanel.init()` 调用时机：从「App.init 面板循环」移到 `CloseupView.open()` 首次调用后（`CloseupView.init()` 已建好容器即可）；具体：在 app.js 的 `window.addEventListener('closeup-open', ...)` 回调里，若 `EventPanel` 未初始化则调用 `EventPanel.init()`
- `renderPanels()` 的 `viewIds` 移除 `'event'`（第 1 步已改为 `['scene','inventory','companions','map']`，本任务把 `'map'` 一并移除 → `['scene','inventory','companions']`）
- `index.html` 中删除 `<link rel="stylesheet" href="css/map.css">`（map 视图已删）

- [ ] **Step 5: 接通「提出决斗」按钮（`js/app.js`）**

```js
window.addEventListener('closeup-duel', (e) => {
  const { characterId } = e.detail;
  EventPanel.triggerDuelByButton(characterId);   // 复用 _resolveBattleOpponent + _launchBattle
});
```

`EventPanel` 增加方法 `triggerDuelByButton(characterId)`：内部调用现有 `_resolveBattleOpponent(characterId)` + `_launchBattle(btn, opponent)`（btn 传 null 时对战卡片跳过按钮态，直接启动）。

- [ ] **Step 6: 浏览器验收（对话引擎在特写内工作）**

- 场景点角色 → 特写弹出，右侧对话区出现输入框/发送按钮
- 输入「你好」发送 → 玩家文本右对齐显示；AI 返回（bridge 在跑）→ 叙事打字机逐字显示
- 点击「关闭」再打开另一角色 → 对话区保留上一角色历史（预期行为：历史按角色区分是后续增强，本任务不要求）
- 对战触发 A（叙事）：输入「我要和你决斗」→ 若 AI 叙事命中决斗关键词 → 对战卡片出现在对话流中，点开始 → MDPro3 正常拉起（BattleBridge 链路回归验证）
- 对战触发 B（按钮）：点「⚔ 提出决斗」→ 直接启动对战（对手 = 当前特写角色，卡组取 companions 绑定）→ 胜负回调 → 叙事续写
- 关闭特写回场景：无 JS 报错

- [ ] **Step 7: 提交**

```bash
git add js/event.js js/app.js index.html
git commit -m "refactor: event.js 重构为对话引擎，渲染进近景特写层 + 提出决斗按钮"
```

---

### Task 7: 表情系统（AI 情感 → 立绘切换）

**Files:**
- Modify: `js/ai.js`（AiClient.chat 透传 emotion）
- Modify: `js/event.js`（AI 返回后调表情切换回调）
- Create: `scripts/validate-emotion.mjs`

**Interfaces:**
- Consumes: `CloseupView.setEmotion`（Task 5）、`SceneView.setCharacterEmotion`（Task 3）、`EMOTION_LIST`（Task 1）
- Produces:
  - `export function mapEmotion(tag)` — 标签字符串 → 8 key 之一，未知/空 → `'neutral'`；别名映射：`blush/blushing/embarrassed/shy → blushing`，`cry/tears → sad`，`shock/shocked → surprised`，`happy/laugh → happy`，`smile/grin → smile`，`angry/mad → angry`，`desire/lust → desire`
  - AiClient.chat 返回结构含 `emotion` 字段

- [ ] **Step 1: 创建 `js/emotion.js`（映射表独立成文件）**

```js
// 情感标签 → 8 表情 key 的映射与归一化
import { EMOTION_LIST } from './scenes-data.js';

const ALIASES = {
  blush: 'blushing', blushing: 'blushing', embarrassed: 'blushing', shy: 'blushing',
  cry: 'sad', tears: 'sad', sad: 'sad', sorrow: 'sad',
  shock: 'surprised', shocked: 'surprised', surprised: 'surprised',
  happy: 'happy', laugh: 'happy', joy: 'happy', excited: 'happy',
  smile: 'smile', grin: 'smile',
  angry: 'angry', mad: 'angry', furious: 'angry',
  desire: 'desire', lust: 'desire', aroused: 'desire',
  neutral: 'neutral', normal: 'neutral',
};

export function mapEmotion(tag) {
  if (!tag) return 'neutral';
  const key = ALIASES[String(tag).toLowerCase().trim()];
  return key || 'neutral';
}
```

- [ ] **Step 2: 修改 `js/ai.js`**

`AiClient.chat` 返回对象增加透传：bridge 响应已有 `emotion` 字段时原样返回；无该字段时补 `emotion: null`（兼容旧 bridge）。具体在 `chat()` 的 `return result;` 前加：

```js
  if (result && typeof result.emotion === 'undefined') result.emotion = null;
```

- [ ] **Step 3: 修改 `js/event.js` 的 AI 返回处理**

在 `submitAction` → `_callAI` 拿到 `result` 后、push narrative 的位置插入：

```js
import { mapEmotion } from './emotion.js';
import { CloseupView } from './closeup.js';
import { SceneView } from './scene.js';
// ...
const emo = mapEmotion(result.emotion);
CloseupView.setEmotion(emo);
const cs = AppState.get('closeup');
if (cs && cs.characterId) SceneView.setCharacterEmotion(cs.characterId, emo);
```

（注意 event.js 若已 import AppState 则复用；否则 `import { AppState } from './state.js';`。）

- [ ] **Step 4: 创建 `scripts/validate-emotion.mjs`**

```js
// node scripts/validate-emotion.mjs
import { mapEmotion } from '../js/emotion.js';
import { EMOTION_LIST } from '../js/scenes-data.js';
const cases = {
  neutral: 'neutral', blush: 'blushing', embarrassed: 'blushing', shy: 'blushing',
  cry: 'sad', tears: 'sad', shock: 'surprised', happy: 'happy', laugh: 'happy',
  smile: 'smile', angry: 'angry', mad: 'angry', desire: 'desire', lust: 'desire',
  '': 'neutral', null: 'neutral', undefined: 'neutral', '啥也不是': 'neutral', 'HAPPY': 'happy',
};
let errors = [];
for (const [input, want] of Object.entries(cases)) {
  const got = mapEmotion(input);
  if (got !== want) errors.push(`mapEmotion(${JSON.stringify(input)}) = ${got}, 期望 ${want}`);
}
for (const e of EMOTION_LIST) {
  if (!EMOTION_LIST.includes(mapEmotion(e))) errors.push(`${e} 映射越界`);
}
if (errors.length) { console.error('FAIL'); errors.forEach(e => console.error(' -', e)); process.exit(1); }
console.log('PASS: 情感标签映射全部正确');
```

- [ ] **Step 5: 运行校验**

Run: `node scripts/validate-emotion.mjs`
Expected: `PASS: 情感标签映射全部正确`

- [ ] **Step 6: 浏览器验收（表情链路，先用假数据）**

- bridge 尚未支持 emotion（Task 8）时，AI 回复默认 neutral → 特写立绘用 `neutral.png`（素材未生成时显示「立绘缺失」占位属预期）
- 临时验证：F12 console 执行 `CloseupView.setEmotion('blushing')` → 立绘 src 变为 `assets/characters/<id>/blushing.png`（404 占位但网络面板可见路径正确）；`SceneView.setCharacterEmotion` 同理更新 state
- 无 JS 报错

- [ ] **Step 7: 提交**

```bash
git add js/emotion.js js/ai.js js/event.js scripts/validate-emotion.mjs
git commit -m "feat: 表情系统（情感标签映射 + AI 返回透传 + 立绘切换）"
```

---

### Task 8: bridge 情感标签协议

**Files:**
- Modify: `server/bridge.py`（/chat 解析 emotion）
- Modify: `server/data/preset.json`（提示词要求 `[emotion:标签]` 前缀）
- Create: `scripts/smoke-bridge-emotion.py`

**Interfaces:**
- Consumes: 8 标签白名单（与 `EMOTION_LIST` 一致）
- Produces: `/chat` 响应 JSON 增加 `emotion` 字段（`narrative` 为剥掉标签后的正文；无标签 → `emotion: "neutral"`）

- [ ] **Step 1: 修改 `server/data/preset.json`**

在系统提示词部分追加（具体位置按该文件现有结构，Grep 定位「格式要求」或文末追加）：

```json
"情感标签要求：每段回复必须以 [emotion:标签] 开头，标签只能取以下之一：neutral/smile/happy/blushing/angry/sad/surprised/desire。标签必须符合当前叙事中出场角色的情绪。除标签外不得输出任何额外格式。"
```

（若 preset.json 是 JSON 字符串拼接结构，按现有字段格式插入；改完用 `python -c "import json; json.load(open('server/data/preset.json', encoding='utf-8'))"` 验证 JSON 合法。）

- [ ] **Step 2: 修改 `server/bridge.py` 的 `/chat` 响应构造**

定位 AI 响应解析处（Grep `narrative` 或 `result\[`），在返回前插入：

```python
import re
EMOTION_WHITELIST = {'neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire'}

def split_emotion(text):
    m = re.match(r'^\s*\[emotion:([a-zA-Z]+)\]\s*', text or '')
    if m and m.group(1).lower() in EMOTION_WHITELIST:
        return text[m.end():].strip(), m.group(1).lower()
    return text, 'neutral'
```

在构造 `/chat` 响应处：

```python
narrative_raw = <AI 返回的叙事文本>
narrative, emotion = split_emotion(narrative_raw)
response = {..., 'narrative': narrative, 'emotion': emotion, ...}
```

- [ ] **Step 3: 创建冒烟脚本 `scripts/smoke-bridge-emotion.py`**

```python
# -*- coding: utf-8 -*-
"""bridge emotion 协议冒烟：重启 bridge 后运行"""
import json, urllib.request

def post(path, payload):
    req = urllib.request.Request('http://127.0.0.1:9999' + path,
        data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())

r = post('/chat', {'input': '你好（仅用于协议冒烟测试）'})
assert 'narrative' in r and 'emotion' in r, f'响应缺字段: {list(r.keys())}'
assert r['emotion'] in ('neutral','smile','happy','blushing','angry','sad','surprised','desire'), r['emotion']
assert not r['narrative'].lstrip().lower().startswith('[emotion:'), '标签未剥离'
print('PASS: emotion =', r['emotion'], '| narrative 前 60 字:', r['narrative'][:60])
```

- [ ] **Step 4: 重启 bridge 并跑冒烟**

- 停旧 bridge：`tasklist` 找到 `python bridge.py` 的 PID → `taskkill /PID <pid> /F`
- 重启：`start "Bridge" /min /D "C:\Users\Administrator\each-dawm-\server" python -u bridge.py`
- Run: `python scripts/smoke-bridge-emotion.py`
Expected: `PASS: emotion = <8标签之一> | narrative 前 60 字: ...`（narrative 不以 `[emotion:` 开头）

- [ ] **Step 5: 浏览器端到端验收**

- 场景点角色 → 特写输入触发情绪的话（如「你在脸红什么」）→ AI 回复若带 `[emotion:blushing]` → 特写立绘切换到 blushing 路径（Network 面板可见）；不带标签 → neutral
- 旧存档继续可用；AI 无响应时兜底叙事仍工作

- [ ] **Step 6: 提交**

```bash
git add server/bridge.py server/data/preset.json scripts/smoke-bridge-emotion.py
git commit -m "feat: bridge 情感标签协议（[emotion:标签] 解析 + 冒烟脚本）"
```

---

### Task 9: 视图整合与清理（删地图、侧边栏、死数据、兜底叙事）

**Files:**
- Delete: `js/map.js`、`css/map.css`
- Modify: `js/navigation.js`（视图项：scene/companions/inventory）
- Modify: `js/app.js`（删除 map 相关 import/init；renderPanels 视图集合；`showInitialBackground` 来源已切 SceneView）
- Modify: `js/state.js`（删除 `mapNodes` 死数据；`gamePhase` 保留字段但注释标记遗留）
- Modify: `js/event.js`（`LOCATION_FALLBACKS` 改按场景 ID 分组 `SCENE_FALLBACKS`）
- Modify: `js/ai.js`（game_state 载荷把 `mapNodes` 换成 `currentSceneId`）

**Interfaces:**
- Consumes: Task 1~8 全部
- Produces: 最终视图集合 `['scene','companions','inventory']`；`SCENE_FALLBACKS`（16 场景 × 2 段兜底）

- [ ] **Step 1: 修改 `js/navigation.js`**

用 Grep 定位 `views` 数组，改为：

```js
const views = [
  { id: 'scene',       label: '场景', icon: 'map-pin' },
  { id: 'companions',  label: '伙伴', icon: 'heart' },
  { id: 'inventory',   label: '背包', icon: 'briefcase' },
];
```

（icon 名沿用现有 lucide 命名习惯；若原数组有其他结构字段照抄保持。）

- [ ] **Step 2: 修改 `js/app.js`**

- 删除 `map.js` 的 import 与 `MapPanel.init/render` 调用
- `renderPanels()` 的 `viewIds = ['scene', 'companions', 'inventory']`
- `_onClearSave()` 里的面板重 init 列表同步：去掉 MapPanel，加入 SceneView.render()
- 新游戏流程：`title.js` 的 `_startNewGame` 里 `Navigation.navigateTo('event')` → `navigateTo('scene')`（用 Grep 定位并修改）

- [ ] **Step 3: 修改 `js/title.js`**

Grep `navigateTo('event')` → 改为 `navigateTo('scene')`。

- [ ] **Step 4: 修改 `js/state.js` 删死数据**

删除 `createDefaultState()` 中 `mapNodes` 定义（Grep `mapNodes` 定位）；`gamePhase` 保留（bridge 上下文仍引用）。

- [ ] **Step 5: 兜底叙事改场景分组（`js/event.js`）**

`LOCATION_FALLBACKS` 替换为 `SCENE_FALLBACKS`，16 个场景 ID 每场景 2 段（AI 离线/超时随机取用），例如：

```js
const SCENE_FALLBACKS = {
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
  company_cubicle: [
    '键盘声在工位间此起彼伏。',
    '你盯着屏幕，暂时没什么进展。',
  ],
  company_office: [
    '办公室的门虚掩着，里面没有任何动静。',
    '你放轻了脚步，没有进去。',
  ],
  company_door: [
    '公司门口人来人往，通勤族行色匆匆。',
    '你在门口站了一会儿，什么也没发生。',
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
};
```

`_generateResponse()` 中按 `AppState.get('currentSceneId')` 取值。

- [ ] **Step 6: 删除文件并全局搜残留**

```bash
git rm js/map.js css/map.css
grep -rn "map\.js\|MapPanel\|mapNodes\|LOCATION_FALLBACKS\|navigateTo('event')\|panel-event" js/ index.html
```

Expected: 全部无命中（`LOCATION_FALLBACKS` 仅剩已替换后的 `SCENE_FALLBACKS`）。

- [ ] **Step 7: 浏览器全链路回归**

- 新游戏 → 默认场景视图（home_living 字幕）→ 侧边栏仅 场景/伙伴/背包 三项
- 场景切换 → 背包/伙伴面板进出 → 回场景（场景状态保持）
- 特写对话 → AI 回复 → 表情切换 → 关闭 → 再开
- 对战触发 → MDPro3 → 胜负回调 → 叙事继续
- 清存档（`_onClearSave`）→ 新游戏再次完整走通
- F12 console 全程无红

- [ ] **Step 8: 提交**

```bash
git add -A js/ css/ index.html
git commit -m "refactor: 视图整合（场景/伙伴/背包）+ 删除地图 + 兜底叙事按场景分组"
```

---

### Task 10: 素材管线 · 场景图批量生成（16 张）

**Files:**
- Create: `scripts/gen_scenes.py`
- Create: `scripts/scene_prompts.py`（16 场景提示词表）

**Interfaces:**
- Consumes: Anima Base 配方（见 Global Constraints）、ComfyUI API（app 内嵌服务器 8188）
- Produces: `assets/scenes/<scene_id>.png` × 16 + 桌面副本 `C:\Users\Administrator\Desktop\场景审查\`

- [ ] **Step 1: 创建 `scripts/scene_prompts.py`**

每个场景一段正向提示词，规则：anima 规则小写标签 + `masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres` 前缀 + **无人物** + 第一视角 + 场景特有标签。负向统一：

```python
# -*- coding: utf-8 -*-
NEGATIVE = (
    "worst quality, low quality, score_1, score_2, score_3, artist name, jpeg artifacts, "
    "ugly, deformed, blurry, text, japanese text, watermark, signature, logo, "
    "photorealistic, clutter, messy, dirty, humans, 1girl, 1boy, people, characters, figures"
)

PREFIX = "masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres, "

SCENE_PROMPTS = {
    "home_living": "first person view, cozy apartment living room, warm lighting, sofa, coffee table, card game deck on table, shelves, curtains, evening light through window, quiet, domestic atmosphere, anime scenery, soft brush texture, pastel tones, no humans",
    "home_bed": "first person view, cozy bedroom, bed with soft blanket, wardrobe, bedside lamp, warm bedside lighting, night, quiet, peaceful, anime scenery, soft brush texture, pastel tones, no humans",
    "home_door": "first person view, apartment front door, small path, small river visible in distance, trees, evening, calm, suburban residential area, anime scenery, soft brush texture, pastel tones, no humans",
    "company_cubicle": "first person view, open office, rows of cubicles, computer monitors, office chairs, fluorescent ceiling lights, large windows, daylight, quiet working atmosphere, wide angle, depth of field, anime scenery, soft brush texture, pastel tones, no humans",
    "company_office": "first person view, executive office, large desk, floor-to-ceiling windows overlooking city, cool color tone, blinds, chair, daylight, imposing atmosphere, anime scenery, soft brush texture, no humans",
    "company_door": "first person view, office building entrance, glass doors, access gate, lobby, commuters outside, daylight, wide angle, anime scenery, soft brush texture, pastel tones, no humans",
    "food_bunshop": "first person view, small bun shop interior, steaming bamboo steamers, counter, wooden tables, warm morning light, cozy, delicious atmosphere, anime scenery, soft brush texture, pastel tones, no humans",
    "food_st": "first person view, bustling food street, stalls, hanging lanterns, crowd silhouettes in distance, evening, warm neon glow, lively, anime scenery, soft brush texture, no humans",
    "market_hall": "first person view, supermarket interior, long shelves of goods, bright ceiling lights, shopping carts, wide aisle, daylight fluorescent, clean, anime scenery, soft brush texture, no humans",
    "market_door": "first person view, supermarket entrance, automatic glass doors, shopping carts, sidewalk, evening light, suburban commercial area, anime scenery, soft brush texture, pastel tones, no humans",
    "cardshop_inside": "first person view, card game shop interior, glass display cabinets with card packs, dueling table in center, shelves, warm ambient light, quiet, anime scenery, soft brush texture, no humans",
    "cardshop_door": "first person view, card shop storefront, glowing sign, glass window with card posters, night street, anime scenery, soft brush texture, pastel tones, no humans",
    "mall_st": "first person view, busy shopping street, neon signs, storefronts, crosswalk, evening, city lights, wide angle, lively commercial district, anime scenery, soft brush texture, no humans",
    "mall_dessert": "first person view, dessert cafe interior, glass cake display case, pink pastel interior, cozy seats, soft warm lighting, sweet atmosphere, anime scenery, soft brush texture, pastel tones, no humans",
    "suburb_st": "first person view, quiet suburban street, low houses, trees, small road, street lamps, dusk, calm, wide angle, anime scenery, soft brush texture, pastel tones, no humans",
    "suburb_station": "first person view, train station platform, train arriving, platform roof, ticket machine, benches, daylight, wide angle, urban transit hub, anime scenery, soft brush texture, no humans",
}
```

- [ ] **Step 2: 创建 `scripts/gen_scenes.py`**

```python
# -*- coding: utf-8 -*-
"""批量生成 16 张场景图（Anima Base 配方），逐张提交 ComfyUI，落盘 assets/scenes/ + 桌面审查目录"""
import json, time, urllib.request, os, shutil, sys
from scene_prompts import SCENE_PROMPTS, NEGATIVE, PREFIX

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
ASSET_DIR = r"C:\Users\Administrator\each-dawm-\assets\scenes"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
os.makedirs(ASSET_DIR, exist_ok=True)
os.makedirs(REVIEW_DIR, exist_ok=True)

def post(path, payload):
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(HOST + path, timeout=60) as r:
        return json.loads(r.read())

def workflow(scene_id, seed):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": PREFIX + SCENE_PROMPTS[scene_id], "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1216, "height": 832, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
              "latent_image": ["8", 0], "seed": seed, "steps": 20, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "11": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["9", 0], "vae": ["10", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["11", 0], "filename_prefix": f"scene_{scene_id}"}},
    }

def main(start_from=None):
    ids = list(SCENE_PROMPTS.keys())
    if start_from:
        ids = ids[ids.index(start_from):]
    for i, sid in enumerate(ids):
        print(f"[{i+1}/{len(ids)}] 生成 {sid} ...", flush=True)
        resp = post("/prompt", {"prompt": workflow(sid, 20260816 + i)})
        pid = resp["prompt_id"]
        deadline = time.time() + 600
        while time.time() < deadline:
            time.sleep(5)
            hist = get(f"/history/{pid}")
            if pid in hist:
                h = hist[pid]
                if h.get("status", {}).get("status_str") == "error":
                    print(f"  {sid} 执行错误，跳过", flush=True)
                    break
                for out in h.get("outputs", {}).values():
                    for img in out.get("images", []):
                        src = os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
                        dst = os.path.join(ASSET_DIR, f"{sid}.png")
                        shutil.copy(src, dst)
                        shutil.copy(src, os.path.join(REVIEW_DIR, f"场景_{sid}.png"))
                        print(f"  {sid} 完成 -> {dst}", flush=True)
                        break
                    else:
                        continue
                    break
                break
    print("全部完成", flush=True)

if __name__ == "__main__":
    main(start_from=sys.argv[1] if len(sys.argv) > 1 else None)
```

- [ ] **Step 3: 运行批量生成（约 30~60 分钟，可后台）**

Run: `cd C:/Users/Administrator/each-dawm- && python -X utf8 scripts/gen_scenes.py`
- 支持断点续跑：`python -X utf8 scripts/gen_scenes.py <scene_id>`
- 验证：`ls assets/scenes/` 应出现 16 个 png；桌面 `场景审查/` 同步 16 张

- [ ] **Step 4: 人工抽检**

桌面 `场景审查/` 逐张查看：构图（第一视角/无人物/氛围对味）、画风统一、无崩坏（文字/手/透视）。不合格的记下 scene_id，改 `scene_prompts.py` 对应条目后单张重跑（`python scripts/gen_scenes.py <scene_id>` 仅重跑其后所有场景——单张重跑可临时把 SCENE_PROMPTS 换成单条目，或直接改后从该 id 起跑）。

- [ ] **Step 5: 提交**

```bash
git add scripts/gen_scenes.py scripts/scene_prompts.py
git commit -m "feat: 场景图批量生成管线（16 张 + 桌面审查）"
```

（生成的 PNG 是否入库由用户在抽检后决定；默认 `git add assets/scenes/` 一并提交。）

---

### Task 11: 素材管线 · 全身立绘 + 表情差分（6 + 48 张）

**Files:**
- Create: `scripts/gen_fullbody.py`
- Create: `scripts/gen_expressions.py`

**Interfaces:**
- Consumes: Anima Base 配方 + ControlNet（`illustriousXLSoftedge_v10` + HEDPreprocessor）+ rembg 背景移除
- Produces: `assets/characters/<id>/fullbody.png`（透明）+ `<emotion>.png` × 48 + 桌面审查副本

- [ ] **Step 1: 安装 rembg（背景移除）**

Run: `pip install rembg[cpu]`（系统 Python 3.11；若网络受限，降级方案：PIL 白底阈值移除，见脚本内 FALLBACK 函数）

- [ ] **Step 2: 创建 `scripts/gen_fullbody.py`**

六角色外观描述（柳月为已确认的工作流示例版；**其余 5 人描述为按世界观整理的草案，跑之前先列给用户确认外观**）：

```python
# -*- coding: utf-8 -*-
"""生成 6 角色全身立绘（白底）→ rembg 抠透明 → assets/characters/<id>/fullbody.png + 桌面审查"""
import json, time, urllib.request, os, shutil, sys
from rembg import remove
from PIL import Image

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
CHAR_DIR = r"C:\Users\Administrator\each-dawm-\assets\characters"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(REVIEW_DIR, exist_ok=True)

NEGATIVE = ("worst quality, low quality, score_1, score_2, score_3, artist name, jpeg artifacts, "
            "ugly, deformed, blurry, bad anatomy, bad hands, extra fingers, text, watermark, signature, logo")

PREFIX = "masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres, "

CHARACTER_PROMPTS = {
    "baiyue": "1girl, solo, standing, full body, front view, white hair, long hair, cold expression, white and blue shrine maiden outfit, delicate face, simple white background, plain background, character illustration, soft brush texture",
    "linyi": "1girl, solo, standing, full body, front view, white hair, long hair, blue eyes, white and purple dress, black pantyhose, mature, cold elegant expression, simple white background, plain background, character illustration, soft brush texture",
    "liuyue": "1girl, solo, standing, full body, front view, long pink hair, ahoge, black hair accessory bow, pink eyes, delicate face, soft fair skin, white long-sleeve shirt, big black bow tie, black suspender skirt, lace decorations, black over-the-knee socks, lace on over-the-knee socks, shy expression, simple white background, plain background, character illustration, soft brush texture",
    "suyun": "1girl, solo, standing, full body, front view, brown hair, twin braids, gentle smile, casual supermarket uniform apron, simple white background, plain background, character illustration, soft brush texture",
    "siren": "1girl, solo, standing, full body, front view, aqua blue long hair, mermaid tail, seashell hair accessory, dreamy smile, simple white background, plain background, character illustration, soft brush texture",
    "ecclesia": "1girl, solo, standing, full body, front view, very long blonde hair, twin hair buns, blue ribbons, flower hairpin, metal horns, silver eyes, white dress with gold trim, golden stigmata marks, pure innocent smile, simple white background, plain background, character illustration, soft brush texture",
}
```

生成工作流同 Task 10，`EmptySD3LatentImage` 改为 `width: 768, height: 1344`，`filename_prefix: f"fullbody_{char_id}"`；生成后：

```python
def make_transparent(src_png, dst_png):
    im = Image.open(src_png).convert('RGBA')
    out = remove(im)
    out.save(dst_png)
```

落盘 `assets/characters/<id>/fullbody.png` + `场景审查/全身_<id>.png`（审查副本用白底合成版便于查看）。

- [ ] **Step 3: 运行并人工定稿**

Run: `python -X utf8 scripts/gen_fullbody.py`
- 每人一张 → 桌面审查 → 用户挑选/要求重跑（改提示词后单角色重跑：脚本加 `sys.argv[1]` 单角色参数）

- [ ] **Step 4: 创建 `scripts/gen_expressions.py`**

以定稿 fullbody 为基础图，HED 线稿 + softedge ControlNet 锁构图，8 表情标签 + 同种子出变体（复刻魔改an 的 img2img 链路）：

```python
# -*- coding: utf-8 -*-
"""表情差分：定稿全身图 → HED + softedge ControlNet + 表情标签 → 8 变体/角色"""
import json, time, urllib.request, os, shutil, sys

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
CHAR_DIR = r"C:\Users\Administrator\each-dawm-\assets\characters"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
EMOTION_TAGS = {
    "neutral":   "neutral expression",
    "smile":     "gentle smile",
    "happy":     "happy smile, closed eyes, joyful expression",
    "blushing":  "embarrassed, blush, looking away shyly",
    "angry":     "angry expression, pouting",
    "sad":       "sad expression, tears in eyes",
    "surprised": "surprised expression, wide eyes",
    "desire":    "blush, half-closed eyes, lustful expression, heavy breathing",
}
NEGATIVE = ("worst quality, low quality, score_1, score_2, score_3, artist name, jpeg artifacts, "
            "ugly, deformed, blurry, bad anatomy, bad hands, extra fingers, text, watermark, signature, logo")
PREFIX = "masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres, "

def workflow(char_id, emotion, seed):
    base = os.path.join(CHAR_DIR, char_id, "fullbody.png")
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": PREFIX + EMOTION_TAGS[emotion] + ", same character, same clothes, same hairstyle", "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "LoadImage", "inputs": {"image": base}},
        "9": {"class_type": "ImageScaleToTotalPixels", "inputs": {"image": ["8", 0], "upscale_method": "nearest-exact", "megapixels": 1.0}},
        "10": {"class_type": "HEDPreprocessor", "inputs": {"image": ["9", 0], "safe": "enable", "resolution": 512}},
        "11": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "illustriousXLSoftedge_v10.safetensors"}},
        "12": {"class_type": "ControlNetApplyAdvanced", "inputs": {"positive": ["6", 0], "negative": ["7", 0], "control_net": ["11", 0], "image": ["10", 0], "strength": 1.0, "start_percent": 0.0, "end_percent": 1.0}},
        "13": {"class_type": "GetImageSize", "inputs": {"image": ["8", 0]}},
        "14": {"class_type": "EmptySD3LatentImage", "inputs": {"width": ["13", 0], "height": ["13", 1], "batch_size": 1}},
        "15": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["12", 0], "negative": ["12", 1],
               "latent_image": ["14", 0], "seed": seed, "steps": 45, "cfg": 1.0,
               "sampler_name": "euler_ancestral", "scheduler": "simple", "denoise": 0.6}},
        "16": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "17": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["15", 0], "vae": ["16", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "18": {"class_type": "SaveImage", "inputs": {"images": ["17", 0], "filename_prefix": f"expr_{char_id}_{emotion}"}},
    }
```

主循环：6 角色 × 8 表情，每角色固定种子（`seed = 1000000 + hash(char_id) % 900000`）；输出落盘 `assets/characters/<id>/<emotion>.png` + `场景审查/表情_<id>_<emotion>.png`；每角色生成完提示人工抽检再继续（`input()` 确认或 `sys.argv` 指定单角色）。

- [ ] **Step 5: 运行与抽检（48 张约 2~3 小时，分 6 批）**

Run: `python -X utf8 scripts/gen_expressions.py <char_id>`（逐角色执行）
- 每角色 8 张 → 桌面审查：脸崩/构图漂移的重跑单张（改 EMOTION_TAGS 或换种子）
- 表情图是白底还是透明：近景特写用白底图即可（特写背景是压暗模糊层），无需抠图；若想要透明统一用 gen_fullbody 的 remove 处理

- [ ] **Step 6: 素材齐整校验**

Run: `node scripts/validate-scenes.mjs && node scripts/validate-emotion.mjs` + `ls assets/characters/*/ | wc -l` 应为 6 角色 × 9 文件（fullbody + 8 表情）
- 浏览器全链路再看一遍：场景立绘真实显示、特写表情随对话切换、无占位剪影

- [ ] **Step 7: 提交**

```bash
git add scripts/gen_fullbody.py scripts/gen_expressions.py assets/scenes/ assets/characters/
git commit -m "feat: 全身立绘 + 表情差分生成管线（6+48 张）"
```

---

### Task 12: 整体验收与收尾

**Files:** 无新建（按需修复）

- [ ] **Step 1: 验收清单跑查**

逐项确认（浏览器 F12 全程无红）：
1. 新游戏 → 场景视图（home_living 背景图 + 字幕 + 白月/塞壬立绘带阴影）
2. 出口导航 16 场景全连通：从家客厅依次走到站台 → 公司 → 工位 → 小吃街 → 牌店 → 商业街 → 甜品店 → 回城郊 → 回家；每步时间推进、字幕切换
3. 物件热点点击出描述
4. 点柳月 → 特写：立绘显示、输入对话、AI 回复打字机、表情随 emotion 标签切换
5. 「提出决斗」按钮（Task 5 建按钮、Task 6 接通，本任务回归确认）
6. 对战完整链路：MDPro3 拉起 → 胜负回调 → AI 续写 → 特写继续
7. 存档 → 刷新页面 → 继续冒险：场景位置/伙伴状态/时间恢复（narrativeHistory 不恢复属预期）
8. 清存档 → 新游戏流程正常
9. AI 离线：对话出兜底叙事；ComfyUI/素材缺失：剪影占位不报错
10. 移动端视口（Chrome 设备模拟 390×844）：热点坐标跟随、特写布局不溢出

- [ ] **Step 2: 修复验收发现的问题**（按 systematic-debugging 流程，每修一处提交一次）

- [ ] **Step 3: 更新记忆**

把最终状态写入 `C:\Users\Administrator\.claude\projects\C--Users-Administrator\memory\each-dawm-refactor.md`（状态行改为「场景交互式重构完成」+ 待办清空/更新）。

- [ ] **Step 4: 最终提交与推送**

```bash
git add -A
git commit -m "feat: 场景交互式重构完成（16 场景 + 立绘合成 + 近景特写 + 表情差分）"
git push
```

---

## 依赖顺序

```
1 scenes-data ─┬─→ 3 scene 骨架 ─→ 4 立绘层 ─→ 5 closeup ─→ 6 对话引擎 ─→ 7 表情系统 ─→ 8 bridge 协议 ─→ 9 视图整合 ─→ 12 验收
2 state/storage┘                                                    ↑
10 场景素材（可与 3~9 并行）──────────────────────────────────────────┘
11 立绘/表情素材（依赖 10 的管线模式 + 定稿图）
```

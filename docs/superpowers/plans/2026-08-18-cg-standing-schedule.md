# 静态 CG/立绘特写序列 + 角色行程表 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击场景内角色头像 → 播放 CG 3 秒（如有）→ 抠图立绘居中 → 当前场景背景淡入 → 对话常驻；9 角色按手写行程表（4 时段）在场景间走动；删 3 公司场景、新增 3 场景（双子的房间/教堂/森林）。

**Architecture:** 新增 `data/schedules.json`（行程表+行动文案+CG 路径+基准点）与 `js/schedules.js`（查询模块）；场景在场由行程表按游戏时间派生（scene.js 重算渲染）；特写层加时序控制器（CG→立绘→背景）；对话上下文由 ai.js 注入在场角色行动文案，bridge 的 compact_state 透传。

**Tech Stack:** 原生 ES Modules JavaScript、CSS、Node v24（校验脚本）、Playwright MCP（浏览器回归）、Python（bridge）

## Global Constraints

- 项目根目录：`C:\Users\Administrator\each-dawm-`（所有相对路径以此为根）
- 无 package.json：自动化检查 = node 断言脚本（`scripts/*.mjs`）；UI 行为 = 浏览器 Playwright 回归清单
- 校验脚本**不做文件存在性检查**（用户图未到位前不阻塞）
- 时段划分：上午 6-12 / 下午 12-18 / 晚上 18-24 / 深夜 0-6；双子 CG 切换点 = 18:00（<18 白天版，≥18 夜晚版）
- 9 人阵容（id 固定）：`siren`塞壬 / `lingyi`零依 / `lushi`露世 / `kisikil`姬丝吉尔 / `lilla`璃拉 / `ecclesia`艾克利西亚 / `tiantong`天童 / `li`理 / `caihong`彩虹
- 素材约定：CG → `assets/characters/<id>/cg/start.png`（双子共用 `assets/characters/twins/cg/start-day.png` 与 `start-night.png`）；立绘 → `assets/characters/<id>/standing.png`（832×1216 竖图）；新场景 bg → `assets/scenes/twins_room.png`、`church.jpg`、`forest.jpg`
- 桌面素材源（PowerShell `$env:USERPROFILE\Desktop\`）：`初始CG`（8 张）、`抠图立绘`（9 张）、`场景审查`（双子房间背景.png/教堂.jpg/森林.jpg）
- **PS 5.1 中文路径勿用逗号数组形式——`-LiteralPath` 逐项执行**
- 注释/命名沿用现有中文注释风格与 `_` 前缀私有函数约定；提交信息带 `Co-Authored-By: Claude <noreply@anthropic.com>` trailer
- 工作树用户无关文件（`server/start.bat`、`assets/` 未跟踪文件、根目录 `progress.md`、`.superpowers/`）**绝不提交**
- master 直推是用户同意的常规流程：实现者只 commit、不 push
- 8080 端口常有用户服务占用；本地测试服务用 `python -m http.server 8091`（Playwright MCP 可用，Chrome for Testing 已装）
- 浏览器回归预期：`assets/characters/<id>/neutral.png` 头像 404 为预期（用户后续出图）；`standing.png`/CG/场景 bg 404 为缺陷

---

### Task 1: 素材入库与删除

**Files:**
- Copy: 桌面 8 CG → `assets/characters/<id>/cg/`（映射见 Step 1）
- Copy: 桌面 9 立绘 → `assets/characters/<id>/standing.png`（映射见 Step 2）
- Copy: 桌面 3 新场景 bg → `assets/scenes/`（映射见 Step 3）
- Delete: `assets/scenes/company_cubicle.png`、`company_office.png`、`company_door.png`

**Interfaces:**
- Consumes: 桌面 `初始CG`、`抠图立绘`、`场景审查` 文件夹（用户已出图）
- Produces: `assets/characters/<id>/cg/start.png` 等（Task 5 特写序列图源）；`assets/characters/<id>/standing.png`（Task 4/5 立绘图源）；`assets/scenes/twins_room.png`、`church.jpg`、`forest.jpg`（Task 2 场景 bg）

- [ ] **Step 1: CG 入库（PowerShell，-LiteralPath 逐项）**

```powershell
$src = "$env:USERPROFILE\Desktop\初始CG"
$root = "C:\Users\Administrator\each-dawm-\assets\characters"
New-Item -ItemType Directory -Force "$root\siren\cg","$root\lingyi\cg","$root\lushi\cg","$root\kisikil\cg","$root\lilla\cg","$root\tiantong\cg","$root\li\cg","$root\caihong\cg","$root\twins\cg" | Out-Null
Copy-Item -LiteralPath "$src\塞壬躺在床上.png"      -Destination "$root\siren\cg\start.png"
Copy-Item -LiteralPath "$src\卧室中的零依.png"      -Destination "$root\lingyi\cg\start.png"
Copy-Item -LiteralPath "$src\卧室中的露世.png"      -Destination "$root\lushi\cg\start.png"
Copy-Item -LiteralPath "$src\天童躺在床上.png"      -Destination "$root\tiantong\cg\start.png"
Copy-Item -LiteralPath "$src\教堂中的理.png"        -Destination "$root\li\cg\start.png"
Copy-Item -LiteralPath "$src\彩虹正在绘画.png"      -Destination "$root\caihong\cg\start.png"
Copy-Item -LiteralPath "$src\白天直播的双子.png"    -Destination "$root\twins\cg\start-day.png"
Copy-Item -LiteralPath "$src\双子夜晚怪盗行动.png"  -Destination "$root\twins\cg\start-night.png"
```

Expected: `assets/characters/{siren,lingyi,lushi,tiantong,li,caihong}/cg/start.png` 各 1 张（1216×832）；`assets/characters/twins/cg/` 下 `start-day.png` + `start-night.png`；`kisikil/cg` 与 `lilla/cg` 目录为空（双子共用 twins 目录，勿复制 4 份）。

- [ ] **Step 2: 立绘入库（-LiteralPath 逐项）**

```powershell
$src2 = "$env:USERPROFILE\Desktop\抠图立绘"
$root2 = "C:\Users\Administrator\each-dawm-\assets\characters"
Copy-Item -LiteralPath "$src2\塞壬_.png"      -Destination "$root2\siren\standing.png"
Copy-Item -LiteralPath "$src2\零依.png"       -Destination "$root2\lingyi\standing.png"
Copy-Item -LiteralPath "$src2\露世.png"       -Destination "$root2\lushi\standing.png"
Copy-Item -LiteralPath "$src2\吉丝吉尔_.png"  -Destination "$root2\kisikil\standing.png"
Copy-Item -LiteralPath "$src2\璃拉.png"       -Destination "$root2\lilla\standing.png"
Copy-Item -LiteralPath "$src2\艾克利西亚.png" -Destination "$root2\ecclesia\standing.png"
Copy-Item -LiteralPath "$src2\天童.png"       -Destination "$root2\tiantong\standing.png"
Copy-Item -LiteralPath "$src2\理.png"         -Destination "$root2\li\standing.png"
Copy-Item -LiteralPath "$src2\彩虹.png"       -Destination "$root2\caihong\standing.png"
```

Expected: 9 个 `standing.png`（832×1216）。

- [ ] **Step 3: 新场景背景入库 + 旧公司背景删除**

```powershell
$src3 = "$env:USERPROFILE\Desktop\场景审查"
$dst3 = "C:\Users\Administrator\each-dawm-\assets\scenes"
Copy-Item -LiteralPath "$src3\双子房间背景.png" -Destination "$dst3\twins_room.png"
Copy-Item -LiteralPath "$src3\教堂.jpg"         -Destination "$dst3\church.jpg"
Copy-Item -LiteralPath "$src3\森林.jpg"         -Destination "$dst3\forest.jpg"
Remove-Item -LiteralPath "$dst3\company_cubicle.png","$dst3\company_office.png","$dst3\company_door.png" -Force
```

Expected: `assets/scenes/` 下新增 `twins_room.png`、`church.jpg`、`forest.jpg`；3 个 company bg 删除（git 历史兜底）。

- [ ] **Step 4: 核对清单**

Run（PowerShell）：
```powershell
Get-ChildItem "C:\Users\Administrator\each-dawm-\assets\characters" -Directory | Where-Object { $_.Name -in @('siren','lingyi','lushi','kisikil','lilla','ecclesia','tiantong','li','caihong','twins') } | ForEach-Object { Get-ChildItem $_.FullName -Recurse -File | ForEach-Object { $_.FullName.Replace('C:\Users\Administrator\each-dawm-\','') } } | Sort-Object
```
Expected: 6 个 `<id>\cg\start.png` + 9 个 `<id>\standing.png` + `twins\cg\start-day.png` + `twins\cg\start-night.png` = 17 个文件（外加各目录既有 raw_fullbody.png 等用户文件，勿动勿删）。

- [ ] **Step 5: 提交**

```bash
git add assets/characters/siren/cg assets/characters/lingyi/cg assets/characters/lushi/cg assets/characters/kisikil/cg assets/characters/lilla/cg assets/characters/tiantong/cg assets/characters/li/cg assets/characters/caihong/cg assets/characters/twins/cg
git add assets/characters/siren/standing.png assets/characters/lingyi/standing.png assets/characters/lushi/standing.png assets/characters/kisikil/standing.png assets/characters/lilla/standing.png assets/characters/ecclesia/standing.png assets/characters/tiantong/standing.png assets/characters/li/standing.png assets/characters/caihong/standing.png
git add assets/scenes/twins_room.png assets/scenes/church.jpg assets/scenes/forest.jpg
git add -u assets/scenes
git commit -m "feat: 9 人立绘+8 张初始 CG 入库（双子共用 day/night），3 张新场景背景入库，删除公司场景背景"
```

**注意**：只提交上述路径；`assets/` 下未跟踪的用户文件（如 `siren/raw_fullbody.png`、`backgrounds_backup_realistic/`）绝不 git add。提交信息必须带 `Co-Authored-By: Claude <noreply@anthropic.com>` trailer。

---

### Task 2: 场景调整 — 删 3 公司 + 增 3 新场景 + 出口重连

**Files:**
- Modify: `js/scenes-data.js`（删 3 公司场景块；新增 twins_room/church/forest；3 处出口改动）
- Modify: `scripts/validate-scenes.mjs`（场景集合断言改为新 16 场景）

**Interfaces:**
- Consumes: Task 1 的 `assets/scenes/twins_room.png`、`church.jpg`、`forest.jpg`
- Produces: 新 16 场景集合（Task 3 行程表引用场景 id；Task 4 在场渲染依据）；`validate-scenes.mjs` 新断言（Task 7 复用）

- [ ] **Step 1: 先改校验（红）**

`scripts/validate-scenes.mjs` 第 4-6 行之后插入场景集合断言：

```js
// 场景集合：必须恰为新 16 场景（公司 3 场景已删除，新增 twins_room/church/forest）
const WANT_SCENES = ['home_living', 'home_bed', 'home_door', 'twins_room',
  'food_bunshop', 'food_st', 'market_hall', 'market_door',
  'cardshop_inside', 'cardshop_door', 'mall_st', 'mall_dessert',
  'church', 'forest', 'suburb_st', 'suburb_station'];
for (const sid of WANT_SCENES) {
  if (!SCENES[sid]) errors.push(`缺少场景 ${sid}`);
}
if (ids.length !== WANT_SCENES.length) {
  const extra = ids.filter(x => !WANT_SCENES.includes(x));
  errors.push(`场景数应为 ${WANT_SCENES.length}，实际 ${ids.length}${extra.length ? `（多余: ${extra.join(', ')}）` : ''}`);
}
```

同时将文件末尾 PASS 文案 `'PASS: 16 场景、出口引用…'` 改为 `'PASS: 16 场景（新集合）、出口引用、角色/物件坐标、表情路径全部有效、16 节点全连通'`。

- [ ] **Step 2: 运行校验确认失败**

Run: `node scripts/validate-scenes.mjs`
Expected: FAIL——`缺少场景 twins_room` 等 + `场景数应为 16，实际 16（多余: company_cubicle, company_office, company_door）`

- [ ] **Step 3: 改 `js/scenes-data.js`**

1. 删除 `company_cubicle`、`company_office`、`company_door` 三个场景整块（约 69-108 行，从 `// ===== 公司（3）=====` 到 `company_door` 块结束）。
2. 在 `home_door` 块之后插入（文件头部注释「16 节点」改为「16 节点（13 旧 + 3 新）」）：

```js
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
```

3. `home_door` 的 exits 数组追加一行：

```js
      { dir: 'top',   to: 'twins_room',  label: '双子房间' },
```

4. `mall_st` 的 exits 中 `{ dir: 'right', to: 'company_door', label: '公司' },` 整行替换为：

```js
      { dir: 'right', to: 'church',       label: '教堂' },
```

5. 在 `mall_dessert` 块之后插入：

```js
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
```

6. `suburb_station` 的 exits 中 `{ dir: 'top',    to: 'company_door', label: '公司方向' },` 整行替换为：

```js
      { dir: 'top',    to: 'forest',       label: '森林' },
```

7. 在 `suburb_station` 块之后插入：

```js
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
```

- [ ] **Step 4: 运行校验确认通过**

Run: `node scripts/validate-scenes.mjs`
Expected: `PASS: 16 场景（新集合）、出口引用、角色/物件坐标、表情路径全部有效、16 节点全连通`

- [ ] **Step 5: 提交**

```bash
git add js/scenes-data.js scripts/validate-scenes.mjs
git commit -m "feat: 场景调整——删除 3 公司场景，新增双子的房间/教堂/森林（16 节点全连通）"
```

---

### Task 3: 行程表数据 + 查询模块 + 校验

**Files:**
- Create: `data/schedules.json`（行程表 + 行动文案 + CG 路径 + 基准点）
- Create: `js/schedules.js`（查询模块）
- Create: `scripts/validate-schedules.mjs`（校验脚本）

**Interfaces:**
- Consumes: Task 2 的新 16 场景 id；Task 1 的 CG/立绘路径约定
- Produces: `getPeriod(hour)` → `'morning'|'afternoon'|'evening'|'night'`；`getPresent(sceneId, gameTime)` → `[{ charId, activity, spot }]`（spot 为基准点，调用方加随机偏移）；`countPresent(sceneId, gameTime)` → number；`getActivity(charId, gameTime)` → `'<名>·<行动文案>'` 或 null；`getCgPath(charId, gameTime)` → 路径字符串或 null；`SCHEDULE_DATA` 原始数据导出。Task 4/5/6 依赖这些签名，不得改名。

- [ ] **Step 1: 先写校验脚本（红）**

创建 `scripts/validate-schedules.mjs`：

```js
// 校验行程表数据完整性：node scripts/validate-schedules.mjs
import fs from 'node:fs';
import { SCENES } from '../js/scenes-data.js';
import { SCHEDULE_DATA, getPeriod, getPresent, getActivity, getCgPath } from '../js/schedules.js';

const errors = [];
const PERIODS = ['morning', 'afternoon', 'evening', 'night'];
const WANT_CHARS = ['siren', 'lingyi', 'lushi', 'kisikil', 'lilla', 'ecclesia', 'tiantong', 'li', 'caihong'];

const sched = SCHEDULE_DATA.schedule || {};
if (Object.keys(sched).length !== WANT_CHARS.length) errors.push(`行程表角色数应为 ${WANT_CHARS.length}，实际 ${Object.keys(sched).length}`);
for (const cid of WANT_CHARS) {
  if (!sched[cid]) { errors.push(`行程表缺少角色 ${cid}`); continue; }
  for (const p of PERIODS) {
    if (!(p in sched[cid])) { errors.push(`${cid}: 缺时段 ${p}`); continue; }
    const e = sched[cid][p];
    if (e === null) continue; // 不在场合法
    if (!SCENES[e.scene]) { errors.push(`${cid}/${p}: 场景 ${e.scene} 不存在`); continue; }
    if (!e.activity || !e.activity.trim()) errors.push(`${cid}/${p}: 行动文案为空`);
    for (const k of ['x', 'y']) {
      if (typeof e.spot?.[k] !== 'number' || e.spot[k] < 0 || e.spot[k] > 1) errors.push(`${cid}/${p}: spot.${k} 非法`);
    }
  }
}
// CG 表：key 合法，值 string 或 {day,night}，路径格式 assets/characters/
const cg = SCHEDULE_DATA.cg || {};
for (const [cid, v] of Object.entries(cg)) {
  if (!WANT_CHARS.includes(cid)) errors.push(`cg 表有未知角色 ${cid}`);
  const okStr = s => typeof s === 'string' && s.startsWith('assets/characters/');
  const okObj = o => o && typeof o === 'object' && okStr(o.day) && okStr(o.night);
  if (!okStr(v) && !okObj(v)) errors.push(`${cid}: cg 路径非法`);
}
if (cg.ecclesia) errors.push('ecclesia 不应有 cg 条目（用户未补图）');
// getPeriod：全天覆盖 + 边界正确
if (getPeriod(0) !== 'night' || getPeriod(5) !== 'night') errors.push('getPeriod 深夜边界错误');
if (getPeriod(6) !== 'morning' || getPeriod(11) !== 'morning') errors.push('getPeriod 上午边界错误');
if (getPeriod(12) !== 'afternoon' || getPeriod(17) !== 'afternoon') errors.push('getPeriod 下午边界错误');
if (getPeriod(18) !== 'evening' || getPeriod(23) !== 'evening') errors.push('getPeriod 晚上边界错误');
// 查询函数冒烟：上午客厅 4 人（塞壬/零依/天童/彩虹）；深夜双子不在任何场景
const tMorning = { day: 1, hour: 9, minute: 0 };
const tNight = { day: 1, hour: 1, minute: 0 };
const livingIds = getPresent('home_living', tMorning).map(x => x.charId);
for (const cid of ['siren', 'lingyi', 'tiantong', 'caihong']) {
  if (!livingIds.includes(cid)) errors.push(`上午客厅应含 ${cid}`);
}
const allScenes = Object.values(SCENES);
for (const cid of ['kisikil', 'lilla']) {
  for (const s of allScenes) {
    if (getPresent(s.id, tNight).some(x => x.charId === cid)) errors.push(`深夜 ${cid} 不应在 ${s.id}`);
  }
}
if (getCgPath('siren', tMorning) !== 'assets/characters/siren/cg/start.png') errors.push('塞壬 CG 路径错误');
if (getCgPath('kisikil', tMorning) !== 'assets/characters/twins/cg/start-day.png') errors.push('双子白天 CG 路径错误');
if (getCgPath('kisikil', tNight) !== 'assets/characters/twins/cg/start-night.png') errors.push('双子夜晚 CG 路径错误');
if (getCgPath('ecclesia', tMorning) !== null) errors.push('艾克利西亚应无 CG');

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('PASS: 行程表 9 角色 × 4 时段完整、场景/坐标/文案合规、CG 路径与时段切换正确');
```

- [ ] **Step 2: 运行确认失败**

Run: `node scripts/validate-schedules.mjs`
Expected: FAIL（`schedules.js` 不存在，模块加载报错）

- [ ] **Step 3: 创建 `data/schedules.json`**

完整内容（逐字）：

```json
{
  "periods": [
    { "id": "morning",   "label": "上午", "start": 6,  "end": 12 },
    { "id": "afternoon", "label": "下午", "start": 12, "end": 18 },
    { "id": "evening",   "label": "晚上", "start": 18, "end": 24 },
    { "id": "night",     "label": "深夜", "start": 0,  "end": 6 }
  ],
  "schedule": {
    "siren": {
      "morning":   { "scene": "home_living", "activity": "懒洋洋泡在鱼缸里打盹", "spot": { "x": 0.28, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "home_living", "activity": "泡在水里吐着泡泡",     "spot": { "x": 0.30, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "趴在鱼缸边盯着你看",   "spot": { "x": 0.32, "y": 0.55, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "缩在被窝里睡着了",     "spot": { "x": 0.35, "y": 0.55, "scale": 0.85 } }
    },
    "lingyi": {
      "morning":   { "scene": "home_living", "activity": "元气满满地活跃着气氛", "spot": { "x": 0.62, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "mall_st",     "activity": "元气十足地逛着街",     "spot": { "x": 0.45, "y": 0.50, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "缠着你不放",           "spot": { "x": 0.60, "y": 0.55, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "四仰八叉地睡着了",     "spot": { "x": 0.55, "y": 0.55, "scale": 0.85 } }
    },
    "lushi": {
      "morning":   { "scene": "home_bed",    "activity": "安静地坐在床边看书",   "spot": { "x": 0.60, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "home_living", "activity": "坐在沙发角落看书",     "spot": { "x": 0.78, "y": 0.60, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "冷眼观察着众人",       "spot": { "x": 0.76, "y": 0.58, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "安静地睡着了",         "spot": { "x": 0.62, "y": 0.55, "scale": 0.85 } }
    },
    "kisikil": {
      "morning":   { "scene": "twins_room",  "activity": "对着镜头元气直播",     "spot": { "x": 0.40, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "twins_room",  "activity": "继续着下午的直播",     "spot": { "x": 0.42, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "跑来串门调戏你",       "spot": { "x": 0.85, "y": 0.55, "scale": 0.85 } },
      "night":     null
    },
    "lilla": {
      "morning":   { "scene": "twins_room",  "activity": "半梦半醒地陪着直播",   "spot": { "x": 0.58, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "twins_room",  "activity": "抱着鲨鱼玩偶打瞌睡",   "spot": { "x": 0.60, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "半梦半醒地靠在沙发上", "spot": { "x": 0.88, "y": 0.58, "scale": 0.85 } },
      "night":     null
    },
    "ecclesia": {
      "morning":   { "scene": "food_bunshop", "activity": "在包子铺里帮忙",      "spot": { "x": 0.45, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "food_st",      "activity": "在小吃街帮工",        "spot": { "x": 0.50, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living",  "activity": "眼巴巴地讨要投喂",    "spot": { "x": 0.50, "y": 0.55, "scale": 0.85 } },
      "night":     { "scene": "home_bed",     "activity": "抱着肚子睡着了",      "spot": { "x": 0.40, "y": 0.55, "scale": 0.85 } }
    },
    "tiantong": {
      "morning":   { "scene": "home_living", "activity": "怯怯地跟在你身后",     "spot": { "x": 0.40, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "home_bed",    "activity": "用袖子挡着脸躲在屋里", "spot": { "x": 0.45, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "硬着头皮当和事佬",     "spot": { "x": 0.42, "y": 0.55, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "蜷成一团睡着了",       "spot": { "x": 0.48, "y": 0.55, "scale": 0.85 } }
    },
    "li": {
      "morning":   { "scene": "church",     "activity": "在教堂里静思祈祷",     "spot": { "x": 0.50, "y": 0.55, "scale": 0.85 } },
      "afternoon": { "scene": "mall_st",    "activity": "好奇地探索着都市",     "spot": { "x": 0.55, "y": 0.50, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "温柔地分享今日见闻",  "spot": { "x": 0.68, "y": 0.55, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "安详地睡着了",        "spot": { "x": 0.58, "y": 0.55, "scale": 0.85 } }
    },
    "caihong": {
      "morning":   { "scene": "home_living", "activity": "包揽着家里的大小家务", "spot": { "x": 0.72, "y": 0.58, "scale": 0.85 } },
      "afternoon": { "scene": "forest",      "activity": "在森林里安静写生",     "spot": { "x": 0.50, "y": 0.55, "scale": 0.85 } },
      "evening":   { "scene": "home_living", "activity": "专心致志地画画",       "spot": { "x": 0.70, "y": 0.58, "scale": 0.85 } },
      "night":     { "scene": "home_bed",    "activity": "抱着速写本睡着了",     "spot": { "x": 0.52, "y": 0.55, "scale": 0.85 } }
    }
  },
  "cg": {
    "siren":    "assets/characters/siren/cg/start.png",
    "lingyi":   "assets/characters/lingyi/cg/start.png",
    "lushi":    "assets/characters/lushi/cg/start.png",
    "tiantong": "assets/characters/tiantong/cg/start.png",
    "li":       "assets/characters/li/cg/start.png",
    "caihong":  "assets/characters/caihong/cg/start.png",
    "kisikil":  { "day": "assets/characters/twins/cg/start-day.png",   "night": "assets/characters/twins/cg/start-night.png" },
    "lilla":    { "day": "assets/characters/twins/cg/start-day.png",   "night": "assets/characters/twins/cg/start-night.png" }
  }
}
```

- [ ] **Step 4: 创建 `js/schedules.js`**

完整内容（逐字）：

```js
/* ==========================================================================
   光之回响 (Echoes of Light) — 角色行程表查询模块
   数据源：data/schedules.json（手写行程表，静态数据，无 AI 开销）
   时段：morning 6-12 / afternoon 12-18 / evening 18-24 / night 0-6
   ========================================================================== */

import { CHARACTERS } from './scenes-data.js';

/** 行程表数据（data/schedules.json，构建期 fetch 后缓存） */
export var SCHEDULE_DATA = { periods: [], schedule: {}, cg: {} };

/** 时段 → 起始小时（按覆盖顺序判定用） */
var _periodStart = {};

/* ==========================================================================
   loadSchedules — 加载行程表（失败不阻塞，返回空）
   ========================================================================== */
export async function loadSchedules() {
  try {
    var resp = await fetch('data/schedules.json');
    if (resp.ok) {
      var data = await resp.json();
      SCHEDULE_DATA = data;
      _periodStart = {};
      (data.periods || []).forEach(function (p) { _periodStart[p.id] = p.start; });
    }
  } catch (e) {
    console.warn('[Schedules] schedules.json 加载失败，行程表为空');
  }
  return SCHEDULE_DATA;
}

/* ==========================================================================
   getPeriod — 小时 → 时段 id（night 跨 0 点，优先判定）
   ========================================================================== */
export function getPeriod(hour) {
  var h = ((hour % 24) + 24) % 24;
  if (h >= 18) return 'evening';
  if (h >= 12) return 'afternoon';
  if (h >= 6) return 'morning';
  return 'night';
}

/* ==========================================================================
   getPresent — 某场景当前时段在场角色列表
   ========================================================================== */
export function getPresent(sceneId, gameTime) {
  var period = getPeriod(gameTime && gameTime.hour != null ? gameTime.hour : 8);
  var result = [];
  var sched = SCHEDULE_DATA.schedule || {};
  Object.keys(sched).forEach(function (charId) {
    var entry = sched[charId] && sched[charId][period];
    if (entry && entry.scene === sceneId) {
      result.push({
        charId: charId,
        activity: entry.activity || '',
        spot: entry.spot || { x: 0.5, y: 0.55, scale: 0.85 }
      });
    }
  });
  return result;
}

/* ==========================================================================
   countPresent — 某场景当前时段在场人数（供「色色」分类判断）
   ========================================================================== */
export function countPresent(sceneId, gameTime) {
  return getPresent(sceneId, gameTime).length;
}

/* ==========================================================================
   getActivity — 角色当前时段行动文案（'塞壬 · 懒洋洋泡在鱼缸里打盹'）
   ========================================================================== */
export function getActivity(charId, gameTime) {
  var meta = CHARACTERS[charId];
  if (!meta) return null;
  var period = getPeriod(gameTime && gameTime.hour != null ? gameTime.hour : 8);
  var entry = SCHEDULE_DATA.schedule && SCHEDULE_DATA.schedule[charId]
    && SCHEDULE_DATA.schedule[charId][period];
  if (!entry) return meta.name + ' · 行踪不明';
  return meta.name + ' · ' + entry.activity;
}

/* ==========================================================================
   getCgPath — 角色 CG 路径（双子按 18:00 切换白天/夜晚版；无则 null）
   ========================================================================== */
export function getCgPath(charId, gameTime) {
  var cg = SCHEDULE_DATA.cg || {};
  var v = cg[charId];
  if (!v) return null;
  if (typeof v === 'string') return v;
  var hour = gameTime && gameTime.hour != null ? gameTime.hour : 8;
  return hour < 18 ? v.day : v.night;
}
```

- [ ] **Step 5: 运行校验确认通过**

Run: `node scripts/validate-schedules.mjs && node scripts/validate-scenes.mjs`
Expected: 两个都 PASS

- [ ] **Step 6: 提交**

```bash
git add data/schedules.json js/schedules.js scripts/validate-schedules.mjs
git commit -m "feat: 角色行程表数据与查询模块（9 人 × 4 时段，含双子 CG 白天/夜晚切换）+ 校验"
```

---

### Task 4: 在场派生渲染 + 行动建议系统接入行程表

**Files:**
- Modify: `js/scene.js`（`_renderAvatars` 改行程表派生 + 落位随机 + 头像降级 standing.png；时间跨段重算）
- Modify: `js/event.js`（删 LOCATION_HEROINES 静态表与 company 行动块/SCENE_FALLBACKS；行动建议改用 currentSceneId + 行程表在场判断；新增 twins_room 行动桶与 3 新场景兜底文案）
- Modify: `js/app.js`（`advanceTime` 末尾派发 `game-time-advanced` 事件）
- Modify: `js/state.js`（`sceneCharacters` 初始保持 `{}`，注释说明为派生态）

**Interfaces:**
- Consumes: Task 3 的 `getPresent/countPresent/getActivity`（签名已固定）；Task 2 的 16 场景
- Produces: 场景内头像按行程表渲染（Task 5 点击入口）；`game-time-advanced` 事件；行动建议系统按场景+时段出「色色」分类

- [ ] **Step 1: 改 `js/scene.js`**

1. 顶部 import 追加：

```js
import { getPresent, loadSchedules } from './schedules.js';
```

2. `_renderAvatars` 整体替换为：

```js
function _renderAvatars(scene) {
  const layer = document.getElementById('scene-character-layer');
  layer.innerHTML = '';
  const gameTime = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
  const present = getPresent(scene.id, gameTime);

  // 派生态写回：在场角色 present:true，不在场清除
  const sc = {};
  present.forEach(function (p) { sc[p.charId] = { present: true, emotion: 'neutral' }; });
  AppState.set('sceneCharacters', sc);

  present.forEach(function (p) {
    const meta = CHARACTERS[p.charId];
    if (!meta) return;
    // 基准点 ±3% 随机偏移
    const jx = p.spot.x + (Math.random() * 2 - 1) * 0.03;
    const jy = p.spot.y + (Math.random() * 2 - 1) * 0.03;
    const spot = { x: Math.min(1, Math.max(0, jx)), y: Math.min(1, Math.max(0, jy)), scale: p.spot.scale };
    const anchor = avatarAnchor(spot);
    const div = document.createElement('div');
    div.className = 'scene-avatar';
    div.style.left = `${anchor.x * 100}%`;
    div.style.top = `${anchor.y * 100}%`;
    div.style.setProperty('--avatar-size', `${15 * (spot.scale || 0.85)}vh`);
    const img = new Image();
    img.className = 'avatar-img';
    img.alt = meta.name;
    img.src = meta.portrait;
    img.onerror = () => {
      // 头像图未出（neutral.png 404）：先用立绘兜底，仍失败再标记缺失
      const fallback = new Image();
      fallback.className = 'avatar-img';
      fallback.src = `assets/characters/${p.charId}/standing.png`;
      fallback.onerror = () => { div.classList.add('avatar-missing'); fallback.remove(); };
      img.replaceWith(fallback);
    };
    div.appendChild(img);
    div.insertAdjacentHTML('beforeend', `<span class="avatar-name">${meta.name}</span>`);
    div.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: p.charId } }));
    });
    layer.appendChild(div);
  });
}
```

3. `SceneView.init()` 的 `init()` 方法中（`this.showScene(...)` 之前）追加行程表加载与时间事件监听：

```js
    loadSchedules().then(() => this.renderCharacters());
    window.addEventListener('game-time-advanced', () => this.renderCharacters());
```

4. 文件头部注释第 1 行「立绘层（立绘逻辑在 Task 4 补全）」改为「立绘层（在场由行程表派生）」。

- [ ] **Step 2: 改 `js/event.js`**

1. 顶部 import 追加：

```js
import { countPresent } from './schedules.js';
```

2. 删除 `LOCATION_HEROINES` 整块（约 25-34 行，含注释「/** 每个地点存在的女主角… */」），替换为：

```js
/** 场景 id → 行动桶映射（公司场景已删除；twins_room 归 home 行为桶） */
var SCENE_BUCKET = {
  home_living: 'home', home_bed: 'home', home_door: 'home', twins_room: 'home',
  food_bunshop: 'food', food_st: 'food',
  market_hall: 'market', market_door: 'market',
  cardshop_inside: 'card_shop', cardshop_door: 'card_shop',
  mall_st: 'mall', mall_dessert: 'mall',
  suburb_st: 'suburb', suburb_station: 'suburb', church: 'suburb', forest: 'suburb'
};
```

3. 删除 `LOCATION_ACTIONS` 中的 `'company': { ... },` 整块（约 44-49 行）。

4. `getLocationSuggestions` 整体替换为：

```js
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
```

5. `SCENE_FALLBACKS` 中删除 `company_cubicle`、`company_office`、`company_door` 三个条目（约 146-157 行），并追加：

```js
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
```

- [ ] **Step 3: 改 `js/app.js` — advanceTime 派发事件**

`advanceTime` 方法中 `AppState.set('gameTime', t);` 之后追加一行：

```js
    window.dispatchEvent(new CustomEvent('game-time-advanced'));
```

- [ ] **Step 4: 改 `js/state.js` — sceneCharacters 注释**

`sceneCharacters: {},`（约 184 行）上方注释「/* --- 场景状态 --- */」块内，在 `sceneCharacters: {},` 行尾追加注释 `// 派生态：由行程表按时间重建（scene.js _renderAvatars），勿手写初始值`。

- [ ] **Step 5: 语法与数据校验**

Run（PowerShell）：
```powershell
node --input-type=module --check js/scene.js
node --input-type=module --check js/event.js
node --input-type=module --check js/schedules.js
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
node scripts/validate-schedules.mjs
```
Expected: 全部 PASS。

- [ ] **Step 6: 浏览器回归（行程在场）**

Playwright（`python -m http.server 8091` 起于项目根；8080 被占则用 8091）：
- 新游戏 → 客厅：头像层应有 4 个头像（塞壬/零依/天童/彩虹——上午时段，游戏初始 hour=8）；名字标签正确；坐标在基准点 ±3% 内
- 头像 404 兜底：头像图缺失时显示 standing.png 兜底（img src 变为 standing 路径），无 JS 错误
- 用 `AppState.set('gameTime', { day: 1, hour: 1, minute: 0 })` 触发跨段（或等待 advanceTime 跨段）→ 客厅在场变化（深夜仅卧室有人，客厅为空）；`game-time-advanced` 事件后头像层自动重算
- 旅行到城郊站台 → 出口含「森林」；进森林 → 彩虹下午在场（把时间设 14:00）；进教堂 → 理上午在场（设 9:00）
- 行动建议：客厅上午 →「色色」分类出现（有女主在场）；深夜客厅 →「色色」消失
- 控制台无 JS 运行时错误（standing/neutral 404 为预期）
- 截图存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-18-cg-standing-schedule\task4-*.png`

- [ ] **Step 7: 提交**

```bash
git add js/scene.js js/event.js js/app.js js/state.js
git commit -m "feat: 场景在场由行程表按时间派生（落位随机 + 立绘头像兜底 + 跨段重算），行动建议接入行程表在场判断"
```

---

### Task 5: 特写时序层 — CG 3 秒 → 立绘 → 场景背景

**Files:**
- Modify: `js/closeup.js`（整体重写时序控制；对外 API 不变：`init/open/close/setEmotion/getDialogEl`）
- Modify: `css/closeup.css`（追加 CG/立绘/场景背景层与过渡规则）

**Interfaces:**
- Consumes: Task 3 的 `getCgPath`；Task 4 的 `closeup-open` 事件与在场头像
- Produces: 特写序列（Task 6 对话上下文注入依赖 `closeup` 打开态）；对外无新增全局 API

- [ ] **Step 1: 重写 `js/closeup.js`**

完整内容（逐字）：

```js
// 全屏特写视图：点击头像 → CG 3 秒（如有）→ 立绘居中 → 场景背景淡入 → 对话常驻
// 降级链：standing.png → neutral.png（emotionFile）→ fullbody.png → 「立绘缺失」占位
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';
import { getCgPath } from './schedules.js';

var _charId = null;
var _phase = 'closed'; // closed | cg | standing
var _timers = [];

function _fullbodyFallbackPath(charId) {
  return `assets/characters/${charId}/fullbody.png`;
}

function _clearTimers() {
  _timers.forEach(clearTimeout);
  _timers = [];
}

function _setPhase(phase) {
  _phase = phase;
  var overlay = document.getElementById('closeup-overlay');
  if (overlay) {
    overlay.classList.toggle('phase-cg', phase === 'cg');
    overlay.classList.toggle('phase-standing', phase === 'standing');
  }
}

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-scene-bg" id="closeup-scene-bg"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <div class="closeup-dialog" id="closeup-dialog"></div>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
    // 序列播放中点击任意处跳过 CG 段
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('#closeup-close-btn') || e.target.closest('#closeup-dialog')) return;
      if (_phase === 'cg') this._finishCgPhase();
    });
  },

  open(characterId) {
    _charId = characterId;
    const meta = CHARACTERS[characterId];
    if (!meta) return;
    _clearTimers();
    AppState.set('closeup', { active: true, characterId, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = meta.name;
    const overlay = document.getElementById('closeup-overlay');
    overlay.classList.add('active');

    // 场景背景层：取当前场景 bg，序列后淡入
    const bg = document.getElementById('closeup-scene-bg');
    bg.classList.remove('visible');
    const scene = document.getElementById('location-bg');
    if (scene && scene.style.backgroundImage) {
      bg.style.backgroundImage = scene.style.backgroundImage;
    }

    const cgPath = getCgPath(characterId, AppState.get('gameTime'));
    if (cgPath) {
      this._startCgPhase(cgPath);
    } else {
      this._startStandingPhase();
    }
  },

  /* CG 段：全屏 CG 3 秒（加载失败直接进立绘段） */
  _startCgPhase(cgPath) {
    _setPhase('cg');
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    const img = new Image();
    img.className = 'closeup-cg';
    img.alt = CHARACTERS[_charId].name;
    img.onload = () => {
      if (_phase !== 'cg') return;
      _timers.push(setTimeout(() => this._finishCgPhase(), 3000));
    };
    img.onerror = () => {
      if (_phase !== 'cg') return;
      this._startStandingPhase();
    };
    img.src = cgPath;
    el.appendChild(img);
  },

  _finishCgPhase() {
    _clearTimers();
    this._startStandingPhase();
  },

  /* 立绘段：standing.png 居中 → 0.6s 后场景背景淡入 */
  _startStandingPhase() {
    _setPhase('standing');
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    el.classList.remove('sprite-missing');
    const img = new Image();
    img.className = 'closeup-standing';
    img.alt = CHARACTERS[_charId].name;
    img.onerror = () => { if (!img.isConnected) return; img.remove(); this._tryEmotionFallback(); };
    img.src = `assets/characters/${_charId}/standing.png`;
    el.appendChild(img);
    _timers.push(setTimeout(() => {
      const bg = document.getElementById('closeup-scene-bg');
      if (bg) bg.classList.add('visible');
    }, 600));
  },

  /* 立绘缺失降级链：neutral.png → fullbody.png → 占位 */
  _tryEmotionFallback() {
    const el = document.getElementById('closeup-portrait');
    const tryFullbody = () => {
      const fb = new Image();
      fb.src = _fullbodyFallbackPath(_charId);
      fb.onerror = () => { if (!fb.isConnected) return; el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
      el.appendChild(fb);
    };
    const img = new Image();
    img.src = emotionFile(_charId, 'neutral');
    img.onerror = () => { if (!img.isConnected) return; img.remove(); tryFullbody(); };
    el.appendChild(img);
  },

  close() {
    _clearTimers();
    _setPhase('closed');
    AppState.set('closeup', { active: false, characterId: null, emotion: 'neutral' });
    document.getElementById('closeup-overlay').classList.remove('active');
    const bg = document.getElementById('closeup-scene-bg');
    if (bg) bg.classList.remove('visible');
    _charId = null;
  },

  /* 表情切换：仅记录状态（表情差分维持推后，立绘保持 standing） */
  setEmotion(emotion) {
    AppState.set('closeup', { active: true, characterId: _charId, emotion });
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};
```

- [ ] **Step 2: 追加 `css/closeup.css` 规则**

文件末尾追加：

```css
/* --------------------------------------------------------------------------
   特写序列：CG 3 秒 → 立绘居中 → 场景背景淡入
   -------------------------------------------------------------------------- */
.closeup-scene-bg {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
  opacity: 0; transition: opacity .6s ease;
}
.closeup-scene-bg.visible { opacity: .45; }
.closeup-portrait { z-index: 1; }
/* 注意：现有规则 .closeup-portrait img { width:100vw; height:100vh; object-fit:cover }，
   下面选择器特异性更高，必须显式覆盖宽高，否则立绘会被强行拉满全屏。 */
.closeup-portrait .closeup-cg {
  width: 94%; height: auto; max-height: 88vh; object-fit: contain;
  border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,.6);
  animation: closeup-cg-in .4s ease;
}
@keyframes closeup-cg-in { from { opacity: 0; } to { opacity: 1; } }
.closeup-portrait .closeup-standing {
  width: auto; height: 78vh; max-width: 60vw; object-fit: contain;
  animation: closeup-standing-in .4s ease;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,.55));
}
@keyframes closeup-standing-in { from { opacity: 0; } to { opacity: 1; } }
/* CG 段：对话区不可用（序列结束后恢复） */
.phase-cg #closeup-dialog { pointer-events: none; opacity: .35; transition: opacity .4s; }
```

（`.closeup-portrait` 现有 flex 居中布局保持；深色底由既有 `.closeup-backdrop` 提供，场景背景缺失时兜底。浏览器回归验证立绘实际居中且不溢出。）

- [ ] **Step 3: 语法校验**

Run: `node --input-type=module --check js/closeup.js`
Expected: PASS

- [ ] **Step 4: 浏览器回归（特写序列）**

Playwright（8091）：
- 上午客厅点塞壬头像 → 特写打开：CG `siren/cg/start.png` 全屏显示（naturalWidth>0）→ 3 秒后自动切立绘 `siren/standing.png` 居中 → 0.6s 后场景背景层 `visible` → 对话区可用（CG 段期间 `.phase-cg #closeup-dialog` pointer-events:none）
- CG 段中点击画面任意处 → 立即进立绘段（跳过生效）
- 点击艾克利西亚（包子铺上午）→ 无 CG，直接立绘段
- 双子 CG 切换：客厅傍晚（设 hour=19，双子晚上在场）点姬丝吉尔 → CG 为 `start-night.png`；把时间设 15:00 到双子的房间点她 → `start-day.png`
- 立绘缺失降级：临时重命名 `assets/characters/siren/standing.png`（如 `standing.png.bak`，测完改回）→ 点塞壬 → neutral.png 降级链或「立绘缺失」占位，无 JS 错误
- Esc / 关闭按钮 → 特写关闭回场景，背景层 visible 类移除
- 控制台无 JS 运行时错误
- 截图存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-18-cg-standing-schedule\task5-*.png`

- [ ] **Step 5: 提交**

```bash
git add js/closeup.js css/closeup.css
git commit -m "feat: 特写时序层——CG 3 秒（可跳过）→ 立绘居中 → 场景背景淡入 → 对话常驻"
```

---

### Task 6: 对话上下文注入 + 世界书清理

**Files:**
- Modify: `js/ai.js`（chat 请求 `game_state` 增加 gameTime/currentSceneName/sceneCharacters）
- Modify: `server/bridge.py`（`compact_state` 增加 gameTime/currentScene/sceneCharacters 字段）
- Modify: `data/worldbook.json`（删「码丽丝为了接近主角而任职的高管公司」一句）

**Interfaces:**
- Consumes: Task 3 的 `getActivity`/`getPresent`；Task 4 的派生态 sceneCharacters 状态
- Produces: bridge 对话 prompt 含【游戏时间】【当前场景】【角色状态】（对话解释的上下文来源）

- [ ] **Step 1: 改 `js/ai.js`**

1. 顶部 import 追加：

```js
import { getPresent, getActivity } from './schedules.js';
import { getScene } from './scenes-data.js';
```

2. `chat(input)` 中 `game_state` 对象追加三个字段（`currentSceneId` 行后追加逗号与三行）：

```js
            game_state: {
                player: state.player,
                gamePhase: state.gamePhase,
                companions: state.companions,
                inventory: state.inventory,
                currentSceneId: state.currentSceneId,
                gameTime: state.gameTime,
                currentSceneName: (getScene(state.currentSceneId) || {}).name || '',
                sceneCharacters: getPresent(state.currentSceneId, state.gameTime).map(function (p) {
                    return { name: (getActivity(p.charId, state.gameTime) || '').split(' · ')[0], activity: p.activity };
                })
            },
```

- [ ] **Step 2: 改 `server/bridge.py` — `compact_state`**

整体替换为：

```python
def compact_state(state):
    """Create compact version of game state for prompt"""
    gt = state.get("gameTime", {})
    sc = state.get("sceneCharacters", [])
    return {
        "player": state.get("player", {}),
        "gamePhase": state.get("gamePhase", {}),
        "companions": [{"name": c.get("name"), "affection": c.get("affection")} for c in state.get("companions", [])],
        "inventory_count": len(state.get("inventory", [])),
        "activeDeck": state.get("activeDeckId"),
        "map_progress": f"{sum(1 for n in state.get('mapNodes', []) if n.get('status') == 'completed')}/{len(state.get('mapNodes', []))} nodes",
        "gameTime": f"第{gt.get('day', 1)}天 {int(gt.get('hour', 8)):02d}:{int(gt.get('minute', 0)):02d}",
        "currentScene": state.get("currentSceneName") or state.get("currentSceneId") or "",
        "sceneCharacters": [{"name": c.get("name", ""), "activity": c.get("activity", "")} for c in sc]
    }
```

- [ ] **Step 3: 验证 compact_state（node 无关，纯 Python）**

Run（在项目根）：
```powershell
cd server; python -c "import bridge; s = bridge.compact_state({'gameTime': {'day': 3, 'hour': 9, 'minute': 5}, 'currentSceneName': '客厅', 'sceneCharacters': [{'name': '塞壬', 'activity': '懒洋洋泡在鱼缸里打盹'}], 'companions': [{'name': '塞壬', 'affection': 40}], 'player': {}, 'gamePhase': {}, 'inventory': [], 'mapNodes': []}); assert s['gameTime'] == '第3天 09:05'; assert s['currentScene'] == '客厅'; assert s['sceneCharacters'][0]['activity'] == '懒洋洋泡在鱼缸里打盹'; print('PASS: compact_state 注入字段正确')"
```
Expected: `PASS: compact_state 注入字段正确`（bridge 启动提示会先打印，属正常副作用）。

- [ ] **Step 4: 改 `data/worldbook.json`**

将「特殊地域」条目中 `（如艾克利西娅常去干饭的包子铺、码丽丝为了接近主角而任职的高管公司）` 改为 `（如艾克利西娅常去干饭的包子铺）`。其余内容不动。

- [ ] **Step 5: 提交**

```bash
git add js/ai.js server/bridge.py data/worldbook.json
git commit -m "feat: 对话上下文注入游戏时间/当前场景/在场角色行动文案（bridge compact_state 透传）+ 世界书删除公司残留句"
```

---

### Task 7: 整体回归验收 + 零残留

**Files:**
- 无新增；修回归中发现的问题（如有）

**Interfaces:**
- Consumes: Task 1-6 全部产物

- [ ] **Step 1: 全部校验脚本**

Run（PowerShell）：
```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
node scripts/validate-schedules.mjs
```
Expected: 四个都 PASS。

- [ ] **Step 2: 公司零残留检查**

Run（PowerShell）：
```powershell
Select-String -Path js\*.js,scripts\*.mjs,css\*.css,data\*.json -Pattern "company_cubicle|company_office|company_door|高管公司"
```
Expected: 0 匹配。

- [ ] **Step 3: 浏览器全流程回归（Playwright）**

- 新游戏 → 转场 → 客厅上午 4 人头像（塞壬/零依/天童/彩虹），头像缺失时 standing 兜底
- 点塞壬 → CG 3 秒 → 立绘居中 → 背景淡入 → 对话区可用 → 发一句对话，请求体含 `sceneCharacters`（Playwright 拦截 POST /chat 断言 payload）→ 关闭特写
- 点艾克利西亚（包子铺）→ 直接立绘无 CG
- 双子 18:00 前后 CG 切换复验
- 行程走动：旅行一圈 16 场景出口全部连通、无死链；深夜双子不在任何场景
- 行动建议：有女主在场时「色色」出现、无人在场时消失
- 存档/读档：存档后读档，在场按时间重算一致；`sceneCharacters` 派生态不残留旧值
- 移动端 375×667：立绘不溢出、对话区可滚动、场景背景层正常
- 控制台无 JS 运行时错误（neutral/standing 404 预期仅限头像 neutral）
- 截图存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-18-cg-standing-schedule\task7-*.png`

- [ ] **Step 4: 提交（仅当有修复）**

```bash
git add <仅本计划相关修复文件，逐个列出>
git commit -m "fix: CG/立绘序列与行程表回归修复"
```

---

## 验收标准（全部完成 = 本计划完成）

1. 四校验脚本全 PASS；公司场景/世界书「高管公司」全库零残留
2. 16 场景全连通：公司 3 场景删除、双子的房间/教堂/森林可进入且背景正常
3. 场景在场按行程表派生：上午客厅 4 人、深夜双子不在场、时间跨段自动重算、落位 ±3% 随机
4. 特写序列：有 CG 播 3 秒（可点击跳过）→ 立绘居中 → 场景背景淡入 → 对话常驻；无 CG（艾克利西亚）直接立绘；双子 CG 按 18:00 切换
5. 对话请求含 gameTime/currentSceneName/sceneCharacters，bridge compact_state 透传进 prompt
6. 行动建议「色色」分类按行程表在场动态显示/隐藏
7. 存档读档一致、移动端不溢出、无 JS 运行时错误

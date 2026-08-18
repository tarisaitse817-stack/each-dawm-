# 角色阵容替换 + 关系页图鉴 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除旧 6 角色（废案），阵容改为世界书 V2 的 9 角色；关系页（伙伴界面）图鉴化——圆形缩略头像卡片 + 点击全屏展示介绍图与详细介绍。

**Architecture:** 新建 `data/characters.json`（方案 A）集中存放 9 人图鉴静态数据（昵称/身份/背景/性格/外貌/主题色/介绍图路径/初始好感），companions.js 运行时 fetch 合并 AppState（好感度/状态）渲染；`scenes-data.js` CHARACTERS 换 9 人、场景角色引用清空（用户后续自行安排）；新增全屏详情弹层（`#companion-detail`）。

**Tech Stack:** 原生 ES Modules JavaScript、CSS、Node v24（校验脚本）、Playwright MCP（浏览器回归）、PIL（素材校验）

## Global Constraints

- 项目根目录：`C:\Users\Administrator\each-dawm-`（所有相对路径以此为根）
- 无 package.json：自动化检查 = node 断言脚本（`scripts/*.mjs`）；UI 行为 = 浏览器人工回归清单
- 校验脚本**不做文件存在性检查**（用户图未到位前不阻塞）
- 9 人阵容（id 固定）：`siren`塞壬 / `lingyi`零依 / `lushi`露世 / `kisikil`姬丝吉尔 / `lilla`璃拉 / `ecclesia`艾克利西亚 / `tiantong`天童 / `li`理 / `caihong`彩虹
- 初始好感度：塞壬40 / 零依30 / 露世30 / 姬丝吉尔20 / 璃拉20 / 艾克利西亚20 / 天童30 / 理20 / 彩虹20；全部 unlocked:true
- 介绍图 8 张（双子合照共用 `twins-intro.png`）入库 `assets/companions/`；缩略头像 `assets/companions/<id>.png` 由用户后续提供，缺失时显示 `user` 图标占位（既有逻辑）
- 介绍文案只含 SFW 内容（昵称/身份/背景/性格/外貌，无 NSFW）
- 详情弹层 z-index = 85（低于 closeup 90 / 转场 100）；Esc / 点击背景 / 「关闭 ✕」关闭
- 场景 16 个的 `characters`/`characterSpots` 本轮全部清空；校验允许空引用；引用不存在 id 仍报错
- 旧素材删除前复制到 `.superpowers/import-backups/`；git 历史保留兜底
- 注释/命名沿用现有中文注释风格与 `_` 前缀私有函数约定；提交信息带 `Co-Authored-By: Claude <noreply@anthropic.com>` trailer；工作树用户无关文件（`server/start.bat`、`assets/` 未跟踪）绝不提交
- deck 字段默认值（Tearlaments/Sky Striker/Labrynth/Live Twin×2/Albaz/Tenyi/Voiceless Voice/Maliss）为**可改占位**，用户后续可在 data/characters.json 调整；battleLines 本轮不写（event.js 有空值兜底）

---

### Task 1: 图鉴数据 + 素材入库 + 数据校验

**Files:**
- Create: `data/characters.json`（9 人图鉴数据，完整内容见 Step 1）
- Create: `scripts/validate-characters.mjs`（新校验脚本）
- Copy: 桌面 8 张介绍图 → `assets/companions/`（映射见 Step 2）
- Delete: `assets/companions/` 旧 6 图、`assets/characters/` 旧 5 人目录（备份后删，见 Step 3）

**Interfaces:**
- Consumes: 桌面 `角色介绍` 文件夹 8 张 PNG；世界书档案（文案已提炼进本计划）
- Produces: `data/characters.json`（Task 3 渲染数据源）；`assets/companions/<id>-intro.png` 与 `twins-intro.png`（Task 3 详情弹层全图）；`scripts/validate-characters.mjs`（Task 4 回归复用）

- [x] **Step 1: 创建 `data/characters.json`**

文件整体内容（逐字，文案已从世界书档案提炼为 SFW 版）：

```json
{
  "characters": [
    {
      "id": "siren",
      "name": "塞壬",
      "nicknames": ["笨鱼", "塞壬酱", "小鱼", "鱼鱼"],
      "identities": ["主角卡组里的海妖精灵", "霸占客厅鱼缸的娇弱水属性同居者"],
      "background": "伴随奇异现象降临在主角出租屋里的妹卡精灵，适应现世需要魔力，加上天性慵懒，比起喧闹的修罗场，更喜欢缩在鱼缸里享受安逸，并暗自贪恋着主人的气味。",
      "personality": "慵懒贪水、内心极度黏人。躺在水里一边吐泡泡一边盯着主角看，想要撒娇时会用蓝色脚鳍轻轻拍打水面。",
      "appearance": "灰色头发带挑染、扎着双马尾，紫色水汪汪的眼睛，尖耳朵与蓝色脚鳍。常穿露肩无袖连衣裙，绝大多数时间喜欢躺在客厅的鱼缸里泡水。",
      "affection": 40,
      "theme": { "glow": "rgba(130,200,230,0.3)", "accent": "#82d4e8" },
      "introImage": "assets/companions/siren-intro.png",
      "avatar": "assets/companions/siren.png"
    },
    {
      "id": "lingyi",
      "name": "零依",
      "nicknames": ["依依", "笨蛋闪刀", "活泼小狗"],
      "identities": ["穿越到现实的元气卡片精灵", "主角家里活跃气氛的开心果"],
      "background": "与露世一起跨越次元来到主角的出租屋。为了维系存在将自己全然交给主角，每天用元气满满的笑容和偶尔的小调皮试图霸占主人的注意力。",
      "personality": "活泼开朗、直率且毫无防备。高兴时会不管不顾地直接扑进主角怀里，吃醋时会鼓起腮帮子用力扯主角的衣角。",
      "appearance": "耀眼的黄色长发、清澈湛蓝的眼睛，常常带着爽朗的笑容。日常穿白色短袖衬衫配黑色百褶裙和黑色过膝袜。",
      "affection": 30,
      "theme": { "glow": "rgba(255,220,120,0.3)", "accent": "#ffd97a" },
      "introImage": "assets/companions/lingyi-intro.png",
      "avatar": "assets/companions/lingyi.png"
    },
    {
      "id": "lushi",
      "name": "露世",
      "nicknames": ["世世", "傲娇冷面", "黑猫"],
      "identities": ["穿越而来的高冷型羁绊精灵", "主角家中沉默却敏锐的同居者"],
      "background": "随零依一同降临在主角家中，外表总是一副冷淡生人勿近的模样，实则内心极度渴望主人的关爱，只能用冰冷的外壳掩饰自己汹涌的独占欲。",
      "personality": "外冷内热傲娇、敏感且嫉妒心强。被主角盯着看时会拉下帽檐遮掩泛红的耳根，看到主角对别人好会在角落里默默攥紧拳头。",
      "appearance": "气质清冷，宛如带刺的黑玫瑰。常戴黑色帽子、黑色齐肩发，穿白色休闲衬衫、黑色开衫、百褶裙与黑色连裤袜，喜欢坐在沙发角落看书。",
      "affection": 30,
      "theme": { "glow": "rgba(180,160,220,0.3)", "accent": "#b39ddb" },
      "introImage": "assets/companions/lushi-intro.png",
      "avatar": "assets/companions/lushi.png"
    },
    {
      "id": "kisikil",
      "name": "姬丝吉尔",
      "nicknames": ["吉丝吉尔", "笨蛋红", "粉毛怪盗", "主播小姐"],
      "identities": ["白天是对门的人气主播邻居", "夜晚是潜入房间的魅魔怪盗"],
      "background": "靠着和璃拉的直播收益搬到主角对门，表面是天天带笑打游戏的元气少女，一到晚上就换上怪盗服——现在她最大的目标不是财宝，而是不择手段地偷走主角的身体和心。",
      "personality": "古灵精怪、主动大胆。调戏主角时会吐出小舌头露出小虎牙，夜晚潜入时习惯扶着紫色大帽子抛媚眼。",
      "appearance": "白天红发双马尾带小虎牙，粉外套配骑行短裤，膝盖总贴着创可贴；晚上粉发戴紫帽、长出恶魔尾巴，换上黑色连体紧身衣和紫短裙。",
      "affection": 20,
      "theme": { "glow": "rgba(255,150,180,0.3)", "accent": "#ff80ab" },
      "introImage": "assets/companions/twins-intro.png",
      "avatar": "assets/companions/kisikil.png"
    },
    {
      "id": "lilla",
      "name": "璃拉",
      "nicknames": ["蓝毛猫猫", "困倦怪盗", "包子头", "鲨鱼女孩"],
      "identities": ["总是抱着玩偶打瞌睡的主播", "面冷心热的闷骚蓝发怪盗"],
      "background": "姬丝吉尔的搭档，性格冷淡。白天直播总是一副半梦半醒的样子，每到夜晚的怪盗行动中，一旦发现姬丝吉尔想对主角偷跑就会吃醋暴走、强行加入战局。",
      "personality": "慵懒冷淡、极度傲娇易吃醋。白天困倦时会把大半张脸埋进鲨鱼玩偶里，感到嫉妒时会用蓝色恶魔尾巴死死缠住主角的手腕。",
      "appearance": "蓝发双包子头、半闭着眼睛，夜晚会长出蓝色恶魔翅膀和尾巴。白天白裙配水手帽，夜晚黑白荷叶边短裙、白色连裤袜与黑高跟靴。",
      "affection": 20,
      "theme": { "glow": "rgba(130,160,230,0.3)", "accent": "#82a0e6" },
      "introImage": "assets/companions/twins-intro.png",
      "avatar": "assets/companions/lilla.png"
    },
    {
      "id": "ecclesia",
      "name": "艾克利西亚",
      "nicknames": ["饭桶圣女", "吃货", "小艾", "圣女大人"],
      "identities": ["借住在此的吃货圣女精灵", "小吃街备受宠爱的元气帮工"],
      "background": "跨越次元来到现世的羁绊精灵，虽有着神圣的背景却彻底暴露了吃货本性，靠在小吃街帮忙换取零食，每天最期待的事就是回家向主角讨要抱抱和投喂。",
      "personality": "天真烂漫、纯真贪吃。饿肚子或想撒娇时会无意识含着手指可怜巴巴盯着主角，看到好吃的食物时银色的眼睛会瞬间亮得像灯泡。",
      "appearance": "柔顺的金色长发、熠熠生辉的银色眼眸，白皙的额头上有着特别的「X」型圣痕。总穿舒适的白色连衣裙，裙角或嘴角偶尔沾着小吃街的酱汁。",
      "affection": 20,
      "theme": { "glow": "rgba(255,220,140,0.3)", "accent": "#ffd88c" },
      "introImage": "assets/companions/ecclesia-intro.png",
      "avatar": "assets/companions/ecclesia.png"
    },
    {
      "id": "tiantong",
      "name": "天童",
      "nicknames": ["小天童", "和事佬", "胆小鬼", "天童酱"],
      "identities": ["修罗场里委屈巴巴的和事佬", "极度依赖主角的胆怯同居者"],
      "background": "带着一身华丽却不方便行动的日式装扮来到现世，生性胆小怯懦，却总在精灵们吵架时硬着头皮劝架，心里最渴望的是躲在主角怀里被安全感包围。",
      "personality": "胆怯软弱、善良惹人怜爱。害怕时会用宽大的袖子挡住半张脸，跟人说话不敢对视，只有主角在家时才敢像小尾巴一样跟前跟后。",
      "appearance": "头戴金色头饰与镜子项链，水汪汪的眼睛总是无辜地下垂着。白色无袖和服配红色袴裤，白色过膝袜勾勒出纤细的双腿，宛如受惊的小白兔。",
      "affection": 30,
      "theme": { "glow": "rgba(255,190,180,0.3)", "accent": "#ffbeb4" },
      "introImage": "assets/companions/tiantong-intro.png",
      "avatar": "assets/companions/tiantong.png"
    },
    {
      "id": "li",
      "name": "理",
      "nicknames": ["小理", "圣女", "神圣少女", "探索者"],
      "identities": ["降临现世的圣洁精灵", "对都市充满好奇的娇小探索者"],
      "background": "带着神圣气息降临在主角家中，对主角有着深深的感激与眷恋，但对现代社会的运作更好奇，总用悲天悯人的目光观察人类，每天出门散步回来用温柔的声音分享见闻。",
      "personality": "温柔包容、悲天悯人。对新奇事物好奇时会微微歪头眨动蓝眼睛，聆听主角说话时习惯将双手交握在胸前祈祷。",
      "appearance": "娇小纤弱，宛如不食人间烟火的小仙女，蓝色瞳孔清澈见底。常披着宽松的红色长袍，神情纯真。",
      "affection": 20,
      "theme": { "glow": "rgba(255,170,150,0.3)", "accent": "#ffaa96" },
      "introImage": "assets/companions/li-intro.png",
      "avatar": "assets/companions/li.png"
    },
    {
      "id": "caihong",
      "name": "彩虹",
      "nicknames": ["小彩", "画师太太", "虹虹", "小画师"],
      "identities": ["暂住主角家的异次元画师", "怀抱感恩之心的家务小能手"],
      "background": "刚穿越到这个世界时无依无靠，被主角收留后怀着极大的感激住进了温馨小家，平时在房间里以画画为生，为了报答主角包揽了家里的许多家务，逐渐融入了这个修罗场。",
      "personality": "待人温和包容、专注且心思细腻。思考画作构图时会无意识地轻咬笔头，害羞时会下意识抓起速写本挡住通红的脸。",
      "appearance": "温婉恬静的艺术少女，如雨后的彩虹般散发清新治愈的气息。一头绚丽的彩虹色长发及腰，眼眸温润如水，喜欢穿宽大、偶尔沾着颜料的白衬衫。",
      "affection": 20,
      "theme": { "glow": "rgba(160,240,200,0.3)", "accent": "#7ce8b0" },
      "introImage": "assets/companions/caihong-intro.png",
      "avatar": "assets/companions/caihong.png"
    }
  ]
}
```

- [x] **Step 2: 介绍图入库**

Run（PowerShell，逐条执行）：

```powershell
$src = "$env:USERPROFILE\Desktop\角色介绍"
$dst = "C:\Users\Administrator\each-dawm-\assets\companions"
Copy-Item "$src\塞壬.png"     "$dst\siren-intro.png"
Copy-Item "$src\零依.png"     "$dst\lingyi-intro.png"
Copy-Item "$src\露世.png"     "$dst\lushi-intro.png"
Copy-Item "$src\双子.png"     "$dst\twins-intro.png"
Copy-Item "$src\艾克利西亚.png" "$dst\ecclesia-intro.png"
Copy-Item "$src\天童.png"     "$dst\tiantong-intro.png"
Copy-Item "$src\理.png"       "$dst\li-intro.png"
Copy-Item "$src\彩虹.png"     "$dst\caihong-intro.png"
```

Expected: `assets/companions/` 下新增 8 个 `*-intro.png`（双子只一份 `twins-intro.png`）。

- [x] **Step 3: 旧素材备份并删除**

```powershell
$bak = "C:\Users\Administrator\each-dawm-\.superpowers\import-backups"
New-Item -ItemType Directory -Force "$bak\old-assets" | Out-Null
Copy-Item "C:\Users\Administrator\each-dawm-\assets\companions\塞壬.png","林仪.png","柳月.png","白月.png","艾克利西娅.png","苏昀.png" "$bak\old-assets\" -ErrorAction SilentlyContinue
Copy-Item -Recurse "C:\Users\Administrator\each-dawm-\assets\characters\baiyue","linyi","liuyue","suyun","ecclesia" "$bak\old-assets\" -ErrorAction SilentlyContinue
Remove-Item "C:\Users\Administrator\each-dawm-\assets\companions\塞壬.png","林仪.png","柳月.png","白月.png","艾克利西娅.png","苏昀.png" -Force
Remove-Item -Recurse -Force "C:\Users\Administrator\each-dawm-\assets\characters\baiyue","linyi","liuyue","suyun","ecclesia"
```

Expected: 旧 6 图与旧 5 人目录从工作树删除，备份在 `.superpowers/import-backups/old-assets/`；`assets/characters/siren/` 保留。

- [x] **Step 4: 创建 `scripts/validate-characters.mjs`**

```js
// 校验图鉴数据完整性：node scripts/validate-characters.mjs
import fs from 'node:fs';

const errors = [];
const raw = fs.readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('FAIL: characters.json 解析失败:', e.message);
  process.exit(1);
}

const WANT = [
  ['siren', 40], ['lingyi', 30], ['lushi', 30], ['kisikil', 20], ['lilla', 20],
  ['ecclesia', 20], ['tiantong', 30], ['li', 20], ['caihong', 20]
];

const chars = data.characters;
if (!Array.isArray(chars)) errors.push('characters 应为数组');
else {
  const ids = chars.map(c => c.id);
  if (new Set(ids).size !== ids.length) errors.push('id 重复');
  if (chars.length !== WANT.length) errors.push(`角色数应为 ${WANT.length}，实际 ${chars.length}`);
  for (const [id, aff] of WANT) {
    const c = chars.find(x => x.id === id);
    if (!c) { errors.push(`缺少角色 ${id}`); continue; }
    if (c.name !== null && !c.name) errors.push(`${id}: 缺 name`);
    if (!Array.isArray(c.nicknames) || c.nicknames.length === 0) errors.push(`${id}: nicknames 应非空数组`);
    if (!Array.isArray(c.identities) || c.identities.length === 0) errors.push(`${id}: identities 应非空数组`);
    for (const f of ['background', 'personality', 'appearance']) {
      if (typeof c[f] !== 'string' || c[f].trim().length < 10) errors.push(`${id}: ${f} 文案过短`);
    }
    if (c.affection !== aff) errors.push(`${id}: 初始好感应为 ${aff}，实际 ${c.affection}`);
    if (!c.theme || !c.theme.glow || !c.theme.accent) errors.push(`${id}: theme 缺 glow/accent`);
    if (!c.introImage || !c.introImage.startsWith('assets/companions/')) errors.push(`${id}: introImage 路径非法`);
    if (!c.avatar || !c.avatar.startsWith('assets/companions/')) errors.push(`${id}: avatar 路径非法`);
    for (const f of ['background', 'personality', 'appearance']) {
      if (/NSFW|淫|肏|肉棒|小穴|高潮|发情/i.test(c[f])) errors.push(`${id}: ${f} 含 NSFW 内容`);
    }
  }
  const twins = ['kisikil', 'lilla'];
  for (const id of twins) {
    const c = chars.find(x => x.id === id);
    if (c && c.introImage !== 'assets/companions/twins-intro.png') errors.push(`${id}: introImage 应指向 twins-intro.png`);
  }
}

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`PASS: ${chars.length} 角色图鉴数据完整、初始好感与文案合规`);
```

- [x] **Step 5: 运行校验**

```powershell
node scripts/validate-characters.mjs
```
Expected: `PASS: 9 角色图鉴数据完整、初始好感与文案合规`

- [x] **Step 6: 提交**

```bash
git add data/characters.json scripts/validate-characters.mjs assets/companions/
git add -u assets/companions assets/characters
git commit -m "feat: 图鉴数据 characters.json（世界书 9 人 SFW 介绍）+ 介绍图入库 + 旧素材清理"
```

---

### Task 2: 代码阵容替换 — scenes-data / state / 校验

**Files:**
- Modify: `js/scenes-data.js`（CHARACTERS 9 人替换；16 场景角色引用清空；3 处场景描述去旧名）
- Modify: `js/state.js`（初始 companions 数组替换为 9 人；sceneCharacters 清空）
- Modify: `scripts/validate-scenes.mjs`（roster 校验 + emotionFile 检查改新 id）
- Modify: `js/event.js`（LOCATION_HEROINES / LOCATION_ACTIONS / _extractOpponentName 旧名清零，方案 A）
- Modify: `data/worldbook.json`（1 处「艾克利西娅」→「艾克利西亚」拼写对齐）

> **范围扩展（2026-08-18 用户裁决「方案 A：本轮全部清零」）：** 计划原稿只列 3 个文件，但 Step 6 / 验收标准 #2 要求旧 id/旧名零残留，而 event.js 行动文案、state.js sceneCharacters、scenes-data.js 场景描述、worldbook 里仍有旧名。故 Task 2 范围扩展为上述 5 个文件；旧名文案按新阵容+世界书适配改写（标注待用户后续调整场景角色时再校准）。

**Interfaces:**
- Consumes: Task 1 的 `data/characters.json`（本任务不读取它，但 9 人 id 一致）
- Produces: `CHARACTERS` 9 人（`portrait: assets/characters/<id>/neutral.png`）；`AppState.get('companions')` 初始 9 人（Task 3 渲染）；`validate-scenes.mjs` 新 roster 断言（Task 4 复用）

- [x] **Step 1: 改 `js/scenes-data.js` — CHARACTERS 表替换**

将现有 `CHARACTERS` 表（约 6-13 行，`baiyue` 到 `ecclesia` 6 条）整体替换为：

```js
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
```

- [x] **Step 2: 清空 16 个场景的角色引用**

对 `SCENES` 中的**每个**场景对象（16 个）：
- `characters: ['...', ...]` 整行 → `characters: [],`
- `characterSpots: { ... }` 整块 → `characterSpots: {},`

（场景名/背景/出口/物件全部不动；用户后续自行加场景并安排角色。）

另将场景 `description` 中提及旧角色名的 3 处（约 28/83/110 行）改为中性描述（如「温暖的客厅，白月和塞壬的日常据点。」→「温暖的客厅，众人的日常据点。」；「林仪的办公室」→「冷色调的办公室」；「艾克利西娅在这里当帮工」→「小吃街的帮工在这里忙碌」）。其余描述文案不动。

- [x] **Step 3: 改 `js/state.js` — companions 初始数据替换**

将现有 `companions: [ ... ]` 数组（约 44 行起，6 人、含 deck/battleLines 字段，到 `],` 结束）整体替换为：

```js
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
```

（`deck` 为可改占位默认值；`battleLines` 字段本轮不写，event.js 有空值兜底。）

同时将 `sceneCharacters` 初始对象（约 184-191 行，旧 6 人）整体替换为 `sceneCharacters: {},`（场景角色已清空；scene.js:42 有 `|| {}` 兜底，storage.js 持久化无需改）。

- [x] **Step 3b: 改 `js/event.js` — 旧名清零（方案 A）**

1. `LOCATION_HEROINES`（约 26-34 行）：各地点数组全部改为 `[]`（场景角色待用户安排；「色色」分类暂时隐藏，event.js:95 已有空值兜底）。
2. `LOCATION_ACTIONS`（约 37-61 行）：所有提及旧角色名（白月/林仪/柳月/苏昀/艾克利西娅）的文案改写——home 场景参考塞壬/零依/露世（客厅鱼缸同居者），food 参考艾克利西亚（小吃街帮工）；company/market 新阵容无对应角色，文案中性化（去掉人名）；「色色」分类文案同样改写为新阵容（供用户后续恢复 LOCATION_HEROINES 时直接可用）。改写基于 Task 1 的 `data/characters.json` 图鉴设定，SFW 尺度与原文一致。
3. `_extractOpponentName`（约 511 行）角色名表整体替换为 9 新名：`['塞壬', '零依', '露世', '姬丝吉尔', '璃拉', '艾克利西亚', '天童', '理', '彩虹']`。
4. `data/worldbook.json`：「艾克利西娅」1 处改为「艾克利西亚」（新名拼写对齐；其余世界书内容不动）。

- [x] **Step 4: 改 `scripts/validate-scenes.mjs`**

1. 在 CHARACTERS 校验块（现有 `for (const [cid, meta] of Object.entries(CHARACTERS))` 之前）插入：

```js
// roster：必须恰为世界书 9 人
const WANT_CHARS = ['siren', 'lingyi', 'lushi', 'kisikil', 'lilla', 'ecclesia', 'tiantong', 'li', 'caihong'];
for (const cid of WANT_CHARS) {
  if (!CHARACTERS[cid]) errors.push(`CHARACTERS 缺少角色 ${cid}`);
}
if (Object.keys(CHARACTERS).length !== WANT_CHARS.length) {
  errors.push(`CHARACTERS 角色数应为 ${WANT_CHARS.length}，实际 ${Object.keys(CHARACTERS).length}`);
}
```

2. 将 `emotionFile('liuyue', e)` 两处（约 42-43 行）改为 `emotionFile('siren', e)`，期望路径断言同步改为：

```js
  if (!f.endsWith(`/siren/${e}.png`)) errors.push(`emotionFile 路径错误: ${f}`);
```

- [x] **Step 5: 运行校验**

```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
```
Expected: 三个都 PASS。

- [x] **Step 6: 引用检查**

Run（PowerShell）：
```powershell
Select-String -Path js\*.js,scripts\*.mjs -Pattern "baiyue|linyi|liuyue|suyun|sairen|白月|林仪|柳月|苏昀" | Where-Object { $_.Path -notmatch 'companions\.js$' }
```
Expected: 0 条匹配（`js/companions.js` 除外——其旧 THEME 键为 Task 3 整体重写前的暂时残留；docs/ 目录不在检查范围）。

- [x] **Step 7: 提交**

```bash
git add js/scenes-data.js js/state.js scripts/validate-scenes.mjs js/event.js data/worldbook.json
git commit -m "feat: 角色阵容替换为世界书 9 人（场景引用清空 + 旧名文案清零，待用户安排）"
```

---

### Task 3: 关系页图鉴 UI — companions.js 改造 + 详情弹层

**Files:**
- Modify: `js/companions.js`（数据源切换 + 卡片点击 + 全屏详情弹层，完整替换见 Step 1）
- Modify: `css/companions.css`（新增规则见 Step 2）

**Interfaces:**
- Consumes: `data/characters.json`（Task 1）；`AppState.get('companions')` 初始 9 人（Task 2）
- Produces: 关系页 9 卡片（点击 → `#companion-detail` 全屏弹层：全图 + 文案 + 关闭）；对外无新增全局 API（Task 4 浏览器回归依赖 DOM 结构）

- [x] **Step 1: 重写 `js/companions.js`**

文件整体替换为：

```js
/* ==========================================================================
   光之回响 (Echoes of Light) — 伙伴界面模块（图鉴版）
   数据源：data/characters.json（静态图鉴） + AppState companions（运行时好感/状态）
   ========================================================================== */

import { AppState } from './state.js';
import { Notifications } from './notifications.js';

/* ==========================================================================
   常量
   ========================================================================== */

/** 默认主题（characters.json 缺 theme 时兜底） */
var DEFAULT_THEME = { glow: 'rgba(212, 165, 116, 0.15)', accent: '#D4A574' };

/** 状态 → CSS 类名映射 */
var STATUS_CLASS_MAP = {
  '休整': 'rest',
  '外出探索': 'explore',
  '探索': 'explore',
  '紧张': 'tense',
  '暗中窥视': 'stalker',
  '职场施压': 'pressure',
  '温柔守望': 'warm',
  '兄控模式': 'brocon',
  '未曾谋面': 'stranger'
};

/** 图鉴静态数据缓存（characters.json） */
var _characters = null;
var _charactersById = {};

/** 详情弹层 DOM（惰性创建） */
var _detailEl = null;
var _detailPortraitEl = null;
var _detailBodyEl = null;

/** 上次亲和度快照（用于变化检测） */
var _lastAffectionMap = {};

/** 前一次 companions 引用，用于 shimmer */
var _prevCompanions = null;

/* ==========================================================================
   CompanionsPanel 单例
   ========================================================================== */

export var CompanionsPanel = {

  /* ======================================================================
     loadCharacters — 加载图鉴数据（失败不阻塞，返回空）
     ====================================================================== */
  loadCharacters: async function () {
    if (_characters) return _characters;
    try {
      var resp = await fetch('data/characters.json');
      if (resp.ok) {
        var data = await resp.json();
        _characters = data.characters || [];
        _charactersById = {};
        _characters.forEach(function (c) { _charactersById[c.id] = c; });
        console.log('[CompanionsPanel] 图鉴数据: ' + _characters.length + ' 人');
      }
    } catch (e) {
      console.warn('[CompanionsPanel] characters.json 加载失败，关系页显示空状态');
    }
    return _characters || [];
  },

  /* ======================================================================
     init — 初始化伙伴面板
     ====================================================================== */
  init: function () {
    var companions = AppState.get('companions');
    _prevCompanions = JSON.parse(JSON.stringify(companions));
    companions.forEach(function (c) {
      _lastAffectionMap[c.id] = c.affection;
    });

    var self = this;
    this.loadCharacters().then(function () { self.render(); });

    // 订阅 companions 变化 → 检测亲和度变化并触发流光
    AppState.subscribe('companions', function (newCompanions) {
      var oldMap = _lastAffectionMap;
      newCompanions.forEach(function (c) {
        if (oldMap[c.id] !== undefined && oldMap[c.id] !== c.affection) {
          CompanionsPanel._triggerAffectionShimmer(c.id);
        }
      });
      newCompanions.forEach(function (c) {
        _lastAffectionMap[c.id] = c.affection;
      });
    });
  },

  /* ======================================================================
     render — 渲染伙伴面板 HTML
     ====================================================================== */
  render: function () {
    var panel = document.getElementById('panel-companions');
    if (!panel) return;

    var companions = AppState.get('companions');
    var cardsHtml = '';
    var self = this;

    if (!_characters || _characters.length === 0) {
      panel.innerHTML =
        '<div class="companions-header">' +
          '<h2 class="companions-title">伙伴</h2>' +
          '<div class="companions-divider"></div>' +
        '</div>' +
        '<div class="companions-empty">图鉴数据加载失败，请检查 data/characters.json</div>';
      return;
    }

    companions.forEach(function (c, index) {
      cardsHtml += self._renderCard(c, index);
    });

    panel.innerHTML =
      '<div class="companions-header">' +
        '<h2 class="companions-title">伙伴</h2>' +
        '<div class="companions-divider"></div>' +
      '</div>' +
      '<div class="companions-list">' +
        cardsHtml +
      '</div>' +
      '<div class="companions-footer">— 在未来旅程中结识新的伙伴…… —</div>';

    // 绑定卡片点击（事件委托）
    var list = panel.querySelector('.companions-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var card = e.target.closest('.companion-card');
        if (card) self._openDetail(card.getAttribute('data-companion-id'));
      });
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderCard — 渲染单个伙伴卡片
     ====================================================================== */
  _renderCard: function (companion, index) {
    var meta = _charactersById[companion.id] || {};
    var name = (companion.unlocked !== false) ? (companion.name || '???') : '???';
    var affection = companion.affection != null ? companion.affection : 0;
    var location = companion.location || '???';
    var status = companion.status || '未知';
    var unlocked = companion.unlocked !== false;
    var background = (meta.background || '').slice(0, 60) + '…';
    var avatar = companion.avatar || meta.avatar || '';

    var theme = (meta.theme && meta.theme.glow) ? meta.theme : DEFAULT_THEME;
    var statusClass = STATUS_CLASS_MAP[status] || 'unknown';
    var cardLockedClass = unlocked ? '' : ' locked';
    var nameLockedClass = unlocked ? '' : ' locked-name';

    var starsHtml = this._renderStars(companion.id, affection, unlocked);

    var animDelay = (0.1 + index * 0.12).toFixed(2) + 's';

    // 头像区：有头像图显示圆形缩略，否则图标占位；未解锁显示剪影
    var portraitHtml;
    if (unlocked && avatar) {
      portraitHtml =
        '<div class="companion-portrait" style="--companion-glow: ' + theme.glow + '; --companion-accent: ' + theme.accent + ';">' +
          '<img src="' + avatar + '" alt="' + this._escapeHtml(name) + '" class="portrait-img portrait-round" loading="lazy">' +
          '<div class="portrait-border"></div>' +
        '</div>';
    } else if (unlocked && !avatar) {
      portraitHtml =
        '<div class="companion-portrait" style="--companion-glow: ' + theme.glow + '; --companion-accent: ' + theme.accent + ';">' +
          '<i data-lucide="user" class="portrait-icon"></i>' +
        '</div>';
    } else {
      portraitHtml =
        '<div class="companion-portrait portrait-locked">' +
          '<i data-lucide="help-circle" class="portrait-icon locked-icon"></i>' +
        '</div>';
    }

    var html =
      '<div class="companion-card' + cardLockedClass + '" data-companion-id="' + this._escapeHtml(companion.id) + '" style="animation-delay: ' + animDelay + ';">' +
        portraitHtml +
        '<div class="companion-info">' +
          '<div class="companion-name' + nameLockedClass + '">' + this._escapeHtml(name) + '</div>' +
          '<div class="companion-affection">' +
            starsHtml +
            (unlocked ? '<span class="affection-label">' + affection + '</span>' : '') +
          '</div>' +
          '<div class="companion-meta">' +
            '<span class="companion-location">' +
              '<i data-lucide="map-pin" class="location-icon"></i>' +
              this._escapeHtml(location) +
            '</span>' +
            '<span class="status-tag ' + statusClass + '">' + this._escapeHtml(status) + '</span>' +
          '</div>' +
          (unlocked ? '<div class="companion-desc">' + this._escapeHtml(background) + '</div>' : '') +
        '</div>' +
      '</div>';

    return html;
  },

  /* ======================================================================
     详情弹层 — 点击卡片展示全图 + 详细介绍
     ====================================================================== */
  _openDetail: function (companionId) {
    var meta = _charactersById[companionId];
    if (!meta) return;

    var companion = (AppState.get('companions') || []).find(function (c) { return c.id === companionId; });
    if (companion && companion.unlocked === false) return; // 未解锁角色不展示详情
    var affection = companion ? companion.affection : meta.affection;

    if (!_detailEl) this._buildDetailEl();
    if (!_detailEl) return;

    // 全图
    _detailPortraitEl.innerHTML = '';
    var img = new Image();
    img.className = 'detail-intro-img';
    img.alt = meta.name;
    img.src = meta.introImage;
    img.onerror = function () {
      _detailPortraitEl.classList.add('detail-img-missing');
      _detailPortraitEl.textContent = '图片缺失';
    };
    _detailPortraitEl.appendChild(img);

    // 文案
    var body =
      '<h2 class="detail-name">' + this._escapeHtml(meta.name) + '</h2>' +
      '<div class="detail-nicknames">' + this._escapeHtml(meta.nicknames.join(' · ')) + '</div>' +
      '<div class="detail-section"><span class="detail-label">身份</span>' + this._escapeHtml(meta.identities.join('；')) + '</div>' +
      '<div class="detail-section"><span class="detail-label">背景</span>' + this._escapeHtml(meta.background) + '</div>' +
      '<div class="detail-section"><span class="detail-label">性格</span>' + this._escapeHtml(meta.personality) + '</div>' +
      '<div class="detail-section"><span class="detail-label">外貌</span>' + this._escapeHtml(meta.appearance) + '</div>' +
      '<div class="detail-affection">当前好感度：' + affection + ' / 100</div>';
    _detailBodyEl.innerHTML = body;

    _detailEl.classList.add('active');
  },

  _buildDetailEl: function () {
    _detailEl = document.createElement('div');
    _detailEl.id = 'companion-detail';
    _detailEl.innerHTML =
      '<div class="companion-detail-backdrop"></div>' +
      '<button class="companion-detail-close" id="companion-detail-close">关闭 ✕</button>' +
      '<div class="companion-detail-portrait" id="companion-detail-portrait"></div>' +
      '<div class="companion-detail-body" id="companion-detail-body"></div>';
    document.body.appendChild(_detailEl);

    _detailPortraitEl = document.getElementById('companion-detail-portrait');
    _detailBodyEl = document.getElementById('companion-detail-body');

    var self = this;
    document.getElementById('companion-detail-close').addEventListener('click', function () {
      self._closeDetail();
    });
    _detailEl.querySelector('.companion-detail-backdrop').addEventListener('click', function () {
      self._closeDetail();
    });
  },

  _closeDetail: function () {
    if (!_detailEl) return;
    _detailEl.classList.remove('active');
    if (_detailPortraitEl) {
      _detailPortraitEl.innerHTML = '';
      _detailPortraitEl.classList.remove('detail-img-missing');
    }
    if (_detailBodyEl) _detailBodyEl.innerHTML = '';
  },

  /* ======================================================================
     _renderStars — 渲染好感度星星（SVG）
     5 颗星，每颗 20%，填充率 = affection / 100
     ====================================================================== */
  _renderStars: function (companionId, affection, unlocked) {
    var maxStars = 5;
    var totalFilled = (affection / 100) * maxStars;
    var html = '<div class="affection-stars">';

    for (var i = 0; i < maxStars; i++) {
      var fillPercent = Math.max(0, Math.min(100, Math.round((totalFilled - i) / 1 * 100)));
      var gradId = 'star-' + companionId + '-' + i;
      var fillColor = unlocked ? '#D4A574' : '#555';
      var emptyColor = unlocked ? 'rgba(85,85,85,0.4)' : 'rgba(50,50,50,0.3)';

      html +=
        '<svg class="affection-star" width="18" height="18" viewBox="0 0 24 24">' +
          '<defs>' +
            '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0%" stop-color="' + fillColor + '"/>' +
              '<stop offset="' + fillPercent + '%" stop-color="' + fillColor + '"/>' +
              '<stop offset="' + fillPercent + '%" stop-color="' + emptyColor + '"/>' +
              '<stop offset="100%" stop-color="' + emptyColor + '"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#' + gradId + ')" stroke="' + (unlocked ? '#D4A574' : '#444') + '" stroke-width="0.5"/>' +
        '</svg>';
    }

    html += '</div>';
    return html;
  },

  /* ======================================================================
     _triggerAffectionShimmer — 触发好感度变化流光动画
     ====================================================================== */
  _triggerAffectionShimmer: function (companionId) {
    var panel = document.getElementById('panel-companions');
    if (!panel) return;

    var card = panel.querySelector('.companion-card[data-companion-id="' + companionId + '"]');
    if (!card) return;

    card.classList.add('affection-shimmer');

    setTimeout(function () {
      card.classList.remove('affection-shimmer');
    }, 2000);
  },

  /* ======================================================================
     _escapeHtml — HTML 转义
     ====================================================================== */
  _escapeHtml: function (str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
```

- [x] **Step 2: `css/companions.css` 追加规则**

在文件末尾追加：

```css
/* --------------------------------------------------------------------------
   图鉴版：圆形缩略头像 + 全屏详情弹层
   -------------------------------------------------------------------------- */
.companion-portrait .portrait-round { border-radius: 50%; object-fit: cover; }

.companion-empty { padding: 40px 20px; text-align: center; color: rgba(224,224,224,.55); font-size: 14px; }

#companion-detail { position: fixed; inset: 0; z-index: 85; display: none; }
#companion-detail.active { display: block; }
.companion-detail-backdrop { position: absolute; inset: 0; background: #0a0c1c; }
.companion-detail-close { position: absolute; top: 18px; right: 22px; z-index: 4; background: rgba(18,20,42,.7); color: #F5ECD7; border: 1px solid rgba(212,165,116,.4); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.companion-detail-portrait { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding-bottom: 46%; }
.companion-detail-portrait .detail-intro-img { max-width: 92%; max-height: 52vh; object-fit: contain; border-radius: 10px; box-shadow: 0 8px 40px rgba(0,0,0,.6); display: block; }
.companion-detail-portrait.detail-img-missing { color: #F5ECD7; font-size: 14px; border: 1px dashed #D4A574; border-radius: 10px; margin: auto; width: 300px; height: 200px; }
.companion-detail-body { position: absolute; left: 0; right: 0; bottom: 0; height: 46%; background: linear-gradient(transparent, rgba(10,12,28,.88) 22%, rgba(10,12,28,.97)); padding: 16px 6% 22px; overflow-y: auto; z-index: 3; }
.companion-detail-body .detail-name { margin: 0 0 4px; font-size: 24px; color: #F5ECD7; }
.companion-detail-body .detail-nicknames { margin-bottom: 10px; font-size: 13px; color: rgba(212,165,116,.85); }
.companion-detail-body .detail-section { margin-bottom: 10px; font-size: 14px; line-height: 1.75; color: rgba(240,236,215,.92); }
.companion-detail-body .detail-label { display: inline-block; margin-right: 8px; padding: 1px 8px; border: 1px solid rgba(212,165,116,.45); border-radius: 999px; color: #D4A574; font-size: 12px; }
.companion-detail-body .detail-affection { margin-top: 6px; font-size: 13px; color: rgba(212,165,116,.9); }
```

- [x] **Step 3: Esc 关闭**

`js/app.js` 的 `_initKeyboardShortcuts`（约 900-917 行）Esc 分支中，在关闭设置面板判断（`if (self._settingsVisible) { ... }` 块）之后、`e.preventDefault(); return;` 之前插入：

```js
        // 关闭角色详情弹层
        if (CompanionsPanel._detailEl && CompanionsPanel._detailEl.classList.contains('active')) {
          CompanionsPanel._closeDetail();
          return;
        }
```

（`CompanionsPanel` 已在 app.js:13 导入，ES 模块不挂 window，直接引用模块绑定。）

- [x] **Step 4: 语法与数据校验**

```powershell
node --input-type=module --check js/companions.js
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
```
Expected: 全部 PASS。

- [x] **Step 5: 浏览器回归（关系页）**

Playwright（http://localhost:8080，复用或自起 python http.server）：
- 打开关系页（侧边栏导航或直接切 companions 视图）→ 9 张卡片渲染：名字正确、好感星数对应初始值（塞壬 40 = 2 星）、无头像图时显示 user 图标占位
- 点击「塞壬」卡片 → 全屏弹层：siren-intro.png 全图 + 昵称/身份/背景/性格/外貌各段 + 当前好感度 40/100
- 「关闭 ✕」→ 弹层关闭、回关系页状态不丢；再次点击另一角色 → 内容正确切换
- Esc 关闭、点击背景关闭都生效
- 点击「姬丝吉尔」与「璃拉」→ 两人全图相同（twins-intro.png）、文案各自不同
- 控制台无 JS 运行时错误（404 素材类预期：`assets/companions/*.png` 头像未提供）
- 截图存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-17-character-roster\task3-*.png`

- [x] **Step 6: 提交**

```bash
git add js/companions.js css/companions.css js/app.js
git commit -m "feat: 关系页图鉴化（圆形缩略 + 点击全屏介绍图与详情）"
```

---

### Task 4: 整体回归验收 + 清理检查

**Files:**
- 无新增；修回归中发现的问题（如有）

**Interfaces:**
- Consumes: Task 1-3 全部产物

- [x] **Step 1: 全部校验脚本**

```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
```
Expected: 三个都 PASS。

- [x] **Step 2: 旧阵容零残留检查**

Run（PowerShell）：
```powershell
Select-String -Path js\*.js,scripts\*.mjs,css\*.css -Pattern "baiyue|linyi|liuyue|suyun|白月|林仪|柳月|苏昀|艾克利西娅"
Select-String -Path assets\companions -Pattern ".*" | Select-Object -First 5
```
Expected: 第一行 0 匹配（`艾克利西娅` 旧名拼写也应零残留，新名「艾克利西亚」不带「娅」）；第二行仅列新介绍图文件。注意旧 id `sairen` 若在代码中被引用也视为残留（新 id 是 `siren`）。

- [x] **Step 3: 浏览器全流程回归（Playwright）**

- 新游戏 → 转场 → 场景无角色头像残留（场景角色已清空）
- 关系页：9 卡片、详情弹层全流程（Task 3 清单复验）
- 好感度变化流光不回归（手动改 localStorage 或触发对话）
- 场景漫游 16 节点：出口连通、物件热点正常（无角色引用后无回归）
- 存档/读档：关系页与场景状态一致恢复
- 移动端 375×667：详情弹层全图不溢出、文案区可滚动
- 控制台无 JS 运行时错误
- 截图存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-17-character-roster\task4-*.png`

- [x] **Step 4: 提交（仅当有修复）**

```bash
git add <仅本计划相关修复文件，逐个列出>
git commit -m "fix: 角色阵容/图鉴回归修复"
```

---

## 验收标准（全部完成 = 本计划完成）

1. `data/characters.json` 含世界书 9 人完整 SFW 图鉴数据；`node scripts/validate-characters.mjs` PASS
2. `CHARACTERS` 为 9 人新 roster；16 场景角色引用清空；旧 id/旧名全库零残留
3. 关系页 9 卡片（缩略头像占位 + 名字 + 好感星）；点击 → 全屏详情弹层（介绍全图 + 昵称/身份/背景/性格/外貌 + 好感度）；Esc/背景/关闭按钮三路关闭
4. 姬丝吉尔与璃拉详情共用 twins-intro.png，文案各自独立
5. 三个校验脚本全 PASS；无 JS 运行时错误；存档/读档、移动端视口、好感度流光无回归
6. 旧素材已备份至 `.superpowers/import-backups/old-assets/` 并移出工作树

# 头像浮层 + 全屏特写交互重构 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 场景内角色呈现从全身立绘合成层改为站位浮层头像，点击头像进入全屏脸部特写对话视图；删除「提出决斗」按钮。

**Architecture:** 纯前端重构（无构建系统、无包管理）：场景层渲染头像按钮（复用 `closeup-open` 事件契约），特写层从叠层改为全屏视图（对外 API 不变，对话引擎挂载点 `#closeup-dialog` 不动）。素材走降级链：`neutral.png` → `fullbody.png` → 「立绘缺失」占位。

**Tech Stack:** 原生 ES Modules JavaScript、CSS、Node v24（校验脚本）、ComfyUI（素材由用户生成，不在本计划内执行）

## Global Constraints

- 项目根目录：`C:\Users\Administrator\each-dawm-`（所有相对路径以此为根）
- 无 package.json / 无测试框架：自动化检查 = node 断言脚本（`scripts/*.mjs`）；UI 行为 = 浏览器人工回归清单
- 表情差分本轮不做：`emotionFile` 协议与 `closeup` 状态字段必须保留；本轮只有 `neutral.png` 有图
- 头像/特写图统一用 `assets/characters/<id>/neutral.png`（用户稍后提供）；`CHARACTERS.portrait` 指向它
- 降级链：`neutral.png` 缺失 → `assets/characters/<id>/fullbody.png`（路径硬编码，不依赖数据字段）→ 皆无则「立绘缺失」文案
- `CHARACTERS` 删除 `fullbody` 字段；磁盘上的 fullbody 文件**保留不动**
- 头像锚点 = `(spot.x, spot.y − 0.12)`（下界夹到 0），圆心定位 `translate(-50%, -50%)`；头像尺寸 = `15vh × spot.scale`（scale 缺省 0.85）
- 点击头像沿用 `closeup-open` CustomEvent（`{ detail: { characterId } }`），app.js:104 的监听不动
- `CloseupView` 对外 API 不变：`init / open / close / setEmotion / getDialogEl`；`#closeup-dialog` 元素 id 保留（event.js:267 挂载点）
- 删除：「提出决斗」按钮（closeup.js）、`closeup-duel` 监听（app.js:110-112）、`triggerDuelByButton`（event.js:670-681）。`_launchBattle` 保留（event.js:608 对战卡片路径仍调用）
- 校验脚本**不做文件存在性检查**（用户图未到位前不阻塞）
- 注释/命名沿用现有中文注释风格与 `_` 前缀私有函数约定

---

### Task 1: 数据模型 — `portrait` 字段 + 头像锚点纯函数 + 校验

**Files:**
- Modify: `js/scenes-data.js`（CHARACTERS 表 + 新增 `avatarAnchor`）
- Modify: `scripts/validate-scenes.mjs`（新增检查）

**Interfaces:**
- Consumes: 无（本计划第一个任务）
- Produces: `CHARACTERS[<id>].portrait`（字符串，`assets/characters/<id>/neutral.png`）；`avatarAnchor(spot)` → `{ x: number, y: number }`（Task 2 使用）

- [ ] **Step 1: 先改校验脚本（测试先失败）**

`scripts/validate-scenes.mjs` 顶部 import 行改为：

```js
import { SCENES, CHARACTERS, EMOTION_LIST, getScene, emotionFile, avatarAnchor } from '../js/scenes-data.js';
```

在 `if (EMOTION_LIST.length !== 8)` 之前插入：

```js
// CHARACTERS 字段：portrait 路径合法 + fullbody 已删除
for (const [cid, meta] of Object.entries(CHARACTERS)) {
  const want = `assets/characters/${cid}/neutral.png`;
  if (!meta.portrait || meta.portrait !== want) errors.push(`${cid}: portrait 应为 ${want}`);
  if ('fullbody' in meta) errors.push(`${cid}: fullbody 字段应已删除`);
}
// avatarAnchor 纯函数：站位上抬 12%，y 下界夹 0
const anchor = avatarAnchor({ x: 0.5, y: 0.5, scale: 0.8 });
if (anchor.x !== 0.5 || Math.abs(anchor.y - 0.38) > 1e-9) errors.push(`avatarAnchor 计算错误: ${JSON.stringify(anchor)}`);
const anchorLow = avatarAnchor({ x: 0.3, y: 0.05 });
if (anchorLow.y !== 0) errors.push(`avatarAnchor 应夹到 0: ${JSON.stringify(anchorLow)}`);
```

- [ ] **Step 2: 运行验证失败**

Run: `node scripts/validate-scenes.mjs`
Expected: FAIL，报 `avatarAnchor is not a function`（ImportError）

- [ ] **Step 3: 改 `js/scenes-data.js`**

`CHARACTERS` 表整体替换为：

```js
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
```

- [ ] **Step 4: 运行验证通过**

Run: `node scripts/validate-scenes.mjs`
Expected: PASS（注意：`js/scene.js:55` 仍引用 `meta.fullbody`，此时浏览器会坏，属预期中间态，Task 2 修复）

- [ ] **Step 5: 提交**

```bash
git add js/scenes-data.js scripts/validate-scenes.mjs
git commit -m "feat: CHARACTERS 改 portrait 字段 + avatarAnchor 纯函数 + 校验增强"
```

---

### Task 2: 场景头像层 — `scene.js` 重写角色渲染 + `scene.css` 头像样式

**Files:**
- Modify: `js/scene.js`（`_renderCharacters` → `_renderAvatars`；两处调用点更新）
- Modify: `css/scene.css`（`.scene-sprite*` 样式块替换为 `.scene-avatar*`）

**Interfaces:**
- Consumes: `CHARACTERS[<id>].portrait`、`avatarAnchor(spot)`（Task 1）；`closeup-open` 事件契约（既有）
- Produces: 场景内 `.scene-avatar` 元素（点击派发 `closeup-open`）；`SceneView.renderCharacters()` 公共方法保留（内部改调 `_renderAvatars`）

- [ ] **Step 1: 改 `js/scene.js`**

`_renderCharacters` 函数整体替换为（函数名改为 `_renderAvatars`）：

```js
function _renderAvatars(scene) {
  const layer = document.getElementById('scene-character-layer');
  layer.innerHTML = '';
  const sc = AppState.get('sceneCharacters') || {};
  for (const charId of scene.characters) {
    const meta = CHARACTERS[charId];
    const st = sc[charId];
    if (!meta || !st || !st.present) continue;
    const spot = (scene.characterSpots || {})[charId];
    if (!spot) continue;
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
    img.onerror = () => { div.classList.add('avatar-missing'); img.remove(); };
    div.appendChild(img);
    div.insertAdjacentHTML('beforeend', `<span class="avatar-name">${meta.name}</span>`);
    div.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: charId } }));
    });
    layer.appendChild(div);
  }
}
```

`renderCharacters()` 方法与 `showScene()` 内的 `_renderCharacters(scene)` 调用点同步改为 `_renderAvatars(scene)`（共 2 处：scene.js:86 与 scene.js:104 附近）。

- [ ] **Step 2: 改 `css/scene.css`**

`.scene-sprite` 相关 4 条规则（`.scene-sprite`、`.scene-sprite .sprite-img`、`.scene-sprite .sprite-shadow`、`.scene-sprite .sprite-name`、`.scene-sprite:hover ...`、`.scene-sprite.sprite-missing`）整体替换为：

```css
.scene-character-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
.scene-avatar { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; cursor: pointer; width: var(--avatar-size, 13vh); height: var(--avatar-size, 13vh); transition: transform .2s; }
.scene-avatar .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; border: 2px solid rgba(212,165,116,.85); display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,.5)); }
.scene-avatar .avatar-name { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); padding: 2px 10px; border-radius: 999px; background: rgba(18,20,42,.75); color: #F5ECD7; font-size: 12px; white-space: nowrap; }
.scene-avatar:hover { transform: translate(-50%, -50%) scale(1.1); }
.scene-avatar:hover .avatar-img { filter: drop-shadow(0 0 14px rgba(212,165,116,.9)) drop-shadow(0 4px 10px rgba(0,0,0,.5)); }
.scene-avatar.avatar-missing { display: flex; align-items: center; justify-content: center; background: rgba(18,20,42,.6); border: 1px dashed #D4A574; border-radius: 50%; color: #F5ECD7; font-size: 12px; text-align: center; }
```

- [ ] **Step 3: 数据校验**

Run: `node scripts/validate-scenes.mjs`
Expected: PASS

- [ ] **Step 4: 浏览器回归（头像层）**

启动前端（任选其一，分离进程）：
```powershell
Start-Process python -ArgumentList "-m","http.server","8080" -WorkingDirectory "C:\Users\Administrator\each-dawm-" -NoNewWindow
```
浏览器打开 `http://localhost:8080`，检查：
- `home_living`：白月、塞壬两个圆形头像出现在站位上方（约 y−12% 处），下方有名字标签
- 依次走遍 8 个有角色的场景（home_living / home_bed / home_door / company_cubicle / company_office / food_bunshop / market_hall / mall_dessert），头像位置/大小正常
- 悬停头像：放大 1.1 倍 + 金色光晕
- 图未到位期间：头像应显示虚线圆形占位 + 名字（`avatar-missing`）
- 无角色场景（如 cardshop_inside）：无头像残留

- [ ] **Step 5: 提交**

```bash
git add js/scene.js css/scene.css
git commit -m "feat: 场景角色改为站位浮层头像（点击沿用 closeup-open）"
```

---

### Task 3: 全屏特写视图 — `closeup.js` 重写 + `closeup.css` 重写

**Files:**
- Modify: `js/closeup.js`（整体重写，删除决斗按钮）
- Modify: `css/closeup.css`（整体重写）

**Interfaces:**
- Consumes: `emotionFile(charId, emotion)`（既有）；Task 2 的头像点击 → `closeup-open` → app.js:104 `CloseupView.open`
- Produces: 全屏视图；对外 API 不变：`open / close / setEmotion / getDialogEl`；`#closeup-dialog` 供 event.js:267 挂载对话引擎

- [ ] **Step 1: 重写 `js/closeup.js`**

文件整体替换为：

```js
// 全屏特写视图：脸部特写图居中 + 底部对话区（对话引擎挂载 #closeup-dialog，对外 API 不变）
// 降级链：neutral.png（emotionFile）→ fullbody.png（路径硬编码）→ 「立绘缺失」占位
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';

let _charId = null;

function _fullbodyFallbackPath(charId) {
  return `assets/characters/${charId}/fullbody.png`;
}

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <div class="closeup-dialog" id="closeup-dialog"></div>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
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
    const tryFullbody = () => {
      const fb = new Image();
      fb.src = _fullbodyFallbackPath(_charId);
      fb.onerror = () => { el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
      el.appendChild(fb);
    };
    const img = new Image();
    img.src = emotionFile(_charId, emotion);
    img.onerror = tryFullbody;
    el.appendChild(img);
    AppState.set('closeup', { active: true, characterId: _charId, emotion });
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};
```

- [ ] **Step 2: 重写 `css/closeup.css`**

文件整体替换为：

```css
/* 全屏特写视图：不透明全屏层，脸部特写图居中铺满，底部渐变对话区 */
#closeup-overlay { position: fixed; inset: 0; z-index: 90; display: none; }
#closeup-overlay.active { display: block; }
.closeup-backdrop { position: absolute; inset: 0; background: #0a0c1c; }
.closeup-portrait { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.closeup-portrait img { width: 100vw; height: 100vh; object-fit: cover; display: block; }
.closeup-portrait.sprite-missing { width: 240px; height: 340px; margin: auto; border: 1px dashed #D4A574; background: rgba(18,20,42,.6); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #F5ECD7; }
.closeup-header { position: absolute; top: 22px; left: 0; right: 0; text-align: center; z-index: 3; color: #F5ECD7; }
.closeup-header .char-name { font-size: 22px; text-shadow: 0 2px 8px rgba(0,0,0,.8); }
.closeup-close { position: absolute; top: 18px; right: 22px; z-index: 4; background: rgba(18,20,42,.7); color: #F5ECD7; border: 1px solid rgba(212,165,116,.4); border-radius: 8px; padding: 6px 14px; cursor: pointer; }
.closeup-dialog { position: absolute; left: 0; right: 0; bottom: 0; height: 42%; background: linear-gradient(transparent, rgba(10,12,28,.85) 30%, rgba(10,12,28,.95)); padding: 24px 5%; display: flex; flex-direction: column; z-index: 3; }
```

- [ ] **Step 3: 浏览器回归（特写视图）**

- 点击场景头像 → 全屏特写出现：背景完全不透明（看不见场景）、无「提出决斗」按钮
- 图未到位期间：特写区应显示 fullbody.png 兜底（`assets/characters/<id>/fullbody.png` 存在于磁盘）；fullbody 也删掉的话应显示「立绘缺失」占位
- 底部对话区出现对话引擎（EventPanel.init 懒初始化）与输入框
- 「关闭 ✕」→ 回到场景视图，场景状态（当前场景、头像）不丢
- 快速连点两个不同头像 → 特写显示最后一次点击的角色

- [ ] **Step 4: 提交**

```bash
git add js/closeup.js css/closeup.css
git commit -m "feat: 特写层改全屏视图（居中图 + 底部对话 + fullbody 降级链），删除提出决斗按钮"
```

---

### Task 4: 决斗按钮链路清理 — `app.js` + `event.js`

**Files:**
- Modify: `js/app.js`（删 `closeup-duel` 监听，app.js:109-112）
- Modify: `js/event.js`（删 `triggerDuelByButton`，event.js:670-681）

**Interfaces:**
- Consumes: 无
- Produces: 无新增；确保 `_launchBattle` 仍有调用者（event.js:608 对战卡片按钮路径，**不得删除**）

- [ ] **Step 1: 删 `js/app.js` 监听块**

删除以下整块（含注释）：

```js
    // 16.8 「⚔ 提出决斗」按钮 → 以当前特写角色为对手直接启动对战
    window.addEventListener('closeup-duel', function (e) {
      EventPanel.triggerDuelByButton(e.detail.characterId);
    });
```

- [ ] **Step 2: 删 `js/event.js` 死代码**

删除 `triggerDuelByButton` 整个方法（含上方 JSDoc 注释，约 event.js:670-681）：

```js
  /**
   * 公共 API — 「⚔ 提出决斗」按钮触发
   * 以当前特写角色为对手（卡组取 companions 绑定），跳过对战卡片直接启动
   * @param {string} characterId - 特写角色 id（如 'baiyue'）
   */
  triggerDuelByButton(characterId) {
    var meta = CHARACTERS[characterId] || null;
    var opponentName = meta ? meta.name : characterId;
    var opponent = this._resolveBattleOpponent(opponentName);
    console.log('[EventPanel] triggerDuelByButton: opponent =', opponent.name, '| deck =', opponent.deck);
    this._launchBattle(null, opponent.name);
  },
```

- [ ] **Step 3: 引用检查**

Run（PowerShell）：
```powershell
Select-String -Path js\*.js -Pattern "closeup-duel|triggerDuelByButton" | Measure-Object
```
Expected: 0 条匹配。

再确认 `_launchBattle` 仍有调用者：
```powershell
Select-String -Path js\event.js -Pattern "_launchBattle\("
```
Expected: 至少 2 处（event.js:608 附近的对战卡片按钮 + 方法定义本身）。

- [ ] **Step 4: 浏览器烟测（对话链路）**

- 点头像进特写 → 对话引擎渲染、输入框存在
- 输入框发送任意文本 → 若 bridge 未配 API key，报错提示优雅出现（对话区不白屏、页面不崩）
- 对战卡片路径本轮无法真机验证（属 Task 12 遗留：本地 YGOPro 服务端已编译，需配 key 后补验）

- [ ] **Step 5: 提交**

```bash
git add js/app.js js/event.js
git commit -m "refactor: 删除提出决斗按钮链路（closeup-duel 监听 + triggerDuelByButton 死代码）"
```

---

### Task 5: 整体回归验收

**Files:**
- 无新增；修回归中发现的问题（如有）

**Interfaces:**
- Consumes: Task 1-4 全部产物

- [ ] **Step 1: 全部校验脚本**

```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
```
Expected: 两个都 PASS

- [ ] **Step 1b: bridge 协议冒烟（条件执行，非阻塞）**

若 bridge 已在 9999 端口运行（`server\start.bat` 或 `python server/bridge.py`）：
```powershell
python -X utf8 scripts/smoke-bridge-emotion.py
```
Expected: PASS（本机无 API key 时验证 502 错误路径形状 + split_emotion 单元测试，属预期行为）。bridge 未运行则跳过并在验收记录注明 —— 对话链路代码本轮零改动，此冒烟只作协议回归佐证。

- [ ] **Step 2: 场景漫游回归**

浏览器逐场景走查 16 节点：出口连通与方向、物件 ✦ 热点描述、旁白字幕出现/消退；重点确认头像层与出口/物件/字幕互不遮挡（z-index 层级无回归）。

- [ ] **Step 3: 存档恢复回归**

- 在特写打开状态下：手动保存 → 刷新页面 → 读档
- Expected: closeup 状态恢复一致（若存档时特写打开，恢复后特写层不残留、场景回到存档场景）

- [ ] **Step 4: 移动端视口回归**

DevTools 切 iPhone SE (375×667) 或类似小屏：全屏特写图铺满不拉伸变形（object-fit: cover）、底部对话区可用、头像浮层在场景内位置正常（15vh 尺寸合理、不溢出画面）。

- [ ] **Step 5: 提交（仅当有修复）**

```bash
git add -A
git commit -m "fix: 头像/特写回归修复"
```

---

### Task 6: 用户特写图集成（阻塞项：等用户 ComfyUI 出图）

**Files:**
- 新增素材：`assets/characters/<id>/neutral.png` × 6（用户生成的 1216×832 脸部特写）
- 无代码变更（若 6 张全部到位后浏览器效果与预期不符，再小修 CSS）

**Interfaces:**
- Consumes: 用户提供的图片文件路径（6 张，中性表情，脸部居中，1216×832）
- Produces: `CHARACTERS[<id>].portrait` 指向的文件落盘

- [ ] **Step 1: 接收用户图片并落盘**

用户提供文件路径后（例如 `Desktop\场景审查\特写_xxx.png`），逐角色复制：
```powershell
Copy-Item "<用户给的路径>" "C:\Users\Administrator\each-dawm-\assets\characters\<id>\neutral.png"
```
并同步复制到桌面审查目录 `C:\Users\Administrator\Desktop\场景审查\`（命名 `特写_<id>.png`）。

- [ ] **Step 2: 校验 + 浏览器确认**

```powershell
node scripts/validate-scenes.mjs
```
Expected: PASS；浏览器确认 6 角色头像圆形裁剪效果（脸部居中不切眼睛）与全屏特写显示效果。

- [ ] **Step 3: 提交**

```bash
git add assets/characters/*/neutral.png
git commit -m "assets: 6 角色脸部特写（用户 ComfyUI 生成）"
```

---

## 验收标准（全部完成 = 本计划完成）

1. 16 场景漫游无回归；8 个有角色场景显示站位浮层头像；点击头像进入全屏特写
2. 特写视图：全屏不透明、图居中、底部名字/对话/输入框；无「提出决斗」按钮
3. 决斗入口只剩输入框路径；`_launchBattle` 链路代码未受损
4. `node scripts/validate-scenes.mjs` 与 `node scripts/validate-emotion.mjs` 全 PASS
5. 存档恢复、移动端视口回归通过
6. 表情差分、场景 CG、全身立绘合成未引入任何新代码

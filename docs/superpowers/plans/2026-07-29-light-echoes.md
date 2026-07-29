# 光之回响 — 文字冒险 × 卡牌对战 Web 前端原型 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 Ori 空灵森林美学风格的文字冒险+卡牌对战 Web 前端 SPA，包含 7 个主界面 + 全屏对战舞台 + 通知系统 + 粒子系统，纯 HTML/CSS/JS 无框架。

**Architecture:** 单页应用 (SPA)，index.html 为入口加载所有 CSS/JS 模块。左侧固定竖排侧边栏导航，主内容区通过 CSS 显隐切换 5 个标签页 + 2 个覆盖层（标题界面、对战舞台）。全局状态对象驱动 UI 更新，localStorage 持久化存档/卡组/设置。CSS 变量统一管理色彩/间距/动效参数。

**Tech Stack:** 纯 HTML5 + CSS3 + Vanilla JS (ES6+ 模块)，Lucide Icons (CDN)，Google Fonts (霞鹜文楷/思源黑体/Cinzel/Inter)，无构建工具，浏览器直接打开。

## Global Constraints

- 纯 HTML/CSS/JS，无框架，无构建工具，ES 模块直接在浏览器运行
- 所有 UI 文本使用中文（LOGO 和纯视觉元素除外）
- 禁止：emoji、浏览器默认字体、浏览器原生 alert/confirm/prompt
- 图标使用 Lucide Icons (lucide.dev)，通过 CDN 加载
- 字体：霞鹜文楷(LXGW WenKai) 正文、思源黑体(Noto Sans SC) UI、Cinzel 英文标题、Inter 英文正文
- 色彩：主色调灵火蓝 #4FC3F7、Spirit Green #81C784、暖金辉 #FFD54F
- 通知系统内置化，从右上角滑入堆叠
- 文件全部存放于 K:\codex\ 目录下
- 语义化 HTML5，交互元素必须有唯一 ID
- 性能：CSS 动画用 transform/opacity GPU 加速，非当前标签懒初始化
- 粒子效果：CSS animation 为主，仅战斗关键特效可用 Canvas

---

### Task 1: 项目脚手架 + CSS 基础体系

**Files:**
- Create: `K:\codex\index.html` (骨架)
- Create: `K:\codex\css\base.css`

**Interfaces:**
- Produces: CSS 变量体系（所有后续 CSS 文件依赖）
  - `--color-spirit-blue: #4FC3F7`
  - `--color-spirit-green: #81C784`
  - `--color-warm-gold: #FFD54F`
  - `--color-bg-deep: #0a0d14`
  - `--color-bg-panel: rgba(10,13,20,0.85)`
  - `--color-border-glow: rgba(79,195,247,0.3)`
  - `--color-rarity-common: #9e9e9e`
  - `--color-rarity-rare: #4FC3F7`
  - `--color-rarity-epic: #ab47bc`
  - `--color-rarity-legendary: #FFD54F`
  - `--font-body: 'LXGW WenKai', serif`
  - `--font-ui: 'Noto Sans SC', sans-serif`
  - `--font-title: 'Cinzel', serif`
  - `--font-en: 'Inter', sans-serif`
  - `--transition-fast: 150ms ease-out`
  - `--transition-normal: 250ms ease-out`
  - `--transition-slow: 400ms cubic-bezier(0.4,0,0.2,1)`
  - `--glow-sm: 0 0 8px`
  - `--glow-md: 0 0 16px`
  - `--glow-lg: 0 0 32px`
  - `--radius-sm: 6px`
  - `--radius-md: 12px`
  - `--radius-lg: 20px`

- [ ] **Step 1: 创建 index.html 骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>光之回响 — 文字冒险 × 卡牌对战</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500&family=LXGW+WenKai:wght@300;400;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="css/base.css">
  <!-- 后续 CSS 在此添加 -->
</head>
<body>
  <!-- 标题界面 -->
  <div id="title-screen"></div>
  <!-- 侧边栏 -->
  <nav id="sidebar"></nav>
  <!-- 主内容区 -->
  <main id="main-content"></main>
  <!-- 对战舞台覆盖层 -->
  <div id="battle-overlay"></div>
  <!-- 设置面板模态框 -->
  <div id="settings-modal"></div>
  <!-- 通知层 -->
  <div id="notification-container"></div>
  <!-- 粒子 Canvas -->
  <canvas id="particles-canvas"></canvas>
  <!-- 自定义右键菜单 -->
  <div id="context-menu"></div>
  <!-- JS 模块 -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 base.css — CSS 重置 + 变量 + 基础排版**

编写完整的 `css/base.css`，包含：
1. CSS 自定义属性（`:root` 块，包含上述所有变量）
2. CSS Reset（`*, *::before, *::after { box-sizing, margin, padding }`）
3. `body` 基础样式：`background: var(--color-bg-deep); color: #e0e0e0; font-family: var(--font-body); overflow: hidden;`
4. 全局滚动条样式（细窄，半透明蓝辉色）
5. `::selection` 样式（灵火蓝背景 + 深色文字）
6. 通用工具类：`.glow-text` (文字发光), `.glow-border` (边框发光), `.panel` (半透明面板), `.btn-primary`, `.btn-secondary`
7. `.panel` 样式：`background: var(--color-bg-panel); border: 1px solid var(--color-border-glow); border-radius: var(--radius-md); backdrop-filter: blur(12px);`
8. `.btn-primary` 样式：金色辉光边框 + hover 缩放
9. 隐藏类 `.hidden { display: none !important; }`
10. `@keyframes fadeIn`, `@keyframes slideInRight`, `@keyframes pulse`, `@keyframes float` 基础动画

- [ ] **Step 3: 验证** — 在浏览器打开 index.html，DevTools 检查无 404 错误，CSS 变量可在 Elements 面板中查看。body 背景为深色。

- [ ] **Step 4: 提交**

```bash
git add index.html css/base.css
git commit -m "feat: 项目脚手架 + CSS 基础变量体系"
```

---

### Task 2: 全局状态管理 + localStorage 持久化

**Files:**
- Create: `K:\codex\js\state.js`
- Create: `K:\codex\js\storage.js`

**Interfaces:**
- Produces: `AppState` 对象，`StorageManager` 对象
  - `AppState` 属性：`currentView`, `player.lp`, `player.name`, `player.spiritGems`(灵辉), `gamePhase`, `narrativeHistory[]`, `companions[]`, `decks[]`, `activeDeckId`, `inventory[]`, `mapNodes[]`, `settings`
  - `AppState.subscribe(key, callback)` — 注册状态变更监听器
  - `AppState.set(key, value)` — 更新状态并触发回调
  - `StorageManager.save(state)` — 全量保存到 localStorage
  - `StorageManager.load()` → state | null — 从 localStorage 加载
  - `StorageManager.clear()` — 清除存档

- [ ] **Step 1: 创建 js/state.js — 响应式状态管理**

编写 `js/state.js`：
1. 创建 `AppState` 对象，包含默认初始状态：
   - `currentView: 'title'` (可选值: 'title', 'event', 'inventory', 'deck', 'companions', 'map')
   - `player: { name: '旅人', lp: 8000, maxLp: 8000, spiritGems: 1280 }`
   - `gamePhase: { chapter: 1, scene: 1, totalScenes: 15 }`
   - `narrativeHistory: []` — 消息对象 `{role: 'narrator'|'player', text: string, timestamp}`
   - `companions: [{id, name, affection, location, status, unlocked, background}]` — 4个预设伙伴
   - `decks: [{id, name, mainCards[], extraCards[], sideCards[]}]` — 预设2个卡组
   - `activeDeckId: null`
   - `inventory: [{id, name, type, rarity, count, effect}]` — 预设8个物品
   - `mapNodes: [{id, name, type, x, y, status, connections[]}]` — 预设12个地图节点
   - `settings: { textSpeed: 'normal', animationIntensity: 'standard', bgmVolume: 0.7, sfxVolume: 0.8, cardAnimSpeed: 'normal' }`
   - `notifications: []`
2. 实现 `AppState._subscribers = {}` — `{key: Set<callback>}`
3. 实现 `AppState.subscribe(key, callback)` — 注册监听器，返回取消订阅函数
4. 实现 `AppState.get(key)` — 返回深拷贝
5. 实现 `AppState.set(key, value)` — 设置值，触发对应 key 的所有回调 `callback(value, oldValue)`
6. 实现 `AppState.push(key, item)` — 数组追加
7. 实现 `AppState.reset()` — 恢复默认状态
8. 导出 `AppState` 为全局单例

- [ ] **Step 2: 创建 js/storage.js — localStorage 持久化**

编写 `js/storage.js`：
1. `const STORAGE_KEY = 'light-echoes-save'`
2. `export const StorageManager = { save(state) { ... }, load() { ... }, clear() { ... }, hasSave() { ... } }`
3. `save(state)`: 序列化 `{player, gamePhase, companions, decks, activeDeckId, inventory, mapNodes, settings, timestamp}` 到 localStorage
4. `load()`: 反序列化，返回 state 对象或 null（无存档/解析失败）
5. `hasSave()`: 检查 localStorage 中是否存在存档 key
6. `clear()`: 删除存档 key

- [ ] **Step 3: 验证** — 在浏览器 console 中：`import('./js/state.js').then(m => { m.AppState.set('currentView', 'event'); console.log(m.AppState.get('currentView')); })` 输出 `'event'`。测试 `StorageManager.save()` 和 `StorageManager.load()` 往返。

- [ ] **Step 4: 提交**

```bash
git add js/state.js js/storage.js
git commit -m "feat: 全局状态管理 + localStorage 持久化"
```

---

### Task 3: 应用初始化 + 导航路由 + 侧边栏

**Files:**
- Create: `K:\codex\js\app.js`
- Create: `K:\codex\js\navigation.js`
- Create: `K:\codex\css\sidebar.css`

**Interfaces:**
- Consumes: `AppState` (from state.js), `StorageManager` (from storage.js)
- Produces: `App.init()` 全局入口；`Navigation.navigateTo(view)` 切换视图；`Navigation.updateBadges()` 更新角标
- 注册 5 个视图路由：`event`, `inventory`, `deck`, `companions`, `map`

- [ ] **Step 1: 创建 css/sidebar.css**

编写侧边栏样式：
1. `#sidebar`: `position: fixed; left: 0; top: 0; bottom: 0; width: 64px;` 展开时 `width: 180px; transition: width var(--transition-normal); z-index: 100; background: var(--color-bg-panel); border-right: 1px solid var(--color-border-glow);`
2. 图标容器 `.nav-item`: `width: 48px; height: 48px; margin: 8px auto; border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast); display: flex; align-items: center; justify-content: center; position: relative;`
3. `.nav-item:hover`: 背景半透明蓝辉 + 外发光 `box-shadow: 0 0 12px rgba(79,195,247,0.4)`
4. `.nav-item.active`: 左侧有 3px 宽的金色竖条指示器 `::before { content: ''; position: absolute; left: 0; top: 25%; height: 50%; width: 3px; background: var(--color-warm-gold); border-radius: 0 2px 2px 0; box-shadow: var(--glow-sm) var(--color-warm-gold); }`
5. `.nav-label`: 图标旁的标签文字，侧边栏收起时 `opacity: 0; width: 0;`，展开时 `opacity: 1`
6. 新内容角标 `.nav-badge`: 金色小圆点，`width: 8px; height: 8px; border-radius: 50%; background: var(--color-warm-gold); position: absolute; top: 8px; right: 8px; box-shadow: var(--glow-sm) var(--color-warm-gold);`
7. 设置按钮：`position: absolute; bottom: 16px;`

- [ ] **Step 2: 创建 js/navigation.js**

编写导航逻辑：
1. `export const Navigation = { ... }`
2. `views` 常量数组：`[{id:'event', icon:'message-circle', label:'事件'}, {id:'inventory', icon:'backpack', label:'背包'}, {id:'deck', icon:'cards', label:'卡组'}, {id:'companions', icon:'users', label:'伙伴'}, {id:'map', icon:'map', label:'地图'}]`
3. `init()`: 渲染侧边栏 DOM（读取 views 数组生成 `.nav-item` 元素，使用 Lucide icons 的 `data-icon` 属性），绑定点击事件，调用 `lucide.createIcons()`
4. `navigateTo(viewId)`: 设置 `AppState.set('currentView', viewId)`，更新 active 样式类，隐藏所有主内容面板，显示目标面板 `#panel-${viewId}`
5. `updateBadges()`: 检查 inventory 新物品、deck 新卡牌，更新对应图标的角标显示
6. 侧边栏 hover 展开/收起逻辑：`mouseenter` 添加 `.expanded` 类，`mouseleave` 移除

- [ ] **Step 3: 创建 js/app.js — 应用入口**

编写应用初始化：
1. `import { AppState } from './state.js'`
2. `import { StorageManager } from './storage.js'`
3. `import { Navigation } from './navigation.js'`
4. `export const App = { async init() { ... } }`
5. `init()` 流程：
   a. 检查 `StorageManager.hasSave()` — 有存档则预填 AppState
   b. 初始化粒子 Canvas（调用 `initParticles()` — Task 14 实现）
   c. 渲染所有面板的 HTML 结构（调用各模块的 `render()` 方法）
   d. 调用 `Navigation.init()` 构建侧边栏
   e. 注册视图切换：`AppState.subscribe('currentView', Navigation.navigateTo)`
   f. 调用 `lucide.createIcons()` 渲染所有图标
   g. 如果无存档显示标题界面，有存档显示 `#panel-event`
6. `document.addEventListener('DOMContentLoaded', () => App.init())`

- [ ] **Step 4: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/sidebar.css">` 到 `<head>`

- [ ] **Step 5: 验证** — 浏览器打开 index.html，侧边栏渲染 5 个图标 + 底部齿轮。悬浮图标有光晕效果。点击切换 active 状态。

- [ ] **Step 6: 提交**

```bash
git add js/app.js js/navigation.js css/sidebar.css index.html
git commit -m "feat: 应用初始化 + 侧边栏导航 + 路由系统"
```

---

### Task 4: 粒子系统 + 标题界面

**Files:**
- Create: `K:\codex\js\particles.js`
- Create: `K:\codex\js\title.js`
- Create: `K:\codex\css\title.css`

**Interfaces:**
- Consumes: `AppState` (from state.js)
- Produces: `Particles.init()` 全局粒子；`TitleScreen.init()` 标题界面逻辑

- [ ] **Step 1: 创建 js/particles.js**

编写粒子系统：
1. `export const Particles = { ... }`
2. 全局浮动粒子（CSS 驱动）：
   - 在 `#particles-canvas` 下层创建 `<div id="ambient-particles">` 
   - 生成 20 个 `.particle-dot` 元素，每个随机位置、大小(2-6px)、动画延迟、浮动半径
   - CSS `@keyframes float-particle`：`0%{transform:translate(0,0) scale(1);opacity:0.3} 50%{transform:translate(var(--dx),var(--dy)) scale(1.5);opacity:0.8} 100%{transform:translate(0,0) scale(1);opacity:0.3}`
   - 每个粒子通过 CSS 自定义属性 `--dx`, `--dy`, `--duration`, `--delay` 实现随机轨迹
   - 颜色随机选择灵火蓝或暖金辉
3. Canvas 战斗粒子（预留）：`spawnBattleParticles(x, y, count, color)` — 在指定坐标生成短暂粒子爆发
4. `init()`: 创建环境粒子 DOM，启动 CSS 动画

- [ ] **Step 2: 创建 css/title.css**

编写标题界面样式：
1. `#title-screen`: `position: fixed; inset: 0; z-index: 1000; background: radial-gradient(ellipse at center, #0d1520 0%, #060a10 70%); display: flex; flex-direction: column; align-items: center; justify-content: center;`
2. 标题光环装饰：`#title-screen::before` — 中央大型径向渐变光晕 `radial-gradient(circle, rgba(79,195,247,0.1) 0%, transparent 60%)`
3. `.title-logo`: 手写体中文字 "光之回响"，`font-family: var(--font-body); font-size: 4rem; color: var(--color-warm-gold); animation: float 4s ease-in-out infinite; text-shadow: 0 0 40px rgba(255,213,79,0.4), 0 0 80px rgba(255,213,79,0.2);`
4. `.title-subtitle`: 副标题 "文字冒险 × 卡牌对战"，`font-size: 1.1rem; color: rgba(79,195,247,0.7); letter-spacing: 0.3em; margin-top: 8px;`
5. `.title-btn`: 菜单按钮样式 — 半透明面板 + 辉光边框，hover 时边框亮度增强 + 缩放 1.03
6. `.title-btn.primary`: 暖金色辉光（继续冒险）
7. `.title-btn.secondary`: 灵火蓝辉光（新的旅程、设置）
8. 按钮容器：`display: flex; flex-direction: column; gap: 12px; margin-top: 48px;`

- [ ] **Step 3: 创建 js/title.js**

编写标题界面逻辑：
1. `export const TitleScreen = { ... }`
2. `init()`: 渲染标题 HTML 到 `#title-screen`
   - 中央标题 "光之回响" + 副标题
   - 三个按钮：`[继续冒险]` (仅在有存档时显示)、`[新的旅程]`、`[设置]`
3. "继续冒险" — 调用 `StorageManager.load()` 恢复状态，调用 `Navigation.navigateTo('event')`，隐藏标题界面
4. "新的旅程" — 展示一段开场叙事文本（打字机效果，2-3 段话），然后调用 `AppState.reset()`，`Navigation.navigateTo('event')`，添加第一段叙事到 `narrativeHistory`
5. "设置" — 打开设置面板（Task 13 实现，先预留 `document.getElementById('settings-modal').classList.remove('hidden')`）
6. `show()` / `hide()` 方法

- [ ] **Step 4: 更新 app.js** — import TitleScreen 和 Particles，init 中调用

- [ ] **Step 5: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/title.css">`

- [ ] **Step 6: 验证** — 浏览器打开 index.html，深色标题画面 + 浮动粒子 + 中央发光标题。三个按钮渲染正常。点击"新的旅程"进入事件界面。

- [ ] **Step 7: 提交**

```bash
git add js/particles.js js/title.js css/title.css js/app.js index.html
git commit -m "feat: 粒子系统 + 标题界面"
```

---

### Task 5: 事件对话界面

**Files:**
- Create: `K:\codex\js\event.js`
- Create: `K:\codex\css\event.css`

**Interfaces:**
- Consumes: `AppState` (from state.js)
- Produces: `EventPanel.init()` — 渲染和事件对话逻辑
  - `EventPanel.addNarratorText(text)` — 打字机效果显示叙事
  - `EventPanel.addPlayerAction(text)` — 添加玩家行动
  - `EventPanel.showSuggestions(options[])` — 展开建议选项
  - `EventPanel.triggerBattle()` — 触发战斗（调用 BattleStage）

- [ ] **Step 1: 创建 css/event.css**

编写事件界面样式：
1. `#panel-event`: 主内容区偏右，`margin-left: 64px; height: 100vh; display: flex; flex-direction: column; padding: 24px 32px;`
2. 场景氛围背景 `.event-atmosphere`: `position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 30%, rgba(79,195,247,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(129,199,132,0.06) 0%, transparent 50%); pointer-events: none;`
3. 对话容器 `.event-dialog`: 中央半透明面板，`max-width: 720px; width: 100%; margin: auto;`
4. 叙事文本区 `.narrative-text`: `min-height: 120px; padding: 20px 24px; font-size: 1.15rem; line-height: 1.9;` 每段有微弱的左边框发光
5. 打字机效果：使用 `border-right: 2px solid var(--color-spirit-blue)` 闪烁光标，新段落追加时出现
6. 分割线 `.divider-glow`: `height: 2px; background: linear-gradient(90deg, transparent, var(--color-spirit-blue), var(--color-warm-gold), transparent); margin: 0 24px; position: relative;`
7. 分割线粒子：`::after { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--color-warm-gold); animation: divider-particle 3s linear infinite; }`
8. 建议按钮 `.suggest-toggle`: 文字按钮 + 箭头图标，`color: rgba(79,195,247,0.7); cursor: pointer; font-size: 0.9rem; padding: 8px 24px;`
9. 建议选项容器 `.suggestions-panel`: 默认 `max-height: 0; overflow: hidden; transition: max-height 0.3s ease;` 展开时 `max-height: 300px;`
10. 建议选项卡片 `.suggestion-card`: 半透明面板 + 辉光边框，hover 蓝辉增强 + 右移 4px，`cursor: pointer;`
11. 输入框区域 `.input-area`: `display: flex; gap: 12px; padding: 12px 24px; border-top: 1px solid rgba(79,195,247,0.1);`
12. 输入框 `#narrative-input`: `flex: 1; background: rgba(0,0,0,0.4); border: 1px solid var(--color-border-glow); border-radius: var(--radius-sm); color: #e0e0e0; padding: 10px 16px; font-family: var(--font-body); font-size: 1rem;` placeholder 有呼吸光效 `animation: placeholder-pulse 2s ease-in-out infinite;`
13. 发送按钮 `.send-btn`: 圆形图标按钮，悬浮发光

- [ ] **Step 2: 创建 js/event.js**

编写事件对话逻辑：
1. `export const EventPanel = { ... }`
2. `init()`: 渲染 `#panel-event` 的 HTML 结构到 `#main-content`：
   - 氛围背景层
   - 对话面板容器（叙事区 + 分割线 + 建议区 + 输入区）
   - 叙事区初始显示游戏开场文本
3. `addNarratorText(text, speed)`: 打字机效果逐字显示，追加到叙事区 `<p>`，完成后滚动到底部。speed 由 `AppState.get('settings').textSpeed` 决定（slow=80ms, normal=40ms, fast=15ms 每字）
4. `addPlayerAction(text)`: 以右对齐、暖金色文字样式显示玩家输入
5. `showSuggestions(options)`: 渲染 2-4 个建议选项卡片到 `.suggestions-panel`，点击填入输入框或直接提交
6. `submitAction(text)`: 将文本加入 `narrativeHistory`，添加到对话显示，触发模拟 LLM 响应（根据关键词匹配预设叙事文本，如包含"探索"→森林场景文本，包含"战斗"→触发决斗）
7. `toggleSuggestions()`: 展开/收起建议面板，切换箭头方向
8. 输入框 `keydown` 事件：Enter 提交，Shift+Enter 换行
9. `triggerBattle()`: 调用 `BattleStage.show()`（Task 8），传入对手数据

- [ ] **Step 3: 更新 app.js** — import EventPanel，init 中调用 `EventPanel.init()`，注册 `#panel-event` 到导航

- [ ] **Step 4: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/event.css">`

- [ ] **Step 5: 验证** — 浏览器打开，点击"新的旅程"→ 进入事件界面。叙事文本打字机逐字出现。分割线发光 + 粒子流动。点击"展开建议"显示选项卡片。输入框输入文字回车提交，显示在面板中。

- [ ] **Step 6: 提交**

```bash
git add js/event.js css/event.css js/app.js index.html
git commit -m "feat: 事件对话界面 + 打字机效果 + 建议选项"
```

---

### Task 6: 通知系统

**Files:**
- Create: `K:\codex\js\notifications.js`
- Create: `K:\codex\css\notifications.css`

**Interfaces:**
- Consumes: 无（独立模块）
- Produces: `Notifications.show(type, title, message, duration?)` — 全局通知函数
  - type: `'info' | 'success' | 'warning' | 'error'`
  - duration: 毫秒（默认 info=4000, success=1500, warning=5000, error=6000）

- [ ] **Step 1: 创建 css/notifications.css**

编写通知样式：
1. `#notification-container`: `position: fixed; top: 16px; right: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;`
2. `.notification`: `pointer-events: auto; min-width: 280px; max-width: 400px; padding: 14px 18px; border-radius: var(--radius-md); backdrop-filter: blur(16px); animation: notify-in 0.3s ease-out;` 包含图标 + 标题 + 消息 + 进度条 + 关闭按钮
3. `@keyframes notify-in`: `from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; }`
4. `@keyframes notify-out`: `to { transform: translateX(100%); opacity: 0; }`
5. `.notification.info`: `background: rgba(10,20,30,0.9); border-left: 3px solid var(--color-spirit-blue); box-shadow: 4px 4px 16px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(79,195,247,0.15);`
6. `.notification.success`: 同上，border-left 改为 spirit-green
7. `.notification.warning`: border-left 改为 `#ff9800`
8. `.notification.error`: border-left 改为 `#f44336`
9. `.notify-progress`: 进度条，`height: 2px; margin-top: 8px; background: rgba(255,255,255,0.1); border-radius: 1px; overflow: hidden;`
10. `.notify-progress-bar`: `height: 100%; animation: notify-shrink var(--duration) linear forwards;` 颜色跟随类型
11. 通知标题：`font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;`

- [ ] **Step 2: 创建 js/notifications.js**

编写通知逻辑：
1. `export const Notifications = { ... }`
2. `show(type, title, message, duration)`: 
   a. 创建 `.notification` 元素
   b. 根据 type 添加对应的 Lucide 图标（info=info, success=check-circle, warning=alert-triangle, error=x-circle）
   c. 设置标题和消息文本
   d. 添加进度条（CSS 动画 `--duration` 自定义属性控制时长）
   e. 附加到 `#notification-container`
   f. 设置定时器自动关闭（调用 `dismiss(el)`）
   g. 悬停暂停定时器，离开恢复
   h. 点击关闭按钮立即关闭
   i. 最多同时显示 5 条通知，超出时移除最旧的
3. `dismiss(el)`: 播放退出动画，300ms 后移除 DOM
4. 快捷方法：`success(title, msg)`, `warning(title, msg)`, `error(title, msg)`, `info(title, msg)`

- [ ] **Step 3: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/notifications.css">`

- [ ] **Step 4: 验证** — 浏览器 console 调用 `import('./js/notifications.js').then(m => { m.Notifications.success('成功', '卡组保存成功'); m.Notifications.warning('警告', '生命值过低'); m.Notifications.error('错误', '卡牌数量超限'); m.Notifications.info('提示', '获得新卡牌：光之剑'); })` — 4 条通知从右上角依次滑入，有进度条，3 秒后自动消失。

- [ ] **Step 5: 提交**

```bash
git add js/notifications.js css/notifications.css index.html
git commit -m "feat: 内置通知系统（4种类型 + 进度条 + 滑入动画）"
```

---

### Task 7: 全屏对战舞台

**Files:**
- Create: `K:\codex\js\battle.js`
- Create: `K:\codex\css\battle.css`

**Interfaces:**
- Consumes: `AppState` (from state.js), `Notifications` (from notifications.js), `Particles` (from particles.js)
- Produces: `BattleStage` 对象
  - `BattleStage.show(opponent)` — 显示对战舞台
  - `BattleStage.hide()` — 关闭对战舞台
  - 内部状态：`turn`, `phase`, `playerLP`, `opponentLP`, `playerHand[]`, `opponentHand[]`, `playerMonsters[]`, `opponentMonsters[]`, `playerSpellTraps[]`, `opponentSpellTraps[]`, `playerGraveyard[]`, `opponentGraveyard[]`, `playerBanished[]`, `opponentBanished[]`, `fieldSpell`, `playerDeck[]`, `opponentDeck[]`, `playerExtraDeck[]`, `opponentExtraDeck[]`

- [ ] **Step 1: 创建 css/battle.css — 对战舞台完整样式**

编写大规模对战 CSS（预计 400+ 行），包含：
1. `#battle-overlay`: 全屏覆盖 `position: fixed; inset: 0; z-index: 500; background: radial-gradient(ellipse at center, #0d1520 0%, #050810 100%);`
2. 双方场地以 CSS Grid 布局：`grid-template-rows: auto 3fr 2fr 2fr auto;` 上半对手，下半我方
3. 怪兽区 `.monster-zone`: 5 格横排，每格 `width: 120px; height: 160px; border: 2px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md);` 有卡牌时边框实体化并发光
4. 魔法陷阱区 `.st-zone`: 5 格横排，较扁 `height: 100px;` SET 卡有暗色覆盖 + `::after` 旋转星光粒子
5. 额外怪兽区 `.extra-monster-zone`: 2 格在中间线两侧
6. 场地魔法区 `.field-spell-zone`: 我方半场左外侧
7. 卡组/额外卡组/墓地/除外区：侧边小方形区域，`width: 60px; height: 80px;`
8. 手牌区 `.hand`: 底部扇形排列，使用 `transform: rotate(var(--angle)) translateY(-20px)`，每张手牌 `--angle` 由 JS 动态计算
9. 墓地发光强度类：`.gy-empty`, `.gy-low`(1-5张, 蓝辉), `.gy-mid`(6-15张, 橙辉), `.gy-high`(16+张, 红辉)
10. LP 显示：大号数字，`font-family: var(--font-title); font-size: 1.8rem;`
11. 阶段指示器 `.phase-indicator`: 顶部居中，当前阶段高亮金色
12. 卡牌入场动画 `@keyframes card-enter`: `from { transform: translateY(-200px) scale(0.5); opacity: 0; } 60% { transform: translateY(10px) scale(1.02); } 100% { transform: translateY(0) scale(1); opacity: 1; }`
13. 攻击动画 `@keyframes card-attack`: `0% { transform: translateX(0); } 30% { transform: translateX(30px); } 60% { transform: translateX(-80px); } 100% { transform: translateX(0); }`
14. LP 变化闪烁 `@keyframes lp-flash`: `50% { color: #f44336; transform: scale(1.2); }`
15. 双方半场色调：我方 `background: linear-gradient(180deg, rgba(79,195,247,0.03) 0%, rgba(255,213,79,0.05) 100%)`，对手 `background: linear-gradient(0deg, rgba(156,39,176,0.05) 0%, rgba(244,67,54,0.08) 100%)`
16. SET 卡旋转星光：`@keyframes st-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`

- [ ] **Step 2: 创建 js/battle.js — 对战引擎**

编写对战逻辑（预计 600+ 行）：
1. `export const BattleStage = { ... }`
2. 内部状态对象 `state`
3. `show(opponent)`: 
   a. 渲染对战 HTML 到 `#battle-overlay`
   b. 使用 CSS Grid 布局所有区域
   c. 初始化双方卡组（从 AppState.activeDeckId 加载我方卡组，生成对手卡组）
   d. 洗牌，各抽 5 张起始手牌
   e. LP 设为 8000
   f. 显示 `#battle-overlay`
4. 阶段管理：`PHASES = ['draw', 'main1', 'battle', 'main2', 'end']`
5. `nextPhase()`: 推进到下一阶段，end → 对手回合
6. `drawCard()`: 从卡组顶部抽牌到手牌，手牌数上限 6 张（超过随机弃牌）
7. `summonMonster(card, zoneIndex, position)`: 在手牌 → 怪兽区的入场动画，检查是否需祭品（5-6星需1祭品，7+星需2祭品）
8. `setSpellTrap(card, zoneIndex)`: 手牌 → 魔法陷阱区 SET
9. `activateSpellTrap(zoneIndex)`: 翻开 SET 卡，执行效果
10. `declareAttack(attackerZone, targetZone)`: 怪兽攻击逻辑，计算伤害，更新 LP
11. `changePosition(zoneIndex)`: 攻击/守备表示切换
12. `sendToGraveyard(zoneIndex, player)`: 卡牌送墓地动画
13. `banishCard(zoneIndex, player)`: 除外
14. `renderField()`: 更新 DOM 以反映当前状态（所有区域）
15. `updateLP(player, amount)`: 更新 LP 显示 + 闪烁动画
16. `checkWinCondition()`: LP ≤ 0 则游戏结束
17. `hide()`: 关闭对战覆盖层，返回事件界面

- [ ] **Step 3: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/battle.css">`

- [ ] **Step 4: 验证** — 浏览器打开，从事件界面触发模拟决斗。对战舞台全屏显示，完整游戏王场地布局（怪兽区/魔陷区/额外怪兽区/场地/卡组/额外卡组/墓地/除外/手牌），双方 LP 8000，5 张手牌扇形展开。

- [ ] **Step 5: 提交**

```bash
git add js/battle.js css/battle.css index.html
git commit -m "feat: 全屏对战舞台 — 游戏王大师决斗风格场地布局"
```

---

### Task 8: 卡组编辑界面

**Files:**
- Create: `K:\codex\js\deck.js`
- Create: `K:\codex\css\deck.css`

**Interfaces:**
- Consumes: `AppState` (from state.js), `Notifications` (from notifications.js)
- Produces: `DeckPanel.init()` — 渲染和卡组编辑逻辑

- [ ] **Step 1: 创建 css/deck.css**

编写卡组编辑样式：
1. `#panel-deck`: 主内容区，`padding: 24px 32px; height: 100vh; overflow-y: auto;`
2. 子标签栏 `.deck-tabs`: 顶部横排 `[卡组列表] [编辑模式] [卡牌图鉴]`，active 标签底部金色下划线
3. 卡组列表 — 卡组卡片 `.deck-card`: 半透明面板，显示卡组名、主卡组/额外卡组数量、类型统计条
4. 编辑模式 — 双区域布局：上部卡牌库（可滚动网格，6列），下部当前卡组（横排展示）
5. 卡牌库每张卡 `.card-thumb`: `width: 100px; height: 140px; border-radius: var(--radius-sm); cursor: grab; transition: all var(--transition-fast);` 拖拽时 `cursor: grabbing; opacity: 0.7;`
6. 卡牌悬停放大：`transform: scale(1.3); z-index: 10; box-shadow: var(--glow-md) var(--color-rarity-rare);`
7. 卡牌稀有度边框：common=灰色实线，rare=蓝辉，epic=紫辉，legendary=金辉
8. 搜索输入框 + 属性筛选下拉菜单
9. 图鉴视图 — 10列网格，未获得卡牌暗色 `filter: brightness(0.2);`
10. 右键详情面板 `.card-detail-popup`: 固定定位悬浮模态框，显示完整卡图效果文本

- [ ] **Step 2: 创建 js/deck.js**

编写卡组编辑逻辑：
1. `export const DeckPanel = { ... }`
2. `init()`: 渲染 `#panel-deck` HTML，三个子标签
3. 卡组列表视图：
   - 读取 `AppState.get('decks')`，渲染卡组卡片
   - 显示"新建卡组"按钮（+ 图标卡片）
4. 编辑模式视图：
   - 渲染卡牌库：从预设的 40+ 张卡牌数据中渲染卡牌网格
   - 搜索过滤：监听 input，按名称/属性/类型筛选
   - 属性筛选下拉菜单（光/暗/自然/火焰/水流/风暴/大地）
   - 渲染当前卡组：显示已添加的卡牌
   - 拖拽添加：`dragstart`/`dragover`/`drop` 事件，从卡牌库拖到卡组区
   - 点击添加：点击库中卡牌添加到卡组，点击组中卡牌移除
   - 计数显示：每种卡数量 + 主卡组总数（红色超过 60 张警告）
   - 保存卡组按钮 → 更新 AppState → StorageManager.save → 通知
5. 卡牌图鉴视图：
   - 展示所有卡牌，标记已获得/未获得
   - 已获得：正常显示 + 获得标记；未获得：暗色剪影 + "???"
6. `generateSampleCards()`: 生成 40+ 张样例卡牌数据（怪兽卡 20 张、魔法卡 12 张、陷阱卡 8 张），每张有名称、属性、类型、ATK/DEF(怪兽)、效果文本、稀有度、获得状态

- [ ] **Step 3: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/deck.css">`，app.js import DeckPanel

- [ ] **Step 4: 验证** — 浏览器打开，侧边栏点击卡组→进入卡组编辑。三个子标签切换流畅。卡牌库有 40+ 张卡。拖拽/点击添加卡牌到卡组。搜索和属性筛选工作正常。保存提示通知。

- [ ] **Step 5: 提交**

```bash
git add js/deck.js css/deck.css index.html js/app.js
git commit -m "feat: 卡组编辑界面 — 列表/编辑/图鉴三标签 + 拖拽添加"
```

---

### Task 9: 伙伴界面 + 背包界面

**Files:**
- Create: `K:\codex\js\companions.js`
- Create: `K:\codex\css\companions.css`
- Create: `K:\codex\js\inventory.js`
- Create: `K:\codex\css\inventory.css`

**Interfaces:**
- Consumes: `AppState` (from state.js)
- Produces: `CompanionsPanel.init()`, `InventoryPanel.init()`

这两个界面逻辑相对简洁，合并在一个 Task 中完成。

- [ ] **Step 1: 创建 css/companions.css**

伙伴界面样式：
1. `#panel-companions`: 主内容区，`padding: 32px; overflow-y: auto;`
2. 标题区：中文 "伙伴" + 装饰分割线
3. 伙伴卡片 `.companion-card`: `display: flex; gap: 20px; padding: 20px; margin-bottom: 16px; background: var(--color-bg-panel); border-radius: var(--radius-lg); border: 1px solid var(--color-border-glow); backdrop-filter: blur(12px); transition: all var(--transition-normal);`
4. `.companion-card:hover`: `transform: translateY(-2px); box-shadow: var(--glow-md) rgba(79,195,247,0.15);`
5. 好感度变化流光动画 `@keyframes affection-shimmer`：`from { background-position: -200% 0; } to { background-position: 200% 0; }` — `background: linear-gradient(90deg, transparent, rgba(255,213,79,0.2), transparent); background-size: 200% 100%;`
6. 立绘区（左侧）：`width: 100px; height: 120px; border-radius: var(--radius-md);` 使用 CSS 渐变模拟角色剪影
7. 信息区（右侧）：名称、好感度星级（SVG 发光星星，填充率与好感度成正比）、所在地（小图标+文字）、状态标签
8. 状态标签颜色变量：休整 `--color-status-rest: #4FC3F7`，探索 `--color-status-explore: #FFD54F`，紧张 `--color-status-tense: #f44336`
9. 底部 "在未来旅程中结识新的伙伴……" 提示：半透明 + 斜体
10. 卡片滑入动画（使用 `animation-delay` 错开）：`@keyframes card-slide-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`

- [ ] **Step 2: 创建 js/companions.js**

伙伴系统逻辑：
1. `export const CompanionsPanel = { ... }`
2. `init()`: 渲染伙伴列表
3. 从 `AppState.get('companions')` 读取数据：
   - 4 个预设伙伴：
     - {id:'ying', name:'荧', affection:78, location:'翡翠神殿', status:'休整', unlocked:true, background:'曾在神殿中守护光之种的精灵，擅长治愈与光魔法。'}
     - {id:'jin', name:'烬', affection:42, location:'灰烬峡谷', status:'外出探索', unlocked:true, background:'游走于暗影边界的旅者，沉默寡言却可靠。'}
     - {id:'lan', name:'岚', affection:15, location:'风语草原', status:'休整', unlocked:true, background:'风之部族的后裔，拥有与自然对话的天赋。'}
     - {id:'unknown1', name:'???', affection:0, location:'???', status:'未知', unlocked:false, background:'???'}
4. 好感度渲染：5 颗 SVG 星星，好感度 0-100 映射到 0-5 星（填充百分比）
5. 好感度变化动画：添加 `.affection-shimmer` 类 → 2s 后移除
6. 卡片入场动画按索引错开 `animation-delay`

- [ ] **Step 3: 创建 css/inventory.css**

背包界面样式：
1. `#panel-inventory`: 主内容区，`padding: 24px 32px;`
2. 顶栏：标题 "背包" + 灵辉余额显示（大号数字 + 灵辉图标，金色辉光）
3. 分类标签栏：flex 横排，active 标签底部金色下划线 + 文字色变亮
4. 物品网格 `.inventory-grid`: `display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;`
5. 物品卡片 `.item-card`: `width: 100%; aspect-ratio: 1; background: var(--color-bg-panel); border: 2px solid transparent; border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-fast); display: flex; flex-direction: column; align-items: center; justify-content: center;`
6. `.item-card:hover`: 放大 1.08x + 对应稀有度辉光
7. 物品图标：Lucide 图标匹配物品类型，颜色随稀有度
8. 数量角标：右上角小圆圈
9. 底部详情面板 `.item-detail`: `position: sticky; bottom: 0; background: var(--color-bg-panel); border: 1px solid var(--color-border-glow); border-radius: var(--radius-md); padding: 16px; display: flex; gap: 16px;` 显示选中物品的完整信息 + 使用/丢弃按钮

- [ ] **Step 4: 创建 js/inventory.js**

背包逻辑：
1. `export const InventoryPanel = { ... }`
2. `init()`: 渲染背包 HTML
3. 从 `AppState.get('inventory')` 读取预设物品：
   - 消耗品：光之露滴 ×3 (rare, 恢复 LP)、森林药草 ×5 (common, 小恢复)、星辉粉尘 ×8 (rare, 清除异常状态)
   - 素材：神殿碎片 ×2 (key, 剧情物品)、暗影结晶 ×1 (rare)、古老卷轴 ×1 (legendary)、风之羽 ×3 (common)、大地结晶 ×2 (common)
   - 卡包：基础卡包 ×2 (common)
4. 分类过滤：监听标签点击，更新 `.category` 状态（all/consumable/material/key/pack）
5. 物品点击：更新详情面板内容（名称、稀有度星标、效果文本、使用/丢弃按钮）
6. "使用"按钮：消耗品 → 执行效果（恢复 LP、添加提示），移除/减量物品
7. "丢弃"按钮：确认提示 → 移除物品
8. 灵辉余额显示响应式更新

- [ ] **Step 5: 更新 index.html** — 添加 CSS 引用，app.js import 两个模块

- [ ] **Step 6: 验证** — 伙伴界面：4 张卡片，前 3 个有完整信息，第 4 个显示为 ??? 剪影。好感度星星渲染正确。背包界面：5 列网格，10+ 物品，点击展开详情面板，分类标签过滤正常。

- [ ] **Step 7: 提交**

```bash
git add js/companions.js css/companions.css js/inventory.js css/inventory.css index.html js/app.js
git commit -m "feat: 伙伴系统 + 背包系统"
```

---

### Task 10: 地图界面

**Files:**
- Create: `K:\codex\js\map.js`
- Create: `K:\codex\css\map.css`

**Interfaces:**
- Consumes: `AppState` (from state.js)
- Produces: `MapPanel.init()` — 渲染和地图交互逻辑

- [ ] **Step 1: 创建 css/map.css**

地图界面样式：
1. `#panel-map`: `height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden;`
2. 地图画布容器 `.map-canvas`: `flex: 1; position: relative; cursor: grab;` 拖拽时 `cursor: grabbing;`
3. 手绘风格背景：多个 CSS `radial-gradient` 和 `conic-gradient` 叠加模拟自然地形——绿色区域（森林）、蓝色区域（湖泊）、灰色区域（山脉）、棕色区域（城镇/村落/古城）。使用 `border-radius` 不规则的 blob 形状模拟手绘边界。
4. 地图节点 `.map-node`: `position: absolute; width: 40px; height: 40px; border-radius: 50%; transform: translate(-50%, -50%); transition: all var(--transition-normal);`
5. 节点可前往：`background: var(--color-spirit-blue); box-shadow: 0 0 20px rgba(79,195,247,0.6); animation: node-pulse 2s ease-in-out infinite;`
6. `@keyframes node-pulse`: `0%,100% { box-shadow: 0 0 10px rgba(79,195,247,0.4); } 50% { box-shadow: 0 0 30px rgba(79,195,247,0.8), 0 0 60px rgba(79,195,247,0.3); }`
7. 节点已完成：`background: var(--color-warm-gold); box-shadow: 0 0 8px rgba(255,213,79,0.4);`
8. 节点未解锁：`background: rgba(150,150,150,0.3); border: 1px dashed rgba(150,150,150,0.5);`
9. 路径线 `.map-path`: `position: absolute; height: 2px;` 使用 `transform-origin: left center` + `transform: rotate()` + `width` 连接两节点。已完成路径=暖金色实线+微光，未通行路径=蓝辉半透明虚线
10. 悬停卡片 `.node-tooltip`: `position: absolute; background: var(--color-bg-panel); border: 1px solid var(--color-border-glow); border-radius: var(--radius-md); padding: 12px; pointer-events: none; opacity: 0; transition: opacity 0.2s;` 节点悬停时显示
11. 底部状态栏 `.map-status`: `padding: 12px 24px; background: var(--color-bg-panel); border-top: 1px solid var(--color-border-glow); display: flex; justify-content: space-between;`

- [ ] **Step 2: 创建 js/map.js**

地图交互逻辑：
1. `export const MapPanel = { ... }`
2. `init()`: 渲染地图 HTML
3. 初始化 12 个预设地图节点：
   - 翡翠神殿 (temple, x:15%, y:40%, available, [shrine, forest-edge])
   - 精灵之泉 (nature, x:28%, y:25%, available, [temple, deep-forest])
   - 森林小径 (nature, x:18%, y:60%, completed, [temple])
   - 幽暗密林 (nature, x:35%, y:50%, available, [forest-edge, deep-forest])
   - 风语村 (town, x:52%, y:30%, available, [deep-forest, grassland])
   - 古石城 (city, x:48%, y:55%, locked, [deep-forest])
   - 灰烬峡谷 (wasteland, x:65%, y:45%, locked, [town, city])
   - 星光湖泊 (nature, x:78%, y:20%, available, [grassland])
   - 暗影堡垒 (dungeon, x:72%, y:65%, locked, [canyon, city])
   - 风语草原 (nature, x:60%, y:22%, completed, [town])
   - 月辉塔 (city, x:40%, y:72%, locked, [city])
   - 世界树遗迹 (temple, x:85%, y:40%, locked, [lake, fortress])
4. 节点渲染：absolute 定位，读取 x/y 百分比
5. 路径线渲染：使用 Canvas 或 SVG `<line>` 连接关联节点，根据状态设置样式
6. 拖拽平移：`mousedown` → `mousemove` 更新 `transform: translate(dx, dy)` → `mouseup`。限制范围防止拖出界面。
7. 滚轮缩放：`wheel` 事件 → 更新 `transform: scale(s)`，限制 0.5-2 范围
8. 节点悬停显示 tooltip（名称卡片 + 缩略描述）
9. 点击可前往节点：显示确认提示 → 模拟切换事件（向 narrativeHistory 添加"前往 XXX"的叙事），通知提示 "已抵达 [节点名称]"
10. 视差效果：`mousemove` 时背景层 `transform: translate(calc(var(--mx) * -3px), calc(var(--my) * -3px))`
11. 底部状态栏动态更新：当前区域、可前往数量、探索进度

- [ ] **Step 3: 更新 index.html** — 添加 `<link rel="stylesheet" href="css/map.css">`，app.js import MapPanel

- [ ] **Step 4: 验证** — 浏览器打开，点击地图。12 个节点分布在地图上。可前往节点有脉冲光效。拖拽移动地图，滚轮缩放。悬停节点显示 tooltip。点击节点触发事件通知。底部状态栏正确显示。

- [ ] **Step 5: 提交**

```bash
git add js/map.js css/map.css index.html js/app.js
git commit -m "feat: 地图系统 — 手绘底图 + 节点连线 + 拖拽缩放"
```

---

### Task 11: 设置面板 + 右键菜单 + 最终集成

**Files:**
- Create: `K:\codex\css\settings.css`
- Modify: `K:\codex\js\app.js` (集成设置面板)
- Modify: `K:\codex\css\base.css` (右键菜单样式)
- Modify: `K:\codex\index.html` (完善)

**Interfaces:**
- Consumes: `AppState` (from state.js), `StorageManager` (from storage.js), `Notifications` (from notifications.js)
- Produces: 设置面板模态框 + 自定义右键菜单

- [ ] **Step 1: 创建设置面板 HTML/CSS/JS（嵌入 app.js）**

设置面板样式（css/settings.css）：
1. `#settings-modal`: `position: fixed; inset: 0; z-index: 1500; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;` 隐藏时 `.hidden`
2. `.settings-panel`: `width: 480px; max-height: 80vh; background: var(--color-bg-panel); border: 1px solid var(--color-border-glow); border-radius: var(--radius-lg); padding: 32px; overflow-y: auto; box-shadow: var(--glow-lg) rgba(0,0,0,0.5);`
3. 面板入场动画 `@keyframes modal-in`: `from { transform: scale(0.9) translateY(20px); opacity: 0; }`
4. 设置项行：`display: flex; justify-content: space-between; align-items: center; margin: 20px 0;`
5. 自定义下拉选择器样式、滑块样式（`input[type="range"]` 美化，轨道 + 滑块颜色适配主题）
6. 关闭按钮：右上角 X 图标

设置面板逻辑（在 app.js 中添加）：
1. `openSettings()`: 读取当前设置填充表单，显示模态框
2. `closeSettings()`: 隐藏模态框
3. 监听表单变更 → 更新 `AppState.set('settings', ...)` → `StorageManager.save()`
4. 设置项：
   - 文本速度：慢/正常/快（下拉）
   - 动画强度：简约/标准/华丽（下拉）
   - 背景音乐音量：0-100 滑块
   - 音效音量：0-100 滑块
   - 卡牌动画速度：正常/快速/跳过（下拉）
5. "清除存档"按钮（红色文字 + 二次确认）：调用 `StorageManager.clear()` + `AppState.reset()` + 返回标题界面

- [ ] **Step 2: 自定义右键菜单样式（添加到 base.css）**

1. `#context-menu`: `position: fixed; z-index: 3000; background: var(--color-bg-panel); border: 1px solid var(--color-border-glow); border-radius: var(--radius-sm); padding: 4px 0; min-width: 160px; box-shadow: var(--glow-md) rgba(0,0,0,0.5); opacity: 0; pointer-events: none; transition: opacity 0.15s;`
2. `.context-item`: `padding: 8px 16px; cursor: pointer; font-size: 0.9rem; transition: background 0.1s;`
3. `.context-item:hover`: `background: rgba(79,195,247,0.1);`
4. `.context-divider`: `height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0;`

自定义右键菜单逻辑（在 app.js 中添加）：
1. 在卡组编辑界面，右键卡牌时阻止默认右键菜单
2. 在鼠标位置显示自定义菜单（查看详情、添加到卡组/移除、取消）
3. 点击菜单项或外部区域关闭

- [ ] **Step 3: 最终集成 — 更新 js/app.js**

完善 `App.init()`：
1. 导入所有模块
2. 初始化顺序：Particles → TitleScreen → Navigation → EventPanel → DeckPanel → CompanionsPanel → InventoryPanel → MapPanel
3. 注册所有面板切换：`AppState.subscribe('currentView', ...)`
4. 设置面板事件绑定
5. 右键菜单全局事件
6. 键盘快捷键：`Escape` 关闭模态框/对战舞台

- [ ] **Step 4: 完善 index.html** — 确认所有 CSS/JS 引用齐全，meta 标签完善

- [ ] **Step 5: 全流程验证**

浏览器打开 index.html：
1. 标题界面 → 点击"新的旅程" → 开场叙事 → 进入事件界面
2. 事件界面：打字机文本 → 展开建议选项 → 点击选项 → 输入框输入 → 模拟对话
3. 侧边栏：5 个图标切换流畅，active 状态正确，悬浮光晕
4. 背包：物品网格，分类过滤，详情面板，使用物品
5. 卡组：卡组列表/编辑/图鉴三标签，拖拽添加，搜索过滤
6. 伙伴：4 张卡片，好感度星级，状态标签
7. 地图：节点脉冲，拖拽缩放，tooltip，状态栏
8. 设置面板：打开/关闭，修改设置，清除存档
9. 通知系统：各种操作触发通知，右上角滑入
10. 对战舞台：从事件触发 → 完整场地布局 → 抽牌 → 召唤 → 攻击 → LP 变化

- [ ] **Step 6: 提交**

```bash
git add css/settings.css js/app.js css/base.css index.html
git commit -m "feat: 设置面板 + 右键菜单 + 全模块最终集成"
```

---

### Task 12: 最终打磨 — 动效 + 性能 + 视觉细节

**Files:**
- Modify: `K:\codex\css\base.css` (新增全局动画 keyframes)
- Modify: `K:\codex\js\particles.js` (完善战斗粒子)
- Modify: `K:\codex\css\battle.css` (完善战斗动效)
- Modify: `K:\codex\js\event.js` (完善对话过渡)

- [ ] **Step 1: 全局微交互动效增强 (base.css)**

添加：
1. 按钮涟漪效果：`@keyframes ripple { to { transform: scale(4); opacity: 0; } }`
2. 卡片入场通用动画：`@keyframes card-appear { from { opacity: 0; transform: translateY(16px) scale(0.95); } }`
3. 闪光掠过效果：`@keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }`
4. 弹跳效果：`@keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }`
5. 标签切换过渡增强：`#main-content > [id^="panel-"] { animation: fadeIn 0.25s ease-out; }`

- [ ] **Step 2: 战斗粒子增强 (particles.js)**

实现 `Particles.spawnBattleParticles(x, y, count, color)`:
1. 在 Canvas 上绘制短暂粒子爆发（30-50 个粒子）
2. 每个粒子：随机方向速度、大小(1-4px)、透明度(1→0)、生命周期(600-1200ms)
3. 使用 `requestAnimationFrame` 更新粒子位置（重力 + 阻力）
4. 用于：卡牌入场拖尾、攻击冲击波、墓地送葬、LP 变化

- [ ] **Step 3: 战斗动效增强 (battle.css + battle.js)**

1. 卡牌入场：添加 `card-enter` 动画 + Canvas 粒子拖尾
2. 攻击动画：攻击怪兽向目标移动 → 冲击波扩散 → 返回原位。全程 500ms
3. LP 变化：数字颜色闪红/闪绿，持续 300ms
4. 墓地送葬：卡牌翻转 180deg + 缩小 → 飞向墓地区域
5. SET 卡盖放：卡牌翻转 180deg（正面→背面）
6. 连锁提示：卡牌边缘闪蓝辉 + 轻微缩放
7. 融合召唤特殊效果：Canvas 粒子漩涡 + 卡牌从额外卡组飞出

- [ ] **Step 4: 对话过渡增强 (event.js)**

1. 场景切换时氛围背景渐变过渡（不同场景不同色调的 radial-gradient）
2. 叙事文本区滚动条平滑滚动
3. 分割线粒子颜色随场景情绪变化（宁静=蓝，紧张=红，神秘=紫）
4. 建议选项卡片交错入场动画（`animation-delay` 递增）

- [ ] **Step 5: 性能优化**

1. 非当前标签面板设置 `visibility: hidden` 而非 `display: none`（保留 DOM 但跳过渲染）
2. 粒子在非战斗场景限制为 15 个（降低密度）
3. Canvas 在无战斗时停止 `requestAnimationFrame` 循环
4. 卡牌库超过 50 张时使用 `content-visibility: auto` 虚拟化
5. CSS `will-change` 在动画元素上按需设置（动画前添加，动画后移除）
6. `prefers-reduced-motion` 媒体查询：减少所有动效

- [ ] **Step 6: 全局验证 + 提交**

```bash
git add css/base.css js/particles.js css/battle.css js/event.js
git commit -m "feat: 最终打磨 — 战斗粒子 + 动效增强 + 性能优化"
```


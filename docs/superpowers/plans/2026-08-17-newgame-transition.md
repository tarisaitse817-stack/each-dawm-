# 开场逐句字幕 + 光晕转场 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 去掉新游戏自动播放的整段打字机开场叙事，改为 galgame 式逐句字幕（世界书 `first_mes` 前 3 句）+ 光晕转场渐入场景；读档入口仅光晕无字幕。

**Architecture:** 纯前端：新增 `js/transition.js`（TransitionView 惰性创建覆盖层，状态机 subtitle → halo → reveal）+ `css/transition.css`（纯 CSS 字幕淡入淡出与光晕 keyframes）；title.js 两入口改调 `TransitionView.play()`，开场字幕加载器 `loadOpeningLines()` 作为世界书设定修改的接口接缝；随后清理开场白相关死代码（event.js 跳过按钮机制、app.js 两个监听、event.css 按钮样式）。

**Tech Stack:** 原生 ES Modules JavaScript、CSS、Node v24（校验脚本）、Playwright MCP（浏览器回归）

**依赖（执行顺序）：** 本计划须在 avatar-closeup 计划（docs/superpowers/plans/2026-08-16-avatar-closeup.md）全部完成（含最终整体审查）后执行。

## Global Constraints

- 项目根目录：`C:\Users\Administrator\each-dawm-`（所有相对路径以此为根）
- 无 package.json / 无测试框架：自动化检查 = node 断言脚本（`scripts/*.mjs`）+ ESM 导入语法检查；UI 行为 = 浏览器人工回归清单（Playwright）
- 字幕文本源：世界书 `data/worldbook.json` 的 `first_mes`，按中文标点（`。！？…；`）断句、**取前 3 句**（`MAX_OPENING_LINES = 3`，句数调此常量）；世界书缺失/加载失败/为空 → 回退内置默认文本前 3 句；**`data/worldbook.json` 数据文件不动**
- 时长规格：每句停留 `max(1200ms, 字数×80ms)`；淡入淡出各 400ms；光晕动画 1000ms（CSS keyframes 与 JS `_haloMs` 一致）；覆盖层淡出 400ms
- 新的旅程 = 字幕 + 光晕；继续冒险 = 仅光晕无字幕（`play({ lines: null })`）；字幕阶段点击任意处跳过直接进光晕；光晕阶段不可跳
- 转场防重入：`TransitionView.isPlaying` 为 true 时 `play()` 直接返回；覆盖层创建失败 → 跳过动画直接进场景（不阻塞进入）
- `EventPanel` 对话引擎核心不动；`closeup-open` → `EventPanel.init()` 懒初始化路径（app.js:104-107）不动；`#closeup-dialog` 挂载点不动
- 注释/命名沿用现有中文注释风格与 `_` 前缀私有函数约定
- 提交信息加 `Co-Authored-By: Claude <noreply@anthropic.com>` trailer；工作树中用户无关改动（`server/start.bat`、`assets/` 未跟踪文件）**绝不提交**

---

### Task 1: 转场模块 + 新游戏逐句字幕转场

**Files:**
- Create: `js/transition.js`（TransitionView 模块，完整代码见下）
- Create: `css/transition.css`（完整代码见下）
- Modify: `index.html`（引入 transition.css）
- Modify: `js/title.js`（导入 TransitionView；`OPENING_NARRATIVE`/`loadOpeningNarrative` 替换为 `loadOpeningLines` 接口；`_startNewGame` 改造）

**Interfaces:**
- Consumes: 既有 `AppState.reset()`、`Navigation.navigateTo('scene')`、`showInitialBackground()`（scene.js，title.js 已导入）、`#sidebar` / `#main-content` 元素与 `sidebar-hidden` / `full-width` 类（沿用 `_onContinue()` 模式）
- Produces: `TransitionView`（`play({ lines })`、`isPlaying`）；`loadOpeningLines()` → `Promise<string[]>`（≤3 句，Task 2 读档路径复用 TransitionView；Task 3 验证接口跟随世界书修改）

- [ ] **Step 1: 创建 `js/transition.js`**

文件整体内容（逐字）：

```js
/* ==========================================================================
   光之回响 (Echoes of Light) — TransitionView 开场/读档光晕转场
   黑底逐句字幕（galgame 式）→ 光晕铺满 → 淡出露出场景；纯 CSS 视觉 + JS 时序
   ========================================================================== */

export const TransitionView = {

  /** @type {HTMLElement|null} 转场覆盖层（惰性创建，play 时初始化） */
  _overlay: null,

  /** @type {HTMLElement|null} 字幕元素 */
  _subtitleEl: null,

  /** @type {boolean} 转场播放中（防重入守卫） */
  isPlaying: false,

  /** @type {boolean} 字幕阶段是否被点击跳过 */
  _skipSubtitle: false,

  /** @type {number} 字幕淡入/淡出时长（毫秒，与 CSS transition 一致） */
  _fadeMs: 400,

  /** @type {number} 光晕动画时长（毫秒，与 CSS keyframes 一致） */
  _haloMs: 1000,

  /**
   * 惰性创建覆盖层 DOM（首次 play 时调用；失败抛出由 play 捕获）
   */
  _init() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'transition-overlay';
    this._overlay.className = 'hidden';
    this._overlay.innerHTML =
      '<div class="transition-subtitle" id="transition-subtitle"></div>' +
      '<div class="transition-halo"></div>';
    document.body.appendChild(this._overlay);
    this._subtitleEl = document.getElementById('transition-subtitle');
  },

  /**
   * 播放转场
   * @param {{ lines: string[]|null }} opts - lines 为句子数组（逐句字幕）；null 直接光晕（读档）
   */
  play(opts) {
    if (this.isPlaying) return;
    if (!this._overlay) {
      try {
        this._init();
      } catch (e) {
        // 覆盖层创建失败：跳过动画直接进场景，不阻塞进入
        return;
      }
    }

    var lines = (opts && opts.lines) || null;
    var self = this;

    this.isPlaying = true;
    this._skipSubtitle = false;
    this._overlay.classList.remove('hidden', 'fade-out', 'halo');
    this._subtitleEl.classList.remove('show');
    this._subtitleEl.textContent = '';

    var startHalo = function () {
      self._overlay.classList.add('halo');
      setTimeout(function () {
        self._overlay.classList.add('fade-out');
        setTimeout(function () {
          self._overlay.classList.add('hidden');
          self._overlay.classList.remove('fade-out', 'halo');
          self.isPlaying = false;
        }, self._fadeMs);
      }, self._haloMs);
    };

    if (!lines || lines.length === 0) {
      startHalo();
      return;
    }

    var clickHandler = function () { self._skipSubtitle = true; };
    this._overlay.addEventListener('click', clickHandler);

    this._playLines(lines, 0, function () {
      self._overlay.removeEventListener('click', clickHandler);
      self._subtitleEl.classList.remove('show');
      startHalo();
    });
  },

  /**
   * 逐句播放字幕：淡入 → 停留 → 淡出 → 下一句（被跳过时直接结束）
   * @param {string[]} lines
   * @param {number} index
   * @param {Function} done - 全部播完（或被跳过）后的回调
   */
  _playLines(lines, index, done) {
    var self = this;
    if (this._skipSubtitle || index >= lines.length) { done(); return; }
    this._subtitleEl.textContent = lines[index];
    this._subtitleEl.classList.add('show');
    var stayMs = Math.max(1200, lines[index].length * 80);
    setTimeout(function () {
      self._subtitleEl.classList.remove('show');
      setTimeout(function () {
        self._playLines(lines, index + 1, done);
      }, self._fadeMs);
    }, stayMs);
  }
};
```

- [ ] **Step 2: 创建 `css/transition.css`**

文件整体内容（逐字）：

```css
/* ==========================================================================
   转场覆盖层：黑底逐句字幕 + 光晕扩散（时序由 js/transition.js 控制）
   ========================================================================== */
#transition-overlay { position: fixed; inset: 0; z-index: 100; background: #0a0c1c; opacity: 1; transition: opacity .4s ease; cursor: pointer; }
#transition-overlay.hidden { display: none; }
#transition-overlay.fade-out { opacity: 0; pointer-events: none; }

/* 字幕：居中逐句淡入淡出 */
.transition-subtitle { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); max-width: 80%; text-align: center; color: #F5ECD7; font-size: clamp(16px, 4.5vw, 22px); line-height: 1.9; opacity: 0; transition: opacity .4s ease; text-shadow: 0 0 12px rgba(212,165,116,.35); }
.transition-subtitle.show { opacity: 1; }

/* 光晕：中心光斑扩散铺满（halo-expand 1s 与 transition.js _haloMs 一致） */
.transition-halo { position: absolute; left: 50%; top: 50%; width: 20vmax; height: 20vmax; border-radius: 50%; transform: translate(-50%, -50%) scale(.05); opacity: 0; background: radial-gradient(circle, rgba(255,244,214,.98) 0%, rgba(212,165,116,.55) 45%, transparent 72%); filter: blur(6px); pointer-events: none; }
#transition-overlay.halo .transition-halo { animation: halo-expand 1s ease-out forwards; }
@keyframes halo-expand {
  0% { transform: translate(-50%, -50%) scale(.05); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(9); opacity: 1; }
}
```

- [ ] **Step 3: `index.html` 引入样式**

在 `index.html` 第 21 行 `<link rel="stylesheet" href="css/closeup.css">` 之后新增一行：

```html
  <link rel="stylesheet" href="css/transition.css">
```

- [ ] **Step 4: 改 `js/title.js` — 导入与开场字幕接口**

导入区（第 5-8 行附近）新增一行 import：

```js
import { TransitionView } from './transition.js';
```

将现有 `OPENING_NARRATIVE` 常量 + `loadOpeningNarrative()` 函数（约第 10-36 行，从 `/* 开场叙事文本（3 段话） */` 注释到 `loadOpeningNarrative` 函数结束）整体替换为：

```js
/* 开场字幕（新游戏转场）：世界书 first_mes 前 3 句；失败回退内置默认文本前 3 句 */
const MAX_OPENING_LINES = 3;

var OPENING_LINES_FALLBACK = [
  '你在无尽的黑暗中睁开了双眼。不——你甚至不确定自己是否还有"眼睛"这个东西。只有光。微弱而温暖的光，从遥远的地方流淌而来，轻轻拂过你的意识。',
  '"你醒了。"一个声音，像是风穿过水晶的风铃，又像是远山的回响。你试图寻找声音的来源，却发现自己的身体正缓缓飘浮在一片星辉之中。',
  '"来吧，牌佬。属于你的奇妙冒险在等待着你。"'
];

/** 按中文标点断句：保留句尾标点、过滤空白句 */
function _splitSentences(text) {
  var parts = text.split(/([。！？…；])/);
  var sentences = [];
  for (var i = 0; i < parts.length; i += 2) {
    var s = (parts[i] + (parts[i + 1] || '')).replace(/\s+/g, ' ').trim();
    if (s) sentences.push(s);
  }
  return sentences;
}

var _cachedOpeningLines = null;

/**
 * 开场字幕接口 — 世界书 first_mes 前 3 句（用户改世界书设定自动生效）
 * 加载失败/为空 → 回退内置默认文本前 3 句
 * @returns {Promise<string[]>}
 */
async function loadOpeningLines() {
  if (_cachedOpeningLines) return _cachedOpeningLines;
  var sentences = [];
  try {
    var resp = await fetch('data/worldbook.json');
    if (resp.ok) {
      var wb = await resp.json();
      var raw = (wb.first_mes || '').replace(/<\/?maintext>/g, '').split('\\n').join('\n');
      sentences = _splitSentences(raw);
    }
  } catch (e) {
    console.log('[TitleScreen] 世界书开场加载失败，使用默认字幕');
  }
  if (sentences.length === 0) {
    sentences = _splitSentences(OPENING_LINES_FALLBACK.join('\n'));
  }
  _cachedOpeningLines = sentences.slice(0, MAX_OPENING_LINES);
  console.log('[TitleScreen] 开场字幕: ' + _cachedOpeningLines.length + ' 句');
  return _cachedOpeningLines;
}
```

将 `init()` 中的 `loadOpeningNarrative();`（约第 58 行）改为：

```js
    loadOpeningLines();
```

- [ ] **Step 5: 改 `js/title.js` — `_startNewGame` 改造**

将 `_startNewGame()` 整个方法（含上方 JSDoc，约第 191-213 行）替换为：

```js
  /**
   * 开始新游戏
   * 重置状态 → 切场景 + 侧边栏立即可见 → 逐句字幕 + 光晕转场渐入
   */
  _startNewGame() {
    // 停止标题 BGM
    if (window.App && typeof window.App.stopBgm === 'function') {
      window.App.stopBgm();
    }

    AppState.reset();
    this._hideCover();
    Navigation.navigateTo('scene');

    // 立即显示侧边栏（无打字机开场白；开场镜头感由转场字幕承担，与读档路径一致）
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('sidebar-hidden');
    var main = document.getElementById('main-content');
    if (main) main.classList.remove('full-width');
    showInitialBackground();

    this.hide();

    // 开场字幕 → 光晕铺满 → 渐入场景
    loadOpeningLines().then(function (lines) {
      TransitionView.play({ lines: lines });
    });
  },
```

- [ ] **Step 6: 语法与数据校验**

Run（PowerShell）：
```powershell
node -e "import('file:///C:/Users/Administrator/each-dawm-/js/transition.js').then(m => { if (typeof m.TransitionView !== 'object' || typeof m.TransitionView.play !== 'function') throw new Error('TransitionView 导出异常'); console.log('PASS: TransitionView 导出正常'); })"
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
```
Expected: 三个都 PASS。

- [ ] **Step 7: 浏览器回归（新游戏转场）**

Playwright（http://localhost:8080，复用或自起 python http.server）：
- 标题页点「新的旅程」→ 黑底字幕出现，**第一句**应为世界书 `first_mes` 首句「"我赢了的话，前辈要和我交往哦。"」→ 约 1.2-2 秒后第二句「坐在牌桌对面的柳月正低着头，……」→ 第三句 → 光晕铺满 → 覆盖层淡出 → 场景可见、侧边栏可见、白月/塞壬头像可见
- 字幕阶段点击任意处 → 立即进光晕 → 渐入场景（跳过路径）
- 控制台无 JS 运行时错误（404 素材类错误属预期）
- 截图证据存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-17-newgame-transition\task1-*.png`

- [ ] **Step 8: 提交**

```bash
git add js/transition.js css/transition.css index.html js/title.js
git commit -m "feat: 新游戏开场改逐句字幕+光晕转场（世界书 first_mes 前 3 句接口）"
```

---

### Task 2: 读档光晕 + 开场白死代码清理

**Files:**
- Modify: `js/title.js`（`_onContinue` 末尾加转场调用）
- Modify: `js/event.js`（删除跳过开场白按钮机制与事件链，具体块见各 Step）
- Modify: `js/app.js`（删 `newgame-start`、`sidebar-reveal` 监听；更新第 87 行注释）
- Modify: `css/event.css`（删 `.skip-intro-btn` 三条规则）

**Interfaces:**
- Consumes: `TransitionView.play({ lines: null })`（Task 1）；清理后 `newgame-start` / `sidebar-reveal` 全库 0 引用
- Produces: 无新增；`closeup-open` → `EventPanel.init()` 懒初始化路径（app.js:104-107）与 `#closeup-dialog` 挂载点保持不动

- [ ] **Step 1: `js/title.js` — `_onContinue` 末尾加光晕转场**

在 `_onContinue()` 方法内 `this.hide();`（约第 172 行）之后新增：

```js
    // 读档入口：仅光晕转场（无开场字幕）
    TransitionView.play({ lines: null });
```

- [ ] **Step 2: `js/event.js` — 删除跳过按钮相关属性与 DOM**

删除以下内容（按原文精确匹配）：
1. 属性行：`  _skipBtn: null,` 与 `  _isSkipping: false,`（约 242、252 行，对象字面量内）
2. `_renderDOM()` 内的按钮行（约 331 行）：
```js
        '<button class="skip-intro-btn hidden" id="skip-intro-btn">跳过 ▸▸</button>' +
```
3. DOM 引用缓存行（约 348 行）：
```js
    this._skipBtn = document.getElementById('skip-intro-btn');
```
4. `_bindEvents()` 内的跳过按钮绑定块（约 395-400 行）：
```js
    // --- 跳过开场白按钮 ---
    if (this._skipBtn) {
      this._skipBtn.addEventListener('click', function () {
        self._skipIntro();
      });
    }
```

- [ ] **Step 3: `js/event.js` — 删除 `init()` 中的开场标志与新游戏监听**

删除以下内容（按原文精确匹配）：
1. `init()` 内（约 275 行）：
```js
    // 重置开场白侧边栏触发标志（支持清除存档后重新开始）
    this._sidebarRevealed = false;
```
2. `init()` 内新游戏监听块（约 304-315 行）：
```js
    // 监听新游戏开始事件 — 重置侧边栏触发标志 + 清空对话区
    window.addEventListener('newgame-start', function () {
      self._sidebarRevealed = false;
      self._displayQueue = [];
      self._isTyping = false;
      self._isSkipping = false;
      if (self._typewriterTimer) {
        clearTimeout(self._typewriterTimer);
        self._typewriterTimer = null;
      }
      if (self._narrativeEl) self._narrativeEl.innerHTML = '';
    });
```

- [ ] **Step 4: `js/event.js` — 删除 `_addNarratorText` 中的跳过模式分支**

删除以下内容（按原文精确匹配）：
1. 跳过模式提前返回块（约 792-800 行）：
```js
    // 跳过模式：瞬间完成，无打字机
    if (this._isSkipping) {
      var p = document.createElement('p');
      p.textContent = text;
      this._narrativeEl.appendChild(p);
      this._scrollToBottom();
      if (doneCallback) doneCallback();
      return;
    }

```
2. 显示跳过按钮块（约 808-811 行）：
```js
    // 显示跳过按钮（仅开场阶段）
    if (!this._sidebarRevealed && this._skipBtn) {
      this._skipBtn.classList.remove('hidden');
    }

```
3. `typeChar` 内的跳过分支（约 820-828 行），将：
```js
    function typeChar() {
      if (self._isSkipping) {
        // 跳过：直接填满剩余文字
        p.textContent = text;
        p.classList.remove('typing-cursor');
        self._scrollToBottom();
        if (doneCallback) doneCallback();
        return;
      }
      if (index < text.length) {
```
改为：
```js
    function typeChar() {
      if (index < text.length) {
```

- [ ] **Step 5: `js/event.js` — 删除整节「跳过开场白」**

删除以下整节内容（约 866-918 行，按原文精确匹配，含分节注释、JSDoc 与整个 `_skipIntro` 方法；队列空时的建议显示由 `_processQueue` 已有逻辑承担）：

```js
  /* ===================================================================
     跳过开场白
     =================================================================== */

  /**
   * 跳过开场白 — 瞬间显示所有剩余文本，立即触发侧边栏
   */
  _skipIntro: function () {
    this._isSkipping = true;

    // 清除正在进行的打字机计时器
    if (this._typewriterTimer) {
      clearTimeout(this._typewriterTimer);
      this._typewriterTimer = null;
    }

    // 移除当前段落的打字光标
    var cursors = this._narrativeEl.querySelectorAll('.typing-cursor');
    cursors.forEach(function (el) {
      el.classList.remove('typing-cursor');
    });

    // 瞬间渲染队列中所有剩余文本
    while (this._displayQueue.length > 0) {
      var text = this._displayQueue.shift();
      if (text.indexOf(PLAYER_PREFIX) === 0) {
        this._addPlayerActionText(text.substring(PLAYER_PREFIX.length));
      } else {
        var p = document.createElement('p');
        p.textContent = text;
        this._narrativeEl.appendChild(p);
      }
    }

    // 立即触发侧边栏显示
    if (!this._sidebarRevealed) {
      this._sidebarRevealed = true;
      window.dispatchEvent(new CustomEvent('sidebar-reveal'));
    }

    this._isTyping = false;
    this._scrollToBottom();

    // 隐藏跳过按钮
    if (this._skipBtn) {
      this._skipBtn.classList.add('hidden');
    }

    // 显示建议
    if (this._pendingResponses === 0) {
      this.showSuggestions(getLocationSuggestions());
    }
  },
```

- [ ] **Step 6: `js/event.js` — 清理 `_processQueue` 中的开场残留**

1. 删除队列空分支中的隐藏跳过按钮块与侧边栏派发块（约 1075-1084 行），将：
```js
    if (this._displayQueue.length === 0) {
      this._isTyping = false;

      // 隐藏跳过按钮
      if (this._skipBtn) {
        this._skipBtn.classList.add('hidden');
      }

      // 开场白播放完毕 — 触发侧边栏渐显
      if (!this._sidebarRevealed) {
        this._sidebarRevealed = true;
        window.dispatchEvent(new CustomEvent('sidebar-reveal'));
      }

      // 队列空闲且无待处理响应时显示建议
```
改为：
```js
    if (this._displayQueue.length === 0) {
      this._isTyping = false;

      // 队列空闲且无待处理响应时显示建议
```
2. 玩家行动分支（约 1100-1103 行），将：
```js
      var delay = this._isSkipping ? 0 : 200;
      setTimeout(function () {
        self._processQueue();
      }, delay);
```
改为：
```js
      setTimeout(function () {
        self._processQueue();
      }, 200);
```
3. 叙事分支（约 1108-1112 行），将：
```js
        self._scrollToBottom();
        // 每段之间稍作停顿（跳过模式无延迟）
        var delay = self._isSkipping ? 0 : 300;
        setTimeout(function () {
          self._processQueue();
        }, 300);
```
改为：
```js
        self._scrollToBottom();
        // 每段之间稍作停顿
        setTimeout(function () {
          self._processQueue();
        }, 300);
```

- [ ] **Step 7: `js/app.js` — 删除两个监听并更新注释**

1. 第 87 行注释，将：
```js
    // 11. 事件对话引擎懒初始化：首次打开特写（closeup-open）或新游戏（newgame-start）时渲染
```
改为：
```js
    // 11. 事件对话引擎懒初始化：首次打开特写（closeup-open）时渲染
```
2. 删除新游戏监听整块（约 109-112 行，含注释）：
```js
    // 16.8 新游戏开始 → 懒初始化对话引擎（无头渲染开场叙事，队列完成触发侧边栏渐显）
    window.addEventListener('newgame-start', function () {
      EventPanel.init();
    });

```
3. 删除开场白结束监听整块（约 133-140 行，含注释）：
```js
    // 21. 监听开场白结束事件 — 侧边栏渐显 + 地点背景显示
    window.addEventListener('sidebar-reveal', function () {
      var sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.remove('sidebar-hidden');
      var mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.classList.remove('full-width');
      showInitialBackground();
    });
```

- [ ] **Step 8: `css/event.css` — 删除跳过按钮样式节**

删除从分节注释 `/* --------------------------------------------------------------------------\n   4.5 跳过开场白按钮\n   -------------------------------------------------------------------------- */`（约 59-61 行）到 `.skip-intro-btn.hidden { ... }` 块结束（约 89-91 行）之间的全部内容（`.skip-intro-btn`、`.skip-intro-btn:hover`、`.skip-intro-btn.hidden` 三条规则）。

- [ ] **Step 9: 引用检查**

Run（PowerShell）：
```powershell
Select-String -Path js\*.js,css\*.css -Pattern "newgame-start|sidebar-reveal|skip-intro|_skipIntro|_isSkipping|_sidebarRevealed|OPENING_NARRATIVE|loadOpeningNarrative"
```
Expected: 0 条匹配。（`loadOpeningLines` 不在模式内，属保留接口。）

再确认对话引擎懒初始化路径仍在：
```powershell
Select-String -Path js\app.js -Pattern "closeup-open|EventPanel.init"
```
Expected: app.js:104-107 的 `closeup-open` 监听 + `EventPanel.init()` 存在。

- [ ] **Step 10: 数据校验**

```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
```
Expected: 两个都 PASS。

- [ ] **Step 11: 浏览器回归**

Playwright（http://localhost:8080）：
- **读档路径**：标题页点「继续冒险」（需先有存档；无存档则先新游戏 → 手动保存 → 刷新回标题）→ 无字幕、直接光晕 → 渐入 → 存档状态恢复正确（当前场景/时间/侧边栏）
- **新游戏路径复验**：字幕 3 句 → 光晕 → 场景（Task 1 行为无回归）
- **对话链路**：场景点头像 → 全屏特写 → 对话引擎渲染 + 输入框存在 → 发送文本 → 正常叙事输出或优雅错误（bridge 已配 key 时输出正常叙事）；页面无白屏、无 JS 运行时错误
- 控制台检查无 JS 运行时错误
- 截图证据存 `C:\Users\Administrator\each-dawm-\.superpowers\sdd\2026-08-17-newgame-transition\task2-*.png`

- [ ] **Step 12: 提交**

```bash
git add js/title.js js/event.js js/app.js css/event.css
git commit -m "refactor: 读档光晕转场 + 开场白死代码清理（跳过按钮机制/事件链/监听）"
```

---

### Task 3: 整体回归验收

**Files:**
- 无新增；修回归中发现的问题（如有）

**Interfaces:**
- Consumes: Task 1-2 全部产物

- [ ] **Step 1: 全部校验脚本 + bridge 冒烟（条件执行）**

```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
```
Expected: 两个都 PASS。

若 bridge 在 9999 端口运行（当前环境已运行且配 key）：
```powershell
python -X utf8 scripts/smoke-bridge-emotion.py
```
Expected: PASS（协议形状验证）；若因已配 key 导致 502 路径断言不适用，记录实际输出并确认 split_emotion 单元测试通过即可，不阻塞。

- [ ] **Step 2: 转场专项回归（Playwright）**

- **防连点**：快速双击「新的旅程」→ 仅一个转场、结束后无残留覆盖层（`#transition-overlay` 无 `hidden` 类残留）
- **跳过**：字幕阶段点击 → 立即光晕 → 渐入场景；光晕阶段点击无效果
- **世界书接口验证**：备份 `data/worldbook.json` 首句原文 → 临时改 `first_mes` 首句为「测试字幕：世界书接口生效。」→ 新游戏 → 第一句字幕为测试文本 → **还原文件**（内容与备份逐字一致，`git status` 确认 `data/worldbook.json` 无改动）
- **失败回退**：临时重命名 `data/worldbook.json`（如 `worldbook.json.bak`）→ 新游戏 → 字幕为内置默认文本前 3 句（「你在无尽的黑暗中睁开了双眼。」…）→ 还原文件名
- **移动端视口**：375×667 → 字幕不溢出（max-width 80% + clamp 字号）、光晕铺满、转场后特写对话区可用
- **存档恢复**：特写打开状态下手动保存 → 刷新 → 读档 → 光晕转场后 closeup 状态一致（特写层不残留、回到存档场景）

- [ ] **Step 3: 场景与对话无回归快速走查**

- 16 场景漫游（可快速跳转）：出口连通、头像层正常、字幕/覆盖层无残留（z-index 100 的覆盖层转场后必为 hidden）
- 对话链路：头像 → 特写 → 对话 → 关闭 → 场景状态不丢

- [ ] **Step 4: 提交（仅当有修复）**

```bash
git add <仅本计划相关修复的具体文件路径，逐个列出>
git commit -m "fix: 转场/清理回归修复"
```
注意：绝不添加 `server/start.bat` 与 `assets/` 未跟踪文件。

---

## 验收标准（全部完成 = 本计划完成）

1. 新的旅程：黑底逐句字幕（世界书 `first_mes` 前 3 句）→ 点击跳过或播完 → 光晕铺满 → 渐入场景；侧边栏立即可见；无打字机整段开场
2. 继续冒险：仅光晕渐入（无字幕），存档状态恢复正确
3. 世界书 `first_mes` 修改 → 字幕自动跟随；世界书缺失 → 默认字幕回退；`data/worldbook.json` 文件保持不动
4. 开场白死代码全清：`newgame-start` / `sidebar-reveal` / `skip-intro` / `_skipIntro` / `_isSkipping` / `_sidebarRevealed` / `OPENING_NARRATIVE` / `loadOpeningNarrative` 全库 0 引用
5. 对话引擎链路无损：`closeup-open` → `EventPanel.init()` 懒初始化、`#closeup-dialog` 挂载、发送文本/错误路径正常
6. `node scripts/validate-scenes.mjs` 与 `node scripts/validate-emotion.mjs` 全 PASS；无 JS 运行时错误
7. 防连点、移动端视口、存档恢复回归通过

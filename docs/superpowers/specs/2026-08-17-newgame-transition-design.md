# 光之回响设计：开场逐句字幕 + 光晕转场（新游戏/读档入口过渡）

**日期**：2026-08-17
**状态**：设计三节已获用户确认（v3：galgame 式逐句字幕）
**范围**：替换「新游戏自动播放整段开场叙事」为电影感转场 —— 黑底逐句字幕（galgame 式）→ 光晕铺满 → 渐入场景；读档仅光晕无字幕
**依赖**：在途 avatar-closeup 计划（docs/superpowers/plans/2026-08-16-avatar-closeup.md）完成后实施

## 1. 背景与目标

用户要求去掉点「新的旅程」后自动播放的整段开场叙事（打字机式 3 段），改为：1 秒左右动画 + 渐入场景。经头脑风暴确认：保留开场叙事的「镜头感」——以 galgame 式逐句字幕呈现，字幕文本取自世界书 `first_mes`，用户后续修改世界书设定时字幕自动跟随（接口预留）。

## 2. 已确认的需求决策

| 决策项 | 结论 |
|---|---|
| 动画内容 | 光晕过渡（呼应「光之回响」：中心光斑扩散成光晕铺满全屏，纯 CSS 无素材） |
| 字幕形式 | galgame 式逐句：第一句淡入居中 → 停留 → 淡出 → 第二句…… 依次播完全部句子 |
| 字幕文本来源 | 世界书 `data/worldbook.json` 的 `first_mes`，按中文标点断句（。！？…；）成句子数组；世界书缺失/加载失败 → 回退代码内置默认句子 |
| 字幕时长 | 每句基础停留 1.2 秒，按字数加时；断句算法见 §4 |
| 跳过 | 字幕阶段点击任意处 → 直接进入光晕阶段（快进） |
| 光晕时长 | 铺满约 1 秒；覆盖层淡出露出场景约 0.4 秒 |
| 适用范围 | 新的旅程 = 字幕 + 光晕（光晕 1s + 渐入 0.4s，另有字幕 句数×约1.2s）；继续冒险 = 仅光晕无字幕（约 1.4 秒） |
| 开场叙事本体 | 不再自动整段播放；`data/worldbook.json` 文本数据**保持不动** |
| 世界书接口 | `loadOpeningLines()`：first_mes → 句子数组，为未来世界书设定修改预留的接缝 |

## 3. 交互流程总览

```
【新的旅程】
标题界面（点击）
   │ 状态重置 + 切场景 + 侧边栏立即可见 + 初始背景（场景在覆盖层背后就位）
   ▼
┌─ 黑底字幕阶段：句 1 淡入停留淡出 → 句 2 → …… → 句 N ──┐  （点击任意处跳过）
└──────────────────────────────────────────────────┘
   │ 光晕阶段：中心光斑扩散铺满全屏（约 1s）
   ▼
   覆盖层淡出（约 0.4s）→ 场景渐入，正常操作

【继续冒险】
标题界面（点击）
   │ 加载存档 + 切场景 + 侧边栏可见 + 背景
   ▼
   光晕铺满（约 1s）→ 覆盖层淡出（约 0.4s）→ 场景渐入
```

- 动画期间覆盖层挡住下方按钮，天然防连点；另有 `isPlaying` 标志兜底
- 点击跳过只发生在字幕阶段；光晕阶段不可跳（时长短）

## 4. 架构与模块划分

### 4.1 `js/transition.js` — TransitionView（新增，独立小模块）

对外 API：`init()`、`play({ lines })`、`isPlaying`

- `init()`：创建 `#transition-overlay`（含字幕层 + 光晕层）挂到 body；元素缺失则标记不可用
- `play({ lines })`：
  - `lines` 为 null/空 → 直接进光晕阶段（读档路径）
  - `lines` 为句子数组 → 逐句播放：字幕元素淡入（CSS class 切换）→ 停留 `max(1.2s, 字数×0.08s)` → 淡出 → 下一句
  - 字幕阶段监听 overlay 点击 → 跳到光晕阶段
  - 光晕动画播完 → 覆盖层淡出（约 0.4s）→ 移除/隐藏，`isPlaying` 复位
- 状态机：`idle → subtitle → halo → reveal → idle`；`isPlaying` 在非 idle 时为 true，入口调用方以此为防重入守卫
- 内部私有函数沿用 `_` 前缀 + 中文注释风格

### 4.2 断句与加载（title.js 内，世界书接口）

- `loadOpeningLines()`（改造现有 `loadOpeningNarrative()`）：
  1. `fetch('data/worldbook.json')` → 取 `first_mes`，剥离 `<maintext>` 标签，`\\n` 转真换行
  2. 断句：按 `。！？…；` 切分 + 换行切分，过滤空白句；保留句尾标点
  3. 返回句子数组（空数组 = 加载失败）
  4. 失败/空 → 回退内置默认句子数组（现有默认 3 段文本按同样断句规则预切）
- 加载在 TitleScreen.init 时进行（同现状），转场时直接用缓存结果
- **接口语义**：世界书 `first_mes` 的句子内容/顺序/句数变更 → 字幕自动跟随，零代码改动

### 4.3 入口改造（title.js）

- `_startNewGame()`：删除开场叙事写入 `narrativeHistory` 的整块；保留状态重置、`newgame-start` 派发（如清理后无消费者则一并删除，见 §5）、切场景；增加侧边栏立即可见 + `showInitialBackground()`（沿用 `_onContinue()` 现有模式）；随后 `TransitionView.play({ lines })`
- `_onContinue()`：加载存档逻辑不变，末尾 `TransitionView.play({ lines: null })`

### 4.4 CSS（css/transition.css，新增）

- `#transition-overlay`：fixed 全屏，z-index 高于标题与场景层（≥ 100）
- 字幕层：居中、max-width 80%、字号 22px、行高 1.8、自动换行，淡入/淡出 transition
- 光晕层：radial-gradient 中心光斑，keyframes 从 `scale(0)`/低透明度扩散到铺满全屏
- 移动端：字幕自适应小屏不溢出（max-width + 相对字号）

## 5. 死代码清理范围（开场白停播后永不再触发的机制）

| 文件 | 清理项 |
|---|---|
| js/title.js | `OPENING_NARRATIVE` 默认常量（改为 `loadOpeningLines` 的回退数据）、`loadOpeningNarrative()`（改造为 `loadOpeningLines()`）、`_startNewGame` 中 `narrativeHistory` 追加块 |
| js/event.js | 「跳过 ▸▸」按钮 DOM 与 `_skipBtn`、仅开场阶段显示跳过按钮的逻辑、`skipIntro()` 方法、开场白播放完毕 → `sidebar-reveal` 派发链、`newgame-start` 监听中的开场标志重置 |
| js/app.js | `newgame-start` 监听（16.8/16.9，若清理后无消费者）、`sidebar-reveal` 监听（21，改为 title.js 直接操作侧边栏类名与背景） |

**边界**：`EventPanel` 核心对话引擎不动；`closeup-open` → `EventPanel.init()` 懒初始化路径（app.js:104-107）不动；`data/worldbook.json` 不动。

## 6. 错误处理

| 场景 | 行为 |
|---|---|
| 世界书 fetch 失败/解析失败/首段为空 | 回退内置默认句子，字幕照常播放 |
| `#transition-overlay` 创建失败（DOM 异常） | 标记不可用，`play()` 直接返回，场景照常进入（不阻塞） |
| 字幕阶段快速连点 | 首次点击即切光晕阶段；`isPlaying` 守卫防重入 |
| 极端长句（世界书一句几百字） | CSS 自动换行，max-width 80% 内正常排版 |

## 7. 测试与验收

- 校验脚本：`node scripts/validate-scenes.mjs`、`node scripts/validate-emotion.mjs` 保持 PASS
- 浏览器回归（Playwright）：
  1. 新的旅程：逐句字幕按序播放、时长节奏正常、句间淡出干净无残留
  2. 字幕阶段点击 → 立即进光晕 → 渐入场景
  3. 继续冒险：无字幕、仅光晕、存档状态恢复正确
  4. 修改 `first_mes` 首段文本 → 字幕跟随变化（接口验证，测完还原原文本）
  5. 连点两入口按钮 → 无双重转场/无残留覆盖层
  6. 移动端视口（375×667）：字幕不溢出、光晕正常铺满
  7. 转场后对话链路正常（点头像进特写、发送文本、错误路径优雅）
- 验收标准：以上全 PASS 且无 JS 运行时错误；存档/读档不受影响

## 8. 不在本设计内

- 动态 CG 特写特性（另有设计：docs/superpowers/specs/2026-08-17-dynamic-cg-design.md）
- 世界书文本内容修改（用户侧后续自行修改，本设计只预留读取接口）
- 起始 CG 图过渡升级（光晕覆盖层结构已为其预留：未来把光晕层换成 CG 图即可）

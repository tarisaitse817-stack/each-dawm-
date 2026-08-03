# YGO 决斗竞技场 — 设计文档

**状态：待实现**
**日期：2026-08-03**

---

## 1. 项目概述

一个基于 Web 的游戏王 (Yu-Gi-Oh! OCG) 对战模拟器，使用 TypeScript 实现规则引擎和 AI 对手，大模型 (LLM) 驱动对战叙事。旨在还原 ygopro 原生对战体验，同时注入沉浸式的故事叙述。

### 核心定位

- **规则引擎** = TypeScript 状态机，保证 OCG 规则正确性
- **AI 对手** = 纯 TS 搜索树 + 启发式评估，不做 LLM 决策
- **LLM 叙事** = 唯一的 LLM 调用点，将机械的 ActionLog 翻译为沉浸式故事

### 与"牌佬的奇妙冒险"的区别

| | 牌佬的奇妙冒险 | 本项目 |
|---|---|---|
| 规则 | 简化版 (LP 4000, 2层连锁) | 完整 OCG 规则 |
| 卡牌 | 预设少量卡牌 | 7 个卡组, 228 张不重复卡 |
| 引擎 | LLM 驱动对战 | TypeScript 状态机 + 规则引擎 |
| AI | LLM 扮演 | TypeScript 搜索树 |
| 目标 | AI 文字冒险 × 卡牌 | 还原 ygopro 原生对战 |

---

## 2. 技术栈

| 层 | 技术选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite |
| 状态管理 | Zustand (单一 store) |
| 卡牌数据 | JSON (从 E:\MyCardLibrary\ygopro2\cdb\cards.cdb 导出) |
| 规则引擎 | 纯 TypeScript，零浏览器依赖 |
| 叙事 | LLM API 调用 (OpenAI 兼容，默认 DeepSeek) |
| 角色卡 | chara_card_v3 PNG 格式 (SillyTavern 兼容) |
| 世界书 | SillyTavern World Info JSON 格式 |
| 预设 | SillyTavern Preset JSON 格式 |

---

## 3. 总体架构

```
┌─────────────────────────────────────────────────┐
│                    React UI                      │
│  ┌──────────────┐   ┌──────────────────────────┐ │
│  │  故事面板     │   │      棋盘视图             │ │
│  │  (叙事+对话)  │   │  (怪兽区·魔陷区·场地·额外) │ │
│  │  30%          │   │  70%                      │ │
│  └──────┬───────┘   └──────────┬───────────────┘ │
│         │                      │                  │
│  ┌──────┴──────────────────────┴───────────────┐ │
│  │              Zustand Store (单 store)        │ │
│  │   gameState | narrativeMessages | settings   │ │
│  └──────────────────────┬──────────────────────┘ │
└─────────────────────────┼────────────────────────┘
                          │
┌─────────────────────────┼────────────────────────┐
│              Engine Layer (纯 TS，无 UI 依赖)     │
│                         │                         │
│  ┌──────────┐  ┌────────┴────┐  ┌─────────────┐  │
│  │ 阶段机    │  │ 效果解析器   │  │ 连锁栈      │  │
│  │ Phase    │  │ Effect      │  │ Chain       │  │
│  │ Machine  │  │ Resolver    │  │ Stack       │  │
│  └──────────┘  └─────────────┘  └─────────────┘  │
│                         │                         │
│  ┌──────────────────────┴──────────────────────┐  │
│  │           Card Registry (228 张)             │  │
│  │  每张卡实现 Card 接口：canActivate / resolve │  │
│  └──────────────────────────────────────────────┘  │
│                                                   │
│  ┌──────────────┐  ┌─────────────────────────┐    │
│  │ AI 对手       │  │ 叙事生成器               │    │
│  │ SearchTree   │  │ Storyteller (LLM API)    │    │
│  │ + Heuristic  │  │                          │    │
│  └──────────────┘  └─────────────────────────┘    │
└───────────────────────────────────────────────────┘
```

**关键边界**：
- Engine 层是纯 TypeScript，不依赖浏览器 API，可独立单元测试
- 所有游戏状态通过 Zustand 单一 store 暴露给 UI
- AI 和叙事是 Engine 层的两个独立消费者，互不耦合

---

## 4. 游戏状态数据结构

```typescript
interface GameState {
  players: [PlayerState, PlayerState]

  turn: number
  turnPlayer: 0 | 1
  phase: Phase          // DP | SP | MP1 | BP | MP2 | EP
  step: Step | null     // 伤判细分: start → damageCalc → afterDamage → end

  chain: ChainLink[]
  priority: 0 | 1
  priorityPassed: [boolean, boolean]

  normalSummonUsed: [number, number]
  turnActions: ActionLog[]
}

interface PlayerState {
  lp: number
  deck: Card[]
  extraDeck: Card[]
  hand: Card[]
  monsterZones: (MonsterCard | null)[]   // [5]
  stZones: (SpellTrapCard | null)[]      // [5]
  fieldZone: SpellCard | null
  graveyard: Card[]
  banished: Card[]
  extraMonsterZone: MonsterCard | null
}
```

---

## 5. 阶段机

```
DP → SP → MP1 → BP → MP2 → EP → 对手 DP ...
              ↓           ↑
          (可跳过)    (可跳过)
```

每个 phase 是纯函数：`(state: GameState) => PhaseResult`

阶段流转逻辑：
1. 进入阶段 → 检查诱发效果
2. 双方交替获得优先权
3. 双方都放弃优先权 → 进入下一阶段
4. BP 特殊：攻击宣言每一步检查伤判

---

## 6. 连锁栈

栈式结构，后进先出：

```
[ChainLink1]  ← 栈底 (C1)
[ChainLink2]
[ChainLink3]  ← 栈顶 (C3)

处理：C3 → C2 → C1
```

咒文速度规则：
- SS1 (通常/诱发)：不能连锁 SS2
- SS2 (速攻/通常陷阱/怪兽快速效果)：可连锁 SS1/SS2
- SS3 (反击陷阱)：只能被 SS3 连锁

---

## 7. 卡牌效果系统 (状态机模式)

### Card 接口

```typescript
interface CardDefinition {
  id: number
  name: string
  cardType: CardType

  canActivate(ctx: ActivationContext): Activation[]
  resolve(act: Activation, state: GameState): GameState

  continuousEffects?: ContinuousEffect[]
}

interface Activation {
  effectId: number
  effectType: 'trigger' | 'ignition' | 'quick' | 'quickLike'
  spellSpeed: 1 | 2 | 3
  cost?: (state: GameState) => { valid: boolean; apply: (s: GameState) => GameState }
  condition?: (state: GameState) => boolean
  targets?: TargetRequirement
  description: string
}
```

### 效果解析流水线

```
canActivate() → 收集可选效果
     │
     ▼
玩家/AI 选择 Activation
     │
     ▼
检查 condition → 不通过 → 中止
     │
     ▼
选择目标 (targets)
     │
     ▼
支付 cost → 不够/不合法 → 中止
     │
     ▼
进入连锁栈
     │
     ▼
resolve() → 返回新 GameState (纯函数，不可变更新)
```

### 预估代码量

- 每张有效果的卡：40-70 行 TS
- 200 张有效果卡：~12,000 行
- 引擎核心：~2,500 行
- 总 tokens（含引擎+效果+UI+AI）：~98K

---

## 8. AI 对手

### 架构

纯 TypeScript，不做 LLM 调用。使用 Minimax + Alpha-Beta 剪枝 + 启发式候选生成。

### 候选行动生成器

不穷举所有合法行动。使用启发式筛选：

```
1. 必定发动的诱发效果（不容跳过）
2. 高价值可选行动（启发式排序）
3. 通常召唤选项
4. 攻击宣言选项
5. 进入下一阶段（总是可选）

裁剪到 12 个候选项
```

### 评估函数

加权综合评分：
- LP 差 × 0.1
- 场上怪兽 ATK 总和 × 1.5
- 场差（卡数差）× 3.0
- 手牌数 × 2.0
- 强力终端数量（额外卡组）× 0.5
- 墓地资源价值 × 0.8
- 盖卡数量 × 1.5

### 搜索深度

- 通常局面：depth = 2
- 关键局面 (对方空场/LP<2000)：depth = 4

### 卡组策略模板

每个卡组附带 JSON 策略文件，影响启发式排序：

```json
{
  "archetype": "虫惑魔",
  "priority": {
    "normalSummon": ["特莱恩之虫惑魔", "兰卡之虫惑魔"],
    "firstTurn": "setTrapHeavy",
    "goingSecond": "breakBoard"
  }
}
```

---

## 9. 叙事系统

### 输入模型

角色卡 PNG (chara_card_v3) 是唯一的主要输入，包含一切：

```
角色卡 PNG
├── 角色定义 (name, description, personality, scenario)
├── 首条对话 (first_mes) → 对战开场白
├── 示例对话 (mes_example) → few-shot 样本
├── 内嵌世界书 (character_book.entries) → 叙事规则/事件机制
└── 扩展配置 (depth_prompt, talkativeness)
```

可选覆盖层：
- 外部世界书 (YGO 卡牌背景、怪兽设定)
- 预设 (采样参数、prompt_order)

### Storyteller 接口

```typescript
interface StorytellerConfig {
  character: CharacterCard       // PNG 解析结果
  externalWorldBooks?: Lorebook[]
  preset?: ChatPreset
}
```

### 触发时机

不是每个动作都叙事。只在以下事件触发：

- 阶段切换
- 召唤 5 星以上怪兽
- 攻击宣言
- 怪兽被战破/效破
- 连锁 3 层以上
- LP 变化 > 2000
- 陷阱翻开
- 决斗结束

### Prompt 结构

```
System:
  - 角色描述 (从 PNG)
  - 世界观设定 (从世界书扫描)
  - 叙事规则 (从 character_book.entries)
  - 深度提示 (从 depth_prompt)
  - 对局实时变量 (LP/场上/墓地/连锁)

User:
  - 场上局势简述
  - 刚刚发生的动作
  - 叙事请求 (触发类型)
```

### SillyTavern 兼容性

所有用户可编辑的配置文件沿用酒馆标准格式：

```
public/
├── characters/    ← PNG 角色卡 (chara_card_v3)
├── worldbooks/    ← JSON 世界书
└── presets/       ← JSON 预设
```

用户可直接使用酒馆社区下载的资源。

---

## 10. 卡牌数据

### 来源

`E:\MyCardLibrary\ygopro2\cdb\cards.cdb` (SQLite3)

### 导出方式

在项目构建前，运行导出脚本将 228 张卡的数据（卡名、效果文本、攻守、属性、种族、类型等）提取为 JSON 文件嵌入项目。运行时零依赖，直接查表。

### 卡组列表

| 文件 | 卡组 | 核心机制 | 主卡组/额外 |
|------|------|----------|-------------|
| deck.ydk | 圣天树/六花/芳香/蕾祸 | 链接+同调 | 45/15 |
| deck（天气）.ydk | 天气 | 超量 | 40/15 |
| deck（烙印）.ydk | 烙印 | 融合 | 60/15 |
| deck（珠泪）.ydk | 珠泪哀歌族 | 融合+超量 | 43/15 |
| deck（直播双子）.ydk | 直播☆双子/刻魔 | 链接 | 40/15 |
| deck（码丽丝）.ydk | 码丽丝 | 链接 | 40/15 |
| deck（虫）.ydk | 虫惑魔 | 超量 | 40/15 |

**覆盖的召唤机制**：融合、同调、超量、链接（无灵摆/仪式）
**不重复卡牌**：228 张

### 目标 OCG 机制范围

必须支持（这些卡组用到）：
- 通常召唤、特殊召唤、祭品召唤
- 融合召唤（融合魔法 / 接触融合）
- 同调召唤（调整 + 非调整）
- 超量召唤（叠放）
- 链接召唤（链接攀升）
- 连锁系统（咒文速度 1/2/3）
- 伤判步骤
- 墓地效果、除外区
- 永续效果、快速效果、诱发效果、起动效果
- 战斗阶段、主要阶段 1/2
- 准备阶段/结束阶段诱发

不需要支持（7 个卡组未涉及）：
- 灵摆召唤、仪式召唤
- 连接箭头指向机制
- 反转召唤、二重怪兽、灵魂怪兽、同盟怪兽

---

## 11. UI 设计

### 视觉语言：继承"光之回响"

| 要素 | 规范 |
|------|------|
| 底色 | `#0a0d14` 深邃暗蓝黑 |
| 主强调色 | 灵蓝 `#4FC3F7` / 暖金 `#FFD54F` |
| 辅助色 | 灵绿 `#81C784` |
| 面板 | 毛玻璃 `backdrop-filter: blur(12px)` + `rgba(10,13,20,0.85)` |
| 边框 | `rgba(79,195,247,0.3)` 辉光 |
| 正文 | 霞鹜文楷 (LXGW WenKai) |
| UI 字体 | Noto Sans SC |
| 标题字体 | Cinzel |
| 圆角 | 6px / 12px / 20px |

### 双栏布局

```
┌────────────────────────────────────────────────────┐
│  顶部栏：回合 │ 阶段条 │ LP                           │
├───────────────┬────────────────────────────────────┤
│ 📜 故事 (30%)  │ 🃏 棋盘 (70%)                      │
│               │                                     │
│ 霞鹜文楷正文    │   ┌── 对手场地 ──┐                  │
│ 对手对话气泡    │   │ M1..M5 / S1..S5 / EMZ         │
│               │   │  中央分隔线    │                  │
│               │   │ M1..M5 / S1..S5 / EMZ         │
│               │   └── 我方场地 ──┘                  │
│               │                                     │
├───────────────┴────────────────────────────────────┤
│ 操作栏 + 手牌区 (扇形展开)                             │
└────────────────────────────────────────────────────┘
```

### 棋盘详细区域

- 怪兽区 ×5：120×160，虚线边框，有卡时实线+辉光
- 魔陷区 ×5：100×100
- 额外怪兽区 ×1：120×150，金色虚框
- 场地魔法区 ×1：60×80，绿色
- 卡组/额外卡组/墓地/除外：60×80 侧区
- 手牌：底部扇形排列，hover 上升

### 动画 (继承光之回响)

- 卡牌入场：坠落弹跳
- 攻击：横扫冲刺
- 送墓：翻转缩小下沉
- 连锁：脉冲辉光
- 融合召唤：金色漩涡
- LP 伤害：红色闪烁

### 响应式

- >900px：标准双栏
- ≤900px：故事面板收起为抽屉，棋盘全宽
- ≤600px：区域缩小 + 按钮换行

---

## 12. 项目结构

```
src/
├── engine/              # 规则引擎（纯 TS，零依赖）
│   ├── state.ts         # GameState 类型 + 不可变更新
│   ├── phases.ts        # 阶段机
│   ├── chain.ts         # 连锁栈
│   ├── summon.ts        # 召唤处理
│   ├── battle.ts        # 战斗/伤判
│   └── effects.ts       # 效果解析器
├── cards/               # 卡牌
│   ├── data/            # cards.cdb → JSON 导出
│   ├── registry.ts      # 卡片注册表
│   └── archetypes/      # 按卡组分目录
│       ├── traptrix/    # 虫惑魔
│       ├── branded/     # 烙印
│       ├── tearlaments/ # 珠泪
│       ├── livetwin/    # 直播双子
│       ├── maliss/      # 码丽丝
│       ├── sunavalon/   # 圣天树/六花/芳香/蕾祸
│       └── weather/     # 天气
├── ai/                  # AI 对手
│   ├── search.ts        # Minimax + Alpha-Beta
│   ├── heuristic.ts     # 候选生成 + 启发式
│   ├── evaluate.ts      # 静态评估函数
│   └── strategies/      # 卡组策略 JSON
├── narrative/           # 叙事引擎
│   ├── storyteller.ts   # 叙事入口
│   ├── character-parser.ts  # PNG 角色卡解析
│   ├── lorebook-engine.ts   # 世界书关键词扫描
│   └── prompt-assembler.ts  # Prompt 组装 + 变量注入
├── store/               # Zustand
│   └── gameStore.ts
├── ui/                  # React 组件
│   ├── board/           # 棋盘
│   │   ├── BattleBoard.tsx
│   │   ├── MonsterZone.tsx
│   │   ├── SpellTrapZone.tsx
│   │   ├── HandArea.tsx
│   │   └── SideZones.tsx
│   ├── story/           # 故事面板
│   │   ├── StoryPanel.tsx
│   │   └── ChatBubble.tsx
│   ├── settings/        # 设置
│   │   ├── SettingsModal.tsx
│   │   └── DeckSelector.tsx
│   └── shared/          # 共享
│       ├── Panel.tsx
│       └── Button.tsx
├── styles/              # CSS
│   ├── variables.css    # 设计变量 (继承光之回响)
│   ├── base.css
│   ├── board.css
│   └── story.css
└── public/
    ├── characters/      # 角色卡 PNG
    ├── worldbooks/      # 外部世界书 JSON
    └── presets/         # 预设 JSON
```

---

## 13. 测试策略

### 单元测试
- 每张卡至少 1 个正向测试（条件满足 → 效果触发）
- 关键卡增加反向测试（条件不满足 → 效果不触发）
- 引擎核心函数测试（阶段切换、连锁处理、召唤流程）

### 集成测试
- 标准对局场景回放验证（手动构造关键对局状态）
- 特定连锁场景（如：C1 落穴 → C2 星光大道 → C3 神之宣告）

### AI 测试
- 固定局面下 AI 选择合理性（不自动投降、不放弃明显优势）
- 评估函数对称性验证（零和局面 score = 0）

---

## 14. 待定事项

- [ ] 项目名称
- [ ] 是否增加更多卡组（用户提到"十几个"）
- [ ] 部署目标 (Vercel/Netlify/静态文件)
- [ ] 是否需要联机对战

# 牌佬的奇妙冒险 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建"牌佬的奇妙冒险"——AI 文字冒险 × 卡牌对战 Web 应用

**Architecture:** React 19 + TypeScript + Vite SPA。Zustand 5 全局状态，Dexie 4 (IndexedDB) 持久化。文字冒险引擎和卡牌对战引擎均为纯逻辑 TypeScript 模块（零 React 依赖），在 React 组件中通过 store 桥接。

**Tech Stack:** React 19, TypeScript 5, Vite 8, Zustand 5, Dexie 4, Framer Motion 12, Lucide Icons, Google Fonts

## Global Constraints

- 所有文件存放于 `K:\card-adventure\`
- 纯静态部署产物 `dist/`，无后端
- CSS 统一使用 `tokens.css` 中的 CSS 变量，禁用 Tailwind
- 中文 UI，Lucide Icons 图标，禁止 emoji
- 色彩：灵火蓝 #4FC3F7 / Spirit Green #81C784 / 暖金辉 #FFD54F
- 字体：霞鹜文楷(正文)、思源黑体(UI)、Cinzel(英文标题)、Inter(英文正文)
- CSS 动画用 transform/opacity GPU 加速
- 文字冒险引擎、卡牌对战引擎均为纯逻辑模块，可脱离浏览器在 Node 测试
- 世界书 JSON 格式、正则脚本、API Key 均预留可配置端口
- 行动选项默认隐藏在按钮后，点击展开

## File Structure

```
K:\card-adventure\
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx                    # ReactDOM.createRoot 入口
│   ├── App.tsx                     # 顶层路由 + 全局布局
│   ├── tokens.css                  # CSS 变量（Ori 色彩体系）
│   │
│   ├── sillytavern/                # 文字冒险引擎（纯逻辑，零 React）
│   │   ├── llm.ts                  # OpenAI 兼容 API 客户端 + SSE 流式
│   │   ├── prompt.ts               # 提示词组装器
│   │   ├── worldbook.ts            # 世界书引擎
│   │   ├── mvu.ts                  # MVU 变量系统（JSON Patch）
│   │   ├── regex-script.ts         # 正则脚本引擎
│   │   ├── slash-command.ts        # 斜杠命令解析 + 执行
│   │   └── dice.ts                 # 骰子引擎
│   │
│   ├── battle/                     # 卡牌对战引擎（纯逻辑，零 React）
│   │   ├── engine.ts               # 规则引擎（阶段/召唤/伤害计算/连锁）
│   │   ├── ai.ts                   # AI 对手
│   │   ├── cards.ts                # 卡牌数据库（从 cards.cdb 提取）
│   │   ├── deck.ts                 # 卡组管理
│   │   └── types.ts                # 对战类型定义
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Notification.tsx
│   │   ├── story/
│   │   │   ├── StoryBook.tsx
│   │   │   ├── NarrativeText.tsx
│   │   │   ├── ActionPanel.tsx
│   │   │   └── InputBar.tsx
│   │   ├── battle/
│   │   │   ├── BattleOverlay.tsx
│   │   │   ├── BattleField.tsx
│   │   │   ├── MonsterZone.tsx
│   │   │   ├── SpellTrapZone.tsx
│   │   │   ├── HandCards.tsx
│   │   │   ├── PhaseIndicator.tsx
│   │   │   ├── LPDisplay.tsx
│   │   │   └── BattleLog.tsx
│   │   ├── deck/
│   │   │   └── DeckPanel.tsx
│   │   ├── settings/
│   │   │   └── SettingsModal.tsx
│   │   └── shared/
│   │       ├── CardDetail.tsx
│   │       └── ParticleBg.tsx
│   │
│   ├── stores/
│   │   ├── storyStore.ts
│   │   ├── battleStore.ts
│   │   ├── deckStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── db/
│   │   ├── schema.ts               # Dexie 表定义
│   │   └── adapters.ts             # Store ↔ DB 适配器
│   │
│   └── types/
│       └── index.ts                # 全局共享类型
│
└── public/
    ├── worldbook/                   # 用户放置世界书 JSON 文件
    ├── regex/                       # 用户放置正则脚本文件
    └── assets/
```

---

### Task 1: 项目脚手架 + CSS 变量体系 + 类型定义

**Files:**
- Create: `K:\card-adventure\package.json`
- Create: `K:\card-adventure\tsconfig.json`
- Create: `K:\card-adventure\vite.config.ts`
- Create: `K:\card-adventure\index.html`
- Create: `K:\card-adventure\src\main.tsx`
- Create: `K:\card-adventure\src\App.tsx`
- Create: `K:\card-adventure\src\tokens.css`
- Create: `K:\card-adventure\src\types\index.ts`
- Create: `K:\card-adventure\public\worldbook\.gitkeep`
- Create: `K:\card-adventure\public\regex\.gitkeep`
- Create: `K:\card-adventure\public\assets\.gitkeep`

**Interfaces:**
- Produces: `tokens.css` — CSS 变量体系（所有组件依赖）
- Produces: `src/types/index.ts` — `StoryEntry`, `MVUState`, `WorldBookEntry`, `SlashCommand`, `Settings` 等全局类型
- Produces: React 应用骨架 + Vite 构建配置

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "card-adventure",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "dexie": "^4.0.0",
    "framer-motion": "^12.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "~5.7.0",
    "vite": "^8.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

- [ ] **Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>牌佬的奇妙冒险</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500&family=LXGW+WenKai:wght@300;400;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: 创建 src/tokens.css — CSS 变量体系**

完整 CSS 变量，包含：

```css
:root {
  /* 色彩 */
  --color-spirit-blue: #4FC3F7;
  --color-spirit-green: #81C784;
  --color-warm-gold: #FFD54F;
  --color-bg-deep: #0a0d14;
  --color-bg-panel: rgba(10, 13, 20, 0.85);
  --color-border-glow: rgba(79, 195, 247, 0.3);
  --color-rarity-common: #9e9e9e;
  --color-rarity-rare: #4FC3F7;
  --color-rarity-epic: #ab47bc;
  --color-rarity-legendary: #FFD54F;
  --color-opponent-dark: #ab47bc;
  --color-opponent-red: #f44336;

  /* 字体 */
  --font-body: 'LXGW WenKai', serif;
  --font-ui: 'Noto Sans SC', sans-serif;
  --font-title: 'Cinzel', serif;
  --font-en: 'Inter', sans-serif;

  /* 过渡 */
  --transition-fast: 150ms ease-out;
  --transition-normal: 250ms ease-out;
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* 辉光 */
  --glow-sm: 0 0 8px;
  --glow-md: 0 0 16px;
  --glow-lg: 0 0 32px;

  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
}

/* --- CSS Reset --- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--color-bg-deep);
  color: #e0e0e0;
  font-family: var(--font-body);
  overflow: hidden;
  min-height: 100vh;
}

#root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* --- 滚动条 --- */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.3);
  border-radius: 3px;
}

/* --- 选中 --- */
::selection {
  background: rgba(79, 195, 247, 0.3);
  color: #fff;
}

/* --- 工具类 --- */
.hidden { display: none !important; }
.panel {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-glow);
  border-radius: var(--radius-md);
  backdrop-filter: blur(12px);
}
.btn-primary {
  padding: 10px 24px;
  border: 1px solid var(--color-warm-gold);
  border-radius: var(--radius-sm);
  background: rgba(255, 213, 79, 0.1);
  color: var(--color-warm-gold);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-ui);
}
.btn-primary:hover {
  transform: scale(1.03);
  box-shadow: var(--glow-sm) rgba(255, 213, 79, 0.4);
}
.btn-secondary {
  padding: 10px 24px;
  border: 1px solid var(--color-border-glow);
  border-radius: var(--radius-sm);
  background: rgba(79, 195, 247, 0.05);
  color: var(--color-spirit-blue);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: var(--font-ui);
}
.btn-secondary:hover {
  border-color: var(--color-spirit-blue);
  box-shadow: var(--glow-sm) rgba(79, 195, 247, 0.3);
}
.btn-danger {
  padding: 10px 24px;
  border: 1px solid #f44336;
  border-radius: var(--radius-sm);
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  cursor: pointer;
  font-family: var(--font-ui);
}

/* --- 关键帧 --- */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes glowPulse { 0%, 100% { box-shadow: 0 0 8px rgba(79,195,247,0.3); } 50% { box-shadow: 0 0 20px rgba(79,195,247,0.6); } }
```

- [ ] **Step 6: 创建 src/types/index.ts — 全局类型定义**

```typescript
// === 叙事 ===
export interface StoryEntry {
  role: 'narrator' | 'player' | 'system';
  text: string;
  timestamp: number;
}

// === MVU 变量系统 ===
export interface MVUState {
  variables: Record<string, unknown>;
  inventory: InventoryItem[];
  clues: Clue[];
  npcs: NPCState[];
  mapNodes: MapNodeState[];
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'consumable' | 'material' | 'key' | 'pack';
  rarity: Rarity;
  count: number;
  effect: string;
}

export interface Clue {
  id: string;
  name: string;
  description: string;
  discoveredAt: number;
}

export interface NPCState {
  id: string;
  name: string;
  attitude: number;  // 0-100
  location: string;
  memories: string[];
}

export interface MapNodeState {
  id: string;
  name: string;
  status: 'locked' | 'available' | 'completed';
}

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

// === 世界书 ===
export interface WorldBookEntry {
  id: string;
  keys: string[];           // 触发关键词
  content: string;          // 注入的上下文文本
  scope: 'global' | 'session';
  priority: number;         // 越高越优先注入
  caseSensitive: boolean;
  wholeWord: boolean;
  recursive: boolean;       // 触发后是否重新扫描
  enabled: boolean;
}

// === 正则脚本 ===
export interface RegexScript {
  id: string;
  name: string;
  pattern: string;          // 正则表达式
  flags: string;            // 'gi' 等
  replacement: string;      // 替换文本（支持 $1 $2）
  stage: 'pre' | 'post';   // pre=发送给AI前处理, post=AI输出后处理
  enabled: boolean;
}

// === 斜杠命令 ===
export interface SlashCommandDef {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  execute: (args: string[], context: CommandContext) => CommandResult;
}

export interface CommandContext {
  mvu: MVUState;
  diceRoller: DiceEngine;
}

export interface CommandResult {
  type: 'text' | 'error' | 'mvu-update' | 'battle-trigger';
  message: string;
  data?: unknown;
}

// === 设置 (预留端口) ===
export interface Settings {
  // API 端口 — 用户自行填入
  apiKey: string;
  apiBaseURL: string;       // 默认 https://api.deepseek.com
  model: string;            // 默认 deepseek-chat
  // 世界书端口 — 指向 public/worldbook/ 中的 JSON 文件
  worldbookPath: string;    // 默认 '/worldbook/default.json'
  // 正则端口 — 指向 public/regex/ 中的 JSON 文件
  regexPath: string;        // 默认 '/regex/default.json'
  // 显示设置
  textSpeed: 'slow' | 'normal' | 'fast';
  animationIntensity: 'minimal' | 'standard' | 'lavish';
  cardAnimSpeed: 'normal' | 'fast' | 'skip';
  bgmVolume: number;        // 0-1
  sfxVolume: number;        // 0-1
}
```

- [ ] **Step 7: 创建 src/main.tsx + src/App.tsx 骨架**

```typescript
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```typescript
// App.tsx
import { useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Notification from './components/layout/Notification';
import ParticleBg from './components/shared/ParticleBg';
import StoryBook from './components/story/StoryBook';
import BattleOverlay from './components/battle/BattleOverlay';
import SettingsModal from './components/settings/SettingsModal';
import DeckPanel from './components/deck/DeckPanel';

export default function App() {
  useEffect(() => {
    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }, []);

  return (
    <div className="app-root" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ParticleBg />
      <Sidebar />
      <main style={{ marginLeft: 64, height: '100vh', position: 'relative' }}>
        <StoryBook />
        <DeckPanel />
      </main>
      <BattleOverlay />
      <SettingsModal />
      <Notification />
    </div>
  );
}
```

- [ ] **Step 8: 创建 .gitkeep 占位文件**

```bash
mkdir -p K:\card-adventure\public\worldbook
mkdir -p K:\card-adventure\public\regex
mkdir -p K:\card-adventure\public\assets
echo "" > K:\card-adventure\public\worldbook\.gitkeep
echo "" > K:\card-adventure\public\regex\.gitkeep
echo "" > K:\card-adventure\public\assets\.gitkeep
```

- [ ] **Step 9: 安装依赖 + 验证构建**

```bash
cd K:\card-adventure
npm install
npm run build
```

验证：无类型错误，`dist/` 目录生成。`tokens.css` 中的 CSS 变量可在浏览器 DevTools 查看。

- [ ] **Step 10: 提交**

```bash
git add -A
git commit -m "feat: 项目脚手架 + CSS 变量体系 + 全局类型定义"
```

---

### Task 3: LLM API 客户端 + 提示词组装 + 骰子引擎

**Files:**
- Create: `K:\card-adventure\src\sillytavern\llm.ts`
- Create: `K:\card-adventure\src\sillytavern\prompt.ts`
- Create: `K:\card-adventure\src\sillytavern\dice.ts`

**Interfaces:**
- Consumes: `src/types/index.ts` (Settings, StoryEntry, MVUState, WorldBookEntry)
- Produces: `LLMClient` 类（`chat()`, `chatStream()`）, `PromptBuilder` 类（`buildSystemPrompt()`, `buildMessages()`）, `DiceEngine` 类（`roll()`, `parseNotation()`）

- [ ] **Step 1: 创建 src/sillytavern/dice.ts**

骰子引擎 — 纯函数，支持 `3d6`, `d100`, `2d20+5` 格式：

```typescript
export interface DiceResult {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  detail: string;
}

export class DiceEngine {
  roll(notation: string): DiceResult {
    const match = notation.match(/^(\d+)?d(\d+)(?:([+-])(\d+))?$/i);
    if (!match) throw new Error(`无效的骰子表示法: ${notation}`);

    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const sign = match[3] || null;
    const mod = parseInt(match[4] || '0', 10) * (sign === '-' ? -1 : 1);

    if (count < 1 || count > 100) throw new Error('骰子数量需在 1-100 之间');
    if (sides < 2 || sides > 1000) throw new Error('骰子面数需在 2-1000 之间');

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const rawSum = rolls.reduce((a, b) => a + b, 0);
    const total = rawSum + mod;

    const detailParts = rolls.map((r, i) => {
      if (r === 1) return `${r}(大失败!)`;
      if (r === sides) return `${r}(大成功!)`;
      return String(r);
    });

    return {
      notation,
      rolls,
      modifier: mod,
      total,
      detail: `[${detailParts.join(', ')}]${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ''} = ${total}`,
    };
  }

  d100(): DiceResult {
    const tens = Math.floor(Math.random() * 10);
    const ones = Math.floor(Math.random() * 10);
    const total = tens === 0 && ones === 0 ? 100 : tens * 10 + ones;
    return {
      notation: 'd100',
      rolls: [total],
      modifier: 0,
      total,
      detail: `d100 = ${total}`,
    };
  }
}
```

- [ ] **Step 2: 创建 src/sillytavern/llm.ts**

```typescript
import type { Settings } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMClient {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  updateSettings(settings: Settings): void {
    this.settings = settings;
  }

  /** 非流式请求 */
  async chat(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(`${this.settings.apiBaseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model: this.settings.model,
        messages,
        temperature: 0.8,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM API 错误 ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  /** 流式请求 — 返回 ReadableStream */
  async chatStream(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.settings.apiBaseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`,
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages,
          temperature: 0.8,
          max_tokens: 2048,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API 错误 ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法获取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) onToken(token);
          } catch {
            // 跳过无法解析的行
          }
        }
      }
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }
}
```

- [ ] **Step 3: 创建 src/sillytavern/prompt.ts**

```typescript
import type { StoryEntry, MVUState, WorldBookEntry } from '@/types';
import type { LLMMessage } from './llm';

export class PromptBuilder {
  private systemPrompt: string;

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt ?? `你是一个文字冒险游戏的叙事引擎。你将根据玩家的行动推进故事，提供沉浸式的叙述。

规则：
1. 用中文叙述，文笔优美，类似轻小说风格
2. 每次回复末尾提供 2-4 个玩家可能的行动选项
3. 每个选项单独一行，格式为：[选项]具体行动描述
4. 若需要掷骰检定，在选项后标注 (检定:属性名)
5. 若触发战斗，在回复任意位置插入 [BATTLE:虫惑魔]、[BATTLE:珠泪] 或 [BATTLE:主角]
6. 严格遵循世界设定和已建立的剧情连续性`;
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /** 注入世界书匹配到系统提示 */
  injectWorldbook(systemContent: string, entries: WorldBookEntry[], userInput: string): string {
    const triggered = this.matchWorldbook(entries, userInput);
    if (triggered.length === 0) return systemContent;

    const injection = triggered
      .sort((a, b) => b.priority - a.priority)
      .map(e => e.content)
      .join('\n\n');

    return `${systemContent}\n\n【当前相关背景】\n${injection}`;
  }

  /** 注入 MVU 状态到系统提示 */
  injectMVU(systemContent: string, mvu: MVUState): string {
    const parts: string[] = [systemContent];

    if (mvu.variables && Object.keys(mvu.variables).length > 0) {
      parts.push('\n【当前世界状态】');
      for (const [k, v] of Object.entries(mvu.variables)) {
        parts.push(`- ${k}: ${JSON.stringify(v)}`);
      }
    }
    if (mvu.npcs && mvu.npcs.length > 0) {
      parts.push('\n【已知NPC】');
      for (const npc of mvu.npcs) {
        parts.push(`- ${npc.name} (态度:${npc.attitude}, 位置:${npc.location})`);
      }
    }
    if (mvu.inventory && mvu.inventory.length > 0) {
      parts.push('\n【持有物品】');
      for (const item of mvu.inventory) {
        parts.push(`- ${item.name} ×${item.count}: ${item.effect}`);
      }
    }
    return parts.join('\n');
  }

  /** 构建完整消息列表 */
  buildMessages(
    history: StoryEntry[],
    userInput: string,
    worldbookEntries: WorldBookEntry[],
    mvu: MVUState,
  ): LLMMessage[] {
    let system = this.injectWorldbook(this.systemPrompt, worldbookEntries, userInput);
    system = this.injectMVU(system, mvu);

    const messages: LLMMessage[] = [{ role: 'system', content: system }];

    // 最近 20 条历史
    const recent = history.slice(-20);
    for (const entry of recent) {
      messages.push({
        role: entry.role === 'player' ? 'user' : 'assistant',
        content: entry.text,
      });
    }

    messages.push({ role: 'user', content: userInput });
    return messages;
  }

  /** 世界书关键词匹配 */
  private matchWorldbook(entries: WorldBookEntry[], input: string): WorldBookEntry[] {
    const triggered: WorldBookEntry[] = [];
    const seen = new Set<string>();

    const scan = (text: string) => {
      for (const entry of entries) {
        if (!entry.enabled || seen.has(entry.id)) continue;
        for (const key of entry.keys) {
          const flags = entry.caseSensitive ? '' : 'i';
          const pattern = entry.wholeWord ? new RegExp(`\\b${escapeRegex(key)}\\b`, flags) : new RegExp(escapeRegex(key), flags);
          if (pattern.test(text)) {
            triggered.push(entry);
            seen.add(entry.id);
            if (entry.recursive) {
              scan(entry.content);
            }
            break;
          }
        }
      }
    };

    scan(input);
    return triggered;
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 4: 提交**

```bash
git add src/sillytavern/llm.ts src/sillytavern/prompt.ts src/sillytavern/dice.ts
git commit -m "feat: LLM 客户端 + 流式 + 提示词组装 + 骰子引擎"
```

---

### Task 4: 世界书引擎 + MVU 变量系统

**Files:**
- Create: `K:\card-adventure\src\sillytavern\worldbook.ts`
- Create: `K:\card-adventure\src\sillytavern\mvu.ts`

**Interfaces:**
- Consumes: `src/types/index.ts` (WorldBookEntry, MVUState)
- Produces: `WorldBookEngine` 类（`load()`, `match()`, `getActiveEntries()`）, `MVUManager` 类（`getSnapshot()`, `applyPatch()`, `getSummary()`）

- [ ] **Step 1: 创建 src/sillytavern/worldbook.ts**

```typescript
import type { WorldBookEntry } from '@/types';

export class WorldBookEngine {
  private globalEntries: WorldBookEntry[] = [];
  private sessionEntries: WorldBookEntry[] = [];

  /** 从 JSON 文件加载世界书 */
  async load(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[WorldBook] 无法加载世界书: ${path}`);
        return;
      }
      const data: { entries?: WorldBookEntry[] } = await response.json();
      if (data.entries) {
        this.globalEntries = data.entries.filter(e => e.scope === 'global');
        this.sessionEntries = data.entries.filter(e => e.scope === 'session');
      }
    } catch (err) {
      console.error('[WorldBook] 加载失败:', err);
    }
  }

  /** 重置会话级别的条目 */
  resetSession(): void {
    this.sessionEntries = [];
  }

  /** 添加会话级别条目（用于叙事中动态添加） */
  addSessionEntry(entry: WorldBookEntry): void {
    this.sessionEntries.push({ ...entry, scope: 'session' });
  }

  /** 获取所有活动条目 */
  getActiveEntries(): WorldBookEntry[] {
    return [...this.globalEntries, ...this.sessionEntries].filter(e => e.enabled);
  }
}
```

- [ ] **Step 2: 创建 src/sillytavern/mvu.ts**

```typescript
import type { MVUState } from '@/types';

export class MVUManager {
  private state: MVUState;

  constructor(initial?: Partial<MVUState>) {
    this.state = {
      variables: {},
      inventory: [],
      clues: [],
      npcs: [],
      mapNodes: [],
      ...initial,
    };
  }

  getSnapshot(): MVUState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** 应用 JSON Patch 风格的更新 */
  applyPatch(patch: { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown }[]): void {
    for (const p of patch) {
      // path 格式: "/variables/keyName" 或 "/inventory/0" 等
      const segments = p.path.split('/').filter(Boolean);
      if (segments.length === 0) continue;

      const root = segments[0] as keyof MVUState;
      if (root === 'variables' && segments.length === 2) {
        if (p.op === 'add' || p.op === 'replace') {
          this.state.variables[segments[1]] = p.value;
        } else if (p.op === 'remove') {
          delete this.state.variables[segments[1]];
        }
      }
    }
  }

  /** 生成供 AI 使用的文本摘要 */
  getSummary(): string {
    const lines: string[] = [];
    const v = this.state.variables;
    if (Object.keys(v).length > 0) {
      lines.push('当前状态: ' + Object.entries(v).map(([k, val]) => `${k}=${val}`).join(', '));
    }
    const inv = this.state.inventory;
    if (inv.length > 0) {
      lines.push('物品: ' + inv.map(i => `${i.name}×${i.count}`).join(', '));
    }
    const clues = this.state.clues;
    if (clues.length > 0) {
      lines.push('线索: ' + clues.map(c => c.name).join(', '));
    }
    return lines.join('\n');
  }

  /** 重置 MVU 状态 */
  reset(): void {
    this.state = { variables: {}, inventory: [], clues: [], npcs: [], mapNodes: [] };
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/sillytavern/worldbook.ts src/sillytavern/mvu.ts
git commit -m "feat: 世界书引擎 + MVU 变量系统"
```

---

### Task 5: 正则脚本引擎 + 斜杠命令系统

**Files:**
- Create: `K:\card-adventure\src\sillytavern\regex-script.ts`
- Create: `K:\card-adventure\src\sillytavern\slash-command.ts`

**Interfaces:**
- Consumes: `src/types/index.ts` (RegexScript, SlashCommandDef, CommandContext, CommandResult), `dice.ts` (DiceEngine), `mvu.ts` (MVUManager)
- Produces: `RegexEngine` 类（`load()`, `apply()`, `extractBattleTrigger()`）, `SlashCommandEngine` 类（`parse()`, `execute()`, `register()`）

- [ ] **Step 1: 创建 src/sillytavern/regex-script.ts**

```typescript
import type { RegexScript } from '@/types';

export class RegexEngine {
  private scripts: RegexScript[] = [];

  /** 从 JSON 文件加载正则脚本 */
  async load(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[RegexEngine] 无法加载正则脚本: ${path}`);
        return;
      }
      const data: { scripts?: RegexScript[] } = await response.json();
      if (data.scripts) {
        this.scripts = data.scripts.filter(s => s.enabled);
      }
    } catch (err) {
      console.error('[RegexEngine] 加载失败:', err);
    }
  }

  /** 对文本应用正则脚本 */
  apply(text: string, stage: 'pre' | 'post'): string {
    let result = text;
    for (const script of this.scripts) {
      if (script.stage !== stage) continue;
      try {
        const re = new RegExp(script.pattern, script.flags);
        result = result.replace(re, script.replacement);
      } catch (err) {
        console.error(`[RegexEngine] 脚本 "${script.name}" 执行失败:`, err);
      }
    }
    return result;
  }

  /** 从 AI 输出中提取战斗触发标记 */
  extractBattleTrigger(text: string): { deck: string } | null {
    const match = text.match(/\[BATTLE:([^\]]+)\]/i);
    if (match) {
      return { deck: match[1].trim() };
    }
    return null;
  }
}
```

- [ ] **Step 2: 创建 src/sillytavern/slash-command.ts**

```typescript
import type { SlashCommandDef, CommandContext, CommandResult } from '@/types';
import { DiceEngine } from './dice';
import type { MVUManager } from './mvu';

export class SlashCommandEngine {
  private commands: Map<string, SlashCommandDef> = new Map();
  private diceEngine: DiceEngine;
  private mvuManager: MVUManager;

  constructor(mvuManager: MVUManager) {
    this.diceEngine = new DiceEngine();
    this.mvuManager = mvuManager;
    this.registerBuiltins();
  }

  /** 解析输入中的斜杠命令 */
  parse(input: string): { command: string; args: string[] } | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('/')) return null;
    const parts = trimmed.slice(1).split(/\s+/);
    return { command: parts[0].toLowerCase(), args: parts.slice(1) };
  }

  /** 注册自定义命令 */
  register(def: SlashCommandDef): void {
    this.commands.set(def.name, def);
    for (const alias of def.aliases) {
      this.commands.set(alias, def);
    }
  }

  /** 执行斜杠命令 */
  execute(name: string, args: string[]): CommandResult {
    const def = this.commands.get(name);
    if (!def) {
      return { type: 'error', message: `未知命令: /${name}。输入 /help 查看可用命令。` };
    }
    const context: CommandContext = {
      mvu: this.mvuManager.getSnapshot(),
      diceRoller: this.diceEngine,
    };
    return def.execute(args, context);
  }

  /** 内置命令 */
  private registerBuiltins(): void {
    const self = this;

    this.register({
      name: 'help',
      aliases: ['h'],
      description: '显示帮助信息',
      usage: '/help',
      execute: () => ({
        type: 'text',
        message: '可用命令:\n/roll NdM — 掷骰 (如 /roll 3d6)\n/var set key value — 设置变量\n/var get key — 查看变量\n/save — 手动存档\n/load — 加载存档\n/help — 此帮助',
      }),
    });

    this.register({
      name: 'roll',
      aliases: ['r'],
      description: '掷骰子',
      usage: '/roll 3d6 或 /roll d100',
      execute: (args, ctx) => {
        try {
          const result = ctx.diceRoller.roll(args[0] || 'd6');
          return { type: 'text', message: `🎲 ${result.detail}` };
        } catch (err) {
          return { type: 'error', message: String(err) };
        }
      },
    });

    this.register({
      name: 'var',
      aliases: ['v'],
      description: '管理 MVU 变量',
      usage: '/var set key value 或 /var get key',
      execute: (args) => {
        if (args.length < 1) return { type: 'error', message: '用法: /var set key value 或 /var get key' };
        const sub = args[0].toLowerCase();
        if (sub === 'set' && args.length >= 3) {
          self.mvuManager.applyPatch([{ op: 'add', path: `/variables/${args[1]}`, value: args.slice(2).join(' ') }]);
          return { type: 'mvu-update', message: `已设置 ${args[1]} = ${args.slice(2).join(' ')}` };
        }
        if (sub === 'get' && args.length >= 2) {
          const snapshot = self.mvuManager.getSnapshot();
          const val = snapshot.variables[args[1]];
          return { type: 'text', message: `${args[1]} = ${val ?? '(未设置)'}` };
        }
        return { type: 'error', message: '用法: /var set key value 或 /var get key' };
      },
    });
  }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/sillytavern/regex-script.ts src/sillytavern/slash-command.ts
git commit -m "feat: 正则脚本引擎 + 斜杠命令系统（含 /roll /var /help）"
```

---

### Task 6: 卡牌数据库提取 + 对战类型定义

**Files:**
- Create: `K:\card-adventure\src\battle\types.ts`
- Create: `K:\card-adventure\src\battle\cards.ts`

**Interfaces:**
- Consumes: `E:\MyCardLibrary\ygopro2\cdb\cards.cdb` (SQLite 数据库，只读提取)
- Produces: `CardDef`, `DeckDef` 类型；`CARD_DB` (所有卡牌数据 Map)；`STARTER_DECKS` (3 套预设卡组)

- [ ] **Step 1: 创建 src/battle/types.ts**

```typescript
export type CardType = 'monster' | 'spell' | 'trap';
export type MonsterAttribute = 'light' | 'dark' | 'earth' | 'water' | 'fire' | 'wind';
export type CardPosition = 'attack' | 'defense' | 'face-down';
export type SummonMethod = 'normal' | 'tribute' | 'fusion' | 'xyz' | 'link';
export type BattlePhase = 'draw' | 'main1' | 'battle' | 'main2' | 'end';

export interface CardDef {
  id: string;              // passcode 字符串
  name: string;
  type: CardType;
  attribute?: MonsterAttribute;
  level?: number;          // 怪兽星级（仅 monster）
  linkRating?: number;     // Link 值（仅 link monster）
  attack?: number;
  defense?: number;
  description: string;
  effectType?: 'summon' | 'destroy' | 'atkMod' | 'negate' | 'fusion' | 'search' | 'mill' | 'heal';
}

export interface CardInstance {
  defId: string;           // 引用 CardDef.id
  position: CardPosition;
  equippedTo?: number;     // 装备目标怪兽区索引
  xyzMaterials?: CardInstance[];  // Xyz 素材
}

export interface BattleState {
  phase: BattlePhase;
  turn: number;
  isPlayerTurn: boolean;

  playerLP: number;
  opponentLP: number;

  playerHand: CardInstance[];
  opponentHand: CardInstance[];

  playerMonsters: (CardInstance | null)[];   // 5 格
  opponentMonsters: (CardInstance | null)[]; // 5 格

  playerSpellTraps: (CardInstance | null)[];   // 5 格
  opponentSpellTraps: (CardInstance | null)[]; // 5 格

  extraMonsterZone: CardInstance | null;       // 1 格共享

  playerDeck: CardInstance[];
  opponentDeck: CardInstance[];

  playerGraveyard: CardInstance[];
  opponentGraveyard: CardInstance[];

  playerExtraDeck: CardInstance[];
  opponentExtraDeck: CardInstance[];

  playerNormalSummonUsed: boolean;
  opponentNormalSummonUsed: boolean;

  chainActive: boolean;
  chainLinks: ChainLink[];

  battleLog: string[];
  winner: 'player' | 'opponent' | null;
}

export interface ChainLink {
  sourcePlayer: 'player' | 'opponent';
  cardInstance: CardInstance;
  zoneIndex: number;
  triggerType: 'summon' | 'attack' | 'effect';
}

export interface DeckDef {
  id: string;
  name: string;
  mainDeck: string[];    // CardDef ID 列表
  extraDeck: string[];   // CardDef ID 列表
  strategy: 'control' | 'fusion' | 'beatdown';
}
```

- [ ] **Step 2: 创建 src/battle/cards.ts**

从 `cards.cdb` 提取三个卡组涉及的约 35 张卡牌数据。使用 Python 脚本一次性提取，然后将结果硬编码到 TypeScript 文件中：

```bash
python -c "
import sqlite3, json, sys
sys.stdout.reconfigure(encoding='utf-8')
conn = sqlite3.connect('E:/MyCardLibrary/ygopro2/cdb/cards.cdb')
cur = conn.cursor()

# All card IDs from 3 decks
ids = {
    # 虫惑魔 main
    '91812341': 'monster', '82738277': 'monster', '75416738': 'monster', '12801833': 'spell',
    '31548215': 'trap', '74577599': 'monster', '45803070': 'monster', '75294187': 'trap',
    '9581215': 'trap',
    # 虫惑魔 extra
    '6511113': 'monster', '73639099': 'monster', '48183890': 'monster',
    # 珠泪 main
    '572850': 'monster', '73956664': 'monster', '37961969': 'monster', '74078255': 'monster',
    '33878367': 'spell', '60362066': 'spell', '6767771': 'spell', '34225426': 'spell',
    '77103950': 'spell', '38436986': 'trap', '74920585': 'trap', '1329620': 'trap',
    # 珠泪 extra
    '28226490': 'monster', '84330567': 'monster',
    # 主角
    '22609617': 'monster', '84430950': 'monster', '82385847': 'monster',
    '32807846': 'spell', '85852291': 'spell', '98645731': 'spell',
    '40619825': 'spell', '82432018': 'spell', '83746708': 'spell',
    '14745409': 'spell', '88610708': 'spell',
}

for cid, ctype in ids.items():
    cur.execute('SELECT id, name, desc FROM texts WHERE id=?', (int(cid),))
    row = cur.fetchone()
    if row:
        print(f'{row[0]}|{row[1]}|{ctype}|{row[2][:200]}')

conn.close()
"
```

提取后，将每张卡牌格式化为 `CardDef` 对象写入 `cards.ts`。涉及 SummonMethod 标注：
- 虫惑魔 Xyz (芙莉西亚) → `summonMethod: 'xyz'`, Link (塞拉 L1, 阿蒂普丝 L2+) → `summonMethod: 'link'`
- 珠泪融合 (卡雷多哈特, 鲁莎卡人鱼) → `summonMethod: 'fusion'`

同时定义 3 套预设卡组 `STARTER_DECKS: DeckDef[]`。

- [ ] **Step 3: 提交**

```bash
git add src/battle/types.ts src/battle/cards.ts
git commit -m "feat: 卡牌数据库 + 对战类型定义 + 3 套预设卡组"
```

---

### Task 7: 卡牌对战规则引擎

**Files:**
- Create: `K:\card-adventure\src\battle\engine.ts`
- Create: `K:\card-adventure\src\battle\deck.ts`

**Interfaces:**
- Consumes: `battle/types.ts`, `battle/cards.ts`
- Produces: `BattleEngine` 类 — `init()`, `nextPhase()`, `summonMonster()`, `setSpellTrap()`, `activateSpellTrap()`, `declareAttack()`, `changePosition()`, `drawCard()`, `endTurn()`, `getState()`, `checkWin()`

- [ ] **Step 1: 创建 src/battle/deck.ts**

```typescript
import type { DeckDef, CardInstance } from './types';
import { CARD_DB, STARTER_DECKS } from './cards';

/** Fisher-Yates 洗牌 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 根据卡组名创建初始卡组实例列表 */
export function buildDeck(deckName: string): { main: CardInstance[]; extra: CardInstance[] } {
  const deckDef = STARTER_DECKS.find(d => d.name === deckName || d.id === deckName);
  if (!deckDef) throw new Error(`未知卡组: ${deckName}`);

  const main: CardInstance[] = deckDef.mainDeck.map(id => ({
    defId: id,
    position: 'face-down',
  }));

  const extra: CardInstance[] = deckDef.extraDeck.map(id => ({
    defId: id,
    position: 'attack',
  }));

  return { main, extra };
}

/** 获取卡牌定义 */
export function getCardDef(instance: CardInstance) {
  return CARD_DB.get(instance.defId);
}
```

- [ ] **Step 2: 创建 src/battle/engine.ts — 核心规则引擎**

```typescript
import type { BattleState, BattlePhase, CardInstance, ChainLink } from './types';
import { CARD_DB } from './cards';
import { shuffle, buildDeck, getCardDef } from './deck';

const MAX_HAND = 6;
const MONSTER_ZONES = 5;
const ST_ZONES = 5;
const START_LP = 4000;
const PHASES: BattlePhase[] = ['draw', 'main1', 'battle', 'main2', 'end'];

function createEmptyState(): BattleState {
  return {
    phase: 'draw', turn: 1, isPlayerTurn: true,
    playerLP: START_LP, opponentLP: START_LP,
    playerHand: [], opponentHand: [],
    playerMonsters: Array(MONSTER_ZONES).fill(null),
    opponentMonsters: Array(MONSTER_ZONES).fill(null),
    playerSpellTraps: Array(ST_ZONES).fill(null),
    opponentSpellTraps: Array(ST_ZONES).fill(null),
    extraMonsterZone: null,
    playerDeck: [], opponentDeck: [],
    playerGraveyard: [], opponentGraveyard: [],
    playerExtraDeck: [], opponentExtraDeck: [],
    playerNormalSummonUsed: false, opponentNormalSummonUsed: false,
    chainActive: false, chainLinks: [],
    battleLog: [], winner: null,
  };
}

export class BattleEngine {
  private state: BattleState;

  constructor() { this.state = createEmptyState(); }

  /** 初始化对战 */
  init(playerDeckName: string, opponentDeckName: string): void {
    this.state = createEmptyState();
    const pDeck = buildDeck(playerDeckName);
    const oDeck = buildDeck(opponentDeckName);
    this.state.playerDeck = shuffle(pDeck.main);
    this.state.opponentDeck = shuffle(oDeck.main);
    this.state.playerExtraDeck = pDeck.extra;
    this.state.opponentExtraDeck = oDeck.extra;
    // 起始抽 5 张
    for (let i = 0; i < 5; i++) { this._draw('player'); this._draw('opponent'); }
    this.state.phase = 'draw';
    this._draw('player'); // 先手抽 1
    this._log('决斗开始！');
  }

  /** 抽牌（带手牌上限检查） */
  private _draw(player: 'player' | 'opponent'): CardInstance | null {
    const deck = player === 'player' ? this.state.playerDeck : this.state.opponentDeck;
    const hand = player === 'player' ? this.state.playerHand : this.state.opponentHand;
    if (deck.length === 0) return null;
    const card = deck.pop()!;
    if (hand.length >= MAX_HAND) {
      const gv = player === 'player' ? this.state.playerGraveyard : this.state.opponentGraveyard;
      const discard = hand.splice(Math.floor(Math.random() * hand.length), 1)[0];
      gv.push(discard);
      this._log(`${card === discard ? card : discard} 因手牌超限送墓`);
    }
    hand.push(card);
    return card;
  }

  /** 公开抽牌（用于抽牌阶段） */
  drawCard(player: 'player' | 'opponent'): CardInstance | null {
    const c = this._draw(player);
    if (c) this._log(`${player === 'player' ? '玩家' : '对手'} 抽到了 ${getCardDef(c)?.name}`);
    return c;
  }

  /** 推进阶段 */
  nextPhase(): BattlePhase {
    const idx = PHASES.indexOf(this.state.phase);
    const nextIdx = idx + 1;
    if (nextIdx >= PHASES.length) {
      this._switchTurn();
      return this.state.phase;
    }
    this.state.phase = PHASES[nextIdx];
    // 进入抽牌阶段自动抽牌
    if (this.state.phase === 'draw') {
      this.drawCard(this.state.isPlayerTurn ? 'player' : 'opponent');
    }
    return this.state.phase;
  }

  private _switchTurn(): void {
    this.state.isPlayerTurn = !this.state.isPlayerTurn;
    this.state.turn++;
    this.state.phase = 'draw';
    this.state.playerNormalSummonUsed = false;
    this.state.opponentNormalSummonUsed = false;
    this._log(`第 ${this.state.turn} 回合 · ${this.state.isPlayerTurn ? '我方' : '对手'}`);
  }

  /** 通常召唤 */
  summonMonster(handIndex: number, zoneIndex: number, player: 'player' | 'opponent'): boolean {
    if (!this._isMainPhase()) { this._log('只能在主要阶段召唤'); return false; }
    const hand = player === 'player' ? this.state.playerHand : this.state.opponentHand;
    const monsters = player === 'player' ? this.state.playerMonsters : this.state.opponentMonsters;
    const normalUsed = player === 'player' ? this.state.playerNormalSummonUsed : this.state.opponentNormalSummonUsed;

    if (normalUsed) { this._log('本回合已通常召唤'); return false; }
    if (zoneIndex < 0 || zoneIndex >= MONSTER_ZONES || monsters[zoneIndex]) { this._log('怪兽区已被占用'); return false; }

    const card = hand[handIndex];
    const def = getCardDef(card);
    if (!def || def.type !== 'monster') { this._log('请选择怪兽卡'); return false; }

    // 祭品检查
    const tributeNeeded = (def.level! >= 7) ? 2 : (def.level! >= 5) ? 1 : 0;
    if (tributeNeeded > 0) {
      const onField = monsters.filter(m => m !== null).length;
      if (onField < tributeNeeded) { this._log(`需要 ${tributeNeeded} 只祭品`); return false; }
      let tributed = 0;
      const graveyard = player === 'player' ? this.state.playerGraveyard : this.state.opponentGraveyard;
      for (let i = 0; i < MONSTER_ZONES && tributed < tributeNeeded; i++) {
        if (monsters[i]) { graveyard.push(monsters[i]!); monsters[i] = null; tributed++; }
      }
      this._log(`解放了 ${tributeNeeded} 只祭品`);
    }

    hand.splice(handIndex, 1);
    card.position = 'attack';
    monsters[zoneIndex] = card;
    if (player === 'player') this.state.playerNormalSummonUsed = true;
    else this.state.opponentNormalSummonUsed = true;
    this._log(`召唤了 ${def.name}`);
    return true;
  }

  /** SET 魔陷 */
  setSpellTrap(handIndex: number, zoneIndex: number, player: 'player' | 'opponent'): boolean {
    if (!this._isMainPhase()) return false;
    const hand = player === 'player' ? this.state.playerHand : this.state.opponentHand;
    const stZones = player === 'player' ? this.state.playerSpellTraps : this.state.opponentSpellTraps;
    const card = hand[handIndex];
    const def = getCardDef(card);
    if (!def || (def.type !== 'spell' && def.type !== 'trap')) return false;
    if (stZones[zoneIndex]) return false;

    hand.splice(handIndex, 1);
    card.position = 'face-down';
    stZones[zoneIndex] = card;
    this._log(`SET 了一张卡`);
    return true;
  }

  /** 发动魔陷 */
  activateSpellTrap(zoneIndex: number, player: 'player' | 'opponent'): boolean {
    const stZones = player === 'player' ? this.state.playerSpellTraps : this.state.opponentSpellTraps;
    const card = stZones[zoneIndex];
    if (!card || card.position !== 'face-down') return false;

    card.position = 'attack'; // face-up
    const def = getCardDef(card);
    this._log(`发动了 ${def?.name ?? '未知卡'}`);

    // 简化效果处理
    if (def?.effectType === 'destroy') {
      const oppMonsters = player === 'player' ? this.state.opponentMonsters : this.state.playerMonsters;
      // 破坏对方 ATK 最高的怪兽
      let maxAtk = -1, maxIdx = -1;
      for (let i = 0; i < MONSTER_ZONES; i++) {
        const m = oppMonsters[i];
        if (m) {
          const md = getCardDef(m);
          const atk = md?.attack ?? 0;
          if (atk > maxAtk) { maxAtk = atk; maxIdx = i; }
        }
      }
      if (maxIdx >= 0) {
        const grave = player === 'player' ? this.state.opponentGraveyard : this.state.playerGraveyard;
        grave.push(oppMonsters[maxIdx]!);
        oppMonsters[maxIdx] = null;
        this._log(`破坏了对方怪兽`);
      }
    } else if (def?.effectType === 'negate') {
      this._log('效果被无效');
    } else if (def?.effectType === 'heal') {
      if (player === 'player') this.state.playerLP = Math.min(this.state.playerLP + 800, START_LP);
      else this.state.opponentLP = Math.min(this.state.opponentLP + 800, START_LP);
      this._log('恢复了 800 LP');
    }

    // 发动后送墓
    stZones[zoneIndex] = null;
    const grave = player === 'player' ? this.state.playerGraveyard : this.state.opponentGraveyard;
    grave.push(card);
    return true;
  }

  /** 攻击宣言 */
  declareAttack(attackerZone: number, targetZone: number | null, attackerPlayer: 'player' | 'opponent'): boolean {
    if (this.state.phase !== 'battle') { this._log('只能在战斗阶段攻击'); return false; }
    if (!this.state.isPlayerTurn && attackerPlayer === 'player') { this._log('不是你的回合'); return false; }

    const aMonsters = attackerPlayer === 'player' ? this.state.playerMonsters : this.state.opponentMonsters;
    const attacker = aMonsters[attackerZone];
    if (!attacker) { this._log('没有攻击怪兽'); return false; }

    const aDef = getCardDef(attacker);
    if (!aDef || aDef.type !== 'monster') return false;

    if (targetZone === null) {
      // 直接攻击
      const damage = aDef.attack ?? 0;
      if (attackerPlayer === 'player') {
        this.state.opponentLP = Math.max(0, this.state.opponentLP - damage);
      } else {
        this.state.playerLP = Math.max(0, this.state.playerLP - damage);
      }
      this._log(`${aDef.name} 直接攻击造成 ${damage} 伤害`);
    } else {
      const dMonsters = attackerPlayer === 'player' ? this.state.opponentMonsters : this.state.playerMonsters;
      const target = dMonsters[targetZone];
      if (!target) { this._log('目标不存在'); return false; }
      const tDef = getCardDef(target);
      if (!tDef) return false;

      if (target.position === 'defense') {
        const atk = aDef.attack ?? 0;
        const def = tDef.defense ?? 0;
        if (atk > def) {
          const grave = attackerPlayer === 'player' ? this.state.opponentGraveyard : this.state.playerGraveyard;
          grave.push(target);
          dMonsters[targetZone] = null;
          this._log(`${aDef.name} 击破 ${tDef.name}（守备表示）`);
        } else if (atk < def) {
          const diff = def - atk;
          if (attackerPlayer === 'player') this.state.playerLP = Math.max(0, this.state.playerLP - diff);
          else this.state.opponentLP = Math.max(0, this.state.opponentLP - diff);
          this._log(`${tDef.name} 抵挡了攻击，${attackerPlayer === 'player' ? '玩家' : '对手'} 受到 ${diff} 反伤`);
        }
      } else {
        const atkA = aDef.attack ?? 0;
        const atkT = tDef.attack ?? 0;
        if (atkA >= atkT) {
          const grave = attackerPlayer === 'player' ? this.state.opponentGraveyard : this.state.playerGraveyard;
          grave.push(target);
          dMonsters[targetZone] = null;
          const dmg = atkA - atkT;
          if (attackerPlayer === 'player') this.state.opponentLP = Math.max(0, this.state.opponentLP - dmg);
          else this.state.playerLP = Math.max(0, this.state.playerLP - dmg);
          this._log(`${aDef.name} 击败 ${tDef.name}，造成 ${dmg} 伤害`);
        } else {
          const grave = attackerPlayer === 'player' ? this.state.playerGraveyard : this.state.opponentGraveyard;
          grave.push(attacker);
          aMonsters[attackerZone] = null;
          const dmg = atkT - atkA;
          if (attackerPlayer === 'player') this.state.playerLP = Math.max(0, this.state.playerLP - dmg);
          else this.state.opponentLP = Math.max(0, this.state.opponentLP - dmg);
          this._log(`${tDef.name} 反杀了 ${aDef.name}`);
        }
      }
    }

    this.checkWin();
    return true;
  }

  /** 改变表示形式 */
  changePosition(zoneIndex: number, player: 'player' | 'opponent'): boolean {
    if (!this._isMainPhase()) return false;
    const monsters = player === 'player' ? this.state.playerMonsters : this.state.opponentMonsters;
    const card = monsters[zoneIndex];
    if (!card || card.position === 'face-down') return false;
    card.position = card.position === 'attack' ? 'defense' : 'attack';
    return true;
  }

  /** 结束回合 */
  endTurn(): void {
    this.state.phase = 'end';
    this.nextPhase(); // 触发换边
  }

  /** 检查胜负 */
  checkWin(): 'player' | 'opponent' | null {
    if (this.state.playerLP <= 0) { this.state.winner = 'opponent'; return 'opponent'; }
    if (this.state.opponentLP <= 0) { this.state.winner = 'player'; return 'player'; }
    return null;
  }

  getState(): BattleState { return this.state; }

  private _isMainPhase(): boolean {
    return this.state.phase === 'main1' || this.state.phase === 'main2';
  }

  private _log(msg: string): void { this.state.battleLog.push(msg); }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/battle/engine.ts src/battle/deck.ts
git commit -m "feat: 卡牌对战规则引擎（简化游戏王规则）"
```

---

### Task 8: AI 对手

**Files:**
- Create: `K:\card-adventure\src\battle\ai.ts`

**Interfaces:**
- Consumes: `battle/engine.ts` (BattleEngine), `battle/types.ts` (BattleState), `battle/cards.ts` (CARD_DB)
- Produces: `BattleAI` 类 — `executeTurn()` (自动执行一个完整对手回合)

- [ ] **Step 1: 创建 src/battle/ai.ts**

```typescript
import type { BattleState, CardInstance, DeckDef } from './types';
import { getCardDef } from './deck';
import { STARTER_DECKS } from './cards';
import { BattleEngine } from './engine';

export class BattleAI {
  private deckDef: DeckDef | undefined;

  constructor(deckName: string) {
    this.deckDef = STARTER_DECKS.find(d => d.name === deckName || d.id === deckName);
  }

  /** 自动执行一个完整对手回合 */
  executeTurn(engine: BattleEngine): void {
    const state = engine.getState();
    if (state.isPlayerTurn) return;

    // 抽牌阶段
    engine.nextPhase(); // draw
    engine.nextPhase(); // main1

    this._playMainPhase(engine, state);
    this._playBattlePhase(engine, state);

    engine.nextPhase(); // main2
    this._playMainPhase(engine, state);

    engine.nextPhase(); // end → 切换回玩家
  }

  private _playMainPhase(engine: BattleEngine, state: BattleState): void {
    const hand = [...state.opponentHand];
    const strategy = this.deckDef?.strategy ?? 'beatdown';

    // 根据策略决定行为优先级
    if (strategy === 'control') {
      this._prioritizeTraps(engine, hand);
      this._prioritizeSummon(engine, hand, state);
    } else if (strategy === 'fusion') {
      this._prioritizeMill(engine, hand, state);
      this._prioritizeSummon(engine, hand, state);
      this._prioritizeTraps(engine, hand);
    } else {
      this._prioritizeSummon(engine, hand, state);
      this._prioritizeEquip(engine, hand, state);
    }
  }

  /** 优先召唤怪兽 */
  private _prioritizeSummon(engine: BattleEngine, hand: CardInstance[], state: BattleState): void {
    // 找手牌中最高 ATK 的怪兽
    let bestIdx = -1, bestAtk = -1;
    for (let i = 0; i < state.opponentHand.length; i++) {
      const def = getCardDef(state.opponentHand[i]);
      if (def?.type === 'monster' && (def.attack ?? 0) > bestAtk) {
        bestAtk = def.attack!;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return;

    // 找空怪兽区
    const emptyZone = state.opponentMonsters.findIndex(m => m === null);
    if (emptyZone < 0) return;

    engine.summonMonster(bestIdx, emptyZone, 'opponent');
  }

  /** 优先盖陷阱 */
  private _prioritizeTraps(engine: BattleEngine, hand: CardInstance[], state: BattleState): void {
    for (let i = 0; i < state.opponentHand.length; i++) {
      const def = getCardDef(state.opponentHand[i]);
      if (def?.type === 'trap') {
        const emptyZone = state.opponentSpellTraps.findIndex(s => s === null);
        if (emptyZone >= 0) {
          engine.setSpellTrap(i, emptyZone, 'opponent');
          break;
        }
      }
    }
  }

  /** 优先堆墓（珠泪策略） */
  private _prioritizeMill(engine: BattleEngine, _hand: CardInstance[], state: BattleState): void {
    // 简单模拟：有怪兽在场上时发动魔陷中的送墓效果
    for (let i = 0; i < state.opponentSpellTraps.length; i++) {
      const card = state.opponentSpellTraps[i];
      if (card && card.position === 'face-down') {
        const def = getCardDef(card);
        if (def?.type === 'spell') {
          engine.activateSpellTrap(i, 'opponent');
          break;
        }
      }
    }
  }

  /** 装装备卡（主角策略） */
  private _prioritizeEquip(engine: BattleEngine, hand: CardInstance[], state: BattleState): void {
    // 如果场上有怪兽，装备手牌中的装备魔法卡
    const hasMonster = state.opponentMonsters.some(m => m !== null);
    if (!hasMonster) return;

    for (let i = 0; i < state.opponentHand.length; i++) {
      const def = getCardDef(state.opponentHand[i]);
      if (def?.type === 'spell' && def.effectType === 'atkMod') {
        const emptyZone = state.opponentSpellTraps.findIndex(s => s === null);
        if (emptyZone >= 0) {
          engine.setSpellTrap(i, emptyZone, 'opponent');
          // 激活装备
          engine.activateSpellTrap(emptyZone, 'opponent');
          break;
        }
      }
    }
  }

  /** 战斗阶段 */
  private _playBattlePhase(engine: BattleEngine, state: BattleState): void {
    engine.nextPhase(); // battle

    for (let i = 0; i < state.opponentMonsters.length; i++) {
      const monster = state.opponentMonsters[i];
      if (!monster || monster.position !== 'attack') continue;

      // 优先攻击 ATK 最低的玩家怪兽
      let targetZone: number | null = null;
      let minAtk = Infinity;
      for (let j = 0; j < state.playerMonsters.length; j++) {
        const pm = state.playerMonsters[j];
        if (pm) {
          const def = getCardDef(pm);
          const atk = def?.attack ?? 0;
          if (atk < minAtk) { minAtk = atk; targetZone = j; }
        }
      }

      engine.declareAttack(i, targetZone, 'opponent');
      if (engine.checkWin()) return;
    }
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/battle/ai.ts
git commit -m "feat: AI 对手引擎（虫惑魔防守/珠泪堆墓/主角装备三种策略）"
```

---

### Task 9: Zustand 状态管理 Stores

**Files:**
- Create: `K:\card-adventure\src\stores\settingsStore.ts`
- Create: `K:\card-adventure\src\stores\storyStore.ts`
- Create: `K:\card-adventure\src\stores\battleStore.ts`
- Create: `K:\card-adventure\src\stores\deckStore.ts`

**Interfaces:**
- Consumes: all sillytavern/ modules, battle/ modules, db/adapters
- Produces: `useSettingsStore`, `useStoryStore`, `useBattleStore`, `useDeckStore` — Zustand hooks

- [ ] **Step 1: 创建 src/stores/settingsStore.ts**

```typescript
import { create } from 'zustand';
import type { Settings } from '@/types';
import { loadSettings, persistSettings } from '@/db/adapters';

interface SettingsStore extends Settings {
  initialized: boolean;
  init: () => Promise<void>;
  update: (partial: Partial<Settings>) => Promise<void>;
  reset: () => Promise<void>;
}

const defaults: Settings = {
  apiKey: '', apiBaseURL: 'https://api.deepseek.com', model: 'deepseek-chat',
  worldbookPath: '/worldbook/default.json', regexPath: '/regex/default.json',
  textSpeed: 'normal', animationIntensity: 'standard', cardAnimSpeed: 'normal',
  bgmVolume: 0.7, sfxVolume: 0.8,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaults,
  initialized: false,

  init: async () => {
    const saved = await loadSettings();
    set({ ...saved, initialized: true });
  },

  update: async (partial) => {
    set(partial);
    await persistSettings({ ...get(), ...partial });
  },

  reset: async () => {
    set(defaults);
    await persistSettings(defaults);
  },
}));
```

- [ ] **Step 2: 创建 src/stores/storyStore.ts**

```typescript
import { create } from 'zustand';
import type { StoryEntry, MVUState, WorldBookEntry } from '@/types';
import { LLMClient } from '@/sillytavern/llm';
import { PromptBuilder } from '@/sillytavern/prompt';
import { WorldBookEngine } from '@/sillytavern/worldbook';
import { MVUManager } from '@/sillytavern/mvu';
import { RegexEngine } from '@/sillytavern/regex-script';
import { SlashCommandEngine } from '@/sillytavern/slash-command';

interface StoryStore {
  history: StoryEntry[];
  isGenerating: boolean;
  streamingText: string;
  actionOptions: string[];
  mvuManager: MVUManager;
  worldbookEngine: WorldBookEngine;
  regexEngine: RegexEngine;
  slashEngine: SlashCommandEngine;
  promptBuilder: PromptBuilder;
  llmClient: LLMClient | null;

  init: () => Promise<void>;
  submitAction: (text: string) => Promise<void>;
  generateResponse: (input: string) => Promise<void>;
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  history: [],
  isGenerating: false,
  streamingText: '',
  actionOptions: [],
  mvuManager: new MVUManager(),
  worldbookEngine: new WorldBookEngine(),
  regexEngine: new RegexEngine(),
  slashEngine: new SlashCommandEngine(new MVUManager()),
  promptBuilder: new PromptBuilder(),
  llmClient: null,

  init: async () => {
    const { loadSettings } = await import('@/db/adapters');
    const settings = await loadSettings();
    const wb = get().worldbookEngine;
    const re = get().regexEngine;
    await Promise.all([
      wb.load(settings.worldbookPath),
      re.load(settings.regexPath),
    ]);
    const llm = new LLMClient(settings);
    set({ llmClient: llm });
  },

  submitAction: async (text: string) => {
    const history = get().history;
    set({ history: [...history, { role: 'player', text, timestamp: Date.now() }] });
    await get().generateResponse(text);
  },

  generateResponse: async (input: string) => {
    const { llmClient, promptBuilder, worldbookEngine, mvuManager, regexEngine, history } = get();
    if (!llmClient) return;

    set({ isGenerating: true, streamingText: '' });

    // 检查斜杠命令
    const slashMatch = get().slashEngine.parse(input);
    if (slashMatch) {
      const result = get().slashEngine.execute(slashMatch.command, slashMatch.args);
      set({
        isGenerating: false,
        streamingText: '',
        actionOptions: [],
        history: [...get().history, { role: 'system', text: result.message, timestamp: Date.now() }],
      });
      return;
    }

    // 正则预处理
    const processed = regexEngine.apply(input, 'pre');

    // 构建消息
    const wbEntries = worldbookEngine.getActiveEntries();
    const mvu = mvuManager.getSnapshot();
    const messages = promptBuilder.buildMessages(history, processed, wbEntries, mvu);

    let fullText = '';
    await llmClient.chatStream(
      messages,
      (token) => {
        fullText += token;
        set({ streamingText: fullText });
      },
      () => {
        // 正则后处理
        const postProcessed = regexEngine.apply(fullText, 'post');

        // 提取行动选项和战斗标记
        const battleTrigger = regexEngine.extractBattleTrigger(postProcessed);
        const options = this.parseOptions(postProcessed);
        const cleanText = this.cleanOptions(postProcessed);

        set({
          isGenerating: false,
          streamingText: '',
          actionOptions: options,
          history: [...get().history, { role: 'narrator', text: cleanText, timestamp: Date.now() }],
        });

        // 触发战斗
        if (battleTrigger) {
          const { useBattleStore } = require('@/stores/battleStore');
          useBattleStore.getState().startBattle(battleTrigger.deck);
        }
      },
      (err) => {
        set({ isGenerating: false, streamingText: '' });
        console.error('[StoryStore] LLM 错误:', err);
      },
    );
  },

  parseOptions: (text: string): string[] => {
    const options: string[] = [];
    const re = /\[选项\](.+?)(?=\[选项\]|$)/gs;
    let match;
    while ((match = re.exec(text)) !== null) {
      options.push(match[1].trim());
    }
    return options;
  },

  cleanOptions: (text: string): string => {
    return text.replace(/\[选项\].+?(?=\[选项\]|$)/gs, '').replace(/\[BATTLE:[^\]]+\]/gi, '').trim();
  },
}));
```

- [ ] **Step 3: 创建 src/stores/battleStore.ts**

```typescript
import { create } from 'zustand';
import type { BattleState } from '@/battle/types';
import { BattleEngine } from '@/battle/engine';
import { BattleAI } from '@/battle/ai';

interface BattleStore {
  active: boolean;
  opponentDeck: string;
  engine: BattleEngine | null;
  ai: BattleAI | null;
  state: BattleState | null;

  startBattle: (opponentDeck: string) => void;
  endBattle: () => void;
  playerAction: (action: string, ...args: number[]) => boolean;
  runOpponentTurn: () => void;
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  active: false,
  opponentDeck: '',
  engine: null,
  ai: null,
  state: null,

  startBattle: (opponentDeck) => {
    const engine = new BattleEngine();
    engine.init('主角', opponentDeck);
    const ai = new BattleAI(opponentDeck);
    set({ active: true, opponentDeck, engine, ai, state: engine.getState() });
  },

  endBattle: () => {
    set({ active: false, opponentDeck: '', engine: null, ai: null, state: null });
  },

  playerAction: (action, ...args) => {
    const engine = get().engine;
    if (!engine) return false;
    let result = false;
    switch (action) {
      case 'summon': result = engine.summonMonster(args[0], args[1], 'player'); break;
      case 'set': result = engine.setSpellTrap(args[0], args[1], 'player'); break;
      case 'activate': result = engine.activateSpellTrap(args[0], 'player'); break;
      case 'attack': result = engine.declareAttack(args[0], args[1] ?? null, 'player'); break;
      case 'changePosition': result = engine.changePosition(args[0], 'player'); break;
      case 'nextPhase': engine.nextPhase(); result = true; break;
      case 'endTurn': engine.endTurn(); result = true; break;
      case 'draw': engine.drawCard('player'); result = true; break;
    }
    set({ state: engine.getState() });
    return result;
  },

  runOpponentTurn: () => {
    const { engine, ai } = get();
    if (!engine || !ai) return;
    ai.executeTurn(engine);
    set({ state: engine.getState() });
  },
}));
```

- [ ] **Step 4: 创建 src/stores/deckStore.ts**

```typescript
import { create } from 'zustand';
import { STARTER_DECKS } from '@/battle/cards';
import type { DeckDef } from '@/battle/types';

interface DeckStore {
  decks: DeckDef[];
  selectedDeckId: string;

  setSelectedDeck: (id: string) => void;
}

export const useDeckStore = create<DeckStore>((set) => ({
  decks: STARTER_DECKS,
  selectedDeckId: '主角',

  setSelectedDeck: (id) => set({ selectedDeckId: id }),
}));
```

- [ ] **Step 5: 提交**

```bash
git add src/stores/settingsStore.ts src/stores/storyStore.ts src/stores/battleStore.ts src/stores/deckStore.ts
git commit -m "feat: Zustand 状态管理层（设置/叙事/对战/卡组）"
```

---

### Task 10: 故事书 UI 组件

**Files:**
- Create: `K:\card-adventure\src\components\story\StoryBook.tsx`
- Create: `K:\card-adventure\src\components\story\NarrativeText.tsx`
- Create: `K:\card-adventure\src\components\story\ActionPanel.tsx`
- Create: `K:\card-adventure\src\components\story\InputBar.tsx`

**Interfaces:**
- Consumes: `useStoryStore`, `useSettingsStore`, `useBattleStore`
- Produces: StoryBook (故事书容器), NarrativeText (流式打字机渲染), ActionPanel (按钮触发展开选项), InputBar (输入栏+斜杠命令)

**设计要求（见 spec §7.1）：**
- StoryBook 为单栏居中布局（桌面端 max-width: 720px）
- NarrativeText 支持逐 token 流式追加渲染（`streamingText` 变化时追加到当前段落）
- ActionPanel 默认隐藏，点击底部「展开行动选项 ▼」按钮展开 2-4 个选项卡片
- 单击选项填入 InputBar，双击选项直接提交
- 选项卡片交错入场动画（stagger 60ms）
- InputBar 支持 Enter 提交、Shift+Enter 换行、自动调整高度（max 120px）
- placeholder 文字有呼吸光效

- [ ] **Step 1: 创建所有 4 个组件**
- [ ] **Step 2: 验证** — `npm run dev`，故事书渲染正常，流式文本逐字出现，行动选项按钮展开正常
- [ ] **Step 3: 提交**

```bash
git add src/components/story/
git commit -m "feat: 故事书 UI 组件（流式叙事 + 行动选项面板 + 输入栏）"
```

---

### Task 11: 对战舞台 UI 组件

**Files:**
- Create: `K:\card-adventure\src\components\battle\BattleOverlay.tsx`
- Create: `K:\card-adventure\src\components\battle\BattleField.tsx`
- Create: `K:\card-adventure\src\components\battle\MonsterZone.tsx`
- Create: `K:\card-adventure\src\components\battle\SpellTrapZone.tsx`
- Create: `K:\card-adventure\src\components\battle\HandCards.tsx`
- Create: `K:\card-adventure\src\components\battle\PhaseIndicator.tsx`
- Create: `K:\card-adventure\src\components\battle\LPDisplay.tsx`
- Create: `K:\card-adventure\src\components\battle\BattleLog.tsx`

**Interfaces:**
- Consumes: `useBattleStore`
- Produces: 全屏对战舞台 UI（游戏王场地布局）

**设计要求（见 spec §7.2）：**
- BattleOverlay 为全屏覆盖层，z-index: 500
- 使用 CSS Grid 布局：对手半场（上）+ 额外怪兽区（中）+ 我方半场（下）
- 怪兽区：5 格横排，每格 120×160px，有卡时实体边框+发光
- 魔陷区：5 格横排，SET 卡显示暗色覆盖+旋转星光
- 手牌区：底部扇形排列（CSS `transform: rotate(var(--angle))`）
- LP 显示：双方大号数字，变化时闪烁动画
- 阶段指示器：顶部居中，5 阶段圆点
- 我方半场色调：蓝金渐变，对手半场色调：暗紫红渐变
- 操作按钮：[抽卡] [下一阶段] [结束回合]
- 手牌点击选中 → 高亮可放置区域 → 点击区域执行动作
- Escape 关闭对战（但保留状态）

- [ ] **Step 1: 创建所有对战 UI 组件**
- [ ] **Step 2: 验证** — 触发战斗后全屏舞台渲染，点击交互正常
- [ ] **Step 3: 提交**

```bash
git add src/components/battle/
git commit -m "feat: 全屏对战舞台 UI（游戏王大师决斗布局）"
```

---

### Task 12: 卡组查看 + 设置面板组件

**Files:**
- Create: `K:\card-adventure\src\components\deck\DeckPanel.tsx`
- Create: `K:\card-adventure\src\components\settings\SettingsModal.tsx`

**Interfaces:**
- Consumes: `useDeckStore`, `useSettingsStore`
- Produces: DeckPanel (3 卡组展示+选择), SettingsModal (API Key 配置等)

**DeckPanel 设计要求：**
- 展示 3 套预设卡组卡片（主角/虫惑魔/珠泪）
- 每张卡片显示卡组名、策略类型标签、主卡组数量
- 当前选中卡组有金色边框高亮
- 点击切换 `selectedDeckId`

**SettingsModal 设计要求（预留端口）：**
- 模态框覆盖层，点击遮罩关闭
- API Key 输入框（password 类型）+ 测试连接按钮
- API Base URL 输入框（默认 DeepSeek）
- Model 输入框
- 世界书路径输入框（默认 `/worldbook/default.json`）
- 正则脚本路径输入框（默认 `/regex/default.json`）
- 文本速度/动画强度/卡牌动画速度 下拉选择
- 保存按钮 → `persistSettings()`
- 清除存档按钮（红色+二次确认）

- [ ] **Step 1: 创建 DeckPanel + SettingsModal**
- [ ] **Step 2: 验证** — 设置面板可配置 API Key，卡组面板可切换选中
- [ ] **Step 3: 提交**

```bash
git add src/components/deck/ src/components/settings/
git commit -m "feat: 卡组查看面板 + 设置模态框（含 API/世界书/正则配置端口）"
```

---

### Task 13: 侧边栏 + 通知 + 粒子背景组件

**Files:**
- Create: `K:\card-adventure\src\components\layout\Sidebar.tsx`
- Create: `K:\card-adventure\src\components\layout\Notification.tsx`
- Create: `K:\card-adventure\src\components\shared\ParticleBg.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`
- Produces: Sidebar (导航+设置入口), Notification (4 种类型通知), ParticleBg (CSS 浮动粒子)

**Sidebar 设计要求：**
- 左侧固定 64px 宽竖排图标导航
- 图标：故事书（当前页）、卡组、设置齿轮
- 悬浮展开 180px + 标签文字
- 当前激活图标左侧金色竖条指示器
- `lucide.createIcons()` 渲染图标

**Notification 设计要求：**
- 右上角固定定位，z-index: 2000
- 4 种类型：info(蓝辉)/success(绿辉)/warning(橙辉)/error(红辉)
- 滑入动画 (slideInRight) + 进度条倒计时
- 悬停暂停倒计时，点击关闭
- 最多同时 5 条

**ParticleBg 设计要求：**
- 20 个浮动光点粒子（CSS animation）
- 随机位置、大小(2-6px)、颜色（蓝/金）
- `float-particle` 动画：随机轨迹 + 透明度呼吸
- `pointer-events: none` 不阻挡交互

- [ ] **Step 1: 创建 3 个布局组件**
- [ ] **Step 2: 验证** — 侧边栏导航正常，通知滑入动画流畅，粒子背景浮动
- [ ] **Step 3: 提交**

```bash
git add src/components/layout/ src/components/shared/
git commit -m "feat: 侧边栏 + 通知系统 + 粒子背景"
```

---

### Task 14: 最终集成 — App.tsx 完整装配 + 初始世界书示例

**Files:**
- Modify: `K:\card-adventure\src\App.tsx`
- Create: `K:\card-adventure\public\worldbook\default.json`
- Create: `K:\card-adventure\public\regex\default.json`

**Interfaces:**
- Consumes: 所有 stores + 所有 components
- Produces: 完整可运行的应用

- [ ] **Step 1: 更新 App.tsx — 完整装配所有组件**

App.tsx 初始化流程：
```
1. useSettingsStore.init() — 加载设置
2. useStoryStore.init() — 加载世界书+正则 → 创建 LLMClient
3. 检查 settings.apiKey — 无 Key 则自动打开设置面板
4. 如有存档 → 恢复叙事历史
5. 如无存档 → 显示开场引导文本
6. 注册 BattleOverlay active 监听 → 自动执行对手回合
```

- [ ] **Step 2: 创建示例世界书 default.json**

```json
{
  "entries": [
    {
      "id": "wb-001",
      "keys": ["森林", "树林", "密林"],
      "content": "这片森林被称为「灵辉之森」，树木散发着微弱的荧光。传说中，光之种曾在此沉睡千年。",
      "scope": "global",
      "priority": 10,
      "caseSensitive": false,
      "wholeWord": false,
      "recursive": false,
      "enabled": true
    },
    {
      "id": "wb-002",
      "keys": ["神殿", "翡翠神殿"],
      "content": "翡翠神殿是精灵守护者世代镇守的圣地，光之种曾在此绽放。神殿墙壁上刻满了古老的符文。",
      "scope": "global",
      "priority": 10,
      "caseSensitive": false,
      "wholeWord": false,
      "recursive": false,
      "enabled": true
    },
    {
      "id": "wb-003",
      "keys": ["决斗", "战斗", "暗影"],
      "content": "在这个世界中，人们通过卡牌决斗来平息争端。暗影势力的怪兽卡组以控制和破坏见长。",
      "scope": "global",
      "priority": 5,
      "caseSensitive": false,
      "wholeWord": false,
      "recursive": false,
      "enabled": true
    }
  ]
}
```

- [ ] **Step 3: 创建示例正则脚本 default.json**

```json
{
  "scripts": [
    {
      "id": "re-001",
      "name": "移除多余空行",
      "pattern": "\\n{3,}",
      "flags": "g",
      "replacement": "\\n\\n",
      "stage": "post",
      "enabled": true
    },
    {
      "id": "re-002",
      "name": "格式化骰子结果",
      "pattern": "\\[检定:(\\w+)\\s+(\\d+)\\]",
      "flags": "gi",
      "replacement": "（检定：$1，难度 $2）",
      "stage": "post",
      "enabled": true
    }
  ]
}
```

- [ ] **Step 4: 验证** — 完整流程：
  1. `npm run build` 无错误
  2. 浏览器打开 → 粒子背景 + 侧边栏
  3. 设置面板填入 API Key
  4. 输入框输入行动 → AI 流式响应
  5. 点击展开行动选项 → 单击/双击选项
  6. 输入包含"战斗"关键词 → AI 生成 [BATTLE:虫惑魔] 标记
  7. 全屏对战舞台显示 → 手牌/怪兽区/魔陷区 → 召唤/攻击交互
  8. 战斗结束返回叙事

- [ ] **Step 5: 提交**

```bash
git add src/App.tsx public/worldbook/default.json public/regex/default.json
git commit -m "feat: 最终集成 — 叙事→对战完整流程 + 示例世界书/正则"
```

---

### Task 15: 最终打磨 — 动画 + 响应式 + 错误处理

**Files:**
- Modify: `K:\card-adventure\src\tokens.css` (添加全局过渡动画)
- Modify: `K:\card-adventure\src\components\battle\BattleOverlay.tsx` (战斗结果动画)
- Modify: `K:\card-adventure\src\components\story\StoryBook.tsx` (移动端折叠布局)

- [ ] **Step 1: 添加全局动效增强**
  - 面板切换 fadeIn 250ms
  - 卡牌入场 card-appear 动画 (translateY + scale + opacity)
  - LP 变化闪烁 lp-flash 动画
  - 战斗胜利/败北结果弹窗

- [ ] **Step 2: 响应式基础**
  - ≤768px 移动端：侧边栏收缩为底部横排，故事书单栏全宽，对战舞台简化

- [ ] **Step 3: 错误处理**
  - LLM API 错误 → 通知提示 + 不崩溃
  - 世界书/正则加载失败 → 静默降级（空列表）
  - 卡组数据缺失 → 占位提示
  - localStorage/IndexedDB 不可用 → 内存降级

- [ ] **Step 4: 验证 + 提交**

```bash
git add -A
git commit -m "feat: 最终打磨 — 动效增强 + 响应式 + 错误处理"
```

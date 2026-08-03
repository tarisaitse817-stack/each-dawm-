# YGO 决斗竞技场 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Web 版游戏王 OCG 对战模拟器，TypeScript 规则引擎 + 纯 TS AI 对手 + LLM 叙事驱动。

**Architecture:** React 19 UI 通过 Zustand 单 store 连接纯 TS 引擎层。引擎层包含阶段机、连锁栈、召唤/战斗/效果解析器。卡牌效果采用状态机模式（canActivate/resolve）。AI 用 Minimax + Alpha-Beta + 启发式。叙事用角色卡 PNG + 世界书驱动 LLM。

**Tech Stack:** React 19 + TypeScript + Vite + Zustand + 纯 TS 引擎

## Global Constraints

- 引擎代码纯 TypeScript，零浏览器依赖，可独立单元测试
- 卡牌数据从 `E:\MyCardLibrary\ygopro2\cdb\cards.cdb` 导出 JSON 嵌入
- UI 继承"光之回响"：深色底 `#0a0d14`、灵蓝 `#4FC3F7`、暖金 `#FFD54F`、毛玻璃面板、霞鹜文楷/Noto Sans SC/Cinzel
- 7 卡组 228 张不重复卡，虫惑魔先做试点
- 每张卡实现 `canActivate(ctx): Activation[]` 和 `resolve(act, state): GameState`
- AI 对手纯 TS，不调 LLM
- 角色卡 chara_card_v3 PNG 格式
- 项目放 K 盘

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:** Create Vite project at `K:\ygo-duel-arena\`

- [ ] **Step 1:** `cd K:\ && npm create vite@latest ygo-duel-arena -- --template react-ts`
- [ ] **Step 2:** `cd K:\ygo-duel-arena && npm install zustand`
- [ ] **Step 3:** Create directories: `src/engine/`, `src/cards/data/`, `src/cards/archetypes/`, `src/ai/strategies/`, `src/narrative/`, `src/store/`, `src/ui/board/`, `src/ui/story/`, `src/ui/settings/`, `src/ui/shared/`, `src/styles/`, `public/characters/`, `public/worldbooks/`, `public/presets/`
- [ ] **Step 4:** Add Google Fonts (LXGW WenKai, Noto Sans SC, Cinzel, Inter) to `index.html`
- [ ] **Step 5:** Create `src/styles/variables.css` — CSS custom properties from 光之回响
- [ ] **Step 6:** Create `src/styles/base.css` — reset, panel class, scrollbar, fadeIn animation
- [ ] **Step 7:** Create `src/App.tsx` — placeholder "YGO 决斗竞技场" in spirit blue
- [ ] **Step 8:** Create `src/engine/index.ts` — barrel: `export * from './types'`
- [ ] **Step 9:** Verify: `npm run dev` shows placeholder
- [ ] **Step 10:** `git init && git add -A && git commit -m "feat: project scaffolding"`

---

### Task 2: Engine Type Definitions

**Files:** Create `src/engine/types.ts`

**Produces:** `Card`, `MonsterCard`, `SpellTrapCard`, `PlayerState`, `GameState`, `Phase`, `Step`, `ChainLink`, `CardLocation`, `ActionLog`, `GameAction`, `GameEvent`, `GameEventType`

- [ ] **Step 1:** Write `src/engine/types.ts` with all type definitions (interfaces for Card hierarchy, PlayerState with lp/deck/hand/monsterZones/stZones/fieldZone/graveyard/banished/extraMonsterZone, GameState with players/turn/turnPlayer/phase/step/chain/priority/priorityPassed/normalSummonUsed/events)
- [ ] **Step 2:** Verify: `npx tsc --noEmit` — no errors
- [ ] **Step 3:** Commit: `feat: engine type definitions`

---

### Task 3: Card Data Export Script

**Files:** Create `scripts/export-cards.py`, produce `src/cards/data/cards.json`

- [ ] **Step 1:** Write `scripts/export-cards.py` — parse 7 .ydk files from desktop, query cards.cdb for datas + texts, decode ygopro type/attribute/race bitmasks, output JSON with id/name/desc/cardType/monsterType/atk/def/attribute/race/level
- [ ] **Step 2:** Run: `python scripts/export-cards.py` → expect `Exported 228 cards`
- [ ] **Step 3:** Verify JSON structure — sample card has all required fields
- [ ] **Step 4:** Commit: `feat: card data export + cards.json (228 cards)`

---

### Task 4: GameState Factory + Immutable Helpers

**Files:** Create `src/engine/state.ts`, test `src/engine/__tests__/state.test.ts`

**Produces:** `createInitialState()`, `addToHand()`, `removeFromHand()`, `placeOnField()`, `sendToGraveyard()`, `banishCard()`, `dealDamage()`, `drawCard()`, `isGameOver()`

- [ ] **Step 1:** Write failing test — create state with 8000 LP, draw 5 cards, immutable updates don't mutate original
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement `state.ts` — factory with shuffle+draw, all immutable helpers using `updatePlayer()` pattern
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat: GameState factory + immutable helpers`

---

## Phase 2: Engine Core

### Task 5: Phase Machine

**Files:** Create `src/engine/phases.ts`, test `src/engine/__tests__/phases.test.ts`

**Produces:** `nextPhase(state): GameState`, `getPhaseOrder(): Phase[]`

- [ ] **Step 1:** Write failing test — DP→SP, SP→MP1, full cycle switches turn+draws card
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement `phases.ts` — `PHASE_ORDER = ['DP','SP','MP1','BP','MP2','EP']`, cycle with turn changeover at EP→DP, draw for new turn player
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat: phase machine`

---

### Task 6: Chain Stack System

**Files:** Create `src/engine/chain.ts`, test `src/engine/__tests__/chain.test.ts`

**Produces:** `addToChain()`, `resolveChain()`, `canChain()`, `getChainSpellSpeed()`

- [ ] **Step 1:** Write failing test — sequential chain indices, LIFO resolution, SS2 chains SS1, SS1 can't chain SS2, only SS3 chains SS3
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement `chain.ts` — spell speed from card type, `canChain()` with SS1/2/3 rules, `addToChain()` with validation, `resolveChain()` LIFO clear
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat: chain stack (LIFO, spell speed rules)`

---

### Task 7: Summon Resolution

**Files:** Create `src/engine/summon.ts`, test `src/engine/__tests__/summon.test.ts`

**Produces:** `normalSummon()`, `tributeSummon()`, `specialSummon()`, `fusionSummon()`, `synchroSummon()`, `xyzSummon()`, `linkSummon()`, `canNormalSummon()`

- [ ] **Step 1:** Write failing test — normal summon (MP1 only, once per turn), tribute (level 7+ needs 2), XYZ (materials attached), fusion (materials to GY)
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement `summon.ts` — each summon type as pure function: remove from source, place on field, emit event. XYZ attaches materials underneath. Synchro requires tuner+non-tuner check.
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat: summon resolution`

---

### Task 8: Battle / Damage Calculation

**Files:** Create `src/engine/battle.ts`, test `src/engine/__tests__/battle.test.ts`

**Produces:** `declareAttack()`, `declareDirectAttack()`, `calculateDamage()`

- [ ] **Step 1:** Write failing test — ATK>ATK destroys+damage, ATK<ATK attacker destroyed+reflect, ATK vs DEF no damage, direct attack full ATK, equal ATK both destroyed
- [ ] **Step 2:** Run test — expect FAIL
- [ ] **Step 3:** Implement `battle.ts` — `calculateDamage()` with position logic, `declareAttack()` sends destroyed to GY + deals battle damage, `declareDirectAttack()` checks no opponent monsters
- [ ] **Step 4:** Run test — expect PASS
- [ ] **Step 5:** Commit: `feat: battle + damage calculation`

---

### Task 9: Effect Resolver Pipeline

**Files:** Create `src/cards/types.ts`, `src/cards/registry.ts`, `src/engine/effects.ts`, test

**Produces:** `CardDefinition` interface, `registerCard()/getCard()`, `getAvailableActivations()`, `resolveActivation()`

- [ ] **Step 1:** Write `src/cards/types.ts` — `CardDefinition` with `canActivate(ctx): Activation[]` and `resolve(act, state, targets): GameState`; `Activation` with effectId/effectType/spellSpeed/cost/condition/targets/description
- [ ] **Step 2:** Write `src/cards/registry.ts` — `Map<number, CardDefinition>` with register/get/getAll
- [ ] **Step 3:** Write `src/engine/effects.ts` — scan hand/monster/ST/GY zones → call `canActivate()` on each card → collect activations; `resolveActivation()` checks condition → pays cost → calls `resolve()`
- [ ] **Step 4:** Write failing test — register dummy searcher card, verify activation found + resolved
- [ ] **Step 5:** Run test — expect PASS
- [ ] **Step 6:** Commit: `feat: effect resolver pipeline + card registry`

---

## Phase 3: Pilot Archetype + First Playable

### Task 10: 虫惑魔 Archetype (40 main + 15 extra)

**Files:** Create `src/cards/archetypes/traptrix/index.ts`, `staples.ts`

**Pattern per card:**
```typescript
export const 塞拉之虫惑魔: CardDefinition = {
  id: 73639099, name: '塞拉之虫惑魔', cardType: 'monster',
  canActivate(ctx) {
    if (ctx.triggerEvent?.type === 'effectActivated' &&
        ctx.triggerEvent?.card?.cardType === 'trap') {
      return [{
        effectId: 1, effectType: 'trigger', spellSpeed: 1,
        description: '通常陷阱卡发动时，从卡组特殊召唤1只虫惑魔怪兽',
      }]
    }
    return []
  },
  resolve(activation, state, targets) {
    if (activation.effectId === 1) { /* special summon from deck */ }
    return state
  }
}
```

**Key cards:** 特莱恩之虫惑魔 (search hole), 兰卡之虫惑魔 (search Traptrix), 蒂奥之虫惑魔 (GY revive), 普蒂卡之虫惑魔 (mimic+bounce), 塞拉之虫惑魔 (trap trigger→SS), 芙莉西亚之虫惑魔 (negate), 阿洛美勒丝之虫惑魔 (SS from deck), 西托莉丝之虫惑魔 (GY revive), plus staples: 灰流丽, 增殖的G, 无限泡影, 无底的落穴, etc.

- [ ] **Step 1:** Create `staples.ts` — 灰流丽, 增殖的G, 无限泡影, 墓穴的指名者, 抹杀之指名者, etc.
- [ ] **Step 2:** Create `index.ts` — all 虫惑魔-specific cards with actual effect logic
- [ ] **Step 3:** Export `initTraptrix()` — calls `registerCard()` for all 55 cards
- [ ] **Step 4:** Verify: `npx tsc --noEmit`
- [ ] **Step 5:** Commit: `feat: 虫惑魔 archetype`

---

### Task 11: Zustand Game Store

**Files:** Create `src/store/gameStore.ts`

- [ ] **Step 1:** Write store — `useGameStore` with: `gameState`, `narrativeMessages`, `isPlayerTurn`, `selectedCard`, `validActions`; actions: `initDuel()`, `advancePhase()`, `performNormalSummon()`, `performAttack()`, `activateEffect()`, `selectCard()`, `refreshValidActions()`; settings: `apiKey/apiBaseUrl/apiModel` persisted to localStorage
- [ ] **Step 2:** Wire action → engine → state → re-render chain
- [ ] **Step 3:** Commit: `feat: Zustand game store`

---

### Task 12: Basic Board UI

**Files:** Create `src/ui/board/*.tsx`, `src/styles/board.css`, modify `src/App.tsx`

- [ ] **Step 1:** Write `board.css` — inherit 光之回响 variables, grid layout, zone styles (120×160 monsters, 100×100 S/T, 60×80 sides), hand fan, animations
- [ ] **Step 2:** Write `MonsterZone.tsx` — dashed border, solid+glow on occupied, card name/ATK/DEF/attribute icon
- [ ] **Step 3:** Write `SpellTrapZone.tsx` — type icon (spell=rotated square, trap=triangle), name
- [ ] **Step 4:** Write `HandArea.tsx` — fan-shaped cards, hover lift
- [ ] **Step 5:** Write `SideZones.tsx` — deck/extra/GY/banished counts, GY glow by count
- [ ] **Step 6:** Write `PhaseBar.tsx` — DP/SP/MP1/BP/MP2/EP, gold highlight current
- [ ] **Step 7:** Write `BattleBoard.tsx` — compose all zones, LP display, action buttons
- [ ] **Step 8:** Update `App.tsx` — "开始决斗" button → initDuel with 虫惑魔, render BattleBoard
- [ ] **Step 9:** Verify: dev server shows interactive board
- [ ] **Step 10:** Commit: `feat: basic board UI`

---

## Phase 4: AI + Narrative

### Task 13: AI Opponent

**Files:** Create `src/ai/evaluate.ts`, `heuristic.ts`, `search.ts`, `strategies/traptrix.json`, test

- [ ] **Step 1:** Write `evaluate.ts` — LP diff ×0.1 + ATK sum ×1.5 + field advantage ×3.0 + hand ×2.0 + bosses ×0.5 + GY value ×0.8 + traps ×1.5
- [ ] **Step 2:** Write `heuristic.ts` — `getCandidateActions(state, player)` — mandatory effects → high-value options → summons → attacks → nextPhase, capped at 12
- [ ] **Step 3:** Write `search.ts` — `getBestAction(state)` — minimax + alpha-beta, depth 2 (4 for opponent LP<2000 or empty field)
- [ ] **Step 4:** Write `traptrix.json` — priorities, first/second turn behavior, chain preferences
- [ ] **Step 5:** Test — evaluation symmetry: `evaluate(state) + evaluate(flippedState) === 0`
- [ ] **Step 6:** Commit: `feat: AI opponent`

---

### Task 14: Narrative System

**Files:** Create `src/narrative/character-parser.ts`, `lorebook-engine.ts`, `prompt-assembler.ts`, `storyteller.ts`

- [ ] **Step 1:** Write `character-parser.ts` — `parseCharacterCard(pngPath): Promise<CharacterCard>` — read PNG tEXt chunk, base64 decode, parse chara_card_v3, extract name/description/personality/first_mes/character_book
- [ ] **Step 2:** Write `lorebook-engine.ts` — keyword scan with primary/secondary key logic, depth, probability filtering
- [ ] **Step 3:** Write `prompt-assembler.ts` — merge character card + world book hits + game variables into system/user prompt
- [ ] **Step 4:** Write `storyteller.ts` — `generateNarrative(trigger, config): Promise<string>` — triggers: phaseChange, summon(≥5★), attack, destroy, chain(≥3), lpChange(>2000), trapActivate, victory
- [ ] **Step 5:** Commit: `feat: narrative system`

---

## Phase 5: Remaining Archetypes

Each archetype follows the Task 10 pattern: implement all cards as `CardDefinition`, create AI strategy JSON, export `init<Name>()`.

### Task 15: 天气 (40+15)
Pattern-heavy: 天气模样 continuous S/T grant effects to adjacent monsters. Key: 虹天气 彩虹 (XYZ), 雪之天气模样.

### Task 16: 烙印 (60+15)
Fusion-heavy: 烙印融合 from deck, 阿不思 contact fusion, GY recursion. Key: 冰剑龙 幻冰龙, 神炎龙 赫界龙, 赫之烙印.

### Task 17: 珠泪 (43+15)
Mill-based fusion: mill→fusion when sent to GY. Key: 雷诺哈特, 水仙女人鱼, 劈穿壹世坏的弦声.

### Task 18: 直播双子/刻魔 (40+15)
Link climbing: 姬丝基勒/璃拉→Evil★Twin+Fiendsmith. Key: 麻烦·桑妮, 刻魔的咏圣.

### Task 19: 码丽丝 (40+15)
Banish recursion+link: banish as cost, link climb. Key: 白兔, 红心加密, 梦游地下界.

### Task 20: 圣天树/六花/芳香/蕾祸 (45+15)
Plant combo: 圣种→圣天树 link climb→六花圣+芳香莉莉丝. Multi-archetype synergy.

---

## Phase 6: Full UI

### Task 21: Story Panel UI
Create `src/ui/story/StoryPanel.tsx`, `ChatBubble.tsx`, `src/styles/story.css` — 30% left, 霞鹜文楷, slideInRight animation, opponent dialog bubbles.

### Task 22: Settings UI
Create `src/ui/settings/SettingsModal.tsx`, `DeckSelector.tsx` — API config, deck dropdown, character PNG picker.

### Task 23: Animations & Polish
Card entrance (drop-bounce), attack (sweep+shockwave), GY funeral (flip+shrink+sink), chain glow, fusion vortex, LP flash, victory overlay, particle canvas.

---

## Phase 7: Integration

### Task 24: End-to-End Integration Test
Full duel: 虫惑魔 vs 虫惑魔 from DP→victory. Chain scenario test. AI turn verification. Engine↔Zustand↔UI↔AI↔Narrative touchpoints.

---

## Summary

| Phase | Tasks | Deliverable |
|-------|-------|-------------|
| 1. Foundation | 1-4 | Project + types + card data + state |
| 2. Engine Core | 5-9 | Phase/chain/summon/battle/effects |
| 3. First Playable | 10-12 | 虫惑魔 vs 虫惑魔 with UI |
| 4. AI+Narrative | 13-14 | AI decisions + LLM storytelling |
| 5. All Archetypes | 15-20 | 6 remaining decks |
| 6. Full UI | 21-23 | Story panel + settings + animations |
| 7. Integration | 24 | End-to-end verified |
| **Total** | **24 tasks** | Full YGO duel arena |

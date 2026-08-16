# 光之回响重构设计：场景交互式前端游戏

**日期**：2026-08-16
**状态**：已获用户逐节确认
**范围**：前端重构为场景交互式游戏（场景图导航 + 场景内立绘 + 近景特写对话 + 表情差分），素材全部 AI 生成

## 1. 背景与目标

现有游戏是「聊天流」形态：叙事文字居中列 + 打字机 + 底部输入框，地图是 380px 卡片，角色图只作伙伴面板小头像，无场景系统、无表情差分。

**目标**：改为玩家主动探索的场景交互式游戏：
- 固定场景集合（16 个节点），场景图互相连接，画面边缘方向出口导航
- 场景内角色以**全身透明立绘**合成进画面（非小头像热点），悬停高亮、点击进入近景特写
- 近景特写 = 大立绘 + **表情差分** + 对话 + 输入框；AI 只在特写对话中工作
- **AI 不推进剧情**：玩家不行动，世界静止

## 2. 已确认的需求决策

| 决策项 | 结论 |
|---|---|
| 交互形态 | 纯场景探索：场景视图无对话栏，对话只在近景特写；顶部轻字幕播静态旁白 |
| 场景粒度 | 7 地点 × 2~3 子场景 = 16 节点（家3/公司3/小吃街2/超市2/牌店2/商业街2/城郊2，城郊站台为全城枢纽） |
| 场景素材 | ComfyUI 生成，Anima Base V1.0 文生图工作流（miaomiaoHarem_anima15 + jirai_v2 LoRA + shift 3.6 + cfg 1） |
| 表情集合 | 8 种/角色 × 6 角色 = 48 张：平常/微笑/开心/害羞/生气/难过/震惊/渴望 |
| 表情切换机制 | AI 回复带 `[emotion:标签]` 前缀 → bridge 解析随 narrative 返回 → 前端换立绘 |
| 表情作用范围 | 简单版：场景内立绘固定平常表情，表情差分只在近景特写切换 |
| 地图面板 | 删除，导航由场景图出口完成 |
| 对战触发 | 叙事触发对战卡片 + 特写内「提出决斗」按钮，两条入口 |
| 物件热点 | 有，静态描述（不发 AI 请求） |
| 柳月外观 | 粉长发+呆毛+黑色发饰蝴蝶结+粉瞳+白长袖衬衫+大黑领结+黑背带裙+黑过膝袜（工作流示例版） |
| 素材审查 | 所有生成图片同步复制到桌面一份供审查 |

## 3. 架构方案

**方案 A：渐进式改造**（已选定）。保留 AppState 订阅体系、Navigation、存档、标题/背包/伙伴/设置/BGM/粒子；新增场景模块；重构事件面板；删除地图。

### 模块动作清单

| 模块 | 动作 |
|---|---|
| `js/map.js` | **删除**（导航由场景图取代） |
| `js/event.js` | **重构**：拆出「对话引擎」（打字机队列/行动建议/对战触发/兜底叙事），聊天流 UI 移除 |
| `js/scene.js` | **新增**：场景视图（背景层 + 立绘层 + 热点层 + 出口 + 旁白字幕） |
| `js/closeup.js` | **新增**：近景特写层（大立绘 + 表情 + 对话区 + 输入 + 提出决斗按钮） |
| `js/scenes-data.js` | **新增**：场景图静态数据（17 节点/出口/热点/物件/角色） |
| `js/state.js` | 新增 `currentSceneId`/`sceneCharacters`/`closeup` 字段 |
| `js/storage.js` | SAVE_KEYS 增加 `currentSceneId`/`sceneCharacters`/`gameTime` |
| `js/ai.js` + `server/bridge.py` | 情感标签协议：prompt 要求 `[emotion:标签]` 前缀；bridge 拆分返回 `{narrative, emotion}` |
| `css/` | 新增 scene.css、closeup.css；event.css 改造 |
| `assets/` | 新素材按约定落盘（见第 7 节） |

保留不动：`js/companions.js`、`js/inventory.js`、`js/title.js`、`js/navigation.js`（视图项微调）、`js/particles.js`、`js/notifications.js`、`js/storage.js` 主体、BGM 双轨。

## 4. 场景图数据模型（`js/scenes-data.js`）

```js
const SCENES = {
  'home_living': {
    id: 'home_living', name: '客厅',
    bg: 'assets/scenes/home_living.png',
    description: '温暖的客厅，白月的日常据点。',
    exits: [
      { dir: 'left',   to: 'home_bed',  label: '卧室' },
      { dir: 'right',  to: 'home_door', label: '家门' },
      { dir: 'bottom', to: 'suburb_st', label: '出门' },
    ],
    characters: ['baiyue', 'siren'],        // 可出现的角色热点
    characterSpots: {                        // 立绘合成位置（地面锚点）
      baiyue: { x: 0.62, y: 0.55, scale: 0.8 },
    },
    objects: [
      { id: 'sofa', label: '沙发', x: 0.3, y: 0.7, desc: '...' },
    ],
  },
  // ... 共 16 节点
}
```

- 出口 = 画面边缘方向区（`left/right/top/bottom`），点击切场景 + 时间推进
- 热点/锚点全部**百分比坐标**，响应式适配
- 物件热点：悬停才亮，点击出静态描述字幕
- 场景图静态数据，`currentSceneId` 入存档

## 5. 场景视图 UI（`js/scene.js`）

三层结构：
1. **背景层**：场景图交叉淡入（复用 `#location-bg` 机制改造）
2. **立绘层**：角色全身透明 PNG，按 `characterSpots` 锚定在地面线，脚下椭圆软阴影；悬停描边光晕+名字；点击→近景特写
3. **热点层**：出口方向条（悬停浮现标签）、物件热点、顶部轻字幕（进场景播一句静态旁白，打字机，播完淡出）

**规则**：进入场景无 AI 参与；玩家不操作则世界静止；AI 只在近景特写工作。角色不出场（未解锁/不在该场景）则立绘不显示。

## 6. 近景特写 + 表情系统（`js/closeup.js`）

1. 点击场景立绘 → 背景模糊压暗 + 腰以上大立绘（表情差分图）
2. 对话区 = event.js 重构出的对话引擎（打字机/建议/历史）
3. 表情切换：AI 回复 `[emotion:标签]` → bridge 拆分 → 前端映射 8 表情 → 立绘淡入切换
4. 「提出决斗」按钮 + AI 叙事触发对战卡片（BattleBridge 链路原样复用）
5. 关闭特写 → 回场景视图

**表情映射**：neutral/smile/happy/blushing|embarrassed→害羞/angry/sad|tears→难过/surprised→震惊/desire→渴望；未知或无标签 → neutral。

## 7. 素材生成管线（ComfyUI）

| 素材 | 数量 | 配方 | 尺寸 |
|---|---|---|---|
| 场景图（第一视角，无人物） | 16 | Anima Base 文生图（Harem + jirai LoRA + ModelSamplingAuraFlow 3.6 + CFGNorm + cfg1/20步/euler） | 1216×832 |
| 角色全身立绘 | 6 | 同配方 + `full body, standing, white background` → 背景移除抠透明 | 768×1344 |
| 表情差分 | 48 | 定稿全身图为基 → HED 线稿 + ControlNet(softedge/mistoline) 锁构图 + 表情标签 + 同种子 | 768×1344 |

- **一致性方案**：每角色先出 1 张定稿全身图（人工挑选）→ 线稿 ControlNet + 8 表情标签 + 同种子出变体（无 IPAdapter 环境的最佳实践，魔改an 工作流已验证此链路）
- **提示词规则**：严格遵循 anima 系统提示词规则（Danbooru 小写标签、`masterpiece, best quality, score_7, safe, year 2026` 前缀、负向 `worst quality, low quality, score_1, score_2, score_3, artist name`、标签顺序、`(tag:2)` 高权重）
- **落盘**：`assets/scenes/<scene_id>.png`、`assets/characters/<id>/fullbody.png`、`assets/characters/<id>/<emotion>.png`；角色 id：baiyue/linyi/liuyue/suyun/siren/ecclesia
- **审查**：每张生成同步复制到桌面（`C:\Users\Administrator\Desktop\`）供人工抽检
- **环境**：使用 Comfy Desktop app 内嵌服务器（8188）；⚠️ 不要另起 headless 服务器占 8188（详见记忆 comfyui-env）

## 8. 状态与存档

```js
currentSceneId: 'home_living',
sceneCharacters: { baiyue: { present: true, emotion: 'neutral' }, ... },
closeup: { active: false, characterId: null, emotion: 'neutral' },
```

- `SAVE_KEYS` 增加 `currentSceneId`/`sceneCharacters`/`gameTime`（修复刷新丢位置）；`narrativeHistory` 仍不存档
- `gamePhase`/`mapNodes` 遗留死数据清理

## 9. bridge 协议变更

1. prompt 模板（`server/data/preset.json`）要求 AI 每段回复以 `[emotion:标签]` 开头（8 标签白名单）
2. `/chat` 响应拆分：`{narrative, emotion, battle, thinking, usage}`；无标签 → `neutral`
3. 前端兼容：旧 bridge（无 emotion 字段）默认 neutral
4. 兜底叙事 `LOCATION_FALLBACKS` 改为按场景 ID 分组

## 10. 错误处理与降级

| 场景 | 降级 |
|---|---|
| AI 请求失败 | 按场景 ID 的兜底叙事 |
| 表情图缺失 | 回退 neutral；再缺 → 剪影占位 |
| 场景图缺失 | 渐变色 + 场景名（开发期用现有 7 张背景图占位） |
| 对战服务不可用 | 通知「决斗服务未启动」+ 保留叙事 |

## 11. 测试策略

- 纯前端无测试框架，采用**手工验收清单**（场景切换/热点交互/特写对话/表情切换/对战链路/存档恢复/刷新恢复）
- bridge 协议变更用手写 Python 冒烟脚本验证 `/chat` 返回结构
- 表情映射表做单元级数据校验（8 标签 × 6 角色文件存在性检查脚本）
- 素材管线每批次抽检（桌面审查）

## 12. 风险与注意

- event.js 48KB 内部重构是最大改动点，重构时保持 `EventPanel` 对外接口兼容（init/addNarratorText/submitAction/setAtmosphere）
- 表情差分一致性受限于无 IPAdapter，需人工挑选定稿图
- 6GB 显存：1216×832 单张约 2~4 分钟，70 张总量（16 场景 + 6 全身 + 48 表情）预计 3~5 小时，分批执行

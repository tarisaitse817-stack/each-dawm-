# 光之回响设计：角色阵容替换 + 关系页图鉴

**日期**：2026-08-17
**状态**：设计已获用户确认（方案 A + 六节全过）
**范围**：删除旧 6 角色（废案），阵容改为世界书 V2 的 9 角色；关系页（伙伴界面）图鉴化——缩略头像卡片 + 点击全图详细介绍
**依赖**：世界书 V2 已导入（commit 3c9447a）；转场计划已完成

## 1. 背景与目标

用户导入世界书 V2 后宣布旧 6 角色（白月/林仪/柳月/苏昀/塞壬/艾克利西娅阵容）为废案，游戏角色改为世界书 9 人：塞壬、零依、露世、姬丝吉尔、璃拉、艾克利西亚、天童、理、彩虹。用户提供「角色介绍」文件夹 8 张 1216×832 图（双子为合照），要求关系页做成图鉴：卡片缩略头像 → 点击展示全图与详细介绍。

## 2. 已确认的需求决策

| 决策项 | 结论 |
|---|---|
| 数据方案 | **方案 A**：新建 `data/characters.json` 集中存放 9 人图鉴数据（id/名字/昵称/身份/背景/性格/外貌/主题色/介绍图路径/初始好感度），companions.js 读取渲染；用户改文案直接编辑 JSON |
| 介绍文案 | 由 AI 从世界书 YAML 档案提炼简洁版（昵称/身份/背景/性格/外貌各一两行，**不含 NSFW**），用户审改 |
| 缩略头像 | 用户后续提供 9 张单独头像（`assets/companions/<id>.png`，双子各一）；未提供前显示既有人物图标占位 |
| 介绍全图 | 8 张 1216×832 入库 `assets/companions/`；双子合照只存一份 `twins-intro.png`，姬丝吉尔+璃拉共用 |
| 场景安排 | **本轮不做**：16 场景角色引用/站位全部清空（校验适配空站位合法）；用户之后自行加场景并安排角色 |
| 初始好感度 | 沿用世界书初始值：塞壬40/零依30/露世30/姬丝吉尔20/璃拉20/艾克利西亚20/天童30/理20；彩虹世界书未写 → 默认 20 |
| 解锁状态 | 新 9 人全部解锁（图鉴性质）；locked 剪影逻辑保留不删 |
| 旧角色清理 | 代码与素材全删（git 历史可找回）；素材另复制到 `.superpowers/import-backups/` 兜底 |
| 场景立绘链路 | `CHARACTERS[<id>].portrait` → `assets/characters/<id>/neutral.png` 结构保留，由用户 ComfyUI 出图（avatar 计划 Task 6 相应变为 9 张） |
| 动态 CG 试点 | 原「白月试点」失效；试点角色待用户后续指定（本设计不动动态 CG 文档） |

## 3. 角色表（9 人）

| id | 名字 | 初始好感 | 介绍图 | 备注 |
|---|---|---|---|---|
| siren | 塞壬 | 40 | siren-intro.png | 沿用现有 id |
| lingyi | 零依 | 30 | lingyi-intro.png | |
| lushi | 露世 | 30 | lushi-intro.png | |
| kisikil | 姬丝吉尔 | 20 | twins-intro.png | 双子合照 |
| lilla | 璃拉 | 20 | twins-intro.png | 双子合照 |
| ecclesia | 艾克利西亚 | 20 | ecclesia-intro.png | 沿用现有 id |
| tiantong | 天童 | 30 | tiantong-intro.png | |
| li | 理 | 20 | li-intro.png | |
| caihong | 彩虹 | 20 | caihong-intro.png | 初始值默认 20 |

## 4. 数据文件 `data/characters.json` 结构

（以下为**示例**：`nicknames` 等文案实际值由实施时从世界书 YAML 档案提炼，示例中的昵称不代表最终文案）

```json
{
  "characters": [
    {
      "id": "siren",
      "name": "塞壬",
      "nicknames": ["小塞", "人鱼小姐"],
      "identities": ["从鱼缸里降临的人鱼精灵"],
      "background": "……",
      "personality": "……",
      "appearance": "……",
      "affection": 40,
      "theme": { "glow": "rgba(130,200,230,0.3)", "accent": "#82d4e8" },
      "introImage": "assets/companions/siren-intro.png",
      "avatar": "assets/companions/siren.png"
    }
  ]
}
```

- 字段说明：`nicknames/identities` 为字符串数组；`background/personality/appearance` 为纯文本（1-3 行，无 NSFW）；`theme` 为 CSS 颜色对（卡片光晕）；`introImage` 为点击后的全图路径；`avatar` 为卡片缩略头像路径（未提供时该文件不存在 → 前端走图标占位）
- 前端加载：`fetch('data/characters.json')` 缓存；失败 → 关系页显示空状态，不阻塞游戏
- 好感度运行时值仍存 AppState（`companions`），`characters.json` 只提供初始值/静态图鉴数据

## 5. 关系页 UI（js/companions.js + css/companions.css）

### 5.1 卡片（既有结构保留，数据源切换）

- 卡片：圆形缩略头像（`avatar` 图，缺失 → `user` 图标占位）+ 名字 + 好感星星（affection 沿用 AppState 运行时值）+ 状态/位置标签 + 简介一行（`background` 截断）
- 主题色改用 characters.json 的 `theme`（旧 COMPANION_THEMES 常量删除）
- 未解锁剪影逻辑保留；新 9 人默认全解锁

### 5.2 点击 → 全屏详情弹层（新增）

- 点击卡片 → 打开 `#companion-detail` 全屏弹层（与 closeup 同风格：`position: fixed; inset: 0`，不透明深色背景，z-index = 85，低于 closeup(90)/转场(100)）
- 内容：居中全图（`introImage`，`object-fit: contain` 自适应 1216×832）+ 底部详情文本区（名字/昵称/身份/背景/性格/外貌分段，深色渐变底）+ 右上「关闭 ✕」
- 行为：打开时锁场景滚动；Esc/点击背景关闭；弹层 DOM 惰性创建（首次点击时构建，之后复用更新内容）
- 双子共用一张 `twins-intro.png`：两人各自的详情弹层都显示合照，文本区各自不同

## 6. 旧角色清理范围

| 位置 | 清理项 |
|---|---|
| js/scenes-data.js | `CHARACTERS` 旧 6 人 → 新 9 人（`portrait: assets/characters/<id>/neutral.png`）；16 场景 `characters`/`characterSpots` 全部清空 |
| js/state.js | 初始 `companions` 数据 → 新 9 人（id/name/affection 初始值/unlocked:true/location:'未知'/status:'休整'/background: 从 characters.json 对应条目截取） |
| js/companions.js | `COMPANION_THEMES` 旧 id 删除，改读 characters.json；渲染数据源切换 |
| assets/companions/ | 旧 6 图删除；新 8 张介绍图入库（`<id>-intro.png` + `twins-intro.png`） |
| assets/characters/ | 旧 5 人目录（baiyue/linyi/liuyue/suyun/ecclesia）删除；保留 siren 目录 |
| scripts/validate-scenes.mjs | 校验新 9 人 portrait 路径；场景角色引用**允许为空**（用户后续安排）；引用不存在 id 仍报错 |
| js/event.js | 决斗对手解析（按名字匹配 CHARACTERS 的路径）随新 roster 自动生效，确认无旧名字硬编码残留 |

- 素材删除前复制到 `.superpowers/import-backups/`（世界书旧版已在那里）
- 全库 grep 确认旧 id（`baiyue|linyi|liuyue|suyun`）与旧名（`白月|林仪|柳月|苏昀`）零残留（文档/计划文件除外）

## 7. 错误处理与测试

| 场景 | 行为 |
|---|---|
| characters.json 加载失败 | 关系页显示空状态文案，游戏其余部分不受影响 |
| 头像文件缺失 | 卡片显示 `user` 图标占位（既有逻辑） |
| 介绍图文件缺失 | 详情弹层显示「图片缺失」占位 + 文本区照常 |
| 校验 | `node scripts/validate-scenes.mjs`、`node scripts/validate-emotion.mjs` 保持 PASS；新增/改造断言覆盖 9 人 roster |
| 浏览器回归 | 关系页 9 卡片渲染、点击 9 人详情弹层（全图+文案+关闭）、双子两人显示同一合照、好感度变化流光不回归、场景无角色时无头像残留、读档后关系页一致 |

## 8. 不在本设计内

- 场景新增与角色站位安排（用户后续自行处理）
- 缩略头像图片产出（用户提供）
- 场景 neutral.png 脸部特写产出（用户 ComfyUI 出图，avatar 计划 Task 6 扩展为 9 张）
- 动态 CG 特写试点角色改定（待用户指定）
- 介绍文案 NSFW 内容（图鉴只含 SFW 版）

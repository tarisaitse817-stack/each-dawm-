# 头像入库 + WindBot 卡组重分配 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 关系页 9 张缩略头像入库（assets/companions/<id>.png）；WindBot AI 卡组按用户确认的分配表接入 9 角色（server 配置 + 前端 deck 占位同步 + Evil Twin 卡组文件复制）。

**Architecture:** 头像为纯素材入库（-LiteralPath 逐项）；卡组重分配改 `server/data/config.json` 的 character_decks（桥接对战的 deck/protector/field/dialog 表）与 `js/state.js` companions 的 deck 占位字段；`怪盗コンビEvil★Twin.ydk` 复制为 WindBot AI 卡组（无需新脚本——WindBot 通用 AI 以 `Deck=` 参数换卡组）。

**Tech Stack:** PowerShell 5.1（素材操作）、Node v24（校验）、Python（JSON 校验）

## Global Constraints

- 项目根目录：`C:\Users\Administrator\each-dawm-`；WindBot 卡组目录 `K:\MyCardLibrary\mdpro3\Data\Windbot\Decks\`
- 9 人 id 固定：siren/lingyi/lushi/kisikil/lilla/ecclesia/tiantong/li/caihong；头像目标 `assets/companions/<id>.png`
- **PS 5.1 中文路径 -LiteralPath 逐项，勿逗号数组形式**
- 提交带 `Co-Authored-By: Claude <noreply@anthropic.com>` trailer；用户无关文件（server/start.bat、assets/ 未跟踪、根 progress.md、.superpowers/）绝不提交；master 直推（实现者只 commit 不 push）
- 卡组分配表（用户确认，逐字）：塞壬→`AI_Tearlaments` / 零依→`AI_SkyStriker` / 露世→`AI_Labrynth` / 姬丝吉尔+璃拉→`AI_EvilTwin`（共用）/ 艾克利西亚→`AI_Albaz` / 天童→`AI_Swordsoul` / 理→`AI_Exosister` / 彩虹→`AI_Rainbow`
- K 盘文件操作不受 git 管理（卡组复制不进仓库）；dialog/protector/field 字段沿用现有值或默认（双子新条目用 default dialog + 现有 protector/field 编号顺延或默认值，见 Task 2 Step 2）

---

### Task 1: 关系页缩略头像入库

**Files:**
- Copy: 桌面 `头像` 文件夹 9 张 → `assets/companions/<id>.png`

**Interfaces:**
- Consumes: 桌面 `头像` 文件夹（用户已出图，与抠图立绘同名映射）
- Produces: `assets/companions/<id>.png` × 9（关系页卡片头像，companions.js 已按此路径渲染）

- [ ] **Step 1: 复制（PowerShell，-LiteralPath 逐项）**

```powershell
$src = "$env:USERPROFILE\Desktop\头像"
$dst = "C:\Users\Administrator\each-dawm-\assets\companions"
Copy-Item -LiteralPath "$src\塞壬_.png"      -Destination "$dst\siren.png"
Copy-Item -LiteralPath "$src\零依.png"       -Destination "$dst\lingyi.png"
Copy-Item -LiteralPath "$src\露世.png"       -Destination "$dst\lushi.png"
Copy-Item -LiteralPath "$src\吉丝吉尔_.png"  -Destination "$dst\kisikil.png"
Copy-Item -LiteralPath "$src\璃拉.png"       -Destination "$dst\lilla.png"
Copy-Item -LiteralPath "$src\艾克利西亚.png" -Destination "$dst\ecclesia.png"
Copy-Item -LiteralPath "$src\天童.png"       -Destination "$dst\tiantong.png"
Copy-Item -LiteralPath "$src\理.png"         -Destination "$dst\li.png"
Copy-Item -LiteralPath "$src\彩虹.png"       -Destination "$dst\caihong.png"
```

- [ ] **Step 2: 核对**

Run（PowerShell，同命令先 Add-Type）：
```powershell
Add-Type -AssemblyName System.Drawing
Get-ChildItem "C:\Users\Administrator\each-dawm-\assets\companions\*.png" | Where-Object { $_.BaseName -in @('siren','lingyi','lushi','kisikil','lilla','ecclesia','tiantong','li','caihong') } | ForEach-Object { $img = [System.Drawing.Image]::FromFile($_.FullName); "{0}  {1}x{2}" -f $_.Name, $img.Width, $img.Height; $img.Dispose() }
```
Expected: 9 个文件全部列出（方形或接近方形；非 1216×832 场景图）。

- [ ] **Step 3: 提交**

```bash
git add assets/companions/siren.png assets/companions/lingyi.png assets/companions/lushi.png assets/companions/kisikil.png assets/companions/lilla.png assets/companions/ecclesia.png assets/companions/tiantong.png assets/companions/li.png assets/companions/caihong.png
git commit -m "feat: 关系页 9 张缩略头像入库（用户出图）"
```

---

### Task 2: WindBot 卡组重分配

**Files:**
- Modify: `server/data/config.json`（character_decks 9 人新表）
- Modify: `js/state.js`（companions deck 占位同步为分配表）
- Copy: `K:\MyCardLibrary\mdpro3\Deck\怪盗コンビEvil★Twin.ydk` → `K:\MyCardLibrary\mdpro3\Data\Windbot\Decks\AI_EvilTwin.ydk`（K 盘，不进 git）

**Interfaces:**
- Consumes: 用户确认的分配表（Global Constraints）
- Produces: `character_decks` 9 新名（bridge launch_battle 依 `Deck=` 拉起 WindBot）；前端 deck 占位一致（event.js 对战/图鉴显示）

- [ ] **Step 1: 复制 Evil Twin 卡组到 WindBot 池（K 盘，-LiteralPath）**

```powershell
Copy-Item -LiteralPath "K:\MyCardLibrary\mdpro3\Deck\怪盗コンビEvil★Twin.ydk" -Destination "K:\MyCardLibrary\mdpro3\Data\Windbot\Decks\AI_EvilTwin.ydk"
```
Expected: `AI_EvilTwin.ydk` 出现且非 0 字节（源文件约 479 字节，含卡表）。

- [ ] **Step 2: 改 `server/data/config.json` — character_decks**

将 `character_decks` 整表替换为 9 人新表（键=角色中文名；protector/field 沿用现有编号体系，旧 5 人编号顺延给新角色，dialog 用 `default`）：

```json
  "character_decks": {
    "塞壬":       { "name": "Siren",    "deck": "AI_Tearlaments", "dialog": "default", "protector": "1073001", "field": "1090001" },
    "零依":       { "name": "LingYi",   "deck": "AI_SkyStriker",  "dialog": "default", "protector": "1073002", "field": "1090002" },
    "露世":       { "name": "LuShi",    "deck": "AI_Labrynth",    "dialog": "default", "protector": "1073003", "field": "1090003" },
    "姬丝吉尔":   { "name": "Kisikil",  "deck": "AI_EvilTwin",    "dialog": "default", "protector": "1073004", "field": "1090004" },
    "璃拉":       { "name": "Lilla",    "deck": "AI_EvilTwin",    "dialog": "default", "protector": "1073005", "field": "1090005" },
    "艾克利西亚": { "name": "Ecclesia", "deck": "AI_Albaz",       "dialog": "ecclesia", "protector": "1073006", "field": "1090006" },
    "天童":       { "name": "TianTong", "deck": "AI_Swordsoul",   "dialog": "default", "protector": "1073007", "field": "1090007" },
    "理":         { "name": "Li",       "deck": "AI_Exosister",   "dialog": "default", "protector": "1073008", "field": "1090008" },
    "彩虹":       { "name": "CaiHong",  "deck": "AI_Rainbow",     "dialog": "default", "protector": "1073009", "field": "1090009" }
  },
```

（`dialog` 对应 WindBot 对话脚本名；除「艾克利西亚」沿用既有 `ecclesia` 外全部 `default`。若现有 config 的 ai_pool 里有旧 6 人 NPC 名，不动——它们属于随机路人池。）

- [ ] **Step 3: 改 `js/state.js` — companions deck 占位**

`companions` 数组 9 条目的 `deck` 字段替换为分配表对应值：
`siren: 'Tearlaments'` → `siren: 'Tearlaments'`（保持）、`lingyi: 'Sky Striker'`（保持）、`lushi: 'Labrynth'`（保持）、`kisikil: 'Live Twin'` → `'Evil Twin'`、`lilla: 'Live Twin'` → `'Evil Twin'`、`ecclesia: 'Albaz'`（保持）、`tiantong: 'Tenyi'` → `'Swordsoul'`、`li: 'Voiceless Voice'` → `'Exosister'`、`caihong: 'Maliss'` → `'Rainbow'`。

（前端 deck 字段仅作展示/兜底；实际对战卡组由 bridge 的 character_decks 决定。）

- [ ] **Step 4: 校验**

Run（PowerShell）：
```powershell
node scripts/validate-scenes.mjs
node scripts/validate-emotion.mjs
node scripts/validate-characters.mjs
node scripts/validate-schedules.mjs
python -c "import json; c=json.load(open('server/data/config.json',encoding='utf-8')); assert len(c['character_decks'])==9; assert c['character_decks']['姬丝吉尔']['deck']=='AI_EvilTwin'; print('PASS: character_decks 9 人')"
```
Expected: 全 PASS。

- [ ] **Step 5: 提交**

```bash
git add server/data/config.json js/state.js
git commit -m "feat: WindBot 卡组重分配（9 人按用户分配表 + 双子共用 AI_EvilTwin）"
```

（AI_EvilTwin.ydk 在 K 盘，不进仓库；实测 WindBot 对 Evil Twin 的出牌表现由用户开局对战时观察，如表现差再换预案。）

---

## 验收标准（全部完成 = 本计划完成）

1. `assets/companions/` 下 9 张 `<id>.png` 入库；关系页卡片头像显示用户图（无 404）
2. `character_decks` 恰为 9 新角色，deck 值与分配表逐字一致；`AI_EvilTwin.ydk` 存在于 WindBot Decks 目录且非空
3. 前端 companions deck 占位与分配表一致；四校验脚本全 PASS

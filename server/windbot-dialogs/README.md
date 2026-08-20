# WindBot 决斗台词（光之回响）

本目录是 11 位角色决斗台词的**源文件**（唯一权威副本，改动从这里发起）。

## 部署

WindBot.exe 运行时读取 `Dialogs\{dialog}.json`（文件名 = `server/data/config.json` 里
`character_decks` 的 dialog 值 + `.json`，**不会自动加语言后缀**）。

改动后需同步到三处部署副本：

1. `C:\Users\Administrator\IceYGO-windbot\Dialogs\` —— windbot 源码目录（重编译后保留）
2. `C:\Users\Administrator\IceYGO-windbot\bin\Release\Dialogs\` —— **WindBot.exe 实际读取处**
3. `K:\MyCardLibrary\mdpro3\Data\Windbot\Dialogs\` —— MDPro3 游戏目录（net 房间用）

## 校验

```
python validate.py
```

检查三处部署副本 JSON 合法性、占位符、config.json 指向的文件是否存在。

## 台词规则

- 触发键：`welcome` / `deckerror` / `duelstart` / `newturn` / `endturn` / `summon` /
  `setmonster` / `activate` / `chaining` / `attack` / `directattack` /
  `ondirectattack` / `surrender` / `custom`；`facedownmonstername` 为单字符串
- 占位符只允许 `{0}`、`{1}`（WindBot 用 string.Format，出现其他花括号会直接崩溃）
- 每个触发键下多条台词随机播放；`attack` 为「{0}攻击{1}」、`directattack` 为「{0}直击」
- 角色↔文件映射见 `server/data/config.json` 的 `character_decks`

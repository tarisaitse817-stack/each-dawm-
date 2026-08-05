"""一次性导入脚本：解析角色卡 + 预设 → server/data/*.json"""
import json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")
CARD = os.path.expandvars(r"%USERPROFILE%\Desktop\救命，我被妹卡包围了20260804154517041.json")
PRESET = os.path.expandvars(r"%USERPROFILE%\Desktop\酒馆\【小猫之神】3.75 (edit) (2).json")

os.makedirs(DATA, exist_ok=True)

# ─── 1. 角色卡 → worldbook.json ───
with open(CARD, "r", encoding="utf-8") as f:
    card = json.load(f)

worldbook = []
for entry in card.get("data", {}).get("character_book", {}).get("entries", []):
    content = entry.get("content", "")
    # 清理嵌入式 JSON 碎片 (entries 2-5 有 LLM 生成残留)
    if content.startswith('` 模板') or '"content":' in content[:50]:
        # 尝试从碎片中提取实际内容
        m = re.search(r'"content":\s*"(```yaml.+)', content, re.DOTALL)
        if m:
            content = m.group(1).replace('\\n', '\n')
        else:
            # 跳过空壳
            if len(content) < 200:
                continue
    worldbook.append({
        "id": entry.get("id"),
        "comment": entry.get("comment", [""])[0] if entry.get("comment") else "",
        "keys": entry.get("keys", []),
        "content": content.strip(),
        "constant": entry.get("constant", False),
        "enabled": entry.get("enabled", True),
        "position": entry.get("position", "after_char"),
        "insertion_order": entry.get("insertion_order", 100)
    })

first_mes = card.get("data", {}).get("first_mes", "")

with open(os.path.join(DATA, "worldbook.json"), "w", encoding="utf-8") as f:
    json.dump({"entries": worldbook, "first_mes": first_mes}, f, ensure_ascii=False, indent=2)
print(f"✓ worldbook.json: {len(worldbook)} entries + first_mes ({len(first_mes)} chars)")

# ─── 2. 预设 → preset.json ───
with open(PRESET, "r", encoding="utf-8") as f:
    preset = json.load(f)

enabled_prompts = []
for p in preset.get("prompts", []):
    if not p.get("enabled", False):
        continue
    content = p.get("content", "")
    if not content:
        continue
    # 清理 SillyTavern 宏
    content = re.sub(r'\{\{//[^}]*\}\}', '', content)  # {{// 注释 }}
    content = re.sub(r'\{\{random::[^}]*\}\}', '', content)
    content = re.sub(r'\{\{setvar::[^}]*\}\}', '', content)
    content = re.sub(r'\{\{getvar::[^}]*\}\}', '', content)
    content = re.sub(r'\{\{trim\}\}', '', content)
    content = re.sub(r'\{\{user\}\}', '可爱的小粉丝', content)
    content = re.sub(r'\{\{char\}\}', '小猫之神', content)
    # 清理多余空白
    content = re.sub(r'\n{3,}', '\n\n', content.strip())
    if not content.strip():
        continue
    enabled_prompts.append({
        "name": p.get("name", ""),
        "identifier": p.get("identifier", ""),
        "role": p.get("role", "system"),
        "content": content,
        "system_prompt": p.get("system_prompt", False),
        "marker": p.get("marker", False)
    })

# 提取采样参数和关键配置
sampling = {
    "temperature": preset.get("temperature", 1.0),
    "top_p": preset.get("top_p", 0.99),
    "max_tokens": preset.get("openai_max_tokens", 8192)
}

# 提取 ChatSquash 配置
ext = preset.get("extensions", {}).get("SPreset", {}).get("ChatSquash", {})
chatsquash = {
    "stop_string": ext.get("stop_string", "<end>"),
    "user_prefix": ext.get("user_prefix", "</小猫之神世界书处理>\n\n|{{user}}|\n"),
    "char_prefix": ext.get("char_prefix", "</小猫之神世界书处理>\n\n|游戏剧情|\n"),
    "char_suffix": ext.get("char_suffix", "<end><小猫之神世界书处理>")
}

with open(os.path.join(DATA, "preset.json"), "w", encoding="utf-8") as f:
    json.dump({
        "prompts": enabled_prompts,
        "sampling": sampling,
        "chatsquash": chatsquash
    }, f, ensure_ascii=False, indent=2)
print(f"✓ preset.json: {len(enabled_prompts)} enabled prompts, sampling={sampling}")

# ─── 3. 初始配置 → config.json ───
config = {
    "port": 9999,
    "host": "127.0.0.1",
    "mdpro3_exe": r"K:\MyCardLibrary\mdpro3\MDPro3.exe",
    "mdpro3_dir": r"K:\MyCardLibrary\mdpro3",
    "windbot_server": "tiramisu.moenext.com",
    "windbot_port": "7911",
    "ai_pool": [
        "悠悠", "悠悠王", "琪露诺", "谜之剑士LV4", "复制植物", "尼亚",
        "永远之魂", "比特机灵", "复制梁龙", "奇異果", "奇魔果", "MAX龍果",
        "幻煌果", "燃血鬥士", "報社鬥士", "我太帅了", "玻璃女巫"
    ],
    "llm_timeout": 180
}
with open(os.path.join(DATA, "config.json"), "w", encoding="utf-8") as f:
    json.dump(config, f, ensure_ascii=False, indent=2)
print(f"✓ config.json: port={config['port']}, {len(config['ai_pool'])} AI opponents")

print("\n=== Import complete ===")
print(f"Run: {os.path.join(BASE, 'start.bat')}  (or: python bridge.py)")

"""光之回响 AI 桥接服务器 — stdlib only, zero pip dependencies"""
import json, os, re, sys, time, random, subprocess, traceback, ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
from urllib.request import Request, urlopen, ProxyHandler, build_opener, HTTPSHandler
from urllib.error import URLError, HTTPError

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")

# ─── 网络层修复：绕过系统代理 + 处理 Windows schannel 吊销检查 ───
# urllib 在 Windows 上自动读取注册表中的系统代理（Internet 选项），
# 本地代理（Clash/V2Ray）经常干扰 Cloudflare 的 SSL 握手，导致 UNEXPECTED_EOF。
# 用 ProxyHandler({}) 强制不走代理。

# 主 opener：直连 + 默认 SSL
_NO_PROXY_OPENER = build_opener(ProxyHandler({}))

# Fallback opener：直连 + 跳过证书吊销检查（Windows schannel CRL/OCSP 不可达时）
_FALLBACK_SSL_CTX = ssl._create_unverified_context()
_FALLBACK_OPENER = build_opener(ProxyHandler({}), HTTPSHandler(context=_FALLBACK_SSL_CTX))

def _make_request(url, data=None, headers=None, timeout=30):
    """发起 HTTPS 请求，强制直连 + SSL 吊销降级"""
    req = Request(url, data=data or None, headers=headers or {})
    try:
        return _NO_PROXY_OPENER.open(req, timeout=timeout)
    except Exception as first_error:
        err_str = str(first_error)
        # 如果是 SSL/证书类错误，降级为跳过吊销检查再试一次
        if any(kw in err_str for kw in ("SSL", "CERT", "ssl", "cert", "CRYPT_E", "revocation")):
            try:
                req2 = Request(url, data=data or None, headers=headers or {})
                return _FALLBACK_OPENER.open(req2, timeout=timeout)
            except Exception:
                raise first_error
        raise

# ─── Load data ───
def load_json(name):
    with open(os.path.join(DATA, name), "r", encoding="utf-8-sig") as f:
        return json.load(f)

try:
    worldbook = load_json("worldbook.json")
    preset    = load_json("preset.json")
    config    = load_json("config.json")
    print(f"[bridge] loaded: {len(worldbook['entries'])} world entries, {len(preset['prompts'])} prompts, {len(config['ai_pool'])} AI opponents")
except Exception as e:
    print(f"[bridge] FATAL: cannot load data files — run import_cards.py first\n  {e}")
    sys.exit(1)

FIRST_MES = worldbook["first_mes"]
AI_POOL = config["ai_pool"]
CHARACTER_DECKS = config.get("character_decks", {})
DECK_DIR = os.path.join(config["mdpro3_dir"], "Deck")

# ─── Helpers ───
def get_decks():
    """List .ydk files in Deck directory"""
    try:
        return sorted([f.replace('.ydk', '') for f in os.listdir(DECK_DIR) if f.endswith('.ydk')])
    except Exception:
        return []

def pick_random_ai():
    return random.choice(AI_POOL)

def strip_macros(text):
    """Remove remaining SillyTavern macros and broken remnants"""
    # Standard macros
    text = re.sub(r'\{\{random::[^}]*\}\}', '', text)
    text = re.sub(r'\{\{setvar::[^}]*\}\}', '', text)
    text = re.sub(r'\{\{getvar::[^}]*\}\}', '', text)
    text = re.sub(r'\{\{trim\}\}', '', text)
    text = re.sub(r'\{\{user\}\}', '玩家', text)
    # Broken/partial macro remnants
    text = re.sub(r'^\s*\}\}', '', text)  # orphaned }} closers
    text = re.sub(r'^\s*"[^"]*"\s*', '', text)  # orphaned quoted instructions at start
    # Clean up leading garbage lines (SillyTavern UI instructions)
    text = re.sub(r'^[^|]*?\n(?=\|)', '', text)
    return text.strip()

# ─── Prompt Assembly ───
def build_messages(user_input, history, game_state):
    """Assemble full messages array from preset + worldbook + state"""
    msgs = []

    # Build world context FIRST — it's the most important part
    world_ctx = build_world_context()

    # ============================================================
    # Build clean system prompt: World → Role → Style → Format
    # ============================================================
    system_msg = world_ctx + "\n\n"

    # Role instruction — direct and prominent
    system_msg += """【你的角色】
你是一个严格遵循玩家指令的互动叙事引擎。你的唯一任务是根据【世界设定】中的世界观、
角色信息与规则，将玩家的每一次行动输入作为剧情的【唯一驱动力】，以主角的第一人称
视角推进叙事。

【核心规则 — 必须严格遵守，优先级从高到低】
1. 玩家输入即指令 — 玩家的每条输入都是对剧情走向的直接指令。你必须忠实地执行玩家
   描述的每一个动作、每一个意图。如果玩家说"去便利店"，你就描写去便利店的场景；
   如果玩家说"和塞壬聊天"，你就描写和塞壬对话的场景。绝不自行改变玩家的行动。
2. 禁止叙事惯性 — 不要因为上一段写了什么就继续往那个方向写。每一轮都以玩家最新
   输入为唯一依据，重新判断剧情走向。玩家的新输入可以完全改变之前的叙事方向。
3. 世界设定是约束框架 —【世界设定】定义了世界的规则和角色的性格，你必须在此框架
   内推进叙事。但世界设定不能凌驾于玩家输入之上：玩家决定去哪里、见谁、做什么，
   世界设定只决定这些事情如何发生。
4. 角色行为一致性 — 精灵/角色必须严格遵循她们的角色卡设定（性格、说话方式、行为
   习惯）。当玩家与某个角色互动时，该角色的反应必须符合其设定。当玩家与其他角色
   亲密互动时，修罗场吃醋规则生效。

【叙事风格】
- 从主角的第一人称视角出发，描写他所看到、听到、感受到的一切
- 细腻推进：环境、神态、动作、语气、内心情感、对话，缺一不可
- 风格基调：现代都市、生存智斗与温馨同居交织，带轻微色气但舒缓自然
- 杜绝系统化/数据化描述，用文学性的语言展现角色的内心感受和生理反应"""

    # Add cleaned preset instructions (non-Cat-God parts only)
    style_parts = []
    for p in preset["prompts"]:
        if p.get("system_prompt") and p.get("marker"):
            continue  # skip marker placeholders
        content = strip_macros(p["content"])
        if not content or len(content) < 10:
            continue
        # Skip the Cat God summoning dialogue parts
        if "小猫之神" in content or "喵" in content or "小鱼干" in content or "<|sep|>" in content:
            continue
        style_parts.append(content)

    if style_parts:
        system_msg += "\n\n【风格指引】\n" + "\n".join(style_parts)

    # Game state
    state_json = json.dumps(compact_state(game_state), ensure_ascii=False, indent=1)
    system_msg += f"\n\n【游戏状态】\n```json\n{state_json}\n```"

    # Output contract
    system_msg += """
【输出格式】
用 ```json``` 代码块输出:
{"thinking": "分析玩家意图并规划叙事方向(可空但建议填写)", "end_output": "叙事文本(用<maintext>包裹)", "battle": false, "suggestions": ["建议行动1", "建议行动2", "建议行动3", "建议行动4"]}

规则:
- thinking 中先确认玩家意图："玩家想要[做什么]，涉及角色[谁]，场景[哪里]"，再据此规划叙事
- end_output 必须用 <maintext></maintext> 包裹
- 每次叙事不少于 800 字，目标 1000 字
- 叙事内容必须直接回应玩家的行动意图，不能偏离或自行发挥
- 细腻推进：环境、神态、动作、语气、内心情感、对话，缺一不可
- battle=true 表示触发黑暗决斗/催眠决斗/卡牌对战，此时 end_output 必须只写到决斗即将开始的那一刻，绝不能描述决斗过程
- 【battle=true 触发条件】玩家明确接受/发起决斗挑战、喊出"开始吧"/"决斗"/"DUEL"等宣言、或剧情推进到双方准备开始打牌 — 满足任一条件则 battle=true
- 【严禁】battle=true 时不要在叙事中描写具体的出牌、召唤、攻防等决斗过程 — 这些由 MDPro3 引擎处理
- suggestions 提供4个基于当前叙事的自然行动建议，应该是玩家在当前情境下可能想做或说的事情。必须贴合刚发生的剧情，不要泛泛而谈
- 回复以 <end> 结束
- thinking 可为空字符串但不能缺失
- 用简体中文
	- 【严禁】不要输出游戏状态 JSON（player/gamePhase/companions 等）— 游戏状态由系统自动管理
	- 【严禁】回复中只包含一个 JSON 代码块，不要输出多个 JSON"""

    msgs.append({"role": "system", "content": system_msg})

    # First message: the opening scene
    msgs.append({"role": "user", "content": "【玩家行动】游戏开始……"})
    msgs.append({"role": "assistant", "content": FIRST_MES})

    # History (last 20 entries, max 6000 chars)
    history_texts = []
    total_chars = 0
    for entry in reversed(history[-40:]):  # look back 40, take last 20 fitting
        text = str(entry)
        if total_chars + len(text) > 6000:
            break
        history_texts.insert(0, text)
        total_chars += len(text)

    for entry in history_texts:
        if entry.startswith("【玩家】"):
            msgs.append({"role": "user", "content": f"【玩家行动】{entry.replace('【玩家】', '').strip()}"})
        else:
            msgs.append({"role": "assistant", "content": entry})

    # Current input
    user_input = user_input[:200]  # safety truncate
    msgs.append({"role": "user", "content": f"【玩家行动】{user_input}"})

    return msgs

def build_world_context():
    """Build world context from worldbook entries"""
    parts = ["【以下是世界设定与角色信息，你必须严格遵守】"]
    for entry in worldbook["entries"]:
        if entry.get("enabled", True):
            label = entry['comment'] if entry['comment'] and entry['comment'] != '未' else '设定'
            parts.append(f"--- {label} ---\n{entry['content']}")
    parts.append("【世界设定结束】")
    return "\n\n".join(parts)

def compact_state(state):
    """Create compact version of game state for prompt"""
    gt = state.get("gameTime", {})
    sc = state.get("sceneCharacters", [])
    return {
        "player": state.get("player", {}),
        "gamePhase": state.get("gamePhase", {}),
        "companions": [{"name": c.get("name"), "affection": c.get("affection")} for c in state.get("companions", [])],
        "inventory_count": len(state.get("inventory", [])),
        "activeDeck": state.get("activeDeckId"),
        "map_progress": f"{sum(1 for n in state.get('mapNodes', []) if n.get('status') == 'completed')}/{len(state.get('mapNodes', []))} nodes",
        "gameTime": f"第{gt.get('day', 1)}天 {int(gt.get('hour', 8)):02d}:{int(gt.get('minute', 0)):02d}",
        "currentScene": state.get("currentSceneName") or state.get("currentSceneId") or "",
        "sceneCharacters": [{"name": c.get("name", ""), "activity": c.get("activity", "")} for c in sc]
    }

# ─── LLM Call ───
def call_llm(messages, api_key, endpoint, model):
    """Call OpenAI-compatible API, return response text"""
    url = endpoint.rstrip("/")
    if not url.endswith("/chat/completions"):
        url += "/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    body = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": preset["sampling"]["temperature"],
        "top_p": preset["sampling"]["top_p"],
        "max_tokens": min(preset["sampling"]["max_tokens"], 4096),
        "stop": ["<end>"]
    }).encode("utf-8")

    try:
        resp = _make_request(url, data=body, headers=headers,
                            timeout=config.get("llm_timeout", 180))
        data = json.loads(resp.read().decode("utf-8"))
        usage = data.get("usage", {})
        return data["choices"][0]["message"]["content"], {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 401 or e.code == 403:
            raise RuntimeError(f"unauthorized: API Key 无效 ({e.code})")
        elif e.code == 429:
            raise RuntimeError(f"rate_limited: API 调用太频繁，请稍后重试")
        else:
            raise RuntimeError(f"upstream_error: API 返回 {e.code}\n{body[:300]}")
    except URLError as e:
        raise RuntimeError(f"timeout: 连接 {url} 超时 — {e.reason}")
    except Exception as e:
        raise RuntimeError(f"llm_error: {str(e)[:200]}")
    return "", {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}  # unreachable

# 决斗触发关键词 — 叙事中出现 ≥2 个即强制 battle=true
_BATTLE_KEYWORDS = [
    "决斗即将开始", "DUEL", "抽牌", "我的回合", "你的回合",
    "决斗盘", "召唤怪兽", "发动魔法", "盖放", "战斗阶段",
    "结束回合", "通常召唤", "场地魔法", "来吧", "开始吧"
]

def _detect_battle_intent(narrative):
    """即使 AI 没设 battle=true，叙事里命中 ≥2 个决斗关键词也触发"""
    if not narrative:
        return False
    hits = sum(1 for kw in _BATTLE_KEYWORDS if kw in narrative)
    return hits >= 2

def _sanitize_json(text):
    """修复 AI 输出的 JSON 中未转义的控制字符（如裸换行符）"""
    result = []
    in_string = False
    escape_next = False
    for ch in text:
        if escape_next:
            result.append(ch)
            escape_next = False
            continue
        if ch == '\\':
            result.append(ch)
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            result.append(ch)
            continue
        if in_string:
            if ch == '\n':
                result.append('\\n')
            elif ch == '\r':
                result.append('\\r')
            elif ch == '\t':
                result.append('\\t')
            elif ord(ch) < 32:
                result.append(' ')  # 其他控制字符替换为空格
            else:
                result.append(ch)
        else:
            result.append(ch)
    return ''.join(result)

def parse_output(raw_text):
    """Parse AI output — extract JSON, fallback gracefully"""
    narrative = raw_text
    battle = False
    thinking = ""
    suggestions = []

    # Try to find the FIRST valid JSON with thinking/end_output fields.
    # Strategy: find the first `{` that looks like our response JSON, then
    # use a brace counter to extract the complete object (handles nested {} in text).
    start_idx = None
    for m in re.finditer(r'\{\s*"thinking"', raw_text):
        start_idx = m.start()
        break

    if start_idx is not None:
        # Brace-count from start_idx to find matching closing brace
        depth = 0
        end_idx = -1
        for i in range(start_idx, len(raw_text)):
            if raw_text[i] == '{':
                depth += 1
            elif raw_text[i] == '}':
                depth -= 1
                if depth == 0:
                    end_idx = i + 1
                    break
        if end_idx > 0:
            json_candidate = raw_text[start_idx:end_idx]
            try:
                obj = json.loads(_sanitize_json(json_candidate))
                if "thinking" in obj or "end_output" in obj:
                    thinking = obj.get("thinking", "")
                    narrative = obj.get("end_output", raw_text)
                    battle = obj.get("battle", False)
                    suggestions = obj.get("suggestions", [])
            except json.JSONDecodeError:
                pass

    # Fallback: try ```json fence
    if thinking == "" and narrative == raw_text:
        m = re.search(r'`{1,3}json\s*([\s\S]*?)\s*`{1,3}', raw_text)
        if m:
            try:
                obj = json.loads(_sanitize_json(m.group(1)))
                thinking = obj.get("thinking", "")
                narrative = obj.get("end_output", raw_text)
                battle = obj.get("battle", False)
                suggestions = obj.get("suggestions", [])
            except json.JSONDecodeError:
                pass

    # Strip format tags
    narrative = re.sub(r'</?maintext>', '', narrative)
    narrative = re.sub(r'</?Status_block>', '', narrative)
    narrative = re.sub(r'<end>', '', narrative)
    # Strip any remaining ```json blocks inside the narrative (AI sometimes echoes game state)
    narrative = re.sub(r'`{1,3}json\s*[\s\S]*?\s*`{1,3}', '', narrative)
    # Strip bare JSON-like objects that look like game state (player/gamePhase/companions)
    narrative = re.sub(r'\{\s*"[^"]*player"[^}]*\}', '', narrative)
    narrative = narrative.strip()

    return narrative, battle, thinking, suggestions

# ─── 情感标签协议 — 与前端 EMOTION_LIST 一致 ───
EMOTION_WHITELIST = {'neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire'}

def split_emotion(text):
    """解析 AI 回复开头的 [emotion:标签] 前缀。
    命中白名单 → 剥离前缀并返回小写标签；无标签/未知标签 → 原文不动 + 'neutral'。"""
    m = re.match(r'^\s*\[emotion:([a-zA-Z]+)\]\s*', text or '')
    if m and m.group(1).lower() in EMOTION_WHITELIST:
        return text[m.end():].strip(), m.group(1).lower()
    return text, 'neutral'

# ─── MDPro3 Config Helper ───
def _update_mdpro3_config(mdpro3_dir, protector_id, field_id):
    """Set opponent appearance in MDPro3 config.conf before launching."""
    conf_path = os.path.join(mdpro3_dir, "Data", "config.conf")
    if not os.path.exists(conf_path):
        return
    with open(conf_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    updated = []
    for line in lines:
        line = line.rstrip("\n").rstrip("\r")
        if line.startswith("DuelProtector0->"):
            updated.append(f"DuelProtector0->{protector_id}")
        elif line.startswith("DuelProtector0Tag->"):
            updated.append(f"DuelProtector0Tag->{protector_id}")
        elif line.startswith("DuelField0->"):
            updated.append(f"DuelField0->{field_id}")
        elif line.startswith("OverrideDeckAppearance->"):
            updated.append("OverrideDeckAppearance->1")
        else:
            updated.append(line)

    with open(conf_path, "w", encoding="utf-8") as f:
        f.write("\n".join(updated) + "\n")

# ─── Battle Launcher ───
_battle_running = False
_last_battle_proc = None
_duel_result = None  # {winner, result, reason, text, botName, opponentName, timestamp}

def launch_battle(deck, opponent=None):
    """Start local ygopro server + WindBot AI + MDPro3 for a full local duel."""
    global _battle_running, _last_battle_proc, _duel_result
    ygopro_port = config.get("ygopro_port", 7911)
    # Clear stale state: if ygopro port is not in use, reset flag
    if _battle_running:
        try:
            if _last_battle_proc is not None and _last_battle_proc.poll() is not None:
                _battle_running = False
        except Exception:
            _battle_running = False
    if _battle_running:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        if s.connect_ex(('127.0.0.1', ygopro_port)) != 0:
            _battle_running = False
        s.close()
    if _battle_running:
        return {"ok": False, "error": "already_running", "message": "Duel already in progress"}

    # Reset previous result
    _duel_result = None

    deck_path = os.path.join(DECK_DIR, f"{deck}.ydk")
    if not os.path.exists(deck_path):
        available = get_decks()[:10]
        return {"ok": False, "error": "deck_not_found", "message": f"Deck '{deck}' not found", "available": available}

    # Resolve opponent from config
    char_info = CHARACTER_DECKS.get(opponent, CHARACTER_DECKS.get("default", {"name": "AI", "deck": "Blue-Eyes", "dialog": "default"}))
    display_name = opponent or char_info.get("name", "路人")

    # Handle "random" deck: pick from available WindBot decks, excluding assigned character decks
    if char_info.get("deck") == "random":
        assigned = {c["deck"] for c in CHARACTER_DECKS.values() if c.get("deck") and c["deck"] != "random"}
        available = [d for d in get_decks() if d not in assigned]
        if available:
            picked = random.choice(available)
            char_info = dict(char_info)  # don't mutate the original
            char_info["deck"] = picked
            print(f"[bridge] Random deck for '{display_name}': {picked} (from {len(available)} available)")
        else:
            char_info = dict(char_info)
            char_info["deck"] = "BlueEyes"

    ygopro_exe = config.get("ygopro_exe", "C:/Users/Administrator/ygopro-server.exe")
    ygopro_cwd = config.get("ygopro_cwd", "C:/Users/Administrator")
    ygopro_port = config.get("ygopro_port", 7911)
    ygopro_args = config.get("ygopro_args", ["7911", "0", "2", "0", "5", "T", "F", "8000", "5", "1", "180", "0"])
    windbot_exe = config.get("windbot_exe")
    windbot_dir = config.get("windbot_dir")
    mdpro3_exe = config["mdpro3_exe"]
    mdpro3_dir = config["mdpro3_dir"]

    if not os.path.exists(windbot_exe):
        return {"ok": False, "error": "windbot_missing", "message": f"WindBot.exe not found: {windbot_exe}"}

    try:
        procs = []

        # 1. Start ygopro server
        print(f"[bridge] Starting ygopro server on port {ygopro_port}...")
        server_proc = subprocess.Popen(
            [ygopro_exe] + ygopro_args,
            cwd=ygopro_cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT
        )
        procs.append(server_proc)
        # Read server startup output — should print the port number, or "0" on failure
        time.sleep(2.0)
        if server_proc.poll() is not None:
            out = server_proc.stdout.read().decode("utf-8", errors="replace").strip()
            print(f"[bridge] ygopro server exited early: {out}")
            return {"ok": False, "error": "server_died", "message": f"ygopro server failed: {out}"}

        # 2. Start WindBot as AI
        windbot_deck = char_info["deck"]
        windbot_dialog = char_info["dialog"]
        print(f"[bridge] Starting WindBot: Name={display_name} Deck={windbot_deck} Dialog={windbot_dialog}")
        windbot_proc = subprocess.Popen(
            [windbot_exe, f"Host=127.0.0.1", f"Port={ygopro_port}",
             f"Name={display_name}", f"Deck={windbot_deck}", f"Dialog={windbot_dialog}"],
            cwd=windbot_dir
        )
        procs.append(windbot_proc)
        time.sleep(2.0)

        # 3. Apply character appearance to MDPro3 config
        protector_id = char_info.get("protector", "1070001")
        field_id = char_info.get("field", "1090001")
        _update_mdpro3_config(mdpro3_dir, protector_id, field_id)
        print(f"[bridge] Set opponent appearance: protector={protector_id} field={field_id}")

        # 4. Launch MDPro3 — opens to main menu, user clicks 传统联机 → 127.0.0.1:PORT
        print(f"[bridge] Launching MDPro3... (connect to 127.0.0.1:{ygopro_port})")
        old_cwd = os.getcwd()
        os.chdir(mdpro3_dir)
        try:
            mdpro3_proc = subprocess.Popen([mdpro3_exe])
        finally:
            os.chdir(old_cwd)
        procs.append(mdpro3_proc)

        _battle_running = True
        _last_battle_proc = mdpro3_proc

        # Monitor thread: clean up when MDPro3 exits
        import threading
        def monitor():
            global _battle_running, _last_battle_proc
            mdpro3_proc.wait()
            _battle_running = False
            _last_battle_proc = None
            # Clean up server and WindBot
            for p in procs:
                try: p.terminate()
                except: pass
        threading.Thread(target=monitor, daemon=True).start()

        return {"ok": True, "launched": True, "ai": display_name, "mode": "local",
                "message": f"本地对战已启动: 你 vs {display_name}", "pid": mdpro3_proc.pid}
    except Exception as e:
        for p in procs:
            try: p.terminate()
            except: pass
        return {"ok": False, "error": "launch_failed", "message": str(e)[:200]}

# ─── HTTP Handler ───
class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[bridge] {self.client_address[0]} - {format % args}")

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def reply(self, status, body):
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(body, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {
                "ok": True, "data_loaded": True,
                "mdpro3_found": os.path.exists(config["mdpro3_exe"]),
                "decks": get_decks()
            })
        elif self.path == "/debug-chars":
            self.reply(200, {
                "character_decks": CHARACTER_DECKS,
                "opponent_keys": list(CHARACTER_DECKS.keys())
            })
        elif self.path == "/duel-status":
            global _duel_result, _battle_running
            result = _duel_result
            # Clear after reading so it won't trigger again on next page load
            if result is not None:
                _duel_result = None
            self.reply(200, {
                "ok": True,
                "battle_running": _battle_running,
                "result": result
            })
        else:
            self.reply(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        try:
            self._do_POST_impl()
        except Exception as e:
            print(f"[bridge] FATAL in do_POST: {e}")
            traceback.print_exc()
            try:
                self.reply(500, {"ok": False, "error": "internal_error", "message": str(e)[:200]})
            except Exception:
                pass

    def _do_POST_impl(self):
        length = int(self.headers.get("Content-Length", 0))
        if length:
            data = self.rfile.read(length)
            try:
                raw = data.decode("utf-8")
            except UnicodeDecodeError:
                raw = data.decode("utf-8", errors="replace")
        else:
            raw = "{}"
        body = json.loads(raw)

        if self.path == "/chat":
            self.handle_chat(body)
        elif self.path == "/battle":
            self.handle_battle(body)
        elif self.path == "/models":
            self.handle_models(body)
        elif self.path == "/duel-result":
            self.handle_duel_result(body)
        else:
            self.reply(404, {"ok": False, "error": "not_found"})

    def handle_models(self, body):
        """Fetch available models from user's AI API"""
        api_key = body.get("api_key", "")
        endpoint = body.get("endpoint", "")
        if not api_key or not endpoint:
            self.reply(400, {"ok": False, "error": "missing_field", "message": "需要 api_key 和 endpoint"})
            return

        # Try /models and /v1/models
        urls = []
        base = endpoint.rstrip("/")
        # Strip /chat/completions if present (user may have pasted full URL)
        if base.endswith("/chat/completions"):
            base = base[:-len("/chat/completions")]
        if base.endswith("/v1"):
            urls.append(f"{base}/models")
        else:
            urls.append(f"{base}/v1/models")
            urls.append(f"{base}/models")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        models = []
        last_error = None
        for url in urls:
            try:
                resp = _make_request(url, headers=headers, timeout=15)
                data = json.loads(resp.read().decode("utf-8"))
                raw_models = data.get("data", data.get("models", []))
                for m in raw_models:
                    mid = m.get("id", m.get("model", ""))
                    if mid and not mid.startswith("ft:") and "embed" not in mid.lower():
                        models.append(mid)
                if models:
                    break
            except HTTPError as e:
                last_error = f"API 返回 {e.code}: {e.read().decode('utf-8', errors='replace')[:200]}"
            except Exception as e:
                last_error = str(e)[:200]

        if models:
            models.sort()
            self.reply(200, {"ok": True, "models": models, "total": len(models)})
        else:
            self.reply(502, {"ok": False, "error": "no_models", "message": last_error or "无法获取模型列表"})

    def handle_chat(self, body):
        required = ["input", "api_key", "endpoint", "model"]
        for k in required:
            if k not in body:
                self.reply(400, {"ok": False, "error": "missing_field", "message": f"缺少必填字段: {k}", "emotion": "neutral"})
                return

        try:
            msgs = build_messages(
                body["input"],
                body.get("history", []),
                body.get("game_state", {})
            )

            if "--dry-run" in sys.argv:
                self.reply(200, {"ok": True, "dry_run": True, "messages": msgs})
                return

            raw, usage = call_llm(msgs, body["api_key"], body["endpoint"], body["model"])
            narrative, battle, thinking, suggestions = parse_output(raw)
            # 情感标签协议：剥掉 [emotion:xxx] 前缀（必须在 battle 检测/响应构造之前）
            narrative, emotion = split_emotion(narrative)
            print(f"[bridge] parse result: battle={battle}, emotion={emotion}, narrative_len={len(narrative)}, thinking_len={len(thinking)}")

            # 服务端兜底检测：即使 AI 没设 battle=true，叙事里有决斗关键词也强制触发
            if not battle and _detect_battle_intent(narrative):
                battle = True
                print(f"[bridge] 兜底检测触发: 叙事命中决斗关键词, 强制 battle=true")
            elif not battle:
                print(f"[bridge] battle=false, 关键词未命中")

            self.reply(200, {
                "ok": True,
                "narrative": narrative,
                "emotion": emotion,
                "battle": battle,
                "thinking": thinking,
                "suggestions": suggestions,
                "usage": usage
            })
        except RuntimeError as e:
            msg = str(e)
            err_type = "unknown"
            for prefix in ["unauthorized:", "rate_limited:", "upstream_error:", "timeout:", "llm_error:"]:
                if msg.startswith(prefix):
                    err_type = prefix.rstrip(":")
                    break
            self.reply(502, {"ok": False, "error": err_type, "message": msg, "emotion": "neutral"})
        except Exception as e:
            self.reply(502, {"ok": False, "error": "internal_error", "message": f"Bridge 内部错误: {str(e)[:200]}", "emotion": "neutral"})

    def handle_duel_result(self, body):
        """Receive duel result from WindBot callback"""
        global _duel_result, _battle_running
        _duel_result = {
            "winner": body.get("winner", "unknown"),
            "result": body.get("result", -1),
            "reason": body.get("reason", 0),
            "text": body.get("text", ""),
            "botName": body.get("botName", ""),
            "opponentName": body.get("opponentName", ""),
            "timestamp": time.time()
        }
        _battle_running = False
        reason_names = {0: "认输", 1: "LP归零", 2: "卡组抽空", 3: "特殊胜利", 4: "连接断开"}
        reason_str = reason_names.get(_duel_result["reason"], f"原因{_duel_result['reason']}")
        print(f"[bridge] ⚔️ 决斗结束: {_duel_result['text']} | 胜者={_duel_result['winner']} | {reason_str}")
        self.reply(200, {"ok": True, "received": True})

    def handle_battle(self, body):
        deck = body.get("deck", "PlayerInsect")
        opponent = body.get("opponent", None)  # 角色名如"柳月"，为 None 则随机
        result = launch_battle(deck, opponent=opponent)
        if result["ok"]:
            self.reply(200, result)
        else:
            self.reply(400, result)

# ─── Main ───
if __name__ == "__main__":
    port = config.get("port", 9999)
    host = config.get("host", "127.0.0.1")

    if "--dry-run" in sys.argv:
        print("[bridge] DRY RUN MODE — printing assembled prompt for a test input\n")
        msgs = build_messages("探索房间", [], {
            "player": {"name": "玩家", "lp": 8000, "spiritGems": 100},
            "gamePhase": {"chapter": 1, "scene": 1},
            "companions": [{"name": "塞壬", "affection": 5}],
            "inventory": ["小鱼干x3"],
            "mapNodes": [],
            "activeDeckId": None
        })
        for i, m in enumerate(msgs):
            print(f"\n{'='*60}")
            print(f"[{m['role'].upper()}]")
            print(m["content"][:500])
        print(f"\n{'='*60}")
        print(f"Total messages: {len(msgs)}")
        sys.exit(0)

    server = ThreadingHTTPServer((host, port), BridgeHandler)
    print(f"[bridge] 光之回响 AI Bridge v1.0")
    print(f"[bridge] Listening on http://{host}:{port}")
    print(f"[bridge] Endpoints: GET /health | POST /chat | POST /battle")
    print(f"[bridge] {len(get_decks())} decks | {len(AI_POOL)} AI opponents")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[bridge] Shutting down...")
        server.shutdown()

"""光之回响 AI 桥接服务器 — stdlib only, zero pip dependencies"""
import json, os, re, sys, time, random, subprocess, traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data")

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
{"thinking": "分析玩家意图并规划叙事方向(可空但建议填写)", "end_output": "叙事文本(用<maintext>包裹)", "battle": false}

规则:
- thinking 中先确认玩家意图："玩家想要[做什么]，涉及角色[谁]，场景[哪里]"，再据此规划叙事
- end_output 必须用 <maintext></maintext> 包裹
- 每次叙事不少于 800 字，目标 1000 字
- 叙事内容必须直接回应玩家的行动意图，不能偏离或自行发挥
- 细腻推进：环境、神态、动作、语气、内心情感、对话，缺一不可
- battle=true 表示触发黑暗决斗/催眠决斗，end_output 写到决斗即将开始
- 回复以 <end> 结束
- thinking 可为空字符串但不能缺失
- 用简体中文"""

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
    return {
        "player": state.get("player", {}),
        "gamePhase": state.get("gamePhase", {}),
        "companions": [{"name": c.get("name"), "affection": c.get("affection")} for c in state.get("companions", [])],
        "inventory_count": len(state.get("inventory", [])),
        "activeDeck": state.get("activeDeckId"),
        "map_progress": f"{sum(1 for n in state.get('mapNodes', []) if n.get('status') == 'completed')}/{len(state.get('mapNodes', []))} nodes"
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
        "max_tokens": min(preset["sampling"]["max_tokens"], 8192),
        "stop": ["<end>"]
    }).encode("utf-8")

    req = Request(url, data=body, headers=headers)
    try:
        resp = urlopen(req, timeout=config.get("llm_timeout", 180))
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
        raise RuntimeError(f"timeout: API 连接超时 — {e.reason}")
    except Exception as e:
        raise RuntimeError(f"llm_error: {str(e)[:200]}")
    return "", {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}  # unreachable

def parse_output(raw_text):
    """Parse AI output — extract JSON, fallback gracefully"""
    narrative = raw_text
    battle = False
    thinking = ""

    # Try ```json fence
    m = re.search(r'```json\s*([\s\S]*?)\s*```', raw_text)
    if m:
        try:
            obj = json.loads(m.group(1))
            thinking = obj.get("thinking", "")
            narrative = obj.get("end_output", raw_text)
            battle = obj.get("battle", False)
        except json.JSONDecodeError:
            pass
    else:
        # Try bare JSON
        for match in re.finditer(r'\{[^{}]*"thinking"[^{}]*"end_output"[^{}]*\}', raw_text):
            try:
                obj = json.loads(match.group())
                thinking = obj.get("thinking", "")
                narrative = obj.get("end_output", raw_text)
                battle = obj.get("battle", False)
                break
            except json.JSONDecodeError:
                continue

    # Strip format tags
    narrative = re.sub(r'</?maintext>', '', narrative)
    narrative = re.sub(r'</?Status_block>', '', narrative)
    narrative = re.sub(r'<end>', '', narrative)
    narrative = narrative.strip()

    return narrative, battle, thinking

# ─── Battle Launcher ───
_battle_running = False

def launch_battle(deck):
    """Launch MDPro3 with given player deck, random AI opponent"""
    global _battle_running
    if _battle_running:
        return {"ok": False, "error": "already_running", "message": "MDPro3 已经在运行中"}

    # Validate deck
    deck_path = os.path.join(DECK_DIR, f"{deck}.ydk")
    if not os.path.exists(deck_path):
        available = get_decks()[:10]
        return {"ok": False, "error": "deck_not_found", "message": f"卡组 '{deck}' 不存在", "available": available}

    ai_name = pick_random_ai()
    exe = config["mdpro3_exe"]
    cwd = config["mdpro3_dir"]
    server = config["windbot_server"]
    port = config["windbot_port"]

    try:
        proc = subprocess.Popen(
            [exe, "-h", server, "-p", port, "-w", f"AI#{ai_name}", "-n", "玩家", "-d", deck, "-j"],
            cwd=cwd
        )
        _battle_running = True
        # Background monitor: clear flag when process exits
        import threading
        def monitor():
            global _battle_running
            proc.wait()
            _battle_running = False
        threading.Thread(target=monitor, daemon=True).start()

        return {"ok": True, "launched": True, "ai": ai_name, "pid": proc.pid}
    except Exception as e:
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
        else:
            self.reply(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        body = json.loads(raw)

        if self.path == "/chat":
            self.handle_chat(body)
        elif self.path == "/battle":
            self.handle_battle(body)
        elif self.path == "/models":
            self.handle_models(body)
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
                req = Request(url, headers=headers)
                resp = urlopen(req, timeout=15)
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
                self.reply(400, {"ok": False, "error": "missing_field", "message": f"缺少必填字段: {k}"})
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
            narrative, battle, thinking = parse_output(raw)

            self.reply(200, {
                "ok": True,
                "narrative": narrative,
                "battle": battle,
                "thinking": thinking,
                "usage": usage
            })
        except RuntimeError as e:
            msg = str(e)
            err_type = "unknown"
            for prefix in ["unauthorized:", "rate_limited:", "upstream_error:", "timeout:", "llm_error:"]:
                if msg.startswith(prefix):
                    err_type = prefix.rstrip(":")
                    break
            self.reply(502, {"ok": False, "error": err_type, "message": msg})
        except Exception as e:
            self.reply(502, {"ok": False, "error": "internal_error", "message": f"Bridge 内部错误: {str(e)[:200]}"})

    def handle_battle(self, body):
        deck = body.get("deck", "PlayerInsect")
        result = launch_battle(deck)
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

    server = HTTPServer((host, port), BridgeHandler)
    print(f"[bridge] 光之回响 AI Bridge v1.0")
    print(f"[bridge] Listening on http://{host}:{port}")
    print(f"[bridge] Endpoints: GET /health | POST /chat | POST /battle")
    print(f"[bridge] {len(get_decks())} decks | {len(AI_POOL)} AI opponents")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[bridge] Shutting down...")
        server.shutdown()

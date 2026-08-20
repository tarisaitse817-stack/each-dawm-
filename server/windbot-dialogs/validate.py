"""WindBot 决斗台词校验：源目录 + 三处部署副本 + config.json 指向。

用法: python validate.py
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

SOURCE_DIR = os.path.dirname(os.path.abspath(__file__))
DEPLOY_DIRS = [
    r"C:\Users\Administrator\IceYGO-windbot\Dialogs",
    r"C:\Users\Administrator\IceYGO-windbot\bin\Release\Dialogs",
    r"K:\MyCardLibrary\mdpro3\Data\Windbot\Dialogs",
]
CONFIG_PATH = os.path.join(SOURCE_DIR, "..", "data", "config.json")

bad_brace = re.compile(r"\{[^01]\}")
ok = True
checked = 0

for d in [SOURCE_DIR] + DEPLOY_DIRS:
    if not os.path.isdir(d):
        print("MISSING DIR:", d)
        ok = False
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith(".zh-CN.json"):
            continue
        if os.path.basename(f).replace(".zh-CN.json", "") in {
            "Siren", "LingYi", "LuShi", "Kisikil", "Lilla", "ecclesia",
            "TianTong", "Li", "CaiHong", "Sera", "Winda",
            "WhiteRabbit", "CheshireCat", "Dormouse", "Queen", "WhiteQueen", "RedQueen",
        }:
            path = os.path.join(d, f)
            checked += 1
            try:
                data = json.load(open(path, encoding="utf-8"))
            except Exception as e:
                print("JSON ERROR:", path, e)
                ok = False
                continue
            for key, val in data.items():
                vals = val if isinstance(val, list) else [val]
                for s in vals:
                    if isinstance(s, str) and bad_brace.search(s):
                        print("BAD BRACE:", path, key, repr(s))
                        ok = False
print("checked", checked, "dialog files (source + 3 deploy copies)")

cfg = json.load(open(CONFIG_PATH, encoding="utf-8"))
for name, c in cfg["character_decks"].items():
    d = c.get("dialog", "")
    path = os.path.join(DEPLOY_DIRS[1], d + ".json")
    if not os.path.exists(path):
        print("MISSING AT RUNTIME:", name, d)
        ok = False
print("config.json ok" if ok else "PROBLEMS FOUND")
sys.exit(0 if ok else 1)

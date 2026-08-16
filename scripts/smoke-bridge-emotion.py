# -*- coding: utf-8 -*-
"""bridge 情感标签协议冒烟：重启 bridge 后运行

验证三件事：
1. /health 可用
2. /chat 响应形状：narrative + emotion 字段，emotion 在白名单内，narrative 不以 [emotion: 开头
   - 若设置了环境变量 BRIDGE_SMOKE_API_KEY / BRIDGE_SMOKE_ENDPOINT / BRIDGE_SMOKE_MODEL，
     则走真实 LLM 调用（end-to-end）；
   - 否则 bridge 将返回 502 错误路径（无 API Key），此时验证错误响应形状
     （emotion=neutral 存在）+ split_emotion 单元测试，并如实打印限制。
3. split_emotion 单元测试（导入 server/bridge.py，无需 API Key）

用法: python scripts/smoke-bridge-emotion.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:9999'
EMOTIONS = ('neutral', 'smile', 'happy', 'blushing', 'angry', 'sad', 'surprised', 'desire')


def post(path, payload, timeout=240):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, json.loads(r.read())


def main():
    failures = []

    # ── 1) /health ──
    try:
        with urllib.request.urlopen(BASE + '/health', timeout=10) as r:
            health = json.loads(r.read())
        assert health.get('ok') is not False, health
        print(f'PASS: /health = {json.dumps(health, ensure_ascii=False)}')
    except Exception as e:
        print(f'FAIL: /health — bridge 可能未运行: {e}')
        failures.append('health')
        print('\nRESULT: FAIL')
        sys.exit(1)

    # ── 2) /chat 响应形状 ──
    status = None
    r = {}
    try:
        status, r = post('/chat', {
            'input': '你好（仅用于协议冒烟测试）',
            'api_key': os.environ.get('BRIDGE_SMOKE_API_KEY', ''),
            'endpoint': os.environ.get('BRIDGE_SMOKE_ENDPOINT', ''),
            'model': os.environ.get('BRIDGE_SMOKE_MODEL', ''),
        })
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            r = json.loads(e.read().decode('utf-8'))
        except Exception:
            r = {}
    except Exception as e:
        print(f'FAIL: /chat 网络异常: {e}')
        failures.append('chat_network')

    print(f'INFO: /chat HTTP {status}, response keys = {sorted(r.keys())}')

    if status == 200:
        if 'narrative' not in r or 'emotion' not in r:
            print(f"FAIL: 成功响应缺字段: {list(r.keys())}")
            failures.append('chat_shape')
        elif r['emotion'] not in EMOTIONS:
            print(f'FAIL: emotion 不在白名单: {r["emotion"]!r}')
            failures.append('chat_emotion')
        elif r['narrative'].lstrip().lower().startswith('[emotion:'):
            print('FAIL: narrative 中标签未剥离')
            failures.append('chat_tag_not_stripped')
        else:
            print(f"PASS: emotion = {r['emotion']} | narrative 前 60 字: {r['narrative'][:60]}")
    elif r.get('ok') is False:
        # 错误路径（无 API Key 属预期）：验证形状
        if 'emotion' not in r:
            print(f"FAIL: 错误响应缺 emotion 字段: {list(r.keys())}")
            failures.append('error_shape')
        elif r['emotion'] != 'neutral':
            print(f"FAIL: 错误路径 emotion 应为 neutral, 实际 {r['emotion']!r}")
            failures.append('error_emotion')
        else:
            msg = str(r.get('message', ''))[:60]
            print(f"PASS: 错误路径形状正确 (error={r.get('error')}, message={msg})")
            print("WARN: 未配置 LLM API Key（或为空），end-to-end /chat 未执行；")
            print("      设置 BRIDGE_SMOKE_API_KEY/ENDPOINT/MODEL 后重跑即可走真实链路。")
    else:
        print(f'FAIL: /chat 返回意外状态 {status}: {r}')
        failures.append('chat_unexpected')

    # ── 3) split_emotion 单元测试（无 API Key 也能验证解析逻辑）──
    server_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'server'))
    sys.path.insert(0, server_dir)
    import bridge  # 模块级只加载数据，不启动服务（main 有守卫）

    cases = [
        # (输入, 期望emotion, 期望文本是否被剥离前缀)
        ('[emotion:blushing]脸颊微微泛红。', 'blushing', True),
        ('  [emotion:SAD]  泪珠滑落。', 'sad', True),       # 前导空白 + 标签值大小写混写
        ('[emotion:desire]心动的味道。', 'desire', True),
        ('\n\t[emotion:angry] 愤怒。', 'angry', True),      # 换行/制表符前导
        ('[emotion:happy]', 'happy', True),                 # 标签后无正文
        ('[emotion:unknown]未知标签按规格保留原文', 'neutral', False),  # 未知标签 → neutral + 原文不动
        ('普通回复没有任何标签', 'neutral', False),
        ('', 'neutral', False),
    ]
    ok = 0
    for raw, exp_emo, exp_stripped in cases:
        text, emo = bridge.split_emotion(raw)
        assert emo == exp_emo, f'{raw!r} -> emotion={emo!r}, 期望 {exp_emo!r}'
        if exp_stripped:
            # 白名单命中：前缀被剥掉，剩余正文不再以 [emotion: 开头
            assert not text.lstrip().lower().startswith('[emotion:'), f'标签未剥离: {raw!r} -> {text!r}'
        else:
            # 未命中：原文原样返回（规格行为）
            assert text == raw, f'{raw!r} -> 原文应原样返回, 实际 {text!r}'
        ok += 1
    print(f'PASS: split_emotion 单元测试 {ok}/{len(cases)}')

    if failures:
        print(f'\nRESULT: FAIL — {failures}')
        sys.exit(1)
    print('\nRESULT: SMOKE PASS')


if __name__ == '__main__':
    main()

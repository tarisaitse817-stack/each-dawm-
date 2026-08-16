# -*- coding: utf-8 -*-
"""生成 6 角色全身立绘（白底 768x1344，Anima Base 配方）→ rembg 抠透明
   -> assets/characters/<id>/fullbody.png（透明 PNG）
   -> Desktop\\场景审查\\全身_<id>.png（白底不透明合成版，便于审查）
用法：
  python -X utf8 scripts/gen_fullbody.py            # 全量 6 角色
  python -X utf8 scripts/gen_fullbody.py <char_id>  # 单角色重跑
"""
import json, time, urllib.request, os, shutil, sys
try:
    from rembg import remove as _rembg_remove
    HAS_REMBG = True
except Exception as _e:  # 网络/安装失败时降级
    print(f"[WARN] rembg 不可用（{_e}），使用 PIL 白底阈值抠图降级", flush=True)
    HAS_REMBG = False
from PIL import Image, ImageChops

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
CHAR_DIR = r"C:\Users\Administrator\each-dawm-\assets\characters"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(REVIEW_DIR, exist_ok=True)

NEGATIVE = ("worst quality, low quality, score_1, score_2, score_3, artist name, jpeg artifacts, "
            "ugly, deformed, blurry, bad anatomy, bad hands, extra fingers, text, watermark, signature, logo")

PREFIX = "masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres, "

# 2026-08-16 用户确认的最终外观描述（勿改，勿回退到草案表）
CHARACTER_PROMPTS = {
    "baiyue": "1girl, solo, standing, full body, front view, green hair, green eyes, sailor collar school uniform, short pleated skirt, white over-knee socks, cheeky confident smile, young girl, simple white background, plain background, character illustration, soft brush texture",
    "linyi": "1girl, solo, standing, full body, front view, white hair, long hair, blue eyes, white and purple dress, black pantyhose, mature, cold elegant expression, simple white background, plain background, character illustration, soft brush texture",
    "liuyue": "1girl, solo, standing, full body, front view, long pink hair, ahoge, black hair accessory bow, pink eyes, delicate face, soft fair skin, white long-sleeve shirt, big black bow tie, black suspender skirt, lace decorations, black over-the-knee socks, lace on over-the-knee socks, shy expression, simple white background, plain background, character illustration, soft brush texture",
    "suyun": "1girl, solo, standing, full body, front view, rainbow-colored long hair tied back, golden eyes, white dress, light apron, mature gentle smile, soft warm expression, simple white background, plain background, character illustration, soft brush texture",
    "siren": "1girl, solo, standing, full body, front view, gray twin-tails with blue-purple gradient tips, purple eyes, pointed elf ears, silver tiara, small arm fins and head fins, white sheer camisole top, pearl and seashell accessories, mermaid tail, delicate fragile smile, simple white background, plain background, character illustration, soft brush texture",
    "ecclesia": "1girl, solo, standing, full body, front view, very long blonde hair, twin hair buns, blue ribbons, flower hairpin, metal horns, silver eyes, white dress with gold trim, golden stigmata marks, pure innocent smile, simple white background, plain background, character illustration, soft brush texture",
}

def post(path, payload):
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(HOST + path, timeout=60) as r:
        return json.loads(r.read())

def workflow(char_id, seed):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": PREFIX + CHARACTER_PROMPTS[char_id], "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 768, "height": 1344, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
              "latent_image": ["8", 0], "seed": seed, "steps": 20, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "11": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["9", 0], "vae": ["10", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["11", 0], "filename_prefix": f"fullbody_{char_id}"}},
    }

def _fallback_transparent(src_png, dst_png):
    """PIL 白底阈值抠图降级：三通道均 > 248 的像素（接近纯白背景）置为透明"""
    im = Image.open(src_png).convert("RGBA")
    r, g, b, _ = im.split()
    maxch = ImageChops.lighter(ImageChops.lighter(r, g), b)
    alpha = maxch.point(lambda v: 0 if v > 248 else 255)
    im.putalpha(alpha)
    im.save(dst_png)

def make_transparent(src_png, dst_png):
    if HAS_REMBG:
        im = Image.open(src_png).convert("RGBA")
        # u2net（全量模型）已缓存本机，优先使用；u2netp 小模型次选；均失败走 PIL 阈值降级
        try:
            out = _rembg_remove(im)
        except Exception:
            try:
                out = _rembg_remove(im, model_name="u2netp")
            except Exception:
                _fallback_transparent(src_png, dst_png)
                return
        out.save(dst_png)
    else:
        _fallback_transparent(src_png, dst_png)

def make_review_copy(transparent_png, dst_png):
    """透明 PNG 合到浅灰底，输出不透明审查副本"""
    im = Image.open(transparent_png).convert("RGBA")
    bg = Image.new("RGBA", im.size, (242, 242, 242, 255))
    bg.alpha_composite(im)
    bg.convert("RGB").save(dst_png)

def gen_one(char_id):
    seed = 20260816 + list(CHARACTER_PROMPTS.keys()).index(char_id)
    print(f"生成 {char_id} (seed {seed}) ...", flush=True)
    resp = post("/prompt", {"prompt": workflow(char_id, seed)})
    pid = resp["prompt_id"]
    deadline = time.time() + 900
    while time.time() < deadline:
        time.sleep(5)
        hist = get(f"/history/{pid}")
        if pid in hist:
            h = hist[pid]
            if h.get("status", {}).get("status_str") == "error":
                print(f"  {char_id} 执行错误，跳过", flush=True)
                return False
            for out in h.get("outputs", {}).values():
                for img in out.get("images", []):
                    src = os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
                    os.makedirs(os.path.join(CHAR_DIR, char_id), exist_ok=True)
                    raw = os.path.join(CHAR_DIR, char_id, "raw_fullbody.png")
                    shutil.copy(src, raw)
                    try:
                        make_transparent(raw, os.path.join(CHAR_DIR, char_id, "fullbody.png"))
                        make_review_copy(os.path.join(CHAR_DIR, char_id, "fullbody.png"),
                                         os.path.join(REVIEW_DIR, f"全身_{char_id}.png"))
                        print(f"  {char_id} 完成 -> assets/characters/{char_id}/fullbody.png + 审查副本", flush=True)
                        return True
                    except Exception as e:
                        print(f"  {char_id} 抠图失败（{e}），raw 保留 {raw}", flush=True)
                        return False
                else:
                    continue
                break
    print(f"  {char_id} 超时（>900s），跳过", flush=True)
    return False

def main(start_from=None):
    ids = list(CHARACTER_PROMPTS.keys())
    if start_from:
        ids = ids[ids.index(start_from):]
    failed = []
    for char_id in ids:
        if not gen_one(char_id):
            failed.append(char_id)
    print(f"全部完成；失败: {failed if failed else '无'}", flush=True)

if __name__ == "__main__":
    main(start_from=sys.argv[1] if len(sys.argv) > 1 else None)

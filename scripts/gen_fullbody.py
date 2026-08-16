# -*- coding: utf-8 -*-
"""生成 6 角色全身立绘（白底 768x1344，Anima Base 配方）
   -> assets/characters/<id>/fullbody.png（透明 PNG，PIL 白底阈值抠图主方案）
   -> Desktop\\场景审查\\全身_<id>.png（灰底不透明合成版，便于审查）
抠图：PIL 阈值 + 边缘羽化 + 白边清理为主方案，rembg 为备选/对比。
用法：
  python -X utf8 scripts/gen_fullbody.py                # 全量 6 角色（批次种子）
  python -X utf8 scripts/gen_fullbody.py <char_id>      # 单角色（固定角色种子）+ PIL/rembg 双方案对比图
  python -X utf8 scripts/gen_fullbody.py <char_id> --ref  # 参考图版（Desktop\\角色\\ 参考图 + ControlNet 链路）
"""
import json, time, urllib.request, os, shutil, sys
try:
    from rembg import remove as _rembg_remove
    HAS_REMBG = True
except Exception as _e:  # 网络/安装失败时降级
    print(f"[WARN] rembg 不可用（{_e}），使用 PIL 白底阈值抠图降级", flush=True)
    HAS_REMBG = False
from PIL import Image, ImageChops, ImageFilter

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
INPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\input"  # 服务器 --input-directory
CHAR_DIR = r"C:\Users\Administrator\each-dawm-\assets\characters"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
REF_DIR = r"C:\Users\Administrator\Desktop\角色"                       # 用户提供的角色参考图
REF_MAP = {"linyi": "林仪.png", "liuyue": "柳月.png", "suyun": "苏昀.png",
           "siren": "塞壬.png", "ecclesia": "艾克利西亚.png"}           # baiyue 无参考图
os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(REVIEW_DIR, exist_ok=True)

NEGATIVE = ("worst quality, low quality, score_1, score_2, score_3, artist name, jpeg artifacts, "
            "ugly, deformed, blurry, bad anatomy, bad hands, extra fingers, text, watermark, signature, logo"
            ", missing fingers, stiff pose, leaning")
# 参考图版专用：参考图是 1216x832 角色场景图，负面词加场景词防泄漏
REF_NEGATIVE = NEGATIVE + ", desk, office, classroom, computer, window, indoor, room, furniture, background objects"

PREFIX = "masterpiece, best quality, score_7, safe, year 2026, newest, absurdres, highres, "

# 2026-08-16 用户确认的最终外观描述（勿改，勿回退到草案表）
CHARACTER_PROMPTS = {
    "baiyue": "1girl, solo, standing, full body, front view, green hair, green eyes, sailor collar school uniform, short pleated skirt, white over-knee socks, cheeky confident smile, young girl, simple white background, plain background, character illustration, soft brush texture",
    "linyi": "1girl, solo, standing, full body, front view, white hair, long hair, blue eyes, white and purple dress, black pantyhose, mature, cold elegant expression, standing upright, arms at sides, relaxed natural pose, simple white background, plain background, character illustration, soft brush texture",
    "liuyue": "1girl, solo, standing, full body, front view, long pink hair, ahoge, black hair accessory bow, pink eyes, delicate face, soft fair skin, white long-sleeve shirt, big black bow tie, black suspender skirt, lace decorations, black over-the-knee socks, lace on over-the-knee socks, shy expression, standing upright, arms at sides, relaxed natural pose, simple white background, plain background, character illustration, soft brush texture",
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

def make_transparent_pil(src_png, dst_png):
    """PIL 白底阈值抠图（主方案）：
    1) R/G/B 均 > 235 判为背景 -> 前景 alpha 通道
    2) 边缘抗锯齿羽化：alpha 高斯模糊 1px（背景/前景交界 1~2px 渐变过渡）
    3) 白边清理：羽化带内不透明且近白（max>235）的像素，颜色向 3px 半径内最近的非白
       像素靠拢；半径内无参照（白色衣物边缘等）时向自身灰度降饱和（50% 混合）
    rembg 对动漫线稿易出毛边/白边，故本方案为主，rembg 仅作备选/对比"""
    im = Image.open(src_png).convert("RGBA")
    r, g, b, _ = im.split()
    maxch = ImageChops.lighter(ImageChops.lighter(r, g), b)
    fgm = maxch.point(lambda v: 255 if v <= 235 else 0)        # 前景=255
    alpha = fgm.filter(ImageFilter.GaussianBlur(1.0))          # 羽化 1~2px
    im.putalpha(alpha)
    try:
        import numpy as np
        from scipy import ndimage
        arr = np.asarray(im).copy()
        rgb = arr[..., :3].astype(np.int16)
        al = arr[..., 3]
        maxc = rgb.max(axis=2)
        residue = (al > 0) & (al < 255) & (maxc > 235)         # 羽化带内的白色残留
        if residue.any():
            inner = maxc <= 235
            if inner.any():
                dist, idx = ndimage.distance_transform_edt(~inner, return_indices=True)
                near = (dist <= 3.0) & residue
                if near.any():
                    arr[..., :3][near] = rgb[idx[0][near], idx[1][near], :]
                rem = residue & ~near                          # 半径内无参照 -> 降饱和
                if rem.any():
                    gy = np.round(0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]).astype(np.int16)
                    arr[..., :3][rem] = (rgb[rem] + gy[rem, None]) // 2
        im = Image.fromarray(arr)
    except Exception:
        # 降级（无 numpy/scipy）：羽化带内近白像素向自身灰度降饱和
        px = im.load()
        w, h = im.size
        for y in range(h):
            for x in range(w):
                rr, gg, bb, aa = px[x, y]
                if 0 < aa < 255 and max(rr, gg, bb) > 235:
                    gy = int(0.299 * rr + 0.587 * gg + 0.114 * bb)
                    px[x, y] = ((rr + gy) // 2, (gg + gy) // 2, (bb + gy) // 2, aa)
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

def char_seed(char_id):
    """1000000 + hash 风格固定种子（确定性派生，跨进程稳定，重跑同角色同种子）"""
    return 1000000 + (sum(char_id.encode("utf-8")) * 10007 + 17) % 900000

# 单角色重跑种子覆盖（用户指定，记录在案）：
#   linyi v3: 用户对 v2(1093860) 不满意，换种子重跑，提示词/参数不变
SEED_OVERRIDES = {"linyi": 2157431}

def workflow_ref(char_id, seed):
    """参考图版（img2img）：参考图 1216x832 -> 拉伸到 768x1344 -> VAEEncode 作初始潜变量
    -> KSampler 45步 euler_ancestral cfg1 denoise 0.7（参考图是场景图，需较高重绘把背景洗成纯白）
    [已实测] HED + illustriousXLSoftedge_v10 ControlNet 链路在此栈不可行：SDXL 级 ControlNet
    无法用于 Anima/SD3.5 UNET（comfy/cldm/cldm.py: "y is None, did you try using a controlnet
    for SDXL on SD1?"），且服务器无 SD3 级 ControlNet 可用 -> 改用同 denoise 0.7 的纯 img2img"""
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": PREFIX + CHARACTER_PROMPTS[char_id], "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": REF_NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "LoadImage", "inputs": {"image": f"{char_id}_ref.png"}},
        "9": {"class_type": "ImageScale", "inputs": {"image": ["8", 0], "upscale_method": "bicubic", "width": 768, "height": 1344, "crop": "disabled"}},
        "10": {"class_type": "VAEEncode", "inputs": {"pixels": ["9", 0], "vae": ["12", 0]}},
        "11": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
               "latent_image": ["10", 0], "seed": seed, "steps": 45, "cfg": 1.0,
               "sampler_name": "euler_ancestral", "scheduler": "simple", "denoise": 0.7}},
        "12": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "13": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["11", 0], "vae": ["12", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": f"fullbody_{char_id}_ref"}},
    }

def gen_one_ref(char_id, seed):
    """参考图版生成：参考图拷入 ComfyUI input 目录（ASCII 文件名避免编码问题）-> 生成
    -> PIL 抠图 -> assets/characters/<id>/fullbody_ref.png + 桌面 全身_<id>_参考图版.png"""
    ref_file = REF_MAP[char_id]
    in_name = f"{char_id}_ref.png"
    shutil.copy(os.path.join(REF_DIR, ref_file), os.path.join(INPUT_DIR, in_name))
    print(f"参考图版 {char_id} (seed {seed}, 参考 {ref_file}) ...", flush=True)
    resp = post("/prompt", {"prompt": workflow_ref(char_id, seed)})
    pid = resp["prompt_id"]
    deadline = time.time() + 900
    while time.time() < deadline:
        time.sleep(5)
        hist = get(f"/history/{pid}")
        if pid in hist:
            h = hist[pid]
            if h.get("status", {}).get("status_str") == "error":
                print(f"  {char_id} 参考图版执行错误，跳过", flush=True)
                return False
            for out in h.get("outputs", {}).values():
                for img in out.get("images", []):
                    src = os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
                    char_dir = os.path.join(CHAR_DIR, char_id)
                    os.makedirs(char_dir, exist_ok=True)
                    raw = os.path.join(char_dir, "raw_fullbody_ref.png")
                    shutil.copy(src, raw)
                    try:
                        make_transparent_pil(raw, os.path.join(char_dir, "fullbody_ref.png"))
                        make_review_copy(os.path.join(char_dir, "fullbody_ref.png"),
                                         os.path.join(REVIEW_DIR, f"全身_{char_id}_参考图版.png"))
                        print(f"  {char_id} 参考图版完成 -> 桌面 全身_{char_id}_参考图版.png", flush=True)
                        return True
                    except Exception as e:
                        print(f"  {char_id} 参考图版抠图失败（{e}）", flush=True)
                        return False
                else:
                    continue
                break
    print(f"  {char_id} 参考图版超时（>900s），跳过", flush=True)
    return False

def gen_one(char_id, seed, compare_rembg=False):
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
                    char_dir = os.path.join(CHAR_DIR, char_id)
                    os.makedirs(char_dir, exist_ok=True)
                    raw = os.path.join(char_dir, "raw_fullbody.png")
                    shutil.copy(src, raw)
                    transparent = os.path.join(char_dir, "fullbody.png")
                    pil_ok = False
                    try:
                        make_transparent_pil(raw, transparent)   # 主方案：PIL 阈值 + 羽化 + 白边清理
                        pil_ok = True
                        print("  PIL 抠图完成（羽化+白边清理）", flush=True)
                    except Exception as e:
                        print(f"  PIL 抠图失败（{e}），降级 rembg", flush=True)
                        make_transparent(raw, transparent)        # 备选：rembg
                    make_review_copy(transparent, os.path.join(REVIEW_DIR, f"全身_{char_id}.png"))
                    if compare_rembg:                             # 单角色模式：双方案对比
                        if pil_ok:
                            make_review_copy(transparent, os.path.join(REVIEW_DIR, f"全身_{char_id}_pil.png"))
                        tmp = os.path.join(char_dir, "fullbody_rembg.png")
                        try:
                            make_transparent(raw, tmp)
                            make_review_copy(tmp, os.path.join(REVIEW_DIR, f"全身_{char_id}_rembg.png"))
                        except Exception as e:
                            print(f"  rembg 对比图失败（{e}）", flush=True)
                    print(f"  {char_id} 完成 -> assets/characters/{char_id}/fullbody.png + 审查副本", flush=True)
                    return True
                else:
                    continue
                break
    print(f"  {char_id} 超时（>900s），跳过", flush=True)
    return False

def main(start_from=None, ref_mode=False):
    # 单角色模式 = 只处理该角色（试验/重跑用，不得连带后续角色）
    ids = list(CHARACTER_PROMPTS.keys())
    single = bool(start_from)
    if start_from:
        ids = [start_from] if start_from in CHARACTER_PROMPTS else []
    if ref_mode:
        ids = [i for i in ids if i in REF_MAP]   # baiyue 无参考图
    failed = []
    for char_id in ids:
        # 批量模式用批次种子；单角色（试验/重跑）用 1000000+hash 风格固定种子；SEED_OVERRIDES 优先
        seed = SEED_OVERRIDES.get(char_id, char_seed(char_id)) if single \
            else (20260816 + list(CHARACTER_PROMPTS.keys()).index(char_id))
        ok = gen_one_ref(char_id, seed) if ref_mode else gen_one(char_id, seed, compare_rembg=single)
        if not ok:
            failed.append(char_id)
    print(f"全部完成；失败: {failed if failed else '无'}", flush=True)

if __name__ == "__main__":
    args = sys.argv[1:]
    ref_mode = "--ref" in args
    args = [a for a in args if a != "--ref"]
    main(start_from=args[0] if args else None, ref_mode=ref_mode)

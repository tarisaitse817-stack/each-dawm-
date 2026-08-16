# -*- coding: utf-8 -*-
"""表情差分（方案 B：面部 inpaint 重绘）：定稿全身图（白底 RGB）→ 椭圆面部遮罩
-> VAEEncode → SetLatentNoiseMask → KSampler（仅遮罩内重绘表情）→ 8 变体/角色
画风统一硬约束：同模型（Harem）+ 同 LoRA（jirai_v2, 1.0）+ 同工作流；
表情提示词 = 完整外观描述（与 fullbody 完全一致，复用 CHARACTER_PROMPTS）+ 表情标签；
不加任何角度/姿势词（构图由遮罩外的原始像素锁定）。
[已实测] 原 brief 的 HED + illustriousXLSoftedge_v10 ControlNet 链路在 Anima/SD3.5 模型上
不可行（comfy/cldm/cldm.py "y is None"：SDXL 级 ControlNet 无法用于 SD3.5 UNET，
服务器无 SD3 级 ControlNet）——故本方案 B 为表情差分主链路。
[遮罩坑] 本 ComfyUI 0.29.2 的 LoadImage 返回 mask = 1 - alpha（nodes.py:1771 反转）；
故遮罩图用 RGB 灰度（白=重绘区）保存，LoadImageMask 取 channel="red"（未反转）。
用法：
  python -X utf8 scripts/gen_expressions.py <char_id> [<emotion>]   # 单角色（可限定单表情）
"""
import json, time, urllib.request, os, shutil, sys
from PIL import Image, ImageDraw, ImageFilter
from gen_fullbody import CHARACTER_PROMPTS, NEGATIVE, PREFIX, char_seed, HOST, OUTPUT_DIR, INPUT_DIR, CHAR_DIR, REVIEW_DIR

EMOTION_TAGS = {
    "neutral":   "neutral expression",
    "smile":     "gentle smile",
    "happy":     "happy smile, closed eyes, joyful expression",
    "blushing":  "embarrassed, blush, looking away shyly",
    "angry":     "angry expression, pouting",
    "sad":       "sad expression, tears in eyes",
    "surprised": "surprised expression, wide eyes",
    "desire":    "blush, half-closed eyes, lustful expression, heavy breathing",
}

# 面部遮罩参数（768x1344 全身图）：中心 (cx, cy)、半径 (rx, ry)、羽化 blur px
# 柳月：用户确认参数 (384,190,130,150)；实测脸带皮肤质心 (377,187)，椭圆覆盖率 99%
FACE_POS = {"liuyue": (384, 190, 130, 150)}
MASK_BLUR = 10

# 表情重绘负面词：防脸部变形/多脸
INPAINT_NEGATIVE = NEGATIVE + ", different face, face morphing, extra face, ugly face"

def post(path, payload):
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(HOST + path, timeout=60) as r:
        return json.loads(r.read())

def wait_job(pid, label):
    deadline = time.time() + 900
    while time.time() < deadline:
        time.sleep(5)
        hist = get(f"/history/{pid}")
        if pid in hist:
            h = hist[pid]
            if h.get("status", {}).get("status_str") == "error":
                print(f"    {label} 执行错误，跳过", flush=True)
                return None
            for out in h.get("outputs", {}).values():
                for img in out.get("images", []):
                    return os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
    print(f"    {label} 超时（>900s），跳过", flush=True)
    return None

def make_face_mask(char_id, mask_png):
    """PIL 椭圆遮罩（白=重绘区）：高斯模糊 MASK_BLUR px 羽化边缘；
    输出 RGB 灰度（白=255）——本 ComfyUI 的 LoadImageMask 取 red 通道（alpha 通道被反转，不可用）"""
    cx, cy, rx, ry = FACE_POS[char_id]
    im = Image.new("L", (768, 1344), 0)
    ImageDraw.Draw(im).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    im = im.filter(ImageFilter.GaussianBlur(MASK_BLUR))
    im.convert("RGB").save(mask_png)

def workflow_inpaint(char_id, emotion, seed):
    """KSampler latent-mask inpaint（模型无关机制）：仅遮罩内加噪重绘，遮罩外像素逐像素不变"""
    base = f"{char_id}_base.png"       # 白底原版，已复制到 input 目录
    mask = f"{char_id}_face_mask.png"
    positive = PREFIX + CHARACTER_PROMPTS[char_id] + ", " + EMOTION_TAGS[emotion]
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": INPAINT_NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "LoadImage", "inputs": {"image": base}},
        "9": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "10": {"class_type": "VAEEncode", "inputs": {"pixels": ["8", 0], "vae": ["9", 0]}},
        "11": {"class_type": "LoadImageMask", "inputs": {"image": mask, "channel": "red"}},
        "12": {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["10", 0], "mask": ["11", 0]}},
        "13": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
               "latent_image": ["12", 0], "seed": seed, "steps": 45, "cfg": 1.0,
               "sampler_name": "euler_ancestral", "scheduler": "simple", "denoise": 0.55}},
        "14": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["13", 0], "vae": ["9", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "15": {"class_type": "SaveImage", "inputs": {"images": ["14", 0], "filename_prefix": f"expr_{char_id}_{emotion}"}},
    }

def workflow_roundtrip(char_id):
    """VAE 往返基线：encode(base) -> decode，用于对照'遮罩外逐像素不变'的严格参照"""
    base = f"{char_id}_base.png"
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": base}},
        "2": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "3": {"class_type": "VAEEncode", "inputs": {"pixels": ["1", 0], "vae": ["2", 0]}},
        "4": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["3", 0], "vae": ["2", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "5": {"class_type": "SaveImage", "inputs": {"images": ["4", 0], "filename_prefix": f"roundtrip_{char_id}"}},
    }

def verify_diff(base_png, result_png, mask_png, ref_png=None):
    """验证点：遮罩外（mask=0）逐像素不变（对照 VAE 往返基线 ref_png 时应为 0）；
    遮罩内（mask>=254）明显变化；输出像素级证据"""
    import numpy as np
    base = np.asarray(Image.open(base_png).convert("RGB")).astype(np.int16)
    res = np.asarray(Image.open(result_png).convert("RGB")).astype(np.int16)
    mask = np.asarray(Image.open(mask_png).convert("RGB"))[..., 0]   # 灰度遮罩，red 通道
    out_region = mask == 0
    in_region = mask >= 254
    diff = np.abs(base - res).max(axis=2)
    out_diff_px = int((diff[out_region] != 0).sum())
    out_mean = float(diff[out_region].mean()) if out_region.any() else -1.0
    out_max = int(diff[out_region].max()) if out_region.any() else -1
    in_diff_px = int((diff[in_region] != 0).sum())
    in_mean = float(diff[in_region].mean()) if in_region.any() else -1.0
    in_max = int(diff[in_region].max()) if in_region.any() else -1
    print(f"  验证(对底图): 遮罩外变化像素={out_diff_px} 均diff={out_mean:.2f} 最大={out_max} | "
          f"遮罩内变化像素={in_diff_px}/{int(in_region.sum())} 均diff={in_mean:.1f} 最大={in_max}", flush=True)
    if ref_png:
        ref = np.asarray(Image.open(ref_png).convert("RGB")).astype(np.int16)
        rdiff = np.abs(ref - res).max(axis=2)
        ro = int((rdiff[out_region] != 0).sum())
        rm = float(rdiff[out_region].mean()) if out_region.any() else -1.0
        print(f"  验证(对VAE往返基线): 遮罩外变化像素={ro} 均diff={rm:.2f}（应为 0，采样未触碰遮罩外潜变量）", flush=True)
    return dict(out_diff_px=out_diff_px, out_max=out_max, in_diff_px=in_diff_px, in_mean=in_mean, in_max=in_max)

def make_compare(base_png, result_png, compare_png):
    """底图在左、结果在右的并排合成（1536x1344）"""
    b = Image.open(base_png).convert("RGB")
    r = Image.open(result_png).convert("RGB")
    canvas = Image.new("RGB", (b.width * 2, b.height), (255, 255, 255))
    canvas.paste(b, (0, 0))
    canvas.paste(r, (b.width, 0))
    canvas.save(compare_png)

def gen_one(char_id, emotion, seed, roundtrip_png):
    print(f"  表情 {emotion} (seed {seed}) ...", flush=True)
    resp = post("/prompt", {"prompt": workflow_inpaint(char_id, emotion, seed)})
    src = wait_job(resp["prompt_id"], f"{emotion}")
    if not src:
        return False
    base_raw = os.path.join(CHAR_DIR, char_id, "raw_fullbody.png")
    mask_png = os.path.join(CHAR_DIR, char_id, "face_mask.png")
    result_png = os.path.join(REVIEW_DIR, f"表情试验_{char_id}_{emotion}.png")
    shutil.copy(src, result_png)
    verify_diff(base_raw, result_png, mask_png, ref_png=roundtrip_png)
    make_compare(base_raw, result_png, os.path.join(REVIEW_DIR, "表情试验_对比.png"))
    print(f"    {emotion} 完成 -> 桌面 表情试验_{char_id}_{emotion}.png + 表情试验_对比.png", flush=True)
    return True

def main(char_only=None, emotion_only=None):
    ids = [char_only] if char_only else list(CHARACTER_PROMPTS.keys())
    failed = []
    for char_id in ids:
        base_src = os.path.join(CHAR_DIR, char_id, "raw_fullbody.png")   # 白底原版（定稿透明版的来源）
        if not os.path.exists(base_src):
            print(f"{char_id} 缺少 raw_fullbody.png（白底原版），跳过（先跑 gen_fullbody.py）", flush=True)
            failed.append(char_id)
            continue
        if char_id not in FACE_POS:
            print(f"{char_id} 未配置 FACE_POS 面部遮罩参数，跳过", flush=True)
            failed.append(char_id)
            continue
        shutil.copy(base_src, os.path.join(INPUT_DIR, f"{char_id}_base.png"))
        make_face_mask(char_id, os.path.join(CHAR_DIR, char_id, "face_mask.png"))
        shutil.copy(os.path.join(CHAR_DIR, char_id, "face_mask.png"), os.path.join(INPUT_DIR, f"{char_id}_face_mask.png"))
        # VAE 往返基线（每角色一次）
        resp = post("/prompt", {"prompt": workflow_roundtrip(char_id)})
        roundtrip_png = wait_job(resp["prompt_id"], "VAE 往返基线")
        if not roundtrip_png:
            failed.append(f"{char_id}/roundtrip")
            continue
        seed = char_seed(char_id)
        print(f"[{char_id}] 面部 inpaint 表情差分 seed {seed}", flush=True)
        emotions = [emotion_only] if emotion_only else list(EMOTION_TAGS.keys())
        for i, emotion in enumerate(emotions):
            if not gen_one(char_id, emotion, seed + i, roundtrip_png):
                failed.append(f"{char_id}/{emotion}")
    print(f"全部完成；失败: {failed if failed else '无'}", flush=True)

if __name__ == "__main__":
    argv = sys.argv[1:]
    main(char_only=argv[0] if argv else None, emotion_only=argv[1] if len(argv) > 1 else None)

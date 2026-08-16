# -*- coding: utf-8 -*-
"""表情差分：定稿全身图 → HED + softedge ControlNet + 表情标签 → 8 变体/角色
画风统一硬约束：同模型（Harem）+ 同 LoRA（jirai_v2, 1.0）+ 同工作流；
表情提示词 = 完整外观描述（与 fullbody 完全一致，复用 CHARACTER_PROMPTS）+ 表情标签
用法（逐角色执行，便于人工抽检）：
  python -X utf8 scripts/gen_expressions.py            # 全量 6 角色 × 8 表情
  python -X utf8 scripts/gen_expressions.py <char_id>  # 单角色 8 表情
注意：需用户对每个角色的 final fullbody.png 验收通过后，本脚本方可运行。
"""
import json, time, urllib.request, os, shutil, sys
from gen_fullbody import CHARACTER_PROMPTS, NEGATIVE, PREFIX

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
INPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\input"  # 服务器 --input-directory
CHAR_DIR = r"C:\Users\Administrator\each-dawm-\assets\characters"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
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

def post(path, payload):
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(HOST + path, timeout=60) as r:
        return json.loads(r.read())

def workflow(char_id, emotion, seed):
    base = f"fullbody_{char_id}.png"  # 已复制到 ComfyUI input 目录
    # 表情提示词 = 完整外观 + 表情标签（外观与 fullbody 生成时逐字一致，保证同一人物）
    positive = PREFIX + CHARACTER_PROMPTS[char_id].replace("simple white background, plain background, ", "") \
               + ", " + EMOTION_TAGS[emotion] + ", same character"
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "LoadImage", "inputs": {"image": base}},
        "9": {"class_type": "ImageScaleToTotalPixels", "inputs": {"image": ["8", 0], "upscale_method": "nearest-exact", "megapixels": 1.0}},
        "10": {"class_type": "HEDPreprocessor", "inputs": {"image": ["9", 0], "safe": "enable", "resolution": 512}},
        "11": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "illustriousXLSoftedge_v10.safetensors"}},
        "12": {"class_type": "ControlNetApplyAdvanced", "inputs": {"positive": ["6", 0], "negative": ["7", 0], "control_net": ["11", 0], "image": ["10", 0], "strength": 1.0, "start_percent": 0.0, "end_percent": 1.0}},
        "13": {"class_type": "GetImageSize", "inputs": {"image": ["8", 0]}},
        "14": {"class_type": "EmptySD3LatentImage", "inputs": {"width": ["13", 0], "height": ["13", 1], "batch_size": 1}},
        "15": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["12", 0], "negative": ["12", 1],
               "latent_image": ["14", 0], "seed": seed, "steps": 45, "cfg": 1.0,
               "sampler_name": "euler_ancestral", "scheduler": "simple", "denoise": 0.6}},
        "16": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "17": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["15", 0], "vae": ["16", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "18": {"class_type": "SaveImage", "inputs": {"images": ["17", 0], "filename_prefix": f"expr_{char_id}_{emotion}"}},
    }

def char_seed(char_id):
    # brief: seed = 1000000 + hash(char_id) % 900000 —— 但 str 的 hash 受 PYTHONHASHSEED
    # 随机化，跨进程不固定；改为确定性派生，保证同角色每次重跑同种子
    return 1000000 + (sum(char_id.encode("utf-8")) * 10007 + 17) % 900000

def gen_one(char_id, emotion, seed):
    print(f"  表情 {emotion} (seed {seed}) ...", flush=True)
    resp = post("/prompt", {"prompt": workflow(char_id, emotion, seed)})
    pid = resp["prompt_id"]
    deadline = time.time() + 900
    while time.time() < deadline:
        time.sleep(5)
        hist = get(f"/history/{pid}")
        if pid in hist:
            h = hist[pid]
            if h.get("status", {}).get("status_str") == "error":
                print(f"    {emotion} 执行错误，跳过", flush=True)
                return False
            for out in h.get("outputs", {}).values():
                for img in out.get("images", []):
                    src = os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
                    os.makedirs(os.path.join(CHAR_DIR, char_id), exist_ok=True)
                    shutil.copy(src, os.path.join(CHAR_DIR, char_id, f"{emotion}.png"))
                    shutil.copy(src, os.path.join(REVIEW_DIR, f"表情_{char_id}_{emotion}.png"))
                    print(f"    {emotion} 完成", flush=True)
                    return True
                else:
                    continue
                break
    print(f"    {emotion} 超时（>900s），跳过", flush=True)
    return False

def main(char_only=None):
    ids = [char_only] if char_only else list(CHARACTER_PROMPTS.keys())
    failed = []
    for char_id in ids:
        # 每角色开始前把定稿全图拷入 ComfyUI input 目录（LoadImage 按文件名读取）
        base_src = os.path.join(CHAR_DIR, char_id, "fullbody.png")
        if not os.path.exists(base_src):
            print(f"{char_id} 缺少 fullbody.png，跳过（先跑 gen_fullbody.py）", flush=True)
            failed.append(char_id)
            continue
        shutil.copy(base_src, os.path.join(INPUT_DIR, f"fullbody_{char_id}.png"))
        seed = char_seed(char_id)
        print(f"[{char_id}] seed {seed}", flush=True)
        for emotion in EMOTION_TAGS:
            if not gen_one(char_id, emotion, seed + list(EMOTION_TAGS.keys()).index(emotion)):
                failed.append(f"{char_id}/{emotion}")
    print(f"全部完成；失败: {failed if failed else '无'}", flush=True)

if __name__ == "__main__":
    main(char_only=sys.argv[1] if len(sys.argv) > 1 else None)

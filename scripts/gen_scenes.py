# -*- coding: utf-8 -*-
"""批量生成 16 张场景图（Anima Base 配方），逐张提交 ComfyUI，落盘 assets/scenes/ + 桌面审查目录"""
import json, time, urllib.request, os, shutil, sys
from scene_prompts import SCENE_PROMPTS, NEGATIVE, PREFIX

HOST = "http://127.0.0.1:8188"
OUTPUT_DIR = r"H:\Comfy-Desktop\ComfyUI-Shared\output"
ASSET_DIR = r"C:\Users\Administrator\each-dawm-\assets\scenes"
REVIEW_DIR = r"C:\Users\Administrator\Desktop\场景审查"
os.makedirs(ASSET_DIR, exist_ok=True)
os.makedirs(REVIEW_DIR, exist_ok=True)

def post(path, payload):
    req = urllib.request.Request(HOST + path, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())

def get(path):
    with urllib.request.urlopen(HOST + path, timeout=60) as r:
        return json.loads(r.read())

def workflow(scene_id, seed):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "miaomiaoHarem_anima15.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": "jirai_v2.safetensors", "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.6}},
        "4": {"class_type": "CFGNorm", "inputs": {"model": ["3", 0], "strength": 1, "pre_cfg": False}},
        "5": {"class_type": "CLIPLoader", "inputs": {"clip_name": "miaomiaoHarem_anima8Step10_txt.safetensors", "type": "qwen_image", "device": "default"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": PREFIX + SCENE_PROMPTS[scene_id], "clip": ["5", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["5", 0]}},
        "8": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1216, "height": 832, "batch_size": 1}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
              "latent_image": ["8", 0], "seed": seed, "steps": 20, "cfg": 1.0,
              "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "10": {"class_type": "VAELoader", "inputs": {"vae_name": "qwenImage_qwenImageVAE.safetensors"}},
        "11": {"class_type": "VAEDecodeTiled", "inputs": {"samples": ["9", 0], "vae": ["10", 0],
               "tile_size": 512, "overlap": 64, "temporal_size": 64, "temporal_overlap": 8}},
        "12": {"class_type": "SaveImage", "inputs": {"images": ["11", 0], "filename_prefix": f"scene_{scene_id}"}},
    }

def main(start_from=None):
    ids = list(SCENE_PROMPTS.keys())
    if start_from:
        ids = ids[ids.index(start_from):]
    for i, sid in enumerate(ids):
        print(f"[{i+1}/{len(ids)}] 生成 {sid} ...", flush=True)
        resp = post("/prompt", {"prompt": workflow(sid, 20260816 + i)})
        pid = resp["prompt_id"]
        deadline = time.time() + 600
        while time.time() < deadline:
            time.sleep(5)
            hist = get(f"/history/{pid}")
            if pid in hist:
                h = hist[pid]
                if h.get("status", {}).get("status_str") == "error":
                    print(f"  {sid} 执行错误，跳过", flush=True)
                    break
                for out in h.get("outputs", {}).values():
                    for img in out.get("images", []):
                        src = os.path.join(OUTPUT_DIR, img.get("subfolder", ""), img["filename"])
                        dst = os.path.join(ASSET_DIR, f"{sid}.png")
                        shutil.copy(src, dst)
                        shutil.copy(src, os.path.join(REVIEW_DIR, f"场景_{sid}.png"))
                        print(f"  {sid} 完成 -> {dst}", flush=True)
                        break
                    else:
                        continue
                    break
                break
    print("全部完成", flush=True)

if __name__ == "__main__":
    main(start_from=sys.argv[1] if len(sys.argv) > 1 else None)

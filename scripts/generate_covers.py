"""Generate 5 cover variants with different compositions"""
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import os

cutout_dir = r'C:\Users\Administrator\Desktop\封面\cutout'
out_dir = r'C:\Users\Administrator\Desktop'
CANVAS_W, CANVAS_H = 1920, 1080

# Load all cutouts
files = sorted([f for f in os.listdir(cutout_dir) if f.endswith('.png')])
chars = []
for f in files:
    img = Image.open(os.path.join(cutout_dir, f)).convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 30, axis=1)
    cols = np.any(alpha > 30, axis=0)
    if not rows.any():
        continue
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    chars.append({
        'name': f,
        'img': img,
        'bbox': (xmin, ymin, xmax, ymax),
        'w': xmax - xmin + 1,
        'h': ymax - ymin + 1,
    })

chars.sort(key=lambda c: c['w'], reverse=True)
n = len(chars)
print(f'Loaded {n} characters')

def make_gradient(w, h, color_top, color_bot, alpha_top=255, alpha_bot=255):
    """Create vertical gradient"""
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(h):
        t = y / h
        r = int(color_top[0] * (1-t) + color_bot[0] * t)
        g = int(color_top[1] * (1-t) + color_bot[1] * t)
        b = int(color_top[2] * (1-t) + color_bot[2] * t)
        a = int(alpha_top * (1-t) + alpha_bot * t)
        arr[y, :] = [r, g, b, a]
    return Image.fromarray(arr, 'RGBA')

def add_vignette(canvas, intensity=0.6):
    """Add dark vignette edges"""
    arr = np.array(canvas.convert('RGBA'))
    cy, cx = CANVAS_H / 2, CANVAS_W / 2
    max_dist = np.sqrt(cx**2 + cy**2)
    for y in range(CANVAS_H):
        for x in range(0, CANVAS_W, 4):  # sample every 4px for speed
            dist = np.sqrt((x-cx)**2 + (y-cy)**2)
            factor = min(1.0, (dist / max_dist) * intensity)
            alpha = int(factor * 180)
            if arr[y, x, 3] < alpha:
                arr[y, min(x+3, CANVAS_W-1), 3] = max(arr[y, min(x+3, CANVAS_W-1), 3], alpha)
    return Image.fromarray(arr, 'RGBA')

def paste_char(canvas, char, x, y, scale, glow=False):
    """Paste a character onto canvas at position with scale"""
    bbox = char['bbox']
    cropped = char['img'].crop(bbox)
    new_w = int(char['w'] * scale)
    new_h = int(char['h'] * scale)
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    if glow:
        # Add glow behind character
        glow_img = resized.copy()
        glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=15))
        glow_arr = np.array(glow_img)
        glow_arr[:, :, 3] = (glow_arr[:, :, 3] * 0.3).astype(np.uint8)
        glow_img = Image.fromarray(glow_arr, 'RGBA')
        canvas.paste(glow_img, (x-10, y-10), glow_img)

    canvas.paste(resized, (x, y), resized)
    return new_w, new_h

# ============================================================
# Version A: Cinema Poster — wide spread, dramatic lighting
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
bg = make_gradient(CANVAS_W, CANVAS_H, (15, 20, 40), (5, 8, 18))
canvas.paste(bg, (0, 0))

# Spread evenly with slight upward offset
spacing = CANVAS_W / (n + 1)
for i, char in enumerate(chars):
    scale = 580 / char['h']
    if i == 0: scale *= 1.25  # main char bigger
    w, h = paste_char(canvas, char,
                      int(spacing * (i+1) - (char['w']*scale)//2),
                      CANVAS_H - int(char['h']*scale) - 40,
                      scale, glow=True)

# Title space overlay
title_bg = Image.new('RGBA', (CANVAS_W, 300), (5, 8, 18, 120))
canvas.paste(title_bg, (0, 0), title_bg)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (0, 0, 0))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_A_cinema.png'))
print('A: Cinema poster')

# ============================================================
# Version B: Diamond/Pyramid — main char center, others cascade
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
bg = make_gradient(CANVAS_W, CANVAS_H, (20, 18, 35), (8, 10, 22))
canvas.paste(bg, (0, 0))

# Pyramid layout
center_x = CANVAS_W // 2
main_char = chars[0]
others = chars[1:]

# Main character — large center
scale_main = 780 / main_char['h']
w_m, h_m = paste_char(canvas, main_char,
                      center_x - int(main_char['w']*scale_main)//2,
                      CANVAS_H - int(main_char['h']*scale_main) - 20,
                      scale_main, glow=True)

# Flanking characters in V shape
n_side = len(others)
left_chars = others[:n_side//2]
right_chars = others[n_side//2:]

for i, char in enumerate(left_chars):
    scale = 480 / char['h']
    x = int(center_x * 0.25 * (i+1) / len(left_chars)) + 50
    y = CANVAS_H - int(char['h']*scale) - 30 - i * 60
    paste_char(canvas, char, x, y, scale)

for i, char in enumerate(right_chars):
    scale = 480 / char['h']
    x = center_x + int(center_x * 0.6) + int(center_x * 0.3 * i / len(right_chars))
    y = CANVAS_H - int(char['h']*scale) - 30 - i * 60
    paste_char(canvas, char, x, y, scale)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (0, 0, 0))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_B_pyramid.png'))
print('B: Pyramid')

# ============================================================
# Version C: Light Echo — blue spirit glow theme
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))

# Dark base with radial blue glow
bg_arr = np.zeros((CANVAS_H, CANVAS_W, 4), dtype=np.uint8)
cx, cy = CANVAS_W//2, CANVAS_H//2
for y in range(CANVAS_H):
    for x in range(0, CANVAS_W, 2):
        dist = np.sqrt((x-cx)**2 + (y-cy)**2)
        r = max(0, min(25, 25 - dist/40))
        g = max(0, min(30, 30 - dist/35))
        b = max(0, min(60, 60 - dist/25))
        bg_arr[y, x] = [int(r), int(g), int(b), 255]
bg = Image.fromarray(bg_arr, 'RGBA')
canvas.paste(bg, (0, 0))

# Characters arranged in a gentle arc
for i, char in enumerate(chars):
    scale = 520 / char['h']
    angle = (i / (n-1) - 0.5) * 0.8  # -0.4 to 0.4
    x_center = int(CANVAS_W//2 + np.sin(angle) * 500)
    y_offset = int(abs(angle) * 200)
    x = x_center - int(char['w']*scale)//2
    y = CANVAS_H - int(char['h']*scale) - 30 - y_offset
    paste_char(canvas, char, x, y, scale, glow=True)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (0, 0, 0))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_C_light_echo.png'))
print('C: Light Echo')

# ============================================================
# Version D: Gallery Row — clean, minimal, equal emphasis
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
bg = make_gradient(CANVAS_W, CANVAS_H, (8, 10, 18), (2, 4, 12))
canvas.paste(bg, (0, 0))

# Equal-sized, evenly spaced, bottom-aligned
for i, char in enumerate(chars):
    scale = 500 / char['h']
    # Slight overlap
    slot_w = CANVAS_W / (n + 1)
    x = int(slot_w * (i+1) - (char['w']*scale)//2)
    # Alternate slight y offset for depth
    y = CANVAS_H - int(char['h']*scale) - 30 + (-15 if i % 2 == 0 else 15)
    paste_char(canvas, char, x, y, scale)

# Subtle bottom gradient
overlay = make_gradient(CANVAS_W, 250, (0,0,0), (0,0,0), 0, 200)
canvas.paste(overlay, (0, CANVAS_H-250), overlay)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (0, 0, 0))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_D_gallery.png'))
print('D: Gallery')

# ============================================================
# Version E: Dramatic — dark, high contrast, central figure emphasis
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))

# Very dark background with light source from center-top
bg_arr = np.zeros((CANVAS_H, CANVAS_W, 4), dtype=np.uint8)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    brightness = int(8 + 35 * (1-t)**2)
    bg_arr[y, :] = [brightness, brightness+3, brightness+8, 255]
bg = Image.fromarray(bg_arr, 'RGBA')
canvas.paste(bg, (0, 0))

# Radial light from top-center
light = Image.new('RGBA', (800, 600), (0, 0, 0, 0))
light_arr = np.array(light)
for y in range(600):
    for x in range(800):
        dist = np.sqrt((x-400)**2 + (y-300)**2)
        alpha = max(0, int(100 - dist/5))
        light_arr[y, x] = [79, 195, 247, alpha]
light = Image.fromarray(light_arr, 'RGBA')
canvas.paste(light, (CANVAS_W//2-400, -100), light)

# Characters in dramatic triangle
for i, char in enumerate(chars[:5]):  # top 5, drop smallest
    scale = 420 / char['h']
    if i == 0:  # main char larger, center
        scale = 700 / char['h']
        x = CANVAS_W//2 - int(char['w']*scale)//2
        y = CANVAS_H - int(char['h']*scale) - 30
    elif i <= 2:  # left side
        x = 40 + (i-1) * 120
        y = CANVAS_H - int(char['h']*scale) - 50
    else:  # right side
        x = CANVAS_W - 40 - int(char['w']*scale) - (i-3) * 120
        y = CANVAS_H - int(char['h']*scale) - 50
    paste_char(canvas, char, x, y, scale, glow=(i==0))

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (0, 0, 0))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_E_dramatic.png'))
print('E: Dramatic')

print(f'\nAll 5 covers saved to {out_dir}/')

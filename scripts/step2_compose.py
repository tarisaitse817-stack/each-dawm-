"""Step 2: Analyze cutouts + Compose final cover"""
from PIL import Image
import os
import numpy as np

cutout_dir = r'C:\Users\Administrator\Desktop\封面\cutout'
out_path = r'C:\Users\Administrator\Desktop\封面\final_cover.png'

# ---- Analyze each cutout ----
files = sorted([f for f in os.listdir(cutout_dir) if f.endswith('.png')])

characters = []
for f in files:
    img = Image.open(os.path.join(cutout_dir, f)).convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 30, axis=1)
    cols = np.any(alpha > 30, axis=0)
    if not rows.any() or not cols.any():
        print(f'{f}: NO non-transparent pixels found (skipping)')
        continue
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    w, h = xmax - xmin + 1, ymax - ymin + 1
    center_x = (xmin + xmax) / 2 / img.width
    print(f'{f}: bbox=({xmin},{ymin},{w},{h}), size={w}x{h}, '
          f'orig={img.width}x{img.height}, center_x={center_x:.2f}')
    characters.append({
        'name': f,
        'img': img,
        'bbox': (xmin, ymin, xmax, ymax),
        'width': w,
        'height': h,
        'center_x': center_x,
    })

print(f'\n{len(characters)} characters found\n')

# ---- Compose ----
CANVAS_W = 1920
CANVAS_H = 1080

canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (10, 13, 20, 255))

# Sort characters by width (larger = more important, likely main character)
characters.sort(key=lambda c: c['width'], reverse=True)

# Layout: arrange characters across the canvas
# Main char centered, others spread around
n = len(characters)
if n == 0:
    print('No characters to compose!')
    exit(1)

# Calculate target heights (all scaled to similar proportions)
TARGET_H = 750  # target character height
TARGET_W = CANVAS_W // n - 40  # target width per character slot

positions = []
for i, char in enumerate(characters):
    img = char['img']
    bbox = char['bbox']
    char_w = char['width']
    char_h = char['height']

    # Scale factor
    scale = TARGET_H / char_h
    if i == 0:  # Main character
        scale = min(850 / char_h, CANVAS_W * 0.45 / char_w)
    scale = min(scale, TARGET_H * 1.3 / char_h)

    new_w = int(char_w * scale)
    new_h = int(char_h * scale)

    # Position: spread evenly
    if n > 1:
        x_center = int(CANVAS_W * (i + 0.5) / n)
    else:
        x_center = CANVAS_W // 2

    # Extract character from bounding box
    cropped = img.crop(bbox).resize((new_w, new_h), Image.LANCZOS)

    x = x_center - new_w // 2
    y = CANVAS_H - new_h - 20  # bottom-aligned with small margin

    # Ensure within canvas
    x = max(0, min(x, CANVAS_W - new_w))
    y = max(0, min(y, CANVAS_H - new_h))

    positions.append({
        'name': char['name'],
        'img': cropped,
        'x': x,
        'y': y,
        'w': new_w,
        'h': new_h,
    })
    print(f'{char["name"]}: pos=({x},{y}), scaled={new_w}x{new_h}')

# Paste all characters
for p in positions:
    canvas.paste(p['img'], (p['x'], p['y']), p['img'])

# Add a gradient overlay for depth
overlay = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
overlay_arr = np.array(overlay)
# Bottom dark gradient
for y in range(CANVAS_H):
    alpha = int(max(0, min(180, (CANVAS_H - y) / CANVAS_H * 200)))
    overlay_arr[y, :, 3] = alpha

overlay = Image.fromarray(overlay_arr, 'RGBA')
canvas = Image.alpha_composite(canvas, overlay)

# Final render
canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (10, 13, 20))
canvas_rgb.paste(canvas, (0, 0), canvas)

canvas_rgb.save(out_path)
print(f'\nFinal cover saved: {out_path} ({CANVAS_W}x{CANVAS_H})')

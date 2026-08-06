"""Generate 5 BRIGHT cover variants"""
from PIL import Image, ImageFilter
import numpy as np
import os

cutout_dir = r'C:\Users\Administrator\Desktop\封面\cutout'
out_dir = r'C:\Users\Administrator\Desktop'
CANVAS_W, CANVAS_H = 1920, 1080

files = sorted([f for f in os.listdir(cutout_dir) if f.endswith('.png')])
chars = []
for f in files:
    img = Image.open(os.path.join(cutout_dir, f)).convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 30, axis=1)
    cols = np.any(alpha > 30, axis=0)
    if not rows.any(): continue
    ymin, ymax = np.where(rows)[0][[0, -1]]
    xmin, xmax = np.where(cols)[0][[0, -1]]
    chars.append({
        'name': f, 'img': img,
        'bbox': (xmin, ymin, xmax, ymax),
        'w': xmax - xmin + 1, 'h': ymax - ymin + 1,
    })
chars.sort(key=lambda c: c['w'], reverse=True)
n = len(chars)

def paste_char(canvas, char, x, y, scale, glow=False):
    bbox = char['bbox']
    cropped = char['img'].crop(bbox)
    new_w = int(char['w'] * scale)
    new_h = int(char['h'] * scale)
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)
    if glow:
        g = resized.copy().filter(ImageFilter.GaussianBlur(radius=12))
        ga = np.array(g); ga[:,:,3] = (ga[:,:,3]*0.25).astype(np.uint8)
        g = Image.fromarray(ga, 'RGBA')
        canvas.paste(g, (x-8, y-8), g)
    canvas.paste(resized, (x, y), resized)

# ============================================================
# V1: Warm Sunrise — golden/peach gradient, bright morning feel
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
arr = np.array(canvas)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(255 - t*30)
    g = int(240 - t*45)
    b = int(225 - t*60)
    arr[y, :] = [r, g, b, 255]
canvas = Image.fromarray(arr, 'RGBA')

for i, char in enumerate(chars):
    scale = 500 / char['h']
    slot_w = CANVAS_W / (n + 1)
    x = int(slot_w * (i+1) - (char['w']*scale)//2)
    y = CANVAS_H - int(char['h']*scale) - 20
    paste_char(canvas, char, x, y, scale, glow=True)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (255, 255, 255))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_01_sunrise.png'))
print('01: Warm Sunrise')

# ============================================================
# V2: Cherry Blossom — pink/white, soft petals feel
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
arr = np.array(canvas)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(255 - t*15)
    g = int(235 - t*30)
    b = int(238 - t*25)
    arr[y, :] = [r, g, b, 255]
# Pink highlight top
for y in range(300):
    t = 1 - y/300
    arr[y, :, 0] = np.clip(arr[y, :, 0] + int(t*20), 0, 255)
    arr[y, :, 1] = np.clip(arr[y, :, 1] - int(t*10), 0, 255)
canvas = Image.fromarray(arr, 'RGBA')

# Arrange in gentle arc, larger
for i, char in enumerate(chars):
    scale = 550 / char['h']
    angle = (i/(n-1) - 0.5) * 0.6
    x = int(CANVAS_W//2 + np.sin(angle)*480 - char['w']*scale//2)
    y = CANVAS_H - int(char['h']*scale) - 30 - int(abs(angle)*120)
    paste_char(canvas, char, x, y, scale, glow=True)

# Soft petal dots
rng = np.random.RandomState(42)
for _ in range(40):
    px, py = rng.randint(0, CANVAS_W), rng.randint(0, CANVAS_H//2)
    size = rng.randint(6, 18)
    dot = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    da = np.array(dot)
    cy2, cx2 = size//2, size//2
    for dy in range(size):
        for dx in range(size):
            if np.sqrt((dx-cx2)**2+(dy-cy2)**2) < size//2:
                da[dy, dx] = [255, 200, 210, 40]
    dot = Image.fromarray(da, 'RGBA')
    canvas.paste(dot, (px, py), dot)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (255, 240, 242))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_02_blossom.png'))
print('02: Cherry Blossom')

# ============================================================
# V3: Summer Sky — blue/white, clouds, open air
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
arr = np.array(canvas)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(200 + t*55)
    g = int(225 + t*30)
    b = int(255 - t*10)
    arr[y, :] = [r, g, b, 255]
canvas = Image.fromarray(arr, 'RGBA')

# White cloud-like shapes
for cx_pos, cy_pos, rad in [(300, 150, 120), (1000, 100, 80), (1600, 180, 100), (700, 80, 60), (1400, 200, 70)]:
    cloud = Image.new('RGBA', (rad*3, rad*2), (0, 0, 0, 0))
    ca = np.array(cloud)
    for dy in range(rad*2):
        for dx in range(rad*3):
            dist = np.sqrt((dx-rad*1.5)**2 + (dy-rad)**2)
            if dist < rad:
                alpha = max(0, int((1 - dist/rad) * 50))
                ca[dy, dx] = [255, 255, 255, alpha]
    cloud = Image.fromarray(ca, 'RGBA')
    canvas.paste(cloud, (cx_pos-rad, cy_pos-rad), cloud)

# Characters with slight scale variation
for i, char in enumerate(chars):
    scale = 480 / char['h']
    slot_w = CANVAS_W / (n + 1)
    x = int(slot_w * (i+1) - (char['w']*scale)//2)
    y = CANVAS_H - int(char['h']*scale) - 15
    paste_char(canvas, char, x, y, scale, glow=True)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (240, 248, 255))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_03_summer_sky.png'))
print('03: Summer Sky')

# ============================================================
# V4: Golden Hour — warm amber, backlit characters
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
arr = np.array(canvas)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(255)
    g = int(248 - t*30)
    b = int(220 - t*60)
    arr[y, :] = [r, g, b, 255]
canvas = Image.fromarray(arr, 'RGBA')

# Warm glow center
glow = Image.new('RGBA', (1000, 800), (0, 0, 0, 0))
ga = np.array(glow)
for y in range(800):
    for x in range(1000):
        dist = np.sqrt((x-500)**2 + (y-500)**2)
        alpha = max(0, int((1-dist/600)*80))
        ga[y, x] = [255, 245, 200, alpha]
glow = Image.fromarray(ga, 'RGBA')
canvas.paste(glow, (CANVAS_W//2-500, CANVAS_H//2-200), glow)

for i, char in enumerate(chars):
    scale = 520 / char['h']
    if i == 0: scale *= 1.15
    slot_w = CANVAS_W / (n + 1)
    x = int(slot_w * (i+1) - (char['w']*scale)//2)
    y = CANVAS_H - int(char['h']*scale) - 25
    paste_char(canvas, char, x, y, scale, glow=True)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (255, 252, 240))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_04_golden_hour.png'))
print('04: Golden Hour')

# ============================================================
# V5: Mint Garden — fresh green/white, clean modern
# ============================================================
canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (255, 255, 255, 255))
arr = np.array(canvas)
for y in range(CANVAS_H):
    t = y / CANVAS_H
    r = int(240 + t*15)
    g = int(250 - t*10)
    b = int(240 + t*10)
    arr[y, :] = [r, g, b, 255]
canvas = Image.fromarray(arr, 'RGBA')

# Light bokeh circles
rng = np.random.RandomState(123)
for _ in range(50):
    px, py = rng.randint(0, CANVAS_W), rng.randint(0, CANVAS_H)
    size = rng.randint(10, 40)
    bokeh = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ba = np.array(bokeh)
    ch, cw = size//2, size//2
    colors = [[200, 240, 220], [220, 250, 230], [180, 230, 210], [240, 255, 245]]
    color_choice = colors[rng.randint(0, 4)]
    for dy in range(size):
        for dx in range(size):
            if np.sqrt((dx-cw)**2+(dy-ch)**2) < size//2:
                ba[dy, dx] = [*color_choice, 35]
    bokeh = Image.fromarray(ba, 'RGBA')
    canvas.paste(bokeh, (px, py), bokeh)

# Characters
for i, char in enumerate(chars):
    scale = 520 / char['h']
    slot_w = CANVAS_W / (n + 1)
    x = int(slot_w * (i+1) - (char['w']*scale)//2)
    y = CANVAS_H - int(char['h']*scale) - 20
    paste_char(canvas, char, x, y, scale, glow=True)

# Light bottom fade for readability
fade = Image.new('RGBA', (CANVAS_W, 120), (0, 0, 0, 0))
fa = np.array(fade)
for y in range(120):
    fa[y, :, 3] = int(y/120 * 30)
fade = Image.fromarray(fa, 'RGBA')
canvas.paste(fade, (0, CANVAS_H-120), fade)

canvas_rgb = Image.new('RGB', (CANVAS_W, CANVAS_H), (248, 255, 250))
canvas_rgb.paste(canvas, (0, 0), canvas)
canvas_rgb.save(os.path.join(out_dir, 'cover_05_mint_garden.png'))
print('05: Mint Garden')

print(f'\nAll 5 bright covers saved to {out_dir}/')

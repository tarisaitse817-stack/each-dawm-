# -*- coding: utf-8 -*-
"""
立绘统一规范化：
- 按 alpha 透明区域裁掉空白（含 2% 边距）
- 统一缩放到角色高度 1900px、画布 2000px 高（脚底统一在 y=1960 基线）
- 角色水平居中，宽度按各自体型自然变化
- 处理 assets/characters/*/standing.png（原地覆盖；原图备份在外部 Temp）
用法: python scripts/normalize-standing.py
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'characters')
CANVAS_H = 2000
CHAR_H = 1900          # 角色目标高度
BOTTOM_MARGIN = 40     # 脚底距画布底
MARGIN_RATIO = 0.02    # bbox 四周留白比例

def process(path):
    im = Image.open(path)
    w, h = im.size
    alpha = im.getchannel('A') if im.mode in ('RGBA', 'LA') else None
    bbox = alpha.getbbox() if alpha else (0, 0, w, h)
    if not bbox:
        print(f'  skip {path}: 无透明区域')
        return
    x0, y0, x1, y1 = bbox
    # 四周加 2% 边距（基于 bbox 尺寸）
    bw, bh = x1 - x0, y1 - y0
    mx, my = int(bw * MARGIN_RATIO), int(bh * MARGIN_RATIO)
    x0, y0 = max(0, x0 - mx), max(0, y0 - my)
    x1, y1 = min(w, x1 + mx), min(h, y1 + my)
    char = im.crop((x0, y0, x1, y1))

    scale = CHAR_H / (y1 - y0)
    nw = max(1, round(char.width * scale))
    char = char.resize((nw, CHAR_H), Image.LANCZOS)

    canvas = Image.new('RGBA', (nw, CANVAS_H), (0, 0, 0, 0))
    top = CANVAS_H - BOTTOM_MARGIN - CHAR_H  # 脚底对齐基线
    canvas.paste(char, (0, top), char)
    canvas.save(path)
    print(f'  {path}: {w}x{h} bbox=({x0},{y0},{x1},{y1}) -> {nw}x{CANVAS_H}')

def main():
    count = 0
    for d in sorted(os.listdir(ROOT)):
        f = os.path.join(ROOT, d, 'standing.png')
        if os.path.isfile(f):
            process(f)
            count += 1
    print(f'完成: {count} 张立绘已规范化')

if __name__ == '__main__':
    main()

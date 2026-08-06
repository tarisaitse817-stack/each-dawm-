"""Step 1: Remove backgrounds from all cover images using rembg (u2netp model)"""
from rembg import remove, new_session
from PIL import Image
import os

src_dir = r'C:\Users\Administrator\Desktop\封面'
out_dir = r'C:\Users\Administrator\Desktop\封面\cutout'
os.makedirs(out_dir, exist_ok=True)

session = new_session('u2netp')

for f in sorted(os.listdir(src_dir)):
    if not f.endswith('.png'):
        continue
    in_path = os.path.join(src_dir, f)
    out_path = os.path.join(out_dir, f)

    print(f'Processing: {f} ...')
    img = Image.open(in_path)
    result = remove(img, session=session)
    result.save(out_path)
    print(f'  -> Saved: {out_path} ({result.size[0]}x{result.size[1]})')

print('Done!')

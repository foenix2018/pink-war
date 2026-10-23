"""Original weather masks from local CC0 grain. Not additional photo scans.
The masks darken existing surfaces; they do not replace geometry or PBR maps.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

root = Path(__file__).resolve().parents[1]
target = root / 'dist/assets/cc0'
rng = np.random.default_rng(2189)
n = 512
grain = np.asarray(Image.open(target / 'concrete_floor_diff_512.jpg').convert('L'), dtype=float) / 255
small = Image.fromarray(np.uint8(rng.random((32, 32)) * 255)).resize((n, n), Image.Resampling.BICUBIC)
noise = np.asarray(small, dtype=float) / 255
y, x = np.mgrid[0:n, 0:n] / (n - 1)

streak = np.zeros((n, n))
for _ in range(55):
    cx, width, length = rng.uniform(.02, .98), rng.uniform(.0015, .016), rng.uniform(.10, .98)
    streak += np.exp(-((x - cx) / width) ** 2) * np.clip((length - y) / .14, 0, 1) * rng.uniform(.2, .7)
edge = np.clip(np.minimum(x, 1-x) * 18, 0, 1) * np.clip((1-y) * 8, 0, 1)
alpha = np.clip(streak * (.25 + grain*.7) * edge * (1-y*.8), 0, .56)
rgba = np.zeros((n, n, 4), dtype=np.uint8)
rgba[:,:,:3] = [38, 34, 26]
rgba[:,:,3] = np.uint8(alpha*255)
Image.fromarray(rgba).save(target / 'm01-leak-mask.png', optimize=True)

mask = np.clip((noise*.7 + grain*.3 - .35) * 2.8, 0, 1)
mask *= np.clip((1-y-.12) * 2.0, 0, 1) * np.clip(np.minimum(x,1-x)*12,0,1)
rgba[:,:,:3] = np.uint8(np.stack([43+noise*20, 51+noise*25, 30+noise*15], axis=-1))
rgba[:,:,3] = np.uint8(mask*.73*255)
Image.fromarray(rgba).save(target / 'm01-moss-mask.png', optimize=True)
print('Two original 512px weathering masks built from local CC0 grain.')

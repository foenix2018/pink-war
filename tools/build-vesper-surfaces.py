"""Bake W01 weathering with existing original wear masks and local CC0 grain.
Run from the repository root. No generated colour is relabelled a photo scan:
the originals and the CC0 inputs remain listed separately in the licence record.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parents[1]
source = root / 'assets/level1/textures'
target = root / 'dist/assets/cc0'
for name, original, photograph in [
    ('concrete', 'plaster', 'concrete_floor'),
    ('asphalt', 'road', 'asphalt_03'),
    ('steel', 'steel', 'rusty_painted_metal'),
    ('paint', 'car-cream', 'rusty_painted_metal'),
]:
    base = np.array(Image.open(source / f'{original}-color.png').convert('RGB').resize((512, 512)), dtype=float) / 255
    scan = Image.open(target / f'{photograph}_diff_512.jpg').convert('L')
    # Fine measured grain over the already authored cracks, flaking and moss.
    grain = (np.array(scan, dtype=float) - np.array(scan.filter(ImageFilter.GaussianBlur(1.4)), dtype=float)) / 255
    if name == 'concrete':
        # Masonry must not inherit the old exaggerated rust-colour flecks.
        # Keep the measured porous grain; use old wear only as a faint mask.
        measured = np.array(scan, dtype=float) / 255
        wear = base.mean(2) - .5
        grey = measured * .74 + .12 + wear * .065
        rgb = np.clip(grey[:, :, None] * [.98, 1, 1] + grain[:, :, None] * .12, 0, 1)
    else:
        rgb = np.clip(base * [.95, .98, 1] + grain[:, :, None] * .42, 0, 1)
    Image.fromarray(np.uint8(rgb * 255)).save(target / f'vesper-{name}_diff_512.jpg', quality=88)

Image.open(source / 'brick-color.png').convert('RGB').save(target / 'vesper-brick_diff_512.jpg', quality=88)

"""Colour-grade the bundled Poly Haven CC0 panorama for the Gardens."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "dist/assets"


def blend(a, b, t):
    return np.asarray(a) * (1 - t) + np.asarray(b) * t


with Image.open(ROOT / "cc0/vesper-morning-sky.webp") as image:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255
luma = rgb @ [0.2126, 0.7152, 0.0722]
height, width = luma.shape
padded = np.pad(luma, ((0, 0), (36, 36)), mode="wrap")
low_frequency = Image.fromarray(np.uint8(padded * 255)).filter(ImageFilter.GaussianBlur(11))
detail = (luma - np.asarray(low_frequency)[:, 36:-36] / 255)[..., None]
latitude = np.linspace(np.pi / 2, -np.pi / 2, height)[:, None, None]
longitude = np.arange(width)[None, :, None] * (np.pi * 2 / width)
sunlit = (0.5 + 0.5 * np.cos(longitude - np.pi * 1.17)) ** 2
magenta = np.exp(-((latitude - 0.16) / .29) ** 2)
warmth = np.exp(-((latitude - .014) / .082) ** 2)
upper = blend([43, 53, 90], [70, 59, 105], .54 * sunlit)
cloud_bank = blend([173, 88, 141], [236, 109, 154], sunlit)
sky = blend(upper, cloud_bank, magenta * (.72 + .24 * sunlit))
sky = blend(sky, blend([208, 115, 155], [254, 169, 123], sunlit), warmth * (.28 + .56 * sunlit))
sky = blend(sky, blend([79, 78, 125], [255, 180, 152], magenta), np.clip(detail * 4.1, 0, .79))
sky = blend(sky, blend([37, 47, 84], [113, 52, 104], magenta), np.clip(-detail * 4, 0, .78))
sky += (luma[..., None] - .62) * (22 + 18 * magenta)
below = np.clip((-latitude - .05) / .48, 0, 1)
sky = blend(sky, [48, 43, 62], below * below * (3 - 2 * below))
Image.fromarray(np.uint8(np.clip(sky, 0, 255))).save(ROOT / "m09/jardins-crepuscule.webp", quality=90, method=6)

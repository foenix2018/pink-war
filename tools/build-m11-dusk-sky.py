"""Produce the dusk panorama for La Traversée from the bundled CC0 sky.

Run from the project root with Python, NumPy and Pillow.
The photograph is Kloppenheim 06 Pure Sky, credited in dist/assets/cc0/LICENSE.md.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dist/assets/cc0/vesper-morning-sky.webp"
OUTPUT = ROOT / "dist/assets/m11/vesper-crepuscule.webp"


def smoothstep(low, high, value):
    t = np.clip((value - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, weight):
    return np.asarray(a) * (1 - weight) + np.asarray(b) * weight


def build():
    with Image.open(SOURCE) as image:
        colour = np.array(image.convert("RGB"), dtype=np.float32) / 255
    height, width = colour.shape[:2]
    luma = colour @ np.array([.2126, .7152, .0722], dtype=np.float32)
    # Filter across the longitude seam so the colour grade can wrap in Three.
    wrap = 48
    padded = np.pad(luma, [(0, 0), (wrap, wrap)], mode="wrap")
    soft = Image.fromarray(np.uint8(padded * 255)).filter(ImageFilter.GaussianBlur(11))
    local = luma - np.asarray(soft, dtype=np.float32)[:, wrap:-wrap] / 255
    lat = np.linspace(np.pi * .5, -np.pi * .5, height)[:, None, None]
    lon = np.arange(width)[None, :, None] / width * np.pi * 2
    pale = luma[..., None]
    # Warmest near the photographed bank of sunlight; violet on the opposite
    # side. The cloud highlights and shadows retain the shape of the original.
    light = (.5 + .5 * np.cos(lon - np.pi * 1.17)) ** 1.85
    broad_glow = np.exp(-((lat - .11) / .30) ** 2)
    haze = np.exp(-((lat + .007) / .10) ** 2)
    base = mix([141, 67, 117], [241, 127, 151], .39 + light * .61)
    air = mix([48, 55, 83], [80, 68, 104], .45 + light * .45)
    sky = mix(air, base, broad_glow * (.78 + light * .15))
    sky = mix(sky, mix([178, 92, 136], [253, 168, 155], light), haze * (.2 + light * .49))
    cloud_light = mix([108, 75, 116], [255, 164, 156], broad_glow)
    cloud_dark = mix([53, 56, 82], [91, 38, 85], broad_glow)
    clouds = local[..., None]
    sky = mix(sky, cloud_light, np.clip(clouds * 3.8, 0, .82))
    sky = mix(sky, cloud_dark, np.clip(-clouds * 3.7, 0, .81))
    sky += (pale - .67) * (22 + broad_glow * 28)
    below = smoothstep(.025, .37, -lat)
    terrain_haze = mix([48, 43, 61], [106, 70, 97], np.exp(-((lat + .16) / .32) ** 2))
    sky = mix(sky, terrain_haze + (pale - .63) * 23, below)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.uint8(np.clip(sky, 0, 255))).save(OUTPUT, quality=89, method=6)


if __name__ == "__main__":
    build()

"""Build La Couronne HELIX textures from the bundled CC0 photographs."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "dist/assets"
CC0 = ROOT / "cc0"
OUTPUT = ROOT / "m10"


def image(name, mode="RGB"):
    with Image.open(CC0 / name) as source:
        return np.asarray(source.convert(mode), dtype=np.float32)


def mix(a, b, weight):
    return np.asarray(a) * (1 - weight) + np.asarray(b) * weight


def panorama():
    photo = image("vesper-morning-sky.webp") / 255
    height, width = photo.shape[:2]
    luma = photo @ np.array([.2126, .7152, .0722], dtype=np.float32)
    padded = np.pad(luma, [(0, 0), (40, 40)], mode="wrap")
    soft = Image.fromarray(np.uint8(padded * 255)).filter(ImageFilter.GaussianBlur(9))
    detail = luma - np.asarray(soft)[:, 40:-40] / 255
    latitude = np.linspace(np.pi * .5, -np.pi * .5, height)[:, None, None]
    longitude = np.arange(width)[None, :, None] * (np.pi * 2 / width)
    sunset = (.5 + .5 * np.cos(longitude - np.pi * 1.18)) ** 1.6
    band = np.exp(-((latitude - .11) / .23) ** 2)
    skyline = np.exp(-((latitude - .005) / .095) ** 2)
    zenith = mix([31, 39, 71], [60, 45, 85], sunset * .78)
    horizon = mix([159, 71, 132], [232, 111, 163], sunset)
    sky = mix(zenith, horizon, band * (.73 + .25 * sunset))
    sky = mix(sky, mix([167, 86, 147], [247, 147, 158], sunset), skyline * .54)
    sky = mix(sky, mix([113, 92, 135], [254, 166, 178], band),
              np.clip(detail[..., None] * 4.0, 0, .82))
    sky = mix(sky, mix([31, 33, 60], [95, 39, 94], band),
              np.clip(-detail[..., None] * 3.35, 0, .72))
    sky += (luma[..., None] - .64) * (20 + 27 * band)
    below = np.clip((-latitude - .025) / .48, 0, 1)
    sky = mix(sky, [47, 42, 64], below * below)
    Image.fromarray(np.uint8(np.clip(sky, 0, 255))).save(
        OUTPUT / "helix-crepuscule.webp", quality=90, method=6
    )


def pavement():
    albedo = image("concrete_floor_diff_512.jpg", "L")
    normal = image("concrete_floor_normal_512.jpg")
    rough = image("concrete_floor_rough_512.jpg", "L")
    size = 128
    diffuse = np.empty((size * 4, size * 4, 3))
    details = np.empty_like(diffuse)
    finish = np.empty(diffuse.shape[:2])
    rng = np.random.default_rng(104391)
    coords = np.arange(size)
    distance = np.minimum(coords, coords[::-1])
    grout = np.clip((np.minimum(distance[:, None], distance[None, :]) + .2) / 2.5, 0, 1)
    height = grout ** .75
    slope_y, slope_x = np.gradient(height)
    grout_normal = np.stack((128 - slope_x * 115, 128 + slope_y * 115, 248 + height * 7), axis=-1)
    for row in range(4):
        for col in range(4):
            x, y = rng.integers(0, albedo.shape[0] - size, size=2)
            sample = np.s_[y:y + size, x:x + size]
            target = np.s_[row * size:(row + 1) * size, col * size:(col + 1) * size]
            grain = (albedo[sample] - albedo.mean()) * .48 + rng.uniform(-8, 7)
            diffuse[target] = mix([94, 98, 109], [165, 175, 188] + grain[..., None], grout[..., None])
            details[target] = mix(grout_normal, mix([128, 128, 255], normal[sample], .44),
                                  np.clip(distance[:, None] * distance[None, :] / 6, 0, 1)[..., None])
            finish[target] = mix(220, 170 + (rough[sample] - rough.mean()) * .35, grout)
    for name, pixels in [("helix-dalles", diffuse), ("helix-dalles-normal", details),
                         ("helix-dalles-rough", finish)]:
        Image.fromarray(np.uint8(np.clip(pixels, 0, 255))).save(
            OUTPUT / (name + ".webp"), quality=87, method=6
        )


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    panorama()
    pavement()

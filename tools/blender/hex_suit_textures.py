# Pink Wars — GHJU et LYLU : texture « nid d'abeille » du collant (couleur, relief, rugosité), après les références de l'utilisateur
# (alvéoles hexagonales sombres, arêtes fines éclairées, teintes variables d'une alvéole à l'autre, rayures d'usure).
#
#   python tools/blender/hex_suit_textures.py        (numpy + Pillow seulement, pas de Blender)
#
# Produit, dans dist/assets/heroes/ :
#   suit_hex_ghju.jpg / suit_hex_lylu.jpg    couleur : carbone presque noir, contours des alvéoles teintés (rose pour GHJU, bleu pour LYLU)
#   suit_hex_glow_ghju.jpg / _lylu.jpg       lueur très discrète le long des contours (émissif)
#   suit_hex_nor.jpg                         relief tangent (rainures biseautées, léger dôme par alvéole), commun
#   suit_hex_rough.jpg                       rugosité (rainures mates, sommet des alvéoles plus lisse, usure brillante), commune
# La dalle se répète sans couture : 10 × 2 colonnes d'alvéoles à plat (angle en haut), 17 rangées ; elle couvre 30 cm en x et
# 29,4 cm en y (le jeu applique 30 cm pour les deux : 2 % d'étirement vertical, imperceptible).
import numpy as np, os
from PIL import Image

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/heroes'))
os.makedirs(OUT, exist_ok=True)
N = 1024; NX, NY = 10, 17                      # tile size in px, hexagon periods across / down
S3 = np.sqrt(3.0); WX, WY = 3.0 * NX, S3 * NY  # tile in units of the hexagon radius s
rng = np.random.default_rng(2611)

def hash2(a, b, seed):
    h = (a * 374761393 + b * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)

def noise(w, h, cells, rng, octaves=4):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        c = cells * 2 ** o; g = rng.random((c, c)).astype(np.float32)
        ys, xs = np.linspace(0, c, h, endpoint=False), np.linspace(0, c, w, endpoint=False)
        y0, x0 = np.floor(ys).astype(int), np.floor(xs).astype(int); fy, fx = ys - y0, xs - x0
        fy, fx = fy * fy * (3 - 2 * fy), fx * fx * (3 - 2 * fx)
        a = g[y0 % c][:, x0 % c]; b = g[y0 % c][:, (x0 + 1) % c]; cc = g[(y0 + 1) % c][:, x0 % c]; d = g[(y0 + 1) % c][:, (x0 + 1) % c]
        top = a + (b - a) * fx[None, :]; bot = cc + (d - cc) * fx[None, :]
        out += amp * (top + (bot - top) * fy[:, None]); tot += amp; amp *= .5
    return out / tot

def cells():
    """Per pixel: distance to the cell border (0 on the groove, 1 at the centre), and a cell id for random shading."""
    x = (np.arange(N) + .5) / N * WX; y = (np.arange(N) + .5) / N * WY
    X, Y = np.meshgrid(x, y)
    best = None
    for lat, (ox, oy) in enumerate(((0.0, 0.0), (1.5, S3 / 2))):
        cx = np.round((X - ox) / 3.0) * 3.0 + ox; cy = np.round((Y - oy) / S3) * S3 + oy
        dx, dy = X - cx, Y - cy; h = np.maximum(np.abs(dy), np.abs(dx) * S3 / 2 + np.abs(dy) / 2)
        a = np.round((cx - ox) / 3.0).astype(np.int64) % NX; b = np.round((cy - oy) / S3).astype(np.int64) % NY
        cell = (h, dx, dy, a * 2 + lat, b)
        best = cell if best is None else tuple(np.where(best[0] <= cell[0], p, q) for p, q in zip(best, cell))
    h, dx, dy, ia, ib = best
    apothem = S3 / 2
    return (apothem - h) / apothem, dx, dy, ia, ib

def build():
    e, dx, dy, ia, ib = cells()
    r1, r2, r3 = hash2(ia, ib, 1), hash2(ia, ib, 2), hash2(ia, ib, 3)           # per-cell randoms
    groove = np.clip(e / .075, 0, 1); groove = groove * groove * (3 - 2 * groove)   # 0 in the groove, 1 on the cell
    rim = np.exp(-((e - .105) / .035) ** 2)                                      # thin lit edge just inside the groove
    dome = 1 - np.clip(np.hypot(dx, dy) / 1.0, 0, 1) ** 2                        # slight dome per cell
    height = groove * (.80 + .025 * dome + .02 * (r2 - .5))   # flat tiles between fine bevelled grooves
    # Worn scuffs: broad mottling plus fine scratches, a little lighter and glossier.
    mott = noise(N, N, 5, rng); fine = noise(N, N, 40, rng, 3)
    scratches = np.zeros((N, N), np.float32)
    for _ in range(260):
        x0, y0 = rng.integers(0, N), rng.integers(0, N); ang = rng.uniform(-.5, .5) + (np.pi / 2 if rng.random() < .35 else 0); ln = rng.integers(14, 90)
        t = np.arange(ln); xs = (x0 + (np.cos(ang) * t)).astype(int) % N; ys = (y0 + (np.sin(ang) * t)).astype(int) % N
        scratches[ys, xs] = np.maximum(scratches[ys, xs], rng.uniform(.25, .9))
    from PIL import ImageFilter
    scratches = np.asarray(Image.fromarray((scratches * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)), np.float32) / 255
    wear = np.clip(((mott - .5) * 2.4 + .5) * .55 + fine * .25, 0, 1)
    # Normal map: bevelled grooves, dome, a trace of the scratches.
    hf = height + .04 * scratches + .012 * (fine - .5)
    gx = (np.roll(hf, -1, 1) - np.roll(hf, 1, 1)) * N / 2.0; gy = (np.roll(hf, -1, 0) - np.roll(hf, 1, 0)) * N / 2.0
    nrm = np.stack([-gx * .03, gy * .03, np.ones_like(gx)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    Image.fromarray(((nrm * .5 + .5) * 255).astype(np.uint8)).save(os.path.join(OUT, 'suit_hex_nor.jpg'), quality=90)
    rough = np.clip(.62 - .22 * groove * (.6 + .4 * dome) - .16 * wear * groove - .12 * scratches + .30 * (1 - groove) + .05 * (fine - .5), .15, 1)
    Image.fromarray((rough * 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'suit_hex_rough.jpg'), quality=88)
    # Near-black carbon cells; only the hexagon outlines carry the hero's colour, very discreetly.
    palettes = {   # cell colour at shade 0 / shade 1, groove colour, lit-edge colour (0-255), outline glow colour
        'ghju': dict(lo=(15, 15, 18), hi=(40, 39, 44), groove=(30, 9, 22), rim=(170, 52, 112), glow=(255, 60, 150)),
        'lylu': dict(lo=(14, 16, 20), hi=(38, 42, 50), groove=(8, 17, 34), rim=(64, 140, 226), glow=(70, 160, 255)),
    }
    for name, pal in palettes.items():
        lo, hi, gv, rm = (np.array(pal[k], np.float32) for k in ('lo', 'hi', 'groove', 'rim'))
        shade = np.clip(.15 + .70 * r1 + .20 * (r3 - .5), 0, 1)[..., None]                    # each cell its own shade
        cell = lo + (hi - lo) * shade
        cell = cell * (.94 + .08 * dome[..., None]) * (.85 + .45 * wear[..., None] * (.5 + .5 * r3[..., None]))
        cell = cell + 38 * scratches[..., None] + 10 * (fine[..., None] - .5)
        img = gv + (cell - gv) * groove[..., None]
        img = img + (rm - img) * (.30 * rim * groove)[..., None]
        Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'suit_hex_{name}.jpg'), quality=90)
        # Outline glow (emissive map): a thin line along every groove, nothing in the cells.
        line = np.exp(-((e - .045) / .032) ** 2) * (.75 + .25 * r3)
        glow = np.array(pal['glow'], np.float32)[None, None, :] * line[..., None]
        Image.fromarray(np.clip(glow, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'suit_hex_glow_{name}.jpg'), quality=90)
    print('collant en nid d\'abeille : 6 fichiers')

if __name__ == '__main__':
    build()

# Pink Wars — GHJU et LYLU : texture « nid d'abeille » du collant (couleur, relief, rugosité), après les références de l'utilisateur
# (alvéoles hexagonales sombres, arêtes fines éclairées, teintes variables d'une alvéole à l'autre, rayures d'usure).
#
#   python tools/blender/hex_suit_textures.py        (numpy + Pillow seulement, pas de Blender)
#
# Produit, dans dist/assets/heroes/ :
#   suit_hex_ghju.jpg / suit_hex_lylu.jpg    couleur (prune pour GHJU, bleu pour LYLU)
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
    palettes = {   # cell colour at shade 0 / shade 1, groove colour, lit-edge colour (0-255)
        'ghju': dict(lo=(30, 21, 36), hi=(74, 44, 70), groove=(8, 6, 10), rim=(150, 86, 134)),
        'lylu': dict(lo=(22, 34, 58), hi=(52, 82, 126), groove=(6, 9, 15), rim=(110, 158, 214)),
    }
    for name, pal in palettes.items():
        lo, hi, gv, rm = (np.array(pal[k], np.float32) for k in ('lo', 'hi', 'groove', 'rim'))
        shade = np.clip(.15 + .70 * r1 + .20 * (r3 - .5), 0, 1)[..., None]                    # each cell its own shade
        cell = lo + (hi - lo) * shade
        cell = cell * (.94 + .08 * dome[..., None]) * (.85 + .45 * wear[..., None] * (.5 + .5 * r3[..., None]))
        cell = cell + 38 * scratches[..., None] + 10 * (fine[..., None] - .5)
        img = gv + (cell - gv) * groove[..., None]
        img = img + (rm - img) * (.34 * rim * groove)[..., None]
        Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'suit_hex_{name}.jpg'), quality=90)
    print('collant en nid d\'abeille : 4 fichiers')

if __name__ == '__main__':
    build()

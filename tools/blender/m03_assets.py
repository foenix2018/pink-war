# Pink Wars — chapitre 03, Vesper : pièces modélisées dans Blender (même chaîne que m04_assets.py).
#
#   python tools/blender/m03_assets.py         (ONLY=nom pour n'en refaire qu'une)
#
# Produit, dans dist/assets/m03/models/ :
#   factory_line     chaîne de reconditionnement de l'usine du Directoire : convoyeur à bande (châssis, tambours,
#                    motoréducteur, garde-corps, arrêts d'urgence, barrières immatérielles, colonne lumineuse),
#                    trois cellules de deux robots industriels six axes avec torches de soudage, et les carcasses de
#                    machines en cours de remontage sur leurs gabarits. Origine : centre de la ligne (-41, 0, -76).
#   detention_module module de détention de la cour de rétention (8 × 3,6 × 2,9 m) : bardage ondulé, cadre acier,
#                    porte blindée à guichet, fenêtres à barreaux, climatiseur, projecteur, marchepied. Façade +z.
#   barrier_posts    les deux bornes de la barrière du Directoire (armoire motorisée côté pivot, support de lisse
#                    à fourche de l'autre côté), 19,2 m d'entraxe. Origine : centre de la barrière (0, 0, -34).
# Matériaux nommés comme ceux de m03-depot.js (le jeu y branche ses textures) ; occlusion cuite par Cycles.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m04_assets import Asset, build, TAU  # noqa: E402

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/m03/models'))

def v(*a): return list(a)
def add(p, q, k=1.0): return [p[i] + q[i] * k for i in range(3)]

# Six-axis industrial robot standing at (bx, bz), working toward the unit vector h (in xz).
def robot(a, bx, bz, h, reach_pitch=.44, drop=.17):
    up = (0, 1, 0); side = (-h[2], 0, h[0]); B = (bx, 0, bz)
    a.cyl('concrete', (bx, .06, bz), .55, .12, seg=24)
    a.cyl('dark', (bx, .16, bz), .42, .08, seg=24)
    for k in range(6): t = k / 6 * TAU; a.cyl('steel', (bx + math.cos(t) * .36, .21, bz + math.sin(t) * .36), .025, .03, seg=6)
    a.cyl('rackOrange', (bx, .42, bz), .3, .46, seg=24)
    a.cyl('dark', (bx, .68, bz), .36, .07, seg=24)
    T0 = add(B, h, .08); T0 = (T0[0], .9, T0[2])
    a.bar('rackOrange', add(T0, h, -.32), add(T0, h, .26), .27, square=True)
    S = add((bx, 1.02, bz), h, .22)
    a.bar('dark', add(S, side, -.38), add(S, side, -.12), .19, seg=20); a.bar('steel', add(S, side, -.42), add(S, side, -.38), .12, seg=16)
    d1 = [up[i] * math.cos(reach_pitch) + h[i] * math.sin(reach_pitch) for i in range(3)]; E = add(S, d1, 1.15)
    a.bar('rackOrange', S, E, .13, square=True)
    a.bar('steel', add(add(T0, h, -.3), up, .05), add(S, d1, .55), .045)  # balancer
    a.bar('dark', add(add(T0, h, -.3), up, .05), add(add(T0, h, -.3), up, .25), .07)
    a.bar('dark', add(E, side, -.24), add(E, side, .24), .15, seg=20)
    d2 = [h[i] * math.cos(drop) - up[i] * math.sin(drop) for i in range(3)]; W = add(E, d2, 1.2)
    a.bar('dark', add(E, d2, -.42), add(E, d2, -.1), .16, square=True)  # forearm motor pack
    a.bar('rackOrange', add(E, d2, -.1), add(E, d2, .7), .11, seg=16)
    a.bar('rackOrange', add(E, d2, .7), W, .08, seg=16, )
    a.sphere('dark', W, .09, seg=14)
    a.bar('dark', add(W, side, -.1), add(W, side, .1), .07, seg=14)
    F = add(W, up, -.12); a.bar('steel', W, F, .06, seg=14)
    tip = add(add(F, up, -.36), h, .08); a.bar('dark', F, add(F, up, -.12), .035, seg=10); a.bar('steel', add(F, up, -.12), tip, .022, seg=10)
    a.cyl('steel', tip, .016, .04, seg=8)
    a.bevel = False
    a.pipe('dark', [add(F, side, .06), add(add(W, up, .15), side, .08), add(add(E, up, .25), side, .12), add(add(S, up, .3), side, .15), add(add((bx, .8, bz), h, -.4), side, .1), add((bx, .05, bz), h, -.6)], .025, bend=.2, seg=8)
    a.bevel = True
    return tip

# A Directoire combat chassis being rebuilt, held upright on its jig.
def chassis(a, x, z, y0, armour=True):
    a.box('steel', (x, y0 + .03, z), (1.1, .06, .9))
    a.box('dark', (x, y0 + .7, z - .32), (.12, 1.3, .12)); a.box('dark', (x, y0 + 1.25, z - .2), (.1, .1, .3))
    a.box('trafo', (x, y0 + .35, z), (.5, .26, .3))
    for k in range(4): a.box('steel', (x, y0 + .55 + k * .13, z), (.12, .1, .12))
    for k in range(4): a.torus('steel', (x, y0 + .7 + k * .14, z), .2, .02, seg=24, tseg=6, arc=math.pi * 1.25, yaw=math.pi * .37)
    a.box('trafo', (x, y0 + 1.25, z), (.62, .12, .22))
    for s in (-1, 1):
        a.sphere('dark', (x + s * .36, y0 + 1.25, z), .08, seg=12)
        a.bar('steel', (x + s * .38, y0 + 1.22, z), (x + s * .45, y0 + .82, z + .05), .045)
        a.sphere('dark', (x + s * .45, y0 + .8, z + .05), .055, seg=10)
        a.bar('steel', (x + s * .45, y0 + .78, z + .05), (x + s * .42, y0 + .45, z + .18), .04)
        for k in range(3): a.bar('dark', (x + s * .42, y0 + .45, z + .18), (x + s * .42 + (k - 1) * .04, y0 + .36, z + .26), .012, seg=6)
    a.box('trafo', (x, y0 + 1.48, z + .02), (.26, .24, .24)); a.box('alarm', (x, y0 + 1.5, z + .141), (.18, .03, .01))
    a.bar('dark', (x, y0 + 1.31, z), (x, y0 + 1.37, z), .05)
    if armour:
        a.box('trafo', (x, y0 + .95, z + .2), (.42, .42, .04)); a.box('trafo', (x - .3, y0 + 1.1, z + .12), (.16, .3, .04))

def factory_line():
    a = Asset('factory_line'); L, Wd = 22.0, 1.8
    for x in [-10.6 + k * 2.12 for k in range(11)]:
        for z in (-.8, .8): a.box('steel', (x, .44, z), (.08, .88, .08)); a.box('steel', (x, .01, z), (.18, .02, .18))
        a.box('steel', (x, .25, 0), (.06, .06, 1.6)); a.bar('steel', (x, .3, -.78), (x, .85, .78), .02)
    for z in (-.88, .88): a.box('steel', (0, .95, z), (L, .18, .05)); a.box('steel', (0, 1.035, z - .03 if z > 0 else z + .03), (L, .015, .1))
    a.box('dark', (0, 1.0, 0), (L - .5, .03, 1.55)); a.box('dark', (0, .6, 0), (L - .5, .02, 1.5))
    for x in (-10.9, 10.9): a.cyl('dark', (x, .86, 0), .17, 1.62, axis='z', seg=24); a.cyl('steel', (x, .86, 0), .05, 1.9, axis='z', seg=10)
    for x in [-9.5 + k for k in range(20)]: a.cyl('steel', (x, .62, 0), .03, 1.5, axis='z', seg=8)
    a.cyl('trafo', (10.55, .62, -1.12), .16, .42, axis='z', seg=20); a.box('trafo', (10.55, .62, -.83), (.36, .34, .2)); a.box('steel', (10.55, .3, -1.0), (.5, .04, .5))
    for z in (-.92, .92): a.box('yellow', (0, 1.16, z), (L - .2, .06, .03))
    for x in (-10, 0, 10):
        a.box('yellow', (x, 1.1, .99), (.14, .16, .12)); a.cyl('red', (x, 1.21, .99), .045, .05, seg=14)
    for x in (-10.5, -3.5, 3.5, 10.5):
        for z in (-1.05, 1.05): a.box('yellow', (x, .85, z), (.06, 1.7, .06)); a.box('cell', (x + (.035 if x < 0 else -.035), .85, z), (.006, 1.5, .02))
    a.cyl('dark', (-10.6, 1.8, -1.15), .03, 1.6, seg=8)
    for k, m in enumerate(('red', 'amber', 'cell')): a.cyl(m, (-10.6, 2.62 + k * .12, -1.15), .06, .11, seg=14)
    a.cyl('dark', (-10.6, 2.98, -1.15), .065, .03, seg=14)
    for x in (-7.0, 0.0, 7.0):
        chassis(a, x, 0, 1.02, armour=x != 0)
        for s in (-1, 1): robot(a, x + s * .25, s * 1.95, (0, 0, -s))
    return a

def detention_module():
    a = Asset('detention_module'); w, d, h = 8.0, 3.6, 2.9
    a.box('steel', (0, .075, 0), (w + .1, .15, d + .1)); a.box('steel', (0, h + .05, 0), (w + .1, .1, d + .1))
    a.box('module', (0, (h + .15) / 2, 0), (w - .1, h - .15, d - .1))
    for sx in (-1, 1):
        for sz in (-1, 1):
            a.box('dark', (sx * (w / 2 - .06), h / 2, sz * (d / 2 - .06)), (.14, h, .14))
            for y in (.08, h - .02): a.box('steel', (sx * (w / 2 - .06), y, sz * (d / 2 - .06)), (.18, .16, .18))
    zf = d / 2 - .05
    a.box('dark', (0, 1.2, zf + .02), (1.2, 2.25, .06)); a.box('steel', (0, 1.15, zf + .06), (.95, 2.05, .04))
    for k in range(4): a.box('dark', (0, .4 + k * .5, zf + .085), (.9, .03, .01))
    a.box('dark', (0, 1.55, zf + .085), (.32, .2, .02)); a.box('steel', (.36, 1.05, zf + .1), (.14, .04, .04)); a.box('steel', (.36, 1.15, zf + .09), (.05, .2, .03))
    for y in (.4, 1.9): a.cyl('steel', (-.5, y, zf + .08), .03, .18, seg=8)
    a.box('red', (0, 2.42, zf + .04), (1.3, .12, .08)); a.box('alarm', (.48, 2.62, zf + .05), (.1, .1, .08))
    for sx in (-2.4, 2.4):
        a.box('dark', (sx, 1.75, zf + .02), (1.3, .82, .05)); a.box('steel', (sx, 1.75, zf + .05), (1.2, .72, .02))
        for b in range(7): a.cyl('steel', (sx - .48 + b * .16, 1.75, zf + .1), .016, .72, seg=8)
        for y in (1.48, 2.02): a.box('steel', (sx, y, zf + .1), (1.12, .03, .03))
        a.box('steel', (sx, 1.33, zf + .09), (1.36, .05, .14))
    a.box('white', (-w / 2 + .9, 2.5, zf + .04), (1.2, .38, .02))
    a.box('white', (-w / 2 - .22, 1.9, -.6), (.32, .6, .9))
    for k in range(10): a.box('dark', (-w / 2 - .39, 1.9, -1.0 + k * .09), (.01, .52, .03))
    a.pipe('steel', [(-w / 2 - .2, 1.6, -.3), (-w / 2 - .08, 1.4, -.3), (-w / 2 - .06, .3, -.3)], .02, bend=.1, seg=8)
    a.box('dark', (w / 2 - .35, h + .5, -d / 2 + .45), (.06, .8, .06)); a.box('dark', (w / 2 - .35, h + .95, -d / 2 + .4), (.5, .16, .3)); a.box('lamp', (w / 2 - .35, h + .86, -d / 2 + .4), (.44, .02, .24))
    for x in (-2.0, 1.5): a.cyl('steel', (x, h + .25, 0), .09, .5, seg=14); a.cyl('steel', (x, h + .52, 0), .14, .04, seg=14)
    a.box('steel', (0, .12, zf + .45), (1.4, .05, .7)); a.box('dark', (0, .06, zf + .45), (1.3, .12, .6))
    for k in range(10): a.box('dark', (-.6 + k * .135, .15, zf + .45), (.01, .01, .66))
    return a

def barrier_posts():
    a = Asset('barrier_posts')
    X = -9.6
    a.box('concrete', (X, .08, 0), (1.0, .16, 1.0))
    a.box('white', (X, .7, 0), (.55, 1.1, .45)); a.cyl('white', (X, 1.25, 0), .225, .55, axis='x', seg=24)
    a.box('red', (X, .95, .228), (.5, .14, .01)); a.box('red', (X, .95, -.228), (.5, .14, .01))
    a.box('dark', (X, .55, .23), (.3, .5, .01)); a.cyl('steel', (X + .1, .55, .24), .015, .02, seg=8, axis='z')
    a.cyl('dark', (X + .3, 1.2, 0), .16, .22, axis='x', seg=24); a.cyl('steel', (X + .42, 1.2, 0), .1, .06, axis='x', seg=20)
    a.cyl('dark', (X, 1.52, 0), .03, .1, seg=10); a.sphere('alarm', (X, 1.62, 0), .09, seg=14, scale=(1, 1.2, 1))
    for k in range(4): a.cyl('steel', (X + (k % 2 - .5) * .7, .17, (k // 2 - .5) * .7), .03, .03, seg=6)
    X2 = 9.6
    a.box('concrete', (X2, .08, 0), (.7, .16, .7))
    a.cyl('white', (X2, .58, 0), .07, 1.0, seg=16); for_y = 1.08
    a.box('dark', (X2, for_y + .02, 0), (.12, .04, .3))
    for s in (-1, 1): a.box('dark', (X2, for_y + .14, s * .13), (.1, .25, .03))
    a.box('red', (X2, .85, 0), (.15, .1, .15)); a.box('red', (X2, .45, 0), (.15, .1, .15))
    return a

if __name__ == '__main__':
    only = os.environ.get('ONLY')
    for fn, size, samples in ((factory_line, 1536, 48), (detention_module, 1024, 64), (barrier_posts, 512, 64)):
        a = fn()
        if only and a.name != only: continue
        build(a, size, samples, out=OUT)

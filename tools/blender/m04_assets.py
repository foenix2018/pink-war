# Pink Wars — chapitre 04, station JANUS Est : modèles Blender des pièces maîtresses.
#
#   python -m pip install bpy        (Blender 5.x en module Python, sans interface)
#   python tools/blender/m04_assets.py [dossier de sortie]
#
# Produit, dans dist/assets/m04/models/ :
#   reactor.glb / reactor_ao.jpg          réacteur (bouclier béton, cuve nervurée, bride boulonnée, boucles de refroidissement)
#   transformer.glb / transformer_ao.jpg  transformateur à huile (radiateurs, conservateur, traversées porcelaine)
#   drone_rack.glb / drone_rack_ao.jpg    rack à palettes chargé de drones quadrirotors en charge
#
# Repères : coordonnées du jeu (x à droite, y en haut, z vers le joueur), origine au sol au centre de la boîte de
# collision de m04-layout.js (réacteur 12 × 12 × 9 m, transformateur 6 × 4,4 × 3,4 m, rack 12 × 1,4 × 3,2 m).
# Chaque matériau porte le nom d'une surface scannée de m04-station.js (le jeu y branche couleur, relief, rugosité).
# UV0 : projection cubique métrique (1 unité = 1 m, le jeu applique la taille de dalle de la surface).
# UV1 : dépliage d'éclairage ; l'occlusion ambiante y est calculée par Cycles (sol compris) puis exportée en JPEG.
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/m04/models'))
TAU = math.pi * 2

def G(x, y, z):  # game → Blender (Z up)
    return Vector((x, -z, y))

class Asset:
    """Primitives accumulated per material in bmeshes, in game coordinates."""
    def __init__(self, name):
        self.name, self.parts = name, {}
        self.bevel = True  # set False around thin parts (wires, leads): no chamfer, far fewer triangles
    def bm(self, mat):
        key = (mat, self.bevel)
        if key not in self.parts: self.parts[key] = bmesh.new()
        return self.parts[key]
    # Matrix placing a primitive built along Blender Z (= game up) at game point c, with a game yaw and an optional
    # lay-down axis ('x' or 'z' in game terms).
    @staticmethod
    def place(c, yaw=0.0, axis='y', scale=(1, 1, 1)):
        R = Matrix.Rotation(yaw, 4, 'Z')
        if axis == 'x': R = R @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        elif axis == 'z': R = R @ Matrix.Rotation(math.pi / 2, 4, 'X')
        return Matrix.Translation(G(*c)) @ R @ Matrix.Diagonal((*scale, 1))
    def box(self, mat, c, size, yaw=0.0, tilt=None):
        sx, sy, sz = size  # game sizes: x, y (up), z
        M = Matrix.Translation(G(*c)) @ Matrix.Rotation(yaw, 4, 'Z')
        if tilt: M = M @ Matrix.Rotation(tilt[1], 4, tilt[0])
        bmesh.ops.create_cube(self.bm(mat), size=1.0, matrix=M @ Matrix.Diagonal((sx, sz, sy, 1)))
    def cyl(self, mat, c, r, h, seg=24, r2=None, axis='y', yaw=0.0, caps=True, scale=(1, 1, 1)):
        bmesh.ops.create_cone(self.bm(mat), cap_ends=caps, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=self.place(c, yaw, axis, scale))
    def sphere(self, mat, c, r, seg=16, scale=(1, 1, 1)):
        bmesh.ops.create_uvsphere(self.bm(mat), u_segments=seg, v_segments=max(6, seg // 2), radius=r, matrix=Matrix.Translation(G(*c)) @ Matrix.Diagonal((scale[0], scale[2], scale[1], 1)))
    def bar(self, mat, a, b, r, seg=8, square=False):
        A, B = G(*a), G(*b); d = B - A; L = d.length
        if L < 1e-5: return
        R = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
        M = Matrix.Translation((A + B) / 2) @ R
        if square: bmesh.ops.create_cube(self.bm(mat), size=1.0, matrix=M @ Matrix.Diagonal((2 * r, 2 * r, L, 1)))
        else: bmesh.ops.create_cone(self.bm(mat), cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=L, matrix=M)
    def torus(self, mat, c, R, r, seg=48, tseg=8, axis='y', yaw=0.0, arc=TAU):
        bm = self.bm(mat); M = self.place(c, yaw, axis); rings = []
        closed = abs(arc - TAU) < 1e-6; n = seg if closed else seg + 1
        for i in range(n):
            a = arc * i / seg; ring = []
            for j in range(tseg):
                b = TAU * j / tseg; p = Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
                ring.append(bm.verts.new(M @ p))
            rings.append(ring)
        for i in range(seg):
            A, B = rings[i], rings[(i + 1) % n]
            for j in range(tseg): bm.faces.new((A[j], A[(j + 1) % tseg], B[(j + 1) % tseg], B[j]))
    # Lathe: profile [(radius, height)] turned about game y.
    def lathe(self, mat, c, profile, seg=32):
        bm = self.bm(mat); M = Matrix.Translation(G(*c)); rings = []
        for i in range(seg):
            a = TAU * i / seg; rings.append([bm.verts.new(M @ Vector((r * math.cos(a), r * math.sin(a), h))) for r, h in profile])
        for i in range(seg):
            A, B = rings[i], rings[(i + 1) % seg]
            for j in range(len(profile) - 1): bm.faces.new((A[j], B[j], B[j + 1], A[j + 1]))
    # Tube along a polyline with rounded bends (radius bend), as a swept circle.
    def pipe(self, mat, pts, r, bend=0.0, seg=12, closed=False):
        P = [Vector(p) for p in pts]; path = []
        for i, p in enumerate(P):
            if 0 < i < len(P) - 1 and bend > 0:
                a, b = (P[i - 1] - p).normalized(), (P[i + 1] - p).normalized()
                k = min(bend, (P[i - 1] - p).length / 2, (P[i + 1] - p).length / 2)
                s, e = p + a * k, p + b * k
                for t in range(7): u = t / 6; path.append((1 - u) ** 2 * s + 2 * (1 - u) * u * p + u * u * e)
            else: path.append(p)
        if closed: path.append(path[0])
        bm = self.bm(mat); rings = []
        for i, p in enumerate(path):
            d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            Q = Vector((0, 0, 1)).rotation_difference(G(*d) - G(0, 0, 0)).to_matrix()
            rings.append([bm.verts.new(G(*p) + Q @ Vector((r * math.cos(TAU * j / seg), r * math.sin(TAU * j / seg), 0))) for j in range(seg)])
        for i in range(len(rings) - 1):
            A, B = rings[i], rings[i + 1]
            for j in range(seg): bm.faces.new((A[j], A[(j + 1) % seg], B[(j + 1) % seg], B[j]))

# ---------------------------------------------------------------- reactor
def reactor():
    a = Asset('reactor'); R = 6.0; rv = R - 1.4
    a.cyl('concreteDark', (0, .06, 0), R + .15, .12, seg=96)
    a.cyl('precast', (0, 1.46, 0), R, 2.68, seg=96)
    a.cyl('concreteDark', (0, 2.85, 0), R + .04, .1, seg=96)
    for k in range(16):
        t = k / 16 * TAU; a.box('concreteDark', (math.cos(t) * (R + .01), 1.46, math.sin(t) * (R + .01)), (.04, 2.6, .05), yaw=t)
    # vessel, ribs, flange with bolts
    a.cyl('blue', (0, 2.9 + 1.8, 0), rv, 3.6, seg=96)
    for k in range(24):
        t = k / 24 * TAU; a.box('steel', (math.cos(t) * (rv + .07), 4.7, math.sin(t) * (rv + .07)), (.14, 3.5, .1), yaw=-t)
    for y in (3.0, 6.45):
        a.cyl('galv', (0, y, 0), rv + .3, .22, seg=96)
        for k in range(48):
            t = k / 48 * TAU; a.cyl('steel', (math.cos(t) * (rv + .18), y + .14, math.sin(t) * (rv + .18)), .04, .07, seg=6)
    a.lathe('steel', (0, 6.56, 0), [(rv, 0), (rv, .1), (rv - .9, .9), (2.6, 1.55), (2.35, 1.72)], seg=96)
    a.cyl('galv', (0, 8.42, 0), 2.4, .26, seg=64); a.torus('glowMagenta', (0, 8.58, 0), 1.85, .07, seg=64)
    for k in range(6):
        t = k / 6 * TAU + .3; x, z = math.cos(t) * 3.2, math.sin(t) * 3.2
        a.cyl('galv', (x, 7.55, z), .22, .55, seg=16); a.cyl('steel', (x, 7.85, z), .3, .08, seg=16)
        for j in range(8): u = j / 8 * TAU; a.cyl('steel', (x + math.cos(u) * .25, 7.91, z + math.sin(u) * .25), .022, .04, seg=6)
    # coolant loops: out at 4.1 m, rounded elbow, down the shield into the floor, flanges and supports
    for k in range(8):
        t = k / 8 * TAU + math.pi / 8; c, s = math.cos(t), math.sin(t); m = 'pipeGreen' if k % 2 else 'alu'; out = R + .35
        a.pipe(m, [(c * rv, 4.1, s * rv), (c * out, 4.1, s * out), (c * out, .0, s * out)], .22, bend=.6, seg=20)
        a.cyl('galv', (c * out, .12, s * out), .36, .24, seg=24)
        for y in (1.6, 3.0): a.cyl('galv', (c * out, y, s * out), .29, .08, seg=24)
        a.bar('galv', (c * (rv + .25), 4.1, s * (rv + .25)), (c * (rv + .33), 4.1, s * (rv + .33)), .3, seg=24)
        a.bar('galv', (c * (R - .1), 3.2, s * (R - .1)), (c * (out - .05), 3.2, s * (out - .05)), .05, square=True)
    # platform deck on the shield top, handrail, ladder, bollards, plates
    a.lathe('tread', (0, 2.92, 0), [(rv + .35, 0), (R - .05, 0), (R - .05, .05), (rv + .35, .05)], seg=96)
    for k in range(32):
        t = k / 32 * TAU; a.cyl('paintYellow', (math.cos(t) * (R - .2), 3.45, math.sin(t) * (R - .2)), .025, 1.05, seg=8)
    a.torus('paintYellow', (0, 3.98, 0), R - .2, .03, seg=128); a.torus('paintYellow', (0, 3.5, 0), R - .2, .02, seg=128)
    a.torus('paintYellow', (0, 3.04, 0), R - .2, .015, seg=128)
    for z in (-.25, .25): a.box('galv', (R + .3, 1.5, z), (.05, 3.0, .05))
    for k in range(10): a.box('galv', (R + .3, .3 + k * .28, 0), (.03, .03, .5))
    for k in range(8):
        t = k / 8 * TAU + math.pi / 8 + .2; x, z = math.cos(t) * (R + .3), math.sin(t) * (R + .3)
        a.lathe('paintYellow', (x, 0, z), [(.0, 0), (.14, 0), (.14, 1.0), (.1, 1.08), (0, 1.1)], seg=16)
        for y in (.35, .7): a.cyl('black', (x, y, z), .143, .1, seg=16)
    a.box('label', (0, 2.0, R + .02), (2.4, .5, .02)); a.box('warn', (1.8, 2.0, R + .02), (.5, .45, .02))
    return a

# ---------------------------------------------------------------- transformer
def transformer():
    a = Asset('transformer'); w, d = 6.0, 4.4; tw, td, th, y0 = 3.7, 1.85, 2.25, .3
    for z in (-td * .35, td * .35):  # I-beam skid
        a.box('steel', (0, .02, z), (w - .4, .04, .2)); a.box('steel', (0, .14, z), (w - .4, .2, .03)); a.box('steel', (0, .26, z), (w - .4, .04, .2))
    a.box('paintGrey', (0, y0 + th / 2, 0), (tw, th, td))
    a.box('paintGrey', (0, y0 + th + .05, 0), (tw + .14, .1, td + .14))
    for x in (-tw / 2 + .3, -.4, .4, tw / 2 - .3):  # stiffeners on the long faces
        for s in (-1, 1): a.box('paintGrey', (x, y0 + th / 2, s * (td / 2 + .04)), (.12, th - .1, .08))
    for x in (-tw / 2 + .15, tw / 2 - .15):  # lifting lugs
        for s in (-1, 1): a.box('steel', (x, y0 + th + .2, s * (td / 2 - .05)), (.04, .25, .2))
    for s in (-1, 1):  # radiator banks: headers, valves, 2 × 12 fin panels
        z0 = s * (td / 2 + .1)
        for y in (y0 + .4, y0 + th - .35):
            a.bar('paintGrey', (-tw * .45, y, z0 + s * .1), (tw * .45, y, z0 + s * .1), .07, seg=12)
            a.bar('paintGrey', (0, y, z0 - s * .08), (0, y, z0 + s * .14), .09, seg=12)
            a.cyl('steel', (0, y, z0 + s * .02), .14, .05, seg=16, axis='z')
        for k in range(16):
            x = -tw * .44 + k * tw * .88 / 15
            a.box('paintGrey', (x, y0 + th / 2 - .02, z0 + s * .62), (.03, th - .55, 1.0))
            for y in (y0 + .4, y0 + th - .35): a.bar('paintGrey', (x, y, z0 + s * .1), (x, y, z0 + s * .2), .03, seg=6)
    # conservator with end domes, brackets, oil gauge, Buchholz relay and its pipe
    cx, cy, cz = -tw * .2, y0 + th + .85, td * .28
    a.cyl('paintGrey', (cx, cy, cz), .36, 2.4, seg=32, axis='x')
    for e in (-1, 1): a.sphere('paintGrey', (cx + e * 1.2, cy, cz), .36, seg=24, scale=(.35, 1, 1))
    for x in (cx - .8, cx + .8): a.box('steel', (x, y0 + th + .35, cz), (.1, .55, .1)); a.box('steel', (x, y0 + th + .5, cz), (.12, .06, .7))
    a.cyl('label', (cx + 1.32, cy, cz), .12, .03, seg=24, axis='x'); a.cyl('dark', (cx + 1.33, cy, cz), .03, .01, seg=8, axis='x')
    a.pipe('paintGrey', [(cx + .5, cy - .3, cz), (cx + .5, cy - .5, cz), (.2, cy - .5, cz * .4), (.2, y0 + th + .1, cz * .4)], .045, bend=.15)
    a.box('paintGrey', (.42, cy - .5, cz * .7), (.2, .18, .16))
    # HV bushings: porcelain sheds turned on a lathe, terminals; LV bushings
    for x in (-tw * .3, 0, tw * .3):
        bz, b0 = -td * .22, y0 + th + .1
        a.cyl('steel', (x, b0 + .1, bz), .2, .2, seg=24)
        prof = [(0.0, 0)]
        for k in range(9):
            h = .2 + k * .12; prof += [(.1, h), (.18, h + .02), (.18, h + .045), (.1, h + .07)]
        prof += [(.1, 1.36), (0.0, 1.36)]
        a.lathe('porcelain', (x, b0, bz), prof, seg=16)
        a.cyl('copper', (x, b0 + 1.42, bz), .04, .12, seg=12); a.cyl('alu', (x, b0 + 1.5, bz), .09, .06, seg=16)
    for x in (-tw * .3, -tw * .1, tw * .1, tw * .3):
        b0 = y0 + th + .1; z = td * .3 - .3
        a.lathe('porcelain', (x, b0, z), [(0.0, 0), (.07, 0), (.07, .1), (.1, .12), (.07, .16), (.07, .26), (.1, .28), (.07, .32), (.07, .42), (0.0, .42)], seg=16)
        a.cyl('copper', (x, b0 + .48, z), .025, .12, seg=8)
    # cable box, conduit, marshalling cabinet with door and handle, valves, plates, earthing
    a.box('paintGrey', (tw / 2 + .25, y0 + th * .55, 0), (.5, 1.1, td * .7))
    a.pipe('dark', [(tw / 2 + .3, y0 + th * .55 - .55, 0), (tw / 2 + .3, .4, 0), (tw / 2 + .8, .05, 0)], .09, bend=.3)
    a.box('paintGrey', (-tw / 2 - .25, 1.15, td * .2), (.4, .9, .7)); a.box('steel', (-tw / 2 - .46, 1.15, td * .2), (.02, .8, .6)); a.box('steel', (-tw / 2 - .48, 1.1, td * .2 + .22), (.03, .15, .03))
    a.cyl('pipeRed', (-tw / 2 - .1, y0 + .45, -.5), .04, .12, seg=8, axis='x'); a.torus('pipeRed', (-tw / 2 - .17, y0 + .45, -.5), .12, .015, seg=24, axis='x')
    a.box('label', (-tw * .1, y0 + th * .62, -td / 2 - .085), (.5, .32, .01)); a.box('warn', (tw * .25, y0 + th * .62, -td / 2 - .085), (.34, .3, .01))
    a.pipe('copper', [(-tw / 2 + .1, y0 + .2, -td / 2 - .02), (-tw / 2 + .1, .03, -td / 2 - .02), (-tw / 2 - .4, .03, -td / 2 - .4)], .012, bend=.1)
    return a

# ---------------------------------------------------------------- drone rack
def drone(a, x, y, z, yaw=0.0):
    a.bevel = False
    c, s = math.cos(yaw), math.sin(yaw)
    P = lambda dx, dy, dz: (x + dx * c + dz * s, y + dy, z - dx * s + dz * c)
    for e in (-1, 1):  # landing gear: two bent tubes
        a.pipe('dark', [P(-.16, 0, e * .12), P(-.16, .1, e * .07), P(.16, .1, e * .07), P(.16, 0, e * .12)], .008, bend=.04, seg=4)
        a.bar('dark', P(-.2, .004, e * .12), P(.2, .004, e * .12), .009, seg=5)
    a.box('caseGrey', P(0, .15, 0), (.3, .07, .2), yaw=yaw)
    a.sphere('paintWhite', P(0, .185, 0), .15, seg=12, scale=(1, .35, .7))
    a.box('black', P(-.03, .24, 0), (.16, .05, .1), yaw=yaw)  # battery
    a.box('dark', P(-.03, .267, 0), (.17, .006, .02), yaw=yaw)
    a.sphere('black', P(.13, .1, 0), .035, seg=8); a.cyl('glass', P(.16, .1, 0), .015, .01, seg=8, axis='x', yaw=yaw)
    for k in range(4):
        t = math.pi / 4 + k * math.pi / 2; mx, mz = math.cos(t) * .3, math.sin(t) * .3
        a.bar('black', P(0, .16, 0), P(mx, .17, mz), .014, seg=6)
        a.cyl('dark', P(mx, .19, mz), .028, .045, seg=10); a.cyl('steel', P(mx, .215, mz), .008, .012, seg=5)
        a.box('black', P(mx, .222, mz), (.25, .004, .024), yaw=yaw + t + .5 * k)
        a.torus('dark', P(mx, .22, mz), .135, .006, seg=18, tseg=4)
        a.box('ledRed' if k < 2 else 'ledGreen', P(mx * 1.02, .165, mz * 1.02), (.012, .008, .012))
    a.bevel = True

def drone_rack():
    a = Asset('drone_rack'); L, D, H = 12.0, 1.3, 3.2; bays = 4; bw = L / bays
    for b in range(bays + 1):
        x = -L / 2 + b * bw
        for z in (-D / 2, D / 2):
            a.box('paintBlue', (x, H / 2, z), (.09, H, .07)); a.box('steel', (x, .006, z), (.16, .012, .14))
            for e in (-1, 1): a.cyl('steel', (x + e * .05, .02, z), .008, .02, seg=6)
        for k in range(5):
            y = .25 + k * .6; zs = (-1) ** k
            a.bar('paintBlue', (x, y, -zs * D / 2), (x, y + .6, zs * D / 2), .018)
        a.bar('paintBlue', (x, .15, -D / 2), (x, .15, D / 2), .02, square=True)
    levels = (.15, 1.35, 2.55)
    for y in levels:
        for z in (-D / 2, D / 2):
            a.box('paintOrange', (0, y, z), (L - .02, .12, .05))
            for b in range(bays + 1): a.box('steel', (-L / 2 + b * bw, y, z + (-.05 if z > 0 else .05)), (.14, .16, .01))
        for b in range(bays):  # wire deck: channels and mesh
            x0 = -L / 2 + b * bw
            for k in range(3): a.box('galv', (x0 + bw * (k + 1) / 4, y + .07, 0), (.04, .03, D))
            a.bevel = False
            for k in range(9): a.box('galv', (x0 + bw / 2, y + .09, -D / 2 + .05 + k * (D - .1) / 8), (bw - .06, .008, .008))
            for k in range(20): a.box('galv', (x0 + .05 + k * (bw - .1) / 19, y + .095, 0), (.008, .008, D - .04))
            a.bevel = True
    for b in range(bays):  # bottom level: bins with lids and labels
        cx = -L / 2 + (b + .5) * bw
        for e in (-.7, .7):
            a.box('caseGrey', (cx + e, .38, 0), (1.2, .42, D * .8)); a.box('dark', (cx + e, .6, 0), (1.24, .04, D * .82))
            a.box('warn', (cx + e, .45, D * .4 + .01), (.3, .08, .005))
            for s in (-1, 1): a.box('dark', (cx + e + s * .61, .5, 0), (.02, .05, .2))
    for li, y in enumerate(levels[1:]):  # drones parked, charging leads to a power strip under the beam
        for b in range(bays):
            cx = -L / 2 + (b + .5) * bw
            drone(a, cx - .55, y + .1, 0, yaw=.2 * (b - 1.5))
            drone(a, cx + .55, y + .1, .02, yaw=-.15 * (b + li))
            a.box('dark', (cx, y - .08, D / 2 - .1), (1.6, .05, .06))
            a.bevel = False
            for e in (-.55, .55): a.pipe('rubber', [(cx + e, y + .25, -.05), (cx + e + .1, y + .05, D / 2 - .2), (cx + e * .3, y - .06, D / 2 - .1)], .008, bend=.08, seg=4)
            a.bevel = True
    return a

# ---------------------------------------------------------------- build, unwrap, bake, export
MATCOLOR = {'glowMagenta': (1, .25, .7, 1), 'ledRed': (1, .2, .1, 1), 'ledGreen': (.2, 1, .4, 1)}
def build(asset, ao_size, samples, out=None):
    OUT_DIR = out or OUT; os.makedirs(OUT_DIR, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; objs = []; thin = []
    for (mat_name, bevelled), bm in asset.parts.items():
        me = bpy.data.meshes.new(asset.name + '_' + mat_name); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(me.name, me); sc.collection.objects.link(ob)
        m = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name); me.materials.append(m); (objs if bevelled else thin).append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs: ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active; ob.name = asset.name
    # Clean, bevel the hard edges, harden normals.
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(ob.data); bm.free()
    bev = ob.modifiers.new('bevel', 'BEVEL'); bev.width = .01; bev.segments = 1; bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(40); bev.use_clamp_overlap = True; bev.harden_normals = True
    wn = ob.modifiers.new('wn', 'WEIGHTED_NORMAL'); wn.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier='bevel'); bpy.ops.object.modifier_apply(modifier='wn')
    if thin:
        bpy.ops.object.select_all(action='DESELECT')
        for t in thin: t.select_set(True)
        ob.select_set(True); bpy.context.view_layer.objects.active = ob; bpy.ops.object.join(); ob = bpy.context.view_layer.objects.active
    finish(ob, asset.name, ao_size, samples, OUT_DIR)

def finish(ob, name, ao_size, samples, OUT_DIR, keep_uv0=False, ao_distance=1.6, floor=True):
    """UVs, baked occlusion, export and compaction of a finished mesh object (also used for simulated cloth)."""
    sc = bpy.context.scene; me = ob.data
    class asset: pass
    asset.name = name
    if keep_uv0: me.uv_layers[0].name = 'UVMap'
    else:
      # UV0: metric box projection.
      uv0 = me.uv_layers.new(name='UVMap'); bm = bmesh.new(); bm.from_mesh(me); lay = bm.loops.layers.uv['UVMap']
      for f in bm.faces:
          n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
          for l in f.loops:
              co = l.vert.co; l[lay].uv = (co.y, co.z) if ax == 0 else (co.x, co.z) if ax == 1 else (co.x, co.y)
      bm.to_mesh(me); bm.free()
    # UV1: lightmap unwrap.
    uv1 = me.uv_layers.new(name='Lightmap'); me.uv_layers.active = uv1
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    # Bake ambient occlusion with a floor under the piece.
    if floor: bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -.001)); floor = bpy.context.active_object
    world = bpy.data.worlds.new('w'); sc.world = world; world.light_settings.distance = ao_distance
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    img = bpy.data.images.new(asset.name + '_ao', ao_size, ao_size, alpha=False)
    for m in ob.data.materials:
        m.use_nodes = True; nt = m.node_tree; node = nt.nodes.new('ShaderNodeTexImage'); node.image = img; nt.nodes.active = node; node.select = True
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    sc.render.bake.margin = 6
    bpy.ops.object.bake(type='AO')
    png = os.path.join(OUT_DIR, asset.name + '_ao.png'); img.filepath_raw = png; img.file_format = 'PNG'; img.save()
    # Plain named materials for export (no bake nodes, glowing ones flagged by colour).
    for m in ob.data.materials:
        for n in list(m.node_tree.nodes):
            if n.type == 'TEX_IMAGE': m.node_tree.nodes.remove(n)
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        if bsdf and m.name in MATCOLOR: bsdf.inputs['Base Color'].default_value = MATCOLOR[m.name]
    me.uv_layers.active = me.uv_layers['UVMap']; me.uv_layers['UVMap'].active_render = True
    if floor: bpy.data.objects.remove(floor)
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, asset.name + '.glb'), export_format='GLB', use_selection=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='NONE', export_yup=True)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    compact(os.path.join(OUT_DIR, asset.name + '.glb'), os.path.join(OUT_DIR, asset.name + '.pwm'), keep_uv0)
    from PIL import Image
    Image.open(png).convert('L').save(os.path.join(OUT_DIR, asset.name + '_ao.jpg'), quality=78, optimize=True); os.remove(png)
    print(f'{asset.name}: {tris} triangles, {len(me.materials)} matériaux')

# Compact runtime format « PWM1 » read by dist/m04-models.js: JSON header + one binary block.
# Positions int16 normalised to the asset bounds, normals int8, lightmap UV uint16, indices uint16/uint32.
# The texture UV is not stored: the game recomputes the same metric box projection from position and normal.
def compact(glb_path, out_path, keep_uv0=False):
    import json, struct
    import numpy as np
    b = open(glb_path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); off = 20 + n; bn = struct.unpack('<I', b[off:off + 4])[0]; blob = b[off + 8:off + 8 + bn]
    def acc(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; comps = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[a['componentType']]
        arr = np.frombuffer(blob, dt, a['count'] * comps, v.get('byteOffset', 0) + a.get('byteOffset', 0))
        return arr.reshape(-1, comps) if comps > 1 else arr
    prims = j['meshes'][0]['primitives']; allp = np.concatenate([acc(p['attributes']['POSITION']) for p in prims])
    lo, hi = allp.min(0), allp.max(0); span = np.maximum(hi - lo, 1e-6); parts, head = [], []
    cursor = [0]
    def push(arr):
        raw = arr.tobytes(); pad = (-len(raw)) % 4; parts.append(raw + bytes(pad)); o = cursor[0]; cursor[0] += len(raw) + pad; return o
    for p in prims:
        pos, nor, uv1, idx = acc(p['attributes']['POSITION']), acc(p['attributes']['NORMAL']), acc(p['attributes']['TEXCOORD_1']), acc(p['indices'])
        q = np.round((pos - lo) / span * 65534 - 32767).astype(np.int16)
        nn = np.zeros((len(nor), 4), np.int8); nn[:, :3] = np.round(nor * 127)
        uu = np.round(np.clip(uv1, 0, 1) * 65535).astype(np.uint16)
        ii = idx.astype(np.uint16 if len(pos) < 65536 else np.uint32)
        entry = {'material': j['materials'][p['material']]['name'], 'vertices': len(pos), 'indices': len(ii), 'index32': len(pos) >= 65536,
                 'position': push(q), 'normal': push(nn), 'uv1': push(uu), 'index': push(ii)}
        if keep_uv0: entry['uv0'] = push(np.ascontiguousarray(acc(p['attributes']['TEXCOORD_0']), np.float32))
        head.append(entry)
    meta = json.dumps({'format': 'PWM1', 'min': lo.tolist(), 'max': hi.tolist(), 'primitives': head}).encode(); meta += b' ' * ((-len(meta)) % 4)
    with open(out_path, 'wb') as f: f.write(b'PWM1' + struct.pack('<I', len(meta)) + meta + b''.join(parts))
    os.remove(glb_path)

if __name__ == '__main__':
    only = os.environ.get('ONLY')
    for fn, size, samples in ((reactor, 1536, 64), (transformer, 1024, 64), (drone_rack, 1536, 48)):
        a = fn()
        if only and a.name != only: continue
        build(a, size, samples)

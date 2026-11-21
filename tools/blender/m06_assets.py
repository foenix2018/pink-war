# Pink Wars — chapitre 06, « Le Cœur d'Acier » : modèles Blender du circuit de refroidissement de la halle de coulée et des armoires de disjoncteurs.
#
#   python -m pip install bpy        (Blender 5.x en module Python, sans interface)
#   python tools/blender/m06_assets.py [dossier de sortie]
#
# Produit, dans dist/assets/m06/models/ (même format compact PWM1 et même chaîne que m04_assets.py, dont on réutilise
# les primitives) :
#   pump.pwm         pompe de refroidissement : moteur à ailettes, accouplement caréné, volute, brides boulonnées (6 × 2,6 × 3,2 m)
#   valve.pwm        vanne à opercule sur sa conduite, volant jaune à rayons, étrier de manœuvre (3,2 × 2,6 × 1,4 m)
#   relay_cabinet.pwm armoire de relais : portes, aérations, voyants, fente de badge (3 × 2,4 × 1 m)
#   pipe_bundle.pwm  faisceau de conduites en plafond sur colliers (12 × 1,3 × 1,3 m)
# Repères : coordonnées du jeu (x à droite, y en haut, z vers le joueur), origine au sol au centre. Chaque matériau porte le
# nom d'un matériau de m06-art.js (steel, plate, graphite, dark, yellow, rust, ledBlue, ledYellow, ledRed, grid, white…).
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import m04_assets as A
from m04_assets import Asset, TAU

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/m06/models'))
A.MATCOLOR.update({'ledBlue': (.3, .65, 1, 1), 'ledYellow': (1, .78, .2, 1)})

def flange(a, mat, c, r, axis, bolts=8, t=.07, bolt_mat='dark'):
    a.cyl(mat, c, r, t, seg=24, axis=axis)
    for k in range(bolts):
        ang = TAU * k / bolts; u, v = math.cos(ang) * (r - .06), math.sin(ang) * (r - .06)
        p = (c[0] + t / 2, c[1] + u, c[2] + v) if axis == 'x' else (c[0] + u, c[1] + v, c[2] + t / 2)
        a.cyl(bolt_mat, p, .02, .035, seg=6, axis=axis)

def pump():
    a = Asset('pump')
    a.box('steel', (0, .12, 0), (5.8, .24, 2.5))                                   # skid
    for z in (-1.0, 1.0): a.box('steel', (0, .3, z), (5.8, .12, .16))
    for x in (-2.7, -.3, 2.7): a.box('dark', (x, .05, 0), (.3, .1, 2.6))
    # Motor (left): body, cooling fins, end bell, terminal box, lifting eye
    a.cyl('graphite', (-1.75, 1.0, 0), .66, 2.2, seg=32, axis='x')
    for k in range(14): a.cyl('graphite', (-2.75 + k * .15, 1.0, 0), .7, .045, seg=32, axis='x')
    a.cyl('steel', (-2.95, 1.0, 0), .5, .16, seg=32, axis='x'); a.cyl('dark', (-3.0, 1.0, 0), .18, .06, seg=16, axis='x')
    for s in (-1, 1): a.box('graphite', (-1.2, .42, s * .35), (1.8, .2, .35)); a.box('steel', (-2.2, .22, s * .9), (.5, .22, .22))
    a.box('plate', (-1.75, 1.78, 0), (.7, .42, .55)); a.box('dark', (-1.75, 2.0, 0), (.5, .04, .35)); a.cyl('steel', (-1.75, 1.7, 0), .06, .5, seg=8)
    a.torus('steel', (-1.75, 1.75, 0), .13, .025, seg=16, tseg=6, axis='z')
    a.box('white', (-2.2, 1.3, .672), (.5, .26, .02))                              # nameplate
    # Coupling guard (yellow), volute (right), shaft
    a.cyl('yellow', (-.35, 1.0, 0), .34, .7, seg=24, axis='x')
    for s in (-1, 1): a.box('yellow', (-.35, .55, s * .3), (.7, .06, .06))
    a.cyl('steel', (.45, 1.0, 0), .28, .25, seg=20, axis='x')
    a.cyl('plate', (1.35, 1.0, 0), 1.0, .78, seg=40, axis='x')                    # volute disk
    a.torus('plate', (1.35, 1.0, 0), 1.0, .17, seg=40, tseg=10, axis='x')
    for k in range(12):
        ang = TAU * k / 12; a.cyl('dark', (1.76, 1.0 + .86 * math.cos(ang), .86 * math.sin(ang)), .035, .06, seg=6, axis='x')
    a.cyl('plate', (1.75, 1.0, 0), .5, .08, seg=28, axis='x'); a.cyl('steel', (1.8, 1.0, 0), .22, .06, seg=16, axis='x')
    # Suction (axial, toward +x) and discharge (up, then toward +z) with flanges
    a.cyl('plate', (2.45, 1.0, 0), .36, 1.0, seg=24, axis='x'); flange(a, 'steel', (2.98, 1.0, 0), .5, 'x')
    a.pipe('plate', [(1.35, 1.9, 0), (1.35, 2.35, 0), (1.35, 2.35, .6)], .27, bend=.3, seg=20)
    a.cyl('plate', (1.35, 2.35, .8), .27, .5, seg=20, axis='z'); flange(a, 'steel', (1.35, 2.35, 1.07), .42, 'z')
    a.cyl('steel', (1.35, 1.95, 0), .38, .06, seg=24)                               # discharge flange on the casing
    # Pressure gauge on a small manifold, drain valve, nameplate on the volute
    a.cyl('steel', (.9, 1.95, 0), .03, .4, seg=8); a.cyl('white', (.9, 2.2, .02), .12, .035, seg=24, axis='z'); a.cyl('dark', (.9, 2.2, .04), .1, .01, seg=24, axis='z')
    a.cyl('steel', (1.35, .1, .62), .045, .22, seg=8); a.cyl('yellow', (1.35, .2, .62), .09, .03, seg=12)
    return a

def valve():
    a = Asset('valve')
    a.box('steel', (0, .03, 0), (3.2, .06, 1.4))
    for x in (-1.2, 1.2): a.box('steel', (x, .5, 0), (.12, .9, .8)); a.box('steel', (x, .08, 0), (.5, .08, .9))   # saddles
    a.cyl('plate', (0, .95, 0), .26, 3.0, seg=24, axis='x')                                                      # pipe run
    for x in (-1.5, -.45, .45, 1.5): flange(a, 'steel', (x, .95, 0), .4, 'x', bolts=8, t=.09)
    a.cyl('plate', (0, .95, 0), .46, .9, seg=24, axis='x')                                                       # body
    a.cyl('plate', (0, 1.5, 0), .38, .8, seg=24)                                                                 # bonnet
    for k in range(8): ang = TAU * k / 8; a.cyl('dark', (.34 * math.cos(ang), 1.1, .34 * math.sin(ang)), .025, .09, seg=6)
    a.cyl('steel', (0, 1.95, 0), .24, .14, seg=20)                                                               # packing gland
    a.cyl('steel', (0, 2.2, 0), .05, .8, seg=10)                                                                 # rising stem
    for s in (-1, 1): a.box('steel', (s * .32, 1.85, 0), (.06, 1.0, .1))                                         # yoke
    a.box('steel', (0, 2.33, 0), (.74, .08, .12))
    a.torus('yellow', (0, 2.32, 0), .36, .035, seg=40, tseg=8, axis='y')                                         # handwheel
    for k in range(6): ang = TAU * k / 6; a.bar('yellow', (0, 2.32, 0), (.36 * math.cos(ang), 2.32, .36 * math.sin(ang)), .022, seg=6)
    a.cyl('yellow', (0, 2.32, 0), .06, .1, seg=12)
    a.cyl('white', (0, 1.55, .384), .1, .02, seg=24, axis='z'); a.box('ledBlue', (.42, 1.45, .17), (.06, .06, .02))
    a.box('white', (-.9, .95, .27), (.5, .22, .02))                                                              # tag plate on the pipe
    a.box('yellow', (-1.5, .95, .47), (.03, .5, .05)); a.box('yellow', (1.5, .95, .47), (.03, .5, .05))
    return a

def relay_cabinet():
    a = Asset('relay_cabinet'); w, h, d = 3.0, 2.4, 1.0
    a.box('steel', (0, .06, 0), (w + .1, .12, d + .1))
    a.box('plate', (0, .12 + (h - .2) / 2, 0), (w, h - .2, d))
    a.box('plate', (0, h - .04, 0), (w + .08, .08, d + .08))
    for k in range(3):                                                                                           # three bays
        x = -w / 3 + k * w / 3; fz = d / 2 + .02
        a.box('graphite', (x, 1.25, fz), (w / 3 - .1, 1.85, .05))
        for j in range(7): a.box('dark', (x, .55 + j * .06, fz + .03), (.5, .025, .02))                           # vent slots
        a.box('steel', (x + w / 6 - .12, 1.25, fz + .05), (.04, .26, .04))                                       # handle
        for j in range(5):
            a.box(['ledYellow', 'ledBlue', 'ledRed', 'ledYellow', 'ledBlue'][(j + k) % 5], (x - .3 + j * .15, 2.0, fz + .04), (.06, .06, .03))
    a.box('dark', (w / 3 + .0, 1.5, d / 2 + .08), (.34, .5, .06)); a.box('ledBlue', (w / 3, 1.62, d / 2 + .115), (.2, .05, .01))   # badge reader
    a.box('dark', (w / 3, 1.38, d / 2 + .08), (.22, .04, .06))                                                    # badge slot
    for s in (-1, 1): a.box('steel', (s * (w / 2 - .02), 1.2, -d / 2), (.04, 2.0, .06))
    a.box('grid', (0, h + .1, 0), (w * .9, .06, .4))                                                             # cable tray
    for s in (-.5, 0, .5): a.pipe('dark', [(s * 1.2, h + .06, -.1), (s * 1.2, h + .3, -.1), (s * 1.2 + .3, h + .4, -.1)], .03, bend=.06, seg=8)
    return a

def pipe_bundle():
    a = Asset('pipe_bundle'); L = 12.0; ys = [(2.55, -.35, .17, 'rust'), (2.55, .0, .12, 'plate'), (2.55, .35, .17, 'steel'), (2.2, -.17, .1, 'plate'), (2.2, .17, .1, 'rust')]
    for y, z, r, m in ys:
        a.cyl(m, (0, y, z), r, L, seg=12, axis='x')
        for k in (-2, 0, 2): flange(a, 'steel', (k * 1.9, y, z), r * 1.35, 'x', bolts=0, t=.05)
    for k in range(7):
        x = -L / 2 + 1 + k * 1.67
        a.box('dark', (x, 2.9, 0), (.1, .07, 1.0)); a.box('dark', (x, 2.5, -.55), (.07, .7, .05)); a.box('dark', (x, 2.5, .55), (.07, .7, .05))
        a.bar('steel', (x, 2.93, -.3), (x, 3.3, -.3), .02, seg=6); a.bar('steel', (x, 2.93, .3), (x, 3.3, .3), .02, seg=6)
    a.pipe('steel', [(-L / 2, 2.2, .17), (-L / 2 - .01, 2.2, .17)], .03, seg=6)
    a.box('ledYellow', (-1.4, 2.2, .3), (.05, .05, .02)); a.box('white', (2.2, 2.55, .53), (.5, .12, .01))      # warning lamp, label
    return a

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else OUT; only = os.environ.get('ONLY')
    for fn, size, samples in ((pump, 1024, 40), (valve, 768, 40), (relay_cabinet, 768, 40), (pipe_bundle, 1024, 32)):
        asset = fn()
        if only and asset.name != only: continue
        A.build(asset, size, samples, out)

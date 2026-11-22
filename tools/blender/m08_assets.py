# Pink Wars — chapitre 08, « Les ordres de JANUS » : modèles Blender du complexe industriel JANUS / HELIX.
#
#   python -m pip install bpy        (Blender 5.x en module Python, sans interface)
#   python tools/blender/m08_assets.py [dossier de sortie]
#
# Produit, dans dist/assets/m08/models/ (format compact PWM1 + occlusion ambiante, même chaîne que m04_assets.py) :
#   janus_tower.pwm       la tour JANUS : socle annulaire à contreforts, colonne centrale et ses anneaux lumineux, couronne (Ø 34 m, 78 m)
#   supervision_ring.pwm  la chambre de supervision : mur circulaire vitré, bandeau d'écrans, anneau de pupitres (Ø 30 m)
#   dish.pwm              l'antenne d'AEGIS : parabole de 6 m, source, haubans, socle orientable
#   server_rack.pwm       une rangée de baies d'archives HELIX : 8 baies, portes vitrées, voyants bleus (12 × 2,4 × 3,2 m)
#   robot_arm.pwm         un bras d'assemblage à six axes, jaune industriel (3,4 m)
#   semi_truck.pwm        un semi-remorque JANUS : tracteur, remorque 14 m, roues, bandeau rose (3,2 × 4,2 × 18 m)
#   cooling_unit.pwm      un groupe de refroidissement de toit : caisson, deux ventilateurs grillagés (6 × 3 × 6 m)
# Repères : coordonnées du jeu (x à droite, y en haut, z vers le joueur), origine au sol au centre de la boîte de collision
# de m08-layout.js. Chaque matériau porte le nom d'un matériau de m08-art.js.
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import m04_assets as A
from m04_assets import Asset, TAU

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/m08/models'))
A.MATCOLOR.update({'ledPink': (1, .25, .7, 1), 'ledBlue': (.3, .65, 1, 1), 'screen': (.2, .5, .8, 1)})

def ring_of(a, mat, c, R, n, size, h, y0=0.0):
    for k in range(n):
        t = TAU * k / n
        a.box(mat, (c[0] + R * math.cos(t), y0 + h / 2, c[2] + R * math.sin(t)), size, yaw=-t)

def janus_tower():
    a = Asset('janus_tower'); c = (0, 0, 0)
    a.cyl('concrete', (0, 3, 0), 17, 6, seg=48)                                         # podium
    a.cyl('dark', (0, 6.3, 0), 16.4, .6, seg=48)
    for k in range(12):                                                                 # buttresses
        t = TAU * k / 12; x, z = 13.5 * math.cos(t), 13.5 * math.sin(t)
        a.box('graphite', (x, 12, z), (2.2, 24, 5.5), yaw=-t)
        a.box('ledPink', (17.0 * math.cos(t) * .82, 12, 17.0 * math.sin(t) * .82), (.18, 20, .18), yaw=-t)
    a.cyl('graphite', (0, 16, 0), 11, 20, seg=40)                                       # base drum
    for y in (8, 14, 20, 25.5): a.torus('ledPink', (0, y, 0), 11.1, .18, seg=64, tseg=6)
    a.cyl('glass', (0, 47, 0), 6.2, 46, seg=32)                                          # glass shaft around the core
    a.cyl('ledPink', (0, 47, 0), 4.2, 46, seg=24)                                        # glowing core
    for y in range(28, 70, 6):
        a.torus('steel', (0, y, 0), 6.6, .35, seg=48, tseg=8)
        a.torus('ledPink', (0, y + 2.5, 0), 6.4, .12, seg=48, tseg=6)
    for k in range(6):                                                                  # ribs along the shaft
        t = TAU * k / 6; a.box('steel', (6.9 * math.cos(t), 47, 6.9 * math.sin(t)), (.6, 46, .6), yaw=-t)
    a.cyl('graphite', (0, 71.5, 0), 9, 3, seg=40, r2=7)                                  # crown
    a.cyl('dark', (0, 74, 0), 4, 2, seg=24); a.cyl('steel', (0, 78, 0), .3, 8, seg=8)
    a.torus('ledPink', (0, 73, 0), 8.2, .2, seg=48, tseg=6)
    for k in range(4): t = TAU * k / 4 + .4; a.box('ledRed', (2.4 * math.cos(t), 77, 2.4 * math.sin(t)), (.3, .3, .3))
    # Name plate « JANUS » block on the south face of the podium.
    a.box('dark', (0, 3, 17.1), (10, 2.6, .3)); a.box('ledPink', (0, 3, 17.3), (8.5, .25, .05)); a.box('ledPink', (0, 1.9, 17.3), (8.5, .1, .05))
    return a

def supervision_ring():
    a = Asset('supervision_ring'); R = 15
    for k in range(32):
        t = TAU * k / 32
        if math.sin(t) > .92: continue                                                  # south entrance (towards +z)
        x, z = R * math.cos(t), R * math.sin(t)
        a.box('graphite', (x, 3, z), (3.1, 6, 1.2), yaw=-t - math.pi / 2)
        a.box('screen', ((R - .66) * math.cos(t), 3.2, (R - .66) * math.sin(t)), (2.8, 2.2, .06), yaw=-t - math.pi / 2)
        a.box('ledBlue', ((R - .7) * math.cos(t), 4.45, (R - .7) * math.sin(t)), (2.9, .08, .05), yaw=-t - math.pi / 2)
        a.box('glass', ((R + .2) * math.cos(t), 8, (R + .2) * math.sin(t)), (3.1, 4, .12), yaw=-t - math.pi / 2)
    a.torus('steel', (0, 6.1, 0), R, .4, seg=64, tseg=8); a.torus('steel', (0, 10.1, 0), R, .3, seg=64, tseg=8)
    a.torus('graphite', (0, 10.6, 0), R - 1, 1, seg=64, tseg=8)                         # roof ring (the centre is open)
    a.torus('ledPink', (0, 10.0, 0), R - 1.5, .12, seg=64, tseg=6)
    # Console ring at the centre: desks facing outward, a holographic plinth.
    a.cyl('dark', (0, .6, 0), 4.5, 1.2, seg=40); a.cyl('graphite', (0, 1.25, 0), 4.7, .1, seg=40)
    for k in range(12):
        t = TAU * k / 12; a.box('screen', (4.2 * math.cos(t), 1.7, 4.2 * math.sin(t)), (1.1, .7, .05), yaw=-t - math.pi / 2)
    a.cyl('ledBlue', (0, 2.2, 0), 1.2, .1, seg=32); a.cyl('glass', (0, 3.2, 0), 1.1, 2, seg=32, r2=.4)
    return a

def dish():
    a = Asset('dish')
    a.cyl('steel', (0, .3, 0), 2, .6, seg=24); a.cyl('graphite', (0, 1.6, 0), .9, 2.2, seg=20)   # pedestal
    a.box('graphite', (0, 3.0, 0), (2.4, .6, 1.8))                                           # yoke
    for s in (-1, 1): a.box('steel', (s * 1.1, 3.8, 0), (.25, 1.6, .6))
    # Dish: a shallow paraboloid (lathe) tilted towards the south-west sky.
    prof = [(r, .12 * r * r) for r in (0, .6, 1.2, 1.8, 2.4, 3.0)]
    a.lathe('white', (0, 3.6, 0), prof + [(3.05, 1.1)], seg=40)
    a.lathe('white', (0, 3.6, 0), list(reversed(prof + [(3.05, 1.1)])), seg=40)          # both faces of the shell
    a.torus('steel', (0, 4.68, 0), 3.0, .07, seg=48, tseg=6)
    for k in range(4):
        t = TAU * k / 4 + math.pi / 4; a.bar('steel', (2.6 * math.cos(t), 4.4, 2.6 * math.sin(t)), (0, 6.6, 0), .05, seg=6)
    a.cyl('graphite', (0, 6.7, 0), .3, .5, seg=12); a.box('ledRed', (0, 7.05, 0), (.15, .15, .15))
    return a

def server_rack():
    a = Asset('server_rack'); L, W, H = 12, 2.4, 3.2
    a.box('dark', (0, .05, 0), (W, .1, L))
    for i in range(8):
        z = -L / 2 + L / 16 + i * L / 8
        a.box('graphite', (0, H / 2, z), (W - .1, H - .1, L / 8 - .08))
        for s in (-1, 1):
            a.box('glass', (s * (W / 2 + .01), H / 2, z), (.03, H - .3, L / 8 - .3))
            for u in range(14): a.box('dark', (s * (W / 2 - .06), .35 + u * .2, z), (.04, .12, L / 8 - .45))
            for u in range(0, 14, 2): a.box('ledBlue' if (u + i) % 3 else 'ledPink', (s * (W / 2 + .03), .38 + u * .2, z - .4), (.02, .03, .14))
    a.box('steel', (0, H + .08, 0), (W + .1, .16, L + .1))
    a.box('dark', (0, H + .5, 0), (.6, .4, L))                                               # cable tray
    a.box('ledBlue', (0, H + .25, 0), (W - .3, .04, L - .4))
    return a

def robot_arm():
    a = Asset('robot_arm')
    a.cyl('dark', (0, .15, 0), .9, .3, seg=24); a.cyl('yellow', (0, .6, 0), .65, .6, seg=24)
    a.cyl('yellow', (0, 1.0, 0), .5, .4, seg=20)                                              # turret
    a.box('yellow', (0, 1.3, 0), (.7, .6, .9))
    a.cyl('dark', (0, 1.4, 0), .32, 1.0, seg=16, axis='x')                                    # shoulder
    a.bar('yellow', (0, 1.4, 0), (.4, 2.6, -.7), .26, seg=12, square=True)                    # upper arm
    a.cyl('dark', (.4, 2.6, -.7), .24, .8, seg=14, axis='x')                                  # elbow
    a.bar('yellow', (.4, 2.6, -.7), (.5, 2.9, -1.9), .18, seg=10, square=True)                # forearm
    a.cyl('dark', (.5, 2.9, -1.9), .16, .5, seg=12, axis='x')
    a.bar('graphite', (.5, 2.9, -1.9), (.5, 2.5, -2.2), .1, seg=10)
    for s in (-1, 1): a.box('steel', (.5 + s * .1, 2.35, -2.25), (.05, .3, .08))                 # gripper
    a.bar('dark', (0, 1.0, .5), (.3, 2.4, -.4), .05, seg=6)                                   # hose
    a.box('ledPink', (0, 1.3, .46), (.3, .06, .02))
    return a

def semi_truck():
    a = Asset('semi_truck')
    # Trailer (14 m) with the JANUS stripe, chassis, wheels; tractor at the north end (−z).
    a.box('white', (0, 2.6, 2), (3.0, 3.0, 14))
    a.box('ledPink', (1.52, 2.0, 2), (.03, .18, 13)); a.box('ledPink', (-1.52, 2.0, 2), (.03, .18, 13))
    a.box('dark', (0, .9, 2), (2.6, .3, 14)); a.box('graphite', (0, 2.6, 9.02), (2.9, 2.9, .05))
    for z in (6.5, 7.8, 9.0 - .2):
        for s in (-1, 1): a.cyl('rubber', (s * 1.2, .55, z - .3), .55, .4, seg=16, axis='x')
    a.box('graphite', (0, 1.0, -5.6), (2.6, .5, 4.6))                                         # tractor chassis
    a.box('paintGrey', (0, 2.2, -6.6), (2.6, 2.4, 2.4)); a.box('glass', (0, 2.8, -7.81), (2.3, 1.0, .03))
    a.box('dark', (0, 1.25, -7.85), (2.4, .6, .1)); a.box('ledBlue', (-.9, 1.35, -7.9), (.4, .12, .02)); a.box('ledBlue', (.9, 1.35, -7.9), (.4, .12, .02))
    for z in (-6.8, -4.4, -3.4):
        for s in (-1, 1): a.cyl('rubber', (s * 1.15, .55, z), .55, .4, seg=16, axis='x')
    for s in (-1, 1): a.cyl('steel', (s * 1.35, 3.0, -5.3), .1, 2.4, seg=8)                     # exhaust stacks
    return a

def cooling_unit():
    a = Asset('cooling_unit')
    a.box('graphite', (0, 1.3, 0), (6, 2.6, 6)); a.box('dark', (0, 2.65, 0), (6.1, .1, 6.1))
    for x in (-1.5, 1.5):
        a.cyl('dark', (x, 2.75, 0), 1.3, .2, seg=28); a.torus('steel', (x, 2.86, 0), 1.3, .06, seg=32, tseg=6)
        for k in range(5): t = TAU * k / 5; a.box('steel', (x + .6 * math.cos(t), 2.72, .6 * math.sin(t)), (1.0, .03, .22), yaw=-t)
        for k in range(-5, 6): a.box('steel', (x, 2.9, k * .24), (2.5, .02, .02))
    for s in (-1, 1):
        for k in range(10): a.box('dark', (s * 3.02, .4 + k * .2, 0), (.03, .08, 5.6))
    a.box('ledRed', (2.9, 2.2, 3.02), (.12, .12, .03))
    return a

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else OUT; only = os.environ.get('ONLY')
    for fn, size, samples in ((janus_tower, 1536, 32), (supervision_ring, 1024, 32), (dish, 768, 32), (server_rack, 1024, 32), (robot_arm, 768, 32), (semi_truck, 1024, 32), (cooling_unit, 768, 32)):
        asset = fn()
        if only and asset.name != only: continue
        A.build(asset, size, samples, out)

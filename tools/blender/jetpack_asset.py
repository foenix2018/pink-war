# Pink Wars — mini-jetpack porté dans le bas du dos par GHJU et LYLU (PR « double saut avec mini-jetpack »).
#
#   python tools/blender/jetpack_asset.py
#
# Produit dist/assets/heroes/jetpack.pwm / jetpack_ao.jpg (format PWM1, occlusion cuite par Cycles).
# Repère : celui du squelette en pose de référence, origine au centre du pack, +z = vers l'arrière du héros, y en haut.
# Le boîtier plaque contre le dos (z de -0,035 à +0,065) ; les deux tuyères à cloche sortent vers le bas, leurs anneaux
# lumineux à (±0,07 ; -0,143 ; +0,02) : c'est là que dist/jetpack-fx.js allume les flammes et la fumée.
# Fenêtre de la jauge de carburant : centre (0 ; 0,075 ; +0,052), 0,07 × 0,016 (la barre est dessinée par le jeu).
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from m04_assets import Asset, build, TAU  # noqa: E402

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dist/assets/heroes'))

def jetpack():
    a = Asset('jetpack')
    a.box('casing', (0, .030, .015), (.215, .130, .070))                         # main housing
    a.box('casing', (0, .105, .012), (.190, .022, .060))                         # top cowl, stepped in
    a.box('steel', (0, .118, .012), (.150, .004, .050))                          # cowl top plate
    for s in (-1, 1):
        a.box('trim', (s * .1085, .030, .015), (.005, .100, .052))               # side trim plates (hero colour)
        a.box('dark', (s * .0975, .092, .040), (.020, .020, .020))               # upper corner guards
        for k in range(3): a.cyl('steel', (s * .090, .010 + k * .030, .052), .0045, .004, seg=8, axis='z')   # bolts
    for k in range(5): a.box('dark', (0, -.004 + k * .017, .0525), (.150, .006, .004))                      # intake slats on the back face
    a.box('dark', (0, .075, .0515), (.074, .020, .004))                          # gauge window (the bar is drawn by the game)
    a.box('steel', (0, .075, .0510), (.082, .028, .002))                         # gauge frame
    a.box('label', (-.060, .005, .0525), (.034, .018, .002))                     # data plate
    a.bevel = False
    for s in (-1, 1):
        a.box('dark', (s * .060, .100, -.020), (.016, .070, .010))               # shoulder-strap stubs
        a.box('dark', (s * .060, -.030, -.026), (.016, .090, .008))              # lower straps
    a.bevel = True
    for s in (-1, 1):                                                           # thruster pods and bell nozzles
        x = s * .070
        a.cyl('steel', (x, -.045, .020), .034, .080, seg=24)                      # pod
        for k in range(3): a.torus('trim', (x, -.025 - k * .022, .020), .034, .0035, seg=28, tseg=5, axis='y')   # heat rings
        a.cyl('casing', (x, -.1175, .020), .042, .055, r2=.030, seg=28)           # bell nozzle (bottom r .042 → top r .030)
        a.cyl('dark', (x, -.1405, .020), .033, .004, seg=24)                      # inside the bell
        a.torus('glow', (x, -.1435, .020), .036, .0042, seg=32, tseg=5, axis='y') # exit ring: the flame starts here
        a.box('steel', (x, -.093, -.014), (.020, .030, .018))                     # bracket to the housing
    return a

if __name__ == '__main__':
    build(jetpack(), 1024, 48, out=OUT)

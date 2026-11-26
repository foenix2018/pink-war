"""Casques des tenues 4 et 5 (Carbonatium, Bastion) : GHJU et LYLU.

Sources fournies par l'utilisateur (tools/blender/ref/helmets) :
  casque_GHJU.glb        : 101 pièces, axe Z vertical (racine sans rotation)
  casque_LYLU_anime.glb  : 105 pièces, visière articulée, actions
                           Visiere_Ouverture / Visiere_Fermeture (1,15 s)

Sortie : dist/assets/heroes/helmet_<id>.glb, glTF Y vertical, face vers +Z,
base du col à y = 0, pièces fixes réunies en un objet (un tracé par matériau),
visière mobile réunie sous son articulation, triangles réduits pour le jeu
(les pièces de moins de 500 faces restent intactes : vis, LED, joints).

Lancer : python tools/blender/hero_helmets.py (module bpy).
"""
import math
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/blender/ref/helmets'
OUT = ROOT / 'dist/assets/heroes'
HELMETS = {
    'ghju': {'file': 'casque_GHJU.glb', 'z_up': True, 'ratio': .3},
    'lylu': {'file': 'casque_LYLU_anime.glb', 'z_up': False, 'ratio': .22},
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mesh_children(obj):
    return [o for o in obj.children_recursive if o.type == 'MESH']


def smooth(obj, angle=35):
    mesh = obj.data
    for p in mesh.polygons:
        p.use_smooth = True
    if hasattr(mesh, 'set_sharp_from_angle'):
        mesh.set_sharp_from_angle(angle=math.radians(angle))


def decimate(obj, ratio):
    if len(obj.data.polygons) < 500:
        return
    mod = obj.modifiers.new('reduction', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def join(objects, name):
    objects = [o for o in objects if o.type == 'MESH']
    if not objects:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    return obj


def build(key, spec):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(SRC / spec['file']))
    roots = [o for o in bpy.data.objects if o.parent is None]
    assert len(roots) == 1, roots
    root = roots[0]
    root.name = 'casque_' + key
    if spec['z_up']:
        # The source writes Blender's Z-up axes into a Y-up glTF: stand it up.
        root.rotation_mode = 'QUATERNION'
        root.rotation_quaternion = __import__('mathutils').Quaternion((1, 0, 0), math.radians(-90)) @ root.rotation_quaternion
    bpy.context.view_layer.update()
    pivot = bpy.data.objects.get('Visiere - articulation')
    mobile = bpy.data.objects.get('Visiere - geometrie mobile')
    moving = set(mesh_children(mobile)) if mobile else set()
    before = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
        decimate(obj, spec['ratio'])
        smooth(obj)
    fixed = join([o for o in bpy.data.objects if o.type == 'MESH' and o not in moving], 'coque')
    visor = join(list(moving), 'visiere') if moving else None
    after = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
    # Sanity: upright, face towards Blender -Y (glTF +Z), neck at z = 0.
    bpy.context.view_layer.update()
    pts = [fixed.matrix_world @ v.co for v in fixed.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    print(key, 'faces', before, '->', after, 'bounds', [round(v, 3) for v in lo], [round(v, 3) for v in hi])
    assert hi[2] - lo[2] > .28 and abs(lo[2]) < .01, 'helmet must stand on its neck ring'
    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / f'helmet_{key}.glb'), export_format='GLB',
                              export_normals=True, export_texcoords=False, export_materials='EXPORT',
                              export_animations=bool(pivot), export_yup=True, export_apply=True)


if __name__ == '__main__':
    for key, spec in HELMETS.items():
        build(key, spec)

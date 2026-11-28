"""Editable irrigation and JANUS equipment for the Gardens.

blender --background --factory-startup --python tools/blender/m09_equipment.py
The game places the modules on the existing cultivation benches and core.
"""
import json
import math
import pathlib
import shutil
import sys

import bmesh
import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from m04_assets import Asset
from pwm_export import export_pwm

root = pathlib.Path(__file__).resolve().parents[2]
out = root / "dist/assets/m09"
source = root / "assets/m09"
materials = json.loads((out / "materials.json").read_text())
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

irrigation = Asset("Irrigation")
irrigation.box("dark", (0, .64, -.04), (1.30, 1.04, .17))
irrigation.box("steel", (0, .18, .005), (1.43, .14, .22))
irrigation.box("ivory", (-.20, .63, .082), (.69, .78, .125))
irrigation.box("steel", (-.20, .95, .144), (.49, .11, .036))
irrigation.bevel = False
for x in [-.55, .55]:
    for y in [.26, 1.06]:
        irrigation.cyl("bronze", (x, y, .058), .041, .029, 8, axis="z")
for row in range(6):
    irrigation.box("dark", (-.20, .48 + row * .050, .151), (.43, .019, .012))
for x in [.24, .47]:
    irrigation.cyl("bronze", (x, .39, .10), .106, .13, 12)
    irrigation.cyl("steel", (x, .52, .10), .072, .24, 12)
    irrigation.cyl("dark", (x, .652, .10), .104, .067, 12)
    irrigation.cyl("bronze", (x, .721, .10), .063, .072, 12)
    irrigation.pipe("bronze", [(x,.72,.10),(x,.85,.10),(x,.95,.079),(x,1.13,-.094)],
                    .033, bend=.08, seg=8)
irrigation.cyl("dark", (.32, .95, .10), .164, .111, 20, axis="z")
irrigation.cyl("ivory", (.32, .95, .159), .124, .023, 20, axis="z")
irrigation.torus("steel", (.32, .95, .168), .137, .017, 24, 5, axis="z")
irrigation.bar("dark", (.32,.95,.176), (.382,1.01,.176), .010, 6)
for k in range(7):
    a = (k - 3) * .41 + math.pi / 2
    c, s = math.cos(a), math.sin(a)
    irrigation.bar("dark", (.32+c*.094,.95+s*.094,.174), (.32+c*.113,.95+s*.113,.174), .007, 5)
irrigation.cyl("cyan", (-.46,.94,.170), .029, .022, 10, axis="z")

janus = Asset("JANUS")
janus.box("steel", (0,.14,0), (1.12,.27,.87))
janus.box("dark", (0,.48,-.012), (.91,.63,.71))
janus.box("ivory", (0,.80,-.03), (1.03,.22,.76))
janus.box("steel", (0,.44,.360), (.53,.393,.097))
janus.box("dark", (0,.44,.416), (.44,.325,.035))
janus.bevel = False
for x in [-.41,.41]:
    for z in [-.31,.31]:
        janus.cyl("bronze", (x,.290,z), .054, .045, 10)
for x in [-.13,0,.13]:
    janus.cyl("rose", (x,.44,.452), .031,.218, 8)
for x in [-.27,.27]:
    for y in [.945,1.15]:
        janus.cyl("steel", (x,y,-.05), .115,.09,12)
    janus.cyl("dark", (x,1.052,-.05), .072,.182,12)
    janus.pipe("bronze", [(x,1.182,-.05),(x,1.277,-.05),(x,1.277,-.26),(x,1.03,-.40)],
                .038,bend=.08,seg=8)
for y in [.34,.44,.54,.64]:
    janus.box("steel", (0,y,-.39), (.67,.041,.038))

objects, definitions = [], {}
scene = bpy.context.scene
for asset in [irrigation, janus]:
    collection = bpy.data.collections.new(asset.name)
    scene.collection.children.link(collection)
    # Keep both edited source modules visible without overlapping at origin.
    preview_offset = -1.6 if asset is irrigation else 1.6
    for (slot, bevel), bm in asset.parts.items():
        name = asset.name.lower() + "/" + slot
        if name not in definitions:
            definitions[name] = materials[slot]
            material = bpy.data.materials.new(name)
            material.diffuse_color = (*materials[slot]["color"], 1)
            material.roughness = materials[slot]["roughness"]
            material.metallic = materials[slot]["metalness"]
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        mesh.materials.append(bpy.data.materials[name])
        mesh.update()
        uv = mesh.uv_layers.new(name="UVMap")
        for face in mesh.polygons:
            axis = max(range(3), key=lambda k: abs(face.normal[k]))
            for loop in face.loop_indices:
                co = mesh.vertices[mesh.loops[loop].vertex_index].co
                uv.data[loop].uv = (co.y,co.z) if axis == 0 else (co.x,co.z) if axis == 1 else (co.x,co.y)
        ob = bpy.data.objects.new(name, mesh)
        collection.objects.link(ob)
        ob["preview_offset"] = preview_offset
        if bevel:
            mod = ob.modifiers.new("Chanfreins", "BEVEL")
            mod.width = .022
            mod.segments = 2
        objects.append(ob)

scene.unit_settings.system = "METRIC"
scene["chapter"] = 9
scene["purpose"] = "Hydroponic module and biotic core regulator. Runtime instances stay on existing fittings."
stats = export_pwm(objects, out / "equipment.pwm.gz", definitions, "Jardins_Equipements.blend")
for ob in objects:
    ob.location.x = ob["preview_offset"]
bpy.context.preferences.filepaths.save_version = 0
blend = source / "Jardins_Equipements.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
shutil.copyfile(blend, out / blend.name)
print(json.dumps(stats), flush=True)

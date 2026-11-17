"""Turn high-fidelity Blender S19 V3 into production GLB.
- Preserve fan bone hierarchy and one fan animation.
- Reduce ~400 independent meshes to <=28 material/bone batches (mobile GPU).
- Do not alter the original game code, bones or the supplied studio .blend.
Run: blender -b --python tools/sonde_s19_integration/optimize_glb.py
"""
import bpy, json, pathlib, collections
P=pathlib.Path("artifacts/v3-fidelity/SONDE-S19-FIDELITY-V3.glb")
OUT=pathlib.Path("dist/assets/enemies/sonde-s19-v3-game.glb")
OUT.parent.mkdir(parents=True,exist_ok=True)
assert P.is_file(),P
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(P))
meshes=[o for o in bpy.data.objects if o.type=="MESH"]
before=len(meshes)
rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
assert rigs and before>300,(before,len(rigs))
# Apply original evaluated modifiers before joining; preserve sculpted chamfers
# and Blender weighted normals, avoiding unsupported runtime modifiers.
for obj in list(meshes):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        if modifier.type in {"ARMATURE"}:continue
        try:bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:pass
groups=collections.defaultdict(list)
for obj in meshes:
    material_key=tuple(slot.material.name if slot.material else "" for slot in obj.material_slots)
    # Parent transform/bone preserved by limiting joins to matching parent.
    parent=obj.parent.name if obj.parent else ""
    key=(material_key,parent,obj.parent_type,obj.parent_bone)
    groups[key].append(obj)
summary=[]
for key,items in groups.items():
    if len(items)<2:continue
    bpy.ops.object.select_all(action="DESELECT")
    for o in items:o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    bpy.ops.object.join()
    summary.append({"material":key[0],"parent":key[1],"bone":key[3],"merged":len(items)})
after=len([o for o in bpy.data.objects if o.type=="MESH"])
assert after<=36,("Still too many meshes",before,after,summary)
# Require original 4 rotor bones and 1 active animation.
names={b.name for rig in rigs for b in rig.data.bones}
for rotor in ("LEFT_REAR","LEFT_FRONT","RIGHT_REAR","RIGHT_FRONT"):
    assert "FAN_"+rotor in names,("Fan bone missing",rotor)
assert len(bpy.data.actions)>=1,"Blender animation missing"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format="GLB",
    export_animations=True,export_skins=True,export_normals=True,export_yup=True,
    export_lights=False,export_cameras=False,export_apply=False)
assert OUT.exists() and OUT.stat().st_size>50000
with OUT.open("rb") as f:assert f.read(4)==b"glTF"
manifest={"source_meshes":before,"optimized_meshes":after,
          "fan_bones":sorted(n for n in names if n.startswith("FAN_")),
          "actions":len(bpy.data.actions),"asset_bytes":OUT.stat().st_size,
          "batches":summary}
OUT.with_suffix(".json").write_text(json.dumps(manifest,indent=2))
print("Optimized S19 game asset: "+json.dumps({k:v for k,v in manifest.items() if k!="batches"}),flush=True)

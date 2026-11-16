"""Turn LYLU V2 GLB into an editable native Blender source file with studio objects.
Never writes game source assets. Imported animated skeleton remains intact.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

out=Path("finished").resolve()
glb=out/"LYLU-REFERENCE-V2.glb"
assert glb.is_file(),f"Model missing: {glb}"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
mesh=[o for o in bpy.data.objects if o.type=="MESH"]
rigs=[o for o in bpy.data.objects if o.type=="ARMATURE"]
assert rigs, "LYLU model lost its armature"
assert len(mesh)>=65, "Unexpectedly incomplete mesh"
# Separate CAR-14 companion for convenient visibility controls.
for ob in bpy.data.objects:
    if ob.type!="MESH":continue
    if "LYLU V2" in ob.name:
        ob["pink_wars_lylu_design"]="Reference V2"
        ob["base_design"]="Shadow VII from foenix2018/pink-war"
        if any(v in ob.name for v in ["ceramic","graphite","edge"]):
            for poly in ob.data.polygons:
                poly.use_smooth=False
# Preview camera & lights saved in editable Blender file only, never re-exported to the game.
def light(name,loc,power,tint,size):
    data=bpy.data.lights.new(name,"AREA")
    data.energy=power;data.color=tint;data.shape="DISK";data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
    ob.location=loc
    ob.rotation_euler=(Vector((0,0,1.0))-ob.location).to_track_quat("-Z","Y").to_euler()
light("LYLU | key",(-3.0,-4.0,4.1),900,(.70,.87,1.0),3.2)
light("LYLU | fill",(2.8,-2.6,2.7),700,(.75,.82,1.0),2.5)
light("LYLU | rim",(1.7,3.2,3.0),1100,(.12,.55,1.0),2.1)
camera_data=bpy.data.cameras.new("LYLU | studio camera")
cam=bpy.data.objects.new("LYLU | studio camera",camera_data)
bpy.context.collection.objects.link(cam)
cam.location=(2.4,-4.4,2.15)
cam.rotation_euler=(Vector((0,0,1.05))-cam.location).to_track_quat("-Z","Y").to_euler()
camera_data.type="ORTHO";camera_data.ortho_scale=3.3
bpy.context.scene.camera=cam
scene=bpy.context.scene
scene.render.resolution_x=1200
scene.render.resolution_y=1600
scene.render.resolution_percentage=100
scene["CHARACTER"]="LYLU"
scene["REFERENCE"]="user-supplied graphite tactical soldier with blue lights, torn cape, and floating drone"
scene["STATUS"]="Standalone. Not integrated into Pink Wars."
scene["ANIMATION_NOTE"]="Original 16 animation clips included in source GLB; Blender actions imported."
try:scene.render.engine="BLENDER_EEVEE_NEXT"
except Exception:scene.render.engine="BLENDER_EEVEE"
dest=out/"LYLU-REFERENCE-V2.blend"
bpy.ops.wm.save_as_mainfile(filepath=str(dest),compress=True,check_existing=False)
assert dest.stat().st_size>10000
data={"blender_file":dest.name,"size":dest.stat().st_size,
      "meshes":len(mesh),"rigs":[{"name":o.name,"bones":len(o.data.bones)} for o in rigs],
      "actions":[a.name for a in bpy.data.actions],"materials":len(bpy.data.materials)}
(out/"blender-report.json").write_text(json.dumps(data,indent=2,ensure_ascii=False))
print("BLENDER_SUCCESS",json.dumps(data)[:1800],flush=True)
"""Render independent S-19 studio previews after the editable Blender scene is saved."""
import bpy
from pathlib import Path
root=Path("exports/sonde-s19/final").resolve()
bpy.ops.wm.open_mainfile(filepath=str(root/"SONDE-S19-REFERENCE-V2.blend"))
s=bpy.context.scene
s.render.engine="CYCLES"
s.cycles.samples=18
s.render.resolution_x=1000;s.render.resolution_y=800;s.render.resolution_percentage=100
s.render.image_settings.file_format="PNG"
for name,filename in [
    ("S19 Front 3-quarter","SONDE-S19-FACE-3Q.png"),
    ("S19 Top identification","SONDE-S19-DESSUS.png"),
    ("S19 Rear 3-quarter","SONDE-S19-ARRIERE.png")]:
    camera=bpy.data.objects.get(name)
    if not camera:raise RuntimeError("Missing camera: "+name)
    s.camera=camera;s.render.filepath=str(root/filename)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW READY "+filename,flush=True)

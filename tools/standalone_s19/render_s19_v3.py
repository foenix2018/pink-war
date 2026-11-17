"""Standalone product-shot renders of S19 V3 rig, 4 viewpoints at neutral pose."""
import bpy
from pathlib import Path
p=Path('exports/sonde-s19/v3-fidelity').resolve()
bpy.ops.wm.open_mainfile(filepath=str(p/'SONDE-S19-FIDELITY-V3.blend'))
scene=bpy.context.scene
scene.frame_set(1)
scene.render.engine='CYCLES'
scene.cycles.samples=22
scene.cycles.use_denoising=False
for layer in scene.view_layers:
    if hasattr(layer,'cycles'):layer.cycles.use_denoising=False
scene.render.resolution_x=1120
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
for cam,name in [
    ('S19 / HERO THREE QUARTER','01-S19-V3-THREE-QUARTER.png'),
    ('S19 / FRONT','02-S19-V3-FRONT.png'),
    ('S19 / TOP','03-S19-V3-TOP.png'),
    ('S19 / BACK THREE QUARTER','04-S19-V3-BACK.png'),
]:
    obj=bpy.data.objects.get(cam)
    if obj is None:raise RuntimeError('Expected camera not found '+cam)
    scene.camera=obj
    scene.render.filepath=str(p/name)
    bpy.ops.render.render(write_still=True)
    print('S19 V3 RENDER COMPLETE '+name,flush=True)

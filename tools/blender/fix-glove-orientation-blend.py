"""Fix inverted glove orientation in the original Blender scenes.
Preserve original rigs; rotate around each anatomical wrist anchor.
"""
import bpy,math,json
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path('previous/final');OUT=Path('hands-fixed');OUT.mkdir(parents=True,exist_ok=True)
GLTF_WRISTS={
'GHJU':[(0.28836614,0.92002563,-0.03204070),(-0.28836614,0.92002563,-0.03204070)],
'LYLU':[(0.30532904,0.97414367,-0.03392524),(-0.30532904,0.97414366,-0.03392525)]}
results=[]
for hero in ('GHJU','LYLU'):
 source=(ROOT/(hero+'-ENHANCED.blend')).resolve()
 bpy.ops.wm.open_mainfile(filepath=str(source))
 checks=[]
 for name,glpoint in zip(['Pink war RLH droit','Pink war RLH gauche'],GLTF_WRISTS[hero]):
  obj=bpy.data.objects.get(name)
  if obj is None:raise RuntimeError('Missing glove: '+name)
  x,y,z=glpoint;pivot=Vector((x,-z,y))
  old=obj.matrix_world.copy()
  turn=Matrix.Translation(pivot)@Matrix.Rotation(math.pi,4,'Z')@Matrix.Translation(-pivot)
  obj.matrix_world=turn@old
  bpy.context.view_layer.update()
  assert (turn@pivot-pivot).length<1e-6
  checks.append({'name':name,'pivot':[round(v,5) for v in pivot],'world_moved':(obj.matrix_world.translation-old.translation).length})
  obj['pink_wars_fix']='Rotate 180deg about its longitudinal wrist axis'
 bpy.context.scene['PINK_WARS_GLOVE_CORRECTION']='Thumbs inward, palms anatomically correct'
 out=(OUT/(hero+'-HANDS-FIX.blend')).resolve()
 bpy.ops.wm.save_as_mainfile(filepath=str(out),check_existing=False,compress=True)
 if out.stat().st_size<10000:raise RuntimeError(str(out))
 results.append({'hero':hero,'blender_bytes':out.stat().st_size,'gloves':checks})
 print('BLEND SAVED',hero,out.stat().st_size,flush=True)
(OUT/'fix-report.json').write_text(json.dumps(results,indent=2))

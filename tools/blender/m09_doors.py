"""Editable, animated entry leaves. Shared by the generator and source refresh.
blender --background assets/m09/PinkWars_N09_Jardins_Suspendus.blend --python tools/blender/m09_doors.py
Runtime renders these moving objects separately from the static landscape.
"""
import bpy, pathlib, shutil
from mathutils import Vector

def install_entry(scene,materials):
 old=bpy.data.collections.get('Sas / vantaux animés')
 if old:
  for obj in list(old.objects):bpy.data.objects.remove(obj,do_unlink=True)
  bpy.data.collections.remove(old)
 collection=bpy.data.collections.new('Sas / vantaux animés');scene.collection.children.link(collection)
 game=lambda x,y,z:Vector((x,-z,y))
 def relink(obj,name,parent):
  obj.name='Sas / '+name
  for c in list(obj.users_collection):c.objects.unlink(obj)
  collection.objects.link(obj);obj.parent=parent;return obj
 def plate(name,parent,size,position,mat):
  bpy.ops.mesh.primitive_cube_add(size=2);obj=relink(bpy.context.object,name,parent);obj.location=game(*position);obj.scale=(size[0]/2,size[2]/2,size[1]/2)
  bpy.context.view_layer.objects.active=obj;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);obj.data.materials.append(mat)
  bevel=obj.modifiers.new('Arêtes arrondies','BEVEL');bevel.width=.08;bevel.segments=3;obj.modifiers.new('Normales pondérées','WEIGHTED_NORMAL');return obj
 for side in [-1,1]:
  parent=bpy.data.objects.new('Sas / vantail '+str(side),None);collection.objects.link(parent)
  for frame,travel in [(1,0),(40,4.2),(100,4.2),(140,0),(160,0)]:parent.location=game(-105+side*(2+travel),14,115);parent.keyframe_insert(data_path='location',frame=frame)
  plate('blindage',parent,(3.94,8,.28),(0,0,0),materials['dark']);plate('vitrage',parent,(3.3,3.5,.05),(0,.4,.17),materials['glass-blue'])
  for x in [-1.7,1.7]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.055,depth=7.2);obj=relink(bpy.context.object,'tube lumineux',parent);obj.location=game(x,0,.21);obj.data.materials.append(materials['rose'])
 scene.cycles.use_denoising=False
 scene['entry_animation']='Sas ORDRE : fermeture 1, ouverture 40, maintien 100, fermeture 140';scene.frame_end=160;scene.frame_set(1)

if __name__=='__main__':
 root=pathlib.Path(__file__).resolve().parents[2];source=root/'assets/m09/PinkWars_N09_Jardins_Suspendus.blend'
 install_entry(bpy.context.scene,{m.name:m for m in bpy.data.materials});bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source),compress=True);shutil.copyfile(source,root/'dist/assets/m09/PinkWars_N09_Jardins_Suspendus.blend')

import bpy, json, pathlib, math
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parent.parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'blender/Aerin-V15-editable.glb'))
arms=[o for o in bpy.data.objects if o.type=='ARMATURE']
for o in bpy.data.objects:
 if o.name.startswith('Aerin_Body') or 'FirstPerson' in o.name:
  o.hide_render=True;o.hide_set(True)
for arm in arms:
 arm.show_in_front=True
 if arm.animation_data:
  for track in arm.animation_data.nla_tracks:track.mute=True
  idle=next((a for a in bpy.data.actions if a.name=='Idle' or a.name.startswith('Idle_')),None)
  if idle:arm.animation_data.action=idle
for hair in [o for o in bpy.data.objects if o.name.startswith('Aerin_Cheveux_V15')]:
 if arms:
  arm=arms[0];head=next((b.name for b in arm.data.bones if b.name.replace('mixamorig:','').replace('mixamorig','')=='Head'),None)
  if head:
   world=hair.matrix_world.copy();hair.parent=arm;hair.parent_type='BONE';hair.parent_bone=head;hair.matrix_world=world
 hair['simulation_note']='Editable rest mesh; Verlet hair simulation lives in game/aerin-hair-v15.js, not baked into this Blender file.'
scene=bpy.context.scene;scene.frame_set(1);scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.37,.32,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.camera_add(location=(3.4,-5.6,2.8));cam=bpy.context.object;cam.name='Camera_Apercu';target=Vector((0,0,1.0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.5;scene.camera=cam
for name,loc,power,size in [('Key',(-3,-4,5),500,4),('Rim',(3,1,4),350,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=640;scene.render.resolution_y=800;scene.render.resolution_percentage=100
notes=bpy.data.texts.new('LISEZ-MOI');notes.write('Aerin V15 — modèle éditable extrait de la version fournie.\nCorps V13, cheveux V15, équipement et animations.\nLe maillage Aerin_Body original est masqué mais conservé pour le rig.\nLes cheveux sont attachés à Head : la physique Verlet et les mouvements secondaires restent dans le jeu ; ils ne sont pas cuits dans ce fichier.\nSélectionner l’armature et une action dans l’éditeur d’actions pour inspecter les animations.\n')
if arms:bpy.context.view_layer.objects.active=arms[0];arms[0].select_set(True)
report={'armatures':[{'name':a.name,'bones':len(a.data.bones)} for a in arms],'actions':len(bpy.data.actions),'actionNames':[a.name for a in bpy.data.actions],'hairMeshes':[o.name for o in bpy.data.objects if o.name.startswith('Aerin_Cheveux_V15')],'meshes':len([o for o in bpy.data.objects if o.type=='MESH'])}
(root/'blender/validation.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'blender/Aerin-V15.blend'),compress=True)
scene.render.filepath=str(root/'blender/Aerin-V15-apercu.png');bpy.ops.render.render(write_still=True)
print('AERIN_BLENDER_REPORT',json.dumps({k:v for k,v in report.items() if k!='actionNames'}))

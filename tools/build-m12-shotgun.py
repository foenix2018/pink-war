"""LYLU M-12, modelled from the creator's side-view reference.
Run: blender --background --python tools/build-m12-shotgun.py
Game coordinates: metres, +Y up, -Z forward, palm at the origin.
The stock opening, bored muzzle and trigger guard are actual holes.
"""
import bpy,bmesh,math,json,pathlib,base64,struct
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'dist/assets/pink-war';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def cv(p):return (p[0],-p[2],p[1])
def uvpoint(X,Y):return ((430-X)*.00105,(310-Y)*.00105) # z,y from image landmarks
M={}
for name,color,metal,rough in [('paint',(.037,.041,.047),.58,.47),('alloy',(.21,.23,.25),.88,.32),('rubber',(.014,.016,.019),.12,.82),('silver',(.55,.57,.59),.85,.36),('detail',(.055,.064,.075),.7,.5),('bead',(.5,.55,.6),.3,.3)]:
 m=bpy.data.materials.new('PW_M12_'+name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough;M[name]=m
pump=[]
def finish(o,mat,bevel=.002,group='fixed'):
 o.data.materials.append(M[mat]);o['part']=group
 if bevel:
  b=o.modifiers.new('Manufactured edge radius','BEVEL');b.width=bevel;b.segments=3;b.harden_normals=True;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if group=='pump':pump.append(o)
 return o
def mesh(name,vs,fs,mat,bevel=.002,group='fixed'):
 g=bpy.data.meshes.new(name);g.from_pydata([cv(p) for p in vs],[],fs);g.update();bm=bmesh.new();bm.from_mesh(g);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(g);bm.free();o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);return finish(o,mat,bevel,group)
def profile(name,points,width,mat,x=0,bevel=.002,group='fixed',pixels=False):
 points=[uvpoint(*p) for p in points] if pixels else points;n=len(points);vs=[(x+s*width/2,y,z) for s in [-1,1] for z,y in points];fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)];return mesh(name,vs,fs,mat,bevel,group)
def box(name,size,p,mat,bevel=.002,group='fixed'):
 x,y,z=p;w,h,d=size;return profile(name,[(z-d/2,y-h/2),(z+d/2,y-h/2),(z+d/2,y+h/2),(z-d/2,y+h/2)],w,mat,x,bevel,group)
def tube(name,a,b,r,mat,r2=None,n=24,group='fixed',open_bore=False):
 a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
 if u.length<.01:u=d.cross(Vector((1,0,0)))
 u.normalize();v=d.cross(u).normalized();r2=r if r2 is None else r2
 rings=[(a,r),(b,r2)];vs=[tuple(c+(u*math.cos(j*math.tau/n)+v*math.sin(j*math.tau/n))*R) for c,R in rings for j in range(n)];fs=[]
 for j in range(n):fs.append((j,(j+1)%n,(j+1)%n+n,j+n))
 if open_bore:
  for c,R in [(a,r*.70),(b,r2*.70)]:vs +=[tuple(c+(u*math.cos(j*math.tau/n)+v*math.sin(j*math.tau/n))*R)for j in range(n)]
  for j in range(n):
   k=(j+1)%n;fs +=[(2*n+j,3*n+j,3*n+k,2*n+k),(j,2*n+j,2*n+k,k),(n+j,n+k,3*n+k,3*n+j)]
 else:fs +=[tuple(reversed(range(n))),tuple(range(n,n*2))]
 o=mesh(name,vs,fs,mat,0,group)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def rail(name,coords,r,mat,group='fixed'):
 for a,b in zip(coords,coords[1:]):tube(name,a,b,r,mat,n=12,group=group)
def cut(target,cutter):
 bpy.context.view_layer.objects.active=target;m=target.modifiers.new('True aperture','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
 bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
# Continuous skeletal stock; the negative space is not painted on.
stock=profile('Skeletal stock / open shoulder brace',[(139,229),(177,211),(254,200),(324,200),(350,190),(436,190),(453,232),(451,249),(438,363),(183,348),(146,335)],.047,'paint',pixels=True,bevel=0)
cut(stock,profile('Stock negative space',[(214,259),(405,259),(428,267),(400,329),(222,312),(214,303)],.13,'detail',pixels=True,bevel=0))
b=stock.modifiers.new('Stock rounded extrusion','BEVEL');b.width=.004;b.segments=3;b.harden_normals=True;stock.modifiers.new('Stock normals','WEIGHTED_NORMAL')
# A shaped recoil pad and sling swivel follow the rear contour.
profile('Elastomer shoulder pad',[(128,232),(140,228),(146,334),(169,348),(157,352),(136,343)],.054,'rubber',pixels=True,bevel=.003)
rail('Rear sling loop',[(0,.079,.320),(0,-.027,.322),(0,-.048,.296),(0,-.044,.252)],.004,'alloy')
profile('Cheek rest',[(334,207),(349,189),(395,182),(439,183),(444,218),(339,218)],.055,'rubber',pixels=True,bevel=.004)
# Receiver, upper steel spine and continuous grip-to-receiver connection.
profile('Receiver / continuous alloy core',[(433,222),(531,223),(548,183),(632,180),(665,196),(676,245),(648,286),(539,269),(473,253),(439,252)],.070,'alloy',pixels=True,bevel=.0035)
profile('Painted receiver shells',[(529,221),(551,185),(636,183),(656,198),(660,247),(641,277),(539,261)],.077,'paint',pixels=True,bevel=.0035)
profile('Stock upper inlay',[(216,223),(314,210),(329,216),(333,235),(215,241)],.002,'detail',x=.024,pixels=True,bevel=.001)
for s in [-1,1]:
 profile('Pistol grip inset',[(432,268),(447,259),(429,348),(415,342)],.002,'rubber',x=s*.024,pixels=True,bevel=.001)
 for k in range(5):box('Grip anti-slip grooves',(.0014,.002,.019),(s*.026,-.019+k*.009,.005+k*.001),'detail',.0005)
# Trigger guard is a loop with a clear finger opening.
rail('Integral trigger guard',[(0,.064,-.047),(0,.064,-.109),(0,.020,-.112),(0,.011,-.102),(0,.011,-.065),(0,.024,-.056),(0,.064,-.047)],.0035,'alloy')
rail('Trigger',[(0,.063,-.072),(0,.041,-.070),(0,.031,-.078)],.003,'rubber')
# Visible rear steel bolt rail / recessed side port.
box('Bolt spine',(.046,.017,.108),(0,.124,-.070),'silver',.003)
for s in [-1,1]:
 box('Ejection port dark recess',(.002,.024,.105),(s*.039,.104,-.167),'rubber',.002)
 box('Bolt carrier in the port',(.0025,.014,.069),(s*.0405,.106,-.153),'alloy',.002)
 tube('Charging stud',(s*.04,.106,-.11),(s*.055,.106,-.11),.0055,'detail',n=12)
# Parallel bored barrel and tubular magazine. Both are continuous from receiver.
tube('Upper barrel',(0,.124,-.210),(0,.124,-.661),.024,'alloy',n=32,open_bore=True)
tube('Tubular lower magazine',(0,.071,-.240),(0,.071,-.663),.025,'alloy',n=32)
tube('Magazine end cap',(0,.071,-.647),(0,.071,-.668),.0265,'detail',n=32)
# The top rail joins a broad rounded front shroud, with repeated recessed vents.
profile('Vented upper bridge',[(654,161),(780,161),(796,183),(781,194),(658,187)],.076,'silver',pixels=True,bevel=.003)
front=profile('Forward barrel shroud',[(780,168),(804,158),(1031,155),(1054,166),(1061,188),(1057,219),(1035,231),(795,228),(783,216)],.092,'paint',pixels=True,bevel=0)
# Main muzzle is truly open. This cut follows the upper barrel centre.
cut(front,tube('Bore cutter',(0,.124,-.325),(0,.124,-.710),.0265,'detail',n=32))
b=front.modifiers.new('Front shroud manufactured radii','BEVEL');b.width=.0035;b.segments=3;b.harden_normals=True;front.modifiers.new('Shroud normals','WEIGHTED_NORMAL')
for s in [-1,1]:
 for k in range(6):
  z=-.267-k*.022;tube('Recessed bridge cooling port',(s*.039,.145,z),(s*.040,.145,z),.0033,'rubber',n=12)
 for k in range(7):
  z=-.402-k*.035;box('Shroud vent countersink',(.0018,.006,.012),(s*.0465,.152,z),'rubber',.0015)
 profile('Shroud lower seam',[(799,222),(1032,222),(1049,211),(1045,218),(1034,229),(798,229)],.0016,'detail',s*.047,pixels=True,bevel=.0006)

rail('Front sling swivel anchored to magazine cap',[(0,.047,-.647),(0,.027,-.647),(0,.023,-.656),(0,.027,-.666),(0,.043,-.666)],.0025,'alloy')
# Sliding fore-end: a single coherent cradle round the lower tube.
profile('Pump fore-end',[(780,226),(974,226),(1005,240),(1002,276),(985,288),(790,281),(779,266)],.087,'paint',pixels=True,bevel=.004,group='pump')
for s in [-1,1]:
 box('Pump inset channel',(.002,.013,.137),(s*.0445,.071,-.468),'detail',.003,group='pump')
 for k in range(7):box('Pump grip fluting',(.002,.038,.0034),(s*.046,.053,-.414-k*.019),'rubber',.001,group='pump')
 tube('Pump operating rod',(s*.026,.066,-.22),(s*.026,.066,-.575),.005,'silver',n=12)
# Receiver seams, screw heads and sights, all anchored to their parent shells.
for s in [-1,1]:
 for z,y in [(.28,.095),(.08,.107),(-.146,.120),(-.21,.10),(-.397,.142),(-.636,.138)]:
  tube('Recessed fastener',(s*(.025 if z>0 else .047),y,z),(s*(.027 if z>0 else .048),y,z),.0035,'alloy',n=10)
box('Rear sight base',(.039,.011,.043),(0,.149,-.166),'detail',.002)
for s in [-1,1]:box('Open rear sight ears',(.006,.019,.018),(s*.015,.164,-.165),'paint',.0015)
box('Rear notch floor',(.024,.003,.015),(0,.155,-.165),'alloy',.0008)
box('Front sight foot',(.028,.009,.026),(0,.165,-.644),'detail',.0015)
box('Front aiming post',(.0045,.012,.009),(0,.174,-.645),'silver',.0008)
# Apply modifiers, world-space UV projection, and merge by material and motion.
objects=list(bpy.context.scene.objects)
for o in objects:
 if o.type!='MESH':continue
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 layer=o.data.uv_layers.new(name='Reference projection / metres')
 for p in o.data.polygons:
  for li in p.loop_indices:
   co=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
   # Blender Y is longitudinal; U and V preserve camo continuity at seams.
   layer.data[li].uv=((co.y+.34)/1.04,(co.z+.10)/.32)
for group in ['fixed','pump']:
 for mat in M:
  selected=[o for o in list(bpy.context.scene.objects) if o.type=='MESH' and o.get('part')==group and o.data.materials[0]==M[mat]]
  if not selected:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in selected:o.select_set(True)
  bpy.context.view_layer.objects.active=selected[0];bpy.ops.object.join();selected[0].name='M12 '+group+' '+mat
bpy.ops.object.select_all(action='SELECT')
# Use empties to keep a clean, discoverable animated pump hierarchy.
for group in ['fixed','pump']:
 empty=bpy.data.objects.new('M12 '+group,None);bpy.context.collection.objects.link(empty)
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH' and o.get('part')==group:o.parent=empty
root=bpy.data.objects.new('M12 shotgun / LYLU',None);bpy.context.collection.objects.link(root)
for o in list(bpy.context.scene.objects):
 if o!=root and o.parent is None:o.parent=root
root['pinkWarFrame']='grip-metres-v1';root['muzzle']=[0,.124,-.668];root['palm']=[.026,0,0];root['support']=[-.036,.016,-.435];root['designRevision']='3.53';root['reference']='Creator supplied green / violet skeletal-stock shotgun';root['finish']='Dark grey / violet, requested by creator'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/weapons/m12-shotgun.blend'))
file=OUT/'m12-shotgun.glb';bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
(OUT/'m12-model-data.js').write_text('// Authored Blender mesh. Rebuild with tools/build-m12-shotgun.py.\nexport const M12_GLB="'+base64.b64encode(file.read_bytes()).decode()+'";\n')
tris=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
report={'id':'m12','revision':'3.53','triangles':tris,'meshes':sum(o.type=='MESH' for o in bpy.context.scene.objects),'bytes':file.stat().st_size,'length':.99,'muzzle':[0,.124,-.668],'palm':[.026,0,0],'support':[-.036,.016,-.435],'source':'Original mesh modelled from user-provided reference; not a downloaded CC0 model.'}
(OUT/'m12-model.json').write_text(json.dumps(report,indent=2)+'\n');print('M12_MODEL',json.dumps(report),flush=True)

paint=M['paint'];bs=paint.node_tree.nodes.get('Principled BSDF')
for file,slot,color in [('m12-camouflage.webp','Base Color',True),('m12-roughness.webp','Roughness',False)]:
 im=bpy.data.images.load(str(OUT/file),check_existing=True);im.colorspace_settings.name='sRGB' if color else 'Non-Color';im.pack()
 tex=paint.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;paint.node_tree.links.new(tex.outputs['Color'],bs.inputs[slot])
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/weapons/m12-shotgun.blend'))

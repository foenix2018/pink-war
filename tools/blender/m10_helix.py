"""Chapter 10: editable HELIX research rooms, equipment and AEGIS escape deck.
blender --background --threads 4 --python tools/blender/m10_helix.py
The legacy courtyard is a reference collection; new meshes are exported in metres.
"""
import bpy,bmesh,math,json,pathlib,sys,shutil
from mathutils import Vector
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from m04_assets import Asset,G,TAU
from pwm_export import export_pwm
P=pathlib.Path(__file__).resolve().parents[2];OUT=P/'dist/assets/m10';SRC=P/'assets/m10';OUT.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((SRC/'plan.json').read_text());bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
META={};MATS={};GROUPS={};TEXT=[]
def material(name,c,rough=.5,metal=.2,glow=0,alpha=1):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,alpha);n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,alpha);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;n.inputs['Alpha'].default_value=alpha
 if glow:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=glow
 if alpha<1:m.surface_render_method='DITHERED'
 MATS[name]=m;META[name]=dict(color=c,roughness=rough,metalness=metal,emissive=glow,alpha=alpha)
for args in [('ceramic',(.70,.76,.80),.38,.12),('steel',(.28,.34,.40),.30,.8),('dark',(.035,.055,.078),.52,.5),('glass',(.24,.54,.64),.18,.25,0,.35),('ice',(.34,.83,1),.3,0,2.5),('rose',(1,.045,.33),.3,0,3),('amber',(1,.55,.17),.4,0,2),('screen',(.01,.07,.10),.35,.05,.1),('terminal-ui',(.87,.96,1),.5,0,.9)]:material(*args)
META['steel'].update(normalTexture='hideout/steel-normal.jpg',roughTexture='hideout/steel-rough.jpg',uvScale=.5)
META['ceramic'].update(normalTexture='hideout/concrete-normal.jpg',uvScale=.16)
META['terminal-ui'].update(texture='m09/terminal.png',authoredUV=True,uvScale=1)
m=MATS['terminal-ui'];n=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(P/'dist/assets/m09/terminal.png'));tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],n.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Color'],n.inputs['Emission Color'])
def part(name):
 a=Asset(name);GROUPS[name]=a;return a
def label(text,c,size=.25):
 curve=bpy.data.curves.new(text,'FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.extrude=.001
 ob=bpy.data.objects.new(text,curve);bpy.context.collection.objects.link(ob);ob.location=G(*c);ob.rotation_euler=(math.pi/2,0,0);curve.materials.append(MATS['ice']);TEXT.append(ob)
def tube(a,ma,p,q,r=.035):
 old=a.bevel;a.bevel=False;a.bar(ma,p,q,r,seg=10);a.bevel=old
# Research rooms: true gap in their fronts, opaque sliding leaves supplied by the runtime.
for room in PLAN['rooms']:
 a=part('Recherche / '+room['id']);x1,x2,z1,z2,y=room['x1'],room['x2'],room['z1'],room['z2'],room['y'];cx=(x1+x2)/2;cz=(z1+z2)/2
 for ma,yy,h in [('dark',y+.07,.14),('ceramic',y+4.27,.18)]:a.box(ma,(cx,yy,cz),(x2-x1,h,z2-z1))
 for xx in [x1+.1,x2-.1]:
  a.box('dark',(xx,y+2.1,cz),(.24,4.2,z2-z1));a.box('glass',(xx,y+2.3,cz),(.25,3.65,z2-z1-.4))
  for zz in range(round(z1+1),round(z2),4):a.box('steel',(xx,y+2.1,zz),(.38,4.2,.11))
 a.box('dark',(cx,y+2.1,z1),(x2-x1,4.2,.22));a.box('glass',(cx,y+2.3,z1+.03),(x2-x1-.3,3.65,.22))
 for lo,hi in [(x1,room['doorX']-2),(room['doorX']+2,x2)]:
  a.box('dark',((lo+hi)/2,y+2.1,z2),(hi-lo,4.2,.22));a.box('glass',((lo+hi)/2,y+2.3,z2+.03),(hi-lo-.18,3.6,.22))
 for xx in [room['doorX']-2,room['doorX']+2]:a.box('ceramic',(xx,y+1.9,z2),( .25,3.8,.48));tube(a,'ice',(xx,y+.3,z2+.27),(xx,y+3.5,z2+.27),.034)
 a.box('ceramic',(room['doorX'],y+3.9,z2),(4.2,.45,.5))
 for xx in [x1+1.0,x2-1.0]:tube(a,'ice',(xx,y+4.12,z1+1),(xx,y+4.12,z2-1),.055)
 label('HELIX / '+('RECHERCHE'if room['id']=='laboratoires'else'ARCHIVES'),(room['doorX'],y+4.05,z2+.28),.27)
# Functional bench: microscope gantries, coolant reservoirs, ring-mounted sample chambers.
a=part('Laboratoire / analyse biotique');x=-25.7;y=12
for zz in [-76,-72,-68]:
 a.box('ceramic',(x,y+.56,zz),(2.35,1.05,3.0));a.box('dark',(x,y+1.10,zz),(2.25,.08,2.8))
 for side in [-1,1]:a.box('steel',(x+side*.91,y+.55,zz),(.10,.85,2.7));tube(a,'steel',(x+side*.85,y+1.2,zz-1.2),(x+side*.85,y+2.8,zz-1.2),.065)
 a.box('steel',(x,y+2.8,zz-1.2),(1.9,.16,.35));a.bevel=False
 a.lathe('steel',(x,y+1.14,zz),[(.64,0),(.70,.08),(.68,.18),(.56,.22)],seg=32)
 a.cyl('glass',(x,y+1.95,zz),.53,1.4,seg=32);a.torus('ice',(x,y+1.28,zz),.55,.026,seg=40,tseg=6);a.torus('steel',(x,y+2.65,zz),.60,.08,seg=40,tseg=6)
 for yy in [y+1.5,y+1.85,y+2.2]:a.torus('ice',(x,yy,zz),.22,.018,seg=24,tseg=5)
 a.cyl('dark',(x,y+2.81,zz),.21,.3,seg=16);a.bevel=True
 for j in range(4):tube(a,'steel',(x-.7+j*.42,y+.4,zz+1.52),(x-.7+j*.42,y+.8,zz+1.52),.02)
 tube(a,'ice',(x-.8,y+.9,zz+1.52),(x+.8,y+.9,zz+1.52),.025)
# Server archive: real cooling slots, inset glass doors, handles, cabling and status LEDs.
a=part('Archives / baies HELIX');x=26;y=12
for zz in [-76.7,-74.3,-71.9,-69.5,-67.1]:
 a.box('dark',(x,y+1.5,zz),(2.05,3,2.12));a.box('steel',(x,y+3.05,zz),(2.12,.15,2.2))
 a.box('glass',(x-1.05,y+1.56,zz),(.035,2.65,1.85));a.bevel=False
 for j in range(12):
  a.box('steel',(x-.98,y+.30+j*.20,zz),(.04,.08,1.65));a.cyl('ice'if j%3 else'rose',(x-1.10,y+.32+j*.2,zz+.66),.021,.02,seg=8,axis='x')
 a.bevel=True;tube(a,'steel',(x-1.13,y+1,zz-.65),(x-1.13,y+1.65,zz-.65),.025)
 tube(a,'steel',(x,y+3.15,zz),(x,y+3.15,-65),.085)
# Original touch terminals, each deliberately placed behind its interaction capsule.
for number,(xx,zz)in enumerate([(-20,-70.25),(20,-70.25),(11,-45.8),(57.4,-60.8)],1):
 a=part('Terminaux / '+str(number));y=12;a.bevel=False
 a.lathe('steel',(xx,y,zz),[(0,0),(.54,0),(.59,.10),(.48,.23),(.20,.28)],seg=28)
 a.pipe('steel',[(xx,y+.2,zz),(xx,y+.8,zz-.16),(xx,y+1.35,zz-.20)],.17,bend=.25,seg=12);a.bevel=True
 a.box('dark',(xx,y+1.48,zz),(1.02,.77,.18),tilt=('X',-.28));a.bevel=False
 tube(a,'rose',(xx-.35,y+.20,zz+.38),(xx+.35,y+.20,zz+.38),.025)
 # Authored display quad, with unit UVs assigned after mesh conversion.
 a.box('terminal-ui',(xx,y+1.48,zz+.125),(.86,.59,.025),tilt=('X',-.28))
 for side in [-1,1]:a.cyl('ice',(xx+side*.32,y+1.04,zz+.20),.045,.035,seg=12,axis='z')
# Kessler private video wall is above the existing central plinth; no blocking prop in the audience area.
a=part('Bureau / liaison Kessler');a.box('steel',(0,15.1,-56.9),(10,5.4,.35));a.box('screen',(0,15.1,-56.68),(9.5,4.9,.05))
for xx in [-4.65,4.65]:tube(a,'rose',(xx,12.9,-56.60),(xx,17.3,-56.60),.05)
label('ADRIAN KESSLER',(0,16.6,-56.55),.54);label('HELIX / CANAL PRIVE',(0,15.8,-56.55),.29);label('SUPERVISION / 17.11.2189',(0,13.2,-56.55),.22)
# A narrow, protected escape bridge and the eastern deck. Geometry uses the exact physical dimensions.
a=part('AEGIS / passerelle et quai')
for f in PLAN['floors'][-2:]:
 cx=(f['x1']+f['x2'])/2;cz=(f['z1']+f['z2'])/2;a.box('ceramic',(cx,11.72,cz),(f['x2']-f['x1'],.56,f['z2']-f['z1']));a.box('dark',(cx,10.95,cz),(f['x2']-f['x1']-.4,1.0,f['z2']-f['z1']-.4))
for lo,hi,zz in [(32,44,-57),(32,44,-51),(44,72,-80),(44,72,-44)]:
 for xx in range(lo,hi+1,2):tube(a,'steel',(xx,12,zz),(xx,13.2,zz),.048)
 tube(a,'steel',(lo,13.2,zz),(hi,13.2,zz),.055);tube(a,'ice',(lo,12.18,zz),(hi,12.18,zz),.035)
for xx,lo,hi in [(72,-80,-44),(44,-80,-57),(44,-51,-44)]:
 for zz in range(lo,hi+1,2):tube(a,'steel',(xx,12,zz),(xx,13.2,zz),.048)
 tube(a,'steel',(xx,13.2,lo),(xx,13.2,hi),.055)
a.bevel=False
for r,ma in [(12.7,'amber'),(12.1,'steel'),(10.5,'ice')]:a.torus(ma,(58,12.055,-64),r,.08,seg=96,tseg=6)
for side in [-1,1]:a.box('ceramic',(58+side*2.4,12.05,-64),(.6,.10,6))
a.box('ceramic',(58,12.05,-64),(5.4,.10,.6));label('AEGIS',(58,12.08,-49),.8)
a=part('AEGIS / sas de confinement')
for zz in [-57.15,-50.85]:
 a.box('ceramic',(33,13.95,zz),(.5,3.9,.36));tube(a,'ice',(33.28,12.25,zz),(33.28,15.55,zz),.035)
a.box('dark',(33,15.94,-54),(.60,.34,6.65))
# Geometry -> semantic source collections. Only individual manufactured pieces receive small chamfers.
objects=[]
for zone,a in GROUPS.items():
 collection=bpy.data.collections.new(zone);bpy.context.scene.collection.children.link(collection)
 for(ma,bevel),b in a.parts.items():
  bmesh.ops.recalc_face_normals(b,faces=list(b.faces));me=bpy.data.meshes.new(zone+' / '+ma);b.to_mesh(me);b.free();ob=bpy.data.objects.new(zone+' / '+ma,me);collection.objects.link(ob);me.materials.append(MATS[ma]);uv=me.uv_layers.new(name='UVMap');me.update()
  for p in me.polygons:
   axis=max(range(3),key=lambda i:abs(p.normal[i]))
   coords=[me.vertices[me.loops[li].vertex_index].co for li in p.loop_indices]
   for li,co in zip(p.loop_indices,coords):
    if ma=='terminal-ui':
     # Each planar display face occupies the complete original atlas.
     a0=min(v.x for v in coords);a1=max(v.x for v in coords);h0=min(v.z for v in coords);h1=max(v.z for v in coords);uv.data[li].uv=((co.x-a0)/max(.001,a1-a0),(co.z-h0)/max(.001,h1-h0))
    else:uv.data[li].uv=(co.y,co.z)if axis==0 else(co.x,co.z)if axis==1 else(co.x,co.y)
  if bevel:
   mod=ob.modifiers.new('Chanfreins usinés','BEVEL');mod.width=.035;mod.segments=2;mod.limit_method='ANGLE';mod.angle_limit=.75
  objects.append(ob)
objects+=TEXT
# The evacuation ship is the genuine editable AEGIS aircraft already used in chapter 9.
ship_source=P/'assets/m09/PinkWars_N09_Jardins_Suspendus.blend'
with bpy.data.libraries.load(str(ship_source),link=False)as(src,dst):dst.objects=[n for n in src.objects if n.startswith('Navette AEGIS')]
collection=bpy.data.collections.new('AEGIS / navette authentique');bpy.context.scene.collection.children.link(collection)
from mathutils import Matrix
for ob in dst.objects:
 if not ob:continue
 collection.objects.link(ob);ob.matrix_world=Matrix.Translation(G(-46,-10,-150))@ob.matrix_world
 for i,m in enumerate(ob.data.materials):ob.data.materials[i]=MATS[{'ivory':'ceramic','bronze':'steel','glass-blue':'glass','cyan':'ice'}.get(m.name.split('.')[0],m.name.split('.')[0])]
 objects.append(ob)
# Editable individual leaves with genuine open / hold / close keyframes.
for door in PLAN['doors']:
 for side in [-1,1]:
  a=Asset('Porte mobile / '+door['id']+' / '+str(side));a.bevel=True;axis=door['axis'];x=door['x']+(side*door['width']/4 if axis=='x'else 0);z=door['z']+(side*door['width']/4 if axis=='z'else 0);w=door['width']/2-.04
  a.box('dark',(x,door['y']+door['height']/2,z),(w,door['height'],.16)if axis=='x'else(.16,door['height'],w))
  a.box('glass',(x,door['y']+door['height']*.53,z+.10 if axis=='x'else z),(w-.24,door['height']*.65,.035)if axis=='x'else(.035,door['height']*.65,w-.24))
  for(ma,bevel),b in a.parts.items():
   me=bpy.data.meshes.new(a.name);b.to_mesh(me);b.free();ob=bpy.data.objects.new(a.name+' / '+ma,me);bpy.context.collection.objects.link(ob);me.materials.append(MATS[ma]);ob['door_id']=door['id'];ob['runtime_dynamic']=True
   for frame,open in [(1,0),(30,1),(90,1),(120,0)]:
    shift=side*(door['width']/2+.1)*open;ob.location=G(shift if axis=='x'else 0,0,shift if axis=='z'else 0);ob.keyframe_insert(data_path='location',frame=frame)
# Source-only courtyard references make the layout editable without exporting duplicate runtime architecture.
ref=bpy.data.collections.new('Repère / siège existant');bpy.context.scene.collection.children.link(ref)
for f in PLAN['floors'][:-2]:
 me=bpy.data.meshes.new(f['id']);verts=[G(xx,f['height'],zz)for xx,zz in [(f['x1'],f['z1']),(f['x2'],f['z1']),(f['x2'],f['z2']),(f['x1'],f['z2'])]];me.from_pydata(verts,[],[(0,1,2,3)]);me.materials.append(MATS['ceramic']);ob=bpy.data.objects.new('Repère / '+f['id'],me);ref.objects.link(ob);ob.hide_render=True
sc=bpy.context.scene;sc.frame_set(1);sc.unit_settings.system='METRIC';sc['plan_m10']=json.dumps(PLAN,ensure_ascii=False);sc['chapter']=10;sc['scope']='Authored laboratories, equipment, Kessler screen, escape deck and AEGIS ship; legacy courtyard is a source-only reference.'
sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=False;sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.27,.19,.32,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for name,pos,color,power,size in [('Ciel',(-20,100,20),(.67,.76,1),40000,90),('Laboratoire',(-20,18,-70),(.45,.80,1),800,12)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.size=size;ob=bpy.data.objects.new(name,light);sc.collection.objects.link(ob);ob.location=G(*pos);ob.rotation_euler=(G(0,12,-55)-ob.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Couronne / équipement');ob=bpy.data.objects.new('Couronne / équipement',cam);sc.collection.objects.link(ob);ob.location=G(100,85,20);ob.rotation_euler=(G(12,12,-63)-ob.location).to_track_quat('-Z','Y').to_euler();cam.lens=48;sc.camera=ob
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'PinkWars_N10_Couronne_HELIX.blend'),compress=True);shutil.copyfile(SRC/'PinkWars_N10_Couronne_HELIX.blend',OUT/'PinkWars_N10_Couronne_HELIX.blend')
(OUT/'materials.json').write_text(json.dumps(META,separators=(',',':')));shutil.copyfile(SRC/'plan.json',OUT/'plan.json')
stats=export_pwm(objects,OUT/'helix.pwm.gz',META,'PinkWars_N10_Couronne_HELIX.blend');stats.update(rooms=len(PLAN['rooms']),objectives=len(PLAN['objectives']),doors=len(PLAN['doors']));(OUT/'stats.json').write_text(json.dumps(stats,indent=2));print(json.dumps(stats),flush=True)

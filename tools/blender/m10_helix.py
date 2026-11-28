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
for args in [
 ('ceramic',(.70,.76,.80),.42,.12),('steel',(.31,.37,.43),.44,.78),
 ('dark',(.045,.061,.080),.55,.47),('rubber',(.037,.046,.058),.87,.04),
 ('paving',(.72,.79,.88),.88,.08),
 ('glass',(.24,.54,.64),.22,.22,0,.32),('pane',(.28,.46,.60),.27,.22,0,.25),
 ('ice',(.34,.83,1),.3,0,2.5),('rose',(1,.077,.41),.3,0,3),
 ('amber',(1,.55,.17),.4,0,2),('screen',(.01,.07,.10),.35,.05,.1),
 ('terminal-ui',(.87,.96,1),.5,0,.9),
]:material(*args)
META['steel'].update(normalTexture='hideout/steel-normal.jpg',roughTexture='hideout/steel-rough.jpg',uvScale=.5)
META['ceramic'].update(normalTexture='hideout/concrete-normal.jpg',uvScale=.16)
META['terminal-ui'].update(texture='m09/terminal.png',authoredUV=True,uvScale=1)
META['paving'].update(texture='m10/helix-dalles.webp',normalTexture='m10/helix-dalles-normal.webp',
                      roughTexture='m10/helix-dalles-rough.webp',uvScale=.125)
m=MATS['terminal-ui'];n=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(P/'dist/assets/m09/terminal.png'));tex.image.pack();m.node_tree.links.new(tex.outputs['Color'],n.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Color'],n.inputs['Emission Color'])
nodes=MATS['paving'].node_tree.nodes;links=MATS['paving'].node_tree.links
uv=nodes.new('ShaderNodeTexCoord');tiling=nodes.new('ShaderNodeVectorMath');tiling.operation='SCALE'
tiling.inputs['Scale'].default_value=.125;links.new(uv.outputs['UV'],tiling.inputs[0])
for key,channel in [('texture','Base Color'),('normalTexture','Normal'),('roughTexture','Roughness')]:
 tex=nodes.new('ShaderNodeTexImage')
 tex.image=bpy.data.images.load(str(P/'dist/assets'/META['paving'][key]));tex.image.pack()
 links.new(tiling.outputs['Vector'],tex.inputs['Vector'])
 response=tex.outputs['Color']
 if key!='texture':tex.image.colorspace_settings.name='Non-Color'
 if channel=='Normal':
  normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.35
  links.new(response,normal.inputs['Color']);response=normal.outputs['Normal']
 links.new(response,nodes['Principled BSDF'].inputs[channel])

def part(name):
 a=Asset(name);GROUPS[name]=a;return a
def label(text,c,size=.25,yaw=0):
 curve=bpy.data.curves.new(text,'FONT');curve.body=text;curve.align_x='CENTER';curve.size=size;curve.extrude=.001
 ob=bpy.data.objects.new(text,curve);bpy.context.collection.objects.link(ob);ob.location=G(*c);ob.rotation_euler=(math.pi/2,0,yaw);curve.materials.append(MATS['ice']);TEXT.append(ob)
def tube(a,ma,p,q,r=.035):
 old=a.bevel;a.bevel=False;a.bar(ma,p,q,r,seg=10);a.bevel=old

def window_bays(a, start, end, y):
 """A single pane per bay in dry-glazed steel framing, with kick and head panels."""
 x1,z1=start;x2,z2=end
 span=math.hypot(x2-x1,z2-z1);across_z=x1==x2
 bays=max(1,math.ceil(span/3.1));width=span/bays
 def at(t,h):
  return (x1+(x2-x1)*t,y+h,z1+(z2-z1)*t)
 def profile(length,height,depth):
  return (depth,height,length) if across_z else (length,height,depth)
 a.bevel=False
 a.box('ceramic',at(.5,.255),profile(span,.51,.195))
 a.box('steel',at(.5,.535),profile(span,.060,.165))
 a.box('ceramic',at(.5,3.945),profile(span,.51,.195))
 a.box('steel',at(.5,3.670),profile(span,.074,.160))
 pane=a.bm('pane')
 for bay in range(bays):
  inset=.055/width
  lo=(bay+inset)/bays;hi=(bay+1-inset)/bays
  corners=[at(lo,.540),at(hi,.540),at(hi,3.680),at(lo,3.680)]
  pane.faces.new([pane.verts.new(G(*corner)) for corner in corners])
 for bay in range(bays+1):
  a.box('steel',at(bay/bays,2.10),profile(.11,4.19,.212))
 a.bevel=True

# The leads, bottom rails and framing stay in the existing wall footprints.
for room in PLAN['rooms']:
 a=part('Recherche / '+room['id']);x1,x2,z1,z2,y=room['x1'],room['x2'],room['z1'],room['z2'],room['y'];cx=(x1+x2)/2;cz=(z1+z2)/2
 a.box('ceramic',(cx,y+4.27,cz),(x2-x1,.18,z2-z1))
 for xx in [x1+.1,x2-.1]:window_bays(a,(xx,z1+.1),(xx,z2-.1),y)
 window_bays(a,(x1+.13,z1+.1),(x2-.13,z1+.1),y)
 for lo,hi in [(x1,room['doorX']-2),(room['doorX']+2,x2)]:
  window_bays(a,(lo+.12,z2-.1),(hi-.12,z2-.1),y)
 for xx in [room['doorX']-2,room['doorX']+2]:a.box('ceramic',(xx,y+1.9,z2),( .25,3.8,.48));tube(a,'ice',(xx,y+.3,z2+.27),(xx,y+3.5,z2+.27),.034)
 a.box('ceramic',(room['doorX'],y+3.9,z2),(4.2,.45,.5))
 for xx in [x1+1.0,x2-1.0]:
  for zz in [z1+3,z1+9,z1+15,z1+20]:
   a.box('steel',(xx,y+4.13,zz),(.23,.105,2.34))
   tube(a,'ice',(xx,y+4.068,zz-1.05),(xx,y+4.068,zz+1.05),.035)
 label('HELIX / '+('RECHERCHE'if room['id']=='laboratoires'else'ARCHIVES'),(room['doorX'],y+4.05,z2+.28),.27)

# Three analysis stages share a rig and differ in sample vessel and phase readout.
a=part('Laboratoire / analyse biotique');x=-25.7;y=12
for index,zz in enumerate([-76,-72,-68]):
 r=[.55,.63,.48][index];cap=[2.50,2.71,2.31][index]
 signal=['ice','rose','amber'][index]
 a.box('steel',(x,y+.12,zz),(2.24,.23,2.73))
 a.box('ceramic',(x-.13,y+.60,zz),(1.99,.76,2.70))
 a.box('dark',(x,y+1.069,zz),(2.37,.15,2.89))
 a.box('steel',(x+.964,y+.62,zz),(.20,.67,2.5))
 a.box('rubber',(x+1.066,y+.61,zz),(.028,.467,2.17))
 for k in range(6):
  a.box('steel',(x+1.092,y+.40+k*.062,zz),(.044,.022,1.47))
 a.box('dark',(x+.98,y+.80,zz+.96),(.31,.17,.31))
 a.cyl(signal,(x+1.141,y+.80,zz+.96),.042,.024,12,axis='x')
 for offset in [-1,1]:
  a.box('dark',(x-1.035,y+.58,zz+offset*1.16),(.16,.87,.15))
  a.cyl('steel',(x+.86,y+1.148,zz+offset*1.12),.045,.046,10)
 a.bevel=False
 a.lathe('steel',(x,y+1.14,zz),[(r+.13,0),(r+.13,.08),(r+.05,.16),(r-.03,.24)],seg=24)
 a.cyl('glass',(x,y+(1.37+cap)/2,zz),r,cap-1.37,seg=28,caps=False)
 for h,ma in [(1.37,'rubber'),(1.44,signal),(cap,'steel')]:
  a.torus(ma,(x,y+h,zz),r+.015,.030 if ma==signal else .053,seg=28,tseg=6)
 a.cyl('steel',(x,y+cap+.07,zz),r-.025,.142,24)
 a.cyl('dark',(x,y+cap+.22,zz),.20,.216,12)
 a.cyl('steel',(x,y+1.49,zz),.21,.14,16)
 a.cyl('ceramic',(x,y+(cap+1.55)/2,zz),.106,cap-1.57,16,r2=.06)
 a.torus(signal,(x,y+1.64,zz),.22,.015,seg=20,tseg=5)
 a.bevel=True
 for ox,oz in [(-.66,-.6),(.69,-.6),(-.60,.69)]:
  tube(a,'steel',(x+ox,y+1.15,zz+oz),(x+ox,y+cap,zz+oz),.037)
  a.cyl('steel',(x+ox,y+1.17,zz+oz),.074,.10,10)
 a.bevel=False
 a.pipe('rubber',[(x,y+cap+.32,zz),(x,y+cap+.42,zz-.64),
                  (x-.76,y+cap+.42,zz-1.01),(x-1.05,y+1.17,zz-1.05)],.031,bend=.16,seg=8)
 a.bevel=True

# Recessed rack hardware, perforated-looking grilles, one continuous power tray.
a=part('Archives / baies HELIX');x=26;y=12
for index,zz in enumerate([-76.7,-74.3,-71.9,-69.5,-67.1],1):
 a.box('dark',(x+.14,y+1.5,zz),(1.69,2.88,2.08))
 a.box('steel',(x,y+.12,zz),(2.11,.24,2.18))
 a.box('steel',(x,y+2.915,zz),(2.12,.167,2.15))
 for side in [-1,1]:
  a.box('ceramic',(x-.961,y+1.57,zz+side*.982),(.19,2.71,.12))
  a.box('rubber',(x-.94,y+1.54,zz+side*.892),(.091,2.63,.075))
  for h in [.66,2.43]:a.cyl('steel',(x-1.06,y+h,zz+side*.98),.042,.033,10,axis='x')
 a.box('dark',(x-.935,y+2.755,zz),(.15,.18,1.85))
 label('R'+str(index).zfill(2),(x-1.02,y+2.71,zz),.133,-math.pi/2)
 a.bevel=False
 for bay in range(8):
  h=y+.40+bay*.286
  a.box('steel',(x-.853,h,zz),(.112,.219,1.72))
  for row in range(3):a.box('rubber',(x-.914,h+(row-1)*.046,zz+.09),(.018,.022,1.24))
  if bay%2==index%2:
   a.cyl('rose' if bay==4 else 'ice',(x-.927,h,zz+.756),.022,.026,8,axis='x')
  tube(a,'steel',(x-.925,h-.043,zz-.69),(x-.925,h+.046,zz-.69),.020)
 a.bevel=True
 if index%2==0:
  a.bevel=False
  pane=a.bm('pane')
  pane.faces.new([pane.verts.new(G(x-1.018,y+h,zz+z)) for h,z in [( .27,-.92),(.27,.92),(2.66,.92),(2.66,-.92)]])
  a.bevel=True
  tube(a,'steel',(x-1.055,y+1.08,zz-.76),(x-1.055,y+1.69,zz-.76),.022)
 for side in [-1,1]:
  a.cyl('steel',(x+.28,y+3.021,zz+side*.36),.104,.12,12)
  a.bevel=False
  a.pipe('rubber',[(x+.28,y+3.04,zz+side*.36),(x+.28,y+3.22,zz+side*.36),
                   (x-.12,y+3.26,zz+side*.36)],.038,bend=.08,seg=8)
  a.bevel=True
a.box('steel',(x-.15,y+3.241,-72),(.33,.125,12.26))
a.box('rubber',(x-.145,y+3.28,-72),(.22,.087,12.10))

# Original touch terminals, each deliberately placed behind its interaction capsule.
for number,(xx,zz,tag)in enumerate([(-20,-70.25,'BIO-01'),(20,-70.25,'DATA-02'),(11,-45.8,'LOCK-03'),(57.4,-60.8,'AEGIS-04')],1):
 a=part('Terminaux / '+str(number));y=12;a.bevel=False
 a.lathe('steel',(xx,y,zz),[(0,0),(.52,0),(.54,.055),(.44,.126),(.32,.167)],seg=18)
 a.cyl('rubber',(xx,y+.041,zz),.498,.062,18)
 a.bevel=True
 a.box('dark',(xx,y+.62,zz-.034),(.53,.89,.394),tilt=('X',-.12))
 a.box('ceramic',(xx,y+.66,zz+.192),(.407,.735,.085),tilt=('X',-.12))
 a.box('steel',(xx,y+1.12,zz-.15),(.68,.306,.192))
 a.box('dark',(xx,y+1.48,zz),(1.02,.77,.178),tilt=('X',-.28))
 a.box('steel',(xx,y+1.076,zz+.109),(1.02,.096,.213),tilt=('X',-.28))
 a.bevel=False
 for j in range(5):a.box('rubber',(xx,y+.41+j*.072,zz+.276),(.28,.019,.017))
 for s in [-1,1]:
  tube(a,'steel',(xx+s*.456,y+1.221,zz+.189),(xx+s*.456,y+1.385,zz+.224),.021)
  a.cyl('amber' if number>=3 else 'ice',(xx+s*.294,y+1.077,zz+.23),.028,.029,10,axis='z')
 # Authored display quad, with unit UVs assigned after mesh conversion.
 a.box('terminal-ui',(xx,y+1.48,zz+.125),(.86,.59,.025),tilt=('X',-.28))
 label(tag,(xx,y+1.055,zz+.226),.07)
# Kessler private video wall is above the existing central plinth; no blocking prop in the audience area.
a=part('Bureau / liaison Kessler');a.box('steel',(0,15.1,-56.9),(10,5.4,.35));a.box('screen',(0,15.1,-56.68),(9.5,4.9,.05))
for xx in [-4.65,4.65]:tube(a,'rose',(xx,12.9,-56.60),(xx,17.3,-56.60),.05)
label('ADRIAN KESSLER',(0,16.6,-56.55),.54);label('HELIX / CANAL PRIVE',(0,15.8,-56.55),.29);label('SUPERVISION / 17.11.2189',(0,13.2,-56.55),.22)
# A narrow, protected escape bridge and the eastern deck. Geometry uses the exact physical dimensions.
a=part('AEGIS / passerelle et quai')
for f in PLAN['floors'][-2:]:
 cx=(f['x1']+f['x2'])/2;cz=(f['z1']+f['z2'])/2
 a.box('paving',(cx,11.72,cz),(f['x2']-f['x1'],.56,f['z2']-f['z1']))
 a.box('dark',(cx,10.95,cz),(f['x2']-f['x1']-.4,1.0,f['z2']-f['z1']-.4))
 z1,z2=f['z1'],f['z2']
 for xx in range(round(f['x1']+2),round(f['x2']-1),4):
  a.box('steel',(xx,10.62,cz),(.28,.32,z2-z1-.35))
  for zz in [z1+.67,z2-.67]:
   a.box('steel',(xx,11.43,zz),(.31,.95,.86))
   tube(a,'steel',(xx,10.66,cz),(xx,11.75,zz),.089)
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
 a.box('ceramic',(33,13.95,zz),(.5,3.9,.36))
a.box('steel',(33,12.077,-54),(.52,.15,5.97))
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
   mod=ob.modifiers.new('Chanfreins usinés','BEVEL');mod.width=.035;mod.segments=2 if zone.startswith('Terminaux /') else 1;mod.limit_method='ANGLE';mod.angle_limit=.75
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

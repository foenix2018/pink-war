"""blender --background --python tools/build-level1-blender.py
Original Vesper mission art. Same metre-based JSON drives physics and modelling.
Exports editable .blend, GLB and bundled mesh data (no network loader in game).
"""
import bpy,math,random,json,pathlib,struct,base64,zlib
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[1]; D=json.loads((P/'assets/level1/layout.json').read_text());random.seed(33207)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
colors={'brick':(.40,.25,.17,1),'plaster':(.63,.60,.51,1),'car-blue':(.31,.39,.40,1),'car-cream':(.61,.59,.49,1),'foliage':(.3,.5,.2,1),'concrete':(.40,.46,.43,1),'steel':(.24,.32,.33,1),'rust':(.31,.16,.095,1),'dark':(.035,.06,.063,1),'glass':(.10,.25,.27,1),'leaf':(.16,.29,.12,1),'bark':(.15,.105,.06,1),'amber':(.95,.55,.18,1),'road':(.12,.17,.17,1),'white':(.66,.70,.62,1)}
mats={}
for name,c in colors.items():
 m=bpy.data.materials.new(name);m.diffuse_color=c;m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=c;n.inputs['Roughness'].default_value=.85 if name not in ['steel','glass'] else .38;n.inputs['Metallic'].default_value=.72 if name=='steel' else .08
 if name=='amber':n.inputs['Emission Color'].default_value=c;n.inputs['Emission Strength'].default_value=1.6
 mats[name]=m
for name,m in mats.items():
 source=P/'assets/level1/textures'/((name if name!='white' else 'plaster')+'-color.png')
 if not source.exists():continue
 nodes=m.node_tree.nodes;links=m.node_tree.links;principled=nodes.get('Principled BSDF');tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(source),check_existing=True);tex.image.pack();links.new(tex.outputs['Color'],principled.inputs['Base Color'])
 if name=='foliage':links.new(tex.outputs['Alpha'],principled.inputs['Alpha']);m.surface_render_method='DITHERED';m.use_backface_culling=False
 for suffix in ['height','surface']:
  file=source.with_name(source.name.replace('-color.png','-'+suffix+'.png'))
  if not file.exists():continue
  n=nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(file),check_existing=True);n.image.colorspace_settings.name='Non-Color';n.image.pack()
  if suffix=='height':bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.25;bump.inputs['Distance'].default_value=.035;links.new(n.outputs['Color'],bump.inputs['Height']);links.new(bump.outputs['Normal'],principled.inputs['Normal'])
  else:sep=nodes.new('ShaderNodeSeparateColor');links.new(n.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],principled.inputs['Roughness']);links.new(sep.outputs['Blue'],principled.inputs['Metallic'])
# Game coordinates x,y,z -> Blender x,-z,y. Export returns the game coordinates.
def V(p):return Vector((p[0],-p[2],p[1]))
def box(name,mat,x,y,z,w,h,d,bevel=.04,rot=0):
 vertices=[(sx*w/2,sz*d/2,sy*h/2) for sx,sz,sy in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=V((x,y,z));o.rotation_euler.z=-rot;mesh.materials.append(mats[mat])
 if bevel:
  mod=o.modifiers.new('worn edges','BEVEL');mod.width=min(bevel,min(w,h,d)*.24);mod.segments=1;o.modifiers.new('weighted surface normals','WEIGHTED_NORMAL')
 return o
def rod(mat,a,b,r=.06,n=10):
 a,b=V(a),V(b);delta=b-a;verts=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for z in [-delta.length/2,delta.length/2] for i in range(n)]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('conduit');mesh.from_pydata(verts,[],faces);mesh.materials.append(mats[mat]);
 for p in mesh.polygons:p.use_smooth=p.index>1
 o=bpy.data.objects.new('pipe / branch',mesh);bpy.context.collection.objects.link(o);o.location=(a+b)*.5;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def gameMesh(name,mat,verts,faces):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata([tuple(V(p)) for p in verts],[],faces);mesh.materials.append(mats[mat]);o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o
def cable(mat,points,r=.025):
 for a,b in zip(points,points[1:]):rod(mat,a,b,r,8)
def wornBand(part,amount=.09):
 # A chipped top contour stays within the masonry's existing collision extent.
 # Wide bands retain a planar central face so brick PBR maps read at real scale.
 x,y,z,w,h,d=[part[k] for k in ['x','y','z','w','h','d']];alongX=w>d;length=w if alongX else d;depth=d if alongX else w
 profile=[(-length/2,-h/2),(length/2,-h/2),(length/2,h/2-.035),(length*.28,h/2),(.12*length,h/2-amount),(-length*.04,h/2-.02),(-length*.23,h/2-amount*.6),(-length/2,h/2-.04)]
 verts=[]
 for side in [-1,1]:
  for a,yy in profile:verts.append((x+a,y+yy,z+side*depth/2) if alongX else (x+side*depth/2,y+yy,z+a))
 n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 if not alongX:faces=[tuple(reversed(f)) for f in faces]
 o=gameMesh('chipped masonry contour',part['mat'],verts,faces);bevel=o.modifiers.new('rounded broken lip','BEVEL');bevel.width=.018;bevel.segments=1;o.modifiers.new('masonry face normals','WEIGHTED_NORMAL');return o
def glassShards(part):
 # Three genuinely irregular edge remnants leave most of each broken bay open.
 x,y,z,w,h,d=[part[k] for k in ['x','y','z','w','h','d']];alongX=w>d;length=w if alongX else d
 profiles=[[(-.5,-.5),(-.5,.42),(-.31,.07),(-.35,-.13),(-.16,-.5)],[(.5,.5),(.5,-.15),(.34,.03),(.22,.5)],[(.5,-.5),(.10,-.5),(.33,-.28)]]
 for profile in profiles:
  verts=[(x+a*length,y+b*h,z) if alongX else (x,y+b*h,z+a*length) for a,b in profile];gameMesh('jagged surviving glass','glass',verts,[tuple(range(len(verts)))])
def chamferTower(name,mat,x,z,w,d,bottom,height,cut=.8,lean=0):
 # An octagonal floorplate and inset crown eliminate cubic skyline silhouettes.
 cut=min(cut,min(w,d)*.2);ring=[(-w/2+cut,-d/2),(w/2-cut,-d/2),(w/2,-d/2+cut),(w/2,d/2-cut),(w/2-cut,d/2),(-w/2+cut,d/2),(-w/2,d/2-cut),(-w/2,-d/2+cut)]
 verts=[(x+xx+(lean if upper else 0),bottom+(height if upper else 0),z+zz) for upper in [False,True] for xx,zz in ring];faces=[tuple(range(8)),tuple(reversed(range(8,16)))]+[(i+8,(i+1)%8+8,(i+1)%8,i) for i in range(8)];return gameMesh(name,mat,verts,faces)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);template=bpy.context.object;ico=template.data.copy();bpy.data.objects.remove(template,do_unlink=True)
def stone(mat,x,y,z,sx,sy,sz):
 mesh=ico.copy();mesh.materials.append(mats[mat]);
 if mat in ['leaf','bark']:
  for polygon in mesh.polygons:polygon.use_smooth=True
 o=bpy.data.objects.new('foliage / fracture',mesh);bpy.context.collection.objects.link(o);o.location=V((x,y,z));o.scale=(sx,sz,sy);o.rotation_euler=(random.random(),random.random(),random.random()*6);return o
print('MODELLING START',flush=True)
# Terrain, asphalt, broken pavements. Long seams, wet depressions, rubble below foot height.
box('Terrain','road',3,-.13,10,170,.24,230,0)
for x in [-12,12]:box('raised cracked pavement','concrete',x,-.03,27,3,.06,44)
for z in [49,15,-16]:box('transverse expansion seam','dark',3,.007,z,60,.015,.07,0)
for z in range(-12,50,5):box('worn street stripe','amber',0,.012,z,.10,.014,1.8,0)
# Real hollow buildings: floors, jambs, broken glazing and masonry are independent.
for index,part in enumerate(D['buildingParts']):
 if part.get('window'):
  if part['broken'] and index%3==0:continue
  if part['broken']:glassShards(part)
  else:box('old glazing',part['mat'],part['x'],part['y'],part['z'],part['w'],part['h'],part['d'],.005)
 elif not part.get('slab') and part['h']<=1.1 and max(part['w'],part['d'])>2 and index%3!=0:wornBand(part,.12 if part['y']>9 else .065)
 else:box('exposed floor' if part.get('slab') else 'ruined masonry',part['mat'],part['x'],part['y'],part['z'],part['w'],part['h'],part['d'],.055)
# Broken edges have irregular concrete fragments and rusty reinforcement.
for index,(x,z,w,d,h) in enumerate(D['buildings']):
 top=(max(3,int(h/3.6))-2)*3.6
 for k in range(10):
  xx=x+w*.14+random.uniform(-.8,.4);zz=z+(random.random()-.5)*d
  stone('concrete',xx,top+.15,zz,.25,.19,.38)
  rod('rust',(xx,top,zz),(xx+random.uniform(-.1,.4),top+random.uniform(.4,1.4),zz+.15),.025)
 streetSide=1 if x<0 else -1;frontX=x+streetSide*(w/2+.08)
 # old apartments have battered balcony grids; ORDRE later threaded conduits through them.
 for level in range(1,max(2,int(h/3.6)-1),2):
  yy=level*3.6
  for zz in [z-d*.28,z+d*.23]:
   box('broken balcony deck','concrete',frontX+streetSide*.42,yy,zz,.95,.18,2.4,.045)
   rod('rust',(frontX+streetSide*.82,yy,zz-1.2),(frontX+streetSide*.82,yy+1,zz-1.2),.022)
   rod('rust',(frontX+streetSide*.82,yy,zz+1.2),(frontX+streetSide*.82,yy+.9,zz+1.2),.022)
   cable('rust',[(frontX+streetSide*.82,yy+1,zz-1.2),(frontX+streetSide*.95,yy+.93,zz-.4),(frontX+streetSide*.87,yy+.66,zz+.35),(frontX+streetSide*.82,yy+.9,zz+1.2)],.022)
   for offset in [-.8,-.3,.2,.7]:rod('rust',(frontX+streetSide*.82,yy+.08,zz+offset),(frontX+streetSide*.86,yy+.82,zz+offset+.04),.014,8)
 for zz in [z-d*.33,z+d*.32]:rod('rust',(frontX,1,zz),(frontX,top+2,zz),.09)
 # disconnected future service rack, mechanically fitted to the old wall
 cabinetZ=z+8 if index==0 else z
 box('ORDRE service cabinet','steel',frontX+streetSide*.15,1.6,cabinetZ,.32,2.2,1.6,.04)
 for k in range(5):box('cabinet grille','dark',frontX+streetSide*.33,1.0+k*.28,cabinetZ,.04,.055,1.5,.005)
 # Historic stone cornices and arched window lintels distinguish old Vesper
 # apartment houses from the ribbed industrial installations added by ORDRE.
 if index in [0,2,6]:
  for level in range(1,max(2,int(h/3.6)-1)):
   yy=level*3.6
   box('weathered stone cornice','plaster',frontX+streetSide*.12,yy+.13,z,.37,.16,d-.25,.035)
   if level%2==0:
    for zz in [z-d*.29,z,z+d*.29]:
     pts=[(frontX+streetSide*.22,yy+2.35+.44*math.sin(math.pi*j/8),zz-.85+1.7*j/8) for j in range(9)]
     cable('plaster',pts,.105)
 else:
  for zz in [z-d*.36,z+d*.36]:
   cable('steel',[(frontX+streetSide*.13,.5,zz),(frontX+streetSide*.13,3.4,zz),(frontX+streetSide*.40,3.8,zz),(frontX+streetSide*.40,min(h-1,15),zz)],.11)
   for yy in range(4,min(15,int(h)),3):box('conduit bracket','rust',frontX+streetSide*.4,yy,zz,.40,.08,.38,.02)
 # shallow debris within the structural footprint; open routes remain clear
 for k in range(10):stone('brick' if index in [0,2,6] else 'concrete',frontX-streetSide*.6,.08,z+(random.random()-.5)*d,.20,.12,.28)
# Newly opened courtyard and annexe: the same metric parts define their colliders.
for p in D.get('courtyardParts',[]):
 if p.get('cover') and p['mat']=='concrete':
  # Profiled civil-defence barriers: flared feet, inclined shoulders and worn paint.
  # Keep the authored maximum footprint used by the conservative gameplay proxy.
  x,y,z,w,h,d=[p[k] for k in ['x','y','z','w','h','d']];along=w>=d;length=w if along else d;thickness=d if along else w;base=y-h/2
  cross=[(-thickness*.5,0),(thickness*.5,0),(thickness*.5,.16),(thickness*.39,h*.43),(thickness*.30,h-.08),(thickness*.24,h),(-thickness*.24,h),(-thickness*.30,h-.08),(-thickness*.39,h*.43),(-thickness*.5,.16)]
  verts=[(x+end*length/2,base+yy,z+zz) if along else (x+zz,base+yy,z+end*length/2) for end in [-1,1] for zz,yy in cross];n=len(cross)
  faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  if along:faces=[tuple(reversed(face)) for face in faces]
  o=gameMesh('profiled civil defence barrier','concrete',verts,faces);mod=o.modifiers.new('chipped edges','BEVEL');mod.width=.025;mod.segments=1;o.modifiers.new('barrier face normals','WEIGHTED_NORMAL')
  for offset in [-.28,.28]:
   xx=x+offset*length if along else x;zz=z if along else z+offset*length
   rod('rust',(xx-.09 if along else xx,base+h+.005,zz if along else zz-.09),(xx+.09 if along else xx,base+h+.005,zz if along else zz+.09),.018,6)
  for k in range(3):
   alongPos=(k-1)*length*.23
   if along:box('worn evacuation paint','car-cream',x+alongPos,base+h*.56,z+thickness*.365,.20,.28,.01,.002,0)
   else:box('worn evacuation paint','car-cream',x+thickness*.365,base+h*.56,z+alongPos,.01,.28,.20,.002,0)
  for k in range(3):stone('concrete',x+random.uniform(-w*.4,w*.4),.06,z+d*.7+random.uniform(.05,.22),.12,.07,.17)
 else:box(p['id'],p['mat'],p['x'],p['y'],p['z'],p['w'],p['h'],p['d'],.035)
# Lab, cover, fences, traverse surfaces share collider geometry.
for b in D['obstacles']:
 if b.get('building') or b.get('liftId') or b.get('campaignTerminal'):continue
 if b.get('buildingPart') or b.get('courtyardPart') or 'vehicle' in b:continue
 mat='steel' if b['surface']=='metal' else 'white' if b.get('cover') else 'concrete'
 if b.get('fence'):
  # Waist rails + uprights, same full extent as collision footprint.
  if b['hx']<b['hz']:
   box('perimeter rail','steel',b['x'],.98,b['z'],.14,.08,b['hz']*2)
   for z in range(int(b['z']-b['hz']),int(b['z']+b['hz'])+1,3):box('fence post','steel',b['x'],.52,z,.14,1.04,.14)
  else:
   box('perimeter rail','steel',b['x'],.98,b['z'],b['hx']*2,.08,.14)
   for x in range(int(b['x']-b['hx']),int(b['x']+b['hx'])+1,3):box('fence post','steel',x,.52,b['z'],.14,1.04,.14)
 else:
  box('cover' if b.get('cover') else 'level structure',mat,b['x'],b['y']+b['height']/2,b['z'],b['hx']*2,b['height'],b['hz']*2,.065 if not b.get('walkableSurface') else .016)
  if b.get('cover'):box('cover worn band','amber',b['x'],b['height']*.78,b['z']+b['hz']+.008,b['hx']*1.75,.08,.018,0)
# Curved car shells with crushed roofs, exposed wheel arches and dark interiors.
def car(c):
 x,z,w,d,h,yaw=c['x'],c['z'],c['w'],c['d'],c['h'],c['yaw'];paint=c['paint'];kind=c['kind'];co,si=math.cos(yaw),math.sin(yaw)
 def point(a,y,b):return(x+a*co+b*si,y,z-a*si+b*co)
 def panel(name,mat,a,y,b,ww,hh,dd,bevel=.025):
  px,py,pz=point(a,y,b);return box(name,mat,px,py,pz,ww,hh,dd,bevel,yaw)
 def line(mat,a,b,r):return rod(mat,point(*a),point(*b),r)
 def tire(side,zz):
  # Six rounded sidewall rings around a 16-sided tyre, with recessed hubs.
  # The centre is a real axle instead of the former flat octagonal cap.
  profiles=[(-.09,.23),(-.12,.30),(-.075,.355),(.075,.355),(.12,.30),(.09,.23)]
  verts=[];n=16
  for offset,radius in profiles:
   for j in range(n):
    a=j*math.tau/n;verts.append(point(side*w*.49+offset,.38+math.sin(a)*radius,zz+math.cos(a)*radius))
  faces=[(ring*n+j,ring*n+(j+1)%n,((ring+1)%len(profiles))*n+(j+1)%n,((ring+1)%len(profiles))*n+j) for ring in range(len(profiles)) for j in range(n)]
  o=gameMesh('rounded tyre sidewall','dark',verts,[tuple(reversed(f)) for f in faces])
  for polygon in o.data.polygons:polygon.use_smooth=True
  line('rust',(side*w*.49,.38,zz),(side*(w*.49+.125),.38,zz),.215)
  line('steel',(side*(w*.49+.12),.38,zz),(side*(w*.49+.14),.38,zz),.065)
  for j in range(5):
   a=j*math.tau/5;line('dark',(side*(w*.49+.13),.38+math.sin(a)*.085,zz+math.cos(a)*.085),(side*(w*.49+.13),.38+math.sin(a)*.17,zz+math.cos(a)*.17),.021)
 # Rolled coachwork built as a tapered longitudinal shell, not a scaled cube.
 sections=[(-d*.5,w*.37,.40),(-d*.45,w*.47,.62),(-d*.24,w*.50,.82),(d*.20,w*.48,.82),(d*.43,w*.45,.62),(d*.5,w*.36,.38)]
 verts=[]
 for zz,half,yy in sections:
  for xx,y in [(-half,.35),(-half,yy),(-half*.86,yy+.10),(half*.86,yy+.10),(half,yy),(half,.35)]:verts.append(tuple(V(point(xx,y,zz))))
 faces=[]
 for j in range(len(sections)-1):
  for k in range(6):faces.append((j*6+k,j*6+(k+1)%6,(j+1)*6+(k+1)%6,(j+1)*6+k))
 faces.extend([tuple(reversed(range(6))),tuple(range((len(sections)-1)*6,len(sections)*6))]);mesh=bpy.data.meshes.new('corroded coachwork');mesh.from_pydata(verts,[],faces);mesh.materials.append(mats[paint]);o=bpy.data.objects.new('rusted '+kind+' shell',mesh);bpy.context.collection.objects.link(o);o.modifiers.new('coachwork edge wear','BEVEL').width=.025;o.modifiers.new('coachwork normals','WEIGHTED_NORMAL')
 roofHeight=h-.10;roofDepth=d*(.69 if kind in ['rescue','bus'] else .35);roofZ=-d*.12
 # Exposed cabin is an open trapezoidal frame. The roof tapers into sloped
 # windscreens; a large opaque black cuboid no longer fills the windows.
 panel('dark floor pan','dark',0,.79,roofZ,w*.76,.075,roofDepth,.01)
 roofCorners=[(-w*.33,roofHeight-.02,roofZ-roofDepth*.43),(w*.34,roofHeight,roofZ-roofDepth*.43),(w*.32,roofHeight-.055,roofZ+roofDepth*.42),(-w*.34,roofHeight-.025,roofZ+roofDepth*.42)]
 roofVerts=[point(*p) for p in roofCorners];roofVerts+=[point(p[0],p[1]-.05,p[2]) for p in roofCorners]
 gameMesh('creased tapered roof','rust',roofVerts,[(2,1,0),(3,2,0),(5,6,7,4),(1,5,4,0),(2,6,5,1),(3,7,6,2),(0,4,7,3)])
 for side in [-1,1]:
  for zz in [-roofDepth/2,roofDepth/2]:line(paint,(side*w*.43,.8,roofZ+zz),(side*w*.34,roofHeight,roofZ+zz*.86),.035)
  # steel A/B pillars reveal the vacant seats and missing side windows
  line(paint,(side*w*.36,.85,roofZ),(side*w*.36,roofHeight,roofZ),.027)
  for zz in [-d*.31,d*.29]:
   tire(side,zz)
   # Rolled wheel-arch trim follows the tyre with a small visible suspension gap.
   pts=[point(side*w*.5,.36+.40*math.sin(j*math.pi/10),zz+.40*math.cos(j*math.pi/10)) for j in range(11)];cable(paint,pts,.025)
  panel('scored door','rust',side*w*.48,.64,-d*.10,.045,.38,d*.32,.006)
  panel('door handle','steel',side*w*.51,.80,-d*.06,.04,.035,.22,.004)
 # windscreens are shattered, leaving only a small angled remnant
 gameMesh('sloped broken windscreen','glass',[point(-w*.36,.88,roofZ+roofDepth*.50),point(-w*.31,roofHeight-.06,roofZ+roofDepth*.43),point(w*.06,roofHeight-.06,roofZ+roofDepth*.43),point(-w*.08,.99,roofZ+roofDepth*.48)],[(0,1,2,3)])
 hood=panel('buckled hood','rust',.10,.80,d*.30,w*.82,.07,d*.27,.035);hood.rotation_euler.x=.035
 for side in [-1,1]:panel('unlit headlight','glass',side*w*.32,.59,d*.49,w*.20,.13,.055,.015)
 panel('broken bumper','steel',.06,.40,d*.52,w*.94,.12,.085,.018)
 for zz in [-roofDepth*.25,roofDepth*.2]:
  panel('abandoned seat base','dark',0,.84,roofZ+zz,w*.65,.12,.32,.035)
  panel('tilted seat back','dark',0,min(roofHeight-.12,1.03),roofZ+zz-.13,w*.63,.26,.10,.04)
 if kind=='bus':
  for zz in [-d*.23,0,d*.20]:panel('bus window sill','steel',0,1.14,zz,w*.85,.065,.08,.01)
for c in D['cars']:car(c)
# Steel support columns and strings keep raised traversal structurally credible.
for s in D['stairs']:
 for side in [-1,1]:rod('rust',(s['x']+side*2.35,0,s['bottomZ']),(s['x']+side*2.35,s['height']-.15,s['topZ']),.12)
# Open laboratory roof fragments, trusses, pipes. Corridor remains visibly open north and south.
for x in [-10,10]:
 for z in [50,60,70]:box('lab steel column','steel',x,3,z,.25,6,.25)
for z in [50,60,70]:rod('rust',(-10,5.6,z),(10,5.6,z),.11)
for x,z,w,d in [(-7,65,5,8),(7,57,5,11),(-7,53,5,4)]:box('roof fragments','concrete',x,5.7,z,w,.16,d,.10)
for x in [-8,8]:rod('steel',(x,4.2,51),(x,4.2,69),.14)
for z in [52,56,60,64,68]:rod('rust',(-10,5.5,z),(-6,5.8,z+.4),.025)
for x in [-6,6]:box('interior floor grooves','dark',x,.012,60,.05,.02,19,0)
# Disconnected city services sag naturally over the street, well above eye
# height and the playable route. Their silhouette makes ruin scale readable.
for z,start,end in [(35,9.4,10.5),(17,13,11.5),(-4,9.5,10.7)]:
 for k in range(3):
  points=[]
  for j in range(15):
   t=j/14;points.append((-13+28*t,start+(end-start)*t-2.8*4*t*(1-t)+k*.18,z+math.sin(t*math.pi)*.65+k*.27))
  cable('dark',points,.032)
 # Dropped insulated end stays against the façade, clear of feet and weapons.
 cable('rust',[(-12.9,start,z),(-12.9,start-1,z+.1),(-12.75,start-2,z+.18),(-12.9,start-2.3,z+.35)],.035)
# Exterior suspended transport remnants frame the combat spaces.
for x in [-10,10]:rod('steel',(x,0,18),(x,8,18),.22)
box('broken viaduct left','concrete',-11,8.2,18,15,.45,4,.14)
box('broken viaduct right','concrete',11,8.2,18,9,.45,4,.14)
for x in [-3,-2.5,6.2,6.6]:rod('rust',(x,8.25,17.8),(x+random.uniform(-.4,.4),7.5,17.4),.035)
# Lift shaft is exposed scaffolding, and actual carriage is rendered separately at runtime.
for x in [26,32]:
 for z in [-48,-42]:rod('steel',(x,0,z),(x,7,z),.10)
rod('steel',(26,7,-48),(32,7,-48),.12);rod('steel',(26,7,-42),(32,7,-42),.12)
# Detailed alpha foliage: separate stems, leaves and fern fronds, with no sphere canopies.
def leafCard(center,width,height,angle=0,tilt=0):
 x,y,z=center;co,si=math.cos(angle),math.sin(angle);verts=[]
 for xx,yy in [(-width/2,-height/2),(width/2,-height/2),(width/2,height/2),(-width/2,height/2)]:
  verts.append(tuple(V((x+xx*co,y+yy*math.cos(tilt),z+xx*si+yy*math.sin(tilt)))))
 mesh=bpy.data.meshes.new('leaf cluster');mesh.from_pydata(verts,[],[(0,1,2,3)]);mesh.materials.append(mats['foliage']);uv=mesh.uv_layers.new(name='UVMap')
 for k,l in enumerate(mesh.loops):uv.data[k].uv=[(0,0),(1,0),(1,1),(0,1)][l.vertex_index]
 o=bpy.data.objects.new('individual leaves',mesh);bpy.context.collection.objects.link(o)
for x,z in [(-12,73),(12,75),(-11,34),(12,25),(30,13),(4,-8),(7,-51),(-10,-38),(-30,1)]:
 height=random.uniform(5.5,8);rod('bark',(x,0,z),(x+.3,height*.65,z-.2),.19)
 for k in range(8):
  a=k*2.1;ex=x+math.cos(a)*1.8;ez=z+math.sin(a)*1.8;ey=height*.6+k*.25
  rod('bark',(x+.2,height*.4,z),(ex,ey,ez),.058)
  for j in range(45):
   angle=random.uniform(0,math.tau);r=math.sqrt(random.random())*1.25
   leafCard((ex+math.cos(angle)*r,ey+random.uniform(-.4,.9),ez+math.sin(angle)*r),random.uniform(.45,.75),random.uniform(.30,.65),random.random()*math.tau,random.uniform(-1,1))
# Long vines occupy the walls and spill out of genuine empty window bays.
for x,z,w,d,h in D['buildings']:
 for k in range(6):
  xx=x+(1 if x<0 else -1)*(w/2+.28);zz=z+(random.random()-.5)*d;top=random.uniform(4,min(15,h))
  rod('bark',(xx,top,zz),(xx,.1,zz+.2),.025)
  for j in range(int(top*4)):
   yy=j*.25;leafCard((xx+.03,yy,zz+.04),.4,.38,math.pi/2+random.uniform(-.2,.2),random.uniform(-.4,.4))
# Ground ferns and tufts reclaim pavements and median cracks, keeping the mission route clear.
for k in range(240):
 z=random.uniform(-57,78);x=random.choice([-12.6,12.6,32,-32])+random.uniform(-1.5,1.5)
 for j in range(4):leafCard((x+random.uniform(-.2,.2),.24,z+random.uniform(-.2,.2)),.45,.50,random.random()*math.tau,random.uniform(-.3,.3))
 if k%4==0:stone('concrete',x,.07,z,.19,.10,.26)
# Skyline: chamfered old towers and tapered industrial crowns behind the ruins.
# All remain outside the playable fences; no visual obstacle is added to a route.
for side in [-1,1]:
 for index,z in enumerate([-85,-50,-10,32,70,110]):
  x=(D['bounds']['minX']-random.uniform(24,42)) if side<0 else (D['bounds']['maxX']+random.uniform(24,42));h=random.uniform(27,65);w=random.uniform(11,20)
  chamferTower('chamfered ruined tower','concrete',x,z,w,18,0,h,1.2)
  chamferTower('inset broken crown','steel',x+1,z,w*.60,13,h,6,1.0,side*.65)
  for y in range(4,int(h)-2,5):
   box('recessed skyline window band','dark',x,y,z+9.015,w-2.5,.9,.03,0)
   box('skyline window return','dark',x-side*w/2,y,z,.03,.9,15,0)
  for offset in [-.27,.27]:box('tower masonry rib','concrete',x+w*offset,h*.5,z+9.07,.28,h-.6,.15,.035)
  if index%2:
   cable('steel',[(x-w*.42,h-1,z+8),(x-w*.18,h+5,z+6),(x+w*.25,h+6,z+6)],.15)
   rod('rust',(x+w*.24,h+5.9,z+6),(x+w*.25,h+1.5,z+6),.04)
  else:
   rod('steel',(x,h+6,z),(x+.15,h+12,z),.13)
   for yy in [h+8,h+10]:rod('steel',(x-1.4,yy,z),(x+1.4,yy,z),.06)
bpy.context.view_layer.update()
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH' or obj.data.uv_layers:continue
 uv=obj.data.uv_layers.new(name='UVMap');matrix=obj.matrix_world
 # Update transforms once: avoids applying operators on every object.
 for polygon in obj.data.polygons:
  normal=obj.matrix_world.to_3x3()@polygon.normal;axis=max(range(3),key=lambda i:abs(normal[i]))
  for li in polygon.loop_indices:
   v=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co;gx,gy,gz=v.x,v.z,-v.y
   gameAxis=max(range(3),key=lambda i:abs((normal.x,normal.z,-normal.y)[i]));u,vv=(gz,gy) if gameAxis==0 else (gx,gz) if gameAxis==1 else (gx,gy)
   name=obj.data.materials[polygon.material_index].name;scale=1 if name in ['brick','plaster'] else 4
   uv.data[li].uv=(u/scale,vv/scale)
# Evaluate all modifiers, then merge by material to keep the editable/export files compact.
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.convert(target='MESH');bpy.ops.object.join()
print('MODELLING COMPLETE',len(bpy.context.scene.objects),flush=True)
# Preserve editable Blender file and interchange format.
bpy.context.scene.render.engine='BLENDER_EEVEE_NEXT'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(P/'assets/level1/Vesper_Secours_07.blend'))
bpy.ops.export_scene.gltf(filepath=str(P/'assets/level1/Vesper_Secours_07.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
# Material batches with applied bevel/weighted normals; little shader work and no loader dependencies.
deps=bpy.context.evaluated_depsgraph_get();parts={name:[] for name in mats};indices={name:[] for name in mats};lookup={name:{} for name in mats};triangles=0
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();matrix=obj.matrix_world;normalmatrix=matrix.to_3x3().inverted().transposed()
 for tri in mesh.loop_triangles:
  mat=obj.data.materials[tri.material_index].name;dst=parts[mat];triangles+=1
  for li in tri.loops:
   loop=mesh.loops[li];v=matrix@mesh.vertices[loop.vertex_index].co;n=(normalmatrix@mesh.corner_normals[li].vector).normalized()
   gx,gy,gz=v.x,v.z,-v.y;nx,ny,nz=n.x,n.z,-n.y
   uv=mesh.uv_layers.active.data[li].uv if mesh.uv_layers else (0,0)
   values=tuple(round(value,4 if i<3 or i>5 else 3) for i,value in enumerate((gx,gy,gz,nx,ny,nz,uv[0],uv[1])))
   index=lookup[mat].get(values)
   if index is None:index=len(dst)//8;lookup[mat][values]=index;dst.extend(values)
   indices[mat].append(index)
 evaluated.to_mesh_clear()
def compressed(values):
 compressor=zlib.compressobj(9,zlib.DEFLATED,-15);raw=struct.pack('<'+'f'*len(values),*values);return base64.b64encode(compressor.compress(raw)+compressor.flush()).decode()
encoded={name:compressed(values) for name,values in parts.items() if values}
indexEncoded={}
for name,values in indices.items():
 if not values:continue
 compressor=zlib.compressobj(9,zlib.DEFLATED,-15);raw=struct.pack('<'+'I'*len(values),*values);indexEncoded[name]=base64.b64encode(compressor.compress(raw)+compressor.flush()).decode()
metadata=dict(vertices=sum(len(v)//8 for v in parts.values()),tool='Blender '+bpy.app.version_string,triangles=triangles,batches=len(encoded),source='Original Pink War / Vesper Secours 07',revision='3.63.9',hollowBuildings=8,rustedVehicles=len(D['cars']),foliage='alpha leaf cards',surfaceMaps=True,shatteredGlazing=True,profiledVehicleCabins=True,roundedTyres=True,chamferedSkyline=True,bounds=D['bounds'])
(P/'dist/levels/vesper-01-mesh.js').write_text('// Original geometry created in Blender. Raw DEFLATE interleaved float32 position/normal/UV, material batches.\nexport const MESH_INFO='+json.dumps(metadata)+';\nexport const MESH_DATA='+json.dumps(encoded,separators=(',',':'))+';\nexport const MESH_INDEX_DATA='+json.dumps(indexEncoded,separators=(',',':'))+';\n')
print('PINK_WAR_LEVEL1',json.dumps(metadata))

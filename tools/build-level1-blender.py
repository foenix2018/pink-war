"""blender --background --python tools/build-level1-blender.py
Original Vesper mission art. Same metre-based JSON drives physics and modelling.
Exports editable .blend, GLB and bundled mesh data (no network loader in game).
"""
import bpy,math,random,json,pathlib,struct,base64,zlib
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[1]; D=json.loads((P/'assets/level1/layout.json').read_text());random.seed(33207)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
colors={'concrete':(.40,.46,.43,1),'steel':(.24,.32,.33,1),'rust':(.31,.16,.095,1),'dark':(.035,.06,.063,1),'glass':(.10,.25,.27,1),'leaf':(.16,.29,.12,1),'bark':(.15,.105,.06,1),'amber':(.95,.55,.18,1),'road':(.12,.17,.17,1),'white':(.66,.70,.62,1)}
mats={}
for name,c in colors.items():
 m=bpy.data.materials.new(name);m.diffuse_color=c;m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=c;n.inputs['Roughness'].default_value=.85 if name not in ['steel','glass'] else .38;n.inputs['Metallic'].default_value=.72 if name=='steel' else .08
 if name=='amber':n.inputs['Emission Color'].default_value=c;n.inputs['Emission Strength'].default_value=1.6
 mats[name]=m
# Game coordinates x,y,z -> Blender x,-z,y. Export returns the game coordinates.
def V(p):return Vector((p[0],-p[2],p[1]))
def box(name,mat,x,y,z,w,h,d,bevel=.04,rot=0):
 vertices=[(sx*w/2,sz*d/2,sy*h/2) for sx,sz,sy in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=V((x,y,z));o.rotation_euler.z=-rot;mesh.materials.append(mats[mat])
 if bevel:
  mod=o.modifiers.new('worn edges','BEVEL');mod.width=min(bevel,min(w,h,d)*.24);mod.segments=1;o.modifiers.new('weighted surface normals','WEIGHTED_NORMAL')
 return o
def rod(mat,a,b,r=.06):
 a,b=V(a),V(b);delta=b-a;n=8;verts=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z) for z in [-delta.length/2,delta.length/2] for i in range(n)]
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new('conduit');mesh.from_pydata(verts,[],faces);mesh.materials.append(mats[mat]);o=bpy.data.objects.new('pipe / branch',mesh);bpy.context.collection.objects.link(o);o.location=(a+b)*.5;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
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
# Solid blocks are made into articulated facades, not unadorned cubes.
for index,(x,z,w,d,h) in enumerate(D['buildings']):
 box('structural building '+str(index),'concrete',x,h/2,z,w,h,d,.18)
 for y in range(3,int(h),4):
  box('floor belt','steel',x,y,z,w+.25,.17,d+.2,.025)
  for side in [-1,1]:
   for dx in range(-int(w/2)+2,int(w/2)-1,3):
    xx=x+dx;zz=z+side*(d/2+.026)
    box('recessed dark window','dark',xx,y+1.2,zz,2.3,2.1,.065,.025)
    if random.random()>.26:box('surviving glass','glass',xx+.06,y+1.22,zz+side*.04,2.06,1.89,.04,.008)
    box('window sill','steel',xx,y+.10,zz+side*.18,2.5,.12,.5,.035)
   for dz in range(-int(d/2)+2,int(d/2)-1,4):
    xx=x+side*(w/2+.04);zz=z+dz
    box('side window bay','dark',xx,y+1.2,zz,.08,2.1,2.9,.02)
    if random.random()>.30:box('side glass','glass',xx+side*.05,y+1.2,zz,.035,1.9,2.65,.008)
 # Exposed skeleton above the damaged roof: asymmetry changes the skyline.
 for corner in [-1,1]:
  for dz in [-d*.35,d*.35]:rod('rust',(x+corner*w*.35,h,z+dz),(x+corner*w*.35,h+random.uniform(1,3),z+dz),.075)
 for k in range(8):
  zz=z+(random.random()-.5)*d;xx=x+(w/2+.08)*(1 if x<0 else -1)
  box('weathered broken facade panel','rust',xx,1.5+random.random()*h*.7,zz,.10,.06,random.uniform(.3,1.9),.01,random.uniform(-.18,.18))
 # lower vents and mechanical ducts
 for dz in [-d*.27,d*.27]:
  xx=x+(w/2+.25)*(1 if x<0 else -1)
  box('maintenance grille','dark',xx,1.6,z+dz,.24,2.4,2,.03)
  for k in range(6):box('grille louvre','steel',xx+(.15 if x<0 else -.15),.7+k*.30,z+dz,.16,.055,1.9,.009)
 for k in range(9):
  stone('concrete',x+(random.random()-.5)*w,h+.07,z+(random.random()-.5)*d,.45,.4,.6)
 for dz in [-d*.32,d*.26]:rod('rust',(x+(w/2+.18)*(1 if x<0 else -1),1,z+dz),(x+(w/2+.18)*(1 if x<0 else -1),h-2,z+dz),.10)
# Lab, cover, fences, traverse surfaces share collider geometry.
for b in D['obstacles']:
 if b.get('building') or b.get('liftId') or b.get('campaignTerminal'):continue
 if b.get('cover') and b['x']==-5:
  # Rescue van, wholly inside its ballistic collision silhouette.
  x,z=b['x'],b['z'];box('rescue van lower hull','steel',x,.75,z,2.8,.95,6,.13)
  box('van cabin','white',x,1.36,z+1.4,2.72,.64,2.3,.12)
  box('armoured windscreen','glass',x,1.43,z+2.565,2.32,.43,.055,.025)
  box('cargo body','white',x,1.38,z-1.25,2.72,.58,2.4,.06)
  for side in [-1,1]:
   for zz in [-1.85,1.85]:rod('dark',(x+side*1.1,.45,z+zz),(x+side*1.42,.45,z+zz),.42)
   box('van door inset','dark',x+side*1.37,1.08,z+.6,.045,.50,1.15,.01)
   box('door handle','steel',x+side*1.4,1.02,z+.83,.075,.07,.26,.01)
  for dx in [-.85,.85]:box('rescue headlamp','amber',x+dx,.94,z+3.01,.38,.15,.04,.015)
  box('van bumper','rust',x,.56,z+3.02,2.6,.16,.08,.02)
  continue
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
# Open laboratory roof fragments, trusses, pipes. Corridor remains visibly open north and south.
for x in [-10,10]:
 for z in [50,60,70]:box('lab steel column','steel',x,3,z,.25,6,.25)
for z in [50,60,70]:rod('rust',(-10,5.6,z),(10,5.6,z),.11)
for x,z,w,d in [(-7,65,5,8),(7,57,5,11),(-7,53,5,4)]:box('roof fragments','concrete',x,5.7,z,w,.16,d,.10)
for x in [-8,8]:rod('steel',(x,4.2,51),(x,4.2,69),.14)
for z in [52,56,60,64,68]:rod('rust',(-10,5.5,z),(-6,5.8,z+.4),.025)
for x in [-6,6]:box('interior floor grooves','dark',x,.012,60,.05,.02,19,0)
# Exterior suspended transport remnants frame the combat spaces.
for x in [-10,10]:rod('steel',(x,0,18),(x,8,18),.22)
box('broken viaduct left','concrete',-11,8.2,18,15,.45,4,.14)
box('broken viaduct right','concrete',11,8.2,18,9,.45,4,.14)
for x in [-3,-2.5,6.2,6.6]:rod('rust',(x,8.25,17.8),(x+random.uniform(-.4,.4),7.5,17.4),.035)
# Lift shaft is exposed scaffolding, and actual carriage is rendered separately at runtime.
for x in [26,32]:
 for z in [-48,-42]:rod('steel',(x,0,z),(x,7,z),.10)
rod('steel',(26,7,-48),(32,7,-48),.12);rod('steel',(26,7,-42),(32,7,-42),.12)
# Vegetation: bent segmented trunks, branches and layered irregular leaf clusters.
for x,z in [(-12,73),(12,75),(-11,34),(12,25),(30,13),(4,-8),(7,-51),(-10,-38),(-30,1)]:
 height=random.uniform(5.5,8);rod('bark',(x,0,z),(x+.3,height*.65,z-.2),.17)
 for k in range(5):
  a=k*1.9;ex=x+math.cos(a)*1.8;ez=z+math.sin(a)*1.8;ey=height*.6+k*.34
  rod('bark',(x+.2,height*.4,z),(ex,ey,ez),.065)
  stone('leaf',ex,ey+.5,ez,1.7,.8,1.4)
 stone('leaf',x+.4,height,z,1.5,1.15,1.6)
# Climbing vines, low grass and broken concrete near wall foot, not on passage axis.
for x,z,_,d,h in D['buildings']:
 for k in range(4):
  xx=x+(1 if x<0 else -1)*(_/2+.18);zz=z+(random.random()-.5)*d;y0=random.uniform(3,8)
  rod('bark',(xx,y0,zz),(xx,.1,zz+.2),.021)
  for y in range(1,int(y0)):
   stone('leaf',xx+.06,y,zz+.12,.32,.22,.4)
for k in range(140):
 z=random.uniform(-57,78);x=random.choice([-12.6,12.6,32,-32])+random.uniform(-1.5,1.5)
 stone('leaf',x,.16,z,.28,.23,.38)
 if k%3==0:stone('concrete',x,.08,z,.22,.14,.35)
# Skyline: outside the playable fences, irregular terraced tower clusters, no arena underneath.
for side in [-1,1]:
 for z in [-85,-50,-10,32,70,110]:
  x=side*random.uniform(65,90);h=random.uniform(27,65);w=random.uniform(11,20)
  box('distant ruined tower','concrete',x,h/2,z,w,h,18,.22)
  box('set back penthouse','steel',x+1,h+3,z,w*.60,6,13,.1)
  for y in range(4,int(h),5):box('skyline window band','dark',x,y,z+9.02,w*.85,.8,.04,0)
print('MODELLING COMPLETE',len(bpy.context.scene.objects),flush=True)
# Preserve editable Blender file and interchange format.
bpy.ops.wm.save_as_mainfile(filepath=str(P/'assets/level1/Vesper_Secours_07.blend'))
bpy.ops.export_scene.gltf(filepath=str(P/'assets/level1/Vesper_Secours_07.glb'),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
# Material batches with applied bevel/weighted normals; little shader work and no loader dependencies.
deps=bpy.context.evaluated_depsgraph_get();parts={name:[] for name in mats};triangles=0
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh();mesh.calc_loop_triangles();matrix=obj.matrix_world;normalmatrix=matrix.to_3x3().inverted().transposed()
 for tri in mesh.loop_triangles:
  mat=obj.data.materials[tri.material_index].name;dst=parts[mat];triangles+=1
  for li in tri.loops:
   loop=mesh.loops[li];v=matrix@mesh.vertices[loop.vertex_index].co;n=(normalmatrix@mesh.corner_normals[li].vector).normalized()
   gx,gy,gz=v.x,v.z,-v.y;nx,ny,nz=n.x,n.z,-n.y
   axis=max(range(3),key=lambda i:abs((nx,ny,nz)[i]));u,vv=(gz,gy) if axis==0 else (gx,gz) if axis==1 else (gx,gy)
   dst.extend((gx,gy,gz,nx,ny,nz,u/3,vv/3))
 evaluated.to_mesh_clear()
def compressed(values):
 compressor=zlib.compressobj(9,zlib.DEFLATED,-15);raw=struct.pack('<'+'f'*len(values),*values);return base64.b64encode(compressor.compress(raw)+compressor.flush()).decode()
encoded={name:compressed(values) for name,values in parts.items() if values}
metadata=dict(tool='Blender '+bpy.app.version_string,triangles=triangles,batches=len(encoded),source='Original Pink War / Vesper Secours 07',bounds=D['bounds'])
(P/'dist/levels/vesper-01-mesh.js').write_text('// Original geometry created in Blender. Raw DEFLATE interleaved float32 position/normal/UV, material batches.\nexport const MESH_INFO='+json.dumps(metadata)+';\nexport const MESH_DATA='+json.dumps(encoded,separators=(',',':'))+';\n')
print('PINK_WAR_LEVEL1',json.dumps(metadata))

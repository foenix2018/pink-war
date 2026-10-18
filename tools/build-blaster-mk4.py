"""Original Pink War weapons, authored at the measured RLH hand anchors.
Run: blender --background --python tools/build-blaster-mk4.py
The game frame is metres, +Y up, -Z forward. No floating receiver upgrades.
"""
import bpy, bmesh, math, pathlib, json
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[1];OUT=P/'dist/assets/pink-war'
IDS=['r9','bloom','lance','thorn','nova'];LETTERS=['b','g','d','f','p']
MUZZLE=[(.045,-.207),(-.020,-.60),(-.020,-.88),(.080,-.85),(.040,-.655)]
PALMS=[(.026,-.068,0),(.027,-.135,-.064),(.027,-.135,-.284),(.028,-.025,-.149),(.027,-.069,-.079)]
SUPPORT=[None,(-.036,-.146,-.325),(-.032,-.165,-.54),(-.038,-.09,-.342),(-.039,-.12,-.349)]
def v(p):return (p[0],-p[2],p[1])
def material(name,color,metal=.7,rough=.4):
 m=bpy.data.materials.get('PW_MK4_'+name) or bpy.data.materials.new('PW_MK4_'+name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 return m
M={k:material(k,*a) for k,a in {'alloy':((.19,.23,.27),.87,.32),'ceramic':((.7,.73,.76),.48,.4),'rubber':((.019,.024,.031),.12,.78),'paint':((.06,.23,.45),.6,.38),'energy':((.1,.7,.9),.5,.25),'glass':((.025,.12,.2),.75,.12)}.items()}
def finish(o,mat,bevel=.003):
 o.data.materials.append(M[mat])
 if bevel:
  b=o.modifiers.new('Machined edge radius','BEVEL');b.width=bevel*(1.18 if mat in ['ceramic','paint','alloy'] else 1);b.segments=3;b.harden_normals=True
  o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
 return o
def mesh(name,verts,faces,mat,bevel=.003):
 g=bpy.data.meshes.new(name);g.from_pydata([v(p) for p in verts],[],faces);g.update()
 bm=bmesh.new();bm.from_mesh(g);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(g);bm.free()
 o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);return finish(o,mat,bevel)
def profile(name,outline,width,mat,x=0,bevel=.004):
 n=len(outline);vs=[(x+side*width/2,y,z) for side in [-1,1] for z,y in outline]
 fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,vs,fs,mat,bevel)
def tube(name,a,b,r1,r2,mat,n=24):
 # Lathed circular sections, aligned to the actual bore or support.
 a,b=Vector(a),Vector(b);d=(b-a).normalized();x=d.cross(Vector((0,1,0)))
 if x.length<.01:x=d.cross(Vector((1,0,0)))
 x.normalize();y=d.cross(x).normalized()
 vs=[tuple(c+(x*math.cos(i*math.tau/n)+y*math.sin(i*math.tau/n))*r) for c,r in [(a,r1),(b,r2)] for i in range(n)]
 fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 o=mesh(name,vs,fs,mat,.0012)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def housing(name,rings,mat,n=16):
 # Swept rounded-rectangle shell. Sections vary continuously along the bore.
 vs=[]
 for z,cy,rx,ry in rings:
  for j in range(n):
   a=j*math.tau/n;c,s=math.cos(a),math.sin(a)
   vs.append((math.copysign(abs(c)**.68,c)*rx,cy+math.copysign(abs(s)**.68,s)*ry,z))
 fs=[tuple(reversed(range(n))),tuple(range((len(rings)-1)*n,len(rings)*n))]
 for r in range(len(rings)-1):
  for j in range(n):fs.append((r*n+j,r*n+(j+1)%n,(r+1)*n+(j+1)%n,(r+1)*n+j))
 o=mesh(name,vs,fs,mat,0)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
def optical_shell(name,rings,mat,n=24):
 # A true annular shell: front and rear caps have a hole, never a solid disc.
 vs=[]
 for z,cy,rx,ry,ix,iy in rings:
  for xr,yr in [(rx,ry),(ix,iy)]:
   for j in range(n):
    a=j*math.tau/n;vs.append((math.cos(a)*xr,cy+math.sin(a)*yr,z))
 fs=[]
 for r in range(len(rings)-1):
  for j in range(n):
   k=(j+1)%n;a=r*n*2;b=(r+1)*n*2
   fs.extend([(a+j,a+k,b+k,b+j),(a+n+k,a+n+j,b+n+j,b+n+k)])
 for r in [0,len(rings)-1]:
  a=r*n*2
  for j in range(n):
   k=(j+1)%n;fs.append((a+j,a+n+j,a+n+k,a+k))
 o=mesh(name,vs,fs,mat,0)
 for p in o.data.polygons:p.use_smooth=True
 return o
def screw(x,y,z):tube('Flush hex fastener',(x,y,z),(x+math.copysign(.0018,x),y,z),.0038,.0038,'alloy',8)
report=[]
for i in range(5):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 my,mz=MUZZLE[i];px,py,pz=PALMS[i];wide=[.024,.031,.028,.038,.048][i];optic=None
 # Continuous lower receiver meets the sloped grip over its whole upper edge.
 top=py+.067;bottom=py-.072;rake=.28
 grip=[(pz-.026,top),(pz+.026,top),(pz+.027+.12*rake,bottom),(pz-.018+.12*rake,bottom),(pz-.028,py-.03)]
 profile('Anatomical raked grip',grip,.031,'rubber',bevel=.006)
 for sign in [-1,1]:
  # Inlaid grip pads and grooves remain within the real handle contour.
  for j in range(4):
   yy=py-.045+j*.021;zz=pz+(py-yy)*rake
   profile('Grip stippling rib',[(zz-.016,yy-.002),(zz+.016,yy-.002),(zz+.016,yy+.002),(zz-.016,yy+.002)],.002,'alloy',sign*.016,.0005)
 # Small trigger, guard is a connected curved loop, not a loose square.
 triggerZ=pz-.052;gy=py+.012
 guard=[(pz-.015,top+.005),(triggerZ-.033,top+.004),(triggerZ-.05,gy-.01),(triggerZ-.042,gy-.027),(pz-.014,gy-.04)]
 for a,b in zip(guard,guard[1:]):tube('Continuous trigger guard',(0,a[1],a[0]),(0,b[1],b[0]),.004,.004,'alloy',12)
 tube('Trigger',(0,top-.005,triggerZ),(0,gy+.001,triggerZ-.008),.003,.003,'rubber',10)
 rear=pz+(.07 if i==0 else .15);nose=mz+(.042 if i==0 else .16)
 ry=[.036,.052,.048,.055,.060][i];cy=my-.012
 housing('Monocoque receiver',[(rear-.008,cy,wide*.75,ry*.78),(rear-.028,cy,wide,ry),(pz-.04,cy,wide,ry),(nose+.04,cy,wide*.85,ry*.9),(nose,cy,wide*.65,ry*.65)],'alloy')
 # A fitted web joins the grip and receiver even on the low rifle hand anchors.
 profile('Receiver grip web',[(pz+.035,top-.006),(pz+.04,cy-.02),(pz-.07,cy-.015),(pz-.044,top-.006)],wide*1.7,'alloy',bevel=.006)
 # Ceramic cheek panels follow the tapered chassis, with dark exposed margins.
 for s in [-1,1]:
  a=rear-.04;b=nose+.035
  profile('Contoured ceramic flank',[(a,cy-.018),(a-.018,cy+ry*.68),(b+.025,cy+ry*.68),(b,cy+.01),(b+.018,cy-.025)],.006,'ceramic',s*(wide-.001),.003)
  profile('Inlaid universe stripe',[(a-.015,cy+.012),(a-.03,cy+.021),(b+.05,cy+.021),(b+.065,cy+.012)],.002,'paint',s*(wide+.003),.001)
  for z in [a-.025,b+.03]:screw(s*(wide+.006),cy+ry*.40,z)
  for j in range(4 if i else 2):
   z=nose+.045+j*.022
   profile('Recessed cooling gill',[(z,cy-.018),(z-.008,cy-.018),(z-.015,cy+.008),(z-.007,cy+.008)],.0018,'rubber',s*(wide+.002),.0005)
 # Every concentric muzzle part is centred on the same bore and overlaps.
 barrelR=[.012,.017,.014,.022,.030][i]
 tube('Continuous bored barrel',(0,my,nose+.025),(0,my,mz+.003),barrelR*1.25,barrelR,'alloy')
 tube('Emitter collar',(0,my,mz+.035),(0,my,mz+.001),barrelR*1.65,barrelR*1.48,'ceramic')
 tube('Emitter dark bore',(0,my,mz+.001),(0,my,mz-.001),barrelR*1.08,barrelR*1.08,'rubber')
 tube('Recessed laser aperture',(0,my,mz-.001),(0,my,mz-.002),barrelR*.55,barrelR*.55,'energy')
 if i:
  sy,sz=SUPPORT[i][1:];fh=sy+.045
  # Foregrip is physically attached to the handguard, at the measured free palm.
  profile('Swept foregrip',[(sz+.036,cy-.025),(sz-.036,cy-.025),(sz-.025,sy-.052),(sz+.025,sy-.052)],.038,'rubber',bevel=.008)
  housing('Rounded handguard',[(nose+.13,my,.037,ry*.90),(nose+.10,my,.042,ry*.92),(nose+.01,my,.034,ry*.70)],'rubber')
  # Rounded detachable power magazine flows into the lower receiver.
  zz=pz+.06
  profile('Contoured power magazine',[(zz+.045,cy-.027),(zz-.027,cy-.027),(zz-.039,cy-.15),(zz+.014,cy-.167),(zz+.039,cy-.11)],.037,'alloy',bevel=.008)
  for s in [-1,1]:profile('Magazine inset',[(zz+.019,cy-.055),(zz-.014,cy-.055),(zz-.022,cy-.13),(zz+.010,cy-.141)],.003,'paint',s*.019,.002)
  # Skeletal stock with soft shoulder pad, connected through its upper spar.
  butt=rear+.12
  tube('Upper stock spar',(0,cy+.008,rear-.035),(0,cy+.004,butt+.005),.012,.012,'alloy',16)
  tube('Diagonal stock brace',(0,cy-.044,rear-.035),(0,cy-.101,butt+.005),.008,.010,'alloy',16)
  housing('Curved shoulder recoil pad',[(butt-.015,cy-.053,.023,.073),(butt+.005,cy-.053,.027,.078),(butt+.023,cy-.053,.022,.069)],'rubber',20)
 if i in [1,2]:
  # Integral rail, feet and scope: no component is suspended above the receiver.
  sightZ=pz-.05;railY=cy+ry
  profile('Integrated sight rail',[(pz+.055,railY-.005),(pz+.055,railY+.011),(pz-.21,railY+.011),(pz-.21,railY-.005)],.025,'alloy',bevel=.002)
  if i==2:
   sy=railY+.052
   for z in [sightZ+.035,sightZ-.065]:tube('Scope mount',(0,railY+.007,z),(0,sy-.004,z),.011,.011,'alloy',12)
   optical_shell('Open optical tube',[(sightZ+.095,sy,.025,.025,.021,.021),(sightZ-.13,sy,.029,.029,.024,.024)],'rubber')
   optical_shell('Open objective surround',[(sightZ-.10,sy,.030,.030,.024,.024),(sightZ-.145,sy,.031,.031,.025,.025)],'alloy')
   optical_shell('Open eyepiece',[(sightZ+.065,sy,.027,.027,.021,.021),(sightZ+.105,sy,.029,.029,.0215,.0215)],'rubber')
   optic=dict(y=sy,z=sightZ+.107,radius=.021,magnification=4)
  else:
   optical_shell('Open reflex sight hood',[(sightZ+.024,railY+.035,.026,.028,.021,.023),(sightZ-.025,railY+.035,.025,.027,.021,.023)],'rubber')
   optic=dict(y=railY+.035,z=sightZ+.028,radius=.018,magnification=2)
 if i in [3,4]:
  # Capacitor cells are recessed into a saddle that touches the main chassis.
  for s in [-1,1]:
   tube('Capacitor saddle',(s*wide*.82,cy+.007,nose+.11),(s*wide*.82,cy+.007,rear-.06),.023,.023,'rubber')
   tube('Contained capacitor',(s*wide,cy+.007,nose+.12),(s*wide,cy+.007,rear-.07),.018,.018,'paint')
 # UV each face with a consistent physical scale, including bevels. All six
 # materials use actual surface maps in the runtime instead of flat palette UVs.
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
  uv=o.data.uv_layers.new(name='SurfaceUV')
  for poly in o.data.polygons:
   axis=max(range(3),key=lambda j:abs(poly.normal[j]));axes=[j for j in range(3) if j!=axis]
   for li in poly.loop_indices:
    co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*5,co[axes[1]]*5)
  o.select_set(False)
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(o for o in bpy.context.scene.objects if o.type=='MESH');bpy.ops.object.join()
 obj=bpy.context.active_object;obj.name='Pink War IV / '+IDS[i];obj['pinkWarFrame']='grip-metres-v1';obj['muzzle']=[0,my,mz]
 if optic:obj['optic']=optic
 file=OUT/f'blaster-{LETTERS[i]}-mk4.glb'
 bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',export_apply=True,export_extras=True,export_cameras=False,export_lights=False)
 obj.data.calc_loop_triangles();n=len(obj.data.loop_triangles)
 report.append(dict(id=IDS[i],file=file.name,triangles=n,source='Original Pink War geometry',revision='3.44',muzzle=[0,my,mz],palm=PALMS[i]))
 print('MK4',json.dumps(report[-1]),flush=True)
 if i==2:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pink-war-lance-mk4.blend'))
(OUT/'models-mk4.json').write_text(json.dumps(report,indent=2)+'\n')

"""blender --background --python tools/blender/hideout.py [-- --render]
Pink Wars / La Planque. Original metric Blender scene based on the supplied room reference.
Editable collections, GLB interchange, compact material-batched PWM1 game mesh and shared colliders.
"""
import bpy,bmesh,math,random,json,pathlib,struct,sys,gzip,shutil
from mathutils import Vector,Matrix
P=pathlib.Path(__file__).resolve().parents[2]
OUT=P/'dist/assets/hideout';SRC=P/'assets/hideout';OUT.mkdir(parents=True,exist_ok=True);SRC.mkdir(parents=True,exist_ok=True)
random.seed(38821);TAU=math.tau
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
G=lambda x,y,z:Vector((x,-z,y))
MATS={};META={};BUILD={};SOLIDS=[];TEXT=[];ZONE='Architecture'
def material(name,color,rough=.55,metal=.0,glow=0,texture=None,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,alpha);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 if glow:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=glow
 if alpha<1:n.inputs['Alpha'].default_value=alpha;m.surface_render_method='DITHERED'
 if texture:
  image=bpy.data.images.load(str(P/'dist/assets/cc0'/texture),check_existing=True);image.pack();t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*color,1);m.node_tree.links.new(t.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs['Color'],n.inputs['Base Color'])
  bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.018;m.node_tree.links.new(t.outputs['Color'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],n.inputs['Normal'])
 MATS[name]=m;META[name]={'color':list(color),'roughness':rough,'metalness':metal,'emissive':glow,'alpha':alpha,'texture':texture};return m
material('Acier patiné',(.23,.26,.30),.53,.72,texture='vesper-steel_diff_512.jpg')
material('Béton sombre',(.30,.29,.32),.88,.03,texture='vesper-concrete_diff_512.jpg')
material('Sol graphite',(.19,.21,.25),.56,.52,texture='vesper-steel_diff_512.jpg')
material('Cadres anthracite',(.07,.085,.11),.38,.72)
material('Métal brossé',(.40,.46,.51),.31,.85)
material('Cuir et joints',(.045,.055,.075),.9,.02)
material('Tissu rose',(.37,.075,.19),.94)
material('Tissu bleu',(.07,.20,.38),.94)
material('Tissu neutre',(.25,.23,.30),.95)
material('Peinture médicale',(.55,.58,.61),.48,.22)
material('Papier ivoire',(.65,.56,.50),.94)
material('Cuivre et outils',(.42,.23,.11),.5,.7)
material('Bras robot orange',(.82,.32,.065),.42,.4)
material('Végétation',(.18,.28,.12),.82)
material('Feuilles claires',(.33,.40,.16),.81)
for name in ['Végétation','Feuilles claires']:META[name]['doubleSided']=True
material('Verre',(.30,.57,.65),.17,.2,alpha=.14)
material('Miroir poli',(.80,.84,.88),.065,1)
material('Néon rose',(1,.025,.37),.24,.15,5)
material('Néon bleu',(.025,.58,1),.24,.15,4.5)
material('Néon ambre',(1,.52,.14),.3,.1,3)
material('Néon blanc',(.70,.90,1),.28,.0,2.4)
material('Écran sombre',(.016,.07,.11),.32,.15,.25)
material('Ville lointaine',(.10,.065,.13),.85,.1)
material('Brume rose',(.51,.15,.32),1,0,.5)
# Material maps are original to this room, with metre based UVs. They are packed
# in the editable source and use the same scale in both Blender and WebGPU.
def pbr(name,stem,uvscale=1):
 m=MATS[name];n=m.node_tree.nodes.get('Principled BSDF');links=m.node_tree.links
 texcoord=m.node_tree.nodes.new('ShaderNodeTexCoord');mapping=m.node_tree.nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=uvscale;links.new(texcoord.outputs['UV'],mapping.inputs[0])
 for kind,socket in [('color','Base Color'),('rough','Roughness'),('normal','Normal')]:
  path=OUT/(stem+'-'+kind+'.jpg')
  if not path.exists():raise RuntimeError('Run python3 tools/blender/hideout-textures.py first')
  image=bpy.data.images.load(str(path),check_existing=True);image.pack()
  if kind!='color':image.colorspace_settings.name='Non-Color'
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;links.new(mapping.outputs['Vector'],t.inputs['Vector'])
  if kind=='color':
   mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=m.diffuse_color;links.new(t.outputs['Color'],mix.inputs[1]);links.new(mix.outputs['Color'],n.inputs[socket])
  elif kind=='normal':
   normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55;links.new(t.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs[0],n.inputs[socket])
  else:links.new(t.outputs['Color'],n.inputs[socket])
 META[name].update(texture=stem+'-color.jpg',normalMap=stem+'-normal.jpg',roughnessMap=stem+'-rough.jpg',textureSpace='hideout',uvScale=uvscale)
for name in ['Acier patiné','Métal brossé','Cadres anthracite','Bras robot orange']:pbr(name,'steel')
pbr('Sol graphite','deck',.8);pbr('Béton sombre','concrete',.65)
for name in ['Tissu rose','Tissu bleu','Tissu neutre','Cuir et joints']:pbr(name,'fabric',2)
pbr('Peinture médicale','ceramic',1)
material('Verre dépoli des portes',(.78,.84,.86),.64,0);pbr('Verre dépoli des portes','frost');META['Verre dépoli des portes']['frost']=True
material('Cloisons hautes',(.25,.28,.32),.62,.18);pbr('Cloisons hautes','steel');META['Cloisons hautes']['interior']=True
META['Écran sombre'].update(texture='display.jpg',textureSpace='hideout',localUV=True)
display=bpy.data.images.load(str(OUT/'display.jpg'),check_existing=True);display.pack();dn=MATS['Écran sombre'].node_tree.nodes;dt=dn.new('ShaderNodeTexImage');dt.image=display;dp=dn.get('Principled BSDF');dl=MATS['Écran sombre'].node_tree.links;dl.new(dt.outputs['Color'],dp.inputs['Base Color']);dl.new(dt.outputs['Color'],dp.inputs['Emission Color']);dp.inputs['Emission Strength'].default_value=.55
def bm(mat):
 key=(ZONE,mat)
 if key not in BUILD:BUILD[key]=bmesh.new()
 return BUILD[key]
# Scale only newly authored furniture, never the adjacent floor or architecture.
def mark_furniture():
 return ({k:set(b.verts) for k,b in BUILD.items() if k[0]==ZONE},len(SOLIDS),len(TEXT),ZONE)
def fit_furniture(mark,center,scale,offset=(0,0,0)):
 old,solid_at,text_at,zone=mark
 sx,sy,sz=scale; pivot=G(*center); delta=G(*offset)
 ma=Matrix.Translation(pivot+delta)@Matrix.Diagonal((sx,sz,sy,1))@Matrix.Translation(-pivot)
 for k,b in BUILD.items():
  if k[0]!=zone:continue
  for v in b.verts:
   if v not in old.get(k,()):v.co=ma@v.co
 for o in TEXT[text_at:]:o.matrix_world=ma@o.matrix_world
 for c in SOLIDS[solid_at:]:
  c['x']=center[0]+(c['x']-center[0])*sx+offset[0];c['z']=center[2]+(c['z']-center[2])*sz+offset[2]
  c['y']=center[1]+(c['y']-center[1])*sy+offset[1];c['height']*=sy;c['hx']*=sx;c['hz']*=sz
def box(mat,c,size,bevel=True,yaw=0,solid=False,name=None):
 x,y,z=c;w,h,d=size;ma=Matrix.Translation(G(*c))@Matrix.Rotation(-yaw,4,'Z')@Matrix.Diagonal((w,d,h,1));bmesh.ops.create_cube(bm(mat),size=1,matrix=ma)
 if solid:SOLIDS.append({'kind':name or ZONE,'x':x,'z':z,'hx':w/2,'hz':d/2,'y':y-h/2,'height':h})
def cyl(mat,c,r,h,n=12,r2=None,axis='y'):
 ma=Matrix.Translation(G(*c))
 if axis=='x':ma=ma@Matrix.Rotation(math.pi/2,4,'Y')
 if axis=='z':ma=ma@Matrix.Rotation(math.pi/2,4,'X')
 result=bmesh.ops.create_cone(bm(mat),cap_ends=True,cap_tris=False,segments=n,radius1=r,radius2=r if r2 is None else r2,depth=h,matrix=ma)
 for v in result['verts']:
  for f in v.link_faces:
   if len(f.verts)==4:f.smooth=True
def ellipsoid(mat,c,size,n=12):
 w,h,d=size;result=bmesh.ops.create_uvsphere(bm(mat),u_segments=n,v_segments=max(6,n//2),radius=1,matrix=Matrix.Translation(G(*c))@Matrix.Diagonal((w/2,d/2,h/2,1)))
 for v in result['verts']:
  for f in v.link_faces:f.smooth=True
def rod(mat,a,b,r=.025,n=8):
 A,B=G(*a),G(*b);delta=B-A
 if delta.length<1e-5:return
 ma=Matrix.Translation((A+B)/2)@delta.to_track_quat('Z','Y').to_matrix().to_4x4()
 result=bmesh.ops.create_cone(bm(mat),cap_ends=True,cap_tris=False,segments=n,radius1=r,radius2=r,depth=delta.length,matrix=ma)
 for v in result['verts']:
  for f in v.link_faces:
   if len(f.verts)==4:f.smooth=True
def mesh(mat,vertices,faces):
 b=bm(mat);v=[b.verts.new(G(*p)) for p in vertices]
 for f in faces:b.faces.new([v[i] for i in f])
def cushion(mat,c,size):
 # A low-poly sewn superellipsoid, not an extruded rectangular block.
 b=bm(mat);v=[];w,h,d=size;power=.35
 signed=lambda a:math.copysign(abs(a)**power,a)
 for j in range(9):
  lat=-math.pi/2+math.pi*(j+.025)/8.05
  for i in range(24):
   a=i*TAU/24;v.append(b.verts.new(G(c[0]+w*.5*signed(math.cos(lat))*signed(math.cos(a)),c[1]+h*.5*signed(math.sin(lat)),c[2]+d*.5*signed(math.cos(lat))*signed(math.sin(a)))))
 for j in range(8):
  for i in range(24):f=b.faces.new([v[j*24+i],v[j*24+(i+1)%24],v[(j+1)*24+(i+1)%24],v[(j+1)*24+i]]);f.smooth=True
 b.faces.new(list(reversed(v[:24])));b.faces.new(v[-24:])
def quilt(mat,c,w,d):
 # Sewn puffy cells with a folded-over edge instead of lines above a flat slab.
 b=bm(mat);nx,nz=24,32;vs=[]
 for j in range(nz+1):
  v=j/nz
  for i in range(nx+1):
   u=i/nx;edge=max(abs(u-.5)*2,abs(v-.5)*2)
   y=c[1]+.025*math.sin(u*math.pi)*math.sin(v*math.pi)+.024*math.sin(u*math.pi*6)**2*math.sin(v*math.pi*8)**2-.105*max(0,(edge-.88)/.12)**1.4
   vs.append(b.verts.new(G(c[0]+(u-.5)*w,y,c[2]+(v-.5)*d)))
 for j in range(nz):
  for i in range(nx):
   a=j*(nx+1)+i;f=b.faces.new([vs[a],vs[a+nx+1],vs[a+nx+2],vs[a+1]]);f.smooth=True
def basin(mat,c,w,d,depth):
 # Closed rounded shell with a real concave bowl and rolled rim.
 x,y,z=c;b=bm(mat);vs=[];n=40
 for radius,drop in [(1,0),(.94,.02),(.82,-.02),(.66,-depth*.72),(.28,-depth)]:
  vs.extend(b.verts.new(G(x+math.cos(i*TAU/n)*w*.5*radius,y+drop,z+math.sin(i*TAU/n)*d*.5*radius))for i in range(n))
 for j in range(4):
  for i in range(n):f=b.faces.new([vs[j*n+i],vs[j*n+(i+1)%n],vs[(j+1)*n+(i+1)%n],vs[(j+1)*n+i]]);f.smooth=True
 b.faces.new(vs[-n:])
def profile(mat,x,z,outline,depth):
 # A genuinely chamfered shape extruded along game z.
 n=len(outline);v=[(x+xx,yy,z+side*depth/2) for side in [-1,1] for xx,yy in outline]
 mesh(mat,v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n)for i in range(n)])
def ring(mat,c,r,t=.025,n=40,axis='y',arc=TAU):
 x,y,z=c;pts=[]
 for j in range(n+1):
  a=arc*j/n;pts.append((x+math.cos(a)*r,y,z+math.sin(a)*r) if axis=='y' else (x+math.cos(a)*r,y+math.sin(a)*r,z))
 for a,b in zip(pts,pts[1:]):rod(mat,a,b,t,6)
def polyline(mat,pts,r=.025):
 for a,b in zip(pts,pts[1:]):rod(mat,a,b,r)
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';FONT=bpy.data.fonts.load(fontpath) if pathlib.Path(fontpath).exists()else None
def text(body,x,y,z,size=.20,mat='Néon blanc',floor=False):
 curve=bpy.data.curves.new(body,'FONT');curve.body=body;curve.align_x='CENTER';curve.size=size;curve.extrude=.0005;curve.resolution_u=2
 if FONT:curve.font=FONT
 o=bpy.data.objects.new(body,curve);bpy.context.collection.objects.link(o);o.location=G(x,y,z);o.rotation_euler=(0,0,0)if floor else(math.pi/2,0,0);curve.materials.append(MATS[mat]);TEXT.append(o);return o
def neon(a,b,mat='Néon rose',r=.025):
 # Tube, opaque housing, connectors. No rectangular emissive strips.
 rod('Cadres anthracite',(a[0],a[1]-.032,a[2]+.01),(b[0],b[1]-.032,b[2]+.01),r*2.1,8);rod(mat,a,b,r,10)
 for p in (a,b):ellipsoid('Métal brossé',p,(r*3,r*3,r*3),8)
def crate(x,z,accent='Tissu rose',scale=1):
 w,h,d=1.1*scale,.68*scale,.75*scale;y=h/2
 box('Acier patiné',(x,y,z),(w,h,d),solid=True);box('Cadres anthracite',(x,h+.025,z),(w+.05,.065,d+.05))
 for xx in [-.38,.38]:box('Cadres anthracite',(x+xx*scale,y,z),(w*.08,h+.04,d+.04))
 for xx in [-.37,.37]:box('Métal brossé',(x+xx*scale,h*.58,z+d/2+.02),(.11,.15,.05))
 for side in [-1,1]:
  for dz in [-1,1]:box('Métal brossé',(x+side*w*.46,.11*scale,z+dz*d*.43),(.13*scale,.20*scale,.13*scale))
 # Recessed folding handle and separate hinge pins on the lid.
 polyline('Métal brossé',[(x-.14*scale,y+.12*scale,z+d*.53),(x-.14*scale,y-.02*scale,z+d*.56),(x+.14*scale,y-.02*scale,z+d*.56),(x+.14*scale,y+.12*scale,z+d*.53)],.018*scale)
 for xx in [-.32,.32]:cyl('Métal brossé',(x+xx*scale,h,z-d*.48),.028*scale,.16*scale,10,axis='x')
 box(accent,(x,y,z+d/2+.027),(.28,.30,.015));text('P',x,y-.05,z+d/2+.04,.25)
def plant(x,y,z,s=.7):
 cyl('Béton sombre',(x,y+.15*s,z),.25*s,.3*s,20,r2=.34*s);cyl('Cuir et joints',(x,y+.305*s,z),.28*s,.015*s,20)
 for j in range(7):
  a=j*2.4;end=(x+math.sin(a)*s*.4,y+s*(.6+random.random()*.6),z+math.cos(a)*s*.4);rod('Végétation',(x,y+.25*s,z),end,.012*s,5)
  for k in range(3):
   u=.45+k*.25;c=(x+(end[0]-x)*u,y+.25*s+(end[1]-y-.25*s)*u,z+(end[2]-z)*u);dx=math.sin(a+k)*.21*s;dz=math.cos(a+k)*.21*s
   mat='Végétation'if j%2 else'Feuilles claires';b=bm(mat);vs=[];length=max(.01,math.hypot(dx,dz));px=-dz/length; pz=dx/length
   for q in range(6):
    t=q/5;w=math.sin(t*math.pi)*.075*s+.001
    for side in [-1,1]:vs.append(b.verts.new(G(c[0]+dx*1.8*t+px*w*side,c[1]+s*(.13*math.sin(t*math.pi)-.02*t)-w*.2,c[2]+dz*1.8*t+pz*w*side)))
   for q in range(5):f=b.faces.new([vs[q*2],vs[q*2+1],vs[q*2+3],vs[q*2+2]]);f.smooth=True
   rod('Végétation',c,(c[0]+dx*1.8,c[1]-.02*s,c[2]+dz*1.8),.003*s,4)
def screen(x,y,z,w=.8,h=.5,accent='Néon bleu'):
 box('Cadres anthracite',(x,y,z),(w+.1,h+.1,.10))
 mesh('Écran sombre',[(x-w/2,y-h/2,z+.058),(x+w/2,y-h/2,z+.058),(x+w/2,y+h/2,z+.058),(x-w/2,y+h/2,z+.058)],[(0,1,2,3)])
 for yy in [-h*.43,h*.43]:neon((x-w*.44,y+yy,z+.07),(x+w*.44,y+yy,z+.07),accent,.006)
 for side in [-1,1]:cyl('Métal brossé',(x+side*(w/2+.025),y-h/2-.02,z+.058),.009,.01,6,axis='z')
def books(x,y,z,n=9):
 for i in range(n):
  h=random.uniform(.18,.34);mat=['Tissu rose','Tissu bleu','Papier ivoire','Cuivre et outils'][i%4];box(mat,(x+i*.075,y+h/2,z),(.055,h,.17));box('Papier ivoire',(x+i*.075,y+h*.7,z+.087),(.043,.015,.008))

print('Planque: architecture',flush=True)
ZONE='Architecture'
box('Cadres anthracite',(0,-.25,0),(22.4,.5,24));box('Béton sombre',(0,-.09,0),(22,.18,23.6))
for x in range(-10,11,2):
 for z in range(-11,12,2):
  box('Sol graphite',(x,.006,z),(1.975,.025,1.975))
  for dx in [-.85,.85]:cyl('Métal brossé',(x+dx,.023,z+.85),.018,.01,6)
for x in [-4.7,4.7]:
 box('Cadres anthracite',(x,.03,0),(.16,.035,23));neon((x,.055,-9),(x,.055,9),'Néon ambre',.012)
 for z in [-8,-3,3,8]:box('Métal brossé',(x,.07,z),(.2,.08,.3))
for x in [-10.9,10.9]:
 box('Béton sombre',(x,1.05,0),(.3,2.1,23.4),solid=True)
 for z in [-11.4,-5,2.8,9,11.4]:
  box('Acier patiné',(x,1.7,z),(.48,3.4,.45));box('Cadres anthracite',(x,3.42,z),(.65,.18,.65))
  for yy in [.25,2.8]:box('Métal brossé',(x,yy,z),(.56,.17,.52))
for x in [-6.95,6.95]:box('Béton sombre',(x,.6,11.5),(8.1,1.2,.35),solid=True)
SOLIDS += [{'kind':'limite de planque','x':0,'z':11.9,'hx':11.3,'hz':.15,'y':0,'height':5},{'kind':'baie panoramique','x':0,'z':-11.5,'hx':11.3,'hz':.19,'y':0,'height':5}]
box('Béton sombre',(0,.55,-11.5),(22,1.1,.38))
box('Verre',(0,3.0,-11.52),(21.8,3.4,.035))
for x in [-10.7,-7.15,-3.58,0,3.58,7.15,10.7]:box('Cadres anthracite',(x,2.9,-11.42),(.10,3.6,.15))
for y in [1.15,4.75]:box('Acier patiné',(0,y,-11.4),(22,.2,.3))
neon((-10.4,4.5,-11.24),(10.4,4.5,-11.24),'Néon rose',.025)
for x in [-10.2,10.2]:
 box('Tissu rose',(x,3.25,-10.98),(1.10,2.5,.025));text('P',x,3.7,-10.95,.8);text('PINK',x,3.23,-10.95,.19);text('WARS',x,2.98,-10.95,.19)
# Eight genuinely enclosed rooms; the upper walls are removed only in cutaway.
DOORS=[
 {'id':'dortoir','name':'Dortoir','axis':'x','x':-4.55,'z':-6.35,'width':2.10},
 {'id':'armurerie','name':'Armurerie','axis':'x','x':-4.55,'z':0,'width':2.10},
 {'id':'tenues','name':'Tenues','axis':'x','x':-4.55,'z':6.25,'width':2.10},
 {'id':'bain','name':'Salle de bain','axis':'x','x':4.55,'z':-6.35,'width':2.10},
 {'id':'archives-ouest','name':'Archives · ouest','axis':'z','x':-3.70,'z':-5,'width':1.55},
 {'id':'archives-centre','name':'Archives · salon','axis':'z','x':0,'z':-5,'width':2.10},
 {'id':'archives-est','name':'Archives · est','axis':'z','x':3.70,'z':-5,'width':1.55},
 {'id':'salon','name':'Salon','axis':'z','x':0,'z':3.2,'width':2.10},
 {'id':'recharge-ouest','name':'Recharge · ouest','axis':'z','x':-3.70,'z':3.2,'width':1.55},
 {'id':'recharge-est','name':'Recharge · est','axis':'z','x':3.70,'z':3.2,'width':1.55}
]
PORTALS=[{'id':'atelier','name':'Atelier nano','axis':'x','x':4.55,'z':1.25,'width':2.10,'height':2.65},{'id':'gym','name':'Salle de sport','axis':'x','x':4.55,'z':7.65,'width':3.05,'height':2.65}]
ROOMS=[
 {'id':'dortoir','name':'Dortoir','bounds':[-10.75,-11.5,-4.55,-5]},
 {'id':'bain','name':'Salle de bain','bounds':[4.55,-11.5,10.75,-5]},
 {'id':'armurerie','name':'Armurerie','bounds':[-10.75,-5,-4.55,3.2]},
 {'id':'tenues','name':'Tenues de combat','bounds':[-10.75,3.2,-4.55,11.45]},
 {'id':'atelier','name':'Atelier nano','bounds':[4.55,-5,10.75,3.2]},
 {'id':'gym','name':'Salle de sport','bounds':[4.55,3.2,10.75,11.45]},
 {'id':'archives','name':'Archives','bounds':[-4.55,-11.5,4.55,-5]},
 {'id':'salon','name':'Salon','bounds':[-2.95,-5,2.95,3.2]},
 {'id':'recharge','name':'Recharge et mission','bounds':[-4.55,3.2,4.55,11.45]}
]
def wall(axis,at,start,end,openings=()):
 cuts=sorted((max(start,c-w/2),min(end,c+w/2))for c,w in openings)
 spans=[];cursor=start
 for lo,hi in cuts:
  if lo>cursor:spans.append((cursor,lo))
  cursor=max(cursor,hi)
 if cursor<end:spans.append((cursor,end))
 for lo,hi in spans:
  length=hi-lo;center=(lo+hi)/2;c=(at,0,center)if axis=='x'else(center,0,at)
  box('Acier patiné',(c[0],.575,c[2]),(.16,1.15,length)if axis=='x'else(length,1.15,.16),solid=True,name='cloison de pièce')
  box('Cloisons hautes',(c[0],3.0,c[2]),(.16,3.7,length)if axis=='x'else(length,3.7,.16),solid=True,name='cloison haute')
  box('Cadres anthracite',(c[0],.085,c[2]),(.19,.17,length)if axis=='x'else(length,.17,.19))
 for c,w in openings:
  center=(at,3.75,c)if axis=='x'else(c,3.75,at)
  box('Cloisons hautes',center,(.16,2.2,w)if axis=='x'else(w,2.2,.16),solid=True,name='linteau de porte')
ZONE='Cloisons fermées'
for at in [-4.55,4.55]:wall('x',at,-11.5,11.45,[(d['z'],d['width'])for d in DOORS+PORTALS if d['axis']=='x'and d['x']==at])
wall('z',-5,-10.75,10.75,[(d['x'],d['width'])for d in DOORS if d['z']==-5])
wall('z',3.2,-10.75,4.55,[(d['x'],d['width'])for d in DOORS if d['z']==3.2])
wall('z',3.2,4.55,10.75)
for at in [-2.95,2.95]:wall('x',at,-5,3.2)
for door in DOORS:
 ZONE='Cadres de portes'
 x,z,w=door['x'],door['z'],door['width'];axis=door['axis']
 def pos(along,y,depth=0):return(x+depth,y,z+along)if axis=='x'else(x+along,y,z+depth)
 def size(along,y,depth):return(depth,y,along)if axis=='x'else(along,y,depth)
 for side in [-1,1]:
  box('Métal brossé',pos(side*(w/2+.04),1.3),size(.08,2.6,.27));box('Cuir et joints',pos(side*(w/2+.005),1.3),size(.018,2.57,.12))
 box('Cadres anthracite',pos(0,2.73),size(w+.5,.25,.38));rod('Métal brossé',pos(-w*.85,2.70,.10),pos(w*.85,2.70,.10),.026,12)
 for side in [-1,1]:cyl('Métal brossé',pos(side*w*.4,2.74,.15),.052,.035,16,axis='x'if axis=='x'else'z')
 box('Cadres anthracite',pos(w/2+.16,1.18,.16),size(.19,.37,.07));cyl('Néon bleu',pos(w/2+.16,1.23,.21),.035,.02,14,axis='x'if axis=='x'else'z')
 # The source file includes closed glass leaves. Runtime instances slide them.
 ZONE='Portes mobiles / '+door['id']
 for side in [-1,1]:
  mid=side*w/4;box('Verre dépoli des portes',pos(mid,1.29),size(w*.455,2.38,.042))
  for edge in [-1,1]:box('Métal brossé',pos(mid+edge*w*.244,1.29),size(w*.0225,2.52,.075))
  for yy in [.06,2.52]:box('Métal brossé',pos(mid,yy),size(w*.465,.065,.075))
  box('Cuir et joints',pos(mid-side*w*.175,1.16,.05),size(.075,.15,.016))
  neon(pos(mid-side*w*.22,1.73,.047),pos(mid-side*w*.22,2.15,.047),'Néon bleu',.006)
# Open gym entrance: chamfered industrial portal, visible from the entrance.
ZONE='Cadres de portes'
for portal in PORTALS:
 x,z,w=portal['x'],portal['z'],portal['width']
 for side in [-1,1]:
  zz=z+side*(w/2+.10)
  box('Cadres anthracite',(x,1.30,zz),(.38,2.60,.20))
  box('Métal brossé',(x-.19,1.17,zz),(.035,2.34,.095))
  neon((x-.22,.25,zz),(x-.22,2.10,zz),'Néon bleu',.012)
  rod('Acier patiné',(x-.08,2.28,z+side*(w/2-.12)),(x-.08,2.58,z+side*(w/2-.43)),.10,8)
 box('Cadres anthracite',(x,2.73,z),(.42,.23,w+.38))
 neon((x-.24,2.68,z-w*.37),(x-.24,2.68,z+w*.37),'Néon rose',.013)
 # No leaf or invisible collision across the aperture.
 o=text('PINKWARS  /  GYM' if portal['id']=='gym' else 'ATELIER NANO',x-.25,2.52,z,.16,'Néon blanc');o.rotation_euler=(math.pi/2,0,-math.pi/2)
# Workshop label on the shared pier, visible from the central hall.
box('Cadres anthracite',(4.31,1.83,4.00),(.08,.75,1.1))
for label,yy in [('ATELIER',1.97),('NANO',1.73)]:
 o=text(label,4.25,yy,4.00,.15,'Néon blanc');o.rotation_euler=(math.pi/2,0,-math.pi/2)
neon((4.24,1.49,3.67),(4.24,1.49,4.33),'Néon rose',.010)
ZONE='Architecture'
# Ceiling service beams and conduit runs leave the diorama open, as in the reference.
for z in [-10.8,-4.9,3.2,10.8]:
 for x in [-7.8,7.8]:
  box('Acier patiné',(x,2.95,z),(6.5,.22,.25));neon((x-2.7,2.82,z+.13),(x+2.7,2.82,z+.13),'Néon rose',.018)
for x in [-10.5,10.5]:
 for k in range(3):rod('Métal brossé',(x+k*.10,2.7,-10.8),(x+k*.10,2.7,10.7),.035,8)

print('Planque: dortoir et salle de bain',flush=True)
ZONE='Dortoir'
for x,name,cloth,light in [(-8.9,'GHJU','Tissu rose','Néon rose'),(-6.4,'LYLU','Tissu bleu','Néon bleu')]:
 bed_mark=mark_furniture()
 box('Cadres anthracite',(x,.23,-8.5),(1.65,.44,3),solid=True);box('Acier patiné',(x,.46,-8.5),(1.58,.15,2.95))
 cushion('Tissu neutre',(x,.62,-8.5),(1.47,.29,2.8));quilt(cloth,(x,.795,-8.13),1.55,1.98)
 # Bed frame feet, visible mattress piping and stitched padded blanket panels.
 for dx in [-.61,.61]:
  for zz in [-9.65,-7.35]:cyl('Métal brossé',(x+dx,.13,zz),.045,.24,10)
 for side in [-1,1]:rod('Tissu neutre',(x+side*.71,.69,-9.65),(x+side*.71,.69,-7.2),.012,6)
 for side in [-1,1]:rod('Papier ivoire',(x+side*.69,.79,-9.0),(x+side*.69,.79,-7.3),.018)
 cushion('Papier ivoire',(x,.84,-9.45),(1.18,.29,.60));cushion(cloth,(x,.89,-9.45),(1.08,.22,.56))
 box('Acier patiné',(x,.95,-10.0),(1.63,1.10,.17));neon((x-.64,1.38,-9.87),(x+.64,1.38,-9.87),light,.022)
 text(name,x,.80,-6.96,.32)
 box('Acier patiné',(x+1.0,.4,-9.4),(.38,.8,.55));cyl('Cuivre et outils',(x+1,.86,-9.4),.13,.08);rod('Métal brossé',(x+1,.89,-9.4),(x+1,1.20,-9.4),.025);ellipsoid(light,(x+1,1.23,-9.4),(.23,.20,.23))
 fit_furniture(bed_mark,(x,0,-8.5),(1.25/1.65,.55/.77,.70))
 SOLIDS[-1]['height']=.59
 SOLIDS.append({'kind':'table de chevet','x':x+1.25/1.65,'z':-8.5+(-.9)*.70,'hx':.19*1.25/1.65,'hz':.275*.70,'y':0,'height':.8*.55/.77})
box('Acier patiné',(-8,1.72,-10.9),(5.15,.13,.52));books(-9.9,1.80,-10.8,23)
box('Cadres anthracite',(-8.1,1.45,-11.08),(3.1,.75,.04))
for i in range(9):box('Papier ivoire',(-9.3+(i%5)*.5,1.45+(i//5)*.3,-11.04),(.32,.22,.015),yaw=random.uniform(-.1,.1))
plant(-10.35,1.5,-10.6,.8);plant(-5.3,0,-10.4,.6)
ZONE='Salle de bain'
box('Peinture médicale',(7.8,.04,-8),(5.6,.07,5.6))
box('Peinture médicale',(7.85,1.65,-11.25),(5.65,2.7,.12),solid=True,name='mur carrelé de la salle de bain')
# Shower tray, glass enclosure, mixer, head, drain.
shower_mark=mark_furniture()
box('Peinture médicale',(6.25,.15,-9.4),(2,.24,2.4),solid=True);box('Cadres anthracite',(6.25,.28,-9.4),(1.72,.025,2.1));cyl('Métal brossé',(6.25,.3,-9.4),.07,.015,12)
for x in [5.25,7.25]:rod('Métal brossé',(x,.3,-10.5),(x,2.65,-10.5),.035);rod('Métal brossé',(x,2.65,-10.5),(x,2.65,-8.3),.035)
box('Verre',(5.25,1.5,-9.4),(.018,2.4,2.2));box('Verre',(7.25,1.5,-9.4),(.018,2.4,2.2));rod('Métal brossé',(6.25,1.0,-10.6),(6.25,2.4,-10.6),.035);rod('Métal brossé',(6.25,2.4,-10.6),(6.25,2.4,-10.2),.035);cyl('Métal brossé',(6.25,2.37,-10.1),.18,.05,20);ring('Néon bleu',(6.25,2.34,-10.1),.15,.005,24)
for x in [6.05,6.45]:cyl('Métal brossé',(x,1.18,-10.5),.045,.10,12,axis='z')
fit_furniture(shower_mark,(6.25,0,-9.4),(.60,.86,1.4/2.4))
# Basin on a ribbed cabinet, mirror, modern faucet; toilet has a sculpted bowl.
sink_mark=mark_furniture()
box('Acier patiné',(8.65,.58,-10.45),(1.6,1.16,.65),solid=True);box('Métal brossé',(8.65,1.15,-10.40),(1.75,.08,.8));basin('Peinture médicale',(8.65,1.35,-10.32),1.14,.64,.24);cyl('Métal brossé',(8.65,1.115,-10.32),.042,.01,12);polyline('Métal brossé',[(8.65,1.2,-10.7),(8.65,1.63,-10.7),(8.65,1.63,-10.32)],.025)
for xx in [8.25,9.05]:rod('Métal brossé',(xx-.13,.87,-10.10),(xx+.13,.87,-10.10),.018)
for j in range(9):box('Cadres anthracite',(7.98+j*.16,.55,-10.11),(.016,.83,.015))
fit_furniture(sink_mark,(8.65,0,-10.45),(.78,.90/1.37,.95))
mirror_mark=mark_furniture()
box('Métal brossé',(8.65,2.0,-11.1),(1.5,1.35,.08));box('Miroir poli',(8.65,2.0,-11.03),(1.35,1.2,.025));neon((8.03,2.57,-10.99),(9.27,2.57,-10.99),'Néon blanc',.012)
fit_furniture(mirror_mark,(8.65,0,-11.1),(.78,.88,1),(0,-.19,0))
toilet_mark=mark_furniture()
ellipsoid('Peinture médicale',(10,.37,-9.65),(.68,.7,.85),20);basin('Peinture médicale',(10,.69,-9.6),.74,1.0,.25);box('Peinture médicale',(10,.86,-10.1),(.7,1.0,.32),solid=True)
box('Métal brossé',(10,1.37,-10.1),(.23,.025,.12))
fit_furniture(toilet_mark,(10,0,-10.1),(.70,.45/.71,.75))
SOLIDS.append({'kind':'cuvette WC','x':10,'z':-9.725,'hx':.26,'hz':.37,'y':0,'height':.46})
# Glazed wall tiles, shower perforations and threshold grille give human scale.
for xx in [5.45+j*.38 for j in range(14)]:rod('Métal brossé',(xx,.32,-11.182),(xx,2.95,-11.182),.003,4)
for yy in [.45,.9,1.35,1.8,2.25,2.7]:rod('Métal brossé',(5.35,yy,-11.182),(10.5,yy,-11.182),.003,4)
for j in range(9):rod('Métal brossé',(6.25+(5.50+j*.18-6.25)*.60,.305*.86,-9.4+(.85)*1.4/2.4),(6.25+(5.50+j*.18-6.25)*.60,.305*.86,-9.4+(1.05)*1.4/2.4),.006,6)
for xx in [-.08,0,.08]:
 for zz in [-.08,0,.08]:cyl('Cadres anthracite',(6.25+xx*.60,2.34*.86,-9.4+(-.7+zz)*1.4/2.4),.006,.004,6)
box('Tissu rose',(8.3,.9,-9.6),(.32,.65,.06));rod('Métal brossé',(8.08,1.25,-9.6),(8.53,1.25,-9.6),.018);plant(10.1,0,-6.2,.55)

print('Planque: livre, salon, armes',flush=True)
ZONE='Archives de l’histoire'
archive_mark=mark_furniture()
profile('Acier patiné',0,-8.0,[(-2.8,.1),(2.8,.1),(3.1,.45),(3.1,.95),(2.7,1.2),(-2.7,1.2),(-3.1,.95),(-3.1,.45)],2.2)
SOLIDS.append({'kind':'table des archives','x':0,'z':-8,'hx':3.1,'hz':1.1,'y':0,'height':1.2})
box('Cadres anthracite',(0,1.22,-8),(5.75,.09,2.0));neon((-2.5,.42,-6.83),(2.5,.42,-6.83),'Néon rose',.018)
# Open book with curved page stacks, actual spine, ruled text and luminous ribbon.
book_mark=mark_furniture()
box('Tissu rose',(0,1.30,-8),(2.55,.08,1.6));box('Cuivre et outils',(0,1.34,-8),(.17,.12,1.64))
for side in [-1,1]:
 for layer in range(5):
  pts=[(side*(.07+i*.22),1.38+layer*.012+.13*math.sin(i/5*math.pi),-8.71) for i in range(6)];v=pts+[(x,y,-7.28)for x,y,z in pts];mesh('Papier ivoire',v,[(i,i+1,6+i+1,6+i)for i in range(5)])
 for j in range(13):rod('Tissu rose',(side*.20,1.48,-8.58+j*.095),(side*1.1,1.49,-8.58+j*.095),.003,4)
fit_furniture(book_mark,(0,1.265,-8),(.65/(2.55*.65),.75,.48/(1.6*.65)))
ring('Néon rose',(0,1.35,-8),.55,.012,48)
for x in [-2.05,2.05]:
 screen(x,1.6,-8.2,.8,.6);rod('Métal brossé',(x,1.25,-8.4),(x,2.05,-8.5),.04);screen(x,2.05,-8.5,1.15,.67)
books(-2.65,1.29,-7.9,4);books(2.1,1.29,-7.6,4)
fit_furniture(archive_mark,(0,0,-8),(.65,.85/1.265,.65))
SOLIDS[-1]['height']=.85
plant(-3.7,0,-10.7,.7);plant(3.7,0,-10.7,.7)
ZONE='Salon central'
box('Tissu rose',(0,.028,1),(5.5,.035,4.0))
for side in [-1,1]:
 sofa_mark=mark_furniture()
 x=side*2.28;box('Acier patiné',(x,.29,1),(.85,.5,3.1),solid=True)
 for z in [.04,1,1.96]:
  cushion('Tissu neutre',(x,.65,z),(.82,.34,.91));cushion('Tissu neutre',(x+side*.34,1.08,z),(.22,.88,.91))
  rod('Tissu neutre',(x-side*.37,.70,z-.38),(x-side*.37,.70,z+.38),.009,6)
 for z in [-.52,2.52]:
  cushion('Cuir et joints',(x,.86,z),(.88,.45,.24));cushion('Tissu rose'if side<0 else'Tissu bleu',(x-side*.1,1.12,z-side*.2),(.55,.43,.36))
 for dx in [-.44,.44]:
  for z in [-.32,2.32]:cyl('Métal brossé',(x+dx,.12,z),.045,.23,10)
 fit_furniture(sofa_mark,(x,0,1),(1,.45/.82,.82))
 SOLIDS[-1]['height']=.45
coffee_mark=mark_furniture()
box('Cadres anthracite',(0,.39,1),(.90,.65,1.7),solid=True);box('Métal brossé',(0,.74,1),(1.0,.08,1.8));screen(0,.86,.8,.55,.3)
for x,z in [(-.30,.6),(.30,1.5)]:
 cyl('Cuivre et outils',(x,.86,z),.08,.16,20);ring('Cadres anthracite',(x,.946,z),.064,.008,20);ring('Cuivre et outils',(x+.09,.86,z),.045,.012,20,axis='z')
fit_furniture(coffee_mark,(0,0,1),(.90,.45/.78,.82))
SOLIDS[-1]['height']=.45
ZONE='Mur d’armes'
box('Cadres anthracite',(-7.7,1.6,-4.52),(5.6,2.65,.22),solid=True)
for x in [-10.0,-8.8,-7.6,-6.4,-5.3]:
 for y in [.65,1.15,1.65,2.15,2.65]:cyl('Métal brossé',(x,y,-4.38),.017,.02,6,axis='z')
# Native weapons are installed by hideout-showcase.js. Only their physical
# cradles are modelled here; no decorative substitute rifle is exported.
SHOWCASE_WEAPONS=[]
CATALOGUE_NAMES={0:'VX-9',1:'NEXUS V9',2:'ARES X9',3:'THORN',4:'NOVA',5:'AURORA',6:'M-12',7:'VX-9 DUO',8:'VORTEX AR-7',9:'VOLTIS IEM',10:'GROZA-40 VESPER'}
for row,indices in enumerate([(0,1,2),(3,4,6),(9,10,5)]):
 for col,index in enumerate(indices):
  x=-9.45+col*1.75;y=2.48-row*.83
  SHOWCASE_WEAPONS.append({'index':index,'x':x,'y':y,'z':-4.30})
  for side in [-1,1]:
   polyline('Métal brossé',[(x+side*.26,y-.08,-4.36),(x+side*.26,y-.08,-4.10),(x+side*.26,y-.03,-4.10)],.014)
  box('Acier patiné',(x,y-.365,-4.34),(1.3,.105,.025));text(CATALOGUE_NAMES[index],x,y-.388,-4.30,.073,'Néon bleu')
box('Acier patiné',(-7.7,.25,-3.8),(4.7,.5,.75),solid=True,name='vitrine de pistoles')
box('Verre',(-7.7,.57,-3.8),(4.5,.10,.66))
for xx in [-8.12,-7.28]:
 for zz in [-3.91,-3.69]:box('Cuir et joints',(xx,.64,zz),(.09,.04,.09))
text('VX-9 DUO',-7.7,.35,-3.40,.12,'Néon rose')
SHOWCASE_WEAPONS.append({'index':7,'x':-7.7,'y':.65,'z':-3.8,'bench':True})
SHOWCASE_WEAPONS.append({'index':8,'x':6.9,'y':.975,'z':-.90,'bench':True})
neon((-10.2,2.97,-4.28),(-5.25,2.97,-4.28),'Néon rose',.025)
for x in [-10.15,-5.2]:crate(x,-3.45,scale=.65)

print('Planque: armures et recharge',flush=True)
ZONE='Tenues de combat'
for x,accent in [(-8.9,'Néon rose'),(-6.4,'Néon bleu')]:
 box('Acier patiné',(x,1.35,3.7),(1.85,2.65,.36),solid=True);box('Cadres anthracite',(x,1.37,3.95),(1.60,2.4,.18))
 for xx in [-.83,.83]:neon((x+xx,.25,4.05),(x+xx,2.55,4.05),accent,.018)
 cyl('Cadres anthracite',(x,.15,4.3),.58,.24,32);ring(accent,(x,.28,4.3),.47,.012,48);screen(x,2.64,4.05,1.2,.32,accent)
 text('GHJU'if x< -7.7 else'LYLU',x,2.29,4.08,.19,accent)
 SOLIDS.append({'kind':'tenue exposée','x':x,'z':4.3,'hx':.64,'hz':.64,'y':0,'height':2.45})
 for side in [-1,1]:
  box('Métal brossé',(x+side*.67,1.43,4.03),(.10,.16,.16));cyl('Cuir et joints',(x+side*.67,1.43,4.13),.04,.02,12,axis='z')
for x in [-10.1,-5.2]:
 for y in [.45,1.13,1.81]:
  box('Acier patiné',(x,y,3.9),(.65,.64,.65));box('Cadres anthracite',(x,y,4.25),(.53,.53,.03));rod('Métal brossé',(x+.19,y-.1,4.30),(x+.19,y+.1,4.30),.025)
crate(-9.8,7.45);crate(-5.6,7.5,scale=.8)
for x,z in [(-10.0,9.9),(-8.4,10.0),(-6.8,10.0)]:crate(x,z,scale=.8)
ZONE='Stations des compagnons'
for x,name,accent in [(-2.15,'GAB-1','Néon rose'),(2.15,'CAR-14','Néon bleu')]:
 dock_mark=mark_furniture()
 outline=[(-1,.1),(1,.1),(1.2,.4),(1.2,2.25),(.83,2.65),(-.83,2.65),(-1.2,2.25),(-1.2,.4)]
 profile('Acier patiné',x,6.6,outline,.40);profile('Cadres anthracite',x,6.85,[(xx*.85,.2+(yy-.2)*.92)for xx,yy in outline],.08)
 cyl('Acier patiné',(x,.22,7.30),.98,.32,12);ring(accent,(x,.40,7.30),.73,.025);ring(accent,(x,.43,7.30),.49,.015)
 for side in [-1,1]:neon((x+side*.93,.5,6.97),(x+side*.93,2.27,6.97),accent,.025)
 # Segmented service housing, vented core, ceramic contacts and locking clamps.
 for side in [-1,1]:
  for yy in [.55,1.15,1.75,2.3]:
   box('Métal brossé',(x+side*1.01,yy,6.96),(.19,.07,.13));cyl('Cuir et joints',(x+side*1.01,yy,7.04),.025,.025,8,axis='z')
 for j in range(9):box('Métal brossé',(x-.5+j*.125,.7,6.95),(.045,.35,.025))
 for j in range(8):
  a=j*TAU/8;cyl('Métal brossé',(x+math.cos(a)*.85,.407,7.30+math.sin(a)*.85),.045,.03,10)
 for side in [-1,1]:
  polyline('Cuir et joints',[(x+side*.75,.20,6.95),(x+side*.65,.30,7.3),(x+side*.45,.46,7.65)],.035)
 box('Cadres anthracite',(x,2.63,6.97),(1.85,.46,.12));text('Recharge',x,2.71,7.05,.17);text(name,x,2.47,7.05,.23,accent)
 for yy,rr in [(.82,.5),(1.05,.35)]:ring(accent,(x,yy,7.3),rr,.008)
 # Real Cara / Gaby are captured from createCompanionModel by the catalogue bake.
 SOLIDS.append({'kind':'station '+name,'x':x,'z':6.6,'hx':1.2,'hz':.4,'y':0,'height':2.7});SOLIDS.append({'kind':'socle '+name,'x':x,'z':7.3,'hx':.96,'hz':.96,'y':0,'height':.4})
 fit_furniture(dock_mark,(x,0,7.3),(.76,.80,.76))
screen(0,1.06,6.7,.55,.42);box('Acier patiné',(0,.5,6.65),(.68,.95,.46),solid=True)
for side in [-1,1]:polyline('Cuir et joints',[(side*.3,.1,6.7),(side*.7,.10,7.1),(side*1.1,.12,6.8)],.045)

print('Planque: atelier et porte',flush=True)
ZONE='Atelier nanométrique'
box('Cadres anthracite',(7.8,1.7,-4.5),(5.6,3.15,.25),solid=True)
screen(7.75,1.90,-4.3,2.15,1.25);screen(5.75,2.20,-4.25,.68,.56);screen(5.75,1.40,-4.25,.68,.54);screen(9.95,2.25,-4.25,.50,.63)
for j in range(6):
 x=5.35+j*.16;rod('Métal brossé',(x,1.25,-4.27),(x,1.7,-4.27),.025);ellipsoid('Cuivre et outils',(x,1.25,-4.24),(.07,.09,.03))
bench_mark=mark_furniture()
for x in [5.3,9.3]:
 box('Acier patiné',(x,.63,-1.1),(1.2,1.25,1.35),solid=True)
 for k in range(5):box('Cadres anthracite',(x,.22+k*.22,-.40),(1.06,.17,.04))
 for k in range(5):
  yy=.22+k*.22;box('Acier patiné',(x,yy,-.363),(1.01,.145,.025))
  polyline('Métal brossé',[(x-.27,yy,-.34),(x-.27,yy,-.30),(x+.27,yy,-.30),(x+.27,yy,-.34)],.014)
  cyl('Cuir et joints',(x+.40,yy,-.34),.018,.014,10,axis='z')
box('Métal brossé',(7.35,1.31,-1.1),(5.5,.17,1.6),solid=True);box('Cadres anthracite',(7.35,1.41,-1.1),(5.30,.06,1.4))
fit_furniture(bench_mark,(7.35,0,-1.1),(1,.95/1.44,.90))
SOLIDS[-1]['height']=.95-SOLIDS[-1]['y']
tool_mark=mark_furniture()
# Soft service pad and adjustable rests support the real VORTEX AR7.
cushion('Cuir et joints',(6.9,1.454,-.9),(1.7,.025,.6))
for xx in [6.45,7.25]:
 box('Métal brossé',(xx,1.47,-.9),(.09,.045,.32))
 for zz in [-1.03,-.77]:cyl('Cuir et joints',(xx,1.50,zz),.035,.06,12,axis='x')
for x,z in [(5.2,-.6),(7.8,-1.3),(8.5,-.8)]:
 cyl('Cuivre et outils',(x,1.49,z),.065,.10,10);box('Acier patiné',(x+.22,1.49,z),(.25,.08,.12))
# Industrial articulated service arm: pedestal, shoulder, joints, tapering links, wrist and two-finger tool.
robot_mark=mark_furniture()
cyl('Cadres anthracite',(9.3,1.49,-1.3),.25,.24,16);cyl('Bras robot orange',(9.3,1.72,-1.3),.20,.30,12)
for A,B in [((9.3,1.78,-1.3),(9.9,2.65,-1.5)),((9.9,2.65,-1.5),(8.8,2.95,-1.25)),((8.8,2.95,-1.25),(8.15,2.4,-1.0))]:
 rod('Bras robot orange',A,B,.12,8);ellipsoid('Cadres anthracite',A,(.31,.31,.31));ellipsoid('Métal brossé',B,(.23,.23,.23));rod('Cuir et joints',(A[0],A[1],A[2]+.16),(B[0],B[1],B[2]+.16),.025)
 cyl('Métal brossé',A,.13,.34,16,axis='z')
 for s in [-1,1]:cyl('Cuir et joints',(A[0],A[1],A[2]+s*.18),.06,.03,10,axis='z')
 # Offset piston and protective ribbed hose do not intrude into the player aisle.
 pa=(A[0]-.10,A[1]+.1,A[2]-.16);pb=((A[0]+B[0])*.5,(A[1]+B[1])*.5,A[2]-.16)
 rod('Cadres anthracite',pa,pb,.055,10);rod('Métal brossé',pb,(B[0]-.1,B[1]-.1,B[2]-.16),.025,10)
for s in [-1,1]:polyline('Métal brossé',[(8.15,2.4,-1),(8.15+s*.12,2.2,-1),(8.15+s*.06,2.05,-1)],.03)
fit_furniture(robot_mark,(9.3,1.37,-1.3),(.88,.88,.88),(0,.07,0))
fit_furniture(tool_mark,(7.35,0,-1.1),(1,1,1),(0,-.49,0))
seat_mark=mark_furniture()
cyl('Métal brossé',(7.7,.35,1.2),.06,.6);cyl('Cadres anthracite',(7.7,.72,1.2),.40,.12,16);cushion('Tissu rose',(7.7,.83,1.2),(.65,.19,.65));cushion('Tissu rose',(7.7,1.14,1.48),(.64,.65,.15))
SOLIDS.append({'kind':'siège d’atelier','x':7.7,'z':1.2,'hx':.45,'hz':.45,'y':0,'height':1.5})
for j in range(5):
 a=j/5*TAU;rod('Métal brossé',(7.7,.13,1.2),(7.7+math.sin(a)*.48,.10,1.2+math.cos(a)*.48),.03);ellipsoid('Cuir et joints',(7.7+math.sin(a)*.48,.08,1.2+math.cos(a)*.48),(.12,.12,.1))
fit_furniture(seat_mark,(7.7,0,1.2),(.90,.50/.925,.90))
# Former rear nano storage is replaced by the gym. Main nano bench stays intact.
# Retain a compact wall cabinet inside the workshop, outside the walking aisle.
x=10.10
box('Acier patiné',(x,.48,1.65),(.65,.96,.85),solid=True)
for j in range(3):
 box('Cadres anthracite',(x,.21+j*.23,2.09),(.53,.17,.04))
 neon((x-.18,.21+j*.23,2.12),(x+.18,.21+j*.23,2.12),'Néon bleu',.007)
plant(10.1,0,-4.0,.55)
# Gym equipment is authored at metric scale, exported as material-batched PWM
# geometry and rendered by the existing WebGPU scene. No extra runtime rig.
ZONE='Salle de sport'
# Tiled rubber training floor, a perimeter pink LED strip, and wall graphics.
for i in range(6):
 for j in range(8):
  box('Cuir et joints',(5.14+i*.91,.034,3.79+j*.94),(.90,.035,.93))
for a,b in [((4.83,.058,3.43),(10.48,.058,3.43)),((10.48,.058,3.43),(10.48,.058,11.15)),((10.48,.058,11.15),(4.83,.058,11.15)),((4.83,.058,11.15),(4.83,.058,9.25)),((4.83,.058,6.05),(4.83,.058,3.43))]:
 neon(a,b,'Néon rose',.012)
# Back-wall logo visible as the player enters from the west.
box('Cadres anthracite',(10.60,2.25,7.35),(.08,.85,2.8))
for label,y,size,mat in [('PINKWARS',2.43,.28,'Néon rose'),('GYM  ///',2.08,.22,'Néon blanc')]:
 o=text(label,10.55,y,7.35,size,mat);o.rotation_euler=(math.pi/2,0,-math.pi/2)
# Four-post squat cage, 2.25 m tall, 1.4 m wide, 1.25 m deep.
rx,rz=8.75,4.75
for dx in [-.70,.70]:
 for dz in [-.62,.62]:
  xx,zz=rx+dx,rz+dz
  box('Cadres anthracite',(xx,1.14,zz),(.075,2.20,.075))
  box('Acier patiné',(xx,.09,zz),(.25,.12,.34))
  box('Tissu rose',(xx,1.18,zz+.044),(.043,1.96,.014))
  for k in range(15):cyl('Cuir et joints',(xx,.44+k*.112,zz+.056),.013,.009,8,axis='z')
  for yy in [.12,2.15]:box('Métal brossé',(xx,yy,zz),(.11,.09,.11))
 for yy in [.15,2.18]:box('Acier patiné',(rx+dx,yy,rz),(.08,.075,1.32))
for dz in [-.62,.62]:
 box('Acier patiné',(rx,2.22,rz+dz),(1.49,.085,.085))
rod('Métal brossé',(rx-.67,2.10,rz+.64),(rx+.67,2.10,rz+.64),.019,12)
for dx in [-.70,.70]:
 box('Métal brossé',(rx+dx,1.30,rz+.68),(.13,.13,.17))
 box('Cadres anthracite',(rx+dx,1.36,rz+.77),(.11,.09,.05))
# Olympic barbell and plates (2.20 m overall; 450 mm plate diameter).
bar_y,bar_z=1.40,rz+.73
rod('Métal brossé',(rx-1.10,bar_y,bar_z),(rx+1.10,bar_y,bar_z),.014,16)
for side in [-1,1]:
 rod('Métal brossé',(rx+side*.65,bar_y,bar_z),(rx+side*1.10,bar_y,bar_z),.025,16)
 for i in range(3):
  xx=rx+side*(.79+i*.065);r=.225 if i<2 else .18
  cyl('Cuir et joints',(xx,bar_y,bar_z),r,.055,24,axis='x')
  cyl('Acier patiné',(xx+side*.029,bar_y,bar_z),.045,.008,16,axis='x')
  # rings face outward on the plate faces
  for k in range(6):
   a=k*TAU/6;cyl('Métal brossé',(xx+side*.030,bar_y+math.cos(a)*r*.72,bar_z+math.sin(a)*r*.72),.011,.009,8,axis='x')
 cyl('Métal brossé',(rx+side*1.035,bar_y,bar_z),.038,.035,16,axis='x')
# Flat utility bench within the rack station, 45 cm seat height.
bx,bz=rx,5.90
for zz in [bz-.53,bz+.53]:
 box('Acier patiné',(bx,.10,zz),(.55,.085,.14))
 rod('Métal brossé',(bx,.13,zz),(bx,.35,zz),.043,8)
box('Cadres anthracite',(bx,.34,bz),(.19,.075,1.29))
cushion('Cuir et joints',(bx,.409,bz),(.32,.085,1.28))
for side in [-1,1]:rod('Tissu rose',(bx+side*.15,.424,bz-.54),(bx+side*.15,.424,bz+.54),.007,6)
SOLIDS.append({'kind':'Gym squat et banc','x':rx,'z':5.02,'hx':1.12,'hz':1.53,'y':0,'height':2.25})
# Three-tier dumbbell rack on east wall: individually modelled hex heads,
# progressive weights, knurled metal handles and pink weight markers.
dx,dz=10.03,7.65
for zz in [dz-1.32,dz+1.32]:
 rod('Acier patiné',(dx-.34,.10,zz),(dx+.15,1.30,zz),.045,8)
 box('Cadres anthracite',(dx,.08,zz),(.72,.07,.13))
for level in range(3):
 y=.36+level*.36
 box('Acier patiné',(dx,y,dz),(.57,.07,2.66))
 box('Cuir et joints',(dx,y+.043,dz),(.49,.035,2.58))
 box('Cadres anthracite',(dx-.275,y+.045,dz),(.055,.09,2.65))
 for j in range(8):
  zz=dz-1.12+j*.32;rr=.085+(.017*(2-level))+.004*j;yy=y+.065+rr
  rod('Métal brossé',(dx-.18,yy,zz),(dx+.18,yy,zz),.018,12)
  for side in [-1,1]:
   xx=dx+side*.135
   cyl('Cadres anthracite',(xx,yy,zz),rr,.095,6,axis='x')
   cyl('Tissu rose',(xx+side*.05,yy,zz),rr*.32,.012,8,axis='x')
SOLIDS.append({'kind':'Gym rack haltères','x':dx,'z':dz,'hx':.38,'hz':1.38,'y':0,'height':1.38})
# Rower, 2.44 m rail and flywheel, positioned parallel to the south wall.
xx,zz=7.30,10.14
for x in [xx-.91,xx+.96]:
 box('Cadres anthracite',(x,.10,zz),(.15,.09,.65))
 rod('Acier patiné',(x,.13,zz),(x,.29,zz),.047,8)
box('Métal brossé',(xx-.20,.30,zz),(1.82,.10,.12))
box('Cadres anthracite',(xx-.20,.24,zz),(1.85,.065,.17))
cushion('Cuir et joints',(xx-.50,.385,zz),(.31,.09,.31))
for side in [-1,1]:
 box('Cadres anthracite',(xx+.36,.26,zz+side*.16),(.27,.075,.13),yaw=0)
 box('Tissu rose',(xx+.36,.305,zz+side*.16),(.055,.025,.15))
rod('Acier patiné',(xx+.73,.18,zz),(xx+.88,.62,zz),.08,10)
cyl('Cadres anthracite',(xx+.88,.66,zz),.32,.25,32,axis='z')
for side in [-1,1]:
 cyl('Métal brossé',(xx+.88,.66,zz+side*.13),.28,.018,32,axis='z')
 ring('Néon rose',(xx+.88,.66,zz+side*.145),.256,.009,32,axis='z')
 for k in range(12):
  a=k*TAU/12;cyl('Cuir et joints',(xx+.88+math.cos(a)*.20,.66+math.sin(a)*.20,zz+side*.143),.018,.008,8,axis='z')
rod('Métal brossé',(xx+.58,.60,zz),(xx+.23,1.04,zz),.025,10)
box('Cadres anthracite',(xx+.22,1.06,zz),(.17,.13,.24))
box('Néon bleu',(xx+.13,1.07,zz),(.009,.073,.16))
rod('Métal brossé',(xx+.40,.65,zz-.19),(xx+.40,.65,zz+.19),.017,12)
rod('Cuir et joints',(xx+.40,.65,zz-.18),(xx+.40,.65,zz-.075),.026,10)
rod('Cuir et joints',(xx+.40,.65,zz+.075),(xx+.40,.65,zz+.18),.026,10)
SOLIDS.append({'kind':'Gym rameur','x':xx,'z':zz,'hx':1.25,'hz':.35,'y':0,'height':1.12})
# Storage locker, towels and small equipment, under a cyan-lit shelf.
box('Acier patiné',(10.10,.96,10.55),(.72,1.85,.88),solid=True,name='Gym casier')
box('Cadres anthracite',(9.70,.96,10.55),(.045,1.74,.78))
rod('Métal brossé',(9.66,.85,10.79),(9.66,1.13,10.79),.015)
neon((9.65,.18,10.20),(9.65,.18,10.90),'Néon rose',.009)
box('Acier patiné',(10.18,2.11,10.55),(.70,.08,1.02))
neon((9.83,2.04,10.10),(9.83,2.04,11.00),'Néon bleu',.012)
for j in range(3):
 cyl('Cadres anthracite',(10.2,2.24,10.22+j*.26),.075,.19,12)
 cyl('Tissu rose',(10.2,2.34,10.22+j*.26),.078,.035,12)
# Kettlebell pair and rolled training mat near the rack, outside the entry.
for j in range(2):
 x,z=9.83,5.85+j*.27
 ellipsoid('Cuir et joints',(x,.17,z),(.22,.23,.22),12)
 polyline('Métal brossé',[(x-.055,.23,z),(x-.055,.34,z),(x+.055,.34,z),(x+.055,.23,z)],.023)
# Ambient gym panel lighting, no additional expensive shadow pass.
box('Cadres anthracite',(7.6,3.43,7.45),(2.7,.10,.72))
box('Néon blanc',(7.6,3.367,7.45),(2.55,.025,.60))
ZONE='Porte de mission'
SOLIDS.append({'kind':'porte de mission','x':0,'z':11.15,'hx':2.9,'hz':.37,'y':0,'height':4.85})
outline=[(-2.1,0),(2.1,0),(2.9,.8),(2.9,2.8),(2.1,3.6),(-2.1,3.6),(-2.9,2.8),(-2.9,.8)]
profile('Acier patiné',0,11.15,outline,.65);profile('Cadres anthracite',0,11.52,[(x*.84,.1+y*.90)for x,y in outline],.12)
for side in [-1,1]:
 profile('Métal brossé',side*.88,11.60,[(-.82,.15),(.82,.15),(.82,3.1),(-.82,3.1)],.08)
 box('Verre dépoli des portes',(side*.85,1.65,11.66),(1.52,2.7,.025));box('Verre dépoli des portes',(side*.85,1.65,10.79),(1.52,2.7,.025));rod('Métal brossé',(side*.24,1.35,11.72),(side*.24,1.80,11.72),.035)
 for yy in [.55,2.66]:
  profile('Acier patiné',side*.91,11.70,[(-.64,yy-.16),(.5,yy-.16),(.66,yy),(.5,yy+.16),(-.64,yy+.16)],.04)
  for xx in [-.48,.48]:cyl('Métal brossé',(side*.91+xx,yy,11.74),.025,.02,8,axis='z')
 rod('Cadres anthracite',(side*2.27,.68,11.60),(side*2.27,2.45,11.60),.075,12)
 rod('Métal brossé',(side*2.27,2.45,11.60),(side*2.27,3.0,11.60),.035,12)
pts=[(x*.88,.12+y*.88,11.73)for x,y in outline];polyline('Néon rose',pts+[pts[0]],.034);text('P',0,1.25,11.76,1.05,'Néon rose')
box('Cadres anthracite',(0,3.75,11.34),(4.4,.7,.35));text('PORTE MISSION',0,3.78,11.56,.30);text('PROCHAINE DESTINATION',0,3.53,11.56,.12,'Néon bleu')
for z in [9.0,9.65,10.3]:
 polyline('Néon rose',[(-.4,.04,z+.2),(0,.04,z-.2),(.4,.04,z+.2)],.014)
for x in [-3.2,3.2]:crate(x,11.0,scale=.65)
# Crest, distressed paint and small floor drains provide scale without blocking movement.
ZONE='Marquages et détails'
ring('Tissu rose',(0,.04,-3.2),1.8,.04,80);text('P',0,.05,-3.2,2.0,'Tissu rose',True)
for side in [-1,1]:
 for z in [-6,-1,5]:
  box('Cadres anthracite',(side*4,.04,z),(.6,.02,.18))
  for j in range(7):box('Métal brossé',(side*4-.25+j*.08,.055,z),(.025,.012,.15))
for k in range(140):
 x=random.uniform(-10.5,10.5);z=random.uniform(-11,11);box('Cadres anthracite',(x,.025,z),(random.uniform(.02,.16),.002,.008),yaw=random.uniform(0,TAU))
# Service panels with screws, vent louvers and exposed cable elbows, rather than
# detail floating around the room. Every fitting stays on an existing support.
ZONE='Finitions techniques'
for x,z in [(-10.65,-7),(-10.65,5),(10.65,-7),(10.65,5)]:
 side=-1 if x<0 else 1;box('Acier patiné',(x,1.25,z),(.16,1.5,1.2))
 for j in range(8):box('Cadres anthracite',(x-side*.087,.83+j*.105,z),(.018,.033,.95))
 for zz in [-.48,.48]:
  for yy in [.6,1.9]:cyl('Métal brossé',(x-side*.10,yy,z+zz),.021,.015,8,axis='x')
for x,z in [(-4.55,-5),(-4.55,3),(4.55,-5),(4.55,3)]:
 box('Métal brossé',(x,1.16,z+.21),(.22,.35,.035));box('Cadres anthracite',(x,1.16,z+.24),(.17,.29,.025))
 for yy,mat in [(1.23,'Néon bleu'),(1.1,'Néon ambre')]:cyl(mat,(x,yy,z+.265),.04,.02,14,axis='z')
 polyline('Cuir et joints',[(x,.98,z+.20),(x,.83,z+.20),(x+.10,.72,z+.20)],.018)

# The overview cuts away the roof; the first-person visit restores a complete room.
ZONE='Toiture complète'
material('Toiture technique',(.10,.12,.16),.67,.45,texture='vesper-steel_diff_512.jpg');META['Toiture technique']['interior']=True
pbr('Toiture technique','steel')
material('Néons de plafond',(.52,.72,.92),.3,0,2.5);META['Néons de plafond']['interior']=True
box('Toiture technique',(0,4.94,0),(22,.18,23.6),solid=True)
for x in [-10.9,10.9]:box('Toiture technique',(x,3.5,0),(.3,2.8,23.4),solid=True)
for x in [-6.95,6.95]:box('Toiture technique',(x,3.05,11.5),(8.1,3.7,.35),solid=True)
box('Toiture technique',(0,4.4,11.5),(5.8,1.1,.35),solid=True)
for z in [-9,-5,-1,3,7,10]:
 box('Toiture technique',(0,4.7,z),(21.5,.23,.20))
 for x in [-7.5,0,7.5]:rod('Néons de plafond',(x-.8,4.52,z),(x+.8,4.52,z),.023,10)

# Keep 2.65 m door openings intact; compress only the upper architecture.
def upper_height(y):return y if y<=2.65 else 2.65+(y-2.65)*(1.0/2.20)
for (zone,mat),b in BUILD.items():
 if zone in ('Architecture','Cloisons fermées','Cadres de portes','Toiture complète','Porte de mission'):
  for v in b.verts:v.co.z=upper_height(v.co.z)
for c in SOLIDS:
 if c['kind'] in ('Architecture','limite de planque','baie panoramique','cloison de pièce','cloison haute','linteau de porte','Toiture complète','porte de mission'):
  end=upper_height(c['y']+c['height']);c['y']=upper_height(c['y']);c['height']=end-c['y']
for o in TEXT:
 if o.location.z>3.1 and (o.location.y>10.8 or o.location.y< -10.8):o.location.z=upper_height(o.location.z)
print('Planque: skyline de Vesper',flush=True)
ZONE='Vesper extérieure'
# The refuge overlooks a real avenue sixteen metres below. Facades, roofs,
# service balcony and skybridges occupy distinct depths; nothing floats.
box('Béton sombre',(0,-16.6,-80),(150,1.0,135))
for x in [-7.5,7.5]:
 box('Acier patiné',(x,-15.95,-65),(1.0,.25,100))
 for z in range(-108,-19,8):box('Néon ambre',(x,-15.80,z),(.12,.01,2.0))
def city_tower(x,z,w,d,h,far=False):
 base=-16;mat='Ville lointaine'if far else'Béton sombre'
 outline=[(-w/2,base),(w/2,base),(w/2,base+h*.8),(w*.38,base+h),(-w*.30,base+h),(-w/2,base+h*.86)]
 profile(mat,x,z,outline,d)
 for side in [-1,1]:
  rod('Cadres anthracite',(x+side*w*.43,base+.2,z+d*.51),(x+side*w*.43,base+h*.85,z+d*.51),.065,8)
 for yy in range(2,int(h)-2,3):
  y=base+yy;box('Acier patiné',(x,y-.35,z+d*.505),(w*.93,.12,.13))
  for j in range(max(2,int(w/1.5))):
   xx=x-w*.35+j*w*.7/max(1,int(w/1.5)-1)
   material_name=random.choice(['Néon ambre','Néon bleu','Cuir et joints','Cuir et joints','Néon rose'])
   box('Cadres anthracite',(xx,y+.5,z+d*.515),(.75,1.40,.10));box(material_name,(xx,y+.5,z+d*.525),(.60,1.16,.015))
 if not far:
  roof=base+h;box('Acier patiné',(x,roof+.15,z),(w*.56,.3,d*.72))
  for side in [-1,1]:
   box('Cadres anthracite',(x+side*w*.17,roof+.65,z),(w*.24,1.0,d*.40))
   for k in range(4):rod('Métal brossé',(x+side*w*.17-.35+k*.22,roof+1.17,z-d*.12),(x+side*w*.17-.35+k*.22,roof+1.17,z+d*.12),.025,6)
  rod('Métal brossé',(x,roof+.4,z),(x,roof+3.4,z),.04,10);ellipsoid('Néon rose',(x,roof+3.4,z),(.12,.12,.12),8)
  neon((x-w*.45,base+3,z+d*.54),(x-w*.45,base+h*.7,z+d*.54),'Néon rose',.023)
for args in [(-18,-29,9,9,24),(17,-33,10,10,28),(-22,-54,13,13,39),(22,-59,14,12,43),(-29,-84,14,15,46),(27,-88,15,15,51),(0,-122,15,18,66)]:city_tower(*args)
for x,z,h in [(-52,-102,54),(-35,-123,58),(-16,-142,63),(16,-146,67),(43,-122,62),(55,-98,48)]:city_tower(x,z,11,12,h,True)
# Two connected maintenance bridges spanning the avenue.
for z,y,left,right in [(-55,-1.5,-18.5,18.5),(-84,7.0,-24,22)]:
 box('Acier patiné',((left+right)/2,y,z),(right-left,.55,3.0))
 for side in [-1,1]:
  rod('Métal brossé',(left,y+1,z+side*1.35),(right,y+1,z+side*1.35),.06,10)
  for x in range(math.ceil(left),math.floor(right)+1,3):
   rod('Métal brossé',(x,y+.3,z+side*1.35),(x,y+1,z+side*1.35),.04,8)
   if x+3<=right:rod('Cadres anthracite',(x,y-.7,z+side*1.2),(x+3,y+.1,z+side*1.2),.055,8)
 neon((left+2,y-.25,z+1.56),(right-2,y-.25,z+1.56),'Néon bleu',.018)
# Attached service balcony: visible close to the glass and below the window.
box('Acier patiné',(0,-1.5,-13.6),(22.2,.20,4.0))
for x in range(-10,11,2):
 rod('Métal brossé',(x,-1.4,-15.5),(x,-.35,-15.5),.035,10)
 rod('Cadres anthracite',(x,-2.6,-11.8),(x,-1.55,-15.4),.06,8)
rod('Métal brossé',(-10.8,-.35,-15.5),(10.8,-.35,-15.5),.045,10)
for x in [-9,9]:
 box('Cadres anthracite',(x,-.7,-14.0),(1.5,1.4,1.2));cyl('Métal brossé',(x,.15,-14),.21,.35,20);ring('Métal brossé',(x,.34,-14),.23,.035,24)
print('Planque: construction des maillages',flush=True)
for (zone,mat),b in BUILD.items():
 if zone=='Vesper au-delà de la baie':
  for v in b.verts:v.co.z-=28
 bmesh.ops.recalc_face_normals(b,faces=list(b.faces));me=bpy.data.meshes.new(zone+' / '+mat);b.to_mesh(me);b.free();o=bpy.data.objects.new(zone+' / '+mat,me)
 coll=bpy.data.collections.get(zone)
 if not coll:coll=bpy.data.collections.new(zone);bpy.context.scene.collection.children.link(coll)
 coll.objects.link(o);me.materials.append(MATS[mat])
 # Deliberately mild chamfers preserve the metre-based collision footprint.
 if mat in ['Acier patiné','Métal brossé','Cadres anthracite','Tissu rose','Tissu bleu','Tissu neutre','Peinture médicale','Bras robot orange','Verre dépoli des portes']and 'Vesper'not in zone:
  bevel=o.modifiers.new('Arêtes usinées et coussins adoucis','BEVEL');bevel.width=.025 if 'Tissu'not in mat else .045;bevel.segments=2;bevel.affect='EDGES';bevel.use_clamp_overlap=True;bevel.limit_method='ANGLE';bevel.angle_limit=.7
  o.modifiers.new('Normales pondérées','WEIGHTED_NORMAL')
 # Metric box projection, also exported to the browser.
 uv=me.uv_layers.new(name='UVMap');me.update()
 for poly in me.polygons:
  a=max(range(3),key=lambda i:abs(poly.normal[i]))
  coords=[me.vertices[me.loops[li].vertex_index].co for li in poly.loop_indices]
  xmin=min(v.x for v in coords);xmax=max(v.x for v in coords);zmin=min(v.z for v in coords);zmax=max(v.z for v in coords)
  for li in poly.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=((co.x-xmin)/max(.001,xmax-xmin),(co.z-zmin)/max(.001,zmax-zmin))if META[mat].get('localUV')else(co.y,co.z)if a==0 else(co.x,co.z)if a==1 else(co.x,co.y)

sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=96;sc.cycles.use_denoising=False;sc.render.resolution_x=1280;sc.render.resolution_y=960;sc.render.resolution_percentage=100
sc.world.color=(.12,.06,.12);sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.07,.16,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.55
def area(name,p,power,color,size,target=(0,0,0)):
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape='DISK';light.size=size;o=bpy.data.objects.new(name,light);sc.collection.objects.link(o);o.location=G(*p);o.rotation_euler=(G(*target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Lumière blanche du plafond',(0,10,2),1500,(.66,.77,1),12)
area('Fenêtre rose Vesper',(0,7,-13),3500,(1,.11,.37),14)
area('Éclairage chaud frontal',(0,6,15),1600,(1,.61,.47),12)
area('Atelier cyan',(7,5,-2),1200,(.15,.65,1),5,(7,0,-1))
area('Dortoir rose',(-8,5,-8),1000,(1,.08,.35),4,(-8,0,-8))
area('Recharges',(0,4,7),700,(.55,.22,1),4,(0,0,6))
camera=bpy.data.cameras.new('Vue de référence');co=bpy.data.objects.new('Vue de référence',camera);sc.collection.objects.link(co);co.location=G(0,26,29);co.rotation_euler=(G(0,.2,-1)-co.location).to_track_quat('-Z','Y').to_euler();camera.type='ORTHO';camera.ortho_scale=29;camera.lens=42;sc.camera=co
sc.view_settings.view_transform='AgX';sc.view_settings.exposure=.2
sc.use_nodes=True;nodes=sc.node_tree.nodes;nodes.clear();inp=nodes.new('CompositorNodeRLayers');glare=nodes.new('CompositorNodeGlare');glare.glare_type='FOG_GLOW';glare.threshold=1.6;glare.quality='HIGH';out=nodes.new('CompositorNodeComposite');sc.node_tree.links.new(inp.outputs['Image'],glare.inputs['Image']);sc.node_tree.links.new(glare.outputs['Image'],out.inputs['Image'])

# A rendered Blender panorama sits behind the actual window glass. This preserves
# the reference skyline in the cutaway camera, which looks down rather than toward
# the horizon. The editable 3D city remains in its own collection in the .blend.
panorama=SRC/'Panorama_Vesper.png'
if not panorama.exists():
 print('Planque: panorama Blender de Vesper',flush=True)
 hidden={o:o.hide_render for o in sc.objects}
 for o in sc.objects:
  if o.type in ['MESH','FONT']:o.hide_render=not o.name.startswith('Vesper au-delà')
 citycam=bpy.data.cameras.new('Panorama de Vesper');cityobj=bpy.data.objects.new('Panorama de Vesper',citycam);sc.collection.objects.link(cityobj);cityobj.location=G(0,-9,-18);cityobj.rotation_euler=(G(0,-7,-68)-cityobj.location).to_track_quat('-Z','Y').to_euler();citycam.type='ORTHO';citycam.ortho_scale=118;sc.camera=cityobj
 area('Lueur de la ville',(0,18,-50),65000,(1,.26,.57),70,(0,-20,-55))
 bg=sc.world.node_tree.nodes['Background'];oldbg=tuple(bg.inputs[0].default_value);bg.inputs[0].default_value=(.45,.16,.34,1)
 sc.cycles.samples=48;sc.render.resolution_x=2048;sc.render.resolution_y=512;sc.render.filepath=str(panorama);bpy.ops.render.render(write_still=True)
 for o,v in hidden.items():o.hide_render=v
 sc.objects['Lueur de la ville'].hide_render=True;sc.camera=co;bg.inputs[0].default_value=oldbg;sc.cycles.samples=96;sc.render.resolution_x=1280;sc.render.resolution_y=960
material('Panorama Vesper',(1,1,1),1,0)
pm=MATS['Panorama Vesper'];pn=pm.node_tree.nodes.get('Principled BSDF');pt=pm.node_tree.nodes.new('ShaderNodeTexImage');pt.image=bpy.data.images.load(str(panorama),check_existing=True);_pixel=pt.image.pixels[0];pt.image.file_format='JPEG';pt.image.filepath_raw=str(OUT/'panorama.jpg');pt.image.save();pt.image.pack();pm.node_tree.links.new(pt.outputs['Color'],pn.inputs['Base Color']);pm.node_tree.links.new(pt.outputs['Color'],pn.inputs['Emission Color']);pn.inputs['Emission Strength'].default_value=.8;META['Panorama Vesper']['panorama']='panorama.jpg'
pme=bpy.data.meshes.new('Panorama derrière le vitrage');pme.from_pydata([G(-10.8,1.2,-11.57),G(10.8,1.2,-11.57),G(10.8,upper_height(4.65),-11.57),G(-10.8,upper_height(4.65),-11.57)],[],[(0,1,2,3)]);uv=pme.uv_layers.new(name='UVMap')
for i,p in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=p
po=bpy.data.objects.new('Panorama de Vesper / baie vitrée',pme);sc.collection.objects.link(po);pme.materials.append(pm)
for o in sc.objects:
 if o.name.startswith(('Vesper extérieure','Toiture complète'))or any(META.get(m.name,{}).get('interior')for m in getattr(o.data,'materials',[])):o.hide_render=True

layout={'version':1,'proportionsRevision':2,'gymRevision':1,'portals':PORTALS,'atelierScale':{'benchTop':.95,'benchDepth':1.44,'robotScale':.88,'screenDrop':.15},'name':'La Planque · Les Héritiers du Silence','author':'Pink Wars · Blender','doors':DOORS,'rooms':ROOMS,'showcase':{'companions':[{'id':'gaby','hero':'ghju','x':-2.15,'y':1.5,'z':7.3},{'id':'cara','hero':'lylu','x':2.15,'y':1.5,'z':7.3}],'weapons':SHOWCASE_WEAPONS,'outfits':[{'hero':'ghju','x':-8.9,'y':.285,'z':4.45},{'hero':'lylu','x':-6.4,'y':.285,'z':4.45}]},'bounds':{'x1':-10.65,'x2':10.65,'z1':-11.25,'z2':11.35},'spawn':{'x':0,'z':9.0,'yaw':0},'colliders':SOLIDS,'stations':[
 {'id':'rest','name':'Dortoir','action':'Se reposer et régénérer','x':-6.1,'z':-6.35,'radius':2.4},
 {'id':'weapons','name':'Mur d’armes','action':'Préparer les armes','x':-7.8,'z':-.2,'radius':2.7},
 {'id':'outfits','name':'Tenues de combat','action':'Préparer l’équipement','x':-7.8,'z':6.3,'radius':2.4},
 {'id':'archive','name':'Livre de l’Histoire','action':'Relire les événements vécus','x':0,'z':-6.1,'radius':2.4},
 {'id':'workshop','name':'Atelier nano','action':'Fabriquer et améliorer','x':6.0,'z':1.55,'radius':2.1},
 {'id':'charge-gaby','name':'GAB-1','action':'Régénérer le bouclier et recharger','x':-2.2,'z':9.0,'radius':1.6},
 {'id':'charge-cara','name':'CAR-14','action':'Régénérer le bouclier et recharger','x':2.2,'z':9.0,'radius':1.6},
 {'id':'mission','name':'Porte Mission','action':'Choisir la prochaine mission','x':0,'z':9.3,'radius':2.2},
 {'id':'bath','name':'Salle de bain','action':'Récupérer au calme','x':8.5,'z':-6.4,'radius':2.4}
]}
for station in layout['stations']:
 station['room']={'rest':'dortoir','weapons':'armurerie','outfits':'tenues','archive':'archives','workshop':'atelier','bath':'bain'}.get(station['id'],'recharge')
(OUT/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,separators=(',',':')))
sc['description']='Planque GHJU / LYLU : dortoir, salle de bain, armes, tenues, ateliers de nanites, recharge, archives et mission.'
sc['hideout_rooms']=json.dumps(ROOMS,ensure_ascii=False);sc['hideout_doors']=json.dumps(DOORS,ensure_ascii=False)
sc['units']='mètres';sc.unit_settings.system='METRIC'
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'PinkWars_Planque.blend'),compress=True)
shutil.copyfile(SRC/'PinkWars_Planque.blend',OUT/'PinkWars_Planque.blend')

print('Planque: export PWM1',flush=True)
def export_pwm(objects,filename):
 deps=bpy.context.evaluated_depsgraph_get();prims={};bounds_min=[1e9]*3;bounds_max=[-1e9]*3
 for obj in objects:
  if obj.type not in ['MESH','FONT']:continue
  evaluated=obj.evaluated_get(deps);me=evaluated.to_mesh();me.calc_loop_triangles();ma=obj.matrix_world;normal_ma=ma.to_3x3().inverted().transposed()
  for tri in me.loop_triangles:
   mat=me.materials[tri.material_index].name if me.materials else'Acier patiné';arr=prims.setdefault(mat,[])
   for li in tri.loops:
    loop=me.loops[li];v=ma@me.vertices[loop.vertex_index].co;n=normal_ma@me.corner_normals[li].vector;n.normalize();p=(v.x,v.z,-v.y);nn=(n.x,n.z,-n.y);uv=tuple(me.uv_layers.active.data[li].uv);arr.append((p,nn,uv))
    for k in range(3):bounds_min[k]=min(bounds_min[k],p[k]);bounds_max[k]=max(bounds_max[k],p[k])
  evaluated.to_mesh_clear()
 chunks=[];offset=0;descriptions=[]
 def append(data):
  nonlocal offset
  padding=(-offset)%4
  if padding:chunks.append(bytes(padding));offset+=padding
  at=offset;chunks.append(data);offset+=len(data);return at
 for mat,vertices in prims.items():
  unique={};values=[];indices=[]
  for p,n,uv in vertices:
   key=tuple(round(x,5)for x in (*p,*n,*uv))
   if key not in unique:unique[key]=len(values);values.append((p,n,uv))
   indices.append(unique[key])
  positions=bytearray();normals=bytearray();uv0=bytearray();uv1=bytes(len(values)*4)
  for p,n,uv in values:
   positions+=struct.pack('<hhh',*[max(-32767,min(32767,round((p[k]-bounds_min[k])/max(1e-6,bounds_max[k]-bounds_min[k])*65534-32767)))for k in range(3)])
   normals+=struct.pack('<bbbb',*[max(-127,min(127,round(c*127)))for c in n],0);uv0+=struct.pack('<ff',uv[0],1-uv[1])
  desc={'material':mat,'vertices':len(values),'indices':len(indices),'index32':len(values)>65535}
  desc['position']=append(positions);desc['normal']=append(normals);desc['uv1']=append(uv1);desc['uv0']=append(uv0);desc['index']=append(struct.pack('<'+('I'if desc['index32']else'H')*len(indices),*indices));descriptions.append(desc)
 meta={'min':bounds_min,'max':bounds_max,'primitives':descriptions,'materials':META,'source':'PinkWars_Planque.blend','units':'metres'}
 encoded=json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 raw=b'PWM1'+struct.pack('<I',len(encoded))+encoded+b''.join(chunks);(OUT/filename).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
 return {'source':'Blender 4.3 · original editable scene','triangles':sum(p['indices']//3 for p in descriptions),'batches':len(descriptions),'vertices':sum(p['vertices']for p in descriptions),'pwmBytes':len(raw),'downloadBytes':(OUT/filename).stat().st_size}
room_objects=[o for o in sc.objects if not o.name.startswith(('Vesper extérieure','Portes mobiles'))]
city_objects=[o for o in sc.objects if o.name.startswith('Vesper extérieure')]
stats=export_pwm(room_objects,'planque.pwm.gz');stats.update(colliders=len(SOLIDS),stations=len(layout['stations']),doors=len(DOORS),rooms=len(ROOMS));(OUT/'stats.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
city_stats=export_pwm(city_objects,'city.pwm.gz');(OUT/'city-stats.json').write_text(json.dumps(city_stats,ensure_ascii=False,indent=2));(OUT/'materials.json').write_text(json.dumps(META,ensure_ascii=False,separators=(',',':')));print(json.dumps(stats),flush=True)
# Standard exchange file, not used by the runtime (which downloads only PWM1).
if '--glb' in sys.argv:bpy.ops.export_scene.gltf(filepath=str(SRC/'planque.glb'),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
if '--render'in sys.argv:
 sc.render.filepath=str(OUT/'planque-blender.png');bpy.ops.render.render(write_still=True)
print('Planque: terminée',flush=True)

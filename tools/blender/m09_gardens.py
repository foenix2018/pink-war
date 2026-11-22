"""Pink Wars 09 / Les Jardins suspendus.
blender --background --threads 4 --python tools/blender/m09_gardens.py [-- --render]
One metric authored plan drives the editable scene, walkable surfaces and collision hulls.
"""
import bpy,bmesh,math,random,json,pathlib,struct,sys,gzip,shutil
from mathutils import Vector,Matrix
P=pathlib.Path(__file__).resolve().parents[2];OUT=P/'dist/assets/m09';SRC=P/'assets/m09'
OUT.mkdir(parents=True,exist_ok=True);SRC.mkdir(parents=True,exist_ok=True)
PLAN=json.loads((SRC/'plan.json').read_text());PS={p['id']:p for p in PLAN['platforms']}
random.seed(9009);TAU=math.tau;G=lambda x,y,z:Vector((x,-z,y))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
MATS={};META={};BUILD={};SOLIDS=[];TEXT=[];ZONE='Fondations';LINKS=[];TREES=[]
def material(name,c,rough=.6,metal=0,glow=0,alpha=1,texture=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,alpha);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,alpha);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 if glow:n.inputs['Emission Color'].default_value=(*c,1);n.inputs['Emission Strength'].default_value=glow
 if alpha<1:n.inputs['Alpha'].default_value=alpha;m.surface_render_method='DITHERED'
 data={'color':c,'roughness':rough,'metalness':metal,'emissive':glow,'alpha':alpha}
 if texture:
  data['texture']=texture
  image=bpy.data.images.load(str(P/'dist/assets/cc0'/texture),check_existing=True);image.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;mix=m.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*c,1);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs['Color'],n.inputs['Base Color']);bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.09;bump.inputs['Strength'].default_value=.3;m.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs[0],n.inputs['Normal'])
 MATS[name]=m;META[name]=data
material('stone',(.34,.39,.42),.89,.03,texture='vesper-concrete_diff_512.jpg')
material('facade',(.26,.31,.34),.68,.2,texture='vesper-concrete_diff_512.jpg')
material('deck',(.34,.38,.36),.43,.32,texture='vesper-steel_diff_512.jpg')
material('steel',(.31,.36,.38),.3,.82,texture='vesper-steel_diff_512.jpg')
material('dark',(.035,.055,.065),.57,.55)
material('bronze',(.38,.32,.16),.32,.78)
material('ivory',(.69,.73,.66),.6,.18)
material('soil',(.08,.065,.035),.98,0)
material('biotic',(.42,.025,.14),.5,.1,1.3)
material('rose-halo',(.98,.02,.32),.3,0,3,alpha=.12)
material('bark',(.19,.105,.085),.92,0,texture='vesper-concrete_diff_512.jpg')
for n,c in [('leaf',(.11,.27,.045)),('leaf-light',(.32,.43,.075)),('leaf-dark',(.035,.12,.04)),('blossom',(.83,.045,.33)),('blossom-light',(.98,.27,.51)),('blossom-pale',(.96,.50,.61))]:material(n,c,.85,0,.18 if n.startswith('blossom')else 0);META[n]['doubleSided']=True
material('glass',(.53,.77,.74),.16,.24,alpha=.16)
material('glass-blue',(.14,.39,.47),.19,.35,alpha=.38)
material('rose',(.98,.015,.31),.3,0,4)
material('cyan',(.12,.78,.86),.3,0,2)
material('warm',(1,.65,.26),.3,0,2)
material('white',(.79,.93,.93),.32,0,1.2)
material('screen',(.015,.09,.13),.25,.2,.8)
material('water',(.035,.26,.29),.16,.32)
material('foam',(.63,.89,.88),.42,.02,.3,alpha=.72)
material('haze',(.25,.18,.23),.9,.05)
def bm(mat):
 key=(ZONE,mat)
 if key not in BUILD:BUILD[key]=bmesh.new()
 return BUILD[key]
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
# Lighting is cylindrical geometry: a cased tube, connectors and emitting core.
def neon(a,b,mat='rose',r=.07):
 rod('dark',a,b,r*1.8,8);rod(mat,(a[0],a[1]+r*.7,a[2]),(b[0],b[1]+r*.7,b[2]),r,10)
 for p in [a,b]:cyl('steel',p,r*2.1,r*.8,10)
def collider(kind,a,b,y,height,pad=.2,**kw):
 SOLIDS.append(dict(kind=kind,x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,hx=abs(a[0]-b[0])/2+pad,hz=abs(a[1]-b[1])/2+pad,y=y,height=height,**kw))
def link_ends(link):
 a,b=PS[link['a']].copy(),PS[link['b']].copy()
 if 'start'in link:a.update(x=link['start'][0],z=link['start'][1])
 if 'end'in link:b.update(x=link['end'][0],z=link['end'][1])
 return a,b
def point_on_link(link,t):
 a,b=link_ends(link);length=math.hypot(b['x']-a['x'],b['z']-a['z']);start=link.get('startRadius',a['r']);end=link.get('endRadius',b['r']);u=max(0,min(1,(t*length-start)/max(.01,length-start-end)))
 steps=max(1,math.ceil(abs(b['y']-a['y'])/.18));u=round(u*steps)/steps if a['y']!=b['y'] else u
 return(a['x']+(b['x']-a['x'])*t,a['y']+(b['y']-a['y'])*u,a['z']+(b['z']-a['z'])*t)
def on_walk(x,z,y,exclude=None):
 for p in PLAN['platforms']:
  if p['id']!=exclude and math.hypot(x-p['x'],z-p['z'])<p['r']+.25 and abs(p['y']-y)<1.6:return True
 for link in PLAN['links']:
  if link['id']==exclude:continue
  a,b=link_ends(link);dx,dz=b['x']-a['x'],b['z']-a['z'];t=((x-a['x'])*dx+(z-a['z'])*dz)/(dx*dx+dz*dz)
  if t<0 or t>1:continue
  p=point_on_link(link,t)
  if math.hypot(x-p[0],z-p[2])<link['width']/2+.3 and abs(p[1]-y)<1.6:return True
 return False

def railing(a,b,y1,y2=None,solid=True):
 if y2 is None:y2=y1
 rod('steel',(a[0],y1+.09,a[1]),(a[0],y1+1.27,a[1]),.055,8)
 rod('bronze',(a[0],y1+1.25,a[1]),(b[0],y2+1.25,b[1]),.065,8)
 rod('steel',(a[0],y1+.52,a[1]),(b[0],y2+.52,b[1]),.038,8)
 if solid:collider('garde-corps',a,b,min(y1,y2),abs(y1-y2)+1.28,pad=.18)

def crown(mat,c,size):
 b=bm(mat);result=bmesh.ops.create_icosphere(b,subdivisions=2,radius=1,matrix=Matrix.Identity(4))
 for v in result['verts']:
  p=v.co.copy();j=random.uniform(.86,1.12);v.co=G(c[0]+p.x*size[0]*.5*j,c[1]+p.z*size[1]*.5*j,c[2]+p.y*size[2]*.5*j)
  for f in v.link_faces:f.smooth=True

def cliff(x,z,top,bottom,rx,rz=None):
 if rz is None:rz=rx
 n=32;rows=8;verts=[]
 radii=[random.uniform(.85,1.14)for _ in range(n)]
 for j in range(rows+1):
  t=j/rows;yy=bottom+(top-bottom)*t
  for k in range(n):
   a=k*TAU/n;r=radii[k]*(.92+.08*math.sin(j*1.8+k*.5));verts.append((x+math.cos(a)*rx*r,yy,z+math.sin(a)*rz*r))
 faces=[]
 for j in range(rows):
  for k in range(n):faces.append((j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k))
 faces.extend([tuple(reversed(range(n))),tuple(range(rows*n,(rows+1)*n))]);mesh('stone',verts,faces)

def floor_circle(p):
 x,y,z,r=p['x'],p['y'],p['z'],p['r']
 cliff(x,z,-25,-67,r*.88)
 for k in range(8):
  a=k*TAU/8;ellipsoid('stone',(x+math.cos(a)*r*.65,-37,z+math.sin(a)*r*.65),(r*.55,40,r*.5),10)
 if p['id']not in ['bridge','landing','meeting']:cyl('facade',(x,(y-25)/2-.5,z),r*.975,y+24,64)
 cyl('facade',(x,y-2.2,z),r,4.4,64);cyl('deck',(x,y-.14,z),r+.10,.28,96);ring('bronze',(x,y+.04,z),r-.1,.12,80)
 for k in range(48 if r>30 else 28):
  n=48 if r>30 else 28;a=k*TAU/n;b=(k+1)*TAU/n;mid=(a+b)/2;px=x+math.cos(mid)*(r+.5);pz=z+math.sin(mid)*(r+.5)
  if on_walk(px,pz,y,p['id']):continue
  aa=(x+math.cos(a)*(r-.25),z+math.sin(a)*(r-.25));bb=(x+math.cos(b)*(r-.25),z+math.sin(b)*(r-.25));railing(aa,bb,y)
  if k%3==0:neon((aa[0],y+.25,aa[1]),(bb[0],y+.25,bb[1]),'rose',.045)
 # Windows, machined slab joins, vertical structural buttresses and service levels.
 for k in range(32):
  a=k*TAU/32;cx=x+math.cos(a)*(r-.25);cz=z+math.sin(a)*(r-.25)
  bottom=-25 if p['id'] not in ['bridge','landing','meeting']else y-5
  rod('steel',(cx,bottom,cz),(cx,y-.45,cz),.24,10)
  if p['id'] not in ['bridge','landing','meeting']:
   for yy in range(int(bottom+4),int(y-3),6):
    tx,tz=-math.sin(a),math.cos(a);rod('warm',(cx-tx*.9,yy,cz-tz*.9),(cx+tx*.9,yy,cz+tz*.9),.12,6)
    window=[(x+math.cos(a+da)*r*.985,yy+dy,z+math.sin(a+da)*r*.985)for da,dy in [(-.065,-1.6),(.065,-1.6),(.065,1.6),(-.065,1.6)]];mesh('glass-blue',window,[(0,1,2,3)])
 for k in range(8):
  a=k*TAU/8;cyl('stone',(x+math.cos(a)*r*.62,(-25+y)/2-1,z+math.sin(a)*r*.62),1.25,y+23,12,r2=1.5)
 if p['id'] not in ['bridge','meeting','landing']:
  for yy in [y-9,y-18]:ring('steel',(x,yy,z),r*.99,.22,64)

def walkway(link):
 a,b=link_ends(link);dx,dz=b['x']-a['x'],b['z']-a['z'];length=math.hypot(dx,dz);nx,nz=-dz/length,dx/length;w=link['width']/2
 n=max(8,math.ceil(length/.33),math.ceil(abs(b['y']-a['y'])/.17)*2)
 rows=[]
 for i in range(n+1):
  x,y,z=point_on_link(link,i/n);rows.extend([(x+nx*w,y,z+nz*w),(x-nx*w,y,z-nz*w),(x+nx*w,y-.6,z+nz*w),(x-nx*w,y-.6,z-nz*w)])
 faces=[]
 for i in range(n):
  j=i*4;mid=point_on_link(link,(i+.5)/n)
  if any(math.hypot(mid[0]-p['x'],mid[2]-p['z'])<p['r']-.05 and abs(mid[1]-p['y'])<.01 for p in PLAN['platforms']):continue
  faces.extend([(j,j+4,j+5,j+1),(j+2,j+3,j+7,j+6),(j,j+2,j+6,j+4),(j+1,j+5,j+7,j+3)])
 mesh('deck',rows,faces)
 # Actual treads with slim anti-slip nosings. Collision floor uses this same stair equation.
 for i in range(1,n):
  x,y,z=point_on_link(link,i/n);prev=point_on_link(link,(i-1)/n)
  if abs(y-prev[1])>.01:rod('ivory',(x+nx*(w-.2),y+.012,z+nz*(w-.2)),(x-nx*(w-.2),y+.012,z-nz*(w-.2)),.028,6)
 parts=max(1,math.ceil(length/4.0))
 for i in range(parts):
  c=point_on_link(link,(i+.5)/parts);start=point_on_link(link,i/parts);end=point_on_link(link,(i+1)/parts)
  for side in [-1,1]:
   aa=(start[0]+nx*(w-.1)*side,start[2]+nz*(w-.1)*side);bb=(end[0]+nx*(w-.1)*side,end[2]+nz*(w-.1)*side)
   if on_walk(c[0]+nx*(w+.65)*side,c[2]+nz*(w+.65)*side,c[1],link['id']):continue
   railing(aa,bb,start[1],end[1]);neon((aa[0],start[1]+.10,aa[1]),(bb[0],end[1]+.1,bb[1]),'rose',.048)
  if i%4==0 and c[1]>22 and link['id']not in ['meeting-core','bridge-meeting']:
   for side in [-1,1]:rod('steel',(c[0]+nx*w*side,c[1]-.6,c[2]+nz*w*side),(c[0],c[1]-6,c[2]),.18,10)
 # Exposed load-bearing arches under the long central crossings.
 if length>55:
  for side in [-1,1]:
   pts=[]
   for k in range(25):
    t=k/24;p=point_on_link(link,t);pts.append((p[0]+nx*(w-.45)*side,p[1]-1-12*math.sin(t*math.pi),p[2]+nz*(w-.45)*side))
   polyline('steel',pts,.25)
   for k in range(1,12):
    t=k/12;p=point_on_link(link,t);rod('steel',(p[0]+nx*(w-.45)*side,p[1]-.2,p[2]+nz*(w-.45)*side),(p[0]+nx*(w-.45)*side,p[1]-1-12*math.sin(t*math.pi),p[2]+nz*(w-.45)*side),.095,8)
 guide=[(p[0],p[1]+.035,p[2])for p in [point_on_link(link,j/max(1,math.ceil(length/2)))for j in range(max(1,math.ceil(length/2))+1)]]
 polyline('rose',guide,.13);polyline('rose-halo',guide,.29)
 LINKS.append({**link,'startRadius':link.get('startRadius',a['r']),'endRadius':link.get('endRadius',b['r']),'steps':max(1,math.ceil(abs(b['y']-a['y'])/.18))})

def leaf_patch(mat,c,scale=1):
 x,y,z=c;a=random.random()*TAU;u=(math.cos(a)*scale*.5,random.uniform(-.12,.3)*scale,math.sin(a)*scale*.5);v=(-math.sin(a)*scale*.17,.03,math.cos(a)*scale*.17)
 mesh(mat,[(x-u[0],y-u[1],z-u[2]),(x+v[0],y+v[1],z+v[2]),(x+u[0],y+u[1],z+u[2]),(x-v[0],y-v[1],z-v[2]),(x,y+.035*scale,z)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
def tree(x,y,z,s=1,pink=False,hero=False):
 trunk=8*s if not hero else 24;radius=3.8*s if not hero else 22
 # Bifurcating tapered branches and visible root flares, no cylinder lollipops.
 points=[(x,y,z),(x+.3*s,y+trunk*.32,z+.15*s),(x-.45*s,y+trunk*.68,z),(x,y+trunk,z)]
 for i,(a,b)in enumerate(zip(points,points[1:])):
  rod('biotic'if hero else'bark',a,b,(.58 if not hero else 2.4)*(1-i*.22),12)
 for k in range(7 if hero else 5):
  a=k*TAU/(7 if hero else 5)+random.uniform(-.3,.3);r=radius*random.uniform(.65,1);base=(x,y+trunk*random.uniform(.45,.7),z);tip=(x+math.cos(a)*r,y+trunk+random.uniform(-1,3)*s,z+math.sin(a)*r)
  bend=((base[0]+tip[0])/2,y+trunk*.86,(base[2]+tip[2])/2);rod('biotic'if hero else'bark',base,bend,(.7 if hero else .18*s),10);rod('biotic'if hero else'bark',bend,tip,(.28 if hero else .08*s),8)
 for k in range(8):
  a=k*TAU/8;rod('bark',(x,y+.9*s,z),(x+math.cos(a)*1.6*s,y+.05,z+math.sin(a)*1.6*s),.2*s,8)
 for j in range(60 if hero else 8):
  a=random.random()*TAU;rr=radius*math.sqrt(random.random())*.80;cx=x+math.cos(a)*rr;cz=z+math.sin(a)*rr;cy=y+trunk+random.uniform(-.7,1.8)*s+(radius-rr)*.10
  ma='blossom'if hero else random.choice(['blossom','blossom-light','blossom-pale'])if pink else random.choice(['leaf','leaf-light','leaf-dark']);size=radius*random.uniform(.23,.43)if hero else radius*random.uniform(.5,.75);crown(ma,(cx,cy,cz),(size,size*.65,size*.9))
 count=6500 if hero else 500 if pink else 260
 for i in range(count):
  a=random.random()*TAU;r=math.sqrt(random.random())*radius;dx=math.cos(a)*r;dz=math.sin(a)*r;dy=trunk+(1-r*r/(radius*radius))*radius*.22+random.gauss(0,.45*s if not hero else 1.2)
  mat=random.choice(['blossom','blossom-light','blossom-pale'])if pink else random.choice(['leaf','leaf-light','leaf-dark'])
  leaf_patch(mat,(x+dx,y+dy,z+dz),random.uniform(.35,.85)*s if not hero else random.uniform(.5,1.35))
 if hero:
  for side in [-1,1]:
   pts=[(x+side*(1.1+math.sin(j*.6)*.25),y+j*trunk/36,z+.8+math.cos(j*.35)*.65)for j in range(37)];polyline('rose',pts,.12)
 TREES.append({'x':x,'y':y,'z':z,'pink':pink,'hero':hero})

def planter(x,y,z,r=2.2):
 cyl('stone',(x,y+.5,z),r,1,24,r2=r*.92);cyl('soil',(x,y+1.02,z),r*.85,.03,24);ring('bronze',(x,y+1,z),r,.05,24)
 collider('jardinière',(x-r*.8,z-r*.8),(x+r*.8,z+r*.8),y,1.1,pad=0)
def fern(x,y,z,s=1):
 for k in range(7):
  a=k*TAU/7;end=(x+math.cos(a)*1.7*s,y+.9*s,z+math.sin(a)*1.7*s);rod('leaf-dark',(x,y,z),end,.025*s,6)
  for j in range(1,7):
   t=j/7;leaf_patch('leaf-light',(x+(end[0]-x)*t,y+math.sin(t*math.pi/2)*s,z+(end[2]-z)*t),(.6-t*.35)*s)

def dome(cx,y,cz,rx,rz,h,cols=28,rows=10,main=False,openings=None):
 if openings is None:openings=[math.pi/2]+([0]if main else[])
 def is_door(a):return any(abs(math.atan2(math.sin(a-b),math.cos(a-b)))<.34 for b in openings)
 # Elliptic glass bays with structural ribs, seam gaskets and two real open entrance bays.
 for j in range(rows):
  a0=j*math.pi/2/rows;a1=(j+1)*math.pi/2/rows
  for k in range(cols):
   b0=k*TAU/cols;b1=(k+1)*TAU/cols;mid=(b0+b1)/2
   entrance=j<2 and is_door(mid)
   if entrance:continue
   def q(a,b,shrink=1):return(cx+rx*math.cos(a)*math.cos(b)*shrink,y+h*math.sin(a),cz+rz*math.cos(a)*math.sin(b)*shrink)
   vertices=[q(a0,b0),q(a1,b0),q(a1,b1),q(a0,b1)];mesh('glass',vertices,[(0,1,2,3)])
   rod('bronze',vertices[0],vertices[1],.11 if main else .075,8);rod('steel',vertices[0],vertices[3],.09 if main else .065,8)
   if j<4 and k%4==0:rod('steel',vertices[0],vertices[2],.045,6)
 for k in range(cols):
  a=k*TAU/cols;x=cx+rx*math.cos(a);z=cz+rz*math.sin(a)
  # Closed shell collision only below head height; entrance openings are genuine gaps.
  mid=a+TAU/cols/2;gap=is_door(mid)
  if not gap:collider('verrière',(x,z),(cx+rx*math.cos(a+TAU/cols),cz+rz*math.sin(a+TAU/cols)),y,h*.75,pad=.13)
 ring('steel',(cx,y,cz),rx,.18,64)if abs(rx-rz)<.1 else None

def laboratory(p,variant=0):
 x,y,z,r=p['x'],p['y'],p['z'],p['r'];openings=[math.atan2(PS[l['b']if l['a']==p['id']else l['a']]['z']-z,PS[l['b']if l['a']==p['id']else l['a']]['x']-x)for l in PLAN['links']if p['id']in [l['a'],l['b']]]
 dome(x,y,z-3,r*.83,r*.70,r*.65,cols=22,rows=8,openings=openings)
 for side in [-1,1]:
  for zz in [-10,-2,6]:
   xx=x+side*r*.42
   blocked=False
   for l in PLAN['links']:
    if p['id']not in [l['a'],l['b']]:continue
    aa,bb=link_ends(l);dx,dz=bb['x']-aa['x'],bb['z']-aa['z'];t=max(0,min(1,((xx-aa['x'])*dx+(z+zz-aa['z'])*dz)/(dx*dx+dz*dz)))
    if math.hypot(xx-aa['x']-dx*t,z+zz-aa['z']-dz*t)<l['width']/2+3.8:blocked=True
   if blocked:continue
   box('ivory',(xx,y+.8,z+zz),(r*.26,1.6,5.5));box('soil',(xx,y+1.62,z+zz),(r*.24,.06,5.25))
   for j in range(4):fern(xx+random.uniform(-1,1),y+1.65,z+zz-2+j*1.2,.65)
   collider('culture hydroponique',(xx-r*.13,z+zz-2.75),(xx+r*.13,z+zz+2.75),y,1.65,pad=.1)
  # Irrigation loops, copper verticals, folded solar shades.
  rod('steel',(x+side*r*.72,y+.3,z-r*.6),(x+side*r*.72,y+.3,z+r*.5),.11,10)
 for j in range(9):
  xx=x-r*.65+j*r*.16;rod('cyan',(xx,y+1.78,z-4),(xx,y+1.78,z-2.8),.025,6)

def console(it):
 x,y,z=it['x']+it.get('consoleOffset',2.6),it['y'],it['z']-.2
 cyl('dark',(x,y+.09,z),.7,.18,12);profile('steel',x,z,[(-.45,y+.1),(.45,y+.1),(.35,y+1.15),(.65,y+1.55),(-.55,y+1.55)],.55)
 box('screen',(x,y+1.45,z+.31),(1.06,.7,.045));box('dark',(x,y+1.45,z+.335),(.95,.58,.02))
 for j in range(5):rod('cyan',(x-.38,y+1.6-j*.09,z+.36),(x+.2+(j%2)*.18,y+1.6-j*.09,z+.36),.014,6)
 ring('rose',(x,y+1.32,z+.37),.15,.018,24,axis='z');text(str(it['number']).zfill(2),x,y+1.88,z+.36,.25,'white')
 collider('console',(x-.55,z-.3),(x+.55,z+.3),y,1.9,pad=.05)

print('N09: terrasses et parcours',flush=True)
for p in PLAN['platforms']:
 ZONE=str(p['label']);floor_circle(p)
for link in PLAN['links']:
 ZONE='Passages / '+link['id'];walkway(link)
print('N09: serres de recherche et pavillon',flush=True)
for key in ['research','pavilion']:
 ZONE=PS[key]['label'];laboratory(PS[key])
# Extra roof gardens and smaller side nurseries follow the left-hand campus.
# The two left-hand conservatories sit on the actual research / culture terraces.
# Meeting platform: real tiered circular dais and inlaid circuitry.
ZONE='Réunion des deux héros';p=PS['meeting']
for radius in [6,11,17]:ring('rose',(p['x'],p['y']+.025,p['z']),radius,.14,80)
cyl('bronze',(p['x'],p['y']+.04,p['z']),5.5,.08,64);cyl('deck',(p['x'],p['y']+.1,p['z']),5.3,.08,64)
# Core conservatory, concentric garden aisles, JANUS trunk and living root infrastructure.
ZONE='Cœur biotique JANUS';p=PS['core'];x,y,z,r=p['x'],p['y'],p['z'],p['r']
dome(x,y,z,r*.98,r*.98,43,36,12,True,openings=[math.pi/2,.64])
for rr in [14,18,34,43]:ring('bronze',(x,y+.035,z),rr,.10,96)
cyl('dark',(x,y+.45,z),12,.9,64);ring('rose',(x,y+.92,z),11.8,.13,80)
tree(x,y+.9,z,1,True,True)
for xx in [-10.8,-8.4,-6,-3.6,-1.2,1.2,3.6,6,8.4,10.8]:
 depth=math.sqrt(12**2-xx**2);collider('socle JANUS',(x+xx-1.2,z-depth),(x+xx+1.2,z+depth),y,.9,pad=0)
collider('tronc JANUS',(x-2,z-2),(x+2,z+2),y,26,pad=.4)
for k in range(16):
 a=k*TAU/16;xx=x+math.cos(a)*38;zz=z+math.sin(a)*38
 # Clear entrances and the main promenade through the dome.
 if abs(math.cos(a))>.97 or abs(math.cos(a))<.22:continue
 blocked=False
 for l in PLAN['links']:
  if 'core'not in [l['a'],l['b']]:continue
  aa,bb=link_ends(l);dx,dz=bb['x']-aa['x'],bb['z']-aa['z'];t=max(0,min(1,((xx-aa['x'])*dx+(zz-aa['z'])*dz)/max(.01,dx*dx+dz*dz)))
  if math.hypot(xx-aa['x']-dx*t,zz-aa['z']-dz*t)<l['width']/2+3:blocked=True
 if blocked:continue
 planter(xx,y,zz,2.4);tree(xx,y+1,zz,.8,pink=k%2==0)
for k in range(8):
 a=k*TAU/8;rod('bronze',(x+math.cos(a)*13,y+.4,z+math.sin(a)*13),(x+math.cos(a)*5,y+5,z+math.sin(a)*5),.23,10)
# Glass façade of control node, service machinery and its unmistakeable JANUS tower.
ZONE='Nœud de contrôle ORDRE';p=PS['control'];x,y,z=p['x'],p['y'],p['z']
box('facade',(x,y+9,z-7),(38,18,23));box('dark',(x,y+19,z-7),(41,2,26));box('glass-blue',(x,y+7,z+4.6),(35,12,.12))
# The structure is closed; the front patio hosts the hack terminal.
collider('bâtiment ORDRE',(x-19,z-18.5),(x+19,z+4.5),y,20,pad=.12)
for xx in [x-18,x-9,x,x+9,x+18]:
 rod('steel',(xx,y,z+4.8),(xx,y+19,z+4.8),.24,10)
 for yy in [y+1.5,y+16.5]:neon((xx-.5,yy,z+5),(xx+.5,yy,z+5),'rose',.08)
for j in range(7):
 xx=x-14+j*4.5;box('screen',(xx,y+8,z+4.84),(3.4,8,.04))
 for k in range(8):rod('cyan',(xx-1.3,y+5+k*.8,z+4.9),(xx+random.uniform(.1,1.3),y+5+k*.8,z+4.9),.045,6)
box('facade',(x-8,y+28,z-12),(20,20,14));box('dark',(x-8,y+39,z-12),(22,2,16));neon((x-13,y+21,z-4.8),(x-13,y+37,z-4.8),'rose',.16)
polyline('rose',[(x-13,y+35,z-4.7),(x-8,y+42,z-4.7),(x-3,y+35,z-4.7),(x-8,y+37,z-4.7),(x-13,y+35,z-4.7)],.16)
text('JANUS',x-8,y+31,z-4.85,2.8,'rose');text('ORDRE / HELIX',x,y+20.4,z+6,1,'ivory')
for xx in [x-11,x-5]:rod('steel',(xx,y+40,z-12),(xx,y+52,z-12),.12,10);cyl('rose',(xx,y+52,z-12),.23,.4,12)
# Entry sas: recessed armour, copper inlays, mechanical portal support and true opening.
ZONE='Accès ORDRE';p=PS['access'];x,y,z=p['x'],p['y'],p['z']
for side in [-1,1]:
 profile('facade',x+side*6,z+3,[(-2,y), (2,y),(2,y+10),(1,y+12),(-2,y+11)],4)
 neon((x+side*4.2,y+.3,z+5.1),(x+side*4.2,y+8.8,z+5.1),'rose',.12)
 collider('sas ORDRE',(x+side*6-2,z+1),(x+side*6+2,z+5),y,12,pad=0)
box('dark',(x,y+10.5,z+3),(12,2.0,4));text('ORDRE',x,y+9.9,z+5.05,1.45,'rose')
# Garden liberation patio: planting islands and battered research equipment.
ZONE='Jardins libérés';p=PS['liberation']
for k in range(9):
 a=k*TAU/9;xx=p['x']+math.cos(a)*16;zz=p['z']+math.sin(a)*16
 if abs(xx-p['x'])<8:continue
 planter(xx,p['y'],zz,2.5);tree(xx,p['y']+1,zz,.95,True)
# AEGIS landing ring with transparent perimeter, approach lamps and pad markings.
ZONE='Extraction AEGIS';p=PS['extraction'];x,y,z,r=p['x'],p['y'],p['z'],p['r']
for rr,ma in [(24,'warm'),(23.4,'ivory'),(21,'rose')]:ring(ma,(x,y+.045,z),rr,.12,100)
for k in range(24):
 a=k*TAU/24;xx=x+math.cos(a)*23;zz=z+math.sin(a)*23;cyl('dark',(xx,y+.15,zz),.25,.3,12);cyl('cyan',(xx,y+.32,zz),.15,.04,12)
for xx in [-3.6,3.6]:box('white',(x+xx,y+.12,z),(.8,.10,10))
box('white',(x,y+.12,z),(7.4,.10,.8));text('AEGIS',x,y-5,z+r+.25,3.2,'ivory')
# Physical original evacuation aircraft; fuselage, glazing, engines, skids and wings are separate shapes.
ZONE='Navette AEGIS';
ellipsoid('ivory',(x+3,y+2.6,z-2),(13,4.5,8),24);ellipsoid('glass-blue',(x-1,y+3,z-.5),(7,2.2,6),24)
profile('steel',x+2,z-2,[(-9,y+1.7),(-7,y+1.2),(7,y+1.2),(9,y+1.7),(3,y+2.3),(-3,y+2.3)],3.4)
for side in [-1,1]:
 cyl('dark',(x+5,y+2.2,z-2+side*5),1.6,4,28,axis='x');cyl('cyan',(x+7.04,y+2.2,z-2+side*5),1.15,.05,28,axis='x')
 rod('steel',(x-2,y+.4,z+side*2.5),(x+8,y+.4,z+side*2.5),.16,10);rod('steel',(x+2,y+.4,z+side*2.5),(x+2,y+1.7,z+side*2),.12,10)
# Trees on every garden rim, cascading vines; deliberately clear doors, views and walking lanes.
print('N09: végétation et cascades',flush=True)
for p in PLAN['platforms']:
 if p['id']in ['bridge','landing','meeting','core','extraction']:continue
 ZONE='Végétation / '+p['id'];x,y,z,r=p['x'],p['y'],p['z'],p['r']
 for k in range(12):
  a=k*TAU/12;xx=x+math.cos(a)*(r-3.8);zz=z+math.sin(a)*(r-3.8)
  if on_walk(x+math.cos(a)*(r+1),z+math.sin(a)*(r+1),y,p['id']):continue
  planter(xx,y,zz,1.8);tree(xx,y+1,zz,random.uniform(.65,1.1),k%3!=0)
 for k in range(75):
  a=random.random()*TAU;xx=x+math.cos(a)*(r-.5);zz=z+math.sin(a)*(r-.5);length=random.uniform(3,11)
  pts=[(xx+math.sin(j*.7)*.25,y-j*length/10,zz+math.cos(j*.8)*.25)for j in range(11)];polyline('leaf-dark',pts,.04)
  for j in range(10):
   leaf_patch(random.choice(['leaf','leaf-light']),(pts[j][0],pts[j][1],pts[j][2]),random.uniform(.6,1.3))
   if j%2==0:crown(random.choice(['leaf','leaf-light','leaf-dark']),pts[j],(2.6,3.3,2.5))
# Canyon ledges carry the pools and the waterfalls, avoiding unsupported sheets of water.
ZONE='Ravin et bassins'
for p in PLAN['pools']:
 cliff(p['x'],p['z'],p['y']-.25,-67,p['rx']*1.01,p['rz']*1.01)
 # Geometry has elliptical banks and smaller rippled water surface (animated runtime).
 for k in range(14):
  a=k*TAU/14;xx=p['x']+math.cos(a)*p['rx'];zz=p['z']+math.sin(a)*p['rz'];crown('stone',(xx,p['y']-.8,zz),(random.uniform(3,7),random.uniform(2,5),random.uniform(3,7)));fern(xx,p['y']+.2,zz,1.5)
for f in PLAN['waterfalls']:
 x,y,z,w=f['x'],f['y'],f['z'],f['width'];box('stone',(x,y-1.1,z-2),(w+5,2.2,6))
 for side in [-1,1]:
  xx=x+side*(w/2+2);ellipsoid('stone',(xx,(y+f['bottom'])/2,z-1),(6,y-f['bottom']+3,7),12)
  for j in range(15):leaf_patch('leaf-light',(xx+random.uniform(-2,2),y-random.random()*12,z+random.uniform(0,2)),1)
# Background is a modelled Vesper skyline beyond the northern campus, graded by distance.
ZONE='Vesper / skyline'
for row in range(3):
 for i in range(20):
  xx=-260+i*28+random.uniform(-8,8);zz=-220-row*90+random.uniform(-15,15);h=random.uniform(45,125)*(1+row*.15);w=random.uniform(6,14);h*=.80
  box('haze',(xx,-67+(h+47)/2,zz),(w,h+47,w*.7));box('haze',(xx,h-17,zz),(w*.72,6,w*.5));box('haze',(xx,h-12,zz),(w*.42,4,w*.32))
  for side in [-1,1]:rod('steel',(xx+side*w*.35,-20,zz+w*.37),(xx+side*w*.35,h-18,zz+w*.37),.13,8)
  for level in range(0,int(h),8):
   for side in [-1,1]:rod('warm'if i%3 else'rose',(xx+side*w*.35,-20+level,zz+w*.36),(xx+side*w*.35+1.2,-20+level,zz+w*.36),.13,6)
  if i%3==0:rod('steel',(xx,-20+h,zz),(xx,h+12,zz),.22,8)
ZONE='Drones de surveillance'
for x,y,z in PLAN['drones']:
 ellipsoid('dark',(x,y,z),(2.6,1.0,2.3),20);ellipsoid('steel',(x,y+.25,z),(2.15,.6,1.6),16)
 for side in [-1,1]:
  for end in [-1,1]:
   xx=x+side*1.8;zz=z+end*1.5;rod('steel',(x+side*.65,y,z+end*.5),(xx,y,zz),.14,10)
   cyl('dark',(xx,y,zz),.8,.25,24);ring('steel',(xx,y+.15,zz),.73,.07,32);ring('rose',(xx,y-.12,zz),.66,.04,32)
   for a in [0,math.pi/2]:rod('steel',(xx+math.cos(a)*.59,y+.05,zz+math.sin(a)*.59),(xx-math.cos(a)*.59,y+.05,zz-math.sin(a)*.59),.06,8)
 ellipsoid('dark',(x,y-.5,z+.6),(1.05,.7,1.0),16);cyl('rose',(x,y-.55,z+1.12),.26,.08,24,axis='z');cyl('glass-blue',(x,y-.55,z+1.17),.17,.03,24,axis='z')
 for side in [-1,1]:rod('steel',(x+side*.5,y+.4,z),(x+side*.6,y+1.25,z),.04,6);cyl('rose',(x+side*.6,y+1.28,z),.08,.08,10)
ZONE='Terminaux du parcours'
for it in PLAN['objectives']:console(it)
print('N09: export de la scène',flush=True)
# Editable semantic collections. Chamfer only manufactured rigid surfaces.
for(zone,ma),b in BUILD.items():
 bmesh.ops.recalc_face_normals(b,faces=list(b.faces));me=bpy.data.meshes.new(zone+' / '+ma);b.to_mesh(me);b.free();obj=bpy.data.objects.new(zone+' / '+ma,me)
 collection=bpy.data.collections.get(zone)
 if not collection:collection=bpy.data.collections.new(zone);bpy.context.scene.collection.children.link(collection)
 collection.objects.link(obj);me.materials.append(MATS[ma]);uv=me.uv_layers.new(name='UVMap');me.update()
 for poly in me.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]))
  for li in poly.loop_indices:
   co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co.y,co.z)if axis==0 else(co.x,co.z)if axis==1 else(co.x,co.y)
 if ma in ['ivory']and not zone.startswith('Vesper'):
  bevel=obj.modifiers.new('Arêtes usinées','BEVEL');bevel.width=.025;bevel.segments=2;bevel.limit_method='ANGLE';bevel.angle_limit=.75
# Font objects are editable; exported evaluated meshes receive their own UVs.
for obj in TEXT:
 obj['role']='functional identifier'
sc=bpy.context.scene;sc.unit_settings.system='METRIC';sc['plan_m09']=json.dumps(PLAN,ensure_ascii=False);sc['mission_order']='01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09'
sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=False;sc.render.resolution_x=1600;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.31,.12,.22,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.6
sun=bpy.data.lights.new('Soleil de Vesper','SUN');sun.energy=3;sun.color=(1,.65,.38);o=bpy.data.objects.new('Soleil de Vesper',sun);sc.collection.objects.link(o);o.rotation_euler=(.65,-.35,-.9)
for name,pos,color,energy,size in [('Ciel',(-40,180,70),(.55,.68,1),90000,180),('Cœur biotique',(-8,65,-102),(1,.04,.35),7000,36)]:
 light=bpy.data.lights.new(name,'AREA');light.energy=energy;light.color=color;light.shape='DISK';light.size=size;ob=bpy.data.objects.new(name,light);sc.collection.objects.link(ob);ob.location=G(*pos);ob.rotation_euler=(G(0,0,0)-ob.location).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.cameras.new('Plan de référence');ob=bpy.data.objects.new('Plan de référence',cam);sc.collection.objects.link(ob);ob.location=G(210,235,330);ob.rotation_euler=(G(0,17,-15)-ob.location).to_track_quat('-Z','Y').to_euler();cam.type='PERSP';cam.lens=45;sc.camera=ob;sc.view_settings.view_transform='AgX'
# A closed, editable waterfall surface also exists in Blender; WebGPU replaces it with the animated surface.
water_objects=[]
for f in PLAN['waterfalls']:
 me=bpy.data.meshes.new('Cascade');x,y,z,w=f['x'],f['y'],f['z'],f['width'];me.from_pydata([G(x-w/2,y,z),G(x+w/2,y,z),G(x+w/2,f['bottom'],z+3),G(x-w/2,f['bottom'],z+3)],[],[(0,1,2,3)]);me.materials.append(MATS['foam']);o=bpy.data.objects.new('Eau animée / cascade',me);sc.collection.objects.link(o);water_objects.append(o)
for p in PLAN['pools']:
 me=bpy.data.meshes.new('Bassin');v=[G(p['x'],p['y'],p['z'])]+[G(p['x']+math.cos(k*TAU/64)*p['rx'],p['y'],p['z']+math.sin(k*TAU/64)*p['rz'])for k in range(64)];me.from_pydata(v,[],[(0,k+1,(k+1)%64+1)for k in range(64)]);me.materials.append(MATS['water']);o=bpy.data.objects.new('Eau animée / bassin',me);sc.collection.objects.link(o);water_objects.append(o)
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from m09_doors import install_entry
install_entry(sc,MATS)
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'PinkWars_N09_Jardins_Suspendus.blend'),compress=True);shutil.copyfile(SRC/'PinkWars_N09_Jardins_Suspendus.blend',OUT/'PinkWars_N09_Jardins_Suspendus.blend')
# Shared plan / collision data is generated from precisely the same dimensions as the meshes.
data={'plan':PLAN,'platforms':PLAN['platforms'],'links':LINKS,'colliders':SOLIDS,'trees':TREES}
(P/'dist/m09-data.js').write_text('// Generated by tools/blender/m09_gardens.py; metres, Y up.\nexport const DATA='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(OUT/'layout.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));(OUT/'materials.json').write_text(json.dumps(META,ensure_ascii=False,separators=(',',':')))
def export_pwm(objects,filename):
 deps=bpy.context.evaluated_depsgraph_get();prims={};bounds_min=[1e9]*3;bounds_max=[-1e9]*3
 for obj in objects:
  if obj.type not in ['MESH','FONT']:continue
  evaluated=obj.evaluated_get(deps);me=evaluated.to_mesh();me.calc_loop_triangles();ma=obj.matrix_world;normal_ma=ma.to_3x3().inverted().transposed()
  for tri in me.loop_triangles:
   mat=me.materials[tri.material_index].name if me.materials else'stone';key=mat+'|'+obj.name if META[mat]['alpha']<1 else mat;arr=prims.setdefault(key,[])
   for li in tri.loops:
    loop=me.loops[li];v=ma@me.vertices[loop.vertex_index].co;n=normal_ma@me.corner_normals[li].vector;n.normalize();p=(v.x,v.z,-v.y);nn=(n.x,n.z,-n.y);uv=tuple(me.uv_layers.active.data[li].uv)if me.uv_layers.active else (p[0],p[1]);arr.append((p,nn,uv))
    for k in range(3):bounds_min[k]=min(bounds_min[k],p[k]);bounds_max[k]=max(bounds_max[k],p[k])
  evaluated.to_mesh_clear()
 chunks=[];offset=0;descriptions=[]
 def append(data):
  nonlocal offset
  padding=(-offset)%4
  if padding:chunks.append(bytes(padding));offset+=padding
  at=offset;chunks.append(data);offset+=len(data);return at
 for key,vertices in prims.items():
  mat=key.split('|')[0]
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
 meta={'min':bounds_min,'max':bounds_max,'primitives':descriptions,'materials':META,'source':'PinkWars_N09_Jardins_Suspendus.blend','units':'metres'}
 encoded=json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 raw=b'PWM1'+struct.pack('<I',len(encoded))+encoded+b''.join(chunks);(OUT/filename).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
 return {'source':'Blender 4.3 · original editable scene','triangles':sum(p['indices']//3 for p in descriptions),'batches':len(descriptions),'vertices':sum(p['vertices']for p in descriptions),'pwmBytes':len(raw),'downloadBytes':(OUT/filename).stat().st_size}

drone_objects=[o for o in sc.objects if o.name.startswith('Drones de surveillance')];export_pwm(drone_objects,'surveillance.pwm.gz')
static=[o for o in sc.objects if not o.name.startswith(('Eau animée','Drones de surveillance','Sas / '))];stats=export_pwm(static,'gardens.pwm.gz');stats.update(colliders=len(SOLIDS),platforms=len(PLAN['platforms']),objectives=len(PLAN['objectives']),trees=len(TREES));(OUT/'stats.json').write_text(json.dumps(stats,indent=2));print(json.dumps(stats),flush=True)
# A true geometric LOD retains closed canopy volumes; do not thin leaves by deleting arbitrary triangles.
reduced=[]
for o in static:
 if o.type=='MESH' and o.data.materials and o.data.materials[0].name.startswith(('leaf','blossom')):
  mod=o.modifiers.new('LOD mobile / feuillage','DECIMATE');mod.ratio=.36;mod.use_collapse_triangulate=True;reduced.append((o,mod))
bpy.context.view_layer.update();low_stats=export_pwm(static,'gardens-low.pwm.gz');low_stats['lod']='mobile';(OUT/'stats-low.json').write_text(json.dumps(low_stats,indent=2));print(json.dumps(low_stats),flush=True)
for o,mod in reduced:o.modifiers.remove(mod)
if '--render' in sys.argv:
 sc.render.filepath=str(OUT/'blender-overview.png');bpy.ops.render.render(write_still=True)
print('N09: terminé',flush=True)

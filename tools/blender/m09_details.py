"""Manufactured profiles and organic forms for the authored N09 metric plan.
Installed before construction; all additional detail stays within existing prop footprints.
"""
import bpy,bmesh,math,random
from mathutils import Vector,Matrix

def install(g):
 box0=g['box'];cyl=g['cyl'];rod=g['rod'];ring=g['ring'];mesh=g['mesh'];G=g['G'];bm=g['bm'];TAU=math.tau
 def rounded(mat,c,size,bevel=True,yaw=0,solid=False,name=None):
  # Chamfer the individual casing, never the huge merged material batch.
  if not bevel or min(size)<.13 or mat not in ['ivory','dark','facade','steel'] or max(size)>50:
   return box0(mat,c,size,bevel,yaw,solid,name)
  w,h,d=size;b=bmesh.new();bmesh.ops.create_cube(b,size=1,matrix=Matrix.Diagonal((w,d,h,1)))
  bmesh.ops.bevel(b,geom=list(b.edges),offset=min(.17,min(size)*.13),segments=2,affect='EDGES',profile=.5)
  b.verts.ensure_lookup_table();pts=[G(*c)+Matrix.Rotation(-yaw,3,'Z')@v.co for v in b.verts];ids={v:i for i,v in enumerate(b.verts)};dst=bm(mat);vs=[dst.verts.new(p)for p in pts]
  for f in b.faces:
   nf=dst.faces.new([vs[ids[v]]for v in f.verts]);nf.smooth=len(f.verts)==4 and f.calc_area()<.06
  b.free()
  if solid:g['SOLIDS'].append(dict(kind=name or g['ZONE'],x=c[0],z=c[2],hx=w/2,hz=d/2,y=c[1]-h/2,height=h))
 g['box']=rounded
 g['material']('stem',(.08,.15,.045),.94)
 def organic_rod(mat,a,b,r=.025,n=8):return rod('stem'if mat=='leaf-dark'else mat,a,b,r,n)
 g['rod']=organic_rod
 def textured(name,file,authored=False,alpha=False):
  m=g['MATS'][name];data=g['META'][name];nodes=m.node_tree.nodes;n=nodes.get('Principled BSDF')
  for l in list(m.node_tree.links):
   if l.to_node==n and l.to_socket.name in ['Base Color','Normal']:m.node_tree.links.remove(l)
  im=bpy.data.images.load(str(g['OUT']/file),check_existing=True);im.pack();tex=nodes.new('ShaderNodeTexImage');tex.image=im
  mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*data['color'],1);m.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);m.node_tree.links.new(mix.outputs[0],n.inputs['Base Color'])
  data.update(texture=file,textureSpace='m09',authoredUV=authored,uvScale=1 if authored else .45)
  if alpha:
   m.node_tree.links.new(tex.outputs['Alpha'],n.inputs['Alpha']);m.surface_render_method='DITHERED';data.update(alphaTest=.42,doubleSided=True)
  if name in ['bark','biotic']:
   bump=nodes.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.065;bump.inputs['Strength'].default_value=.65;m.node_tree.links.new(tex.outputs['Color'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs[0],n.inputs['Normal']);data.update(normalTexture='bark-normal.jpg',roughTexture='bark-rough.jpg')
 for name in ['leaf','leaf-light','leaf-dark']:
  # The atlas carries the local variation; base colours provide species variation.
  tint={'leaf':(.62,.80,.38),'leaf-light':(.82,.94,.58),'leaf-dark':(.35,.58,.30)}[name];g['META'][name]['color']=tint;textured(name,'foliage.png',True,True)
 for name in ['blossom','blossom-light','blossom-pale']:
  g['META'][name]['color']={'blossom':(.95,.40,.64),'blossom-light':(1,.75,.88),'blossom-pale':(1,.94,.94)}[name];textured(name,'flowers.png',True,True)
 for name in ['bark','biotic']:
  data=g['META'][name];data.update(color=(.62,.46,.36)if name=='bark'else(.48,.17,.26),emissive=.18 if name=='biotic'else 0)
  n=g['MATS'][name].node_tree.nodes.get('Principled BSDF');n.inputs['Emission Strength'].default_value=data['emissive'];textured(name,'bark.jpg')
 g['material']('terminal-ui',(.87,.96,1),.50,0,.9);textured('terminal-ui','terminal.png',True)
 def card(mat,c,width,height=None,angle=None):
  height=height or width;angle=random.random()*TAU if angle is None else angle
  u=Vector((math.cos(angle)*width*.5,0,math.sin(angle)*width*.5));v=Vector((0,height*.5,0));tilt=random.uniform(-.5,.5);v.x=math.sin(angle)*height*tilt;v.z=-math.cos(angle)*height*tilt
  q=Vector(c);ps=[q-u-v,q+u-v,q+u+v,q-u+v];b=bm(mat);uv=b.loops.layers.uv.get('UVMap')or b.loops.layers.uv.new('UVMap');lod=b.faces.layers.int.get('mobile')or b.faces.layers.int.new('mobile');vs=[b.verts.new(G(*p))for p in ps];f=b.faces.new(vs);f[lod]=1 if random.random()<.28 else 2
  for l,t in zip(f.loops,[(0,0),(1,0),(1,1),(0,1)]):l[uv].uv=t
 def leaf_patch(mat,c,scale=1):card(mat,c,scale*1.05,scale*1.25)
 g['leaf_patch']=leaf_patch
 oldcrown=g['crown']
 def crown(mat,c,size):
  if not mat.startswith(('leaf','blossom')):return oldcrown(mat,c,size)
  # Overlapping twig silhouettes replace opaque grape-like canopy lumps.
  for j in range(38):
   a=random.random()*TAU;t=random.uniform(-1,1);r=math.sqrt(max(0,1-t*t))*random.random()**.33
   p=(c[0]+math.cos(a)*r*size[0]*.5,c[1]+t*size[1]*.5,c[2]+math.sin(a)*r*size[2]*.5)
   card(mat,p,random.uniform(.7,1.2)*min(size)*.58)
 g['crown']=crown
 def tube(mat,points,radii,sides=10):
  verts=[];frames=[];previous=None
  for j,p in enumerate(points):
   tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)]);tangent.normalize();u=tangent.cross(Vector((0,1,0)))
   if u.length<.01:u=previous.copy()if previous is not None else tangent.cross(Vector((1,0,0)))
   u.normalize()
   if previous is not None and u.dot(previous)<0:u=-u
   previous=u.copy();v=tangent.cross(u).normalized();frames.append((u,v))
   for k in range(sides):
    a=k*TAU/sides;rr=radii[j]*(1+.08*math.cos(k*5+j*.3));q=Vector(p)+(u*math.cos(a)+v*math.sin(a))*rr;verts.append(tuple(q))
  faces=[]
  for j in range(len(points)-1):
   for k in range(sides):faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
  faces.extend([tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))]);b=bm(mat);vs=[b.verts.new(G(*p))for p in verts]
  for f in faces:b.faces.new([vs[i]for i in f]).smooth=True
 def branch(mat,a,b,r,steps=12,sides=8):
  aa,bb=Vector(a),Vector(b);pts=[]
  for j in range(steps+1):
   t=j/steps;p=aa.lerp(bb,t);p.y+=math.sin(t*math.pi)*((bb-aa).length*.15);pts.append(tuple(p))
  tube(mat,pts,[max(.018,r*(1-j/steps)**.85)for j in range(steps+1)],sides)
 def tree(x,y,z,s=1,pink=False,hero=False):
  h=24 if hero else 8*s;radius=22 if hero else 3.8*s;ma='biotic'if hero else'bark';base=2 if hero else .58*s
  segments=24 if hero else 10
  pts=[(x+math.sin(j*.20)*base*.3,y+h*j/segments,z+math.sin(j*.28)*base*.21)for j in range(segments+1)]
  tube(ma,pts,[base*(1-j/(segments*1.29))**1.3*(1+.7*math.exp(-j*.65))for j in range(segments+1)],16 if hero else 8)
  for k in range(9 if hero else 5):
   a=k*TAU/(9 if hero else 5)+random.uniform(-.2,.2);r=radius*random.uniform(.65,.95);start=pts[random.randint(int(segments*.38),int(segments*.67))];tip=(x+math.cos(a)*r,y+h+random.uniform(-2,2)*s,z+math.sin(a)*r)
   branch(ma,start,tip,base*.46,12 if hero else 5,10 if hero else 6)
   for j in range(3 if hero else 1):
    t=.43+j*.18;mid=Vector(start).lerp(Vector(tip),t);mid.y+=math.sin(t*math.pi)*Vector(Vector(tip)-Vector(start)).length*.15
    end=(tip[0]+math.cos(a+(j-1)*.9)*radius*.23,tip[1]+random.uniform(-.5,2)*s,tip[2]+math.sin(a+(j-1)*.9)*radius*.23);branch(ma,tuple(mid),end,base*.14,7 if hero else 3,10 if hero else 5)
  for k in range(9 if hero else 5):
   a=k*TAU/(9 if hero else 5);rr=base*(3 if hero else 2.7);branch(ma,(x,y+base*.7,z),(x+math.cos(a)*rr,y+.03,z+math.sin(a)*rr),base*.27,8 if hero else 3,10 if hero else 5)
  for j in range(6500 if hero else 710 if pink else 520):
   a=random.random()*TAU;r=math.sqrt(random.random())*radius;dy=h+(1-r*r/(radius*radius))*radius*.20+random.gauss(0,1.15 if hero else .65*s)
   mat=random.choice(['blossom','blossom-light','blossom-pale'])if pink else random.choice(['leaf','leaf-light','leaf-dark'])
   card(mat,(x+math.cos(a)*r,y+dy,z+math.sin(a)*r),random.uniform(1.1,2.0)if hero else random.uniform(.65,1.2)*s)
  if hero:
   for a in [0,TAU/3,TAU*2/3]:
    g['polyline']('rose',[(p[0]+math.cos(a+j*.09)*base*(1-j/31)**1.3,p[1],p[2]+math.sin(a+j*.09)*base*(1-j/31)**1.3)for j,p in enumerate(pts)],.065)
  g['TREES'].append(dict(x=x,y=y,z=z,pink=pink,hero=hero))
 g['tree']=tree
 def lathe(mat,x,y,z,profile,n=32):
  verts=[(x+math.cos(k*TAU/n)*r,y+yy,z+math.sin(k*TAU/n)*r)for r,yy in profile for k in range(n)]
  faces=[(j*n+k,j*n+(k+1)%n,(j+1)*n+(k+1)%n,(j+1)*n+k)for j in range(len(profile)-1)for k in range(n)];b=bm(mat);vs=[b.verts.new(G(*p))for p in verts]
  for f in faces:b.faces.new([vs[i]for i in f]).smooth=True
 def planter(x,y,z,r=2.2):
  lathe('ivory',x,y,z,[(r*.72,.02),(r*.79,.08),(r*.82,.18),(r*.93,.83),(r*.94,.98),(r*.91,1.05),(r*.84,1.05),(r*.81,.91),(r*.77,.55)],32)
  lathe('dark',x,y,z,[(r*.78,.06),(r*.81,.13),(r*.81,.21),(r*.79,.24)],32);cyl('soil',(x,y+.85,z),r*.80,.06,32)
  ring('bronze',(x,y+1.015,z),r*.91,.035,40)
  for k in range(8):
   a=k*TAU/8;xx=x+math.cos(a)*r*.87;zz=z+math.sin(a)*r*.87
   rod('steel',(xx,y+.25,zz),(x+math.cos(a)*r*.925,y+.82,z+math.sin(a)*r*.925),.026,6)
  # The old prop capsule remains the authoritative obstacle.
  g['collider']('jardinière',(x-r*.8,z-r*.8),(x+r*.8,z+r*.8),y,1.1,pad=0)
 g['planter']=planter
 def console(it):
  x,y,z=it['x']+it.get('consoleOffset',2.6),it['y'],it['z']-.2
  lathe('dark',x,y,z,[(0,.02),(.52,.02),(.58,.08),(.58,.16),(.43,.24),(0,.24)],28)
  # Curved load-bearing neck and a real sloping display, bounded by the original capsule.
  tube('steel',[(x,y+.16,z-.07),(x,y+.46,z-.22),(x,y+.91,z-.34),(x,y+1.21,z-.32),(x,y+1.42,z-.28)],[.23,.21,.16,.15,.14],12)
  outline=[(-.48,-.41),(.48,-.41),(.54,-.35),(.54,.35),(.48,.41),(-.48,.41),(-.54,.35),(-.54,-.35)]
  vertices=[(x+xx,y+1.43+yy,z+depth-yy*.34)for depth in [-.10,.105]for xx,yy in outline];mesh('dark',vertices,[tuple(reversed(range(8))),tuple(range(8,16))]+[(j,(j+1)%8,(j+1)%8+8,j+8)for j in range(8)])
  rounded('bronze',(x,y+.33,z-.04),(.34,.11,.30))
  # Display plane leans back 20 degrees; individual bezel / glass / buttons / vents.
  b=bm('terminal-ui');uv=b.loops.layers.uv.new('UVMap')if not b.loops.layers.uv.get('UVMap')else b.loops.layers.uv['UVMap'];vs=[b.verts.new(G(x+xx,y+1.43+yy,z+.13-yy*.34))for xx,yy in [(-.45,-.30),(.45,-.30),(.45,.30),(-.45,.30)]];f=b.faces.new(vs)
  for l,t in zip(f.loops,[(0,0),(1,0),(1,1),(0,1)]):l[uv].uv=t
  for xx in [-.48,.48]:
   for yy in [1.06,1.75]:cyl('steel',(x+xx,y+yy,z+.11),.024,.025,8,axis='z')
  for j in range(5):rounded('dark',(x-.095+j*.047,y+.85,z+.065),(.019,.21,.02),bevel=False)
  for xx,ma in [(-.31,'cyan'),(.31,'rose')]:cyl('steel',(x+xx,y+1.0,z+.16),.065,.08,16,axis='z');cyl(ma,(x+xx,y+1.0,z+.205),.043,.01,12,axis='z')
  g['neon']((x-.36,y+.23,z+.27),(x+.36,y+.23,z+.27),'rose',.021);g['text'](str(it['number']).zfill(2),x,y+1.91,z+.12,.20,'white')
  g['collider']('console',(x-.55,z-.3),(x+.55,z+.3),y,1.9,pad=.05)
 g['console']=console
 oldrailing=g['railing']
 def railing(a,b,y1,y2=None,solid=True):
  oldrailing(a,b,y1,y2,solid);xx,zz=a
  cyl('dark',(xx,y1+.04,zz),.15,.08,12);cyl('bronze',(xx,y1+1.20,zz),.09,.10,12)
  for dx in [-.085,.085]:cyl('steel',(xx+dx,y1+.09,zz),.018,.025,6)
 g['railing']=railing
 olddome=g['dome']
 def dome(cx,y,cz,rx,rz,h,cols=28,rows=10,main=False,openings=None):
  olddome(cx,y,cz,rx,rz,h,cols,rows,main,openings)
  openings=openings or [math.pi/2]+([0]if main else[])
  for k in range(cols):
   a=k*TAU/cols
   if any(abs(math.atan2(math.sin(a-b),math.cos(a-b)))<.42 for b in openings):continue
   xx=cx+rx*math.cos(a);zz=cz+rz*math.sin(a);cyl('steel',(xx,y+.24,zz),.26,.48,12);cyl('bronze',(xx,y+.50,zz),.19,.05,12)
   for j in range(2,rows,2):
    t=j*math.pi/2/rows;p=(cx+rx*math.cos(t)*math.cos(a),y+h*math.sin(t),cz+rz*math.cos(t)*math.sin(a));g['ellipsoid']('steel',p,(.35,.24,.35),8)
 g['dome']=dome
 def shuttle(x,y,z):
  # Faceted aerodynamic shell, with a glazed forward cockpit and separate belly.
  sections=[(-6.5,.38,.55),(-5.2,1.10,1.75),(-3.2,1.65,2.95),(-1,1.90,3.45),(2.5,1.60,3.20),(4.8,1.05,2.35),(6,.50,1.25)]
  cross=[(0,1),(.60,.98),(.92,.72),(1,.25),(1,-.25),(.92,-.72),(.60,-.98),(0,-1),(-.55,-.90),(-.85,-.60),(-.85,.60),(-.55,.90)]
  rows=[[(x+3+xx,y+2.6+sy*h,z-2+sz*w)for sy,sz in cross]for xx,h,w in sections]
  for j in range(len(rows)-1):
   for k in range(len(cross)):
    pts=[rows[j][k],rows[j+1][k],rows[j+1][(k+1)%12],rows[j][(k+1)%12]]
    glass=j in [1,2] and k in [1,2,3,4,5];ma='glass-blue'if glass else'dark'if k>=8 else'ivory'
    mesh(ma,pts,[(0,1,2,3)])
    if glass:
     for a,b in zip(pts,pts[1:]+pts[:1]):rod('steel',a,b,.045,8)
   if j>=3:
    for k in [0,6,7]:rod('bronze',rows[j][k],rows[j+1][k],.035,6)
  mesh('dark',rows[0],[tuple(reversed(range(12)))]);mesh('steel',rows[-1],[tuple(range(12))])
  rounded('dark',(x-.25,y+2.8,z-2),(3.1,1.1,3.1))
  for side in [-1,1]:
   # Inset side hatch and handle, behind the outrigger turbines.
   zz=z-2+side*3.40
   g['profile']('dark',x+2.5,zz,[(-1.05,y+1.45),(1.05,y+1.45),(1.05,y+3.2),(.7,y+3.7),(-.7,y+3.7),(-1.05,y+3.2)],.055)
   g['profile']('steel',x+2.5,zz+side*.035,[(-.90,y+1.60),(.90,y+1.60),(.90,y+3.15),(.6,y+3.51),(-.6,y+3.51),(-.90,y+3.15)],.035)
   rod('dark',(x+3.05,y+2.40,zz+side*.08),(x+3.05,y+2.85,zz+side*.08),.06,8)
   g['neon']((x+1.90,y+3.12,zz+side*.08),(x+2.60,y+3.12,zz+side*.08),'cyan',.025)
   # Swept outriggers have an actual broad lifting surface and a tapered edge.
   pts=[(x+1.5,y+2.1,z-2+side*2.6),(x+4.0,y+1.8,z-2+side*7.7),(x+6.8,y+1.6,z-2+side*7.2),(x+6,y+1.75,z-2+side*2.8)]
   mesh('steel',pts+[(a,b-.22,c)for a,b,c in pts],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
   rod('bronze',pts[0],pts[1],.045,8)
  g['profile']('steel',x+8,z-2,[(-1,y+3.2),(0,y+5.4),(1.5,y+4),(1.8,y+3.05)],.18)
  for side in [-1,1]:cyl('cyan',(x-2.20,y+2.6,z-2+side*.72),.10,.05,12,axis='x')
 g['shuttle']=shuttle
 # Record semantic construction metadata for reviewing the editable source.
 g['DETAILS']=dict(version=1,forms=['individual chamfers','hollow rolled planters','curved tapered branches','cutout botanical atlases','inclined touch terminals','dome rib connectors','anchored rail posts'])

"""Upgrade actual LYLU GLB with reference-led, rig-following armor and weathered cape.
No Pink Wars runtime source is changed. All extras are children of original animation bones.
"""
from __future__ import annotations
import os, sys, json, math, struct
from pathlib import Path
from collections import defaultdict
import numpy as np
from scipy.spatial.transform import Rotation
from gltf_helpers import GLTF

ROOT=Path('base/final')
SRC=ROOT/'LYLU-ENHANCED.glb'
OUT=Path('finished/LYLU-REFERENCE-V2.glb')
OUT.parent.mkdir(parents=True,exist_ok=True)
g=GLTF(str(SRC)); D=g.d
# Graphite / blue coherent with the user's reference. Leave animation, skinning and all bone names intact.
for idx in [0,5,11,15,21,25,27,29,30,31,32,33,34,35,36,38,39,40,42,43]:
 m=D['materials'][idx];p=m.setdefault('pbrMetallicRoughness',{})
 color=p.get('baseColorFactor',[.06,.07,.09,1.])
 if idx in [0,5,11,15,21,25,29,30,32,36,38,39,40]: target=[.012,.018,.026,1]
 elif idx in [31,33,34,35,42]:target=[.030,.039,.052,1]
 else:target=[.010,.022,.040,1]
 p['baseColorFactor']=target;p['roughnessFactor']=.37 if idx not in [43] else .14
 # Neutralize old flat silver/white texture in the original glove/cape materials.
 if idx in [5,11,15,21]:p.pop('baseColorTexture',None)
for idx in [6,7,8,9,16,17,18,19]:
 p=D['materials'][idx].setdefault('pbrMetallicRoughness',{}); p['baseColorFactor']=[.033,.046,.063,1];p.pop('baseColorTexture',None)
 p['metallicFactor']=.55;p['roughnessFactor']=.43
# Cape source currently light gray/white; repaint military graphite.
cape=D['materials'][4];cape['pbrMetallicRoughness']['baseColorFactor']=[.012,.017,.029,1]
cape['pbrMetallicRoughness'].pop('baseColorTexture',None)
cape['doubleSided']=True
# Sparse blue rather than broad white for the inherited design.
for idx in [1,2,3,26,28,37,41]:
 m=D['materials'][idx];p=m.setdefault('pbrMetallicRoughness',{});p['baseColorFactor']=[.012,.31,.92,1];m['emissiveFactor']=[.02,.45,.98]
 D.setdefault('extensionsUsed',[])

# Additional physically based materials. Mesh batches are combined by bone and material.
M={}
def material(name,color,metal=0.65,rough=.38,emissive=None,double=False):
 m={'name':'LYLU V2 | '+name,'pbrMetallicRoughness':{'baseColorFactor':[float(x) for x in (*color,1)],'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':double}
 if emissive is not None:
  m['emissiveFactor']=[float(x) for x in emissive]
  m['extensions']={'KHR_materials_emissive_strength':{'emissiveStrength':2.4}}
  D['extensionsUsed']=sorted(set(D['extensionsUsed']+['KHR_materials_emissive_strength']))
 M[name]=len(D['materials']);D['materials'].append(m)
material('ceramic-black',(.014,.019,.030),.72,.36)
material('plate-graphite',(.032,.038,.048),.76,.33)
material('edge-carbon',(.063,.074,.090),.58,.37)
material('rubber-underarmor',(.011,.013,.021),.05,.86)
material('blue-electric',(.020,.47,1.0),.04,.31,(.03,.50,1.0))
material('blue-muted',(.018,.082,.19),.30,.33,(.0,.06,.18))
material('cyan-hot',(.025,.27,.80),.05,.16,(.04,.28,.78))
material('cloth-faded',(.010,.016,.026),.01,.95,double=True)
material('cloth-blue-frayed',(.012,.041,.088),.01,.94,double=True)
material('steel-scarred',(.065,.074,.081),.83,.43)
material('visor-obsidian',(.008,.018,.037),.54,.10)
material('pouch-gunmetal',(.024,.029,.038),.17,.76)
material('holo-detail',(.08,.50,.90),.02,.4,(.03,.15,.36),double=True)

# Polygons expressed in original glTF world coordinates, batched by animation bone.
batches=defaultdict(list)
def add(vertices,faces,mat,bone=39):
 v=np.asarray(vertices,dtype=np.float64)
 inv=np.linalg.inv(g.world[bone])
 v=(np.column_stack((v,np.ones(len(v))))@inv.T)[:,:3]
 batches[(bone,mat)].append((v,np.asarray(faces,dtype=np.int32)))

def box(cx,cy,cz,sx,sy,sz,mat,bone=39,rot=(0,0,0)):
 v=np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],float)*np.array([sx,sy,sz])/2
 v=v@Rotation.from_euler('xyz',rot).as_matrix().T+np.array([cx,cy,cz])
 f=np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])
 add(v,f,mat,bone)

def plate(points,z,thickness,mat,bone=39):
 """Hard-surface extruded polygon, outward front is negative Z."""
 p=np.asarray(points,float);n=len(p)
 v=np.vstack([np.column_stack([p,np.full(n,z)]),np.column_stack([p,np.full(n,z+thickness)])]);f=[]
 for i in range(1,n-1):f.extend([(0,i+1,i),(n,n+i,n+i+1)])
 for i in range(n):k=(i+1)%n;f.extend([(i,k,n+k),(i,n+k,n+i)])
 add(v,f,mat,bone)

def tube(a,b,r,mat,bone=39,segments=7):
 a=np.asarray(a,float);b=np.asarray(b,float);d=b-a;l=np.linalg.norm(d)
 if l<1e-5:return
 d/=l;n=np.cross(d,[0,0,1])
 if np.linalg.norm(n)<.05:n=np.cross(d,[0,1,0])
 n/=np.linalg.norm(n);u=np.cross(n,d)
 verts=[]
 for v in (a,b):
  for j in range(segments):
   theta=2*math.pi*j/segments;verts.append(v+r*(math.cos(theta)*n+math.sin(theta)*u))
 faces=[]
 for j in range(segments):
  k=(j+1)%segments;faces.extend([(j,k,segments+k),(j,segments+k,segments+j)])
 add(verts,faces,mat,bone)

def ring(center,ro,ri,mat,bone=28,seg=24,axis='z'):
 # In the YZ plane for side-ear tech; outward x axis.
 c=np.array(center);v=[];f=[]
 for rad in (ro,ri):
  for j in range(seg):
   t=j*2*math.pi/seg
   if axis=='x':v.append(c+np.array([0,math.cos(t)*rad,math.sin(t)*rad]))
   else:v.append(c+np.array([math.cos(t)*rad,math.sin(t)*rad,0]))
 for j in range(seg):k=(j+1)%seg;f.extend([(j,k,seg+k),(j,seg+k,seg+j)])
 add(v,f,mat,bone)

# --- Helmet: visor with narrow electric-blue V and visor-cheek grilles.
plate([(-.114,1.712),(-.070,1.723),(0,1.719),(.075,1.719),(.118,1.705),(.10,1.678),(.061,1.673),(0,1.667),(-.059,1.672),(-.102,1.680)],-.115,.006,'visor-obsidian',28)
# The V is a bent luminous sweep; special frame around existing visor.
tube((-.112,1.700,-.127),(-.055,1.669,-.135),.0055,'cyan-hot',28,6)
tube((-.055,1.669,-.135),(0,1.659,-.131),.0048,'blue-electric',28,6)
tube((0,1.659,-.131),(.055,1.669,-.135),.0048,'blue-electric',28,6)
tube((.055,1.669,-.135),(.112,1.700,-.127),.0055,'cyan-hot',28,6)
for side in [-1,1]:
 # Helmet rim at temple and circular comms ear pod.
 x=side*.124
 ring((x,1.682,.037),.048,.030,'steel-scarred',28,28,'x')
 ring((x+side*.002,1.682,.037),.032,.025,'blue-electric',28,30,'x')
 ring((x+side*.004,1.682,.037),.013,.004,'cyan-hot',28,25,'x')
 for y in [1.625,1.640]:tube((side*.085,y,-.105),(side*.117,y+.009,-.075),.0035,'blue-muted',28,5)
 # Extra sharp layered forehead roof, cheek protection.
 plate([(side*.012,1.766),(side*.056,1.794),(side*.112,1.777),(side*.118,1.738),(side*.067,1.748)],-.097,.012,'plate-graphite',28)
 plate([(side*.052,1.624),(side*.114,1.645),(side*.114,1.601),(side*.070,1.570)],-.114,.016,'ceramic-black',28)
# Front chin and breathing vents.
for dx in [-.026,-.012,0,.012,.026]:tube((dx,1.589,-.135),(dx,1.616,-.133),.0028,'edge-carbon',28,5)

# Tactical scarf in multi-layer collar around chin/neck. Angular strips frame neck.
for i in range(4):
 y=1.513+i*.018
 for s in [-1,1]:
  plate([(s*.018,y),(s*.123,y+.008),(s*.137,y+.020),(s*.019,y+.013)],-.090+i*.002,.016,'cloth-faded',39)
  tube((s*.035,y+.020,-.102),(s*.118,y+.026,-.091),.0028,'edge-carbon',39,6)

# --- Main torso: textured layered plates, pectoral angular edges, carbon webbing.
# Existing LYLU is slim: reference brings shoulder bulk, chest contrast, tactical straps.
for s in [-1,1]:
 x=s
 # collarbone ridges
 plate([(s*.03,1.492),(s*.175,1.492),(s*.218,1.455),(s*.100,1.441)],-.196,.018,'ceramic-black',39)
 plate([(s*.067,1.486),(s*.185,1.473),(s*.175,1.459),(s*.100,1.466)],-.211,.007,'steel-scarred',39)
 # segmented chest shield larger graphite plates; front projection
 plate([(s*.025,1.438),(s*.179,1.448),(s*.219,1.393),(s*.167,1.340),(s*.068,1.342),(s*.028,1.376)],-.239,.022,'plate-graphite',39)
 tube((s*.069,1.438,-.244),(s*.184,1.438,-.240),.0035,'edge-carbon',39,5)
 # short cyan filament at chest under shoulder
 tube((s*.180,1.430,-.249),(s*.207,1.399,-.253),.0035,'blue-muted',39,6)
 # Shoulder hard shell caps (follow upper arm via bone 9/22)
 arm=9 if s>0 else 22
 plate([(s*.220,1.492),(s*.330,1.468),(s*.367,1.435),(s*.353,1.407),(s*.245,1.433)],-.105,.030,'ceramic-black',arm)
 plate([(s*.257,1.477),(s*.328,1.462),(s*.340,1.444),(s*.262,1.451)],-.136,.011,'plate-graphite',arm)
 tube((s*.270,1.462,-.148),(s*.324,1.446,-.148),.0048,'blue-electric',arm,6)
 # segmented armored pauldrons, triangular overhangs visible from profile
 for k in range(3):
  bx=s*(.282+.02*k);by=1.435-.024*k
  box(bx,by,-.02,.132-.01*k,.024,.110,'plate-graphite',arm,(0,0,s*.22))
 # forearm plates, seams and energy filaments. 8 right 21 left.
 fore=8 if s>0 else 21
 for j in range(3):
  yy=1.168-j*.052
  plate([(s*.267,yy+.028),(s*.356,yy+.026),(s*.365,yy-.018),(s*.275,yy-.022)],-.149,.011,'ceramic-black',fore)
 tube((s*.336,1.171,-.167),(s*.347,1.104,-.166),.004,'blue-electric',fore)
 # hip ammo/utility bags follow pelvis
 pelvis=62
 for j in range(2):
  x=s*(.255+j*.053)
  box(x,.992-j*.013,-.121,.076,.125,.072,'pouch-gunmetal',pelvis,(0,0,s*.07))
  box(x,.984-j*.013,-.165,.057,.078,.010,'plate-graphite',pelvis)
  box(x,.998-j*.013,-.172,.019,.028,.007,'steel-scarred',pelvis)
# Middle chest layered harness.
plate([(-.082,1.365),(-.045,1.386),(.045,1.386),(.082,1.365),(.070,1.304),(-.070,1.304)],-.253,.019,'ceramic-black',39)
plate([(-.043,1.360),(.043,1.360),(.032,1.337),(-.032,1.337)],-.277,.009,'plate-graphite',39)
for sx in [-.12,.12]:
 tube((sx,1.329,-.217),(sx*.94,1.218,-.201),.013,'rubber-underarmor',42,7)
 for i in range(2):box(sx,1.295-i*.066,-.234,.074,.053,.042,'pouch-gunmetal',42)
# Armoured magazine pack with metallic clasps below front chest.
for j in range(4):
 xx=(j-1.5)*.071
 box(xx,1.246,-.230,.062,.103,.063,'pouch-gunmetal',42)
 box(xx,1.274,-.266,.048,.022,.006,'edge-carbon',42)
 box(xx,1.219,-.269,.028,.009,.008,'steel-scarred',42)
# Thick segmented belt / detachable front plates.
for j in range(7):
 x=(j-3)*.082
 box(x,1.081,-.162,.075,.063,.079,'ceramic-black',62,(0,0,(-j+3)*.07))
 box(x,1.081,-.206,.061,.039,.010,'plate-graphite',62)
 if j in [1,5]:box(x,1.083,-.213,.009,.028,.005,'blue-muted',62)

# --- Legs: rugged segmented black tactical armor and reinforcement lines.
for s in [-1,1]:
 upper=50 if s<0 else 58
 lower=48 if s<0 else 56
 boot=44 if s<0 else 52
 for k in range(4):
  y=.839-k*.058
  plate([(s*.060,y+.022),(s*.166,y+.024),(s*.169,y-.017),(s*.068,y-.022)],-.148-k*.002,.010,'plate-graphite',upper)
  tube((s*.167,y+.012,-.165),(s*.167,y-.009,-.166),.0022,'edge-carbon',upper,5)
 # Knee braces
 plate([(s*.060,.549),(s*.172,.552),(s*.186,.517),(s*.153,.492),(s*.070,.499)],-.187,.026,'ceramic-black',lower)
 tube((s*.100,.530,-.215),(s*.144,.515,-.216),.0045,'blue-electric',lower,6)
 # Greaves over existing shin: staggered overlapping plates and ventilation.
 for j in range(4):
  y=.430-j*.068
  plate([(s*.073,y+.027),(s*.155,y+.027),(s*.174,y-.014),(s*.151,y-.023),(s*.075,y-.021)],-.184,.014,'plate-graphite',lower)
  if j in [0,3]:tube((s*.147,y+.017,-.207),(s*.153,y-.006,-.207),.004,'blue-muted',lower,6)
 # Boots thick vamp layer at ankle
 box(s*.123,.151,-.165,.130,.074,.08,'ceramic-black',boot)
 box(s*.124,.133,-.204,.08,.028,.014,'steel-scarred',boot)

# --- Weathered, asymmetrical fabric cape: visibly ragged matte dark cloth with embedded blue scraps.
# Keep inherited narrow base cape; add shoulder drape in multiple genuinely torn segments.
def cloth_panel(xbase,width,top_y,end_y,zbase,seed,mat='cloth-faded',bone=39,style='left'):
 rng=np.random.default_rng(seed);ny=24;nx=14;verts=[];col=[]
 for iy in range(ny+1):
  t=iy/ny; y=top_y*(1-t)+end_y*t
  # Cloth fans toward wearer left; exposed lower edge drifts backwards.
  drift=(-.28 if style=='left' else .10)*t**1.15
  z=zbase+.15*t +.025*math.sin(t*3.8)
  w=width*(.60+1.02*t)
  for ix in range(nx+1):
   u=ix/nx
   jitter=(.003+.013*t)*math.sin(7*u+3.5*t+seed)
   r=(u-.5)*2
   xx=xbase+drift+w*(u-.5) + jitter
   yy=y+(.05*t if u<.15 else 0)-.033*t*math.cos(u*11+seed)
   zz=z+.035*math.sin(u*15+t*5)+.027*u*t
   if iy==ny: yy+=rng.uniform(-.11,.105)*(t**2)
   verts.append([xx,yy,zz]);col.append([1.0,1.0,1.0,1.0])
 faces=[]
 for j in range(ny):
  for i in range(nx):
   # Torn gaps and pinholes increase towards the cape's distal edge.
   disintegrate=j>11 and ((j>=20 and rng.random()<.27) or (j>=16 and rng.random()<.075))
   if disintegrate: continue
   a=j*(nx+1)+i;b=a+1;c=(j+1)*(nx+1)+i;d=c+1
   faces.extend([(a,b,d),(a,d,c)])
 add(verts,faces,mat,bone)

cloth_panel(-.37,.65,1.49,.33,.186,22,'cloth-faded',39,'left')
cloth_panel(-.31,.36,1.48,.23,.202,41,'cloth-faded',39,'left')
cloth_panel(-.12,.27,1.48,.59,.204,93,'cloth-blue-frayed',39,'left')
cloth_panel(.18,.32,1.47,.67,.200,51,'cloth-faded',39,'right')
# Cape's scratch-edged blue streaks and tattered seams (not bright glowing blocks).
for i in range(15):
 r=i/14
 a=(-.25-.20*r,1.45-1.06*r,.247+.10*r)
 b=(a[0]-.015, a[1]-.026, a[2]+.002)
 tube(a,b,.0016,'cloth-blue-frayed',39,5)
# Shoulder-clasp + load-bearing cape buckles
for s in [-1,1]:
 box(s*.142,1.472,.17,.075,.041,.029,'steel-scarred',39,(.1,0,s*.17))
 box(s*.142,1.472,.188,.028,.013,.009,'blue-muted',39)

# --- Tall shoulder rifle attached to harness, not animated independently.
# A slim folded rifle standing vertically on the LEFT back, in the supplied reference.
base=(-.258,1.490,.251)
for xoff,yoff,zoff,sx,sy,sz,mat in [
 (-.020,.035,0,.078,.45,.066,'ceramic-black'),(-.036,.28,0,.033,.22,.034,'edge-carbon'),
 (-.023,.46,.015,.055,.19,.045,'ceramic-black'),(.010,-.085,.028,.10,.18,.05,'plate-graphite'),
 (-.022,-.17,.017,.070,.16,.06,'ceramic-black'),(.019,-.015,.027,.066,.18,.037,'plate-graphite'),
 (-.036,.21,.031,.015,.12,.008,'blue-electric')]:
 box(base[0]+xoff,base[1]+yoff,base[2]+zoff,sx,sy,sz,mat,39,(0,0,.1))
for y in [1.50,1.58,1.68,1.90]:
 tube((-.300,y,.27),(-.269,y,.27),.006,'steel-scarred',39,6)

# --- CAR-14: optional floating drone to match the reference and game character companion.
# Kept on separate root scene node so can be hidden in Blender without affecting LYLU.
DRONE_PARENT=164
c=np.array([.67,1.58,-.02])
# Orb shell is made from disconnected hard panels over sphere. Each piece has a true polygonal edge.
for k in range(8):
 t=math.tau*k/8
 a=c+np.array([math.cos(t)*.126,math.sin(t)*.126,0])
 b=c+np.array([math.cos(t+.60)*.126,math.sin(t+.60)*.126,0])
 d=c+np.array([math.cos(t+.28)*.095,math.sin(t+.28)*.095,-.09])
 add([a.tolist(),b.tolist(),d.tolist()],[[0,1,2]],'ceramic-black',DRONE_PARENT)
 # outer luminous seam / blue electronics
 tube(c+np.array([math.cos(t)*.127,math.sin(t)*.127,-.004]),c+np.array([math.cos(t+.64)*.127,math.sin(t+.64)*.127,-.004]),.003,'blue-electric',DRONE_PARENT,6)
for z in [-.04,.065]:ring(c+np.array([0,0,z]),.118,.094,'plate-graphite',DRONE_PARENT,32,'z')
ring(c+np.array([0,0,-.099]),.060,.036,'cyan-hot',DRONE_PARENT,32,'z')
ring(c+np.array([0,0,-.102]),.028,.007,'blue-electric',DRONE_PARENT,28,'z')

# Apply previously validated inward-facing thumb orientation on both existing glove groups.
for group_idx, wrist_idx in ((104,89),(144,129)):
 original_world=g.world[group_idx]
 pivot=g.world[wrist_idx][:3,3].copy()
 parent=g.parents[group_idx]
 pm=np.eye(4) if parent is None else g.world[parent]
 rotation=np.eye(4);rotation[:3,:3]=Rotation.from_euler('y',180,degrees=True).as_matrix()
 tr=np.eye(4);tr[:3,3]=pivot
 invtr=np.eye(4);invtr[:3,3]=-pivot
 loc=np.linalg.inv(pm)@tr@rotation@invtr@original_world
 node=D['nodes'][group_idx]
 for key in ('translation','rotation','scale'):node.pop(key,None)
 node['matrix']=[round(float(x),10) for x in loc.T.flatten()]
 node.setdefault('extras',{})['pink_wars_glove_orientation']='Corrected around anatomical wrist'

# Native glTF binary buffers: append data, never re-encode source animations/textures.
blob=bytearray(g.buf)
for (parent,mat),items in batches.items():
 verts=[];faces=[];ofs=0
 for v,f in items:
  verts.append(np.float32(v));faces.append(np.uint32(f+ofs));ofs+=len(v)
 v=np.concatenate(verts);f=np.concatenate(faces)
 if len(v)<3:continue
 # Deduplication not needed; safe for hard normals.
 def accessor(values,comp,kind,target,minmax=False):
  values=np.ascontiguousarray(values)
  while len(blob)%4:blob.append(0)
  off=len(blob);blob.extend(values.tobytes());size=values.nbytes
  view=len(D['bufferViews']);D['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':size,'target':target})
  acc={'bufferView':view,'byteOffset':0,'componentType':comp,'count':len(values),'type':kind}
  if minmax:acc.update({'min':values.min(axis=0).astype(float).tolist(),'max':values.max(axis=0).astype(float).tolist()})
  D['accessors'].append(acc);return len(D['accessors'])-1
 pa=accessor(v,5126,'VEC3',34962,True)
 ia=accessor(f.reshape(-1,1),5125,'SCALAR',34963,False)
 new_mesh=len(D['meshes']);D['meshes'].append({'name':f'LYLU V2 | {mat} | attached {parent}','primitives':[{'attributes':{'POSITION':pa},'indices':ia,'material':M[mat],'mode':4}]})
 ni=len(D['nodes']);D['nodes'].append({'name':f'LYLU V2 | {mat} | bone {parent}','mesh':new_mesh,'extras':{'source':'LYLU reference concept 2026','animated_bone_parent':parent}})
 D['nodes'][parent].setdefault('children',[]).append(ni)

D.setdefault('asset',{})['generator']='Pink Wars LYLU reference mesh upgrade, standalone'
D.setdefault('extras',{})['LYLU_REFERENCE_V2']='Cyber-armored graphite, electric blue V visor, frayed blue-edged cape, tactical gear, CAR-14 orb, native 34-bone rig and 16 clips intact'
D['buffers'][0]['byteLength']=len(blob)
j=json.dumps(D,separators=(',',':'),ensure_ascii=False).encode('utf8');j+=b' '*((-len(j))%4)
b=bytes(blob);b+=b'\0'*((-len(b))%4)
with OUT.open('wb') as out:
 out.write(struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(b)))
 out.write(struct.pack('<I4s',len(j),b'JSON'));out.write(j)
 out.write(struct.pack('<I4s',len(b),b'BIN\x00'));out.write(b)
print('WROTE',OUT,OUT.stat().st_size,'bytes','Added batches',len(batches),'nodes',len(D['nodes']),'meshes',len(D['meshes']))
check=GLTF(str(OUT))
assert len(check.d['animations'])==len(g.d['animations'])==16
assert len(check.d['skins'])==len(g.d['skins'])
assert len(check.d['nodes'])>165
print('PASS: animated rig, clips, and source preserved')
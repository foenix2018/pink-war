import json,pathlib
from m01_courtyard import extend_layout
from m01_workshop import extend_workshop
p=pathlib.Path(__file__).resolve().parents[1]; b=[]
def box(x,z,w,d,h,y=0,**kw): b.append(dict(x=x,z=z,hx=w/2,hz=d/2,y=y,height=h,surface=kw.pop('surface','concrete'),campaign=True,**kw))
# Playable buildings: closed blocks flank a continuous street, lab is a real interior.
blocks=[[-24,59,18,28,19], [27,63,20,30,24],[-23,20,20,34,28],[25,34,20,24,21],[-23,-23,20,37,31],[35,-23,10,32,17],[-12,-54,24,12,18],[29,-57,18,6,12]]
parts=[];buildingFloors=[]
def piece(x,y,z,w,h,d,mat='concrete',**flags):
 item=dict(x=x,y=y,z=z,w=w,h=h,d=d,mat=mat,**flags);parts.append(item)
 box(x,z,w,d,h,y-h/2,surface='metal' if mat=='steel' else 'concrete',buildingPart=True,walkableSurface=bool(flags.get('slab')),buildingSlab=bool(flags.get('slab')))
for index,(x,z,w,d,h) in enumerate(blocks):
 old=index in [0,2,6];floors=max(3,int(h/3.6));skin='brick' if old else 'concrete'
 for floor in range(floors):
  y=floor*3.6
  # Partial slabs leave the last floors collapsed and show open rooms.
  if floor>=floors-2:
   piece(x-w*.18,y-.10,z,w*.64,.20,d,'concrete',slab=True);buildingFloors.append(dict(x=x-w*.18,z=z,hx=w*.32,hz=d/2,height=y))
  else:
   piece(x,y-.10,z,w,.20,d,'concrete',slab=True);buildingFloors.append(dict(x=x,z=z,hx=w/2,hz=d/2,height=y))
  for axis,length in [('x',w),('z',d)]:
   bays=max(2,round(length/3.4));spacing=length/bays
   for side in [-1,1]:
    for k in range(bays):
     along=-length/2+(k+.5)*spacing
     broken=floor>=floors-2 and ((k+index+(side>0))%3==0 or along>length*.23)
     if broken:continue
     px=x+along if axis=='x' else x+side*w/2;pz=z+side*d/2 if axis=='x' else z+along
     faceW,faceD=(spacing,.30) if axis=='x' else (.30,spacing)
     door=floor==0 and axis=='z' and side==(1 if x<0 else -1) and index in [2,3] and k in [bays//2-1,bays//2]
     door=door or (floor==0 and axis=='z' and index==2 and side==-1 and k in [bays//2-1,bays//2])
     door=door or (floor==0 and axis=='z' and index==0 and k in [bays//2-1,bays//2])
     if not door:piece(px,y+.55,pz,faceW,1.1,faceD,'plaster' if old and floor%3 else skin)
     piece(px,y+3.25,pz,faceW,.70,faceD,skin)
     # Structural jambs occupy the sides; the opening is genuinely empty.
     dx,dz=(spacing/2-.15,0) if axis=='x' else (0,spacing/2-.15)
     if not (door and k==bays//2-1):piece(px+dx,y+1.85,pz+dz,.30 if axis=='x' else .40,2.6,.40 if axis=='x' else .30,'concrete')
     if not door:
      parts.append(dict(x=px,y=y+2.03,z=pz,w=spacing-.5 if axis=='x' else .055,h=1.7,d=.055 if axis=='x' else spacing-.5,mat='glass',window=True,broken=(k+floor+index)%3!=0,axis=axis,side=side))
  # Central supports ground the exposed slabs.
  for dx in [-w*.35,w*.35]:
   for dz in [-d*.32,d*.32]:piece(x+dx,y+1.75,z+dz,.40,3.5,.40,'concrete')
 # Rubble blocks the unusable back entrances but two street rooms are accessible.
 if index in [2,3]:piece(x,1.3,z-d*.2,w*.35,2.6,.40,'plaster')

for x in [-10,10]:box(x,60,.55,20,5.4)
for z in [50,70]:
 for x in [-6.65,6.65]:box(x,z,6.7,.55,5.4)
# Lab salvage furniture, aligned with model silhouettes.
for v in [[-8.4,54,1.8,3,1.1],[8.3,66,1.7,3,1.3],[-8.3,67,1.5,2,1.8]]:box(*v,labFurniture=True,surface='metal')
# low tactical cover / derelict rescue vehicle (actual silhouettes match colliders)
cars=[dict(x=-5,z=22,w=2.8,d=6,h=1.7,yaw=0,kind='rescue',paint='car-cream'),dict(x=-7,z=42,w=2.1,d=4.8,h=1.45,yaw=1.57079632679,kind='sedan',paint='car-blue'),dict(x=8,z=39,w=2.1,d=4.5,h=1.40,yaw=0,kind='sedan',paint='car-cream'),dict(x=24,z=-4,w=2.0,d=4.8,h=1.4,yaw=1.57079632679,kind='coupe',paint='car-blue'),dict(x=-10.4,z=8,w=2.0,d=4.6,h=1.35,yaw=0,kind='wreck',paint='rust'),dict(x=35,z=8,w=2.65,d=8.8,h=2.75,yaw=0,kind='bus',paint='car-cream')]
for i,c in enumerate(cars):box(c['x'],c['z'],c['d'] if c['yaw'] else c['w'],c['w'] if c['yaw'] else c['d'],c['h'],cover=True,vehicle=i,surface='metal')
for v in [[9,16,3.2,1.2,1.05],[12,-13,3,1.1,1.05]]:box(*v,cover=True)
for x,z in [[10,-49],[26,-49],[10,-41],[26,-41]]:box(x,z,.34,.34,4.6,surface='metal',support=True)

# Interactive furniture colliders are part of the physics source, not renderer-only.
box(-6,61.65,1.65,.6,2.1,campaignTerminal='power',surface='metal')
box(0,54.45,2.6,.6,1.93,campaignTerminal='archive',surface='metal')
box(18,-44.55,2.6,.6,1.93,4.8,campaignTerminal='exit',surface='metal')
# Terrain route: stairs lead to upper relay, terrace and bridge plus service lift.
stairs=[dict(id='l1-stairs',x=18,halfWidth=2.6,topZ=-40,bottomZ=-18,height=4.8)]
decks=[dict(id='l1-relay',x=18,z=-45,hx=8,hz=5,height=4.8),dict(id='l1-bridge',x=6,z=-43,hx=4,hz=1.7,height=4.8)]
lifts=[dict(id='l1-lift',x=29,z=-45,hx=3,hz=3,height=4.8,offset=0)]
for d in decks:box(d['x'],d['z'],d['hx']*2,d['hz']*2,.22,d['height']-.22,walkableSurface=True,surface='metal',traversal=True)
for s in stairs:
 n=24;depth=(s['bottomZ']-s['topZ'])/n
 for i in range(n):
  h=(i+1)*s['height']/n;z=s['bottomZ']-(i+.5)*depth
  box(s['x'],z,s['halfWidth']*2,depth,.18,h-.18,walkableSurface=True,surface='metal',traversal=True)
  for side in [-1,1]:box(s['x']+side*(s['halfWidth']+.08),z,.10,depth,1.02,h+.04,surface='metal',traversal=True,rail=True)
for d in decks:
 for side in [-1,1]:
  spans=[(-50,-44.8),(-41.2,-40)] if d['id']=='l1-relay' and side<0 else [(-50,-48.1),(-41.9,-40)] if d['id']=='l1-relay' else [(d['z']-d['hz'],d['z']+d['hz'])]
  for start,end in spans:box(d['x']+side*d['hx'],(start+end)/2,.12,end-start,1.06,4.84,surface='metal',rail=True)
# Deck's south rail leaves stairs and lift entrances free.
box(18,-50,16,.12,1.06,4.84,surface='metal',rail=True)
box(12,-40,4,.12,1.06,4.84,surface='metal',rail=True);box(24,-40,4,.12,1.06,4.84,surface='metal',rail=True)
for l in lifts:box(l['x'],l['z'],6,6,.20,-.2,walkableSurface=True,surface='metal',liftId=l['id'],traversal=True)
# Backdrop and map edge fences; actual low geometry, no tall invisible walls.
for x in [-35,42]:box(x,10,.14,144,1.05,surface='metal',fence=True)
for z in [-62,82]:box(3.5,z,77,.14,1.05,surface='metal',fence=True)
layout=dict(id='vesper-secours-07',name='Le dernier signal — Quartier des secours',obstacles=b,buildings=blocks,buildingParts=parts,buildingFloors=buildingFloors,cars=cars,stairs=stairs,decks=decks,lifts=lifts,
 route=[[0,72,0],[0,67,0],[-6,63,0],[0,56.5,0],[2.3,56.5,0],[2.3,51.5,0],[0,47,0],[0,29,0],[0,13,0],[18,13,0],[18,6,0],[18,-17,0],[18,-40,4.8],[18,-43,4.8]],
 bounds=dict(minX=-35,maxX=42,minZ=-62,maxZ=82),portals=[[0,33],[-5,45],[7,22],[18,0],[18,-14],[5,-8]])
extend_layout(layout)
extend_workshop(layout)
(p/'assets/level1/layout.json').write_text(json.dumps(layout,indent=2))
js="import {M01_ROOF_COLLIDERS} from './m01-ceiling-layout.js';\n"
js+='// Original Pink War map; generated from assets/level1/layout.json.\nexport const LEVEL1_MAP = '+json.dumps(layout,separators=(',',':'))+';\n'
js+='''export function level1Surfaces(x,z,time=0){
 const result=[];
 for(const f of LEVEL1_MAP.buildingFloors)if(Math.abs(x-f.x)<=f.hx&&Math.abs(z-f.z)<=f.hz)result.push({height:f.height,id:'l1-room'});
 for(const d of LEVEL1_MAP.decks)if(Math.abs(x-d.x)<=d.hx&&Math.abs(z-d.z)<=d.hz)result.push({height:d.height,id:d.id});
 for(const s of LEVEL1_MAP.stairs)if(Math.abs(x-s.x)<=s.halfWidth&&z>=s.topZ&&z<=s.bottomZ)result.push({height:s.height*(s.bottomZ-z)/(s.bottomZ-s.topZ),id:s.id});
 for(const l of LEVEL1_MAP.lifts)if(Math.abs(x-l.x)<=l.hx&&Math.abs(z-l.z)<=l.hz){const t=((time+l.offset)%20+20)%20,s=v=>v*v*(3-2*v);result.push({height:t<4?0:t<10?l.height*s((t-4)/6):t<14?l.height:l.height*(1-s((t-14)/6)),id:l.id,lift:l});}
 return result;
}
export const level1Traversal={surfaces:level1Surfaces,lifts:LEVEL1_MAP.lifts,routes:LEVEL1_MAP.stairs,
 routeForSurface:id=>['l1-relay','l1-bridge','l1-lift','l1-stairs'].includes(id)?'l1-stairs':null,
 height:(x,z,time=0,max=Infinity)=>Math.max(0,...level1Surfaces(x,z,time).map(s=>s.height).filter(h=>h<=max+.001))};
export const createLevel1Obstacles=()=>[...LEVEL1_MAP.obstacles,...M01_ROOF_COLLIDERS].map(b=>({...b}));
'''
(p/'dist/level1-layout.js').write_text(js)

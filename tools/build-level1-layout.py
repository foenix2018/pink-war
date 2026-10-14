import json,pathlib
p=pathlib.Path(__file__).resolve().parents[1]; b=[]
def box(x,z,w,d,h,y=0,**kw): b.append(dict(x=x,z=z,hx=w/2,hz=d/2,y=y,height=h,surface=kw.pop('surface','concrete'),campaign=True,**kw))
# Playable buildings: closed blocks flank a continuous street, lab is a real interior.
blocks=[[-24,59,18,28,19], [27,63,20,30,24],[-23,20,20,34,28],[25,34,20,24,21],[-23,-23,20,37,31],[35,-23,10,32,17],[-12,-54,24,12,18],[29,-57,18,6,12]]
for v in blocks: box(*v,building=True)
for x in [-10,10]:box(x,60,.55,20,5.4)
for z in [50,70]:
 for x in [-6.65,6.65]:box(x,z,6.7,.55,5.4)
# Lab salvage furniture, aligned with model silhouettes.
for v in [[-8.4,54,1.8,3,1.1],[8.3,66,1.7,3,1.3],[-8.3,67,1.5,2,1.8]]:box(*v,labFurniture=True,surface='metal')
# low tactical cover / derelict rescue vehicle (actual silhouettes match colliders)
for v in [[-7,42,5,1.1,1.1],[8,39,3,1,1.15],[-5,22,2.8,6,1.7],[9,16,3.2,1.2,1.05],[24,-4,4,1.2,1.2],[12,-13,3,1.1,1.05]]:box(*v,cover=True)
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
layout=dict(id='vesper-secours-07',name='Le dernier signal — Quartier des secours',obstacles=b,buildings=blocks,stairs=stairs,decks=decks,lifts=lifts,
 route=[[0,72,0],[0,67,0],[-6,63,0],[0,56.5,0],[2.3,56.5,0],[2.3,51.5,0],[0,47,0],[0,29,0],[0,13,0],[18,13,0],[18,6,0],[18,-17,0],[18,-40,4.8],[18,-43,4.8]],
 bounds=dict(minX=-35,maxX=42,minZ=-62,maxZ=82),portals=[[0,33],[-5,45],[7,22],[18,0],[18,-14],[5,-8]])
(p/'assets/level1/layout.json').write_text(json.dumps(layout,indent=2))
js='// Original Pink War map; generated from assets/level1/layout.json.\nexport const LEVEL1_MAP = '+json.dumps(layout,separators=(',',':'))+';\n'
js+='''export function level1Surfaces(x,z,time=0){
 const result=[];
 for(const d of LEVEL1_MAP.decks)if(Math.abs(x-d.x)<=d.hx&&Math.abs(z-d.z)<=d.hz)result.push({height:d.height,id:d.id});
 for(const s of LEVEL1_MAP.stairs)if(Math.abs(x-s.x)<=s.halfWidth&&z>=s.topZ&&z<=s.bottomZ)result.push({height:s.height*(s.bottomZ-z)/(s.bottomZ-s.topZ),id:s.id});
 for(const l of LEVEL1_MAP.lifts)if(Math.abs(x-l.x)<=l.hx&&Math.abs(z-l.z)<=l.hz){const t=((time+l.offset)%20+20)%20,s=v=>v*v*(3-2*v);result.push({height:t<4?0:t<10?l.height*s((t-4)/6):t<14?l.height:l.height*(1-s((t-14)/6)),id:l.id,lift:l});}
 return result;
}
export const level1Traversal={surfaces:level1Surfaces,lifts:LEVEL1_MAP.lifts,routes:LEVEL1_MAP.stairs,
 routeForSurface:id=>id.startsWith('l1-')?'l1-stairs':null,
 height:(x,z,time=0,max=Infinity)=>Math.max(0,...level1Surfaces(x,z,time).map(s=>s.height).filter(h=>h<=max+.001))};
export const createLevel1Obstacles=()=>LEVEL1_MAP.obstacles.map(b=>({...b}));
'''
(p/'dist/level1-layout.js').write_text(js)

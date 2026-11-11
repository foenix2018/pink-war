import {DOORS,ROOMS,roomAt} from './m02-extension-layout.js';
// Doors are crossed square on: the route aims at a point in front of the doorway on this side, then at a point just
// through it, so the arrow never follows a wall to reach the next door along a corridor.
const centreOf=id=>{const r=ROOMS.find(r=>r.id===id);return r?{x:(r.x1+r.x2)/2,z:(r.z1+r.z2)/2}:null;};
function crossing(d,from,to,player){
 const p={x:d.axis==='x'?d.centre:d.fixed,z:d.axis==='x'?d.fixed:d.centre},c=centreOf(to)||centreOf(from)&&{x:2*p.x-centreOf(from).x,z:2*p.z-centreOf(from).z};
 const n=d.axis==='x'?{x:0,z:Math.sign((c?.z??p.z)-p.z)||1}:{x:Math.sign((c?.x??p.x)-p.x)||1,z:0};
 const s=(player.x-p.x)*n.x+(player.z-p.z)*n.z,label=d.label||({dispensaire:'LE DISPENSAIRE',radio:'LE LOCAL RADIO',soins:'LE DISPENSAIRE',service:'LE MARCHÉ'}[d.id]||d.id);
 // Approach squarely unless already lined up inside the opening: a player on a threshold (e.g. leaving the clinic
 // doorway) is not lined up with the next door and would walk into the wall between them.
 const lateral=Math.abs((player.x-p.x)*n.z)+Math.abs((player.z-p.z)*n.x),inside=lateral<(d.width||3)/2-.45&&s>-.9;
 const out=[];if(!inside)out.push({x:p.x-n.x*1.3,z:p.z-n.z*1.3,label});out.push({x:p.x+n.x*1.3,z:p.z+n.z*1.3,label});return out;
}
// Large solid props standing between a room's entrance and its objective: the arrow goes around them instead of
// pointing into the side of a container.
const DETOURS=[{room:'quai',x1:33.2,x2:36.8,z1:-87.8,z2:-82,via:{x:35,z:-89.3,label:'CONTOURNER LE CONTENEUR'}}];
const crosses=(a,b,r)=>{let t0=0,t1=1;for(const[p,d,lo,hi]of[[a.x,b.x-a.x,r.x1,r.x2],[a.z,b.z-a.z,r.z1,r.z2]]){if(Math.abs(d)<1e-9){if(p<lo||p>hi)return false;continue;}let u=(lo-p)/d,v=(hi-p)/d;if(u>v)[u,v]=[v,u];t0=Math.max(t0,u);t1=Math.min(t1,v);if(t0>t1)return false;}return true;};
function detour(player,target,room){for(const d of DETOURS)if(d.room===room&&crosses(player,target,d)&&Math.hypot(d.via.x-player.x,d.via.z-player.z)>.9)return{...d.via,y:0};return null;}
// Follow the authored door graph instead of pointing through clinic and radio-room walls.
const links=[['monte-charge','couloir','monte-charge'],['couloir','dispensaire','dispensaire'],['couloir','radio','radio'],['couloir','marche','service'],['marche','dispensaire','soins'],['marche','seuil','grille'],['seuil','street',null,{x:0,z:75}],['street','parvis',null,{x:0,z:-77}],['parvis','tour','tour'],['tour','coffre','coffre'],['tour','quai','quai']];
export function scenarioWaypoint(player,target,opened=[]){
 if(!target)return null;const y=player.elevation||0;
 if(y>13){const onStair=Math.abs(player.x+6.7)<1.4&&player.z>-46.5;return{x:-6.7,z:onStair?-19.8-Math.max(0,y-12-.7)/13*72*.36:-45.72,y:onStair?Math.max(12,y-.7):25,label:'REDESCENDRE VERS LA PASSERELLE'};}
 if((target.y||0)>10&&y<11.4){const onStair=Math.abs(player.x-10.6)<1.7&&player.z<17;return{x:10.6,z:onStair?16.1-Math.min(12,y+.7)/12*72*.335:16.8,y:onStair?Math.min(12,y+.7):0,label:'MONTER PAR L’ESCALIER EST'};}
 if((target.y||0)>10&&player.x>8.9&&player.z>-16.5)return{x:10.6,z:-18,y:12,label:'REJOINDRE LE PONT'};
 if((target.y||0)<2&&y>1){const west=Math.abs(player.x+10.6)<1.8&&player.z<-17.2;return{x:-10.6,z:west?-19.7-Math.max(0,12-y+.7)/12*72*.335:-18,y:west?Math.max(0,y-.7):12,label:'DESCENDRE PAR L’ESCALIER OUEST'};}
 const start=roomAt(player.x,player.z)||'street',end=roomAt(target.x,target.z)||'street';
 if(start===end)return detour(player,target,start)||target;
 const queue=[{room:start,path:[]}],seen=new Set([start]),unlocked=new Set(opened);
 for(let n=0;n<queue.length;n++){
  const current=queue[n];if(current.room===end){for(const p of current.path)if(Math.hypot(p.x-player.x,p.z-player.z)>(p.reach||.7)){const{reach,...w}=p;return{...w,y:0,label:'PASSER PAR '+p.label};}return target;}
  for(const[a,b,id,point]of links){const next=a===current.room?b:b===current.room?a:null;if(!next||seen.has(next))continue;
   const d=id&&DOORS.find(d=>d.id===id);if(d&&!d.open&&!unlocked.has(id))continue;
   const steps=d?crossing(d,current.room,next,current.path.length?current.path.at(-1):player):[{...point,label:'LE PASSAGE',reach:1.6}];
   seen.add(next);queue.push({room:next,path:[...current.path,...steps]});
  }
 }
 return null;
}
export function scenarioGuidance(player,target,{opened=[],yaw=0,instruction='',progress=null}={}){
 const waypoint=scenarioWaypoint(player,target,opened);
 const distance=waypoint?Math.hypot(waypoint.x-player.x,waypoint.z-player.z,(waypoint.y||0)-(player.elevation||0)):null;
 const angle=waypoint?Math.atan2(Math.sin(Math.atan2(-(waypoint.x-player.x),-(waypoint.z-player.z))-yaw),Math.cos(Math.atan2(-(waypoint.x-player.x),-(waypoint.z-player.z))-yaw)):0;
 return{title:target?.label||'OBJECTIF EN COURS',instruction,route:waypoint?(waypoint===target?'Objectif':'Suivre le passage')+(distance!==null?' · '+Math.ceil(distance)+' m':''):target?'Passage verrouillé : suis l’étape indiquée.':'',bearing:-angle*180/Math.PI,progress};
}
export function nearbyDoor(player){return DOORS.map(d=>({d,distance:Math.hypot(player.x-(d.axis==='x'?d.centre:d.fixed),player.z-(d.axis==='x'?d.fixed:d.centre))})).filter(p=>p.distance<4.5).sort((a,b)=>a.distance-b.distance)[0]?.d||null;}

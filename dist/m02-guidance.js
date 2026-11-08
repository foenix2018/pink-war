import {DOORS,roomAt} from './m02-extension-layout.js';
// Follow the authored door graph instead of pointing through clinic and radio-room walls.
const links=[['monte-charge','couloir','monte-charge'],['couloir','dispensaire','dispensaire'],['couloir','radio','radio'],['couloir','marche','service'],['marche','dispensaire','soins'],['marche','seuil','grille'],['seuil','street',null,{x:0,z:75}],['street','parvis',null,{x:0,z:-77}],['parvis','tour','tour'],['tour','coffre','coffre'],['tour','quai','quai']];
export function scenarioWaypoint(player,target,opened=[]){
 if(!target)return null;const y=player.elevation||0;
 if(y>13){const onStair=Math.abs(player.x+6.7)<1.4&&player.z>-46.5;return{x:-6.7,z:onStair?-19.8-Math.max(0,y-12-.7)/13*72*.36:-45.72,y:onStair?Math.max(12,y-.7):25,label:'REDESCENDRE VERS LA PASSERELLE'};}
 if((target.y||0)>10&&y<11.4){const onStair=Math.abs(player.x-10.6)<1.7&&player.z<17;return{x:10.6,z:onStair?16.1-Math.min(12,y+.7)/12*72*.335:16.8,y:onStair?Math.min(12,y+.7):0,label:'MONTER PAR L’ESCALIER EST'};}
 if((target.y||0)>10&&player.x>8.9&&player.z>-16.5)return{x:10.6,z:-18,y:12,label:'REJOINDRE LE PONT'};
 if((target.y||0)<2&&y>1){const west=Math.abs(player.x+10.6)<1.8&&player.z<-18.5;return{x:-10.6,z:west?-19.7-Math.max(0,12-y+.7)/12*72*.335:-18,y:west?Math.max(0,y-.7):12,label:'DESCENDRE PAR L’ESCALIER OUEST'};}
 const start=roomAt(player.x,player.z)||'street',end=roomAt(target.x,target.z)||'street';
 if(start===end)return target;
 const queue=[{room:start,path:[]}],seen=new Set([start]),unlocked=new Set(opened);
 for(let n=0;n<queue.length;n++){
  const current=queue[n];if(current.room===end){for(const p of current.path)if(Math.hypot(p.x-player.x,p.z-player.z)>1.1)return{...p,y:0,label:'PASSER PAR '+p.label};return target;}
  for(const[a,b,id,point]of links){const next=a===current.room?b:b===current.room?a:null;if(!next||seen.has(next))continue;
   const d=id&&DOORS.find(d=>d.id===id);if(d&&!d.open&&!unlocked.has(id))continue;
   const p=d?{x:d.axis==='x'?d.centre:d.fixed,z:d.axis==='x'?d.fixed:d.centre,label:d.label||({dispensaire:'LE DISPENSAIRE',radio:'LE LOCAL RADIO',soins:'LE DISPENSAIRE',service:'LE MARCHÉ'}[id]||id)}:{...point,label:'LE PASSAGE'};
   seen.add(next);queue.push({room:next,path:[...current.path,p]});
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

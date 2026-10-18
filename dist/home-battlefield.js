import { segmentBox } from './game-logic.js';
import { createRoomNavigation } from './room-layout.js';

// Virtual opponents can approach from beyond the house. Only the headset's
// native pose moves the player; weapon pickups stay on the real scanned floor.
export function createHomeBattlefield({room,obstacles=()=>[],forward=()=>({x:0,z:-1}),random=Math.random}){
 let bounds=null,center=null,navigation=null,radius=30;
 const boxes=()=>center?obstacles().map(b=>({...b,x:b.x+center.x,z:b.z+center.z,y:(b.y||0)+center.y})):[];
 function trace(a,b){
  let hit=room.trace(a,b);
  for(const box of boxes()){
   const t=segmentBox(a,b,box);if(t===null||hit&&t>=hit.t)continue;
   const point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
   const faces=[['x',box.x-box.hx,-1],['x',box.x+box.hx,1],['y',box.y,-1],['y',box.y+box.height,1],['z',box.z-box.hz,-1],['z',box.z+box.hz,1]];
   faces.sort((u,v)=>Math.abs(point[u[0]]-u[1])-Math.abs(point[v[0]]-v[1]));const normal={x:0,y:0,z:0};normal[faces[0][0]]=faces[0][2];
   hit={t,point,normal,surface:box.surface||'concrete'};
  }return hit;
 }
 function insideHouse(p){return bounds&&p.x>=bounds.minX&&p.x<=bounds.maxX&&p.z>=bounds.minZ&&p.z<=bounds.maxZ;}
 function canStand(p,r=.33){
  if(!center||Math.hypot(p.x-center.x,p.z-center.z)>radius-r)return false;
  if(insideHouse(p)&&!(room.canStandOnField||room.canStand)(p,r))return false;
  return !boxes().some(b=>p.x>b.x-b.hx-r&&p.x<b.x+b.hx+r&&p.z>b.z-b.hz-r&&p.z<b.z+b.hz+r&&center.y<b.y+b.height&&center.y+1.95>b.y);
 }
 function setRoom(next){
  if(!next)return;bounds={...next};center||={x:(next.minX+next.maxX)/2,y:next.floorY,z:(next.minZ+next.maxZ)/2};
  radius=Math.max(30,Math.hypot(next.maxX-next.minX,next.maxZ-next.minZ)/2+20);
  navigation=createRoomNavigation({minX:center.x-radius,maxX:center.x+radius,minZ:center.z-radius,maxZ:center.z+radius,floorY:center.y},canStand,.85);
 }
 function findPoint({purpose,head,portal,avoid=[]}={}){
  if(!center||!room.hasFloor())return null;
  if(purpose==='weapon'||purpose==='companion')return room.findPoint({purpose,head,avoid});
  const f=forward(),yaw=Math.atan2(f.x,f.z),first=avoid.length===0;
  for(let i=0;i<180;i++){
   const angle=yaw+(first&&i<60?(random()-.5)*1.8:(random()-.5)*Math.PI*2),distance=Math.max(15,Math.hypot(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ)/2+8)+random()*7;
   const p=portal?{x:portal.x+(random()-.5)*1.1,y:portal.elevation,z:portal.z+(random()-.5)*1.1}:{x:center.x+Math.sin(angle)*distance,y:center.y,z:center.z+Math.cos(angle)*distance};
   if(Math.hypot(p.x-head.x,p.z-head.z)<(purpose==='portal'?12:10)||!canStand(p,.4))continue;
   if(avoid.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<(purpose==='portal'?8:.85)))continue;
   if(purpose==='portal'&&trace(head,{...p,y:p.y+1.3}))continue;
   if(navigation&&!navigation.reachable(p,head))continue;return p;
  }return null;
 }
 return {outdoor:true,coverBoxes:boxes,setRoom,resetRoom(){bounds=center=navigation=null;},findPoint,canStand,trace,hasFloor:room.hasFloor,floorAt:room.floorAt,freeArea:()=>36,
  ceilingAt:p=>p.y+8,waypoint:(from,target)=>navigation?.waypoint(from,target),stats:()=>({center,radius,portalsMinDistance:12,openAir:true})};
}

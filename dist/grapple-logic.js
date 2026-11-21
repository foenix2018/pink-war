import {endSlide} from './locomotion.js';
// Metres and seconds. This module owns no rendering or input listeners.
export const GRAPPLE=Object.freeze({range:20,castSpeed:65,pullSpeed:14,clearance:.73,cooldown:.8,glideTime:.65,glideGravity:9,radius:.53,bodyHeight:1.8});
export const grappleAttached=g=>['flying','pull','hold'].includes(g?.phase);
export function createGrappleState(){return {phase:'idle',anchor:null,launchedAt:-100,arrivesAt:0,readyAt:0,glideUntil:0,velocity:{x:0,y:0,z:0},lastError:'',errorAt:-100};}
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const normalise=p=>{const n=Math.hypot(p.x,p.y,p.z);return n>.000001?{x:p.x/n,y:p.y/n,z:p.z/n}:null;};
const bounds=b=>Number.isFinite(b.x)&&Number.isFinite(b.z)&&b.hx>0&&b.hz>0&&b.height>0;
export function grappleBoxHit(start,end,box,expand=false,bodyHeight=GRAPPLE.bodyHeight){
 if(!bounds(box))return null;
 const r=expand?GRAPPLE.radius:0,h=expand?bodyHeight:0,eps=expand?.00001:0;
 const min={x:box.x-box.hx-r+eps,y:(box.y||0)-h+eps,z:box.z-box.hz-r+eps},max={x:box.x+box.hx+r-eps,y:(box.y||0)+box.height-eps,z:box.z+box.hz+r-eps};
 let lo=0,hi=1,axis=null,sign=0;
 for(const k of ['x','y','z']){
  const d=end[k]-start[k];if(Math.abs(d)<1e-10){if(start[k]<min[k]||start[k]>max[k])return null;continue;}
  let a=(min[k]-start[k])/d,b=(max[k]-start[k])/d,n=-Math.sign(d);if(a>b)[a,b]=[b,a];
  if(a>lo){lo=a;axis=k;sign=n;}hi=Math.min(hi,b);if(lo>hi)return null;
 }
 if(lo<0||lo>1)return null;const normal={x:0,y:0,z:0};if(axis)normal[axis]=sign;
 return {t:lo,normal,box};
}
export function traceGrapple(origin,direction,obstacles,range=GRAPPLE.range){
 if(!finite(origin)||!finite(direction))return null;const d=normalise(direction);if(!d)return null;
 const end={x:origin.x+d.x*range,y:origin.y+d.y*range,z:origin.z+d.z*range};let hit=null;
 for(const box of obstacles||[]){if(box.noCollision||box.trigger)continue;const h=grappleBoxHit(origin,end,box);if(h&&(!hit||h.t<hit.t))hit=h;}
 if(!hit)return null;
 const point={x:origin.x+(end.x-origin.x)*hit.t,y:origin.y+(end.y-origin.y)*hit.t,z:origin.z+(end.z-origin.z)*hit.t};
 return {...hit,point,distance:hit.t*range,attachable:Math.abs(hit.normal.y)<.1&&Math.hypot(hit.normal.x,hit.normal.z)>.5&&hit.box.height>=.8&&!hit.box.noGrapple&&!hit.box.fence};
}
function event(game,type,data={}){game.event?.(type,data);}
export function releaseGrapple(game,{jump=false,reason='manual'}={}){
 const g=game.grapple,p=game.player;if(!g||!grappleAttached(g))return false;
 const anchor=g.anchor,near=anchor&&Math.hypot(p.x-anchor.x,p.z-anchor.z)<2;
 if(jump&&g.phase!=='flying'){
  const n=anchor?.normal||{x:0,z:0},v=g.velocity,l=Math.hypot(v.x,v.z),out=near||l<.1;
  g.velocity={x:out?n.x*6:v.x/l*8,y:Math.min(9,Math.max(7.5,v.y*.5+3)),z:out?n.z*6:v.z/l*8};
  p.grounded=false;p.onLift=null;p.airJumps=1;p.lastGroundedAt=-100;p.verticalSpeed=g.velocity.y;p.jumpImpulseX=p.jumpImpulseZ=0;
  p.jetpackArmed=false;p.jetpackActive=false;
  g.phase='glide';g.glideUntil=game.time+GRAPPLE.glideTime;event(game,'grapple-boost');
 }else{g.phase='idle';p.verticalSpeed=0;event(game,'grapple-release',{reason});}
 g.readyAt=game.time+GRAPPLE.cooldown;game.grappleCollider=null;return true;
}
export function toggleGrapple(game,aim=game.grappleAim){
 if(!game.grappleEnabled||game.state!=='playing'||game.player.hp<=0)return false;
 const g=game.grapple,p=game.player;if(grappleAttached(g))return releaseGrapple(game);
 if(g.phase==='glide'||game.time<g.readyAt)return false;
 const origin={x:p.x,y:(p.elevation||0)+(p.crouched?.95:1.45),z:p.z};
 const direction=aim?.direction||{x:-Math.sin(p.yaw||0),y:0,z:-Math.cos(p.yaw||0)};
 const hit=traceGrapple(origin,direction,game.obstacles);
 if(!hit?.attachable||hit.distance<.5){g.lastError=hit&&!hit.attachable?'Paroi non accrocheuse':'Aucun mur à moins de 20 m';g.errorAt=game.time;g.readyAt=game.time+.25;event(game,'grapple-miss',{reason:g.lastError});return false;}
 Object.assign(g,{phase:'flying',anchor:{...hit.point,normal:hit.normal},origin,launchedAt:game.time,arrivesAt:game.time+hit.distance/GRAPPLE.castSpeed,range:hit.distance,lastError:'',velocity:{x:0,y:0,z:0}});
 endSlide(p);p.jetpackArmed=false;p.jetpackActive=false;
 if(p.shieldDeployed){p.shieldDeployed=false;event(game,'projected-shield-toggle',{active:false});}
 game.grappleCollider=hit.box;game.grappleColliderFrame={x:hit.box.x,z:hit.box.z,hx:hit.box.hx,hz:hit.box.hz,y:hit.box.y||0,height:hit.box.height};event(game,'grapple-shot',{distance:hit.distance});return true;
}
export function sweepGrapplePlayer(game,delta){
 const p=game.player,start={x:p.x,y:p.elevation||0,z:p.z},end={x:start.x+delta.x,y:start.y+delta.y,z:start.z+delta.z};let nearest=null;
 for(const box of game.obstacles||[]){if(box.noCollision||box.trigger)continue;const h=grappleBoxHit(start,end,box,true,p.crouched?.95:GRAPPLE.bodyHeight);if(h&&(!nearest||h.t<nearest.t))nearest=h;}
 const length=Math.hypot(delta.x,delta.y,delta.z),t=nearest?Math.max(0,nearest.t-.008/Math.max(.001,length)):1;
 p.x+=delta.x*t;p.z+=delta.z*t;p.elevation=start.y+delta.y*t;
 // The same arena envelope as ordinary locomotion, including during a boost.
 p.x=Math.max(-98.45,Math.min(98.45,p.x));p.z=Math.max(-98.45,Math.min(98.45,p.z));
 return {blocked:t<.999,normal:nearest?.normal,t};
}
// Returns true only when this module has integrated the player's movement.
export function updateGrapple(game,dt){
 const g=game.grapple,p=game.player;if(!g||g.phase==='idle'){game.grappleLastPosition=null;return false;}
 const old=game.grappleLastPosition;if(old&&Math.hypot(p.x-old.x,(p.elevation||0)-old.y,p.z-old.z)>3){g.phase='idle';game.grappleCollider=null;game.grappleLastPosition=null;p.jumpImpulseX=p.jumpImpulseZ=0;event(game,'grapple-release',{reason:'teleport'});return false;}
 try{
 if(game.player.hp<=0){game.grapple=createGrappleState();game.grappleCollider=null;return false;}
 if(grappleAttached(g)){
  const box=game.grappleCollider,frame=game.grappleColliderFrame;
  if(!game.obstacles.includes(box)||['x','z','hx','hz','height'].some(k=>box[k]!==frame[k])||(box.y||0)!==frame.y){releaseGrapple(game,{reason:'wall-moved'});return false;}
  if(g.phase==='flying'){if(game.time<g.arrivesAt)return false;g.phase='pull';event(game,'grapple-latch');}
  const chestHeight=p.crouched?.95:1.3,chest={x:p.x,y:(p.elevation||0)+chestHeight,z:p.z},d={x:g.anchor.x-chest.x,y:g.anchor.y-chest.y,z:g.anchor.z-chest.z};
  const sight=traceGrapple(chest,d,game.obstacles,Math.hypot(d.x,d.y,d.z)+.04);
  if(sight&&sight.box!==box&&sight.distance<Math.hypot(d.x,d.y,d.z)-.08){releaseGrapple(game,{reason:'obstructed'});return false;}
  const floor=game.surfaceHeight?.(p.x,p.z,game.time,(p.elevation||0)+.3)||0;
  const target={x:g.anchor.x+g.anchor.normal.x*GRAPPLE.clearance,y:Math.max(floor,g.anchor.y-chestHeight),z:g.anchor.z+g.anchor.normal.z*GRAPPLE.clearance};
  const to={x:target.x-p.x,y:target.y-(p.elevation||0),z:target.z-p.z},distance=Math.hypot(to.x,to.y,to.z),speed=Math.min(GRAPPLE.pullSpeed*(game.nanoStats?.grappleSpeed||1),Math.max(2,distance*9)),step=Math.min(distance,speed*dt),n=distance>1e-6?step/distance:0;
  p.grounded=false;p.onLift=null;p.verticalSpeed=0;p.jumpImpulseX=p.jumpImpulseZ=0;game.planarVelocity.x=game.planarVelocity.z=0;
  if(distance<.035){g.phase='hold';g.velocity={x:0,y:0,z:0};return true;}
  g.phase='pull';const result=sweepGrapplePlayer(game,{x:to.x*n,y:to.y*n,z:to.z*n});g.velocity={x:to.x*n/Math.max(dt,.001),y:to.y*n/Math.max(dt,.001),z:to.z*n/Math.max(dt,.001)};
  if(result.blocked&&distance>.25){releaseGrapple(game,{reason:'body-blocked'});}return true;
 }
 if(g.phase==='glide'){
  g.velocity.y-=GRAPPLE.glideGravity*dt;p.verticalSpeed=g.velocity.y;
  const r=sweepGrapplePlayer(game,{x:g.velocity.x*dt,y:g.velocity.y*dt,z:g.velocity.z*dt});
  if(r.blocked){if(r.normal.y>.5){p.grounded=true;p.verticalSpeed=0;g.phase='idle';event(game,'land');return true;}if(r.normal.y<-.5)g.velocity.y=p.verticalSpeed=0;else{g.velocity.x=0;g.velocity.z=0;}}
  const floor=game.surfaceHeight?.(p.x,p.z,game.time,(p.elevation||0)+.05)||0;
  if(p.elevation<=floor&&g.velocity.y<=0){p.elevation=floor;p.grounded=true;p.verticalSpeed=0;g.phase='idle';event(game,'land');return true;}
  if(game.time>=g.glideUntil){g.phase='idle';p.jumpImpulseX=g.velocity.x;p.jumpImpulseZ=g.velocity.z;}
  return true;
 }
 return false;
 }finally{game.grappleLastPosition=game.grapple.phase==='idle'?null:{x:p.x,y:p.elevation||0,z:p.z};}
}

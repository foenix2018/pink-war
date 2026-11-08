import {enemyScale} from './enemy-combat.js';
export const SHIELD_COLOURS=Object.freeze({lylu:0x79bbff,ghju:0xff80b2,enemy:0xff684c});
export const BUBBLE_FORMS=Object.freeze(['brute','bulwark']);
export const hasBubbleProfile=e=>BUBBLE_FORMS.includes(e?.form)&&!e.noProjectedShield;
export function ensureEnemyBubble(e){
 if(!hasBubbleProfile(e)){if(e.projectedShieldInitialised){e.shieldCapacity=0;e.shield=0;e.projectedShieldInitialised=false;}return;}if(e.projectedShieldInitialised)return;
 e.projectedShieldInitialised=true;e.shieldCapacity=60;e.shield=60;e.shieldHitAt=-100;e.shieldBreakAt=-100;
}
export function playerShieldFrame(p){
 const yaw=p.yaw||0,f={x:-Math.sin(yaw),y:0,z:-Math.cos(yaw)},left={x:-Math.cos(yaw),y:0,z:Math.sin(yaw)},crouch=p.crouched?.73:1;
 return {centre:{x:p.x+f.x*.57,y:(p.elevation||0)+1.24*crouch,z:p.z+f.z*.57},radius:{x:1.08,y:1.27*crouch,z:.82},forward:f,left,half:true};
}
export function enemyShieldFrame(e){
 const scale=enemyScale(e.form,e.elite)*(e.roomScale||1),r=e.form==='bulwark'?1.28:1.24;
 return {centre:{x:e.x,y:(e.elevation||0)+1.31*scale,z:e.z},radius:{x:r*scale,y:1.44*scale,z:r*scale},forward:{x:0,y:0,z:1},left:{x:1,y:0,z:0},half:false};
}
export function shieldFacesSource(p,source){
 if(!source||!Number.isFinite(source.x)||!Number.isFinite(source.z))return false;
 const f=playerShieldFrame(p).forward;return (source.x-p.x)*f.x+(source.z-p.z)*f.z>=-1e-7;
}
export function shieldLocal(frame,p){
 const dx=p.x-frame.centre.x,dy=p.y-frame.centre.y,dz=p.z-frame.centre.z;
 return {x:(dx*frame.left.x+dz*frame.left.z)/frame.radius.x,y:dy/frame.radius.y,z:(dx*frame.forward.x+dz*frame.forward.z)/frame.radius.z};
}
export function traceShield(start,end,frame){
 const a=shieldLocal(frame,start),b=shieldLocal(frame,end),d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z},A=d.x*d.x+d.y*d.y+d.z*d.z,C=a.x*a.x+a.y*a.y+a.z*a.z-1;
 // A rear-to-front ray must not be stopped on the inner face of the arm field.
 if(frame.half&&d.z>1e-8)return null;
 if(C<=0&&(!frame.half||a.z>=-1e-7))return 0;
 if(A<1e-12)return null;const B=2*(a.x*d.x+a.y*d.y+a.z*d.z),disc=B*B-4*A*C;if(disc<0)return null;
 for(const t of [(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)])if(t>=0&&t<=1&&(!frame.half||a.z+d.z*t>=-1e-7))return t;
 return null;
}
export function tracePlayerShield(game,start,end){return game.projectedShieldsEnabled&&game.player.shieldDeployed&&game.player.shield>0?traceShield(start,end,playerShieldFrame(game.player)):null;}
export function traceEnemyShield(game,e,start,end){return game.projectedShieldsEnabled&&e.shield>0?traceShield(start,end,enemyShieldFrame(e)):null;}

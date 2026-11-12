// All decisions below consume observed/remembered contacts. Physics still owns
// travel and projectiles. Timings use game time, so pausing cannot finish a strike.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const arc=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function searchContactOrder(e,{time,seen,threat,obstacles=[],segmentBox}){
 if(seen||e.awareness!=='search'||!Number.isFinite(threat?.x)||distance(e,threat)>2.5)return null;
 const stamp=Math.max(e.lastSeenAt??-999,e.lastHeardAt??-999);
 if(time-stamp>10)return null;
 if(!e.searchSweep||e.searchSweep.stamp!==stamp)e.searchSweep={stamp,start:time,centre:{x:threat.x,z:threat.z}};
 const s=e.searchSweep,phase=Math.floor((time-s.start)/1.6),angle=(e.id%6)*Math.PI/3+phase*2.1;
 for(const turn of [0,.7,-.7]){const a=angle+turn,p={x:s.centre.x+Math.sin(a)*2.4,z:s.centre.z+Math.cos(a)*2.4},floor=e.elevation||0,r=(e.radius||.65)+.12;
  if(Math.abs(p.x)>97||Math.abs(p.z)>97)continue;
  const start={x:e.x,y:floor+.9,z:e.z},end={...p,y:floor+.9};
  if(obstacles.some(b=>!b.walkableSurface&&segmentBox(start,end,{...b,hx:b.hx+r,hz:b.hz+r})!==null))continue;
  return {point:p,stopDistance:.45,canFire:false,state:'search-sweep',speedScale:.58,yaw:Math.atan2(p.x-e.x,p.z-e.z)+Math.PI};
 }
 return {point:{x:e.x,z:e.z},stopDistance:.1,canFire:false,state:'search-listen',speedScale:0,yaw:angle};
}
export function pendingMeleeOrder(e,time){
 if(!e.meleeIntent||time>e.meleeIntent.until+.1)return null;
 return {point:{x:e.x,z:e.z},stopDistance:.1,canFire:true,state:'melee-windup',speedScale:0,yaw:e.meleeIntent.yaw};
}
export function updateMeleeIntent(e,{time,seen,allowed,player,blocked}){
 const target={x:player.x,z:player.z},range=distance(e,target),floorGap=Math.abs((e.elevation||0)-(player.elevation||0));
 if(!seen||!allowed||(e.stunnedUntil||0)>time||floorGap>1.3){e.meleeIntent=null;return false;}
 if(!e.meleeIntent){
  if(range>=2||e.attackTimer>0||Math.abs(e.facingError||0)>.55)return false;
  const duration=e.form==='brute'||e.form==='bulwark'?.58:e.form==='spectre'?.24:.36;
  e.meleeIntent={start:time,until:time+duration,yaw:e.yaw||0};e.combatPose='melee-windup';e.chargeProgress=0;return false;
 }
 const intent=e.meleeIntent;e.combatPose='melee-windup';e.chargeProgress=Math.min(1,(time-intent.start)/(intent.until-intent.start));
 if(time<intent.until)return false;
 e.meleeIntent=null;e.lastMeleeAt=time;e.attackTimer=e.form==='brute'?1.2:.85;e.chargeProgress=0;
 const bearing=Math.atan2(player.x-e.x,player.z-e.z)+Math.PI;
 const eye={x:e.x,y:(e.elevation||0)+1.2,z:e.z},to={x:player.x,y:(player.elevation||0)+1.1,z:player.z};
 return range<2.15&&Math.abs(arc(bearing,intent.yaw))<.8&&!blocked(eye,to);
}
export function hasLocalFireSlot(e,{time,allies=[]}){
 const active=allies.filter(a=>a!==e&&(a.stunnedUntil||0)<=time&&a.awareness==='engaged'&&distance(e,a)<14&&Math.abs((a.elevation||0)-(e.elevation||0))<6&&((a.shotIntent&&a.shotIntent.until>time)||(a.form==='probe'&&(a.chargeRemaining||0)>0)||time-Math.max(a.firedAt??-999,a.lastShotAt??-999)<.28));
 return active.length<3;
}
export function prepareHostileShot(e,{time,seen,allowed,allies=[]}){
 if(!seen||!allowed||e.meleeIntent||(e.stunnedUntil||0)>time){e.shotIntent=null;return false;}
 if(e.attackTimer>0)return false;
 if(e.burstRemaining>0)return true;
 if(!e.shotIntent){
  // Nearby firing groups alternate; no global player coordinates or global
  // attack token. A suppressed or stunned ally never reserves a firing slot.
  if(!hasLocalFireSlot(e,{time,allies})){e.attackTimer=.12;e.chargeProgress=0;return false;}
  e.shotIntent={start:time,until:time+.16+(e.id%4)*.035};
 }
 e.chargeProgress=Math.min(1,(time-e.shotIntent.start)/(e.shotIntent.until-e.shotIntent.start));
 return time>=e.shotIntent.until;
}

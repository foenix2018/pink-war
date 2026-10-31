// ORDRE / Individual morale and assistance. Uses perceived or relayed contacts only.
const personalities=Object.freeze({
 stalker:{retreat:.27,speed:1.18},scuttler:{retreat:.19,speed:1.35},
 seer:{retreat:.32,speed:1.17},listener:{retreat:.30,speed:1.22},
 synth:{retreat:.21,speed:1.15},bulwark:{retreat:.10,speed:1.02}
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function safePoint(e,p,obstacles,segmentBox){
 const eye={x:e.x,y:(e.elevation||0)+.95,z:e.z};
 const end={x:p.x,y:eye.y,z:p.z};
 if(Math.abs(p.x)>95||Math.abs(p.z)>95||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
 const radius=(e.radius||.65)+.13,floor=e.elevation||0;
 return obstacles.every(b=>b.walkableSurface||(b.y||0)>floor+1.8||(b.y||0)+b.height<floor+.12
  ||(Math.abs(p.x-b.x)>b.hx+radius&&Math.abs(p.z-b.z)>b.hz+radius))
  &&!obstacles.some(b=>!b.walkableSurface&&(b.y||0)<floor+1.7&&(b.y||0)+b.height>floor+.3
   &&segmentBox(eye,end,{...b,hx:b.hx+radius,hz:b.hz+radius})!==null);
}
function retreatPoint(e,threat,obstacles,segmentBox){
 const d=Math.max(.1,distance(e,threat)),nx=(e.x-threat.x)/d,nz=(e.z-threat.z)/d;
 const sign=(e.id%2)?1:-1;
 for(const side of [0,sign*.52,-sign*.52,sign*.95,-sign*.95]){
  const x=nx*Math.cos(side)-nz*Math.sin(side);
  const z=nx*Math.sin(side)+nz*Math.cos(side);
  const p={x:e.x+x*7,z:e.z+z*7};
  if(safePoint(e,p,obstacles,segmentBox))return p;
 }
 return null;
}
function radio(e,{allies=[],threat,time,seen}){
 if((e.nextRadioAt||0)>time||(!seen&&time-(e.lastSeenAt??-999)>5))return false;
 e.nextRadioAt=time+18;e.radioCallPending=true;
 for(const a of allies){
  if(a===e||a.hp<=0||distance(a,e)>16||Math.abs((a.elevation||0)-(e.elevation||0))>1.1)continue;
  if(a.awareness==='engaged')continue;
  a.awareness='search';a.lastKnownX=threat.x;a.lastKnownZ=threat.z;
  a.lastKnownHeight=threat.y-1.25;a.lastHeardAt=time;
  a.alertedUntil=Math.max(a.alertedUntil||0,time+6);
 }
 return true;
}
export function individualCombatOrder(e,ctx){
 const profile=personalities[e.form];
 if(!profile||e.awareness==='patrol'||!Number.isFinite(ctx.threat?.x)||!Number.isFinite(ctx.threat?.z))return null;
 const {time,threat,seen,obstacles=[],segmentBox}=ctx;
 if(Math.abs((e.elevation||0)-(threat.y-1.25))>1)return null;
 const original=e.maxHp||e.hp||1;
 const threshold=profile.retreat+(e.id%5-2)*.018;
 if(e.hp/original>threshold)return null;
 if(e.retreatPoint&&time<(e.retreatUntil||0)){
  if(distance(e,e.retreatPoint)<.7){e.retreatUntil=0;e.nextRetreatAt=time+8;return null;}
  return {point:e.retreatPoint,stopDistance:.55,canFire:false,state:'withdraw',crouched:false,speedScale:profile.speed};
 }
 if(time<(e.nextRetreatAt||0)||(!seen&&(e.suppressedUntil||0)<=time))return null;
 const point=retreatPoint(e,threat,obstacles,segmentBox);
 if(!point){e.nextRetreatAt=time+3;return null;}
 e.retreatPoint=point;e.retreatUntil=time+4.4;e.nextRetreatAt=e.retreatUntil+8;
 radio(e,ctx);
 return {point,stopDistance:.55,canFire:false,state:'withdraw',crouched:false,speedScale:profile.speed};
}

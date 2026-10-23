import {chooseTacticalCover} from './tactical-enemies.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const eye=e=>({x:e.x,y:(e.elevation||0)+1.25,z:e.z});

// ORDRE's own local tactics. Decisions consume perceptions/memory, never a
// concealed player's live transform. Navigation and collisions stay authoritative.
export function squadOrder(e,ctx){
 const {time,threat,seen,obstacles,allies,segmentBox}=ctx;
 if(['synth','probe'].includes(e.form))return null;
 const t=e.tactics||={state:'advance',nextPlan:0,until:0,shots:0,cover:null};
 if(e.awareness==='patrol'||!Number.isFinite(threat?.x)||!Number.isFinite(threat?.z)||Math.abs((e.elevation||0)-(threat.y-1.25))>.7){t.cover=null;t.flank=null;t.state='advance';return null;}
 const range=distance(e,threat),underFire=(e.suppressedUntil||0)>time;
 if(range<=6)t.cover=null;
 if(t.cover&&!['relocate','cover','peek','return'].includes(t.state))t.cover=null;
 if(e.form==='bulwark'&&seen&&!underFire&&range>9){
  const ally=allies.filter(a=>a!==e&&['seer','listener','synth'].includes(a.form)&&a.awareness!=='patrol'&&Math.abs((a.elevation||0)-(e.elevation||0))<.7&&distance(e,a)<9).sort((a,b)=>distance(e,a)-distance(e,b))[0];
  if(ally){const n=distance(ally,threat)||1,p={x:ally.x+(threat.x-ally.x)/n*2.4,z:ally.z+(threat.z-ally.z)/n*2.4};
   if(free(p,e,obstacles)){t.cover=null;t.state='guard';return {point:p,stopDistance:.7,canFire:true,state:'guard',speedScale:.8};}}
 }
 if(e.ranged&&e.form!=='brute'&&range>6){
  if(t.cover&&segmentBox({...t.cover.hidden,y:(e.elevation||0)+1.96},threat,t.cover.wall)===null){t.cover=null;t.nextPlan=time+.35;}
  if(!t.cover&&time>=t.nextPlan&&(seen||underFire)){
   t.nextPlan=time+2.2;t.cover=chooseTacticalCover(e,threat,obstacles,allies,segmentBox);
   if(t.cover){t.state='relocate';t.until=time+8;}
  }
  if(t.cover){
   if(t.state==='relocate'||t.state==='return'){
    if(distance(e,t.cover.hidden)<.5){t.state='cover';t.until=time+.8+(e.id%3)*.25;}
    else if(time>t.until){t.cover=null;t.nextPlan=time+3;t.state='advance';return null;}
   }else if(t.state==='cover'&&time>=t.until&&!underFire){t.state='peek';t.until=time+2.8;t.shots=0;}
   else if(t.state==='peek'&&(underFire||t.shots>=2||time>=t.until)){t.state='return';t.until=time+4;}
   const point=t.state==='peek'?t.cover.peek:t.cover.hidden;
   return {point,stopDistance:.28,canFire:t.state==='peek'&&seen&&distance(e,point)<.7,state:t.state,speedScale:underFire?1.12:1};
  }
 }
 if(e.form==='brute'&&seen&&range>8&&range<22){
  if(t.state==='windup'&&time>=t.until){t.state='charge';t.until=time+1.15;}
  if(t.state==='charge'&&(time>=t.until||distance(e,t.rush)<1.3)){t.state='advance';t.nextRush=time+5.5;}
  if(!['charge','windup'].includes(t.state)&&time>=(t.nextRush??2+e.id%3)){
   t.state='windup';t.until=time+.7;t.rush={x:threat.x,z:threat.z};
  }
  if(t.state==='windup')return {point:{x:e.x,z:e.z},stopDistance:.1,canFire:false,state:t.state,speedScale:0};
  if(t.state==='charge')return {point:t.rush,stopDistance:1.3,canFire:false,state:t.state,speedScale:1.35};
 }
 if(!e.ranged&&['stalker','scuttler'].includes(e.form)&&range>(e.form==='scuttler'?6:10)){
  if(t.flank&&(time>=t.until||distance(e,t.flank)<.8)){t.flank=null;t.nextPlan=time+6;t.state='advance';return null;}
  if(!t.flank&&seen&&time>=t.nextPlan){
   t.nextPlan=time+3;const side=e.id%2?1:-1,n=range||1;
   const point={x:e.x+(threat.x-e.x)*.46-(threat.z-e.z)/n*side*4.2,z:e.z+(threat.z-e.z)*.46+(threat.x-e.x)/n*side*4.2};
   if(free(point,e,obstacles)&&!obstacles.some(b=>!b.walkableSurface&&segmentBox(eye(e),{...point,y:eye(e).y},{...b,hx:b.hx+(e.radius||.65),hz:b.hz+(e.radius||.65)})!==null)){
    t.flank=point;t.state='flank';t.until=time+3.8;
   }
  }
  if(t.flank)return {point:t.flank,stopDistance:.6,canFire:true,state:t.state,speedScale:1};
 }
 t.state='advance';return null;
}
function free(p,e,obstacles){const r=(e.radius||.65)+.12,y=e.elevation||0;
 return obstacles.every(b=>b.walkableSurface||(b.y||0)+b.height<y+.12||(b.y||0)>y+1.9||Math.abs(p.x-b.x)>b.hx+r||Math.abs(p.z-b.z)>b.hz+r);
}

// A nearby receiver investigates a transmitted contact; it must acquire its own
// sight line before engaging. Solid walls prevent this short-range optical relay.
export function relayVisualContact(e,{time,seen,threat,allies,obstacles,segmentBox}){
 if(!seen||!['synth','listener'].includes(e.form)||time<(e.visualRelayAt||0))return;
 e.visualRelayAt=time+3.5;
 for(const ally of allies){
  if(ally===e||ally.awareness==='engaged'||distance(e,ally)>18||Math.abs((e.elevation||0)-(ally.elevation||0))>1)continue;
  if(obstacles.some(b=>segmentBox(eye(e),eye(ally),b)!==null))continue;
  ally.lastKnownX=threat.x;ally.lastKnownZ=threat.z;ally.lastKnownHeight=threat.y-1.25;
  ally.awareness='search';ally.lastHeardAt=time;ally.alertedUntil=Math.max(ally.alertedUntil||0,time+4);
 }
}

export function clearSquadFiringLane(e,from,to,allies){
 const dx=to.x-from.x,dz=to.z-from.z,length2=dx*dx+dz*dz;if(length2<.01)return true;
 return !allies.some(a=>{
  if(a===e)return false;const t=((a.x-from.x)*dx+(a.z-from.z)*dz)/length2;
  if(t<=.015||t>=.99)return false;const y=from.y+(to.y-from.y)*t,ground=a.elevation||0;
  return y>ground+.12&&y<ground+(a.form==='scuttler'?1.05:2.12)&&Math.hypot(from.x+dx*t-a.x,from.z+dz*t-a.z)<(a.radius||.65)+.12;
 });
}

// Called with the physically clipped bullet segment. A near miss behind a wall
// is inaudible here; ordinary hearing still handles the remote shot separately.
export function registerIncomingFire(enemies,from,to,time,blocked){
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,n=dx*dx+dy*dy+dz*dz;if(n<.0001)return;
 for(const e of enemies){if(e.form==='probe')continue;
  const body={x:e.x,y:(e.elevation||0)+(e.form==='scuttler'?.65:1.25),z:e.z};
  const t=Math.max(0,Math.min(1,((body.x-from.x)*dx+(body.y-from.y)*dy+(body.z-from.z)*dz)/n));
  const p={x:from.x+dx*t,y:from.y+dy*t,z:from.z+dz*t};
  if(Math.hypot(p.x-body.x,p.y-body.y,p.z-body.z)<1.3&&!blocked(p,body))e.suppressedUntil=Math.max(e.suppressedUntil||0,time+1.15);
 }
}

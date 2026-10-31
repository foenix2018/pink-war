// PINK WARS — IA tactique V1 validée. Les décisions ne voient que le contact perçu.
export const ENEMY_BEHAVIORS=Object.freeze(Object.fromEntries(Object.entries({
 sentinel:['SENTINELLE','garde de zone'],stalker:['POURSUIVANT','chasseur et flanqueur'],scuttler:['RAMPANT','harcèlement mobile'],
 seer:['RECO1','éclaireur et relais'],listener:['TRAQUEUR E-06','pisteur acoustique'],synth:['SYNTHÉTIQUE N-08','couvertures tactiques'],
 brute:['BRUTE','briseur de siège'],bulwark:['REMPART','bouclier des alliés'],probe:['SONDE S-03','drone orbital']
}).map(([k,[label,role]])=>[k,Object.freeze({label,role})])));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z),side=e=>((e.id||0)%2?1:-1);
const eye=e=>({x:e.x,y:(e.elevation||0)+1.18,z:e.z});
function free(e,p,ctx){
 if(!finite(p)||Math.abs(p.x)>95||Math.abs(p.z)>95)return false;
 const margin=(e.radius||.65)+.17,f=e.elevation||0,to={x:p.x,y:f+1.18,z:p.z};
 return (ctx.obstacles||[]).every(b=>b.walkableSurface||(b.y||0)>f+1.9||(b.y||0)+b.height<f+.1||(Math.abs(p.x-b.x)>b.hx+margin&&Math.abs(p.z-b.z)>b.hz+margin))
 &&!(ctx.obstacles||[]).some(b=>!b.walkableSurface&&(b.y||0)<f+1.8&&(b.y||0)+b.height>f+.25&&ctx.segmentBox&&ctx.segmentBox(eye(e),to,{...b,hx:b.hx+margin,hz:b.hz+margin})!==null);
}
function point(e,t,f,l=0){const r=Math.max(.01,dist(e,t)),dx=(t.x-e.x)/r,dz=(t.z-e.z)/r;return {x:e.x+dx*f-dz*l,z:e.z+dz*f+dx*l};}
function move(e,p,ctx,state,options={}){
 if(!free(e,p,ctx))return null;
 return {point:p,stopDistance:options.stopDistance??.55,canFire:!!ctx.seen&&options.canFire!==false,state,
 speedScale:options.speedScale??1,crouched:options.crouched??false};
}
function memo(e){return e.specialistAI||(e.specialistAI={nextDecision:0,locked:null,until:0,stage:0});}
function cache(e,ctx,fn,cd=.7){const m=memo(e),t=ctx.time||0;
 if(m.locked&&t<m.until&&dist(e,m.locked.point)>m.locked.stopDistance+.12&&free(e,m.locked.point,ctx))
  return {...m.locked,canFire:!!ctx.seen&&m.locked.canFire};
 m.locked=null;if(t<m.nextDecision)return null;
 m.nextDecision=t+cd+((e.id||0)%3)*.09;const o=fn();
 if(o){m.locked=o;m.until=t+Math.min(2.8,cd*2.4);}return o;
}
export function specialistCombatOrder(e,ctx={}){
 const t=ctx.threat;if(!ENEMY_BEHAVIORS[e.form]||e.form==='probe'||e.awareness==='patrol'||!finite(e)||!finite(t))return null;
 if(Math.abs((e.elevation||0)-((t.y??1.25)-1.25))>1.25)return null;
 const r=dist(e,t),underFire=(e.suppressedUntil||0)>(ctx.time||0),seen=!!ctx.seen,s=side(e);
 switch(e.form){
 case 'sentinel':{
  const m=memo(e);m.home??={x:e.homeX??e.x,z:e.homeZ??e.z};
  if(dist(e,m.home)>3.8)return move(e,m.home,ctx,'hold-post',{stopDistance:.4,speedScale:.66});
  if(seen&&!e.ranged){
   if(r<1.95)return {point:{x:e.x,z:e.z},stopDistance:0,canFire:true,state:'guard-strike',speedScale:0};
   if(r<7)return cache(e,ctx,()=>move(e,point(e,t,Math.min(3.5,r-1.4)),ctx,'intercept',{stopDistance:.25,speedScale:.82}),.75);
   return {point:{x:e.x,z:e.z},stopDistance:0,canFire:false,state:'hold-position',speedScale:0};
  }
  if(seen&&r<4.4)return cache(e,ctx,()=>move(e,point(e,t,-2.6,s*.65),ctx,'backstep',{speedScale:.83}),.9);
  if(seen&&r<20)return {point:{x:e.x,z:e.z},stopDistance:0,canFire:true,state:'sentry-aim',speedScale:0};
  return null;
 }
 case 'stalker':{
  if(underFire&&seen&&r<8)return cache(e,ctx,()=>move(e,point(e,t,-2.3,s*2.2),ctx,'break-contact',{speedScale:1.22}),1.5);
  if(e.ranged&&underFire)return null;
  if(!seen||r<=5||r>27)return null;
  return cache(e,ctx,()=>move(e,point(e,t,clamp(r*.36,3.3,7.5),s*clamp(r*.33,3.3,6)),ctx,'flank',{speedScale:1.2}),1.15);
 }
 case 'scuttler':{
  if(r>22||!seen)return null;
  return cache(e,ctx,()=>{const wobble=s*(Math.floor((ctx.time||0)/1.75+(e.id||0))%2?1:-1);
   return move(e,point(e,t,r>4.5?clamp(r-2.4,1.2,4):r<2?-1.1:1,wobble*(r>3?2.8:1.5)),ctx,'skitter',{speedScale:1.35,stopDistance:.45});},.76);
 }
 case 'seer':{
  if(!seen)return null;
  if(r<9)return cache(e,ctx,()=>move(e,point(e,t,-3.2,s*1.9),ctx,'recon-retreat',{speedScale:1.15}),1.2);
  if(r>27&&r<39)return move(e,point(e,t,clamp(r-20,2,6)),ctx,'spotter-approach',{speedScale:1.04,stopDistance:.8});
  if(underFire)return null;
  // Keep the original shooter's alternating strafe at mid-range; do not lock RECO1 to one side.
  if(r>=12&&r<=27)return null;
  return cache(e,ctx,()=>move(e,point(e,t,1.3,s*3.6),ctx,'spotter-reposition',{speedScale:.95}),2);
 }
 case 'listener':{
  if(!seen){
   if((ctx.time||0)-(e.lastHeardAt??-Infinity)>7||r<2.5)return null;
   return cache(e,ctx,()=>move(e,point(e,t,clamp(r-2,1,4),s*1.1),ctx,'sound-investigate',{canFire:false,speedScale:.82}),1.6);
  }
  if(r<6)return cache(e,ctx,()=>move(e,point(e,t,-3.2,s*1.4),ctx,'listening-retreat',{speedScale:1.05}),1.4);
  if(r>22&&r<38)return move(e,point(e,t,clamp(r-16,2,5)),ctx,'acoustic-approach',{speedScale:.95});
  return cache(e,ctx,()=>move(e,point(e,t,.8,s*2.7),ctx,'triangulate',{speedScale:.95}),1.65);
 }
 case 'synth':
  if(seen&&r<7&&(!e.tactics?.cover||underFire))
   return cache(e,ctx,()=>move(e,point(e,t,-3.2,s*2.1),ctx,'adaptive-disengage',{speedScale:1.18}),1.15);
  return null;
 case 'brute':
  // Le FSM de charge existant reste prioritaire lorsque le BRUTE n'est pas au contact.
  if(seen&&r<1.95)return {point:{x:e.x,z:e.z},stopDistance:0,canFire:true,state:'heavy-slam',speedScale:0};
  return null;
 case 'bulwark':{
  if(!seen)return null;
  const allies=(ctx.allies||[]).filter(a=>a!==e&&a.hp>0&&['seer','listener','synth','stalker'].includes(a.form)&&Math.abs((a.elevation||0)-(e.elevation||0))<.8&&dist(e,a)<11)
   .sort((a,b)=>dist(e,a)-dist(e,b));
  if(allies.length){const ally=allies[0],n=Math.max(.1,dist(ally,t));return cache(e,ctx,()=>move(e,{x:ally.x+(t.x-ally.x)/n*3,z:ally.z+(t.z-ally.z)/n*3},ctx,'shield-ally',{stopDistance:.65,speedScale:.78}),1.2);}
  if(r>12)return cache(e,ctx,()=>move(e,point(e,t,clamp(r-8,1.5,4)),ctx,'shield-advance',{stopDistance:.85,speedScale:.8}),1.8);
  return null;
 }
 }
 return null;
}
export function specialistVisualRelay(e,{time=0,seen=false,threat,allies=[],obstacles=[],segmentBox}={}){
 if(e.form!=='seer'||!seen||!finite(threat)||time<(e.specialistRelayAt||0))return 0;
 e.specialistRelayAt=time+5.4;let n=0;
 for(const a of allies){if(a===e||a.hp<=0||a.awareness==='engaged'||dist(e,a)>23||Math.abs((a.elevation||0)-(e.elevation||0))>1.2)continue;
  if(segmentBox&&obstacles.some(b=>!b.walkableSurface&&segmentBox(eye(e),eye(a),b)!==null))continue;
  a.lastKnownX=threat.x;a.lastKnownZ=threat.z;a.lastKnownHeight=(threat.y??1.25)-1.25;
  a.lastHeardAt=time;a.awareness='search';a.alertedUntil=Math.max(a.alertedUntil||0,time+5);n++;
 }return n;
}
export function probeSpecialistGuidance(e,{time=0,range,dx,dz}={}){
 const r=Math.max(.01,range||Math.hypot(dx||0,dz||0)),seed=(e.id||0)*1.73;
 const direction=(Math.floor(time/6.5+seed)%2?1:-1),orbit=.32+.11*Math.sin(time*.65+seed);
 const approach=clamp((r-15)/5,-1,1),nx=(dx||0)/r,nz=(dz||0)/r;
 return {vx:nx*approach+nz*orbit*direction,vz:nz*approach-nx*orbit*direction,altitudeOffset:.32*Math.sin(time*.7+seed)};
}
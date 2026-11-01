// Pink Wars — shared robot damage/destruction visual system (GPU instancing).
// Active robots smoke progressively as their hull is damaged. Destroyed robots
// tip/fall onto the terrain before a physical-looking fire/smoke/debris blast.
// No combat damage is applied here: gameplay keeps ownership of kills & scoring.
// Small shared pools protect iPhone/Quest frame time; no per-robot particle meshes.
import {createGrenadeExplosionV4} from './grenade-explosion-v4.js';

const clamp01=n=>Math.min(1,Math.max(0,Number(n)||0));
export function enemyDamageStage(hp,maxHp){
 const total=Math.max(1,Number(maxHp)||1),damage=clamp01(1-Math.max(0,Number(hp)||0)/total);
 if(damage<.18)return {damage,stage:0,smoke:0,sparks:0,interval:Infinity};
 if(damage<.42)return {damage,stage:1,smoke:1,sparks:0,interval:.85};
 if(damage<.68)return {damage,stage:2,smoke:2,sparks:1,interval:.49};
 if(damage<.87)return {damage,stage:3,smoke:3,sparks:2,interval:.29};
 return {damage,stage:4,smoke:4,sparks:3,interval:.17};
}
export function robotDeathDuration(form='stalker'){
 return form==='probe'?.92:form==='sentinel'?1.48:['brute','bulwark'].includes(form)?1.24:1.08;
}

// Chassis-local failure contacts. The game uses form='seer' for RECO1 and
// form='bulwark' for Rempart. Local forward is -Z, unlike their asset bind pose.
// Sentinel's sensor is actually 4.04m high; generic 1.7m offsets miss its head.
export const ROBOT_FAILURE_CONTACTS=Object.freeze({
 seer:Object.freeze([[0,1.17,-.24],[0,1.69,-.11],[-.27,.62,-.02],[.30,1.24,-.15],[.40,1.34,-.44]]),
 brute:Object.freeze([[0,1.56,-.37],[0,2.05,-.28],[-.69,.91,-.14],[.75,1.24,-.12],[-1.03,1.62,-.22]]),
 bulwark:Object.freeze([[0,1.22,-.26],[0,1.738,-.25],[-.46,.66,-.10],[.47,1.20,-.13],[.53,1.24,-.46]]),
 sentinel:Object.freeze([[0,2.74,-.62],[0,4.04,-.64],[-.90,1.27,-.35],[1.02,3.18,-.13],[1.43,2.42,-1.15]]),
 probe:Object.freeze([[0,.22,-.15],[0,.48,-.52],[-.42,.11,0],[.42,.11,0],[0,.18,-.70]]),
 default:Object.freeze([[0,1.03,-.15],[0,1.75,-.18],[-.40,.70,0],[.43,.92,-.10],[.52,1.27,-.40]])
});
export const robotFailureCategory=form=>
 form==='seer'?'RECO1':form==='brute'?'BRUTE':form==='bulwark'?'REMPART':form==='sentinel'?'SENTINEL':'GENERIC';
export function electricFailureAnchor(e={},slot=0,model=null,scratch=null){
 const contacts=ROBOT_FAILURE_CONTACTS[e.form]||ROBOT_FAILURE_CONTACTS.default;
 const index=Math.abs(Math.trunc(Number(slot)||0))%contacts.length;
 const [lx,ly,lz]=contacts[index];
 // The model transform contains enemy/elite scale and yaw. Apply it when
 // available to keep bursts on articulated meshes, not arbitrary world space.
 if(model?.localToWorld&&scratch?.set){
  const p=model.localToWorld(scratch.set(lx,ly,lz));
  return {x:p.x,y:p.y,z:p.z};
 }
 const scale=(e.elite&&e.form!=='probe'?1.3:e.elite?1.13:1)*(Number(e.roomScale)||1);
 const yaw=Number(e.yaw)||0,c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:(Number(e.x)||0)+(c*lx+s*lz)*scale,
   y:(Number(e.elevation)||0)+ly*scale,
   z:(Number(e.z)||0)+(-s*lx+c*lz)*scale};
}
// Scripted, irregular shutdown discharges; no full-screen flashes.
export const SHUTDOWN_CUES=Object.freeze([
 Object.freeze({at:.11,count:5}),Object.freeze({at:.30,count:8}),
 Object.freeze({at:.55,count:6}),Object.freeze({at:.81,count:10}),
 Object.freeze({at:.965,count:15})
]);
export function robotOpticPower(t,seed=0){
 t=clamp01(t);
 const flicker=Math.sin(t*19+seed*1.8)*Math.sin(t*31+seed*.7);
 return Math.max(.025,(1-t*.97)*(.47+.41*Math.max(0,flicker)));
}

export function createEnemyDestructionFX(T,scene,{camera=null,low=false,maxDeaths=8,maxParticles=160,onSound=null}={}){
 const budget=low?Math.min(75,maxParticles):maxParticles,limit=low?Math.min(4,maxDeaths):maxDeaths;
 const smokeTex=(()=>{
  const s=64,d=new Uint8Array(s*s*4);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){
   const u=(x-s*.5)/(s*.5),v=(y-s*.5)/(s*.5),r=Math.hypot(u,v),
     noise=.07*Math.sin(x*.37+y*.16)+.05*Math.sin(y*.43-x*.13);
   const a=clamp01((1.04-r+noise)/.49);
   const off=(y*s+x)*4,c=72+Math.floor(16*Math.sin(x*.13+y*.17));
   d[off]=c;d[off+1]=c+3;d[off+2]=c+9;d[off+3]=Math.floor(180*a*a);
  }
  const t=new T.DataTexture(d,s,s,T.RGBAFormat);t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
 })();
 const puffGeo=new T.PlaneGeometry(1,1),sparkGeo=new T.TetrahedronGeometry(.04,0),
   arcGeo=new T.BoxGeometry(.026,.26,.026);
 const puffMat=new T.MeshBasicMaterial({map:smokeTex,transparent:true,opacity:.58,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const sparkMat=new T.MeshBasicMaterial({color:0xffbd6d,transparent:true,opacity:.94,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const arcMat=new T.MeshBasicMaterial({color:0xc2eeff,transparent:true,opacity:.97,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const smoke=new T.InstancedMesh(puffGeo,puffMat,budget),sparks=new T.InstancedMesh(sparkGeo,sparkMat,budget),
   arcs=new T.InstancedMesh(arcGeo,arcMat,budget);
 for(const mesh of [smoke,sparks,arcs]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);}
 smoke.renderOrder=7;sparks.renderOrder=8;arcs.renderOrder=9;
 const particles=[],timers=new Map(),deaths=[];
 const eyeStates=new WeakMap();
 let soundHandler=typeof onSound==='function'?onSound:null;
 const soundFaultAt=new Map();
 function sound(kind,details){try{soundHandler?.(kind,details);}catch(error){console.warn?.('robot sound',error)}}
 const pos=new T.Vector3(),sc=new T.Vector3(),matrix=new T.Matrix4(),rotation=new T.Quaternion();
 const tiltAxis=new T.Vector3(.8,.4,.7),anchorScratch=new T.Vector3();
 let elapsed=0;
 const blastOptions={camera,maxBlasts:low?2:4,quality:low?'low':'normal'};
 let explosions=createGrenadeExplosionV4(T,scene,blastOptions);
 const rnd=()=>Math.random();
 function emit(kind,x,y,z,size=.2){
  if(particles.length>=budget)return;
  const electrical=kind==='arc',metal=kind==='spark'||electrical;
  particles.push({kind,x,y,z,
    xv:(rnd()-.5)*(electrical?4.8:metal?3.8:.36),
    yv:electrical?1.6+rnd()*3.5:metal?1.8+rnd()*3:.45+rnd()*.8,
    zv:(rnd()-.5)*(electrical?4.8:metal?3.8:.36),
    life:electrical?.085+rnd()*.20:metal?.28+rnd()*.37:.85+rnd()*.68,
    age:0,size,angle:rnd()*Math.PI*2});
 }
 function powerEyes(model,power){
  const eye=model?.userData?.optics;if(!eye)return;
  let base=eyeStates.get(eye);
  if(!base){base={opacity:eye.opacity,transparent:eye.transparent,depthWrite:eye.depthWrite};eyeStates.set(eye,base);}
  if(power>=.999){
    eye.opacity=base.opacity;
    if(eye.transparent!==base.transparent||eye.depthWrite!==base.depthWrite){
      eye.transparent=base.transparent;eye.depthWrite=base.depthWrite;eye.needsUpdate=true;
    }
    return;
  }
  if(!eye.transparent||eye.depthWrite){eye.transparent=true;eye.depthWrite=false;eye.needsUpdate=true;}
  eye.opacity=base.opacity*Math.max(.035,power);
 }
 function electricBurst(e,count=6,size=.11,model=null){
  for(let i=0;i<count;i++){
    const at=electricFailureAnchor(e,i%5,model,anchorScratch);
    // Four actuator/head/weapon failure points, with minimal positional jitter.
    emit('arc',at.x+(rnd()-.5)*.16,at.y+(rnd()-.5)*.12,at.z+(rnd()-.5)*.16,size);
    if(i%3===0)emit('spark',at.x,at.y,at.z,size*.75);
  }
 }
 function mark(e,model,dt=0){
  if(!e||!model)return;
  const stage=enemyDamageStage(e.hp,e.maxHp);
  if(stage.stage===0){timers.delete(e.id);soundFaultAt.delete(e.id);powerEyes(model,1);return;}
  const critical=stage.stage>=3;
  // Power failure affects the robot's own optics material, never shared armor.
  powerEyes(model,critical?(.15+.62*Math.abs(Math.sin(elapsed*5.1+e.id)*Math.sin(elapsed*2.4+e.id*.31)))*(.68+stage.damage*.26):1);
  // A hard cap on emission distance and per-robot frequency limits GPU uploads.
  if(camera?.position&&Math.hypot((e.x||0)-camera.position.x,(e.z||0)-camera.position.z)>(low?46:75))return;
  const next=timers.get(e.id)||0;
  if(elapsed<next)return;
  timers.set(e.id,elapsed+stage.interval*(.84+rnd()*.32));
  const cat=robotFailureCategory(e.form),massive=cat==='BRUTE'||cat==='REMPART'||cat==='SENTINEL';
  const smokeSize=(massive?.29:.24)+.07*stage.stage;
  for(let i=0;i<stage.smoke;i++){
    const at=electricFailureAnchor(e,(i+stage.stage)%5,model,anchorScratch);
    emit('smoke',at.x+(rnd()-.5)*.20,at.y+(rnd()-.5)*.18,at.z+(rnd()-.5)*.20,smokeSize+rnd()*.12);
  }
  for(let i=0;i<stage.sparks;i++){
    const at=electricFailureAnchor(e,(i+2)%5,model,anchorScratch);
    emit('spark',at.x,at.y,at.z,.09);
  }
  // RECO1 emits discrete optic/wrist arcs, Brute vents its exposed chest and
  // pistons, and Rempart arcs at the head, shoulders and cannon.
  if(stage.stage>=2)electricBurst(e,stage.stage===2?1:stage.stage===3?3:5,.095,model);
  // Critical machine faults: limit repeated sounds per robot even at 120fps.
  if(stage.stage>=3&&elapsed>=(soundFaultAt.get(e.id)||0)){
    sound('fault',{id:e.id,x:e.x,y:(e.elevation||0)+1.2,z:e.z,form:e.form,damage:stage.damage});
    soundFaultAt.set(e.id,elapsed+(stage.stage===4?.70:1.15)+rnd()*.22);
  }
 }
 function kill(model,{id=null,form='stalker',x,y,z,groundY=null}={}){
  if(!model)return;
  if(id!==null){timers.delete(id);soundFaultAt.delete(id);}
  const p=model.position,record={
   model,form,age:0,duration:robotDeathDuration(form),
   x:Number.isFinite(x)?x:p.x,z:Number.isFinite(z)?z:p.z,
   y:Number.isFinite(groundY)?groundY:p.y,
   startY:p.y,initialX:model.rotation.x,initialZ:model.rotation.z,
   dir:(Math.random()>.5?1:-1),nextCue:0,seed:Number.isFinite(id)?id:Math.round(rnd()*100),
  };
  model.position.set(record.x,record.startY,record.z);
  deaths.push(record);
  sound('shutdown',{id,x:record.x,y:record.startY+1,z:record.z,form,damage:1,duration:record.duration});
  electricBurst({form,x:record.x,z:record.z,elevation:record.startY,yaw:model.rotation.y||0},low?5:9,.12,model);
  for(let i=0;i<(low?3:6);i++)emit('spark',record.x,record.startY+1,record.z,.09);
  while(deaths.length>limit){
   const old=deaths.shift();scene.remove(old.model);
  }
 }
 function update(dt=0){
  const delta=Math.min(.065,Math.max(0,Number(dt)||0));elapsed+=delta;
  for(let i=deaths.length-1;i>=0;i--){
   const d=deaths[i];d.age+=delta;
   const t=clamp01(d.age/d.duration),fall=t*t*(3-2*t);
   const flying=d.form==='probe';
   // Servo shutdown: small irregular spasms fade as the chassis hits ground.
   const twitch=(1-fall)*Math.sin(d.age*37+d.seed*.8)*.055;
   d.model.rotation.x=d.initialX+d.dir*fall*(flying?.9:1.27)+twitch;
   d.model.rotation.z=d.initialZ+d.dir*fall*(flying?.65:.45)-twitch*.65;
   powerEyes(d.model,robotOpticPower(t,d.seed)*.7);
   d.model.position.y=flying?Math.max(d.y+.12,d.startY-5*t*t):d.y+Math.sin(fall*Math.PI)*.21;
   const origin={form:d.form,x:d.x,z:d.z,elevation:d.model.position.y,yaw:d.model.rotation.y||0};
   while(d.nextCue<SHUTDOWN_CUES.length&&t>=SHUTDOWN_CUES[d.nextCue].at){
     const cue=SHUTDOWN_CUES[d.nextCue++];
     electricBurst(origin,low?Math.max(2,Math.round(cue.count*.58)):cue.count,.12,d.model);
     if(cue.at===.30||cue.at===.81)
       sound('glitch',{id:d.seed,x:d.x,y:d.model.position.y+1,z:d.z,form:d.form,damage:1});
     if(cue.at===.965)
       sound('terminal',{id:d.seed,x:d.x,y:d.model.position.y+1,z:d.z,form:d.form,damage:1});
   }
   if(d.age<d.duration){
    if(d.age>.15&&rnd()<delta*(low?8:14)){
      emit('smoke',d.x,d.model.position.y+1,d.z,.5);
      electricBurst(origin,low?2:4,.10,d.model);
    }
   }else{
    electricBurst(origin,low?8:16,.17,d.model);
    powerEyes(d.model,.035);
    const size=d.form==='sentinel'?7.2:['brute','bulwark'].includes(d.form)?5.0:flying?3.0:3.8;
    explosions.spawn({x:d.x,y:d.y+.7,z:d.z,radius:size});
    for(let n=0;n<(low?5:11);n++)emit('spark',d.x,d.y+.7,d.z,.12);
    scene.remove(d.model);deaths.splice(i,1);
   }
  }
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.age+=delta;if(p.age>=p.life){particles.splice(i,1);continue;}
   p.x+=p.xv*delta;p.y+=p.yv*delta;p.z+=p.zv*delta;
   if(p.kind==='spark'||p.kind==='arc')p.yv-=6.6*delta;else p.xv*=.99;
  }
  for(const [type,mesh] of [['smoke',smoke],['spark',sparks],['arc',arcs]]){
   let k=0;
   for(const p of particles){
    if(p.kind!==type)continue;
    const a=1-p.age/p.life,size=p.size*(type==='smoke'?(1+p.age*1.9)*Math.sqrt(a):Math.max(.1,a));
    pos.set(p.x,p.y,p.z);
    if(type==='arc'){
      sc.set(Math.max(.0001,size*.8),Math.max(.0001,size*3.4*a),Math.max(.0001,size*.8));
      tiltAxis.set(Math.sin(p.angle),.3+Math.cos(p.angle*2)*.7,Math.cos(p.angle));
      tiltAxis.normalize?.();rotation.setFromAxisAngle(tiltAxis,p.angle);
    }else{sc.setScalar(Math.max(.0001,size));if(type==='smoke'&&camera)rotation.copy(camera.quaternion);else rotation.identity();}
    matrix.compose(pos,rotation,sc);mesh.setMatrixAt(k++,matrix);
   }
   mesh.count=k;if(k)mesh.instanceMatrix.needsUpdate=true;
  }
  explosions.update(delta);
 }
 function reset(){
  for(const d of deaths)scene.remove(d.model);deaths.length=0;
  timers.clear();soundFaultAt.clear();particles.length=0;smoke.count=sparks.count=arcs.count=0;elapsed=0;
  explosions.dispose();explosions=createGrenadeExplosionV4(T,scene,blastOptions);
 }
 function dispose(){
  for(const d of deaths)scene.remove(d.model);deaths.length=0;timers.clear();soundFaultAt.clear();particles.length=0;
  explosions.dispose();
  for(const m of [smoke,sparks,arcs])scene.remove(m);
  puffGeo.dispose();sparkGeo.dispose();arcGeo.dispose();puffMat.dispose();sparkMat.dispose();arcMat.dispose();smokeTex.dispose();
 }
 return {mark,kill,update,reset,dispose,setSoundHandler:handler=>{soundHandler=typeof handler==='function'?handler:null;},stats:()=>({damagedParticles:particles.length,electricArcs:particles.filter(p=>p.kind==='arc').length,falling:deaths.length,explosions:explosions.stats().active})};
}

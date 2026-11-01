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

// Four localized electrical failure points: damaged torso reactor, optics,
// limb actuators and (for armed humanoids) weapon arm. Heights scale by chassis.
export function electricFailureAnchor(e={},slot=0){
 const form=e.form||'stalker',flying=form==='probe',
   heavy=['brute','bulwark','sentinel'].includes(form),
   base=Number(e.elevation)||0,scale=heavy?1.4:flying?.38:1,
   yaw=Number(e.yaw)||0;
 const anchors=[[0,1.03,.13],[0,1.64,-.23],[-.52,.76,.04],[.55,.90,-.15],[.68,1.22,-.39]];
 const [lx,ly,lz]=anchors[Math.abs(Math.trunc(slot))%anchors.length];
 return {x:(Number(e.x)||0)+Math.cos(yaw)*lx*scale+Math.sin(yaw)*lz*scale,
   y:base+(flying?.20+ly*.13:ly*scale),
   z:(Number(e.z)||0)-Math.sin(yaw)*lx*scale+Math.cos(yaw)*lz*scale};
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

export function createEnemyDestructionFX(T,scene,{camera=null,low=false,maxDeaths=8,maxParticles=160}={}){
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
 const pos=new T.Vector3(),sc=new T.Vector3(),matrix=new T.Matrix4(),rotation=new T.Quaternion();
 const tiltAxis=new T.Vector3(.8,.4,.7);
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
 function electricBurst(e,count=6,size=.11){
  for(let i=0;i<count;i++){
    const at=electricFailureAnchor(e,i%5);
    // Four actuator/head/weapon failure points, with minimal positional jitter.
    emit('arc',at.x+(rnd()-.5)*.16,at.y+(rnd()-.5)*.12,at.z+(rnd()-.5)*.16,size);
    if(i%3===0)emit('spark',at.x,at.y,at.z,size*.75);
  }
 }
 function mark(e,model,dt=0){
  if(!e||!model)return;
  const stage=enemyDamageStage(e.hp,e.maxHp);
  if(stage.stage===0){timers.delete(e.id);powerEyes(model,1);return;}
  const critical=stage.stage>=3;
  // Power failure affects the robot's own optics material, never shared armor.
  powerEyes(model,critical?robotOpticPower(elapsed*.53,e.id)*(.64+stage.damage*.24):1);
  // A hard cap on emission distance and per-robot frequency limits GPU uploads.
  if(camera?.position&&Math.hypot((e.x||0)-camera.position.x,(e.z||0)-camera.position.z)>(low?46:75))return;
  const next=timers.get(e.id)||0;
  if(elapsed<next)return;
  timers.set(e.id,elapsed+stage.interval*(.84+rnd()*.32));
  const flying=e.form==='probe',bulk=['sentinel','brute','bulwark'].includes(e.form);
  const h=flying?.25:bulk?1.75:.95;
  const ox=(rnd()-.5)*(bulk?1.1:.55),oy=h+(rnd()-.5)*.5,oz=(rnd()-.5)*.55;
  for(let i=0;i<stage.smoke;i++)emit('smoke',(e.x||0)+ox+(rnd()-.5)*.25,(e.elevation||0)+oy,(e.z||0)+oz,.24+.07*stage.stage+rnd()*.12);
  for(let i=0;i<stage.sparks;i++)emit('spark',(e.x||0)+ox,(e.elevation||0)+oy,(e.z||0)+oz,.09);
  // Blue-white arcs indicate actuators losing power, interleaved with hot metal.
  if(stage.stage>=2)electricBurst(e,stage.stage===2?1:stage.stage===3?3:5,.095);
 }
 function kill(model,{id=null,form='stalker',x,y,z,groundY=null}={}){
  if(!model)return;
  if(id!==null)timers.delete(id);
  const p=model.position,record={
   model,form,age:0,duration:robotDeathDuration(form),
   x:Number.isFinite(x)?x:p.x,z:Number.isFinite(z)?z:p.z,
   y:Number.isFinite(groundY)?groundY:p.y,
   startY:p.y,initialX:model.rotation.x,initialZ:model.rotation.z,
   dir:(Math.random()>.5?1:-1),nextCue:0,seed:Number.isFinite(id)?id:Math.round(rnd()*100),
  };
  model.position.set(record.x,record.startY,record.z);
  deaths.push(record);
  electricBurst({form,x:record.x,z:record.z,elevation:record.startY,yaw:model.rotation.y||0},low?5:9,.12);
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
     electricBurst(origin,low?Math.max(2,Math.round(cue.count*.58)):cue.count,.12);
   }
   if(d.age<d.duration){
    if(d.age>.15&&rnd()<delta*(low?8:14)){
      emit('smoke',d.x,d.model.position.y+1,d.z,.5);
      electricBurst(origin,low?2:4,.10);
    }
   }else{
    electricBurst(origin,low?8:16,.17);
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
  timers.clear();particles.length=0;smoke.count=sparks.count=arcs.count=0;elapsed=0;
  explosions.dispose();explosions=createGrenadeExplosionV4(T,scene,blastOptions);
 }
 function dispose(){
  for(const d of deaths)scene.remove(d.model);deaths.length=0;timers.clear();particles.length=0;
  explosions.dispose();
  for(const m of [smoke,sparks,arcs])scene.remove(m);
  puffGeo.dispose();sparkGeo.dispose();arcGeo.dispose();puffMat.dispose();sparkMat.dispose();arcMat.dispose();smokeTex.dispose();
 }
 return {mark,kill,update,reset,dispose,stats:()=>({damagedParticles:particles.length,electricArcs:particles.filter(p=>p.kind==='arc').length,falling:deaths.length,explosions:explosions.stats().active})};
}

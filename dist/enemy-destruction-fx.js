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
 const puffGeo=new T.PlaneGeometry(1,1),sparkGeo=new T.TetrahedronGeometry(.04,0);
 const puffMat=new T.MeshBasicMaterial({map:smokeTex,transparent:true,opacity:.58,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const sparkMat=new T.MeshBasicMaterial({color:0xffbd6d,transparent:true,opacity:.94,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const smoke=new T.InstancedMesh(puffGeo,puffMat,budget),sparks=new T.InstancedMesh(sparkGeo,sparkMat,budget);
 for(const mesh of [smoke,sparks]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);}
 smoke.renderOrder=7;sparks.renderOrder=8;
 const particles=[],timers=new Map(),deaths=[];
 const up=new T.Vector3(0,1,0),pos=new T.Vector3(),sc=new T.Vector3(),matrix=new T.Matrix4(),rotation=new T.Quaternion();
 let elapsed=0;
 const blastOptions={camera,maxBlasts:low?2:4,quality:low?'low':'normal'};
 let explosions=createGrenadeExplosionV4(T,scene,blastOptions);
 const rnd=()=>Math.random();
 function emit(kind,x,y,z,size=.2){
  if(particles.length>=budget)return;
  particles.push({kind,x,y,z,xv:(rnd()-.5)*(kind==='spark'?3.8:.36),
    yv:kind==='spark'?1.8+rnd()*3:.45+rnd()*.8,zv:(rnd()-.5)*(kind==='spark'?3.8:.36),
    life:kind==='spark'?.28+rnd()*.37:.85+rnd()*.68,age:0,size});
 }
 function mark(e,model,dt=0){
  if(!e||!model)return;
  const stage=enemyDamageStage(e.hp,e.maxHp);
  if(stage.stage===0){timers.delete(e.id);return;}
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
 }
 function kill(model,{id=null,form='stalker',x,y,z,groundY=null}={}){
  if(!model)return;
  if(id!==null)timers.delete(id);
  const p=model.position,record={
   model,form,age:0,duration:robotDeathDuration(form),
   x:Number.isFinite(x)?x:p.x,z:Number.isFinite(z)?z:p.z,
   y:Number.isFinite(groundY)?groundY:p.y,
   startY:p.y,initialX:model.rotation.x,initialZ:model.rotation.z,
   dir:(Math.random()>.5?1:-1),exploded:false,
  };
  model.position.set(record.x,record.startY,record.z);
  deaths.push(record);
  for(let i=0;i<8&&!low||i<4;i++)emit('spark',record.x,record.startY+1,record.z,.09);
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
   d.model.rotation.x=d.initialX+d.dir*fall*(flying?.9:1.27);
   d.model.rotation.z=d.initialZ+d.dir*fall*(flying?.65:.45);
   d.model.position.y=flying?Math.max(d.y+.12,d.startY-5*t*t):d.y+Math.sin(fall*Math.PI)*.21;
   if(d.age<d.duration){
    if(d.age>.15&&rnd()<delta*(low?9:16)){emit('smoke',d.x,d.model.position.y+1,d.z,.5);emit('spark',d.x,d.model.position.y+.9,d.z,.09);}
   }else{
    const size=d.form==='sentinel'?7.2:['brute','bulwark'].includes(d.form)?5.0:flying?3.0:3.8;
    explosions.spawn({x:d.x,y:d.y+.7,z:d.z,radius:size});
    for(let n=0;n<(low?7:14);n++)emit('spark',d.x,d.y+.7,d.z,.12);
    scene.remove(d.model);deaths.splice(i,1);
   }
  }
  for(let i=particles.length-1;i>=0;i--){
   const p=particles[i];p.age+=delta;if(p.age>=p.life){particles.splice(i,1);continue;}
   p.x+=p.xv*delta;p.y+=p.yv*delta;p.z+=p.zv*delta;
   if(p.kind==='spark')p.yv-=6.6*delta;else p.xv*=.99;
  }
  for(const [type,mesh] of [['smoke',smoke],['spark',sparks]]){
   let k=0;
   for(const p of particles){
    if(p.kind!==type)continue;
    const a=1-p.age/p.life,size=p.size*(type==='smoke'?(1+p.age*1.9)*Math.sqrt(a):Math.max(.1,a));
    pos.set(p.x,p.y,p.z);sc.setScalar(Math.max(.0001,size));
    if(type==='smoke'&&camera)rotation.copy(camera.quaternion);else rotation.identity();
    matrix.compose(pos,rotation,sc);mesh.setMatrixAt(k++,matrix);
   }
   mesh.count=k;if(k)mesh.instanceMatrix.needsUpdate=true;
  }
  explosions.update(delta);
 }
 function reset(){
  for(const d of deaths)scene.remove(d.model);deaths.length=0;
  timers.clear();particles.length=0;smoke.count=sparks.count=0;elapsed=0;
  explosions.dispose();explosions=createGrenadeExplosionV4(T,scene,blastOptions);
 }
 function dispose(){
  for(const d of deaths)scene.remove(d.model);deaths.length=0;timers.clear();particles.length=0;
  explosions.dispose();
  for(const m of [smoke,sparks])scene.remove(m);
  puffGeo.dispose();sparkGeo.dispose();puffMat.dispose();sparkMat.dispose();smokeTex.dispose();
 }
 return {mark,kill,update,reset,dispose,stats:()=>({damagedParticles:particles.length,falling:deaths.length,explosions:explosions.stats().active})};
}

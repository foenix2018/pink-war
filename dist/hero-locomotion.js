import * as T from './vendor/three.webgpu.min.js';
const clamp=T.MathUtils.clamp,smooth=T.MathUtils.smoothstep,up=new T.Vector3(0,1,0),wrap=n=>n-Math.floor(n);
let references;

// Imported poses are used to fit the boots, never to invent new steps.
export function heroGaitReference(data,samples){
 if(references)return references;
 const root=new T.Group(),bones=data.bones.map(d=>{const b=new T.Bone();b.name=d.name;b.position.fromArray(d.p);b.quaternion.fromArray(d.q);return b;});
 bones.forEach((b,i)=>(data.bones[i].parent<0?root:bones[data.bones[i].parent]).add(b));root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton(bones,data.bones.map(d=>new T.Matrix4().fromArray(d.inverse))),meshes=new Map();
 for(const {mesh} of samples)if(!meshes.has(mesh)){const m=new T.SkinnedMesh(mesh.geometry);root.add(m);m.bind(skeleton,new T.Matrix4());meshes.set(mesh,m);}
 const feet=['Left','Right'].map(s=>bones.find(b=>b.name==='mixamorig'+s+'Foot')),point=new T.Vector3();references={};
 for(const c of data.clips){
  bones.forEach((b,i)=>{b.position.fromArray(data.bones[i].p);b.quaternion.fromArray(data.bones[i].q);});
  const clip=c.animation,tracks=clip.tracks.map(t=>{const [name,key]=t.name.split('.');return{bone:bones.find(b=>b.name===name),key,read:t.createInterpolant()};});
  const z=feet.map(()=>({min:Infinity,max:-Infinity,strike:0})),poses=[];let floor=Infinity;
  for(let frame=0;frame<=60;frame++){
   const time=frame/60*clip.duration;for(const t of tracks)t.bone[t.key].fromArray(t.read.evaluate(time));root.updateMatrixWorld(true);skeleton.update();
   for(let i=0;i<2;i++){point.setFromMatrixPosition(feet[i].matrixWorld);if(point.z<z[i].min){z[i].min=point.z;z[i].strike=frame/60;}z[i].max=Math.max(z[i].max,point.z);}
   poses.push(feet.map(f=>({p:f.getWorldPosition(new T.Vector3()),q:f.getWorldQuaternion(new T.Quaternion())})));
   if(c.name==='run')for(const s of samples)floor=Math.min(floor,meshes.get(s.mesh).getVertexPosition(s.index,point).y);
  }
  references[c.name]={centres:z.map(v=>(v.min+v.max)/2),strike:c.mocap?.offset??z[0].strike,floor,poses};
 }
 for(const m of meshes.values())m.material.dispose();skeleton.dispose();return references;
}
export const runGroundReference=(data,samples)=>heroGaitReference(data,samples).run.floor;

// Height-only adaptation preserves the recorded knee plane and bone roll.
function orient(bone,child,target){
 bone.updateWorldMatrix(true,true);const p=bone.getWorldPosition(new T.Vector3()),a=child.getWorldPosition(new T.Vector3()).sub(p),b=target.clone().sub(p);
 if(a.lengthSq()<1e-12||b.lengthSq()<1e-12)return;
 const q=new T.Quaternion().setFromUnitVectors(a.normalize(),b.normalize()).multiply(bone.getWorldQuaternion(new T.Quaternion()));
 bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);
}
function terrainIK(upper,lower,foot,target,pole,fallback){
 const p=upper.getWorldPosition(new T.Vector3()),k=lower.getWorldPosition(new T.Vector3()),f=foot.getWorldPosition(new T.Vector3()),a=p.distanceTo(k),b=k.distanceTo(f),direction=target.clone().sub(p);
 const length=clamp(direction.length(),Math.abs(a-b)+.0001,a+b-.0005);direction.normalize();
 const normal=pole.clone().sub(p);normal.addScaledVector(direction,-normal.dot(direction));
 if(normal.lengthSq()<1e-9){normal.copy(fallback).sub(p);normal.addScaledVector(direction,-normal.dot(direction));}normal.normalize();
 const along=(a*a-b*b+length*length)/(2*length),bend=Math.sqrt(Math.max(0,a*a-along*along));
 orient(upper,lower,p.clone().addScaledVector(direction,along).addScaledVector(normal,bend));orient(lower,foot,p.clone().addScaledVector(direction,length));
}

export function createHeroLocomotion(model){
 const {root,actor,hips,legs,knees,feet}=model,lastPosition=root.position.clone(),direction=new T.Vector3(0,0,-1),local=new T.Vector3(),delta=new T.Vector3();
 const definitions=Object.fromEntries(actor.data.clips.map(c=>[c.name,c]));
 let soles=[],runFloors={},runAnkles={},runSupport=false,ground=null,groundVelocity=0,lastYaw=0,initialized=false,actualSpeed=0,speed=0,turn=0,clock=0,drop=0;
 const state={speed:0,forward:0,lateral:0,turn:0,legYaw:0,backward:false,planted:[false,false],supportWeight:[0,0],airborne:false,verticalSpeed:0,landing:0,travelDirection:direction};
 const gait=state.gait={phase:0,stride:1,frequency:0,distance:0,pelvisDrop:0,contacts:[null,null],source:'Adobe Mixamo'};
 let selection={idle:1},armedWalk=false;
 function setSoles(points){
  soles=points.map(a=>[...new Map(a.map(p=>[p.toArray().map(v=>Math.round(v*1e6)).join(','),p.clone()])).values()]);
  const point=new T.Vector3();runFloors={};
  for(const [name,ref] of Object.entries(actor.gaitReference))if(name.startsWith('run')){let floor=Infinity;runAnkles[name]=[Infinity,Infinity];for(const pose of ref.poses)for(let i=0;i<2;i++){runAnkles[name][i]=Math.min(runAnkles[name][i],pose[i].p.y);for(const p of soles[i])floor=Math.min(floor,point.copy(p).applyQuaternion(pose[i].q).add(pose[i].p).y);}runFloors[name]=floor;}
  ground=null;groundVelocity=0;
 }
 const fallback=feet.map(f=>{const bind=new T.Matrix4().fromArray(actor.data.bones[actor.bones.indexOf(f)].inverse),p=new T.Vector3().setFromMatrixPosition(bind.clone().invert());return [-1,1].flatMap(x=>[-1,1].map(z=>new T.Vector3(p.x+x*.055,.012,p.z+z*.12).applyMatrix4(bind)));});
 setSoles(fallback);
 function sample(moving,dt,flight={},previous){
  delta.copy(root.position).sub(previous||lastPosition);const rise=delta.y;delta.y=0;const teleport=delta.length()>2||Math.abs(rise)>=.4;
  if(flight.velocity)local.set(flight.velocity.x||0,0,flight.velocity.z||0);else if(dt>0&&!teleport)local.copy(delta).multiplyScalar(1/dt);else local.set(0,0,0);
  if(!initialized&&moving&&!flight.velocity)local.set(0,0,-(flight.sprint?4.8:2.2)).applyQuaternion(root.quaternion);
  if(!moving||teleport)local.set(0,0,0);
  actualSpeed=local.length();gait.distance+=actualSpeed*dt;local.applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());
  speed+=(actualSpeed-speed)*(1-Math.exp(-dt*16));if(!moving&&speed<.04)speed=0;
  if(actualSpeed>.025)direction.copy(local).normalize();
  const yaw=Math.atan2(Math.sin(root.rotation.y-lastYaw),Math.cos(root.rotation.y-lastYaw));turn+=((dt>0&&!teleport?clamp(yaw/dt,-5,5):0)-turn)*(1-Math.exp(-dt*10));
  state.landing*=Math.exp(-dt*14);if(state.airborne&&!flight.airborne)state.landing=clamp(-state.verticalSpeed/8,0,1);
  Object.assign(state,{speed,forward:-local.z,lateral:local.x,turn,legYaw:0,backward:local.z>.15,airborne:!!flight.airborne,verticalSpeed:flight.verticalSpeed||0});
  if(flight.airborne){state.planted.fill(false);state.supportWeight.fill(0);}
  lastPosition.copy(root.position);lastYaw=root.rotation.y;initialized=true;return state;
 }
 function advanceGait(hint,dt,flight){
  const moving=actualSpeed>.025&&!flight.airborne,weights={};
  if(moving){
   const family=flight.crouched?'crouch':hint==='run'||actualSpeed>3.1?'run':'walk';
   // The armed take was recorded at about 0.9 m/s. Speeding it up 2.6x at
   // full walking speed looked hurried; use the existing brisk walk instead.
   const naturalArmedSpeed=definitions.walkRifle.mocap.speed*root.getWorldScale(new T.Vector3()).y;
   armedWalk=hint==='walkRifle'&&actualSpeed<naturalArmedSpeed*(armedWalk?1.8:1.6);
   const names=family==='crouch'?['crouchWalk','crouchBack','crouchLeft','crouchRight']:family==='run'?['run','runBack','runLeft','runRight']:[armedWalk?'walkRifle':'walk','walkBack','walkLeft','walkRight'];
   const amounts=[Math.max(0,-direction.z),Math.max(0,direction.z),Math.max(0,-direction.x),Math.max(0,direction.x)],sum=amounts.reduce((a,b)=>a+b,0);
   amounts.forEach((v,i)=>{if(v>1e-5)weights[names[i]]=v/sum;});
  }else weights[flight.crouched&&!flight.airborne?'crouchIdle':flight.aim||flight.firing||hint==='rifle'?'rifle':'idle']=1;
  selection=weights;let stride=0;
  for(const [name,w] of Object.entries(weights))stride+=w*(definitions[name]?.mocap?.stridePerCycle||1);
  const frequency=moving?actualSpeed/(Math.max(.1,stride)*root.getWorldScale(new T.Vector3()).y):0;
  if(moving)clock+=frequency*dt;
  const motion=Object.keys(weights).sort((a,b)=>weights[b]-weights[a])[0];
  Object.assign(gait,{phase:wrap(clock),frequency,stride,motion});
  return {authored:true,weights,clock,phase:gait.phase,frequency,moving,motion};
 }
 function groundTarget(){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),point=new T.Vector3();let floor=Infinity;
  for(let i=0;i<2;i++)for(const p of soles[i])floor=Math.min(floor,point.copy(p).applyMatrix4(feet[i].matrixWorld).applyMatrix4(inverse).y);
  let run=0,weight=0;const ankleMin=[0,0];for(const [name,value] of Object.entries(runFloors)){const w=actor.actions[name].getEffectiveWeight();run+=value*w;weight+=w;for(let i=0;i<2;i++)ankleMin[i]+=runAnkles[name][i]*w;}
  runSupport=weight>.01&&feet.some((f,i)=>point.setFromMatrixPosition(f.matrixWorld).applyMatrix4(inverse).y<=ankleMin[i]/weight+.035);
  return runSupport?floor:floor*(1-weight)+run;
 }
 function groundCorrection(target,dt){
  if(ground===null)ground=target;const omega=26,e=Math.exp(-omega*dt),change=ground-target,temp=(groundVelocity+omega*change)*dt;
  ground=target+(change+temp)*e;groundVelocity=(groundVelocity-omega*temp)*e;return ground;
 }
 function footFloor(i,q){let lowest=Infinity;const point=new T.Vector3();for(const p of soles[i])lowest=Math.min(lowest,point.copy(p).applyQuaternion(q).y);return -lowest+.004;}
 function plant(dt,flight){
  if(flight.airborne)return;
  root.updateMatrixWorld(true);const scale=root.getWorldScale(new T.Vector3()).y,rootY=root.getWorldPosition(new T.Vector3()).y;
  const height=(x,z)=>{const y=flight.ground?.(x,z,rootY);return Number.isFinite(y)?y:rootY;};
  const poses=feet.map((f,i)=>{
   const p=f.getWorldPosition(new T.Vector3()),q=f.getWorldQuaternion(new T.Quaternion());let clearance=Infinity;
   for(const probe of soles[i]){const point=probe.clone().applyQuaternion(q).multiplyScalar(scale).add(p);clearance=Math.min(clearance,point.y-height(point.x,point.z));}
   return {p,q,clearance,pole:knees[i].getWorldPosition(new T.Vector3()),target:p.clone()};
  });
  const minimum=Math.min(...poses.map(p=>p.clearance)),running=Object.keys(selection).some(n=>n.startsWith('run'));
  // On a flat floor, retain EVERY recorded leg rotation. Only fit the whole
  // character vertically to its actual boots. There is no foot-path IK here.
  const heights=poses.map(p=>height(p.p.x,p.p.z)),e=.055*scale;
  const uneven=Math.abs(heights[0]-heights[1])>.003*scale||poses.some(p=>Math.abs(height(p.p.x+e,p.p.z)-height(p.p.x-e,p.p.z))+Math.abs(height(p.p.x,p.p.z+e)-height(p.p.x,p.p.z-e))>.003*scale);
  const idle=actualSpeed<=.025;
  if(!uneven&&!(idle&&poses.some(p=>p.clearance-minimum>.005*scale))){
   const lift=running&&!runSupport?Math.max(0,.003*scale-minimum):.003*scale-minimum;hips.position.y+=lift/scale;drop=-lift/scale;gait.pelvisDrop=drop;root.updateMatrixWorld(true);
   for(let i=0;i<2;i++){const p=poses[i],clear=p.clearance+lift;state.supportWeight[i]=1-smooth(clear/scale,.006,.03);state.planted[i]=clear<.008*scale;gait.contacts[i]={point:feet[i].getWorldPosition(new T.Vector3()),planted:state.planted[i]};}
   return;
  }
  let needed=0;
  for(let i=0;i<2;i++){
   const p=poses[i],surface=height(p.p.x,p.p.z),reachable=surface>=rootY-.5*scale;
   p.weight=reachable?(idle||p.clearance<0?1:running?1-smooth(p.clearance/scale,.01,.055):1-smooth((p.clearance-minimum)/scale,.01,.06)):0;
   const e=.055*scale,dx=height(p.p.x+e,p.p.z)-height(p.p.x-e,p.p.z),dz=height(p.p.x,p.p.z+e)-height(p.p.x,p.p.z-e);
   if(Math.abs(dx)<e&&Math.abs(dz)<e){const tilt=new T.Quaternion().setFromUnitVectors(up,new T.Vector3(-dx/(2*e),1,-dz/(2*e)).normalize());p.q.slerp(tilt.multiply(p.q.clone()),p.weight);}
   let clear=Infinity;for(const probe of soles[i]){const point=probe.clone().applyQuaternion(p.q).multiplyScalar(scale).add(p.p);clear=Math.min(clear,point.y-height(point.x,point.z));}
   const correction=clear<0?clear:clear*p.weight;p.target.y-=correction;p.target.y+=p.weight*.003*scale;
   if(p.weight>.01){
    const hip=legs[i].getWorldPosition(new T.Vector3()),reach=(knees[i].position.length()+feet[i].position.length()-.004)*scale,horizontal=(hip.x-p.target.x)**2+(hip.z-p.target.z)**2;
    needed=Math.max(needed,hip.y-p.target.y-Math.sqrt(Math.max(.001,reach*reach-horizontal)));
   }
  }
  drop=clamp(needed/scale,0,.22);hips.position.y-=drop;gait.pelvisDrop=drop;root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const p=poses[i];p.pole.y-=drop*scale;
   if(p.target.distanceTo(feet[i].getWorldPosition(new T.Vector3()))>.00005)terrainIK(legs[i],knees[i],feet[i],p.target,p.pole,root.localToWorld(new T.Vector3(i===0?-.2:.2,.5,-.6)));
   feet[i].quaternion.copy(feet[i].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(p.q));
   state.planted[i]=p.weight>.95;state.supportWeight[i]=p.weight;gait.contacts[i]={point:p.target.clone(),planted:state.planted[i]};
  }
 }
 return {state,sample,advanceGait,pose(){},plant,groundCorrection,groundTarget,setSoles,footFloor,groundOffset:()=> (ground??0)+drop};
}

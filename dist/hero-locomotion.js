import * as T from './vendor/three.webgpu.min.js';
const clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0),smooth=T.MathUtils.smoothstep;
let references;

// Measure the native cycles once: their heel strikes do not all start at the
// same normalised time. These are samples of the original clips, not new clips.
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
  for(let frame=0;frame<=48;frame++){
   const time=frame/48*clip.duration;for(const t of tracks)t.bone[t.key].fromArray(t.read.evaluate(time));root.updateMatrixWorld(true);skeleton.update();
   for(let i=0;i<2;i++){point.setFromMatrixPosition(feet[i].matrixWorld);if(point.z<z[i].min){z[i].min=point.z;z[i].strike=frame/48;}z[i].max=Math.max(z[i].max,point.z);}
   if(c.name==='run')poses.push(feet.map(f=>({p:new T.Vector3().setFromMatrixPosition(f.matrixWorld),q:f.getWorldQuaternion(new T.Quaternion())})));
   if(c.name==='run')for(const s of samples)floor=Math.min(floor,meshes.get(s.mesh).getVertexPosition(s.index,point).y);
  }
  references[c.name]={centres:z.map(v=>(v.min+v.max)/2),strike:z[0].strike,floor,poses};
 }
 for(const m of meshes.values())m.material.dispose();skeleton.dispose();return references;
}
export const runGroundReference=(data,samples)=>heroGaitReference(data,samples).run.floor;
const softMax=(x,min)=>.5*(x+min+Math.sqrt((x-min)**2+.0001));

export function createHeroLocomotion(model,solveChain){
 const {root,actor,legs,knees,feet}=model,lastPosition=root.position.clone(),virtual=new T.Vector3();
 const native=feet.map(()=>({p:new T.Vector3(),q:new T.Quaternion(),previousZ:0,ready:false}));
 const locks=feet.map(()=>({active:false,point:new T.Vector3(),weight:0,offset:new T.Vector3(),offsetVelocity:new T.Vector3()}));
 let initialized=false,lastYaw=0,speed=0,legYaw=0,turn=0,inPlace=false,ground=null,groundVelocity=0;
 const inverse=new T.Quaternion(),delta=new T.Vector3(),local=new T.Vector3(),direction=new T.Vector3(0,0,-1);
 let soles=feet.map(f=>{const inverseBind=new T.Matrix4().fromArray(actor.data.bones[actor.bones.indexOf(f)].inverse),p=new T.Vector3().setFromMatrixPosition(inverseBind.clone().invert());return [-1,1].flatMap(x=>[-1,1].map(z=>new T.Vector3(p.x+x*.055,.012,p.z+z*.12).applyMatrix4(inverseBind)));});
 const solePoint=new T.Vector3();
 let runFloor=0;
 const calibrate=()=>{runFloor=Infinity;for(const pose of actor.gaitReference.run.poses)for(let i=0;i<2;i++)for(const p of soles[i])runFloor=Math.min(runFloor,solePoint.copy(p).applyQuaternion(pose[i].q).add(pose[i].p).y);};
 const setSoles=points=>{soles=points.map(a=>a.map(p=>p.clone()));ground=null;groundVelocity=0;calibrate();};calibrate();
 const state={speed:0,forward:0,lateral:0,turn:0,legYaw:0,backward:false,planted:[false,false],supportWeight:[0,0],airborne:false,verticalSpeed:0,landing:0,travelDirection:direction};
 function sample(moving,dt,flight={},previous){
  const old=previous||lastPosition;delta.copy(root.position).sub(old);const rise=delta.y;delta.y=0;
  const teleport=delta.length()>2||Math.abs(rise)>=.4;
  if(initialized&&!flight.airborne&&!teleport)for(const l of locks)if(l.active)l.point.y+=rise;
  const velocity=flight.velocity;
  if(velocity)local.set(velocity.x||0,0,velocity.z||0);
  else if(dt>0&&!teleport)local.copy(delta).multiplyScalar(1/dt);
  else local.set(0,0,0);
  if(!initialized&&moving&&!velocity)local.set(0,0,-(flight.sprint?9:3.2)).applyQuaternion(root.quaternion);
  if(!moving||teleport)local.set(0,0,0);
  const nextInPlace=!!flight.inPlace;
  if(nextInPlace!==inPlace){virtual.set(0,0,0);for(const l of locks){l.active=false;l.weight=0;l.offset.set(0,0,0);l.offsetVelocity.set(0,0,0);}inPlace=nextInPlace;}
  if(inPlace)virtual.addScaledVector(local,dt);
  local.applyQuaternion(root.getWorldQuaternion(inverse).invert());
  const measured=local.length();speed+=(measured-speed)*(1-Math.exp(-dt*16));if(!moving&&speed<.04)speed=0;
  if(measured>.12)direction.lerp(local.clone().normalize(),1-Math.exp(-dt*12));
  else if(speed<.4)direction.lerp(new T.Vector3(0,0,-1),1-Math.exp(-dt*8));
  const yaw=Math.atan2(Math.sin(root.rotation.y-lastYaw),Math.cos(root.rotation.y-lastYaw));
  turn+=((dt>0&&!teleport?clamp(yaw/dt,-5,5):0)-turn)*(1-Math.exp(-dt*10));
  // Small pelvic accommodation only; a sidestep is not a 60-degree hip twist.
  legYaw+=(clamp(direction.x*.14,-.14,.14)-legYaw)*(1-Math.exp(-dt*10));
  state.landing*=Math.exp(-dt*14);if(state.airborne&&!flight.airborne)state.landing=clamp(-state.verticalSpeed/8,0,1);
  Object.assign(state,{speed,forward:-local.z,lateral:local.x,turn,legYaw,backward:local.z>.15,airborne:!!flight.airborne,verticalSpeed:flight.verticalSpeed||0});
  if(teleport||flight.airborne)for(const l of locks){l.active=false;l.weight=0;l.offset.set(0,0,0);l.offsetVelocity.set(0,0,0);}
  lastPosition.copy(root.position);lastYaw=root.rotation.y;initialized=true;return state;
 }
 function groundCorrection(target,dt){
  if(ground===null)ground=target;
  const omega=26,e=Math.exp(-omega*dt),change=ground-target,temp=(groundVelocity+omega*change)*dt;
  ground=target+(change+temp)*e;groundVelocity=(groundVelocity-omega*temp)*e;return ground;
 }
 function groundTarget(runWeight){
  root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert();let floor=Infinity;
  for(let i=0;i<2;i++)for(const p of soles[i])floor=Math.min(floor,solePoint.copy(p).applyMatrix4(feet[i].matrixWorld).applyMatrix4(inverseRoot).y);
  return floor+(Math.min(floor,runFloor+.008)-floor)*runWeight;
 }
 function footFloor(i,q){
  let lowest=Infinity;for(const p of soles[i])lowest=Math.min(lowest,solePoint.copy(p).applyQuaternion(q).y);
  return -lowest+.004;
 }
 function pose(dt,flight){
  root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){native[i].p.copy(root.worldToLocal(feet[i].getWorldPosition(new T.Vector3())));native[i].q.copy(feet[i].getWorldQuaternion(new T.Quaternion()));}
  model.hips.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(up,legYaw));root.updateMatrixWorld(true);
  const axis=up.clone().applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(model.spine.parent.getWorldQuaternion(new T.Quaternion()).invert());
  model.spine.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,-legYaw));
  model.body.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(flight.airborne?0:clamp(speed/10,0,1)*.045,0,clamp(-turn*.009-state.lateral*.004,-.05,.05))));
 }
 function plant(dt,flight){
  if(flight.airborne){state.planted.fill(false);state.supportWeight.fill(0);return;}
  root.updateMatrixWorld(true);const scale=root.getWorldScale(new T.Vector3()).y,rootQ=root.getWorldQuaternion(new T.Quaternion());
  const centre=actor.gaitReference?.[actor.motion]?.centres||[.03,.03];
  const warp=smooth(speed,.05,.5),sideAmount=Math.abs(direction.x),backAmount=smooth(direction.z,-.2,.4);
  for(let i=0;i<2;i++){
   const f=feet[i],n=native[i],l=locks[i],sign=i===0?-1:1,target=n.p.clone();
   const footYaw=direction.x*.10*(1-backAmount*.4),q=new T.Quaternion().setFromAxisAngle(up.clone().applyQuaternion(rootQ),footYaw).multiply(n.q);
   const floor=footFloor(i,q);
   const swing=n.ready&&dt>0?(n.p.z-n.previousZ)/dt:0;n.previousZ=n.p.z;n.ready=true;
   const stride=1-.30*sideAmount-.30*backAmount,excursion=-(n.p.z-centre[i])*stride;
   target.x+=excursion*direction.x*warp;target.z=T.MathUtils.lerp(n.p.z,centre[i]+excursion*direction.z,warp);
   // The trailing foot closes the stance, rather than crossing the other shin.
   const clearance=T.MathUtils.lerp(.065,.095,sideAmount);
   target.x=sign*softMax(sign*target.x,clearance);
   target.y=Math.max(floor,target.y);
   let world=root.localToWorld(target.clone()),contact=smooth(swing,.04,.25)*(1-smooth(target.y-floor,.012,.060))*smooth(speed,.08,.5);
   if(contact>.7&&!l.active){l.point.copy(world).add(virtual);l.active=true;}
   if(contact<.1)l.active=false;
   if(!l.active)contact=0;
   l.weight+=(contact-l.weight)*(1-Math.exp(-dt*(contact>l.weight?32:14)));
   const anchor=l.point.clone().sub(virtual),hip=legs[i].getWorldPosition(new T.Vector3()),reach=(knees[i].position.length()+feet[i].position.length())*scale-.006*scale;
   const anchorLocal=root.worldToLocal(anchor.clone());
   const reachWeight=1-smooth(anchor.distanceTo(hip),reach-.015*scale,reach+.035*scale);
   const distanceWeight=1-smooth(anchor.distanceTo(world),.10*scale,.24*scale);
   const stanceWeight=smooth(sign*anchorLocal.x,clearance,clearance+.045);
   const weight=l.weight*reachWeight*distanceWeight*stanceWeight;
   const uncorrected=target.clone();world.lerp(anchor,weight);target.copy(root.worldToLocal(world.clone()));
   const correction=target.clone().sub(uncorrected),omega=32,e=Math.exp(-omega*dt);
   // Release the contact as a damped correction. Returning straight to the
   // native ankle position used to create a visible 18 cm single-frame jump.
   for(const axis of ['x','y','z']){const change=l.offset[axis]-correction[axis],temp=(l.offsetVelocity[axis]+omega*change)*dt;l.offset[axis]=correction[axis]+(change+temp)*e;l.offsetVelocity[axis]=(l.offsetVelocity[axis]-omega*temp)*e;}
   target.copy(uncorrected).add(l.offset);target.x=sign*softMax(sign*target.x,clearance);target.y=Math.max(floor,target.y);world=root.localToWorld(target.clone());
   const fromHip=world.clone().sub(hip);if(fromHip.length()>reach)world.copy(hip).addScaledVector(fromHip.normalize(),reach);
   const pole=root.localToWorld(new T.Vector3(sign*.23+direction.x*.035,.52,-.65));
   solveChain(legs[i],knees[i],f,world,pole);
   f.quaternion.copy(f.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
   state.supportWeight[i]=weight;state.planted[i]=weight>.20;
  }
 }
 return {state,sample,pose,plant,groundCorrection,groundTarget,setSoles,footFloor,groundOffset:()=>ground??0};
}

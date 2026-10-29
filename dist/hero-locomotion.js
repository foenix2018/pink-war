import * as T from './vendor/three.webgpu.min.js';
import {createHeroFootsteps} from './hero-footsteps.js';
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
export function createHeroLocomotion(model,solveChain){
 const {root,actor,feet}=model,lastPosition=root.position.clone();
 let initialized=false,lastYaw=0,speed=0,legYaw=0,turn=0,ground=null,groundVelocity=0;
 const inverse=new T.Quaternion(),delta=new T.Vector3(),local=new T.Vector3(),direction=new T.Vector3(0,0,-1);
 let soles=feet.map(f=>{const inverseBind=new T.Matrix4().fromArray(actor.data.bones[actor.bones.indexOf(f)].inverse),p=new T.Vector3().setFromMatrixPosition(inverseBind.clone().invert());return [-1,1].flatMap(x=>[-1,1].map(z=>new T.Vector3(p.x+x*.055,.012,p.z+z*.12).applyMatrix4(inverseBind)));});
 const solePoint=new T.Vector3();
 let runFloor=0;
 const calibrate=()=>{runFloor=Infinity;for(const pose of actor.gaitReference.run.poses)for(let i=0;i<2;i++)for(const p of soles[i])runFloor=Math.min(runFloor,solePoint.copy(p).applyQuaternion(pose[i].q).add(pose[i].p).y);};
 const setSoles=points=>{soles=points.map(a=>a.map(p=>p.clone()));ground=null;groundVelocity=0;calibrate();steps.setSoles(soles);};calibrate();
 const state={speed:0,forward:0,lateral:0,turn:0,legYaw:0,backward:false,planted:[false,false],supportWeight:[0,0],airborne:false,verticalSpeed:0,landing:0,travelDirection:direction};
 const steps=createHeroFootsteps({...model,state},solveChain);steps.setSoles(soles);state.gait=steps.state;
 function sample(moving,dt,flight={},previous){
  const old=previous||lastPosition;delta.copy(root.position).sub(old);const rise=delta.y;delta.y=0;
  const teleport=delta.length()>2||Math.abs(rise)>=.4;
  const velocity=flight.velocity;
  if(velocity)local.set(velocity.x||0,0,velocity.z||0);
  else if(dt>0&&!teleport)local.copy(delta).multiplyScalar(1/dt);
  else local.set(0,0,0);
  if(!initialized&&moving&&!velocity)local.set(0,0,-(flight.sprint?9:3.2)).applyQuaternion(root.quaternion);
  if(!moving||teleport)local.set(0,0,0);
  steps.frame(dt,flight,local,teleport);
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
  if(flight.airborne){state.planted.fill(false);state.supportWeight.fill(0);}
  lastPosition.copy(root.position);lastYaw=root.rotation.y;initialized=true;return state;
 }
 function groundCorrection(target,dt){
  if(ground===null)ground=target;
  const omega=26,e=Math.exp(-omega*dt),change=ground-target,temp=(groundVelocity+omega*change)*dt;
  ground=target+(change+temp)*e;groundVelocity=(groundVelocity-omega*temp)*e;return ground;
 }
 function groundTarget(){
  root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert();let floor=Infinity;
  for(let i=0;i<2;i++)for(const p of soles[i])floor=Math.min(floor,solePoint.copy(p).applyMatrix4(feet[i].matrixWorld).applyMatrix4(inverseRoot).y);
  // The distance-driven feet own suspension and contact. Keeping the old
  // running clip's extra floor offset made the pelvis fight the planted leg.
  return floor;
 }
 function footFloor(i,q){
  let lowest=Infinity;for(const p of soles[i])lowest=Math.min(lowest,solePoint.copy(p).applyQuaternion(q).y);
  return -lowest+.004;
 }
 function pose(dt,flight){
  root.updateMatrixWorld(true);
  steps.captureNative();
  model.hips.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(up,legYaw));root.updateMatrixWorld(true);
  const axis=up.clone().applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(model.spine.parent.getWorldQuaternion(new T.Quaternion()).invert());
  model.spine.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,-legYaw));
  model.body.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(flight.airborne?0:clamp(speed/10,0,1)*.045,0,clamp(-turn*.009-state.lateral*.004,-.05,.05))));
 }
 return {state,sample,pose,plant:steps.plant,advanceGait:steps.advance,groundCorrection,groundTarget,setSoles,footFloor,groundOffset:()=> (ground??0)+steps.state.pelvisDrop};
}

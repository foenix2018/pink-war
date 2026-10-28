import * as T from './vendor/three.webgpu.min.js';
const clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0);
let runFloor;

// Sample the original run, once, to keep its real suspension phase. Grounding
// both boots on every frame used to erase the vertical motion of the native clip.
export function runGroundReference(data,samples){
 if(runFloor!==undefined)return runFloor;
 const root=new T.Group(),bones=data.bones.map(d=>{const b=new T.Bone();b.name=d.name;b.position.fromArray(d.p);b.quaternion.fromArray(d.q);return b;});
 bones.forEach((b,i)=>(data.bones[i].parent<0?root:bones[data.bones[i].parent]).add(b));root.updateMatrixWorld(true);
 const skeleton=new T.Skeleton(bones,data.bones.map(d=>new T.Matrix4().fromArray(d.inverse))),meshes=new Map();
 for(const {mesh} of samples)if(!meshes.has(mesh)){const m=new T.SkinnedMesh(mesh.geometry);root.add(m);m.bind(skeleton,new T.Matrix4());meshes.set(mesh,m);}
 const clip=data.clips.find(c=>c.name==='run').animation;
 const tracks=clip.tracks.map(t=>{const [name,key]=t.name.split('.');return{bone:bones.find(b=>b.name===name),key,read:t.createInterpolant()};});
 runFloor=Infinity;const point=new T.Vector3();
 for(let frame=0;frame<=48;frame++){
  const time=frame/48*clip.duration;for(const t of tracks)t.bone[t.key].fromArray(t.read.evaluate(time));root.updateMatrixWorld(true);skeleton.update();
  for(const s of samples)runFloor=Math.min(runFloor,meshes.get(s.mesh).getVertexPosition(s.index,point).y);
 }
 for(const m of meshes.values())m.material.dispose();skeleton.dispose();return runFloor;
}

export function createHeroLocomotion(model,solveChain){
 const {root,actor,legs,knees,feet}=model,lastPosition=root.position.clone(),lastNative=feet.map(()=>new T.Vector3()),locks=feet.map(()=>({active:false,point:new T.Vector3()}));
 let initialized=false,lastYaw=0,speed=0,legYaw=0,turn=0;
 const inverse=new T.Quaternion(),delta=new T.Vector3(),local=new T.Vector3();
 const state={speed:0,forward:0,lateral:0,turn:0,legYaw:0,backward:false,planted:[false,false],airborne:false,verticalSpeed:0,landing:0};
 function sample(moving,dt,flight={},previous){
  const old=previous||lastPosition;delta.copy(root.position).sub(old);const rise=delta.y;delta.y=0;
  if(initialized&&!flight.airborne&&Math.abs(rise)<.4){for(const l of locks)if(l.active)l.point.y+=rise;}
  else if(Math.abs(rise)>=.4){for(const l of locks)l.active=false;}
  const teleport=delta.length()>2;const velocity=flight.velocity;
  if(velocity)local.set(velocity.x||0,0,velocity.z||0);
  else if(dt>0&&!teleport)local.copy(delta).multiplyScalar(1/dt);
  else local.set(0,0,0);
  if(!initialized&&moving&&!velocity)local.set(0,0,-(flight.sprint?9:3.2)).applyQuaternion(root.quaternion);
  if(!moving||teleport)local.set(0,0,0);
  local.applyQuaternion(root.getWorldQuaternion(inverse).invert());
  const measured=local.length();speed+=(measured-speed)*(1-Math.exp(-dt*16));if(!moving&&speed<.04)speed=0;
  const yaw=Math.atan2(Math.sin(root.rotation.y-lastYaw),Math.cos(root.rotation.y-lastYaw));
  turn+=((dt>0&&!teleport?clamp(yaw/dt,-5,5):0)-turn)*(1-Math.exp(-dt*10));
  const backward=local.z>.15;let direction=measured>.15?Math.atan2(local.x,-local.z):0;
  if(backward)direction=Math.atan2(-local.x,local.z);
  const target=clamp(direction,-1.05,1.05);
  legYaw+=(target-legYaw)*(1-Math.exp(-dt*9));
  state.landing*=Math.exp(-dt*14);
  if(state.airborne&&!flight.airborne)state.landing=clamp(-state.verticalSpeed/8,0,1);
  state.airborne=!!flight.airborne;state.verticalSpeed=flight.verticalSpeed||0;
  Object.assign(state,{speed,forward:-local.z,lateral:local.x,turn,legYaw,backward});
  if(teleport||flight.airborne)for(const l of locks)l.active=false;
  lastPosition.copy(root.position);lastYaw=root.rotation.y;initialized=true;return state;
 }
 function pose(dt,flight){
  model.hips.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(up,legYaw));
  root.updateMatrixWorld(true);
  // Counter-rotate the upper body: the feet may sidestep while the helmet and
  // weapon continue to address the player's target.
  const axis=up.clone().applyQuaternion(root.getWorldQuaternion(new T.Quaternion())).applyQuaternion(model.spine.parent.getWorldQuaternion(new T.Quaternion()).invert());
  model.spine.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(axis,-legYaw));
  const lean=flight.airborne?0:clamp(speed/10,0,1)*.065;
  model.body.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(lean,0,clamp(-turn*.012-state.lateral*.006,-.07,.07))));
 }
 function plant(dt,flight){
  root.updateMatrixWorld(true);const scale=root.getWorldScale(new T.Vector3()).y;
  for(let i=0;i<2;i++){
   const f=feet[i],l=locks[i],p=f.getWorldPosition(new T.Vector3()),native=root.worldToLocal(p.clone());
   const swing=dt>0?(native.z-lastNative[i].z)/dt:0;lastNative[i].copy(native);
   const low=p.y-(root.position.y+.13*scale)<.045*scale;
   const contact=!flight.airborne&&speed>.1&&low&&swing*(state.backward?-1:1)>.02;
   if(!contact)l.active=false;
   if(contact&&!l.active){l.active=true;l.point.copy(p);}
   if(l.active){
    const hip=legs[i].getWorldPosition(new T.Vector3()),reach=(knees[i].position.length()+feet[i].position.length())*scale-.003*scale;
    if(l.point.distanceTo(hip)>reach||l.point.distanceTo(p)>.20*scale)l.active=false;
    else{
     const orientation=f.getWorldQuaternion(new T.Quaternion());
     solveChain(legs[i],knees[i],f,l.point,root.localToWorld(new T.Vector3(i===0?-.18:.18,.55,-.5)));
     f.quaternion.copy(f.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
    }
   }
   state.planted[i]=l.active;
  }
 }
 return {state,sample,pose,plant};
}

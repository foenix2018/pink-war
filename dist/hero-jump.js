import * as T from './vendor/three.webgpu.min.js';

const smooth=T.MathUtils.smoothstep,clamp=T.MathUtils.clamp;

// A flight layer on the original RLH bones. Physics owns the root trajectory;
// this layer only poses the body, with the same leg IK and boot contact frame.
export function createHeroJump(model,solveChain,footFloor){
 const {root,hips,spine,body,legs,knees,feet,freeArm}=model;
 const neutral=feet.map(f=>root.getWorldQuaternion(new T.Quaternion()).invert().multiply(f.getWorldQuaternion(new T.Quaternion())));
 const start=feet.map(()=>({p:new T.Vector3(),q:new T.Quaternion()})),pelvis={p:new T.Vector3(),q:new T.Quaternion()},restPelvis=new T.Vector3();
 let wasAirborne=false,lastVertical=0,age=0,landAge=Infinity,launched=false,lead=0,impact=0,entryWeight=0;
 const state={phase:'grounded',airTime:0,landingTime:0,tuck:0,compression:0,weight:0,launches:0};
 function capture(){
  root.updateMatrixWorld(true);const inverse=root.getWorldQuaternion(new T.Quaternion()).invert();
  for(let i=0;i<2;i++){start[i].p.copy(root.worldToLocal(feet[i].getWorldPosition(new T.Vector3())));start[i].q.copy(inverse).multiply(feet[i].getWorldQuaternion(new T.Quaternion()));}
  pelvis.p.copy(hips.position);pelvis.q.copy(hips.quaternion);
 }
 function sample(dt,flight){
  const airborne=!!flight.airborne,vy=Number.isFinite(flight.verticalSpeed)?flight.verticalSpeed:0;
  // A second impulse (double jump / wall rebound) starts from the current
  // airborne pose instead of snapping the legs back to the standing pose.
  if(airborne&&(!wasAirborne||vy-lastVertical>2.5)){
   capture();if(!wasAirborne)restPelvis.copy(pelvis.p);entryWeight=wasAirborne?state.weight:0;
   age=0;landAge=Infinity;launched=vy>1;state.launches++;
   lead=Math.abs(start[0].p.z-start[1].p.z)>.025?Number(start[1].p.z<start[0].p.z):(state.launches-1)%2;
  }
  if(!airborne&&wasAirborne){capture();landAge=0;impact=clamp(-lastVertical/8,.15,1);}
  if(airborne){
   age+=dt;state.phase=vy>1?'takeoff':vy<-.8?'descent':'apex';
   const fold=launched?smooth(age,.07,.25):0,prepare=smooth(-vy,.6,5.2);
   state.tuck=fold*(1-prepare);state.weight=T.MathUtils.lerp(entryWeight,1,smooth(age,0,.12));state.compression=0;
  }else{
   landAge+=dt;state.phase=landAge<.48?'landing':'grounded';
   // Compression builds after contact, then releases over a longer interval.
   state.compression=impact*smooth(landAge,0,.085)*(1-smooth(landAge,.095,.40));
   state.weight=1-smooth(landAge,0,.20);state.tuck=0;
  }
  state.airTime=airborne?age:0;state.landingTime=Number.isFinite(landAge)?landAge:0;
  wasAirborne=airborne;lastVertical=vy;return state;
 }
 function rotate(bone,x=0,z=0){
  const world=root.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
  const rotation=world.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(x,0,z))).multiply(world.invert());
  bone.quaternion.premultiply(parent.clone().multiply(rotation).multiply(parent.invert()));bone.updateWorldMatrix(false,true);
 }
 function pose(flight,locomotion,freeLeft=false){
  if(state.phase==='grounded')return;
  root.updateMatrixWorld(true);const airborne=!!flight.airborne,rootQ=root.getWorldQuaternion(new T.Quaternion());
  const targets=feet.map(f=>({p:root.worldToLocal(f.getWorldPosition(new T.Vector3())),q:rootQ.clone().invert().multiply(f.getWorldQuaternion(new T.Quaternion()))}));
  if(airborne){
   const tuck=state.tuck,push=launched?(1-smooth(age,.065,.17)):0,prepare=smooth(-lastVertical,.6,5.2),travel=locomotion.travelDirection;
   const running=clamp(locomotion.speed/7,0,1),settle=smooth(age,0,.18);
   hips.position.lerp(pelvis.p.clone().lerp(restPelvis.clone().add(new T.Vector3(0,.018*push-.025*tuck,0)),settle),state.weight);
   hips.quaternion.slerp(pelvis.q,state.weight);
   for(let i=0;i<2;i++){
    const leading=i===lead,sign=i===0?-1:1;
    // One knee leads, the other follows. Forward, lateral and backward jumps
    // share anatomical forward knee poles without cycling a walk in mid-air.
    const follow=leading?1:smooth(age,.09,.30),float=Math.sin(age*5)*tuck;
    const p=new T.Vector3(sign*(.135+.022*tuck),.145+tuck*(leading?.27:.18)*follow+.012*float,.025);
    p.x+=travel.x*tuck*(leading?.07:-.035)*running;
    p.z+=tuck*(leading?-.12:.085)*follow+travel.z*tuck*(leading?.065:-.035)*running+.018*float;
    p.z+=push*(leading?-.015:.035);p.x=sign*Math.max(.085,sign*p.x);
    const pitch=(-.19*push-tuck*(leading?.08:.20))*(1-prepare);
    const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch).multiply(neutral[i]);
    p.lerpVectors(start[i].p,p,settle);q.slerpQuaternions(start[i].q,q,settle);
    targets[i].p.lerp(p,state.weight);targets[i].q.slerp(q,state.weight);
   }
   rotate(spine,(-.045*push-.13*tuck-.04*prepare+.02*Math.sin(age*5)*tuck)*state.weight,-travel.x*.025*state.weight);
   rotate(body,.025*tuck*state.weight);
  }else{
   hips.position.lerp(pelvis.p,state.weight);hips.quaternion.slerp(pelvis.q,state.weight);
   hips.position.y-=.14*state.compression;
   for(let i=0;i<2;i++){targets[i].p.lerp(start[i].p,state.weight);targets[i].q.slerp(start[i].q,state.weight);}
   rotate(spine,-.14*state.compression);rotate(body,.035*state.compression);
  }
  if(freeLeft&&freeArm)rotate(freeArm,-.20*state.tuck+.10*state.compression,-.14*state.weight-.05*state.compression);
  root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const t=targets[i],q=rootQ.clone().multiply(t.q),sign=i===0?-1:1;
   t.p.x=sign*Math.max(.075,sign*t.p.x);t.p.y=Math.max(t.p.y,footFloor(i,q));
   const target=root.localToWorld(t.p.clone()),pole=root.localToWorld(new T.Vector3(sign*.24,.55,-.68));
   solveChain(legs[i],knees[i],feet[i],target,pole);
   feet[i].quaternion.copy(feet[i].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
  }
 }
 return {state,sample,pose};
}

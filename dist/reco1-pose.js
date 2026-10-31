// Generated from the approved V10 RLH driver. See assets/reco1/README.md for changes.
import * as T from './vendor/three.webgpu.min.js';
import {RECO1,RECO1_WEAPON} from './reco1-profile.js';
export function createReco1Pose(asset,states,rig={}){
 const data=asset.motion,pose={},actor=new T.Group(),poseRoot=new T.Group(),root=poseRoot;actor.scale.setScalar(2.78);actor.position.y=-.64;
 const bones=new Map();for(const d of data.bones){const b=new T.Bone();b.name=d.name;b.position.fromArray(d.position);b.quaternion.fromArray(d.quaternion);b.scale.fromArray(d.scale);bones.set(d.name,b);}
 for(const d of data.bones)(bones.get(d.parent)||actor).add(bones.get(d.name));actor.updateMatrixWorld(true);
 const bone=n=>bones.get('mixamorig'+n),pos=b=>b.getWorldPosition(new T.Vector3()),quat=b=>b.getWorldQuaternion(new T.Quaternion()),skeleton=new T.Skeleton([...bones.values()]);
 const poseBones=asset.bindings.map((d,i)=>{const b=new T.Bone();b.name='reco1-plate-'+i;new T.Matrix4().fromArray(d.bindMatrix).decompose(b.position,b.quaternion,b.scale);poseRoot.add(b);return b;});
 const bindings=asset.bindings.filter(d=>d.native).map((d,i)=>({o:poseBones[i],b:bones.get(d.native),offset:new T.Vector3().fromArray(d.offset),orientation:new T.Quaternion().fromArray(d.orientation),scale:new T.Vector3().fromArray(d.scale),followShoulder:bones.get(d.followShoulder)}));
 const torsoBind=bindings[asset.roles.torso],headBind=bindings[asset.roles.head],footBindings=asset.roles.feet.map(i=>bindings[i]),armBindings=asset.roles.hands.map(i=>bindings[i]),upper=torsoBind.o,head=headBind.o,gun=poseBones[asset.roles.gun];
 const supportGripQ=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,Math.PI/2,'YXZ')),triggerGripQ=new T.Quaternion().setFromEuler(new T.Euler(-.24,0,0));
 const soleCorners=asset.soleCorners.map(a=>a.map(p=>new T.Vector3().fromArray(p)));
 function drive(v){v.o.position.copy(v.offset).applyQuaternion(quat(v.b)).add(pos(v.b));v.o.quaternion.copy(quat(v.b)).multiply(v.orientation);v.o.scale.copy(v.scale);v.o.updateMatrixWorld(true);}
 function soleY(){let y=Infinity;footBindings.forEach((f,i)=>{const q=quat(f.b).multiply(f.orientation),p=pos(f.b);for(const c of soleCorners[i])y=Math.min(y,c.clone().applyQuaternion(q).add(p).y);});return y;}
 const mixer=new T.AnimationMixer(actor),actions={},weights={},biases=Object.fromEntries(Object.entries(asset.groundBias).map(([k,v])=>[k,v+.04])),ground=0;
 for(const [name,clip] of Object.entries(asset.clips)){const a=mixer.clipAction(clip);a.setLoop(T.LoopRepeat,Infinity).setEffectiveWeight(name==='idle'?1:0).play();actions[name]=a;weights[name]=name==='idle'?1:0;}
 let aimBlend=0,crouchBlend=0,lastClip='idle',aimError=0,gripError=0,aimReady=false;const aimTarget=new T.Vector3(0,1.5,40),helper={updateMatrixWorld(){}},lastNative={};
 const mixedPose=[...bones.values()].map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));
 function setAimTarget(p){aimTarget.copy(p);}
 function bore(){gun.updateWorldMatrix(true,true);const origin=gun.localToWorld(new T.Vector3(0,.009,.632)),end=gun.localToWorld(new T.Vector3(0,.009,.732));return {origin,direction:end.sub(origin).normalize(),target:aimTarget.clone()};}
 // Direct port of RLH's aimBone / twoBoneIK705, in world space and with bounded reach.
 function aimBone(b,child,target){
  actor.updateMatrixWorld(true);const A=pos(b),from=pos(child).sub(A),to=target.clone().sub(A);if(from.lengthSq()<1e-9||to.lengthSq()<1e-9)return;
  const delta=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=delta.multiply(quat(b));
  b.quaternion.copy(quat(b.parent).invert().multiply(world));actor.updateMatrixWorld(true);
 }
 function ik(a,b,end,target,pole,maxReach=.975){
  actor.updateMatrixWorld(true);const A=pos(a),B=pos(b),E=pos(end),l1=A.distanceTo(B),l2=B.distanceTo(E),dir=target.clone().sub(A),raw=dir.length();if(raw<1e-5)return;
  dir.normalize();const d=T.MathUtils.clamp(raw,Math.abs(l1-l2)+.004,(l1+l2)*maxReach),p=pole.clone().sub(A);p.addScaledVector(dir,-p.dot(dir));if(p.lengthSq()<1e-8)p.set(0,-1,.2);p.normalize();
  const x=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-x*x)),K=A.clone().addScaledVector(dir,x).addScaledVector(p,h),endTarget=A.clone().addScaledVector(dir,d);
  aimBone(a,b,K);aimBone(b,end,endTarget);
 }
 function setHandRotation(binding,q){const desired=q.clone().multiply(binding.orientation.clone().invert());binding.b.quaternion.copy(quat(binding.b.parent).invert().multiply(desired));}
 function refreshVisual(){for(const v of bindings){drive(v);if(v.followShoulder)v.o.position.copy(pos(v.followShoulder));}root.updateMatrixWorld(true);}
 function update(dt,t,recoil){
  const moving=states.motion==='walk'||states.motion==='run';
  const wanted=states.motion==='run'?'run':states.motion==='walk'?(gun.visible?'walkRifle':'walk'):(states.aim&&gun.visible?'rifle':'idle');lastClip=wanted;
  const blend=1-Math.exp(-dt/.18);let total=0;
  for(const [name,a] of Object.entries(actions)){weights[name]=T.MathUtils.lerp(weights[name],name===wanted?1:0,blend);total+=weights[name];}
  for(const [name,a] of Object.entries(actions))a.setEffectiveWeight(weights[name]/Math.max(total,.001));
  for(const name of ['walk','walkRifle'])actions[name].setEffectiveTimeScale(T.MathUtils.clamp((pose.speed||1.55)/1.55,.1,2.4));
  actions.run.setEffectiveTimeScale(T.MathUtils.clamp((pose.speed||5)/5,.1,2));
  for(const v of mixedPose){v.b.position.copy(v.p);v.b.quaternion.copy(v.q);}// Restore the native layer even when mixer time is frozen.
  mixer.update(dt);
  for(const v of mixedPose){v.p.copy(v.b.position);v.q.copy(v.b.quaternion); }
  // Optional mech proportions retarget bone translations after the native clip.
  // The saved animation layer above stays unmodified, so widening never accumulates.
  if(rig.proportions)for(const [name,factor] of Object.entries(rig.proportions))bone(name).position.multiplyScalar(factor);
  if(pose.hitPulse)bone('Spine2').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.045*pose.hitPulse,0,0)));

  for(const side of ['Left','Right'])for(const n of ['UpLeg','Leg','Foot'])lastNative[side+n]=bone(side+n).quaternion.toArray();
  actor.position.y=-.64+Object.entries(weights).reduce((s,[n,w])=>s+biases[n]*w/Math.max(total,.001),0);
  actor.updateMatrixWorld(true);
  crouchBlend=pose.coverCrouch||0;aimBlend=states.aim?1:0;
  if(crouchBlend>.0001){
   const feetQ=['Right','Left'].map(s=>quat(bone(s+'Foot'))),targets=['Right','Left'].map(s=>pos(bone(s+'Foot'))),hips=bone('Hips');hips.position.y-=(RECO1.coverDrop/2.78)*crouchBlend;
   bone('Spine').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.22*crouchBlend,0,0)));bone('Spine1').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(.12*crouchBlend,0,0)));bone('Neck').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.20*crouchBlend,0,0)));actor.updateMatrixWorld(true);
   ['Right','Left'].forEach((s,i)=>{const pole=pos(bone(s+'UpLeg')).add(new T.Vector3(i===0?-.10:.10,-.02,.34));ik(bone(s+'UpLeg'),bone(s+'Leg'),bone(s+'Foot'),targets[i],pole);const foot=bone(s+'Foot');foot.quaternion.copy(quat(foot.parent).invert().multiply(feetQ[i]));actor.updateMatrixWorld(true);});
  }
  if(rig.retargetLegs){rig.retargetLegs({actor,bones,pose,states,ik});actor.updateMatrixWorld(true);}
  if(states.motion!=='run'){actor.position.y+=ground-(rig.soleY?rig.soleY():soleY());actor.updateMatrixWorld(true);}
  if(states.mode==='search')bone('Head').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.sin(t*.65)*.22,0)));
  actor.updateMatrixWorld(true);drive(torsoBind);drive(headBind);
  // This is the simulation's authoritative carbine frame, not an independent visual aim.
  // The pose is already in source +Z coordinates; the model wrapper turns it into game -Z.
  if(states.aim){
   const p=RECO1_WEAPON.pivot;gun.position.set(-p.x,p.y-RECO1.coverDrop*crouchBlend,-p.z);
   gun.quaternion.setFromEuler(new T.Euler(-(pose.aimPitch||0),pose.aimYaw||0,0,'YXZ'));
  }else{
   gun.position.copy(upper.localToWorld(new T.Vector3(-.028,.245,.24)));
   gun.quaternion.setFromEuler(new T.Euler(.35,1.06,.04,'YXZ')).premultiply(upper.getWorldQuaternion(new T.Quaternion()));
  }
  gun.updateWorldMatrix(true,true);
  if(gun.visible){
   const targets=[new T.Vector3(.016,-.049,-.078),new T.Vector3(-.040,-.040,.160)].map(p=>gun.localToWorld(p));
   ['Right','Left'].forEach((s,i)=>{
    const sh=pos(bone(s+'Arm')),pole=sh.clone().add(new T.Vector3(i===0?-.23:.23,-.19,.10));
    ik(bone(s+'Arm'),bone(s+'ForeArm'),bone(s+'Hand'),targets[i],pole,.985);
    const gq=gun.getWorldQuaternion(new T.Quaternion()).multiply(i===0?triggerGripQ:supportGripQ);setHandRotation(armBindings[i],gq);
   });
  }
  if(rig.afterPose){rig.afterPose({actor,bones,pose,states});actor.updateMatrixWorld(true);}
  actor.updateMatrixWorld(true);refreshVisual();helper.updateMatrixWorld(true);
  const B=bore();aimError=B.direction.angleTo(B.target.clone().sub(B.origin).normalize());
  gripError=0;if(gun.visible){const grips=[new T.Vector3(.016,-.049,-.078),new T.Vector3(-.040,-.040,.160)];['Right','Left'].forEach((s,i)=>{gripError=Math.max(gripError,pos(bone(s+'Hand')).distanceTo(gun.localToWorld(grips[i])));});}
  aimReady=states.aim&&aimBlend>.995&&aimError<.002&&gripError<.005;

 }
 function diagnostics(){return {source:data.source,bones:bones.size,clip:lastClip,durations:Object.fromEntries(Object.entries(actions).map(([n,a])=>[n,a.getClip().duration])),weights:{...weights},groundBias:{...biases},aimReady,aimErrorDegrees:aimError*180/Math.PI,gripError,aimTarget:aimTarget.toArray(),soleY:soleY(),nativeLegs:lastNative};}
 return {actor,bones,skeleton,poseRoot,poseBones,gun,mixer,actions,weights,update,diagnostics,bore,setAimTarget,setPose:next=>Object.assign(pose,next),dispose(){mixer.stopAllAction();mixer.uncacheRoot(actor);skeleton.dispose();}};
}

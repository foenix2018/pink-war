# Extract the tested V10 pose driver while replacing preview/UI state with combat inputs.
from pathlib import Path
import sys
if len(sys.argv)<2:raise SystemExit('Usage: build-reco1-controller.py approved_RECO1_V10.html')
src=Path(sys.argv[1]).read_text()
start=src.index(' // Direct port of RLH');end=src.index('\nconst motionRLH=')
body=src[start:end]
# Driver lives in a detached, metre-scaled pose frame, independent of the enemy's map placement.
body=body.replace("  const desiredYaw=states.aim?Math.atan2(aimTarget.x,aimTarget.z):0;\n  const yawDelta=Math.atan2(Math.sin(desiredYaw-actor.rotation.y),Math.cos(desiredYaw-actor.rotation.y));\n  actor.rotation.y+=yawDelta*(1-Math.exp(-dt/.24));",'')
body=body.replace("crouchBlend=T.MathUtils.lerp(crouchBlend,states.motion==='crouch'?1:0,blend);aimBlend=T.MathUtils.lerp(aimBlend,states.aim?1:0,blend);", "crouchBlend=pose.coverCrouch||0;aimBlend=states.aim?1:0;")
body=body.replace('(.416*.28/2.78)','(RECO1.coverDrop/2.78)')
a=body.index('  // The carried pose follows');b=body.index('  if(gun.visible){',a)
body=body[:a]+'''  // This is the simulation's authoritative carbine frame, not an independent visual aim.
  // The pose is already in source +Z coordinates; the model wrapper turns it into game -Z.
  if(states.aim){
   const p=RECO1_WEAPON.pivot;gun.position.set(-p.x,p.y-RECO1.coverDrop*crouchBlend,-p.z);
   gun.quaternion.setFromEuler(new T.Euler(-(pose.aimPitch||0),pose.aimYaw||0,0,'YXZ'));
  }else{
   gun.position.copy(upper.localToWorld(new T.Vector3(-.028,.245,.24)));
   gun.quaternion.setFromEuler(new T.Euler(.35,1.06,.04,'YXZ')).premultiply(upper.getWorldQuaternion(new T.Quaternion()));
  }
  gun.updateWorldMatrix(true,true);
''' +body[b:]
body=body.replace('  mixer.update(dt);','  for(const name of [\'walk\',\'walkRifle\'])actions[name].setEffectiveTimeScale(T.MathUtils.clamp((pose.speed||1.55)/1.55,.1,2.4));\n  actions.run.setEffectiveTimeScale(T.MathUtils.clamp((pose.speed||5)/5,.1,2));\n  mixer.update(dt);')
body=body.replace(" return {actor,bones,skeleton,mixer,actions,weights,helper,update,diagnostics,bore,setAimTarget,isAimReady:()=>aimReady,advance:(dt)=>update(dt,0,0)};", " return {actor,bones,skeleton,poseRoot,poseBones,gun,mixer,actions,weights,update,diagnostics,bore,setAimTarget,setPose:next=>Object.assign(pose,next),dispose(){mixer.stopAllAction();mixer.uncacheRoot(actor);skeleton.dispose();}};")
header='''// Generated from the approved V10 RLH driver. See assets/reco1/README.md for changes.
import * as T from './vendor/three.webgpu.min.js';
import {RECO1,RECO1_WEAPON} from './reco1-profile.js';
export function createReco1Pose(asset,states){
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
'''
body=body.replace('  mixer.update(dt);','  for(const v of mixedPose){v.b.position.copy(v.p);v.b.quaternion.copy(v.q);}// Restore the native layer even when mixer time is frozen.\n  mixer.update(dt);\n  for(const v of mixedPose){v.p.copy(v.b.position);v.q.copy(v.b.quaternion); }\n  if(pose.hitPulse)bone(\'Spine2\').quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(-.045*pose.hitPulse,0,0)));')
(Path(__file__).resolve().parents[1]/'dist/reco1-pose.js').write_text(header+body)

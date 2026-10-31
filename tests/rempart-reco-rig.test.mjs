import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRempart} from '../dist/enemy-rempart.js';
import {rangedMuzzle} from '../dist/enemy-combat.js';

test('Rempart uses RECO1 native bones and moves its armoured limbs with the walk cycle',()=>{
 const actor=createRempart(),pose=actor.userData.reco1Pose;
 assert.equal(pose.bones.size,41);
 for(const clip of ['idle','walk','run'])assert.ok(pose.actions[clip]);
 const foot=pose.bones.get('mixamorigRightFoot'),samples=[];
 for(let i=0;i<80;i++){
  const t=i/30;actor.position.z=-t;actor.userData.animate(t,0,true,{x:0,z:-t,awareness:'engaged'},t);
  samples.push(foot.getWorldPosition(new T.Vector3()).y);
 }
 assert.equal(actor.userData.nativeMotion,'walk');
 assert.ok(Math.max(...samples)-Math.min(...samples)>.04,'foot rises during a real walk');
 assert.ok(actor.userData.nativeSkeleton.bones.includes(foot));
 const meshes=[];actor.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 assert.ok(meshes.length>0&&meshes.length<=6);
 const allBones=new Set(meshes.flatMap(m=>m.skeleton.bones.map(b=>b.name)));
 for(const name of ['mixamorigRightForeArm','mixamorigLeftForeArm','mixamorigRightFoot','mixamorigLeftFoot'])assert.ok(allBones.has(name));
});

test('Rempart keeps a low right-side muzzle and its optics reflect perception',()=>{
 const actor=createRempart(),idle=actor.userData.optics.color.getHex();
 actor.userData.animate(.1,0,false,{awareness:'engaged'},.1);
 assert.notEqual(actor.userData.optics.color.getHex(),idle);
 const m=rangedMuzzle({form:'bulwark',x:0,z:0,yaw:0});
 assert.ok(m.x>.3&&m.y<1.2&&m.z<-.5);
});

// Art and ballistics must share the same moving, pitched cannon frame.
test('Rempart cannon bore and projectile origin agree through motion, pitch, yaw and crouch',()=>{
 const actor=createRempart();
 for(let i=0;i<80;i++){
  const t=i/30,e={form:'bulwark',x:3,z:-t,elevation:1,yaw:.7,aimPitch:Math.sin(t*3)*.8,aimYaw:Math.sin(t)*.2,coverCrouch:i>40?.65:0,awareness:'engaged'};
  actor.position.set(e.x,e.elevation,e.z);actor.rotation.y=e.yaw;actor.userData.animate(t,0,true,e,t);
  const drawn=actor.userData.muzzle().origin,physical=rangedMuzzle(e);
  assert.ok(drawn.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<1e-5,JSON.stringify({drawn:drawn.toArray(),physical}));
 }
});

test('Rempart skeleton has broader hips and shoulders than RECO1 without losing native bone names',async()=>{
 const {createReco1}=await import('../dist/reco1.js');const recon=createReco1(),heavy=createRempart();
 const width=(actor,a,b)=>{const bones=actor.userData.nativeSkeleton.bones;return bones.find(v=>v.name===a).getWorldPosition(new T.Vector3()).distanceTo(bones.find(v=>v.name===b).getWorldPosition(new T.Vector3()));};
 for(const joint of ['Arm','UpLeg'])assert.ok(width(heavy,'mixamorigLeft'+joint,'mixamorigRight'+joint)>width(recon,'mixamorigLeft'+joint,'mixamorigRight'+joint)*1.7);
});

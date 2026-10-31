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
 for(const [elite,roomScale] of [[false,1],[true,.74]]){
 const actor=createRempart({elite});actor.scale.multiplyScalar(roomScale);
 for(let i=0;i<80;i++){
  const t=i/30,e={form:'bulwark',elite,roomScale,x:3,z:-t,elevation:1,yaw:.7,aimPitch:Math.sin(t*3)*.8,aimYaw:Math.sin(t)*.2,coverCrouch:i>40?.65:0,awareness:'engaged'};
  actor.position.set(e.x,e.elevation,e.z);actor.rotation.y=e.yaw;actor.userData.animate(t,0,true,e,t);
  const drawn=actor.userData.muzzle().origin,physical=rangedMuzzle(e);
  assert.ok(drawn.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<1e-5,JSON.stringify({drawn:drawn.toArray(),physical}));
 }
 }
});

test('Rempart skeleton has broader hips and shoulders than RECO1 without losing native bone names',async()=>{
 const {createReco1}=await import('../dist/reco1.js');const recon=createReco1(),heavy=createRempart();
 const width=(actor,a,b)=>{const bones=actor.userData.nativeSkeleton.bones;return bones.find(v=>v.name===a).getWorldPosition(new T.Vector3()).distanceTo(bones.find(v=>v.name===b).getWorldPosition(new T.Vector3()));};
 for(const joint of ['Arm','UpLeg'])assert.ok(width(heavy,'mixamorigLeft'+joint,'mixamorigRight'+joint)>width(recon,'mixamorigLeft'+joint,'mixamorigRight'+joint)*1.7);
});

test('broader Rempart boots stay on the floor through the native walking cycle',()=>{
 const actor=createRempart(),skeleton=actor.userData.skeleton,feet=new Set(skeleton.bones.map((b,i)=>/mixamorig(Left|Right)Foot$/.test(b.name)?i:-1).filter(i=>i>=0)),samples=[];
 actor.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const ids=mesh.geometry.attributes.skinIndex;for(let i=0;i<ids.count;i++)if(feet.has(ids.getX(i)))samples.push({mesh,index:i});});
 const point=new T.Vector3();
 for(let i=0;i<60;i++){
  const t=i/30;actor.userData.animate(t,0,true,{x:0,z:-t,awareness:'engaged'},t);skeleton.update();let min=Infinity;
  for(const sample of samples){sample.mesh.getVertexPosition(sample.index,point);min=Math.min(min,point.y);}
  assert.ok(min>-.005&&min<.012,'at least one real boot supports the chassis, y='+min);
 }
});

test('Rempart carries the cannon with the moving thorax instead of pinning it to the root',()=>{
 const actor=createRempart(),pose=actor.userData.reco1Pose,torso=pose.bones.get('mixamorigSpine2'),arm=pose.bones.get('mixamorigRightForeArm');
 const elbow=arm.getWorldPosition(new T.Vector3()),anchor=torso.worldToLocal(elbow.clone()),expected=new T.Vector3(),actual=new T.Vector3();
 const heights=[];
 for(let i=0;i<150;i++){
  const t=i/30,e={form:'bulwark',x:0,z:-t,awareness:'engaged',aimPitch:0,coverCrouch:i>110?.65:0,hitAt:i===95?t:-99};
  actor.position.set(e.x,0,e.z);
  actor.userData.animate(t,0,true,e,t);
  expected.copy(anchor).applyMatrix4(torso.matrixWorld);arm.getWorldPosition(actual);
  assert.ok(actual.distanceTo(expected)<1e-5,'cannon attachment stays on its thorax anchor');
  heights.push(actor.userData.muzzle().origin.y);
  const physical=rangedMuzzle(e);assert.ok(actor.userData.muzzle().origin.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<1e-5);
 }
 assert.ok(Math.max(...heights)-Math.min(...heights)>.02,'weapon follows visible body movement');
});

test('wide Rempart boots keep separate tracks through walk, run, turning and crouching',()=>{
 for(const detail of ['low','high']){
  const actor=createRempart({detail}),sk=actor.userData.skeleton,samples={Left:[],Right:[]};
  actor.traverse(mesh=>{if(!mesh.isSkinnedMesh||!['B-11 / plate','B-11 / dark','B-11 / metal'].includes(mesh.name))return;const ids=mesh.geometry.attributes.skinIndex;for(let i=0;i<ids.count;i++)for(const side of ['Left','Right'])if(sk.bones[ids.getX(i)].name==='mixamorig'+side+'Foot')samples[side].push({mesh,index:i});});
  const p=new T.Vector3();let z=0;
  for(let i=0;i<240;i++){
   const t=i/30,speed=i<100?1.1:i<180?3.4:.8;z-=speed/30;
   actor.rotation.y=Math.sin(t)*1.5;actor.userData.animate(t,0,true,{form:'bulwark',x:0,z,awareness:'engaged',coverCrouch:i>190?.65:0},t);sk.update();
   let innerLeft=Infinity,innerRight=-Infinity;
   for(const sample of samples.Left){sample.mesh.getVertexPosition(sample.index,p);innerLeft=Math.min(innerLeft,p.x);}
   for(const sample of samples.Right){sample.mesh.getVertexPosition(sample.index,p);innerRight=Math.max(innerRight,p.x);}
   assert.ok(innerLeft>.025&&innerRight<-.025,detail+': feet cross the midline at '+i+' ('+innerLeft+', '+innerRight+')');
   assert.ok(innerLeft-innerRight>.10,'boots retain clearance');
  }
 }
});

test('disposing a Rempart releases its animated weapon offset',async()=>{
 const {rempartMuzzleLocal}=await import('../dist/rempart-profile.js');
 const actor=createRempart(),e={form:'bulwark',x:0,z:0,awareness:'engaged'};
 for(let i=0;i<40;i++){const t=i/30;e.z=-t;actor.position.z=e.z;actor.userData.animate(t,0,true,e,t);}
 actor.userData.dispose();
 const physical=rangedMuzzle(e),rest=rempartMuzzleLocal();
 assert.ok(new T.Vector3(physical.x,physical.y,physical.z).distanceTo(new T.Vector3(rest.x,rest.y,rest.z+e.z))<1e-8,'headless or replacement model starts without a stale offset');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {rangedMuzzle} from '../dist/enemy-combat.js';
import {LISTENER_TOOL} from '../dist/enemy-weapon-layout.js';
const mats=()=>Object.fromEntries(['monster','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()]));

test('E-06 keeps its right hand on the arm tool through aiming, movement and cover',()=>{
 const factory=createEnemyFactory(mats());
 for(const elite of [false,true]){
  const a=factory.create(elite,true,'listener'),rig=a.userData.armTool;
  assert.ok(rig);assert.equal(a.userData.fieldRifle,undefined);assert.equal(rig.arms.length,1);
  for(let frame=0;frame<60;frame++){
   const t=frame/30;a.position.z=-t*.7;
   a.userData.animate(t,0,true,{ranged:true,awareness:frame<10?'search':'engaged',aimPitch:Math.sin(t*3)*.45,coverCrouch:frame>30?.8:0},t);
   a.updateMatrixWorld(true);
   const desired=rig.bone.parent.localToWorld(rig.targets().right);
   assert.ok(rig.arms[0].wrist.getWorldPosition(new T.Vector3()).distanceTo(desired)<1e-5);
  }
 }
});

test('E-06 actual bore and simulated projectiles agree at height, yaw, crouch and both scales',()=>{
 const factory=createEnemyFactory(mats());
 for(const elite of [false,true])for(const pitch of [-1,-.4,0,.3,1])for(const crouch of [0,1]){
  const a=factory.create(elite,true,'listener'),e={form:'listener',elite,x:2,z:-3,elevation:1.4,yaw:.8,aimPitch:pitch,coverCrouch:crouch,ranged:true,awareness:'engaged'};
  a.position.set(e.x,e.elevation,e.z);a.rotation.y=e.yaw;a.userData.animate(1,0,false,e,1);a.updateMatrixWorld(true);
  const actual=a.userData.skeleton.bones.find(b=>b.name==='weapon-ready-emitter').getWorldPosition(new T.Vector3()),expected=rangedMuzzle(e);
  assert.ok(actual.distanceTo(new T.Vector3(expected.x,expected.y,expected.z))<.065);
 }
 const a=factory.create(false,true,'listener');a.userData.animate(0,0,false,{awareness:'search',lastHeardAt:0,alertedUntil:2},0);
 assert.equal(a.userData.armTool.bone.rotation.x,LISTENER_TOOL.patrolPitch);
 a.userData.animate(.1,0,false,{awareness:'engaged',ranged:true},.1);assert.equal(a.userData.armTool.bone.rotation.x,0);
});

test('both E-06 detail levels bound GPU work and preserve the physical weapon and alert sensor',()=>{
 for(const detail of ['low','high']){
  const factory=createEnemyFactory(mats(),{detail}),a=factory.create(false,true,'listener');
  let triangles=0,draws=0;a.traverse(o=>{if(o.isMesh){draws++;triangles+=o.geometry.attributes.position.count/3;}assert.ok(!o.isLight);});
  assert.ok(draws<=6);assert.ok(triangles<(detail==='low'?11000:26000));
  a.userData.animate(1,0,false,{awareness:'engaged',ranged:true},1);a.updateMatrixWorld(true);
  assert.deepEqual(a.userData.sensorAnchor,[0,1.88]);assert.equal(a.userData.alertState,'engaged');
  const point=a.userData.skeleton.bones.find(b=>b.name==='weapon-ready-emitter').getWorldPosition(new T.Vector3()),physical=rangedMuzzle({form:'listener',x:0,z:0});
  assert.ok(point.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<.065);
 }
});

test('relaxed E-06 hands expose inward palms and forward thumbs on the actual skinned mesh',()=>{
 for(const detail of ['low','high'])for(const elite of [false,true]){
  const a=createEnemyFactory(mats(),{detail}).create(elite,false,'listener');a.rotation.y=.67;
  a.userData.animate(1,0,false,{},1);a.updateMatrixWorld(true);a.userData.skeleton.update();
  for(const side of [-1,1]){
   const wrist=a.userData.skeleton.bones.find(b=>b.name===`arm-${side}-wrist`);
   const inward=new T.Vector3(-side,0,0).transformDirection(wrist.matrixWorld);
   const start=wrist.localToWorld(new T.Vector3(-side*.048,-.025,0));
   const hit=new T.Raycaster(start,inward.clone().negate(),0,.08*a.scale.x).intersectObject(a,true)[0];
   assert.ok(hit,'the palm surface must be present on the medial side');
   const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
   assert.ok(normal.dot(inward)>.99,'the actual palm face must point inward');
   const thumbStart=wrist.localToWorld(new T.Vector3(-side*.042,-.065,-.07));
   const thumb=new T.Raycaster(thumbStart,new T.Vector3(0,0,1).transformDirection(wrist.matrixWorld),0,.04*a.scale.x).intersectObject(a,true)[0];
   assert.ok(thumb,'the thumb must be on the forward side, not behind the hand');
   assert.ok(wrist.worldToLocal(thumb.point.clone()).z<-.04);
  }
 }
});

test('the E-06 right fingers wrap across the front of the handle in all weapon poses',()=>{
 const a=createEnemyFactory(mats()).create(false,true,'listener');a.rotation.y=.4;
 for(const awareness of ['patrol','search','engaged'])for(const pitch of [-.4,0,.3])for(const coverCrouch of [0,.8]){
  a.userData.animate(1,0,false,{awareness,ranged:true,aimPitch:pitch,coverCrouch,lastHeardAt:1,alertedUntil:3},1);a.updateMatrixWorld(true);a.userData.skeleton.update();
  const gun=a.userData.armTool.bone;
  for(const y of [-.053,-.073,-.093]){
   const start=gun.localToWorld(new T.Vector3(0,y,-.075)),direction=new T.Vector3(0,0,1).transformDirection(gun.matrixWorld);
   const hit=new T.Raycaster(start,direction,0,.1).intersectObject(a,true)[0];
   assert.ok(hit,'each finger must be visible in front of the handle');
   assert.ok(gun.worldToLocal(hit.point.clone()).z<-.008,'finger links wrap around the front rather than hanging below the grip');
  }
 }
});

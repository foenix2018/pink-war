import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {FIELD_RIFLE,carriesFieldRifle} from '../dist/enemy-weapon-layout.js';
import {rangedMuzzle} from '../dist/enemy-combat.js';

const mats=()=>Object.fromEntries(['monster','monsterFace','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
test('infantry hands stay on both rifle grips through aim, locomotion, recoil and crouching',()=>{
 const factory=createEnemyFactory(mats());
 for(const form of FIELD_RIFLE.forms)for(const elite of [false,true]){
  const actor=factory.create(elite,true,form),rig=actor.userData.fieldRifle;
  assert.ok(rig);actor.rotation.y=.67;
  for(let frame=0;frame<75;frame++){
   const time=frame/30;actor.position.set(1,0,-time*.8);
   actor.userData.animate(time,0,true,{ranged:true,awareness:frame<10?'patrol':'engaged',aimPitch:Math.sin(time*4)*.4,coverCrouch:frame>30?.8:0,combatPose:frame>30?'cover':'advance',lastShotAt:frame>50?time:-99},time);
   actor.updateMatrixWorld(true);const targets=rig.targets();
   for(const arm of rig.arms){const desired=rig.bone.parent.localToWorld(targets[arm.side===1?'right':'left']);assert.ok(arm.wrist.getWorldPosition(new T.Vector3()).distanceTo(desired)<1e-5,form+' hand must not leave the weapon');}
  }
 }
});
test('projectile origin follows the same pitched barrel as the rendered infantry weapon',()=>{
 const factory=createEnemyFactory(mats());
 for(const form of FIELD_RIFLE.forms)for(const elite of [false,true])for(const pitch of [-1.2,-.5,0,.35,.95])for(const crouch of [0,1]){
  const actor=factory.create(elite,true,form),e={form,elite,x:3,z:-6,elevation:2,yaw:.7,aimPitch:pitch,coverCrouch:crouch};
  actor.position.set(e.x,e.elevation,e.z);actor.rotation.y=e.yaw;actor.userData.animate(1,0,false,{...e,ranged:true,awareness:'engaged',combatPose:'peek'},1);actor.updateMatrixWorld(true);
  const emitter=actor.userData.skeleton.bones.find(b=>b.name==='weapon-ready-emitter'),point=emitter.getWorldPosition(new T.Vector3()),physical=rangedMuzzle(e);
  assert.ok(point.distanceTo(new T.Vector3(physical.x,physical.y,physical.z))<.065,'pose sway remains within 6.5 cm of the simulated muzzle, rather than a detached shoulder emitter');
 }
});
test('readiness lowers the rifle and detection raises it while the original eyes turn red',()=>{
 const actor=createEnemyFactory(mats()).create(false,true,'stalker');
 actor.userData.animate(0,0,false,{},0);assert.equal(actor.userData.fieldRifle.bone.rotation.x,-.3);const idle=actor.userData.optics.color.getHex();
 actor.userData.animate(.1,0,false,{ranged:true,awareness:'search',lastHeardAt:.1,alertedUntil:2},.1);
 assert.equal(actor.userData.fieldRifle.bone.rotation.x,0);assert.notEqual(actor.userData.optics.color.getHex(),idle);
 assert.equal(actor.userData.alertState,'alert');assert.equal(carriesFieldRifle('synth'),true,'the ivory tactical unit now shares the anatomical rifle grips');
});
test('every revised ground chassis preserves the mobile budget and adds no dynamic light',()=>{
 const factory=createEnemyFactory(mats());
 for(const form of ['stalker','seer','listener','brute','bulwark','synth'])for(const elite of [false,true]){
  const actor=factory.create(elite,true,form);let triangles=0,draws=0,lights=0;
  actor.traverse(o=>{if(o.isMesh){draws++;triangles+=o.geometry.attributes.position.count/3;}if(o.isLight)lights++;});
  assert.ok(triangles<11000,form+': '+triangles);assert.ok(draws<=6);assert.equal(lights,0);
 }
});

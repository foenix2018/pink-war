import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.module.min.js';
import {createEnemyFactory,ENEMY_PROFILES} from '../dist/enemies.js';
import {POSTER_CHASSIS_REVISION} from '../dist/enemy-poster-chassis.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const solid=c=>new T.MeshStandardMaterial({color:c}),neon=c=>new T.MeshBasicMaterial({color:c});
const mats={monster:solid(1),monsterElite:solid(2),monsterFace:solid(3),rose:neon(4),violet:neon(5),cyan:neon(6)};

test('the posters change the look, never the names',()=>{
  assert.match(ENEMY_PROFILES.stalker.name,/^PO-07 · Poursuivant/);assert.match(ENEMY_PROFILES.synth.name,/^SY-05 · Synthétique/);
  assert.match(ENEMY_PROFILES.brute.name,/^BR-11/);assert.match(ENEMY_PROFILES.listener.name,/^TR-15/);assert.match(ENEMY_PROFILES.bulwark.name,/^R-11/);
  const c=read('enemy-poster-chassis.js');assert.match(c,/stencil\('PO-07'/);assert.match(c,/stencil\('SY-05'/);
});

test('PO-07 and SY-05 are built from the poster chassis, in graphite with scarlet seams, rifle still mounted',()=>{
  const factory=createEnemyFactory(mats);
  for(const form of ['stalker','synth']){
    const actor=factory.create(false,true,form);
    assert.equal(actor.userData.posterRevision,POSTER_CHASSIS_REVISION,form);
    const materials=[];actor.traverse(o=>{if(o.isMesh)materials.push(o.material);});
    assert.ok(materials.some(m=>m.color?.getHex()===0x6e737b&&m.userData.posterWear&&m.bumpMap),form+': worn riveted graphite plates');
    assert.ok(materials.some(m=>m.isMeshBasicMaterial&&m.color.getHex()===0xff1838),form+': scarlet seams');
    assert.ok(actor.getObjectByName('aimed-field-rifle'),form+': field rifle bone');
  }
});

test('PO-07 walks on reverse knees and keeps a foot on the ground through the stride',()=>{
  const actor=createEnemyFactory(mats).create(false,false,'stalker'),p=new T.Vector3();actor.position.y=2;
  assert.match(read('enemies.js'),/form==='spectre'\|\|form==='stalker'\?1:-1/);
  actor.userData.animate(0,.3,true);
  for(let f=1;f<=80;f++){
    actor.position.z-=.04;actor.userData.animate(f*.016,.3,true);actor.updateMatrixWorld(true);
    const floor=actor.position.y+actor.userData.supportHeight,feet=actor.userData.legs.map(l=>l.foot.getWorldPosition(p).y);
    assert.ok(feet.every(y=>y>=floor-1e-5)&&feet.some(y=>Math.abs(y-floor)<1e-5),'frame '+f);
  }
});

test('Brute and Traqueur gain the poster light seams',()=>{
  assert.match(read('enemy-brute-v3.js'),/Poster seams/);assert.match(read('enemy-listener.js'),/rimArc/);
});

test('every humanoid chassis is driven by REC-01’s native motion capture, with its own traits',async()=>{
  const {MOCAP_TRAITS,MOCAP_REVISION}=await import('../dist/enemy-mocap.js');const factory=createEnemyFactory(mats);
  for(const form of ['stalker','synth','listener','brute','spectre']){
    const a=factory.create(false,form!=='brute'&&form!=='spectre',form);
    assert.equal(a.userData.mocapRevision,MOCAP_REVISION,form);assert.ok(MOCAP_TRAITS[form].label,form);
    assert.equal(a.userData.nativeSkeleton.bones.length,41,form+': the 41 native RLH bones');
    // Walking really moves the upper body: chest and arms change with the clip, not only the legs.
    const thorax=a.userData.skeleton.bones.find(b=>b.name==='thorax'),arm=a.userData.skeleton.bones.find(b=>b.name==='arm--1-shoulder');
    const seen=[];for(let i=1;i<=40;i++){a.position.z-=.03;a.userData.animate(i/60,0,true,{},i/60);seen.push([thorax.quaternion.clone(),arm.quaternion.clone()]);}
    assert.ok(seen.some(([t])=>t.angleTo(seen[0][0])>.02),form+': chest follows the capture');
    assert.ok(seen.some(([,u])=>u.angleTo(seen[0][1])>.05),form+': arms swing with the capture');
  }
  assert.ok(MOCAP_TRAITS.brute.cadence<MOCAP_TRAITS.synth.cadence&&MOCAP_TRAITS.stalker.cadence>MOCAP_TRAITS.synth.cadence,'heavy Brute, quick Pursuer');
});

test('shooter reactions: recoil kicks the chest, a hit makes it flinch, the rifle stays on its authoritative frame',async()=>{
  const {weaponPitch}=await import('../dist/enemy-mocap.js');const a=createEnemyFactory(mats).create(false,true,'synth');
  const thorax=a.userData.skeleton.bones.find(b=>b.name==='thorax');
  a.userData.animate(1,0,false,{awareness:'engaged',ranged:true,aimPitch:.2,lastShotAt:-9},1);const calm=thorax.quaternion.clone();
  assert.ok(Math.abs(weaponPitch(a.userData.fieldRifle.bone,a)-.2)<1e-6);
  a.userData.animate(1.02,0,false,{awareness:'engaged',ranged:true,aimPitch:.2,lastShotAt:1.01},1.02);assert.ok(thorax.quaternion.angleTo(calm)>.01,'recoil');
  a.userData.animate(1.6,0,false,{awareness:'engaged',ranged:true,aimPitch:.2,hitAt:1.58,lastShotAt:-9},1.6);assert.ok(thorax.quaternion.angleTo(calm)>.02,'flinch');
});

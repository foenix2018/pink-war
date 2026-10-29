import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun,WEAPON_FRAME} from '../dist/weapons.js';
import {GRIP} from '../dist/hands.js';
import {CHARACTERS} from '../dist/characters.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {ArenaGame} from '../dist/game-logic.js';

function hero(profile=CHARACTERS[1]){
 const k=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));
 const m=createSoldier(k,()=>buildGun({mats,gloves:k.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);installShadowUnit(m,profile);m.root.scale.setScalar(m.heightScale);return m;
}
function step(m,game,dt,input={}){
 game.step(dt,input);m.root.position.set(game.player.x,game.player.elevation,game.player.z);m.root.rotation.y=game.player.yaw;
 m.animate(game.time,Math.hypot(game.playerVelocity.x,game.playerVelocity.z)>.1,0,0,1,dt,{velocity:game.playerVelocity,aim:true,airborne:!game.player.grounded,verticalSpeed:game.player.verticalSpeed});
}
function bootSamples(m){
 const samples=[];
 for(const b of m.shadowUnit.armour.bindings.filter(b=>b.source.parent.name.includes('segmented boot'))){
  const p=b.source.geometry.attributes.position,seen=new Set();for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');if(!seen.has(key)){seen.add(key);samples.push({mesh:b.source,index:i});}}
 }return samples;
}
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}: grounded and running jumps at ${fps} Hz articulate progressively and land on the real soles`,()=>{
 const m=hero(profile),dt=1/fps,boots=bootSamples(m),point=new T.Vector3();
 for(const speed of [0,-1]){
  const game=new ArenaGame([]);game.nextWave=999;game.toSpawn=0;game.enemies=[];
  for(let i=0;i<fps;i++)step(m,game,dt,{z:speed});
  let previous=m.jointPositions(),q=m.knees[0].quaternion.clone(),peakCompression=0,landFrame=-1,peakFrame=-1,apexAsymmetry=0;
  const phases=new Set();
  for(let i=0;i<fps*1.5;i++){
   step(m,game,dt,{z:speed,jump:i===0});phases.add(m.jumpPose.phase);m.root.updateMatrixWorld(true);
   const j=m.jointPositions(),local=(p)=>m.root.worldToLocal(p.clone()),L=local(j.leftAnkle),R=local(j.rightAnkle);
   assert.ok(R.x-L.x>.13,'airborne boots remain separated');
   if(!game.player.grounded){assert.ok(['idle','rifle'].includes(m.nativeMotion),'a walk/run cycle is not replayed in the air');assert.ok(m.locomotion.planted.every(v=>!v));}
   else if(landFrame<0)landFrame=i;
   if(m.jumpPose.phase==='apex')apexAsymmetry=Math.max(apexAsymmetry,Math.abs(L.y-R.y));
   if(m.jumpPose.compression>peakCompression){peakCompression=m.jumpPose.compression;peakFrame=i;}
   // Root elevation follows real physics. Compare local joints so the expected
   // ballistic translation is not mistaken for an articulation discontinuity.
   const previousAnkle=previous.leftAnkle.clone().sub(previous.pelvis),ankle=j.leftAnkle.clone().sub(j.pelvis);
   assert.ok(ankle.distanceTo(previousAnkle)/dt<9,'no ankle teleport at takeoff or touchdown');
   assert.ok(q.angleTo(m.knees[0].quaternion)/dt<32,'no instantaneous knee snap');
   for(const side of ['left','right']){const hip=local(j[side+'Hip']),knee=local(j[side+'Knee']),foot=local(j[side+'Ankle']);assert.ok(knee.z<hip.clone().lerp(foot,.5).z+.02,'knees bend anatomically forward');}
   for(const b of boots){point.fromBufferAttribute(b.mesh.geometry.attributes.position,b.index).applyMatrix4(b.mesh.matrixWorld);assert.ok(point.y>=game.player.elevation-.003,'toe and heel clear the physics contact plane');}
   previous=j;q.copy(m.knees[0].quaternion);
  }
  assert.ok(phases.has('takeoff')&&phases.has('apex')&&phases.has('descent')&&phases.has('landing'));
  assert.ok(apexAsymmetry>.055,'one knee leads instead of matching rigidly');
  assert.ok(peakCompression>.65&&peakFrame>landFrame+fps*.025&&peakFrame<landFrame+fps*.15,'impact absorption builds after contact');
  assert.equal(m.jumpPose.phase,'grounded');assert.ok(m.jumpPose.compression<1e-5);
 }m.dispose();
});
test('double jump and falling from a ledge keep continuous poses and use the actual physics impulses',()=>{
 const m=hero(),game=new ArenaGame([]);game.nextWave=999;game.toSpawn=0;
 for(let i=0;i<40;i++)step(m,game,1/60);
 for(let i=0;i<23;i++)step(m,game,1/60,{jump:i===0});
 const before=m.root.worldToLocal(m.feet[0].getWorldPosition(new T.Vector3()));step(m,game,1/60,{jump:true});
 assert.equal(game.player.airJumps,1);assert.equal(m.jumpPose.launches,2);assert.ok(m.root.worldToLocal(m.feet[0].getWorldPosition(new T.Vector3())).distanceTo(before)<.04);
 for(let i=0;i<100;i++)step(m,game,1/60);assert.equal(m.jumpPose.phase,'grounded');
 game.player.elevation=2.4;game.player.grounded=false;game.player.verticalSpeed=0;
 for(let i=0;i<20;i++){step(m,game,1/60);assert.equal(m.jumpPose.tuck,0,'a fall does not restart a jump push-off');}
 m.dispose();
});
test('both hands keep the nine actual weapon grips through takeoff, apex, descent and impact',()=>{
 const m=hero();
 for(let weapon=0;weapon<WEAPON_FRAME.length;weapon++){
  m.setWeapon(weapon);const game=new ArenaGame([]);game.nextWave=999;game.toSpawn=0;
  for(let i=0;i<35;i++)step(m,game,1/60);
  for(let i=0;i<75;i++){
   step(m,game,1/60,{jump:i===0});m.root.updateMatrixWorld(true);
   if(i%6)continue;
   for(let hand=0;hand<2;hand++){const g=hand===1?m.gun.userData.hand:WEAPON_FRAME[weapon].support||WEAPON_FRAME[weapon].dual?m.gun.userData.support:m.freeHand;assert.ok(m.arms[hand].hand.getWorldPosition(new T.Vector3()).distanceTo(g.localToWorld(new T.Vector3(...GRIP.wrist)))<.001,`${weapon}/${hand}`);}
  }
 }m.dispose();
});
test('pausing mid-air freezes the flight layer, all native bones and the cape exactly',()=>{
 const m=hero(),game=new ArenaGame([]);game.nextWave=999;game.toSpawn=0;
 for(let i=0;i<35;i++)step(m,game,1/60,{jump:i===15});
 const pose=()=>m.actor.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]),before=pose(),flight=JSON.stringify(m.jumpPose),cloth=m.shadowUnit.cape.anchor.children[0].geometry.attributes.position.array.slice();
 for(let i=0;i<20;i++)m.animate(game.time,false,0,0,1,0,{airborne:true,verticalSpeed:0});
 assert.deepEqual(pose(),before);assert.equal(JSON.stringify(m.jumpPose),flight);assert.deepEqual(m.shadowUnit.cape.anchor.children[0].geometry.attributes.position.array,cloth);m.dispose();
});

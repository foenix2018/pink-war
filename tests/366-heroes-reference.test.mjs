import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun,WEAPON_FRAME} from '../dist/weapons.js';
import {GRIP} from '../dist/hands.js';
import {applyShadowMaterials,installShadowUnit} from '../dist/shadow-unit-game.js';
function hero(profile=CHARACTERS[1]){const k=createCharacterKit(new T.Texture());applyShadowMaterials(k,profile);const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));const m=createSoldier(k,()=>buildGun({mats,gloves:k.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);installShadowUnit(m,profile);return m;}
function frames(m,n,flight={},dt=1/60){for(let i=0;i<n;i++){m.root.position.x+=(flight.velocity?.x||0)*dt;m.root.position.z+=(flight.velocity?.z||0)*dt;m.animate((m._testTime=(m._testTime||0)+dt),Math.hypot(flight.velocity?.x||0,flight.velocity?.z||0)>.01,0,0,flight.aim?1:0,dt,flight);}}
const pose=m=>m.actor.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray()]);
for(const profile of CHARACTERS){
 test(profile.id+': reference armour renders through bounded native skin batches and releases them',()=>{
  const m=hero(profile),a=m.shadowUnit.armour;assert.equal(a.revision,7);assert.ok(a.batches.length<=20);assert.ok(a.triangles<50000);assert.equal(m.nativeSkeleton.bones.length,34);
  assert.ok(a.bindings.every(b=>!b.source.visible&&b.source.userData.heroAuthoring));let freed=0;
  for(const b of a.batches){assert.ok(b.skeleton.bones.every((bone,i)=>bone===m.nativeSkeleton.bones[i]));assert.ok(b.isSkinnedMesh);const ix=b.geometry.attributes.skinIndex,w=b.geometry.attributes.skinWeight;assert.ok(ix.array instanceof Float32Array);for(let i=0;i<ix.count;i++){assert.ok(ix.getX(i)>=0&&ix.getX(i)<34);assert.equal(w.getX(i),1);}b.geometry.addEventListener('dispose',()=>freed++);}
  m.setLevel(10);assert.ok(a.batches.every(b=>b.parent===m.root));m.dispose();assert.equal(freed,a.batches.length);
 });
 test(profile.id+': GPU plate positions match the actual native bone attachments during locomotion',()=>{
  const m=hero(profile);m.root.scale.setScalar(m.heightScale);m.root.rotation.y=.54;m.root.position.set(12,4.8,-20);
  for(const flight of [{aim:true},{velocity:{x:1,z:-2},aim:true},{velocity:{x:0,z:7},aim:true},{velocity:{x:2,z:0},crouched:true,aim:true},{airborne:true,verticalSpeed:0}]){
   frames(m,10,flight);m.root.updateMatrixWorld(true);m.nativeSkeleton.update();
   for(const b of m.shadowUnit.armour.bindings){const g=b.source.geometry,p=g.attributes.position;
    for(const i of [0,Math.floor(b.count/2),b.count-1]){const sourceIndex=g.index?g.index.getX(i):i;const expected=new T.Vector3().fromBufferAttribute(p,sourceIndex).applyMatrix4(b.source.matrixWorld);const actual=b.batch.getVertexPosition(b.first+i,new T.Vector3()).applyMatrix4(b.batch.matrixWorld);assert.ok(actual.distanceTo(expected)<2e-6,`${b.source.parent.name}: ${actual.distanceTo(expected)}`);}
   }
  }m.dispose();
 });
}
test('cadence follows actual displacement: walking, running, stopping against a wall and blending',()=>{
 const m=hero();frames(m,40,{velocity:{x:0,z:-2.6}});assert.equal(m.nativeMotion,'walk');assert.ok(m.actor.actions.walk.getEffectiveWeight()>.99);
 let largest=0,previous=m.jointPositions().leftKnee;for(let i=0;i<30;i++){frames(m,1,{velocity:{x:0,z:-7}});const p=m.jointPositions().leftKnee;largest=Math.max(largest,p.distanceTo(previous));previous=p;}assert.equal(m.nativeMotion,'run');assert.ok(largest<.28,'no pose pop on the walk/run blend');
 for(let i=0;i<60;i++)m.animate(2+i/60,true,0,0,0,1/60,{velocity:{x:0,z:0}});assert.equal(m.nativeMotion,'idle','holding movement into an obstacle cannot keep walking in place');
 const weights=Object.values(m.actor.actions).reduce((n,a)=>n+a.getEffectiveWeight(),0);assert.ok(Math.abs(weights-1)<1e-6);m.dispose();
});
test('backsteps preserve forward knee flexion and sidesteps keep the pelvis aligned while weapon IK stays exact',()=>{
 const m=hero();frames(m,40,{velocity:{x:0,z:2.4},aim:true});assert.equal(m.nativeMotion,'walkRifle');assert.ok(m.actor.actions.walkRifle.timeScale>0);assert.equal(m.locomotion.backward,true);
 frames(m,40,{velocity:{x:3,z:0},aim:true});assert.ok(Math.abs(m.locomotion.legYaw)<.15);assert.ok(m.locomotion.lateral>2.9);
 for(let weapon=0;weapon<WEAPON_FRAME.length;weapon++){m.setWeapon(weapon);frames(m,4,{velocity:{x:-2,z:-1},aim:true});m.root.updateMatrixWorld(true);for(let i=0;i<2;i++){const g=i===1?m.gun.userData.hand:WEAPON_FRAME[weapon].support||WEAPON_FRAME[weapon].dual?m.gun.userData.support:m.freeHand;const target=g.localToWorld(new T.Vector3(...GRIP.wrist));assert.ok(m.arms[i].hand.getWorldPosition(new T.Vector3()).distanceTo(target)<.001,`${weapon}/${i}: hands retain their real grips`);}}
 m.dispose();
});
test('crouching and zero-time animation never accumulate hip or IK corrections',()=>{
 const m=hero();frames(m,60,{crouched:true,aim:true});const before=pose(m),cloth=m.shadowUnit.cape.anchor.children[0].geometry.attributes.position.array.slice();
 for(let i=0;i<80;i++)m.animate(m._testTime,false,0,0,1,0,{crouched:true,aim:true});assert.deepEqual(pose(m),before);assert.deepEqual(m.shadowUnit.cape.anchor.children[0].geometry.attributes.position.array,cloth);m.dispose();
});
test('support blends in and releases without snapping the boot back to the native pose',()=>{
 const m=hero();let previous=null,contacts=0,continuous=0,drift=0,maxStep=0,previousLocal=null;
 for(let i=0;i<160;i++){
  frames(m,1,{velocity:{x:0,z:-2}});const p=m.feet[0].getWorldPosition(new T.Vector3()),local=m.root.worldToLocal(p.clone());if(previousLocal)maxStep=Math.max(maxStep,local.distanceTo(previousLocal));previousLocal=local;
  if(m.locomotion.planted[0]){contacts++;if(previous){continuous++;drift=Math.max(drift,previous.distanceTo(p));}previous=p;}else previous=null;
 }
 assert.ok(contacts>10&&continuous>5,'support is present across several strides');assert.ok(drift<.045,`soft support drift ${drift}`);assert.ok(maxStep<.065,'releasing the support cannot make an 18 cm jump');m.dispose();
});
test('jump apex flexes the knees and landing absorbs impact before recovering',()=>{
 const m=hero();frames(m,50,{aim:true});const standing=m.hips.position.y;
 frames(m,1,{airborne:true,verticalSpeed:6,aim:true});const rising=m.knees[0].quaternion.clone();
 frames(m,1,{airborne:true,verticalSpeed:0,aim:true});assert.ok(rising.angleTo(m.knees[0].quaternion)>.08);assert.ok(m.locomotion.planted.every(v=>!v));
 frames(m,1,{airborne:true,verticalSpeed:-6,aim:true});frames(m,1,{aim:true});assert.ok(m.locomotion.landing>.7);assert.ok(m.hips.position.y<standing-.025);
 frames(m,60,{aim:true});assert.ok(m.locomotion.landing<1e-5);assert.ok(Math.abs(m.hips.position.y-standing)<.025);m.dispose();
});
test('the flared, woven cape reacts to travel and turns while clearing the floor when crouched',()=>{
 const a=hero(),b=hero();const cape=a.shadowUnit.cape,other=b.shadowUnit.cape;
 for(let i=1;i<90;i++){cape.update(i/60,'run',.6,{velocity:7,lateral:2,turn:1.5});other.update(i/60,'run',.6);}
 const p=cape.anchor.children[0].geometry.attributes.position,q=other.anchor.children[0].geometry.attributes.position;assert.ok(Math.abs(p.getZ(1024)-q.getZ(1024))>.01);assert.ok(Math.abs(p.getX(1024)-q.getX(1024))>.005);
 frames(a,60,{crouched:true,aim:true});a.root.updateMatrixWorld(true);const mesh=cape.anchor.children[0],inv=a.root.matrixWorld.clone().invert();let floor=Infinity;for(let i=0;i<p.count;i++)floor=Math.min(floor,new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv).y);assert.ok(floor>.05);assert.ok(p.getX(1024)-p.getX(1000)>.5);
 a.dispose();b.dispose();
});

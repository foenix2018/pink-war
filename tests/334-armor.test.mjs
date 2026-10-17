import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createGlove} from '../dist/hands.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {rlhFirefighterData} from '../dist/rlh-firefighter.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
const setup=()=>{
 const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial({color:0x728499})]));
 const gun=()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:parent=>{const f=new T.Object3D();parent.add(f);return f;}});return {kit,gun};
};
test('combat bracers stay on the neutral forearm and leave every animated digit independent',()=>{
 const {kit}=setup();for(const mirror of [false,true]){
  const h=createGlove(kit.gloves,{mirror}),rig=h.userData.rig,source=h.userData.rlh;
  h.userData.extendForearm();const attached=h.userData.extendedForearm;
  h.userData.extendForearm();assert.equal(attached,h.userData.extendedForearm,'reconciliation must not duplicate tracked arm geometry');
  assert.equal(source.userData.armor,'AEGIS-II');assert.equal(h.userData.skeleton.bones.length,28);
  assert.ok(source.userData.materials.reflect.metalness>.75,'titanium plates retain a metal response');
  const armor=source.userData.parts.find(({part})=>part.key==='reflect').mesh;
  assert.ok(armor.geometry.boundingBox.min.y<-.20,'the new armour covers the actual forearm');
  let triangles=0;source.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<70000,'high detail glove remains a bounded shared mesh');
  for(const pose of [{relax:1},{trigger:1,grip:1},{reload:.8}]){
   h.userData.animate(pose,1);h.updateMatrixWorld(true);h.userData.skeleton.update();
   const palm=new T.Vector3(0,1,0).transformDirection(source.matrixWorld),arm=new T.Vector3(0,-1,0).transformDirection(rig.forearm.matrixWorld);
   assert.ok(palm.dot(arm)<-.99999,'armour cannot reintroduce a broken tracked wrist');
   assert.ok(armor.boundingBox.containsBox(new T.Box3().setFromPoints(Array.from({length:armor.geometry.attributes.position.count},(_,i)=>armor.getVertexPosition(i,new T.Vector3())))),'all posed forearm vertices stay inside their culling bounds');
  }
 }
});
test('soldier equipment replaces the air bottle without mutating RLH body, helmet, bones or clips',()=>{
 const data=rlhFirefighterData(),sourceCounts=data.parts.map(p=>p.geometry.index.count);
 for(const profile of CHARACTERS){
  const {kit,gun}=setup();kit.setPalette(profile.armor);const soldier=createSoldier(kit,gun,profile);
  assert.equal(soldier.armor.generation,2);assert.equal(soldier.nativeSkeleton.bones.length,34);
  assert.deepEqual(data.parts.map(p=>p.geometry.index.count),sourceCounts,'cached source meshes must survive the military conversion');
  assert.equal(soldier.actor.parts.find(m=>m.name==='RLH helmet').geometry,data.parts.find(p=>p.key==='helmet').geometry);
  assert.ok(soldier.actor.parts.reduce((n,m)=>n+(m.geometry.userData.removedRescuePackTriangles||0),0)>500,'external firefighter bottle is removed from the rendered skin');
  assert.equal(soldier.actor.parts.find(m=>m.name==='RLH reflect').material.color.getHex(),profile.armor.suit,'reflective rescue strips blend into the undersuit');
  assert.ok(soldier.actor.actions.rifle&&soldier.actor.actions.walkRifle);
  const skins=soldier.armor.parts,indices=new Set(skins.flatMap(m=>Array.from(m.geometry.attributes.skinIndex.array).filter((_,i)=>i%4===0)));
  for(const joint of ['LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'])assert.ok(indices.has(soldier.nativeSkeleton.bones.indexOf(soldier.actor.bone(joint))),'starter armour protects '+joint);
  assert.ok(soldier.batchCount<=16,'equipment retains the existing skin-batch budget');soldier.dispose();
 }
});

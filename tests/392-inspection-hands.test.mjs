import {buildGun} from '../dist/weapons.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {createGlove,GRIP} from '../dist/hands.js';
import {poseUnarmedForInspection} from '../dist/rlh-firefighter.js';
const direction=(root,native,axis)=>{const origin=root.worldToLocal(native.localToWorld(new T.Vector3())),end=root.worldToLocal(native.localToWorld(new T.Vector3(...axis)));return end.sub(origin).normalize();};
for(const hero of CHARACTERS)test(hero.id+': all five inspection stages keep thumbs forward, palms inward and fingers down',()=>{
 const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial()])),model=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),hero);
 const gloves=[createGlove(kit.gloves,{mirror:true,sleeve:false,arm:false}),createGlove(kit.gloves,{sleeve:false,arm:false})];model.root.add(...gloves);model.root.scale.setScalar(model.heightScale);model.root.rotation.y=.73;model.root.position.set(3,0,-2);
 const boneLengths=model.arms.map(a=>[a.fore.position.length(),a.hand.position.length()]);
 for(let stage=1;stage<=5;stage++){
  model.setLevel(stage);poseUnarmedForInspection(model,gloves);model.root.updateMatrixWorld(true);
  for(let side=0;side<2;side++){
   const glove=gloves[side],native=glove.userData.rlh,thumb=direction(model.root,native,[-1,0,0]),fingers=direction(model.root,native,[0,1,0]),palm=direction(model.root,native,[0,0,-1]);
   assert.ok(thumb.z<-.999,'thumb points towards the front, never away from the body');assert.ok(fingers.y<-.999,'fingers hang towards the ground');assert.ok(palm.x*(side===0?1:-1)>.999,'palm faces the corresponding thigh');
   assert.ok(native.scale.x>0,'the anatomical mesh is not reflected twice');assert.ok(native.getWorldPosition(new T.Vector3()).distanceTo(model.arms[side].hand.getWorldPosition(new T.Vector3()))<1e-6,'the real glove wrist meets the native hand joint');
   assert.deepEqual([model.arms[side].fore.position.length(),model.arms[side].hand.position.length()],boneLengths[side]);
  }
 }
 for(const g of gloves)g.userData.dispose();model.dispose();
});

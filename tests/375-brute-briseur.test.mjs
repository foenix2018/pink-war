import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory,ENEMY_PROFILES} from '../dist/enemies.js';
import {BRUTE_DESIGN} from '../dist/enemy-brute-armor.js';
import {enemyDurability,ROBOT_DURABILITY} from '../dist/enemy-combat.js';

const materials=()=>Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
const bounds=root=>{root.updateMatrixWorld(true);return new T.Box3().setFromObject(root,true);};

test('BRUTE Le Briseur uses authentic curved armour with graphite texture and separate scarlet reactor',()=>{
 const factory=createEnemyFactory(materials()),brute=factory.create(false,false,'brute'),regular=factory.create(false,false,'stalker');
 assert.match(ENEMY_PROFILES.brute.name,/BRISEUR/);
 assert.equal(brute.userData.bruteRevision,BRUTE_DESIGN.visualRevision);
 const armored=brute.children.filter(o=>o.isSkinnedMesh);
 assert.ok(armored.length>=5&&armored.length<=8,'body uses baked WebGPU skinned batches, not a mesh per bolt');
 const core=armored.find(m=>m.material.name==='BRUTE / scarlet thoracic reactor');
 assert.ok(core,'real separately shaded thoracic reactor should be present');
 assert.equal(core.material.isMeshBasicMaterial,true,'reactor glows without new point lights');
 assert.equal(core.material.color.getHex(),0x80d9e8,'reactor optics remain idle blue to preserve auditory alert feedback');
 brute.userData.animate(0,0,true,{awareness:'engaged'},0);
 assert.equal(core.material.color.getHex(),0xff180c,'reactor and visor become red when the Brute detects the player');
 assert.ok(brute.getObjectsByProperty('isLight',true).length===0);
 const b=bounds(brute),s=bounds(regular);
 assert.ok(b.max.x-b.min.x>s.max.x-s.min.x+.16,'shoulder silhouette must be appreciably wider');
 assert.ok(b.min.y>-.13,'enlarged siege boots must not fall beneath the ground plane');
 let triangles=0;
 for(const mesh of armored){
   triangles+=mesh.geometry.attributes.position.count/3;
   const skin=mesh.geometry.attributes.skinWeight;
   assert.ok(skin,'new hydraulic armour retains GPU skin weights');
   for(let i=0;i<skin.count;i++)assert.ok(Math.abs(skin.getX(i)+skin.getY(i)+skin.getZ(i)+skin.getW(i)-1)<1e-7);
 }
 assert.ok(triangles<11000,'Dell/Quest triangle budget: '+triangles);
 assert.ok(brute.userData.skeleton.bones.find(b=>b.name==='arm--1-wrist'));
});

test('BRUTE armour animates with the existing limb and head skeleton; other robots stay unchanged',()=>{
 const factory=createEnemyFactory(materials());
 const brute=factory.create(false,false,'brute'),stalker=factory.create(false,false,'stalker');
 const pose={form:'brute',awareness:'engaged',phase:1.1,x:0,z:0,speed:2.2,motionX:1,motionZ:0,alertedUntil:4};
 brute.userData.animate(0,0,true,pose,0);
 const torso=brute.userData.skeleton.bones.find(b=>b.name==='thorax');
 const leg=brute.userData.skeleton.bones.find(b=>b.name==='leg--1-hip');
 assert.ok(torso&&leg);
 const before=[leg.rotation.x,leg.rotation.z];
 brute.userData.animate(.5,1.1,true,pose,.5);
 assert.ok([leg.rotation.x,leg.rotation.z].some((v,i)=>Math.abs(v-before[i])>.0001),'leg articulation continues driving all armor');
 assert.equal(stalker.userData.bruteRevision,undefined,'stalker must not gain Briseur armour');
 assert.equal(brute.userData.humanoidReference.sourceBoneCount,34,'preserve RLH joint reference');
 assert.equal(ROBOT_DURABILITY.brute,340);
 assert.equal(enemyDurability(1,'brute'),340);
 assert.ok(enemyDurability(2,'brute')>340);
});

test('elite BRUTE retains a working optical sensor and a red reactor in the same graphics budget',()=>{
 const factory=createEnemyFactory(materials()),b=factory.create(true,true,'brute');
 b.userData.animate(0,0,true,{awareness:'engaged',phase:0},0);
 b.updateMatrixWorld(true);b.userData.skeleton.update();
 assert.equal(b.userData.optics.color.getHex(),0xff180c);
 assert.ok(b.children.some(m=>m.isSkinnedMesh&&m.material?.name==='BRUTE / scarlet thoracic reactor'));
 const joints=b.userData.skeleton.bones;
 assert.ok(joints.some(j=>j.name==='sensor-head'));
 assert.equal(b.userData.designRevision,'3.63.2','retain pre-existing shared revision contract');
});

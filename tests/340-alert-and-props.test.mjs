import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {enemyAlertState,ENEMY_OPTICS} from '../dist/enemy-alert.js';
import {propagateNoise} from '../dist/hearing.js';
import {segmentBox} from '../dist/game-logic.js';
import {parseKenneyGLB,MK3_WEAPON_ASSETS,applyBlasterEnvironment} from '../dist/kenney-blasters.js';
import {createLevel1Story,LEVEL1_STORY} from '../dist/level1-story.js';

const basic=c=>new T.MeshBasicMaterial({color:c}),metal=c=>new T.MeshStandardMaterial({color:c});
const mats=()=>({monster:metal(0x808080),monsterFace:metal(0x111111),rose:basic(0xff44aa),cyan:basic(0x66ddff),pale:basic(0xeeeeee),violet:basic(0xaa66ff)});
test('a heard step or shot turns only that robot’s optics red, then memory expires',()=>{
 const factory=createEnemyFactory(mats());
 for(const form of ['stalker','scuttler','brute','seer','probe','listener','bulwark']){
  const a=factory.create(false,true,form),b=factory.create(false,true,form);
  assert.notEqual(a.userData.optics,b.userData.optics);
  const e={id:1,form,x:0,z:-6,elevation:0,aimHeight:1.15,awareness:'patrol'};
  a.userData.animate(0,0,false,e,0);assert.equal(a.userData.optics.color.getHex(),ENEMY_OPTICS.idle);
  assert.deepEqual(propagateNoise([e],{x:0,y:1.2,z:0,radius:12,kind:'step'},[],segmentBox,1),[1]);
  a.userData.animate(1,0,false,e,1);assert.equal(a.userData.alertState,'alert');
  assert.equal(a.userData.optics.color.getHex(),ENEMY_OPTICS.alert);assert.equal(b.userData.optics.color.getHex(),ENEMY_OPTICS.idle);
  const sharedA=a.children.find(o=>o.isMesh&&o.material!==a.userData.optics),sharedB=b.children.find(o=>o.isMesh&&o.material!==b.userData.optics);
  assert.equal(sharedA.geometry,sharedB.geometry);assert.equal(sharedA.material,sharedB.material,'body colour does not become a private red material');
  e.awareness='engaged';a.userData.animate(2,0,false,e,2);assert.equal(a.userData.optics.color.getHex(),ENEMY_OPTICS.engaged);
  e.awareness='patrol';a.userData.animate(20,0,false,e,20);assert.equal(a.userData.optics.color.getHex(),ENEMY_OPTICS.idle);
 }
});
test('a noise stopped by walls does not reveal or alert a robot',()=>{
 const e={id:1,x:0,z:-11,elevation:0,awareness:'patrol'};
 const walls=[{x:0,z:-5,hx:4,hz:.5,y:0,height:4,surface:'concrete'}];
 assert.deepEqual(propagateNoise([e],{x:0,y:1.2,z:0,radius:12,kind:'step'},walls,segmentBox,2),[]);
 assert.equal(enemyAlertState(e,2),'idle');assert.equal(enemyAlertState({awareness:'engaged'},20),'engaged');
});
test('the probe iris is visible ahead of its dark gimbal, not buried under its own armour',()=>{
 const probe=createEnemyFactory(mats()).create(false,true,'probe');probe.updateMatrixWorld(true);probe.userData.skeleton.update();
 const ray=new T.Raycaster(new T.Vector3(0,.55,-3),new T.Vector3(0,0,1));
 const hit=ray.intersectObject(probe,true)[0];assert.ok(hit);assert.equal(hit.object.material,probe.userData.optics);
});
test('the five MKIII derivatives retain real bounded geometry and separated metallic surfaces',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/assets/pink-war/models.json',import.meta.url)));
 assert.equal(MK3_WEAPON_ASSETS.length,5);
 for(const file of MK3_WEAPON_ASSETS){
  const bytes=readFileSync(new URL('../dist/assets/pink-war/'+file,import.meta.url));
  const group=parseKenneyGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  let triangles=0,meshes=0;const materials=new Set();group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;materials.add(o.material.name);for(const value of o.geometry.attributes.position.array)assert.ok(Number.isFinite(value));}});
  assert.ok(meshes<=5,`${file} merged into five material batches`);assert.ok(triangles>2000&&triangles<8000,`${file} keeps a mobile-size mesh`);
  assert.ok(materials.has('PW_MK3_alloy')&&materials.has('PW_MK3_energy'));
  const environment=new T.Texture();applyBlasterEnvironment(group,environment);
  group.traverse(o=>{if(o.isMesh)assert.equal(o.material.envMap,environment,'machined metal receives the same reflections as the game equipment');});
  const item=manifest.find(i=>i.file===file);assert.ok(item.fittedPanels>=2);assert.equal(item.triangles,triangles);
 }
});
test('story props form four readable beats, bound rendering and react to sabotage',()=>{
 const parent=new T.Group(),m=Object.fromEntries(['steel','rust','dark','plaster'].map(k=>[k,metal(0x667777)]));
 const story=createLevel1Story(T,parent,m,{quality:'low'});
 assert.equal(LEVEL1_STORY.beats.length,4);assert.ok(story.stats().batches<=7);assert.ok(story.stats().triangles<20000);
 assert.equal(story.colliders.length,7);assert.ok(story.colliders.every(c=>c.campaign&&c.height<3));
 story.update({campaign:{sabotaged:true}});assert.equal(story.stats().sabotaged,true);story.dispose();assert.equal(parent.children.length,0);
});

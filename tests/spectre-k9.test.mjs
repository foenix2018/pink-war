import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {ArenaGame} from '../dist/game-logic.js';
import {specialistCombatOrder} from '../dist/enemy-specialists.js';
const materials=()=>Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
test('Spectre has its own articulated blades and deploys them when engaged',()=>{
 const actor=createEnemyFactory(materials()).create(false,true,'spectre');
 assert.equal(actor.userData.form,'spectre');
 const blades=actor.userData.skeleton.bones.filter(b=>b.name.startsWith('spectre-blade-'));
 assert.equal(blades.length,2);
 actor.userData.animate(0,0,false,{awareness:'patrol'},0);
 assert.ok(blades.every(b=>b.scale.y===.22));
 actor.userData.animate(1,0,false,{awareness:'engaged'},1);
 assert.ok(blades.every(b=>b.scale.y===1));
 assert.ok(!actor.userData.fieldRifle);
});
test('Spectre enters the arena as a fast melee hunter and cannot attack an unseen target',()=>{
 const game=new ArenaGame([],()=>.5);game.wave=4;game.spawned=7;game.toSpawn=1;game.spawnEnemy();
 const e=game.enemies.at(-1);assert.equal(e.form,'spectre');assert.equal(e.ranged,false);assert.ok(e.speed>2.7);
 e.awareness='engaged';const ctx={time:3,seen:true,threat:{x:e.x+10,y:1.25,z:e.z},obstacles:[],segmentBox:()=>null};
 const order=specialistCombatOrder(e,ctx);assert.equal(order.state,'spectre-stalk');assert.equal(order.canFire,true);
 assert.equal(specialistCombatOrder(e,{...ctx,seen:false}),null);
});
test('a Spectre at contact inflicts damage through the normal melee simulation',()=>{
 const game=new ArenaGame([],()=>.5);game.wave=4;game.spawned=7;game.toSpawn=1;game.spawnEnemy();const e=game.enemies[0];
 Object.assign(e,{x:0,z:-1.3,awareness:'engaged',lastSeenAt:0,alertedUntil:100,attackTimer:0,stunnedUntil:0});
 game.player.x=game.player.z=0;game.invulnerable=0;game.nextWave=999;const before=game.player.hp;
 for(let i=0;i<10;i++)game.step(.03,{});
 assert.ok(game.player.hp<before);
});
test('independent K9 rig keeps articulated geometry finite through pursuit animation',()=>{
 const actor=createEnemyFactory(materials()).create(false,false,'spectre');
 assert.equal(actor.userData.designRevision,'K9-independent-hunter-v2');
 const legs=actor.userData.legs;assert.ok(legs.every(l=>l.knee[2]>l.hip[2]+.1),'knees bend to the rear');
 let count=0;actor.traverse(m=>{if(m.isSkinnedMesh){count++;assert.ok(m.geometry.attributes.skinWeight);}});assert.ok(count<=8);
 for(let i=0;i<90;i++){
  actor.position.z=-i*.03;actor.userData.animate(i/30,0,true,{awareness:'engaged'},i/30);actor.updateMatrixWorld(true);
  for(const bone of actor.userData.skeleton.bones)assert.ok(bone.matrixWorld.elements.every(Number.isFinite));
 }
});

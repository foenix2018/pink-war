import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createFortifiedArena,FORTRESS_WALLS,FORTRESS_HEIGHT,FORTRESS_HALF} from '../dist/arena-fortress.js';
import {ArenaGame,COVER_WALLS} from '../dist/game-logic.js';
test('fortress closes all four arena edges at walking and jumping heights',()=>{
 const g=new ArenaGame([...FORTRESS_WALLS],()=>.5);
 for(const [x,z] of [[1,0],[-1,0],[0,1],[0,-1]])for(const y of [1.5,4,8,12])assert.ok(g.blocked({x:x*97,y,z:z*97},{x:x*105,y,z:z*105}));
 assert.ok(FORTRESS_HEIGHT>=12);assert.equal(FORTRESS_HALF,99.1);
});
test('fortified arena builds bounded shared geometry, physical cover and animated searchlights at both quality levels',()=>{
 for(const quality of ['low','high']){
  const scene=new T.Scene(),obstacles=[],a=createFortifiedArena(T,scene,obstacles,COVER_WALLS,{quality});
  assert.equal(a.stats.towers,16);assert.equal(a.stats.searchlights,16);assert.ok(a.stats.dynamicLights<=5);
  assert.ok(a.stats.triangles<350000);assert.ok(a.stats.meshes<260);
  for(const wall of FORTRESS_WALLS)assert.ok(obstacles.some(o=>o.perimeter&&o.x===wall.x&&o.z===wall.z&&o.height===14));
  for(const cover of COVER_WALLS)assert.ok(obstacles.some(o=>o.cover&&o.x===cover.x&&o.z===cover.z&&o.height===cover.height));
  a.update(1,{x:40,z:20});scene.updateMatrixWorld(true);
  scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});
 }
});
test('a player running into the physical wall is stopped before the arena clamp',()=>{
 for(const elevation of [0,5]){
  const g=new ArenaGame([...FORTRESS_WALLS],()=>.5);g.toSpawn=0;g.nextWave=999;g.invulnerable=999;
  Object.assign(g.player,{x:97,z:0,elevation,grounded:elevation===0,verticalSpeed:0});
  for(let i=0;i<150;i++)g.step(.016,{x:1,z:0,yaw:0,moveYaw:0});
  assert.ok(g.player.x<98.8,'wall blocks the body before the global 99.4m arena clamp');
 }
});

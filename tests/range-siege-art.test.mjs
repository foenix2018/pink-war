import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {createRangeSiegeArt} from '../dist/range-siege-art.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {segmentBox} from '../dist/game-logic.js';
import {RANGE_CONTROLS,RANGE_ARMORY_SLOTS,ShootingRangeGame} from '../dist/shooting-range.js';

test('new geometry leaves each firing lane and the rear armory approach clear',()=>{
 const obstacles=[],detail=createRangeSiegeArt(T,new T.Group(),{obstacles,low:true});
 for(const x of [-9.2,-4.6,0,4.6,9.2])for(const z of [7,-19,-40]){
  for(const box of obstacles)assert.equal(segmentBox({x,y:1.6,z:22},{x,y:1.5,z},box),null,'clear shot');
 }
 for(const c of RANGE_CONTROLS)for(const b of obstacles)assert.equal(segmentBox({x:c.x,y:1.3,z:c.z+1},{x:c.x,y:c.y,z:c.z},b),null,'reachable switch');
 for(const slot of RANGE_ARMORY_SLOTS)for(const b of obstacles)assert.equal(segmentBox({x:slot.x,y:slot.y,z:32},{x:slot.x,y:slot.y,z:slot.z},b),null,'clear armory selection');
 assert.ok(obstacles.some(b=>b.x===11.5&&b.z===22.9&&b.height===4.6),'outer portal collides');detail.dispose();
});
test('desktop and mobile use bounded shared geometry and no additional shadow lights',()=>{
 for(const low of [true,false]){
  const parent=new T.Group(),detail=createRangeSiegeArt(T,parent,{low});const stats=detail.stats();
  assert.ok(stats.triangles<80000);assert.ok(stats.meshes<55);
  let lights=0;detail.root.traverse(n=>{if(n.isLight){lights++;assert.equal(n.castShadow,false);}if(n.isInstancedMesh)assert.ok(n.boundingSphere?.radius>0);});assert.equal(lights,2);
  detail.update(40);detail.dispose();assert.equal(parent.children.length,0);
 }
});
test('disposal releases owned instancing buffers and leaves the shared metal texture intact',()=>{
 const map=new T.Texture(),parent=new T.Group(),detail=createRangeSiegeArt(T,parent,{metalMap:map});let sharedDisposed=0,freed=0,expected=0;
 map.addEventListener('dispose',()=>sharedDisposed++);detail.root.traverse(n=>{if(n.isInstancedMesh){expected++;n.addEventListener('dispose',()=>freed++);}});
 detail.dispose();detail.dispose();assert.equal(freed,expected);assert.equal(sharedDisposed,0);map.dispose();
});
test('the luminous silhouette follows the live target and disappears when its drill stops',()=>{
 const art=createShootingRangeArt(T,new T.Scene(),{low:true}),game=new ShootingRangeGame(art.obstacles,()=>.5);
 game.collectWeapon();for(let i=0;i<20;i++)game.step(.05,{});art.update(game);
 const outline=art.root.getObjectByName('Contour lumineux de la cible réelle');assert.ok(outline?.isLineLoop);assert.equal(outline.parent.rotation.x,0);
 game.targets[0].hit=true;game.targets[0].hitAt=game.time-.2;art.update(game);assert.ok(outline.parent.rotation.x<0);
 art.update(null);assert.equal(art.root.getObjectByName('Contour lumineux de la cible réelle'),undefined);art.dispose();
});

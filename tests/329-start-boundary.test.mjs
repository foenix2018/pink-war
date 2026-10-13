import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { boundaryStatus, createBoundaryFence } from '../dist/boundary-fence.js';
import { createHomeBattlefield } from '../dist/home-battlefield.js';
import { RoomGame } from '../dist/room-game.js';
const square=[{x:-2,y:0,z:-2},{x:2,y:0,z:-2},{x:2,y:0,z:2},{x:-2,y:0,z:2}];
test('red boundary respects concave real polygons, body clearance and crossing without moving the camera',()=>{
 const p={x:0,y:1.65,z:0};assert.equal(boundaryStatus(p,square,.25).strength,0);
 assert.ok(boundaryStatus({x:1.6,z:0},square,.25).strength>.7);assert.equal(boundaryStatus({x:1.8,z:0},square,.25).collision,true);
 assert.equal(boundaryStatus({x:2.1,z:0},square,.25).inside,false);assert.deepEqual(p,{x:0,y:1.65,z:0});
 const concave=[{x:0,y:0,z:0},{x:4,y:0,z:0},{x:4,y:0,z:4},{x:2,y:0,z:4},{x:2,y:0,z:2},{x:0,y:0,z:2}];assert.equal(boundaryStatus({x:1,z:3},concave).inside,false);
});
test('hip-height fence geometry stays low and bounded; red rails activate only near the real edge',()=>{
 const scene=new T.Scene(),f=createBoundaryFence(T,scene);f.setPolygon(square);assert.equal(f.stats().height,1.05);assert.ok(f.stats().instances<50);
 f.update({x:0,z:0},.25);assert.equal(f.stats().warning,false);f.update({x:1.8,z:0},.25);assert.equal(f.stats().warning,true);
 f.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(f.root);assert.ok(bounds.max.y<1.10&&bounds.min.y>=-.04);
 f.setPolygon([]);assert.equal(f.root.visible,false);f.dispose();assert.equal(scene.children.length,0);
});
test('real floor edges never form an invisible AI wall between distant portals and the player',()=>{
 const physical={hasFloor:()=>true,floorAt:()=>0,canStand:(p,r=.3)=>Math.abs(p.x)+r<2&&Math.abs(p.z)+r<2,canStandOnField:()=>true,trace:()=>null,findPoint:()=>({x:.8,y:0,z:0})};
 const f=createHomeBattlefield({room:physical});f.setRoom({minX:-2,maxX:2,minZ:-2,maxZ:2,floorY:0});const g=new RoomGame(f);assert.equal(g.start({x:0,y:1.65,z:0}),true);g.beginWave();g.time=3;assert.equal(g.spawnEnemy(),true);
 const e=g.enemies[0];e.ranged=false;e.attackTimer=999;for(let i=0;i<1800;i++)g.moveEnemies(.02);assert.ok(Math.hypot(e.x,e.z)<1.2);assert.equal(g.head.x,0);assert.equal(g.head.y,1.65);
});
test('starting a scenario waits for a distant breach instead of refusing a valid physical floor',()=>{
 let available=false;const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>20,findPoint:()=>available?{x:0,y:0,z:-18}:null,canStand:()=>true,trace:()=>null};
 const g=new RoomGame(room);assert.equal(g.start({x:0,y:1.65,z:0}),true);for(let i=0;i<90;i++)g.step(.02);assert.equal(g.roomPhase,'scan');assert.equal(g.wave,1);assert.equal(g.enemies.length,0);
 available=true;for(let i=0;i<60;i++)g.step(.02);assert.equal(g.roomPhase,'wave');assert.equal(g.activePortals[0].z,-18);assert.equal(g.wave,1);
});

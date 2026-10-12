import test from 'node:test';
import assert from 'node:assert/strict';
import { STAIRS, PLATFORMS, traversalSurfaces, createTraversalObstacles } from '../dist/world-layout.js';
import { walkSurfaceHeight } from '../dist/game-logic.js';

test('each terrace ramp connects to both landings smoothly without invisible gaps',()=>{
 for(const stair of STAIRS){
  const platform=PLATFORMS.find(p=>p.id===stair.platform);
  assert.ok(platform);
  assert.equal(stair.height,platform.height);
  assert.ok(stair.bottomZ>stair.topZ);
  assert.ok(stair.height/(stair.bottomZ-stair.topZ)<.4,'walking incline remains manageable');
  for(let i=0;i<=100;i++){
   const t=i/100,z=stair.bottomZ+(stair.topZ-stair.bottomZ)*t;
   const expected=stair.height*t;
   const exact=traversalSurfaces(stair.x,z,0).find(s=>s.id===stair.id);
   assert.ok(exact,stair.id+' traversal continuous at '+i);
   assert.ok(Math.abs(exact.height-expected)<1e-9,'matching continuous render surface');
   assert.ok(Math.abs(walkSurfaceHeight(stair.x,z,0)-expected)<.035,'locomotion tracks ramp');
  }
  assert.ok(Math.abs(walkSurfaceHeight(stair.x,stair.topZ-.01)-platform.height)<.001,'no step at terrace');
  assert.ok(Math.abs(walkSurfaceHeight(stair.x,stair.bottomZ+.01))<.001,'no invisible step at street');
 }
});

test('ramp safety obstacles follow slope without blocking accessible midpoint',()=>{
 const obstacles=createTraversalObstacles();
 for(const stair of STAIRS){
  const ramp=obstacles.filter(v=>v.traversal&&v.walkableSurface&&Math.abs(v.x-stair.x)<.01);
  assert.ok(ramp.length>5,'supports ranged attacks and interaction');
  assert.ok(ramp.every(v=>v.hz>0&&v.height>0&&v.height<.4));
 }
});

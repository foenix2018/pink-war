import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';
import {frameDelta,simulationSlices} from '../dist/frame-timing.js';
import {touchAnalogSprint} from '../dist/level2-input.js';
import {STAIRS,createTraversalObstacles} from '../dist/world-layout.js';

const createGame=(obstacles=[],traversal={routes:[],lifts:[],height:()=>0,surfaces:()=>[]})=>{
 const g=new ArenaGame(obstacles,()=>.5,traversal);g.nextWave=Infinity;g.toSpawn=0;g.player.x=g.player.z=0;return g;
};
const run=(input,hz,seconds=2)=>{
 const g=createGame();for(let i=0;i<hz*seconds;i++)g.step(frameDelta(1/hz),input);
 return {distance:Math.hypot(g.player.x,g.player.z),time:g.time};
};

test('touch travel keeps real-time speed at 10, 15, 20, 30 and 60 FPS',()=>{
 for(const input of [{z:-1,sprint:true},{z:-.4},{x:1},{z:1},{x:.7,z:-.7,sprint:true}]){
  const reference=run({...input,touchMoving:true},60);
  for(const hz of [10,15,20,30,60]){
   const actual=run({...input,touchMoving:true},hz);
   assert.ok(Math.abs(actual.distance-reference.distance)<1e-8,JSON.stringify({input,hz,...actual,reference}));
   assert.ok(Math.abs(actual.time-2)<1e-10);
  }
 }
});

test('touch matches the faster gamepad pace, with analog walking and no stacked boost',()=>{
 const full=run({z:-1,touchMoving:true},60).distance;
 assert.ok(Math.abs(full/run({z:-1},60).distance-1.25)<1e-10);
 assert.equal(full,run({z:-1,gamepadMoving:true},60).distance);
 assert.equal(full,run({z:-1,gamepadMoving:true,touchMoving:true},60).distance);
 assert.ok(Math.abs(run({z:-.4,touchMoving:true},60).distance/full-.4)<1e-10);
 assert.equal(touchAnalogSprint(0,-1),true);assert.equal(touchAnalogSprint(.65,-.65),true);
 assert.equal(touchAnalogSprint(0,-.4),false);assert.equal(touchAnalogSprint(0,0),false);
});

test('long background stalls remain bounded and Quest keeps its existing frame limit',()=>{
 assert.equal(frameDelta(30),.125);assert.equal(frameDelta(-1),0);
 assert.equal(frameDelta(NaN),0);assert.equal(frameDelta(Infinity),0);
 assert.equal(frameDelta(1/15,true),.04);
 const slices=simulationSlices(30);assert.equal(slices.count,3);assert.ok(slices.dt<=.05);
 const g=createGame();g.step(30,{z:-1,sprint:true,touchMoving:true});
 assert.equal(g.time,.125);assert.ok(Math.abs(g.player.z)<.75);
});

test('slow frames consume crouch and jump actions once across simulation slices',()=>{
 const g=createGame();g.drainEvents();g.step(frameDelta(1/10),{crouchToggle:true});
 assert.equal(g.player.crouched,true);assert.equal(g.drainEvents().filter(e=>e.type==='crouch').length,1);
 g.step(.1,{crouchToggle:true,jump:true});assert.equal(g.player.crouched,false);
 assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,1);
 g.step(.1,{jump:true});assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,0);
});

test('touch sprint at 10 and 15 FPS cannot cross a wall',()=>{
 const wall={x:0,z:-3,hx:4,hz:.2,height:3};
 for(const hz of [10,15]){
  const g=createGame([wall]);for(let i=0;i<hz*3;i++)g.step(frameDelta(1/hz),{z:-1,sprint:true,touchMoving:true});
  assert.ok(g.player.z>=wall.z+wall.hz+.55-.001);assert.ok(g.player.z<-1);
 }
});

test('touch sprint at 10 and 15 FPS reaches both arena stair landings',()=>{
 for(const hz of [10,15])for(const stair of STAIRS){
  const g=new ArenaGame(createTraversalObstacles());g.nextWave=Infinity;g.toSpawn=0;
  Object.assign(g.player,{x:stair.x,z:stair.bottomZ+.1});
  for(let i=0;i<hz*30&&g.player.z>stair.topZ-.3;i++)g.step(frameDelta(1/hz),{z:-1,sprint:true,touchMoving:true});
  assert.ok(g.player.z<=stair.topZ-.3,stair.id);assert.ok(Math.abs(g.player.elevation-stair.height)<.001,stair.id);assert.equal(g.player.grounded,true);
 }
});

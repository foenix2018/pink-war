import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';
import {createPinkWarsInput} from '../dist/level2-input.js';
import {createTouchOrbit} from '../dist/touch-orbit.js';
import {VRController} from '../dist/vr.js';
import {STAIRS,createTraversalObstacles} from '../dist/world-layout.js';

const pad=()=>({index:0,id:'DUALSHOCK 4',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});
const game=(obstacles=[])=>{const g=new ArenaGame(obstacles,()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;g.player.x=g.player.z=0;return g;};
const travel=(input,hz=60)=>{const g=game();for(let i=0;i<hz;i++)g.step(1/hz,input);return Math.hypot(g.player.x,g.player.z);};

test('gamepad walk, sprint, sidestep and crouch travel 25% faster at 30, 60 and 120 Hz',()=>{
 for(const input of [{z:-1},{z:-1,sprint:true},{x:1},{x:1,sprint:true},{x:1,z:-1},{z:1},{z:-1,crouchToggle:true}]){
  // Toggle crouch only once so the comparison measures a sustained crouch.
  const run=(gamepadMoving,hz)=>{const g=game();for(let i=0;i<hz;i++)g.step(1/hz,{...input,crouchToggle:!!input.crouchToggle&&i===0,gamepadMoving});return Math.hypot(g.player.x,g.player.z);};
  const baseline=run(false,60);
  for(const hz of [30,60,120])assert.ok(Math.abs(run(true,hz)/baseline-1.25)<1e-8,JSON.stringify({input,hz}));
 }
 assert.ok(Math.abs(travel({z:-1})-2.2*(1-(1-Math.exp(-8))/8))<1e-8);
});

test('the mission adapter boosts only an armed moving left stick, preserving analog control and focus safety',()=>{
 const input=createPinkWarsInput(),p=pad(),keys=new Set(['KeyW']);
 assert.equal(input.read(.016,keys,[p]).gamepadMoving,false);
 p.axes[0]=.1;p.axes[2]=.8;
 assert.equal(input.read(.016,keys,[p]).gamepadMoving,false,'right stick and left-stick drift do not speed up keyboard movement');
 p.axes=[0,-.5,0,0];let c=input.read(.016,new Set(),[p]);assert.equal(c.gamepadMoving,true);assert.equal(c.moveZ,-.5);
 const half=travel({z:c.moveZ,gamepadMoving:c.gamepadMoving});p.axes[1]=-1;c=input.read(.016,new Set(),[p]);
 assert.ok(Math.abs(travel({z:c.moveZ,gamepadMoving:c.gamepadMoving})/half-2)<1e-8);
 c=input.read(.016,new Set(),[p],{focused:false});assert.equal(c.gamepadMoving,false);assert.equal(c.moveZ,0);
 assert.equal(input.read(.016,new Set(),[p]).gamepadMoving,false,'reconnection requires neutral controls');
 assert.equal(input.read(.016,keys,[]).gamepadMoving,false);
});

test('arena and range recognize gamepad movement separately from camera input and clear it on pause',()=>{
 const p=pad(),original=Object.getOwnPropertyDescriptor(navigator,'getGamepads');let phase='playing';
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[p]});
 try{
  const controller=Object.assign(Object.create(VRController.prototype),{mode:'off',previous:new Map(),hooks:{phase:()=>phase,game:()=>({})}});
  controller.input();p.axes[2]=1;assert.equal(controller.input().gamepadMoving,false);
  p.axes[1]=-1;assert.equal(controller.input().gamepadMoving,true);
  phase='paused';const c=controller.input();assert.equal(c.gamepadMoving,false);assert.equal(c.z,0);
 }finally{if(original)Object.defineProperty(navigator,'getGamepads',original);else delete navigator.getGamepads;}
});

test('faster gamepad sprint still stops at a solid wall at low frame rates',()=>{
 for(const hz of [20,30,60]){
  const wall={x:0,z:-3,hx:4,hz:.2,height:3},g=game([wall]);
  for(let i=0;i<hz*2;i++)g.step(1/hz,{z:-1,sprint:true,gamepadMoving:true});
  assert.ok(g.player.z>=wall.z+wall.hz+.55-.001);assert.ok(g.player.z<-1);
 }
});

test('right-side touch fine swipes and vertical swipes gain 50%, and continuous orbit reaches 4.2 rad/s',()=>{
 const orbit=createTouchOrbit();orbit.start(1,100,100);
 assert.deepEqual(orbit.move(1,106,106),{fineX:9,deltaY:9});
 assert.deepEqual(orbit.move(2,109,109),{fineX:0,deltaY:0},'ignore another finger');
 orbit.move(1,212,106);assert.equal(orbit.speed,4.2);
 for(const hz of [30,60,120]){
  let angle=0;for(let i=0;i<hz;i++)angle+=orbit.step(1/hz);assert.ok(Math.abs(angle-4.2)<1e-10);
 }
 orbit.end(1);assert.equal(orbit.step(1/60),0);orbit.start(2,100,100);orbit.move(2,-12,100);assert.equal(orbit.speed,-4.2);
 orbit.reset();assert.equal(orbit.speed,0);
});

test('boosted controller sprint reaches the top of both arena stairways without falling through',()=>{
 for(const stair of STAIRS){
  const g=new ArenaGame(createTraversalObstacles());g.nextWave=Infinity;g.toSpawn=0;
  Object.assign(g.player,{x:stair.x,z:stair.bottomZ+.1});
  for(let i=0;i<1200&&g.player.z>stair.topZ-.3;i++)g.step(1/30,{z:-1,sprint:true,gamepadMoving:true});
  assert.ok(g.player.z<=stair.topZ-.3,stair.id);assert.ok(Math.abs(g.player.elevation-stair.height)<.001,stair.id);assert.equal(g.player.grounded,true);
 }
});

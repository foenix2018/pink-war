import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame,moveInArena,segmentBox} from '../dist/game-logic.js';
import {STAIRS,LIFTS,PLATFORMS,createTraversalObstacles,liftHeightAt} from '../dist/world-layout.js';
const advance=(g,seconds,input={})=>{for(let i=0;i<Math.round(seconds/.02);i++)g.step(.02,input);};
const create=()=>{const g=new ArenaGame(createTraversalObstacles());g.nextWave=999;return g;};

test('walking under an elevated deck does not teleport the player or enemies onto it',()=>{
  const g=create();Object.assign(g.player,{x:-48,z:39});advance(g,.1);
  assert.equal(g.player.elevation,0);assert.equal(g.player.grounded,true);
  g.enemies=[{id:1,x:-48,z:40,elevation:0,grounded:true,speed:0,radius:.8,attackTimer:999,hp:100,phase:0,awareness:'patrol',patrolTimer:5}];
  advance(g,.1);assert.equal(g.enemies[0].elevation,0);
});
test('both stairways carry players smoothly up and back down to street level',()=>{
  for(const stair of STAIRS){
    const g=create();Object.assign(g.player,{x:stair.x,z:stair.bottomZ+.1});
    const seconds=(stair.bottomZ-stair.topZ+1)/7;advance(g,seconds,{z:-1});
    assert.ok(Math.abs(g.player.elevation-stair.height)<.001,stair.id);
    assert.equal(g.player.grounded,true);
    advance(g,seconds,{z:1});assert.equal(g.player.elevation,0);
  }
});
test('automatic elevators carry a rider through a full cycle and update ballistic cover',()=>{
  for(const lift of LIFTS){
    const g=create();Object.assign(g.player,{x:lift.x,z:lift.z});advance(g,10.5);
    assert.equal(g.player.onLift,lift.id);assert.ok(Math.abs(g.player.elevation-lift.height)<.001);
    const collider=g.obstacles.find(b=>b.liftId===lift.id);
    assert.ok(Math.abs(collider.y+collider.height-lift.height)<.001);
    assert.notEqual(segmentBox({x:lift.x,y:lift.height+2,z:lift.z},{x:lift.x,y:0,z:lift.z},collider),null);
    const t=g.time;g.state='paused';advance(g,1);assert.equal(g.time,t);g.state='playing';
    advance(g,10);assert.equal(g.player.elevation,0);assert.equal(g.player.grounded,true);
    g.reset();assert.equal(collider.y+collider.height,0);
  }
});
test('a rider can walk from the lift onto its terrace, then falls naturally off an open edge',()=>{
  const g=create(),lift=LIFTS[0],deck=PLATFORMS[0];Object.assign(g.player,{x:lift.x,z:lift.z});advance(g,10.1);
  advance(g,1,{x:1});assert.equal(g.player.onLift,null);assert.equal(g.player.elevation,deck.height);
  Object.assign(g.player,{x:deck.x,z:deck.z-deck.hz+.1});g.step(.05,{z:-1});
  assert.equal(g.player.grounded,false);assert.ok(g.player.elevation>4);
  advance(g,1);assert.equal(g.player.elevation,0);assert.equal(g.player.grounded,true);
});
test('raised railings block at deck height and allow passage below',()=>{
  const rail={x:0,z:0,hx:2,hz:.08,y:4.8,height:1.1};
  const low={x:0,z:1,elevation:0},high={x:0,z:1,elevation:4.8};
  moveInArena(low,0,-2,.5,[rail]);assert.equal(low.z,-1);
  moveInArena(high,0,-2,.5,[rail]);assert.equal(high.z,.58);
});
test('hits report the physical material, face normal and weapon for coherent effects',()=>{
  const g=new ArenaGame([{x:0,z:18,hx:3,hz:.2,height:3,surface:'metal'}]);g.nextWave=999;
  g.shoot({x:0,y:1.2,z:22},{x:0,y:0,z:-1});advance(g,.1);
  const impact=g.drainEvents().find(e=>e.type==='impact');
  assert.equal(impact.surface,'metal');assert.equal(impact.weapon,'r9');assert.deepEqual(impact.normal,{x:0,y:0,z:1});
});
test('a jump below a low overhead deck hits its underside',()=>{
  const g=new ArenaGame([{x:0,z:22,hx:3,hz:3,y:2.2,height:.2,walkableSurface:true}]);g.nextWave=999;
  g.step(.02,{jump:true});let highest=g.player.elevation;
  for(let i=0;i<60;i++){g.step(.02);highest=Math.max(highest,g.player.elevation);}
  assert.ok(highest<=.401);assert.equal(g.player.grounded,true);
});
test('an alerted enemy descends by the stairs when the player retreats to the street',()=>{
  const g=create(),s=STAIRS[0];Object.assign(g.player,{x:s.x,z:s.bottomZ+4});
  const enemy={id:1,x:s.x,z:s.topZ-1,elevation:s.height,grounded:true,speed:3,radius:.8,attackTimer:999,hp:100,phase:0,aimHeight:1.2,awareness:'search',alertedUntil:100,lastKnownX:s.x,lastKnownZ:s.bottomZ+4,lastSeenAt:0,stunnedUntil:0,patrolTimer:99};
  g.enemies=[enemy];advance(g,12);
  assert.ok(enemy.z>s.bottomZ);assert.ok(enemy.elevation<.05);
});
test('switching renderer for WebXR preserves the lift rider and aligns the rebuilt colliders',()=>{
  const g=create(),lift=LIFTS[0];Object.assign(g.player,{x:lift.x,z:lift.z});advance(g,7);
  const elevation=g.player.elevation,time=g.time,obstacles=createTraversalObstacles();
  g.replaceObstacles(obstacles);
  assert.equal(g.player.elevation,elevation);assert.equal(g.time,time);assert.equal(g.obstacles,obstacles);
  const deck=obstacles.find(b=>b.liftId===lift.id);
  assert.ok(Math.abs(deck.y+deck.height-elevation)<.001);advance(g,4);
  assert.equal(g.player.elevation,lift.height);assert.equal(g.player.onLift,lift.id);
});

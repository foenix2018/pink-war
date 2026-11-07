import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {RANGE_TERMINALS,traceRangeTerminal} from '../dist/range-terminal-layout.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
const direction=(a,b)=>({x:b.x-a.x,y:b.y-a.y,z:b.z-a.z});

test('ray picking matches the tilted screen, rejects frame, reverse face and remote clicks',()=>{
 for(const t of RANGE_TERMINALS){
  const origin={x:t.x,y:1.65,z:t.z+1.4};
  assert.equal(traceRangeTerminal(origin,direction(origin,t))?.terminal.id,t.id);
  const corner={x:t.x+t.width*.49,y:t.y+t.height*.49*Math.cos(t.tilt),z:t.z+t.height*.49*Math.sin(t.tilt)};
  assert.equal(traceRangeTerminal(origin,direction(origin,corner))?.terminal.id,t.id);
  assert.equal(traceRangeTerminal(origin,direction(origin,{...t,x:t.x+t.width*.6})),null);
  const behind={x:t.x,y:t.y,z:t.z-1};assert.equal(traceRangeTerminal(behind,direction(behind,t)),null);
  const remote={...origin,z:t.z+8};assert.equal(traceRangeTerminal(remote,direction(remote,t)),null);
 }
 assert.equal(traceRangeTerminal({x:NaN,y:1,z:1},{x:0,y:0,z:-1}),null);
});
test('all five real terminals equip allowed weapons, pause the drill, and never score a screen touch',()=>{
 const art=createShootingRangeArt(T,new T.Scene(),{low:true});
 for(const t of RANGE_TERMINALS){
  const g=new ShootingRangeGame(art.obstacles,()=>.5,0,'lylu');Object.assign(g.player,{x:t.x-.3,z:t.z+1.2});
  const eye={x:g.player.x,y:1.6,z:g.player.z},hit=g.terminalTarget(eye,direction(eye,t));assert.equal(hit?.terminal.id,t.id);
  g.trainingActive=true;g.trainingElapsed=10;g.score=300;assert.equal(g.openRangeTerminal(t.id),true);g.step(.1,{});assert.equal(g.trainingElapsed,10);
  assert.equal(g.shoot(eye,{x:0,y:0,z:-1}),false);assert.equal(g.trainingShots,0);
  assert.equal(g.selectFromArmory(7),false,'GHJU-only weapon stays unavailable');assert.equal(g.selectFromArmory(2),true);assert.equal(g.weaponIndex,2);assert.equal(g.rangeArmoryOpen,false);assert.equal(g.rangeTerminalId,null);assert.equal(g.score,0);assert.equal(g.trainingActive,false);
 }
 art.dispose();
});
test('terminals obey partitions, reach, walk-away invalidation and the original F target switch',()=>{
 const art=createShootingRangeArt(T,new T.Scene(),{low:true}),g=new ShootingRangeGame(art.obstacles,()=>.5),t=RANGE_TERMINALS[2];
 assert.equal(g.getInteraction().kind,'range-control');g.collectWeapon();assert.equal(g.trainingActive,true);
 assert.equal(g.openRangeTerminal(t.id),true);g.player.z=29;assert.equal(g.canAccessRangeArmory(),false);assert.equal(g.selectFromArmory(2),false);g.closeRangeArmory();
 Object.assign(g.player,{x:t.x,z:t.z+1});assert.equal(g.getInteraction().kind,'range-terminal');g.collectWeapon();assert.equal(g.rangeArmoryOpen,true);g.closeRangeArmory();
 g.obstacles.push({x:t.x,z:t.z+.5,hx:1,hz:.1,y:0,height:3});assert.equal(g.openRangeTerminal(t.id),false);
 assert.equal(g.terminalTarget({x:t.x,y:1.6,z:t.z+1},direction({x:t.x,y:1.6,z:t.z+1},t)),null);art.dispose();
});
test('VR head pose and physical screen contact share the same access rules',()=>{
 const art=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(art.obstacles,()=>.5),t=RANGE_TERMINALS[3];
 g.setInteractionPosition({x:t.x,y:1.7,z:t.z+1});
 const touch={x:t.x,y:t.y-Math.sin(t.tilt)*.04,z:t.z+Math.cos(t.tilt)*.04};assert.equal(g.terminalHandTarget(touch)?.terminal.id,t.id);
 assert.equal(g.openRangeTerminal(t.id),true);assert.equal(g.selectFromArmory(6),true);
 assert.equal(g.terminalHandTarget({...touch,y:touch.y+2}),null);
 g.setInteractionPosition();assert.equal(g.openRangeTerminal(t.id),false);art.dispose();
});

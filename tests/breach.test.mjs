import test from 'node:test';
import assert from 'node:assert/strict';
import {BreachLevel1} from '../dist/breach-level1.js';
import {BREACH,breachSolids,breachTraversal} from '../dist/breach-layout.js';
const make=()=>new BreachLevel1(breachSolids(),()=>.5);
const step=g=>g.step(.01);
const visit=(g,p)=>Object.assign(g.player,{x:p.x,z:p.z,elevation:p.y||0});
test('six zones, arrival safe, two relays, guardian shield and finite extraction',()=>{
 const g=make();assert.equal(g.enemies.length,0);g.state='playing';visit(g,{x:0,z:59});step(g);assert.equal(g.stage,'hangar');assert.equal(g.enemies.length,2);
 g.enemies=[];step(g);assert.equal(g.stage,'passages');assert.equal(g.checkpoint,'passages');assert.equal(g.enemies.length,3);
 g.enemies=[];visit(g,{x:0,z:-3});step(g);assert.equal(g.stage,'courtyard');assert.equal(g.enemies.length,7);
 // Cannot operate relays while their patrol remains active.
 visit(g,BREACH.relays[0]);assert.equal(g.interact(),false);g.enemies=[];
 for(const p of BREACH.relays){visit(g,p);assert.equal(g.interact(),true);}
 assert.equal(g.stage,'reactor');const boss=g.enemies[0],hp=boss.hp;g.damageEnemy(boss,900,{x:boss.x,y:1,z:boss.z});assert.equal(boss.hp,hp);
 for(const p of BREACH.stabilizers){visit(g,p);assert.equal(g.interact(),true);}
 g.damageEnemy(boss,900,{x:boss.x,y:1,z:boss.z});assert.equal(g.enemies.length,0);step(g);assert.equal(g.stage,'extraction');
 visit(g,BREACH.exit);assert.equal(g.interact(),true);assert.equal(g.state,'won');assert.equal(g.completed,true);
});
test('checkpoints restore encounters; upper path uses a continuous slope',()=>{const g=make();g.resumeCheckpoint('reactor');assert.deepEqual(g.relays,[true,true]);assert.equal(g.enemies[0].guardian,true);assert.equal(g.player.z,-30);assert.equal(breachTraversal.height(15,29,0),2);assert.equal(breachTraversal.height(15,21,0),4);assert.equal(breachTraversal.height(15,10,0),4);});
test('every objective and secret has room for the player',()=>{const solids=breachSolids();for(const p of [BREACH.start,...BREACH.relays,...BREACH.stabilizers,BREACH.exit,{x:-23,z:30},{x:23,z:-64}])assert.ok(solids.every(b=>b.walkableSurface||b.y>1.8||Math.abs(p.x-b.x)>b.hx+.55||Math.abs(p.z-b.z)>b.hz+.55),JSON.stringify(p));});

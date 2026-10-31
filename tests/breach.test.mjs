import test from 'node:test';
import assert from 'node:assert/strict';
import {BreachLevel1} from '../dist/breach-level1.js';
import {BREACH,breachSolids,breachTraversal} from '../dist/breach-layout.js';
const make=()=>new BreachLevel1(breachSolids(),()=>.5);
const step=g=>g.step(.01);
const visit=(g,p)=>Object.assign(g.player,{x:p.x,z:p.z,elevation:p.y||0});
function emerge(g){g.time=Math.max(g.time,g.pendingSpawns[0].at+.01);g.emergeReinforcements();}
function clearWave(g){g.enemies=[];while(g.pendingSpawns.length){emerge(g);assert.equal(g.enemies.length,1);g.enemies=[];}}
test('six zones wait for portal waves, relays, guardian shield and finite extraction',()=>{
 const g=make();assert.equal(g.enemies.length,0);g.state='playing';visit(g,{x:0,z:59});step(g);assert.equal(g.stage,'hangar');assert.equal(g.enemies.length,0);assert.equal(g.pendingSpawns.length,2);
 step(g);assert.equal(g.stage,'hangar');clearWave(g);step(g);assert.equal(g.stage,'passages');assert.equal(g.checkpoint,'passages');assert.equal(g.pendingSpawns.length,3);
 clearWave(g);visit(g,{x:0,z:-3});step(g);assert.equal(g.stage,'courtyard');assert.equal(g.pendingSpawns.length,7);
 visit(g,BREACH.relays[0]);assert.equal(g.interact(),false);clearWave(g);
 for(const p of BREACH.relays){visit(g,p);assert.equal(g.interact(),true);}
 assert.equal(g.stage,'reactor');emerge(g);const boss=g.enemies[0],hp=boss.hp;g.damageEnemy(boss,24,{x:boss.x,y:1,z:boss.z});assert.ok(boss.hp<hp&&boss.hp>0);
 for(const p of BREACH.stabilizers){visit(g,p);assert.equal(g.interact(),true);}
 g.damageEnemy(boss,900,{x:boss.x,y:1,z:boss.z});assert.equal(g.enemies.length,0);step(g);assert.equal(g.stage,'extraction');
 visit(g,BREACH.exit);assert.equal(g.interact(),true);assert.equal(g.state,'won');assert.equal(g.completed,true);
});
test('checkpoints restore portal waves; upper path uses a continuous slope',()=>{const g=make();g.resumeCheckpoint('reactor');assert.deepEqual(g.relays,[true,true]);assert.equal(g.enemies.length,0);assert.equal(g.pendingSpawns[0].guardian,true);emerge(g);assert.equal(g.enemies[0].guardian,true);assert.equal(g.player.z,-30);assert.equal(breachTraversal.height(15,29,0),2);assert.equal(breachTraversal.height(15,21,0),4);assert.equal(breachTraversal.height(15,10,0),4);});
test('every objective and secret has room for the player',()=>{const solids=breachSolids();for(const p of [BREACH.start,...BREACH.relays,...BREACH.stabilizers,BREACH.exit,{x:-23,z:30},{x:23,z:-64}])assert.ok(solids.every(b=>b.walkableSurface||b.y>1.8||Math.abs(p.x-b.x)>b.hx+.55||Math.abs(p.z-b.z)>b.hz+.55),JSON.stringify(p));});
test('portal opens before emergence, remains remote, and does not spawn on an occupied mouth',()=>{const g=make();g.state='playing';visit(g,{x:0,z:59});step(g);const job=g.pendingSpawns[0],gate=job.site;assert.ok(g.activePortals.some(p=>p.id===gate.id));assert.ok(job.at-gate.openedAt>=1.2);assert.ok(Math.hypot(gate.x-g.player.x,gate.z-g.player.z)>=7);assert.ok(g.portalIsClear(gate));g.time=job.at-.01;g.emergeReinforcements();assert.equal(g.enemies.length,0);visit(g,gate);emerge(g);assert.equal(g.enemies.length,0);visit(g,{x:0,z:59});emerge(g);assert.equal(g.enemies.length,1);assert.equal(g.enemies[0].x,gate.x);assert.equal(g.enemies[0].z,gate.z);});

test('both playable heroes keep their current primary, secondary and reset loadouts in the bonus mission',()=>{
 const a=new BreachLevel1(breachSolids(),()=>.5,'lylu');assert.equal(a.characterId,'lylu');assert.equal(a.weapon.id,'m12');assert.ok(a.ownedWeapons.has(8));
 a.reset('ghju');assert.equal(a.characterId,'ghju');assert.equal(a.weapon.id,'duor9');assert.ok(a.ownedWeapons.has(8));assert.equal(a.stage,'arrival');
});

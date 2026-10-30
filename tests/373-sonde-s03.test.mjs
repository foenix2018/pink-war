import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {ArenaGame,traceEnemyHit} from '../dist/game-logic.js';
import {PROBE_ROTORS,probeRotorAt,probeFlightState,probeRotorMaxHp} from '../dist/probe-damage.js';
import {updateProbe} from '../dist/aerial-probes.js';

const mats=()=>Object.fromEntries(['monster','monsterFace','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
const close=(x,y)=>assert.ok(Math.abs(x-y)<1e-4,x+' != '+y);
function fixture(overrides={}){return {id:7,form:'probe',x:0,z:-12,elevation:2.7,yaw:0,hp:100,elite:false,tier:1,speed:3.6,aimHeight:.55,attackTimer:100,chargeRemaining:0,awareness:'engaged',rotorHp:[36,36,36,36],rotorDestroyed:[false,false,false,false],...overrides};}

test('S-03 rotors have four unique hitboxes at the model turbine positions',()=>{
 const e=fixture();assert.equal(PROBE_ROTORS.length,4);
 PROBE_ROTORS.forEach((r,i)=>{
  const p=probeRotorAt(e,i);close(p.x,r.x);close(p.z,e.z+r.z);
  const hit=traceEnemyHit({x:p.x,y:p.y,z:p.z+1},{x:p.x,y:p.y,z:p.z-1},e);
  assert.equal(hit?.zone,'rotor','rotor '+i);
 });
 const iris=traceEnemyHit({x:0,y:e.elevation+.55,z:e.z-1},{x:0,y:e.elevation+.55,z:e.z+.1},e);
 assert.equal(iris?.zone,'head');
});
test('S-03 permits an individual disabled motor, then starts a fall after the second',()=>{
 const g=new ArenaGame([],()=>.5);g.time=1;g.wave=1;
 const e=fixture();g.enemies=[e];const left=probeRotorAt(e,0),right=probeRotorAt(e,3);
 g.damageEnemy(e,24,left,'rotor',1);assert.equal(e.rotorDestroyed[0],false);
 g.damageEnemy(e,24,left,'rotor',1);assert.equal(e.rotorDestroyed[0],true);
 assert.equal(probeFlightState(e).lost,1);assert.equal(probeFlightState(e).speedScale,.68);
 assert.ok(e.hp>85,'external rotor damage should not kill the entire hull');
 const hp=e.hp;g.damageEnemy(e,24,left,'rotor',1);
 assert.ok(e.hp<hp);
 g.damageEnemy(e,40,right,'rotor',1);
 assert.equal(probeFlightState(e).lost,2);assert.equal(e.crashing,true);
 assert.equal(e.chargeRemaining,0);
 assert.equal(g.drainEvents().filter(v=>v.type==='probe-rotor-destroyed').length,2);
});
test('crashing S-03 cannot fire, eventually impacts and awards a normal kill',()=>{
 const g=new ArenaGame([],()=>.5);g.time=1;g.wave=1;
 const e=fixture({crashing:true,crashStartedAt:1,rotorDestroyed:[true,true,false,false],attackTimer:0});
 g.enemies=[e];g.nextWave=Infinity;g.toSpawn=0;g.player.x=40;g.player.z=40;
 let cycles=0;while(g.enemies.includes(e)&&cycles++<400){g.time+=.016;updateProbe(g,e,.016,()=>null);}
 assert.ok(!g.enemies.includes(e),'crashing probe must not hover indefinitely');
 const events=g.drainEvents();
 assert.equal(events.filter(v=>v.type==='probe-crash').length,1);
 assert.equal(events.filter(v=>v.type==='kill').length,1);
 assert.equal(events.filter(v=>v.type==='enemy-shot').length,0);
});
test('WebGPU probe rig retains four cheap independent motors with visible damage poses',()=>{
 const root=createEnemyFactory(mats()).create(false,true,'probe'),bones=root.userData.skeleton.bones;
 const fans=bones.filter(b=>b.name.startsWith('fan-'));assert.equal(fans.length,4);
 root.userData.animate(1,0,true,fixture({rotorDestroyed:[true,false,false,false]}),1);
 assert.ok(fans[0].scale.x<.05);assert.equal(fans[1].scale.x,1);
 assert.equal(root.getObjectsByProperty('isLight',true).length,0);
 let meshes=0;root.traverse(o=>{if(o.isMesh)meshes++;});
 assert.ok(meshes<=8,'drone remains batched for tablet/Quest: '+meshes);
 assert.ok(probeRotorMaxHp(10)>probeRotorMaxHp(1));
});

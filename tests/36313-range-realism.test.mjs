import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {ShootingRangeGame,RANGE_CONTROLS,targetPosition,traceTrainingTarget,TARGET_IMPULSE} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {createRangeMaterials} from '../dist/shooting-range-materials.js';
import {rangeHoldOffset} from '../dist/range-handling.js';
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)g.step(.05,{});};

test('the booth switch gates drills, stops in-flight scoring and preserves stage time across stop and resume',()=>{
 const g=new ShootingRangeGame([],()=>.5);advance(g,24);assert.equal(g.targets.length,0);assert.equal(g.trainingElapsed,0);
 assert.equal(g.getInteraction().kind,'range-control');assert.equal(g.collectWeapon(),true);advance(g,.8);assert.equal(g.targets.length,1);assert.ok(g.trainingElapsed<1);
 const t=g.targets[0],p=targetPosition(t,g.time);assert.equal(g.shoot({x:0,y:1.6,z:22},{x:p.x,y:p.y-1.6,z:p.z-22}),true);assert.equal(g.pendingHits.length,1);
 assert.equal(g.collectWeapon(),true);const elapsed=g.trainingElapsed;advance(g,30);assert.equal(g.trainingHits,0);assert.equal(g.pendingHits.length,0);assert.equal(g.targets.length,0);assert.equal(g.trainingElapsed,elapsed);
 g.player.z=30;assert.equal(g.getInteraction(),null);assert.equal(g.collectWeapon(),false);
 for(const c of RANGE_CONTROLS){Object.assign(g.player,{x:c.x-.8,z:c.z+1,elevation:0});assert.equal(g.collectWeapon(),true);assert.equal(g.collectWeapon(),true);}
 Object.assign(g.player,{x:0,z:22});g.collectWeapon();advance(g,.25);g.state='paused';const time=g.time;advance(g,10);assert.equal(g.time,time);assert.ok(Math.abs(g.trainingElapsed-elapsed-.25)<1e-8);
});

test('steel silhouette, rather than a generous circular hitbox, rejects empty neck/shoulder space and behind shots',()=>{
 const t={x:0,y:1.22,z:7,born:0,kind:'fixed-near',radius:.62,speed:1,range:0};const o={x:0,y:1.22,z:22};
 assert.ok(traceTrainingTarget(o,{x:0,y:0,z:-15},t,1));
 assert.ok(traceTrainingTarget(o,{x:0,y:.90*t.radius,z:-15},t,1));
 assert.equal(traceTrainingTarget(o,{x:.5*t.radius,y:.85*t.radius,z:-15},t,1),null);
 assert.equal(traceTrainingTarget(o,{x:0,y:0,z:15},t,1),null);
 assert.equal(traceTrainingTarget(o,{x:0,y:0,z:-15},{...t,readyAt:.45},.2),null,'folded plates cannot be scored before they rise');
});

test('M12 pellets mark the real contact points, recoil the plate harder than an R9, and stop target movement at contact',()=>{
 for(const weapon of [0,6]){
  const g=new ShootingRangeGame([],()=>.5,weapon);g.collectWeapon();advance(g,.8);const t=g.targets[0];Object.assign(t,{x:0,y:1.5,z:7});
  g.shoot({x:0,y:1.5,z:22},{x:0,y:0,z:-1});assert.equal(t.hit,false);advance(g,.05);assert.equal(t.hit,false);advance(g,.2);
  assert.equal(t.hit,true);assert.equal(t.impulse,TARGET_IMPULSE[g.weapon.id]);assert.ok(weapon===6?t.impacts.length>1&&t.impacts.length<=8:t.impacts.length===1);assert.equal(g.trainingAccuracy,100);assert.equal(g.ammo[weapon],g.weapon.capacity-1);
  const a=createShootingRangeArt(T,new T.Scene());a.update(g);const group=a.root.children.find(n=>n.name==='Cible escamotable '+t.id);assert.equal(group.children[0].children.filter(n=>n.geometry?.type==='RingGeometry').length,2+t.impacts.length);
  advance(g,.16);a.update(g);assert.ok(group.children[0].rotation.x<0);a.dispose();
 }
 const t={x:1,y:1.5,z:-20,born:0,hitAt:1,kind:'lateral',range:2,speed:1,phase:0};assert.deepEqual(targetPosition(t,1),targetPosition(t,9));
});

test('a hard partition blocks target scoring and live projectiles, while the front rail still permits a clear shot above it',()=>{
 const a=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(a.obstacles,()=>.5);g.collectWeapon();advance(g,.8);Object.assign(g.targets[0],{x:0,y:1.5,z:7});
 assert.equal(g.shoot({x:0,y:1.5,z:22},{x:0,y:0,z:-1}),true);advance(g,.3);assert.equal(g.trainingHits,1);
 const blocked=new ShootingRangeGame([{x:0,z:12,hx:1,hz:.1,y:0,height:3}],()=>.5);blocked.collectWeapon();advance(blocked,.8);Object.assign(blocked.targets[0],{x:0,y:1.5,z:7});blocked.shoot({x:0,y:1.5,z:22},{x:0,y:0,z:-1});advance(blocked,.4);assert.equal(blocked.trainingHits,0);a.dispose();
});

test('photo PBR maps stream once on range entry, mobile omits normals and pending loads are disposed safely',async()=>{
 const original=globalThis.document;globalThis.document={};
 try{for(const low of [false,true]){
  const jobs=[],textures=[],mats=Object.fromEntries(['floor','wall','rust','target'].map(n=>[n,new T.MeshStandardMaterial()]));
  const kit=createRangeMaterials({...T,TextureLoader:class{load(url,ok){jobs.push({url,ok});}}},mats,textures,{low});assert.equal(jobs.length,0);
  const ready=kit.enable();assert.equal(jobs.length,low?7:10);kit.enable();assert.equal(jobs.length,low?7:10);
  jobs.forEach(j=>j.ok(new T.Texture()));await ready;assert.equal(kit.stats().failed,0);assert.equal(kit.stats().loaded,low?7:10);assert.ok(mats.floor.map);assert.equal(!!mats.floor.normalMap,!low);kit.dispose();textures.forEach(t=>t.dispose());Object.values(mats).forEach(m=>m.dispose());
 }
 const jobs=[];let released=false;const kit=createRangeMaterials({...T,TextureLoader:class{load(url,ok){jobs.push(ok);}}},{floor:{},wall:{},rust:{},target:{}},[]);const ready=kit.enable();kit.dispose();for(const cb of jobs)cb({dispose(){released=true;}});await ready;assert.equal(released,true);assert.equal(kit.stats().loaded,0);
 }finally{globalThis.document=original;}
});

test('breathing and movement affect flat practice aim without target seeking, and braced aim steadies the same sway',()=>{
 const hip=rangeHoldOffset(3.2,{moving:true}),ads=rangeHoldOffset(3.2,{moving:true,aiming:true,crouched:true});assert.ok(Math.abs(ads.pitch)<Math.abs(hip.pitch));assert.ok(Math.abs(ads.yaw)<Math.abs(hip.yaw));assert.ok(Math.abs(hip.pitch)<.005);assert.ok(rangeHoldOffset(0,{heat:1}).recoilScale>rangeHoldOffset(0,{heat:0}).recoilScale);
});

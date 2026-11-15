import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame,WEAPONS,starterWeaponIndex,weaponCycleOrder} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {createIEMWeapon,IEM_FRAME} from '../dist/voltis-iem.js';
import {ShootingRangeGame,RANGE_WEAPON_SLOTS,RANGE_ARMORY,RANGE_ARMORY_SLOTS,traceRangeArmory} from '../dist/shooting-range.js';
import {createIEMEffects} from '../dist/iem-fx.js';
import {createEnemyFactory} from '../dist/enemies.js';

const flat={routes:[],lifts:[],height:()=>0,surfaces:()=>[]};
const setup=(obstacles=[])=>{const g=new ArenaGame(obstacles,()=>.4,flat);g.configureWeaponAccess({mode:'arena'});g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;Object.assign(g.player,{x:0,z:0});g.wave=1;g.spawned=1;g.activePortals=[{x:0,z:-5,openedAt:0}];g.spawnEnemy();const e=g.enemies[0];Object.assign(e,{x:0,z:-5,elevation:0,form:'synth',hp:100,maxHp:100,radius:.5,aimHeight:1.2,hitRadius:.5,tier:1,elite:false,grounded:true,ranged:true,yaw:0,attackTimer:1});g.weaponIndex=9;g.cooldown=0;return {g,e};};
const run=(g,seconds)=>{for(let t=0;t<seconds-1e-8;t+=.01)g.step(.01,{});};

test('IEM is an additional stable slot; both heroes keep their starters and get it immediately in arena and range',()=>{
 assert.deepEqual(WEAPONS.slice(0,9).map(w=>w.id),['r9','bloom','lance','thorn','nova','aurora','m12','duor9','vortex']);assert.equal(WEAPONS[9].name,'VOLTIS IEM');assert.equal(WEAPONS[9].level,10);
 for(const hero of ['ghju','lylu']){
  const g=new ArenaGame([],()=>.5,flat,hero);g.configureWeaponAccess({mode:'arena'});assert.ok(g.ownedWeapons.has(9));assert.equal(g.weaponIndex,starterWeaponIndex(hero));assert.ok(g.selectWeapon(9));g.reset(hero);assert.ok(g.ownedWeapons.has(9));assert.equal(weaponCycleOrder(g.ownedWeapons,hero).at(-1),9);
  const range=new ShootingRangeGame([],()=>.5,0,hero);assert.ok(range.rangeWeapons.includes(9));assert.ok(range.selectWeapon(9));assert.equal(range.ammo[9],6);
 }
});

test('campaign level 10 gates selection, shooting, pickups and old inventories independently of encounter waves',()=>{
 for(let level=1;level<10;level++){
  const g=new ArenaGame([]);g.configureWeaponAccess({mode:'campaign',level});g.wave=30;
  assert.equal(g.isWeaponAvailable(9),false);assert.equal(g.ownedWeapons.has(9),false);g.offerWeapon(9);assert.equal(g.weaponOffers.some(o=>o.index===9),false);
  g.ownedWeapons.add(9);assert.equal(g.selectWeapon(9),false);assert.equal(g.unlockedWeapons.some(w=>w.id==='iem'),false);
  g.weaponIndex=9;g.cooldown=0;assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1}),false);
 }
 const first=new CampaignLevel1([]);assert.equal(first.isWeaponAvailable(9),false);
 for(const level of [10,11,20]){const g=new ArenaGame([]);g.configureWeaponAccess({mode:'campaign',level});assert.ok(g.selectWeapon(9));g.reset();assert.ok(g.ownedWeapons.has(9));}
});

test('a real IEM projectile deals minor damage and freezes movement and attacks for 3 seconds, then the enemy moves again',()=>{
 const {g,e}=setup();assert.equal(g.shoot({x:0,y:1.1,z:0},{x:0,y:0,z:-1}),true);
 for(let i=0;i<30&&!e.iemUntil;i++)g.step(.01,{});
 assert.equal(e.hp,92);assert.ok(Math.abs(e.iemUntil-g.time-3)<1e-8);const frozen={x:e.x,z:e.z,yaw:e.yaw};g.drainEvents();run(g,2.9);
 assert.deepEqual({x:e.x,z:e.z,yaw:e.yaw},frozen);assert.equal(e.chargeProgress,0);assert.equal(g.drainEvents().some(e=>e.type==='enemy-shot'),false);
 run(g,.3);assert.ok(Math.hypot(e.x-frozen.x,e.z-frozen.z)>.001);
});

test('another pulse refreshes the stun instead of adding durations and does not turn headshots into heavy damage',()=>{
 const {g,e}=setup();Object.assign(e,{form:'sentinel'});g.damageEnemy(e,8,{x:0,y:1,z:-5},'head',5,{x:0,z:0,elevation:0,weapon:'iem'});assert.equal(e.hp,92);
 run(g,1);g.damageEnemy(e,8,{x:0,y:1,z:-5},'torso',1,{x:0,z:0,elevation:0,weapon:'iem'});assert.equal(e.hp,84);assert.ok(Math.abs(e.iemUntil-g.time-3)<1e-8);
});

test('solid walls stop both IEM damage and immobilisation',()=>{
 const {g,e}=setup([{x:0,z:-2,hx:3,hz:.25,height:3}]);g.shoot({x:0,y:1.1,z:0},{x:0,y:0,z:-1});run(g,.4);
 assert.equal(e.hp,100);assert.equal(e.iemUntil,undefined);assert.equal(g.drainEvents().some(e=>e.type==='iem-stun'),false);
});

test('the ninth physical rack bay fits the cabinet and is selectable by a ray',()=>{
 assert.equal(RANGE_WEAPON_SLOTS.length,9);const bay=RANGE_ARMORY_SLOTS.find(s=>s.index===9);assert.ok(bay);assert.ok(bay.x+bay.width/2<RANGE_ARMORY.width/2);
 const hit=traceRangeArmory({x:bay.x,y:bay.y,z:RANGE_ARMORY.frontZ-1},{x:0,y:0,z:1});assert.equal(hit.index,9);
});

test('the accepted long model is in the common palm/barrel frame with independent per-gun energy glow',()=>{
 const a=createIEMWeapon(T),b=createIEMWeapon(T),box=new T.Box3().setFromObject(a),size=box.getSize(new T.Vector3());
 assert.ok(Math.abs(size.z-1.235)<.01);assert.ok(size.z/size.y>4);assert.ok(Math.abs(box.min.z-IEM_FRAME.muzzle[2])<.01);assert.ok(box.max.z>.45);
 assert.notEqual(a,b);a.userData.updatePulse(1);const glowing=r=>r.children.filter(m=>m.material.emissive?.getHex()===0x42ddff).map(m=>m.material.emissiveIntensity);
 assert.ok(glowing(a).every(v=>v>5));assert.ok(glowing(b).every(v=>v<1));
});

test('electrical immobilisation renders a bounded pair of real instanced 3D arc batches and clears on expiry',()=>{
 const scene=new T.Scene(),fx=createIEMEffects(T,scene),enemies=Array.from({length:20},(_,id)=>({id,hp:100,x:id,z:0,elevation:0,aimHeight:1.2,radius:.5,iemUntil:3}));
 fx.update({time:1,enemies});assert.equal(fx.stats().targets,6);assert.ok(fx.stats().segments>0&&fx.stats().segments<=192);assert.equal(fx.stats().draws,2);
 fx.update({time:4,enemies});assert.equal(fx.stats().segments,0);fx.dispose();assert.equal(scene.children.length,0);
});


test('a chapter-10 checkpoint or local inventory reset cannot lose the entitlement',()=>{
 const g=new ArenaGame([]);g.configureWeaponAccess({mode:'campaign',level:10});g.ownedWeapons=new Set([0]);g.nextWave=Infinity;g.step(.01,{});assert.ok(g.ownedWeapons.has(9));
});

test('every enemy chassis retains its articulated pose during IEM and resumes animation afterwards',()=>{
 const mats=Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
 const factory=createEnemyFactory(mats,{detail:'low'});
 const pose=root=>{const result=[];const save=o=>result.push(...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray());root.traverse(save);for(const bone of root.userData.skeleton?.bones||[])save(bone);return result;};
 for(const form of ['synth','stalker','spectre','brute','listener','seer','bulwark','scuttler','probe']){
  const actor=factory.create(false,false,form),entity={form,hp:100,x:0,z:0,awareness:'chase',iemUntil:0,motionX:.5,motionZ:1};
  actor.userData.animate(.2,.3,true,entity,.2);const before=pose(actor);
  entity.iemUntil=3;actor.userData.animate(1.2,.3,true,entity,1.2);assert.deepEqual(pose(actor),before,form+' freezes');
  actor.position.x=entity.x=.2;actor.userData.animate(4.2,.3,true,entity,4.2);actor.position.x=0;assert.notDeepEqual(pose(actor),before,form+' resumes');
 }
});

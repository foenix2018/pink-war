import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame,WEAPONS} from '../dist/game-logic.js';
import {ShootingRangeGame,RANGE_WEAPON_SLOTS,RANGE_ARMORY_SLOTS,traceRangeArmory} from '../dist/shooting-range.js';
import {GROZA40_FRAME,GROZA40_GRENADE_COOLDOWN,createGroza40} from '../dist/groza40.js';
test('GROZA–40 preserves the prior weapon indexes',()=>{
 assert.equal(WEAPONS[9].id,'iem');assert.equal(WEAPONS[10].id,'groza40');
 assert.equal(WEAPONS[10].capacity,30);assert.equal(GROZA40_GRENADE_COOLDOWN,30);
 assert.equal(createGroza40().userData.frame,GROZA40_FRAME);
});
test('Campaign restriction is enforced before and unlocked from chapter 3',()=>{
 const g=new ArenaGame([],()=>.5);g.configureWeaponAccess({mode:'campaign',level:2});
 assert.equal(g.isWeaponAvailable(10),false);assert.equal(g.ownedWeapons.has(10),false);
 g.configureWeaponAccess({mode:'campaign',level:3});
 assert.equal(g.isWeaponAvailable(10),true);assert.equal(g.selectWeapon(10),true);
 g.configureWeaponAccess({mode:'campaign',level:4});assert.equal(g.ownedWeapons.has(10),true);
});
test('Arena grenade launcher is physical and blocked for full 30-second cooldown',()=>{
 const g=new ArenaGame([],()=>.5);g.configureWeaponAccess({mode:'arena',level:1});
 assert.equal(g.selectWeapon(10),true);
 const origin={x:0,y:1.5,z:22},dir={x:0,y:0,z:-1};
 assert.equal(g.throwCharge(origin,dir),true);assert.equal(g.grenade40ReadyAt,30);
 assert.equal(g.bullets[0].splash,3.5);assert.equal(g.throwCharge(origin,dir),false);
 g.time=29.99;assert.equal(g.throwCharge(origin,dir),false);
 g.time=30;assert.equal(g.throwCharge(origin,dir),true);
 const before=g.bullets.length;g.cooldown=0;
 assert.equal(g.shoot(origin,dir),true);assert.equal(g.bullets.length,before+1);
 assert.equal(g.bullets.at(-1).splash,0);
});
test('stand has ten real weapon locations including the Groza bay',()=>{
 const g=new ShootingRangeGame([],()=>.5);
 assert.equal(RANGE_WEAPON_SLOTS.length,10);assert.equal(RANGE_ARMORY_SLOTS.length,10);
 assert.ok(g.rangeWeapons.includes(10));
 const slot=RANGE_ARMORY_SLOTS.find(s=>s.index===10);
 assert.equal(traceRangeArmory({x:slot.x,y:slot.y,z:slot.z-1},{x:0,y:0,z:1})?.index,10);
 assert.equal(g.selectWeapon(10),true);
});

test('range 40 mm uses an independent timer, not the classic charge stock',()=>{
 const g=new ShootingRangeGame([],()=>.5);g.selectWeapon(10);g.charges=0;
 const origin={x:0,y:1.6,z:22},dir={x:0,y:0,z:-1};
 assert.equal(g.throwCharge(origin,dir),true);assert.equal(g.charges,0);
 assert.equal(g.trainingShots,1);assert.equal(g.throwCharge(origin,dir),false);
 g.time=30;assert.equal(g.throwCharge(origin,dir),true);assert.equal(g.trainingShots,2);
});

test('GROZA–40 survives each campaign mission reset and checkpoint from chapter 3 through 6',async()=>{
 const {createM03Mission}=await import('../dist/m03-mission.js');
 const {createM04Mission}=await import('../dist/m04-mission.js');
 const {createLigne9Mission}=await import('../dist/ligne9-mission.js');
 const {createM06Mission}=await import('../dist/m06-mission.js');
 const missions=[
   [3,({game,characterId})=>createM03Mission({game,characterId})],
   [4,({game,characterId})=>createM04Mission({game,characterId})],
   [5,({game,characterId})=>createLigne9Mission({game,characterId})],
   [6,({game,characterId})=>createM06Mission({game,characterId})]
 ];
 for(const characterId of ['ghju','lylu'])for(const [level,create] of missions){
   const game=new ArenaGame([],()=>.5,null,characterId);
   game.configureWeaponAccess({mode:'campaign',level});
   const mission=create({game,characterId});
   mission.start();
   assert.equal(game.ownedWeapons.has(10),true,`chapter ${level}: startup unlock for ${characterId}`);
   assert.equal(game.selectWeapon(10),true,`chapter ${level}: equipped after startup`);
   assert.equal(game.weapon.id,'groza40');
   mission.restoreCheckpoint();
   assert.equal(game.ownedWeapons.has(10),true,`chapter ${level}: checkpoint unlock for ${characterId}`);
   assert.equal(game.selectWeapon(10),true,`chapter ${level}: equipped after checkpoint`);
   assert.equal(game.weapon.id,'groza40');
 }
});

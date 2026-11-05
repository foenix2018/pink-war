import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame,WEAPONS,levelCount,MAX_ACTIVE_ENEMIES} from '../dist/game-logic.js';
import {FORTRESS_WALLS} from '../dist/arena-fortress.js';
import {ARENA_TURRETS,TURRET_HP,TURRET_CLOSE_RANGE,updateArenaTurrets} from '../dist/arena-defense.js';
import {detonateCharge} from '../dist/armor-combat.js';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {sightPoint} from '../dist/sight-line.js';

function fixture(){
 const game=new ArenaGame([...FORTRESS_WALLS],()=>.5);game.nextWave=999;
 game.turrets=[{...game.turrets[0],x:0,z:0}];
 return {game,t:game.turrets[0]};
}
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds/.02);i++)g.step(.02);};
function fire(g,weapon,distance){
 g.weaponIndex=WEAPONS.findIndex(w=>w.id===weapon);g.cooldown=0;
 Object.assign(g.player,{x:0,z:distance});
 assert.equal(g.shoot({x:0,y:1.75,z:distance},{x:0,y:0,z:-1}),true);
}

test('fortress survival enables eight sentries, while other maps keep their existing combat',()=>{
 const g=new ArenaGame([...FORTRESS_WALLS]);assert.equal(g.fortressArena,true);
 assert.equal(g.turrets.length,8);assert.deepEqual(g.turrets.map(t=>[t.x,t.z]),ARENA_TURRETS.map(t=>[t.x,t.z]));
 assert.equal(new ArenaGame().turrets.length,0);
 class Mission extends ArenaGame{}assert.equal(new Mission([...FORTRESS_WALLS]).turrets.length,0);
});
test('all long-range firearms except the sniper leave the armour intact, including rail and NOVA',()=>{
 for(const weapon of WEAPONS.filter(w=>!w.melee&&w.id!=='lance')){
  const {game,t}=fixture();fire(game,weapon.id,20);advance(game,1);
  assert.equal(t.hp,TURRET_HP,weapon.id);assert.ok(game.events.some(e=>e.type==='turret-armoured'),weapon.id);
 }
});
test('two sniper shots destroy a sentry, score once and preserve the wreck until a new run',()=>{
 const {game,t}=fixture();fire(game,'lance',30);advance(game,.2);assert.equal(t.hp,160);
 fire(game,'lance',30);advance(game,.2);assert.equal(t.hp,0);assert.equal(game.score,300);
 assert.equal(game.damageDefenseTurret(t,100,{weapon:'lance'}),false);assert.equal(game.score,300);
 game.beginWave();assert.equal(t.hp,0,'next wave does not respawn a wreck');
 game.reset();assert.equal(game.turrets.length,8);assert.ok(game.turrets.every(t=>t.hp===TURRET_HP));
});
test('ordinary weapons damage the turret only within five metres, using the shot origin',()=>{
 const {game,t}=fixture();fire(game,'r9',TURRET_CLOSE_RANGE);advance(game,.1);assert.equal(t.hp,296);
 fire(game,'r9',5.1);advance(game,.1);assert.equal(t.hp,296);
 fire(game,'r9',20);game.player.z=2;advance(game,.3);assert.equal(t.hp,296,'moving close after firing cannot unlock a remote shot');
 fire(game,'r9',4);game.player.z=25;advance(game,.1);assert.equal(t.hp,272,'moving away cannot cancel a valid close shot');
});
test('the closest physical surface absorbs the projectile before a sentry behind cover',()=>{
 const {game,t}=fixture();game.replaceObstacles([...FORTRESS_WALLS,{x:0,z:8,hx:4,hz:.4,height:3}]);
 fire(game,'lance',20);advance(game,.2);assert.equal(t.hp,TURRET_HP);assert.equal(game.bullets.length,0);
});
test('the sight converges on a live sentry, respects cover, and ignores a destroyed head',()=>{
 const {game,t}=fixture(),eye=new T.Vector3(0,1.75,20),forward=new T.Vector3(0,0,-1);
 assert.ok(Math.abs(sightPoint(T,eye,forward,{turrets:game.turrets}).z-1.2)<1e-8);
 const wall={x:0,z:8,hx:3,hz:.5,height:3};
 assert.equal(sightPoint(T,eye,forward,{turrets:game.turrets,obstacles:[wall]}).z,8.5);
 t.hp=0;assert.equal(sightPoint(T,eye,forward,{turrets:game.turrets}).z,-140);
});
test('close melee and blade swings damage sentries through the normal combat paths',()=>{
 const {game,t}=fixture();Object.assign(game.player,{x:0,z:2.8});
 assert.equal(game.melee({x:0,z:-1}),true);assert.equal(t.hp,240);
 game.weaponIndex=5;game.bladeSlashAt=game.time;
 game.updateBlade({base:{x:0,y:1.5,z:1.7},tip:{x:0,y:1.5,z:.5},extension:1},.016);
 assert.equal(t.hp,85);
});
test('a remote charge or companion cannot bypass the armour; a charge thrown close can',()=>{
 const {game,t}=fixture();
 assert.equal(game.damageDefenseTurret(t,1000,{weapon:'lance',source:{x:0,y:1.75,z:2,companion:true}}),false);
 detonateCharge(game,{x:0,y:1,z:1.4,originX:0,originY:1.5,originZ:15});assert.equal(t.hp,TURRET_HP);
 detonateCharge(game,{x:0,y:1,z:1.4,originX:0,originY:1.5,originZ:4});assert.equal(t.hp,0);
});
test('sentries warn, hold a dodgeable target, fire, respect cover and stop during intermission',()=>{
 const {game,t}=fixture();game.wave=1;game.nextWave=-1;game.time=4;game.player.z=10;
 updateArenaTurrets(game);assert.equal(t.lockAt,4.95);assert.equal(game.bullets.length,0);
 game.player.x=4;game.time=5;updateArenaTurrets(game);
 assert.equal(game.bullets.length,1);assert.equal(game.bullets[0].vx,0,'held aim allows the player to strafe');
 game.time=8;game.obstacles.push({x:2,z:5,hx:4,hz:.3,height:3});updateArenaTurrets(game);assert.equal(t.lockAt,null);
 game.obstacles=[...FORTRESS_WALLS];updateArenaTurrets(game);assert.notEqual(t.lockAt,null);
 game.nextWave=5;updateArenaTurrets(game);assert.equal(t.lockAt,null);
 t.hp=0;game.nextWave=-1;game.time=20;const count=game.bullets.length;updateArenaTurrets(game);assert.equal(game.bullets.length,count);
});
test('only two visible sentries can acquire the player simultaneously',()=>{
 const {game,t}=fixture();game.turrets=[t,{...t,id:'b',x:4},{...t,id:'c',x:-4}];
 game.wave=1;game.nextWave=-1;game.time=4;game.player.z=12;updateArenaTurrets(game);
 assert.equal(game.turrets.filter(t=>t.lockAt!==null).length,2);
});
test('sentry projectiles hurt the player and other hostile fire stops on their armour without damaging it',()=>{
 const {game,t}=fixture();game.wave=1;game.nextWave=-1;game.time=4;game.player.z=10;
 updateArenaTurrets(game);game.time=5;updateArenaTurrets(game);advance(game,.25);
 assert.equal(game.player.hp,86);
 game.bullets=[{id:999,x:0,y:1.75,z:5,vx:0,vy:0,vz:-100,life:1,damage:1000,weapon:'enemy',hostile:true}];
 advance(game,.1);assert.equal(t.hp,TURRET_HP);assert.equal(game.bullets.length,0);
});
test('twenty fortress waves use the current roster and keep the normal counts and active limit',()=>{
 const game=new ArenaGame([...FORTRESS_WALLS],()=>.5),seen=new Set();
 for(let wave=1;wave<=20;wave++){
  game.beginWave();const count=levelCount(wave);assert.equal(game.toSpawn,count);
  for(let i=0;i<count;i++)game.spawnEnemy();
  assert.equal(game.enemies.length,count);assert.equal(game.toSpawn,0);
  assert.ok(game.enemies.every(e=>e.maxHp>0&&Number.isFinite(e.x)&&Math.abs(e.x)<98&&Math.abs(e.z)<98));
  for(const e of game.enemies)seen.add(e.form);
  if(wave===1)for(const form of ['stalker','synth','spectre'])assert.ok(game.enemies.some(e=>e.form===form),form);
  game.enemies=[];
 }
 for(const form of ['stalker','synth','seer','brute','spectre','probe','scuttler','listener','bulwark'])assert.ok(seen.has(form),form);
 game.reset();game.beginWave();game.toSpawn=100;game.invulnerable=10000;
 for(let i=0;i<MAX_ACTIVE_ENEMIES;i++)game.spawnEnemy();advance(game,.2);
 assert.ok(game.enemies.length<=MAX_ACTIVE_ENEMIES);
});

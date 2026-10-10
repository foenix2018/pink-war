import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame, ARENA_SIZE, segmentSphere, segmentBox, moveInArena, MAX_LEVEL, WEAPONS, COVER_WALLS, REGEN_DELAY, levelCount } from '../dist/game-logic.js';

const enemy = (id, z, x = 0) => ({ id, x, z, hp: 40, speed: 0, radius: .8, elite: false, attackTimer: 20, phase: 0 });
const advance = (game, seconds, input = {}) => { for (let t = 0; t < seconds; t += .02) game.step(.02, input); };

test('the 200 m arena confines movement in every direction', () => {
  assert.equal(ARENA_SIZE, 200); const p = { x: 0, z: 0 };
  moveInArena(p, 1000, -1000, .55, []); assert.equal(p.x, 98.45); assert.equal(p.z, -98.45);
  moveInArena(p, -2000, 2000, .55, []); assert.equal(p.x, -98.45); assert.equal(p.z, 98.45);
});
test('movement is camera relative, with equal straight and diagonal speeds', () => {
  const straight = new ArenaGame(), diagonal = new ArenaGame(), turned = new ArenaGame();
  advance(straight, .5, { z: -1 }); advance(diagonal, .5, { x: 1, z: -1 }); advance(turned, .5, { z: -1, yaw: Math.PI / 2 });
  assert.ok(Math.abs(Math.hypot(diagonal.player.x, diagonal.player.z - 22) - Math.abs(straight.player.z - 22)) < .001);
  assert.ok(turned.player.x < -3); assert.ok(Math.abs(turned.player.z - 22) < .001);
});
test('cover blocks movement and allows sliding along its surface', () => {
  const p = { x: 0, z: 4 }, boxes = [{ x: 0, z: 0, hx: 2, hz: 2, height: 3 }];
  moveInArena(p, 0, -3, .5, boxes); assert.equal(p.z, 2.5);
  moveInArena(p, 1, -1, .5, boxes); assert.equal(p.z, 2.5); assert.equal(p.x, 1);
});
test('swept collision detects a fast laser that crosses a whole monster', () => {
  assert.equal(segmentSphere({ x: 0, y: 1, z: 10 }, { x: 0, y: 1, z: -10 }, { x: 0, y: 1, z: 0 }, 1), .45);
  assert.equal(segmentSphere({ x: 5, y: 1, z: 10 }, { x: 5, y: 1, z: -10 }, { x: 0, y: 1, z: 0 }, 1), null);
  assert.equal(segmentBox({ x: 0, y: 1, z: 8 }, { x: 0, y: 1, z: -8 }, { x: 0, z: 0, hx: 2, hz: 2, height: 3 }), .375);
});
test('two pink laser hits defeat a monster and award a score', () => {
  const g = new ArenaGame(); g.nextWave = 999; g.enemies = [enemy(999, 13)];
  assert.equal(g.shoot({ x: 0, y: 1.15, z: 22 }, { x: 0, y: 0, z: -1 }), true);
  assert.equal(g.shoot({ x: 0, y: 1.15, z: 22 }, { x: 0, y: 0, z: -1 }), false);
  advance(g, .2); assert.equal(g.enemies[0].hp, 16);
  g.shoot({ x: 0, y: 1.15, z: 22 }, { x: 0, y: 0, z: -1 }); advance(g, .2);
  assert.equal(g.enemies.length, 0); assert.equal(g.kills, 1); assert.equal(g.score, 100);
});
test('solid cover stops shots before they reach a creature', () => {
  const g = new ArenaGame([{ x: 0, z: 17, hx: 3, hz: 1, height: 3 }]);g.nextWave = 999;g.enemies = [enemy(999, 13)];
  g.shoot({ x: 0, y: 1.15, z: 22 }, { x: 0, y: 0, z: -1 });advance(g, .2);
  assert.equal(g.enemies[0].hp, 40);assert.equal(g.bullets.length, 0);assert.ok(g.drainEvents().some(e => e.type === 'impact' && !e.enemy));
});
test('the closest creature takes the hit rather than one behind it', () => {
  const g = new ArenaGame();g.nextWave = 999;g.enemies = [enemy(901, 10), enemy(902, 17)];
  g.shoot({ x: 0, y: 1.15, z: 22 }, { x: 0, y: 0, z: -1 });advance(g, .15);
  assert.equal(g.enemies.find(e => e.id === 902).hp, 16);assert.equal(g.enemies.find(e => e.id === 901).hp, 40);
});
test('portal levels spawn gradually and grow without an instant health refill', () => {
  const g = new ArenaGame([], () => .5); advance(g, .8);
  assert.equal(g.wave, 1); assert.equal(g.enemies.length, 1); assert.equal(g.toSpawn, 4);
  g.toSpawn = 0; g.enemies = []; g.player.hp = 60; g.lastDamage = g.time; g.step(.02);
  assert.equal(g.nextWave, 5); assert.equal(g.player.hp, 60); assert.equal(g.score, 300);
  advance(g, 5.1); assert.equal(g.wave, 2); assert.equal(g.enemies.length + g.toSpawn, 8);
});
test('contact damage ends the game, and reset starts a clean round', () => {
  const g = new ArenaGame();g.nextWave = 999;g.player.hp = 10;g.enemies = [enemy(999, 22, 1)];g.enemies[0].attackTimer = 0;
  g.step(.02);assert.equal(g.state, 'over');assert.equal(g.player.hp, 0);assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1}),false);
  const elapsed = g.time;g.step(.02);assert.equal(g.time, elapsed);g.reset();assert.equal(g.player.hp, 100);assert.equal(g.wave, 0);assert.equal(g.score, 0);assert.equal(g.enemies.length, 0);
});


test('all ten levels have increasing counts, speed, health and ranged enemies', () => {
  assert.equal(MAX_LEVEL, 10); assert.deepEqual(Array.from({length:10},(_,i)=>levelCount(i+1)), [5,8,11,14,17,20,23,26,29,32]);
  const g = new ArenaGame([],()=>.5); let previousHP=0, previousSpeed=0;
  for(let level=1;level<=10;level++) {
    g.beginWave(); g.spawnEnemy(); const e=g.enemies.at(-1);
    assert.ok(e.hp>previousHP); assert.ok(e.speed>previousSpeed); previousHP=e.hp;previousSpeed=e.speed;
    g.spawnEnemy(); if(level>=4)assert.equal(g.enemies.at(-1).ranged,true);
    g.enemies=[]; g.toSpawn=0;
  }
  g.step(.02); assert.equal(g.state,'won'); assert.equal(g.wave,10);
  g.beginWave(); assert.equal(g.wave,10); const time=g.time;g.step(.05);assert.equal(g.time,time);
});
test('weapons unlock at the correct levels, auto-equip, and preserve individual batteries', () => {
  const g=new ArenaGame(); assert.equal(g.selectWeapon(1),false);
  for(let level=1;level<=9;level++) {
    g.beginWave(); const latest=WEAPONS.findLast(w=>w.level<=level);
    assert.equal(g.weapon.id,latest.id);
    assert.equal(g.unlockedWeapons.length,Math.ceil(level/2));
  }
  assert.equal(g.selectWeapon(0),true);g.cooldown=0;
  g.shoot({x:0,y:1,z:22},{x:0,y:0,z:-1});assert.equal(g.ammo[0],11);
  g.selectWeapon(4);assert.equal(g.ammo[4],4);g.selectWeapon(0);assert.equal(g.ammo[0],11);
  assert.ok(WEAPONS[4].damage>WEAPONS[0].damage*10);
});
test('a depleted battery prevents firing, then reload restores charges and cannot be spammed', () => {
  const g=new ArenaGame();g.nextWave=999;
  const origin={x:0,y:2,z:22}, direction={x:1,y:0,z:0};
  for(let i=0;i<12;i++){g.cooldown=0;assert.equal(g.shoot(origin,direction),true);}
  g.cooldown=0;assert.equal(g.shoot(origin,direction),false);assert.equal(g.ammo[0],0);
  assert.equal(g.reload(),true);assert.equal(g.reload(),false);advance(g,.7);
  assert.equal(g.shoot(origin,direction),false);assert.equal(g.ammo[0],0);
  advance(g,.6);assert.equal(g.reloadRemaining,0);assert.equal(g.ammo[0],12);assert.equal(g.shoot(origin,direction),true);
});
test('holding a heavy weapon charges it; early release is weaker and empty hold auto-reloads', () => {
  const g=new ArenaGame();g.wave=9;g.selectWeapon(4);g.cooldown=0;g.nextWave=999;
  const origin={x:0,y:2,z:22},direction={x:1,y:0,z:0};
  for(let i=0;i<10;i++)g.trigger(true,.02,origin,direction);
  assert.ok(g.charge>.18);assert.equal(g.bullets.length,0);g.trigger(false,.02,origin,direction);
  const weak=g.bullets[0].damage;assert.ok(weak<WEAPONS[4].damage);assert.equal(g.ammo[4],3);
  g.cooldown=0;for(let i=0;i<54;i++)g.trigger(true,.02,origin,direction);
  assert.equal(g.bullets.at(-1).damage,WEAPONS[4].damage);assert.equal(g.ammo[4],2);
  g.ammo[4]=0;g.trigger(true,.02,origin,direction);assert.ok(g.reloadRemaining>0);
});
test('health regenerates only after five damage-free seconds and another hit resets the delay', () => {
  const g=new ArenaGame();g.nextWave=999;g.damage(60);assert.equal(g.player.hp,40);
  advance(g,REGEN_DELAY-.1);assert.equal(g.player.hp,40);
  advance(g,.2);assert.ok(g.player.hp>40);assert.equal(g.regenerating,true);
  g.damage(10);const after=g.player.hp;advance(g,4);assert.equal(g.player.hp,after);assert.equal(g.regenerating,false);
  advance(g,7);assert.equal(g.player.hp,100);
});
test('a thin wall blocks contact damage even when a monster is within attack range', () => {
  const g=new ArenaGame([{x:0,z:21.2,hx:3,hz:.1,height:2.65}]);g.nextWave=999;
  const e=enemy(999,20.4);e.attackTimer=0;g.enemies=[e];g.step(.02);
  assert.equal(g.player.hp,100);
  g.obstacles=[];g.enemies[0].attackTimer=0;g.step(.02);assert.ok(g.player.hp<100);
});
test('protective walls stop hostile projectiles and permit recovery behind them', () => {
  assert.equal(COVER_WALLS.length,8);
  const g=new ArenaGame([{x:0,z:17,hx:3,hz:.5,height:2.65}]);g.nextWave=999;g.damage(40);advance(g,5.5);
  const before=g.player.hp;
  g.bullets.push({id:99,x:0,y:1.3,z:13,vx:0,vy:0,vz:30,life:3,damage:25,hostile:true,splash:0});advance(g,.4);
  assert.ok(g.player.hp>=before);assert.equal(g.bullets.length,0);
  g.obstacles=[];g.bullets.push({id:100,x:0,y:1.3,z:20,vx:0,vy:0,vz:30,life:3,damage:25,hostile:true,splash:0});advance(g,.1);
  assert.ok(g.player.hp<before);assert.equal(g.regenerating,false);
});
test('NOVA damages groups but splash cannot pass through a wall', () => {
  const g=new ArenaGame([{x:2,z:10,hx:.3,hz:4,height:3}]);g.nextWave=999;g.wave=9;g.selectWeapon(4);g.cooldown=0;
  g.enemies=[enemy(91,10,0),enemy(92,10,-2),enemy(93,10,3.5)];
  g.shoot({x:0,y:1.15,z:15},{x:0,y:0,z:-1});advance(g,.12);
  assert.equal(g.enemies.some(e=>e.id===91),false);assert.equal(g.enemies.some(e=>e.id===92),false);
  assert.equal(g.enemies.find(e=>e.id===93).hp,40);
});
test('a complete campaign reaches victory after 185 real projectile kills and five unlocks', () => {
  const g=new ArenaGame([],()=>.5);g.player.z=60;let unlocks=[],equipmentStages=[];
  const origin={x:0,y:1.35,z:60};
  for(let i=0;i<35000 && g.state==='playing';i++) {
    g.step(.02,{x:Math.sin(g.time*.45),z:Math.cos(g.time*.45)});
    origin.x=g.player.x;origin.z=g.player.z;
    const target=g.enemies.reduce((best,e)=>!best||e.z>best.z?e:best,null);
    if(target)g.trigger(true,.02,origin,{x:target.x-origin.x,y:(target.elite?1.35:1.15)-origin.y,z:target.z-origin.z});
    else g.trigger(false,.02,origin,{x:0,y:0,z:-1});
    const events=g.drainEvents();
    unlocks.push(...events.filter(e=>e.type==='unlock').map(e=>e.name));
    equipmentStages.push(...events.filter(e=>e.type==='equipment').map(e=>e.level));
  }
  assert.equal(g.state,'won');assert.equal(g.wave,10);assert.equal(g.kills,185);assert.ok(g.player.hp>0);
  assert.deepEqual(unlocks,['BLOOM','PETAL','THORN','NOVA']);assert.equal(g.unlockedWeapons.length,5);
  assert.deepEqual(equipmentStages,[1,2,3,4,5,6,7,8,9,10]);assert.equal(g.snapshot().equipment.name,'Impératrice');assert.equal(g.snapshot().equipment.unlocked.length,10);
  g.reset();assert.equal(g.snapshot().equipment.level,1);assert.deepEqual(g.snapshot().equipment.unlocked,['aube']);
});

test('monsters flank protective walls rather than remaining stuck forever', () => {
  const g=new ArenaGame(COVER_WALLS,()=>.5);g.nextWave=-1;g.wave=1;g.toSpawn=1;g.spawned=0;
  g.player.x=-5.6;g.player.z=20;g.spawnEnemy();advance(g,4);
  assert.equal(g.player.hp,100); // Safe while the monster is still on the other side.
  advance(g,25);assert.ok(g.player.hp<100);
  assert.ok(Math.hypot(g.enemies[0].x-g.player.x,g.enemies[0].z-g.player.z)<2);
  g.reset();assert.equal(g.navigation.refreshAt,-1);
});

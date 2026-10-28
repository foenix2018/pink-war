import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame, ARENA_SIZE, segmentSphere, segmentBox, moveInArena, MAX_LEVEL, WEAPONS, COVER_WALLS, REGEN_DELAY, levelCount, traceEnemyHit, PORTAL_SITES, chooseWavePortals } from '../dist/game-logic.js';
import { enemyDurability } from '../dist/enemy-combat.js';

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
test('a lethal shot preserves the enemy ID and location for laser dissolution',()=>{
  const game=new ArenaGame();game.nextWave=999;
  const e={...enemy(831,10),form:'stalker',elevation:0,aimHeight:1.15,tier:1,limpUntil:0,stunnedUntil:0};
  game.enemies=[e];
  game.damageEnemy(e,100,{x:0,y:1,z:10},'head',2.2);
  const kill=game.drainEvents().find(event=>event.type==='kill');
  assert.equal(kill.id,831);assert.equal(kill.form,'stalker');
  assert.equal(kill.x,0);assert.equal(kill.z,10);
  assert.equal(game.enemies.length,0);
});

test('uncollected weapons appear nearby, visible and stay on the radar until acquired',()=>{
  const game=new ArenaGame([{x:5,z:22,hx:2,hz:2,height:6}]);
  game.wave=3;game.offerWeapon(1);
  assert.equal(game.weaponOffers.length,1);
  const station=game.weaponOffers[0];
  assert.ok(Math.hypot(station.x-game.player.x,station.z-game.player.z)<9);
  assert.ok(!game.blocked({x:game.player.x,y:1.5,z:game.player.z},{x:station.x,y:1.7,z:station.z}));
  assert.equal(game.weaponIndex,7,'GHJU keeps the default dual pistols when refusing');
  game.player.x=station.x;game.player.z=station.z;
  assert.equal(game.collectWeapon(),true);
  assert.equal(game.weaponOffers.length,0);
});

test('two pink laser hits defeat a monster and award a score', () => {
  const g = new ArenaGame();g.selectWeapon(0);g.cooldown=0; g.nextWave = 999; g.enemies = [enemy(999, 13)];
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


test('random breach sites change across runs, avoid buildings and preserve enemy counts',()=>{
  assert.ok(PORTAL_SITES.length>=10,'sectors cover the entire arena');
  const obstacles=[{x:57,z:-13,hx:9,hz:10,height:10},{x:-72,z:63,hx:9,hz:7,height:10}];
  const p={x:0,z:22};
  const a=chooseWavePortals(obstacles,()=>.02,9,p,10);
  const b=chooseWavePortals(obstacles,()=>.89,9,p,10);
  assert.equal(a.length,3);assert.equal(b.length,3);
  assert.notDeepEqual(a.map(v=>[v.x,v.z]),b.map(v=>[v.x,v.z]));
  for(const site of [...a,...b]){
    assert.ok(site.x>=-99&&site.x<=99&&site.z>=-99&&site.z<=99);
    assert.ok(obstacles.every(w=>Math.abs(site.x-w.x)>w.hx+8||Math.abs(site.z-w.z)>w.hz+8));
  }
  const g=new ArenaGame(obstacles,()=>.5);
  for(let level=1;level<=MAX_LEVEL;level++){
    g.beginWave();
    assert.equal(g.toSpawn,levelCount(level));
    assert.equal(g.activePortals.length,level<3?1:level<6?2:level<11?3:level<16?4:5);
    assert.ok(g.activePortals.every(site=>Number.isFinite(site.openedAt)));
    for(let n=0;n<levelCount(level);n++)g.spawnEnemy();
    assert.equal(g.toSpawn,0);
    assert.equal(g.enemies.length,levelCount(level));
    assert.ok(g.enemies.every(e=>g.activePortals.some(site=>site.id===e.portalId)));
    g.enemies=[];
  }
});

test('twenty campaign levels increase enemy health and movement speed', () => {
  assert.equal(MAX_LEVEL,20); assert.deepEqual(Array.from({length:20},(_,i)=>levelCount(i+1)),Array.from({length:20},(_,i)=>5+i*3));
  const g = new ArenaGame([],()=>.5); let previousSpeed=0;
  for(let level=1;level<=MAX_LEVEL;level++) {
    g.beginWave(); g.spawnEnemy(); const e=g.enemies.at(-1);
    const baseSpeed=e.speed/(e.form==='scuttler'?1.12:e.form==='bulwark'?.7:1);
    // Wave 1 opens on the heavy Sentinel (fixed 1200 hp); every other first unit follows the level curve.
    if(level===1){assert.equal(e.form,'sentinel');assert.equal(e.hp,1200);}else assert.equal(e.hp,enemyDurability(level,e.form,e.elite));
    for(const form of ['stalker','scuttler','seer','brute','probe','listener','bulwark'])for(const elite of [false,true])
      if(level>1)assert.ok(enemyDurability(level,form,elite)>enemyDurability(level-1,form,elite),'the same chassis gets tougher at every level');
    assert.ok(baseSpeed>previousSpeed); previousSpeed=baseSpeed;
    for(let i=1;i<levelCount(level);i++)g.spawnEnemy();
    assert.ok(g.enemies.some(e=>e.ranged),'every wave contains shooting enemies');
    g.enemies=[]; g.toSpawn=0;
  }
  g.step(.02); assert.equal(g.state,'won'); assert.equal(g.wave,MAX_LEVEL);
  g.beginWave(); assert.equal(g.wave,MAX_LEVEL); const time=g.time;g.step(.05);assert.equal(g.time,time);
});
test('weapons appear at their scheduled levels, remain optional, and keep individual batteries', () => {
  const g=new ArenaGame(); assert.equal(g.selectWeapon(1),false);
  for(let level=1;level<=9;level++) {
    g.beginWave();
    const offeredIndex=WEAPONS.findIndex(w=>w.level===level);
    const previousWeapon=g.weaponIndex;
    if(offeredIndex>0) {
      const offer=g.weaponOffers.find(w=>w.index===offeredIndex);
      assert.ok(offer,'a new weapon appears in the world');
      assert.equal(g.weaponIndex,previousWeapon,'no forced weapon switch');
      g.player.x=offer.x;g.player.z=offer.z;
      assert.equal(g.collectWeapon(),true);
      assert.equal(g.weaponIndex,offeredIndex);
    }
    assert.equal(g.unlockedWeapons.length,WEAPONS.filter(w=>w.level<=level).length);
  }
  assert.equal(g.selectWeapon(0),true);g.cooldown=0;
  g.shoot({x:0,y:1,z:22},{x:0,y:0,z:-1});assert.equal(g.ammo[0],11);
  g.selectWeapon(4);assert.equal(g.ammo[4],4);g.selectWeapon(0);assert.equal(g.ammo[0],11);
  assert.ok(WEAPONS[4].damage>WEAPONS[0].damage*10);
});

test('an uncollected gun stays available even after the next wave and cannot be selected early', () => {
  const g=new ArenaGame();
  for(let i=0;i<5;i++)g.beginWave();
  assert.equal(g.weaponIndex,7);
  assert.deepEqual(g.weaponOffers.map(o=>o.index),[5,1,6,2]);
  assert.equal(g.selectWeapon(2),false);
  const offer=g.weaponOffers[0];g.player.x=offer.x;g.player.z=offer.z;
  assert.equal(g.collectWeapon(),true);assert.equal(g.weaponIndex,5);
  assert.deepEqual(g.weaponOffers.map(o=>o.index),[1,6,2]);
  assert.equal(g.collectWeapon(),true);assert.equal(g.weaponIndex,1);
  assert.deepEqual(g.weaponOffers.map(o=>o.index),[6,2]);
  g.reset();assert.equal(g.weaponOffers.length,0);assert.deepEqual(g.unlockedWeapons.map(w=>w.id),['r9','duor9']);
});

test('weapons can be skipped without breaking cyclic weapon selection',()=>{
  const g=new ArenaGame();g.selectWeapon(0);g.ownedWeapons.delete(7);
  g.ownedWeapons.add(2);g.ownedWeapons.add(4);
  assert.deepEqual(g.unlockedWeapons.map(w=>w.id),['r9','lance','nova']);
  assert.equal(g.cycleWeapon(),true);assert.equal(g.weaponIndex,2);
  assert.equal(g.cycleWeapon(),true);assert.equal(g.weaponIndex,4);
  assert.equal(g.cycleWeapon(),true);assert.equal(g.weaponIndex,0);
  assert.equal(g.cycleWeapon(-1),true);assert.equal(g.weaponIndex,4);
});

test('limb hit zones rotate with enemies so side shots remain accurately located',()=>{
  const enemy={id:1,x:0,z:0,elevation:0,yaw:Math.PI/2,form:'stalker',hp:100,tier:2};
  const strike=traceEnemyHit({x:-2,y:1.22,z:-.54},{x:2,y:1.22,z:-.54},enemy);
  assert.ok(strike);assert.equal(strike.zone,'limb');
});

test('crouch toggles, lowers speed, keeps grounded trajectory, and refuses a jump while crouched', () => {
  const g=new ArenaGame();g.nextWave=999;
  g.step(.02,{crouchToggle:true});assert.equal(g.player.crouched,true);
  const original=g.player.z;for(let n=0;n<8;n++)g.step(.05,{z:-1,jump:true,sprint:true});
  assert.equal(g.player.grounded,true);assert.equal(g.player.verticalSpeed,0);
  assert.ok(Math.abs(g.player.z-original+1.2)<.08);
  g.step(.02,{crouchToggle:true,jump:false});
  assert.equal(g.player.crouched,false);
  g.step(.02,{jump:true});assert.equal(g.player.grounded,false);
});

test('head, torso and limb produce distinct zones, multipliers and reactions', () => {
  const e={id:1,x:0,z:0,elevation:0,form:'stalker',hp:160,tier:3,limpUntil:0,stunnedUntil:0};
  const head=traceEnemyHit({x:0,y:1.93,z:-2},{x:0,y:1.93,z:2},e);
  const chest=traceEnemyHit({x:0,y:1.25,z:-2},{x:0,y:1.25,z:2},e);
  const leg=traceEnemyHit({x:.2,y:.47,z:-2},{x:.2,y:.47,z:2},e);
  assert.equal(head.zone,'head');assert.equal(chest.zone,'torso');assert.equal(leg.zone,'limb');
  assert.ok(head.multiplier>chest.multiplier&&chest.multiplier>leg.multiplier);
  const g=new ArenaGame();g.enemies=[e];g.time=7;
  g.damageEnemy(e,10,{x:0,y:1.9,z:0},'head',head.multiplier);
  assert.ok(e.hp<140&&e.stunnedUntil>7);
  g.damageEnemy(e,10,{x:.62,y:.47,z:0},'limb',leg.multiplier);
  assert.ok(e.limpUntil>7);
});

test('a depleted battery prevents firing, then reload restores charges and cannot be spammed', () => {
  const g=new ArenaGame();g.selectWeapon(0);g.cooldown=0;g.nextWave=999;
  const origin={x:0,y:2,z:22}, direction={x:1,y:0,z:0};
  for(let i=0;i<12;i++){g.cooldown=0;assert.equal(g.shoot(origin,direction),true);}
  g.cooldown=0;assert.equal(g.shoot(origin,direction),false);assert.equal(g.ammo[0],0);
  assert.equal(g.reload(),true);assert.equal(g.reload(),false);advance(g,.7);
  assert.equal(g.shoot(origin,direction),false);assert.equal(g.ammo[0],0);
  advance(g,.6);assert.equal(g.reloadRemaining,0);assert.equal(g.ammo[0],12);assert.equal(g.shoot(origin,direction),true);
});
test('holding a heavy weapon charges it; early release is weaker and empty hold auto-reloads', () => {
  const g=new ArenaGame();g.wave=9;g.ownedWeapons.add(4);g.selectWeapon(4);g.cooldown=0;g.nextWave=999;
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
  const g=new ArenaGame([{x:2,z:10,hx:.3,hz:4,height:3}]);g.nextWave=999;g.wave=9;g.ownedWeapons.add(4);g.selectWeapon(4);g.cooldown=0;
  g.enemies=[enemy(91,10,0),enemy(92,10,-2),enemy(93,10,3.5)];
  g.shoot({x:0,y:1.15,z:15},{x:0,y:0,z:-1});advance(g,.12);
  assert.equal(g.enemies.some(e=>e.id===91),false);assert.equal(g.enemies.some(e=>e.id===92),false);
  assert.equal(g.enemies.find(e=>e.id===93).hp,40);
});
test('a complete campaign reaches level 20 after 670 real projectile kills and six unlocked weapons', () => {
  const g=new ArenaGame([],()=>.5);g.player.z=60;let unlocks=[],equipmentStages=[];const previousTargets=new Map();
  const origin={x:0,y:1.35,z:60};
  for(let i=0;i<130000 && g.state==='playing';i++) {
    const closest=g.enemies.reduce((best,e)=>!best||Math.hypot(e.x-g.player.x,e.z-g.player.z)<Math.hypot(best.x-g.player.x,best.z-g.player.z)?e:best,null);
    const distance=closest?Math.hypot(g.player.x-closest.x,g.player.z-closest.z):999;
    // Choose sustained fire at medium range and the precision weapon farther
    // away. Hysteresis avoids losing time to constant equipment transitions.
    if(g.ownedWeapons.has(4)){
      if(distance>45)g.selectWeapon(2);
      else if(distance<35||![1,2].includes(g.weaponIndex))g.selectWeapon(1);
    }
    const goal={x:Math.sin(g.time*.13)*70,z:Math.cos(g.time*.13)*70};
    const preferredDistance=g.player.hp<75?43:32;
    const radial=closest?Math.max(-1,Math.min(1,(distance-preferredDistance)/8)):0;
    let dx=closest?(closest.x-g.player.x)/distance*radial-(closest.z-g.player.z)/distance*.8:goal.x-g.player.x;
    let dz=closest?(closest.z-g.player.z)/distance*radial+(closest.x-g.player.x)/distance*.8:goal.z-g.player.z;
    if(Math.abs(g.player.x)>80)dx-=Math.sign(g.player.x)*1.2;
    if(Math.abs(g.player.z)>80)dz-=Math.sign(g.player.z)*1.2;
    // Choose a nearby evasive direction from actual incoming trajectories. This
    // pilot gets no health reset, invulnerability or modification of enemy fire.
    const heading=Math.atan2(dx,dz),bolts=g.bullets.filter(b=>b.hostile&&Math.hypot(b.x-g.player.x,b.z-g.player.z)<35);
    let best=-Infinity;
    for(const offset of [0,-.4,.4,-.8,.8,-1.2,1.2,Math.PI]){
      const x=Math.sin(heading+offset),z=Math.cos(heading+offset);let score=2*Math.cos(offset);
      if(Math.abs(g.player.x+x*10)>92||Math.abs(g.player.z+z*10)>92)score-=20;
      for(const b of bolts){const rx=b.x-g.player.x,rz=b.z-g.player.z,vx=b.vx-x*10,vz=b.vz-z*10;
        const t=Math.max(0,Math.min(.75,-(rx*vx+rz*vz)/(vx*vx+vz*vz||1))),d=Math.hypot(rx+vx*t,rz+vz*t);
        score-=5/(d*d+.1);
      }
      if(score>best){best=score;dx=x;dz=z;}
    }
    const n=1;
    g.step(.02,{x:dx/n,z:dz/n,sprint:true,jump:bolts.length>0&&Math.floor(g.time/.35)%2===0});
    // The simulated player actively visits the beam and chooses each offered weapon.
    if(g.weaponOffers.length){const offer=g.weaponOffers[0],old={x:g.player.x,z:g.player.z};
      g.player.x=offer.x;g.player.z=offer.z;g.collectWeapon();g.player.x=old.x;g.player.z=old.z;if(g.weapon.melee)g.selectWeapon(0);
    }
    origin.x=g.player.x;origin.z=g.player.z;origin.y=g.player.elevation+1.35;
    const target=g.enemies.reduce((best,e)=>!best||Math.hypot(e.x-origin.x,e.z-origin.z)<Math.hypot(best.x-origin.x,best.z-origin.z)?e:best,null);
    if(target){const old=previousTargets.get(target.id)||target,travel=Math.hypot(target.x-origin.x,target.z-origin.z)/g.weapon.speed;
      const scale=target.elite?(target.form==='probe'?1.13:1.3):target.form==='scuttler'?.98:target.form==='seer'?1.04:1;
      g.trigger(!g.weapon.semiAuto||!g.triggerHeld,.02,origin,{x:target.x+(target.x-old.x)/.02*travel-origin.x,y:(target.elevation||0)+(target.form==='probe'?.55:target.form==='scuttler'?.85:1.88)*scale-origin.y,z:target.z+(target.z-old.z)/.02*travel-origin.z});}
    else g.trigger(false,.02,origin,{x:0,y:0,z:-1});
    for(const e of g.enemies)previousTargets.set(e.id,{x:e.x,z:e.z});
    const events=g.drainEvents();
    unlocks.push(...events.filter(e=>e.type==='unlock').map(e=>e.name));
    equipmentStages.push(...events.filter(e=>e.type==='equipment').map(e=>e.level));
  }
  assert.equal(g.state,'won',JSON.stringify({wave:g.wave,kills:g.kills,time:g.time,hp:g.player.hp,toSpawn:g.toSpawn}));assert.equal(g.wave,MAX_LEVEL);assert.equal(g.kills,670);assert.ok(g.player.hp>0);
  assert.deepEqual(unlocks,['AURORA','NEXUS V9','M–12','ARES X9','THORN','NOVA']);assert.equal(g.unlockedWeapons.length,8);
  assert.deepEqual(equipmentStages,Array.from({length:MAX_LEVEL},(_,i)=>Math.min(i+1,10)));assert.equal(g.snapshot().equipment.name,'Impératrice');assert.equal(g.snapshot().equipment.unlocked.length,10);
  g.reset();assert.equal(g.snapshot().equipment.level,1);assert.deepEqual(g.snapshot().equipment.unlocked,['aube']);
});

test('monsters cannot see through solid cover, and search temporarily after being spotted',()=>{
  const wall={x:0,z:8,hx:7,hz:1,height:6};
  const g=new ArenaGame([wall],()=>.5);g.nextWave=999;g.wave=4;
  g.player.x=0;g.player.z=16;
  g.enemies=[{...enemy(99,-2),form:'stalker',speed:4,aimHeight:1.15,
    awareness:'patrol',patrolAngle:0,patrolTimer:1,attackTimer:0,
    lastSeenAt:-999,alertedUntil:0,lastKnownX:0,lastKnownZ:-2,
    radius:.8,hitRadius:1,stunnedUntil:0,limpUntil:0,elevation:0}];
  advance(g,5);
  assert.equal(g.player.hp,100,'wall completely blocks sight and firing');
  assert.equal(g.enemies[0].awareness,'patrol','hidden player is not automatically tracked');
  const foe=g.enemies[0];g.player.x=foe.x+1;g.player.z=foe.z+3;
  foe.yaw=Math.atan2(g.player.x-foe.x,g.player.z-foe.z);
  g.step(.02);assert.equal(foe.awareness,'engaged','enemy recognizes a visible player');
  g.player.x=0;g.player.z=16;g.step(.02);
  assert.equal(foe.awareness,'search','enemy investigates last visible location');
  advance(g,5);assert.equal(foe.awareness,'patrol','searching eventually ends');
  g.reset();assert.equal(g.navigation.refreshAt,-1);
});

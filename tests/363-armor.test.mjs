import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {SHIELD_MAX,SHIELD_DELAY,SHIELD_RATE,MELEE_DAMAGE,MELEE_BACK_MULTIPLIER,MELEE_COOLDOWN,MELEE_RANGE,
  CHARGE_START,CHARGE_MAX,CHARGE_FUSE,CHARGE_RADIUS,CHARGE_DAMAGE,soakDamage,forwardOf} from '../dist/armor-combat.js';
import {combatHudState,hitBearing} from '../dist/combat-hud.js';
import {meleeKick} from '../dist/armor-feedback.js';
import {DESKTOP_BUTTONS} from '../dist/desktop-input.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const game=()=>{const g=new ArenaGame([],()=>.5);g.nextWave=999;g.toSpawn=0;g.player.x=g.player.z=0;g.player.yaw=0;g.enableArmorShield();return g;};
// A machine standing at (x, z), facing the player unless `away`.
const unit=(id,x,z,extra={})=>({id,form:'stalker',x,z,elevation:0,aimHeight:1.15,hp:1e4,radius:.5,speed:0,awareness:'engaged',
  attackTimer:99,stunnedUntil:0,limpUntil:0,ranged:false,yaw:Math.atan2(-x,-z)+Math.PI,phase:0,alertedUntil:1e6,...extra});
const run=(g,seconds,dt=.02)=>{for(let t=0;t<seconds;t+=dt)g.step(dt,{});};

test('the armour shield takes the hits first, breaks, and lets the rest through to health',()=>{
  const player={shield:20};
  assert.deepEqual(soakDamage(player,30),{held:20,rest:10,broke:true});
  assert.deepEqual(soakDamage(player,5),{held:0,rest:5,broke:false},'a broken shield holds nothing');
  const g=game();assert.equal(g.player.shield,SHIELD_MAX);
  g.damage(25);assert.equal(g.player.hp,100,'health is untouched while the shield holds');assert.equal(g.player.shield,SHIELD_MAX-25);
  g.invulnerable=0;g.damage(SHIELD_MAX);
  assert.equal(g.player.shield,0);assert.equal(g.player.hp,75);
  const events=g.drainEvents().map(e=>e.type);
  assert.ok(events.includes('shield-break'));assert.equal(events.filter(t=>t==='damage').length,2);
  const bare=new ArenaGame([],()=>.5);bare.nextWave=999;bare.toSpawn=0;bare.damage(25);
  assert.equal(bare.player.hp,75,'without the armour layer (bare core) health takes it all');
});

test('the shield recharges in full after a few seconds without damage, and a hit restarts the wait',()=>{
  const g=game();g.damage(SHIELD_MAX);g.drainEvents();
  run(g,SHIELD_DELAY-.2);assert.equal(g.player.shield,0,'nothing during the delay');
  run(g,.4);assert.ok(g.player.shield>0&&g.shieldCharging);
  g.invulnerable=0;g.damage(5);assert.equal(g.shieldCharging,false);
  const held=g.player.shield;run(g,SHIELD_DELAY-.2);assert.equal(g.player.shield,held,'the hit restarted the delay');
  run(g,.2+SHIELD_MAX/SHIELD_RATE+.2);
  assert.equal(g.player.shield,SHIELD_MAX);assert.equal(g.shieldCharging,false);
  const events=g.drainEvents().map(e=>e.type);
  assert.ok(events.includes('shield-recharge')&&events.includes('shield-full'));
  g.reset('ghju');assert.equal(g.player.shield,SHIELD_MAX,'a new session starts with a full shield');
});

test('the strike hits the closest machine in front, stuns and pushes it, and is far worse from behind',()=>{
  const g=game(),front=unit(1,0,-1.6),side=unit(2,2,0);g.enemies=[front,side];
  assert.equal(g.melee(forwardOf(0)),true);
  assert.equal(front.hp,1e4-MELEE_DAMAGE);assert.equal(side.hp,1e4,'outside the cone');
  assert.ok(front.stunnedUntil>g.time&&front.z<-1.6,'stunned and knocked back');
  assert.equal(g.melee(forwardOf(0)),false,'cooldown');
  g.time+=MELEE_COOLDOWN+.01;
  const back=unit(3,0,-1.4,{yaw:0});g.enemies=[back];g.melee(forwardOf(0));
  assert.equal(back.hp,1e4-MELEE_DAMAGE*MELEE_BACK_MULTIPLIER,'from behind');
  const hit=g.drainEvents().filter(e=>e.type==='melee');
  assert.deepEqual(hit.map(e=>[e.hit,e.back]),[[true,false],[true,true]]);
  g.time+=MELEE_COOLDOWN+.01;g.enemies=[unit(4,0,-(MELEE_RANGE+1.5))];g.melee(forwardOf(0));
  assert.equal(g.enemies[0].hp,1e4,'out of reach');assert.equal(g.drainEvents().find(e=>e.type==='melee').hit,false);
  const walled=game();walled.obstacles.push({x:0,z:-.8,hx:1,hz:.1,y:0,height:3});walled.enemies=[unit(5,0,-1.6)];walled.melee(forwardOf(0));
  assert.equal(walled.enemies[0].hp,1e4,'not through a wall');
  const blade=game();blade.ownedWeapons.add(5);blade.selectWeapon(5);assert.equal(blade.melee(),false,'AURORA keeps its own blade strikes');
});

test('an impulse charge flies in an arc, settles, goes off after its fuse, and hurts with distance and line of sight',()=>{
  const g=game();g.player.z=20;
  assert.equal(g.charges,CHARGE_START);
  assert.equal(g.throwCharge({x:0,y:1.5,z:19.5},{x:0,y:0,z:-1}),true);
  assert.equal(g.charges,CHARGE_START-1);assert.equal(g.throwCharge({x:0,y:1.5,z:19.5},{x:0,y:0,z:-1}),false,'a short cooldown between throws');
  const c=g.thrownCharges[0];let peak=c.y;
  for(let i=0;i<30&&g.thrownCharges.length;i++){g.step(.02,{});peak=Math.max(peak,c.y);}
  assert.ok(peak>1.6,'it rises before it falls');
  run(g,CHARGE_FUSE);assert.equal(g.thrownCharges.length,0);
  assert.ok(c.y<.5&&c.z<12,'it landed ahead');
  assert.ok(g.drainEvents().some(e=>e.type==='charge-blast'));
  const blast=game(),near=unit(1,0,-1),far=unit(2,0,-(CHARGE_RADIUS-.5)),out=unit(3,0,-(CHARGE_RADIUS+3)),hidden=unit(4,3,0);
  blast.player.z=30;blast.enemies=[near,far,out,hidden];blast.obstacles.push({x:1.6,z:0,hx:.2,hz:2,y:0,height:4});
  blast.thrownCharges=[{id:99,x:0,y:.06,z:0,vx:0,vy:0,vz:0,fuseAt:blast.time+.01,thrownAt:blast.time}];
  blast.step(.02,{});
  const lost=e=>1e4-e.hp;
  assert.ok(lost(near)>lost(far)&&lost(far)>0,'damage falls off with distance');
  assert.ok(lost(near)<=CHARGE_DAMAGE);assert.equal(lost(out),0);assert.equal(lost(hidden),0,'cover protects');
  assert.ok(near.stunnedUntil>blast.time,'the pulse neutralises machines for a moment');
  const self=game();self.thrownCharges=[{id:7,x:0,y:.06,z:-1,vx:0,vy:0,vz:0,fuseAt:self.time+.01,thrownAt:self.time}];self.step(.02,{});
  assert.ok(self.player.shield<SHIELD_MAX,'too close hurts the thrower');
});

test('charges are earned between encounters and capped; the range refills them for practice',()=>{
  const g=game();g.charges=CHARGE_MAX;g.grantCharges(1);assert.equal(g.charges,CHARGE_MAX);
  g.charges=0;g.wave=0;g.beginWave();assert.equal(g.charges,0,'none for the first wave');
  g.beginWave();assert.equal(g.charges,1);
  const cell=game();cell.charges=0;cell.pickups=[{id:1,kind:'cell',x:0,y:0,z:0,until:99}];cell.step(.02,{});
  assert.equal(cell.pickups.length,0);assert.equal(cell.charges,1,'an energy cell also brings a charge');
  const range=new ShootingRangeGame([],()=>.5,0,'ghju');range.enableArmorShield();
  range.throwCharge({x:0,y:1.5,z:21},{x:0,y:0,z:-1});assert.equal(range.charges,CHARGE_MAX);
  assert.match(read('campaign-level1.js'),/if \(this\.encounter > 0\) this\.grantCharges\(1\);/);
  assert.match(read('level2-test.js'),/stage=2;game\.grantCharges\(1\)/);
});

test('machines see a charge in flight as a danger',()=>{
  const g=game();g.throwCharge({x:0,y:1.5,z:-.5},{x:0,y:0,z:-1});
  const hazards=g.chargeHazards();
  assert.equal(hazards.length,1);assert.equal(hazards[0].radius,CHARGE_RADIUS);
});

test('the HUD shows the shield over health, the charges, and where the last hit came from',()=>{
  const g=game();let s=combatHudState(g);
  assert.deepEqual([s.shieldCapacity,s.shield,s.charges,s.hit],[SHIELD_MAX,SHIELD_MAX,CHARGE_START,null]);
  g.damage(10,{x:5,z:0});s=combatHudState(g);
  assert.ok(Math.abs(s.hit.angle-Math.PI/2)<1e-9,'a shot from the right reads on the right');
  g.player.yaw=-Math.PI/2;assert.ok(Math.abs(hitBearing(g).angle)<1e-9,'turned to face it, it reads ahead');
  g.time+=2;assert.equal(hitBearing(g),null,'the arc fades');
  assert.equal(combatHudState({player:{hp:100},weapon:{}}).shieldCapacity,0,'no shield bar without the armour layer');
  const hud=read('combat-hud.js'),css=read('combat-hud.css');
  for(const part of ['pw-hud-shield','pw-hud-charges','pw-hud-hit','data-armor="melee"','data-armor="charge"'])assert.ok(hud.includes(part),part);
  assert.match(css,/\.pw-hud-touch\{display:none\}/,'armour buttons only on touch screens');
});

test('the three engines wear the armour layer and share its controls and feedback',()=>{
  assert.equal(DESKTOP_BUTTONS.charge,4);assert.equal(DESKTOP_BUTTONS.melee,5);
  const arena=read('game.js'),m01=read('vesper-combat.js'),m01Page=read('vesper-level1-v7.html'),m02=read('level2-test.js');
  assert.match(arena,/game=armed\(/);assert.match(arena,/game = armed\(new ArenaGame/);
  assert.match(m01,/game\.enableArmorShield\(\);/);assert.match(m02,/game\.reset\(characterId\);game\.enableArmorShield\(\);/);
  for(const [name,source] of [['arena',arena],['m01',m01],['m02',m02]]){
    assert.match(source,/import \{createArmorFeedback,meleeKick,MELEE_POSE\} from '\.\/armor-feedback\.js';/,name);
    assert.match(source,/\.melee\(\{x:/,name);assert.match(source,/\.throwCharge\(\{x:/,name);
    assert.match(source,/handle\(e(vent)?\)/,name);
  }
  assert.match(arena,/e\.code === 'KeyX'/);assert.match(arena,/e\.code === 'KeyB'/);assert.match(arena,/e\.button===1/);
  assert.match(m01Page,/ev\.code==='KeyX'/);assert.match(m01Page,/edge\(5\)\)combatWorld\?\.melee/);assert.match(m01Page,/edge\(4\)\)combatWorld\?\.throwCharge/);
  assert.match(m01Page,/\n  \.pw-hud-touch \[data-armor=charge\]\{bottom:max\(240px/,'M01: CHARGE above the sprint button');
  assert.match(m01Page,/\n  #touchControls #touchButtons #btnPauseMobile\{/,'the approved M01 pause button rule is intact');
  assert.match(m02,/e\.code==='KeyX'/);assert.match(read('level2-input.js'),/melee:edges\.has\('melee'\),charge:edges\.has\('charge'\)/);
  assert.match(read('vr.js'),/edge\('sideTrigger',0,'charge'\)/);assert.match(read('mission-xr.js'),/edge\('melee',down\(rp\?\.buttons\[3\]\)\)/);
});

test('the strike moves the held weapon forward and back',()=>{
  assert.equal(meleeKick({time:5,meleeAt:-99}),0);
  assert.ok(meleeKick({time:5.13,meleeAt:5})>.95);
  assert.equal(meleeKick({time:5.5,meleeAt:5}),0);
});

test('on phones the Arena and Range fire cluster sits on screen: its layer spans the whole viewport',()=>{
  const css=read('mobile-controls-v7.css');
  const rule=css.match(/body\.playing \.game-hud \.fire-area \{([^}]*)\}/)[1];
  assert.match(rule,/inset: 0/);assert.match(rule,/bottom: 0;/);assert.ok(!/bottom: auto/.test(rule),'a zero-height layer put TIR, VISER and SAUT above the screen');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {SHIELD_MAX,SHIELD_DELAY,SHIELD_RATE,MELEE_DAMAGE,MELEE_BACK_MULTIPLIER,MELEE_COOLDOWN,MELEE_RANGE,
  CHARGE_START,CHARGE_MAX,CHARGE_FUSE,CHARGE_RADIUS,CHARGE_DAMAGE,CHARGE_SPEED,CHARGE_GRAVITY,MELEE_IMPACT_DELAY,soakDamage,forwardOf,updateMelee} from '../dist/armor-combat.js';
import {combatHudState,hitBearing} from '../dist/combat-hud.js';
import {meleeKick,meleePoseAt,STRIKE_TIME,throwPoseAt,THROW_TIME} from '../dist/armor-feedback.js';
import {DESKTOP_BUTTONS} from '../dist/desktop-input.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const game=()=>{const g=new ArenaGame([],()=>.5);g.nextWave=999;g.toSpawn=0;g.player.x=g.player.z=0;g.player.yaw=0;g.enableArmorShield();return g;};
// A machine standing at (x, z), facing the player unless `away`.
const unit=(id,x,z,extra={})=>({id,form:'stalker',x,z,elevation:0,aimHeight:1.15,hp:1e4,radius:.5,speed:0,awareness:'engaged',
  attackTimer:99,stunnedUntil:0,limpUntil:0,ranged:false,yaw:Math.atan2(-x,-z)+Math.PI,phase:0,alertedUntil:1e6,...extra});
const run=(g,seconds,dt=.02)=>{for(let t=0;t<seconds;t+=dt)g.step(dt,{});};
// The blow lands when the swing makes contact: let the clock reach it.
const land=g=>{g.time+=MELEE_IMPACT_DELAY+.01;updateMelee(g);};

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
  assert.equal(g.melee(forwardOf(0)),true);assert.equal(front.hp,1e4,'nothing lands before the swing makes contact');land(g);
  assert.equal(front.hp,1e4-MELEE_DAMAGE);assert.equal(side.hp,1e4,'outside the cone');
  assert.ok(front.stunnedUntil>g.time&&front.z<-1.6,'stunned and knocked back');
  assert.equal(g.melee(forwardOf(0)),false,'cooldown');
  g.time+=MELEE_COOLDOWN+.01;
  const back=unit(3,0,-1.4,{yaw:0});g.enemies=[back];g.melee(forwardOf(0));land(g);
  assert.equal(back.hp,1e4-MELEE_DAMAGE*MELEE_BACK_MULTIPLIER,'from behind');
  const hit=g.drainEvents().filter(e=>e.type==='melee');
  assert.deepEqual(hit.map(e=>[e.hit,e.back]),[[true,false],[true,true]]);
  g.time+=MELEE_COOLDOWN+.01;g.enemies=[unit(4,0,-(MELEE_RANGE+1.5))];g.melee(forwardOf(0));land(g);
  assert.equal(g.enemies[0].hp,1e4,'out of reach');assert.equal(g.drainEvents().find(e=>e.type==='melee').hit,false);
  const walled=game();walled.obstacles.push({x:0,z:-.8,hx:1,hz:.1,y:0,height:3});walled.enemies=[unit(5,0,-1.6)];walled.melee(forwardOf(0));land(walled);
  assert.equal(walled.enemies[0].hp,1e4,'not through a wall');
  const blade=game();blade.ownedWeapons.add(5);blade.selectWeapon(5);assert.equal(blade.melee(),false,'AURORA keeps its own blade strikes');
});

test('an impulse charge flies in an arc, settles, goes off after its fuse, and hurts with distance and line of sight',()=>{
  const g=game();g.player.z=20;
  assert.equal(g.charges,CHARGE_START);
  const lob={x:0,y:Math.sin(.4),z:-Math.cos(.4)};
  assert.equal(g.throwCharge({x:0,y:1.5,z:19.5},lob),true);
  assert.equal(g.charges,CHARGE_START-1);assert.equal(g.throwCharge({x:0,y:1.5,z:19.5},lob),false,'a short cooldown between throws');
  const c=g.thrownCharges[0];let peak=c.y;
  for(let i=0;i<30&&g.thrownCharges.length;i++){g.step(.02,{});peak=Math.max(peak,c.y);}
  assert.ok(peak>1.6,'it rises before it falls');
  run(g,CHARGE_FUSE);assert.equal(g.thrownCharges.length,0);
  assert.ok(c.y<.5&&c.z<8,'it landed well ahead of the thrower');
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
  assert.match(read('combat-hud.css'),/\.pw-hud-palette/, 'C groups the charge in the secondary palette');
  assert.match(m01Page,/\n  #touchControls #touchButtons #btnPauseMobile\{/,'the approved M01 pause button rule is intact');
  assert.match(m02,/e\.code==='KeyX'/);assert.match(read('level2-input.js'),/melee:edges\.has\('melee'\),charge:edges\.has\('charge'\)/);
  assert.match(read('vr.js'),/edge\('sideTrigger',0,'charge'\)/);assert.match(read('mission-xr.js'),/edge\('melee',down\(rp\?\.buttons\[3\]\)\)/);
});

test('the butt-stroke is drawn back, driven across the screen into contact, then recovers',()=>{
  assert.equal(meleeKick({time:5,meleeAt:-99}),0);
  assert.ok(meleeKick({time:5+STRIKE_TIME/2,meleeAt:5})>.95);
  assert.equal(meleeKick({time:5+STRIKE_TIME+.01,meleeAt:5}),0);
  assert.equal(meleePoseAt(0),null);assert.equal(meleePoseAt(STRIKE_TIME+.1),null);
  const load=meleePoseAt(.12),hit=meleePoseAt(MELEE_IMPACT_DELAY),end=meleePoseAt(STRIKE_TIME-.01);
  assert.ok(load.z>.15&&load.pitch>.4,'the rifle is pulled back towards the eye, muzzle rising');
  assert.ok(hit.z<-.25&&hit.x<-.1&&hit.yaw>.5,'the stock is driven forward across the screen at contact');
  assert.ok(Math.abs(end.z)<.01&&Math.abs(end.pitch)<.01&&Math.abs(end.yaw)<.01,'back on the hip pose');
  let last=null;for(let t=.005;t<STRIKE_TIME;t+=.005){const p=meleePoseAt(t);if(last)assert.ok(Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)<.085,'no teleport at '+t.toFixed(3));last=p;}
});
test('the swing is heard in order: gear shifts, air is cut, then the stock lands at contact',()=>{
  const fb=read('armor-feedback.js');
  assert.match(fb,/case 'melee-start': play\('melee-start'\)/);assert.match(fb,/kind === 'melee-start'/);assert.match(fb,/kind === 'melee-hit'/);
  const g=game();g.enemies=[unit(1,0,-1.6)];g.melee(forwardOf(0));
  assert.deepEqual(g.drainEvents().map(e=>e.type).filter(t=>t.startsWith('melee')),['melee-start']);
  land(g);assert.deepEqual(g.drainEvents().map(e=>e.type).filter(t=>t.startsWith('melee')),['melee'],'the impact event (and its sound) comes at contact');
});

test('on phones the Arena and Range fire cluster sits on screen: its layer spans the whole viewport',()=>{
  const css=read('mobile-controls-v7.css');
  const rule=css.match(/body\.playing \.game-hud \.fire-area \{([^}]*)\}/)[1];
  assert.match(rule,/inset: 0/);assert.match(rule,/bottom: 0;/);assert.ok(!/bottom: auto/.test(rule),'a zero-height layer put TIR, VISER and SAUT above the screen');
});

// ---- Real ballistics: distance follows the height of the hand and the angle given ----
const lobAt=(deg,{height=1.5,run={x:0,z:0},obstacles=[]}={})=>{
  const g=game();g.obstacles=obstacles;g.playerVelocity={...run,y:0};g.player.z=0;
  const a=deg*Math.PI/180;g.throwCharge({x:0,y:height,z:0},{x:0,y:Math.sin(a),z:-Math.cos(a)});
  const c=g.thrownCharges[0];let first=null,peak=c.y;
  for(let i=0;i<Math.round(CHARGE_FUSE/.01)&&g.thrownCharges.length;i++){g.step(.01,{});peak=Math.max(peak,c.y);if(!first&&c.bounces>0)first={x:c.x,z:c.z,t:g.time};}
  return {g,c,first,peak};
};
test('a grenade follows real ballistics: first impact where gravity says, from the height of the hand and the angle given',()=>{
  for(const [deg,height] of [[0,1.5],[20,1.5],[35,1.5],[0,4.5],[30,.9]]){
    const {first}=lobAt(deg,{height}),a=deg*Math.PI/180,v=CHARGE_SPEED,vy=v*Math.sin(a),vh=v*Math.cos(a);
    const drop=height+.06-.06;  // hand to ground contact height of the body
    const t=(vy+Math.sqrt(vy*vy+2*CHARGE_GRAVITY*drop))/CHARGE_GRAVITY,range=vh*t;
    assert.ok(first,`${deg}° from ${height} m lands before the fuse`);
    assert.ok(Math.abs(-first.z-range)<range*.12+.4,`${deg}° from ${height} m: ${(-first.z).toFixed(1)} m against ${range.toFixed(1)} m expected`);
  }
  const d=(deg,height)=>-lobAt(deg,{height}).first.z;
  assert.ok(d(0,1.5)<d(10,1.5)&&d(10,1.5)<d(25,1.5)&&d(25,1.5)<d(40,1.5),'more angle, more distance (up to the optimum)');
  assert.ok(d(0,4.5)>d(0,1.5)+4&&d(20,4.5)>d(20,1.5),'a higher hand throws further: from a gallery it carries well beyond street level');
  assert.ok(lobAt(45).first.t-0<CHARGE_FUSE&&lobAt(70).first,'even a steep lob lands before the fuse');
  assert.ok(lobAt(45).peak>lobAt(20).peak+2,'a steeper throw climbs higher');
});
test('the grenade bounces off the floor with a loss, rolls, and rests; it cannot bounce forever',()=>{
  const {c,g}=lobAt(15);assert.ok(c.bounces>=1);
  for(let i=0;i<400&&g.thrownCharges.length;i++)g.step(.01,{});
  const r=lobAt(0);assert.ok(r.c.y<.2,'it is on the ground at the end of the fuse');
});
test('walls throw the grenade back, crates carry it on top, and the thrower\'s own run adds to the throw',()=>{
  const wall={x:0,z:-6,hx:5,hz:.2,y:0,height:4};
  const hit=lobAt(5,{obstacles:[wall]});assert.ok(hit.c.z>-5.9,'it never goes through the wall');assert.ok(hit.c.bounces>=1);
  assert.ok(hit.c.vz>=0||hit.c.resting||hit.c.z>-5.7,'it comes back off the wall');
  const crate={x:0,z:-9,hx:1.5,hz:1.5,y:0,height:1.2},on=lobAt(12,{obstacles:[crate]});
  assert.ok(on.c.y>1.2&&Math.abs(on.c.z+9)<1.6||on.c.y<.5,'it either sits on the crate or fell off its edge, never inside it');
  const still=lobAt(25),moving=lobAt(25,{run:{x:0,z:-5}});
  assert.ok(-moving.first.z>-still.first.z+3,'running forward adds its speed to the throw');
});
test('the grenade has a real hand-grenade model and its own spin',()=>{
  const fb=read('armor-feedback.js');
  for(const part of ['LatheGeometry','InstancedMesh(lugGeometry','leverGeometry','pinGeometry','ringGeometry','c.spin']) assert.ok(fb.includes(part),part);
  assert.match(fb,/charge-bounce/);assert.equal(typeof throwPoseAt(.2).y,'number');assert.equal(throwPoseAt(THROW_TIME+.1),null);
});

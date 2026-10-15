import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame,COMBO_WINDOW,PICKUP_LIFE,PICKUP_HEAL,MAX_PICKUPS,comboMultiplier} from '../dist/game-logic.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {hapticPlan as haptic} from '../dist/haptics.js';

const game=()=>{const g=new ArenaGame([],()=>.5);g.nextWave=999;g.toSpawn=0;g.invulnerable=1e6;g.player.x=g.player.z=0;return g;};
let serial=100;
const foe=(g,x=0,z=-6,extra={})=>{const e={id:serial++,form:'stalker',x,z,elevation:0,aimHeight:1.15,hp:10,radius:.5,speed:0,awareness:'patrol',
  attackTimer:99,stunnedUntil:0,limpUntil:0,ranged:false,phase:0,...extra};g.enemies.push(e);return e;};
const kill=(g,e)=>g.damageEnemy(e,1e4,{x:e.x,y:1,z:e.z});
const idle=(g,seconds)=>{for(let t=0;t<seconds;t+=.05)g.step(.05,{});};

test('kills chained within the window raise the multiplier a quarter at a time, up to double',()=>{
  assert.deepEqual([1,2,3,4,5,9].map(comboMultiplier),[1,1.25,1.5,1.75,2,2]);
  const g=game();
  kill(g,foe(g));assert.equal(g.score,100,'a first kill scores as before');
  idle(g,1);kill(g,foe(g));assert.equal(g.score,225);
  idle(g,1);kill(g,foe(g,0,-6,{ranged:true}));assert.equal(g.score,225+225,'a shooter (150) at ×1.5');
  const events=g.drainEvents().filter(e=>e.type==='combo');
  assert.deepEqual(events.map(e=>[e.count,e.multiplier]),[[2,1.25],[3,1.5]]);
  assert.equal(g.snapshot().combo,3);assert.equal(g.bestCombo,3);
  idle(g,COMBO_WINDOW+.2);assert.equal(g.snapshot().combo,0,'the streak lapses');
  kill(g,foe(g));assert.equal(g.score,550,'a new streak starts at ×1');
});

test('every fifth kill, or an elite, leaves a pickup; a hurt player gets a medkit',()=>{
  const g=game();
  for(let i=0;i<4;i++){idle(g,COMBO_WINDOW+.1);kill(g,foe(g,i,-9));}
  assert.equal(g.pickups.length,0);
  idle(g,COMBO_WINDOW+.1);g.player.hp=50;kill(g,foe(g,3,-5));
  assert.equal(g.pickups.length,1);assert.equal(g.pickups[0].kind,'heal');
  assert.deepEqual([g.pickups[0].x,g.pickups[0].z],[3,-5],'it lies where the unit fell');
  kill(g,foe(g,-3,-5,{elite:true}));assert.equal(g.pickups.length,2,'an elite always drops');
  assert.ok(g.drainEvents().some(e=>e.type==='pickup-drop'));
});

test('walking onto a medkit heals, an energy cell refills the weapon in hand and ends a reload',()=>{
  const g=game();g.player.hp=50;
  g.pickups.push({id:1,kind:'heal',x:0,y:0,z:0,until:g.time+PICKUP_LIFE});g.step(.05,{});
  assert.equal(g.pickups.length,0);assert.ok(Math.abs(g.player.hp-(50+PICKUP_HEAL))<2,'heals by the medkit');
  g.player.hp=90;g.pickups.push({id:2,kind:'heal',x:0,y:0,z:.5,until:g.time+PICKUP_LIFE});g.step(.05,{});assert.equal(g.player.hp,100,'never above full health');
  g.ammo[g.weaponIndex]=1;g.reloadRemaining=.8;
  g.pickups.push({id:3,kind:'cell',x:0,y:0,z:-.6,until:g.time+PICKUP_LIFE});g.step(.05,{});
  assert.equal(g.ammo[g.weaponIndex],g.weapon.capacity);assert.equal(g.reloadRemaining,0);
  const picked=g.drainEvents().filter(e=>e.type==='pickup').map(e=>e.kind);assert.deepEqual(picked,['heal','heal','cell']);
});

test('pickups out of reach stay, then expire; at most a handful lie around',()=>{
  const g=game();
  g.pickups.push({id:4,kind:'cell',x:6,y:0,z:6,until:g.time+PICKUP_LIFE});idle(g,PICKUP_LIFE-1);
  assert.equal(g.pickups.length,1,'still there before its time');idle(g,1.2);assert.equal(g.pickups.length,0,'gone after it');
  for(let i=0;i<MAX_PICKUPS+3;i++)kill(g,foe(g,i*2,-8,{elite:true}));
  assert.equal(g.pickups.length,MAX_PICKUPS);
  assert.equal(g.snapshot().pickups.length,MAX_PICKUPS,'the renderer sees them');
});

test('only Survival drops pickups; streak feedback has its own vibration',()=>{
  const range=new ShootingRangeGame([],()=>.5,0);range.enemies=[];range.player.hp=40;
  const e={id:1,form:'stalker',x:0,z:-5,elevation:0,aimHeight:1.15,hp:1,elite:true};range.enemies.push(e);range.damageEnemy(e,10,{x:0,y:1,z:-5});
  assert.equal(range.pickups.length,0);
  assert.ok(haptic('combo',4).main[0]>haptic('combo',2).main[0],'a longer streak buzzes harder');
  assert.ok(haptic('pickup').main&&haptic('pickup').side,'both hands feel a pickup');
});

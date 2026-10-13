import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame,segmentBox,traceEnemyHit } from '../dist/game-logic.js';
import { sweepBlade,bladeBulletContact } from '../dist/blade-combat.js';
import { hostileShotProfile,predictShot } from '../dist/enemy-fire.js';
import { createSaberSound } from '../dist/saber-sound.js';
import { audioMock } from './audio-mock.mjs';
const game=()=>{const g=new ArenaGame([],()=>.5);g.nextWave=999;return g;};
function sword(){const g=game();g.ownedWeapons.add(5);g.selectWeapon(5);g.cooldown=0;g.player.x=g.player.z=0;return g;}
const blade=(x,z=-.9)=>({base:{x,y:1.1,z},tip:{x,y:2.18,z},extension:1});

test('a second press gives one air jump; holding and further presses cannot create infinite flight',()=>{
 const g=game();g.step(.05,{jump:true});const first=g.player.elevation;g.step(.05,{jump:true});assert.equal(g.player.airJumps,0);
 g.step(.05,{jump:false});g.step(.05,{jump:true});assert.equal(g.player.airJumps,1);assert.ok(g.player.elevation>first);
 g.step(.05,{jump:false});const velocity=g.player.verticalSpeed;g.step(.05,{jump:true});assert.ok(g.player.verticalSpeed<velocity);
 for(let i=0;i<100;i++)g.step(.05,{jump:true});assert.equal(g.player.grounded,true);assert.equal(g.player.airJumps,0);
 assert.deepEqual(g.drainEvents().filter(e=>e.type==='jump').map(e=>e.kind),['ground','double']);
});
test('second jump near a real wall pushes outwards, respects collision and resets only on landing',()=>{
 const wall={x:0,z:22,hx:.5,hz:4,height:4};const g=new ArenaGame([wall]);g.nextWave=999;g.player.x=1.06;
 g.step(.05,{jump:true});g.step(.05,{jump:false});const x=g.player.x;g.step(.05,{jump:true,x:-1});
 assert.equal(g.player.airJumps,1);assert.ok(g.player.jumpImpulseX>0);assert.ok(g.player.x>x);
 const events=g.drainEvents().filter(e=>e.type==='jump');assert.equal(events[1].kind,'wall');
 g.step(.05,{jump:false});g.step(.05,{jump:true});assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,0);
});
test('a crouched player cannot double jump and an elevated floor refreshes the jump budget',()=>{
 const g=game();g.player.crouched=true;g.step(.05,{jump:true});assert.equal(g.player.grounded,true);
 g.player.crouched=false;g.step(.05);g.player.x=22.4;g.player.z=0;g.player.elevation=1.58;g.player.airJumps=1;g.step(.05);
 assert.equal(g.player.airJumps,0);g.step(.05,{jump:true});assert.ok(g.player.elevation>1.58);
});
test('enemy projectiles are faster, more frequent and lead observed movement without homing',()=>{
 const profile=hostileShotProfile(10,'seer');assert.ok(profile.speed>28);assert.ok(profile.interval<1.6);
 const aim=predictShot({x:0,y:1.2,z:-20},{x:0,y:1.2,z:0},{x:7,y:0,z:0},profile.speed,profile.lead);assert.ok(aim.x>1);
 const g=game();g.wave=10;g.player.x=0;g.player.z=0;g.enemies=[{id:9,x:0,z:-16,elevation:0,hp:1000,form:'seer',speed:0,radius:.8,ranged:true,aimHeight:1.3,yaw:Math.PI,attackTimer:0,stunnedUntil:0,awareness:'engaged'}];
 g.step(.05,{x:1});const b=g.bullets.find(b=>b.hostile);assert.ok(b);assert.ok(b.vx>0);assert.ok(Math.hypot(b.vx,b.vy,b.vz)>40);
 const velocity=[b.vx,b.vy,b.vz];g.step(.05,{x:-1});assert.deepEqual([b.vx,b.vy,b.vz],velocity);
});
test('a fast real blade sweep hits a crossed robot but respects walls and tracking jumps',()=>{
 const enemy={id:7,form:'stalker',x:0,z:-.9,elevation:0},eye={x:0,y:1.35,z:0},previous=blade(-.85),current=blade(.85);
 assert.ok(sweepBlade(previous,current,[enemy],[],eye,segmentBox,traceEnemyHit).length===1);
 const wall={x:0,z:-.45,hx:2,hz:.08,height:3};assert.equal(sweepBlade(previous,current,[enemy],[wall],eye,segmentBox,traceEnemyHit).length,0);
 assert.equal(sweepBlade(blade(-4),current,[enemy],[],eye,segmentBox,traceEnemyHit).length,0);
});
test('sabre contacts deal bounded melee damage, use no cells and never emit a laser projectile',()=>{
 const g=sword();const e={id:7,form:'stalker',x:0,z:-.9,elevation:0,hp:400,aimHeight:1.2};g.enemies=[e];
 g.updateBlade(blade(-.85),.05);g.updateBlade(blade(.85),.05);const hp=e.hp;assert.ok(hp<400);
 g.updateBlade(blade(-.85),.05);assert.equal(e.hp,hp,'one hit per target per attack interval');
 g.trigger(true,.05,{x:0,y:1.3,z:0},{x:0,y:0,z:-1});assert.equal(g.bullets.length,0);assert.equal(g.ammo[5],0);assert.equal(g.reload(),false);
 assert.ok(g.drainEvents().some(e=>e.type==='blade-swing'));
});
test('a physical guard intercepts the bullet before the player and cannot block with a blade behind the body',()=>{
 for(const [z,protectedPlayer] of [[-.95,true],[.95,false]]){
  const g=sword();g.updateBlade(blade(0,z),.05,true);g.bullets.push({id:1,x:0,y:1.25,z:-2,vx:0,vy:0,vz:80,damage:20,life:2,hostile:true});g.step(.05);
  assert.equal(g.player.hp,protectedPlayer?100:80);assert.equal(g.drainEvents().some(e=>e.type==='blade-parry'),protectedPlayer);
 }
 assert.equal(bladeBulletContact({x:1,y:1,z:0},{x:1,y:2,z:0},{x:0,y:0,z:0},{x:0,y:2,z:0}),null);
});
test('sabre audio ignites once, reuses its hum and stops on pause/mute/dispose',()=>{
 const {ctx,nodes,calls}=audioMock(),sound=createSaberSound(ctx);sound.update({active:true,equipped:true});assert.equal(sound.humming,true);
 const starts=calls.starts;for(let i=0;i<50;i++){ctx.tick(.02);sound.update({active:true,equipped:true});}assert.equal(calls.starts,starts);
 sound.update({active:true,equipped:true,speed:4});assert.ok(calls.starts>starts);ctx.tick(.5);
 sound.update({active:false,equipped:true});assert.equal(sound.humming,false);const paused=calls.starts;
 sound.update({active:true,equipped:true});assert.equal(calls.starts,paused+2,'resume restarts only hum, without another ignition');
 sound.update({active:true,equipped:true,sound:false});assert.equal(sound.humming,false);
 sound.dispose();assert.ok(nodes.every(n=>n.disconnected));
});

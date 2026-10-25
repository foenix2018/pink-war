import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaGame, traceEnemyHit } from '../dist/game-logic.js';
import { bladeBulletContact, reflectedVelocity } from '../dist/blade-combat.js';
import { enemyDurability, enemyVolley, rangedMuzzle, enemyScale } from '../dist/enemy-combat.js';
const blade={base:{x:0,y:1.1,z:-.95},tip:{x:0,y:2.18,z:-.95},extension:1};
function game(obstacles=[]){const g=new ArenaGame(obstacles,()=>.5);g.nextWave=999;g.player.x=g.player.z=0;g.ownedWeapons.add(5);g.selectWeapon(5);return g;}
const bolt=()=>({id:71,x:0,y:1.25,z:-2,vx:0,vy:0,vz:80,damage:20,life:2,hostile:true,weapon:'enemy'});
test('enemy hit zones use the same scale as their visible chassis, including elite heads',()=>{
 for(const form of ['stalker','scuttler','seer','brute','probe','listener','bulwark'])for(const elite of [false,true]){
  const y=(form==='probe'?.55:form==='scuttler'?.85:1.88)*enemyScale(form,elite),e={x:0,z:0,elevation:0,yaw:0,form,elite};
  const hit=traceEnemyHit({x:0,y,z:-3},{x:0,y,z:3},e);assert.equal(hit?.zone,'head',form+' '+elite);
 }
});
test('an extended blade physically reflects a fast shot, preserves its energy and can damage the robot it meets',()=>{
 const g=game(),enemy={id:8,form:'stalker',x:0,z:-4,elevation:0,hp:300,aimHeight:1.15,speed:0,attackTimer:99,stunnedUntil:0,radius:.8};g.enemies=[enemy];
 g.updateBlade(blade,.05,false);g.bullets=[bolt()];g.step(.05);
 assert.equal(g.player.hp,100);const b=g.bullets[0];assert.equal(b.hostile,false);assert.equal(b.reflected,true);assert.equal(b.vz,-80);assert.equal(b.damage,20);assert.equal(g.ammo[5],0);
 g.step(.05);assert.ok(enemy.hp<300);assert.equal(g.bullets.length,0);assert.ok(g.drainEvents().some(e=>e.type==='blade-parry'));
});
test('a missed or retracted blade offers no invisible shield, and a blade behind the body cannot intercept in time',()=>{
 for(const segment of [{...blade,base:{...blade.base,x:2},tip:{...blade.tip,x:2}},{...blade,extension:.5},{...blade,base:{...blade.base,z:.95},tip:{...blade.tip,z:.95}}]){
  const g=game();g.updateBlade(segment,.05,true);g.bullets=[bolt()];g.step(.05);assert.equal(g.player.hp,80);assert.ok(!g.drainEvents().some(e=>e.type==='blade-parry'));
 }
});
test('blade capsule entry produces a true impact normal; blade angle changes the return without targeting an enemy',()=>{
 const incoming={x:0,y:0,z:80};const hit=bladeBulletContact({x:.04,y:1.25,z:-2},{x:.04,y:1.25,z:1},blade.base,blade.tip);
 assert.ok(hit&&hit.point.z<-.95);const reflected=reflectedVelocity(incoming,blade,hit);assert.ok(reflected.x>0);assert.ok(reflected.z<0);assert.ok(Math.abs(Math.hypot(reflected.x,reflected.y,reflected.z)-80)<1e-7);
 const tilted={base:{x:0,y:1,z:-.5},tip:{x:0,y:2,z:-1}};const normal=reflectedVelocity(incoming,tilted,null);assert.ok(normal.y<0&&normal.z<0);assert.ok(Math.abs(Math.hypot(normal.x,normal.y,normal.z)-80)<1e-7);
});
test('a wall between the real head and the blade prevents a deflection through cover',()=>{
 const wall={x:0,z:-.45,hx:2,hz:.08,height:3},g=game([wall]);g.updateBlade(blade,.05,true);g.bullets=[bolt()];g.step(.05);
 assert.ok(!g.drainEvents().some(e=>e.type==='blade-parry'));assert.equal(g.bullets.some(b=>b.reflected),false);
});
test('armoured enemies survive longer, keep progressive difficulty and unlock short aimed volleys',()=>{
 for(const wave of [1,6,20])assert.ok(enemyDurability(wave,'stalker')>42+wave*14);
 assert.ok(enemyDurability(12,'bulwark')>enemyDurability(12,'stalker'));assert.ok(enemyDurability(20,'brute',true)>enemyDurability(6,'brute',true));
 assert.equal(enemyVolley(1,'seer').count,1);assert.equal(enemyVolley(5,'seer').count,2);assert.equal(enemyVolley(11,'bulwark').count,3);
 const g=new ArenaGame([],()=>.5);g.wave=4;g.beginWave();for(let i=0;i<8;i++)g.spawnEnemy();assert.ok(g.enemies.some(e=>e.ranged&&e.form==='brute'));
});
test('a visible ranged unit fires its volley from the cannon and a stun interrupts follow-up shots',()=>{
 const g=new ArenaGame([],()=>.5);g.nextWave=999;g.wave=6;g.player.x=g.player.z=0;
 const e={id:9,form:'seer',x:0,z:-16,elevation:0,hp:1000,aimHeight:1.38,speed:0,radius:.8,ranged:true,stunnedUntil:0,attackTimer:0,awareness:'engaged'};g.enemies=[e];g.step(.05);
 assert.equal(e.burstRemaining,1);assert.equal(g.drainEvents().filter(e=>e.type==='enemy-shot').length,1);
 const muzzle=rangedMuzzle(e);assert.ok(muzzle.y>1.5);assert.ok(g.bullets[0].y>1.5);
 for(let i=0;i<4;i++)g.step(.05);assert.equal(g.drainEvents().filter(e=>e.type==='enemy-shot').length,1);assert.equal(e.burstRemaining,0);
 e.attackTimer=0;e.burstRemaining=1;e.stunnedUntil=g.time+1;g.step(.05);assert.equal(g.drainEvents().filter(e=>e.type==='enemy-shot').length,0);assert.equal(e.burstRemaining,0);
});

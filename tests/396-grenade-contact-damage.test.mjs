import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaGame} from '../dist/game-logic.js';
import {CHARGE_CONTACT_RADIUS,CHARGE_DAMAGE,CHARGE_RADIUS,CHARGE_MID_RADIUS,
 CHARGE_SELF_FACTOR,chargeDamageAt,detonateCharge,SHIELD_MAX} from '../dist/armor-combat.js';

const game=()=>{
 const g=new ArenaGame([],()=>.5);g.nextWave=999;g.toSpawn=0;g.enableArmorShield();
 g.player.x=0;g.player.z=20;return g;
};
const charge=(x=0,z=0)=>({id:88,x,y:.06,z});
const unit=(id,x,z,hp=1100)=>({id,x,z,form:'stalker',elevation:0,aimHeight:1.15,
 radius:.5,hp,stunnedUntil:0,ranged:false,elite:false,alertedUntil:0});

test('contact damage is massive and falls off smoothly to zero',()=>{
 assert.equal(chargeDamageAt(0),CHARGE_DAMAGE);
 assert.equal(chargeDamageAt(CHARGE_CONTACT_RADIUS),CHARGE_DAMAGE);
 assert.equal(chargeDamageAt(0,{self:true}),CHARGE_DAMAGE*CHARGE_SELF_FACTOR);
 assert.equal(chargeDamageAt(CHARGE_RADIUS),0);
 assert.equal(chargeDamageAt(CHARGE_RADIUS+1),0);
 const ds=[0,1.4,2,2.6,3.3,4.5,5.49,5.5].map(d=>chargeDamageAt(d));
 for(let i=1;i<ds.length;i++)assert.ok(ds[i]<=ds[i-1],'non-increasing damage');
 assert.ok(chargeDamageAt(2.5)>chargeDamageAt(CHARGE_MID_RADIUS));
 assert.ok(chargeDamageAt(4.5)>0&&chargeDamageAt(4.5)<CHARGE_DAMAGE/10);
 assert.equal(chargeDamageAt(NaN),0);
});
test('point-blank charge kills common enemies and severely hurts armoured enemies',()=>{
 const g=game(),normal=unit(1,0,0,220),heavy=unit(2,.9,0,1100),mid=unit(3,0,3,1100);
 g.enemies=[normal,heavy,mid];detonateCharge(g,charge());
 assert.ok(!g.enemies.includes(normal));
 assert.ok(heavy.hp<500);
 assert.ok(mid.hp>heavy.hp&&mid.hp<1100);
 assert.ok(heavy.stunnedUntil>g.time);
 assert.ok(g.drainEvents().some(e=>e.type==='charge-blast'));
});
test('the thrower can die despite energy shield and temporary immunity',()=>{
 const g=game();g.player.z=0;g.invulnerable=.25;
 detonateCharge(g,charge());
 assert.equal(g.player.shield,0);
 assert.equal(g.player.hp,0);
 assert.equal(g.state,'over');
 assert.ok(g.drainEvents().some(e=>e.type==='over'));
});
test('at medium range the thrower can survive; level geometry blocks explosions',()=>{
 const safe=game();safe.player.z=CHARGE_MID_RADIUS;detonateCharge(safe,charge());
 assert.equal(safe.state,'playing');assert.ok(safe.player.hp>0);
 const blocked=game(),enemy=unit(1,0,2.6,950);
 blocked.player.z=2.6;blocked.enemies=[enemy];
 blocked.obstacles.push({x:0,y:0,z:1.25,hx:4,hz:.16,height:3});
 detonateCharge(blocked,charge());
 assert.equal(blocked.player.hp,100);
 assert.equal(blocked.player.shield,SHIELD_MAX);
 assert.equal(enemy.hp,950);
 const far=game();far.player.z=CHARGE_RADIUS+2;detonateCharge(far,charge());
 assert.equal(far.player.hp,100);
});
test('ordinary 300ms projectile immunity still protects player from non-blast hits',()=>{
 const g=game();g.invulnerable=.25;g.damage(9999,{x:0,z:10});
 assert.equal(g.state,'playing');assert.equal(g.player.hp,100);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createArmorFeedback} from '../dist/armor-feedback.js';
import {ArenaGame} from '../dist/game-logic.js';
import {aimSensitivity} from '../dist/optics.js';
import {sightPoint} from '../dist/sight-line.js';

test('armored grenade has its physical casing, dual luminous bands, top emitter and rotating flight pose',()=>{
 const scene=new T.Scene(),fx=createArmorFeedback({T,scene,camera:null});
 const grenade={id:9,x:3,y:1.5,z:-5,fuseAt:1.4},game={time:0,thrownCharges:[grenade]};
 fx.update(game,.016);
 const casing=scene.getObjectByName('Grenade à impulsion · blindage et émetteur');
 assert.ok(casing,'the visible grenade exists on the world scene');
 assert.ok(casing.children.length>=7,'shell, end caps, bands, pin and luminous emitter');
 assert.equal(casing.position.x,3);
 assert.equal(casing.position.y,1.5);
 assert.ok(casing.userData.core,'the fuse emitter has a real mesh');
 const spin=casing.rotation.y;game.time=.2;fx.update(game,.2);assert.ok(casing.rotation.y>spin);
 fx.dispose();assert.equal(casing.parent,null,'cleanup removes the grenade');
});

test('impulse explosion animates a spherical pulse, ground ring, arc and instanced fragments with no lingering objects',()=>{
 const scene=new T.Scene(),fx=createArmorFeedback({T,scene,camera:null});
 fx.handle({type:'charge-blast',x:0,y:1.0,z:-6,radius:5.5});
 assert.ok(scene.children.some(o=>o.isInstancedMesh&&o.count===12),'one draw for twelve energetic fragments');
 const blast=scene.children.filter(o=>o.isMesh||o.isInstancedMesh);
 assert.equal(blast.length,4);
 fx.update({time:0,thrownCharges:[]},.15);
 assert.ok(blast.some(o=>o.scale.x>1),'the explosion radius grows');
 fx.update({time:0,thrownCharges:[]},.5);
 assert.equal(scene.children.length,0,'pulse and fragments disappear once finished');
 fx.dispose();
});

test('scoped automatic rifle keeps the centreline closer than hip fire while shotgun spread is unchanged',()=>{
 const origin={x:0,y:1.5,z:0},forward={x:0,y:0,z:-1};
 const shoot=(aiming,weaponIndex)=>{
  const game=new ArenaGame([],()=>0);game.nextWave=999;
  game.ownedWeapons.add(weaponIndex);assert.ok(game.selectWeapon(weaponIndex));
  game.aimingPrecision=aiming;game.cooldown=0;assert.ok(game.shoot(origin,forward));
  return game.bullets;
 };
 const hip=shoot(false,1)[0],ads=shoot(true,1)[0];
 const deviation=b=>Math.hypot(b.vx,b.vy)/Math.hypot(b.vx,b.vy,b.vz);
 assert.ok(deviation(hip)>deviation(ads)*10,'reduced ADS dispersion follows the visible aim');
 const h=shoot(false,6),a=shoot(true,6);
 assert.deepEqual(h.map(b=>[b.vx,b.vy,b.vz]),a.map(b=>[b.vx,b.vy,b.vz]),'shotgun pellet cone remains physical');
});

test('central sight ray selects the actual collision plane and ADS turn rate remains controllable',()=>{
 const camera=new T.Vector3(0,1.5,0),forward=new T.Vector3(0,0,-1);
 const wall={x:0,y:0,z:-10,hx:2,hz:.1,height:3};
 const target=sightPoint(T,camera,forward,{obstacles:[wall]});
 assert.ok(Math.abs(target.z+9.9)<.01);
 assert.ok(Math.abs(target.x)<1e-9&&Math.abs(target.y-1.5)<1e-9);
 assert.equal(aimSensitivity(4,0),1);
 assert.ok(aimSensitivity(4,1)>=.54&&aimSensitivity(4,1)<.7);
});

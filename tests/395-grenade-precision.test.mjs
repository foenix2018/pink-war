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

test('IX-09 explosion uses fire, smoke and ballistic fragments without rotating circles',()=>{
 const scene=new T.Scene(),fx=createArmorFeedback({T,scene,camera:null});
 fx.handle({type:'charge-blast',x:0,y:1,z:-6,radius:5.5});
 const meshes=scene.children.filter(o=>o.isInstancedMesh);
 assert.equal(meshes.length,3,'three pooled batches: smoke, flame and fragments');
 assert.ok(meshes.some(o=>/fumée/.test(o.name)));
 assert.ok(meshes.some(o=>/boule de feu/.test(o.name)));
 assert.ok(meshes.some(o=>/débris/.test(o.name)));
 assert.ok(!scene.children.some(o=>o.geometry?.type==='RingGeometry'||o.geometry?.type==='TorusGeometry'),'no decorative circular blasts');
 fx.update({time:0,thrownCharges:[]},.18);
 assert.ok(meshes.every(o=>o.instanceMatrix.version>0),'instanced explosion particles are animated');
 fx.update({time:0,thrownCharges:[]},4.5);
 assert.equal(scene.children.length,0,'smoke dissipates and batches clean up');
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

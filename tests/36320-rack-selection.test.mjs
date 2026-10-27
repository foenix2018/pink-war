import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';

test('a tracked player can point at rack weapons from in front of the benches, while desktop proximity and walls still apply',()=>{
 const art=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(art.obstacles,()=>.5,0,'lylu');Object.assign(g.player,{x:0,z:29});
 assert.equal(g.nearRangeArmory(),false);g.setInteractionPosition({x:0,y:1.7,z:28.95275});assert.equal(g.nearRangeArmory(),true);
 const from={x:.18,y:1.35,z:29.35},target=new T.Vector3(-1.56,1.43,34.48),direction=target.sub(new T.Vector3(from.x,from.y,from.z)).normalize();
 assert.equal(g.armoryTarget(from,direction)?.index,1);assert.equal(g.takeFromArmory(1),true);assert.equal(g.weapon.id,'bloom');
 g.obstacles.push({x:0,y:0,z:31.4,hx:4,hz:.1,height:3});assert.equal(g.armoryTarget(from,direction),null);assert.equal(g.takeFromArmory(2),false);
 g.setInteractionPosition();assert.equal(g.nearRangeArmory(),false);art.dispose();
});

test('a successful rack choice acknowledges the actual equipped weapon, while a rejected choice cannot claim success',()=>{
 const g=new ShootingRangeGame([],()=>.5,0,'lylu');Object.assign(g.player,{x:0,z:32.2});g.time=10;assert.equal(g.takeFromArmory(6),true);
 assert.equal(g.armoryEquippedIndex,g.weaponIndex);assert.equal(g.armoryEquippedUntil,11.4);assert.equal(g.weapon.id,'m12');assert.equal(g.takeFromArmory(7),false);assert.equal(g.armoryEquippedIndex,6);
 g.score=500;g.trainingElapsed=30;g.time=10.5;assert.equal(g.takeFromArmory(6),true);assert.equal(g.score,500);assert.equal(g.trainingElapsed,30);assert.equal(g.armoryEquippedUntil,11.9);
});

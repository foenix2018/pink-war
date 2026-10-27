import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {ShootingRangeGame,trainingSpeed,targetPosition,RANGE_ARMORY,rangeSessionTime} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {armoryChoiceAt,armoryRegions} from '../dist/range-armory-menu.js';
const advance=(g,n)=>{for(let i=0;i<Math.ceil(n/.025);i++)g.step(.025);};
test('mobile drills move substantially slower while retaining gentle progressive difficulty',()=>{
 for(const elapsed of [40,65,90,240]){const old=Math.min(4,1+elapsed/45);assert.ok(trainingSpeed(elapsed)<old*.5);}
 assert.equal(trainingSpeed(0),.6);assert.equal(trainingSpeed(1000),1.5);assert.ok(trainingSpeed(65)>trainingSpeed(40));
 const t={x:0,y:1.2,z:-20,born:0,phase:0,kind:'lateral',range:2.6,speed:trainingSpeed(40)};
 const displacement=Math.abs(targetPosition(t,.01).x-targetPosition(t,0).x);assert.ok(displacement/.01<2.6);
});
test('every actual weapon switch resets all exercise results and pending damage, while invalid or same-weapon choices preserve them',()=>{
 const g=new ShootingRangeGame([],()=>.5);g.collectWeapon();advance(g,.8);const t=g.targets[0];g.shoot({x:0,y:t.y,z:22},{x:0,y:0,z:t.z-22});assert.equal(g.pendingHits.length,1);
 Object.assign(g,{score:500,trainingElapsed:67,trainingHits:4,trainingShots:7,trainingCombo:3,trainingBestCombo:4});const worldTime=g.time;
 assert.equal(g.selectWeapon(1),true);assert.equal(g.time,worldTime);assert.equal(g.trainingElapsed,0);assert.equal(g.score,0);assert.equal(g.trainingHits,0);assert.equal(g.trainingShots,0);assert.equal(g.trainingCombo,0);assert.equal(g.trainingBestCombo,0);assert.equal(g.pendingHits.length,0);assert.equal(g.bullets.length,0);assert.equal(g.targets.length,0);assert.equal(g.trainingActive,false);assert.equal(g.trainingLevel.number,1);assert.equal(g.ammo[1],g.weapon.capacity);
 advance(g,2);assert.equal(g.score,0,'a previous projectile cannot score after the reset');assert.equal(g.trainingElapsed,0,'clock waits for the booth switch');
 g.score=120;g.trainingElapsed=12;assert.equal(g.selectWeapon(1),false);assert.equal(g.selectWeapon(5),false);assert.equal(g.selectWeapon(99),false);assert.equal(g.score,120);assert.equal(g.trainingElapsed,12);
 assert.equal(g.cycleWeapon(),true);assert.equal(g.score,0);assert.equal(g.trainingElapsed,0);assert.equal(rangeSessionTime(125.8),'02:05');
});
test('the rear cabinet is reachable around preparation benches, blocks passage and freezes the exercise while choosing',()=>{
 const art=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(art.obstacles,()=>.5,0,'lylu');
 const walk=(x,z)=>{for(let i=0;i<300&&Math.hypot(g.player.x-x,g.player.z-z)>.08;i++){const dx=x-g.player.x,dz=z-g.player.z,n=Math.hypot(dx,dz),scale=Math.min(1,n/.175);g.step(.025,{x:dx/n*scale,z:dz/n*scale,moveYaw:0});}assert.ok(Math.hypot(g.player.x-x,g.player.z-z)<.10);};
 walk(0,24);walk(1.95,24);walk(1.95,32.2);assert.equal(g.getInteraction().kind,'range-armory');assert.equal(g.collectWeapon(),true);const time=g.time,position={...g.player};advance(g,5);assert.equal(g.time,time);assert.equal(g.shoot({x:0,y:1,z:32},{x:0,y:0,z:-1}),false);assert.deepEqual(g.player,position);assert.equal(g.selectFromArmory(7),false,'LYLU cannot select dual pistols');assert.equal(g.selectFromArmory(6),true);assert.equal(g.weapon.id,'m12');assert.equal(g.rangeArmoryOpen,false);
 g.closeRangeArmory();walk(1.95,33.8);for(let i=0;i<30;i++)g.step(.025,{z:1});assert.ok(g.player.z<=RANGE_ARMORY.z-RANGE_ARMORY.depth/2-.54,'cabinet collider is solid');
 const blocked=new ShootingRangeGame([...art.obstacles,{x:0,z:33,hx:4,hz:.1,y:0,height:3}]);Object.assign(blocked.player,{x:0,z:32});assert.equal(blocked.nearRangeArmory(),false);assert.equal(blocked.collectWeapon(),false);art.dispose();
});
test('cabinet display shares the current real weapon geometry, reserves dual pistols for GHJU and never disposes the live gun resources',()=>{
 const a=createShootingRangeArt(T,new T.Scene()),geo=new T.BoxGeometry(.1,.2,.8),material=new T.MeshStandardMaterial(),sources=Array.from({length:8},()=>{const g=new T.Group();g.add(new T.Mesh(geo,material));return g;});let released=0;geo.addEventListener('dispose',()=>released++);
 a.setArmoryModels(sources,0,'ghju');assert.equal(a.stats().armoryModels,7);
 const display=a.root.getObjectByName('Armes exposées / armoire du stand');display.updateWorldMatrix(true,true);
 for(const slot of display.children)for(const holder of slot.children){const center=new T.Box3().setFromObject(holder).getCenter(new T.Vector3()),anchor=slot.getWorldPosition(new T.Vector3());assert.ok(center.distanceTo(anchor)<.25,'the real model stays inside its cabinet slot, even before the first render');}
 a.setArmoryModels(sources,1,'lylu');assert.equal(a.stats().armoryModels,6);a.dispose();assert.equal(released,0);assert.equal(sources[0].children[0].geometry,geo);geo.dispose();material.dispose();
 const choices=[0,1,2,3,4,6,7];for(const r of armoryRegions(choices))assert.equal(armoryChoiceAt(choices,r.x+r.w/2,r.y+r.h/2),r.index);assert.equal(armoryChoiceAt(choices,12,12),null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {ShootingRangeGame,RANGE_ARMORY_SLOTS,traceRangeArmory} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {VRController,VR_DEFAULTS} from '../dist/vr.js';

test('the rack uses real head translation without moving the locomotion origin, and clearing XR restores desktop proximity',()=>{
 const art=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(art.obstacles,()=>.5,0,'lylu');
 Object.assign(g.player,{x:1.95,z:29});const origin={...g.player};assert.equal(g.nearRangeArmory(),false);
 g.setInteractionPosition({x:1.95,y:1.72,z:32.2});assert.equal(g.getInteraction().kind,'range-armory');assert.deepEqual(g.player,origin);
 assert.equal(g.collectWeapon(),true);assert.equal(g.selectFromArmory(6),true);assert.equal(g.weapon.id,'m12');assert.deepEqual(g.player,origin);
 g.setInteractionPosition();assert.equal(g.nearRangeArmory(),false);g.setInteractionPosition({x:NaN,y:1.7,z:32.2});assert.equal(g.interactionPosition,null);art.dispose();
});

test('ray and close-hand selection match the real compartments, obey cover and exclude GHJU-only pistols for LYLU',()=>{
 const art=createShootingRangeArt(T,new T.Scene()),g=new ShootingRangeGame(art.obstacles,()=>.5,0,'lylu');Object.assign(g.player,{x:0,z:32.2});
 for(const slot of RANGE_ARMORY_SLOTS){
  const origin={x:slot.x,y:slot.y,z:32.8},direction={x:0,y:0,z:1};const target=g.armoryTarget(origin,direction),hand=g.armoryHandTarget({x:slot.x,y:slot.y,z:34.3});
  assert.equal(target?.index??null,slot.index===7?null:slot.index);assert.equal(hand?.index??null,slot.index===7?null:slot.index);
 }
 assert.equal(g.armoryTarget({x:0,y:1.4,z:35},{x:0,y:0,z:-1}),null);assert.equal(g.armoryHandTarget({x:0,y:1.43,z:34.8}),null);
 assert.equal(traceRangeArmory({x:0,y:1.4,z:25},{x:0,y:0,z:1}),null);
 const wall={x:1.56,y:0,z:33.4,hx:.2,hz:.1,height:3};g.obstacles.push(wall);assert.equal(g.nearRangeArmory(),true);
 assert.equal(g.armoryTarget({x:1.56,y:1.43,z:32.8},{x:0,y:0,z:1}),null);
 g.obstacles.push({x:0,y:0,z:33.4,hx:4,hz:.1,height:3});assert.equal(g.nearRangeArmory(),false);assert.equal(g.armoryHandTarget({x:0,y:1.43,z:34.3}),null);art.dispose();
});

test('a direct rack pickup equips and refills only allowed weapons, resets points/time once, and waits for the booth switch',()=>{
 const g=new ShootingRangeGame([],()=>.5,0,'lylu');Object.assign(g.player,{x:0,z:32.2});g.score=760;g.trainingElapsed=67;g.time=91;g.trainingActive=true;g.trainingShots=12;g.trainingHits=8;g.pendingHits=[{id:1}];g.bullets=[{id:2}];g.ammo[6]=1;
 assert.equal(g.takeFromArmory(7),false);assert.equal(g.score,760);assert.equal(g.takeFromArmory(6),true);assert.equal(g.weapon.id,'m12');assert.equal(g.ammo[6],8);assert.equal(g.score,0);assert.equal(g.trainingElapsed,0);assert.equal(g.time,91);assert.equal(g.trainingShots,0);assert.equal(g.trainingHits,0);assert.equal(g.trainingActive,false);assert.equal(g.bullets.length,0);assert.equal(g.pendingHits.length,0);
 g.score=100;g.trainingElapsed=12;assert.equal(g.takeFromArmory(6),true);assert.equal(g.score,100);assert.equal(g.trainingElapsed,12);
 Object.assign(g.player,{z:24});assert.equal(g.takeFromArmory(1),false);assert.equal(g.weapon.id,'m12');
});

test('rack input has priority over wrist skills and cannot also shoot, move or fire a held trigger on closing',()=>{
 const g=new ShootingRangeGame([],()=>.5,0,'lylu'),make=hand=>({handedness:hand,targetRaySpace:{hand},gamepad:{axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,value:0}))}}),left=make('left'),right=make('right');
 let rack=true,skills=0;const state=Object.assign(Object.create(VRController.prototype),{mode:'xr',settings:VR_DEFAULTS,session:{inputSources:[left,right],visibilityState:'visible'},controllers:[],previous:new Map(),triggerBlocked:false,hooks:{game:()=>g,phase:()=> 'playing',rangeArmoryInput:()=>rack,skillsInput:()=>{skills++;return false;},world:()=>({renderer:{xr:{getReferenceSpace:()=>({})}}})}});
 right.gamepad.buttons[0]={pressed:true,value:1};left.gamepad.axes[3]=1;let input=state.input();assert.equal(skills,0);assert.equal(input.fire,false);assert.equal(input.z,0);assert.equal(state.triggerBlocked,true);
 rack=false;input=state.input();assert.equal(input.fire,false);right.gamepad.buttons[0]={pressed:false,value:0};state.input();right.gamepad.buttons[0]={pressed:true,value:1};assert.equal(state.input().fire,true);
});

test('the physical rack highlight shares the exact slot layout and releases its own buffers',()=>{
 const scene=new T.Scene(),art=createShootingRangeArt(T,scene),highlight=scene.getObjectByName('Armoire / arme pointée');assert.equal(highlight.visible,false);
 art.setArmoryHover(6);assert.equal(highlight.visible,true);assert.equal(highlight.position.x,RANGE_ARMORY_SLOTS.find(s=>s.index===6).x);art.setArmoryHover();assert.equal(highlight.visible,false);
 let released=0;highlight.geometry.addEventListener('dispose',()=>released++);highlight.material.addEventListener('dispose',()=>released++);art.dispose();assert.equal(released,2);
});

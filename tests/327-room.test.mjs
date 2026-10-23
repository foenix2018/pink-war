import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomGame } from '../dist/room-game.js';
import { classifyRoomSurface, insideRoomPolygon, roomFloorAt, roomBounds, createRoomNavigation } from '../dist/room-layout.js';
import { segmentBox, WEAPONS, levelCount } from '../dist/game-logic.js';
const rect=(x0,z0,x1,z1,y=0)=>[{x:x0,y,z:z0},{x:x1,y,z:z0},{x:x1,y,z:z1},{x:x0,y,z:z1}];
const floor={polygon:rect(-5,-5,5,5)};
function fixture({area=30,walls=[],hasFloor=true}={}){
 let allowed=hasFloor;const sites=[{x:3,y:0,z:-3},{x:-3,y:0,z:-3},{x:3,y:0,z:3}];
 const room={hasFloor:()=>allowed,floorAt:()=>0,freeArea:()=>area,canStand:p=>Math.abs(p.x)<4.5&&Math.abs(p.z)<4.5,
  findPoint:({purpose,avoid=[]})=>purpose==='weapon'?{x:.8,y:0,z:0}:sites.find(p=>!avoid.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<.7))||null,
  trace:(a,b)=>{let best=null;for(const w of walls){const t=segmentBox(a,b,w);if(t!==null&&(!best||t<best.t))best={t,surface:'metal'};}return best;}};
 const g=new RoomGame(room,()=>.5);return {g,room,setFloor:v=>allowed=v};
}
const step=(g,t)=>{for(let i=0;i<Math.ceil(t/.02);i++)g.step(.02);};
test('floor classification rejects tabletops, accepts a labelled upper floor and retains ceiling/wall semantics',()=>{
 assert.equal(classifyRoomSurface(rect(-2,-2,2,2)),'floor');assert.equal(classifyRoomSurface(rect(-2,-2,2,2,.85),'table'),'object');
 assert.equal(classifyRoomSurface(rect(-2,-2,2,2,3),'floor'),'floor');assert.equal(classifyRoomSurface(rect(-2,-2,2,2,2.4),'ceiling'),'ceiling');
 assert.equal(classifyRoomSurface([{x:0,y:0,z:0},{x:0,y:2,z:0},{x:2,y:2,z:0}],'wall'),'wall');
});
test('concave floor footprints retain a doorway notch instead of replacing the room with a bounding box',()=>{
 const shape=[{x:0,y:0,z:0},{x:4,y:0,z:0},{x:4,y:0,z:4},{x:2,y:0,z:4},{x:2,y:0,z:2},{x:0,y:0,z:2}];
 assert.equal(insideRoomPolygon({x:1,z:3},shape),false);assert.equal(roomFloorAt({x:1,z:3},[{polygon:shape}]),null);assert.equal(roomFloorAt({x:3,z:3},[{polygon:shape}]),0);
 assert.equal(roomFloorAt({x:1,y:4.2,z:1},[floor,{polygon:rect(-2,-2,2,2,2.8)}]),2.8);
 assert.equal(roomFloorAt({x:1,y:1.2,z:1},[floor,{polygon:rect(-2,-2,2,2,2.8)}]),0,'a ceiling above the player is never chosen as their floor');
});
test('room navigation goes around furniture and cannot reach a sealed adjacent room',()=>{
 const nav=createRoomNavigation(roomBounds([floor]),p=>roomFloorAt(p,[floor])!==null&&!(Math.abs(p.x)<.75&&Math.abs(p.z)<1.5));
 assert.ok(nav.reachable({x:-3,z:0},{x:3,z:0}));const next=nav.waypoint({x:-1,z:0},{x:3,z:0});assert.ok(Math.abs(next.z)>0);
 const sealed=createRoomNavigation(roomBounds([floor]),p=>roomFloorAt(p,[floor])!==null&&Math.abs(p.x)>.6);assert.equal(sealed.reachable({x:-2,z:0},{x:2,z:0}),false);
 assert.ok(nav.open.length<=10000);
});
test('no scan cannot start combat; loss of the real floor freezes time, spawning and fire until it returns',()=>{
 const f=fixture({hasFloor:false}),g=f.g;assert.equal(g.start({x:0,y:1.65,z:0}),false);assert.equal(g.enemies.length,0);
 f.setFloor(true);assert.equal(g.start({x:0,y:1.65,z:0}),true);step(g,5);const time=g.time,count=g.enemies.length;
 f.setFloor(false);step(g,5);assert.equal(g.time,time);assert.equal(g.enemies.length,count);assert.equal(g.roomPhase,'scan');
 assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1}),false);f.setFloor(true);step(g,.1);assert.ok(g.time>time);
 const initial=fixture();initial.g.start({x:0,y:1.65,z:0});step(initial.g,.8);initial.setFloor(false);step(initial.g,.2);initial.setFloor(true);step(initial.g,.3);
 assert.equal(initial.g.wave,0);assert.equal(initial.g.activePortals.length,0,'restoring an initial scan must not open a wave-zero portal');step(initial.g,.5);assert.equal(initial.g.wave,1);
});
test('waves telegraph their portals, obey the room population cap and grant a six-second intermission',()=>{
 const {g}=fixture({area:11});g.start({x:0,y:1.65,z:0});step(g,1.6);assert.equal(g.wave,1);assert.equal(g.toSpawn,5);assert.equal(g.enemies.length,0);
 for(let i=0;i<500;i++){g.step(.02);for(const e of g.enemies)e.attackTimer=999;}assert.ok(g.enemies.length<=2);assert.equal(g.maxActive,2);
 g.toSpawn=0;for(const e of [...g.enemies])g.damageEnemy(e,10000,{x:e.x,y:1,z:e.z});g.step(.02);assert.equal(g.roomPhase,'between');assert.equal(g.nextWave,6);
 step(g,5);assert.equal(g.wave,1);step(g,1.1);assert.equal(g.wave,2);
});
test('weapons are delivered at their arena levels and cannot be selected until collected',()=>{
 const {g}=fixture();g.start({x:0,y:1.65,z:0});
 for(let level=1;level<=9;level++){g.beginWave();const index=WEAPONS.findIndex(w=>w.level===level);if(index>0){assert.ok(g.weaponOffers.some(o=>o.index===index));assert.equal(g.selectWeapon(index),false);assert.equal(g.collectWeapon(),true);assert.ok(g.ownedWeapons.has(index));}}
 assert.equal(g.ownedWeapons.size,8);
});
test('delayed weapon delivery is retried when the room has a free visible pedestal location',()=>{
 const {g,room}=fixture();g.start({x:0,y:1.65,z:0});const saved=room.findPoint;room.findPoint=()=>null;g.offerWeapon(1);assert.ok(g.pendingOffers.has(1));assert.equal(g.weaponOffers.length,0);
 room.findPoint=saved;step(g,1.1);assert.equal(g.pendingOffers.size,0);assert.equal(g.weaponOffers[0].index,1);
});
test('a temporarily blocked breach retries the same wave instead of skipping a level or stalling forever',()=>{
 const {g,room}=fixture();g.start({x:0,y:1.65,z:0});const saved=room.findPoint;room.findPoint=()=>null;g.beginWave();assert.equal(g.wave,1);assert.equal(g.roomPhase,'scan');
 room.findPoint=saved;step(g,1.1);assert.equal(g.wave,1);assert.equal(g.roomPhase,'wave');assert.equal(g.toSpawn,5);assert.equal(g.activePortals.length,1);
});
test('real scanned cover blocks hostile bullets, splash and a muzzle placed through a wall',()=>{
 const wall={x:0,z:-1,hx:4,hz:.08,height:2.4},f=fixture({walls:[wall]}),g=f.g;g.start({x:0,y:1.65,z:0});g.nextWave=999;
 g.bullets.push({id:80,x:0,y:1.43,z:-2,vx:0,vy:0,vz:25,damage:20,hostile:true,life:2,weapon:'enemy'});step(g,.1);assert.equal(g.player.hp,100);assert.equal(g.bullets.length,0);
 assert.equal(g.shoot({x:0,y:1.3,z:-2},{x:0,y:0,z:-1}),false);assert.equal(g.ammo[0],12);
});
test('tracked head movement is preserved exactly and regeneration uses the arena delay',()=>{
 const {g}=fixture();g.start({x:0,y:1.65,z:0});g.nextWave=999;g.setHead({x:1.1,y:1.44,z:-.4},.02);step(g,1);
 assert.deepEqual(g.head,{x:1.1,y:1.44,z:-.4});assert.equal(g.player.x,1.1);assert.equal(g.player.z,-.4);g.damage(40);step(g,4.8);assert.equal(g.player.hp,60);step(g,2.5);assert.ok(g.player.hp>95);
});
test('a room blade deflects a physical projectile without homing, while a retracted blade offers no shield',()=>{
 for(const extension of [1,0]){const {g}=fixture();g.start({x:0,y:1.65,z:0});g.nextWave=999;g.ownedWeapons.add(5);g.selectWeapon(5);
  g.updateBlade({base:{x:0,y:1,z:-.8},tip:{x:0,y:2.1,z:-.8},extension},.05,false);g.bullets=[{id:8,x:0,y:1.43,z:-1.5,vx:0,vy:0,vz:20,damage:12,hostile:true,life:2,weapon:'enemy'}];g.step(.05);
  if(extension){assert.equal(g.bullets[0].vz,-20);assert.equal(g.bullets[0].hostile,false);assert.equal(g.player.hp,100);}else{g.step(.05);assert.equal(g.player.hp,88);}
 }
});
test('twenty room waves finish after 670 projectile kills and eight weapons including GHJU dual pistols',()=>{
 const {g}=fixture();g.start({x:0,y:1.65,z:0});let peak=0;
 for(let frame=0;frame<90000&&g.state==='playing';frame++){
  for(const e of g.enemies){e.attackTimer=999;e.speed=0;}g.step(.02);peak=Math.max(peak,g.enemies.length);
  if(g.weaponOffers.length){g.collectWeapon();if(g.weapon.melee)g.selectWeapon(0);}
  if(g.ammo[g.weaponIndex]===0)g.reload();const e=g.enemies[0];
  if(e){const y=e.elevation+(e.form==='probe'?.55:e.form==='scuttler'?.85:1.3);g.shoot({x:0,y:1.35,z:0},{x:e.x,y:y-1.35,z:e.z},1);}
 }
 assert.equal(g.state,'won',JSON.stringify({wave:g.wave,kills:g.kills,hp:g.player.hp,toSpawn:g.toSpawn}));assert.equal(g.wave,20);assert.equal(g.kills,Array.from({length:20},(_,i)=>levelCount(i+1)).reduce((a,b)=>a+b,0));assert.equal(g.ownedWeapons.size,8);assert.ok(peak<=g.maxActive);
});

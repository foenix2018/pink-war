import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import{inertialMove}from'../dist/locomotion.js';import{createFPSMotion,reloadPose,applyFPSCameraMotion}from'../dist/fps-motion.js';
import{turnEnemy,strideFrame}from'../dist/enemy-motion.js';import{gradePolicy}from'../dist/fps-grade.js';
import{ArenaGame,COVER_WALLS,moveInArena}from'../dist/game-logic.js';import{ARENA_COMBAT_LAYOUT,ARENA_COMBAT_ZONES}from'../dist/arena-combat-layout.js';
import{createFortifiedArena}from'../dist/arena-fortress.js';import{buildGun}from'../dist/weapons.js';import{createCharacterKit}from'../dist/soldier.js';
function travel(hz){const v={x:0,z:0};let x=0,z=0;for(const [seconds,tx,tz]of [[1,0,-7],[1,7,0],[1,0,0]])for(let i=0;i<seconds*hz;i++){const d=inertialMove(v,tx,tz,1/hz);x+=d.x;z+=d.z;}return{x,z,vx:v.x,vz:v.z};}
test('horizontal acceleration, stopping and directional changes integrate consistently at different frame rates',()=>{
 const samples=[30,60,90,120].map(travel);for(const s of samples){assert.ok(Math.abs(s.x-samples[0].x)<.001);assert.ok(Math.abs(s.z-samples[0].z)<.001);}
 const v={x:0,z:0},first=inertialMove(v,0,-7,1/60);assert.ok(-first.z<7/60&&v.z<0&&v.z>-7);
 const full=inertialMove(v,0,-7,1);assert.ok(v.z<-6.99&&full.z<0);
});
test('momentum stops against a thin wall instead of accumulating into it',()=>{
 const g=new ArenaGame([{x:0,z:0,hx:8,hz:.04,y:0,height:5}],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.player.z=2;
 for(let i=0;i<180;i++)g.step(1/60,{z:-1,sprint:true});assert.ok(g.player.z>=.59-1e-6);assert.equal(g.planarVelocity.z,0);
 for(let i=0;i<8;i++)g.step(1/60,{z:1});assert.ok(g.player.z>.8,'direction reversal immediately moves away from cover');
});
test('the weapon travels with speed, look inertia and landing, while tracked head and controller frames remain still',()=>{
 const a=createFPSMotion();a.update({time:0,dt:0,yaw:0});const moving=a.update({time:.05,dt:.05,yaw:.2,velocity:{x:2,z:-7},sprinting:true});assert.ok(Math.abs(moving.yaw)>0&&moving.y<0);
 a.update({time:.1,dt:.05,grounded:false,verticalSpeed:-8});const land=a.update({time:.15,dt:.05,grounded:true,verticalSpeed:0});assert.ok(land.cameraY<0);
 const tracked=a.update({time:.2,dt:.05,velocity:{x:4,z:-8},yaw:.8,tracked:true,sprinting:true});for(const k of ['x','y','z','pitch','yaw','roll','cameraY','cameraRoll'])assert.equal(Math.abs(tracked[k]),0,k);
 const camera=new T.PerspectiveCamera();camera.position.set(0,1.7,0);const before=camera.matrix.clone();applyFPSCameraMotion(camera,{time:1,player:{x:0,z:0,yaw:0},playerVelocity:{x:3,z:-7}},{tracked:true});assert.deepEqual(camera.matrix.elements,before.elements);assert.equal(camera.position.y,1.7);
});
test('reload has distinct removal, insertion and locking phases and returns exactly to neutral',()=>{
 assert.equal(Math.abs(reloadPose(0).magazineY),0);assert.ok(reloadPose(.35).magazineY<-.23);assert.equal(Math.abs(reloadPose(.7).magazineY),0);assert.ok(reloadPose(.7).seat>0);assert.ok(reloadPose(.81).rack>0);
 for(const k of ['x','y','z','pitch','yaw','roll','magazineY','magazineZ'])assert.equal(Math.abs(reloadPose(1)[k]),0,k);
});
test('the actual NEXUS and ARES magazines move separately and restore without moving the grip root',()=>{
 const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial()]));
 const gun=buildGun({mats,gloves:kit.gloves,makeFlash:p=>{const o=new T.Object3D();p.add(o);return o;}});
 for(const slot of [1,2]){gun.userData.setVariant(slot);const mag=gun.userData.weaponModels[slot].getObjectByName('Reload magazine');assert.ok(mag,'original magazine retained');const bind=mag.position.clone(),grip=gun.position.clone();gun.userData.setCombatState({reloading:true,reloadProgress:.35,time:1});assert.ok(mag.position.distanceTo(bind)>.1);assert.ok(gun.position.equals(grip));gun.userData.setCombatState({reloading:false,time:2});assert.ok(mag.position.distanceTo(bind)<1e-7);}
 gun.userData.setMovementState({time:3,dt:.05,velocity:{x:4,z:-7},tracked:true});gun.userData.recoilTracked=true;gun.userData.setCombatState({reloading:true,reloadProgress:.3,time:3});assert.equal(gun.userData.actionRoot.rotation.x,0);assert.equal(gun.userData.actionRoot.rotation.z,0);gun.userData.disposeDynamic();
});
test('enemy turning follows the short arc, heavier chassis turn more slowly, and strafing uses a lateral stride',()=>{
 const a={yaw:Math.PI-.02,form:'synth'};turnEnemy(a,-Math.PI+.02,.02);assert.ok(Math.abs(a.turnRate)<3);
 const heavy={yaw:0,form:'brute'},fast={yaw:0,form:'spectre'};turnEnemy(heavy,2,.05);turnEnemy(fast,2,.05);assert.ok(fast.yaw>heavy.yaw);assert.ok(Math.abs(fast.turnRate)<=12+1e-9);
 assert.ok(Math.abs(strideFrame(3,0,0).angle-Math.PI/2)<1e-9);assert.equal(strideFrame(0,-3,0).angle,0);
});
test('the arena has three connected sectors with open spawn and bounded static geometry',()=>{
 const scene=new T.Scene(),obstacles=[],arena=createFortifiedArena(T,scene,obstacles,COVER_WALLS,{quality:'high'});assert.equal(ARENA_COMBAT_ZONES.length,3);assert.equal(arena.stats.combatSpaces,3);assert.ok(arena.stats.triangles<350000);assert.ok(arena.stats.meshes<260);
 for(const o of ARENA_COMBAT_LAYOUT)assert.ok(obstacles.some(b=>b.id===o.id&&b.height===o.height));
 const g=new ArenaGame(obstacles,()=>.5);g.navigation.update({x:0,z:22},0);for(const [x,z]of [[-24,8],[0,-12],[32,8]]){const i=g.navigation.nearestOpen(x,z);assert.ok(i>=0&&g.navigation.distance[i]>=0,`${x},${z} connected`);}
 const p={x:0,z:22,elevation:0};moveInArena(p,0,0,.55,obstacles);assert.deepEqual([p.x,p.z],[0,22]);
});
test('the full presentation is restricted to desktop quality; phone, headset and performance keep the direct render',()=>{
 assert.ok(gradePolicy({artQuality:'normal'}).enabled);for(const profile of [{phone:true},{headset:true},{compatible:true},{artQuality:'low'},{artQuality:'performance'}])assert.equal(gradePolicy(profile).enabled,false);
});

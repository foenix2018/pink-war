import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame,WEAPONS,projectileDamage,starterWeaponIndex} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {RoomGame} from '../dist/room-game.js';
import {ShootingRangeGame} from '../dist/shooting-range.js';
import {createM12Shotgun,M12_FRAME} from '../dist/m12-shotgun.js';
import {OPTICS} from '../dist/weapons.js';
import {flatSightPose} from '../dist/optics.js';
import {restoreM01Checkpoint,writeM01Checkpoint,readM01Checkpoint} from '../dist/m01-checkpoint.js';
import {SHOT_RADIUS} from '../dist/hearing.js';
import {hapticPlan} from '../dist/haptics.js';
import {LASER_PROFILES,playLaserShot} from '../dist/laser-sound.js';
const start=()=>{const g=new ArenaGame([],()=>.5,null,'lylu');g.nextWave=-1;g.toSpawn=0;return g;};

test('LYLU retains M12 in story, survival and AT HOME; GHJU starts with dual R9',()=>{
 for(const hero of ['ghju','lylu']){
  const index=starterWeaponIndex(hero),campaign=new CampaignLevel1([],()=>.5,hero),arena=new ArenaGame([],()=>.5,null,hero);
  const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>12};const home=new RoomGame(room,()=>.5,hero);home.start({x:0,y:1.65,z:0});
  for(const g of [campaign,arena,home]){assert.equal(g.weaponIndex,index);assert.deepEqual([...g.ownedWeapons],hero==='lylu'?[6,0]:[7,0]);assert.equal(g.ammo[index],hero==='lylu'?8:24);}
  arena.reset();assert.equal(arena.weaponIndex,index,'restarting retains the selected hero');
 }
 const campaign=new CampaignLevel1([],()=>.5,'lylu');assert.equal(campaign.enemies.length,8);assert.equal(campaign.campaign.total,32);
 assert.equal(new ShootingRangeGame([],()=>.5,6).weapon.id,'m12');
});
test('one M12 trigger press consumes one cartridge for eight independent ballistic pellets, also when aiming vertically',()=>{
 for(const direction of [{x:0,y:0,z:-1},{x:0,y:1,z:0}]){
  const g=start();assert.equal(g.shoot({x:0,y:1.5,z:0},direction),true);assert.equal(g.ammo[6],7);assert.equal(g.bullets.length,8);
  assert.equal(g.drainEvents().filter(e=>e.type==='shot').length,1);const keys=new Set(g.bullets.map(b=>[b.vx,b.vy,b.vz].map(v=>v.toFixed(4)).join(',')));assert.equal(keys.size,8,'no duplicated seam pellet or collapsed skyward pattern');
  for(const b of g.bullets)assert.ok(Math.abs(Math.hypot(b.vx,b.vy,b.vz)-WEAPONS[6].speed)<1e-8);
 }
 const g=start();g.trigger(true,.016,{x:0,y:1,z:0},{x:0,y:0,z:-1});for(let i=0;i<100;i++){g.step(.016,{});g.trigger(true,.016,{x:0,y:1,z:0},{x:0,y:0,z:-1});}assert.equal(g.ammo[6],7,'holding the trigger cannot skip the manual pump');
 g.trigger(false,.016,{x:0,y:1,z:0},{x:0,y:0,z:-1});g.trigger(true,.016,{x:0,y:1,z:0},{x:0,y:0,z:-1});assert.equal(g.ammo[6],6);
});
test('shotgun pellets lose power with distance and all stop on the same real cover',()=>{
 const b={weapon:'m12',damage:18,originX:0,originY:1.5,originZ:0};assert.equal(projectileDamage(b,{x:0,y:1.5,z:-5}),18);assert.ok(projectileDamage(b,{x:0,y:1.5,z:-25})<18);assert.ok(Math.abs(projectileDamage(b,{x:0,y:1.5,z:-50})-3.6)<1e-8);
 assert.equal(projectileDamage({...b,weapon:'r9'},{x:0,y:1.5,z:-50}),18);
 const g=start();g.obstacles=[{x:0,z:-2,hx:3,hz:.1,y:0,height:4}];g.shoot({x:0,y:1.5,z:0},{x:0,y:0,z:-1});g.step(.05,{});assert.equal(g.bullets.length,0);assert.equal(g.drainEvents().filter(e=>e.type==='impact').length,8);
});
test('reload locks the shotgun and restores its eight cartridges once',()=>{
 const g=start();g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1});assert.equal(g.reload(),true);assert.equal(g.reload(),false);assert.equal(g.shoot({x:0,y:1,z:0},{x:0,y:0,z:-1}),false);
 for(let i=0;i<60;i++)g.step(.05,{});assert.equal(g.ammo[6],8);assert.equal(g.drainEvents().filter(e=>e.type==='reloaded').length,1);
});
test('the reference model has a true skeletal stock opening, a bored muzzle and bounded merged geometry',()=>{
 const model=createM12Shotgun();model.updateMatrixWorld(true);const cast=(p,d)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d)).intersectObject(model,true);
 assert.equal(cast([-1,.023,.12],[1,0,0]).length,0,'the stock hole passes entirely through both sides');assert.ok(cast([-1,.10,.12],[1,0,0]).length>0,'the surrounding stock brace is solid');
 assert.ok(cast([0,.124,-1.1],[0,0,1])[0].point.z>-.40,'no opaque muzzle cap');
 const bounds=new T.Box3().setFromObject(model);assert.ok(Math.abs(bounds.min.z-M12_FRAME.muzzle[2])<.001);assert.ok(bounds.max.z>.30&&bounds.max.z<.35);
 let meshes=0,triangles=0;model.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});assert.ok(meshes<=9);assert.ok(triangles<18000);model.userData.dispose();
});
test('pump moves along the bore, returns home and remains independent on another weapon instance',()=>{
 const a=createM12Shotgun(),b=createM12Shotgun();const pump=a.getObjectByName('M12 pump'),other=b.getObjectByName('M12 pump');
 a.userData.animate({impulse:1},.05);for(let i=0;i<6;i++)a.userData.animate({impulse:0},.05);assert.ok(pump.position.z>.08);assert.equal(pump.position.y,0);assert.equal(other.position.z,0);
 for(let i=0;i<10;i++)a.userData.animate({impulse:0},.05);assert.equal(pump.position.z,0);
 a.userData.animate({reloading:true,reloadProgress:.5},.016);assert.equal(a.getObjectByName('M12 reload shell').visible,true);a.userData.resetAnimation();assert.equal(a.getObjectByName('M12 reload shell').visible,false);
 let ga,gb;a.traverse(o=>{if(o.name==='M12 fixed paint')ga=o.children[0].geometry;});b.traverse(o=>{if(o.name==='M12 fixed paint')gb=o.children[0].geometry;});assert.equal(ga,gb,'static geometry is shared');a.userData.dispose();b.userData.dispose();
});
test('M12 iron sights keep the full stock ahead of the screen eye; audio, awareness and feedback have dedicated profiles',()=>{
 const pose=flatSightPose(OPTICS.m12,1);assert.ok(pose.z+.326<-.10,'butt does not cross the eye');assert.equal(OPTICS.m12.iron,true);
 assert.ok(SHOT_RADIUS.m12>SHOT_RADIUS.r9);assert.ok(LASER_PROFILES.m12.noise>LASER_PROFILES.r9.noise);assert.equal(playLaserShot(null,'m12'),false);assert.equal(hapticPlan('shot','m12').main[0],1);
});
test('new and legacy LYLU checkpoints retain the shotgun and acquired mission weapons',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};const a=new CampaignLevel1([],()=>.5,'lylu');a.enemies=[];a.toSpawn=0;a.player.grounded=true;a.setStage('investigation');a.ammo[6]=3;
 assert.equal(writeM01Checkpoint(a,storage),true);const b=new CampaignLevel1([],()=>.5,'lylu');assert.equal(restoreM01Checkpoint(b,readM01Checkpoint('lylu',storage)),true);assert.equal(b.weaponIndex,6);assert.equal(b.ammo[6],3);assert.equal(b.weaponOffers[0].index,1);
 const legacy={version:1,characterId:'lylu',stage:'sabotage',kills:24,owned:[0,1],ammo:[4,12,5,6,4,0],health:68,investigationRead:true};assert.equal(restoreM01Checkpoint(b,legacy),true);assert.ok(b.ownedWeapons.has(6)&&b.ownedWeapons.has(1));assert.equal(b.weaponIndex,1);
});

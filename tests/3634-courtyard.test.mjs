import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {LEVEL1_MAP,createLevel1Obstacles} from '../dist/level1-layout.js';
import {createCourtyardArt} from '../dist/m01-courtyard.js';
import {createLevel1Story} from '../dist/level1-story.js';
import {readM01Checkpoint,writeM01Checkpoint,restoreM01Checkpoint} from '../dist/m01-checkpoint.js';
import {openingDefenseOrder} from '../dist/m01-defense.js';
import {MESH_INFO} from '../dist/levels/vesper-01-mesh.js';
const material=new T.MeshStandardMaterial(),maps=Object.fromEntries(['steel','rust','dark','plaster','amber'].map(n=>[n,material]));
const details=createCourtyardArt(T,new T.Group(),maps,{labels:false}),story=createLevel1Story(T,new T.Group(),maps),obstacles=[...createLevel1Obstacles(),...details.colliders,...story.colliders];
const make=()=>{const g=new CampaignLevel1(obstacles,()=>.5);g.invulnerable=1e6;return g;};
const advance=(g,t)=>{for(let i=0;i<t/.025;i++)g.step(.025,{})};
const at=(g,p)=>Object.assign(g.player,{x:p.x,z:p.z+1.5,elevation:0,grounded:true});
const isolate=g=>{at(g,LEVEL1_MAP.courtyard.controls[0]);assert.ok(g.interact());};
function clear(g){for(const e of [...g.enemies])g.damageEnemy(e,1e6,{x:e.x,y:e.elevation+1.3,z:e.z});}
function walk(g,points){let length=0;for(const [x,z]of points){let stale=0;for(let i=0;i<1800;i++){
 const dx=x-g.player.x,dz=z-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;const before={...g.player};g.step(.05,{x:dx/d,z:dz/d,yaw:0});const moved=Math.hypot(g.player.x-before.x,g.player.z-before.z);length+=moved;stale=moved<.001?stale+1:0;assert.ok(stale<20,'blocked at '+g.player.x+','+g.player.z+' heading '+x+','+z);assert.ok(i<1799,'route must terminate');}}return length;}

test('both approaches cross real openings, clear physical props and reach the original power panel',()=>{
 for(const route of LEVEL1_MAP.courtyard.approaches){const g=make();g.enemies=[];g.openingSpawned=8;const length=walk(g,route.points);assert.ok(length>70&&length<125);g.setStage('power');assert.equal(g.getInteraction()?.id,'power');assert.equal(g.player.elevation,0);}
 assert.deepEqual(MESH_INFO.bounds,LEVEL1_MAP.bounds);assert.equal(MESH_INFO.revision,'3.63.9');assert.equal(MESH_INFO.rustedVehicles,8);assert.equal(LEVEL1.exit.y,4.8);
});
test('either electrical isolator works, while early activation, a wrong floor and a blocking wall are rejected',()=>{
 for(const c of LEVEL1_MAP.courtyard.controls){const g=make();assert.equal(g.stage,'approach');at(g,LEVEL1.power);assert.equal(g.interact(),false);at(g,c);g.player.elevation=4.8;assert.equal(g.interact(),false);g.player.elevation=0;assert.equal(g.getInteraction()?.id,c.id);assert.equal(g.interact(),true);assert.equal(g.circuitRoute,c.id);assert.equal(g.stage,'power');at(g,LEVEL1.power);assert.equal(g.interact(),true);assert.equal(g.powerAlarm,true);assert.equal(g.stage,'archive');}
 const g=make(),c=LEVEL1_MAP.courtyard.controls[0];at(g,c);g.replaceObstacles([{x:c.x,z:c.z+.5,y:0,hx:3,hz:.1,height:3}]);assert.equal(g.interact(),false);
});
test('power brings only four announced reinforcements, and the archive resumes the same eight-enemy budget',()=>{
 const g=make();clear(g);isolate(g);at(g,LEVEL1.power);g.interact();const p=g.activePortals[0];assert.ok(p);assert.ok(Math.hypot(p.x-g.player.x,p.z-g.player.z)>=14);advance(g,2.9);assert.equal(g.enemies.length,0);advance(g,.2);assert.equal(g.enemies.length,1);
 for(let i=0;i<600&&g.spawned<4;i++)g.step(.025,{});assert.equal(g.spawned,4);assert.equal(g.toSpawn,0);advance(g,5);assert.equal(g.spawned,4,'the pre-archive group is finite');clear(g);assert.equal(g.kills,12);
 at(g,LEVEL1.archive);assert.equal(g.interact(),true);advance(g,5.1);assert.equal(g.stage,'combat');assert.equal(g.spawned,4);assert.equal(g.toSpawn,4);for(let i=0;i<1200&&g.spawned<8;i++)g.step(.025,{});assert.equal(g.spawned,8);clear(g);g.step(.025,{});assert.equal(g.stage,'workshop');assert.equal(g.kills,16);assert.equal(g.campaign.total,32);assert.equal(g.campaign.spawned,16);
});
test('opening posts stay finite, activate by perception and abandon their anchor after the fixed circuit alarm',()=>{
 const g=make();assert.equal(g.enemies.length,8);assert.ok(g.enemies.every(e=>e.defense));assert.ok(g.enemies.filter(e=>e.defense.role==='anchor').length>=3);
 const bot={form:'stalker',x:0,z:12,awareness:'patrol',defense:{x:0,z:12,facing:1.2,role:'anchor'}},ctx={time:0,seen:false,threat:{x:4,z:30}};
 let order=openingDefenseOrder(bot,ctx,false);assert.equal(order.state,'watch');assert.equal(order.canFire,false);assert.equal(order.yaw,1.2);
 bot.awareness='engaged';order=openingDefenseOrder(bot,{...ctx,seen:true},false);assert.equal(order.state,'anchor');assert.equal(order.canFire,true);
 bot.awareness='search';const a=openingDefenseOrder(bot,{...ctx,threat:{x:3,z:22}},false);assert.deepEqual(a.point,{x:3,z:22});assert.equal(a.canFire,false);assert.equal(openingDefenseOrder(bot,ctx,true),null);
 isolate(g);at(g,LEVEL1.power);g.interact();assert.ok(g.enemies.every(e=>e.lastKnownX===LEVEL1.power.x&&e.lastKnownZ===LEVEL1.power.z));
});
test('the introductory sight line is occupied and pressure damages a stationary player without increasing enemy health',()=>{
 const g=new CampaignLevel1(obstacles,()=>.5);g.enableArmorShield();const probe=g.enemies[0],start={...g.player};assert.equal(g.blocked({x:start.x,y:1.6,z:start.z},{x:probe.x,y:probe.elevation+.55,z:probe.z}),false);assert.ok(Math.abs(probe.x-start.x)<4&&start.z-probe.z>10);advance(g,18);assert.ok(g.player.shield<60||g.player.hp<100);assert.equal(g.stage,'approach');assert.equal(g.enemies.length,8);
});
test('early checkpoints retain circuit state, shield and charges, without reintroducing patrols or duplicate reinforcements',()=>{
 for(const stage of ['power','archive']){const g=make();g.enableArmorShield();clear(g);isolate(g);if(stage==='archive'){at(g,LEVEL1.power);g.interact();for(let i=0;i<1000&&g.spawned<4;i++)g.step(.025,{});clear(g);}g.player.shield=31;g.charges=3;const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)};assert.equal(g.stage,stage);assert.equal(writeM01Checkpoint(g,storage),true);const s=readM01Checkpoint('ghju',storage);assert.equal(s.version,3);const loaded=make();loaded.enableArmorShield();assert.equal(restoreM01Checkpoint(loaded,s),true);assert.equal(loaded.circuitIsolated,true);assert.equal(loaded.circuitRoute,'isolate-convoy');assert.equal(loaded.player.shield,31);assert.equal(loaded.charges,3);assert.equal(loaded.enemies.length,0);loaded.step(.025,{});assert.equal(loaded.enemies.length,0);if(stage==='archive'){assert.equal(loaded.spawned,4);at(loaded,LEVEL1.archive);loaded.interact();advance(loaded,5.1);assert.equal(loaded.toSpawn,4);}}
});
test('courtyard scenery stays in a bounded mobile budget and its furniture collides at the rendered location',()=>{
 const s=details.stats();assert.equal(s.approaches,2);assert.equal(s.medicalCots,3);assert.ok(s.triangles<22000);assert.ok(s.draws<30);assert.ok(details.colliders.filter(c=>c.courtyardPart==='cot').length===3);let lights=0;details.root.traverse(o=>{if(o.isLight)lights++});assert.equal(lights,0);assert.ok(MESH_INFO.triangles<340000);assert.equal(MESH_INFO.batches,14);
});

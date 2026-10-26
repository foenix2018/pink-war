import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {LEVEL1_MAP,createLevel1Obstacles} from '../dist/level1-layout.js';
import {createWorkshopArt} from '../dist/m01-workshop.js';
import {createLevel1Story} from '../dist/level1-story.js';
import {readM01Checkpoint,writeM01Checkpoint,restoreM01Checkpoint} from '../dist/m01-checkpoint.js';
const material=new T.MeshStandardMaterial(),maps=Object.fromEntries(['paint','metal','rubber','steel','rust','dark','plaster','amber'].map(n=>[n,material]));
const story=createLevel1Story(T,new T.Group(),maps),obstacles=[...createLevel1Obstacles(),...story.colliders,{x:-21,z:19.45,y:0,hx:1.3,hz:.3,height:1.93,campaignTerminal:'investigation'}];
function game(){const g=new CampaignLevel1(obstacles,()=>.5);g.enemies=[];g.openingSpawned=8;g.invulnerable=1e8;return g;}
function walk(g,points){for(const [x,z]of points){let stale=0;for(let i=0;i<1800;i++){const dx=x-g.player.x,dz=z-g.player.z,d=Math.hypot(dx,dz);if(d<.3)break;const before={...g.player};g.step(.05,{x:dx/d,z:dz/d,yaw:0});stale=Math.hypot(g.player.x-before.x,g.player.z-before.z)<.001?stale+1:0;assert.ok(stale<20,'blocked at '+JSON.stringify({x:g.player.x,z:g.player.z,target:[x,z]}));assert.ok(i<1799);}}}
const at=(g,p)=>Object.assign(g.player,{x:p.x,z:p.z+1.5,elevation:0,grounded:true});
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
test('both workshop approaches and the rear shop entrance are physically walkable, including story props',()=>{
 for(const route of LEVEL1_MAP.workshop.approaches){const g=game();g.setStage('workshop');Object.assign(g.player,{x:route.points[0][0],z:route.points[0][1]});walk(g,route.points);assert.equal(g.getInteraction()?.id,'workshop');walk(g,LEVEL1_MAP.workshop.toJournal);g.setStage('investigation');assert.equal(g.getInteraction()?.id,'investigation');assert.equal(g.player.elevation,0);}
});
test('workshop circuit cannot be skipped, announces a distant reachable west breach and opens the second journal only after eight kills',()=>{
 const g=game();g.setStage('workshop');at(g,LEVEL1.investigation);assert.equal(g.interact(),false);
 at(g,LEVEL1.workshop);g.player.elevation=4.8;assert.equal(g.interact(),false);g.player.elevation=0;
 assert.equal(g.interact(),true);assert.equal(g.workshopReleased,true);assert.equal(g.stage,'combat2');assert.equal(g.toSpawn,8);
 const p=g.activePortals[0];assert.ok(LEVEL1_MAP.workshop.portals.some(([x,z])=>x===p.x&&z===p.z));assert.ok(Math.hypot(p.x-g.player.x,p.z-g.player.z)>=12);assert.ok(g.portalIsClear(p));assert.ok(g.navigation.distance[g.navigation.nearestOpen(p.x,p.z)]>=0);
 for(let i=0;i<58;i++)g.step(.05,{});assert.equal(g.enemies.length,0,'portal is announced before arrival');
 for(let i=0;i<1500&&g.stage==='combat2';i++){g.step(.05,{});for(const e of [...g.enemies])g.damageEnemy(e,1e6,{x:e.x,y:e.elevation+1.3,z:e.z});}
 assert.equal(g.kills,8);assert.equal(g.stage,'investigation');assert.equal(g.activePortals.length,0);assert.equal(g.campaign.total,32);
 walk(g,LEVEL1_MAP.workshop.toJournal);assert.equal(g.interact(),true);assert.equal(g.stage,'crossing');at(g,LEVEL1.junction);g.step(.05,{});assert.equal(g.stage,'sabotage');assert.equal(g.toSpawn,0);assert.ok(g.weaponOffers.some(o=>o.index===2));
});
test('legacy shop saves migrate before the workshop; new checkpoints restore the cleared west encounter without duplicating it',()=>{
 for(const version of [1,2]){const g=game();const s={version,stage:'investigation',characterId:'ghju',kills:16,owned:[7,0,1],weaponIndex:1};assert.equal(restoreM01Checkpoint(g,s),true);assert.equal(g.stage,'workshop');assert.equal(g.workshopReleased,false);assert.equal(g.encounter,0);assert.equal(g.kills,16);assert.equal(s.stage,'investigation','migration does not mutate caller data');}
 for(const stage of ['workshop','investigation']){const g=game();g.setStage(stage);g.kills=stage==='workshop'?16:24;g.player.grounded=true;const store=storage();assert.equal(writeM01Checkpoint(g,store),true);const save=readM01Checkpoint('ghju',store),loaded=game();assert.equal(save.version,3);assert.equal(restoreM01Checkpoint(loaded,save),true);loaded.step(.05,{});assert.equal(loaded.stage,stage);assert.equal(loaded.workshopReleased,stage==='investigation');assert.equal(loaded.encounter,stage==='workshop'?0:1);assert.equal(loaded.campaign.spawned,g.kills);assert.equal(loaded.enemies.length,0);assert.equal(loaded.toSpawn,0);}
});
test('workshop fittings share materials, add no lights and release owned geometry',()=>{
 const parent=new T.Group(),art=createWorkshopArt(T,parent,maps,{labels:false,equipment:maps});let lights=0;art.root.traverse(o=>{if(o.isLight)lights++;});const stats=art.stats();assert.equal(lights,0);assert.ok(stats.triangles<20000);assert.ok(stats.draws<15);assert.equal(stats.approaches,2);art.update({workshopReleased:true});assert.equal(art.stats().powered,true);art.dispose();assert.equal(parent.children.length,0);
});

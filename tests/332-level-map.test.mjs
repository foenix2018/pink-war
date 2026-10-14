import test from 'node:test';
import assert from 'node:assert/strict';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
import {createLevel1Obstacles,LEVEL1_MAP} from '../dist/level1-layout.js';
import {liftHeightAt} from '../dist/world-layout.js';
const step=(g,seconds,input={})=>{for(let i=0;i<seconds/.025;i++)g.step(.025,input);};
function walk(g,x,z){let k=0;while(Math.hypot(g.player.x-x,g.player.z-z)>.12&&k++<10000){const dx=x-g.player.x,dz=z-g.player.z,n=Math.hypot(dx,dz);g.step(.025,{x:dx/n,z:dz/n,yaw:0});}assert.ok(k<10000,`walkable route to ${x},${z}, at ${g.player.x},${g.player.z}`);}
test('complete physical route from outside lab through doors and street climbs to terminal',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles());
 // use the actual shared input names, same as PC/touch/VR
 for(const p of [[0,67],[-6,63.6],[0,63.6],[0,56.5],[2.3,56.5],[2.3,51.5],[0,47],[0,29],[0,13],[18,13],[18,6],[18,-17],[18,-39],[18,-43]])walk(g,...p);
 assert.ok(Math.abs(g.player.elevation-4.8)<.02);g.setStage('exit');assert.equal(g.getInteraction()?.id,'exit');assert.equal(g.interact(),true);
});
test('mission has independent floors, no ghost garden platform or arena catwalk',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles()),arena=new ArenaGame([]);
 assert.equal(g.surfaceHeight(-48,39),0);assert.equal(g.surfaceHeight(58,0),0);
 assert.equal(g.surfaceHeight(18,-43),4.8);assert.equal(g.surfaceHeight(18,-29),2.4);
 assert.ok(arena.surfaceHeight(-48,39)>0);
});
test('service elevator carries player and updates the exact moving collider',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles()),l=LEVEL1_MAP.lifts[0];Object.assign(g.player,{x:l.x,z:l.z,elevation:0,grounded:true});step(g,10.5);
 assert.equal(g.player.onLift,l.id);assert.ok(Math.abs(g.player.elevation-4.8)<.02);
 const c=g.obstacles.find(o=>o.liftId===l.id);assert.ok(Math.abs(c.y+c.height-liftHeightAt(l,g.time))<.001);
 walk(g,24,-45);walk(g,18,-43);assert.ok(Math.abs(g.player.elevation-4.8)<.02);
});
test('each portal site is clear and enemy navigation reaches laboratory and north junction',()=>{
 const boxes=createLevel1Obstacles(),g=new CampaignLevel1(boxes),nav=g.navigation;
 for(const player of [LEVEL1.archive,LEVEL1.junction]){nav.refreshAt=-1;nav.update(player,0);for(const [x,z] of LEVEL1_MAP.portals){assert.equal(g.portalIsClear({x,z}),true);assert.ok(nav.distance[nav.nearestOpen(x,z)]>=0);}}
 const origin={x:0,y:1.3,z:72},throughWall={x:-8,y:1.3,z:68};assert.ok(boxes.some(b=>segmentBox(origin,throughWall,b)!==null));
});
test('the new map supports both patrols with actual projectile hits and cover intact',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles(),()=>.5);g.invulnerable=1000;
 Object.assign(g.player,{x:-6,z:63.6});assert.equal(g.interact(),true);Object.assign(g.player,{x:0,z:56.5});assert.equal(g.interact(),true);
 walk(g,2.3,56.5);walk(g,2.3,51.5);walk(g,0,47);
 function defeat(stage){let n=0;while(g.stage===stage&&n++<9000){for(const e of g.enemies){e.speed=0;e.stunnedUntil=1000;}const e=g.enemies[0];if(e){if(g.ammo[0]===0)g.reload();const y=e.elevation+(e.form==='probe'?.55:e.form==='scuttler'?.79:1.27)*(e.form==='seer'?1.04:e.form==='scuttler'?.98:1);const origin={x:g.player.x,y:g.player.elevation+1.45,z:g.player.z};g.shoot(origin,{x:e.x-origin.x,y:y-origin.y,z:e.z-origin.z});}g.step(.025);}assert.ok(n<9000,`patrol ${stage} has a shootable route`);}
 step(g,6);defeat('combat');assert.equal(g.stage,'crossing');
 walk(g,0,29);walk(g,0,13);walk(g,18,13);walk(g,18,6);assert.equal(g.stage,'combat2');defeat('combat2');assert.equal(g.kills,8);
 walk(g,18,-17);walk(g,18,-39);walk(g,18,-43);assert.equal(g.interact(),true);assert.equal(g.state,'won');
});
test('an alerted ground robot uses the mission stairs instead of the arena routes',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles(),()=>.5);g.invulnerable=1000;Object.assign(g.player,{x:18,z:-43,elevation:4.8});g.encounter=1;g.stage='combat2';g.activePortals=[{id:101,x:18,z:-14,yaw:0}];g.toSpawn=1;g.nextSpawnAt=0;g.spawnEnemy();
 const e=g.enemies[0];Object.assign(e,{x:18,z:-16,lastKnownX:18,lastKnownZ:-43,lastKnownHeight:4.8,awareness:'search',alertedUntil:1000});g.toSpawn=0;g.spawned=4;
 step(g,30);assert.ok(e.elevation>4.5,`robot climbs own map stairs, got ${e.elevation} at ${e.x},${e.z}`);
});

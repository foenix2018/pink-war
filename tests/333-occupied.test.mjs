import test from 'node:test';import assert from 'node:assert/strict';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {createLevel1Obstacles,LEVEL1_MAP} from '../dist/level1-layout.js';
const run=(g,seconds)=>{for(let i=0;i<seconds/.025;i++)g.step(.025)};
test('arrival stays safe while stationary; leaving it activates a finite distant patrol',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles());assert.equal(g.stage,'approach');assert.equal(g.enemies.length,0);
 run(g,30);assert.equal(g.enemies.length,0);assert.equal(g.player.hp,100);assert.equal(g.activePortals.length,0);
 Object.assign(g.player,{x:-50,z:80});g.step(.025);assert.equal(g.enemies.length,8);assert.equal(g.openingSpawned,8);assert.ok(g.enemies.every(e=>Math.hypot(e.homeX+50,e.homeZ-80)>=12));
 const ids=g.enemies.map(e=>e.id);g.replaceObstacles(createLevel1Obstacles());g.step(.025);assert.deepEqual(g.enemies.map(e=>e.id),ids);
});
test('an isolated archive power surge protects five seconds of reading without erasing sentries',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles());Object.assign(g.player,{...LEVEL1_MAP.courtyard.controls[0],z:LEVEL1_MAP.courtyard.controls[0].z+1.5});g.interact();Object.assign(g.player,{x:-6,z:63.6});g.interact();Object.assign(g.player,{x:0,z:56.5});g.interact();const ids=g.enemies.map(e=>e.id);const hp=g.player.hp;
 g.damage(80);run(g,4.8);assert.equal(g.player.hp,hp);assert.equal(g.stage,'breach');assert.deepEqual(g.enemies.map(e=>e.id),ids);assert.ok(g.enemies.every(e=>e.stunnedUntil>=5));
});
test('replay and renderer collision replacement retain a single opening patrol',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles());const ids=g.enemies.map(e=>e.id);g.replaceObstacles(createLevel1Obstacles());run(g,1);assert.deepEqual(g.enemies.map(e=>e.id),ids);
 g.reset('lylu');assert.equal(g.characterId,'lylu');assert.equal(g.enemies.length,0);assert.equal(g.openingSpawned,0);assert.equal(g.time,0);
});
test('two hollow ground-floor buildings expose physically traversable rooms, all wrecks block shots',()=>{
 const boxes=createLevel1Obstacles(),g=new CampaignLevel1(boxes);g.invulnerable=1000;
 assert.ok(!boxes.some(b=>b.building));assert.equal(LEVEL1_MAP.cars.length,8);
 const a={x:-11,y:1.4,z:21.7},b={x:-17,y:1.4,z:21.7};assert.equal(g.blocked(a,b),false);
 Object.assign(g.player,{x:a.x,z:a.z});for(let i=0;i<50;i++)g.step(.025,{x:-1,z:0});assert.ok(g.player.x<-16);
 g.navigation.refreshAt=-1;g.navigation.update(g.player,g.time);assert.ok(g.navigation.distance[g.navigation.nearestOpen(0,21.7)]>=0);
 const car=LEVEL1_MAP.cars[0];assert.equal(g.blocked({x:car.x-3,y:.65,z:car.z},{x:car.x+3,y:.65,z:car.z}),true);
});

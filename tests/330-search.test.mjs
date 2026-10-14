import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignLevel1 } from '../dist/campaign-level1.js';
import { soundWaypoint } from '../dist/hearing.js';
import { segmentBox } from '../dist/game-logic.js';

test('a ground robot follows the last heard position around nested cover without knowing the hidden player',()=>{
  const walls=[
    {x:0,z:10,hx:4,hz:1,height:3},
    {x:-4,z:5,hx:1,hz:5,height:3},
    {x:4,z:5,hx:1,hz:5,height:3}
  ];
  const g=new CampaignLevel1(walls,()=>.5);
  g.stage='combat';g.spawned=1;g.toSpawn=3;
  g.activePortals=[{id:101,x:0,z:0,yaw:0,openedAt:0}];g.nextSpawnAt=0;
  g.spawnEnemy();const e=g.enemies.find(e=>!e.opening);
  e.lastKnownX=0;e.lastKnownZ=20;e.lastKnownHeight=0;e.alertedUntil=100;
  const known={x:0,z:20};
  Object.assign(g.player,{x:70,z:-70});
  assert.equal(soundWaypoint(e,known,walls,segmentBox),null,'local corner selection is trapped inside the U');
  const waypoint=g.searchWaypoint(e,known);
  assert.ok(waypoint);assert.ok(waypoint.z<e.z,'the real route first backs out of the enclosure');
  g.toSpawn=0;g.nextSpawnAt=Infinity;
  for(let i=0;i<640;i++)g.step(.025);
  assert.ok(Math.hypot(e.x,e.z)>8,'the robot does not spin on its spawn point');
  assert.ok(Math.hypot(e.x-known.x,e.z-known.z)<10,'it reaches the remembered sound through the open route');
  assert.equal(e.lastKnownX,0);assert.equal(e.lastKnownZ,20);
  assert.equal(e.awareness,'search');assert.ok(g.searchFields.size<=6);
  g.replaceObstacles([]);assert.equal(g.searchFields.size,0,'renderer recovery invalidates cached paths');
});

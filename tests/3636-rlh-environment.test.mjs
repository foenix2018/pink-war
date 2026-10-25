import test from 'node:test';import assert from 'node:assert/strict';import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRlhEnvironment} from '../dist/rlh-environment.js';import {createLevel1Obstacles,LEVEL1_MAP} from '../dist/level1-layout.js';import {CampaignLevel1} from '../dist/campaign-level1.js';
const material=new T.MeshStandardMaterial(),scene=new T.Scene(),art=createRlhEnvironment(T,scene,{steel:material},{textured:false});
test('RLH canopy additions leave both authored M01 routes traversable with physical collisions',()=>{
 for(const route of LEVEL1_MAP.courtyard.approaches){const g=new CampaignLevel1([...createLevel1Obstacles(),...art.colliders],()=>.5);g.enemies=[];g.openingSpawned=8;g.invulnerable=1e6;
  for(const [x,z]of route.points){let reached=false;for(let i=0;i<1500;i++){const dx=x-g.player.x,dz=z-g.player.z,d=Math.hypot(dx,dz);if(d<.35){reached=true;break;}g.step(.05,{x:dx/d,z:dz/d,yaw:0});}assert.ok(reached,`route blocked at ${x},${z}`);}
 }
});
test('RLH vapour is finite, disabled before power, and freezes with the simulation clock',()=>{
 const steam=art.root.getObjectByName('Vapeur / installation active');assert.equal(steam.visible,false);art.update({powerAlarm:true,time:12});const matrices=[...steam.instanceMatrix.array];art.update({powerAlarm:true,time:12});assert.deepEqual([...steam.instanceMatrix.array],matrices);assert.equal(steam.count,16);art.update({powerAlarm:true,time:13});assert.notDeepEqual([...steam.instanceMatrix.array],matrices);art.update({powerAlarm:false,time:13});assert.equal(steam.visible,false);assert.ok(art.stats().draws<=4);assert.ok(art.stats().triangles<6000);let lights=0;art.root.traverse(o=>{if(o.isLight)lights++});assert.equal(lights,0);
 art.dispose();assert.equal(scene.children.length,0);
});

import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCampaignCeilings} from '../dist/m01-ceilings.js';
import {M01_CEILING_ROOMS} from '../dist/m01-ceiling-layout.js';
import {createLevel1Obstacles} from '../dist/level1-layout.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {segmentBox} from '../dist/game-logic.js';
import {audioMock} from './audio-mock.mjs';
import {COMBAT_SAMPLES,loadCombatSamples,playEnemyShot,playLaserShot,setLaserAudioEnabled,disposeLaserAudio} from '../dist/laser-sound.js';

test('all interior ceiling areas have a solid structural roof above their suspended panels',()=>{
 const obstacles=createLevel1Obstacles();
 for(const room of M01_CEILING_ROOMS)for(const dx of [-.47,-.39,-.03,0,.39,.47])for(const dz of [-.47,-.39,0,.39,.47]){
  const x=room.x+room.w*dx,z=room.z+room.d*dz;
  assert.ok(obstacles.some(b=>segmentBox({x,y:room.y-.1,z},{x,y:room.y+1,z},b)!==null),room.id+' has a real roof');
 }
});
test('ceiling networks share materials, keep a small draw budget and add no lights',()=>{
 const maps=Object.fromEntries(['concrete','steel','plaster','dark','rust'].map(n=>[n,new T.MeshStandardMaterial()]));const parent=new T.Group(),c=createCampaignCeilings(T,parent,maps),s=c.stats();let lights=0;c.root.traverse(o=>{if(o.isLight)lights++;});assert.equal(s.rooms,5);assert.ok(s.tiles>250);assert.ok(s.pipes>=10);assert.ok(s.beams>20);assert.ok(s.triangles<35000);assert.ok(s.draws<=10);assert.equal(lights,0);c.dispose();assert.equal(parent.children.length,0);Object.values(maps).forEach(m=>m.dispose());
});
async function sound(){const f=audioMock();f.ctx.decodeAudioData=async b=>({duration:.4,id:new Uint8Array(b)[0]});await loadCombatSamples(f.ctx,async url=>({ok:true,arrayBuffer:async()=>new Uint8Array([Object.values(COMBAT_SAMPLES).indexOf(url)]).buffer}));return f;}
test('each ranged player weapon uses a recorded body; enemy shots pan, attenuate and filter through walls',async()=>{
 const f=await sound();const recording=()=>f.nodes.filter(n=>n.kind==='buffer'&&n.buffer?.id!==undefined);
 for(const weapon of ['r9','duor9','bloom','lance','thorn','nova','m12']){const n=recording().length;assert.equal(playLaserShot(f.ctx,weapon),true);assert.ok(recording().length>n,weapon);f.ctx.tick(1);}
 const measure=({x=8,occluded=false}={})=>{playEnemyShot(f.ctx,{source:{x,y:1.5,z:0},listener:{x:0,z:0},occluded});const gain=f.nodes.filter(n=>n.kind==='gain'&&n.connections.includes(f.nodes[0])).at(-1).gain.value;const pan=f.nodes.filter(n=>n.kind==='pan').at(-1).pan.value;const filter=f.nodes.filter(n=>n.kind==='filter').at(-1).frequency.value;f.ctx.tick(1);return {gain,pan,filter};};
 const right=measure(),left=measure({x:-8}),far=measure({x:50}),wall=measure({occluded:true});assert.ok(right.pan>0&&left.pan<0);assert.ok(far.gain<right.gain);assert.ok(wall.gain<right.gain*.3);assert.ok(wall.filter<right.filter);
 setLaserAudioEnabled(f.ctx,false);const before=recording().length;assert.equal(playEnemyShot(f.ctx),false);assert.equal(recording().length,before);disposeLaserAudio(f.ctx);assert.ok(f.nodes.every(n=>n.disconnected));
});
test('opening patrol cannot appear while paused or on a stationary replay',()=>{
 const g=new CampaignLevel1(createLevel1Obstacles());g.state='paused';Object.assign(g.player,{x:-50,z:80});g.step(.05,{});assert.equal(g.enemies.length,0);g.state='playing';g.step(.05,{});assert.equal(g.enemies.length,8);g.reset();for(let i=0;i<400;i++)g.step(.05,{});assert.equal(g.enemies.length,0);
});

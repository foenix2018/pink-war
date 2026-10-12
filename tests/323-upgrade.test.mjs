import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from '../dist/vendor/three.core.min.js';
import { syncTrackedHands } from '../dist/xr-hands.js';
import { ArenaGame, MAX_LEVEL, MAX_ACTIVE_ENEMIES, segmentBox, traceEnemyHit } from '../dist/game-logic.js';
import { propagateNoise, soundWaypoint } from '../dist/hearing.js';
import { LASER_SAMPLES, loadRealLaserSample, playLaserShot, disposeLaserAudio } from '../dist/laser-sound.js';
import { audioMock } from './audio-mock.mjs';

test('grip tracking renders both hands despite missing connected events and an invisible target ray',()=>{
  const entries=[0,1].map(()=>{const anchor=new T.Group();anchor.matrixAutoUpdate=false;return {anchor,ray:new T.Group()};});
  const left={handedness:'left',gripSpace:{hand:'left'},targetRaySpace:{}},right={handedness:'right',gripSpace:{hand:'right'},targetRaySpace:{}};
  const session={visibilityState:'visible',inputSources:[right,left]};
  const matrix=(x)=>new T.Matrix4().makeTranslation(x,1.4,-.5).elements;
  const frame={getPose:space=>space.hand?{transform:{matrix:matrix(space.hand==='left'?-.2:.2)}}:null};
  entries.forEach(e=>{e.ray.visible=false;});
  syncTrackedHands(entries,session,frame,{});
  assert.equal(entries.filter(e=>e.tracked&&e.anchor.visible).length,2);
  assert.deepEqual(entries.map(e=>e.source.handedness),['right','left']);
  assert.equal(entries[0].anchor.matrix.elements[12],.2);
  session.inputSources=[left,right];syncTrackedHands(entries,session,frame,{});
  assert.deepEqual(entries.map(e=>e.source.handedness),['right','left'],'stable roles when source order changes');
  session.inputSources=[left];syncTrackedHands(entries,session,frame,{});
  assert.equal(entries.filter(e=>e.tracked).length,1);
  const replacement={...right,gripSpace:{hand:'right'}};session.inputSources=[left,replacement];
  syncTrackedHands(entries,session,frame,{});assert.equal(entries.filter(e=>e.tracked).length,2);
  session.visibilityState='hidden';syncTrackedHands(entries,session,frame,{});
  assert.ok(entries.every(e=>!e.anchor.visible));
});

test('hearing is attenuated by walls and quiet crouch steps, with a distinct acoustic tracker',()=>{
  const enemy=form=>({id:form,x:0,z:18,elevation:0,aimHeight:1,form,awareness:'patrol'});
  const wall={x:0,z:8,hx:3,hz:.5,height:3};
  const a=enemy('stalker'),b=enemy('listener');
  assert.deepEqual(propagateNoise([a,b],{x:0,y:1,z:0,radius:2,kind:'crouch'},[],segmentBox,0),[]);
  assert.deepEqual(propagateNoise([a,b],{x:0,y:1,z:0,radius:28,kind:'sprint'},[wall],segmentBox,1),['listener']);
  assert.deepEqual(propagateNoise([a,b],{x:0,y:1,z:0,radius:90,kind:'shot'},[wall],segmentBox,2),['stalker','listener']);
  assert.equal(a.awareness,'search');assert.equal(a.lastKnownZ,0);
  const waypoint=soundWaypoint({x:0,z:18,elevation:0,radius:.8},{x:0,z:0},[wall],segmentBox);
  assert.ok(waypoint&&Math.abs(waypoint.x)>wall.hx);
});

test('a shot behind cover prompts investigation but does not reveal later player movement or fire through walls',()=>{
  const g=new ArenaGame([{x:0,z:0,hx:3,hz:.6,height:3}],()=>.5);
  g.wave=1;g.nextWave=999;g.toSpawn=0;g.player.z=10;
  const e={id:7,form:'stalker',x:0,z:-8,elevation:0,aimHeight:1.15,hp:200,radius:.8,speed:2,awareness:'patrol',attackTimer:0,ranged:true};g.enemies.push(e);
  g.shoot({x:0,y:1.4,z:10},{x:0,y:0,z:1});g.bullets.length=0;
  g.player.x=1;g.player.z=20;g.step(.05);
  assert.equal(e.awareness,'search');assert.equal(e.lastKnownX,0);assert.equal(e.lastKnownZ,10);
  assert.equal(g.bullets.filter(b=>b.hostile).length,0);
  assert.ok(g.drainEvents().some(e=>e.type==='heard'&&e.kind==='shot'));
});

test('real movement generates noise, but standing still and pushing into a wall do not',()=>{
  const g=new ArenaGame([],()=>.5);g.wave=1;g.nextWave=999;
  let calls=[];g.emitNoise=(kind,radius)=>calls.push({kind,radius});
  for(let i=0;i<40;i++)g.step(.05);assert.equal(calls.length,0);
  for(let i=0;i<10;i++)g.step(.05,{x:1,sprint:true});assert.ok(calls.some(e=>e.kind==='sprint'));
  calls=[];g.player.crouched=true;for(let i=0;i<20;i++)g.step(.05,{x:1});
  assert.ok(calls.length&&calls.every(e=>e.kind==='crouch'&&e.radius===2));
});

test('late waves introduce two chassis, cap simultaneous enemies, and allow voluntary endless survival',()=>{
  const g=new ArenaGame([],()=>.5);g.wave=10;g.beginWave();
  for(let i=0;i<g.toSpawn+g.spawned;i++)g.spawnEnemy();
  assert.ok(g.enemies.some(e=>e.form==='listener'));assert.ok(g.enemies.some(e=>e.form==='bulwark'));
  g.enemies.length=MAX_ACTIVE_ENEMIES;g.toSpawn=10;g.spawnTimer=0;g.step(.05);assert.equal(g.toSpawn,10);
  g.enemies=[];g.toSpawn=0;g.wave=MAX_LEVEL;g.nextWave=-1;g.step(.05);assert.equal(g.state,'won');
  assert.equal(g.startEndless(),true);assert.equal(g.startEndless(),false);
  for(let i=0;i<90;i++)g.step(.05);assert.equal(g.wave,21);assert.equal(g.state,'playing');
  const robot={form:'bulwark',x:0,z:0,elevation:0};
  assert.equal(traceEnemyHit({x:0,y:1.2,z:2},{x:0,y:1.2,z:-2},robot).multiplier,.72);
});

test('five distinct bundled WAV recordings decode once per context and select the proper voice',async()=>{
  assert.equal(new Set(Object.values(LASER_SAMPLES)).size,5);
  const {ctx,nodes}=audioMock();let decodes=0,fetches=0;
  ctx.decodeAudioData=async bytes=>({duration:.65,tag:new Uint8Array(bytes)[0],number:++decodes});
  const load=async url=>{fetches++;const bytes=readFileSync(new URL('../dist/'+url,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');return {ok:true,arrayBuffer:async()=>new Uint8Array([Object.values(LASER_SAMPLES).indexOf(url)]).buffer};};
  await Promise.all([loadRealLaserSample(ctx,load),loadRealLaserSample(ctx,load)]);
  assert.equal(decodes,5);assert.equal(fetches,5);
  for(const [i,id] of Object.keys(LASER_SAMPLES).entries()){
    playLaserShot(ctx,id);assert.equal(nodes.filter(n=>n.kind==='buffer'&&n.buffer?.number).at(-1).buffer.tag,i);ctx.tick(1);
  }
  disposeLaserAudio(ctx);assert.ok(nodes.every(n=>n.disconnected));
});

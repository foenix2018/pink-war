import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ArenaGame,moveInArena,segmentBox} from '../dist/game-logic.js';
import {stairBody,M02_BOUNDARY,muzzleBeforeCover} from '../dist/m02-physical-layout.js';
import {CEILINGS,ROOMS,extensionObstacles,DOORS} from '../dist/m02-extension-layout.js';
import {createDoorAudioController,loadDoorSamples,playDoorMotion} from '../dist/door-audio.js';
import {loadCombatSamples,loadRealLaserSample,playLaserShot,disposeLaserAudio} from '../dist/laser-sound.js';
import {audioMock} from './audio-mock.mjs';

function staircase(base,rise,direction){
 const floors=Array.from({length:72},(_,i)=>({x:0,z:direction*(i+.5)*.36,hx:1.2,hz:.2,height:base+(i+1)*rise}));
 const obstacles=floors.map(s=>stairBody(0,s.z,2.4,.372,s.height,base));
 const traversal={routes:[],lifts:[],surfaces(x,z){return floors.filter(s=>Math.abs(x)<=s.hx&&Math.abs(z-s.z)<=s.hz).map((s,i)=>({id:'step-'+i,height:s.height}));},height(x,z,_t,max=Infinity){return floors.reduce((h,s)=>Math.abs(x)<=s.hx&&Math.abs(z-s.z)<=s.hz&&s.height<=max+.01?Math.max(h,s.height):h,base);}};
 const g=new ArenaGame(obstacles,()=>.5,traversal);g.reset();Object.assign(g.player,{x:0,z:0,elevation:base,grounded:true});return{g,floors};
}
for(const [base,rise,direction] of [[0,1/6,-1],[12,13/72,-1],[0,1/6,1]])test(`solid staircase climbs and descends, base ${base}, direction ${direction}`,()=>{
 const {g}=staircase(base,rise,direction);
 for(let i=0;i<260;i++){moveInArena(g.player,0,direction*.1,.55,g.obstacles);g.settle(g.player,.02,true);}
 assert.ok(g.player.elevation>base+72*rise-.2,JSON.stringify(g.player));
 for(let i=0;i<266;i++){moveInArena(g.player,0,-direction*.1,.55,g.obstacles);g.settle(g.player,.02,true);}
 // Gravity needs a moment at the lower landing.
 for(let i=0;i<60;i++)g.settle(g.player,.02,true);
 assert.ok(Math.abs(g.player.elevation-base)<.02,JSON.stringify(g.player));
 const middle=g.obstacles[35],p={x:4,z:middle.z,elevation:base};
 moveInArena(p,-5,0,.55,g.obstacles);assert.ok(p.x>=1.75,'solid step side stops a swept capsule');
 assert.notEqual(segmentBox({x:3,y:base+2,z:middle.z},{x:-3,y:base+2,z:middle.z},middle),null,'bullets hit full riser body');
});
test('authored district boundary stops players and shots on four sides, preserving a freight exit recess',()=>{
 for(const [x,z,dx,dz] of [[0,0,90,0],[0,0,-90,0],[0,0,0,130],[0,0,0,-130]]){
  const p={x,z,elevation:0};moveInArena(p,dx,dz,.55,M02_BOUNDARY);assert.ok(Math.abs(p.x)<48&&Math.abs(p.z)<99,JSON.stringify(p));
  assert.ok(M02_BOUNDARY.some(b=>segmentBox({x,y:1.5,z},{x:x+dx,y:1.5,z:z+dz},b)!==null));
 }
 const p={x:45,z:-90,elevation:0};moveInArena(p,15,0,.55,M02_BOUNDARY);assert.ok(p.x>48&&p.x<58,'convoy gate opens into a modeled service recess');
});
test('all covered story rooms stop upward shots and rising bodies without blocking ground doorways',()=>{
 assert.equal(CEILINGS.length,ROOMS.filter(r=>r.ceiling>0).length);
 for(const b of CEILINGS){const start={x:b.x,y:1.8,z:b.z},end={...start,y:b.y+2};assert.notEqual(segmentBox(start,end,b),null);}
 const obstacles=extensionObstacles({open:DOORS.map(d=>d.id)});
 assert.ok(obstacles.filter(b=>b.kind.startsWith('ceiling-')).every(b=>b.y>=3&&b.walkableSurface));
 const g=new ArenaGame(CEILINGS,()=>.5,{surfaces:()=>[],height:()=>0,routes:[],lifts:[]});g.reset();
 Object.assign(g.player,{x:43,z:92,elevation:1.1,grounded:false,verticalSpeed:8});g.settle(g.player,.05,true);assert.ok(g.player.elevation<=1.2+.001,'head cannot rise through the lift roof');
});
test('door motion audio fires once per direction, cancels on reversal and mute, and stays spatial',async()=>{
 const calls=[],stops=[];let enabled=true;
 const c=createDoorAudioController({getContext:()=>null,enabled:()=>enabled,play:(_ctx,kind,d)=>{calls.push([d.id,kind]);return{stop:()=>stops.push(d.id)};}}),door={id:'test'};
 for(const p of [0,.1,.2,.3,.4,1,1,.9,.8,.7])c.update(door,p);
 assert.deepEqual(calls,[['test','open'],['test','close']]);assert.equal(stops.length,1);
 enabled=false;c.update(door,.6);assert.equal(stops.length,2);c.reset();
 const f=audioMock();f.ctx.decodeAudioData=async()=>({duration:.9});let loads=0;
 await Promise.all([loadDoorSamples(f.ctx,async()=>{loads++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}),loadDoorSamples(f.ctx)]);assert.equal(loads,2);
 const d={axis:'z',fixed:2,centre:0,style:'fire'};
 const voice=playDoorMotion(f.ctx,'open',d,{listener:{x:0,z:0}});assert.ok(voice);assert.ok(f.nodes.find(n=>n.kind==='pan').pan.value>0);voice.stop();assert.ok(f.nodes.every(n=>n.disconnected));
 assert.equal(playDoorMotion(f.ctx,'open',{...d,fixed:30}),null);
});
test('VORTEX AR7 plays its own electric recording beside an actual automatic transient',async()=>{
 const f=audioMock();f.ctx.decodeAudioData=async bytes=>({duration:.22,id:new TextDecoder().decode(bytes)});
 const fetcher=async url=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer});
 await Promise.all([loadCombatSamples(f.ctx,fetcher),loadRealLaserSample(f.ctx,fetcher)]);
 assert.equal(playLaserShot(f.ctx,'vortex'),true);
 const shots=f.nodes.filter(n=>n.kind==='buffer'&&n.buffer?.id);
 assert.ok(shots.some(n=>n.buffer.id.includes('vortex.wav')));assert.ok(shots.some(n=>n.buffer.id.includes('automatic-shot.wav')));
 f.ctx.tick(1);disposeLaserAudio(f.ctx);assert.ok(f.nodes.every(n=>n.disconnected));
});
test('new door and VORTEX recordings are local, distinct PCM with CC0 provenance',()=>{
 const door=JSON.parse(readFileSync(new URL('../dist/assets/audio/doors/manifest.json',import.meta.url))),vortex=JSON.parse(readFileSync(new URL('../dist/audio/kenney/manifest.json',import.meta.url))).filter(i=>i.weapon==='vortex');
 const hashes=new Set();for(const item of [...door,...vortex]){const b=readFileSync(new URL('../dist/'+item.file,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(item.license,'CC0-1.0');assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);hashes.add(item.sha256);}assert.equal(hashes.size,3);
});

test('a protruding AR7 muzzle cannot spawn bullets beyond a thin wall',()=>{
 const wall={x:0,z:0,hx:2,hz:.15,y:0,height:4,surface:'concrete'},g=new ArenaGame([wall],()=>.5);g.reset();g.nextWave=Infinity;g.toSpawn=0;
 Object.assign(g.player,{x:0,z:.8,elevation:0});
 const origin=muzzleBeforeCover(g.player,{x:0,y:1.4,z:-.8},[wall]);assert.ok(origin.z>.15);
 assert.ok(g.shoot(origin,{x:0,y:0,z:-1}));g.step(.05,{});
 assert.equal(g.bullets.length,0);const impact=g.events.find(e=>e.type==='impact');assert.ok(impact&&impact.z>=.149,'projectile stops on the near wall face');
 const clear={x:0,y:1.4,z:.5};assert.equal(muzzleBeforeCover(g.player,clear,[wall]),clear);
});

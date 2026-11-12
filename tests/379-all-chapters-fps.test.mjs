import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {chapterCovers,FPS_CHAPTERS} from '../dist/fps-level-layout.js';
import {createFPSChapter} from '../dist/fps-environments.js';
import {searchContactOrder,updateMeleeIntent,prepareHostileShot,hasLocalFireSlot} from '../dist/enemy-engagement.js';
import {steerEnemyTravel} from '../dist/enemy-motion.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
const files={m01:'m01-extension-layout',m02:'m02-extension-layout',m04:'m04-layout',m06:'m06-layout',ligne9:'ligne9-layout',couronne:'couronne-layout'};
for(const id of FPS_CHAPTERS)test(`${id}: added combat cover survives door rebuilds, remains clear of interactions and has a matching bounded model`,async()=>{
 const L=await import(`../dist/${files[id]}.js`),build=L.extensionObstacles||L.buildCollisions;
 const closed=build(),opened=build({open:(L.DOORS||[]).map(d=>d.id),gatesOpen:true});
 const covers=chapterCovers(id);assert.ok(covers.length>0);
 for(const o of covers){for(const list of [closed,opened])assert.ok(list.some(b=>b.id===o.id&&b.x===o.x&&b.height===o.height));
  for(const p of L.INTERACTIONS||[])assert.ok(Math.hypot(o.x-p.x,o.z-p.z)>=(p.radius||2.4)+1.5,`${o.id}/${p.id} clear`);
  for(const f of L.FLOORS||[])if(f.height>0||f.ramp)assert.ok(o.x+o.hx<f.x1||o.x-o.hx>f.x2||o.z+o.hz<f.z1||o.z-o.hz>f.z2,`${o.id} clear of raised floors/ramps`);
 }
 const root=new T.Group(),material=new T.MeshStandardMaterial();root.add(new T.Mesh(new T.BoxGeometry(1,1,1),material));
 const art=createFPSChapter(T,root,{chapter:id,obstacles:opened,areas:L.ROOMS||L.AREAS||[],low:true});
 assert.equal(art.stats().coverModels,covers.length);assert.equal(art.stats().lightBudget,0);assert.ok(art.stats().draws<=12);
 assert.ok(material.normalMap);art.update(1,.016,{x:0,y:1.6,z:0});art.dispose();assert.equal(material.normalMap,null);
});
const enemy=(extra={})=>({id:1,x:0,z:0,elevation:0,yaw:0,form:'stalker',hp:100,speed:0,radius:.65,attackTimer:0,facingError:0,awareness:'engaged',...extra});
test('a melee strike has a visible windup, follows game time and misses a player who dodges the committed arc',()=>{
 const e=enemy(),player={x:0,z:-1.4,elevation:0},ctx={seen:true,allowed:true,player,blocked:()=>false};
 assert.equal(updateMeleeIntent(e,{...ctx,time:1}),false);assert.ok(e.meleeIntent);
 assert.equal(updateMeleeIntent(e,{...ctx,time:1.2}),false);assert.ok(e.chargeProgress>.4);
 player.x=1.3;player.z=.2;assert.equal(updateMeleeIntent(e,{...ctx,time:1.4}),false,'the locked strike misses sideways');assert.ok(e.attackTimer>0);
 const other=enemy();player.x=0;player.z=-1.4;updateMeleeIntent(other,{...ctx,time:2});assert.equal(updateMeleeIntent(other,{...ctx,time:2.4}),true);
});
test('stuns and walls cancel a strike; no stored windup can damage a concealed target',()=>{
 for(const reason of ['wall','stun','lost']){const e=enemy(),ctx={player:{x:0,z:-1.4,elevation:0},seen:true,allowed:true,blocked:()=>reason==='wall'};updateMeleeIntent(e,{...ctx,time:0});
  if(reason==='stun')e.stunnedUntil=3;if(reason==='lost')ctx.seen=false;assert.equal(updateMeleeIntent(e,{...ctx,time:.5}),false,reason);
 }
});
test('local ranged groups prepare at most three overlapping openings and stop charging after losing contact',()=>{
 const allies=Array.from({length:8},(_,i)=>enemy({id:i+1,x:i*.3,ranged:true}));
 for(const e of allies)assert.equal(prepareHostileShot(e,{time:1,seen:true,allowed:true,allies}),false);
 assert.equal(allies.filter(e=>e.shotIntent).length,3);
 assert.ok(allies[0].chargeProgress===0);assert.equal(prepareHostileShot(allies[0],{time:1.4,seen:true,allowed:true,allies}),true);
 assert.equal(prepareHostileShot(allies[0],{time:1.5,seen:false,allowed:true,allies}),false);assert.equal(allies[0].shotIntent,null);
});
test('searching sweeps the last observed location without learning a hidden live transform and expires',()=>{
 const e=enemy({awareness:'search',lastSeenAt:0,lastKnownX:0,lastKnownZ:0}),ctx={time:1,seen:false,threat:{x:0,y:1.25,z:0},obstacles:[],segmentBox};
 const first=searchContactOrder(e,ctx);assert.equal(first.state,'search-sweep');assert.equal(first.canFire,false);assert.ok(Math.hypot(first.point.x,first.point.z)<2.5);
 assert.notDeepEqual(searchContactOrder(e,{...ctx,time:3}).point,first.point);assert.equal(searchContactOrder(e,{...ctx,time:11}),null);
});
test('heavier enemies gather speed gradually, exact integration is frame independent and a committed stop clears momentum',()=>{
 const run=hz=>{const e=enemy({form:'brute'});let x=0;for(let i=0;i<hz;i++)x+=steerEnemyTravel(e,4,0,1/hz).x;return x;};assert.ok(Math.abs(run(30)-run(120))<1e-8);
 const heavy=enemy({form:'brute'}),fast=enemy({form:'spectre'});assert.ok(steerEnemyTravel(heavy,4,0,.05).x<steerEnemyTravel(fast,4,0,.05).x);steerEnemyTravel(heavy,4,0,.05,{stop:true});assert.equal(heavy.travelVelocity.x,0);
});
test('shared simulation delays contact damage, permits a dodge and never retains velocity into a solid wall',()=>{
 const g=new ArenaGame([],()=>.5);g.nextWave=Infinity;g.player.x=0;g.player.z=0;
 g.enemies=[enemy({x:0,z:-1.4,yaw:Math.PI,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0,patrolAngle:0,patrolTimer:1,grounded:true,verticalSpeed:0})];g.step(.02);assert.equal(g.player.hp,100);assert.ok(g.enemies[0].meleeIntent);
 g.player.x=4;for(let i=0;i<30;i++)g.step(1/60);assert.equal(g.player.hp,100);
});
test('M01 door rebuilds do not accumulate the new extension cover colliders',async()=>{
 const {CampaignLevel1}=await import('../dist/campaign-level1.js'),{createLevel1Obstacles}=await import('../dist/level1-layout.js'),{installM01Extension}=await import('../dist/m01-extension.js');
 const g=new CampaignLevel1(createLevel1Obstacles(),()=>.5,'lylu'),ext=installM01Extension(g,{});ext.start();
 const ids=chapterCovers('m01').map(o=>o.id);for(let i=0;i<4;i++){ext.resumeCore();for(const id of ids)assert.equal(g.obstacles.filter(o=>o.id===id).length,1,id);}
});

test('drones and infantry share local opening slots instead of releasing two simultaneous volleys',()=>{
 const probes=Array.from({length:3},(_,i)=>enemy({id:i+10,form:'probe',chargeRemaining:.4,elevation:3}));
 assert.equal(hasLocalFireSlot(enemy(),{time:1,allies:probes}),false);probes[0].chargeRemaining=0;assert.equal(hasLocalFireSlot(enemy(),{time:1,allies:probes}),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {PROLOGUE,prologueSlides} from '../dist/story-prologue.js';
import {squadOrder,relayVisualContact,clearSquadFiringLane,registerIncomingFire} from '../dist/enemy-squads.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
const wall={x:0,z:12,hx:3,hz:.3,y:0,height:2.8};
const threat={x:0,y:1.25,z:0};
const unit=(id=8,form='seer')=>({id,form,x:3.8,z:15,elevation:0,radius:.65,awareness:'engaged',ranged:true,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0});
const args={time:0,threat,seen:true,obstacles:[wall],allies:[],segmentBox};

test('Vesper classic inline hosts remain parseable when the modular prologue is loaded',()=>{
 const html=readFileSync(new URL('../dist/vesper-level1-v7.html',import.meta.url),'utf8');let count=0;
 for(const [,attrs,body]of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(/src=|type=["'](?:module|application\/json)/.test(attrs))continue;
  assert.doesNotThrow(()=>new Script(body));count++;
 }
 assert.ok(count>=2,'both the launch host and legacy audio host are checked');
});

test('the six illustrated prologue panels follow P00 timings, chronology and equal sibling viewpoints',()=>{
 assert.deepEqual(PROLOGUE.map(s=>s.seconds),[6,6,4,8,5,5]);
 assert.equal(PROLOGUE.reduce((s,p)=>s+p.seconds,0),34);
 const ghju=prologueSlides('ghju'),lylu=prologueSlides('lylu');
 assert.equal(ghju[0].id,'P00-01');assert.equal(ghju[5].id,'P00-06');
 assert.match(ghju[0].date,/2189/);assert.match(ghju[5].date,/2196/);
 assert.match(ghju[5].text,/son frère/);assert.match(lylu[5].text,/sa sœur/);
 assert.doesNotMatch(JSON.stringify(ghju),/Nharis|JANUS|sacrifice/i,'no later revelation is spoiled');
 for(const s of ghju){assert.ok(existsSync(new URL(s.src)));assert.ok(statSync(new URL(s.src)).size<400000,'each locally shipped WebP stays mobile-friendly');}
});

test('all ranged ground chassis can use real cover, peek, and retreat after near misses',()=>{
 for(const form of ['seer','stalker','listener','bulwark']){
  const e=unit(8,form);let o=squadOrder(e,args);assert.equal(o.state,'relocate',form);assert.equal(o.canFire,false);
  Object.assign(e,o.point);o=squadOrder(e,{...args,time:.2,seen:false});assert.equal(o.state,'cover');
  o=squadOrder(e,{...args,time:3,seen:false});assert.equal(o.state,'peek');assert.equal(o.canFire,false,'memory is not sight');
  Object.assign(e,o.point);o=squadOrder(e,{...args,time:3.1});assert.equal(o.canFire,true);
  e.suppressedUntil=5;o=squadOrder(e,{...args,time:3.2});assert.equal(o.state,'return');assert.equal(o.canFire,false);
  e.awareness='patrol';assert.equal(squadOrder(e,{...args,time:7}),null);
 }
});

test('flanks split sides, terminate, and never choose a blocked or different-floor destination',()=>{
 const a={...unit(1,'stalker'),x:0,z:18,ranged:false},b={...a,id:2};
 const ca={...args,obstacles:[]};const oa=squadOrder(a,ca),ob=squadOrder(b,ca);
 assert.equal(oa.state,'flank');assert.ok(oa.point.x*ob.point.x<0);
 assert.equal(squadOrder(a,{...ca,time:4}),null);assert.equal(a.tactics.flank,null);
 assert.equal(squadOrder(b,{...ca,time:1,threat:{...threat,y:7}}),null);
 const enclosed={...a,id:3,tactics:undefined};assert.equal(squadOrder(enclosed,{...ca,obstacles:[{x:0,z:12,hx:20,hz:3,y:0,height:3}]}),null);
});

test('a siege unit announces its charge then advances toward its locked contact, without tracking a moved target',()=>{
 const e=unit(4,'brute');e.x=0;e.z=16;const c={...args,time:4,obstacles:[]};
 const windup=squadOrder(e,c);assert.equal(windup.state,'windup');assert.equal(windup.speedScale,0);assert.equal(windup.canFire,false);
 const rush=squadOrder(e,{...c,time:4.8,threat:{x:8,y:1.25,z:0}});assert.equal(rush.state,'charge');assert.deepEqual(rush.point,{x:0,z:0});
 assert.equal(squadOrder(e,{...c,time:6}),null);
});

test('a rempart guards a nearby sensor unit, with no invulnerability or artificial relocation',()=>{
 const e={...unit(10,'bulwark'),x:0,z:16},ally={...unit(11,'seer'),x:1,z:18};
 const o=squadOrder(e,{...args,obstacles:[],allies:[e,ally]});assert.equal(o.state,'guard');assert.ok(o.point.z<ally.z);
 assert.equal(e.x,0);assert.equal(e.z,16);assert.equal(e.invulnerable,undefined);
});

test('contact relay is local, blocked by walls, and grants investigation rather than omniscient engagement',()=>{
 const sender={...unit(1,'listener'),x:0,z:0},near={...unit(2),x:2,z:0,awareness:'patrol'},far={...unit(3),x:30,z:0,awareness:'patrol'},hidden={...unit(4),x:0,z:16,awareness:'patrol'};
 const c={...args,time:1,threat:{x:4,y:1.25,z:-10},allies:[sender,near,far,hidden]};relayVisualContact(sender,c);
 assert.equal(near.awareness,'search');assert.equal(near.lastKnownZ,-10);assert.equal(far.awareness,'patrol');assert.equal(hidden.awareness,'patrol');
 relayVisualContact(sender,{...c,time:2,threat:{x:12,y:1.25,z:8}});assert.equal(near.lastKnownZ,-10,'relay has a cooldown');
});

test('shooters hold fire behind an ally; near misses do not propagate through a wall',()=>{
 const e={...unit(1),x:0,z:18},ally={...unit(2),x:0,z:8};
 assert.equal(clearSquadFiringLane(e,{x:0,y:1.69,z:18},threat,[e,ally]),false);
 ally.x=3;assert.equal(clearSquadFiringLane(e,{x:0,y:1.69,z:18},threat,[e,ally]),true);
 const robot={...unit(3),x:0,z:12.8};const from={x:-2,y:1.25,z:11.5},to={x:2,y:1.25,z:11.5};
 registerIncomingFire([robot],from,to,2,(a,b)=>segmentBox(a,b,wall)!==null);assert.equal(robot.suppressedUntil,undefined);
 robot.z=11;registerIncomingFire([robot],from,to,3,(a,b)=>segmentBox(a,b,wall)!==null);assert.ok(robot.suppressedUntil>3);
});

test('live sentinels complete cover cycles using actual navigation and physical projectiles',()=>{
 const g=new ArenaGame([wall],()=>.5);g.nextWave=-1;g.toSpawn=0;Object.assign(g.player,{x:0,z:0});g.invulnerable=1e6;
 const e={...unit(),speed:2.4,hp:1000,elite:false,aimHeight:1.6,hitRadius:.9,attackTimer:0,grounded:true,verticalSpeed:0,alertedUntil:100,yaw:0,patrolAngle:0,patrolTimer:1};g.enemies=[e];const states=new Set();let shots=0;
 for(let i=0;i<1200;i++){g.step(1/30,{});states.add(e.combatPose);for(const event of g.drainEvents())if(event.type==='enemy-shot'){shots++;assert.equal(e.tactics.state,'peek');assert.equal(segmentBox({x:e.x,y:e.elevation+e.aimHeight,z:e.z},threat,wall),null);}}
 assert.ok(states.has('cover')&&states.has('peek')&&states.has('return'));assert.ok(shots>=2);
});

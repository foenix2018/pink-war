import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {ArenaGame,segmentBox,traceEnemyHit} from '../dist/game-logic.js';
import {createCompanionSkills,companionTarget,companionUnlocked} from '../dist/companion-skills.js';
import {companionAvailable} from '../dist/companion-escort.js';
import {chooseTacticalCover,tacticalOrder,grenadeAvoidance} from '../dist/tactical-enemies.js';
import {rangedMuzzle} from '../dist/enemy-combat.js';
import {createArchiveTerminalFactory} from '../dist/archive-terminals.js';

const origin={x:0,y:1.5,z:0},direction={x:0,y:0,z:-1};
const enemy=(id=1,x=0,z=-12)=>({id,x,z,elevation:0,aimHeight:1.27,form:'stalker',hp:500,tier:1,awareness:'engaged',radius:.65});
const game=(obstacles=[])=>{const g=new ArenaGame(obstacles,()=>.5);g.nextWave=-1;g.toSpawn=0;g.enemies=[];return g;};
const advance=(skills,g,n)=>{for(let i=0;i<n;i++){g.time+=.05;skills.update(.05,{game:g});}};

test('physical escorts start in M01, arena and training; advanced manual skills retain their M07 progression',()=>{
 for(const mission of [1,2,6]){
  assert.equal(companionUnlocked({mission}),false);
  assert.equal(companionAvailable({mission}),true);
  const s=createCompanionSkills({mission}),g=game();
  assert.equal(s.use('phase',{game:g,origin,direction}),false);assert.equal(s.projectiles.length,0);assert.equal(s.snapshot(g).energy,100);
 }
 assert.equal(companionUnlocked({mission:7}),true);assert.equal(companionUnlocked({mission:1,mode:'lab'}),true);
 assert.equal(companionUnlocked({mission:20,mode:'arena'}),false);
 assert.equal(companionAvailable({mode:'arena'}),true);assert.equal(companionAvailable({mode:'training'}),true);
});
test('phase spheres are manual, bounded by 30 seconds, and freeze with paused simulation',()=>{
 const g=game(),s=createCompanionSkills({characterId:'lylu',mission:7});
 assert.equal(s.use('phase',{game:g,origin,direction}),true);assert.equal(s.projectiles.length,1);assert.equal(s.snapshot(g).energy,60);
 assert.equal(s.use('phase',{game:g,origin,direction}),false);advance(s,g,40);
 assert.equal(s.projectiles.length,0);assert.ok(s.drainEvents().some(e=>e.type==='companion-explosion'));
 g.state='paused';const before=s.snapshot(g);s.update(5,{game:g});assert.deepEqual(s.snapshot(g),before);
 g.state='playing';g.time=29.99;assert.equal(s.use('phase',{game:g,origin,direction}),false);
 g.time=30;assert.equal(s.use('phase',{game:g,origin,direction}),true);
});
test('a solid wall clips the aim and blast; no guided flight follows a moving enemy',()=>{
 const wall={x:0,y:0,z:-5,hx:4,hz:.25,height:4},g=game([wall]),e=enemy(1,0,-6),s=createCompanionSkills({characterId:'lylu',mission:7});g.enemies=[e];
 const target=companionTarget(g,origin,direction);assert.equal(target.enemy,null);assert.ok(target.point.z>-5);
 s.use('phase',{game:g,origin,direction});const vx=s.projectiles[0].vx;e.x=1;advance(s,g,40);assert.equal(e.hp,500);assert.equal(vx,0);
 const empty=game(),moving=enemy(),other=createCompanionSkills({mission:7});empty.enemies=[moving];other.use('phase',{game:empty,origin,direction});
 const locked={vx:other.projectiles[0].vx,vz:other.projectiles[0].vz};moving.x=15;advance(other,empty,3);
 assert.equal(other.projectiles[0].vx,locked.vx);assert.equal(other.projectiles[0].vz,locked.vz);
 assert.equal(other.use('phase',{game:empty,origin,direction:{x:NaN,y:0,z:0}}),false);
});
test('Gaby neutralises while Cara deals more damage; shield and repair never resurrect',()=>{
 const results=[];
 for(const hero of ['ghju','lylu']){const g=game(),e=enemy(),s=createCompanionSkills({characterId:hero,mission:7});g.enemies=[e];s.use('phase',{game:g,origin,direction});advance(s,g,25);results.push({damage:500-e.hp,stunned:e.stunnedUntil||0});}
 assert.ok(results[1].damage>results[0].damage*2);assert.ok(results[0].stunned>0);assert.equal(results[1].stunned,0);
 const g=game(),s=createCompanionSkills({mission:7});g.player.hp=0;assert.equal(s.use('mend',{game:g}),false);assert.equal(g.player.hp,0);
 g.player.hp=50;assert.equal(s.use('mend',{game:g}),true);assert.equal(g.player.hp,70);assert.equal(s.use('mend',{game:g}),false);
 const shield=createCompanionSkills({mission:7});assert.equal(shield.use('ward',{game:g}),true);
 g.bullets=Array.from({length:5},(_,id)=>({id,hostile:true,life:1,damage:10,x:g.player.x,y:1.25,z:g.player.z}));
 shield.update(.05,{game:g});assert.equal(g.bullets.filter(b=>b.hostile).length,2);
});
test('Cara marking and amplification affect real weapon damage, with bounded durations',()=>{
 const g=game(),e=enemy(),s=createCompanionSkills({characterId:'lylu',mission:7});g.enemies=[e];
 assert.equal(s.use('mark',{game:g,origin,direction}),true);g.damageEnemy(e,100,origin);assert.equal(e.hp,380);
 assert.equal(s.use('amplify',{game:g}),true);g.damageEnemy(e,100,origin);assert.ok(Math.abs(e.hp-242)<1e-8);
 g.time=9;g.damageEnemy(e,100,origin);assert.ok(Math.abs(e.hp-142)<1e-8);
});
test('Gaby intercepts fast projectiles across a whole frame; a nearer wall does not consume a shield charge',()=>{
 for(const wall of [false,true]){
  const g=game(wall?[{x:-2,z:22,y:0,hx:.2,hz:3,height:3}]:[]),s=createCompanionSkills({mission:7});
  s.use('ward',{game:g});g.bullets=[{id:90,x:-5,y:1.25,z:22,vx:400,vy:0,vz:0,life:1,hostile:true,damage:40,splash:0}];
  g.step(.025,{});assert.equal(g.player.hp,100);assert.equal(g.companionWard.remaining,wall?3:2);
 }
});
const wall={x:0,y:0,z:12,hx:3,hz:.3,height:1.8},threat={x:0,y:1.25,z:0};
test('a lower wall requires actual crouching; suppression stops a synthetic from exposing itself',()=>{
 const e={...enemy(8,3.8,15),form:'synth',ranged:true,lastKnownX:0,lastKnownZ:0};
 const c=chooseTacticalCover(e,threat,[wall],[],segmentBox);assert.ok(c?.crouch);
 const ctx={time:0,threat,seen:true,obstacles:[wall],allies:[],segmentBox};let order=tacticalOrder(e,ctx);Object.assign(e,order.point);
 order=tacticalOrder(e,{...ctx,time:.1});assert.equal(order.state,'cover');assert.equal(order.crouched,true);
 e.suppressedUntil=6;order=tacticalOrder(e,{...ctx,time:4});assert.equal(order.state,'cover');
 order=tacticalOrder(e,{...ctx,time:7});assert.equal(order.state,'peek');Object.assign(e,order.point);e.suppressedUntil=9;
 assert.equal(tacticalOrder(e,{...ctx,time:7.1}).state,'return');
 const standing=rangedMuzzle(e);e.coverCrouch=1;assert.ok(rangedMuzzle(e).y<standing.y-.5);
 const headStart={x:e.x,y:1.9,z:e.z-2},headEnd={...headStart,z:e.z+2};
 assert.equal(traceEnemyHit(headStart,headEnd,e),null,'the former head location is no longer a phantom hitbox');
});
test('robots evade a visible energy sphere, not one hidden behind a wall',()=>{
 const e=enemy(1,0,0),p={x:0,y:1.2,z:2,vx:0,vz:-4,life:1,age:.2,radius:3.2};
 const ctx={time:0,hazards:[p],obstacles:[],segmentBox};const order=grenadeAvoidance(e,ctx);assert.equal(order.state,'evade');assert.equal(order.canFire,false);assert.ok(Math.hypot(order.point.x,order.point.z)>4);
 const hidden=enemy(2,0,0);assert.equal(grenadeAvoidance(hidden,{...ctx,obstacles:[{x:0,y:0,z:1,hx:5,hz:.2,height:3}]}),null);
});
test('the rebuilt computers fit the original terminal footprint with continuous support and bounded geometry',()=>{
 const f=createArchiveTerminalFactory(T,{loadTextures:false}),scene=new T.Scene();
 for(const id of ['archive','investigation','sabotage','exit']){
  const c=f.create(scene,{id});scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(c.root);
  assert.ok(bounds.min.x>=-1.3&&bounds.max.x<=1.3);assert.ok(bounds.min.z>=-.3&&bounds.max.z<=.3);
  assert.ok(bounds.min.y>=0&&bounds.min.y<.055&&bounds.max.y<1.96);
  assert.ok(c.display.parent===c.root&&c.width<1.5&&c.height>.6);
 }
 assert.equal(f.stats().computers,4);assert.ok(f.stats().triangles<45000);f.dispose();assert.equal(scene.children.length,0);
});

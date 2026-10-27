import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { ArenaGame, segmentBox, traceEnemyHit, levelCount } from '../dist/game-logic.js';
import { PROBE, moveProbe, updateProbe } from '../dist/aerial-probes.js';
import { createEnemyFactory } from '../dist/enemies.js';

const probe = (changes={}) => ({id:901,form:'probe',ranged:true,elite:false,x:0,z:8,elevation:PROBE.hover,
  hp:80,tier:2,aimHeight:PROBE.aimHeight,radius:PROBE.radius,hitRadius:.44,grounded:false,
  speed:0,phase:0,attackTimer:0,awareness:'patrol',homeX:0,homeZ:8,patrolAngle:0,patrolTimer:1,
  limpUntil:0,stunnedUntil:0,alertedUntil:0,...changes});
const game = (obstacles=[]) => {const g=new ArenaGame(obstacles,()=>.5);g.wave=3;g.nextWave=999;g.enemies=[probe()];return g;};
const advance=(g,n=1,input={})=>{for(let i=0;i<n;i++)g.step(.05,input);};

test('probes enter at level 3 and increase without adding enemies to the ten wave budgets',()=>{
  const g=new ArenaGame([],()=>.5),counts=[];
  for(let wave=1;wave<=10;wave++){
    g.beginWave();for(let i=0;i<levelCount(wave);i++)g.spawnEnemy();
    assert.equal(g.enemies.length,levelCount(wave));const probes=g.enemies.filter(e=>e.form==='probe');counts.push(probes.length);
    for(const e of probes){assert.equal(e.ranged,true);assert.equal(e.grounded,false);assert.ok(e.elevation>=PROBE.hover);}
    g.enemies=[];g.toSpawn=0;
  }
  assert.deepEqual(counts.slice(0,2),[0,0]);assert.ok(counts[2]>0);
  for(let i=3;i<counts.length;i++)assert.ok(counts[i]>=counts[i-1]);
  assert.ok(counts[9]>counts[2]);
});

test('flight crosses low cover but not a building, catwalk underside or arena boundary',()=>{
  const g=game([{x:0,z:0,hx:1,hz:1,height:2}]),p=probe({z:-4});
  moveProbe(g,p,0,0,8,segmentBox);assert.equal(p.z,4,'low wall is below the flying body');
  g.obstacles[0].height=6;p.z=-4;moveProbe(g,p,0,0,8,segmentBox);assert.ok(p.z<-1.8,'wings cannot pass through the tall wall');
  g.obstacles=[{x:0,z:0,hx:3,hz:3,y:4.65,height:.15,walkableSurface:true}];Object.assign(p,{x:0,z:0,elevation:2.7});
  moveProbe(g,p,0,5,0,segmentBox);assert.ok(p.elevation+PROBE.height<4.65+.001,'a walkable slab also blocks upward flight');
  g.obstacles=[];moveProbe(g,p,500,0,-500,segmentBox);assert.ok(p.x<=98.1&&p.z>=-98.1);
});

test('probes reach elevated players gradually and never use ground gravity or stairs',()=>{
  const g=game(),p=g.enemies[0];g.player.elevation=7.2;
  for(let i=0;i<120;i++){
    const old=p.elevation;g.time+=.05;updateProbe(g,p,.05,segmentBox);
    assert.ok(p.elevation-old<=2.3*.05+.0001);assert.equal(p.grounded,false);assert.equal(p.onLift,null);
  }
  assert.ok(p.elevation>9,'the player on a terrace is reachable by flight');
  updateProbe(g,p,0,segmentBox);assert.ok([p.x,p.z,p.elevation,p.motionX,p.motionZ].every(Number.isFinite));
});

test('an audible warning precedes the shot, and the locked projectile can be dodged',()=>{
  const g=game();advance(g);assert.equal(g.bullets.length,0);
  assert.equal(g.drainEvents().filter(e=>e.type==='probe-charge').length,1);
  const locked={...g.enemies[0].lockedTarget};advance(g,10,{x:1});assert.equal(g.bullets.length,0,'no instant hitscan while charging');
  advance(g,6,{x:1});const shot=g.bullets.find(b=>b.weapon==='probe');assert.ok(shot);
  assert.equal(shot.vx,0,'the shot still aims at the original x rather than following the moving player');
  assert.equal(locked.x,0);advance(g,30,{x:1});assert.equal(g.player.hp,100);
});

test('cover cancels the charge and blocks probe projectiles; a core hit also interrupts charging',()=>{
  const g=game();advance(g);assert.ok(g.enemies[0].chargeRemaining>0);
  g.obstacles=[{x:0,z:16,hx:3,hz:1,height:6}];advance(g,24);
  assert.equal(g.bullets.filter(b=>b.weapon==='probe').length,0);assert.equal(g.enemies[0].chargeProgress,0);assert.equal(g.player.hp,100);
  g.obstacles=[];g.enemies[0].attackTimer=0;advance(g);assert.ok(g.enemies[0].chargeRemaining>0);
  g.damageEnemy(g.enemies[0],1,{x:0,y:3.25,z:8},'head',2.4);advance(g);assert.equal(g.enemies[0].chargeProgress,0);
});

test('ducking after the warning can evade the shot locked at standing height',()=>{
  const g=game();advance(g);assert.equal(g.enemies[0].lockedTarget.y,1.25);
  advance(g,1,{crouchToggle:true});advance(g,38);
  assert.equal(g.player.crouched,true);assert.equal(g.player.hp,100);
});

test('a hit to a fan slows flight temporarily instead of using a ground limp',()=>{
  const healthy=game(),damaged=game();healthy.enemies[0].speed=damaged.enemies[0].speed=3.6;
  damaged.damageEnemy(damaged.enemies[0],1,{x:.61,y:3.19,z:8},'limb',.7);
  advance(healthy);advance(damaged);
  const distance=g=>Math.hypot(g.enemies[0].x,g.enemies[0].z-8);
  assert.ok(Math.abs(distance(damaged)/distance(healthy)-.55)<1e-6);
  assert.equal(damaged.enemies[0].grounded,false);
});

test('probe hit zones follow airborne height: iris critical, hull normal, fans reduced',()=>{
  const p=probe({x:0,z:0,elevation:5,yaw:0});
  const core=traceEnemyHit({x:0,y:5.55,z:-2},{x:0,y:5.55,z:2},p);
  assert.equal(core.zone,'head');assert.equal(core.multiplier,2.5);
  const fan=traceEnemyHit({x:.61,y:5.49,z:-2},{x:.61,y:5.49,z:2},p);assert.equal(fan.zone,'limb');
  assert.equal(traceEnemyHit({x:0,y:1.55,z:-2},{x:0,y:1.55,z:2},p),null,'no invisible ground-level humanoid hitbox');
});

test('probe visuals share six bounded batches including private alert optics, articulate fans and iris, and keep private skeletons',()=>{
  const solid=()=>new T.MeshStandardMaterial(),glow=()=>new T.MeshBasicMaterial();
  const factory=createEnemyFactory({monster:solid(),monsterElite:solid(),monsterFace:solid(),cyan:glow(),rose:glow(),violet:glow()});
  const a=factory.create(false,true,'probe'),b=factory.create(false,true,'probe');
  const meshes=a.children.filter(c=>c.isMesh),other=b.children.filter(c=>c.isMesh);assert.equal(meshes.length,6);
  for(let i=0;i<meshes.length;i++)assert.equal(meshes[i].geometry,other[i].geometry);
  assert.notEqual(a.userData.skeleton,b.userData.skeleton);assert.equal(a.userData.legs.length,0);
  const untouched=b.userData.skeleton.bones.map(bone=>bone.quaternion.toArray());
  a.userData.animate(1,0,true,{chargeProgress:.9,aimPitch:-.3});
  assert.ok(a.userData.skeleton.bones.some(bone=>bone.name.startsWith('fan-')&&Math.abs(bone.rotation.y)>1));
  assert.ok(a.userData.skeleton.bones.find(bone=>bone.name==='charged-iris').scale.x>1.2);
  assert.deepEqual(b.userData.skeleton.bones.map(bone=>bone.quaternion.toArray()),untouched);
  a.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(a,true);
  assert.ok(bounds.max.x<=PROBE.radius&&bounds.min.x>=-PROBE.radius&&bounds.max.y<PROBE.height);
});

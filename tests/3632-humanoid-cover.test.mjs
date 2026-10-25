import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../dist/vendor/three.module.min.js';
import {rlhFirefighterData} from '../dist/rlh-firefighter.js';
import {HUMAN_REFERENCE,sampleHumanStep} from '../dist/enemy-human-motion.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
import {chooseTacticalCover,coverProgress,coverEyeHeight} from '../dist/tactical-enemies.js';
import {enemySightPoint,rangedMuzzle,enemyScale,remembersCoverContact,ROBOT_HEAD_TOP,ROBOT_CROUCH_DROP} from '../dist/enemy-combat.js';
const wall={x:0,y:0,z:12,hx:3,hz:.3,height:1.5},threat={x:0,y:1.25,z:0};
const enemy=(form='stalker')=>({id:8,form,x:0,z:18,elevation:0,radius:.65,awareness:'engaged',ranged:true,speed:2.4,hp:1000,elite:false,aimHeight:1.6,hitRadius:.9,attackTimer:0,grounded:true,verticalSpeed:0,lastKnownX:0,lastKnownZ:0,lastKnownHeight:0,alertedUntil:100,yaw:0,patrolAngle:0,patrolTimer:1});

test('the lightweight robot reference is derived from the unchanged 34-bone hero source and its real joint positions',()=>{
 const source=rlhFirefighterData(),bones=source.bones.map(b=>{const n=new T.Bone();n.name=b.name;n.position.fromArray(b.p);n.quaternion.fromArray(b.q);return n;}),root=new T.Group();
 bones.forEach((b,i)=>(source.bones[i].parent<0?root:bones[source.bones[i].parent]).add(b));root.updateMatrixWorld(true);
 assert.equal(HUMAN_REFERENCE.sourceBoneCount,34);assert.equal(source.bones.length,34);
 assert.equal(HUMAN_REFERENCE.sourceSha256,createHash('sha256').update(readFileSync(new URL('../dist/rlh-firefighter-data.js',import.meta.url))).digest('hex'));
 for(const [name,point] of Object.entries(HUMAN_REFERENCE.joints)){
  const bone=bones.find(b=>b.name.replace('mixamorig','')===name);assert.ok(bone);
  assert.ok(bone.getWorldPosition(new T.Vector3()).distanceTo(new T.Vector3(...point))<.000001);
 }
 for(const name of ['rifle','walkRifle','run'])assert.ok(source.clips.some(c=>c.name===name));
});

test('sampled Rifle Walk preserves alternating foot support and the biped retarget follows actual displacement',()=>{
 const out=new Float64Array(5);let left=0,right=0;
 for(let i=0;i<180;i++){sampleHumanStep(i/180*Math.PI*2,0,out);assert.ok(Math.min(out[0],out[2])<1e-8);assert.ok(out[0]>=0&&out[2]>=0);left=Math.max(left,out[0]);right=Math.max(right,out[2]);}
 assert.ok(left>.07&&right>.07);
 const mats=Object.fromEntries(['monster','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()])),actor=createEnemyFactory(mats).create(false,true,'stalker');
 actor.userData.animate(0,0,false,{});const initial=actor.userData.gaitPhase;
 for(let i=1;i<=30;i++)actor.userData.animate(i/30,0,true,{});
 assert.equal(actor.userData.gaitPhase,initial,'a blocked robot must not treadmill');assert.equal(actor.userData.nativeMotion,'rifle');
 for(let i=31;i<=60;i++){actor.position.z-=.05;actor.userData.animate(i/30,0,true,{});}
 assert.ok(actor.userData.gaitPhase>initial+3);assert.equal(actor.userData.nativeMotion,'walkRifle');
});

test('cover height is chosen for the real helmet and size, with both sensor and barrel clear at the peek',()=>{
 for(const form of ['stalker','synth','seer','listener']){
  const e=enemy(form),scale=enemyScale(form,false),c=chooseTacticalCover(e,threat,[wall],[],segmentBox);assert.ok(c,form);
  assert.ok(c.crouchAmount>1&&c.crouchAmount<=1.4);
  assert.ok((ROBOT_HEAD_TOP-ROBOT_CROUCH_DROP*c.crouchAmount)*scale<wall.height);
  assert.notEqual(segmentBox({...c.hidden,y:coverEyeHeight(e,c)},threat,wall),null);
  const exposed={...e,...c.peek,coverCrouch:0,yaw:Math.atan2(threat.x-c.peek.x,threat.z-c.peek.z)+Math.PI};
  assert.equal(segmentBox(enemySightPoint(exposed),threat,wall),null);
  assert.equal(segmentBox(rangedMuzzle(exposed),threat,wall),null);
 }
 assert.equal(chooseTacticalCover(enemy(),threat,[{...wall,height:1.25}],[],segmentBox),null);
 assert.equal(chooseTacticalCover({...enemy(),elite:true},threat,[wall],[],segmentBox),null,'a large elite needs taller protection');
 assert.ok(chooseTacticalCover({...enemy(),elite:true},threat,[{...wall,height:2}],[],segmentBox));
});

test('the full simulation routes round low walls, repeatedly ducks and peeks, and never shoots from concealment',()=>{
 for(const form of ['stalker','synth','seer','listener']){
  const g=new ArenaGame([wall],()=>.5);g.nextWave=-1;g.toSpawn=0;Object.assign(g.player,{x:0,z:0});g.invulnerable=1e6;const e=enemy(form);g.enemies=[e];
  const states=new Set();let shots=0,cycles=0,last;
  for(let i=0;i<1200;i++){
   g.step(1/30,{});states.add(e.combatPose);if(last!==e.combatPose&&e.combatPose==='cover')cycles++;last=e.combatPose;
   assert.ok(Math.abs(e.x-wall.x)>=wall.hx+e.radius-.001||Math.abs(e.z-wall.z)>=wall.hz+e.radius-.001,'body stays outside wall');
   for(const event of g.drainEvents())if(event.type==='enemy-shot'){
    shots++;assert.equal(e.combatPose,'peek');assert.equal(e.awareness,'engaged');
    assert.equal(segmentBox({x:event.x,y:event.y,z:event.z},threat,wall),null,'actual projectile has a free lane');
   }
  }
  assert.deepEqual([...states].sort(),['cover','peek','relocate','return']);assert.ok(cycles>=6&&shots>=10,form);
  assert.equal(e.tactics.failedCovers?.length||0,0,'a valid return is not mistaken for a stalled previous cycle');
 }
});

test('inaccessible cover is remembered briefly, while a new plan and each return get a fresh progress window',()=>{
 const e=enemy(),c=chooseTacticalCover(e,threat,[{...wall,height:2.8}],[],segmentBox);e.tactics={state:'relocate',cover:c};
 assert.equal(coverProgress(e,0),true);assert.equal(coverProgress(e,3.1),false);assert.equal(e.tactics.cover,null);
 assert.equal(e.tactics.failedCovers.length,1);assert.ok(e.tactics.failedCovers[0].until>12);
 const replacement=chooseTacticalCover(e,threat,[{...wall,height:2.8}],[],segmentBox,3.5);
 assert.ok(!replacement||Math.hypot(replacement.hidden.x-c.hidden.x,replacement.hidden.z-c.hidden.z)>=1.1);
 assert.ok(chooseTacticalCover(e,threat,[{...wall,height:2.8}],[],segmentBox,13));
 e.tactics.cover=c;e.tactics.state='return';assert.equal(coverProgress(e,14),true);
 e.tactics.state='cover';assert.equal(coverProgress(e,18),true);e.tactics.state='peek';assert.equal(coverProgress(e,22),true);
 e.tactics.state='return';assert.equal(coverProgress(e,25),true,'the second return is not timed from the first');
 e.tactics.cover={...c,hidden:{...c.hidden}};assert.equal(coverProgress(e,30),true,'a replacement plan resets its target');
});

test('cover memory expires without new perception and does not acquire a hidden player transform',()=>{
 const e=enemy();e.lastSeenAt=2;e.tactics={cover:{}};assert.equal(remembersCoverContact(e,10),true);assert.equal(remembersCoverContact(e,14.1),false);
 e.lastHeardAt=11;assert.equal(remembersCoverContact(e,20),true);e.tactics.cover=null;assert.equal(remembersCoverContact(e,20),false);
 const g=new ArenaGame([wall],()=>.5);g.nextWave=-1;g.toSpawn=0;g.invulnerable=1e6;Object.assign(g.player,{x:0,z:0});g.enemies=[enemy()];
 while(g.time<3)g.step(1/30,{});const bot=g.enemies[0];assert.equal(bot.awareness,'search');const known=[bot.lastKnownX,bot.lastKnownZ];
 Object.assign(g.player,{x:0,z:-35});for(let i=0;i<25;i++)g.step(1/30,{});
 assert.deepEqual([bot.lastKnownX,bot.lastKnownZ],known,'only the last known position guides the covered unit');
 assert.equal(g.drainEvents().filter(e=>e.type==='enemy-shot').length,0);
});

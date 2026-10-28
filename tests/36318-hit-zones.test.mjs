import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {ArenaGame,HIT_ZONE_DAMAGE,traceEnemyHit} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {RoomGame} from '../dist/room-game.js';
import {enemyScale,ROBOT_DURABILITY} from '../dist/enemy-combat.js';
import {createHitFeedback} from '../dist/hit-feedback.js';
import {createArmorFeedback} from '../dist/armor-feedback.js';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
const fixture=extra=>({id:99,form:'stalker',x:0,z:0,elevation:0,yaw:0,hp:1000,tier:1,speed:0,stunnedUntil:1e6,grounded:true,aimHeight:1.3,phase:0,...extra});

test('all robot forms retain distinct head, body and limb zones at elevation, rotated, crouched, elite and room scale',()=>{
 for(const form of Object.keys(ROBOT_DURABILITY))for(const yaw of [0,.8,Math.PI/2,Math.PI])for(const elite of [false,true])for(const crouch of [0,1]){
  const e=fixture({form,yaw,elite,elevation:2.4,roomScale:.72,coverCrouch:crouch}),scale=enemyScale(form,elite)*.72;
  const world=([x,y,z])=>({x:e.x+(x*Math.cos(yaw)+z*Math.sin(yaw))*scale,y:e.elevation+y*scale,z:e.z+(-x*Math.sin(yaw)+z*Math.cos(yaw))*scale});
  const drone=form==='probe',crawl=form==='scuttler',headY=drone?.55:crawl?.85:form==='seer'?1.69:1.93,torsoY=drone?.55:crawl?.79:form==='seer'?1.16:1.27;
  const lowered=y=>y-crouch*(y>1?.52:.16);
  const head=traceEnemyHit(world([0,lowered(headY),-3]),world([0,lowered(headY),3]),e);
  const body=traceEnemyHit(world([0,lowered(torsoY),3]),world([0,lowered(torsoY),-3]),e);
  const limbX=drone?.61:crawl?.76:form==='seer'?.13:.2,limbY=drone?.49:crawl?.43:form==='seer'?.53:.47;
  const limb=traceEnemyHit(world([limbX,lowered(limbY),-3]),world([limbX,lowered(limbY),3]),e);
  for(const [hit,zone] of [[head,'head'],[body,'torso'],[limb,'limb']]){
   assert.equal(hit?.zone,zone,`${form} ${yaw} ${elite} ${crouch}`);close(hit.multiplier,HIT_ZONE_DAMAGE[zone]*(form==='bulwark'&&zone==='torso'?.72:1));
  }
 }
 // Both arms, from the side-facing robot's left and right flanks.
 for(const sign of [-1,1])assert.equal(traceEnemyHit({x:sign*.69,y:1.22,z:-3},{x:sign*.69,y:1.22,z:3},fixture()).zone,'limb');
});

test('real R9 projectiles apply exactly one zone multiplier in Arena/M02, M01 and AT HOME, with cover still stopping shots',()=>{
 const factories=[()=>new ArenaGame([],()=>.5),()=>new CampaignLevel1([],()=>.5,'ghju'),()=>{const room={hasFloor:()=>true,floorAt:()=>0,freeArea:()=>12,trace:()=>null};const g=new RoomGame(room,()=>.5);g.start({x:0,y:1.6,z:10});return g;}];
 for(const create of factories)for(const [zone,x,y] of [['head',0,1.93],['torso',0,1.27],['limb',.2,.47],['limb',.69,1.22]]){
  const g=create(),e=fixture();g.enemies=[e];g.ownedWeapons.add(0);g.selectWeapon(0);g.cooldown=0;g.nextWave=Infinity;g.toSpawn=0;g.drainEvents();
  assert.equal(g.shoot({x,y,z:10},{x:0,y:0,z:-1}),true);for(let i=0;i<6;i++)g.step(.025,{});
  close(1000-e.hp,24*HIT_ZONE_DAMAGE[zone]);const hit=g.drainEvents().find(e=>e.type==='hit');assert.equal(hit.zone,zone);assert.equal(hit.playerSource,true);close(hit.damage,24*HIT_ZONE_DAMAGE[zone]);
 }
 const g=new ArenaGame([{x:0,y:0,z:5,hx:2,hz:.1,height:3}],()=>.5),e=fixture();g.enemies=[e];g.selectWeapon(0);g.cooldown=0;g.shoot({x:0,y:1.93,z:10},{x:0,y:0,z:-1});for(let i=0;i<6;i++)g.step(.025,{});assert.equal(e.hp,1000);assert.equal(g.drainEvents().filter(e=>e.type==='hit').length,0);
});

test('blindage still protects the body, a head hit rewards precision, and area damage never inherits the direct head multiplier',()=>{
 const g=new ArenaGame([],()=>.5),head=fixture({id:1,tier:5}),body=fixture({id:2,tier:5}),limb=fixture({id:3,tier:5});g.enemies=[head,body,limb];
 g.damageEnemy(head,24,{x:0,y:1.93,z:0},'head');g.damageEnemy(body,24,{x:0,y:1.27,z:0},'torso');g.damageEnemy(limb,24,{x:.2,y:.47,z:0},'limb');
 close(1000-head.hp,60*.965);close(1000-body.hp,24*.9);close(1000-limb.hp,14.4*.9);assert.ok(head.stunnedUntil>g.time);assert.ok(limb.limpUntil>g.time);
 const direct=fixture({id:8}),splash=fixture({id:9,x:1});g.enemies=[direct,splash];
 g.damageEnemy(direct,24,{x:0,y:1.93,z:0},'head',2.5);g.damageEnemy(splash,24,{x:1,y:1.27,z:0},'torso',1);close(1000-direct.hp,60);close(1000-splash.hp,24);
 g.damageEnemy(splash,24,{x:1,y:1.27,z:0},'torso',1,{x:4,z:4,companion:true});assert.equal(g.drainEvents().at(-1).playerSource,false);
});

test('one reusable hit confirmation distinguishes heads, fades without numbers, preserves the camera, and cleans up on exit',()=>{
 const camera=new T.PerspectiveCamera(72),before=camera.position.clone(),feedback=createHitFeedback(T,camera),mesh=feedback.mesh;
 assert.equal(mesh.visible,false);assert.equal(feedback.hit({type:'hit',zone:'head',damage:60,playerSource:false}),false);
 feedback.hit({type:'hit',zone:'torso',damage:24});const white=mesh.material.color.getHex();feedback.hit({type:'hit',zone:'head',damage:60});assert.notEqual(mesh.material.color.getHex(),white);assert.equal(mesh.userData.zone,'head');
 assert.equal(feedback.hit({type:'hit',zone:'limb',damage:14.4}),false,'a stray shotgun pellet cannot erase the head confirmation');
 const hip=mesh.scale.x;camera.fov=20;feedback.update(.04);assert.ok(mesh.scale.x<hip*.3);assert.ok(mesh.material.opacity<.9);assert.ok(camera.position.equals(before));
 feedback.update(.2);assert.equal(mesh.visible,false);feedback.hit({type:'hit',zone:'limb',damage:14.4});assert.ok(mesh.material.opacity<.5);feedback.reset();assert.equal(mesh.visible,false);
 let disposed=0;mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);feedback.dispose();feedback.dispose();assert.equal(disposed,2);assert.equal(camera.children.length,0);
 const fx=createArmorFeedback({T,scene:new T.Scene(),camera});fx.handle({type:'hit',zone:'head',damage:60});assert.equal(camera.children[0].visible,true);fx.handle({type:'weapon'});assert.equal(camera.children[0].visible,false);fx.dispose();assert.equal(camera.children.length,0);
});

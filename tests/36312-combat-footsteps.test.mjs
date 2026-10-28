import test from 'node:test';import assert from 'node:assert/strict';
import {audioMock} from './audio-mock.mjs';
import {createAmbience} from '../dist/ambience.js';
import {loadRLHFootsteps,RLH_STEP_SAMPLES} from '../dist/rlh-footsteps.js';
import {enemyDurability,ROBOT_DURABILITY} from '../dist/enemy-combat.js';
import {WEAPONS,HIT_ZONE_DAMAGE} from '../dist/game-logic.js';
import {CampaignLevel1} from '../dist/campaign-level1.js';
import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';

test('RLH footfalls are decoded once, vary per step and stop on pause, jump, lift, wall or teleport',async()=>{
 const f=audioMock();let requests=0;f.ctx.decodeAudioData=async bytes=>({duration:.42,id:new Uint8Array(bytes)[0]});
 const fetcher=async url=>{requests++;return{ok:true,arrayBuffer:async()=>new Uint8Array([RLH_STEP_SAMPLES.indexOf(url)]).buffer};};
 const a=createAmbience(f.ctx,{footstepFetch:fetcher});await a.footstepReady;await loadRLHFootsteps(f.ctx,fetcher);assert.equal(requests,4);
 let x=0;const move=(extra={})=>{f.ctx.tick(.05);a.update(.05,{active:true,moving:true,position:{x,z:0},...extra});};
 move();for(let i=0;i<24;i++){x+=.35;move();}assert.ok(a.stats.recordedSteps>=4);const clips=f.nodes.filter(n=>n.kind==='buffer'&&n.buffer?.id!==undefined);assert.equal(new Set(clips.map(n=>n.buffer.id)).size,4);
 let count=a.stats.steps;for(let i=0;i<20;i++)move();assert.equal(a.stats.steps,count,'wall');for(let i=0;i<10;i++){x+=.35;move({grounded:false});}assert.equal(a.stats.steps,count,'air');for(let i=0;i<10;i++){x+=.35;move({onLift:true});}assert.equal(a.stats.steps,count,'lift');x+=80;move();assert.equal(a.stats.steps,count,'teleport');
 a.pause();assert.ok(clips.every(n=>n.disconnected));a.dispose();assert.ok(f.nodes.every(n=>n.disconnected));
});
test('light, infantry and heavy robots require distinct finite torso hits, with sensors still useful',()=>{
 const shotgun=WEAPONS.find(w=>w.id==='m12'),pistol=WEAPONS[0];
 const counts={};
 for(const form of Object.keys(ROBOT_DURABILITY)){
  const g=new CampaignLevel1([],()=>.5,'lylu');g.stage='workshop';g.openingSpawned=8;g.invulnerable=1e6;Object.assign(g.player,{x:0,z:0,elevation:0});
  const e=g.makeEnemy(form,{id:1,x:0,z:-5,yaw:0});e.stunnedUntil=1e6;e.speed=0;g.enemies=[e];let shots=0;
  const y=e.elevation+(form==='probe'?.55:form==='scuttler'?.79:1.27);
  while(g.enemies.length&&shots<(form==='seer'?24:10)){
   if(g.ammo[g.weaponIndex]===0){if(g.reloadRemaining===0)assert.equal(g.reload(),true);while(g.reloadRemaining>0)g.step(.025,{});}
   assert.equal(g.shoot({x:0,y:1.45,z:0},{x:0,y:y-1.45,z:-5}),true);
   for(let i=0;i<40;i++)g.step(.025,{});shots++;
  }
  counts[form]=shots;assert.equal(g.kills,1);assert.ok(shots<(form==='seer'?24:10));
  const torso=Math.ceil(enemyDurability(1,form)/pistol.damage),head=Math.ceil(enemyDurability(1,form)/(pistol.damage*HIT_ZONE_DAMAGE.head));assert.ok(head<torso);
 }
 assert.equal(counts.probe,1);assert.equal(counts.stalker,2);assert.equal(counts.synth,2);assert.equal(counts.brute,3);assert.equal(counts.bulwark,4);
 assert.ok(counts.seer>counts.bulwark*2,'RECO1 takes substantially more actual M12 shells');
 assert.ok(enemyDurability(3,'synth')>enemyDurability(1,'synth'));assert.ok(enemyDurability(1,'synth',true)>enemyDurability(1,'synth'));
});
test('RLH clips and the real Model 12 blast match their provenance checksums and stay compact',()=>{
 const base=new URL('../dist/',import.meta.url),steps=JSON.parse(readFileSync(new URL('audio/rlh/credits.json',base)));let bytes=0;
 for(const item of steps.files){const b=readFileSync(new URL(item.file,base));assert.equal(createHash('sha256').update(b).digest('hex'),item.sha256);bytes+=b.length;}assert.equal(steps.files.length,4);assert.ok(bytes<110000);
 const sounds=JSON.parse(readFileSync(new URL('audio/combat/manifest.json',base))),shotgun=sounds.find(i=>i.id==='shotgun-body');assert.match(shotgun.download,/Model%2012/);assert.equal(shotgun.seconds,1.05);assert.equal(shotgun.license,'CC0-1.0');
});

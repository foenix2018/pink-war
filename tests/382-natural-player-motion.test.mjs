import test from 'node:test';import assert from 'node:assert/strict';import{HERO_MOTION_PACK}from'../dist/hero-motion-data.js';import{naturalHeroClips}from'../dist/hero-motion.js';import{rlhFirefighterData}from'../dist/rlh-firefighter.js';import{ArenaGame}from'../dist/game-logic.js';import{PLAYER_SPEEDS}from'../dist/locomotion.js';
test('the CC0 motion pack contains actual sampled humanoid idle, walk and jogging rotations',()=>{
 assert.equal(HERO_MOTION_PACK.author,'Quaternius');assert.equal(HERO_MOTION_PACK.license,'CC0-1.0');
 for(const c of HERO_MOTION_PACK.clips){assert.equal(c.tracks.length,22);assert.ok(c.duration>.5);for(const t of c.tracks){assert.equal(t.values.length,t.times.length*4);assert.ok(t.values.every(Number.isFinite));for(let i=0;i<t.values.length;i+=4)assert.ok(Math.abs(Math.hypot(...t.values.slice(i,i+4))-1)<.00001);}const spine=c.tracks.find(t=>t.name==='mixamorigSpine2.quaternion');assert.ok(spine.values.some((v,i)=>i>3&&Math.abs(v-spine.values[i%4])>.001));}
});
test('human counter-motion preserves the canonical leg, pelvis and weapon-aim tracks without modifying shared source clips',()=>{
 const original=rlhFirefighterData(),before=original.clips.map(c=>c.animation.toJSON()),clips=naturalHeroClips(original);
 for(const c of clips){const old=original.clips.find(v=>v.name===c.name);assert.equal(c.duration,old.duration);for(const t of old.animation.tracks.filter(t=>/mixamorig(Hips|Left(UpLeg|Leg|Foot|Toe)|Right(UpLeg|Leg|Foot|Toe))/.test(t.name))){const kept=c.animation.tracks.find(k=>k.name===t.name);assert.deepEqual(kept.values,t.values);assert.deepEqual(kept.times,t.times);}if(c.name!=='rifle')assert.notEqual(c.animation,old.animation);}
 assert.deepEqual(original.clips.map(c=>c.animation.toJSON()),before);
});
test('walking and sprinting respect the slower profile and preserve exact acceleration at different frame rates',()=>{
 const run=(hz,sprint)=>{const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;g.player.z=0;for(let i=0;i<hz;i++)g.step(1/hz,{z:-1,sprint});return -g.player.z;};
 for(const sprint of[false,true]){const distance=run(30,sprint),expected=(sprint?PLAYER_SPEEDS.sprint:PLAYER_SPEEDS.walk)*(1-(1-Math.exp(-8))/8);assert.ok(Math.abs(distance-expected)<1e-8);for(const hz of[60,120])assert.ok(Math.abs(run(hz,sprint)-distance)<1e-8);}
 assert.ok(PLAYER_SPEEDS.walk<3&&PLAYER_SPEEDS.sprint<6&&PLAYER_SPEEDS.crouch<PLAYER_SPEEDS.walk);
});

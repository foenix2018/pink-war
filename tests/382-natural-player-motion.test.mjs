import test from 'node:test';import assert from 'node:assert/strict';import{mixamoPlayerMotions,naturalHeroClips}from'../dist/hero-motion.js';import{rlhFirefighterData}from'../dist/rlh-firefighter.js';import{ArenaGame}from'../dist/game-logic.js';import{PLAYER_SPEEDS}from'../dist/locomotion.js';
test('the player pack contains finite, normalized full-body Mixamo animation tracks',()=>{
 const pack=mixamoPlayerMotions();assert.equal(pack.author,'Adobe Mixamo');assert.ok(pack.license.includes('Mixamo'));
 for(const c of pack.clips)for(const t of c.tracks){const size=t.type==='vector'?3:4;assert.equal(t.values.length,t.times.length*size);assert.ok(t.values.every(Number.isFinite));if(size===4)for(let i=0;i<t.values.length;i+=4)assert.ok(Math.abs(Math.hypot(...t.values.slice(i,i+4))-1)<.00001);}
});
test('Mixamo movement replaces the legacy leg tracks while preserving shared source data and native idles',()=>{
 const original=rlhFirefighterData(),before=original.clips.map(c=>c.animation.toJSON()),clips=naturalHeroClips(original);
 for(const name of ['idle','rifle'])assert.equal(clips.find(c=>c.name===name),original.clips.find(c=>c.name===name));
 const walk=clips.find(c=>c.name==='walk'),old=original.clips.find(c=>c.name==='walk');assert.notEqual(walk.animation,old.animation);assert.ok(walk.mocap.file.endsWith('.fbx'));
 const hips=walk.animation.tracks.find(t=>t.name==='mixamorigHips.position');assert.ok(hips.values.some((v,i)=>i%3===0&&Math.abs(v)>.005),'keep recorded pelvis sway instead of pinning it to zero');
 assert.deepEqual(original.clips.map(c=>c.animation.toJSON()),before);
});
test('walking and sprinting preserve the existing physical speed and frame-rate-independent acceleration',()=>{
 const run=(hz,sprint)=>{const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;g.player.z=0;for(let i=0;i<hz;i++)g.step(1/hz,{z:-1,sprint});return -g.player.z;};
 for(const sprint of[false,true]){const distance=run(30,sprint),expected=(sprint?PLAYER_SPEEDS.sprint:PLAYER_SPEEDS.walk)*(1-(1-Math.exp(-8))/8);assert.ok(Math.abs(distance-expected)<1e-8);for(const hz of[60,120])assert.ok(Math.abs(run(hz,sprint)-distance)<1e-8);}
 assert.ok(PLAYER_SPEEDS.walk<3&&PLAYER_SPEEDS.sprint<6&&PLAYER_SPEEDS.crouch<PLAYER_SPEEDS.walk);
});

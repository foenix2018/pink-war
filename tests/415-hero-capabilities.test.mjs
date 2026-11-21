import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SLIDE_RULES,JETPACK_RULES} from '../dist/locomotion.js';
import {HERO_CAPABILITIES,heroFlightFlags} from '../dist/hero-capabilities.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const LEVELS=['game.js','level2-test.js','ligne9.js','niveau3.js','niveau4.js','niveau6.js','couronne-helix.js'];

test('every chapter that animates the hero gives it the shared flight flags (slide, jetpack flames and fuel)',()=>{
  for(const f of LEVELS)assert.match(read(f),/\.\.\.heroFlightFlags\(game\.player\)/,f);
  assert.match(read('vesper-combat.js'),/slide:!!s\.sliding,jetpack:!!s\.jetpackActive/);
});
test('every mission level sounds the thrusters and silences them on pause',()=>{
  for(const f of ['level2-test.js','ligne9.js','niveau3.js','niveau4.js','niveau6.js','couronne-helix.js']){
    const s=read(f);assert.match(s,/createHeroCapabilityAudio/,f);assert.match(s,/heroAudio\.update\(game,enableAudio\)/,f);assert.match(s,/function pauseMission\(\)\{heroAudio\.stop\(\)/,f);
  }
  assert.match(read('game.js'),/jetpackAudio\.update/);assert.match(read('vesper-combat.js'),/heroAudio\.update/);
});
test('chapter 1 (own controller) has the same slide and jetpack numbers as the engine',()=>{
  const s=read('vesper-level1-v7.html');
  const slide=s.match(/const SLIDE=\{duration:([\d.]+),boost:([\d.]+),maxSpeed:([\d.]+),cooldown:([\d.]+),jumpCancelAfter:([\d.]+)\}/),jet=s.match(/JETPACK=\{maxDuration:([\d.]+),boostWindow:([\d.]+),brake:([\d.]+),settleSpeed:([\d.]+)\}/);
  assert.ok(slide&&jet);
  assert.deepEqual(slide.slice(1).map(Number),[SLIDE_RULES.duration,SLIDE_RULES.boost,SLIDE_RULES.maxSpeed,SLIDE_RULES.cooldown,SLIDE_RULES.jumpCancelAfter]);
  assert.deepEqual(jet.slice(1).map(Number),[JETPACK_RULES.maxDuration,JETPACK_RULES.boostWindow,JETPACK_RULES.brake,JETPACK_RULES.settleSpeed]);
  assert.match(s,/function toggleCrouch\(\)/);assert.doesNotMatch(s,/crouching=!crouching;if\(edge|KeyC'\)crouching=!crouching/);
  assert.match(s,/fire\.addEventListener\('pointermove'/);
});
test('the capability list and the flags helper',()=>{
  assert.ok(Object.keys(HERO_CAPABILITIES).length>=7);
  assert.deepEqual(heroFlightFlags({sliding:true,jetpackActive:false,grounded:true}),{slide:true,jetpack:false,jetpackFuel:1});
  const f=heroFlightFlags({jetpackActive:true,grounded:false,jetpackArmed:true,jetpackElapsed:1});assert.equal(f.jetpackFuel,.5);
});
test('the grappling hook is shared by the engine levels and switched off in chapter 1 (own controller)',()=>{
  for(const f of ['game.js','level2-test.js','ligne9.js','niveau3.js','niveau4.js','niveau6.js','couronne-helix.js'])assert.match(read(f),/createArmorFeedback/,f);
  assert.match(read('vesper-combat.js'),/defineProperty\(game,'grappleEnabled'/);
  assert.ok('grapple' in HERO_CAPABILITIES);
});

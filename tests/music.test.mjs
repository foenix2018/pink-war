import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicBed,MUSIC_CREDIT,MUSIC_SECTIONS,musicSectionFor} from '../dist/music.js';
import {REAL_LASER_SAMPLE,LASER_PROFILES} from '../dist/laser-sound.js';
import {audioMock} from './audio-mock.mjs';

test('original underscore uses only a supplied unlocked context, and music mute is independent',()=>{
  const {ctx,nodes,calls}=audioMock(),bed=createMusicBed();
  assert.equal(MUSIC_CREDIT.source,'local');
  assert.equal(bed.start(),false);assert.equal(nodes.length,0,'no media object or context on construction');
  ctx.state='suspended';bed.start(ctx);assert.equal(calls.starts,0);
  ctx.state='running';bed.start(ctx);assert.equal(bed.playing,true);assert.ok(calls.starts>0);
  bed.setEnabled(false);assert.equal(bed.playing,false);assert.equal(nodes[0].gain.value,0);
  assert.equal(ctx.state,'running','music mute never suspends the shared effects context');
  const starts=calls.starts;for(let i=0;i<20;i++){ctx.tick(.05);bed.update(.05,{active:true});}
  assert.equal(calls.starts,starts);
  bed.setEnabled(true);bed.start();assert.equal(bed.playing,true);
  bed.pause();assert.equal(bed.playing,false);assert.equal(bed.stats.voices,0);
  bed.start();bed.dispose();assert.equal(bed.playing,false);assert.ok(nodes.every(n=>n.disconnected));
  bed.start(ctx);assert.equal(bed.playing,false,'disposed music cannot recreate nodes');
});

test('music changes arrangement at phrase boundaries and remains bounded through battle and interlude',()=>{
  const {ctx,nodes}=audioMock(),bed=createMusicBed(ctx);
  assert.equal(musicSectionFor({threat:0}),'exploration');
  assert.equal(musicSectionFor({threat:.3}),'tension');
  assert.equal(musicSectionFor({threat:.9}),'combat');
  assert.equal(musicSectionFor({threat:1,intermission:true}),'interlude');
  assert.equal(MUSIC_SECTIONS.exploration.pulse,0);assert.ok(MUSIC_SECTIONS.combat.pulse>0);
  bed.update(.05,{active:true,threat:0});ctx.tick(.3);
  bed.update(.05,{active:true,threat:.9});assert.equal(bed.section,'exploration','a combat alert cannot cut a sustained chord mid-phrase');
  for(let i=0;i<180;i++){ctx.tick(.05);bed.update(.05,{active:true,threat:.9});}
  assert.equal(bed.section,'combat');
  for(let i=0;i<1200;i++){ctx.tick(.05);bed.update(.05,{active:true,intermission:true});assert.ok(bed.stats.voices<=30);}
  assert.equal(bed.section,'interlude');
  assert.ok(nodes.filter(n=>!n.disconnected).length<90,'finished notes release their entire graph');
  bed.dispose();assert.ok(nodes.every(n=>n.disconnected));
});

test('background-tab return starts a fresh musical phrase without a burst of missed notes',()=>{
  const {ctx,calls}=audioMock(),bed=createMusicBed(ctx);bed.start();ctx.tick(90);
  const starts=calls.starts;bed.update(.016,{active:true,threat:.5});
  assert.ok(calls.starts-starts<=5);assert.equal(bed.section,'tension');bed.dispose();
});

test('local real laser sample remains available without an external runtime request',async()=>{
  const fs=await import('node:fs/promises'),bytes=await fs.readFile(new URL('../dist/'+REAL_LASER_SAMPLE,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length>3000);
  assert.equal(Object.keys(LASER_PROFILES).length,7);
});

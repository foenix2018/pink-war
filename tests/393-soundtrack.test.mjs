import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {CHAPTER_SCORE,SCORE,scoreFor,scoreMix,chapterForMode} from '../dist/score-catalogue.js';
import {createMissionMusic} from '../dist/mission-music.js';
import {audioMock} from './audio-mock.mjs';

test('all supplied tracks are bundled; chapters 1–10 and independent modes have a score',()=>{
 assert.equal(Object.keys(SCORE).length,10);
 for(const t of Object.values(SCORE))assert.ok(statSync(new URL(t.url,new URL('../dist/',import.meta.url))).size<2400000);
 for(let n=1;n<=10;n++)assert.ok(CHAPTER_SCORE[n]);
 assert.equal(chapterForMode('foret'),7);assert.equal(chapterForMode('campaign10'),10);
 assert.equal(scoreFor(10,{finale:true}),SCORE.collapse);assert.equal(scoreFor(9),SCORE.garden);assert.equal(scoreFor(6),SCORE.machinery);
 assert.equal(scoreFor(1,{mode:'arena'}),SCORE.collapse);
 assert.equal(scoreFor(10,{mode:'training'}),SCORE.garden);
 assert.equal(scoreFor(1,{mode:'planque'}),SCORE.garden);
});
test('dialogue wins over combat, peaceful spaces stay quieter, and distant or dead enemies do not raise music',()=>{
 const game={player:{x:0,z:0},enemies:[{x:1,z:1,hp:10}]};
 const combat=scoreMix({game}),dialogue=scoreMix({game,dialogue:true});
 assert.equal(combat.section,'combat');assert.equal(dialogue.section,'dialogue');assert.ok(dialogue.gain<combat.gain/3);
 assert.ok(scoreMix({mode:'planque'}).gain<scoreMix().gain);
 assert.ok(scoreMix({level:7}).gain<scoreMix().gain);
 game.enemies[0].hp=0;assert.equal(scoreMix({game}).section,'exploration');
 game.enemies[0]={x:90,z:0,hp:10};assert.equal(scoreMix({game}).section,'exploration');
});
test('a track switch fades the previous source, reuses one streaming element and cancels pending playback on disposal',async()=>{
 const {ctx}=audioMock();let elements=0;
 ctx.createMediaElementSource=()=>({connect(){},disconnect(){}});
 const media={paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){this.currentTime=0;},removeAttribute(){this.src='';}};
 const music=createMissionMusic(1,{mediaFactory:()=>{elements++;return media;}});
 music.start(ctx);await Promise.resolve();music.setTrack(SCORE.corridor);
 assert.equal(music.stats.transitioning,true);assert.equal(music.stats.gain,0);
 await new Promise(r=>setTimeout(r,210));assert.equal(media.src,SCORE.corridor.url);assert.equal(elements,1);assert.equal(music.playing,true);
 music.setMix(.36);music.duck();assert.ok(music.stats.gain<.36);ctx.tick(.3);music.update(.3);assert.equal(music.stats.gain,.36);
 music.setTrack(SCORE.garden);music.setEnabled(false);await new Promise(r=>setTimeout(r,210));assert.equal(media.paused,true,'a pending track cannot bypass mute');
 music.setEnabled(true);await Promise.resolve();music.setTrack(SCORE.spire);music.dispose();await new Promise(r=>setTimeout(r,210));assert.equal(media.src,'');assert.equal(media.paused,true);
});
test('a failed file can recover on chapter change; no stale failure poisons the next track',async()=>{
 const {ctx}=audioMock();ctx.createMediaElementSource=()=>({connect(){},disconnect(){}});
 const media={paused:true,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},load(){},removeAttribute(){}};
 const music=createMissionMusic(1,{mediaFactory:()=>media});music.start(ctx);await Promise.resolve();media.onerror();assert.equal(music.failed,true);
 music.pause();music.setTrack(SCORE.garden);assert.equal(music.failed,false);music.start();await Promise.resolve();assert.equal(music.playing,true);music.dispose();
});
test('chapter frame loops supply their actual chapter and dialogue status, including 6, 7 and 8',()=>{
 for(const [file,level] of [['niveau3.js',3],['niveau4.js',4],['ligne9.js',5],['niveau6.js',6],['niveau7.js',7],['niveau8.js',8],['niveau9.js',9],['niveau10.js',10]]){
  const source=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
  assert.ok(source.includes(`'gameplay':'paused',${level},undefined,{game,dialogue:!!subtitle`),file);
 }
});

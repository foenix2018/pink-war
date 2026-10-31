import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {MUSIC_TRACKS,createMusicBed} from '../dist/music-tracks.js';
import {audioMock} from './audio-mock.mjs';
function fixture(){
 const {ctx,nodes}=audioMock();ctx.createMediaElementSource=()=>({connect(){},disconnect(){}});
 const media={paused:true,currentTime:12,plays:0,play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){this.src='';},load(){}};
 return {ctx,nodes,media,track:createMusicBed(ctx,{mediaFactory:()=>media})};
}
test('both active soundtrack references resolve to bundled compressed creator audio',()=>{
 assert.match(MUSIC_TRACKS.lobby,/velvet-siege\.m4a/);assert.match(MUSIC_TRACKS.game,/iron-maw\.m4a/);
 for(const path of Object.values(MUSIC_TRACKS)){const size=statSync(new URL(path,new URL('../dist/',import.meta.url))).size;assert.ok(size>100000&&size<3000000);}
});
test('mission streaming respects pause, position, mute, ducking and disposal without synth overlap',async()=>{
 const {ctx,nodes,media,track}=fixture();track.start();await Promise.resolve();assert.equal(track.playing,true);assert.equal(media.preload,'none');assert.equal(media.loop,true);
 assert.equal(nodes.filter(n=>n.kind==='oscillator').length,0);track.duck();assert.equal(track.stats.gain,.29);
 track.pause();assert.equal(media.paused,true);assert.equal(media.currentTime,12);track.start();await Promise.resolve();track.setEnabled(false);assert.equal(track.playing,false);assert.equal(media.paused,true);
 track.setEnabled(true);await Promise.resolve();track.update(.016,{active:true,threat:.8});assert.equal(track.section,'combat');ctx.tick(.5);track.dispose();assert.equal(media.src,'');assert.equal(track.playing,false);
});
test('missing media switches to local synthesis, which also stops when muted or paused',async()=>{
 const {ctx,media,track}=fixture();track.start();await Promise.resolve();media.onerror();track.update(.016,{active:true,threat:.8});
 assert.equal(track.failed,true);assert.equal(media.paused,true);assert.equal(track.playing,true);assert.match(track.source,/^local:/);assert.ok(track.stats.voices>0);
 track.setEnabled(false);assert.equal(track.playing,false);track.setEnabled(true);track.pause();assert.equal(track.playing,false);track.dispose();
});
test('autoplay rejection waits for a new gesture and never starts synthesis or retries per frame',async()=>{
 const {media,track}=fixture();media.play=()=>{media.plays++;return Promise.reject(Object.assign(Error('gesture required'),{name:'NotAllowedError'}));};
 track.start();await new Promise(r=>setImmediate(r));for(let i=0;i<60;i++)track.update(.016,{active:true});assert.equal(media.plays,1);assert.equal(track.failed,false);assert.equal(track.playing,false);
 track.start();await new Promise(r=>setImmediate(r));assert.equal(media.plays,2);track.dispose();
});

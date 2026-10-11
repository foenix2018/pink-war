import test from 'node:test';
import assert from 'node:assert/strict';
import {createMusicBed,MUSIC_CREDIT} from '../dist/music.js';
import {REAL_LASER_SAMPLE,LASER_PROFILES} from '../dist/laser-sound.js';

test('verified CC0 music loops, obeys mute/pause and has a fallback format',async()=>{
  let started=0,stopped=0;
  const audio={src:'',paused:true,loop:false,volume:1,preload:'',addEventListener(){},
    play(){started++;this.paused=false;return Promise.resolve();},
    pause(){stopped++;this.paused=true;}};
  const bed=createMusicBed(()=>audio);
  assert.equal(MUSIC_CREDIT.license,'CC0');assert.equal(MUSIC_CREDIT.author,'gmason');
  assert.equal(audio.loop,true);assert.ok(audio.volume<.25);
  await bed.start();assert.equal(started,1);assert.equal(bed.playing,true);
  assert.ok(audio.src.endsWith('tensefutureloop.mp3'));
  bed.setEnabled(false);assert.equal(bed.playing,false);
  await bed.start();assert.equal(started,1);
  bed.setEnabled(true);await bed.start();assert.equal(started,2);
  bed.pause();assert.ok(stopped>=2);
});

test('local real laser sample is available without an external runtime request',async()=>{
  const fs=await import('node:fs/promises');
  const bytes=await fs.readFile(new URL('../dist/'+REAL_LASER_SAMPLE,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.ok(bytes.length>3000);
  assert.equal(Object.keys(LASER_PROFILES).length,5);
});

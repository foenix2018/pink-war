import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MUSIC_TRACKS,createLobbyTrack,createMusicBed} from '../dist/music-tracks.js';

class FakeAudio{
  constructor(){this.paused=true;this.readyState=0;this.volume=1;this.events=new Map();this.loads=0;FakeAudio.all.push(this);}
  static all=[];
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  load(){this.loads++;}
  removeAttribute(name){if(name==='src')this.src='';}
  addEventListener(name,fn){this.events.set(name,fn);}
  removeEventListener(name){this.events.delete(name);}
  emit(name){this.events.get(name)?.();}
}
const oldAudio=globalThis.Audio;
test.before(()=>{globalThis.Audio=FakeAudio;});
test.after(()=>{if(oldAudio===undefined)delete globalThis.Audio;else globalThis.Audio=oldAudio;});

test('MP3 tracks are local paths: song with vocals on menu, instrumental during combat',()=>{
  assert.match(MUSIC_TRACKS.lobby,/\/assets\/music\/under-violet-light\.mp3$/);
  assert.match(MUSIC_TRACKS.game,/\/assets\/music\/velvet-siege\.mp3$/);
});
test('compressed audio assets must be committed before the music PR can ship',()=>{
  for(const src of Object.values(MUSIC_TRACKS)){
    const size=statSync(fileURLToPath(src)).size;
    assert.ok(size>100_000&&size<3_000_000,'MP3 must be valid compressed track');
  }
});
test('lobby music respects user gesture, user mute and pause',()=>{
  const track=createLobbyTrack(),a=FakeAudio.all.at(-1);
  assert.equal(a.preload,'none');
  assert.equal(a.loop,true);
  assert.equal(a.paused,true);
  track.start();assert.equal(a.paused,false);
  track.pause();assert.equal(a.paused,true);
  track.setEnabled(false);track.start();assert.equal(a.paused,true);
  track.setEnabled(true);track.start();assert.equal(a.paused,false);
  track.dispose();assert.equal(a.src,'');
});
test('Histoire/Arène MP3 is streamed once; fallback stays dormant until media failure',()=>{
  const track=createMusicBed(),a=FakeAudio.all.at(-1);
  assert.equal(a.preload,'none');
  assert.equal(a.paused,true);
  track.start();
  assert.equal(a.paused,false);
  assert.equal(a.loads,1);
  track.update(.016,{active:true,threat:.8});
  assert.equal(track.section,'combat');
  assert.equal(track.source,'file:velvet-siege');
  track.pause();assert.equal(a.paused,true);
  track.start();assert.equal(a.loads,1,'resume must not download twice');
  track.setEnabled(false);assert.equal(a.paused,true);
  track.dispose();assert.equal(a.src,'');
});
test('game audio integration handles transition from lobby into missions and back',()=>{
  const game=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
  const entry=readFileSync(new URL('../dist/entry.js',import.meta.url),'utf8');
  assert.match(game,/lobbyTrack\?\.pause\(\)/);
  assert.match(game,/lobbyTrack\?\.start\(\)/);
  assert.match(game,/import \{ createMusicBed \} from '\.\/music-tracks\.js'/);
  assert.match(entry,/pointerdown/);
  assert.match(entry,/window\.__PINKWAR_LOBBY_MUSIC/);
});

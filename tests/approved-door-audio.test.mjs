import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DOORS} from '../dist/m02-extension-layout.js';
import {DOOR_SAMPLES,doorSoundProfile,loadDoorSamples,playDoorMotion} from '../dist/door-audio.js';
import {audioMock} from './audio-mock.mjs';

test('M02 medical and heavy doors play the approved A/B recordings at their original pitch',async()=>{
 const f=audioMock(),seen=[];f.ctx.decodeAudioData=async bytes=>({id:new TextDecoder().decode(bytes),duration:2});
 const fetcher=async url=>{seen.push(url);return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer};};
 await Promise.all([loadDoorSamples(f.ctx,fetcher),loadDoorSamples(f.ctx,fetcher)]);assert.equal(seen.length,4);
 for(const door of DOORS){const expected=['grille','tour','coffre','quai','convoi'].includes(door.id)?'heavy':'medical';assert.equal(doorSoundProfile(door),expected,door.id);
  for(const kind of ['open','close']){const voice=playDoorMotion(f.ctx,kind,door,{listener:{x:door.axis==='x'?door.centre:door.fixed,z:door.axis==='x'?door.fixed:door.centre}});assert.ok(voice);const source=f.nodes.filter(n=>n.kind==='buffer').at(-1);assert.equal(source.buffer.id,DOOR_SAMPLES[expected][kind]);assert.equal(source.playbackRate.value,1);voice.stop();}
 }
 assert.ok(f.nodes.every(n=>n.disconnected));
});

test('released A/B files are byte-for-byte copies of the reviewed mixes with accurate attribution',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/assets/audio/doors/manifest.json',import.meta.url))),hashes=new Set();
 for(const profile of ['medical','heavy'])for(const kind of ['open','close']){
  const bytes=readFileSync(new URL(DOOR_SAMPLES[profile][kind]));const entry=manifest.find(i=>i.file===`assets/audio/doors/${profile}-${kind}.wav`);assert.ok(entry);assert.equal(entry.license,'CC-BY-3.0');assert.match(entry.author,/Tomlija/);assert.match(entry.source,/Tomlija/);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);assert.deepEqual(bytes,readFileSync(new URL('../dist/assets/audio/doors/proposals/'+entry.approved_proposal,import.meta.url)));assert.equal(bytes.toString('ascii',0,4),'RIFF');hashes.add(entry.sha256);
 }
 assert.equal(hashes.size,4);
});

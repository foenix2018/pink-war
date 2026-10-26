import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {audioMock} from './audio-mock.mjs';
import {COMBAT_SAMPLES,loadCombatSamples,playLaserImpact,playLaserShot,playWeaponAction,setLaserAudioEnabled,disposeLaserAudio} from '../dist/laser-sound.js';

function fixture(){
 const f=audioMock();let requests=0;
 f.ctx.decodeAudioData=async bytes=>({duration:.4,id:new Uint8Array(bytes)[0]});
 const load=async url=>{requests++;return {ok:true,arrayBuffer:async()=>new Uint8Array([Object.values(COMBAT_SAMPLES).indexOf(url)]).buffer};};
 return {...f,load,requests:()=>requests,recordings:()=>f.nodes.filter(n=>n.kind==='buffer'&&n.buffer?.id!==undefined)};
}
test('recorded metal rotates variants, attenuates by distance and never plays on concrete',async()=>{
 const f=fixture();await Promise.all([loadCombatSamples(f.ctx,f.load),loadCombatSamples(f.ctx,f.load)]);assert.equal(f.requests(),9);
 for(let i=0;i<3;i++){assert.equal(playLaserImpact(f.ctx,{surface:'robot',distance:0}),true);f.ctx.tick(.5);}
 assert.equal(new Set(f.recordings().map(n=>n.buffer.id)).size,3);
 const count=f.recordings().length;playLaserImpact(f.ctx,{surface:'concrete'});assert.equal(f.recordings().length,count);f.ctx.tick(.5);
 playLaserImpact(f.ctx,{surface:'metal',distance:20});const far=f.recordings().at(-1).connections[0].gain.automation[0].value;
 assert.ok(far<.3);f.ctx.tick(.5);disposeLaserAudio(f.ctx);assert.ok(f.nodes.every(n=>n.disconnected));
});
test('shotgun and reload use physical recordings, mute cancels scheduled pump and voices stay bounded',async()=>{
 const f=fixture();await loadCombatSamples(f.ctx,f.load);
 playLaserShot(f.ctx,'m12');assert.deepEqual(f.recordings().map(n=>n.buffer.id),[4,3]);
 setLaserAudioEnabled(f.ctx,false);assert.ok(f.recordings().every(n=>n.disconnected));
 const count=f.recordings().length;assert.equal(playLaserImpact(f.ctx,{surface:'robot'}),false);assert.equal(playLaserShot(f.ctx,'m12'),false);assert.equal(f.recordings().length,count);
 setLaserAudioEnabled(f.ctx,true);playWeaponAction(f.ctx,'m12','reload-ready');assert.equal(f.recordings().at(-1).buffer.id,3);f.ctx.tick(1);
 for(let i=0;i<150;i++){playLaserImpact(f.ctx,{surface:'robot'});f.ctx.tick(.05);assert.ok(f.nodes.filter(n=>!n.disconnected).length<150);}
 f.ctx.tick(2);disposeLaserAudio(f.ctx);assert.ok(f.nodes.every(n=>n.disconnected));
});
test('a missing optional recording leaves immediate synthesis available and retries only failed downloads',async()=>{
 const f=fixture();let fail=true;
 const load=async url=>url.includes('metal-heavy')&&fail?{ok:false}:f.load(url);
 assert.equal(await loadCombatSamples(f.ctx,load),false);assert.equal(playLaserShot(f.ctx,'m12'),true);
 fail=false;assert.equal(await loadCombatSamples(f.ctx,load),true);assert.equal(f.requests(),9);
 disposeLaserAudio(f.ctx);
});
test('bundled effects match the per-file licence and checksum register and stay below 220 KB',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../dist/audio/combat/manifest.json',import.meta.url)));let total=0;
 for(const item of manifest){const bytes=readFileSync(new URL('../dist/'+item.file,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.equal(item.license,'CC0-1.0');total+=bytes.length;}
 assert.equal(manifest.length,9);assert.ok(total<220000);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRobotShutdownAudio,robotShutdownSpatial,robotShutdownPitch} from '../dist/enemy-shutdown-audio.js';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
function fakeContext(){
 let created=0,stopped=0;
 class Param{
  value=0;setValueAtTime(value){this.value=value;}
  linearRampToValueAtTime(value){this.value=value;}
  exponentialRampToValueAtTime(value){this.value=value;}
  cancelScheduledValues(){}
 }
 class Node{
  gain=new Param();frequency=new Param();pan=new Param();
  connect(){return this}disconnect(){}
  start(){}
  stop(){stopped++;this.onended?.()}
 }
 const context={currentTime:4,sampleRate:44100,state:'running',destination:new Node(),
  createGain(){created++;return new Node()},
  createStereoPanner(){created++;return new Node()},
  createOscillator(){created++;return new Node()},
  createBiquadFilter(){created++;return new Node()},
  createBufferSource(){created++;return new Node()},
  createBuffer(n,count){created++;return {getChannelData(){return new Float32Array(count)}}}};
 return {context,stats(){return {created,stopped}}};
}
test('power down pitch distinguishes RECO1, Brute, Rampart and probe',()=>{
 assert.ok(robotShutdownPitch('brute').base<robotShutdownPitch('bulwark').base);
 assert.ok(robotShutdownPitch('bulwark').base<robotShutdownPitch('seer').base);
 assert.ok(robotShutdownPitch('seer').base<robotShutdownPitch('probe').base);
});
test('gain, distance and stereophony follow listener',()=>{
 const listener={x:0,z:0,elevation:0},near=robotShutdownSpatial({x:1,z:0,y:1},listener,0);
 const far=robotShutdownSpatial({x:50,z:0,y:1},listener,0);
 assert.ok(near.gain>far.gain);assert.ok(near.pan>0);
 assert.ok(robotShutdownSpatial({x:-1,z:0,y:1},listener,0).pan<0);
});
test('never allocate an AudioContext; respect missing, muted, and suspended contexts',()=>{
 const f=fakeContext();
 let context=null;
 const audio=createRobotShutdownAudio({getContext:()=>context,getListener:()=>({x:0,z:0})});
 assert.equal(audio.play('shutdown',{x:1,z:1,form:'brute'}),false);
 assert.equal(f.stats().created,0);
 context=f.context;f.context.state='suspended';
 assert.equal(audio.play('shutdown',{x:1,z:1,form:'brute'}),true,'schedule after touch to play when iOS resumes');
 assert.equal(audio.stats().active,0,'mock onended releases voice');
 audio.dispose();assert.equal(audio.play('shutdown',{x:1,z:1}),false);
});
test('bounded voices, distance culling and stop/dispose clean up',()=>{
 const f=fakeContext();
 const audio=createRobotShutdownAudio({getContext:()=>f.context,getListener:()=>({x:0,z:0,elevation:0}),maxVoices:3});
 assert.equal(audio.play('fault',{x:100,z:0,form:'seer'}),false);
 assert.equal(audio.play('shutdown',{x:2,z:0,form:'brute',duration:1.2}),true);
 assert.equal(audio.play('glitch',{x:3,z:0,form:'seer'}),true);
 assert.equal(audio.play('terminal',{x:2,z:0,form:'bulwark'}),true);
 audio.stop();assert.equal(audio.stats().active,0);
 audio.dispose();assert.equal(audio.play('fault',{x:0,z:0}),false);
 assert.ok(f.stats().created>0);
});
test('every gameplay mode routes electric cues through existing sound preferences',()=>{
 const fx=read('enemy-destruction-fx.js');
 assert.match(fx,/sound\('shutdown'/);
 assert.match(fx,/sound\('fault'/);
 assert.match(fx,/sound\('terminal'/);
 assert.match(fx,/sound\('glitch'/);
 assert.match(fx,/setSoundHandler:handler/);
 const scene=read('scene.js'),game=read('game.js');
 assert.match(scene,/setRobotShutdownSound:callback/);
 assert.match(game,/wireRobotShutdownAudio\(\)/);
 assert.match(game,/if\(!settings\.sound\)robotShutdownAudio\.stop\(\)/);
 for(const f of ['level2-test.js','niveau3.js','niveau4.js','ligne9.js']){
  const s=read(f);
  assert.match(s,/getContext:\(\)=>enableAudio&&audioCtx\?\.state==='running'/);
  assert.match(s,/onSound:\(kind,source\)=>robotShutdownAudio\.play\(kind,source\)/);
 }
 const html=read('enemy-destruction-lab.html'),lab=read('enemy-destruction-lab.js');
 assert.match(html,/id="sound"/);
 assert.match(lab,/unlockLabAudio\(\)/);
 assert.match(lab,/shutdownAudio\.play\(kind,source\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createAICompanion} from '../dist/ai-companions.js';
import {ArenaGame} from '../dist/game-logic.js';
import {createGabCommunication,GAB1_MOODS,gabMoodForEvent} from '../dist/companion-communication.js';

const canvasStub=()=>({
 width:512,height:384,
 getContext(){const ctx={
  createLinearGradient(){return {addColorStop(){}};},
  ...Object.fromEntries(['clearRect','save','restore','scale','beginPath','roundRect','stroke','fill','moveTo','lineTo','quadraticCurveTo','ellipse','fillText'].map(k=>[k,()=>{}]))
 };return ctx;}
});
test('Gabrielle hologram: optics alone when idle, appears only while communicating and retracts',()=>{
 const prior=globalThis.document;globalThis.document={createElement:(tag)=>{assert.equal(tag,'canvas');return canvasStub();}};
 try{
  const parent=new T.Group(),actor=createGabCommunication(T,parent);
  assert.equal(parent.getObjectByName('GAB-1 / optique vers projection').visible,false);
  assert.equal(actor.snapshot().hasScreen,true);
  for(let i=0;i<40;i++)actor.update(1/60);
  assert.equal(actor.snapshot().visible,false);
  actor.say('danger',{sound:false});for(let i=0;i<15;i++)actor.update(1/60);
  assert.equal(actor.snapshot().mood,'danger');assert.equal(actor.snapshot().speaking,true);
  assert.ok(actor.snapshot().projection>.5);
  assert.ok(actor.snapshot().visible);
  actor.stop();for(let i=0;i<65;i++)actor.update(1/60);
  assert.equal(actor.snapshot().visible,false);
  assert.equal(actor.snapshot().projection,0);
  assert.equal(parent.children.length,3,'all three hologram elements remain owned until disposal');
  actor.dispose();assert.equal(parent.children.length,0);
 }finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
test('GAB-1 moods map danger, healing, ward and successes to distinct faces',()=>{
 assert.equal(gabMoodForEvent({type:'danger'}),'danger');
 assert.equal(gabMoodForEvent({kind:'mend'}),'soin');
 assert.equal(gabMoodForEvent({kind:'ward'}),'soin');
 assert.equal(gabMoodForEvent({kind:'phase'}),'joie');
 assert.equal(gabMoodForEvent({kind:'threat'}),'danger');
 assert.equal(gabMoodForEvent({kind:'unknown'}),'message');
 for(const [mood,d] of Object.entries(GAB1_MOODS)){assert.ok(d.duration>0);assert.ok(d.notes.length>=6,mood);}
});
test('Gab-1 true companion reacts to skills, Cara remains without a pink speech screen',()=>{
 const scene=new T.Scene(),gaby=createAICompanion(T,scene,'ghju'),cara=createAICompanion(T,scene,'lylu');
 assert.equal(gaby.snapshot().communication?.speaking,false);
 assert.equal(cara.snapshot().communication,null);
 gaby.react({name:'Gaby',type:'companion-assist',kind:'mend',sound:false});
 assert.equal(gaby.snapshot().communication.mood,'soin');assert.equal(gaby.snapshot().communication.speaking,true);
 for(let i=0;i<12;i++)gaby.preview(1/60);
 assert.ok(gaby.snapshot().communication.projection>.5);
 gaby.stopSpeaking();for(let i=0;i<60;i++)gaby.preview(1/60);
 assert.equal(gaby.snapshot().communication.projection,0);
 assert.equal(gaby.say('danger',{sound:false}),true);
 gaby.reset();assert.equal(gaby.snapshot().communication.speaking,false);
 gaby.dispose();cara.dispose();assert.equal(scene.children.length,0);
});

test('Gaby issues an automatic warning when an engaged enemy is visibly close, even at full HP',()=>{
 const world=new T.Scene(),actor=createAICompanion(T,world,'ghju'),game=new ArenaGame([]);
 game.enemies=[{id:111,hp:100,x:game.player.x,z:game.player.z-6,elevation:0,aimHeight:1.25,awareness:'engaged'}];
 actor.update(1/60,{game,assistance:false,torchEnabled:false,sound:false});
 assert.equal(actor.snapshot().communication.mood,'danger');
 assert.equal(actor.snapshot().communication.speaking,true);
 actor.dispose();
});

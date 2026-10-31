import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createAICompanion} from '../dist/ai-companions.js';
import {ArenaGame} from '../dist/game-logic.js';
import {createGabCommunication,GAB1_MOODS,CAR14_MOODS,gabMoodForEvent,carMoodForEvent,companionMoodForEvent} from '../dist/companion-communication.js';

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
test('GAB-1 and CAR-14 expose independent emotion projections, not a shared face',()=>{
 const scene=new T.Scene(),gaby=createAICompanion(T,scene,'ghju'),cara=createAICompanion(T,scene,'lylu');
 assert.equal(gaby.snapshot().communication?.speaking,false);
 assert.equal(cara.snapshot().communication?.identity,'CAR-14');
 assert.equal(cara.snapshot().communication?.speaking,false);
 gaby.react({name:'Gaby',type:'companion-assist',kind:'mend',sound:false});
 assert.equal(gaby.snapshot().communication.mood,'soin');assert.equal(gaby.snapshot().communication.speaking,true);
 for(let i=0;i<12;i++)gaby.preview(1/60);
 assert.ok(gaby.snapshot().communication.projection>.5);
 gaby.stopSpeaking();for(let i=0;i<60;i++)gaby.preview(1/60);
 assert.equal(gaby.snapshot().communication.projection,0);
 assert.equal(gaby.say('danger',{sound:false}),true);
 gaby.reset();assert.equal(gaby.snapshot().communication.speaking,false);
 cara.react({name:'Cara',type:'companion-assist',kind:'mark',sound:false});
 assert.equal(cara.snapshot().communication.mood,'cible');
 assert.equal(cara.snapshot().communication.speaking,true);
 cara.dispose();gaby.dispose();assert.equal(scene.children.length,0);
});

test('Gaby issues an automatic warning when an engaged enemy is visibly close, even at full HP',()=>{
 const world=new T.Scene(),actor=createAICompanion(T,world,'ghju'),game=new ArenaGame([]);
 game.enemies=[{id:111,hp:100,x:game.player.x,z:game.player.z-6,elevation:0,aimHeight:1.25,awareness:'engaged'}];
 actor.update(1/60,{game,assistance:false,torchEnabled:false,sound:false});
 assert.equal(actor.snapshot().communication.mood,'danger');
 assert.equal(actor.snapshot().communication.speaking,true);
 actor.dispose();
});

test('optical display faces the camera without rotating the combat drone itself',()=>{
 const prior=globalThis.document;globalThis.document={createElement:()=>canvasStub()};
 try{
  const scene=new T.Scene(),root=new T.Group(),camera=new T.PerspectiveCamera();scene.add(root,camera);
  root.position.set(3,1,2);root.rotation.y=1.12;camera.position.set(4,2,5);
  scene.updateMatrixWorld(true);
  const gaze=root.quaternion.clone(),actor=createGabCommunication(T,root);
  actor.say('soin',{sound:false});actor.update(.05,{camera});
  const hologram=root.getObjectByName('GAB-1 / optique vers projection');
  const localNormal=new T.Vector3(0,0,1).applyQuaternion(hologram.quaternion).applyQuaternion(root.quaternion);
  const expected=camera.position.clone().sub(root.position).normalize();
  assert.ok(localNormal.dot(expected)>.99,'screen must be readable to the player while the drone keeps fighting');
  assert.ok(root.quaternion.angleTo(gaze)<1e-8,'screen rotation must not interfere with cannon targeting');
  actor.dispose();
 }finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('CAR-14 has a blue optical hologram hidden in combat and speaks with independent combat moods',()=>{
 const prior=globalThis.document;globalThis.document={createElement:()=>canvasStub()};
 try{
  const scene=new T.Scene(),gabyRoot=new T.Group(),caraRoot=new T.Group();scene.add(gabyRoot,caraRoot);
  const gab=createGabCommunication(T,gabyRoot),car=createGabCommunication(T,caraRoot,{defensive:false});
  assert.equal(car.snapshot().identity,'CAR-14');
  assert.equal(car.snapshot().visible,false);
  assert.equal(gab.snapshot().identity,'GAB-1');
  assert.ok(caraRoot.getObjectByName('CAR-14 / optique vers projection'));
  assert.ok(!caraRoot.getObjectByName('GAB-1 / optique vers projection'));
  const caraBeam=caraRoot.children.find(m=>m.isMesh&&m.geometry.type==='CylinderGeometry');
  const gabBeam=gabyRoot.children.find(m=>m.isMesh&&m.geometry.type==='CylinderGeometry');
  assert.equal(caraBeam.material.color.getHex(),0x57baff);
  assert.equal(gabBeam.material.color.getHex(),0xff86d2);
  car.say('attaque',{sound:false});for(let i=0;i<20;i++)car.update(1/60);
  assert.equal(car.snapshot().mood,'attaque');assert.equal(car.snapshot().speaking,true);
  assert.ok(car.snapshot().projection>.7);
  assert.ok(car.snapshot().visible);
  assert.equal(gab.snapshot().visible,false,'pink face must remain hidden when only blue sphere speaks');
  car.stop();for(let i=0;i<65;i++)car.update(1/60);
  assert.equal(car.snapshot().visible,false);
  assert.equal(car.snapshot().projection,0);
  car.dispose();gab.dispose();
 }finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
test('CAR-14 reacts offensively to the actual companion skills',()=>{
 assert.equal(carMoodForEvent({kind:'mark'}),'cible');
 assert.equal(carMoodForEvent({kind:'amplify'}),'renfort');
 assert.equal(carMoodForEvent({kind:'phase'}),'attaque');
 assert.equal(carMoodForEvent({type:'danger'}),'danger');
 assert.equal(carMoodForEvent({type:'victory'}),'joie');
 assert.equal(companionMoodForEvent({kind:'mark'},false),'cible');
 assert.equal(companionMoodForEvent({kind:'mend'},true),'soin');
 assert.notEqual(CAR14_MOODS.danger.color,GAB1_MOODS.danger.color);
 assert.notEqual(CAR14_MOODS.message.base,GAB1_MOODS.message.base);
 for(const mood of Object.keys(CAR14_MOODS)){
  assert.ok(CAR14_MOODS[mood].duration>0);
  assert.ok(CAR14_MOODS[mood].notes.length>=6);
 }
 const scene=new T.Scene(),cara=createAICompanion(T,scene,'lylu');
 for(const [kind,expected] of [['mark','cible'],['amplify','renfort'],['phase','attaque']]){
  cara.react({name:'Cara',type:'companion-assist',kind,sound:false});
  assert.equal(cara.snapshot().communication.mood,expected);
 }
 cara.dispose();
});

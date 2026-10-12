import test from 'node:test';
import assert from 'node:assert/strict';
import { LASER_PROFILES, playLaserShot, playWeaponAction, setWeaponCharge, setLaserAudioEnabled, disposeLaserAudio } from '../dist/laser-sound.js';
import { audioMock as trackedAudioMock } from './audio-mock.mjs';

function audioMock(){
  const calls={oscillators:0,noiseSources:0,compressors:0};
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({connect(){},disconnect(){},onended:null});
  const ctx={state:'running',sampleRate:48000,currentTime:0,destination:node(),
    createOscillator(){calls.oscillators++;return{...node(),frequency:param(),start(){},stop(){},type:''};},
    createGain(){return{...node(),gain:param()};},
    createBiquadFilter(){return{...node(),frequency:param(),Q:param(),type:''};},
    createDynamicsCompressor(){calls.compressors++;return{...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};},
    createBuffer(ch,n){return{getChannelData(){return new Float32Array(n);}};},
    createBufferSource(){calls.noiseSources++;return{...node(),start(){},stop(){},buffer:null};}
  };
  return{ctx,calls};
}

test('five weapons have separate cinematic plasma envelopes and multilayer synthesis',()=>{
  assert.deepEqual(Object.keys(LASER_PROFILES),['r9','bloom','petal','thorn','nova']);
  assert.equal(LASER_PROFILES.nova.duration>LASER_PROFILES.r9.duration,true);
  assert.equal(playLaserShot(null),false);
  for(const id of Object.keys(LASER_PROFILES)){
    const {ctx,calls}=audioMock();
    assert.equal(playLaserShot(ctx,id,.75),true,id);
    assert.ok(calls.oscillators>=4,id+' must have oscillators');
    assert.equal(calls.noiseSources,1,id+' must have an attack noise layer');
    assert.equal(calls.compressors,1,id+' must avoid clipping');
  }
});

test('charge follows the trigger with one voice, then stops on firing, mute, or a disconnected controller',()=>{
  const {ctx,nodes,calls}=trackedAudioMock();
  assert.equal(setWeaponCharge(ctx,'thorn',0,false),false);
  assert.equal(nodes.length,0,'an idle trigger allocates no audio graph');
  setWeaponCharge(ctx,'thorn',.1,true);
  const starts=calls.starts,charge=nodes.find(n=>n.kind==='oscillator');
  for(let frame=0;frame<90;frame++){ctx.tick(1/90);setWeaponCharge(ctx,'thorn',frame/90,true);}
  assert.equal(calls.starts,starts,'XR charge updates reuse one oscillator');
  assert.ok(charge.frequency.automation.length<17,'charge pitch changes at a control rate, not every XR frame');
  assert.ok(charge.frequency.value>126);
  playLaserShot(ctx,'thorn');ctx.tick(.2);assert.equal(charge.disconnected,true,'firing releases the charge voice');
  setWeaponCharge(ctx,'nova',.5,true);
  const nova=nodes.filter(n=>n.kind==='oscillator').at(-1);
  setLaserAudioEnabled(ctx,false);assert.equal(nova.disconnected,true,'mute stops the live capacitor');
  assert.equal(setWeaponCharge(ctx,'nova',.9,true),false);
  setLaserAudioEnabled(ctx,true);setWeaponCharge(ctx,'nova',.3,true);
  const orphan=nodes.filter(n=>n.kind==='oscillator').at(-1);
  ctx.tick(2);assert.equal(orphan.disconnected,true,'controller loss cannot leave a sustained charge behind');
  disposeLaserAudio(ctx);assert.ok(nodes.every(n=>n.disconnected));
});

test('all five weapons have distinct reload stages and empty feedback without repeated frame scheduling',()=>{
  const {ctx,nodes,calls}=trackedAudioMock();
  for(const weapon of Object.keys(LASER_PROFILES)){
    for(const action of ['empty','reload-out','reload-in','reload-ready']){
      assert.equal(playWeaponAction(ctx,weapon,action),true,weapon+':'+action);
      const starts=calls.starts;
      assert.equal(playWeaponAction(ctx,weapon,action),false,'identical stage is debounced');
      assert.equal(calls.starts,starts);
      ctx.tick(.4);
    }
  }
  const starts=calls.starts;
  assert.equal(playWeaponAction(ctx,'r9','unknown'),false);
  ctx.state='suspended';assert.equal(playWeaponAction(ctx,'r9','empty'),false);
  assert.equal(calls.starts,starts);ctx.state='running';
  assert.equal(nodes.filter(n=>!n.disconnected).length,7,'finished mechanics retain only the shared reflection bus');
  disposeLaserAudio(ctx);assert.ok(nodes.every(n=>n.disconnected));
});

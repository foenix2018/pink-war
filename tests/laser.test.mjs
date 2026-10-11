import test from 'node:test';
import assert from 'node:assert/strict';
import { LASER_PROFILES, playLaserShot } from '../dist/laser-sound.js';

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

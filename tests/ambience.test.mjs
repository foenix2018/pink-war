import test from 'node:test';
import assert from 'node:assert/strict';
import {createAmbience} from '../dist/ambience.js';
import {playLaserShot,playLaserImpact,setLaserAudioEnabled,disposeLaserAudio} from '../dist/laser-sound.js';

function audioMock(){
  const nodes=[],scheduled=[],calls={starts:0,stops:0,delays:0,buffers:0};
  const param=(value=0)=>({value,targets:[],cancelScheduledValues(){},
    setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},
    exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;this.targets.push(v);}});
  const node=(kind)=>{const n={kind,connections:[],disconnected:false,connect(to){this.connections.push(to);},disconnect(){this.disconnected=true;},
    start(){calls.starts++;},stop(time=ctx.currentTime){calls.stops++;scheduled.push({source:this,time});}};nodes.push(n);return n;};
  const ctx={state:'running',sampleRate:8000,currentTime:0,destination:{},
    createGain(){return Object.assign(node('gain'),{gain:param()});},
    createOscillator(){return Object.assign(node('oscillator'),{frequency:param()});},
    createBufferSource(){return Object.assign(node('buffer'),{playbackRate:param(1)});},
    createBuffer(ch,n){calls.buffers++;return {getChannelData(){return new Float32Array(n);}};},
    createBiquadFilter(){return Object.assign(node('filter'),{frequency:param(),Q:param()});},
    createStereoPanner(){return Object.assign(node('pan'),{pan:param()});},
    createDelay(){calls.delays++;return Object.assign(node('delay'),{delayTime:param()});},
    createDynamicsCompressor(){return Object.assign(node('compressor'),{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()});},
    tick(dt){this.currentTime+=dt;for(let i=scheduled.length-1;i>=0;i--){if(scheduled[i].time<=this.currentTime){const [{source}]=scheduled.splice(i,1);source.onended?.();}}}
  };
  return {ctx,nodes,calls};
}

test('ambience waits for unlocked audio, reuses persistent sources and respects mute/pause/dispose',()=>{
  const {ctx,nodes,calls}=audioMock();ctx.state='suspended';
  const ambience=createAmbience(ctx);
  assert.equal(nodes.length,0,'construction cannot autoplay');
  ambience.update(.05,{active:true,position:{x:0,z:0}});assert.equal(calls.starts,0);
  ctx.state='running';ambience.update(.05,{active:true,position:{x:0,z:0}});
  assert.equal(ambience.playing,true);assert.equal(calls.starts,3);
  const count=nodes.length;
  for(let i=0;i<120;i++){ctx.tick(1/90);ambience.update(1/90,{active:true,position:{x:0,z:0}});}
  assert.equal(nodes.length,count,'continuous sound cannot allocate on every XR frame');
  assert.equal(calls.buffers,1,'the continuous bed keeps a single cached noise buffer');
  ambience.setEnabled(false);assert.equal(ambience.playing,false);assert.equal(nodes[0].gain.value,0);
  const targets=nodes[0].gain.targets.length;
  for(let i=0;i<30;i++)ambience.update(.016,{active:true});
  assert.equal(nodes[0].gain.targets.length,targets,'muted frames do not reschedule automation');
  ambience.setEnabled(true);ambience.update(.016,{active:true});assert.equal(ambience.playing,true);
  ambience.pause();assert.equal(ambience.playing,false);assert.equal(nodes[0].gain.value,0);
  ambience.update(.016,{active:true});assert.equal(calls.starts,3,'resume reuses the bed');
  ambience.dispose();assert.equal(ambience.playing,false);assert.equal(ambience.stats.persistentSources,0);
  assert.ok(nodes.every(n=>n.disconnected));
  ambience.update(.05,{active:true});assert.equal(calls.starts,3);
});

test('footsteps follow traveled distance, not joystick intent; jumping and lifts suppress them',()=>{
  const {ctx,nodes}=audioMock(),ambience=createAmbience(ctx);
  let x=0;
  const move=(options={})=>{ctx.tick(.05);ambience.update(.05,{active:true,position:{x,z:0},moving:true,...options});};
  for(let i=0;i<30;i++)move();
  assert.equal(ambience.stats.steps,0,'pushing against a wall is silent');
  for(let i=0;i<18;i++){x+=.35;move();}
  assert.ok(ambience.stats.steps>=3);
  assert.ok(nodes.some(n=>n.kind==='filter'&&n.type==='lowpass'&&n.frequency.value===950),'ground uses damp rubble steps');
  const before=ambience.stats.steps;
  for(let i=0;i<20;i++){x+=.35;move({grounded:false});}
  for(let i=0;i<20;i++){x+=.35;move({onLift:true,elevation:4});}
  assert.equal(ambience.stats.steps,before);
  for(let i=0;i<12;i++){x+=.35;move({elevation:6});}
  assert.ok(nodes.some(n=>n.kind==='filter'&&n.frequency.value===2800),'catwalks use metallic resonance');
  const preTeleport=ambience.stats.steps;x+=80;move();assert.equal(ambience.stats.steps,preTeleport);
  ambience.dispose();
});

test('a nearby probe engages the exact RLH four-motor synthesis without new sources per frame',()=>{
  const {ctx,nodes,calls}=audioMock(),ambience=createAmbience(ctx);
  ambience.update(.05,{active:true,position:{x:0,z:0}});const count=nodes.length,starts=calls.starts;
  for(let i=0;i<10;i++){ctx.tick(.1);ambience.update(.1,{active:true,position:{x:0,z:0},probes:[{form:'probe',x:3,z:-3,elevation:2.7,motionX:3.6}]});}
  const motors=nodes.filter(n=>n.kind==='oscillator'&&n.type==='sawtooth');
  assert.equal(motors.length,4,'RLH Rescue 01 uses four sawtooth electric motors');
  assert.ok(motors.some(n=>n.frequency.value>158),'actual drone speed changes motor pitch');
  assert.equal(nodes.length,count+14,'four RLH motors share one gain and one stereo bus');
  assert.equal(calls.starts,starts+4,'the motor bank is started only once');
  assert.equal(ambience.stats.drone.motors,4);
  for(let i=0;i<10;i++){ctx.tick(.1);ambience.update(.1,{active:true,position:{x:0,z:0},probes:[]});}
  assert.equal(nodes.length,count+14);
  assert.ok(nodes.some(n=>n.kind==='oscillator'&&n.frequency.value>56&&n.frequency.value<58),'low environmental machinery hum remains');
  ambience.dispose();
  assert.ok(nodes.every(n=>n.disconnected),'all RLH motor nodes are released');
});

test('environment event sources finish, context suspension schedules no creaks',()=>{
  const {ctx,calls}=audioMock(),ambience=createAmbience(ctx,{installations:[{x:0,z:0}]});
  for(let i=0;i<180;i++){ctx.tick(.1);ambience.update(.1,{active:true,position:{x:0,z:0},onLift:true});}
  assert.equal(ambience.stats.creaks,1);assert.equal(ambience.stats.voices,0);
  ctx.state='suspended';const starts=calls.starts;
  for(let i=0;i<400;i++)ambience.update(.1,{active:true});
  assert.equal(calls.starts,starts);assert.equal(ambience.playing,false);
  ambience.dispose();
});

test('laser reflection network is shared; impact material/distance and immediate mute affect sounds',()=>{
  const {ctx,nodes,calls}=audioMock();
  assert.equal(playLaserShot(ctx,'r9'),true);assert.equal(calls.delays,2);
  ctx.tick(.1);assert.equal(playLaserShot(ctx,'bloom'),true);assert.equal(calls.delays,2);
  assert.equal(playLaserImpact(ctx,{surface:'robot',distance:4}),true);
  assert.ok(nodes.some(n=>n.kind==='filter'&&n.type==='bandpass'&&n.Q.value===1.3));
  assert.equal(playLaserImpact(ctx,{surface:'robot',distance:4}),false,'simultaneous impacts are bounded');
  ctx.tick(.1);assert.equal(playLaserImpact(ctx,{distance:1000}),false,'inaudible far impacts create no voices');
  assert.equal(playLaserImpact(ctx,{surface:'concrete',splash:4,distance:10}),true);
  setLaserAudioEnabled(ctx,false);assert.equal(nodes[0].gain.value,0);
  assert.equal(playLaserShot(ctx,'nova'),false);assert.equal(playLaserImpact(ctx),false);
  setLaserAudioEnabled(ctx,true);assert.equal(playLaserShot(ctx,'lance'),true);
  assert.equal(calls.buffers,1,'shots and impacts share one cached noise sample');
  ctx.tick(3);
  assert.equal(nodes.filter(n=>!n.disconnected).length,7,'finished shots retain only the shared reflection network');
  disposeLaserAudio(ctx);assert.ok(nodes.every(n=>n.disconnected),'disposal disconnects the shared network as well');
});

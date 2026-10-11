// Pink War — procedural sci-fi laser design. No external recordings or network requests.
// Layered filtered plasma transient, pitched coil discharge and restrained low-frequency tail.
// Audio nodes are created only on an actual shot; a single 0.18s noise sample is cached per context.
export const LASER_PROFILES=Object.freeze({
  r9:Object.freeze({pitch:970,end:205,duration:.115,body:260,thump:130,noise:.21,volume:.105,decay:.14}),
  bloom:Object.freeze({pitch:740,end:162,duration:.092,body:155,thump:96,noise:.28,volume:.10,decay:.115}),
  petal:Object.freeze({pitch:1450,end:315,duration:.24,body:410,thump:165,noise:.36,volume:.094,decay:.28}),
  thorn:Object.freeze({pitch:1220,end:110,duration:.31,body:155,thump:55,noise:.42,volume:.112,decay:.34}),
  nova:Object.freeze({pitch:930,end:62,duration:.51,body:100,thump:37,noise:.53,volume:.122,decay:.56})
});

// Real CC0 WAV by teckpow, OpenGameArt (dist/audio/laser-shooting-cc0.wav).
// Synthesized layers remain as fallbacks and provide distinct weapon signatures.
const liveSamples=new WeakMap(),decodedSamples=new WeakMap();
// A shared, quiet pair of early reflections suggests the surrounding ruined city.
// No feedback loop: rapid fire cannot accumulate into an increasingly loud reverb tail.
const spaces=new WeakMap();
function spaceFor(ctx){
  if(spaces.has(ctx))return spaces.get(ctx);
  const master=ctx.createGain();master.gain.value=1;master.connect(ctx.destination);
  const state={master,enabled:true,nodes:[master],reflections:null,impactTime:-1,impactVoices:0};
  if(ctx.createDelay){
    const send=ctx.createGain(),filter=ctx.createBiquadFilter();send.gain.value=1;
    filter.type='lowpass';filter.frequency.value=1850;filter.Q.value=.35;send.connect(filter);
    for(const [seconds,volume] of [[.083,.10],[.173,.052]]){
      const delay=ctx.createDelay(.3),gain=ctx.createGain();delay.delayTime.value=seconds;gain.gain.value=volume;
      filter.connect(delay);delay.connect(gain);gain.connect(master);state.nodes.push(delay,gain);
    }
    state.nodes.push(send,filter);state.reflections=send;
  }
  spaces.set(ctx,state);return state;
}
export function setLaserAudioEnabled(ctx,enabled){
  if(!ctx)return;
  const state=spaceFor(ctx),time=ctx.currentTime;state.enabled=!!enabled;
  state.master.gain.cancelScheduledValues(time);
  state.master.gain.setValueAtTime(state.master.gain.value,time);
  state.master.gain.linearRampToValueAtTime(enabled?1:0,time+.02);
}
export function disposeLaserAudio(ctx){
  const state=spaces.get(ctx);if(!state)return;
  for(const node of state.nodes)node.disconnect();spaces.delete(ctx);
}
export const REAL_LASER_SAMPLE='audio/laser-shooting-cc0.wav';
export async function loadRealLaserSample(ctx,load=globalThis.fetch){
 if(!ctx||!load)return false;
 let item=liveSamples.get(ctx);
 if(item)return item.then(()=>true).catch(()=>false);
 item=Promise.resolve().then(()=>load(REAL_LASER_SAMPLE))
  .then(r=>{if(!r.ok)throw Error('Laser sample missing');return r.arrayBuffer();})
  .then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{decodedSamples.set(ctx,buffer);liveSamples.set(ctx,Promise.resolve(buffer));return buffer;})
  .catch(error=>{liveSamples.delete(ctx);throw error;});
 liveSamples.set(ctx,item);
 return item.then(()=>true).catch(()=>false);
}

const noiseCache=new WeakMap();
function noiseBuffer(ctx){
  if(noiseCache.has(ctx))return noiseCache.get(ctx);
  const count=Math.ceil(ctx.sampleRate*.18),buffer=ctx.createBuffer(1,count,ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=21339;
  for(let i=0;i<count;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const envelope=Math.pow(1-i/count,1.45);
    data[i]=((seed/4294967296)*2-1)*envelope;
  }
  noiseCache.set(ctx,buffer);return buffer;
}
const env=(gain,time,peak,duration)=>{
  gain.gain.cancelScheduledValues(time);
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.linearRampToValueAtTime(peak,time+.003);
  gain.gain.exponentialRampToValueAtTime(.0001,time+Math.max(.012,duration));
};
function oscillator(ctx,output,time,wave,start,end,length,amp){
  const osc=ctx.createOscillator(),v=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(Math.max(30,start),time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),time+length);
  env(v,time,amp,length);
  osc.connect(v);v.connect(output);osc.start(time);osc.stop(time+length+.015);
  osc.onended=()=>{osc.disconnect();v.disconnect();};
}
export function playLaserShot(ctx,weapon='r9',power=1){
  if(!ctx||ctx.state!=='running')return false;
  const space=spaceFor(ctx);if(!space.enabled)return false;
  const p=LASER_PROFILES[weapon]||LASER_PROFILES.r9;
  // The downloaded CC0 sample is played immediately, not deferred to a promise after the shot.
  const real=decodedSamples.get(ctx);
  if(real){
    const sample=ctx.createBufferSource(),gain=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
    sample.buffer=real;
    const rates={r9:1.12,bloom:.92,petal:1.24,thorn:.74,nova:.56};
    sample.playbackRate.value=(rates[weapon]||1)*(1+.015*Math.sin(ctx.currentTime*97));
    const peak={r9:.16,bloom:.115,petal:.17,thorn:.20,nova:.23}[weapon]||.16;
    gain.gain.value=peak*Math.max(.3,Math.min(1,Number(power)||1));
    compressor.threshold.value=-13;compressor.ratio.value=2.7;
    sample.connect(gain);gain.connect(compressor);compressor.connect(space.master);
    if(space.reflections)compressor.connect(space.reflections);
    sample.start(ctx.currentTime);
    sample.onended=()=>{sample.disconnect();gain.disconnect();compressor.disconnect();};
  }
  const strength=Math.max(.25,Math.min(1,Number(power)||1));
  const t=ctx.currentTime+.003;
  const output=ctx.createGain(),filter=ctx.createBiquadFilter(),compress=ctx.createDynamicsCompressor();
  output.gain.value=.65;
  filter.type='lowpass';filter.frequency.setValueAtTime(9000,t);
  filter.frequency.exponentialRampToValueAtTime(1350,t+p.decay);
  compress.threshold.value=-18;compress.knee.value=12;compress.ratio.value=3;
  compress.attack.value=.003;compress.release.value=.09;
  output.connect(filter);filter.connect(compress);compress.connect(space.master);
  if(space.reflections)compress.connect(space.reflections);
  const stop=t+Math.max(p.duration,p.decay)+.06;
  const tail=ctx.createGain();
  tail.gain.setValueAtTime(1,t);tail.gain.setValueAtTime(1,t+p.duration*.55);
  tail.gain.exponentialRampToValueAtTime(.0001,stop);
  tail.connect(output);
  const detune=1+Math.sin(t*4217)*.009;
  oscillator(ctx,tail,t,'sawtooth',p.pitch*detune,p.end,p.duration,p.volume*strength*.63);
  oscillator(ctx,tail,t+.008,'sine',p.body*2.35,p.body*.83,p.duration*.83,p.volume*strength*.9);
  oscillator(ctx,tail,t,'triangle',p.thump*2.8,p.thump,p.duration*.72,p.volume*strength*.86);
  // A short, physical recoil pulse under the upper-frequency laser discharge.
  oscillator(ctx,tail,t,'sine',160,48,Math.min(.145,p.duration*.75),p.volume*strength*.84);
  if(weapon==='petal'||weapon==='nova')oscillator(ctx,tail,t+.018,'sine',p.pitch*.64,p.end*.58,p.decay*.8,p.volume*strength*.34);
  const noise=ctx.createBufferSource(),band=ctx.createBiquadFilter(),ng=ctx.createGain();
  noise.buffer=noiseBuffer(ctx);
  band.type='bandpass';band.Q.value=1.25;
  band.frequency.setValueAtTime(3800,t);band.frequency.exponentialRampToValueAtTime(Math.max(500,p.pitch),t+p.duration);
  env(ng,t,p.volume*p.noise*strength,p.duration*.9);
  noise.connect(band);band.connect(ng);ng.connect(tail);
  noise.start(t);noise.stop(t+Math.min(.18,p.duration+.015));
  noise.onended=()=>{noise.disconnect();band.disconnect();ng.disconnect();};
  // A quiet 'capacitor' click gives the start of each shot definition in a busy battle mix.
  oscillator(ctx,tail,t,'square',4700,850,.018,p.volume*.24);
  // End-of-voice cleanup happens on the longest oscillator, without timers.
  const cleanup=ctx.createOscillator();cleanup.frequency.value=20;const silent=ctx.createGain();silent.gain.value=0;
  cleanup.connect(silent);silent.connect(output);cleanup.start(stop);cleanup.stop(stop+.01);
  cleanup.onended=()=>{cleanup.disconnect();silent.disconnect();tail.disconnect();output.disconnect();filter.disconnect();compress.disconnect();};
  return true;
}

// Contact sound follows the material hit, at the actual impact distance. Robots spark,
// masonry breaks up into a short dusty crack; a charged splash gets a deeper pressure tail.
export function playLaserImpact(ctx,{surface='concrete',distance=0,power=1,splash=0,pan=0}={}){
  if(!ctx||ctx.state!=='running')return false;
  const space=spaceFor(ctx),now=ctx.currentTime;
  if(!space.enabled||space.impactVoices>=10||now-space.impactTime<.038)return false;
  const attenuation=1/(1+Math.max(0,Number(distance)||0)*.095);
  if(attenuation<.095)return false;
  space.impactTime=now;space.impactVoices++;
  const metal=surface==='metal'||surface==='robot',explosive=splash>0;
  const strength=Math.max(.25,Math.min(1,Number(power)||1))*attenuation;
  const duration=explosive?.46:metal?.2:.15,t=now+.002;
  const bus=ctx.createGain();bus.gain.value=.68;bus.connect(space.master);
  if(space.reflections)bus.connect(space.reflections);
  const panner=ctx.createStereoPanner?.();
  if(panner){panner.pan.value=Math.max(-.8,Math.min(.8,Number(pan)||0));panner.connect(bus);}
  const output=panner||bus,noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  noise.buffer=noiseBuffer(ctx);filter.type=metal?'bandpass':'lowpass';filter.Q.value=metal?1.3:.65;
  filter.frequency.setValueAtTime(metal?3100:1700,t);
  filter.frequency.exponentialRampToValueAtTime(metal?800:320,t+duration);
  env(gain,t,(metal?.12:.09)*strength,Math.min(.17,duration));
  noise.connect(filter);filter.connect(gain);gain.connect(output);noise.start(t);noise.stop(t+.18);
  noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
  oscillator(ctx,output,t,'sine',explosive?105:metal?520:145,explosive?38:metal?210:65,duration,.075*strength);
  if(metal)oscillator(ctx,output,t+.006,'triangle',1900,720,.105,.017*strength);
  const cleanup=ctx.createOscillator(),silent=ctx.createGain();silent.gain.value=0;cleanup.connect(silent);silent.connect(bus);
  cleanup.start(t+duration+.03);cleanup.stop(t+duration+.04);
  cleanup.onended=()=>{space.impactVoices--;cleanup.disconnect();silent.disconnect();panner?.disconnect();bus.disconnect();};
  return true;
}

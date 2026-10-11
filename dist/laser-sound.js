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
const liveSamples=new WeakMap();
export const REAL_LASER_SAMPLE='audio/laser-shooting-cc0.wav';
export async function loadRealLaserSample(ctx,load=globalThis.fetch){
 if(!ctx||!load)return false;
 let item=liveSamples.get(ctx);
 if(item)return item.then(()=>true).catch(()=>false);
 item=Promise.resolve().then(()=>load(REAL_LASER_SAMPLE))
  .then(r=>{if(!r.ok)throw Error('Laser sample missing');return r.arrayBuffer();})
  .then(bytes=>ctx.decodeAudioData(bytes)).then(buffer=>{liveSamples.set(ctx,Promise.resolve(buffer));return buffer;})
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
  const p=LASER_PROFILES[weapon]||LASER_PROFILES.r9;
  const samplePromise=liveSamples.get(ctx);
  if(samplePromise)samplePromise.then(buffer=>{
    if(ctx.state!=='running')return;
    const sample=ctx.createBufferSource(),gain=ctx.createGain();
    sample.buffer=buffer;
    const rates={r9:1,bloom:.85,petal:1.38,thorn:.65,nova:.5};
    sample.playbackRate.value=rates[weapon]||1;
    gain.gain.value=Math.min(.15,.068*power);
    sample.connect(gain);gain.connect(ctx.destination);
    sample.start();
    sample.onended=()=>{sample.disconnect();gain.disconnect();};
  }).catch(()=>{});
  const strength=Math.max(.25,Math.min(1,Number(power)||1));
  const t=ctx.currentTime+.003;
  const output=ctx.createGain(),filter=ctx.createBiquadFilter(),compress=ctx.createDynamicsCompressor();
  output.gain.value=.5;
  filter.type='lowpass';filter.frequency.setValueAtTime(9000,t);
  filter.frequency.exponentialRampToValueAtTime(1350,t+p.decay);
  compress.threshold.value=-18;compress.knee.value=12;compress.ratio.value=3;
  compress.attack.value=.003;compress.release.value=.09;
  output.connect(filter);filter.connect(compress);compress.connect(ctx.destination);
  const stop=t+Math.max(p.duration,p.decay)+.06;
  const tail=ctx.createGain();
  tail.gain.setValueAtTime(1,t);tail.gain.setValueAtTime(1,t+p.duration*.55);
  tail.gain.exponentialRampToValueAtTime(.0001,stop);
  tail.connect(output);
  const detune=1+Math.sin(t*4217)*.009;
  oscillator(ctx,tail,t,'sawtooth',p.pitch*detune,p.end,p.duration,p.volume*strength*.63);
  oscillator(ctx,tail,t+.008,'sine',p.body*2.35,p.body*.83,p.duration*.83,p.volume*strength*.9);
  oscillator(ctx,tail,t,'triangle',p.thump*2.8,p.thump,p.duration*.72,p.volume*strength*.7);
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
  oscillator(ctx,tail,t,'square',4700,850,.018,p.volume*.15);
  // End-of-voice cleanup happens on the longest oscillator, without timers.
  const cleanup=ctx.createOscillator();cleanup.frequency.value=20;const silent=ctx.createGain();silent.gain.value=0;
  cleanup.connect(silent);silent.connect(output);cleanup.start(stop);cleanup.stop(stop+.01);
  cleanup.onended=()=>{cleanup.disconnect();silent.disconnect();tail.disconnect();output.disconnect();filter.disconnect();compress.disconnect();};
  return true;
}

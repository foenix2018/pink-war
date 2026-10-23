// Pink War — local procedural weapon sound, with an optional bundled CC0 recording layer.
// Layered filtered plasma transient, pitched coil discharge and restrained low-frequency tail.
// Audio nodes are created only on an actual shot; a single 0.18s noise sample is cached per context.
export const LASER_PROFILES=Object.freeze({
  r9:Object.freeze({pitch:970,end:205,duration:.115,body:260,thump:130,noise:.25,volume:.14,decay:.14,mechanism:1850,weight:1}),
  bloom:Object.freeze({pitch:740,end:162,duration:.092,body:155,thump:96,noise:.33,volume:.115,decay:.115,mechanism:2240,weight:.85}),
  lance:Object.freeze({pitch:2600,end:680,duration:.19,body:860,thump:135,noise:.20,volume:.14,decay:.38,mechanism:1640,weight:1.45}),
  thorn:Object.freeze({pitch:1220,end:110,duration:.31,body:155,thump:55,noise:.42,volume:.155,decay:.34,mechanism:980,weight:1.55}),
  m12:Object.freeze({pitch:380,end:75,duration:.20,body:120,thump:48,noise:.78,volume:.17,decay:.32,mechanism:1150,weight:1.7}),
  nova:Object.freeze({pitch:930,end:62,duration:.51,body:100,thump:37,noise:.58,volume:.165,decay:.56,mechanism:640,weight:1.8})
});

// Five independent Kenney CC0 recordings; mono PCM WAV also decodes on iPhone.
// Synthesized layers retain mechanical transients, bass and an offline fallback.
const liveSamples=new WeakMap(),decodedSamples=new WeakMap();
// A shared, quiet pair of early reflections suggests the surrounding ruined city.
// No feedback loop: rapid fire cannot accumulate into an increasingly loud reverb tail.
const spaces=new WeakMap();
function spaceFor(ctx){
  if(spaces.has(ctx))return spaces.get(ctx);
  const master=ctx.createGain();master.gain.value=1;master.connect(ctx.destination);
  const state={master,enabled:true,nodes:[master],reflections:null,impactTime:-1,impactVoices:0,voices:new Set(),actionTimes:new Map(),charge:null};
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
  const state=spaceFor(ctx),time=ctx.currentTime,nextEnabled=!!enabled;
  if(state.enabled===nextEnabled)return;
  state.enabled=nextEnabled;
  if(!nextEnabled){
    stopCharge(state,time);
    // Re-enabling effects cannot revive a charge or the remainder of an old sample.
    for(const entry of [...state.voices]){try{entry.source.stop();}catch{}entry.cleanup();}
  }
  state.master.gain.cancelScheduledValues(time);
  state.master.gain.setValueAtTime(state.master.gain.value,time);
  state.master.gain.linearRampToValueAtTime(enabled?1:0,time+.02);
}
export function disposeLaserAudio(ctx){
  const state=spaces.get(ctx);if(!state)return;
  for(const entry of [...state.voices]){try{entry.source.stop();}catch{}entry.cleanup();}
  state.voices.clear();state.charge=null;
  for(const node of state.nodes)node.disconnect();spaces.delete(ctx);
}
export const LASER_SAMPLES=Object.freeze(Object.fromEntries(
  ['r9','bloom','lance','thorn','nova'].map(id=>[id,globalThis.__PINKWAR_AUDIO_SAMPLES?.[id]||`audio/kenney/${id}.wav`])
));
export const REAL_LASER_SAMPLE=LASER_SAMPLES.r9;
export async function loadRealLaserSample(ctx,load=globalThis.fetch){
 if(!ctx||!load)return false;
 let item=liveSamples.get(ctx);
 if(item)return item.then(()=>true).catch(()=>false);
 const buffers=decodedSamples.get(ctx)||new Map();decodedSamples.set(ctx,buffers);
 item=Promise.all(Object.entries(LASER_SAMPLES).map(async([id,url])=>{
   if(buffers.has(id))return true;
   const response=await load(url);if(!response.ok)throw Error('Laser sample missing: '+id);
   const buffer=await ctx.decodeAudioData(await response.arrayBuffer());buffers.set(id,buffer);return true;
 })).catch(error=>{liveSamples.delete(ctx);throw error;});
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
function remember(space,source,nodes,after=()=>{}){
  let cleaned=false;
  const entry={source,cleanup:()=>{if(cleaned)return;cleaned=true;space?.voices.delete(entry);for(const node of nodes)node.disconnect();after();}};
  space?.voices.add(entry);source.onended=entry.cleanup;return entry;
}
function oscillator(ctx,output,time,wave,start,end,length,amp,space){
  const osc=ctx.createOscillator(),v=ctx.createGain();
  osc.type=wave;osc.frequency.setValueAtTime(Math.max(30,start),time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30,end),time+length);
  env(v,time,amp,length);
  osc.connect(v);v.connect(output);osc.start(time);osc.stop(time+length+.015);
  remember(space,osc,[osc,v]);
}
export function playLaserShot(ctx,weapon='r9',power=1){
  if(!ctx||ctx.state!=='running')return false;
  const space=spaceFor(ctx);if(!space.enabled)return false;
  stopCharge(space,ctx.currentTime);
  const p=LASER_PROFILES[weapon]||LASER_PROFILES.r9;
  // The downloaded CC0 sample is played immediately, not deferred to a promise after the shot.
  const real=decodedSamples.get(ctx)?.get(weapon);
  if(real){
    const sample=ctx.createBufferSource(),gain=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
    sample.buffer=real;
    const rates={r9:1,bloom:1.08,lance:1.15,thorn:.9,nova:.8};
    sample.playbackRate.value=(rates[weapon]||1)*(1+.015*Math.sin(ctx.currentTime*97));
    const peak={r9:.32,bloom:.23,lance:.34,thorn:.37,nova:.4}[weapon]||.3;
    gain.gain.value=peak*Math.max(.3,Math.min(1,Number(power)||1));
    compressor.threshold.value=-13;compressor.ratio.value=2.7;
    sample.connect(gain);gain.connect(compressor);compressor.connect(space.master);
    if(space.reflections)compressor.connect(space.reflections);
    const duration=real.duration/sample.playbackRate.value;
    const playLength=Math.min(duration,weapon==='bloom'?.12:weapon==='r9'?.27:.8);
    gain.gain.setValueAtTime(gain.gain.value,ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value,ctx.currentTime+Math.max(.005,playLength-(weapon==='bloom'?.025:.06)));
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+playLength);
    sample.start(ctx.currentTime);sample.stop(ctx.currentTime+playLength+.005);
    remember(space,sample,[sample,gain,compressor]);
  }
  const strength=Math.max(.25,Math.min(1,Number(power)||1));
  const t=ctx.currentTime+.003;
  const output=ctx.createGain(),filter=ctx.createBiquadFilter(),compress=ctx.createDynamicsCompressor();
  output.gain.value=real?.32:.65;
  filter.type='lowpass';filter.frequency.setValueAtTime(9000,t);
  filter.frequency.exponentialRampToValueAtTime(1350,t+p.decay);
  compress.threshold.value=-18;compress.knee.value=12;compress.ratio.value=3;
  compress.attack.value=.003;compress.release.value=.09;
  output.connect(filter);filter.connect(compress);compress.connect(space.master);
  if(space.reflections)compress.connect(space.reflections);
  const stop=t+Math.max(p.duration,p.decay,weapon==='m12'?.60:0)+.06;
  const tail=ctx.createGain();
  tail.gain.setValueAtTime(1,t);tail.gain.setValueAtTime(1,t+p.duration*.55);
  tail.gain.exponentialRampToValueAtTime(.0001,stop);
  tail.connect(output);
  const detune=1+Math.sin(t*4217)*.009;
  oscillator(ctx,tail,t,'sawtooth',p.pitch*detune,p.end,p.duration,p.volume*strength*.34,space);
  oscillator(ctx,tail,t+.008,'sine',p.body*2.35,p.body*.83,p.duration*.83,p.volume*strength*.9,space);
  oscillator(ctx,tail,t,'triangle',p.thump*2.8,p.thump,p.duration*.72,p.volume*strength*.86,space);
  // A short, physical recoil pulse under the upper-frequency laser discharge.
  oscillator(ctx,tail,t,'sine',160,48,Math.min(.145,p.duration*.75),p.volume*strength*p.weight*1.06,space);
  if(weapon==='lance'||weapon==='nova')oscillator(ctx,tail,t+.018,'sine',p.pitch*.64,p.end*.58,p.decay*.8,p.volume*strength*.34,space);
  if(weapon==='m12'){
    oscillator(ctx,tail,t+.20,'triangle',1120,370,.055,.022*strength,space);
    oscillator(ctx,output,t+.43,'triangle',1350,510,.065,.028*strength,space);
  }
  const noise=ctx.createBufferSource(),band=ctx.createBiquadFilter(),ng=ctx.createGain();
  noise.buffer=noiseBuffer(ctx);
  band.type='bandpass';band.Q.value=1.25;
  band.frequency.setValueAtTime(3800,t);band.frequency.exponentialRampToValueAtTime(Math.max(500,p.pitch),t+p.duration);
  env(ng,t,p.volume*p.noise*strength,p.duration*.9);
  noise.connect(band);band.connect(ng);ng.connect(tail);
  noise.start(t);noise.stop(t+Math.min(.18,p.duration+.015));
  remember(space,noise,[noise,band,ng]);
  // A quiet 'capacitor' click gives the start of each shot definition in a busy battle mix.
  oscillator(ctx,tail,t,'triangle',p.mechanism*2.1,p.mechanism,.016,p.volume*.38,space);
  // Receiver/chamber returns after discharge; the timings make automatic fire tangible.
  oscillator(ctx,tail,t+.042,'triangle',p.mechanism*.55,p.mechanism*.29,.034,p.volume*.17,space);
  // End-of-voice cleanup happens on the longest oscillator, without timers.
  const cleanup=ctx.createOscillator();cleanup.frequency.value=20;const silent=ctx.createGain();silent.gain.value=0;
  cleanup.connect(silent);silent.connect(output);cleanup.start(stop);cleanup.stop(stop+.01);
  remember(space,cleanup,[cleanup,silent,tail,output,filter,compress]);
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
  remember(space,noise,[noise,filter,gain]);
  oscillator(ctx,output,t,'sine',explosive?105:metal?520:145,explosive?38:metal?210:65,duration,.075*strength,space);
  if(metal)oscillator(ctx,output,t+.006,'triangle',1900,720,.105,.017*strength,space);
  const cleanup=ctx.createOscillator(),silent=ctx.createGain();silent.gain.value=0;cleanup.connect(silent);silent.connect(bus);
  cleanup.start(t+duration+.03);cleanup.stop(t+duration+.04);
  remember(space,cleanup,[cleanup,silent,...(panner?[panner]:[]),bus],()=>{space.impactVoices=Math.max(0,space.impactVoices-1);});
  return true;
}

// Mechanics accompany simulation events, once per stage (not per render frame).
export function playWeaponAction(ctx,weapon='r9',action='empty'){
  if(!ctx||ctx.state!=='running')return false;
  const space=spaceFor(ctx),p=LASER_PROFILES[weapon]||LASER_PROFILES.r9,now=ctx.currentTime;
  if(!space.enabled||!['empty','reload-out','reload-in','reload-ready'].includes(action))return false;
  const key=weapon+':'+action,last=space.actionTimes.get(key)??-10;
  if(now-last<(action==='empty'?.28:.14))return false;
  space.actionTimes.set(key,now);
  if(action!=='empty')stopCharge(space,now);
  const t=now+.002,bus=ctx.createGain();bus.gain.value=.7;bus.connect(space.master);
  const empty=action==='empty',insert=action==='reload-in',ready=action==='reload-ready';
  const duration=empty?.06:insert?.19:ready?.20:.14;
  const level=empty?.029:insert?.05:ready?.032:.035;
  oscillator(ctx,bus,t,'triangle',p.mechanism*(insert?.65:1.1),p.mechanism*.32,duration*.5,level,space);
  oscillator(ctx,bus,t+(insert?.065:.01),'sine',insert?160:ready?280:430,insert?75:ready?580:210,duration,level*p.weight*.7,space);
  if(!empty){
    const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    noise.buffer=noiseBuffer(ctx);filter.type='bandpass';filter.frequency.value=insert?1600:ready?3100:2300;filter.Q.value=.8;
    env(gain,t,level*.65,duration*.8);noise.connect(filter);filter.connect(gain);gain.connect(bus);
    remember(space,noise,[noise,filter,gain]);noise.start(t);noise.stop(t+Math.min(duration,.18));
  }
  const cleanup=ctx.createOscillator(),silent=ctx.createGain();silent.gain.value=0;
  cleanup.connect(silent);silent.connect(bus);remember(space,cleanup,[cleanup,silent,bus]);
  cleanup.start(t+duration+.01);cleanup.stop(t+duration+.02);return true;
}
function stopCharge(space,time){
  const charge=space?.charge;if(!charge)return;
  space.charge=null;
  charge.gain.gain.cancelScheduledValues(time);
  charge.gain.gain.setTargetAtTime(0,time,.018);
  try{charge.source.stop(time+.11);}catch{}
}
// One sustained capacitor tone follows the actual trigger charge. Safety expiry also
// silences it if a controller disconnects before the next frame arrives.
export function setWeaponCharge(ctx,weapon='thorn',progress=0,active=false){
  if(!ctx)return false;
  const space=spaces.get(ctx)||((active&&ctx.state==='running')?spaceFor(ctx):null);
  if(!space)return false;
  const time=ctx.currentTime;
  if(!active||!space.enabled||ctx.state!=='running'){stopCharge(space,time);return false;}
  progress=Math.max(0,Math.min(1,Number(progress)||0));
  if(space.charge?.weapon!==weapon)stopCharge(space,time);
  if(!space.charge){
    const source=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
    source.type='triangle';source.frequency.value=weapon==='nova'?82:126;
    filter.type='lowpass';filter.frequency.value=1400;filter.Q.value=.4;
    gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(space.master);
    const charge={source,gain,weapon,lastUpdate:-1};space.charge=charge;
    remember(space,source,[source,filter,gain],()=>{if(space.charge===charge)space.charge=null;});
    source.start(time);source.stop(time+1.5);
  }
  const charge=space.charge;
  if(time-charge.lastUpdate>=.07){
    charge.lastUpdate=time;
    charge.source.frequency.setTargetAtTime((weapon==='nova'?82:126)+progress*(weapon==='nova'?225:350),time,.06);
    charge.gain.gain.setTargetAtTime(.009+progress*.018,time,.055);
    charge.source.stop(time+1.5);
  }
  return true;
}

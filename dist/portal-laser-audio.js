// PINK WARS — original procedural cinematic laser-gate sound (no downloaded samples).
// Broadband energy shear, modulated twin lasers and deep plasma pressure.
// Reuses the AudioContext from the game and follows its mute setting.
const NOISE=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function noiseBuffer(ctx){
 let buffer=NOISE.get(ctx);if(buffer)return buffer;
 const len=Math.ceil(ctx.sampleRate*1.75);
 buffer=ctx.createBuffer(1,len,ctx.sampleRate);
 const array=buffer.getChannelData(0);
 let seed=0x7b31eea7,high=0;
 for(let i=0;i<len;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const white=seed/0xffffffff*2-1;
  high=.985*high+.015*white;
  array[i]=clamp((white-high)*.76+high*.65,-1,1);
 }
 NOISE.set(ctx,buffer);return buffer;
}
export function playPortalLaser(ctx,kind='open',{source={},listener={},yaw=0,delay=0,gain=1}={}){
 if(!ctx||ctx.state!=='running'||!['open','close'].includes(kind))return false;
 const closing=kind==='close',dur=closing?1.22:1.64;
 const start=ctx.currentTime+clamp(delay,0,4);
 const dx=(Number(source.x)||0)-(Number(listener.x)||0),dz=(Number(source.z)||0)-(Number(listener.z)||0);
 const dist=Math.hypot(dx,dz);
 const vol=(closing?.19:.17)/(1+dist*.041)*clamp(gain,.05,1.25);
 const bus=ctx.createGain();bus.gain.value=vol;
 let pan=null;
 if(typeof ctx.createStereoPanner==='function'){
   pan=ctx.createStereoPanner();
   pan.pan.value=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(2,dist)*.78,-.85,.85);
   bus.connect(pan);pan.connect(ctx.destination);
 }else bus.connect(ctx.destination);
 let count=0;
 const cleanup=(osc,g,filter)=>()=>{try{osc.disconnect();g?.disconnect();filter?.disconnect();}catch{}if(--count===0){bus.disconnect();pan?.disconnect();}};
 const shape=(node,peak,t0,attack,sustain,end)=>{
  const v=node.gain;
  v.setValueAtTime(.0001,t0);
  v.linearRampToValueAtTime(peak,t0+attack);
  v.setValueAtTime(peak*.72,t0+sustain);
  v.exponentialRampToValueAtTime(.0001,t0+end);
 };
 function laser({type='sawtooth',freq1,freq2,detune=0,volume=.32,attack=.16,filter1=450,filter2=2200}){
   const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();
   count++;osc.type=type;osc.detune.value=detune;
   osc.frequency.setValueAtTime(freq1,start);
   osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq2),start+dur*.84);
   // Band-limited, distorted-sounding plasma sweep, not the former two-note beep.
   filter.type='lowpass';filter.Q.value=1.5;
   filter.frequency.setValueAtTime(filter1,start);
   filter.frequency.exponentialRampToValueAtTime(filter2,start+dur*.70);
   filter.frequency.exponentialRampToValueAtTime(closing?130:690,start+dur);
   shape(amp,volume,start,attack,dur*.68,dur);
   osc.connect(filter);filter.connect(amp);amp.connect(bus);
   osc.onended=cleanup(osc,amp,filter);
   osc.start(start);osc.stop(start+dur+.02);
 }
 if(closing){
  laser({type:'sawtooth',freq1:490,freq2:53,detune:-11,volume:.46,attack:.02,filter1:3000,filter2:280});
  laser({type:'triangle',freq1:247,freq2:38,detune:13,volume:.54,attack:.016,filter1:1300,filter2:180});
 }else{
  laser({type:'sawtooth',freq1:68,freq2:320,detune:-17,volume:.43,attack:.31,filter1:200,filter2:3900});
  laser({type:'sawtooth',freq1:74,freq2:358,detune:16,volume:.29,attack:.39,filter1:320,filter2:2700});
  laser({type:'triangle',freq1:44,freq2:128,detune:0,volume:.59,attack:.30,filter1:290,filter2:850});
 }
 // Filtered spectral whoosh: opening sweeps from low to bright, closing is reversed.
 const hiss=ctx.createBufferSource(),filt=ctx.createBiquadFilter(),hi=ctx.createBiquadFilter(),env=ctx.createGain();
 count++;hiss.buffer=noiseBuffer(ctx);hiss.playbackRate.value=closing?1.22:1;
 filt.type='bandpass';filt.Q.value=.7;
 filt.frequency.setValueAtTime(closing?6300:270,start);
 filt.frequency.exponentialRampToValueAtTime(closing?260:6500,start+dur*.82);
 hi.type='highpass';hi.frequency.value=closing?105:75;
 shape(env,closing?.42:.51,start,closing?.016:.18,dur*.55,dur);
 hiss.connect(filt);filt.connect(hi);hi.connect(env);env.connect(bus);
 hiss.onended=()=>{hi.disconnect();cleanup(hiss,env,filt)();};
 hiss.start(start);hiss.stop(start+dur+.01);
 return true;
}
export function createPortalLaserController({getContext,getListener=()=>({}),getYaw=()=>0,enabled=()=>true}={}){
 const sites=new Map();
 const sample=(kind,p,delay=0)=>enabled()?playPortalLaser(getContext?.(),kind,{source:p,listener:getListener()||{},yaw:getYaw(),delay,gain:.9}):false;
 return {
  sync(next=[],time=0){
   const current=new Map((next||[]).map((p,i)=>[String(p.id??i),p]));
   for(const [id,p] of current)if(!sites.has(id))sample('open',p,Math.max(0,(p.openedAt??time)-time));
   for(const [id,p] of sites)if(!current.has(id))sample('close',p);
   sites.clear();for(const [id,p] of current)sites.set(id,p);
  },
  closeAll(){if(!sites.size)return false;for(const p of sites.values())sample('close',p);sites.clear();return true;},
  reset(){sites.clear();},
  get activeCount(){return sites.size;}
 };
}

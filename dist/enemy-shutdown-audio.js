// Pink Wars — procedural robotic shutdown audio (Web Audio, no external samples).
// Uses the game's unlocked AudioContext; never autoplays or creates a context.
// All nodes are short-lived and disconnected; no audio process in the render loop.
export function robotShutdownPitch(form='stalker'){
 if(form==='brute'||form==='sentinel')return {base:92,fall:36,body:1.3};
 if(form==='bulwark')return {base:135,fall:48,body:1.12};
 if(form==='seer')return {base:205,fall:74,body:.85};
 if(form==='probe')return {base:370,fall:126,body:.55};
 return {base:185,fall:62,body:1};
}
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function robotShutdownSpatial(source={},listener=null,yaw=0){
 if(!listener)return {gain:1,pan:0,distance:0};
 const dx=(Number(source.x)||0)-(Number(listener.x)||0),dz=(Number(source.z)||0)-(Number(listener.z)||0);
 const dy=(Number(source.y)||0)-((Number(listener.elevation)||0)+1.5);
 const distance=Math.hypot(dx,dy,dz);
 const pan=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,distance),-.88,.88);
 return {gain:clamp(Math.pow(1+distance/12,-1.45),0,1),pan,distance};
}
export function createRobotShutdownAudio({getContext=()=>null,getListener=()=>null,getYaw=()=>0,maxVoices=7}={}){
 let voices=new Set(),disposed=false;
 const noiseCache=new WeakMap();
 const faultTimes=new Map();
 let played=0;
 const envelope=(param,t,peak,duration)=>{
   param.setValueAtTime(.0001,t);
   param.linearRampToValueAtTime(Math.max(.0002,peak),t+.012);
   param.exponentialRampToValueAtTime(.0001,t+duration);
 };
 function noise(ctx){
   let b=noiseCache.get(ctx);if(b)return b;
   const sampleRate=ctx.sampleRate||44100,count=Math.max(512,Math.floor(sampleRate*.43));
   b=ctx.createBuffer(1,count,sampleRate);
   const data=b.getChannelData(0);let seed=7213;
   for(let i=0;i<count;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/2147483648-1)*(.6+.4*Math.sin(i*.047));}
   noiseCache.set(ctx,b);return b;
 }
 function play(kind,source={}){
   if(disposed)return false;
   const ctx=getContext?.();if(!ctx||ctx.state==='closed')return false;
   if(!['fault','glitch','shutdown','terminal'].includes(kind))return false;
   const listener=getListener?.(),spatial=robotShutdownSpatial(source,listener,getYaw?.()||0);
   if(spatial.distance>65||spatial.gain<.018||voices.size>=maxVoices)return false;
   const t=ctx.currentTime+.008,pitch=robotShutdownPitch(source.form),isHeavy=pitch.body>=1.1;
   const duration=kind==='shutdown'?Math.min(1.4,Math.max(.42,Number(source.duration)||.85))
                  :kind==='terminal'?.22:kind==='fault'?.17:.13;
   const master=ctx.createGain(),node=ctx.createGain(),pan=ctx.createStereoPanner?.();
   const strength=kind==='shutdown'?.095:kind==='terminal'?.075:kind==='glitch'?.040:.028;
   // Single capped voice per robot, all output below -17dB even nearby.
   const peak=Math.min(.12,strength*pitch.body*spatial.gain);
   master.gain.value=1;
   if(pan){pan.pan.value=spatial.pan;node.connect(pan);pan.connect(master);}else node.connect(master);
   master.connect(ctx.destination);envelope(node.gain,t,peak,duration);
   const entry={master,node,pan,sources:[],end:t+duration+.035};
   voices.add(entry);played++;
   function oscillator(type,start,end,length=duration,offset=0,vol=1){
     const o=ctx.createOscillator(),g=ctx.createGain();
     o.type=type;o.frequency.setValueAtTime(Math.max(21,start),t+offset);
     o.frequency.exponentialRampToValueAtTime(Math.max(21,end),t+offset+length);
     g.gain.setValueAtTime(vol,t+offset);
     o.connect(g);g.connect(node);
     o.start(t+offset);o.stop(t+offset+length+.012);
     entry.sources.push({source:o,gain:g});
     o.onended=()=>{try{o.disconnect();g.disconnect();}catch{};entry.sources=entry.sources.filter(s=>s.source!==o);if(!entry.sources.length){voices.delete(entry);try{node.disconnect();pan?.disconnect();master.disconnect();}catch{}}};
   }
   if(kind==='shutdown'){
     oscillator('sawtooth',pitch.base*1.55,pitch.fall,duration*.91,0,.58);
     oscillator('triangle',pitch.base*.61,pitch.fall*.55,duration*.95,0,.65);
   }else if(kind==='terminal'){
     oscillator('square',pitch.base*1.7,28,duration*.84,0,.42);
     oscillator('triangle',pitch.base*.53,34,duration*.92,0,.45);
   }else{
     oscillator('square',pitch.base*(kind==='glitch'?5.4:6.1),pitch.base*(kind==='glitch'?1.3:2.8),duration*.83,0,.22);
     oscillator('triangle',pitch.base*1.2,pitch.fall*1.25,duration*.92,0,.28);
   }
   // High-passed electric crackle (generated once per AudioContext).
   const buffer=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),ng=ctx.createGain();
   buffer.buffer=noise(ctx);filter.type=kind==='shutdown'?'bandpass':'highpass';
   filter.frequency.value=kind==='shutdown'?(isHeavy?410:700):1400;
   ng.gain.value=kind==='shutdown'?.48:.75;
   buffer.connect(filter);filter.connect(ng);ng.connect(node);
   buffer.start(t);buffer.stop(t+Math.min(duration,.41));
   entry.sources.push({source:buffer,gain:ng,filter});
   buffer.onended=()=>{try{buffer.disconnect();filter.disconnect();ng.disconnect();}catch{};entry.sources=entry.sources.filter(s=>s.source!==buffer);if(!entry.sources.length){voices.delete(entry);try{node.disconnect();pan?.disconnect();master.disconnect();}catch{}}};
   return true;
 }
 function stop(){
   for(const entry of voices){try{
     entry.node.gain.cancelScheduledValues(getContext()?.currentTime||0);
     entry.node.gain.setValueAtTime(.0001,getContext()?.currentTime||0);
     for(const item of entry.sources){try{item.source.stop();}catch{}}
     entry.node.disconnect();entry.pan?.disconnect();entry.master.disconnect();
   }catch{}}
   voices.clear();faultTimes.clear();
 }
 function dispose(){if(disposed)return;disposed=true;stop();}
 return {play,stop,dispose,stats:()=>({active:voices.size,played})};
}

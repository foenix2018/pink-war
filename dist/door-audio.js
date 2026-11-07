// Mechanical sci-fi door travel, Kenney CC0. One voice per moving door, no frame beeps.
const buffers=new WeakMap(),loads=new WeakMap();
export const DOOR_SAMPLES=Object.freeze({open:new URL('./assets/audio/doors/open.wav',import.meta.url).href,close:new URL('./assets/audio/doors/close.wav',import.meta.url).href});
export function loadDoorSamples(ctx,fetcher=globalThis.fetch){
 if(!ctx?.decodeAudioData||!fetcher)return Promise.resolve(null);
 if(buffers.has(ctx))return Promise.resolve(buffers.get(ctx));
 if(loads.has(ctx))return loads.get(ctx);
 const task=Promise.all(Object.entries(DOOR_SAMPLES).map(async([kind,url])=>{const r=await fetcher(url);if(!r.ok)throw Error('Door recording unavailable');return[kind,await ctx.decodeAudioData(await r.arrayBuffer())];}))
 .then(entries=>{const result=Object.fromEntries(entries);buffers.set(ctx,result);return result;}).catch(()=>null).finally(()=>loads.delete(ctx));
 loads.set(ctx,task);return task;
}
export function playDoorMotion(ctx,kind,door,{listener={},yaw=0}={}){
 const buffer=buffers.get(ctx)?.[kind];if(!buffer||ctx.state!=='running')return null;
 const x=door.axis==='x'?door.centre:door.fixed,z=door.axis==='x'?door.fixed:door.centre;
 const dx=x-(listener.x||0),dz=z-(listener.z||0),distance=Math.hypot(dx,dz);if(distance>24)return null;
 const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.(),nodes=[source,gain,...(pan?[pan]:[])];
 source.buffer=buffer;source.playbackRate.value=door.style==='gate'?.78:door.style==='vault'?.86:1.08;
 gain.gain.value=.46*Math.pow(1-distance/24,2)/(1+distance*.07);
 source.connect(gain);gain.connect(pan||ctx.destination);if(pan){pan.pan.value=Math.max(-.85,Math.min(.85,(dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(2,distance)));pan.connect(ctx.destination);}
 let stopped=false;const stop=()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}for(const n of nodes)n.disconnect();};
 source.onended=stop;source.start();return{stop};
}
export function createDoorAudioController({getContext,getListener=()=>({}),getYaw=()=>0,enabled=()=>true,play=playDoorMotion}={}){
 const states=new Map(),voices=new Map();
 const reset=()=>{for(const voice of voices.values())voice?.stop();voices.clear();states.clear();};
 return{reset,update(door,progress){
  const previous=states.get(door.id),delta=previous===undefined?0:progress-previous.open;
  const direction=Math.abs(delta)<.00001?0:Math.sign(delta);
  states.set(door.id,{open:progress,direction});
  if(!enabled()){for(const voice of voices.values())voice?.stop();voices.clear();return false;}
  if(!direction||previous?.direction===direction)return false;
  voices.get(door.id)?.stop();const voice=play(getContext?.(),direction>0?'open':'close',door,{listener:getListener(),yaw:getYaw()});
  if(voice)voices.set(door.id,voice);return!!voice;
 }};
}

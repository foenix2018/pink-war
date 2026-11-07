// Validated CC0 portal mix, revision 4. Only opening and closing: no loop or spawn beep.
// Kenney Sci-fi Sounds — see assets/audio/portals/CREDITS.md.
const decoded=new WeakMap(),pending=new WeakMap();let files;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function loadPortalSamples(ctx){
 if(!ctx?.decodeAudioData)return Promise.resolve(null);
 if(decoded.has(ctx))return Promise.resolve(decoded.get(ctx));
 if(pending.has(ctx))return pending.get(ctx);
 files??=Promise.all(['open','close'].map(async kind=>{const r=await fetch(new URL(`./assets/audio/portals/${kind}-cc0-v4.wav`,import.meta.url));if(!r.ok)throw Error(`Portal sample ${r.status}`);return[kind,await r.arrayBuffer()];})).catch(error=>{files=null;throw error;});
 const task=files.then(entries=>Promise.all(entries.map(async([kind,bytes])=>[kind,await ctx.decodeAudioData(bytes.slice(0))])))
  .then(entries=>{const buffers=Object.fromEntries(entries);decoded.set(ctx,buffers);pending.delete(ctx);return buffers;})
  .catch(error=>{pending.delete(ctx);console.warn('Portal audio unavailable',error);return null;});
 pending.set(ctx,task);return task;
}
export function playPortalLaser(ctx,kind='open',{source={},listener={},yaw=0,delay=0,gain=1}={}){
 if(!ctx||ctx.state!=='running'||!['open','close'].includes(kind))return false;
 const target=ctx.currentTime+clamp(delay,0,4),nodes=[];let stopped=false,finish;
 const done=new Promise(resolve=>finish=resolve);
 const stop=()=>{if(stopped)return;stopped=true;for(const n of nodes){try{n.stop?.();n.disconnect();}catch{}}finish();};
 const begin=buffers=>{
  if(stopped||!buffers||ctx.state!=='running'){stop();return;}
  const dx=(Number(source.x)||0)-(Number(listener.x)||0),dz=(Number(source.z)||0)-(Number(listener.z)||0),dist=Math.hypot(dx,dz);
  const src=ctx.createBufferSource(),bus=ctx.createGain();src.buffer=buffers[kind];
  bus.gain.value=.72/(1+dist*.041)*clamp(gain,0,1.25);src.connect(bus);nodes.push(src,bus);
  if(ctx.createStereoPanner){const pan=ctx.createStereoPanner();pan.pan.value=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(2,dist)*.78,-.85,.85);bus.connect(pan);pan.connect(ctx.destination);nodes.push(pan);}else bus.connect(ctx.destination);
  src.onended=stop;src.start(Math.max(target,ctx.currentTime+.005));
 };
 const cached=decoded.get(ctx);if(cached)begin(cached);else void loadPortalSamples(ctx).then(begin);
 return{stop,done};
}
export function createPortalLaserController({getContext,getListener=()=>({}),getYaw=()=>0,enabled=()=>true,play=playPortalLaser}={}){
 const sites=new Map(),voices=new Map();
 const sample=(kind,p,delay=0)=>{
  if(!enabled())return null;
  const voice=play(getContext?.(),kind,{source:p,listener:getListener()||{},yaw:getYaw(),delay,gain:.9});
  if(voice?.done)voice.done.then(()=>{for(const [id,v] of voices)if(v===voice)voices.delete(id);});
  return voice;
 };
 const stopVoices=()=>{for(const v of voices.values())v?.stop?.();voices.clear();};
 return{
  sync(next=[],time=0){
   const current=new Map((next||[]).map((p,i)=>[String(p.id??i),p]));
   if(!enabled())stopVoices();
   for(const [id,p] of current)if(!sites.has(id)){const voice=sample('open',p,Math.max(0,(p.openedAt??time)-time));if(voice)voices.set(id,voice);}
   for(const [id,p] of sites)if(!current.has(id)){voices.get(id)?.stop?.();voices.delete(id);if((p.openedAt??time)<=time){const voice=sample('close',p);if(voice)voices.set(id,voice);}}
   sites.clear();for(const [id,p] of current)sites.set(id,p);
  },
  closeAll(){if(!sites.size)return false;stopVoices();for(const [id,p] of sites){const voice=sample('close',p);if(voice)voices.set(id,voice);}sites.clear();return true;},
  reset(){stopVoices();sites.clear();},get activeCount(){return sites.size;}
 };
}

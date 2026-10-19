import {BREACH_GROUND_SURFACES} from './breach-layout.js';
const allowed=new Set(['metal','concrete','tarmac']);
export function walkingSurface(game){
 const p=game.player,h=p.elevation||0;
 // The top actually supporting the feet takes priority over the ground below it.
 for(const b of game.obstacles||[]){if(Math.abs((b.y||0)+b.height-h)<.17&&Math.abs(p.x-b.x)<=b.hx&&Math.abs(p.z-b.z)<=b.hz){if(allowed.has(b.surface))return b.surface;}}
 if((game.surfacesAt?.(p.x,p.z,game.time)||[]).some(s=>s.height>.15&&Math.abs(s.height-h)<.17))return 'metal';
 if(game.campaign?.id==='breche-violette-01')return BREACH_GROUND_SURFACES.find(s=>p.z>=s.minZ&&p.z<s.maxZ)?.surface||'concrete';
 return game.mode==='training'?'concrete':'tarmac';
}
export function createSurfaceSteps(ctx,{fetchFile=globalThis.fetch}={}){
 const bank=new Map(),voices=new Set(),controllers=new Set();let loading=null,disposed=false,index=0,played=0;
 async function load(){if(loading)return loading;loading=Promise.all(['metal','concrete','tarmac'].flatMap(surface=>[0,1,2].map(async n=>{const abort=new AbortController();controllers.add(abort);const timer=setTimeout(()=>abort.abort(),5000);try{const r=await fetchFile(new URL(`./audio/footsteps/${surface}-${n}.wav`,import.meta.url),{signal:abort.signal});if(!r.ok)throw Error('footstep fetch');const buffer=await ctx.decodeAudioData(await r.arrayBuffer());if(!disposed)bank.set(`${surface}-${n}`,buffer);}catch{}finally{clearTimeout(timer);controllers.delete(abort);}})));return loading;}
 function play(surface,{destination,crouched=false,speed=5,foot=0}={}){if(disposed||ctx.state!=='running'||voices.size>=4)return false;const key=allowed.has(surface)?surface:'concrete',buffer=bank.get(`${key}-${index%3}`);if(!buffer)return false;
 const source=ctx.createBufferSource(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),pan=ctx.createStereoPanner?.();source.buffer=buffer;source.playbackRate.value=.98+(index%3)*.02;index++;filter.type='lowpass';filter.frequency.value=key==='metal'?4800:key==='tarmac'?1800:3000;gain.gain.value=(crouched?.038:.075)*Math.max(.7,Math.min(1.25,speed/6));source.connect(filter);filter.connect(gain);gain.connect(pan||destination);if(pan){pan.pan.value=(foot%2?1:-1)*.12;pan.connect(destination);}const nodes=[source,filter,gain,...(pan?[pan]:[])],entry={source,nodes};voices.add(entry);source.onended=()=>{voices.delete(entry);nodes.forEach(n=>n.disconnect());};source.start();source.stop(ctx.currentTime+buffer.duration/source.playbackRate.value+.02);played++;return true;}
 return {load,play,stats:()=>({loaded:bank.size,played,voices:voices.size}),dispose(){disposed=true;controllers.forEach(c=>c.abort());controllers.clear();for(const e of voices){try{e.source.stop();}catch{}e.nodes.forEach(n=>n.disconnect());}voices.clear();bank.clear();}};
}

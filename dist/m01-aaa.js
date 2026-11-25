import {graphicsProfile} from './renderer-policy.js';
// M01 only; other chapters retain their established compatibility policy.
export function m01Profile(environment={},quality='auto',forceWebGL=false){
 const base=graphicsProfile(environment,quality,forceWebGL);
 if(base.headset||!base.phone)return base;
 const native=!!environment.gpu&&!forceWebGL&&!base.compatible;
 const mode=quality==='low'?'performance':quality==='high'?'cinematic':'balanced';
 return {...base,preferWebGL:!native,adaptive:true,m01Mode:mode,targetFPS:mode==='cinematic'?30:60,
 mobileCinema:native&&mode!=='performance',pixelRatioCap:mode==='performance'?1:mode==='cinematic'?1.65:1.35,
 maxPixels:mode==='performance'?650000:mode==='cinematic'?1200000:900000,artQuality:'low',minScale:.65};
}
export function createM01Telemetry(){
 let last=null,frames=[],elapsed=0;
 return {sample(t){if(!Number.isFinite(t))return;if(last!==null){const ms=(t-last)*1000;if(ms>0&&ms<250){frames.push(ms);elapsed+=ms;if(frames.length>300)elapsed-=frames.shift();}else if(ms>=250){frames=[];elapsed=0;}}last=t;},
 reset(){last=null;frames=[];elapsed=0;},
 snapshot(){const n=frames.length,a=frames.slice().sort((x,y)=>x-y);return {samples:n,fps:n?Math.round(10000*n/elapsed)/10:null,p95Ms:n?Math.round(a[Math.ceil(n*.95)-1]*10)/10:null};}};
}
export function createM01Exposure(){
 let value=null;
 return {update(renderer,daylight,dt){const target=renderer.toneMappingExposure*(1+.12*(1-Math.max(0,Math.min(1,daylight??1))));
 const step=1-Math.exp(-Math.max(0,Math.min(.1,dt))*2.2);
 value=value===null?target:value+(target-value)*step;renderer.toneMappingExposure=value;return value;}};
}

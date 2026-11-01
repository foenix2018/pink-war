// Adapted from RLH graphics-profiles-v886: keep 3D detail unchanged, adjust only
// the *flat-screen* resolution after sustained frame-time pressure.
// The hysteresis intentionally preserves sharpness during brief stalls.
// WebXR and binocular stereo are excluded: their render targets are owned
// by the XR runtime / stereo cameras. No renderer monkey-patching.
export const RLH_ADAPTIVE_PORT_VERSION='pink-war-rlh-v886-adapted-1';
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

export function createAdaptiveResolution({mobile=false,enabled=true,minScale,slowFPS,fastFPS,
  warmup=8,slowHold=3,fastHold=18,cooldown=4,downStep=.07,upStep=.035}={}){
 const floor=clamp(minScale??(mobile?.78:.85),.65,1);
 const slower=1/(slowFPS||(mobile?28:42));
 const faster=1/(fastFPS||(mobile?35:55));
 let scale=1,ema=1/60,elapsed=0,slow=0,fast=0,lastChange=-Infinity,changes=0;
 const history=[];
 function reset(){
  scale=1;ema=1/60;elapsed=slow=fast=0;lastChange=-Infinity;
  return scale;
 }
 // Called with the *unclamped* frame delta wherever possible. No changes
 // when a menu, pause, loading screen, XR session or stereo is visible.
 function sample(dt,{active=true,immersive=false,hidden=false,cpuBound=false}={}){
  if(!enabled||!active||immersive||hidden||cpuBound){
   slow=fast=0;
   return null;
  }
  if(!Number.isFinite(dt)||dt<.001||dt>.25){
   slow=fast=0;return null;
  }
  elapsed+=dt;
  ema=ema*.96+dt*.04;
  if(elapsed<warmup)return null;
  if(ema>slower){slow+=dt;fast=0;}
  else if(ema<faster){fast+=dt;slow=Math.max(0,slow-dt);}
  else {slow=Math.max(0,slow-dt);fast=0;}
  if(elapsed-lastChange<cooldown)return null;
  let next=scale;
  if(slow>=slowHold)next=Math.max(floor,scale-downStep);
  else if(fast>=fastHold)next=Math.min(1,scale+upStep);
  next=Math.round(next*1000)/1000;
  // Below a threshold, preserve the evidence across successive frames:
  // clearing it here would make the hysteresis impossible to trigger.
  // Only clear saturated counters when already at the hard floor/ceiling.
  if(Math.abs(next-scale)<.0005){
   if(slow>=slowHold)slow=0;
   if(fast>=fastHold)fast=0;
   return null;
  }
  history.push({from:scale,to:next,at:Math.round(elapsed),frameMs:Math.round(ema*10000)/10});
  if(history.length>16)history.shift();
  scale=next;lastChange=elapsed;changes++;slow=fast=0;
  return scale;
 }
 return {sample,reset,history,
   get scale(){return scale;},
   get stats(){return {version:RLH_ADAPTIVE_PORT_VERSION,enabled,mobile,scale,changes,estimatedFps:Math.round(1/ema),minScale:floor};}
 };
}

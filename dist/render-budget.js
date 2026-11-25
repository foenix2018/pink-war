// Resolution follows sustained foreground frame cost, never a single loading hitch.
// CSS/HUD size, world geometry, movement speed and offscreen/XR renders stay intact.
export function createFrameBudget({enabled=true,minScale=.55,targetFPS=30}={}){
 let scale=1,average=0,samples=0,total=0,fastWindows=0,warmup=2,degraded=false,window=[];
 function resetWindow(){samples=0;total=0;fastWindows=0;window=[];}
 const snapshot=()=>({enabled,scale,average,degraded});
 return {snapshot,reset(){resetWindow();warmup=2;},sample(ms){
  if(!enabled)return snapshot();
  if(!Number.isFinite(ms)||ms<=0||ms>5000){resetWindow();return snapshot();}
  if(warmup){warmup--;return snapshot();}
  ms=Math.min(ms,1000);samples++;total+=ms;window.push(ms);
  if(total<600||samples<6)return snapshot();
  // Trim one outlier at each end so shader compilation cannot trigger a downgrade.
  const sorted=window.sort((a,b)=>a-b).slice(1,-1);
  average=sorted.reduce((sum,value)=>sum+value,0)/sorted.length;window=[];samples=total=0;
  if(average>(targetFPS===60?19.5:36)){scale=Math.max(minScale,scale*.85);fastWindows=0;degraded=scale<.85||average>(targetFPS===60?26:45);}
  else if(average<(targetFPS===60?16.9:23)){
   if(++fastWindows>=4){scale=Math.min(1,scale+.05);fastWindows=0;if(scale===1)degraded=false;}
  }else fastWindows=0;
  return snapshot();
 }};
}

export function installRenderBudget(renderer,profile={},now=()=>performance.now()){
 if(renderer.frameBudget||!renderer.render||!renderer.setPixelRatio)return renderer.frameBudget;
 const render=renderer.render.bind(renderer),renderAsync=renderer.renderAsync?.bind(renderer);
 const setRatio=renderer.setPixelRatio.bind(renderer),dispose=renderer.dispose?.bind(renderer);
 let activeProfile=profile,budget=createFrameBudget({enabled:!!profile.adaptive,minScale:profile.minScale??.55,targetFPS:profile.targetFPS??30}),baseRatio=renderer.getPixelRatio?.()||1;
 let last=null,busy=false,disposed=false,savedShadows=null,savedGrade=null,pendingProfile=null,pendingRatio=false;
 const foreground=()=>!renderer.domElement?.ownerDocument?.hidden;
 function effects(degraded){
  if(degraded){
   if(renderer.shadowMap){savedShadows??=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;}
   if(renderer.fpsPresentation){savedGrade??=renderer.fpsPresentation.stats().enabled;renderer.fpsPresentation.setEnabled(false);}
  }else{
   if(savedShadows!==null&&renderer.shadowMap){renderer.shadowMap.enabled=savedShadows;savedShadows=null;}
   if(savedGrade!==null&&renderer.fpsPresentation){renderer.fpsPresentation.setEnabled(savedGrade);savedGrade=null;}
  }
 }
 renderer.setPixelRatio=value=>{baseRatio=value;if(busy){pendingRatio=true;return;}return setRatio(value*budget.snapshot().scale);};
 function configure(next){effects(false);activeProfile=next;budget=createFrameBudget({enabled:!!next.adaptive,minScale:next.minScale??.55,targetFPS:next.targetFPS??30});last=null;setRatio(baseRatio);}
 const main=(scene,camera)=>!busy&&!disposed&&scene?.isScene&&(camera?.isPerspectiveCamera||activeProfile.orthographicBudget&&camera?.isOrthographicCamera)
  &&!renderer.xr?.isPresenting&&!renderer.getRenderTarget?.()&&!renderer.getScissorTest?.();
 function draw(original,scene,camera,args){
  if(!main(scene,camera))return original(scene,camera,...args);
  if(pendingProfile){configure(pendingProfile);pendingProfile=null;}
  if(pendingRatio){setRatio(baseRatio*budget.snapshot().scale);pendingRatio=false;}
  const time=now();
  if(foreground()){
   const previous=budget.snapshot();
   if(last!==null){const next=budget.sample(time-last);if(next.scale!==previous.scale)setRatio(baseRatio*next.scale);}
   last=time;effects(budget.snapshot().degraded||activeProfile.economy);
  }else{last=null;budget.reset();}
  busy=true;
  try{
   const result=original(scene,camera,...args);
   if(result?.then)return Promise.resolve(result).finally(()=>{busy=false;});
   busy=false;return result;
  }catch(error){busy=false;throw error;}
 }
 renderer.render=(scene,camera,...args)=>draw(render,scene,camera,args);
 if(renderAsync)renderer.renderAsync=(scene,camera,...args)=>draw(renderAsync,scene,camera,args);
 const api={stats:()=>({...budget.snapshot(),baseRatio,pixelRatio:baseRatio*budget.snapshot().scale}),configure(next){
  if(busy){pendingProfile=next;return;}configure(next);
 }};
 if(dispose)renderer.dispose=()=>{disposed=true;dispose();};
 renderer.frameBudget=api;return api;
}

// The wrapper's class is not its backend: WebGPURenderer can fall back to WebGL2.
export function rendererBackend(renderer){
 if(!renderer)return 'unavailable';
 if(renderer.backend?.isWebGPUBackend)return 'webgpu';
 if(renderer.backend?.isWebGLBackend||renderer.isWebGLRenderer)return 'webgl';
 return 'unknown';
}
export function rendererLabel(renderer){const backend=rendererBackend(renderer);return backend==='webgpu'?'WebGPU':backend==='webgl'?'WebGL 2':backend==='unavailable'?'En préparation':'Moteur indéterminé';}
// Shared launch policy. A published GPU API is not proof that an adapter can
// initialise; iOS uses the mature WebGL path until the real device is measured.
export function graphicsProfile(environment={},quality='auto',forceWebGL=false){
  const ua=environment.userAgent||'',touch=environment.maxTouchPoints||0;
  const ios=/iPhone|iPad|iPod/i.test(ua)||(environment.platform==='MacIntel'&&touch>1);
  const headset=/OculusBrowser|Quest|PicoBrowser/i.test(ua);
  const phone=!headset&&(ios||/Android.*Mobile/i.test(ua));
  const compatible=environment.rendererHint==='webgl';
  return {ios,phone,headset,compatible,preferWebGL:forceWebGL||ios||compatible||!environment.gpu,
    antialias:!phone&&!compatible,shadows:true,
    pixelRatioCap:phone?(quality==='high'?1.15:1):compatible?1:quality==='low'?1:quality==='balanced'?1.4:quality==='high'?2:1.8,
    maxPixels:phone?750000:compatible?1100000:quality==='balanced'?2000000:quality==='high'?3200000:2400000,
    artQuality:phone||compatible?'low':quality==='balanced'?'high':quality,skyWidth:phone||compatible||quality==='low'?1024:2048};
}

export function renderPixelRatio(profile,deviceRatio,width,height){
  const requested=Math.min(Math.max(.1,Number(deviceRatio)||1),profile.pixelRatioCap);
  const budget=Math.sqrt(profile.maxPixels/Math.max(1,width*height));
  return Math.max(.1,Math.min(requested,budget));
}

function deadline(promise,milliseconds,label){
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label)),milliseconds)})])
    .finally(()=>clearTimeout(timer));
}

export async function createCompatibleRenderer({canvas,WebGPU,WebGL,profile,timeout=6000}){
  let renderer,initialFailure=null,retired=false;
  const present=async r=>{if((r.backend?.isWebGPUBackend||r.isWebGLRenderer)&&!profile.phone&&!profile.headset&&!profile.compatible&&!['low','performance'].includes(profile.artQuality)&&r.domElement?.ownerDocument){const {installFPSGrade}=await import('./fps-grade.js');installFPSGrade(r,profile);}return r;};
  const make=Renderer=>new Renderer({canvas,antialias:profile.antialias,alpha:false,powerPreference:profile.phone?'default':'high-performance'});
  if(!profile.preferWebGL){
    try{
      renderer=make(WebGPU);
      if(renderer.init){
        const candidate=renderer;
        const initialisation=Promise.resolve(candidate.init()).then(()=>{if(retired)try{candidate.dispose();}catch{}});
        await deadline(initialisation,timeout,'Initialisation WebGPU interrompue.');
      }
      await present(renderer);
      return {renderer,canvas,profile,initialFailure:rendererBackend(renderer)==='webgl'?'WebGPU indisponible : repli WebGL 2.':initialFailure};
    }catch(error){
      retired=true;
      initialFailure=error instanceof Error?error.message:String(error);
      try{renderer?.dispose();}catch{}
      // A canvas that already acquired a WebGPU context cannot switch its type.
      const previous=canvas;canvas=previous.cloneNode(false);
      canvas.removeAttribute?.('data-controls-bound');previous.replaceWith(canvas);
    }
  }
  renderer=make(WebGL);await present(renderer);
  return {renderer,canvas,profile,initialFailure};
}

export async function warmRenderer(renderer,scene,camera,{timeout=8000}={}){
  // WebGL compiles synchronously and then renders normally. Parallel shader
  // polling may never settle on a lost context; it must not gate iPhone entry.
  if(renderer.isWebGLRenderer){renderer.compile?.(scene,camera);return;}
  if(renderer.compileAsync)await deadline(renderer.compileAsync(scene,camera),timeout,'Préparation WebGPU interrompue.');
  else renderer.compile?.(scene,camera);
}

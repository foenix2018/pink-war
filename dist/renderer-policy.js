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
    pixelRatioCap:phone?(quality==='high'?1.15:1):compatible?1:quality==='low'?1:quality==='high'?2:1.8,
    maxPixels:phone?750000:compatible?1100000:Infinity,
    artQuality:phone||compatible?'low':quality,skyWidth:phone||compatible||quality==='low'?1024:2048};
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
  const make=Renderer=>new Renderer({canvas,antialias:profile.antialias,alpha:false,powerPreference:profile.phone?'default':'high-performance'});
  if(!profile.preferWebGL){
    try{
      renderer=make(WebGPU);
      if(renderer.init){
        const candidate=renderer;
        const initialisation=Promise.resolve(candidate.init()).then(()=>{if(retired)try{candidate.dispose();}catch{}});
        await deadline(initialisation,timeout,'Initialisation WebGPU interrompue.');
      }
      return {renderer,canvas,profile,initialFailure};
    }catch(error){
      retired=true;
      initialFailure=error instanceof Error?error.message:String(error);
      try{renderer?.dispose();}catch{}
      // A canvas that already acquired a WebGPU context cannot switch its type.
      const previous=canvas;canvas=previous.cloneNode(false);
      canvas.removeAttribute?.('data-controls-bound');previous.replaceWith(canvas);
    }
  }
  renderer=make(WebGL);
  return {renderer,canvas,profile,initialFailure};
}

export async function warmRenderer(renderer,scene,camera,{timeout=8000}={}){
  // WebGL compiles synchronously and then renders normally. Parallel shader
  // polling may never settle on a lost context; it must not gate iPhone entry.
  if(renderer.isWebGLRenderer){renderer.compile?.(scene,camera);return;}
  if(renderer.compileAsync)await deadline(renderer.compileAsync(scene,camera),timeout,'Préparation WebGPU interrompue.');
  else renderer.compile?.(scene,camera);
}

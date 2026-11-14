/* Browser-only iPhone adaptation, no external runtime dependencies. */
(() => {
  const root=document.documentElement;
  const coarse=matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0;
  let touch=coarse,quality=coarse?'mobile':'standard';
  try {const t=localStorage.getItem('aerinTouchHUD'),q=localStorage.getItem('aerinQuality');if(t!==null)touch=t==='true';if(q==='mobile'||q==='standard')quality=q;}catch(_){}
  function fitViewport(){const v=window.visualViewport;root.style.setProperty('--app-height',`${Math.round(v?Math.min(v.height*v.scale,innerHeight):innerHeight)}px`);root.style.setProperty('--app-width','100vw');window.dispatchEvent(new Event('aerinviewport'));}
  function setTouch(value){touch=!!value;document.body.classList.toggle('touch-layout',touch);document.querySelector('#touch-setting').checked=touch;document.querySelector('#device-note').hidden=!touch;try{localStorage.setItem('aerinTouchHUD',String(touch));}catch(_){}fitViewport();}
  function setQuality(value){quality=value==='mobile'?'mobile':'standard';document.querySelector('#quality-setting').value=quality;try{localStorage.setItem('aerinQuality',quality);}catch(_){}window.dispatchEvent(new CustomEvent('aerinquality',{detail:quality}));}
  document.querySelector('#touch-setting').addEventListener('change',e=>setTouch(e.target.checked));document.querySelector('#quality-setting').addEventListener('change',e=>setQuality(e.target.value));
  window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);window.addEventListener('orientationchange',()=>{fitViewport();setTimeout(fitViewport,200);});
  // iOS page cache and lock-screen transitions must not preserve a held attack or stick.
  window.addEventListener('pagehide',()=>window.dispatchEvent(new Event('blur')));
  window.addEventListener('pageshow',()=>{fitViewport();window.dispatchEvent(new Event('blur'));});
  window.aerinDevice={get touch(){return touch;},get quality(){return quality;},fitViewport,setTouch,setQuality};
  setTouch(touch);setQuality(quality);
})();

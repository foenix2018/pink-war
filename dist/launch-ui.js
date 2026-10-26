export const GAME_VERSION='3.63.10';
export function compatibleLaunchURL(current=location.href){
  const url=new URL(current);
  const target=url.protocol==='file:'?new URL('https://pink-war.vercel.app/'):url;
  target.searchParams.set('v',GAME_VERSION);target.searchParams.set('renderer','webgl');
  return target.href;
}
export function showLaunchError(error,stage='rendu',backend='inconnu'){
  const $=id=>document.getElementById(id);
  const message=(error?.message||String(error)).replace(/(https?:\/\/[^\s?#]+)(?:[?#][^\s]*)?/g,'$1').slice(0,300);
  const diagnostics={version:GAME_VERSION,stage,backend,error:{name:error?.name||'Error',message},
    userAgent:navigator.userAgent,platform:navigator.platform,gpuAPI:!!navigator.gpu};
  window.__PINKWAR_LAUNCH_DIAGNOSTICS=diagnostics;
  $('loading-screen').hidden=true;$('loading-error').hidden=false;
  $('loading-error-title').textContent=stage==='rendu'?'La 3D a été interrompue.':'Le chargement a été interrompu.';
  $('loading-error-message').textContent='Le mode compatible utilise un rendu plus léger. Vous pouvez relancer le jeu avec ce mode.';
  $('loading-error-detail').textContent=`Pink War ${GAME_VERSION} · ${stage} · ${backend}\n${message}`;
  $('compatible-retry').href=compatibleLaunchURL();
  const copy=$('copy-game-link');
  copy.onclick=()=>copyText('https://pink-war.vercel.app/?v='+GAME_VERSION,$('copy-game-status'));
  $('copy-diagnostic').onclick=()=>copyText(JSON.stringify(diagnostics,null,2),$('copy-game-status'));
}
export async function copyText(value,status){
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
    else{const area=document.createElement('textarea');area.value=value;document.body.append(area);area.select();area.setSelectionRange(0,value.length);
      const copied=document.execCommand('copy');area.remove();if(!copied)throw new Error('copie indisponible');}
    if(status)status.textContent='Copié.';
  }catch{if(status){status.textContent=value;status.style.userSelect='text';}}
}

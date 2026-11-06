/* Loading overlay for Pink Wars. No timers/fake network percentages:
   bar advances only when the engine completes actual initialization steps. */
export const SCENARIO_LOADING_ART = Object.freeze({
  training: {src:'art/loading/stand-de-tir.avif?v=20261106',fallback:'art/updates/36313/stand.webp',title:'Stand de tir',description:'Centre de qualification · chargement des équipements et des cibles.'},
  arena: {src:'art/loading/arene.avif?v=20261106',fallback:'art/updates/367/arena-ghju.webp',title:'Arène · Survie',description:'Vingt vagues d’ORDRE · initialisation des tourelles et de l’arène fortifiée.'}
});
const byId=id=>document.getElementById(id);
export function setLoadingProgress(value,description=''){
 const root=byId('loading-screen');if(!root)return;
 const fill=byId('loading-progress'),progress=byId('loading-progress-track'),val=byId('loading-value');
 const n=Math.min(100,Math.max(0,Number(value)||0));
 if(fill)fill.style.transform='scaleX('+(n/100)+')';
 if(progress){progress.setAttribute('aria-valuenow',String(Math.round(n)));progress.setAttribute('aria-valuetext',description||('Étape '+Math.round(n)+' sur 100'));}
 if(val)val.textContent=Math.round(n)+' %';
 if(description && byId('loading-status'))byId('loading-status').textContent=description;
 root.classList.toggle('pw-load-complete',n===100);
}
export function beginScenarioLoading(mode,characterId='ghju',status='Initialisation du secteur…'){
 const root=byId('loading-screen');if(!root)return;
 const img=root.querySelector('img[data-character-art]');
 const cfg=SCENARIO_LOADING_ART[mode];
 root.dataset.mode=mode;
 if(cfg){
  if(img){img.onerror=()=>{img.onerror=null;if(img.getAttribute('src')!==cfg.fallback)img.src=cfg.fallback;};img.src=cfg.src;}
  if(byId('loading-title'))byId('loading-title').textContent=cfg.title;
  if(byId('loading-description'))byId('loading-description').textContent=cfg.description;
 }else if(img){
  img.onerror=null;
  img.src=img.dataset[characterId==='lylu'?'lyluSrc':'ghjuSrc']||img.getAttribute('src');
 }
 root.hidden=false;
 setLoadingProgress(0,status);
}
export async function endScenarioLoading({completed=true}={}){
 const root=byId('loading-screen');if(!root)return;
 if(completed) setLoadingProgress(100,'Secteur prêt · synchronisation terminée');
 await new Promise(resolve=>requestAnimationFrame(resolve));
 root.hidden=true;
}

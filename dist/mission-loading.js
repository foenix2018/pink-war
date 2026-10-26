import {setScreenMusic} from './menu-music.js';
export function missionPresentation(mission=1,characterId='ghju'){
 const blue=characterId==='lylu';
 return mission===2?{number:2,title:'Sous les Néons',description:'Les Bas-Niveaux de Vesper. Une enclave, des archives saisies, une route à ouvrir.',image:'art/mission02-cover.webp?v=3.63.10',signal:blue?'#78baff':'#f27ba7'}:
  {number:1,title:'Le dernier signal',description:'Un terminal hors réseau conserve peut-être la trace de votre '+(blue?'sœur.':'frère.'),image:blue?'art/chargement-lylu.webp?v=3.47':'art/chargement.webp?v=3.47',signal:blue?'#78baff':'#f27ba7'};
}

// Stage-based progress: each update follows completed work, never a timed fake
// download percentage. The cover hides only after a real render is validated.
export function createMissionLoading({mission=1,characterId='ghju'}={}){
 let musicEnabled=true;try{musicEnabled=JSON.parse(localStorage.getItem('rosee-settings')||'{}').music!==false;}catch{}
 setScreenMusic('loading',mission,musicEnabled);
 if(!document.querySelector('[data-mission-loading-style]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./mission-loading.css?v=3.63.10',import.meta.url).href;link.dataset.missionLoadingStyle='';document.head.append(link);
 }
 const info=missionPresentation(mission,characterId),root=document.createElement('section');root.className='pw-mission-loading';root.setAttribute('data-mission',String(mission));root.id='pw-mission-loading';
 root.setAttribute('role','status');root.setAttribute('aria-label','Chargement du scénario');root.style.setProperty('--signal',info.signal);
 root.innerHTML='<img alt=""><div class="pw-load-brand">PINK WARS / LA FRACTURE</div><a class="pw-load-home" href="./index.html">Retour à l’accueil</a><div class="pw-load-copy"><p class="pw-load-kicker"></p><h1></h1><p class="pw-load-description"></p><div class="pw-load-labels"><span class="pw-load-state">Préparation du secteur</span><span class="pw-load-value">0 %</span></div><div class="pw-load-track" role="progressbar" aria-label="Préparation du scénario" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><button class="pw-load-error" hidden>Réessayer</button></div>';
 root.querySelector('img').src=new URL(info.image,import.meta.url).href;
 root.querySelector('.pw-load-kicker').textContent='MISSION '+String(info.number).padStart(2,'0')+' · VESPER / 2196';
 root.querySelector('h1').textContent=info.title;root.querySelector('.pw-load-description').textContent=info.description;document.body.append(root);
 let progress=0,failed=false,complete=null;
 function set(value,label){
  if(failed||complete)return;progress=Math.max(progress,Math.min(1,Number(value)||0));
  const percent=Math.round(progress*100);root.querySelector('.pw-load-track').setAttribute('aria-valuenow',String(percent));
  root.querySelector('.pw-load-value').textContent=percent+' %';root.querySelector('.pw-load-track i').style.transform='scaleX('+progress+')';
  if(label)root.querySelector('.pw-load-state').textContent=label;
 }
 return {root,set,
  finish(){
   if(complete)return complete;
   set(1,'Secteur prêt');complete=new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!failed){setScreenMusic('gameplay',mission);root.hidden=true;}resolve(!failed);})));return complete;
  },
  fail(message='Le chargement a été interrompu.'){
   failed=true;setScreenMusic('loading',mission);root.hidden=false;root.querySelector('.pw-load-state').textContent=message;
   const button=root.querySelector('.pw-load-error');button.hidden=false;button.onclick=()=>location.reload();
  },
  get progress(){return progress;}
 };
}

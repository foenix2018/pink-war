import {setScreenMusic} from './menu-music.js';
import {buildLoadingCover,briefingFor} from './mission-briefing.js';
export function missionPresentation(mission=1,characterId='ghju'){
 const info=briefingFor(mission,characterId);
 return {number:mission,title:info.title,description:info.text,image:info.image,signal:characterId==='lylu'?'#78baff':'#ff2d95'};
}

// Stage-based progress: each update follows completed work, never a timed fake
// download percentage. The cover hides only after a real render is validated.
export function createMissionLoading({mission=1,characterId='ghju'}={}){
 let musicEnabled=true;try{musicEnabled=JSON.parse(localStorage.getItem('rosee-settings')||'{}').music!==false;}catch{}
 setScreenMusic('loading',mission,musicEnabled);
 if(!document.querySelector('[data-mission-loading-style]')){
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./mission-loading.css?v=3.73.0',import.meta.url).href;link.dataset.missionLoadingStyle='';document.head.append(link);
 }
 const root=document.createElement('section');root.className='pw-mission-loading';root.setAttribute('data-mission',String(mission));root.id='pw-mission-loading';
 root.setAttribute('role','status');root.setAttribute('aria-label','Chargement du chapitre');
 // Same level screen as the start panels (mission-briefing.js): art, logo, chapter, objectives; progress at the bottom right.
 buildLoadingCover(root,mission,characterId);document.body.append(root);
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

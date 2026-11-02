// Chapter 07 exploration HUD – classic Pink Wars placement and authentic companion portrait.
import {paintCompanionPortrait} from './companion-portrait.js';
export function createM07Hud({characterId='ghju',onMove=()=>{},onRun=()=>{},onInteract=()=>{}}={}){
  const hero=characterId==='lylu'?'lylu':'ghju',companion=hero==='lylu'?'CAR-14':'GAB-1';
  const root=document.createElement('section');root.className='m07-hud';root.dataset.hero=hero;
  root.setAttribute('aria-label','Interface du chapitre 07');
  root.innerHTML=`<div class="m07-stat m07-stat-left m07-glass"><small>SANTÉ · ${hero.toUpperCase()}</small><strong>—</strong><em>MODE EXPLORATION</em></div>
<div class="m07-stat m07-stat-right m07-glass"><small>MUNITIONS</small><strong>—</strong><em>COMBAT INACTIF</em></div>
<button class="m07-objective m07-glass" type="button" aria-expanded="false">07 · MÉMOIRES LOCALES</button>
<div class="m07-objective-detail m07-glass" hidden><strong>LA FORÊT DES SOURCES</strong><p>Suivre la piste des Tilleuls jusqu'à la cascade, trouver le relais indépendant et consulter ses archives.</p><span class="m07-zone"></span></div>
<button class="m07-companion m07-glass" type="button" aria-expanded="false" aria-label="Afficher les informations de ${companion}"><canvas width="128" height="128" aria-hidden="true"></canvas><span>${companion}</span></button>
<div class="m07-companion-detail m07-glass" hidden><strong>${companion} · SUPPORT</strong><p>Reconnaissance et assistance. L'arsenal, les grenades et les capacités de combat seront disponibles dans le niveau jouable complet.</p></div>
<button class="m07-pause m07-glass" type="button" aria-label="Mettre en pause">Ⅱ</button>
<button class="m07-action m07-glass" type="button" hidden>◉ ACTION</button>
<div class="m07-joystick" role="group" aria-label="Déplacement tactile"><div class="m07-knob"></div></div>
<span class="m07-run-label">Joystick : incliner pour courir</span>
<span class="m07-help">ZQSD · Souris · Maj courir · E lire · Échap pause</span>
<div class="m07-pause-screen" hidden><div class="m07-pause-panel m07-glass"><h2>PAUSE</h2><p>Chapitre 07 · Mémoires locales</p><button type="button" data-resume>REPRENDRE</button><a href="./index.html?mode=foret">RETOUR À L'ACCUEIL</a></div></div>`;
  document.body.append(root);document.body.classList.add('m07-hud-enabled');
  const q=sel=>root.querySelector(sel), portrait=q('.m07-companion'),detail=q('.m07-companion-detail'),
    objective=q('.m07-objective'),info=q('.m07-objective-detail'),pause=q('.m07-pause-screen'),action=q('.m07-action'),
    stick=q('.m07-joystick'),knob=q('.m07-knob');
  paintCompanionPortrait(portrait.querySelector('canvas').getContext('2d'),hero,128);
  const toggle=(panel,button)=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));};
  portrait.onclick=()=>{info.hidden=true;objective.setAttribute('aria-expanded','false');toggle(detail,portrait);};
  objective.onclick=()=>{detail.hidden=true;portrait.setAttribute('aria-expanded','false');toggle(info,objective);};
  let paused=false,ptr=null,wasAction=false,lastZone='';
  const setPaused=value=>{paused=!!value;pause.hidden=!paused;if(paused){onMove(0,0);onRun(false);document.exitPointerLock?.();}else resetStick();};
  q('.m07-pause').onclick=()=>setPaused(true);
  q('[data-resume]').onclick=()=>setPaused(false);
  window.addEventListener('keydown',e=>{if(e.code!=='Escape'||!document.body.classList.contains('m07-playing')||!document.getElementById('doc')?.hidden)return;e.preventDefault();e.stopImmediatePropagation();setPaused(!paused);},true);
  action.onclick=()=>{if(!paused&&!action.hidden)onInteract();};
  function resetStick(){ptr=null;onMove(0,0);onRun(false);knob.style.transform='translate(0px,0px)';}
  function steer(e){
    const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,
      max=r.width*.42,scale=Math.min(1,max/Math.max(1,Math.hypot(dx,dy))),x=dx*scale,z=dy*scale;
    knob.style.transform=`translate(${x}px,${z}px)`;onMove(x/max,z/max);onRun(Math.hypot(x,z)>max*.82);
  }
  stick.addEventListener('pointerdown',e=>{if(paused)return;ptr=e.pointerId;stick.setPointerCapture(e.pointerId);steer(e);});
  stick.addEventListener('pointermove',e=>{if(ptr===e.pointerId)steer(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(ptr===e.pointerId)resetStick();});
  return {
    get paused(){return paused;},
    update({zone='',canInteract=false,finished=false}={}){
      if(zone!==lastZone){lastZone=zone;q('.m07-zone').textContent='SECTEUR : '+zone.toUpperCase();}
      const show=!!canInteract&&!finished&&!paused;
      if(show!==wasAction){action.hidden=!show;wasAction=show;}
    },
    dispose(){root.remove();document.body.classList.remove('m07-hud-enabled');}
  };
}

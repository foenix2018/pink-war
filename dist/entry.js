import {graphicsProfile} from './renderer-policy.js';
import {GAME_VERSION,showLaunchError,compatibleLaunchURL} from './launch-ui.js';

// This menu has no Three.js or character imports. It is usable before the user
// chooses to download/build the 3D scene, including inside an iPhone web view.
const $=id=>document.getElementById(id);
let character='ghju',mode='campaign',view='third',loading=false,modulePromise=null;
const settings={sound:true,music:true,sensitivity:1,quality:'auto'};
try{character=localStorage.getItem('pink-war-character')==='lylu'?'lylu':'ghju';Object.assign(settings,JSON.parse(localStorage.getItem('rosee-settings')||'{}'));}catch{}
const profile=graphicsProfile(navigator,settings.quality);
document.documentElement.classList.toggle('iphone-launch',profile.ios);
function save(){try{localStorage.setItem('pink-war-character',character);localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}}
function refresh(){
  document.documentElement.dataset.universe=character==='lylu'?'blue':'pink';
  for(const b of document.querySelectorAll('[data-character]')){const yes=b.dataset.character===character;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  for(const b of document.querySelectorAll('[data-view]')){const yes=b.dataset.view===view;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}
  $('mission-title').textContent=mode==='campaign'?'01 — Le dernier signal':'Survie — Les brèches';
  $('mission-description').textContent=mode==='campaign'?'Laboratoire abandonné, rue sous surveillance et relais en hauteur. Une trace de votre famille.':'Vingt vagues de machines et six armes à récupérer.';
  $('play-label').textContent=loading?'CHARGEMENT…':mode==='campaign'?'JOUER LE NIVEAU 1':'LANCER LA SURVIE';
  $('play-button').disabled=loading;
  $('sound-setting').checked=!!settings.sound;$('music-setting').checked=settings.music!==false;
  $('sensitivity').value=settings.sensitivity;$('quality').value=['auto','low','high'].includes(settings.quality)?settings.quality:'auto';
  $('launch-status').textContent=loading?'Chargement du secteur…':`V. ${GAME_VERSION} · prêt à lancer`;
}
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>{if(!loading){character=b.dataset.character;save();refresh();}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(!loading){mode=b.dataset.mode;refresh();}};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{if(!loading){view=b.dataset.view;refresh();}};
function panel(id){for(const d of document.querySelectorAll('dialog[open]'))d.close();$(id).showModal();}
$('how-button').onclick=()=>panel('help-dialog');$('lore-button').onclick=()=>panel('lore-dialog');$('settings-button').onclick=()=>panel('settings-dialog');
for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
const earlyCancel=e=>e.currentTarget.close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',earlyCancel);
$('sound-button').onclick=()=>{settings.sound=!settings.sound;save();refresh();};
$('sound-setting').onchange=e=>{settings.sound=e.target.checked;save();};
$('music-setting').onchange=e=>{settings.music=e.target.checked;save();};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);save();};
$('quality').onchange=e=>{settings.quality=e.target.value;save();};
async function begin(intent='play'){
  if(loading)return;loading=true;refresh();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('loading-error').hidden=true;$('loading-screen').hidden=false;
  $('loading-status').textContent='Chargement du décor et des équipements…';
  window.__PINKWAR_BOOT_OPTIONS={characterId:character,mode,view,settings:{...settings},intent};
  // Open the audio context within the user's gesture, before the module fetch.
  if(settings.sound||settings.music!==false)try{const Audio=window.AudioContext||window.webkitAudioContext;
    window.__PINKWAR_BOOT_AUDIO ||=new Audio();window.__PINKWAR_BOOT_AUDIO.resume().catch(()=>{});}catch{}
  try{
    modulePromise ||=import('./game.js?v=3.33');await modulePromise;
    for(const d of document.querySelectorAll('dialog'))d.removeEventListener('cancel',earlyCancel);
    if(!window.__PINKWAR||window.__PINKWAR.snapshot().phase==='error')throw new Error('Initialisation interrompue.');
    loading=false;
  }catch(error){
    if($('loading-error').hidden)showLaunchError(error,'chargement des fichiers');
    modulePromise=null;loading=false;refresh();
    $('play-label').textContent='RELANCER EN MODE COMPATIBLE';
    $('play-button').onclick=()=>location.assign(compatibleLaunchURL());
  }
}
$('play-button').onclick=()=>begin('play');$('vr-button').onclick=()=>begin('vr');
$('outfit-button').disabled=false;$('outfit-button').onclick=()=>begin('outfit');
$('loading-screen').hidden=true;
$('online-launch').hidden=location.protocol!=='file:';
refresh();
window.__PINKWAR_ENTRY=Object.freeze({version:GAME_VERSION,snapshot:()=>({character,mode,view,loading,ios:profile.ios})});

import {graphicsProfile} from './renderer-policy.js';
import {GAME_VERSION,showLaunchError,compatibleLaunchURL} from './launch-ui.js';
import {createLobbyTrack} from './music-tracks.js';

// This menu has no Three.js or character imports. It is usable before the user
// chooses to download/build the 3D scene, including inside an iPhone web view.
const $=id=>document.getElementById(id);
let character='ghju',mode='campaign',view='fps',trainingWeapon=0,loading=false,modulePromise=null;
const settings={sound:true,music:true,sensitivity:1,quality:'auto'};
const lobbyTrack=createLobbyTrack();
window.__PINKWAR_LOBBY_MUSIC=lobbyTrack;
try{character=localStorage.getItem('pink-war-character')==='lylu'?'lylu':'ghju';Object.assign(settings,JSON.parse(localStorage.getItem('rosee-settings')||'{}'));const stored=Number(localStorage.getItem('pink-war-training-weapon'));if(Number.isInteger(stored)&&stored>=0&&stored<5)trainingWeapon=stored;}catch{}
const profile=graphicsProfile(navigator,settings.quality);
document.documentElement.classList.toggle('iphone-launch',profile.ios);
function save(){try{localStorage.setItem('pink-war-character',character);localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}}
function refresh(){
  document.documentElement.dataset.universe=character==='lylu'?'blue':'pink';
  for(const b of document.querySelectorAll('[data-character]')){const yes=b.dataset.character===character;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  $('mission-title').textContent=mode==='campaign'?'01 — Le dernier signal':mode==='arena'?'Survie — Les brèches':'Centre de tir — Qualification';
  $('mission-description').textContent=mode==='campaign'?'Laboratoire abandonné, rue sous surveillance et relais en hauteur. Une trace de votre famille.':mode==='arena'?'Vingt vagues de machines et six armes à récupérer.':'Cibles fixes de 15 à 60 mètres, cibles mobiles latérales et avant-arrière. Vitesse croissante, score et précision.';
  $('play-label').textContent=loading?'CHARGEMENT…':mode==='campaign'?'JOUER LE NIVEAU 1':mode==='arena'?'LANCER LA SURVIE':'ENTRER AU STAND DE TIR';
  $('play-button').disabled=loading;
  $('sound-setting').checked=!!settings.sound;$('music-setting').checked=settings.music!==false;
  $('sensitivity').value=settings.sensitivity;$('quality').value=['auto','low','high'].includes(settings.quality)?settings.quality:'auto';
  $('launch-status').textContent=loading?'Chargement du secteur…':`V. ${GAME_VERSION} · prêt à lancer`;
}
document.addEventListener('pointerdown',event=>{
  // Safari/iOS forbids autoplay: the first menu gesture unlocks the soundtrack.
  if(loading||window.__PINKWAR||!settings.music||event.target.closest('#play-button,#vr-button,#outfit-button'))return;
  lobbyTrack.start();
},{capture:true});
document.addEventListener('keydown',()=>{if(!loading&&!window.__PINKWAR&&settings.music)lobbyTrack.start();},{once:true});
lobbyTrack.setEnabled(settings.music!==false);
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>{if(!loading){character=b.dataset.character;save();refresh();}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(!loading){mode=b.dataset.mode;refresh();}};
function panel(id){for(const d of document.querySelectorAll('dialog[open]'))d.close();$(id).showModal();}
$('how-button').onclick=()=>panel('help-dialog');$('lore-button').onclick=()=>panel('lore-dialog');$('settings-button').onclick=()=>panel('settings-dialog');
for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
const earlyCancel=e=>e.currentTarget.close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',earlyCancel);
$('sound-button').onclick=()=>{settings.sound=!settings.sound;save();refresh();};
$('sound-setting').onchange=e=>{settings.sound=e.target.checked;save();};
$('music-setting').onchange=e=>{settings.music=e.target.checked;lobbyTrack.setEnabled(settings.music);if(settings.music)lobbyTrack.start();save();};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);save();};
$('quality').onchange=e=>{settings.quality=e.target.value;save();};
async function begin(intent='play'){
  if(loading)return;loading=true;lobbyTrack.pause();refresh();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('loading-error').hidden=true;$('loading-screen').hidden=false;
  $('loading-status').textContent='Chargement du décor et des équipements…';
  window.__PINKWAR_BOOT_OPTIONS={characterId:character,mode,view,trainingWeaponIndex:trainingWeapon,settings:{...settings},intent};
  // Open the audio context within the user's gesture, before the module fetch.
  if(settings.sound||settings.music!==false)try{const Audio=window.AudioContext||window.webkitAudioContext;
    window.__PINKWAR_BOOT_AUDIO ||=new Audio();window.__PINKWAR_BOOT_AUDIO.resume().catch(()=>{});}catch{}
  try{
    modulePromise ||=import('./game.js?v=3.45');await modulePromise;
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

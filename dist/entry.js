import {setScreenMusic,screenMusicSnapshot} from './menu-music.js';
import {graphicsProfile} from './renderer-policy.js';
import {GAME_VERSION,showLaunchError,compatibleLaunchURL} from './launch-ui.js';
import {syncMenuArtwork} from './menu-art.js?v=3.63.17';
import {showStoryPrologue} from './story-prologue.js';
import {createMissionLoading} from './mission-loading.js';
import {readM01Checkpoint} from './checkpoint-index.js';

// This menu has no Three.js or character imports. It is usable before the user
// chooses to download/build the 3D scene, including inside an iPhone web view.
const $=id=>document.getElementById(id);
let character='ghju',mode='campaign',view='fps',trainingWeapon=0,loading=false,modulePromise=null;
const settings={sound:true,music:true,sensitivity:1,quality:'auto'};
try{character=localStorage.getItem('pink-war-character')==='lylu'?'lylu':'ghju';Object.assign(settings,JSON.parse(localStorage.getItem('rosee-settings')||'{}'));const stored=Number(localStorage.getItem('pink-war-training-weapon'));if(Number.isInteger(stored)&&stored>=0&&stored<7&&stored!==5)trainingWeapon=stored;}catch{}
const profile=graphicsProfile(navigator,settings.quality);
document.documentElement.classList.toggle('iphone-launch',profile.ios);
function save(){try{localStorage.setItem('pink-war-character',character);localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}}
function refresh(){
  setScreenMusic(loading?'loading':'menu',mode==='campaign2'?2:1,settings.music!==false);
  document.documentElement.dataset.universe=character==='lylu'?'blue':'pink';
  syncMenuArtwork(character,mode);
  $('character-choice-status').textContent=character==='lylu'?'LYLU · UNIVERS BLEU':'GHJU · UNIVERS ROSE';
  $('lobby-character-name').textContent=character==='lylu'?'LYLU':'GHJU';
  $('character-description').textContent=character==='lylu'?'LYLU cherche sa sœur GHJU dans les ruines de Vesper.':'GHJU cherche son frère LYLU dans les ruines de Vesper.';
  for(const b of document.querySelectorAll('[data-character]')){const yes=b.dataset.character===character;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  $('mission-title').textContent=mode==='campaign2'?'02 — Sous les Néons':mode==='campaign'?'01 — Le dernier signal':mode==='arena'?'Survie — Les brèches':'Centre de tir — Qualification';
  $('mission-description').textContent=mode==='campaign2'?'Bas-Niveaux de Vesper : enclave, marché cyberpunk, HELIX et tour de transit. Sauver les civils ou récupérer les preuves.':mode==='campaign'?'Laboratoire abandonné, rue sous surveillance et relais en hauteur. Une trace de votre famille.':mode==='arena'?'Vingt vagues de machines et six armes à récupérer.':'Cibles fixes de 15 à 60 mètres, cibles mobiles latérales et avant-arrière. Vitesse croissante, score et précision.';
  $('play-label').textContent=loading?'CHARGEMENT…':mode==='campaign2'?'JOUER LE NIVEAU 2':mode==='campaign'?'JOUER LE NIVEAU 1':mode==='arena'?'LANCER LA SURVIE':'ENTRER AU STAND DE TIR';
  $('play-button').disabled=loading;
  $('sound-setting').checked=!!settings.sound;$('music-setting').checked=settings.music!==false;
  $('sensitivity').value=settings.sensitivity;$('quality').value=['auto','low','high'].includes(settings.quality)?settings.quality:'auto';
  $('launch-status').textContent=loading?'Chargement du secteur…':`V. ${GAME_VERSION} · prêt à lancer`;
  $('resume-mission').hidden=mode!=='campaign'||!readM01Checkpoint(character)||loading;
}
const resumeButton=document.createElement('button');resumeButton.id='resume-mission';resumeButton.type='button';resumeButton.hidden=true;
resumeButton.textContent='REPRENDRE AU POINT DE CONTRÔLE';resumeButton.style.cssText='margin-top:10px;padding:10px 0;background:none;border:0;border-bottom:1px solid #84958d;color:#dce8e1;font:600 11px system-ui;letter-spacing:.05em;cursor:pointer';
$('play-button').after(resumeButton);
function openMission(mission,{resume=false,vr=false}={}){
  loading=true;refresh();save();for(const d of document.querySelectorAll('dialog[open]'))d.close();
  const cover=createMissionLoading({mission,characterId:character});cover.set(.04,'Ouverture du secteur');
  const target=mission===2?'./level2-test.html':'./vesper-level1-v7.html';
  const url=new URL(target,location.href);url.searchParams.set('source','campaign');url.searchParams.set('autostart','1');url.searchParams.set('character',character);url.searchParams.set('v',GAME_VERSION);
  if(mission===1)url.searchParams.set('prologue','done');
  if(resume)url.searchParams.set('resume','1');
  if(vr)url.searchParams.set('vr','1');
  if(new URLSearchParams(location.search).get('renderer')==='webgl')url.searchParams.set('renderer','webgl');
  if(settings.quality==='low')url.searchParams.set('quality',mission===2?'low':'performance');
  location.assign(url.href);
}
resumeButton.onclick=()=>{if(!loading)openMission(1,{resume:true});};
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>{if(!loading){character=b.dataset.character;save();refresh();}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(!loading){mode=b.dataset.mode;refresh();}};
function panel(id){for(const d of document.querySelectorAll('dialog[open]'))d.close();$(id).showModal();}
$('how-button').onclick=()=>panel('help-dialog');$('lore-button').onclick=()=>panel('lore-dialog');$('settings-button').onclick=()=>panel('settings-dialog');
for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
const earlyCancel=e=>e.currentTarget.close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',earlyCancel);
$('sound-button').onclick=()=>{settings.sound=!settings.sound;save();refresh();};
$('sound-setting').onchange=e=>{settings.sound=e.target.checked;save();};
$('music-setting').onchange=e=>{settings.music=e.target.checked;save();refresh();};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);save();};
$('quality').onchange=e=>{settings.quality=e.target.value;save();};
async function begin(intent='play',afterPrologue=false){
  if(loading)return;
  if(mode==='campaign'&&['play','vr'].includes(intent)&&!afterPrologue){
    loading=true;refresh();save();for(const d of document.querySelectorAll('dialog[open]'))d.close();
    showStoryPrologue({characterId:character,...settings,onComplete:()=>{loading=false;begin(intent,true);}});return;
  }
  // Niveau 1 Vesper V7 — écran et tactile. La campagne classique et WebXR
  // restent accessibles par ?classic=1 ou via le lancement VR.
  if(mode==='campaign' && intent==='play' && !new URLSearchParams(location.search).has('classic')){
    openMission(1);
    return;
  }
  if(mode==='campaign2'){
    openMission(2,{vr:intent==='vr'});return;
  }
  loading=true;refresh();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('loading-error').hidden=true;$('loading-screen').hidden=false;
  $('loading-status').textContent='Chargement du décor et des équipements…';
  window.__PINKWAR_BOOT_OPTIONS={characterId:character,mode,view,trainingWeaponIndex:trainingWeapon,settings:{...settings},intent};
  // Open the audio context within the user's gesture, before the module fetch.
  if(settings.sound||settings.music!==false)try{const Audio=window.AudioContext||window.webkitAudioContext;
    window.__PINKWAR_BOOT_AUDIO ||=new Audio();window.__PINKWAR_BOOT_AUDIO.resume().catch(()=>{});}catch{}
  try{
    modulePromise ||=import('./game.js?v=3.63.17');await modulePromise;
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
const replay=document.createElement('button');replay.type='button';replay.textContent='REVOIR LE PROLOGUE';replay.id='replay-prologue';
replay.onclick=()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();showStoryPrologue({characterId:character,...settings,replay:true});};
$('lore-dialog').append(replay);
$('loading-screen').hidden=true;
$('online-launch').hidden=location.protocol!=='file:';
refresh();
window.__PINKWAR_ENTRY=Object.freeze({version:GAME_VERSION,snapshot:()=>({character,mode,view,loading,ios:profile.ios,music:screenMusicSnapshot()})});

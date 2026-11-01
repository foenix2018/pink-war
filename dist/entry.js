import {setScreenMusic,screenMusicSnapshot} from './menu-music.js';
import {DesktopGamepadInput} from './desktop-input.js';
import {createGamepadAid,gamepadsNow} from './ios-gamepad.js';
import {graphicsProfile} from './renderer-policy.js';
import {GAME_VERSION,showLaunchError,compatibleLaunchURL} from './launch-ui.js';
import {syncMenuArtwork} from './menu-art.js?v=3.74.0';
import {showStoryPrologue} from './story-prologue.js';
import {createMissionLoading} from './mission-loading.js';
import {readM01Checkpoint} from './checkpoint-index.js';
import {mountViewControl,readPreferredView,savePreferredView} from './view-options.js?v=3.74.0';

// This menu has no Three.js or character imports. It is usable before the user
// chooses to download/build the 3D scene, including inside an iPhone web view.
const $=id=>document.getElementById(id);
let character='ghju',mode='campaign',view=readPreferredView(),trainingWeapon=0,loading=false,modulePromise=null;
const settings={sound:true,music:true,sensitivity:1,quality:'auto'};
try{character=localStorage.getItem('pink-war-character')==='lylu'?'lylu':'ghju';Object.assign(settings,JSON.parse(localStorage.getItem('rosee-settings')||'{}'));const stored=Number(localStorage.getItem('pink-war-training-weapon'));if(Number.isInteger(stored)&&stored>=0&&stored<7&&stored!==5)trainingWeapon=stored;}catch{}
const requestedMode=new URLSearchParams(location.search).get('mode');
if(['arena','training','campaign','campaign2','campaign3','campaign4','ligne9','breach'].includes(requestedMode))mode=requestedMode;
const profile=graphicsProfile(navigator,settings.quality);
document.documentElement.classList.toggle('iphone-launch',profile.ios);
function save(){try{localStorage.setItem('pink-war-character',character);localStorage.setItem('rosee-settings',JSON.stringify(settings));}catch{}}
function refresh(){
  setScreenMusic(loading?'loading':'menu',mode==='campaign2'?2:mode==='campaign3'||mode==='campaign4'?3:1,settings.music!==false);
  document.documentElement.dataset.universe=character==='lylu'?'blue':'pink';
  syncMenuArtwork(character,mode);
  $('character-choice-status').textContent=character==='lylu'?'LYLU · UNIVERS BLEU':'GHJU · UNIVERS ROSE';
  $('lobby-character-name').textContent=character==='lylu'?'LYLU':'GHJU';
  $('character-description').textContent=character==='lylu'?'LYLU cherche sa sœur GHJU dans les ruines de Vesper.':'GHJU cherche son frère LYLU dans les ruines de Vesper.';
  for(const b of document.querySelectorAll('[data-character]')){const yes=b.dataset.character===character;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));}
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  document.querySelector('.mission-kicker').textContent=mode==='campaign4'?'ACTE I · CHAPITRE 04':mode==='campaign3'?'ACTE I · CHAPITRE 03':mode==='campaign2'?'ACTE I · CHAPITRE 02':mode==='campaign'?'ACTE I · CHAPITRE 01':'PINK WARS · JOUER';
  $('mission-title').textContent=mode==='breach'?'Opération Brèche — mission bonus':mode==='ligne9'?'05 — La Ligne Noyée':mode==='campaign4'?'04 — Le Protocole Interdit':mode==='campaign3'?'03 — Le Convoi des Oubliés':mode==='campaign2'?'02 — Les Profondeurs':mode==='campaign'?'01 — Le Dernier Signal':mode==='arena'?'Survie — Les brèches':'Centre de tir — Qualification';
  $('mission-description').textContent=mode==='breach'?'Six secteurs industriels, deux relais, trois stabilisateurs et un gardien avant extraction.':mode==='ligne9'?'Ligne 9 inondée sous les Halles-Basses : rétablir le courant, relancer les pompes P9, ouvrir l’écluse et découvrir ce qu’ORDRE cache sous l’eau. Mission longue avec points de contrôle.':mode==='campaign4'?'Avec la cellule AEGIS de Mara Voss, à la station énergétique Est de JANUS : deux relais, trois stabilisateurs, le gardien de portique et une archive oubliée des anciens systèmes de secours. Mission longue avec points de contrôle.':mode==='campaign3'?'Secteur 03 de Vesper, de nuit : avec AEGIS, escorter l’ambulance d’Inès jusqu’à la gare de fret de l’Anneau logistique, sur la piste des prisonniers du Directoire. Relais A3, balise du pylône, échangeur bloqué. Mission longue avec points de contrôle.':mode==='campaign2'?'Bas-Niveaux de Vesper, tenus par le Directoire : enclave, marché couvert et tour de transit. Trouver un module de décryptage, libérer les prisonniers ou récupérer les archives HELIX.':mode==='campaign'?'Une transmission porte l’indicatif de vos parents, VEILLE-4. Station de secours abandonnée, rue sous surveillance, relais en hauteur et Archives végétales.':mode==='arena'?'Vingt vagues de machines et six armes à récupérer.':'Cibles fixes de 15 à 60 mètres, cibles mobiles latérales et avant-arrière. Vitesse croissante, score et précision.';
  $('play-label').textContent=loading?'CHARGEMENT…':mode==='ligne9'?'JOUER LE CHAPITRE 05':mode==='campaign4'?'JOUER LE CHAPITRE 04':mode==='campaign3'?'JOUER LE CHAPITRE 03':mode==='campaign2'?'JOUER LE CHAPITRE 02':mode==='campaign'?(readM01Checkpoint(character)?'CONTINUER':'JOUER'):mode==='arena'?'LANCER LA SURVIE':'ENTRER AU STAND DE TIR';
  $('play-button').disabled=loading;
  $('sound-setting').checked=!!settings.sound;$('music-setting').checked=settings.music!==false;
  $('sensitivity').value=settings.sensitivity;$('quality').value=['auto','low','balanced','high'].includes(settings.quality)?settings.quality:'auto';
  $('launch-status').textContent=loading?'Chargement du secteur…':`V. ${GAME_VERSION} · prêt à lancer`;
  $('resume-mission').hidden=true; // Replaced by the CONTINUER primary action when a checkpoint exists.
}
const resumeButton=document.createElement('button');resumeButton.id='resume-mission';resumeButton.type='button';resumeButton.hidden=true;
resumeButton.textContent='REPRENDRE AU POINT DE CONTRÔLE';resumeButton.style.cssText='margin-top:10px;padding:10px 0;background:none;border:0;border-bottom:1px solid #84958d;color:#dce8e1;font:600 11px system-ui;letter-spacing:.05em;cursor:pointer';
$('play-button').after(resumeButton);
// Chapter 05 opens on its own briefing page (the player starts the descent from there).
function openLigne9(){
  save();const url=new URL('./ligne9.html',location.href);url.searchParams.set('character',character);url.searchParams.set('v',GAME_VERSION);
  if(new URLSearchParams(location.search).get('renderer')==='webgl')url.searchParams.set('renderer','webgl');
  if(settings.quality!=='auto')url.searchParams.set('quality',settings.quality);
  location.assign(url.href);
}
function openMission(mission,{resume=false,vr=false}={}){
  loading=true;refresh();save();for(const d of document.querySelectorAll('dialog[open]'))d.close();
  const cover=createMissionLoading({mission,characterId:character});cover.set(.04,'Ouverture du secteur');
  const target=mission===2?'./level2-test.html':mission===3?'./niveau3.html':mission===4?'./niveau4.html':'./vesper-level1-v7.html';
  const url=new URL(target,location.href);url.searchParams.set('source','campaign');url.searchParams.set('autostart','1');if(mission===3)url.searchParams.set('chapter','3');url.searchParams.set('character',character);url.searchParams.set('v',GAME_VERSION);
  if(mission===1)url.searchParams.set('prologue','done');
  if(resume)url.searchParams.set('resume','1');
  if(vr)url.searchParams.set('vr','1');
  if(new URLSearchParams(location.search).get('renderer')==='webgl')url.searchParams.set('renderer','webgl');
  if(settings.quality!=='auto'&&!(mission>=3&&settings.quality!=='low'))url.searchParams.set('quality',settings.quality);
  location.assign(url.href);
}
resumeButton.onclick=()=>{if(!loading)openMission(1,{resume:true});};
for(const b of document.querySelectorAll('[data-character]'))b.onclick=()=>{if(!loading){character=b.dataset.character;save();refresh();}};
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>{if(!loading){mode=b.dataset.mode;refresh();}};
const lobby=$('lobby'),chapters=$('story-chapters');
function showStory(show){lobby.classList.toggle('story-page',show);chapters.hidden=!show;}
$('story-open').onclick=()=>{if(!loading)showStory(true);};
$('story-back').onclick=()=>showStory(false);
for(const b of document.querySelectorAll('[data-chapter]'))b.onclick=()=>{if(loading)return;mode=b.dataset.chapter;showStory(false);refresh();};
function panel(id){for(const d of document.querySelectorAll('dialog[open]'))d.close();$(id).showModal();}
$('how-button').onclick=()=>panel('help-dialog');$('lore-button').onclick=()=>panel('lore-dialog');$('settings-button').onclick=()=>panel('settings-dialog');$('pw-glass-settings').onclick=()=>panel('settings-dialog');
for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
const earlyCancel=e=>e.currentTarget.close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',earlyCancel);
$('sound-button').onclick=()=>{settings.sound=!settings.sound;save();refresh();};
$('sound-setting').onchange=e=>{settings.sound=e.target.checked;save();};
$('music-setting').onchange=e=>{settings.music=e.target.checked;save();refresh();};
$('sensitivity').oninput=e=>{settings.sensitivity=Number(e.target.value);save();};
$('quality').onchange=e=>{settings.quality=e.target.value;save();};
const earlyViewControl=mountViewControl($('settings-dialog'),{getView:()=>view,onSelect:next=>{view=next;savePreferredView(view);}});
$('settings-dialog').querySelector('.setting-row').before(earlyViewControl.row);
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
  if(mode==='campaign3'){
    openMission(3,{vr:false});return;
  }
  if(mode==='campaign4'){
    openMission(4,{vr:false});return;
  }
  if(mode==='campaign2'){
    openMission(2,{vr:intent==='vr'});return;
  }
  if(mode==='ligne9'){openLigne9();return;}
  loading=true;refresh();
  for(const d of document.querySelectorAll('dialog[open]'))d.close();
  $('loading-error').hidden=true;$('loading-screen').hidden=false;
  $('loading-status').textContent='Chargement du décor et des équipements…';
  window.__PINKWAR_BOOT_OPTIONS={characterId:character,mode,view,trainingWeaponIndex:trainingWeapon,settings:{...settings},intent};
  // Open the audio context within the user's gesture, before the module fetch.
  if(settings.sound||settings.music!==false)try{const Audio=window.AudioContext||window.webkitAudioContext;
    window.__PINKWAR_BOOT_AUDIO ||=new Audio();window.__PINKWAR_BOOT_AUDIO.resume().catch(()=>{});}catch{}
  try{
    modulePromise ||=import('./game.js?v=3.86-robot-destruction-audio');await modulePromise;
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
$('play-button').onclick=()=>{if(!loading&&mode==='campaign'&&readM01Checkpoint(character))openMission(1,{resume:true});else begin('play');};$('vr-button').onclick=()=>begin('vr');
$('outfit-button').disabled=false;$('outfit-button').onclick=()=>begin('outfit');
const replay=document.createElement('button');replay.type='button';replay.textContent='REVOIR LE PROLOGUE';replay.id='replay-prologue';
replay.onclick=()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();showStoryPrologue({characterId:character,...settings,replay:true});};
$('lore-dialog').append(replay);
$('loading-screen').hidden=true;
$('online-launch').hidden=location.protocol!=='file:';
refresh();
// iOS Safari / DualShock 4: controller navigation works before any 3D code is
// loaded. The controller must be neutral once before its first intentional press.
createGamepadAid();
const lobbyPad=new DesktopGamepadInput();
let lobbyPrevious=[],lobbyPadKey=null;
const padPressed=(pad,index)=>!!pad?.buttons[index]?.pressed||(pad?.buttons[index]?.value||0)>.5;
function pollLobbyController(){
  if(document.hidden||loading){lobbyPad.select([]);lobbyPrevious=[];lobbyPadKey=null;requestAnimationFrame(pollLobbyController);return;}
  const pad=lobbyPad.select(gamepadsNow(),{focused:!document.hidden});
  const key=lobbyPad.activeKey;
  if(key!==lobbyPadKey){lobbyPadKey=key;lobbyPrevious=pad?.buttons.map(b=>padPressed(pad,pad.buttons.indexOf(b)))||[];}
  const current=pad?.buttons.map((_,i)=>padPressed(pad,i))||[];
  const edge=i=>!!current[i]&&!lobbyPrevious[i];
  const selectedMode=()=>['campaign','campaign2','campaign3','training','arena'].indexOf(mode);
  const choices=['campaign','campaign2','campaign3','training','arena'];
  if(edge(14)||edge(15)){
    const dir=edge(14)?-1:1;
    mode=choices[(selectedMode()+dir+choices.length)%choices.length];
    if(!chapters.hidden)showStory(false);refresh();
  }
  if(edge(12)||edge(13)||edge(4)||edge(5)){
    character=(edge(12)||edge(4))?'ghju':'lylu';save();refresh();
  }
  if(edge(3))showStory(chapters.hidden);
  if(edge(1)){if(!chapters.hidden)showStory(false);else for(const d of document.querySelectorAll('dialog[open]'))d.close();}
  if(edge(9))panel('help-dialog');
  if(edge(2))panel('settings-dialog');
  if(edge(0)&&!document.querySelector('dialog[open]')){
    if(!chapters.hidden)showStory(false);
    void begin('play');
  }
  lobbyPrevious=current;
  requestAnimationFrame(pollLobbyController);
}
requestAnimationFrame(pollLobbyController);

window.__PINKWAR_ENTRY=Object.freeze({version:GAME_VERSION,snapshot:()=>({character,mode,view,loading,ios:profile.ios,music:screenMusicSnapshot()})});

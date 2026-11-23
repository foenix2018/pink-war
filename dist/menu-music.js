import {createMissionMusic} from './mission-music.js';
import {createMusicBed} from './music-tracks.js';
import {scoreFor,scoreMix} from './score-catalogue.js';
// One page owner: menu/loading and gameplay share a context and never overlap.
let disposed=false;
let surface='paused',level=1,enabled=true,menuPlayer=null,gamePlayer=null,activePlayer=null,context=null,unlocked=false,situation={},lastSample=-Infinity,section='exploration';
try{enabled=JSON.parse(localStorage.getItem('rosee-settings')||'{}').music!==false;}catch{}
try{unlocked=window.sessionStorage.getItem('pink-war-menu-audio-unlocked')==='1';}catch{}
const allowed=()=>enabled&&['menu','loading','gameplay'].includes(surface)&&!(typeof document!=='undefined'&&document.hidden);
function sync(restart=false){
 if(disposed)return;
 if(!allowed()){menuPlayer?.pause();gamePlayer?.pause();activePlayer=null;return;}
 if(!unlocked)return;
 try{
  const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
  context=window.__PINKWAR_BOOT_AUDIO ||=new AudioContext();
  const gameplay=surface==='gameplay',track=scoreFor(level,situation);
  if(gameplay)gamePlayer ||=createMusicBed(null,{track});else menuPlayer ||=createMissionMusic(level,{track});
  const next=gameplay?gamePlayer:menuPlayer;
  if(next!==activePlayer){activePlayer?.pause();activePlayer=next;restart=true;}
  next.setTrack(track);next.setContext(context);next.setEnabled(true);
  if(restart||context.currentTime-lastSample>=.25){
   const mix=scoreMix({...situation,surface,level});section=mix.section;next.setMix(mix.gain);lastSample=context.currentTime;
  }
  if(restart)next.start(context);else next.update(0,{active:true});
  if(context.state==='suspended')void context.resume().then(()=>{if(allowed())sync(true);}).catch(()=>{});
 }catch{}
}
export function setScreenMusic(next,mission=level,on=enabled,options){
 const missionNumber=Number(mission)||1;
 const changed=surface!==next||level!==missionNumber||enabled!==!!on||!!options&&(options.mode!==situation.mode||options.dialogue!==situation.dialogue||options.finale!==situation.finale);
 level=missionNumber;surface=next;enabled=!!on;if(options)situation=options;sync(changed);
}
// Called only by an audible player shot, so music yields to the weapon transient.
export function duckScreenMusic(seconds=.18){activePlayer?.duck(seconds);}
export function setMusicEnabled(value){
 enabled=!!value;
 try{const settings=JSON.parse(localStorage.getItem('rosee-settings')||'{}');localStorage.setItem('rosee-settings',JSON.stringify({...settings,music:enabled}));}catch{}
 if(typeof document!=='undefined')for(const input of document.querySelectorAll?.('[data-music-setting],#music-setting')||[])input.checked=enabled;
 sync(true);return enabled;
}
export function screenMusicSnapshot(){return {surface,level,enabled,playing:activePlayer?.playing||false,source:activePlayer?.source||null,...activePlayer?.stats,section};}
if(typeof document!=='undefined'){
 const unlock=()=>{unlocked=true;try{window.sessionStorage.setItem('pink-war-menu-audio-unlocked','1');}catch{}sync(true);};
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>sync(true));
 window.addEventListener('pagehide',event=>{menuPlayer?.pause();gamePlayer?.pause();activePlayer=null;if(!event.persisted){disposed=true;menuPlayer?.dispose();gamePlayer?.dispose();menuPlayer=gamePlayer=null;}});
 window.addEventListener('pageshow',()=>sync(true));
}

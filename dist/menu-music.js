import {createMissionMusic} from './mission-music.js';
import {createMusicBed} from './music-tracks.js';
// One page owner: menu/loading and gameplay share a context and never overlap.
let disposed=false;
let surface='paused',level=1,enabled=true,menuPlayer=null,gamePlayer=null,activePlayer=null,context=null,unlocked=false;
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
  const gameplay=surface==='gameplay';
  if(gameplay)gamePlayer ||=createMusicBed();else menuPlayer ||=createMissionMusic(level);
  const next=gameplay?gamePlayer:menuPlayer;
  if(next!==activePlayer){activePlayer?.pause();activePlayer=next;restart=true;}
  next.setContext(context);next.setEnabled(true);
  if(restart)next.start(context);else next.update(0,{active:true});
  if(context.state==='suspended')void context.resume().then(()=>{if(allowed())sync(true);}).catch(()=>{});
 }catch{}
}
export function setScreenMusic(next,mission=level,on=enabled){
 const changed=surface!==next||enabled!==!!on;
 level=mission;surface=next;enabled=!!on;sync(changed);
}
export function screenMusicSnapshot(){return {surface,level,enabled,playing:activePlayer?.playing||false,source:activePlayer?.source||null,...activePlayer?.stats};}
if(typeof document!=='undefined'){
 const unlock=()=>{unlocked=true;try{window.sessionStorage.setItem('pink-war-menu-audio-unlocked','1');}catch{}sync(true);};
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>sync(true));
 window.addEventListener('pagehide',event=>{menuPlayer?.pause();gamePlayer?.pause();activePlayer=null;if(!event.persisted){disposed=true;menuPlayer?.dispose();gamePlayer?.dispose();menuPlayer=gamePlayer=null;}});
 window.addEventListener('pageshow',()=>sync(true));
}

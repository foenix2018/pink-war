import {createMissionMusic} from './mission-music.js';

// One stream per page, shared by the launcher and the loading cover. Gameplay
// and the prologue never activate these tracks. No AudioContext before a gesture.
let surface='gameplay',level=1,enabled=true,player=null,context=null,unlocked=false;
// Preserve only the user's audio-unlock intent across same-tab mission navigation.
// The browser still decides whether playback/resume is permitted on the next page.
try{unlocked=window.sessionStorage.getItem('pink-war-menu-audio-unlocked')==='1';}catch{}
const allowed=()=>enabled&&['menu','loading'].includes(surface);
function sync(){
 if(!allowed()){player?.pause();return;}
 if(!unlocked)return;
 try{
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)return;
  context=window.__PINKWAR_BOOT_AUDIO ||=new AudioContext();
  player ||=createMissionMusic(level);
  player.setEnabled(enabled);player.setContext(context);
  player.start(context);
  if(context.state==='suspended')void context.resume().then(()=>{if(allowed())player?.start(context);}).catch(()=>{});
 }catch{}
}
export function setScreenMusic(next,mission=level,on=enabled){
 const selected=mission===2?2:1;
 // All menus and loading screens now share the creator's selected score.
 level=selected;
 const changed=surface!==next||enabled!==!!on;
 surface=next;enabled=!!on;
 if(changed||!player)sync();
}
export function screenMusicSnapshot(){return {surface,level,enabled,playing:player?.playing||false,source:player?.source||null,...player?.stats};}
if(typeof document!=='undefined'){
 const unlock=()=>{unlocked=true;if(allowed())try{window.sessionStorage.setItem('pink-war-menu-audio-unlocked','1');}catch{}sync();};
 document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
 document.addEventListener('keydown',unlock,{capture:true});
 window.addEventListener('pagehide',event=>{player?.pause();if(!event.persisted){player?.dispose();player=null;}});
 window.addEventListener('pageshow',()=>sync());
}

// User-supplied score, streamed through the game's already unlocked audio context.
import {CHAPTER_SCORE} from './score-catalogue.js';
export const MISSION_TRACKS=CHAPTER_SCORE;
export function createMissionMusic(level,{mediaFactory=()=>new Audio(),track=MISSION_TRACKS[level]}={}){
 if(!track)throw new Error('Unknown music level');
 let ctx=null,media=null,node=null,gain=null,enabled=true,active=false,disposed=false,failed=false,pending=false,blocked=false,duckUntil=0,lastGain=-1,mixGain=.4,transition=null,generation=0;
 const hidden=()=>typeof document!=='undefined'&&document.hidden;
 const ready=()=>!disposed&&enabled&&active&&!hidden()&&ctx?.state==='running';
 function play(){
  if(!ready()||!media||pending||blocked||transition||failed||!media.paused)return;
  pending=true;const request=generation;
  try{Promise.resolve(media.play()).then(()=>{if(request!==generation)return;pending=false;if(!ready())media.pause();}).catch(error=>{
   if(request!==generation)return;pending=false;blocked=error?.name==='NotAllowedError';
   if(error?.name!=='NotAllowedError'&&error?.name!=='AbortError')failed=true;
  });}catch{pending=false;failed=true;}
 }
 function mix(){
  if(!gain)return;
  const target=ready()&&!transition?mixGain*(ctx.currentTime<duckUntil?.58:1):0;
  if(target!==lastGain){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setTargetAtTime(target,ctx.currentTime,target<lastGain?.035:.65);lastGain=target;}
  if(ready())play();else media?.pause();
 }
 function attach(context){
  if(disposed||!context?.createMediaElementSource)return false;if(ctx===context){mix();return true;}if(ctx)return false;
  try{ctx=context;media=mediaFactory();media.preload='none';media.loop=true;media.src=track.url;media.onerror=()=>{failed=true;};node=ctx.createMediaElementSource(media);gain=ctx.createGain();gain.gain.value=0;node.connect(gain);gain.connect(ctx.destination);mix();return true;}catch{failed=true;return false;}
 }
 function setTrack(next){
  if(disposed||!next||next.url===track.url)return false;
  track=next;generation++;pending=false;blocked=false;failed=false;duckUntil=0;
  if(transition){clearTimeout(transition);transition=null;}
  if(!media)return true;
  const swap=()=>{transition=null;if(disposed)return;media.pause();media.src=track.url;media.load();mix();};
  // Fade before replacing the single stream; no concurrent music voices or full-song buffers.
  if(ready()&&!media.paused){transition=setTimeout(swap,180);mix();}else swap();
  return true;
 }
 const retry=()=>{blocked=false;mix();},visibility=()=>{if(hidden())media?.pause();else mix();};
 if(typeof document!=='undefined'){document.addEventListener('pointerdown',retry,true);document.addEventListener('keydown',retry,true);document.addEventListener('visibilitychange',visibility);}
 return {setContext:attach,setTrack,
  setMix(value){mixGain=Math.max(0,Math.min(.55,Number(value)||0));mix();},
  start(context){blocked=false;if(context)attach(context);active=true;mix();return ready();},
  update(_dt,options={}){if('active'in options)active=!!options.active;mix();},
  pause(){active=false;mix();},setEnabled(value){enabled=!!value;mix();},
  duck(seconds=.18){if(ctx)duckUntil=Math.max(duckUntil,ctx.currentTime+Math.max(0,Math.min(10,seconds)));mix();},
  dispose(){if(disposed)return;active=false;mix();disposed=true;generation++;if(transition)clearTimeout(transition);transition=null;media?.pause();if(media){media.onerror=null;media.removeAttribute('src');media.load();}node?.disconnect();gain?.disconnect();if(typeof document!=='undefined'){document.removeEventListener('pointerdown',retry,true);document.removeEventListener('keydown',retry,true);document.removeEventListener('visibilitychange',visibility);}},
  get enabled(){return enabled;},get failed(){return failed;},get playing(){return ready()&&!!media&&!media.paused;},get source(){return track.url;},get section(){return 'mission';},
  get stats(){return {title:track.title,streaming:true,position:media?.currentTime||0,gain:lastGain,ducked:!!ctx&&ctx.currentTime<duckUntil,voices:media&&!media.paused?1:0,transitioning:!!transition};}
 };
}

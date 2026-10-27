// User-supplied score, streamed through the game's already unlocked audio context.
const MENU_SCORE=Object.freeze({title:'Velvet Siege',url:'./assets/music/velvet-siege.m4a?v=3.63.12'});
export const MISSION_TRACKS=Object.freeze({1:MENU_SCORE,2:MENU_SCORE});
export function createMissionMusic(level,{mediaFactory=()=>new Audio()}={}){
 const track=MISSION_TRACKS[level];if(!track)throw new Error('Unknown music level');
 let ctx=null,media=null,node=null,gain=null,enabled=true,active=false,disposed=false,failed=false,pending=false,blocked=false,duckUntil=0,lastGain=-1;
 const hidden=()=>typeof document!=='undefined'&&document.hidden;
 const ready=()=>!disposed&&enabled&&active&&!hidden()&&ctx?.state==='running';
 function play(){if(!ready()||!media||pending||blocked||!media.paused)return;pending=true;try{const result=media.play();Promise.resolve(result).then(()=>{pending=false;failed=false;if(!ready())media.pause();}).catch(error=>{pending=false;blocked=error?.name==='NotAllowedError';if(error?.name!=='NotAllowedError'&&error?.name!=='AbortError')failed=true;});}catch{pending=false;failed=true;}}
 function mix(){if(!gain)return;const target=ready()?(ctx.currentTime<duckUntil?.29:.58):0;if(target!==lastGain){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setTargetAtTime(target,ctx.currentTime,target<lastGain?.035:.8);lastGain=target;}if(ready())play();else media?.pause();}
 function attach(context){if(disposed||!context?.createMediaElementSource)return false;if(ctx===context){mix();return true;}if(ctx)return false;
  try{ctx=context;media=mediaFactory();media.preload='none';media.loop=true;media.src=track.url;media.onerror=()=>{failed=true;};node=ctx.createMediaElementSource(media);gain=ctx.createGain();gain.gain.value=0;node.connect(gain);gain.connect(ctx.destination);mix();return true;}catch{failed=true;return false;}}
 const retry=()=>{blocked=false;mix();},visibility=()=>{if(hidden())media?.pause();else mix();};
 if(typeof document!=='undefined'){document.addEventListener('pointerdown',retry,true);document.addEventListener('keydown',retry,true);document.addEventListener('visibilitychange',visibility);}
 return {setContext:attach,start(context){blocked=false;if(context)attach(context);active=true;mix();return ready();},update(_dt,options={}){if('active'in options)active=!!options.active;mix();},pause(){active=false;mix();},setEnabled(value){enabled=!!value;mix();},duck(seconds=.4){if(ctx)duckUntil=Math.max(duckUntil,ctx.currentTime+seconds);mix();},
 dispose(){if(disposed)return;active=false;mix();disposed=true;media?.pause();if(media){media.onerror=null;media.removeAttribute('src');media.load();}node?.disconnect();gain?.disconnect();if(typeof document!=='undefined'){document.removeEventListener('pointerdown',retry,true);document.removeEventListener('keydown',retry,true);document.removeEventListener('visibilitychange',visibility);}},
 get enabled(){return enabled;},get failed(){return failed;},get playing(){return ready()&&!!media&&!media.paused;},get source(){return track.url;},get section(){return 'mission';},get stats(){return {title:track.title,streaming:true,position:media?.currentTime||0,gain:lastGain,ducked:!!ctx&&ctx.currentTime<duckUntil,voices:media&&!media.paused?1:0};}};
}

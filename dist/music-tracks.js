// Pink War — HTML5 soundtrack, optimized for mobile: streamed MP3, no PCM predecode.
// The original synth remains as an automatic fallback if game audio is missing.
import {createMusicBed as createProceduralMusic, musicSectionFor} from './music.js';

export const MUSIC_TRACKS=Object.freeze({
  lobby: new URL('./assets/music/under-violet-light.mp3',import.meta.url).href,
  game: new URL('./assets/music/velvet-siege.mp3',import.meta.url).href
});

function makeAudio(src,volume){
  if(typeof Audio!=='function')return null;
  const audio=new Audio();
  audio.src=src;
  audio.preload='none'; // never download ~2.4 MB on loading screen
  audio.loop=true;
  audio.volume=volume;
  audio.playsInline=true;
  return audio;
}

export function createLobbyTrack(){
  const audio=makeAudio(MUSIC_TRACKS.lobby,.28);
  let enabled=true,disposed=false,failed=false,requested=false;
  const onError=()=>{failed=true;audio?.pause();};
  audio?.addEventListener('error',onError);
  function start(){
    if(!enabled||disposed||failed||!audio)return false;
    requested=true;
    const p=audio.play();
    p?.catch(error=>{
      if(error?.name!=='AbortError'){
        // Autoplay can be denied until a tap. Retry only from a real gesture.
        if(error?.name!=='NotAllowedError')failed=true;
      }
    });
    return true;
  }
  return {
    start,
    pause(){requested=false;audio?.pause();},
    setEnabled(value){enabled=!!value;if(!enabled){requested=false;audio?.pause();}},
    dispose(){disposed=true;requested=false;audio?.pause();audio?.removeEventListener('error',onError);
      if(audio){audio.removeAttribute('src');audio.load();}},
    get enabled(){return enabled;},
    get failed(){return failed;},
    get playing(){return requested&&!!audio&&!audio.paused&&!failed;}
  };
}

export function createMusicBed(initialContext=null){
  const fallback=createProceduralMusic(initialContext);
  const audio=makeAudio(MUSIC_TRACKS.game,.20);
  let context=initialContext,enabled=true,active=false,disposed=false,failed=!audio,
    requested='exploration',attempted=false;
  function useFallback(){
    if(!failed)return;
    fallback.setEnabled(enabled);
    if(enabled&&active)fallback.start(context);
  }
  function fail(){failed=true;audio?.pause();useFallback();}
  audio?.addEventListener('error',fail);
  function play(){
    if(disposed||!enabled||!active)return false;
    if(failed){useFallback();return fallback.playing;}
    if(!audio)return false;
    if(!attempted){attempted=true;audio.load();}
    const result=audio.play();
    result?.catch(error=>{
      if(error?.name==='AbortError'||disposed||!active)return;
      // The game has already unlocked the context through a user gesture.
      // For any unsupported/missing/blocked file, fall back to local synthesis.
      fail();
    });
    fallback.setEnabled(false);
    return true;
  }
  if(initialContext)fallback.setContext(initialContext);
  return {
    setContext(ctx){context=ctx;fallback.setContext(ctx);return true;},
    start(ctx){if(ctx)this.setContext(ctx);active=true;return play();},
    update(dt,options={}){
      if(disposed)return;
      if('active' in options)active=!!options.active;
      requested=musicSectionFor(options);
      if(!active){audio?.pause();fallback.pause();return;}
      if(failed){useFallback();fallback.update(dt,options);}
      else {
        fallback.setEnabled(false);
        if(!audio?.paused)return;
        play();
      }
    },
    pause(){active=false;audio?.pause();fallback.pause();},
    setEnabled(value){
      enabled=!!value;
      if(!enabled){audio?.pause();fallback.setEnabled(false);fallback.pause();}
      else if(active)play();
    },
    dispose(){
      if(disposed)return;
      disposed=true;active=false;audio?.pause();
      audio?.removeEventListener('error',fail);
      if(audio){audio.removeAttribute('src');audio.load();}
      fallback.dispose();
    },
    get enabled(){return enabled;},
    get failed(){return failed;},
    get playing(){return failed?fallback.playing:!!audio&&!audio.paused&&active;},
    get source(){return failed?fallback.source:'file:velvet-siege';},
    get section(){return requested;},
    get stats(){return {section:requested,requested,voices:failed?fallback.stats.voices:0,
      mediaLoaded:!!audio&&audio.readyState>=2,streaming:!failed,failed,
      url:MUSIC_TRACKS.game,bpm:0};}
  };
}

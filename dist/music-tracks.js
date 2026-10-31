// Reuse the creator's supplied AAC files; stream them without decoding full songs.
import {createMissionMusic,MISSION_TRACKS} from './mission-music.js';
import {createMusicBed as createProceduralMusic,musicSectionFor} from './music.js';
export const GAME_TRACK=Object.freeze({title:'Iron Maw',url:'./assets/music/iron-maw.m4a?v=3.74.0'});
export const MUSIC_TRACKS=Object.freeze({lobby:MISSION_TRACKS[1].url,game:GAME_TRACK.url});
export function createMusicBed(initialContext=null,{mediaFactory}={}){
 const stream=createMissionMusic(1,{track:GAME_TRACK,...(mediaFactory?{mediaFactory}:{})});
 const fallback=createProceduralMusic(initialContext);
 let context=initialContext,enabled=true,active=false,disposed=false,section='exploration';
 function sync(dt=0,options={}){
  if(disposed)return;
  stream.setEnabled(enabled&&!stream.failed);stream.update(dt,{active:active&&!stream.failed});
  const useFallback=stream.failed&&enabled&&active;
  fallback.setEnabled(useFallback);
  if(useFallback){fallback.start(context);fallback.update(dt,{...options,active:true});}
  else fallback.pause();
 }
 if(initialContext)stream.setContext(initialContext);
 return {
  setContext(ctx){context=ctx;stream.setContext(ctx);fallback.setContext(ctx);return true;},
  start(ctx){if(disposed)return false;if(ctx)this.setContext(ctx);active=true;stream.start(context);sync();return this.playing;},
  update(dt,options={}){if('active'in options)active=!!options.active;section=musicSectionFor(options);sync(dt,options);},
  pause(){active=false;stream.pause();fallback.pause();},
  setEnabled(on){enabled=!!on;sync();},
  duck(seconds){stream.duck(seconds);},
  dispose(){if(disposed)return;disposed=true;active=false;stream.dispose();fallback.dispose();},
  get enabled(){return enabled;},get failed(){return stream.failed;},
  get playing(){return !disposed&&enabled&&active&&(stream.failed?fallback.playing:stream.playing);},
  get source(){return stream.failed?fallback.source:GAME_TRACK.url;},get section(){return section;},
  get stats(){return {title:GAME_TRACK.title,section,streaming:!stream.failed,failed:stream.failed,...(stream.failed?fallback.stats:stream.stats)};}
 };
}

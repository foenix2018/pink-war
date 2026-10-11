// Pink War — independent user-controlled CC0 soundtrack.
export const MUSIC_CREDIT=Object.freeze({
 title:'Tense Future Loop',author:'gmason',
 page:'https://opengameart.org/content/tense-future-loop',license:'CC0',
 mp3:'https://opengameart.org/sites/default/files/tensefutureloop.mp3',
 ogg:'https://opengameart.org/sites/default/files/tensefutureloop.ogg'
});
export function createMusicBed(makeAudio=()=>new Audio()){
 const audio=makeAudio();
 audio.loop=true;audio.preload='none';audio.volume=.15;
 let enabled=true,loaded=false,failed=false;
 audio.addEventListener?.('error',()=>{
   if(audio.src.endsWith('.mp3')){audio.src=MUSIC_CREDIT.ogg;audio.load?.();}
   else failed=true;
 });
 const start=()=>{
   if(!enabled||failed)return;
   if(!loaded){audio.src=MUSIC_CREDIT.mp3;loaded=true;}
   return Promise.resolve(audio.play()).catch(()=>{});
 };
 const pause=()=>audio.pause();
 return {start,pause,setEnabled:value=>{enabled=!!value;if(!enabled)pause();},
   get enabled(){return enabled;},get failed(){return failed;},
   get playing(){return !audio.paused;},get source(){return audio.src;}};
}

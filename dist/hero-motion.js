import*as T from './vendor/three.webgpu.min.js';
import{MIXAMO_PLAYER_GZIP}from './mixamo-player-data.js';
import{decompressSync}from './vendor/fflate.module.js';
let cache;
let pack;
export function mixamoPlayerMotions(){
 return pack??=JSON.parse(new TextDecoder().decode(decompressSync(Uint8Array.from(atob(MIXAMO_PLAYER_GZIP),c=>c.charCodeAt(0)))));
}
// Full recorded locomotion, including hips, legs and feet. The ground adapter
// may change height on terrain; it never authors a horizontal foot trajectory.
export function naturalHeroClips(data){
 if(cache)return cache;
 const clips=mixamoPlayerMotions().clips.map(c=>{
  const tracks=c.tracks.map(t=>new(t.type==='vector'?T.VectorKeyframeTrack:T.QuaternionKeyframeTrack)(t.name,t.times,t.values));
  return {name:c.name,duration:c.duration,mocap:Object.fromEntries(Object.entries(c).filter(([k])=>k!=='tracks')),animation:new T.AnimationClip(c.name,c.duration,tracks)};
 });
 return cache=[...data.clips.filter(c=>c.name==='idle'||c.name==='rifle'),...clips];
}

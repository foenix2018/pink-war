import*as T from './vendor/three.webgpu.min.js';
import{HERO_MOTION_PACK}from './hero-motion-data.js';
let cache;
// Imported human motion supplies the torso/head/arm counter-motion. The native
// Mixamo pelvis and legs retain the calibrated contact and airborne IK frame.
export function naturalHeroClips(data){
 if(cache)return cache;
 const lower=t=>/mixamorig(Hips|Left(UpLeg|Leg|Foot|Toe)|Right(UpLeg|Leg|Foot|Toe))/.test(t.name);
 return cache=data.clips.map(original=>{
  if(original.name==='rifle')return original;
  const source=HERO_MOTION_PACK.clips.find(c=>c.name===(original.name==='walkRifle'?'walk':original.name));if(!source)return original;
  const tracks=source.tracks.filter(t=>!lower(t)&&!(original.name==='walkRifle'&&/Arm|Hand|Shoulder/.test(t.name))).map(t=>new T.QuaternionKeyframeTrack(t.name,t.times.map(v=>v/source.duration*original.duration),t.values));
  for(const t of original.animation.tracks)if(lower(t)||original.name==='walkRifle'&&/Arm|Hand|Shoulder/.test(t.name))tracks.push(t.clone());
  return {name:original.name,duration:original.duration,animation:new T.AnimationClip(original.name,original.duration,tracks)};
 });
}

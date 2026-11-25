import * as T from './vendor/three.webgpu.min.js';
import {buildCivilMotion,FITNESS_CLIPS} from './lylu-civil-motion.js?v=20261125fitness3';
// LYLU only, planque only. The game simulation and mission equipment are not altered.
export const LYLU_CIVIL_ASSET=new URL('./assets/heroes/lylu-civil-v5.glb?v=20261124v5',import.meta.url).href;
export const LYLU_EXPRESSIONS=Object.freeze(['Blink','Smile','Focus','Surprise']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),pulse=(t,start,duration)=>{const x=(t-start)/duration;return x>0&&x<1?Math.sin(Math.PI*x)**2:0;};
export function lyluExpressionState(time,{moving=false,station=null}={}){
 const phase=((time%18)+18)%18;
 const blinkPhase=((time%4.1)+4.1)%4.1;
 return {Blink:Math.max(pulse(blinkPhase,1.4,.19),pulse(phase,12.4,.19)),Smile:station==='rest'?.65:moving?0:.42*pulse(phase,2,4),Focus:moving?.38:station==='workshop'?.72:.40*pulse(phase,8,4),Surprise:station==='archive'?.42:.22*pulse(phase,14,1.3)};
}
export async function createLyluCivil(scene,{load}={}){
 const gltf=await (load?load():import('./vendor/s19-gltf-loader.js?v=20261124b').then(({GLTFLoader})=>new GLTFLoader().loadAsync(LYLU_CIVIL_ASSET)));
 const root=new T.Group();root.name='LYLU Civil V5 / planque';root.visible=false;
 const visual=gltf.scene;root.add(visual);visual.updateMatrixWorld(true);
 const bones=new Map(),morphs=[];let draws=0,triangles=0;
 visual.traverse(o=>{
   if(o.isBone){bones.set(o.name,{bone:o,rest:o.quaternion.clone(),worldInv:o.getWorldQuaternion(new T.Quaternion()).invert(),pos:o.position.clone()});}
   if(o.isMesh){
     o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;
     draws+=Math.max(1,o.geometry.groups.length);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;
     if(o.morphTargetDictionary&&o.morphTargetInfluences)morphs.push(o);
   }
 });
 const required=['Pelvis','Spine','Chest','Neck','Head',...['L','R'].flatMap(s=>['UpperArm','ForeArm','Hand','Thigh','Shin','Foot'].map(n=>n+'_'+s))];
 if(required.some(n=>!bones.has(n))||LYLU_EXPRESSIONS.some(n=>!morphs.some(o=>n in o.morphTargetDictionary)))throw new Error('LYLU civil: missing skeleton or facial morphs');
 // Blender exports front +Z; the Pink Wars hero faces -Z. Keep world gameplay root separate.
 const civilClips=buildCivilMotion(T,visual,bones,gltf.animations);
 visual.rotation.y=Math.PI;visual.position.y=.015;
 scene.add(root);
 // All 30 tracks are retargeted from the actual armored actor. The mixer owns bone poses.
 const mixer=new T.AnimationMixer(visual),actions=new Map([...gltf.animations,...civilClips].map(c=>[c.name,mixer.clipAction(c)]));
 const requiredClips=['idle','rifle','walk','walkRifle','run','walkLeft','walkRight','walkBack','runLeft','runRight','runBack','crouchIdle','crouchWalk','crouchLeft','crouchRight','crouchBack','jump','doubleJump','wallJump','jetpack','slide','crouchTransition','aim','fireRifle','reloadRifle','firePistol','reloadPistol','meleeBlade','fireDual','reloadDual'];
 if(requiredClips.some(n=>!actions.has(n)))throw new Error('LYLU V5: animation library incomplete');
 const state={Blink:0,Smile:0,Focus:0,Surprise:0};
 let current=null,motion='idle',clipName='idle',actionAge=99,actionKind=null,override=null,alive=true,sourceWeight=0,sourcePhase=0,preview=null;
 function play(name,once=false){
   const next=actions.get(name);if(!next)return;
   if(current===next)return;
   const old=current;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);next.clampWhenFinished=once;
   if(old&&!once&&/^(civil_)?(walk|run|crouch)/.test(name)&&/^(civil_)?(walk|run|crouch)/.test(clipName))next.time=(old.time/old.getClip().duration%1)*next.getClip().duration;
   next.play();if(old)next.crossFadeFrom(old,.18,false);current=next;clipName=name;
 }
 play('civil_idle');mixer.update(0);
 function select({moving,sprint,crouched,velocity,yaw,speed}){
   if(!moving)return crouched?'crouchIdle':'idle';
   const vx=velocity?.x||0,vz=velocity?.z||0,lx=vx*Math.cos(yaw)-vz*Math.sin(yaw),lz=vx*Math.sin(yaw)+vz*Math.cos(yaw);
   const family=crouched?'crouch':sprint?'run':'walk';
   if(Math.abs(lx)>Math.abs(lz))return family+(lx<0?'Left':'Right');
   if(lz>.05)return family+'Back';return family==='crouch'?'crouchWalk':family;
 }
 function update(time,dt,{position,yaw=0,speed=0,velocity,moving=false,sprint=false,crouched=false,station=null,visible=true}={}){
   if(!alive)return;root.visible=visible;if(position)root.position.set(position.x,position.elevation||0,position.z);root.rotation.y=yaw;
   const step=clamp(dt,0,.08);actionAge+=step;
   const interact=actionAge<1.05;
   // Interaction is an unarmed adaptation of the original aim gesture; no combat is enabled in the refuge.
   const name=preview||('civil_'+select({moving,sprint,crouched,velocity,yaw,speed}));
   motion=preview|| (interact?'action':moving?(sprint?'run':'walk'):'idle');
   play(name,false);sourceWeight+=(Number(moving)-sourceWeight)*(1-Math.exp(-step*9));
   if(current&&moving&&!preview&&!interact){const nominal=name.startsWith('civil_run')?4.2:name.startsWith('civil_crouch')?1.2:1.6;current.setEffectiveTimeScale(clamp(speed/nominal,.35,1.75));}
   else current?.setEffectiveTimeScale(1);
   mixer.update(step);sourcePhase=(current?.time||0)/(current?.getClip().duration||1);
   const targetFace=lyluExpressionState(time,{moving,station});if(override)Object.assign(targetFace,override);
   for(const key of LYLU_EXPRESSIONS){const k=key==='Blink'?1-Math.exp(-step*45):1-Math.exp(-step*8);state[key]+=(targetFace[key]-state[key])*k;}
   for(const o of morphs)for(const key of LYLU_EXPRESSIONS){const i=o.morphTargetDictionary[key];if(i!==undefined)o.morphTargetInfluences[i]=state[key];}
 }
 return {root,update,triggerAction(kind='interact'){actionAge=0;actionKind=kind;},setExpression(value=null){override=value;},playPreview(name=null){if(name!==null&&!actions.has(name))throw Error('Unknown clip');preview=name;},playFitness(id=null){preview=id?FITNESS_CLIPS[id]||null:null;if(preview){play(preview);mixer.stopAllAction();current.reset().setEffectiveWeight(1).play();mixer.update(0);}},fitnessPose(){root.updateMatrixWorld(true);const point=n=>bones.get(n).bone.getWorldPosition(new T.Vector3()),grip=s=>{const wrist=point('Hand_'+s),forearm=point('ForeArm_'+s);return wrist.clone().addScaledVector(wrist.clone().sub(forearm).normalize(),.045);};return{left:grip('L'),right:grip('R'),pelvis:point('Pelvis'),leftFoot:point('Foot_L'),rightFoot:point('Foot_R'),leftWristPoint:point('Hand_L'),rightWristPoint:point('Hand_R'),leftWrist:bones.get('Hand_L').bone.getWorldQuaternion(new T.Quaternion()),rightWrist:bones.get('Hand_R').bone.getWorldQuaternion(new T.Quaternion())};},samplePreview(name,phase=.5){if(!actions.has(name))throw Error('Unknown clip');preview=name;play(name);mixer.stopAllAction();current.reset().setEffectiveWeight(1).play();current.time=current.getClip().duration*clamp(phase);mixer.update(0);},snapshot:()=>({ready:alive,visible:root.visible,triangles,draws,bones:bones.size,motion,clip:clipName,clips:[...actions.keys()],canonical:true,sourcePhase,sourceWeight,action:actionAge<1.05?actionKind:null,expressions:{...state},morphs:morphs.length}),dispose(){alive=false;mixer.stopAllAction();mixer.uncacheRoot(visual);root.removeFromParent();visual.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}};
}

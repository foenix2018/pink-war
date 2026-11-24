import * as T from './vendor/three.webgpu.min.js';
// LYLU only, planque only. The game simulation and mission equipment are not altered.
export const LYLU_CIVIL_ASSET=new URL('./assets/heroes/lylu-civil-v4.glb',import.meta.url).href;
export const LYLU_EXPRESSIONS=Object.freeze(['Blink','Smile','Focus','Surprise']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),pulse=(t,start,duration)=>{const x=(t-start)/duration;return x>0&&x<1?Math.sin(Math.PI*x)**2:0;};
export function lyluExpressionState(time,{moving=false,station=null}={}){
 const phase=((time%18)+18)%18;
 const blinkPhase=((time%4.1)+4.1)%4.1;
 return {Blink:Math.max(pulse(blinkPhase,1.4,.19),pulse(phase,12.4,.19)),Smile:station==='rest'?.65:moving?0:.42*pulse(phase,2,4),Focus:moving?.38:station==='workshop'?.72:.40*pulse(phase,8,4),Surprise:station==='archive'?.42:.22*pulse(phase,14,1.3)};
}
export async function createLyluCivil(scene,{load}={}){
 const gltf=await (load?load():import('./vendor/s19-gltf-loader.js').then(({GLTFLoader})=>new GLTFLoader().loadAsync(LYLU_CIVIL_ASSET)));
 const root=new T.Group();root.name='LYLU Civil V4 / planque';root.visible=false;
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
 visual.rotation.y=Math.PI;visual.position.y=.015;
 scene.add(root);
 const axisX=new T.Vector3(1,0,0),axisY=new T.Vector3(0,1,0),axisZ=new T.Vector3(0,0,1),q=new T.Quaternion(),axis=new T.Vector3();
 function rot(name,x=0,y=0,z=0){
   const b=bones.get(name);b.bone.quaternion.copy(b.rest);
   for(const [a,v] of [[axisX,x],[axisY,y],[axisZ,z]])if(Math.abs(v)>1e-5){axis.copy(a).applyQuaternion(b.worldInv);b.bone.quaternion.multiply(q.setFromAxisAngle(axis,v));}
 }
 const state={Blink:0,Smile:0,Focus:0,Surprise:0};let gait=0,speedBlend=0,override=null,alive=true;
 function update(time,dt,{position,yaw=0,speed=0,moving=false,station=null,visible=true}={}){
   if(!alive)return;root.visible=visible;if(position)root.position.set(position.x,0,position.z);root.rotation.y=yaw;
   const step=clamp(dt,0,.08),target=moving?clamp(speed/2.5,.25,1.25):0;
   speedBlend+=(target-speedBlend)*(1-Math.exp(-step*9));gait+=step*(2.9+speedBlend*4.6)*Math.min(1,speedBlend*2);
   const swing=Math.sin(gait),breath=Math.sin(time*1.9),amp=.46*speedBlend;
   rot('Pelvis',0,.035*swing*speedBlend,0);rot('Spine',.014*breath,0,-.022*swing*speedBlend);rot('Chest',.013*breath,-.042*swing*speedBlend,0);rot('Neck',0,0,0);rot('Head',.017*breath,.06*Math.sin(time*.53)*(1-Math.min(1,speedBlend)),.018*Math.sin(time*.71));
   for(const [s,sign] of [['L',1],['R',-1]]){
     const stride=sign*swing;
     // Drop the A-pose arms into a relaxed unarmed stance and swing with the opposite leg.
     rot('UpperArm_'+s,-stride*.30*speedBlend,0,-sign*.43);
     rot('ForeArm_'+s,.12+Math.max(0,-stride)*.17*speedBlend,0,sign*.025);
     rot('Hand_'+s,.025,0,-sign*.04);
     // A modest gait in the planque, independent of weapon IK.
     rot('Thigh_'+s,stride*amp,0,sign*.018*speedBlend);
     rot('Shin_'+s,-Math.max(0,-stride)*amp*.95,0,0);
     rot('Foot_'+s,-stride*amp*.28,0,0);
   }
   visual.position.y=.015+.011*Math.abs(Math.sin(gait))*Math.min(1,speedBlend);
   const targetFace=lyluExpressionState(time,{moving,station});if(override)Object.assign(targetFace,override);
   for(const key of LYLU_EXPRESSIONS){const k=key==='Blink'?1-Math.exp(-step*45):1-Math.exp(-step*8);state[key]+=(targetFace[key]-state[key])*k;}
   for(const o of morphs)for(const key of LYLU_EXPRESSIONS){const i=o.morphTargetDictionary[key];if(i!==undefined)o.morphTargetInfluences[i]=state[key];}
 }
 return {root,update,setExpression(value=null){override=value;},snapshot:()=>({ready:alive,visible:root.visible,triangles,draws,bones:bones.size,expressions:{...state},morphs:morphs.length}),dispose(){alive=false;root.removeFromParent();visual.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}};
}

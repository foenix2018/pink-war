import * as T from './vendor/three.webgpu.min.js';
// LYLU only, planque only. The game simulation and mission equipment are not altered.
export const LYLU_CIVIL_ASSET=new URL('./assets/heroes/lylu-civil-v4.glb?v=20261124b',import.meta.url).href;
export const LYLU_EXPRESSIONS=Object.freeze(['Blink','Smile','Focus','Surprise']);
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),pulse=(t,start,duration)=>{const x=(t-start)/duration;return x>0&&x<1?Math.sin(Math.PI*x)**2:0;};
export function lyluExpressionState(time,{moving=false,station=null}={}){
 const phase=((time%18)+18)%18;
 const blinkPhase=((time%4.1)+4.1)%4.1;
 return {Blink:Math.max(pulse(blinkPhase,1.4,.19),pulse(phase,12.4,.19)),Smile:station==='rest'?.65:moving?0:.42*pulse(phase,2,4),Focus:moving?.38:station==='workshop'?.72:.40*pulse(phase,8,4),Surprise:station==='archive'?.42:.22*pulse(phase,14,1.3)};
}
export async function createLyluCivil(scene,{load}={}){
 const gltf=await (load?load():import('./vendor/s19-gltf-loader.js?v=20261124b').then(({GLTFLoader})=>new GLTFLoader().loadAsync(LYLU_CIVIL_ASSET)));
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
 visual.rotation.y=Math.PI;visual.position.y=.015;visual.updateMatrixWorld(true);
 for(const b of bones.values()){b.rootRest=b.bone.getWorldQuaternion(new T.Quaternion());b.worldInv.copy(b.rootRest).invert();}
 scene.add(root);
 const axisX=new T.Vector3(1,0,0),axisY=new T.Vector3(0,1,0),axisZ=new T.Vector3(0,0,1),q=new T.Quaternion(),axis=new T.Vector3();
 function rot(name,x=0,y=0,z=0){
   const b=bones.get(name);b.bone.quaternion.copy(b.rest);
   for(const [a,v] of [[axisX,x],[axisY,y],[axisZ,z]])if(Math.abs(v)>1e-5){axis.copy(a).applyQuaternion(b.worldInv);b.bone.quaternion.multiply(q.setFromAxisAngle(axis,v));}
 }
 // Drive this skinned mesh from the very same procedural soldier pose used in combat.
 // Orient each segment in the source root's coordinate system, preserving the civil bind pose and limb lengths.
 const inv=new T.Quaternion(),parentInv=new T.Quaternion(),worldQ=new T.Quaternion(),deltaQ=new T.Quaternion(),rootQ=new T.Quaternion();
 const vec=new T.Vector3(),dir=new T.Vector3(),restDir=new T.Vector3(),offset=new T.Vector3();
 const state={Blink:0,Smile:0,Focus:0,Surprise:0};
 let override=null,alive=true,source=null,actionAge=99,actionKind=null,motion='idle',sourcePhase=0,sourceWeight=0,footCorrection=0;
 function setSource(model){if(!model?.jointPositions||!model?.hips||model.legs?.length!==2)throw Error('Canonical soldier rig unavailable');source=model;}
 function sourceOrientation(node){return node.getWorldQuaternion(new T.Quaternion()).premultiply(inv);}
 function worldPose(name,relative){
   const b=bones.get(name);b.bone.parent.updateWorldMatrix(true,false);
   parentInv.copy(b.bone.parent.getWorldQuaternion(worldQ)).invert();
   b.bone.quaternion.copy(parentInv).multiply(rootQ).multiply(relative).multiply(b.rootRest);
   b.bone.updateWorldMatrix(false,true);
 }
 function alignSegment(name,childName,from,to){
   const b=bones.get(name),child=bones.get(childName);
   b.bone.parent.updateWorldMatrix(true,false);
   parentInv.copy(b.bone.parent.getWorldQuaternion(worldQ)).invert();
   // child bind translation describes the actual bone direction, including the original A-pose.
   restDir.copy(child.pos).applyQuaternion(b.rest).normalize();
   dir.copy(to).sub(from).normalize().applyQuaternion(rootQ).applyQuaternion(parentInv);
   if(restDir.lengthSq()>.9&&dir.lengthSq()>.9)b.bone.quaternion.copy(deltaQ.setFromUnitVectors(restDir,dir)).multiply(b.rest);
   b.bone.updateWorldMatrix(false,true);
 }
 function canonicalPose(time,dt,{moving,sprint,station}){
   source.root.updateWorldMatrix(true,true);
   inv.copy(source.root.getWorldQuaternion(new T.Quaternion())).invert();
   root.getWorldQuaternion(rootQ);
   const joints=source.jointPositions();
   for(const p of Object.values(joints))source.root.worldToLocal(p);
   sourcePhase=source._gaitPhase||0;sourceWeight=source._gaitWeight||0;
   motion=moving?(sprint?'run':'walk'):'idle';
   if(actionAge<1.05){actionAge+=dt;motion='action';}
   const gesture=actionAge<1.05?Math.sin(Math.PI*clamp(actionAge/1.05,0,1))**2:0;
   const pelvis=bones.get('Pelvis');pelvis.bone.position.copy(pelvis.pos);
   // The canonical hips provide bob, sway and turning; translate in the target parent's coordinates.
   offset.set(source.hips.position.x,source.hips.position.y-.97,source.hips.position.z).applyQuaternion(rootQ);
   pelvis.bone.parent.updateWorldMatrix(true,false);
   offset.applyQuaternion(pelvis.bone.parent.getWorldQuaternion(parentInv).invert());
   pelvis.bone.position.add(offset);
   for(const [name,node] of [['Pelvis',source.hips],['Spine',source.spine],['Chest',source.body],['Head',source.head]])worldPose(name,sourceOrientation(node));
   rot('Neck',0,0,0);
   // Sample both knee and ankle trajectories from the armored model; preserve civil proportions.
   for(const [side,key,i,sign] of [['L','left',0,1],['R','right',1,-1]]){
     alignSegment('Thigh_'+side,'Shin_'+side,joints[key+'Hip'],joints[key+'Knee']);
     alignSegment('Shin_'+side,'Foot_'+side,joints[key+'Knee'],joints[key+'Ankle']);
     worldPose('Foot_'+side,sourceOrientation(source.feet[i]));
     // Same canonical gait clock, with empty hands instead of the combat weapon IK grip.
     const swing=Math.sin(sourcePhase)*sourceWeight*sign;
     const run=sprint?1:0;
     const reach=side==='R'?gesture:gesture*.16;
     rot('UpperArm_'+side,-swing*(run?.58:.32)-reach*.92,0,-sign*(.43-reach*.10));
     rot('ForeArm_'+side,.14+run*.48+Math.max(0,-swing)*.24+reach*.63,0,sign*.035);
     rot('Hand_'+side,.025+reach*.15,0,-sign*.04);
   }
   // Correct height using the actual lowest animated ankle so the different leg proportions do not float.
   root.updateWorldMatrix(true,true);
   const ankle=Math.min(...['L','R'].map(side=>root.worldToLocal(bones.get('Foot_'+side).bone.getWorldPosition(new T.Vector3())).y));
   const sourceFloor=Math.min(joints.leftAnkle.y,joints.rightAnkle.y)-.185;
   const target=.155+sourceFloor;
   const adjustment=clamp(visual.position.y+target-ankle,-.20,.16);
   footCorrection+=(adjustment-footCorrection)*(1-Math.exp(-dt*20));
   visual.position.y=footCorrection;
 }
 function update(time,dt,{position,yaw=0,speed=0,moving=false,sprint=false,station=null,visible=true}={}){
   if(!alive)return;root.visible=visible;if(position)root.position.set(position.x,0,position.z);root.rotation.y=yaw;
   const step=clamp(dt,0,.08);
   if(source)canonicalPose(time,step,{moving,sprint,station});
   else{
     motion='idle'; // Only a short loading/diagnostic fallback; no invented walk cycle.
     for(const [s,sign] of [['L',1],['R',-1]]){rot('UpperArm_'+s,0,0,-sign*.43);rot('ForeArm_'+s,.12,0,sign*.025);}
   }
   const targetFace=lyluExpressionState(time,{moving,station});if(override)Object.assign(targetFace,override);
   for(const key of LYLU_EXPRESSIONS){const k=key==='Blink'?1-Math.exp(-step*45):1-Math.exp(-step*8);state[key]+=(targetFace[key]-state[key])*k;}
   for(const o of morphs)for(const key of LYLU_EXPRESSIONS){const i=o.morphTargetDictionary[key];if(i!==undefined)o.morphTargetInfluences[i]=state[key];}
 }
 return {root,update,setSource,triggerAction(kind='interact'){actionAge=0;actionKind=kind;},setExpression(value=null){override=value;},snapshot:()=>({ready:alive,visible:root.visible,triangles,draws,bones:bones.size,motion,canonical:!!source,sourcePhase,sourceWeight,action:actionAge<1.05?actionKind:null,expressions:{...state},morphs:morphs.length}),dispose(){alive=false;root.removeFromParent();visual.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}};
}

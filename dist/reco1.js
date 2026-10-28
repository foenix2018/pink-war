import * as T from './vendor/three.webgpu.min.js';
import {reco1Assets} from './reco1-assets.js';
import {createReco1Pose} from './reco1-pose.js';
import {RECO1,RECO1_FORM,RECO1_WEAPON} from './reco1-profile.js';
import {enemyScale} from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';
const cache=new WeakMap(),lightKeys=new Set(['lens','optics','tiny']);
function materialKit(asset,environment){
 const key=environment||asset;if(cache.has(key))return cache.get(key);
 const m=asset.materials.map(base=>{const v=base.clone();if(!v.isMeshBasicMaterial){v.envMap=environment||null;v.envMapIntensity=.55;}return v;});cache.set(key,m);return m;
}
export function createReco1({elite=false,environment=null}={}){
 const asset=reco1Assets(),root=new T.Group(),visual=new T.Group(),states={motion:'idle',aim:false,mode:'patrol'},pose=createReco1Pose(asset,states);
 root.name='RECO1 · reconnaissance blindée';root.add(visual);visual.rotation.y=Math.PI;root.scale.setScalar(enemyScale(RECO1_FORM,elite));
 const base=materialKit(asset,environment),owned=[],materials=base.map(m=>{if(!lightKeys.has(m.userData.reco1Key))return m;const own=m.clone();owned.push(own);return own;});
 const inverse=asset.bindings.map(d=>new T.Matrix4().fromArray(d.bindMatrix).invert()),skin=new T.Skeleton(pose.poseBones,inverse),meshes=[];
 for(const part of asset.parts){
  const mesh=new T.SkinnedMesh(part.geometry,materials[part.material]);mesh.name='RECO1 / '+mesh.material.userData.reco1Key;mesh.bindMode=T.DetachedBindMode;mesh.bind(skin,new T.Matrix4());visual.add(mesh);mesh.castShadow=!mesh.material.isMeshBasicMaterial;mesh.receiveShadow=mesh.castShadow;
  mesh.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.65);mesh.boundingBox=new T.Box3(new T.Vector3(-1,-.1,-1),new T.Vector3(1,2,1));meshes.push(mesh);
 }
 root.userData.form=RECO1_FORM;root.userData.reco1=true;root.userData.designRevision='RECO1 V10 / 3.65';root.userData.profile={name:RECO1.name};root.userData.skeleton=skin;root.userData.nativeSkeleton=pose.skeleton;root.userData.humanoidReference={source:asset.source,sourceBoneCount:41};root.userData.sensorAnchor=[.047,RECO1.sensorY];root.userData.optics=materials.find(m=>m.userData.reco1Key==='optics');
 let previous=null,previousX=0,previousZ=0,speed=0,lastAlert='';
 root.userData.animate=(time,phase=0,moving=true,enemy={},simulationTime=time)=>{
  const elapsed=previous===null?0:Math.max(0,time-previous),dt=Math.min(.1,elapsed),distance=Math.hypot((enemy.x??root.position.x)-previousX,(enemy.z??root.position.z)-previousZ);
  const measured=elapsed>0&&distance<2&&(enemy.stunnedUntil||0)<=simulationTime?Math.min(5,distance/elapsed):0;speed+=(measured-speed)*(1-Math.exp(-dt*18));if(measured<.01&&speed<.03)speed=0;
  previous=time;previousX=enemy.x??root.position.x;previousZ=enemy.z??root.position.z;
  const alert=enemyAlertState(enemy,simulationTime);states.motion=speed>2.9?'run':speed>.06?'walk':'idle';states.aim=alert!=='idle';states.mode=alert==='engaged'?'attack':alert==='alert'?'search':'patrol';
  pose.setPose({coverCrouch:enemy.coverCrouch||0,aimPitch:Math.max(RECO1_WEAPON.minPitch,Math.min(RECO1_WEAPON.maxPitch,enemy.aimPitch||0)),aimYaw:enemy.aimYaw||0,speed,hitPulse:Math.max(0,1-(simulationTime-(enemy.hitAt??-99))/.22)});pose.update(dt,time,0);pose.poseRoot.updateMatrixWorld(true);
  root.userData.nativeMotion=states.motion==='idle'?(states.aim?'rifle':'idle'):states.motion==='run'?'run':'walkRifle';root.userData.motionSpeed=speed;root.userData.alertState=alert;
  if(alert!==lastAlert){const color=ENEMY_OPTICS[alert];for(const m of owned){m.color.setHex(color);if(m.emissive)m.emissive.setHex(color);}lastAlert=alert;}
  root.userData.lastShotAt=enemy.lastShotAt??-99;
 };
 root.userData.reco1Pose=pose;
 root.userData.muzzle=()=>{root.updateMatrixWorld(true);const b=pose.bore();return {origin:visual.localToWorld(b.origin.clone()),direction:b.direction.clone().transformDirection(visual.matrixWorld)};};
 root.userData.animate(0,0,false,{awareness:'patrol'},0);
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;pose.dispose();skin.dispose();for(const m of owned)m.dispose();};root.addEventListener('removed',dispose);root.userData.dispose=dispose;
 root.userData.modelStats={nativeBones:41,visualBones:pose.poseBones.length,batches:meshes.length,triangles:asset.parts.reduce((n,p)=>n+p.geometry.index.count/3,0)};
 return root;
}

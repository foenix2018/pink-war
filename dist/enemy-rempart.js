import * as T from './vendor/three.webgpu.min.js';
import {reco1Assets} from './reco1-assets.js';
import {createReco1Pose} from './reco1-pose.js';
import {enemyScale} from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';
import {rempartSurfaces} from './rempart-surfaces.js';
import {rempartGeometry} from './enemy-rempart-model.js';
import {REMPART} from './rempart-profile.js';
const geometryCache=new Map(),materialCache=new WeakMap();
export function createRempart({elite=false,environment=null,detail='high'}={}){
 const asset=reco1Assets(),states={motion:'idle',aim:false,mode:'patrol'},root=new T.Group(),visual=new T.Group();
 const armRest=new Map(),aimQ=new T.Quaternion(),parentQ=new T.Quaternion(),point=new T.Vector3(),shoulderPoint=new T.Vector3(),direction=new T.Vector3(),delta=new T.Quaternion();
 // Native leg/body animation is retained. Heavy arms are braced with world-space
 // shoulder-to-elbow solves, so a walking shoulder never pulls away from its cannon.
 const pose=createReco1Pose(asset,states,{proportions:REMPART.proportions,afterPose:({actor,bones,pose:p})=>{
  for(const side of ['Right','Left']){
   const upper=bones.get('mixamorig'+side+'Arm'),fore=bones.get('mixamorig'+side+'ForeArm');
   upper.getWorldPosition(shoulderPoint);
   if(!armRest.has(side))armRest.set(side,{upper:upper.getWorldQuaternion(new T.Quaternion()),fore:fore.getWorldQuaternion(new T.Quaternion()),direction:fore.getWorldPosition(new T.Vector3()).sub(shoulderPoint).normalize()});
   const rest=armRest.get(side),right=side==='Right';
   point.set(right?-.52:.52,1.20-REMPART.crouchDrop*(p.coverCrouch||0)+(right?0:(p.guard||0)*.06),.025);
   direction.copy(point).sub(shoulderPoint).normalize();delta.setFromUnitVectors(rest.direction,direction);
   aimQ.copy(delta).multiply(rest.upper);upper.quaternion.copy(upper.parent.getWorldQuaternion(parentQ).invert().multiply(aimQ));actor.updateMatrixWorld(true);
   fore.position.copy(fore.parent.worldToLocal(point));
   aimQ.setFromEuler(new T.Euler(right?-(p.aimPitch||0):-(p.guard||0)*.10,right?p.aimYaw||0:0,0,'YXZ')).multiply(rest.fore);
   fore.quaternion.copy(fore.parent.getWorldQuaternion(parentQ).invert().multiply(aimQ));actor.updateMatrixWorld(true);
  }
 }});
 pose.gun.visible=false;pose.setPose({aimPitch:0,aimYaw:0});pose.update(0,0,0);
 root.add(visual);visual.rotation.y=Math.PI;root.scale.setScalar(enemyScale('bulwark',elite));
 const wear=rempartSurfaces(T);
 let base=materialCache.get(environment||asset);
 if(!base){base={
  plate:new T.MeshStandardMaterial({color:0x79716d,map:wear.paint,roughnessMap:wear.rough,bumpMap:wear.height,bumpScale:.0008,roughness:.68,metalness:.72,envMap:environment,envMapIntensity:.75}),
  dark:new T.MeshStandardMaterial({color:0x171a1c,roughness:.68,metalness:.7,envMap:environment,envMapIntensity:.5}),
  metal:new T.MeshStandardMaterial({color:0x777979,roughness:.43,metalness:.85,envMap:environment,envMapIntensity:.7}),
  red:new T.MeshBasicMaterial({color:0xff1028,toneMapped:false}),
  eye:new T.MeshBasicMaterial({color:ENEMY_OPTICS.idle,toneMapped:false}),
  decal:new T.MeshStandardMaterial({color:0xffffff,map:wear.stencil,transparent:true,alphaTest:.3,roughness:.95,metalness:.05,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})
 };materialCache.set(environment||asset,base);}
 const materials={...base,eye:base.eye.clone()};
 const data=rempartGeometry(detail),nativeBones=[...pose.bones.values()];
 if(!geometryCache.has(detail)){
  const mapping=data.names.map(n=>nativeBones.findIndex(b=>b.name==='mixamorig'+n));
  geometryCache.set(detail,data.parts.map(part=>{const geometry=part.geometry.clone(),indices=geometry.attributes.skinIndex;for(let i=0;i<indices.count;i++)indices.setX(i,mapping[indices.getX(i)]);return {geometry,key:part.key};}));
 }
 // These are the actual 41 native bones, not an independent animation approximation.
 const skeleton=new T.Skeleton(nativeBones,nativeBones.map(b=>b.matrixWorld.clone().invert()));
 for(const part of geometryCache.get(detail)){
  const mesh=new T.SkinnedMesh(part.geometry,materials[part.key]);mesh.name='B-11 / '+part.key;mesh.bindMode=T.DetachedBindMode;mesh.bind(skeleton,new T.Matrix4());mesh.castShadow=!['red','eye','decal'].includes(part.key);mesh.receiveShadow=mesh.castShadow;mesh.boundingSphere=part.geometry.boundingSphere?.clone()||new T.Sphere(new T.Vector3(0,1,0),2);mesh.boundingSphere.radius+=.6;visual.add(mesh);
 }
 Object.assign(root.userData,{form:'bulwark',designRevision:'B-11 / reference chassis / native RECO1 rig',nativeSkeleton:pose.skeleton,skeleton,humanoidReference:{source:asset.source,sourceBoneCount:41},optics:materials.eye,reco1Pose:pose,profile:{name:'Rempart B-11'},sensorAnchor:[0,REMPART.sensorY],supportHeight:0});
 const cannonBind=pose.bones.get('mixamorigRightForeArm').matrixWorld.clone().invert(),borePoint=new T.Vector3(...REMPART.cannonMuzzle).applyMatrix4(cannonBind),boreEnd=new T.Vector3(...REMPART.cannonMuzzle).add(new T.Vector3(0,0,1)).applyMatrix4(cannonBind);
 root.userData.muzzle=()=>{root.updateMatrixWorld(true);const m=pose.bones.get('mixamorigRightForeArm').matrixWorld,origin=borePoint.clone().applyMatrix4(m),end=boreEnd.clone().applyMatrix4(m);visual.localToWorld(origin);visual.localToWorld(end);return {origin,direction:end.sub(origin).normalize()};};
 let previous=null,px=0,pz=0,speed=0;
 root.userData.animate=(time,phase=0,moving=true,enemy={},simulationTime=time)=>{
  const elapsed=previous===null?0:Math.max(0,time-previous),dt=Math.min(.1,elapsed),x=enemy.x??root.position.x,z=enemy.z??root.position.z,dist=Math.hypot(x-px,z-pz);
  const measured=moving&&elapsed>0&&dist<2&&(enemy.stunnedUntil||0)<=simulationTime?Math.min(5,dist/elapsed):0;speed+=(measured-speed)*(1-Math.exp(-dt*18));if(measured<.01&&speed<.03)speed=0;previous=time;px=x;pz=z;
  const alert=enemyAlertState(enemy,simulationTime);states.motion=speed>2.9?'run':speed>.06?'walk':'idle';states.aim=alert!=='idle';states.mode=alert==='engaged'?'attack':alert==='alert'?'search':'patrol';
  pose.setPose({speed,guard:(enemy.combatPose||enemy.tactics?.state)==='guard'?1:0,coverCrouch:enemy.coverCrouch||0,aimPitch:T.MathUtils.clamp(enemy.aimPitch||0,REMPART.minPitch,REMPART.maxPitch),aimYaw:enemy.aimYaw||0,hitPulse:Math.max(0,1-(simulationTime-(enemy.hitAt??-99))/.22)});pose.update(dt,time,0);materials.eye.color.setHex(ENEMY_OPTICS[alert]);root.userData.alertState=alert;root.userData.motionSpeed=speed;root.userData.nativeMotion=states.motion;
 };
 root.userData.animate(0,0,false,{},0);
 root.userData.modelStats={nativeBones:41,batches:geometryCache.get(detail).length,triangles:geometryCache.get(detail).reduce((n,p)=>n+p.geometry.attributes.position.count/3,0)};
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;pose.dispose();skeleton.dispose();materials.eye.dispose();};root.addEventListener('removed',dispose);root.userData.dispose=dispose;return root;
}

import * as T from './vendor/three.webgpu.min.js';

// Keep the native clips' advance and foot lift, with room for the heavy boots.
// The solver targets the boot centre rather than the narrow human ankle.
export function createRempartLegRetarget(pose){
 const legs=[['Right',-1],['Left',1]].map(([name,side])=>{
  const hip=pose.bones.get('mixamorig'+name+'UpLeg'),knee=pose.bones.get('mixamorig'+name+'Leg'),foot=pose.bones.get('mixamorig'+name+'Foot');
  const reference=foot.getWorldQuaternion(new T.Quaternion());
  return {hip,knee,foot,side,reference,inverse:reference.clone().invert(),sole:new T.Vector3(side*.245,0,.13).applyMatrix4(foot.matrixWorld.clone().invert())};
 });
 const target=new T.Vector3(),pole=new T.Vector3(),offset=new T.Vector3(),scale=new T.Vector3();
 const current=new T.Quaternion(),delta=new T.Quaternion(),desired=new T.Quaternion(),parent=new T.Quaternion(),angles=new T.Euler(0,0,0,'YXZ');
 return ({actor,ik})=>{
  for(const leg of legs){
   leg.foot.getWorldPosition(target);leg.foot.getWorldQuaternion(current);leg.foot.getWorldScale(scale);
   delta.copy(current).multiply(leg.inverse);angles.setFromQuaternion(delta,'YXZ');
   // A heavy sole rolls slightly at push-off; it does not follow the human
   // clip's inward yaw or large toe rotation into the opposite boot.
   angles.set(T.MathUtils.clamp(angles.x,-.10,.14),leg.side*.04,0,'YXZ');
   desired.setFromEuler(angles).multiply(leg.reference);
   offset.copy(leg.sole).multiply(scale).applyQuaternion(desired);
   target.x=leg.side*.30-offset.x;
   leg.hip.getWorldPosition(pole);pole.x+=leg.side*.20;pole.y-=.02;pole.z+=.5;
   ik(leg.hip,leg.knee,leg.foot,target,pole,.999);
   leg.foot.quaternion.copy(leg.foot.parent.getWorldQuaternion(parent).invert().multiply(desired));
   actor.updateMatrixWorld(true);
  }
 };
}

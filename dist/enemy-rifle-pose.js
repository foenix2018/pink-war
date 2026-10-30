import {FIELD_RIFLE} from './enemy-weapon-layout.js';

// Two-link arm IK in the thorax frame. Targets belong to the weapon bone, so
// fingers remain on the grips when the robot aims, crouches or absorbs recoil.
export function createRifleArmPose(T,arms,layout=FIELD_RIFLE){
 const chains=arms.map(a=>({...a,upperBind:a.lower.position.clone().normalize(),lowerBind:a.wrist.position.clone().normalize(),upperLength:a.lower.position.length(),lowerLength:a.wrist.position.length()}));
 const target=new T.Vector3(),axis=new T.Vector3(),bend=new T.Vector3(),elbow=new T.Vector3(),lowerDirection=new T.Vector3(),inverse=new T.Quaternion(),combined=new T.Quaternion();
 const p=layout.pivot;
 const offsets={right:new T.Vector3(layout.rightGrip.x-p.x,layout.rightGrip.y-p.y,layout.rightGrip.z-p.z),left:new T.Vector3(layout.leftGrip.x-p.x,layout.leftGrip.y-p.y,layout.leftGrip.z-p.z)};
 return {update(gun){
  for(const c of chains){
   target.copy(offsets[c.side===1?'right':'left']).applyQuaternion(gun.quaternion).add(gun.position);
   axis.copy(target).sub(c.upper.position);const distance=T.MathUtils.clamp(axis.length(),Math.abs(c.upperLength-c.lowerLength)+.0001,c.upperLength+c.lowerLength-.0001);axis.normalize();
   const along=(c.upperLength*c.upperLength-c.lowerLength*c.lowerLength+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,c.upperLength*c.upperLength-along*along));
   bend.set(c.side,-.85,.12).addScaledVector(axis,-axis.dot(bend)).normalize();elbow.copy(c.upper.position).addScaledVector(axis,along).addScaledVector(bend,height);
   lowerDirection.copy(elbow).sub(c.upper.position).normalize();c.upper.quaternion.setFromUnitVectors(c.upperBind,lowerDirection);
   inverse.copy(c.upper.quaternion).invert();lowerDirection.copy(target).sub(elbow).normalize().applyQuaternion(inverse);c.lower.quaternion.setFromUnitVectors(c.lowerBind,lowerDirection);
   combined.copy(c.upper.quaternion).multiply(c.lower.quaternion);c.wrist.quaternion.copy(combined).invert().multiply(gun.quaternion);
  }
 },targets(gun){return Object.fromEntries(Object.entries(offsets).map(([hand,offset])=>[hand,offset.clone().applyQuaternion(gun.quaternion).add(gun.position)]));}};
}

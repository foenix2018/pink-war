import {segmentBox,traceEnemyHit} from './game-logic.js';

// The point where a line of sight (screen centre, or the eye behind a raised optic) first meets a wall, an
// ORDRE machine or a range plate. Shots leave the muzzle towards it, so the reticle is where they land.
export function sightPoint(T,eye,forward,{obstacles=[],enemies=[],plates=[],tracePlate=null,time=0,range=160}={}){
  const far=eye.clone().addScaledVector(forward,range);let target=far,nearest=1;
  for(const box of obstacles){const hit=segmentBox(eye,far,box);if(hit!==null&&hit<nearest){nearest=hit;target=eye.clone().lerp(far,hit);}}
  for(const enemy of enemies){const hit=traceEnemyHit(eye,far,enemy);if(hit&&hit.t<nearest){nearest=hit.t;target=eye.clone().lerp(far,hit.t);}}
  if(tracePlate)for(const plate of plates){
    const hit=tracePlate(eye,forward,plate,time);if(!hit)continue;
    const point=new T.Vector3(hit.point.x,hit.point.y,hit.point.z),fraction=eye.distanceTo(point)/range;
    if(fraction<nearest){nearest=fraction;target=point;}
  }
  return target;
}

// Raised-optic pose for a tracked weapon: the sight's centre (optic y/z, weapon frame) sits on the eye's
// forward axis, `relief` metres ahead, and the weapon takes the eye's orientation.
export function eyeAlignedSight(T,eyeMatrix,optic,scratch={}){
  const eye=scratch.eye||=new T.Vector3(),q=scratch.q||=new T.Quaternion(),scale=scratch.scale||=new T.Vector3(),position=scratch.position||=new T.Vector3();
  eyeMatrix.decompose(eye,q,scale);
  const relief=optic?.xrEyeRelief??Math.max(.12,optic?.eyeRelief||(optic?.radius||.0286)*7);
  position.set(0,0,-relief).applyQuaternion(q).add(eye);
  position.add(scale.set(0,-(optic?.y??.16),-(optic?.z??0)).applyQuaternion(q));
  return {position,quaternion:q,eye,forward:(scratch.forward||=new T.Vector3()).set(0,0,-1).applyQuaternion(q)};
}


// Uses the current visual barrel's world pose (never the Touch controller's
// generic ray). In VR each controller carries one firearm, including DUO mode.
export function trackedBarrelRay(T,gun,scratch={}){
 const origin=scratch.origin||=new T.Vector3(),direction=scratch.direction||=new T.Vector3();
 const q=scratch.quaternion||=new T.Quaternion();
 gun.updateWorldMatrix(true,false);
 const flash=gun.userData.flash;
 if(flash){
   if(flash.parent){flash.updateWorldMatrix(true,false);flash.getWorldPosition(origin);}
   else origin.copy(gun.localToWorld((scratch.local||=new T.Vector3()).copy(flash.position)));
 }
 else gun.getWorldPosition(origin);
 gun.getWorldQuaternion(q);
 direction.set(0,0,-1).applyQuaternion(q).normalize();
 return {origin,direction};
}

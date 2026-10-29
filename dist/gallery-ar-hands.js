// True Pink Wars RLH glove geometry for iOS Quick Look snapshots.
// The native RLH reference is: +Y fingers, -Y cuff, +Z dorsal surface.
// These axes intentionally differ from the weapon-grip frame in hands.js.
import * as T from './vendor/three.webgpu.min.js';
import {createRLHGlove} from './rlh-gloves.js';
import {poseUnarmedForInspection} from './rlh-firefighter.js';

const DOWN=new T.Vector3(0,-1,0);
const NEUTRAL_FINGERS=Object.freeze({
  index:.13,middle:.17,ring:.20,pinky:.23,
  thumbCurl:.13,thumbOpp:.23,spread:.08,wristFlex:0,wristSide:0
});

export function attachNativeARHands(soldier,kit){
 if(!soldier?.actor?.bone||!soldier.root||!kit?.gloves)
   throw new Error('Le squelette ou les gants originaux sont indisponibles.');
 // Position the *original* hands via the real character wrist bones; never
 // project a weapon-grip pose onto an unarmed exhibition figure.
 poseUnarmedForInspection(soldier,[],.016,{mirrorFromRight:false});
 soldier.root.updateMatrixWorld(true);
 const result=[];
 try{
  for(const [i,side] of ['Left','Right'].entries()){
   const bone=soldier.actor.bone(side+'Hand');
   if(!bone)throw new Error('Os de poignet '+side+' introuvable.');
   const glove=createRLHGlove(kit.gloves,{mirror:i===0,sleeve:false,arm:false});
   result.push(glove);
   glove.name='Galerie AR · vrai gant '+side;
   // Left hand is a reflection of the original right glove; preserve the
   // reflected X axis while rotating its native +Y finger axis downward.
   glove.scale.set(i===0?-.81:.81,.81,.81);
   const dorsal=new T.Vector3(i===0?-1:1,0,0); // away from the thighs
   const fingerAxis=DOWN.clone();
   const thumbAxis=new T.Vector3().crossVectors(fingerAxis,dorsal).normalize();
   const frame=new T.Matrix4().makeBasis(thumbAxis,fingerAxis,dorsal);
   glove.quaternion.setFromRotationMatrix(frame);
   soldier.root.add(glove);
   // Native glove origin (not weapon adapter's GRIP offset) = real wrist joint.
   soldier.root.updateMatrixWorld(true);
   glove.position.copy(soldier.root.worldToLocal(bone.getWorldPosition(new T.Vector3())));
   glove.userData.rig.pose(NEUTRAL_FINGERS);
   glove.userData.rig.maj(1);
   glove.updateWorldMatrix(true,true);
  }
 }catch(error){
  for(const glove of result){glove.removeFromParent();glove.userData.dispose?.();}
  throw error;
 }
 return {
  gloves:result,
  dispose(){
   for(const glove of result){glove.removeFromParent();glove.userData.dispose?.();}
  }
 };
}

// Cannon frame shared by native-bone posing and the authoritative projectile origin.
export const REMPART=Object.freeze({sensorY:1.738,headTop:1.84,coverTop:2.10,crouchDrop:.52,
 proportions:Object.freeze({LeftArm:2.6,RightArm:2.6,LeftShoulder:1.45,RightShoulder:1.45,LeftUpLeg:2.15,RightUpLeg:2.15,Neck:.8}),
 cannonPivot:Object.freeze([-.52,1.20,.025]),cannonMuzzle:Object.freeze([-.52,1.12,.82]),minPitch:-1.05,maxPitch:1.1});
// The visual driver publishes the torso's weapon offset in game-local coordinates.
// Keeping it outside the enemy record avoids serialising rendering state in saves.
const weaponMotion=new WeakMap();
export function setRempartWeaponMotion(enemy,offset){weaponMotion.set(enemy,offset);}
export function getRempartWeaponMotion(enemy){return weaponMotion.get(enemy);}
export function clearRempartWeaponMotion(enemy,offset){if(weaponMotion.get(enemy)===offset)weaponMotion.delete(enemy);}
export function rempartMuzzleLocal(pitch=0,yaw=0,crouch=0,motion=null){
 const p=Math.max(REMPART.minPitch,Math.min(REMPART.maxPitch,pitch||0)),r=.795*Math.cos(p)+.08*Math.sin(p);
 return {x:.52-Math.sin(yaw||0)*r+(motion?.x||0),y:1.20-.08*Math.cos(p)+.795*Math.sin(p)-REMPART.crouchDrop*(crouch||0)+(motion?.y||0),z:-.025-Math.cos(yaw||0)*r+(motion?.z||0)};
}

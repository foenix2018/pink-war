// RECO1 replaces the existing lightweight Sentinel (seer), in every shared combat mode.
export const RECO1_FORM='seer';
export const RECO1=Object.freeze({name:'RECO1 · reconnaissance blindée',health:750,bulletScale:.5,sensorBulletScale:.8,height:1.82,sensorY:1.69,headTop:1.83,coverDrop:.52});
export const isReco1=form=>form===RECO1_FORM;
export const reco1ProjectileScale=(enemy,zone='torso')=>isReco1(enemy.form)?(zone==='head'?RECO1.sensorBulletScale:RECO1.bulletScale):1;
// Same local frame as the game: forward is -Z. These values come from the V10 carbine.
export const RECO1_WEAPON=Object.freeze({pivot:Object.freeze({x:.105,y:1.46,z:-.24}),boreUp:.009*.84,length:.632*.90,minPitch:-1.05,maxPitch:1.10});
export function reco1MuzzleLocal(pitch=0,yaw=0,crouch=0){
 const W=RECO1_WEAPON,p=Math.max(W.minPitch,Math.min(W.maxPitch,pitch||0)),r=W.length*Math.cos(p)-W.boreUp*Math.sin(p);
 return {x:W.pivot.x-Math.sin(yaw||0)*r,y:W.pivot.y-RECO1.coverDrop*(crouch||0)+W.boreUp*Math.cos(p)+W.length*Math.sin(p),z:W.pivot.z-Math.cos(yaw||0)*r};
}
export const RECO1_HIT_ZONES=Object.freeze([
 ['head',0,1.69,-.07,.155],['torso',0,1.16,0,.285],
 ['limb',-.255,1.26,0,.125],['limb',.255,1.26,0,.125],
 ['limb',-.13,.53,0,.155],['limb',.13,.53,0,.155]
].map(Object.freeze));

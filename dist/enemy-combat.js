import {RECO1,isReco1,reco1MuzzleLocal} from './reco1-profile.js';
import {carriesFieldRifle,fieldRifleMuzzle,listenerToolMuzzle} from './enemy-weapon-layout.js';
export const ROBOT_HEAD_TOP=2.014,ROBOT_SENSOR_Y=1.88,ROBOT_CROUCH_DROP=.52,MAX_COVER_CROUCH=1.4;
// Finish a short cover manoeuvre using the last perceived contact. This never
// refreshes the remembered position or grants a shot at an unseen player.
export function remembersCoverContact(enemy,time){
 return !!enemy.tactics?.cover&&time-Math.max(enemy.lastSeenAt??-Infinity,enemy.lastHeardAt??-Infinity)<12;
}
export function enemySightPoint(enemy){
 const scale=enemyScale(enemy.form,enemy.elite)*(enemy.roomScale||1),y=isReco1(enemy.form)?RECO1.sensorY:enemy.form==='probe'?.55:enemy.form==='scuttler'?.92:ROBOT_SENSOR_Y,z=isReco1(enemy.form)?-.11:enemy.form==='probe'?-.665:enemy.form==='scuttler'?-.673:-.156,angle=enemy.yaw||0;
 return {x:enemy.x+z*Math.sin(angle)*scale,y:(enemy.elevation||0)+(y-ROBOT_CROUCH_DROP*(enemy.coverCrouch||0))*scale,z:enemy.z+z*Math.cos(angle)*scale};
}
// Chest durability distinguishes light frames, infantry and armoured chassis.
// Sensor/head multipliers remain in the shared hitboxes; no minimum-hit invulnerability.
export const ROBOT_DURABILITY=Object.freeze({probe:100,scuttler:140,stalker:180,seer:RECO1.health,synth:250,listener:275,brute:340,bulwark:400});
export function enemyDurability(wave,form='stalker',elite=false){
 const tier=Math.max(1,Number(wave)||1),base=ROBOT_DURABILITY[form]||ROBOT_DURABILITY.stalker;
 return Math.round(base*(1+(tier-1)*.055)*(elite?1.55:1));
}
export function enemyVolley(wave, form='stalker') {
  return {count:wave>=8&&form==='bulwark'?3:wave>=5&&['seer','brute','listener'].includes(form)?2:1,gap:.16,
    damage:form==='probe'?10+Math.floor(wave*.65):11+Math.floor(wave*.8)};
}
export function rangedMuzzle(enemy) {
  const crawler=enemy.form==='scuttler',scale=enemyScale(enemy.form,enemy.elite)*(enemy.roomScale||1);
  const rifle=isReco1(enemy.form)?reco1MuzzleLocal(enemy.aimPitch,enemy.aimYaw,enemy.coverCrouch):enemy.form==='listener'?listenerToolMuzzle(enemy.aimPitch||0):carriesFieldRifle(enemy.form)?fieldRifleMuzzle(enemy.aimPitch||0):null;
  const x=rifle?.x??(crawler?0:enemy.form==='bulwark'?.47:.37),z=rifle?.z??(crawler?-.28:enemy.form==='bulwark'?-.71:-.345),y=(rifle?.y??(crawler?1.04:enemy.form==='bulwark'?1.08:1.69))-(isReco1(enemy.form)?0:.52*(enemy.coverCrouch||0)),angle=enemy.yaw||0;
  return {x:enemy.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,
    y:(enemy.elevation||0)+y*scale,z:enemy.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale};
}
export function enemyScale(form='stalker',elite=false){
  return elite?(form==='probe'?1.13:1.3):form==='scuttler'?.98:1;
}

// Solve from the actual bore, including the receiver offset. Art and ballistics share this pose.
export function aimReco1(enemy,target){
 if(!isReco1(enemy.form))return;
 const c=Math.cos(enemy.yaw||0),s=Math.sin(enemy.yaw||0);
 for(let i=0;i<4;i++){
  const m=rangedMuzzle(enemy),dx=target.x-m.x,dy=target.y-m.y,dz=target.z-m.z;
  const x=c*dx-s*dz,z=s*dx+c*dz;
  enemy.aimPitch=Math.max(-1.05,Math.min(1.10,Math.atan2(dy,Math.hypot(x,z))));
  enemy.aimYaw=Math.atan2(-x,-z);
 }
}

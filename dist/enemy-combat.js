import {carriesFieldRifle,fieldRifleMuzzle} from './enemy-weapon-layout.js';
export const ROBOT_HEAD_TOP=2.014,ROBOT_SENSOR_Y=1.88,ROBOT_CROUCH_DROP=.52,MAX_COVER_CROUCH=1.4;
// Finish a short cover manoeuvre using the last perceived contact. This never
// refreshes the remembered position or grants a shot at an unseen player.
export function remembersCoverContact(enemy,time){
 return !!enemy.tactics?.cover&&time-Math.max(enemy.lastSeenAt??-Infinity,enemy.lastHeardAt??-Infinity)<12;
}
export function enemySightPoint(enemy){
 const scale=enemyScale(enemy.form,enemy.elite)*(enemy.roomScale||1),y=enemy.form==='probe'?.55:enemy.form==='scuttler'?.92:ROBOT_SENSOR_Y,z=enemy.form==='probe'?-.665:enemy.form==='scuttler'?-.673:-.156,angle=enemy.yaw||0;
 return {x:enemy.x+z*Math.sin(angle)*scale,y:(enemy.elevation||0)+(y-ROBOT_CROUCH_DROP*(enemy.coverCrouch||0))*scale,z:enemy.z+z*Math.cos(angle)*scale};
}
export function enemyDurability(wave, form = 'stalker', elite = false) {
  const base=elite?95+wave*25:42+wave*14;
  const frame=form==='synth'?1.42:form==='bulwark'?1.85:form==='brute'?1.6:form==='probe'?.82:form==='seer'?1.25:1.3;
  return Math.round(base*(frame+Math.min(.25,Math.max(0,wave-1)*.015)));
}
export function enemyVolley(wave, form='stalker') {
  return {count:wave>=8&&form==='bulwark'?3:wave>=5&&['seer','brute','listener'].includes(form)?2:1,gap:.16,
    damage:form==='probe'?10+Math.floor(wave*.65):11+Math.floor(wave*.8)};
}
export function rangedMuzzle(enemy) {
  const crawler=enemy.form==='scuttler',scale=enemyScale(enemy.form,enemy.elite)*(enemy.roomScale||1);
  const rifle=carriesFieldRifle(enemy.form)?fieldRifleMuzzle(enemy.aimPitch||0):null;
  const x=rifle?.x??(crawler?0:.37),z=rifle?.z??(crawler?-.28:-.345),y=(rifle?.y??(crawler?1.04:1.69))-.52*(enemy.coverCrouch||0),angle=enemy.yaw||0;
  return {x:enemy.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,
    y:(enemy.elevation||0)+y*scale,z:enemy.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale};
}
export function enemyScale(form='stalker',elite=false){
  return elite?(form==='probe'?1.13:1.3):form==='scuttler'?.98:form==='seer'?1.04:1;
}

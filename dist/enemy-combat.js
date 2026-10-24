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
  const x=crawler?0:.37,z=crawler?-.28:-.345,y=crawler?1.04:1.69-.52*(enemy.coverCrouch||0),angle=enemy.yaw||0;
  return {x:enemy.x+(x*Math.cos(angle)+z*Math.sin(angle))*scale,
    y:(enemy.elevation||0)+y*scale,z:enemy.z+(-x*Math.sin(angle)+z*Math.cos(angle))*scale};
}
export function enemyScale(form='stalker',elite=false){
  return elite?(form==='probe'?1.13:1.3):form==='scuttler'?.98:form==='seer'?1.04:1;
}

// Presentation reads the same perception memory as navigation. Audio volume
// settings never affect what a robot hears or the visible alert state.
export function enemyAlertState(enemy={},time=0){
  if(enemy.awareness==='engaged')return 'engaged';
  const memory=Number.isFinite(enemy.alertedUntil)&&enemy.alertedUntil>time;
  const heard=Number.isFinite(enemy.lastHeardAt)&&enemy.lastHeardAt<=time&&enemy.lastHeardAt>=0;
  return memory&&(heard||enemy.awareness==='search')?'alert':'idle';
}

export const ENEMY_OPTICS=Object.freeze({idle:0x80d9e8,alert:0xff2920,engaged:0xff180c});

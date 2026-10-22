import {createLaserFX} from './laser-fx.js';
import {createCombatFX} from './combat-fx.js';

// Shared by the new missions: finite instanced batches and two pools of three
// reused pulse lights. Enemy shots illuminate nearby surfaces.
export function createCampaignCombatEffects(T,scene,characterId='ghju'){
  const tint=characterId==='lylu'?0x66baff:0xff70b9;
  const laser=createLaserFX(T,scene,{rose:tint}),impacts=createCombatFX(T,scene,{rose:tint});
  const enemyLaser=createLaserFX(T,scene,{rose:0xff4333});
  const enemyBullets=[];
  return {
    event(e){
      if(e.type==='shot')laser.shot(e);
      if(e.type==='enemy-shot')enemyLaser.shot({...e,origin:{x:e.x,y:e.y,z:e.z},weapon:'bloom',power:.6});
      if(e.type==='impact'){
        impacts.impact(e);
        if(e.hostile)enemyLaser.impact({...e,hostile:false,weapon:'bloom'});else laser.impact(e);
      }
    },
    update(game,dt,camera){
      laser.update(game.bullets,dt);impacts.update(dt,camera);
      enemyBullets.length=0;
      for(const b of game.bullets)if(b.hostile)enemyBullets.push({...b,hostile:false,weapon:'bloom'});
      enemyLaser.update(enemyBullets,dt);
    },
    reset(){laser.reset();impacts.reset();enemyLaser.reset();},
    stats:()=>({player:laser.stats(),enemy:enemyLaser.stats(),impacts:impacts.stats()}),
    dispose(){laser.dispose();impacts.dispose();enemyLaser.dispose();}
  };
}

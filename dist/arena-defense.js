// Survival-only roster and sentry rules, shared by physics and the fortress art.
export const TURRET_CLOSE_RANGE=5, TURRET_HP=320, TURRET_RANGE=62;
export const ARENA_TURRETS=Object.freeze([
 [-52,-88],[52,-88],[88,-52],[88,52],[52,88],[-52,88],[-88,52],[-88,-52]
].map(([x,z],i)=>Object.freeze({id:`sentry-${i+1}`,x,z,yaw:Math.atan2(-x,-z)})));

export function fortressWaveUnit(wave,ordinal){
 const roster=wave===1?['stalker','synth','stalker','scuttler','spectre']:
  ['stalker','synth','seer','spectre','brute','probe','stalker','scuttler',
   ...(wave>=4?['listener','spectre']:[]),...(wave>=7?['bulwark','brute']:[])];
 const form=roster[(ordinal+wave-1)%roster.length];
 return {form,elite:wave>=5&&form==='brute'&&ordinal%3===1};
}
export const createArenaTurrets=()=>ARENA_TURRETS.map(t=>({...t,defenceTurret:true,hp:TURRET_HP,maxHp:TURRET_HP,
 elevation:0,aimHeight:1.75,radius:1.2,readyAt:4,lockAt:null,hitAt:-99,destroyedAt:null}));
export const turretHitbox=t=>({x:t.x,z:t.z,hx:1.2,hz:1.2,y:.9,height:1.5,surface:'metal'});

export function damageDefenseTurret(game,t,amount,{weapon,source=game.player,at={x:t.x,y:1.75,z:t.z}}={}){
 if(!game.turrets?.includes(t)||t.hp<=0||!Number.isFinite(amount)||amount<=0)return false;
 const sy=source.y??((source.elevation||0)+1.35);
 const distance=Math.hypot(source.x-t.x,sy-1.75,source.z-t.z);
 // Eligibility belongs to the shot's origin and weapon, never the impact or current player position.
 if(source.companion||(weapon!=='lance'&&distance>TURRET_CLOSE_RANGE)){
  if(game.time>=(t.armourNoticeAt||0)){t.armourNoticeAt=game.time+.8;game.event('turret-armoured',{id:t.id,...at,range:TURRET_CLOSE_RANGE});}
  return false;
 }
 t.hp=Math.max(0,t.hp-amount);t.hitAt=game.time;
 game.event('turret-hit',{id:t.id,...at,hp:t.hp,maxHp:t.maxHp,damage:amount});
 if(t.hp===0){t.destroyedAt=game.time;t.lockAt=null;t.target=null;game.score+=300;
  game.event('turret-destroyed',{id:t.id,x:t.x,y:1.75,z:t.z,score:300});}
 return true;
}

export function updateArenaTurrets(game){
 if(!game.fortressArena)return;
 if(game.state!=='playing'||game.wave<1||game.nextWave>=0){for(const t of game.turrets){t.lockAt=null;t.target=null;}return;}
 const p=game.player,eye={x:p.x,y:(p.elevation||0)+(p.crouched?.65:1.25),z:p.z};
 // Bound pressure: no more than two sentries can acquire the player at once.
 const visible=game.turrets.filter(t=>t.hp>0&&Math.hypot(t.x-p.x,t.z-p.z)<TURRET_RANGE
  &&!game.blocked({x:t.x,y:1.75,z:t.z},eye))
  .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,2);
 for(const t of game.turrets){
  if(t.hp<=0||!visible.includes(t)){t.lockAt=null;t.target=null;continue;}
  t.yaw=Math.atan2(p.x-t.x,p.z-t.z);
  if(t.lockAt===null){if(game.time<t.readyAt)continue;t.lockAt=game.time+.95;t.target={...eye};
   game.event('turret-lock',{id:t.id,x:t.x,y:1.75,z:t.z});continue;}
  // Hold the marked position during the warning: strafing can evade the shot.
  if(game.time<t.lockAt)continue;
  const from={x:t.x,y:1.75,z:t.z},to=t.target;
  t.lockAt=null;t.target=null;t.readyAt=game.time+2.7;
  if(game.blocked(from,to))continue;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,n=Math.hypot(dx,dy,dz)||1;
  game.bullets.push({id:game.nextId++,...from,vx:dx/n*48,vy:dy/n*48,vz:dz/n*48,life:2,
   damage:14,hostile:true,weapon:'enemy',splash:0,turretId:t.id});
  game.event('turret-shot',{id:t.id,...from});
 }
}

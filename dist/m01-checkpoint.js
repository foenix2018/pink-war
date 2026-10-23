// Only save after a finite encounter is cleared, on stable, stationary ground.
const KEY='pink-wars-m01-checkpoint-v1-';
const STAGES=new Set(['investigation','sabotage','exit']);
const POINTS={investigation:{x:0,z:26,elevation:0},sabotage:{x:18,z:6,elevation:0},exit:{x:18,z:-16,elevation:0}};
export function readM01Checkpoint(characterId,storage){
 try{
  storage ||= globalThis.localStorage;
  const s=JSON.parse(storage.getItem(KEY+characterId));
  return s?.version===1&&s.characterId===characterId&&STAGES.has(s.stage)&&Number.isFinite(s.kills)?s:null;
 }catch{return null;}
}
export function writeM01Checkpoint(game,storage){
 if(!STAGES.has(game.stage)||game.enemies.length||game.toSpawn||!game.player.grounded||game.player.onLift||Math.abs(game.player.verticalSpeed||0)>.05)return false;
 const s={version:1,characterId:game.characterId,stage:game.stage,kills:game.kills,
  investigationRead:game.investigationRead,sabotaged:game.sabotaged,
  owned:[...game.ownedWeapons],ammo:[...game.ammo],health:Math.max(1,game.player.hp)};
 try{(storage||globalThis.localStorage).setItem(KEY+game.characterId,JSON.stringify(s));return true;}catch{return false;}
}
export function restoreM01Checkpoint(game,s){
 if(!s||s.version!==1||s.characterId!==game.characterId||!STAGES.has(s.stage))return false;
 game.enemies=[];game.openingSpawned=8;game.archiveRead=true;game.investigationRead=!!s.investigationRead;game.sabotaged=!!s.sabotaged;
 game.encounter=s.stage==='investigation'?0:s.stage==='sabotage'?1:2;game.spawned=8;game.toSpawn=0;game.nextSpawnAt=Infinity;game.activePortals=[];
 game.kills=s.kills;game.ownedWeapons=new Set([0,...(Array.isArray(s.owned)?s.owned:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<6)]);
 game.weaponIndex=Math.max(...game.ownedWeapons);game.player.hp=Math.min(100,Math.max(1,Number(s.health)||100));
 Object.assign(game.player,POINTS[s.stage],{grounded:true,verticalSpeed:0,onLift:null});
 for(let i=0;i<game.ammo.length;i++)if(Number.isFinite(s.ammo?.[i]))game.ammo[i]=Math.max(0,Math.min(game.ammo[i],s.ammo[i]));
 game.setStage(s.stage);
 if(s.stage==='investigation'&&!game.ownedWeapons.has(1))game.offerWeapon(1);
 if(s.stage==='sabotage'&&!game.ownedWeapons.has(2))game.offerWeapon(2);
 return true;
}

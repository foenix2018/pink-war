import {CHARGE_MAX} from './armor-combat.js';
import {starterWeaponIndex,weaponAllowedForCharacter} from './game-logic.js';
import {M01_CHECKPOINT_PREFIX,M01_CHECKPOINT_STAGES} from './checkpoint-index.js';
export {readM01Checkpoint} from './checkpoint-index.js';
// Only save after a finite encounter is cleared, on stable, stationary ground.
const KEY=M01_CHECKPOINT_PREFIX;
const STAGES=new Set(M01_CHECKPOINT_STAGES);
const POINTS={power:{x:-12.5,z:59,elevation:0},archive:{x:-4,z:58,elevation:0},workshop:{x:0,z:47,elevation:0},investigation:{x:-63,z:18,elevation:0},sabotage:{x:18,z:6,elevation:0},exit:{x:18,z:-16,elevation:0}};
export function writeM01Checkpoint(game,storage){
 if(!STAGES.has(game.stage)||game.enemies.length||game.toSpawn||!game.player.grounded||game.player.onLift||Math.abs(game.player.verticalSpeed||0)>.05)return false;
 const s={version:3,savedAt:Date.now(),characterId:game.characterId,stage:game.stage,kills:game.kills,
  investigationRead:game.investigationRead,sabotaged:game.sabotaged,circuitIsolated:game.circuitIsolated,circuitRoute:game.circuitRoute,spawned:game.spawned,shield:game.player.shield,charges:game.charges,
  weaponIndex:game.weaponIndex,owned:[...game.ownedWeapons],ammo:[...game.ammo],dualAmmo:{...game.dual.ammo},health:Math.max(1,game.player.hp)};
 try{(storage||globalThis.localStorage).setItem(KEY+game.characterId,JSON.stringify(s));return true;}catch{return false;}
}
export function restoreM01Checkpoint(game,s){
 if(!s||![1,2,3].includes(s.version)||s.version===1&&!['investigation','sabotage','exit'].includes(s.stage)||s.characterId!==game.characterId||!STAGES.has(s.stage))return false;
 // An old shop save precedes the west encounter: resume at its new approach.
 if(s.version<3&&s.stage==='investigation')s={...s,stage:'workshop'};
 game.workshopReleased=['investigation','sabotage','exit'].includes(s.stage);
 game.enemies=[];game.openingActivated=true;game.openingSpawned=8;game.circuitIsolated=true;game.circuitRoute=['isolate-convoy','isolate-service'].includes(s.circuitRoute)?s.circuitRoute:null;game.powerAlarm=s.stage!=='power';game.preArchiveLimit=4;game.courtyardPending=false;game.archiveRead=!['power','archive'].includes(s.stage);game.investigationRead=!!s.investigationRead;game.sabotaged=!!s.sabotaged;
 game.encounter=['power','archive','workshop'].includes(s.stage)?0:['investigation','sabotage'].includes(s.stage)?1:2;game.spawned=s.stage==='power'?0:s.stage==='archive'?4:8;game.toSpawn=0;game.nextSpawnAt=Infinity;game.activePortals=[];
 game.kills=s.kills;game.ownedWeapons=new Set([starterWeaponIndex(game.characterId),0,...(Array.isArray(s.owned)?s.owned:[]).filter(i=>Number.isInteger(i)&&weaponAllowedForCharacter(i,game.characterId))]);
 game.weaponIndex=game.ownedWeapons.has(s.weaponIndex)?s.weaponIndex:(game.ownedWeapons.has(2)?2:game.ownedWeapons.has(1)?1:starterWeaponIndex(game.characterId));game.player.hp=Math.min(100,Math.max(1,Number(s.health)||100));
 Object.assign(game.player,POINTS[s.stage],{grounded:true,verticalSpeed:0,onLift:null});
 for(let i=0;i<game.ammo.length;i++)if(Number.isFinite(s.ammo?.[i]))game.ammo[i]=Math.max(0,Math.min(game.ammo[i],s.ammo[i]));
 game.restoreDualAmmo(s.dualAmmo);
 if(s.version>=2){if(Number.isFinite(s.shield))game.player.shield=Math.max(0,Math.min(game.shieldCapacity||60,s.shield));if(Number.isFinite(s.charges))game.charges=Math.max(0,Math.min(CHARGE_MAX,s.charges));}
 if(game.characterId==='ghju'&&s.weaponIndex===0&&!s.owned?.includes(7))game.weaponIndex=7;
 game.setStage(s.stage);
 if(['workshop','investigation'].includes(s.stage)&&!game.ownedWeapons.has(1))game.offerWeapon(1);
 if(s.stage==='sabotage'&&!game.ownedWeapons.has(2))game.offerWeapon(2);
 return true;
}

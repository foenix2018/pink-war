// Menu-safe checkpoint metadata: no renderer or combat engine is loaded here.
export const M02_CHECKPOINT_KEY='pink-wars-m02x-checkpoint-v1-';
const STAGES=new Set(['x-arrivee','x-dispensaire','x-radio','x-eclaireurs','x-grille','x-rue','x-tour','x-badge','x-coffre','x-manifeste','x-quai','x-fin']);
export function validM02Checkpoint(s,characterId){
 if(!s||![1,2].includes(s.version)||s.characterId!==characterId||!STAGES.has(s.stage))return false;
 for(const key of ['opened','done','reads','restore','owned','ammo','collectedSupplies'])if(s[key]!==undefined&&(!Array.isArray(s[key])||s[key].length>128))return false;
 if(s.streetStage!==undefined&&(!Number.isInteger(s.streetStage)||s.streetStage<0||s.streetStage>3))return false;
 return ['time','score','kills','health','shield','charges','savedAt','weaponIndex'].every(key=>s[key]===undefined||Number.isFinite(s[key]));
}
export function readM02Checkpoint(characterId,storage){
 try{const s=JSON.parse((storage||globalThis.localStorage).getItem(M02_CHECKPOINT_KEY+characterId));return validM02Checkpoint(s,characterId)?s:null;}catch{return null;}
}
export function clearM02Checkpoint(characterId,storage){try{(storage||globalThis.localStorage).removeItem(M02_CHECKPOINT_KEY+characterId);}catch{}}

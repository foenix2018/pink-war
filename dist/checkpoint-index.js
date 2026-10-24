// Lightweight checkpoint lookup for the menu: no renderer, world or weapon data.
export const M01_CHECKPOINT_PREFIX='pink-wars-m01-checkpoint-v1-';
export const M01_CHECKPOINT_STAGES=Object.freeze(['investigation','sabotage','exit']);
export function readM01Checkpoint(characterId,storage){
 try{
  storage ||=globalThis.localStorage;
  const s=JSON.parse(storage.getItem(M01_CHECKPOINT_PREFIX+characterId));
  return s?.version===1&&s.characterId===characterId&&M01_CHECKPOINT_STAGES.includes(s.stage)&&Number.isFinite(s.kills)?s:null;
 }catch{return null;}
}

// ORDRE / finite story-arc director: predictable budgets, rising tactical variety.
export const LEVEL1_OPENING_FORMS=Object.freeze([
 'probe','stalker','stalker','scuttler','stalker','stalker','scuttler','stalker'
]);
export const LEVEL1_ENCOUNTERS=Object.freeze([
 Object.freeze(['probe','stalker','scuttler','stalker','stalker','scuttler','stalker','seer']),
 Object.freeze(['stalker','scuttler','stalker','probe','seer','stalker','synth','stalker']),
 Object.freeze(['stalker','scuttler','seer','stalker','probe','seer','synth','synth'])
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const LEVEL1_MAX_ACTIVE=8;
export function activeThreatBudget(encounter=0){
 return [6,7,8][clamp(Math.floor(encounter)||0,0,2)];
}
export function reinforcementDelay({encounter=0,ordinal=0,alive=0,playerHp=100,callForHelp=false}={}){
 const base=[3.35,3.10,2.85][clamp(Math.floor(encounter)||0,0,2)];
 const crowd=Math.max(0,alive-4)*.48;
 const recovery=playerHp<30?2.1:playerHp<55?1.0:0;
 const breathing=ordinal>0&&ordinal%3===0?.75:0;
 return clamp(base+crowd+recovery+breathing-(callForHelp?.8:0),2.3,6.4);
}
export function level1DirectorSummary(){
 return {opening:LEVEL1_OPENING_FORMS.length,encounters:LEVEL1_ENCOUNTERS.map(x=>x.length),
  total:LEVEL1_OPENING_FORMS.length+LEVEL1_ENCOUNTERS.reduce((n,x)=>n+x.length,0),
  maxActive:LEVEL1_MAX_ACTIVE};
}

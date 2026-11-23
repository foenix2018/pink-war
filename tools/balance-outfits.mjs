// Actual authored encounter budgets, not a guarantee of collected loot or mandatory kills.
import {writeFileSync} from 'node:fs';
import {nanoYield} from '../dist/nano-forge.js';
import {ARMOR_STAGES} from '../dist/armor-progression.js';
import {LEVEL1_OPENING_FORMS,LEVEL1_ENCOUNTERS} from '../dist/enemy-director.js';
const rows=[];let accumulated=0;
function add(chapter,kills,raw,source){const expected=Math.floor(raw*.6);accumulated+=expected;rows.push({chapter,kills,raw,expectedAt60Percent:expected,cumulative:accumulated,source});}
const forms=[...LEVEL1_OPENING_FORMS.map(form=>({form,tier:1})),...LEVEL1_ENCOUNTERS.flatMap((g,i)=>g.map(form=>({form,tier:i+1})))];add(1,forms.length,forms.reduce((s,e)=>s+nanoYield(e),0),'enemy-director.js, no extension bonus');
// Conservative planning allowance: chapter 2 uses dynamically scripted squads, no paid mission reward is invented.
add(2,35,35*nanoYield({form:'synth',tier:2}),'planning assumption: 35 kills, tier 2');
for(const[chapter,name]of[[3,'m03'],[4,'m04'],[5,'ligne9'],[6,'m06'],[7,'m07'],[8,'m08'],[9,'m09'],[10,'m10']]){const L=await import('../dist/'+name+'-layout.js');let kills=0,raw=0;for(const e of Object.values(L.ENCOUNTERS))for(const u of e.units||e){kills++;raw+=nanoYield({...u,tier:u.tier||e.wave||chapter});}add(chapter,kills,raw,'authored encounter maximum; some squads are optional');}
for(let chapter=11;chapter<=15;chapter++)add(chapter,24,24*nanoYield({form:'synth',tier:chapter}),'future chapter budget target, not an implemented level');
const spend=ARMOR_STAGES.reduce((n,s)=>n+s.cost,0),result={collectionRatio:.6,rows,stages:ARMOR_STAGES.map(s=>({stage:s.level,chapter:s.chapter,plan:'tenue-'+s.level,cost:s.cost,cumulativeCost:ARMOR_STAGES.slice(0,s.level).reduce((n,x)=>n+x.cost,0)})),totalSuitCost:spend,expectedBudget:accumulated,optionalWeaponEquipmentBudget:accumulated-spend,limits:'60% of the full authored encounter pool is a planning scenario, not a minimum collection promise. Replaying offers salvage; optional purchases reduce the remaining wallet. Chapter 15 and its plan are reserved until that chapter is built. No free suit unlocks or duplicate mission bonuses.'};
if(process.env.BALANCE_OUTPUT)writeFileSync(process.env.BALANCE_OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));

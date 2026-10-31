import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVEL1_ENCOUNTERS,LEVEL1_OPENING_FORMS,activeThreatBudget,reinforcementDelay,level1DirectorSummary} from '../dist/enemy-director.js';
import {individualCombatOrder} from '../dist/enemy-brain.js';
import {CampaignLevel1,OPENING_SITES} from '../dist/campaign-level1.js';

test('ORDRE opens with patrol units and teaches specialists later in a 32-unit campaign',()=>{
 assert.deepEqual(level1DirectorSummary(),{opening:8,encounters:[8,8,8],total:32,maxActive:8});
 assert.deepEqual(OPENING_SITES.map(p=>p.form),LEVEL1_OPENING_FORMS);
 assert.ok(LEVEL1_OPENING_FORMS.every(f=>['probe','stalker','scuttler'].includes(f)));
 assert.equal(LEVEL1_ENCOUNTERS[0][0],'probe');
 assert.equal(LEVEL1_ENCOUNTERS[0].at(-1),'seer');
 assert.equal(LEVEL1_ENCOUNTERS[1].filter(f=>f==='synth').length,1);
 assert.equal(LEVEL1_ENCOUNTERS[2].filter(f=>f==='synth').length,2);
 assert.ok(LEVEL1_ENCOUNTERS.flat().every(f=>!['brute','bulwark','listener'].includes(f)));
 assert.deepEqual([0,1,2].map(activeThreatBudget),[6,7,8]);
 assert.equal(new CampaignLevel1([],()=>.5).campaign.total,32);
});
test('finite reinforcement cadence responds to pressure without cheating with extra units',()=>{
 const normal=reinforcementDelay({encounter:1,alive:3,playerHp:100});
 assert.ok(normal>=2.3);
 assert.ok(reinforcementDelay({encounter:1,alive:6,playerHp:24})>normal);
 assert.ok(reinforcementDelay({encounter:1,alive:3,playerHp:100,callForHelp:true})<normal);
 for(let i=0;i<20;i++)assert.ok(reinforcementDelay({encounter:i,alive:19,playerHp:1})<=6.4);
});
test('injured ordinary soldier retreats, calls allies, and stops firing while relocating',()=>{
 const soldier={id:7,form:'stalker',x:3,z:12,elevation:0,hp:34,maxHp:160,awareness:'engaged',lastSeenAt:3,radius:.65};
 const ally={id:8,form:'stalker',x:4,z:14,elevation:0,hp:100,awareness:'patrol'};
 const threat={x:0,z:0,y:1.25},ctx={time:4,seen:true,threat,obstacles:[],allies:[soldier,ally],segmentBox:()=>null};
 const first=individualCombatOrder(soldier,ctx);
 assert.equal(first.state,'withdraw');assert.equal(first.canFire,false);
 assert.ok(Math.hypot(first.point.x,first.point.z)>Math.hypot(soldier.x,soldier.z));
 assert.equal(soldier.radioCallPending,true);
 assert.equal(ally.awareness,'search');assert.deepEqual([ally.lastKnownX,ally.lastKnownZ],[0,0]);
 const same=individualCombatOrder(soldier,{...ctx,time:5});assert.deepEqual(same.point,first.point);
 Object.assign(soldier,first.point);
 assert.equal(individualCombatOrder(soldier,{...ctx,time:5.1}),null);
 assert.equal(individualCombatOrder(soldier,{...ctx,time:5.2}),null);
});
test('no retreat through walls, Brutes never flee, and stale unseen contacts are not pursued',()=>{
 const wall={x:3,z:18,hx:30,hz:1,y:0,height:4},threat={x:0,z:0,y:1.25};
 const e={id:8,form:'stalker',x:3,z:12,elevation:0,hp:8,maxHp:100,awareness:'engaged',lastSeenAt:0,radius:.8};
 const c={time:9,seen:true,threat,obstacles:[wall],segmentBox:()=>.5,allies:[e]};
 assert.equal(individualCombatOrder(e,c),null);
 assert.equal(individualCombatOrder({...e,form:'brute'}, {...c,obstacles:[],segmentBox:()=>null}),null);
 const stale={...e,form:'stalker',awareness:'search',lastSeenAt:-999,nextRetreatAt:0};
 assert.equal(individualCombatOrder(stale,{...c,seen:false,obstacles:[],segmentBox:()=>null}),null);
});

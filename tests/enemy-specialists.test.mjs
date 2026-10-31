import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_BEHAVIORS,specialistCombatOrder,specialistVisualRelay,probeSpecialistGuidance} from '../dist/enemy-specialists.js';
const forms=['sentinel','stalker','scuttler','seer','listener','synth','brute','bulwark','probe'];
const enemy=(form,id=3)=>({id,form,x:0,z:0,elevation:0,awareness:'engaged',hp:100,maxHp:100,radius:.55,ranged:true});
const ctx=(x=13,z=0)=>({time:3,seen:true,threat:{x,y:1.25,z},allies:[],obstacles:[],segmentBox:()=>null});
test('every Pink Wars enemy form has a unique declared tactical role',()=>{
 assert.deepEqual(Object.keys(ENEMY_BEHAVIORS).sort(),forms.sort());
 assert.equal(new Set(forms.map(f=>ENEMY_BEHAVIORS[f].role)).size,forms.length);
});
test('tactical actions stay finite, world-bounded and tied to perceived contacts',()=>{
 for(const form of forms){const e=enemy(form),action=specialistCombatOrder(e,ctx());
  if(!action)continue;
  assert.ok(Number.isFinite(action.point.x)&&Number.isFinite(action.point.z),form);
  assert.ok(Math.abs(action.point.x)<=95&&Math.abs(action.point.z)<=95,form);
 }
 const hidden=enemy('stalker'); hidden.awareness='patrol';
 assert.equal(specialistCombatOrder(hidden,ctx()),null);
});
test('the BRUTE holds and slams only at verified contact',()=>{
 const e=enemy('brute');assert.equal(specialistCombatOrder(e,ctx(14)),null);
 const a=specialistCombatOrder(e,ctx(1));assert.equal(a.state,'heavy-slam');assert.equal(a.canFire,true);
 assert.equal(specialistCombatOrder(e,{...ctx(1),seen:false}),null);
});
test('RECO1 relays direct, unblocked sightings, not unseen player positions',()=>{
 const e=enemy('seer',4),ally=enemy('synth',5);ally.x=4;ally.awareness='patrol';
 const c={...ctx(),allies:[e,ally],time:1,seen:false};
 assert.equal(specialistVisualRelay(e,c),0);assert.equal(ally.awareness,'patrol');
 assert.equal(specialistVisualRelay(e,{...c,seen:true}),1);
 assert.equal(ally.awareness,'search');assert.equal(ally.lastKnownX,13);
});
test('S-03 flying guidance varies orbit and altitude without teleporting',()=>{
 const e=enemy('probe');
 const a=probeSpecialistGuidance(e,{time:0,range:20,dx:20,dz:0});
 const b=probeSpecialistGuidance(e,{time:8,range:20,dx:20,dz:0});
 for(const q of [a,b])for(const v of ['vx','vz','altitudeOffset'])assert.ok(Number.isFinite(q[v]));
 assert.notEqual(a.vz,b.vz);assert.notEqual(a.altitudeOffset,b.altitudeOffset);
});

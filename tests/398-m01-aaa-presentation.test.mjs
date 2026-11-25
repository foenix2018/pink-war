import test from 'node:test';import assert from 'node:assert/strict';
import {createM01Motion,createM01Alert} from '../dist/m01-aaa-presentation.js';
import {roomFinishPlan} from '../dist/m01-aaa-room-finish.js';
import {ROOMS} from '../dist/m01-extension-layout.js';
import {armorBindKey} from '../dist/aegis-armor.js';
test('room finish remains within authoritative indoor floors',()=>{const plan=roomFinishPlan(ROOMS);assert.equal(plan.length,ROOMS.filter(r=>r.ceiling>0).length);for(const p of plan){const r=ROOMS.find(r=>r.id===p.id);assert.ok(p.w>0&&p.d>0&&p.w<r.x2-r.x1&&p.d<r.z2-r.z1);}});
test('gun motion does not advance twice at same simulation time and vanishes on ADS',()=>{const m=createM01Motion();const a={time:1,velocity:{x:3,z:2},aim:0,grounded:true};m.update(a);a.time+=.016;const p=m.update(a);assert.deepEqual(m.update(a),p);const ads=m.update({...a,aim:1});for(const k of ['x','y','roll'])assert.ok(Math.abs(ads[k])<1e-9);});
test('contact cue responds to actual engaged enemies with four second hysteresis',()=>{const a=createM01Alert();assert.equal(a.update(0,[]).active,false);assert.equal(a.update(1,[{hp:20,awareness:'search'}]).active,false);assert.equal(a.update(2,[{hp:20,awareness:'engaged'}]).changed,true);assert.equal(a.update(5,[]).active,true);assert.equal(a.update(6,[]).active,false);});
test('armor key preserves full bind pose and bone order',()=>{const a={bones:[{name:'A',inverse:[1,2]},{name:'B',inverse:[3,4]}]};assert.equal(armorBindKey(a),armorBindKey(JSON.parse(JSON.stringify(a))));assert.notEqual(armorBindKey(a),armorBindKey({bones:[...a.bones].reverse()}));});

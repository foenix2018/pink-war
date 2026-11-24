import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHideoutNavigation} from '../dist/hideout-navigation.js';
import {createHideoutDoorState} from '../dist/hideout-doors.js';
const l=JSON.parse(readFileSync(new URL('../dist/assets/hideout/layout.json',import.meta.url)));
test('two full-width open portals, no hidden leaves, gym visible and reachable from arrival',()=>{
 assert.equal(l.openPlanRevision,1);assert.equal(l.gymRevision,1);
 const nav=createHideoutNavigation(l),doors=createHideoutDoorState(l);
 for(const [id,z] of [['recharge-ouvert',3.2],['archives-ouvert',-5]]){
  const p=l.portals.find(p=>p.id===id);
  assert.equal(p.axis,'z');assert.equal(p.z,z);assert.equal(p.width,8.2);
  assert.ok(!doors.colliders.some(b=>Math.abs(b.z-z)<.1&&Math.abs(b.x)<4.1));
  for(const x of [-1.5,0,1.5]){assert.ok(nav.free(x,z));assert.ok(nav.clear({x,z:z-.35},{x,z:z+.35}));}
 }
 assert.ok(nav.free(l.spawn.x,l.spawn.z));assert.ok(nav.path(l.spawn,{x:6.35,z:7.65})?.length);
 assert.ok(nav.free(4.55,7.65));assert.ok(nav.free(4.55,1.25));
 assert.equal(l.rooms.find(r=>r.id==='gym').bounds[1],3.2);
 for(const kind of ['Gym squat et banc','Gym rack haltères','Gym rameur','Gym casier'])assert.ok(l.colliders.some(c=>c.kind===kind),kind);
});

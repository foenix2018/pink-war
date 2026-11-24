import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHideoutNavigation} from '../dist/hideout-navigation.js';
const l=JSON.parse(readFileSync(new URL('../dist/assets/hideout/layout.json',import.meta.url)));
test('gym has a separate open entrance, real partition and reachable aisle',()=>{
 assert.equal(l.gymRevision,1);
 const gym=l.rooms.find(r=>r.id==='gym'),work=l.rooms.find(r=>r.id==='atelier'),portal=l.portals.find(p=>p.id==='gym');
 assert.equal(gym.bounds[1],work.bounds[3]);assert.equal(portal.width,3.05);assert.equal(l.portals.length,l.openPlanRevision?4:2);assert.ok(!l.doors.some(d=>d.id==='gym'||d.id==='atelier'));
 const nav=createHideoutNavigation(l);
 assert.ok(nav.free(4.55,7.65));assert.ok(nav.free(4.55,1.25));assert.ok(!nav.free(7.5,3.2));
 assert.ok(nav.free(6.35,7.65));assert.ok(nav.path({x:0,z:4.6},{x:6.35,z:7.65})?.length);
 for(const kind of ['Gym squat et banc','Gym rack haltères','Gym rameur','Gym casier']){
  const c=l.colliders.find(b=>b.kind===kind);assert.ok(c,kind);assert.ok(!nav.free(c.x,c.z),kind);
 }
 const w=l.stations.find(s=>s.id==='workshop');assert.ok(nav.inRoom(w,'atelier'));assert.ok(nav.free(w.x,w.z));assert.ok(nav.path({x:0,z:4.6},w)?.length);
});

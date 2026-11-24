import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const l=JSON.parse(readFileSync(new URL('../dist/assets/hideout/layout.json',import.meta.url)));
test('metric furniture colliders and original hero scale',()=>{
 assert.equal(l.proportionsRevision,2);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<.025,a+' != '+b);
 const one=k=>l.colliders.find(c=>c.kind===k);
 for(const b of l.colliders.filter(c=>c.kind==='Dortoir')){near(b.hz*2,2.1);near(b.hx*2,1.25);}
 near(one('table des archives').height,.85);
 const bench=l.colliders.find(c=>c.kind==='Atelier nanométrique'&&c.x===7.35);
 near(bench.y+bench.height,.95);near(bench.hz*2,1.44);near(l.atelierScale.robotScale,.88);
 near(one('siège d’atelier').height,1.5*.5/.925);
 near(l.showcase.weapons.find(w=>w.index===8).y,.975);
 const ceiling=l.colliders.find(c=>c.kind==='Toiture complète'&&c.hx===11);
 near(ceiling.y,3.65);
 for(const c of l.colliders)assert.ok(c.height>0&&c.hx>0&&c.hz>0);
 assert.equal(l.doors.length,11);assert.equal(l.stations.length,9);
});

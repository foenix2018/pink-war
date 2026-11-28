import test from 'node:test';import assert from 'node:assert/strict';
import {ROUTE,INTERACTIONS,buildCollisions,createTraversal,STAGES,ENCOUNTERS} from '../dist/m11-layout.js';
import {buildM11Roads} from '../dist/m11-structures.js';
const t=createTraversal(),obs=buildCollisions();
const blocked=(x,y,z)=>obs.some(o=>Math.abs(x-o.x)<o.hx+.3&&Math.abs(z-o.z)<o.hz+.3&&y+1.65>o.y&&y<o.y+o.height);
test('M11 main route has a walkable surface and clear simplified collisions',()=>{assert.equal(ROUTE.length,21);for(let i=0;i<ROUTE.length-1;i++){const a=ROUTE[i],b=ROUTE[i+1];for(let k=0;k<=40;k++){const [x,y,z]=a.map((v,j)=>v+(b[j]-v)*k/40);assert.ok(t.surfaces(x,z).some(s=>Math.abs(s.height-y)<.35),'surface '+i+'/'+k);assert.equal(blocked(x,y,z),false,'collision '+i+'/'+k);}}});
test('M11 ten interactions are grounded and accessible',()=>{assert.equal(INTERACTIONS.length,10);assert.equal(STAGES.length,11);for(const p of INTERACTIONS){assert.equal(t.height(p.x,p.z,0,p.y+.3),p.y,p.id);assert.equal(blocked(p.x,p.y,p.z),false,p.id);assert.ok(ENCOUNTERS[p.id]?.length,p.id);}});

test('decorative ramps face upwards and keep the authored level at every visible corner',()=>{
 const quads=[],noop=()=>{};
 const sections=buildM11Roads({box:noop,rod:noop,sector:noop,quad:(...points)=>quads.push(points.slice(0,4))});
 assert.ok(sections>0&&sections<150);
 for(const [a,b,c,d] of quads){
  const nx=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
  assert.ok(nx>0,'the deck is visible from above on a one-sided material');
  for(const [x,y,z] of [a,b,c,d])assert.ok(t.surfaces(x,z).some(p=>Math.abs(p.height-y)<.04),'each vertex matches traversal');
 }
});

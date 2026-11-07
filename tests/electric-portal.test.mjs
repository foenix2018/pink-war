import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {portalEnvelope,createElectricPortal,createElectricPortalSet,PORTAL_CLOSE_SECONDS} from '../dist/electric-portal.js';
import {createPortalLaserController} from '../dist/portal-laser-audio.js';
test('a vertical crack opens before widening; closure retracts its width before its height',()=>{
 assert.deepEqual(portalEnvelope(-1),{charge:0,opening:0,height:0});
 assert.ok(portalEnvelope(1).height>0);assert.equal(portalEnvelope(1).opening,0);
 assert.equal(portalEnvelope(4).opening,1);
 const closing=portalEnvelope(10,1);assert.ok(closing.opening<closing.height);
 assert.deepEqual(portalEnvelope(10,PORTAL_CLOSE_SECONDS),{charge:0,opening:0,height:0});
});
test('both field materials retain bounded finite 3D arcs and fully extinguish',()=>{
 for(const webgpu of [false,true])for(const low of [false,true]){
  const p=createElectricPortal(T,{webgpu,low});
  for(const age of [-1,0,.8,1.5,2.7,12]){p.update(50+age,{age});assert.ok(p.arcCount<=(low?700:1400));p.group.traverse(o=>{if(o.isInstancedMesh)for(const v of o.instanceMatrix.array)assert.ok(Number.isFinite(v));});}
  p.update(60,{age:12,closingAge:PORTAL_CLOSE_SECONDS});assert.equal(p.group.visible,false);assert.equal(p.arcCount,0);
  p.dispose();p.dispose();
 }
});
test('scheduled portals wait, independent waves coexist, and closing effects dispose after removal',()=>{
 const scene=new T.Scene(),set=createElectricPortalSet(T,scene,{low:true});
 const sites=[{id:1,x:1,z:2,openedAt:0},{id:2,x:5,z:4,openedAt:5}];
 set.sync(sites,2);assert.equal(set.portals.size,2);assert.equal(set.portals.get(2).effect.group.visible,false);
 set.sync(sites.slice(1),3);assert.equal(set.portals.size,2);
 set.sync(sites.slice(1),5);assert.equal(set.portals.size,1);assert.equal(set.portals.get(2).effect.group.visible,true);
 set.reset();assert.equal(scene.children.length,0);
});
test('audio triggers once per transition, never while holding open, and mute/reset cancel voices',()=>{
 const calls=[],stops=[];let enabled=true;
 const c=createPortalLaserController({enabled:()=>enabled,play:(_ctx,kind,o)=>{calls.push({kind,delay:o.delay});return{stop:()=>stops.push(kind)};}});
 const site={id:1,x:0,z:0,openedAt:3};c.sync([site],1);c.sync([site],2);c.sync([site],4);
 assert.deepEqual(calls,[{kind:'open',delay:2}]);
 c.sync([],6);assert.equal(calls.at(-1).kind,'close');assert.equal(stops[0],'open');
 c.reset();assert.ok(stops.includes('close'));assert.equal(c.activeCount,0);
 c.sync([site],1);enabled=false;c.sync([site],2);assert.equal(stops.at(-1),'open');
 const count=calls.length;c.sync([],4);assert.equal(calls.length,count);
});
test('a cancelled gate that has not opened does not play a closing sound',()=>{
 const calls=[];const c=createPortalLaserController({play:(_ctx,kind)=>{calls.push(kind);return{stop(){}};}});
 c.sync([{id:1,openedAt:8}],1);c.sync([],2);assert.deepEqual(calls,['open']);
});
test('a closing gate completes even after the mission simulation clock stops',()=>{
 const scene=new T.Scene(),set=createElectricPortalSet(T,scene,{low:true});
 set.sync([{id:1,x:0,z:0,openedAt:0}],4,40);
 set.sync([],4,41);assert.equal(set.portals.size,1);
 set.sync([],4,43);assert.equal(set.portals.size,0);assert.equal(scene.children.length,0);
});
test('pooled M02 gates reuse geometry and keep a constant light count across reinforcements',async()=>{
 const scene=new T.Scene(),set=createElectricPortalSet(T,scene,{poolSize:2,low:true});
 const originals=scene.children.filter(o=>o.name==='PINK WARS / electric arc portal');
 assert.equal(originals.length,2);
 const lightCount=()=>{let n=0;scene.traverse(o=>{if(o.isPointLight)n++;});return n;};assert.equal(lightCount(),2);
 let warmed=0;await set.prepare({isWebGLRenderer:true,compile(){warmed++;}},new T.PerspectiveCamera());assert.equal(warmed,1);
 let first;
 for(let i=0;i<12;i++){
  const t=i*10;set.sync([{id:i,x:3,z:5,openedAt:t}],t+3);const p=set.portals.get(i);first??=p.effect.group;
  assert.equal(p.effect.group,first);assert.equal(lightCount(),2);
  set.sync([],t+4);set.sync([],t+7);assert.equal(set.portals.size,0);assert.equal(lightCount(),2);
  assert.ok(originals.every(o=>!o.visible));
 }
 set.reset();assert.equal(scene.children.filter(o=>o.name==='PINK WARS / electric arc portal').length,2);
 set.dispose();assert.equal(scene.children.length,0);
});

import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';
import {rangeShadowBudget} from '../dist/range-shadows.js';

test('indoor maps cover the booth and all target distances, with a compact aggregate phone/Quest budget',()=>{
 for(const low of [true,false]){
  const art=createShootingRangeArt(T,new T.Scene(),{low}),budget=rangeShadowBudget({low}),lamps=art.shadows.lights;
  assert.equal(lamps.length,4);assert.equal(budget.size,low?512:1024);assert.equal(lamps.reduce((n,l)=>n+l.shadow.mapSize.x*l.shadow.mapSize.y,0),low?1024**2:2048**2);
  for(const z of [22,7,-20,-42,-47])assert.ok(lamps.some(l=>Math.abs(l.position.z-z)<13),'a local ceiling fixture reaches z='+z);
  assert.ok(lamps.every(l=>l.position.y<4.9&&l.shadow.camera.far===34&&!l.shadow.autoUpdate));
  const renderer={shadowMap:{}};art.shadows.setActive(true,renderer);assert.ok(lamps.every(l=>l.castShadow));
  for(const name of ['Tablette de préparation','Séparateur entre deux postes','Boîtier de commande des cibles']){const mesh=art.root.children.find(n=>n.name===name);assert.equal(mesh.castShadow,true);assert.equal(mesh.receiveShadow,true);}
  assert.ok(art.shadows.occlusion.stats().boxes>=10);assert.equal(art.shadows.occlusion.stats().draws,1);
  art.shadows.setActive(false);assert.ok(lamps.every(l=>!l.castShadow));assert.equal(art.shadows.occlusion.root.visible,false);art.dispose();
 }
});

test('static ceiling maps bake once; only fixtures near changing actors refresh and stopping the range cancels updates',()=>{
 const a=createShootingRangeArt(T,new T.Scene(),{low:true}),s=a.shadows,renderer={shadowMap:{}};
 s.setActive(true,renderer);s.update(0,{});assert.equal(s.stats().passes,4);
 const clear=()=>{for(const l of s.lights)l.shadow.needsUpdate=false;renderer.shadowMap.needsUpdate=false;};
 clear();s.update(2,{});assert.equal(s.stats().passes,4);assert.equal(renderer.shadowMap.needsUpdate,false,'static structure does not cause more passes');
 const sim={player:{x:0,z:22},targets:[{id:1,born:0,x:0,y:1.22,z:7,kind:'fixed-near',speed:1,range:0,radius:.62}]};a.update({...sim,time:2});s.update(2,sim);assert.equal(s.stats().passes,6);
 clear();s.update(2.01,sim);assert.ok(s.lights.every(l=>!l.shadow.needsUpdate));s.update(2.2,sim);assert.equal(s.stats().passes,8);assert.ok(s.lights.slice(2).every(l=>!l.shadow.needsUpdate),'empty long-range maps stay cached');
 clear();a.update({time:2.3,targets:[]});s.update(2.3,{player:sim.player,targets:[]});assert.equal(s.lights[1].shadow.needsUpdate,true,'removed plate cannot leave a stale silhouette');
 s.setActive(false);const before=s.stats().passes;s.update(20,sim,true);assert.equal(s.stats().passes,before);a.dispose();
});

test('the complete target mechanism receives shadow flags immediately and owned maps release on disposal',()=>{
 const a=createShootingRangeArt(T,new T.Scene(),{low:true}),sim={time:1,targets:[{id:7,born:0,x:0,y:1.22,z:7,kind:'fixed-near',speed:1,range:0,radius:.62}]};
 a.shadows.setActive(true,{shadowMap:{}});a.update(sim);a.shadows.update(1,sim);
 const target=a.root.children.find(n=>n.name==='Cible escamotable 7');target.traverse(n=>{if(n.isMesh&&n.material.isMeshStandardMaterial){assert.equal(n.castShadow,true);assert.equal(n.receiveShadow,true);}});
 let freed=0;for(const l of a.shadows.lights)l.shadow.map={dispose(){freed++;}};a.dispose();assert.equal(freed,4);a.shadows.dispose();assert.equal(freed,4);
});

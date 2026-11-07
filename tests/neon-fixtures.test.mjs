import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {createNeonFixtures} from '../dist/neon-fixtures.js';

test('long rails become finite tube sections with round emitters, sockets and depth-tested soft halos',()=>{
 const kit=createNeonFixtures(T,new T.Group(),{low:true});kit.bar([8,.08,.05],[0,4,0],[],0xff278d);kit.build();
 assert.equal(kit.stats().fixtures,3);assert.ok(kit.fixtures.every(f=>f.length<=2.8&&f.radius>0));
 const roles=new Set();kit.root.traverse(n=>{if(!n.isMesh)return;roles.add(n.name);assert.equal(n.castShadow,false);if(n.material.isMeshBasicMaterial&&!n.material.transparent)assert.notEqual(n.geometry.type,'BoxGeometry');if(n.name==='Néon / halo'){assert.equal(n.material.depthTest,true);assert.equal(n.material.depthWrite,false);assert.ok(n.material.map.image.data.some(v=>v===0));}});
 for(const role of ['supports','douilles','colliers','tubes','verre','halo'])assert.ok(roles.has('Néon / '+role));assert.equal(kit.stats().lights,0);kit.dispose();
});
test('a side-facing tube has its housing behind the glass and rotates with the arena wall',()=>{
 const kit=createNeonFixtures(T,new T.Group()),frame=new T.Matrix4().makeTranslation(10,0,0);
 kit.bar([.015,.12,1.9],[2.194,.86,21.5],[],0xff278d,frame,-1);kit.build();
 const support=kit.root.getObjectByName('Néon / supports'),m=new T.Matrix4();support.getMatrixAt(0,m);
 assert.ok(new T.Vector3().setFromMatrixPosition(m).x>12.194,'support sits toward the wall, behind the tube');assert.ok(kit.fixtures[0].centre.every((v,i)=>Math.abs(v-[12.194,.86,21.5][i])<1e-9));
 kit.root.updateMatrixWorld(true);kit.root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite)));kit.dispose();
});
test('inaccessible skyline uses fewer triangles while nearby luminaires retain their mechanical details',()=>{
 const near=createNeonFixtures(T,new T.Group(),{low:true}),far=createNeonFixtures(T,new T.Group(),{low:true});
 near.bar([.12,3,.04],[0,8,20]);far.bar([.12,3,.04],[150,8,20]);near.build();far.build();assert.equal(near.stats().fixtures,far.stats().fixtures);assert.ok(far.stats().triangles<near.stats().triangles/3);near.dispose();far.dispose();
});
test('dispose releases instancing buffers once without disposing shared metal materials',()=>{
 const parent=new T.Group(),metal=new T.MeshStandardMaterial();let materialFreed=0,freed=0;metal.addEventListener('dispose',()=>materialFreed++);
 const kit=createNeonFixtures(T,parent,{metal});kit.bar([1,.05,.04],[0,1,0]);kit.build();const count=kit.root.children.length;kit.root.traverse(n=>n.addEventListener('dispose',()=>freed++));kit.dispose();kit.dispose();assert.equal(freed,count);assert.equal(materialFreed,0);assert.equal(parent.children.length,0);metal.dispose();
});

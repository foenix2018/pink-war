import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {sampleFabricWind,sampleCurtainPoint} from '../dist/fabric-motion.js';
import {createCurtainFabric} from '../dist/fabric-surface.js';
import {createMedicalCurtains,M02_CARE_CURTAINS,medicalBedCurtains,curtainFootprint} from '../dist/medical-curtains.js';
import {COMBAT_STATIONS} from '../dist/m03-layout.js';

const intersects=(a,b)=>Math.abs(a.x-b.x)<a.hx+b.hx&&Math.abs(a.z-b.z)<a.hz+b.hz;

test('the curtain attachment is wind-invariant while its lower hem ripples without stretching into the floor',()=>{
 let moving=0;
 for(const u of [0,.17,.5,.84,1]){
  const pinned=sampleCurtainPoint(u,0,0);
  for(const time of [0,.1,3.5,200]){
   assert.deepEqual(sampleCurtainPoint(u,0,time,{wind:1}),pinned);
   const hem=sampleCurtainPoint(u,1,time,{wind:.24});assert.ok(hem.y>=-1.955&&hem.y<=-1.945);assert.ok(Math.abs(hem.z)<.15);
   moving+=Math.abs(hem.z-sampleCurtainPoint(u,1,time+1,{wind:.24}).z);
  }
 }
 assert.ok(moving>.03);
 assert.deepEqual(sampleFabricWind(.5,.8,7,0),{x:0,y:0,z:0});
});

test('WebGPU curtains keep geometry static and use the same deformation for casting shadows',()=>{
 const fabric=createCurtainFabric(T,{webgpu:true}),a=fabric.panel(),b=fabric.panel({width:1.8,phase:4});
 assert.equal(fabric.native,true);assert.equal(a.material,b.material);
 assert.equal(a.material.castShadowPositionNode,a.material.positionNode);
 assert.ok(a.material.normalNode);assert.ok(a.material.isMeshPhysicalNodeMaterial);
 const before=a.geometry.attributes.position.array.slice();fabric.update(30);assert.deepEqual(a.geometry.attributes.position.array,before);
 assert.ok(a.geometry.boundingBox.min.y<=-1.95);assert.ok(a.geometry.boundingBox.max.z>=.35);
 fabric.dispose();
});

test('fallback and Performance curtains have bounded geometry, fixed top stitches and smoothly moving normals',()=>{
 for(const low of [false,true]){
  const fabric=createCurtainFabric(T,{low}),mesh=fabric.panel(),p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
  const top=[];for(let i=0;i<p.count;i++)if(uv.getY(i)===1)top.push([i,p.getX(i),p.getY(i),p.getZ(i)]);
  const before=p.array.slice();fabric.update(3.5);assert.notDeepEqual(p.array,before);
  for(const [i,x,y,z]of top)assert.deepEqual([p.getX(i),p.getY(i),p.getZ(i)],[x,y,z]);
  assert.ok(p.array.every(Number.isFinite));assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));
  assert.ok(p.count<=(low?475:1617));const held=p.array.slice();fabric.update(3.5);assert.deepEqual(p.array,held,'a paused clock freezes the cloth');
  fabric.dispose();
 }
});

test('level 2 care bays leave the foot access, main aisle, door and register clear',()=>{
 assert.equal(M02_CARE_CURTAINS.length,6);
 const paths=[{x:20,z:89.5,hx:1.4,hz:1.4},{x:22,z:84,hx:1.3,hz:1.3},{x:19.1,z:85,hx:.8,hz:4.5}];
 for(const spec of M02_CARE_CURTAINS){
  assert.ok(spec.y-.13-spec.height>.45);assert.equal(spec.support,'ceiling');
  const footprint=curtainFootprint(spec);for(const p of paths)assert.equal(intersects(footprint,p),false);
  assert.ok(footprint.x-footprint.hx>12.3&&footprint.x+footprint.hx<27.7);
  assert.ok(footprint.z-footprint.hz>80.3&&footprint.z+footprint.hz<89.7);
 }
});

test('level 3 curtain positions follow the authored medical bed axis and clear the treatment cabinets',()=>{
 const meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url)));
 const beds=meta.colliders.filter(c=>c.label==='lit médical');assert.equal(beds.length,5);let count=0,skipped=0;
 for(const c of beds){
  const bed={cx:(c.x1+c.x2)/2,cz:(c.z1+c.z2)/2,y:0,along:c.x2-c.x1>c.z2-c.z1?'x':'z'};
  const forward={x:bed.cx,z:bed.cz-2,hx:.6,hz:.4};
  for(const spec of medicalBedCurtains(bed)){
   const b=curtainFootprint(spec);if(COMBAT_STATIONS.some(o=>intersects(o,b))){skipped++;continue;}
   count++;assert.equal(spec.support,'stand');assert.equal(intersects(b,forward),false,'the foot of the bed stays open');
   assert.ok(b.x-b.hx>-45.7&&b.x+b.hx<-12.3&&b.z-b.hz>11.3&&b.z+b.hz<52.7);
  }
 }
 assert.equal(count,9);assert.equal(skipped,1,'omit the panel that would intersect the medicine cabinet');
});

test('rings and tringles are finite, batched, grounded, and every owned resource is released exactly once',()=>{
 const scene=new T.Group(),curtains=createMedicalCurtains(T,scene,{low:true});curtains.span({x:2,z:3,y:3.75,floor:1,support:'stand',width:2.6,height:2});curtains.build();
 scene.updateMatrixWorld(true);const freed=[],world=new T.Box3().setFromObject(curtains.root);
 assert.ok(Math.abs(world.min.y-1)<1e-6,'support pads sit on the authored floor');let meshes=0;
 curtains.root.traverse(o=>{if(!o.isMesh)return;meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));let disposals=0;o.geometry.addEventListener('dispose',()=>disposals++);freed.push(()=>assert.equal(disposals,1));});
 assert.ok(meshes<=4,'one cloth mesh plus three hardware material batches');
 curtains.dispose();curtains.dispose();assert.equal(scene.children.length,0);for(const check of freed)check();
});

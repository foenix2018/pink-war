import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createM03Cleanup,MEDICAL_PARTITIONS} from '../dist/m03-cleanup.js';
import {sectorObstacles,sectorTraversal,decodeSector} from '../dist/m03-sector.js';
import {classifySectorProps} from '../dist/m03-props.js';
import {segmentBox} from '../dist/game-logic.js';
import {createCargoContainer,createFreightTrailer,createMedicalRailcar,createMedicalPartitions,createHoistTrolley} from '../dist/m03-industrial-models.js';
const meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url)));
const binary=readFileSync(new URL('../dist/assets/m03/vesper-sector.bin',import.meta.url));
const sector=decodeSector(meta,binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength));
const materials=()=>{const m=Object.fromEntries(['galva','paint','dark','white','red','yellow','rubber','glass','neonWhite'].map(k=>[k,new T.MeshStandardMaterial()]));m.container=[m.paint,m.red,m.white];return m;};

test('retired field kits and sculptures disappear from the visible prop inventory and the physical world together',()=>{
 const cleanup=createM03Cleanup(meta),before=JSON.stringify(meta),props=classifySectorProps(meta,sector.world).props,world=sectorObstacles(meta);
 assert.equal(cleanup.stats().fieldKits,39);assert.equal(cleanup.stats().sculptures,10);
 assert.equal(props.some(p=>['mast','riser','medcase','cabin'].includes(p.kind)),false);
 let removed=0;
 for(const c of [...meta.colliders,...meta.physicalSolids])if(cleanup.retiredSolid(c)){
  removed++;assert.equal(world.some(o=>o.sector&&o.x===(c.x1+c.x2)/2&&o.z===(c.z1+c.z2)/2&&o.hx===(c.x2-c.x1)/2&&o.hz===(c.z2-c.z1)/2&&o.y===Math.max(0,c.y1)),false);
 }
 assert.equal(removed,79);assert.equal(JSON.stringify(meta),before,'cleanup does not mutate the baked source or checkpoints');
});

test('the clinical shell and access gap survive while the two old opaque partitions become actual glazed walls',()=>{
 const M=materials(),scene=new T.Group(),root=createMedicalPartitions(T,scene,M),ray=new T.Raycaster(),obstacles=sectorObstacles(meta),cleanup=createM03Cleanup(meta);
 scene.updateMatrixWorld(true);
 const westWall={x1:-44.35,x2:-44.35,y1:0,y2:8.5,z1:11.5,z2:52.5};assert.equal(cleanup.retiredFace(westWall),false);
 for(const p of MEDICAL_PARTITIONS)for(const y of [.5,2.2,4.4]){
  ray.set(new T.Vector3(p.x,y,p.z-2),new T.Vector3(0,0,1));const hit=ray.intersectObject(root,true)[0];assert.ok(hit&&Math.abs(hit.point.z-p.z)<.16);
  assert.ok(obstacles.some(o=>segmentBox({x:p.x,y,z:29},{x:p.x,y,z:33},o)!==null));
 }
 const path={x:-24,y:1,z:31};assert.equal(obstacles.some(o=>path.x>o.x-o.hx&&path.x<o.x+o.hx&&path.z>o.z-o.hz&&path.z<o.z+o.hz&&path.y>=(o.y||0)&&path.y<(o.y||0)+o.height),false);
 assert.equal(sectorTraversal(meta).height(path.x,path.z,0,.1),0);
});

for(const [name,make,width,length,height]of [
 ['container',o=>createCargoContainer(T,o),2.6,6,2.7],
 ['trailer',o=>createFreightTrailer(T,o),2.8,13,3.6],
 ['medical railway car',o=>createMedicalRailcar(T,o),3,8.4,4],
 ['freight railway car',o=>createMedicalRailcar(T,{...o,freight:true}),3,5,4],
 ['locomotive',o=>createMedicalRailcar(T,{...o,locomotive:true}),3,8.4,4]
])test(`${name}: grounded wheels or pads, finite detailed geometry and a bounded material budget`,()=>{
 for(const low of [false,true]){
  const root=make({M:materials(),low,width,length,height}),box=new T.Box3().setFromObject(root);let calls=0,triangles=0;
  root.traverse(o=>{if(o.isMesh){calls++;assert.ok(o.material);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
  assert.ok(Math.abs(box.min.y)<.002,`${name} floats: ${box.min.y}`);assert.ok(box.max.y<=height+.02);assert.ok(box.max.z-box.min.z<=width+.2);assert.ok(box.max.x-box.min.x<=length+.6);
  assert.ok(calls<=8&&triangles<15000,JSON.stringify({name,low,calls,triangles}));
 }
});

test('gantry wheels meet their rail and the motor/drum assembly is finite',()=>{
 const root=createHoistTrolley(T,materials()),box=new T.Box3().setFromObject(root);assert.ok(box.max.y>.60&&box.min.y<-.60);let meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});assert.ok(meshes<=3);
});

test('railway wheel treads meet both authored tracks rather than sitting outside the rails',()=>{
 const root=createMedicalRailcar(T,{M:materials()}),ray=new T.Raycaster();root.updateMatrixWorld(true);
 for(const center of[-8.4*.29,8.4*.29])for(const x of[center-.47,center+.47])for(const z of[-.6,.6]){
  ray.set(new T.Vector3(x,-1,z),new T.Vector3(0,1,0));const hit=ray.intersectObject(root,true)[0];assert.ok(hit&&Math.abs(hit.point.y)<.02);
 }
});

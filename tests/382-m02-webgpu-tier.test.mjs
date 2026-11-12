import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import * as M02 from '../dist/m02-extension-layout.js';
const context = new Proxy({}, {get: (o, k) => o[k] ?? (k === 'measureText' ? () => ({width: 10}) : k === 'getImageData' ? (x, y, w = 1, h = 1) => ({data: new Uint8ClampedArray(Math.max(4, w * h * 4)), width: w, height: h}) : k.startsWith('create') ? () => ({addColorStop(){}, data: new Uint8ClampedArray(4)}) : () => {}), set: (o,k,v) => (o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
T.TextureLoader.prototype.load=function(){return new T.Texture();}; // no image I/O in node
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const mats=scene=>{const s=new Set();scene.traverse(o=>{for(const m of [].concat(o.material||[]))s.add(m);});return [...s];};
const build=opts=>{const scene=new T.Scene(),art=createM02ExtensionArt(T,scene,opts);art.build(M02.extensionObstacles());return {scene,art};};

test('WebGPU upgrades M02 objects to physical clearcoat/sheen materials, WebGL and Performance keep standard materials',()=>{
 const gpu=mats(build({webgpu:true}).scene),gl=mats(build({webgpu:false}).scene),low=mats(build({webgpu:true,quality:'low'}).scene);
 const physical=gpu.filter(m=>m.isMeshPhysicalMaterial);
 assert.ok(physical.length>=20,'physical materials on WebGPU: '+physical.length);
 assert.ok(physical.some(m=>m.clearcoat>0),'clearcoat on painted metal, tiles and wet surfaces');
 assert.ok(physical.some(m=>m.sheen>0),'sheen on fabrics and blankets');
 assert.equal(gl.filter(m=>m.isMeshPhysicalMaterial).length,0,'WebGL fallback unchanged');
 assert.equal(low.filter(m=>m.isMeshPhysicalMaterial).length,0,'Performance budget unchanged');
 for(const m of physical)assert.ok(Number.isFinite(m.roughness)&&Number.isFinite(m.metalness));
});

test('hi-res PBR (1k maps, anisotropy 8) only when the renderer runs WebGPU and not in Performance',()=>{
 const page=read('level2-test.js'),lean=read('level2-materials.js');
 assert.match(page,/hiRes:!!renderer\?\.backend\?\.isWebGPUBackend/);
 assert.match(lean,/HI_RES_PBR/);assert.match(lean,/hiRes&&!performance|!performance&&hiRes/);
});

test('chapter 03 gets the same WebGPU tier: baked sector and mission props, standard materials elsewhere',async()=>{
 const {createSectorMeshes,decodeSector}=await import('../dist/m03-sector.js');
 const {readFileSync:rf}=await import('node:fs');
 const meta=JSON.parse(rf(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url),'utf8')),bin=rf(new URL('../dist/assets/m03/vesper-sector.bin',import.meta.url));
 const sector=decodeSector(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
 const kinds=opts=>{const g=createSectorMeshes(T,sector,opts).group,s=new Set();g.traverse(o=>{for(const m of [].concat(o.material||[]))s.add(m);});return [...s];};
 const gpu=kinds({webgpu:true}),gl=kinds({webgpu:false}),low=kinds({webgpu:true,quality:'low'});
 assert.ok(gpu.filter(m=>m.isMeshPhysicalMaterial).length>=6);assert.ok(gpu.some(m=>m.clearcoat>=1),'rain-wet road');assert.ok(gpu.some(m=>m.sheen>0),'cloth');
 assert.equal(gl.filter(m=>m.isMeshPhysicalMaterial).length,0);assert.equal(low.filter(m=>m.isMeshPhysicalMaterial).length,0);
 const art=read('m03-art.js');assert.match(art,/createSectorMeshes\(T, sector, \{ quality, webgpu, drop: propList.drop \}\)/);assert.match(art,/const rich = webgpu && !low/);
 assert.match(read('niveau3.js'),/webgpu:!!renderer\.backend\?\.isWebGPUBackend/);
});

test('WebGPU finish: rounded boxes keep their size, round parts get facets by real size, materials stay the same objects',async()=>{
 const {upgradeForWebGPU,roundedBox,coatFor}=await import('../dist/webgpu-upgrade.js');
 const g=roundedBox(T,2,1,.5,.05);g.computeBoundingBox();const s=g.boundingBox.getSize(new T.Vector3());
 assert.ok(Math.abs(s.x-2)<1e-6&&Math.abs(s.y-1)<1e-6&&Math.abs(s.z-.5)<1e-6,'same outer size');
 const scene=new T.Scene(),paint=new T.MeshStandardMaterial({color:0xff0000,roughness:.4,metalness:.2}),stone=new T.MeshStandardMaterial({roughness:.95});
 const crate=new T.Mesh(new T.BoxGeometry(1,1,1),paint),drum=new T.Mesh(new T.CylinderGeometry(.5,.5,1,8),paint),bulb=new T.Mesh(new T.SphereGeometry(.03,8,6),stone);
 const neon=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,8),paint,50);const m=new T.Matrix4();for(let i=0;i<50;i++)neon.setMatrixAt(i,m.makeScale(.02,3,.02));
 const camera=new T.PerspectiveCamera(),gun=new T.Mesh(new T.BoxGeometry(.2,.2,.6),new T.MeshStandardMaterial({roughness:.3}));camera.add(gun);
 scene.add(crate,drum,bulb,neon,camera);const held=paint;
 const st=upgradeForWebGPU(T,scene,{camera});
 assert.equal(crate.material,held);assert.ok(paint.isMeshPhysicalMaterial&&paint.clearcoat>0,'paint lacquered in place');assert.equal(paint.color.getHex(),0xff0000);
 assert.ok(!stone.isMeshPhysicalMaterial,'rough stone keeps its look');
 assert.equal(crate.geometry.userData.webgpuShape,'rounded');assert.ok(drum.geometry.parameters.radialSegments>=40);
 assert.equal(bulb.geometry.parameters.widthSegments,8,'a 3 cm bulb is already round');
 assert.equal(neon.geometry.parameters.radialSegments,8,'thin neon tubes are not refaceted for their length');
 assert.equal(gun.geometry.type,'BoxGeometry');assert.ok(!gun.material.isMeshPhysicalMaterial,'first-person weapon untouched');
 assert.ok(st.addedTriangles<350000);assert.equal(coatFor({roughness:.95,metalness:0}),null);
 const again=upgradeForWebGPU(T,scene,{camera});assert.equal(again.rounded+again.smoothed+again.materials,0,'idempotent: a second pass changes nothing');
 for(const page of ['level2-test.js','niveau3.js'])assert.match(read(page),/upgradeForWebGPU\(T,scene,\{camera\}\)/);
 assert.match(read('level2-test.js'),/get\('finish'\)==='1'\)\|\|low\(\)\|\|profile\.phone\)return null/);
});

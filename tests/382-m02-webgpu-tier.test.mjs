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
 const art=read('m03-art.js');assert.match(art,/createSectorMeshes\(T, sector, \{ quality, webgpu \}\)/);assert.match(art,/const rich = webgpu && !low/);
 assert.match(read('niveau3.js'),/webgpu:!!renderer\.backend\?\.isWebGPUBackend/);
});

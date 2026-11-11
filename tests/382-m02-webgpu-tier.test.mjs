import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import * as M02 from '../dist/m02-extension-layout.js';
const context = new Proxy({}, {get: (o, k) => o[k] ?? (k.startsWith('create') ? () => ({addColorStop(){}}) : () => {}), set: (o,k,v) => (o[k]=v,true)});
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

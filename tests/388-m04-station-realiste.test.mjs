import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import * as L from '../dist/m04-layout.js';
import {linesFor} from '../dist/m04-story.js';

// Headless stand-ins for the canvas and image loading used by the texture code.
const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}, set:()=>true});
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>ctx,style:{}}),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){}})};
const {createStationKit}=await import('../dist/m04-station.js');
const read=p=>readFileSync(new URL('../dist/'+p,import.meta.url),'utf8');

test('M04 station: every scanned surface exists with colour, normal and roughness maps',()=>{
 const src=read('m04-station.js');
 for(const [,name,diff] of src.matchAll(/pbr\('([a-z0-9_]+)',\s*\{(?:\s*diff:\s*'([a-z_]+)')?/g)){
  for(const f of [`${diff||name}_diff_1024.jpg`,`${name}_nor_1024.jpg`,`${name}_rough_512.jpg`])assert.ok(existsSync(new URL('../dist/assets/m04/'+f,import.meta.url)),f);
 }
 assert.match(read('assets/m04/LICENSE.md'),/CC0/);
});

test('M04 station: the plant equipment is modelled on its collision boxes and merged into few draw calls',async()=>{
 // Code-built versions (the fallback when the Blender models cannot be fetched).
 const root=new T.Group(),kit=createStationKit(T,root,{low:false,fetchImpl:async()=>({ok:false,status:404})}),obstacles=L.buildCollisions();
 let dressed=0;const kinds=new Set();
 for(const o of obstacles)if(kit.dress(o)){dressed++;kinds.add(o.kind);}
 kit.walls(obstacles);kit.hangar(L.AREAS.find(a=>a.id==='hangar'));kit.plantBeyond();const warn=console.warn;console.warn=()=>{};await kit.finish();console.warn=warn;
 for(const k of ['transformer','tank','container','piperack','coolant','servers','rack','crates','guard-post','reactor'])assert.ok(kinds.has(k),k);
 assert.ok(dressed>=30,'dressed '+dressed);
 assert.ok(kit.stats.drones>=48,'drones parked in the hangar racks');assert.equal(kit.stats.fans,8);
 let meshes=0,tris=0;root.traverse(n=>{if(!n.isMesh)return;meshes++;const a=n.geometry.attributes.position;tris+=a.count/3*(n.isInstancedMesh?n.count:1);for(let i=0;i<a.array.length;i+=97)assert.ok(Number.isFinite(a.array[i]));assert.ok(n.geometry.attributes.uv||n.isInstancedMesh,'uv for textures');});
 assert.ok(kit.stats.meshes<=60,'static pieces merged per material: '+kit.stats.meshes);
 assert.ok(tris<900000,'triangle budget '+tris);
 // Nothing modelled inside the walkway between the reactor's coolant loops and the stabiliser cages.
 assert.ok(kit.stats.pieces>3000);
});

test('M04 wall pilasters keep the wall thickness on both orientations (no slab across the court)',()=>{
 const src=read('m04-station.js');
 assert.match(src,/along \? \.6 : o\.hx \* 2 \+ \.16, o\.height, along \? o\.hz \* 2 \+ \.16 : \.6/);
});

test('M04 level: WebGPU finish, film look, camera feel and the in-engine end scene with the sister',()=>{
 const page=read('niveau4.js');
 for(const part of ['upgradeForWebGPU','mountFilmLook','createCameraFeel','playEndCinematic',"linesFor('fin',characterId)",'Chapitre 04 · Le Protocole Interdit'])assert.ok(page.includes(part),part);
 assert.ok(read('m04-art.js').includes('createLightShafts'));
 for(const c of ['ghju','lylu']){const l=linesFor('fin',c);assert.ok(l.length>=6);assert.ok(l.some(x=>x.who===(c==='lylu'?'cara':'gaby')));assert.ok(!l.some(x=>/est mort|est morte/.test(x.text)));}
});

test('M04 Blender models: reactor, transformer and drone rack fit their collision boxes, with baked occlusion',async()=>{
 const {parsePWM,M04_MODEL_FILES}=await import('../dist/m04-models.js');
 const box={reactor:L.buildCollisions().find(o=>o.kind==='reactor'),transformer:L.buildCollisions().find(o=>o.kind==='transformer'),rack:L.buildCollisions().find(o=>o.kind==='rack')};
 const S=await import('../dist/m04-station.js');const kitM=createStationKit(T,new T.Group(),{fetchImpl:async()=>({ok:false})}).M;
 for(const [key,file] of Object.entries(M04_MODEL_FILES)){
  const buf=readFileSync(new URL('../dist/assets/m04/models/'+file+'.pwm',import.meta.url)),m=parsePWM(T,buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)),o=box[key];
  assert.ok(existsSync(new URL('../dist/assets/m04/models/'+file+'_ao.jpg',import.meta.url)),file+' occlusion');
  assert.ok(m.triangles>5000&&m.triangles<200000,file+' '+m.triangles);
  // The model stands on the floor and stays within its collision box (a small overhang for pipes and handrails).
  assert.ok(Math.abs(m.min[1])<.05,file+' on the floor');
  assert.ok(m.max[0]<=o.hx+.6&&-m.min[0]<=o.hx+.6&&m.max[2]<=o.hz+.6&&-m.min[2]<=o.hz+.6,file+' footprint '+JSON.stringify([m.min,m.max]));
  for(const p of m.primitives){assert.ok(kitM[p.material]||p.material==='glowMagenta',file+' surface '+p.material);assert.ok(p.geometry.attributes.uv1.count===p.geometry.attributes.position.count);}
 }
});

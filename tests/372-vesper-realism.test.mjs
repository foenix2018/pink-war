import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.webgpu.min.js';
import {createVesperSurfaces} from '../dist/vesper-surfaces.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import * as M01 from '../dist/m01-extension-layout.js';
import * as M02 from '../dist/m02-extension-layout.js';
const context=new Proxy({}, {get:(o,k)=>o[k]??(k.startsWith('create')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const T={...THREE,TextureLoader:class{load(){return new THREE.Texture();}}};

test('material families share deterministic PBR channels with correct colour spaces and metal content',()=>{
 const a=createVesperSurfaces(T),b=createVesperSurfaces(T);const materials={};
 for(const kind of ['paint','steel','copper','wood','fabric','rubber','paper','soil','bark','leaf','ceramic']){
  const m=a.apply(new T.MeshStandardMaterial(),kind),other=b.apply(new T.MeshStandardMaterial(),kind);materials[kind]=m;
  assert.equal(m.map.colorSpace,T.SRGBColorSpace);assert.equal(m.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(m.bumpMap.colorSpace,T.NoColorSpace);
  assert.equal(m.metalnessMap,m.roughnessMap);assert.deepEqual(m.map.image.data,other.map.image.data);
  const twin=a.apply(new T.MeshStandardMaterial(),kind);assert.equal(twin.map,m.map);assert.equal(twin.bumpMap,m.bumpMap);
  const bytes=m.roughnessMap.image.data;
  for(let i=0;i<bytes.length;i+=4){assert.equal(bytes[i+3],255);if(['wood','fabric','rubber','paper','soil','bark','leaf','ceramic'].includes(kind))assert.equal(bytes[i+2],0);}
 }
 assert.ok(materials.steel.roughnessMap.image.data[2]>200);
 const paint=materials.paint.roughnessMap.image.data;let hasChip=false,hasPaint=false;
 for(let i=2;i<paint.length;i+=4){if(paint[i]>150)hasChip=true;if(paint[i]<20)hasPaint=true;}assert.ok(hasChip&&hasPaint);
 assert.ok(a.stats().bytes<2.2*1024*1024);a.dispose();b.dispose();assert.equal(a.stats().textures,0);
});

test('low quality retains colour and roughness, omits bump textures and stays below 400 KiB',()=>{
 const s=createVesperSurfaces(T,{low:true});
 for(const kind of ['paint','steel','copper','wood','fabric','rubber','paper','soil','bark','leaf','ceramic']){
  const m=s.apply(new T.MeshStandardMaterial(),kind);assert.equal(m.map.image.width,64);assert.equal(m.bumpMap,null);assert.ok(m.roughnessMap);
 }
 assert.ok(s.stats().bytes<400*1024);s.dispose();
});

test('book shelves are open between shelves, and medicines are visible inside the glazed cabinet',()=>{
 const scene=new T.Scene(),m01=createM01ExtensionArt(T,scene,{quality:'low'});m01.build(M01.extensionObstacles());scene.updateMatrixWorld(true);
 const shelf=new T.Raycaster(new T.Vector3(-23,.50,-69.1),new T.Vector3(0,0,1),0,1).intersectObjects(m01.root.getObjectsByProperty('isMesh',true),false).filter(h=>!h.object.material.transparent);
 assert.ok(shelf.length);assert.ok(shelf[0].point.z> -68.6,'no solid box in front of the books');
 const scene2=new T.Scene(),m02=createM02ExtensionArt(T,scene2,{quality:'low'});m02.build(M02.extensionObstacles());scene2.updateMatrixWorld(true);
 const pills=new T.Raycaster(new T.Vector3(26.6,.57,84.2),new T.Vector3(1,0,0),0,1.5).intersectObjects(m02.root.getObjectsByProperty('isMesh',true),false).filter(h=>!h.object.material.transparent);
 assert.ok(pills.length);assert.match(pills[0].object.material.name,/céramique|marquages imprimés/,'bottle or its printed label rather than an opaque cabinet front');
 const stats=m02.stats();assert.ok(stats.details.accessories>20);assert.ok(stats.details.surfaces.bytes<400*1024);
});

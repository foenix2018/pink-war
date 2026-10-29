import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.webgpu.min.js';
import {createVesperProps,createBreachFrame} from '../dist/vesper-props.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import * as M01 from '../dist/m01-extension-layout.js';
import * as M02 from '../dist/m02-extension-layout.js';

// Geometry tests need the canvas API, not a native canvas dependency. Real
// canvas painting and shader compilation are covered by browser verification.
const context = new Proxy({}, {get: (o, k) => o[k] ?? (k.startsWith('create') ? () => ({addColorStop(){}}) : () => {}), set: (o,k,v) => (o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const T={...THREE,TextureLoader:class {load(){return new THREE.Texture();}}};
function finite(root){root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),o.name);assert.ok(o.material);});}

test('all 23 authored doorways have moving hardware and clear their whole opening',()=>{
 const scene=new T.Scene(),kit=createVesperProps(T,scene,{low:true});
 for(const d of [...M01.DOORS,...M02.DOORS]){
  const model=kit.door(d);model.update(0);model.root.updateMatrixWorld(true);
  // A ray through each leaf is blocked when the door is closed, then clears
  // at every sampled height when it is fully open (including sectional doors).
  const ray=(y)=>{const origin=new T.Vector3(.2,y,2).applyMatrix4(model.root.matrixWorld),dir=new T.Vector3(0,0,-1).transformDirection(model.root.matrixWorld);return new T.Raycaster(origin,dir,0,4).intersectObject(model.root,true);};
  assert.ok(ray(d.height*.45).length>0,d.id+' closed');
  const handle=model.leaves[0].root.children[0],before=handle.getWorldPosition(new T.Vector3()).clone();
  model.update(1);model.root.updateMatrixWorld(true);
  assert.ok(handle.getWorldPosition(new T.Vector3()).distanceTo(before)>.5,d.id+' hardware follows leaf');
  for(const y of [.15,d.height*.35,d.height*.65,d.height-.15])assert.equal(ray(y).length,0,d.id+' clears at '+y);
  model.root.visible=false;
 }
 assert.equal(kit.stats().doors,M01.DOORS.length+M02.DOORS.length);finite(scene);kit.dispose();assert.equal(scene.children.length,0);
});

test('plants have curved, naturally lit leaves; computers obey separate supply circuits',()=>{
 const scene=new T.Scene(),kit=createVesperProps(T,scene);
 kit.plant(0,0,0);kit.plant(2,.8,0,1,'fern');
 kit.computer({x:5,z:0,power:'caserne'});kit.computer({x:7,z:0,kind:'helix',power:'tower'});kit.finish();
 const leaves=[];scene.traverse(o=>{if(o.isMesh&&/feuillage|feuilles/.test(o.material.name))leaves.push(o);});
 assert.ok(leaves.length>=2);assert.ok(leaves.every(o=>o.material.isMeshStandardMaterial&&o.material.emissive.getHex()===0));
 const screens=[];scene.traverse(o=>{if(o.isMesh&&o.material.name.includes('écran'))screens.push(o.material);});
 kit.update({caserne:false,tower:true});assert.ok(screens.find(m=>m.name.includes('caserne')).color.r<.03);assert.ok(screens.find(m=>m.name.includes('tower')).color.r>.8);
 kit.update({caserne:true,tower:false});assert.ok(screens.find(m=>m.name.includes('caserne')).color.r>.8);assert.ok(screens.find(m=>m.name.includes('tower')).color.r<.03);
 assert.ok(kit.stats().batches<=12);finite(scene);kit.dispose();assert.equal(scene.children.length,0);
});

test('both full extensions build in normal and low quality within bounded detail budgets',()=>{
 for(const low of [false,true])for(const [create,layout] of [[createM01ExtensionArt,M01],[createM02ExtensionArt,M02]]){
  const scene=new T.Scene(),before=JSON.stringify(layout.extensionObstacles());
  const art=create(T,scene,{quality:low?'low':'normal'});art.build(layout.extensionObstacles());
  const camera=new T.PerspectiveCamera();camera.position.set(0,1.7,0);
  art.update(2,.016,camera,{x:0,z:0});
  const s=art.stats();assert.ok(s.details.computers>=3);assert.ok(s.details.plants>=8);assert.equal(s.details.doors,layout.DOORS.length);
  assert.ok(s.details.triangles<140000,JSON.stringify(s.details));assert.ok(s.details.batches<170,JSON.stringify(s.details));
  assert.equal(JSON.stringify(layout.extensionObstacles()),before,'rendering preserves authored collision data');
  art.setDoor(layout.DOORS[0].id,true);art.update(3,10,camera,{x:0,z:0});finite(scene);
 }
});

test('reinforcement portal coils leave the original aperture free and use three batches',()=>{
 const scene=new T.Scene(),m={steel:new T.MeshStandardMaterial(),dark:new T.MeshStandardMaterial(),energy:new T.MeshBasicMaterial()};
 const frame=createBreachFrame(T,scene,m);finite(frame);
 assert.equal(frame.children.length,3);
 const hits=new T.Raycaster(new T.Vector3(0,0,2),new T.Vector3(0,0,-1)).intersectObject(frame,true);assert.equal(hits.length,0);
});

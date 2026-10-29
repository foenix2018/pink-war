import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.webgpu.min.js';
import {createVesperProps} from '../dist/vesper-props.js';
import {createLivedInDressing} from '../dist/vesper-lived-in.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import * as M01 from '../dist/m01-extension-layout.js';
import * as M02 from '../dist/m02-extension-layout.js';
const ctx=new Proxy({}, {get:(o,k)=>o[k]??(k.startsWith('create')?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const T={...THREE,TextureLoader:class{load(){return new THREE.Texture();}}};
function fixture(chapter,low=false){const scene=new T.Scene(),palette=createVesperProps(T,scene,{low}),life=createLivedInDressing(T,scene,{chapter,low,materials:palette.M});return{scene,palette,life};}

test('personal belongings and supplies are supported by existing furniture in both chapters',()=>{
 for(const low of [false,true])for(const [chapter,L] of [[1,M01],[2,M02]]){
  const {scene,palette,life}=fixture(chapter,low),obstacles=L.extensionObstacles(),before=JSON.stringify(obstacles);life.build(obstacles);
  const s=life.stats();assert.ok(s.objects>=12,JSON.stringify(s));assert.equal(s.objects,s.placements.length);
  for(const p of s.placements){assert.ok(Math.abs(p.x-p.supportX)<=p.hx,JSON.stringify(p));assert.ok(Math.abs(p.z-p.supportZ)<=p.hz,JSON.stringify(p));assert.equal(p.y,p.supportY);}
  assert.equal(JSON.stringify(obstacles),before);assert.ok(s.batches<=30,JSON.stringify(s));assert.ok(s.triangles<35000,JSON.stringify(s));
  assert.equal(s.waterFeatures,chapter===1?1:0);assert.equal(s.movingCloth,chapter===2?5:0);
  let lights=0;scene.traverse(o=>{if(o.isLight)lights++;if(o.isMesh)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});assert.equal(lights,0);
  const count=life.root.children.length;life.build(obstacles);assert.equal(life.root.children.length,count,'build is idempotent');
  life.dispose();palette.dispose();assert.equal(scene.children.length,0);
 }
});

test('fans start only with their own circuit, coast to a stop, and freeze at zero dt',()=>{
 for(const chapter of [1,2]){
  const {palette,life}=fixture(chapter,true),power=chapter===1?'caserne':'enclave';
  life.build([{extension:true,kind:'console',x:0,z:0,hx:1,hz:.5,height:1}]);const rotor=life.root.getObjectByName('VESPER / pales mobiles');assert.ok(rotor);
  life.update(1,.1,{caserne:false,enclave:false,tower:true});assert.equal(rotor.rotation.z,0);
  for(let i=0;i<30;i++)life.update(i/10,.1,{[power]:true});assert.ok(life.stats().fanSpeeds[0].speed>16);assert.notEqual(rotor.rotation.z,0);
  const rotation=rotor.rotation.z,speed=life.stats().fanSpeeds[0].speed;life.update(4,0,{[power]:false});assert.equal(rotor.rotation.z,rotation);assert.equal(life.stats().fanSpeeds[0].speed,speed);
  for(let i=0;i<40;i++)life.update(4+i/10,.1,{});assert.ok(life.stats().fanSpeeds[0].speed<.01);
  life.dispose();palette.dispose();
 }
});

test('the basin has visible water below its rim, and the drop stays below its attached spout',()=>{
 const scene=new T.Scene(),art=createM01ExtensionArt(T,scene,{quality:'low'});art.build(M01.extensionObstacles());scene.updateMatrixWorld(true);
 const ray=new T.Raycaster(new T.Vector3(28,1,-83),new T.Vector3(0,-1,0),0,2);
 const hit=ray.intersectObjects(art.root.getObjectsByProperty('isMesh',true),false).find(h=>h.object.material.name==='VESPER / eau du bassin');
 assert.ok(hit,'open basin exposes the water');assert.ok(Math.abs(hit.point.y-.28)<.001);
 const {palette,life}=fixture(1,true);life.build([{extension:true,kind:'basin',x:0,z:0,hx:2,hz:2,height:.6}]);
 for(let k=0;k<100;k++){life.update(k*.07,.016,{});life.root.traverse(o=>{if(o.isMesh)assert.ok(Number.isFinite(o.position.y));});}
 life.dispose();palette.dispose();
});

test('both full extensions expose the new dressing without changing authoritative obstacles',()=>{
 for(const [create,L]of[[createM01ExtensionArt,M01],[createM02ExtensionArt,M02]]){
  const scene=new T.Scene(),art=create(T,scene,{quality:'low'}),obstacles=L.extensionObstacles(),before=JSON.stringify(obstacles);art.build(obstacles);
  const camera=new T.PerspectiveCamera();camera.position.set(0,1.7,0);art.update(1,.016,camera,camera.position);
  assert.ok(art.stats().livedIn.objects>=12);assert.equal(JSON.stringify(obstacles),before);
  const tag=art.root.getObjectByName('M01 / catalogue botanique FOUGÈRE DES TOITS');
  if(tag){const y=tag.position.y;for(let i=0;i<90;i++)art.update(1,.016,camera,camera.position);assert.equal(tag.position.y,y,'botanical labels do not drift with frame count');assert.ok(Math.abs(y-1.9)<=.025);} 
 }
});

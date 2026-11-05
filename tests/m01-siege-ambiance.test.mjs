import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createM01SiegeAmbiance,m01DuskWeight,m01Covered,m01BeamEnd,M01_SEARCHLIGHTS} from '../dist/m01-siege-ambiance.js';
import {createLevel1Obstacles} from '../dist/level1-layout.js';
import {extensionObstacles} from '../dist/m01-extension-layout.js';

test('the chapter retains daylight control, with its strongest siege palette at dusk and night',()=>{
 assert.equal(m01DuskWeight(.43),1);assert.equal(m01DuskWeight(0),1);
 assert.equal(m01DuskWeight(1),0);assert.equal(m01DuskWeight(NaN),1);
 assert.ok(m01DuskWeight(.7)>.3&&m01DuskWeight(.7)<.7);
 for(let day=0;day<=1;day+=.01)assert.ok(m01DuskWeight(day)>=0&&m01DuskWeight(day)<=1);
});
test('a ceiling suppresses outdoor effects, while a ground slab or nearby wall does not',()=>{
 const slab={x:0,z:0,hx:10,hz:10,y:-.2,height:.2},roof={x:0,z:0,hx:4,hz:4,y:3,height:.2};
 assert.equal(m01Covered({x:0,y:1.7,z:0},[slab]),false);
 assert.equal(m01Covered({x:0,y:1.7,z:0},[roof]),true);
 assert.equal(m01Covered({x:6,y:1.7,z:0},[roof]),false);
 assert.equal(m01Covered({x:0,y:4,z:0},[roof]),false);
});
test('searchlight beams stop at the first actual building or ceiling',()=>{
 const from={x:0,y:10,z:0},to={x:10,y:0,z:0};
 assert.deepEqual(m01BeamEnd(from,to,[]),to);
 const wall={x:4,z:0,hx:.5,hz:4,y:0,height:12};
 const end=m01BeamEnd(from,to,[{...wall,x:8},wall]);
 assert.equal(end.x,3.5);assert.equal(end.y,6.5);
 const roof={x:0,z:0,hx:20,hz:20,y:4,height:.2};
 assert.ok(Math.abs(m01BeamEnd(from,to,[roof]).y-4.2)<1e-8);
});
test('low and high detail fit bounded budgets without changing the canonical map or its extension',()=>{
 for(const performance of [true,false]){
  const obstacles=[...createLevel1Obstacles(),...extensionObstacles()],before=JSON.stringify(obstacles);
  const scene=new T.Scene();scene.fog=new T.Fog(0x747b79,52,265);
  const a=createM01SiegeAmbiance(T,scene,{obstacles,performance});
  const atmosphere={sun:new T.DirectionalLight(0xffe3bb),ambient:new T.HemisphereLight(0xc2cdcf,0x34332c)},renderer={toneMappingExposure:.84};
  const frame=(time,day,position)=>{atmosphere.sun.intensity=1.12+day*.55;atmosphere.ambient.intensity=.51+day*.26;a.update(time,.016,{position},{atmosphere,renderer,day});};
  frame(0,.43,new T.Vector3(-42,1.765,88));frame(4,.43,new T.Vector3(0,1.765,30));
  const stats=a.stats();assert.equal(stats.searchlights,M01_SEARCHLIGHTS.length);assert.equal(stats.banners,6);assert.equal(stats.addedColliders,0);
  assert.ok(stats.maxDynamicLights<=(performance?2:3));assert.ok(stats.meshes<50);assert.ok(stats.triangles<25000);
  assert.equal(renderer.toneMappingExposure,1.08);assert.ok(atmosphere.ambient.intensity>.9);
  const beamMeshes=[];a.root.traverse(o=>{if(o.geometry?.type==='ConeGeometry')beamMeshes.push(o);});
  assert.ok(beamMeshes.filter(m=>m.scale.y>2).length>=6,'fixtures illuminate real exterior space rather than their mounting wall');
  frame(7,1,new T.Vector3(0,1.765,30));assert.equal(a.stats().dynamicLights,0);assert.equal(renderer.toneMappingExposure,.84);
  scene.updateMatrixWorld(true);scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.geometry)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));});
  assert.equal(JSON.stringify(obstacles),before);a.dispose();a.dispose();assert.equal(a.root.parent,null);
 }
});
test('exterior rain and additional lights are disabled while the observer is under a roof',()=>{
 const obstacles=[{x:0,z:0,hx:6,hz:6,y:3,height:.2}];
 const a=createM01SiegeAmbiance(T,new T.Scene(),{obstacles,performance:true});
 a.update(1,.016,{position:new T.Vector3(0,1.7,0)});
 assert.equal(a.stats().covered,true);assert.equal(a.stats().dynamicLights,0);
 assert.equal(a.root.getObjectByName('Pluie et brume extérieures').visible,false);a.dispose();
});

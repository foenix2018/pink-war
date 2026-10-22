import test from 'node:test';
import assert from 'node:assert/strict';
import {createStreetAtmosphere} from '../dist/level2-atmosphere.js';
import {readFileSync} from 'node:fs';

class Material { constructor(args={}){Object.assign(this,args);this.opacity=args.opacity??1;} dispose(){this.disposed=true;} }
class Geometry {constructor(...args){this.args=args;} dispose(){this.disposed=true;}}
class Vec3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}}
class Quaternion {setFromAxisAngle(){return this;}}
class Matrix4 {compose(p,q,s){this.p=[p.x,p.y,p.z];this.s=[s.x,s.y,s.z];return this;}}
class Mesh {constructor(g,m,count){this.geometry=g;this.material=m;this.count=count;this.position=new Vec3();this.scale=new Vec3();this.instanceMatrix={needsUpdate:false};this.matrices=[];}setMatrixAt(i,m){this.matrices[i]={...m};}}
class Sprite extends Mesh {constructor(m){super(null,m);}}
class CanvasTexture {constructor(canvas){this.image=canvas;}dispose(){this.disposed=true;}}
const T={Vector3:Vec3,Quaternion,Matrix4,MeshBasicMaterial:Material,SpriteMaterial:Material,
 PlaneGeometry:Geometry,RingGeometry:Geometry,InstancedMesh:Mesh,Sprite,CanvasTexture,
 DoubleSide:2,AdditiveBlending:3,SRGBColorSpace:'sRGB',ClampToEdgeWrapping:4,LinearMipmapLinearFilter:5};

function mockDOM(){
 const ctx={clearRect(){},fillRect(){},createRadialGradient(){return {addColorStop(){}}}};
 return {createElement(){return {width:0,height:0,getContext(){return ctx;}}}};
}
for(const mode of [false,true])test('M02 atmosphere runs with batched 0-light FX / performance='+mode,()=>{
 const previous=globalThis.document;globalThis.document=mockDOM();
 try{
  const objects=[];const root={add:o=>objects.push(o)};
  const fx=createStreetAtmosphere(T,root,{performance:mode});
  assert.equal(fx.stats.additionalLights,0);
  assert.equal(fx.stats.postProcessingPasses,0);
  assert.equal(fx.stats.proceduralMaps,2);
  assert.equal(fx.stats.ripples,mode?11:30);
  assert.equal(fx.stats.puddleClusters,mode?18:45);
  assert.equal(fx.stats.steam,mode?3:8);
  assert.equal(objects.filter(x=>x.name?.includes('reflection atlas')).length,3);
  assert.doesNotThrow(()=>fx.update(2.15));
  assert.doesNotThrow(()=>fx.update(11.9));
  fx.dispose();
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
test('M02 uses accurate asphalt UVs and replaces cuboid puddles',()=>{
 const level=readFileSync(new URL('../dist/level2-test.js',import.meta.url),'utf8');
 const materials=readFileSync(new URL('../dist/level2-materials.js',import.meta.url),'utf8');
 assert.match(level,/wet asphalt continuous UV surface/);
 assert.match(level,/createStreetAtmosphere/);
 assert.doesNotMatch(level,/i<42;i\+\+/);
 assert.match(level,/quality\.value/);
 assert.match(materials,/jpg\/1k/);
 assert.match(materials,/performance\?256:512/);
 assert.match(materials,/roughness:\.43/);
});

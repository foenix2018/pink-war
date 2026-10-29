import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createEnvironmentFinish } from '../dist/m02-environment-finish.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const pos=()=>({set(x,y,z){this.x=x;this.y=y;this.z=z;return this}});
class Geometry { dispose(){} }
class Material {constructor(opts={}){Object.assign(this,opts);this.uuid='environment-test-mat';this.needsUpdate=false}dispose(){}}
class Object3D {
  constructor(){this.children=[];this.position=pos();this.rotation=pos();this.scale=pos();this.userData={};}
  add(o){this.children.push(o);o.parent=this}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(o=>o!==this)}
}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class InstancedMesh extends Mesh {constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={needsUpdate:false};}
  setMatrixAt(){}computeBoundingSphere(){}}
class Texture {constructor(){this.repeat=pos();}dispose(){}}
class Matrix4 {compose(){return this}}
class Vector3 {set(){return this}}
class Quaternion {}
const fakeThree={
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 CanvasTexture:Texture,BoxGeometry:Geometry,CylinderGeometry:Geometry,TorusGeometry:Geometry,
 PlaneGeometry:Geometry,Group:Object3D,Mesh,InstancedMesh,PointLight:Object3D,
 Matrix4,Vector3,Quaternion,
 NoColorSpace:'none',RepeatWrapping:'repeat',SRGBColorSpace:'srgb',DoubleSide:2
};
function mockDocument(){
 const original=globalThis.document;
 globalThis.document={createElement(name){
  assert.equal(name,'canvas');
  const c={width:0,height:0,getContext(){return {
   createImageData(w,h){return {data:new Uint8Array(w*h*4)}},
   putImageData(){},fillRect(){},strokeRect(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},createLinearGradient(){return {addColorStop(){}}}
  }}};
  return c;
 }};
 return ()=>{globalThis.document=original};
}
test('M02 detail pass builds instanced ceilings and street without adding collision data',()=>{
 const restore=mockDocument();
 try{
  const scene=new Object3D(),root=new Object3D(),before=root.children.length;
  const pass=createEnvironmentFinish(fakeThree,{scene,root,performance:true});
  const stats=pass.stats();
  assert.equal(stats.adverts,6);
  assert.equal(stats.ceilingZones,2);
  assert.equal(stats.extraLights,0);
  assert.ok(stats.instances>350);
  assert.ok(root.children.length>before);
  assert.ok(root.children.filter(o=>o instanceof InstancedMesh).every(o=>o.userData.noWorldShadow));
  assert.ok(root.children.some(o=>o.name==='M02 / panneau publicitaire VESPER'));
  pass.dispose();
 }finally{restore()}
});
test('M02 scene imports detail pass; M01 adds ceilings without touching collisions',()=>{
 assert.match(read('level2-test.js'),/createEnvironmentFinish\(T/);
 const m01=read('vesper-level1-v7.html');
 assert.match(m01,/function m01ArchitectureFinish\(\)/);
 assert.match(m01,/environmentalStorytelling\(\);(if\(isChapter3\))?m01ArchitectureFinish\(\)/);
 const code=m01.slice(m01.indexOf('function m01ArchitectureFinish()'),m01.indexOf('function environmentalStorytelling()'));
 assert.doesNotMatch(code,/addCollider\(/);
});
test('new city details do not import or alter character or weapon files',()=>{
 const code=read('m02-environment-finish.js');
 assert.doesNotMatch(code,/import .*soldier|import .*characters|import .*hands|import .*weapons/);
 assert.doesNotMatch(code,/collisions\.push|collide\.push/);
});

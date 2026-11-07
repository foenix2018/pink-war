import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {Assembly} from '../dist/geo.js';
import {createModernSwitch,SWITCH_VARIANTS,switchVariant} from '../dist/modern-switch.js';
import {createCircuitSwitch} from '../dist/circuit-switch.js';

test('four control families have different physical silhouettes within the cabinet envelope',()=>{
 const silhouettes=new Set();
 for(const variant of SWITCH_VARIANTS){
  const root=new T.Group(),model=createModernSwitch(T,root,{variant,low:true});let triangles=0,meshes=0;
  model.root.updateMatrixWorld(true);model.root.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
  const size=new T.Box3().setFromObject(model.root).getSize(new T.Vector3());
  assert.ok(size.x<=.83&&size.y<=1.26&&size.z<.5);assert.ok(meshes<=12);assert.ok(triangles<6500);assert.ok(!model.root.children.some(o=>o.isLight));
  silhouettes.add([size.x.toFixed(2),size.y.toFixed(2),triangles].join('/'));model.dispose();
 }
 assert.equal(silhouettes.size,4);
});
test('availability, confirmation and reset preserve independent control states',()=>{
 const parent=new T.Group(),a=createModernSwitch(T,parent,{variant:'breaker'}),b=createModernSwitch(T,parent,{variant:'rotary'});
 a.setState(false,{available:false});assert.equal(a.root.userData.controlState,'locked');
 for(let i=0;i<45;i++)a.setState(true);assert.equal(a.root.userData.controlState,'done');assert.ok(a.pivot.rotation.x<-.95);assert.equal(b.root.userData.controlState,'ready');
 for(let i=0;i<45;i++){a.setState(false);b.setState(true);}assert.ok(a.pivot.rotation.x>-.2);assert.ok(b.pivot.rotation.z< -1.9);
 a.dispose();b.dispose();
});
test('batched cabinet hardware matches standalone positions including scale',()=>{
 const a=new T.Group(),b=new T.Group(),batch=new Assembly();
 const normal=createModernSwitch(T,a,{x:4,y:2,z:6,scale:.8}),batched=createModernSwitch(T,b,{x:4,y:2,z:6,scale:.8,batch});batch.build(b);
 const x=new T.Box3().setFromObject(a),y=new T.Box3().setFromObject(b);assert.ok(x.min.distanceTo(y.min)<1e-5);assert.ok(x.max.distanceTo(y.max)<1e-5);normal.dispose();batched.dispose();
});
test('legacy circuit API and shared material ownership survive an idempotent disposal',()=>{
 const root=new T.Group(),metal=new T.MeshStandardMaterial();let released=0;metal.addEventListener('dispose',()=>released++);
 const control=createCircuitSwitch(T,root,{materials:{metal},variant:'rotary'});control.setState(true);assert.equal(control.variant,'rotary');control.dispose();control.dispose();assert.equal(released,0);assert.equal(root.children.length,0);metal.dispose();
});
test('control style follows the electrical or access function',()=>{
 assert.equal(switchVariant('disj-2'),'breaker');assert.equal(switchVariant('relais-est'),'rotary');assert.equal(switchVariant('lecteur'),'access');assert.equal(switchVariant('commande-quai'),'touch');
});

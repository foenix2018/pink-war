import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { createCombatFX, IMPACT_PROFILES } from '../dist/combat-fx.js';

const setup=()=>{
  const scene=new T.Scene(),fx=createCombatFX(T,scene,{rose:0xff4099,violet:0x9955ff});
  return {scene,fx,group:scene.children[0],meshes:scene.children[0].children};
};
const expire=(fx,seconds)=>{for(let i=0;i<seconds*10;i++)fx.update(.1);};

test('impact materials determine fragments and robot hits leave no suspended scorch marks',()=>{
  const {fx,meshes}=setup();
  const event={x:1,y:1,z:1,weapon:'r9',normal:{x:1,y:0,z:0}};
  fx.impact({...event,surface:'concrete'});fx.update(.01);
  const concrete=meshes.map(mesh=>mesh.count);
  expire(fx,2);
  assert.equal(fx.stats().active,1,'a burn mark remains on the fixed concrete wall');
  const transform=new T.Matrix4(),orientation=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();
  meshes[2].getMatrixAt(0,transform);transform.decompose(position,orientation,scale);
  assert.ok(new T.Vector3(0,0,1).applyQuaternion(orientation).distanceTo(new T.Vector3(1,0,0))<1e-6,'scorch is aligned to the struck plane');
  assert.ok(position.x>event.x,'burn mark is offset above the surface to prevent z fighting');
  fx.reset();fx.impact({...event,surface:'robot',enemy:true});fx.update(.01);
  assert.ok(meshes[0].count>concrete[0],'metal produces more hot sparks');
  assert.ok(meshes[2].count<concrete[2],'metal produces less masonry dust');
  expire(fx,2);assert.equal(fx.stats().active,0,'a moving robot leaves no floating wall decal');
  fx.reset();fx.impact({...event,surface:'metal',noDecal:true});fx.update(.01);expire(fx,2);
  assert.equal(fx.stats().active,0,'the moving range plate carries its own marks, with no world decal left behind');
  fx.dispose();
});

test('heavy capacitors produce a larger pulse and sustained fire has a fixed graphics budget',()=>{
  const {fx,group,meshes}=setup(),geometry=meshes.map(mesh=>mesh.geometry);
  assert.ok(IMPACT_PROFILES.nova.flash>IMPACT_PROFILES.r9.flash);
  fx.impact({x:0,y:0,z:0,weapon:'r9',surface:'ground'});fx.update(.016);assert.equal(meshes[3].count,0);
  fx.impact({x:0,y:0,z:0,weapon:'nova',splash:5,surface:'ground'});fx.update(.016);assert.equal(meshes[3].count,2);
  for(let i=0;i<500;i++){
    fx.impact({x:i%7,y:1,z:i%11,weapon:'nova',splash:5,surface:i%2?'metal':'concrete',normal:{x:0,y:1,z:0}});
    fx.update(.016);
  }
  assert.equal(group.children.length,4,'effects never create a mesh or light per hit');
  assert.ok(fx.stats().active<=308);assert.ok(fx.stats().draws<=4);
  for(const [index,mesh] of meshes.entries()){
    assert.equal(mesh.geometry,geometry[index]);assert.ok(mesh.count<=mesh.instanceMatrix.count);
    assert.ok(Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16)).every(Number.isFinite));
  }
  expire(fx,11);assert.equal(fx.stats().active,0);assert.ok(meshes.every(mesh=>!mesh.visible&&mesh.count===0));
  fx.dispose();
});

test('effects reset without reallocating and dispose all owned GPU resources exactly once',()=>{
  const {scene,fx,group,meshes}=setup(),sentinel=new T.Group();scene.add(sentinel);
  const counts={geometry:0,material:0,mesh:0,texture:0};
  for(const mesh of meshes){
    mesh.geometry.addEventListener('dispose',()=>counts.geometry++);
    mesh.material.addEventListener('dispose',()=>counts.material++);
    mesh.addEventListener('dispose',()=>counts.mesh++);
    mesh.material.map?.addEventListener('dispose',()=>counts.texture++);
  }
  fx.impact({x:0,y:0,z:0});fx.update(.016);fx.setVisible(false);assert.equal(group.visible,false);
  fx.setVisible(true);assert.equal(group.visible,true);fx.reset();
  assert.equal(fx.stats().active,0);assert.deepEqual(counts,{geometry:0,material:0,mesh:0,texture:0});
  assert.equal(fx.impact({x:Infinity,y:1,z:1}),false,'malformed positions cannot poison a draw buffer');
  fx.impact({x:0,y:1,z:0,direction:{x:Infinity,y:0,z:0}});fx.update(.016);
  assert.ok(meshes.every(mesh=>Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16)).every(Number.isFinite)));
  fx.dispose();fx.dispose();assert.deepEqual(counts,{geometry:4,material:4,mesh:4,texture:1});
  assert.deepEqual(scene.children,[sentinel]);assert.equal(fx.impact({x:0,y:0,z:0}),false);
});

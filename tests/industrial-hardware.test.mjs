import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createIndustrialDoor} from '../dist/industrial-door.js';
import {upgradeLightBlocks,INDUSTRIAL_LIGHT_KINDS} from '../dist/industrial-light.js';
import {DOORS as M04} from '../dist/m04-layout.js';
import {DOORS as M06} from '../dist/m06-layout.js';
import {DOORS as M05} from '../dist/ligne9-layout.js';

test('all mission door styles clear the opening on both axes and close again without changing definitions',()=>{
 const defs=[...M04,...M05,...M06],before=JSON.stringify(defs),scene=new T.Group();
 for(const d of defs){const model=createIndustrialDoor(T,scene,d,{low:true});const hits=(x,y)=>{model.root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(x,y,2).applyMatrix4(model.root.matrixWorld),new T.Vector3(0,0,-1).transformDirection(model.root.matrixWorld),0,4).intersectObject(model.root,true);};
  model.update(0,true);assert.ok(hits(.2,d.height*.45).length>0||d.style==='grille',d.id+' closed');
  model.update(1,false);for(const x of [-d.width*.28,.2,d.width*.28])for(const y of [.2,d.height*.45,d.height-.15])assert.equal(hits(x,y).length,0,d.id+' clears aperture');
  model.update(0,true);assert.equal(model.root.userData.locked,true);model.dispose();
 }
 assert.equal(JSON.stringify(defs),before);assert.equal(scene.children.length,0);
});
test('hinged closer arms keep their length, handles travel with the door, and invalid progress cannot corrupt transforms',()=>{
 const model=createIndustrialDoor(T,new T.Group(),{id:'service',axis:'x',centre:0,fixed:0,width:1.6,height:2.4,style:'fire'},{low:true});
 const handle=model.leaves[0].handle,start=handle.getWorldPosition(new T.Vector3()),matrix=new T.Matrix4(),scale=new T.Vector3();
 for(const p of [0,.1,.4,.8,1,NaN,-1,2]){model.update(p);model.root.updateMatrixWorld(true);model.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  const arms=model.root.getObjectByName('Ferme-porte / bras articulés');for(let i=0;i<2;i++){arms.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);assert.ok(Math.abs(scale.y-(1.6*.26+.08))<1e-5);}
 }
 model.update(1);assert.ok(handle.getWorldPosition(new T.Vector3()).distanceTo(start)>.5);model.dispose();
});
test('optics and cages retain powered instance colours, transforms and their original light budget',()=>{
 for(const kind of INDUSTRIAL_LIGHT_KINDS){const cube=new T.BoxGeometry(),material=new T.MeshBasicMaterial(),mesh=new T.InstancedMesh(cube,material,2),matrix=new T.Matrix4().makeTranslation(3,4,5);mesh.setMatrixAt(0,matrix);mesh.setMatrixAt(1,new T.Matrix4());mesh.setColorAt(0,new T.Color(0xffffff));mesh.setColorAt(1,new T.Color(0xff8844));
  const colors=mesh.instanceColor,poses=mesh.instanceMatrix,kit=upgradeLightBlocks(T,mesh,kind,{low:true});assert.ok(kit);assert.notEqual(mesh.geometry.type,'BoxGeometry');assert.equal(mesh.instanceColor,colors);assert.equal(mesh.instanceMatrix,poses);assert.equal(mesh.children.length,2);
  mesh.setColorAt(0,new T.Color(0));assert.deepEqual(Array.from(colors.array.slice(0,3)),[0,0,0]);for(const p of kit.parts){assert.equal(p.instanceMatrix,poses);assert.equal(p.instanceColor,null);assert.equal(p.castShadow,false);}
  let lights=0;mesh.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,0);kit.dispose();kit.dispose();assert.equal(mesh.children.length,0);cube.dispose();material.dispose();mesh.dispose();
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {profiledPanel} from '../dist/armor-profiles.js';
import {createEnemyFactory,ENEMY_PROFILES} from '../dist/enemies.js';

test('a profiled plate is sealed, rounded and convex with outward-facing surfaces',()=>{
 const g=profiledPanel([[-.1,-.16],[.1,-.16],[.16,.06],[.09,.16],[-.09,.16],[-.16,.06]],{depth:.02,bulge:.03});
 const mesh=new T.Mesh(g,new T.MeshStandardMaterial());mesh.updateMatrixWorld(true);
 for(const dir of [[0,0,-1],[0,0,1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]]){
  const origin=new T.Vector3(...dir),hits=new T.Raycaster(origin,origin.clone().negate().normalize()).intersectObject(mesh);
  assert.ok(hits.length,'the front, back and edges of the shell face outwards');
 }
 const front=new T.Raycaster(new T.Vector3(0,0,-1),new T.Vector3(0,0,1)).intersectObject(mesh)[0];
 assert.ok(front.point.z<-.038,'interior rings form a real curved front, not a flat extruded cap');
 for(const v of g.attributes.position.array)assert.ok(Number.isFinite(v));
 for(let i=0;i<g.attributes.normal.count;i++)assert.ok(Math.abs(new T.Vector3().fromBufferAttribute(g.attributes.normal,i).length()-1)<1e-5);
});

test('every chassis exposes its red sensor ahead of its own armour in normal and elite forms',()=>{
 const mats=Object.fromEntries(['monster','monsterElite','monsterFace','rose','violet','cyan','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
 const factory=createEnemyFactory(mats);
 for(const form of Object.keys(ENEMY_PROFILES).filter(f=>f!=='seer'))for(const elite of [false,true]){
  const root=factory.create(elite,true,form);root.userData.animate(0,0,false,{awareness:'engaged'},0);root.updateMatrixWorld(true);root.userData.skeleton.update();
  const eye=root.userData.sensorAnchor||(form==='probe'?[0,.55]:form==='scuttler'?[0,.92]:form==='seer'?[0,1.918]:[.064,1.91]);
  // The animated pelvis lowers and the head tilts. Cast in the live sensor's
  // bone frame rather than aiming through its unposed nominal height.
  const skeleton=root.userData.skeleton,j=skeleton.bones.findIndex(b=>b.name===(form==='probe'?'optical-gimbal':form==='scuttler'?'pelvis':'sensor-head'));
  const pose=new T.Matrix4().multiplyMatrices(skeleton.bones[j].matrixWorld,skeleton.boneInverses[j]);
  const origin=new T.Vector3(eye[0],eye[1],-4).applyMatrix4(pose),direction=new T.Vector3(0,0,1).transformDirection(pose);
  const hit=new T.Raycaster(origin,direction).intersectObject(root,true)[0];
  assert.ok(hit,form);assert.equal(hit.object.material,root.userData.optics,form+': live sensor stays in front of the shell');
  assert.equal(root.userData.alertState,'engaged');assert.equal(root.userData.designRevision,'3.63.2');
  let triangles=0;root.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.attributes.position.count/3;const w=o.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.equal(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i),1,'no unbound fragments');});
  assert.ok(triangles<11000,form+': same mobile geometry budget');
 }
});

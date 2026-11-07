import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {createLevelNeons,isNeonStrip,roundPoweredTubes} from '../dist/level-neons.js';
import {findBakedNeonRuns,replaceBakedNeonMesh} from '../dist/baked-neons.js';

test('only narrow physical luminaires qualify; screens, paintings and energy surfaces do not',()=>{
 assert.equal(isNeonStrip([5,.08,.03]),true);assert.equal(isNeonStrip([.03,2,.08]),true);
 for(const s of [[1,.6,.03],[4,3,.01],[NaN,1,2],[0,4,.03]])assert.equal(isNeonStrip(s),false);
 const root=new T.Group(),lamp=new T.MeshBasicMaterial(),screen=new T.MeshBasicMaterial();
 const neons=createLevelNeons(T,root,{materials:[lamp]});
 assert.equal(neons.box(screen,[2,.1,.02],[0,2,0]),false);
 assert.equal(neons.box(lamp,[2,.1,.02],[0,2,0]),true);neons.build();assert.equal(neons.stats().converted,1);neons.dispose();
});

test('fittings follow a moving rotated parent and remain fully detailed at remote playable coordinates',()=>{
 const root=new T.Group(),lift=new T.Group(),mat=new T.MeshBasicMaterial({color:0xff278d});root.add(lift);lift.position.set(220,4,-70);lift.rotation.y=.7;
 const mesh=new T.Mesh(new T.BoxGeometry(3,.1,.03),mat);mesh.position.set(2,1,0);mesh.rotation.z=.2;lift.add(mesh);
 const neons=createLevelNeons(T,root,{materials:[mat]});neons.meshes();neons.build();
 const fixtures=lift.getObjectByName('Luminaires / tubes néon');assert.ok(fixtures);assert.ok(fixtures.getObjectByName('Néon / douilles'));
 const before=fixtures.getWorldPosition(new T.Vector3());lift.position.y+=5;const after=fixtures.getWorldPosition(new T.Vector3());assert.equal(after.y-before.y,5);
 assert.equal(neons.stats().lights,0);neons.dispose();assert.equal(lift.children.length,0);
});

test('dynamic excluded meshes and non-box emitters retain their identity and geometry',()=>{
 const root=new T.Group(),mat=new T.MeshBasicMaterial(),alarm=new T.Mesh(new T.BoxGeometry(2,.1,.04),mat),ring=new T.Mesh(new T.TorusGeometry(1,.03),mat);root.add(alarm,ring);
 const neons=createLevelNeons(T,root,{materials:[mat]});neons.meshes(root,{exclude:new Set([alarm])});neons.build();assert.equal(alarm.parent,root);assert.equal(ring.parent,root);assert.equal(neons.stats().converted,0);neons.dispose();
});

test('powered X/Z tubes retain their indices and share live blackout colours with their halos',()=>{
 const geo=new T.BoxGeometry(),m=new T.InstancedMesh(geo,new T.MeshBasicMaterial(),2),matrix=new T.Matrix4();
 m.setMatrixAt(0,matrix.makeScale(2,.05,.14));m.setMatrixAt(1,matrix.compose(new T.Vector3(3,4,5),new T.Quaternion(),new T.Vector3(.14,.05,3)));m.setColorAt(0,new T.Color(0xff00ff));m.setColorAt(1,new T.Color(0x00ffff));
 const oldColor=m.instanceColor,kit=roundPoweredTubes(T,m,{low:true}),halo=m.children[0];assert.equal(m.geometry.type,'CylinderGeometry');assert.equal(m.instanceColor,oldColor);assert.equal(halo.instanceColor,oldColor);assert.equal(halo.instanceMatrix,m.instanceMatrix);
 const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();m.getMatrixAt(1,matrix);matrix.decompose(p,q,s);assert.deepEqual(p.toArray(),[3,4,5]);const axis=new T.Vector3(1,0,0).applyQuaternion(q);assert.ok(Math.abs(axis.z)>.99);assert.ok(Math.abs(s.y-s.z)<1e-6);
 m.setColorAt(0,new T.Color(0));assert.deepEqual(Array.from(halo.instanceColor.array.slice(0,3)),[0,0,0]);kit.dispose();geo.dispose();m.dispose();
});

test('baked box faces are deduplicated into one fitting and broad panels survive',()=>{
 const geo=new T.BoxGeometry(2,.1,.04),p=geo.attributes.position,idx=geo.index.array,faces=[];
 for(let i=0;i<idx.length;i+=3)faces.push([0,1,2].map(k=>{const n=idx[i+k];return [p.getX(n),p.getY(n),p.getZ(n)];}));
 assert.equal(findBakedNeonRuns(faces).length,1);assert.equal(findBakedNeonRuns(faces)[0].indices.length,12);
 assert.equal(findBakedNeonRuns([[[0,0,0],[4,0,0],[4,3,0],[0,3,0]]]).length,0);
 const root=new T.Group(),mat=new T.MeshBasicMaterial(),mesh=new T.Mesh(geo,mat);root.add(mesh);const neons=createLevelNeons(T,root,{materials:[mat]});
 assert.equal(replaceBakedNeonMesh(mesh,neons),12);assert.equal(mesh.geometry.index.count,0);neons.build();assert.equal(neons.stats().converted,1);neons.dispose();geo.dispose();
});

test('neon markers on elevated walkways keep their backing below the light',()=>{
 const root=new T.Group(),mat=new T.MeshBasicMaterial();const neons=createLevelNeons(T,root,{materials:[mat],floorHeights:[0,4.5]});
 neons.box(mat,[5,.03,.08],[0,4.535,0]);neons.build();const support=root.getObjectByName('Néon / supports'),matrix=new T.Matrix4();support.getMatrixAt(0,matrix);assert.ok(new T.Vector3().setFromMatrixPosition(matrix).y<4.535);neons.dispose();
});

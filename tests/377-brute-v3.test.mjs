import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {BRUTE_V3} from '../dist/enemy-brute-v3.js';
import {bruteSurfaces} from '../dist/brute-surfaces.js';
const mats=()=>Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(n=>[n,new T.MeshStandardMaterial()]));
const factory=()=>createEnemyFactory(mats());
const meshBounds=root=>{root.updateMatrixWorld(true);return new T.Box3().setFromObject(root,true);};
test('V3 Briseur: separate genuinely hard-surface design, not reused humanoid balls',()=>{
 const root=factory().create(false,false,'brute'),s=root.userData.skeleton;
 assert.equal(root.userData.bruteRevision,BRUTE_V3.revision);
 assert.match(BRUTE_V3.model,/not human/);
 assert.equal(BRUTE_V3.features.length,6);
 assert.equal(root.userData.humanoidReference.sourceBoneCount,34);
 for(const name of ['sensor-head','arm--1-elbow','arm-1-wrist','leg--1-knee','leg-1-ankle'])assert.ok(s.bones.some(b=>b.name===name),name);
 const verts=root.children.filter(m=>m.isSkinnedMesh);
 assert.ok(verts.length>0&&verts.length<=6,'brute keeps six batches maximum');
 let triangles=0,fullySkinned=0;
 for(const m of verts){
  const geo=m.geometry;triangles+=geo.attributes.position.count/3;
  const skin=geo.attributes.skinWeight;
  assert.ok(skin);
  for(let i=0;i<skin.count;i++)if(Math.abs(skin.getX(i)-1)<.00001)fullySkinned++;
 }
 assert.ok(triangles<11000,'hard surface mobile triangle budget '+triangles);
 assert.ok(fullySkinned>500,'separate articulated armor retains actual skin weights');
 const box=meshBounds(root),size=box.getSize(new T.Vector3());
 assert.ok(size.x>1.8,'enlarged shoulder / hammer width: '+size.x);
 assert.ok(size.y>2.08,'reconstructed helmet / shoulder height: '+size.y);
 assert.ok(box.min.y>-.13,'foot stays on the floor');
 assert.equal(root.getObjectsByProperty('isLight',true).length,0);
});
test('V3 scarlet reactor remains bright and independent from the optical slit',()=>{
 const b=factory().create(false,false,'brute');
 const meshes=b.children.filter(x=>x.isSkinnedMesh);
 const reactor=meshes.find(x=>x.material?.name==='BRUTE / permanently glowing scarlet reactor');
 const steel=meshes.find(x=>x.material?.name==='BRUTE V3 / worn hard-surface graphite plating');
 assert.ok(reactor&&steel,'V3 custom graphite and reactor materials are present');
 assert.ok(steel.material.map&&steel.material.roughnessMap&&steel.material.bumpMap,'self-contained worn steel PBR maps');
 assert.equal(reactor.material.emissive.getHex(),0xff1735);
 assert.equal(b.userData.optics.color.getHex(),0x80d9e8);
 b.userData.animate(1,.4,false,{awareness:'engaged'},1);
 assert.equal(b.userData.optics.color.getHex(),0xff180c);
 assert.equal(reactor.material.emissive.getHex(),0xff1735);
});
test('V3 surfaces have cached 256px data textures and never use network assets',()=>{
 const a=bruteSurfaces(T),b=bruteSurfaces(T);
 assert.strictEqual(a,b);
 for(const name of ['paint','rough','relief']){
  assert.equal(a[name].image.width,256);
  assert.equal(a[name].image.height,256);
  assert.ok(a[name].isDataTexture);
 }
});
test('V3 remains stable through animated combat poses and preserves other enemy types',()=>{
 const maker=factory(),brute=maker.create(true,false,'brute'),stalker=maker.create(false,true,'stalker');
 const wrist=brute.userData.skeleton.bones.find(b=>b.name==='arm--1-wrist');
 const knee=brute.userData.skeleton.bones.find(b=>b.name==='leg--1-knee');
 const poses=[{phase:0,awareness:'patrol',motionX:0},{phase:Math.PI,awareness:'engaged',motionX:1},{phase:Math.PI*1.5,awareness:'engaged',motionZ:1}];
 const samples=[];
 for(let k=0;k<poses.length;k++){
  brute.userData.animate(.5*k,k,!!k,poses[k],.5*k);brute.updateMatrixWorld(true);brute.userData.skeleton.update();
  samples.push([wrist.rotation.x,knee.rotation.x]);
  assert.ok(Number.isFinite(wrist.rotation.x));
  assert.ok(Number.isFinite(knee.rotation.x));
 }
 assert.ok(samples.some((v,i)=>i>0&&v.some((n,j)=>Math.abs(n-samples[0][j])>1e-4)),'native gait should move mechanical armor');
 assert.equal(stalker.userData.bruteRevision,undefined,'no V3 material or geometry leakage into normal robots');
});

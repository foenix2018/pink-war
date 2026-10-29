import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createAICompanion} from '../dist/ai-companions.js';
import {createCompanionSkills} from '../dist/companion-skills.js';
import {ArenaGame} from '../dist/game-logic.js';

for(const [hero,name,petals,color]of [['ghju','Gaby',4,0xff65b1],['lylu','Cara',6,0x57baff]]){
 test(name+': solid articulated sphere, readable optic and bounded rendering cost',()=>{
  const actor=createAICompanion(T,new T.Scene(),hero),meshes=[];actor.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const s=actor.snapshot().model;assert.equal(s.name,name);assert.equal(s.petals,petals);assert.equal(s.bones,petals);assert.equal(s.draws,meshes.length);assert.ok(s.draws<=12&&s.triangles<28000);
  const pupil=actor.root.getObjectByName(name+' / phase pupil');assert.ok(pupil&&pupil.position.z>.13);assert.equal(pupil.material.emissive.getHex(),color);
  for(let i=0;i<90;i++)actor.preview(1/60);
  actor.react({type:'companion-assist',name});for(let i=0;i<15;i++)actor.preview(1/60);
  const box=new T.Box3().setFromObject(actor.root,true),size=box.getSize(new T.Vector3());assert.ok(size.x>.29&&size.x<.39&&size.y>.28&&size.y<.39&&size.z>.26&&size.z<.39,'stays a shoulder-sized 3D sphere, including opened shells');
  const shell=meshes.filter(m=>m.isSkinnedMesh);assert.equal(shell.length,name==='Cara'?5:4);
  for(const mesh of shell){const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;for(let i=0;i<weights.count;i++){assert.equal(weights.getX(i),1);assert.equal(weights.getY(i),0);assert.ok(indices.getX(i)<petals);}}
  actor.dispose();
 });
 test(name+': visible shell vertices follow their actual hinge under parent, avatar and panel motion',()=>{
  const scene=new T.Scene(),parent=new T.Group();scene.add(parent);const a=createAICompanion(T,parent,hero);
  parent.position.set(11,4,-23);parent.rotation.y=.8;a.root.position.set(.7,1.4,-.8);a.root.rotation.set(.2,.5,-.1);
  a.react({type:'companion-phase',name});for(let i=0;i<20;i++)a.preview(1/60);scene.updateMatrixWorld(true);
  a.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const p=mesh.geometry.attributes.position,index=mesh.geometry.attributes.skinIndex;
   for(let i=0;i<p.count;i+=Math.max(1,Math.floor(p.count/71))){
    const bone=index.getX(i),expected=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.skeleton.boneInverses[bone]).applyMatrix4(mesh.skeleton.bones[bone].matrixWorld);
    const actual=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(actual.distanceTo(expected)<1e-6,'rigid panels stay attached without double transforms');
   }
  });a.dispose();
 });
 test(name+': a successful real skill opens the panels; rejected skills and zero-time preview do not advance them',()=>{
  const a=createAICompanion(T,new T.Scene(),hero),g=new ArenaGame([]),skills=createCompanionSkills({characterId:hero,mode:'lab'});g.enemies=[];g.toSpawn=0;g.nextWave=Infinity;
  for(let i=0;i<60;i++)a.preview(1/60);const idle=a.snapshot().model.opening;
  const use=()=>{const used=skills.use('phase',{game:g,origin:{x:0,y:1.5,z:0},direction:{x:0,y:0,z:-1}});if(used)a.react({type:'companion-assist',name:skills.name});return used;};
  assert.equal(use(),true);for(let i=0;i<12;i++)a.preview(1/60);assert.ok(a.snapshot().model.opening>idle+.25);assert.equal(use(),false);
  const pose=()=>{const out=[];a.root.traverse(o=>out.push([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]));return out;};const before=pose(),stats=a.snapshot();for(let i=0;i<20;i++)a.preview(0);assert.deepEqual(pose(),before);assert.deepEqual(a.snapshot(),stats);a.dispose();
  const scene=new T.Scene(),portrait=createAICompanion(T,scene,hero),camera=new T.PerspectiveCamera(65,390/844,.05,100);camera.position.y=1.65;camera.updateMatrixWorld(true);
  for(let i=0;i<360;i++){g.time+=1/60;portrait.update(1/60,{game:g,camera,assistance:false});}
  assert.ok(portrait.root.position.z>0,'idle companion returns to the shoulder after its greeting');portrait.react({type:'companion-assist',name});
  for(let i=0;i<40;i++){g.time+=1/60;portrait.update(1/60,{game:g,camera,assistance:false});}
  assert.ok(portrait.root.position.z>.25,'casting keeps the companion behind the hero');
  camera.position.set(0,2.4,4.8);camera.lookAt(0,1.5,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
  portrait.root.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=17){const v=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1,'the actual opened shell fits inside a portrait viewport');}});
  assert.equal(portrait.snapshot().assists,0);portrait.dispose();
 });
}
test('repeated companion replacement releases each live GPU resource once, including the shared skin palette',()=>{
 for(let i=0;i<4;i++){
  const scene=new T.Scene(),a=createAICompanion(T,scene,i%2?'lylu':'ghju'),resources=new Set(),counts=new Map();
  scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])resources.add(m);if(o.isSkinnedMesh){if(!o.skeleton.boneTexture)o.skeleton.computeBoneTexture();resources.add(o.skeleton.boneTexture);}});
  for(const r of resources){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));}
  a.dispose();a.dispose();assert.equal(scene.children.length,0);for(const [resource,count]of counts)assert.equal(count,1,resource.type+' must be released once');
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createEnemyFactory} from '../dist/enemies.js';
import {MOCAP_TRAITS} from '../dist/enemy-mocap.js';
const mats=()=>Object.fromEntries(['monster','monsterElite','monsterFace','cyan','rose','violet','pale'].map(k=>[k,new T.MeshStandardMaterial()]));
test('native chest rotation is relative to the saved native pelvis, independently of scratch quaternions',()=>{
 for(const form of ['synth','stalker','brute','listener','spectre']){
  const actor=createEnemyFactory(mats()).create(false,false,form),bones=actor.userData.nativeSkeleton.bones;
  const get=n=>bones.find(b=>b.name==='mixamorig'+n).getWorldQuaternion(new T.Quaternion());
  const restHip=get('Hips'),restSpine=get('Spine2'),flip=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI);
  const delta=(q,r)=>flip.clone().multiply(q.multiply(r.clone().invert())).multiply(flip.clone().invert());
  actor.userData.animate(0,0,false,{},0);
  const dh=delta(get('Hips'),restHip),ds=delta(get('Spine2'),restSpine),traits=MOCAP_TRAITS[form];
  const pelvisPitch=Math.max(-.12,Math.min(.12,new T.Euler().setFromQuaternion(dh,'YXZ').x*.5));
  const e=new T.Euler().setFromQuaternion(dh.clone().invert().multiply(ds),'YXZ');
  e.x=Math.max(-.40,Math.min(.22,pelvisPitch+e.x*.5-traits.hunch*.6))-pelvisPitch;e.y*=traits.sway;e.z*=traits.sway;
  const expected=new T.Quaternion().setFromEuler(e),actual=actor.userData.skeleton.bones.find(b=>b.name==='thorax').quaternion;
  assert.ok(expected.angleTo(actual)<1e-6,form+' chest must retain pelvis-relative native rotation');
 }
});

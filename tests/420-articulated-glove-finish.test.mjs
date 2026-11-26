import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRLHGlove,syncRLHMaterials,GLOVE_FINISHES} from '../dist/rlh-gloves.js';
const material=color=>new T.MeshStandardMaterial({color});
function kit(){return {plate:material(0x232630),trim:material(0x616773),fabric:material(0x101218),glow:material(0x45a5ff)};}
test('both mirrored gloves share closed skinned dorsal plates; materials follow the five actual outfits',()=>{
 const k=kit(),right=createRLHGlove(k,{sleeve:false}),left=createRLHGlove(k,{mirror:true,sleeve:false});
 assert.equal(left.scale.x,-1);assert.equal(right.scale.x,1);
 const part=(g,key)=>g.userData.parts.find(p=>p.part.key===key);
 const plate=part(right,'hardPlate');assert.ok(plate.mesh.isSkinnedMesh);
 assert.ok(plate.part.geometry.attributes.skinIndex.count>0);
 assert.equal(part(left,'hardPlate').part.geometry,plate.part.geometry);
 const bones=new Set(),ix=plate.part.geometry.attributes.skinIndex;
 for(let i=0;i<ix.count;i++)bones.add(ix.getX(i));
 assert.ok(bones.size>=15,'dorsal and separate phalanx weights');
 for(let n=1;n<=5;n++){right.userData.setLevel(n);left.userData.setLevel(n);
  assert.equal(plate.mesh.material.color.getHex(),GLOVE_FINISHES[n-1].plate);
  assert.equal(part(left,'hardPlate').mesh.material,plate.mesh.material);}
 left.userData.setLevel(2);assert.notEqual(part(left,'hardPlate').mesh.material,plate.mesh.material);
 const accent=part(right,'hardAccent').mesh.material.color;
 assert.ok(accent.b>accent.r);k.glow.color.setHex(0xff53a6);syncRLHMaterials(k);assert.ok(accent.r>accent.b);
 const rig=right.userData.rig,bone=rig.doigts.index.artic[1];
 rig.pose('open',true);const open=bone.rotation.x;rig.pose('fist',true);assert.ok(bone.rotation.x<open);
 right.userData.dispose();left.userData.dispose();
});
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRLHGlove,GLOVE_FINISHES} from '../dist/rlh-gloves.js';
test('refined curved shells have stage-specific PBR and remain inside a mobile geometry budget',()=>{
 const mat=color=>new T.MeshStandardMaterial({color});
 const k={plate:mat(0x232630),trim:mat(0x616773),fabric:mat(0x101218),glow:mat(0x45a5ff)};
 const g=createRLHGlove(k,{sleeve:false}), plate=g.userData.parts.find(p=>p.part.key==='hardPlate').mesh;
 const count=g.userData.parts.reduce((n,{mesh})=>n+mesh.geometry.attributes.position.count/3,0);
 assert.ok(count<55000);assert.equal(g.userData.skeleton.bones.length,28);
 const maps=[];
 for(let n=1;n<=5;n++){g.userData.setLevel(n);assert.equal(plate.material.color.getHex(),GLOVE_FINISHES[n-1].plate);assert.ok(plate.material.normalMap?.isDataTexture);maps.push(plate.material.normalMap);}
 // Standard (1–2) céramique, titane (3), Stealth carbone (4), Heavy (5) composite blanc cassé : grain céramique (planche LYLU).
 assert.ok(maps[0]===maps[1]&&maps[1]!==maps[2]&&maps[2]!==maps[3]&&maps[4]===maps[0]&&maps[4]!==maps[3],'micro-textures par variante');
 for(const pose of ['open','grip','fist','point']){g.userData.rig.pose(pose,true);g.updateMatrixWorld(true);g.userData.skeleton.update();const p=plate.geometry.attributes.position,v=new T.Vector3();for(let i=0;i<p.count;i+=31){v.fromBufferAttribute(p,i);plate.applyBoneTransform(i,v);assert.ok([v.x,v.y,v.z].every(Number.isFinite));}}
 g.userData.dispose();
});
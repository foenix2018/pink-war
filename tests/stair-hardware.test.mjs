import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createStairHardware,createFloorRampHardware} from '../dist/stair-hardware.js';
import {FLOORS as F4,createTraversal as T4} from '../dist/m04-layout.js';
import {FLOORS as F6,createTraversal as T6} from '../dist/m06-layout.js';
import {STAIRS,BRIDGE_APPROACHES} from '../dist/world-layout.js';

test('M04/M06 ramp geometry follows physics at both ends and every intermediate point on X and Z',()=>{
 for(const [floors,traversal] of [[F4,T4()],[F6,T6()]])for(const original of floors.filter(f=>f.ramp)){
  const f=original.id==='rampe-pont'?{...original,z1:-12}:original,scene=new T.Scene(),before=JSON.stringify(original);
  createFloorRampHardware(T,scene,f,{low:true});scene.updateMatrixWorld(true);
  for(let i=0;i<=20;i++){
   const t=.001+.998*i/20,x=f.ramp==='x'?f.x1+(f.x2-f.x1)*t:(f.x1+f.x2)/2,z=f.ramp==='z'?f.z1+(f.z2-f.z1)*t:(f.z1+f.z2)/2;
   const ray=new T.Raycaster(new T.Vector3(x,30,z),new T.Vector3(0,-1,0)),hits=ray.intersectObject(scene,true),y=traversal.surfaces(x,z).find(s=>s.id===f.id).height;
   assert.ok(hits.length,f.id+' deck exists');assert.ok(Math.abs(hits[0].point.y-y)<.02,`${f.id} geometry ${hits[0].point.y} vs traversal ${y}`);
  }
  assert.equal(JSON.stringify(original),before);
 }
});
test('arena railings leave the walking centre open and detail stays within a bounded material batch',()=>{
 for(const s of [...STAIRS,...BRIDGE_APPROACHES]){
  const root=new T.Group(),model=createStairHardware(T,root,s,{mode:'ramp',deck:true,low:true});root.updateMatrixWorld(true);
  for(let k=1;k<10;k++){
   const t=k/10,y=s.height*t,z=s.bottomZ+(s.topZ-s.bottomZ)*t;
   const hits=new T.Raycaster(new T.Vector3(s.x,y+.7,z),new T.Vector3(0,1,0),0,.8).intersectObject(root,true);assert.equal(hits.length,0,'no rail across walking lane');
  }
  let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
  assert.ok(meshes<=3);assert.ok(triangles<14000);model.dispose();model.dispose();assert.equal(root.children.length,0);
 }
});

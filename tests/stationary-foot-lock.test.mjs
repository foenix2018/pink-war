import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createStationaryFootLock} from '../dist/hero-locomotion.js';

function rig(){
 const root=new T.Group(),hips=new T.Bone(),legs=[],knees=[],feet=[];
 root.add(hips);hips.position.y=.9;
 for(const side of [-1,1]){
  const a=new T.Bone(),b=new T.Bone(),c=new T.Bone();
  a.position.x=side*.14;b.position.set(0,-.45,.08);c.position.set(0,-.40,-.08);
  hips.add(a);a.add(b);b.add(c);legs.push(a);knees.push(b);feet.push(c);
 }
 root.updateMatrixWorld(true);
 return {root,hips,legs,knees,feet};
}
for(const fps of [30,60,120])test('stationary feet stay fixed while pelvis breathes at '+fps+' Hz',()=>{
 const model=rig(),{root,hips,legs,knees,feet}=model,dt=1/fps,lock=createStationaryFootLock(model);
 const pose=t=>{hips.position.set(.018*Math.sin(t*3),.9+.008*Math.sin(t*4),.012*Math.cos(t*3));for(const b of [...legs,...knees,...feet])b.quaternion.identity();root.updateMatrixWorld(true);};
 let anchor;
 for(let i=0;i<fps*3;i++){
  pose(i*dt);if(!lock.update(dt,true,'idle'))continue;
  const p=feet.map(f=>f.getWorldPosition(new T.Vector3()));
  if(!anchor)anchor=p;else for(let j=0;j<2;j++)assert.ok(p[j].distanceTo(anchor[j])<.001,'ankle drifts after lock');
 }
 assert.ok(anchor,'idle must lock');pose(4);root.position.x+=.2;
 assert.equal(lock.update(dt,false,'walk'),false,'walking releases both anchors');
 root.updateMatrixWorld(true);assert.ok(feet[0].getWorldPosition(new T.Vector3()).distanceTo(anchor[0])>.1);
 for(let i=0;i<fps;i++){pose(5+i*dt);lock.update(dt,true,'idle');}
 root.rotation.y=.5;assert.equal(lock.update(dt,true,'idle'),false,'turning resets the old stance');
 assert.equal(lock.update(dt,true,'crouchIdle'),false,'crouch transition releases the old stance');
});

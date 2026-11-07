import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createArenaOptics} from '../dist/arena-optics.js';
import {createArenaTurretArt} from '../dist/arena-turret-art.js';
import {createArenaTurrets} from '../dist/arena-defense.js';
test('feathered searchlights reach their target for all camera directions without new lights',()=>{
 const kit=createArenaOptics(T),scene=new T.Scene(),beam=kit.searchlight(scene),origin=new T.Vector3(20,17,0),end=new T.Vector3(1,0,10);
 for(const eye of [{x:0,y:1.7,z:0},{x:20,y:17,z:0},end]){kit.aim(beam,origin,end,eye);scene.updateMatrixWorld(true);assert.ok(new T.Vector3(0,1,0).applyMatrix4(beam.matrixWorld).distanceTo(end)<1e-5);assert.ok(beam.matrixWorld.elements.every(Number.isFinite));}
 const d=beam.material.map.image.data;assert.equal(d[3],0);assert.ok(d[(32*64+32)*4+3]>200);assert.equal(beam.material.depthWrite,false);assert.equal(beam.material.depthTest,true);
 kit.dispose();kit.dispose();
});
test('sentry laser originates on its moving optic, reaches the target and disappears on death/reset',()=>{
 const root=new T.Group(),M=Object.fromEntries(['paint','steel','black'].map(k=>[k,new T.MeshStandardMaterial()])),art=createArenaTurretArt(T,root,M,{low:true});
 const turrets=createArenaTurrets(),t=turrets[0],m=art.models.get(t.id);Object.assign(t,{target:{x:-30,y:1.5,z:-50},lockAt:1,yaw:.8});const sim={turrets,time:2,player:{x:-30,z:-50}};
 art.sync(sim);root.updateMatrixWorld(true);assert.equal(m.laser.visible,true);
 const core=m.laser.children[0],a=new T.Vector3(0,-.5,0).applyMatrix4(core.matrixWorld),b=new T.Vector3(0,.5,0).applyMatrix4(core.matrixWorld);
 assert.ok(a.distanceTo(m.lens.getWorldPosition(new T.Vector3()))<1e-5);assert.ok(b.distanceTo(new T.Vector3(t.target.x,t.target.y,t.target.z))<1e-5);
 t.hp=0;art.sync(sim);assert.equal(m.laser.visible,false);art.reset();assert.equal(m.laser.visible,false);
});

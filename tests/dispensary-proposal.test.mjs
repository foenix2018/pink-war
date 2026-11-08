import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createLandingFinish} from '../dist/landing-finish.js';
import {createAimRelease,reconcileAimModifiers} from '../dist/aim-release.js';

test('cancelled aim stays off while the controller trigger remains held; releases and fresh presses restore it',()=>{
 const aim=createAimRelease();assert.equal(aim.read(true),true);aim.cancel();for(let i=0;i<180;i++)assert.equal(aim.read(true),false);assert.equal(aim.read(false),false);assert.equal(aim.read(true),true);aim.cancel();aim.freshPress();assert.equal(aim.read(true),true);
});
test('missing Control/Meta key-up is repaired by actual modifier state without clearing movement',()=>{
 const keys=new Set(['ControlLeft','MetaRight','KeyW']);reconcileAimModifiers(keys,{code:'KeyD',ctrlKey:false,metaKey:false});assert.deepEqual([...keys],['KeyW']);keys.add('ControlLeft');reconcileAimModifiers(keys,{code:'ControlLeft',ctrlKey:false,metaKey:false});assert.ok(keys.has('ControlLeft'));
});
test('landing safety rails leave stair exits open and all emitted geometry is finite',()=>{
 const scene=new T.Group(),collisions=[],M={iron:new T.MeshStandardMaterial(),black:new T.MeshStandardMaterial()};createLandingFinish(T,scene,{M,low:true,collisions});
 for(const [x,z,y] of [[10.6,-8.02,12],[-10.6,-19.7,12],[-6.7,-44.5,25],[-6.7,-45.72,25]]){
  assert.equal(collisions.some(b=>y+1>b.y&&y<b.y+b.height&&Math.abs(x-b.x)<b.hx+.3&&Math.abs(z-b.z)<b.hz+.3),false,'stair exit stays open');
 }
 assert.ok(collisions.length>=9);let meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(meshes<=3);assert.ok(collisions.some(b=>b.z===-57.5),'back roof perimeter protected');
});

test('service runs clear 2.4 m of usable headroom while under-deck cables remain in place',async()=>{
 const {overheadServiceLift}=await import('../dist/overhead-clearance.js');const f=[{x:10.6,z:-12.5,hx:1.45,hz:6,height:12}];
 const a=[-14,13,-11],b=[14,12,-9],lift=overheadServiceLift(f,a,b,{radius:.035});assert.ok(lift>2);
 for(let i=0;i<=1000;i++){const t=i/1000,x=a[0]+28*t,z=a[2]+2*t;if(Math.abs(x-10.6)<=1.45&&Math.abs(z+12.5)<=6)assert.ok(13-t+lift-.035>=14.4);}
 assert.equal(overheadServiceLift(f,[-14,5,-11],[14,4,-9]),0);
});

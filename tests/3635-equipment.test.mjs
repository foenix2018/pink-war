import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createMachineFinishes} from '../dist/machine-finishes.js';
import {createCircuitSwitch} from '../dist/circuit-switch.js';
import {createArchiveTerminalFactory} from '../dist/archive-terminals.js';
test('the isolator lever stays in front of its housing throughout switching and releases its meshes',()=>{
 const f=createMachineFinishes(T,{performance:true}),scene=new T.Scene(),sw=createCircuitSwitch(T,scene,{materials:{paint:f.paint,metal:f.steel,rubber:f.rubber,dark:f.rubber}});
 for(const state of [false,true,false])for(let i=0;i<60;i++){sw.setState(state);scene.updateMatrixWorld(true);const b=new T.Box3().setFromObject(sw.pivot);assert.ok(b.min.z>.05,'handle must not penetrate enclosure');assert.ok(b.max.y<.64&&b.min.y>-.64);}
 sw.dispose();assert.equal(scene.children.length,0);f.dispose();
});
test('scenario terminal power changes status without recreating geometry or losing its narrative display',()=>{
 const f=createArchiveTerminalFactory(T,{loadTextures:false}),scene=new T.Scene(),c=f.create(scene),display=c.display,triangles=f.stats().triangles;
 f.setPowered(false);assert.equal(f.stats().powered,false);f.setPowered(true);assert.equal(f.stats().powered,true);assert.equal(c.display,display);assert.equal(f.stats().triangles,triangles);assert.equal(f.materials.metal.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(f.materials.metal.map.colorSpace,T.SRGBColorSpace);f.dispose();
});

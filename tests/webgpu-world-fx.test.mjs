import {createFortifiedArena} from '../dist/arena-fortress.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {rendererBackend,rendererLabel,createCompatibleRenderer} from '../dist/renderer-policy.js';
import {createWorldEffects,bareReflectionCamera,createReflectionScene} from '../dist/webgpu-world-fx.js';
import {createArenaOptics} from '../dist/arena-optics.js';

test('labels use the real backend, including WebGPURenderer running on WebGL2',()=>{
 const wrapped={isWebGPURenderer:true,backend:{isWebGLBackend:true}};
 assert.equal(rendererBackend(wrapped),'webgl');assert.equal(rendererLabel(wrapped),'WebGL 2');
 assert.equal(rendererLabel({backend:{isWebGPUBackend:true}}),'WebGPU');
 assert.equal(rendererBackend({isWebGLRenderer:true}),'webgl');assert.equal(rendererBackend({isWebGPURenderer:true}),'unknown');assert.equal(rendererBackend(null),'unavailable');
});
test('a successful wrapper init still reports its internal compatibility fallback',async()=>{
 class GPU{constructor(){this.backend={isWebGLBackend:true};}async init(){}}
 const r=await createCompatibleRenderer({canvas:{},WebGPU:GPU,WebGL:class{},profile:{preferWebGL:false}});
 assert.match(r.initialFailure,/repli WebGL 2/);assert.equal(rendererBackend(r.renderer),'webgl');
});
test('world shaders retain a standard fallback and the original texture',()=>{
 const f=createWorldEffects(T),map=new T.Texture(),m=f.hologram({map,opacity:.4}),w=f.water({normalMap:map});
 assert.equal(m.map,map);assert.equal(m.isNodeMaterial,undefined);assert.equal(w.normalMap,map);assert.equal(f.fog(new T.Group()),null);assert.equal(f.stats().reflectionPasses,0);f.dispose();f.dispose();
});
test('native effects share a single reflection, animate uniforms and clean up their resources',()=>{
 const f=createWorldEffects(T,{webgpu:true,reflections:true}),root=new T.Group();root.add(f.reflectionTarget);
 const holo=f.hologram(),water=f.water(),puddle=f.water({puddle:true}),a=f.fog(root),b=f.fog(root,{x:3});
 assert.ok(holo.isNodeMaterial&&holo.opacityNode);assert.ok(water.normalNode&&water.positionNode);assert.ok(puddle.opacityNode);
 assert.equal(a.geometry,b.geometry);assert.equal(a.material.depthWrite,false);assert.equal(a.material.depthTest,false);assert.equal(a.material.side,T.BackSide);
 assert.equal(f.stats().reflectionPasses,1);assert.equal(f.stats().reflectionResolutionScale,.25);assert.equal(f.stats().volumeSteps,10);
 f.update(7,{x:0,z:0});assert.equal(f.clock.value,7);assert.equal(a.visible,true);f.update(8,{x:200,z:200});assert.equal(a.visible,false);
 f.setReflectionHeight(2);assert.equal(f.reflectionTarget.position.y,2);let disposal=0;water.addEventListener('dispose',()=>disposal++);f.dispose();f.dispose();assert.equal(disposal,1);assert.equal(root.children.length,0);
});
test('low quality bounds volumetric samples and skips the reflection pass',()=>{
 const f=createWorldEffects(T,{webgpu:true,low:true,reflections:true});assert.equal(f.stats().volumeSteps,6);assert.equal(f.stats().reflectionPasses,0);f.dispose();
});
test('native searchlight volumes follow the light axis rather than the camera',()=>{
 const f=createWorldEffects(T,{webgpu:true}),optics=createArenaOptics(T,{webgpu:true,effects:f}),root=new T.Group(),beam=optics.searchlight(root),a=new T.Vector3(1,8,2),b=new T.Vector3(-4,0,-6);
 optics.aim(beam,a,b,{x:10,y:2,z:10});root.updateMatrixWorld(true);const entry=new T.Vector3(0,-1,0).applyMatrix4(beam.matrixWorld),exit=new T.Vector3(0,1,0).applyMatrix4(beam.matrixWorld);assert.ok(entry.distanceTo(a)<1e-6);assert.ok(exit.distanceTo(b)<1e-6);const pose=beam.quaternion.clone();optics.aim(beam,a,b,{x:-10,y:3,z:0});assert.ok(pose.angleTo(beam.quaternion)<1e-6);optics.dispose();f.dispose();
});

test('reflection camera never clones held weapons or serializes their metadata',()=>{
 const camera=new T.PerspectiveCamera(63,1.7,.1,400),gun=new T.Group();gun.userData.circular=gun;camera.add(gun);camera.userData.player=camera;
 const cache=new WeakMap(),virtual=bareReflectionCamera(T,camera,cache);assert.equal(virtual.children.length,0);assert.deepEqual(virtual.userData,{});assert.equal(virtual.near,.1);assert.ok(virtual.projectionMatrix.equals(camera.projectionMatrix));assert.equal(bareReflectionCamera(T,camera,cache),virtual);assert.equal(camera.children[0],gun);
});

test('reflection uses bounded real geometry and current poses, including readable holograms',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),opaque=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({color:0xff2244})),f=createWorldEffects(T,{webgpu:true}),map=new T.Texture(),holo=new T.Mesh(new T.PlaneGeometry(),f.hologram({map}));scene.add(camera,opaque,holo);opaque.position.x=2;
 const gun=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());camera.add(gun);camera.visible=false;
 const reflected=createReflectionScene(T,{objectLimit:2,triangleLimit:30});reflected.update(scene,camera);assert.equal(reflected.stats().objects,2);assert.ok(reflected.scene.children.some(o=>o.geometry===opaque.geometry));assert.ok(reflected.scene.children.some(o=>o.material.map===map));assert.ok(!reflected.scene.children.some(o=>o.geometry===gun.geometry));opaque.position.x=3;reflected.update(scene,camera);assert.equal(reflected.scene.children.find(o=>o.geometry===opaque.geometry).matrix.elements[12],3);reflected.dispose();f.dispose();
});

test('native arena shares its volume shader, limits visible beams and keeps its light budget',()=>{
 const scene=new T.Scene(),arena=createFortifiedArena(T,scene,[],[],{quality:'normal',webgpu:true});arena.update(2,{x:0,y:1.7,z:0});let visible=0;const materials=new Set();scene.traverse(o=>{if(o.name==='Projecteur / diffusion dans la brume'){if(o.visible)visible++;materials.add(o.material);}});assert.equal(visible,6);assert.equal(materials.size,1);assert.ok(arena.stats.dynamicLights<=5);assert.equal(arena.stats.worldEffects.reflectionPasses,1);assert.ok(arena.materials.wet.isNodeMaterial);arena.disposeTextures();
});

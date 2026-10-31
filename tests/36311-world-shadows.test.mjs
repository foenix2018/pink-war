import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {shadowBudget,applyWorldShadows,createWorldShadows,createGroundOcclusion} from '../dist/world-shadows.js';
import {graphicsProfile} from '../dist/renderer-policy.js';
const material=()=>new T.MeshStandardMaterial();
test('iPhone, compatible, performance and Quest profiles retain shadow maps with a bounded device budget',()=>{
 for(const [env,quality]of [[{userAgent:'iPhone'},'auto'],[{userAgent:'Quest 3 OculusBrowser'},'low'],[{rendererHint:'webgl'},'low']]){const p=graphicsProfile(env,quality);assert.equal(p.shadows,true);const b=shadowBudget(p);assert.equal(b.size,1024);assert.ok(b.hz<=6);assert.equal(b.torchSize,256);}
 assert.equal(shadowBudget(graphicsProfile({gpu:{},userAgent:'Macintosh'})).size,2048);
});
test('opaque actors, skinning, scenery and foliage cast, with no floating first-person or transparent-glass silhouette',()=>{
 const root=new T.Group(),camera=new T.PerspectiveCamera();root.add(camera);
 const box=new T.Mesh(new T.BoxGeometry(),material()),skin=new T.SkinnedMesh(new T.BoxGeometry(),material()),fps=box.clone();camera.add(fps);root.add(box,skin);
 const glass=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({transparent:true,opacity:.3})),leaf=new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial({transparent:true,alphaTest:.4})),glow=new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial());root.add(glass,leaf,glow);
 applyWorldShadows(root);assert.equal(box.castShadow,true);assert.equal(skin.castShadow,true);assert.equal(leaf.castShadow,true);assert.equal(fps.castShadow,false);assert.equal(fps.receiveShadow,true);assert.equal(glass.castShadow,false);assert.equal(glow.castShadow,false);
});
test('the shadow window follows the player, maps refresh on movement, reset and cadence, while contact shadows follow real elevation',()=>{
 const scene=new T.Scene(),light=new T.DirectionalLight(),torch=new T.SpotLight(),renderer={shadowMap:{}};scene.add(light,torch);
 const s=createWorldShadows(T,{scene,light,renderer,profile:{phone:true},extraLights:[torch]});const e={x:20,z:40,elevation:4.8,radius:.5};
 s.update(0,e,{entities:[e],heightAt:()=>4.8});assert.equal(renderer.shadowMap.enabled,true);assert.equal(light.shadow.needsUpdate,true);assert.equal(torch.castShadow,true);assert.equal(s.contacts.count,1);const m=new T.Matrix4();s.contacts.getMatrixAt(0,m);assert.ok(Math.abs(m.elements[13]-4.822)<.001);
 renderer.shadowMap.needsUpdate=false;light.shadow.needsUpdate=false;s.update(.01,e);assert.equal(renderer.shadowMap.needsUpdate,false);
 s.update(.2,e);assert.equal(renderer.shadowMap.needsUpdate,true);s.update(.21,{...e,x:60});assert.ok(Math.abs(light.target.position.x-60)<.05);
 s.update(.22,e,{enabled:false});assert.equal(light.castShadow,false);assert.equal(torch.castShadow,false);assert.equal(renderer.shadowMap.enabled,false);assert.equal(s.contacts.visible,false);
 s.update(0,e);assert.equal(renderer.shadowMap.needsUpdate,true);
 s.update(.3,e,{entities:[{...e,elevation:7}],heightAt:()=>4.8});assert.equal(s.contacts.count,0,'high jumps leave no detached ground contact');
 s.update(.4,e,{entities:[e],heightAt:()=>NaN});assert.equal(s.contacts.count,0,'invalid support never writes non-finite instance matrices');
 s.dispose();assert.equal(scene.children.includes(s.contacts),false);
});
test('ground occlusion excludes ceilings, platforms and floor slabs, darkening only the grounded contact of physical solids',()=>{
 const parent=new T.Group(),o=createGroundOcclusion(T,parent,[{x:0,z:0,hx:1,hz:1,y:0,height:1},{x:0,z:0,hx:20,hz:20,y:3.4,height:.1},{x:20,z:0,hx:5,hz:5,y:0,height:.2,walkableSurface:true}],{compact:true});
 assert.deepEqual(o.stats(),{boxes:1,draws:1,resolution:512});const mesh=o.root.children[0],data=mesh.material.map.image.data;let max=0;for(let i=3;i<data.length;i+=4)max=Math.max(max,data[i]);assert.ok(max>40&&max<110);assert.equal(data[3],0);o.dispose();assert.equal(parent.children.length,0);
});

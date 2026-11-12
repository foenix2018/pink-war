import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCameraFeel} from '../dist/camera-feel.js';
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const context=new Proxy({},{get:(o,k)=>o[k]??(k.startsWith('create')?()=>({addColorStop(){},data:new Uint8ClampedArray(4)}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};

test('living camera: bob follows ground speed, landing dips, trauma shake decays, sprint widens the view',()=>{
 const feel=createCameraFeel({reduced:false}),camera=new T.PerspectiveCamera(72);camera.rotation.order='YXZ';
 for(let i=0;i<60;i++)feel.update(1/60,{speed:0,grounded:true});
 let p=feel.pose();assert.ok(Math.abs(p.y)<1e-4&&Math.abs(p.roll)<1e-4,'still when standing');
 let peak=0;for(let i=0;i<120;i++){feel.update(1/60,{speed:4.5,grounded:true,strafe:1});peak=Math.max(peak,Math.abs(feel.pose().y));}
 assert.ok(peak>.015&&peak<.04,'walk bob of a few centimetres: '+peak);assert.ok(feel.pose().roll<-.005,'leans into the strafe');
 for(let i=0;i<30;i++)feel.update(1/60,{speed:7,grounded:true,sprint:true});assert.ok(feel.pose().fov>3);
 feel.update(1/60,{speed:2,grounded:false,verticalSpeed:-8});feel.update(1/60,{speed:2,grounded:true,verticalSpeed:0});
 assert.ok(feel.state.dip>.1,'landing dip');
 feel.shake(.8);const s0=feel.state.shake;for(let i=0;i<60;i++)feel.update(1/60,{});assert.ok(feel.state.shake<s0*.2&&feel.state.shake===0,'shake gone within a second');
 camera.position.set(0,1.6,0);feel.shake(1);feel.update(1/60,{speed:4,grounded:true});feel.apply(camera);
 for(const v of [camera.position.x,camera.position.y,camera.position.z,camera.rotation.x,camera.rotation.z,camera.fov])assert.ok(Number.isFinite(v));
 assert.ok(Math.abs(camera.position.y-1.6)<.25);
 const only=new T.PerspectiveCamera(72);only.rotation.order='YXZ';only.position.set(0,1.6,0);feel.apply(only,{motion:false});assert.equal(only.position.y,1.6,'shake only: the walk bob belongs to fps-motion');assert.equal(only.fov,72);
 const calm=createCameraFeel({reduced:true});for(let i=0;i<120;i++)calm.update(1/60,{speed:4.5,grounded:true});assert.ok(Math.abs(calm.pose().y)<peak*.5,'reduced motion is respected');
});

test('levels 1, 2 and 3 share the film look, the living camera, the light shafts and the firing tell',async()=>{
 for(const page of ['game.js','level2-test.js','niveau3.js']){const s=read(page);assert.match(s,/createCameraFeel\(\)/);assert.match(s,/mountFilmLook\(/);assert.match(s,/cameraFeel\.apply\(camera,\{motion:false\}\)/);assert.match(s,/applyFPSCameraMotion\(camera,game/);assert.match(s,/graded:\(\)=>/);assert.match(s,/cameraFeel\.shake\(\.45\)/);}
 for(const page of ['level2-test.js','niveau3.js'])assert.match(read(page),/view==='fps'&&!xr\?\.active&&running&&!endCine\)cameraFeel\.apply/,'never in the headset or the end scene');
 for(const art of ['m01-extension-art.js','m02-extension-art.js','m03-art.js'])assert.match(read(art),/createLightShafts\(T, root,/);
 assert.match(read('enemy-destruction-fx.js'),/e\.chargeProgress/);assert.match(read('film-look.js'),/prefers-reduced-motion/);
 const {createLightShafts}=await import('../dist/light-shafts.js');
 const g=new T.Group(),sh=createLightShafts(T,g,[{x:0,y:6,z:0},{x:5,y:8,z:2,color:0x88ccff}]);
 assert.equal(sh.count,2);assert.ok(sh.motes>20);sh.update(.016);sh.update(.016);
 let meshes=0;g.traverse(o=>{if(o.isMesh||o.isPoints)meshes++;});assert.equal(meshes,2,'one instanced cone mesh and one dust cloud for all lamps');
 assert.equal(createLightShafts(T,new T.Group(),[{x:0,y:6,z:0}],{low:true}).motes,0);
});

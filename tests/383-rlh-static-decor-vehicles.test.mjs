import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRLHStaticVehicle,RLH_FLEET_REV} from '../dist/rlh-static-vehicles.js';
import {RLH_CIVIL_SOURCE_VERSION} from '../dist/rlh-civil-car-v750.js';
import {extensionObstacles} from '../dist/m01-extension-layout.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {readFileSync} from 'node:fs';
const M=()=>Object.fromEntries(['red','white','yellow','steel','paintedMetal','dark','black','glass','cyan','redGlow'].map(x=>[x,new T.MeshStandardMaterial({name:x,color:0x737e89,transparent:x==='glass',opacity:x==='glass'?.72:1})]));
const metrics=root=>{
 root.updateMatrixWorld(true,true);
 let meshes=0,triangles=0;
 root.traverse(o=>{if(!o.isMesh)return;meshes++;const a=o.geometry.attributes.position;assert.ok(a?.count,'no invalid mesh');triangles+=a.count/3;for(const n of a.array)assert.ok(Number.isFinite(n),'all vehicle vertices finite');});
 return {meshes,triangles,size:new T.Box3().setFromObject(root).getSize(new T.Vector3())};
};
test('actual RLH V750 profiles build in Pink Wars without external asset fetch',()=>{
 assert.equal(RLH_CIVIL_SOURCE_VERSION,750);
 const g=createRLHStaticVehicle(T,'civil',{type:'berline',low:true,M:M()});
 assert.equal(g.userData.staticVehicle.kind,'civil');
 assert.equal(g.userData.staticVehicle.nonPlayable,true);
 assert.ok(g.userData.staticVehicle.sourceMeshes>25);
 const v=metrics(g);
 assert.ok(v.meshes<14,'one GPU batch per original RLH material, not dozens of wheel draw calls');
 assert.ok(v.size.x>4.0&&v.size.x<4.9);
 assert.ok(v.size.z>1.6&&v.size.z<2.3);
 assert.ok(v.triangles<55000);
});
test('RLH Defender V570-derived static exterior has roof rails, mirrors and fixed four wheels',()=>{
 const g=createRLHStaticVehicle(T,'defender',{low:true,M:M()});
 assert.equal(g.userData.staticVehicle.revision,RLH_FLEET_REV);
 assert.equal(g.userData.staticVehicle.noControls,true);
 const v=metrics(g);
 assert.ok(v.size.x>1.8&&v.size.x<2.6,'4x4 width');
 assert.ok(v.size.z>4.2&&v.size.z<5.2,'4x4 length');
 assert.ok(v.size.y>2.1&&v.size.y<3.2,'roof rack');
 assert.ok(v.meshes<=11,'batches per material rather than per bolt');
 assert.ok(v.triangles<75000);
});
test('FPTL V396-derived deco retains shutter slats, roof ladder and fire pump while reducing draw calls',()=>{
 const g=createRLHStaticVehicle(T,'fptl',{low:false,M:M()});
 assert.equal(g.userData.staticVehicle.kind,'fptl');
 const v=metrics(g);
 assert.ok(v.size.x>2.2&&v.size.x<2.7);
 assert.ok(v.size.z>6.9&&v.size.z<7.5);
 assert.ok(v.size.y>3.2&&v.size.y<3.65);
 assert.ok(v.meshes<=11);
 assert.ok(v.triangles<120000);
});
test('existing car/FPT obstacles stay authoritative; only exterior dressing is replaced',()=>{
 const obstacles=extensionObstacles();
 assert.ok(obstacles.some(o=>o.kind==='car'));
 assert.ok(obstacles.some(o=>o.kind==='fpt'));
 const sceneText=String(createM01ExtensionArt);
 assert.match(sceneText,/createRLHStaticVehicle\(T,'civil'/);
 assert.match(sceneText,/createRLHStaticVehicle\(T,'defender'/);
 assert.match(sceneText,/createRLHStaticVehicle\(T,'fptl'/);
 assert.doesNotMatch(sceneText,/collisions\.push\(/);
});
test('static fleet refuses playable variants and has no gameplay controls',()=>{
 assert.throws(()=>createRLHStaticVehicle(T,'pilot',{M:M()}),/Unsupported RLH/);
 for(const kind of ['defender','fptl','civil']){
  const g=createRLHStaticVehicle(T,kind,{M:M(),low:true});
  assert.equal(g.userData.staticVehicle.noRuntimePhysics,true);
  let action=false;
  g.traverse(o=>{if(o.userData?.action||o.userData?.interactionLabel)action=true;});
  assert.equal(action,false);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {freezeShowcase,showcaseMaterialResolver} from '../dist/hideout-showcase.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {parsePWM} from '../dist/blender-models.js';

test('native model scale and conversion axes survive freezing; hidden source parts stay hidden',()=>{
 const root=new T.Group();root.scale.setScalar(.125);root.rotation.y=-Math.PI/2;
 const material=new T.MeshStandardMaterial(),visible=new T.Mesh(new T.BoxGeometry(2,4,6),material);root.add(visible);
 const hidden=new T.Group();hidden.visible=false;hidden.add(new T.Mesh(new T.BoxGeometry(100,100,100),material));root.add(hidden);
 root.updateMatrixWorld(true);const native=new T.Box3().setFromObject(visible);const frozen=freezeShowcase(root);const result=new T.Box3().setFromObject(frozen.root);
 assert.ok(result.min.distanceTo(native.min)<1e-6);assert.ok(result.max.distanceTo(native.max)<1e-6);assert.equal(frozen.triangles,12);assert.equal(frozen.batches,1);assert.ok(!frozen.root.children.some(m=>m.isSkinnedMesh));frozen.dispose();
});
test('frozen native skeleton vertices and normals match the evaluated pose',()=>{
 const geometry=new T.PlaneGeometry(1,1),count=geometry.attributes.position.count;
 geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(new Uint16Array(count*4),4));const weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const bone=new T.Bone(),mesh=new T.SkinnedMesh(geometry,new T.MeshStandardMaterial());mesh.add(bone);mesh.bind(new T.Skeleton([bone]));bone.position.set(.3,.5,-.2);bone.rotation.x=.65;mesh.updateMatrixWorld(true);mesh.skeleton.update();
 const expected=new T.Vector3();mesh.getVertexPosition(0,expected);const frozen=freezeShowcase(mesh),p=frozen.root.children[0].geometry.attributes.position,n=frozen.root.children[0].geometry.attributes.normal;
 assert.ok(new T.Vector3().fromBufferAttribute(p,0).distanceTo(expected)<1e-6);const normal=new T.Vector3(0,0,1).applyQuaternion(bone.quaternion);assert.ok(new T.Vector3().fromBufferAttribute(n,0).distanceTo(normal)<1e-6);assert.equal(frozen.triangles,2);frozen.dispose();
});
test('reflection preserves front-face winding, vertex colour and secondary texture coordinates',()=>{
 const root=new T.Group(),g=new T.PlaneGeometry(1,1);g.setAttribute('color',new T.Float32BufferAttribute(Array(4).fill([.2,.4,.6]).flat(),3));g.setAttribute('uv1',g.attributes.uv.clone());const m=new T.MeshStandardMaterial({vertexColors:true}),mesh=new T.Mesh(g,m);mesh.scale.x=-1;root.add(mesh);
 const frozen=freezeShowcase(root),result=frozen.root.children[0].geometry,a=new T.Vector3().fromBufferAttribute(result.attributes.position,0),b=new T.Vector3().fromBufferAttribute(result.attributes.position,1),c=new T.Vector3().fromBufferAttribute(result.attributes.position,2);
 assert.ok(b.sub(a).cross(c.sub(a)).z>0);assert.ok(Math.abs(result.attributes.color.getY(0)-.4)<1e-6);assert.equal(result.attributes.uv1.count,6);frozen.dispose();assert.equal(mesh.geometry,g,'shared weapon prototype geometry remains intact');
});
test('sharing a showcase finish preserves the native colour of each part in vertex data',()=>{
 const root=new T.Group(),red=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xff0000,roughness:.4,metalness:.6})),blue=new T.Mesh(red.geometry,new T.MeshStandardMaterial({color:0x0000ff,roughness:.4,metalness:.6}));blue.position.x=2;root.add(red,blue);
 const f=freezeShowcase(root,{resolveMaterial:showcaseMaterialResolver()});assert.equal(f.batches,1);const color=f.root.children[0].geometry.attributes.color;assert.equal(color.getX(0),1);assert.equal(color.getZ(color.count-1),1);assert.equal(f.root.children[0].material.color.getHex(),0xffffff);f.dispose();
});
test('the baked catalogue contains every real weapon, both native outfits and finite per-vertex colours',()=>{
 const base=new URL('../dist/assets/hideout/',import.meta.url),catalogue=JSON.parse(readFileSync(new URL('showcase-materials.json',base))),layout=JSON.parse(readFileSync(new URL('layout.json',base)));
 assert.deepEqual(catalogue.catalogue.weapons.map(w=>w.index).sort((a,b)=>a-b),Array.from({length:11},(_,i)=>i));assert.deepEqual(catalogue.catalogue.outfits.map(o=>o.hero),['ghju','lylu']);assert.equal(layout.showcase.weapons.length,11);
 const gz=readFileSync(new URL('showcase.pwm.gz',base)),raw=gunzipSync(gz),parsed=parsePWM(T,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));assert.ok(parsed.triangles>400000&&parsed.triangles<550000);assert.ok(parsed.primitives.length<=90);assert.ok(gz.length<6e6);
 const materials=new Set(catalogue.materials.map(m=>m.uuid));for(const p of parsed.primitives){assert.ok(materials.has(p.material));assert.equal(p.geometry.attributes.color.count,p.geometry.attributes.position.count);assert.ok([...p.geometry.attributes.color.array].every(Number.isFinite));p.geometry.dispose();}
 for(const w of catalogue.catalogue.weapons){assert.equal(w.source,'createWeaponModels');assert.ok(w.bounds.min.every(Number.isFinite));if(w.bench){assert.ok(w.bounds.min[1]>=.64);if(w.index===7)assert.ok(w.size[1]<.5,'both pistols sit at the same height');}else{assert.ok(w.bounds.min[2]>=-4.301);assert.ok(w.size[0]<1.5);assert.ok(w.size[1]<.7);}}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as Three from '../dist/vendor/three.webgpu.min.js';
import {buildVesperGeometry} from '../dist/vesper-combat.js';
import {projectedHull,createVesperArt,VESPER_SUN,vesperArtColliders} from '../dist/vesper-art.js';
import {segmentBox} from '../dist/game-logic.js';

test('The realism renderer removes all old wreck skins but retains the reference walls',()=>{
  const v=[];
  for(let i=0;i<5;i++)for(const [x,z] of [[0,0],[1,0],[0,1]])v.push(x+i*4,0,z,0,1,0,.5,.5,.5,0,0,i===4?4:0);
  const source={data:()=>({vertices:new Float32Array(v),indices:Uint32Array.from({length:15},(_,i)=>i)}),
    artRanges:[{start:3,end:6,kind:'brokenVehicle'},{start:6,end:9,kind:'v4Car'},{start:9,end:12,kind:'v5PodVehicle'}]};
  const legacy=buildVesperGeometry(source),realism=buildVesperGeometry(source,{art:true});
  assert.equal(legacy.triangles,5,'the independent visit renderer retains its reference geometry');
  assert.equal(realism.triangles,1,'one wall remains; the three skins and polygonal plant proxy are replaced');
  assert.deepEqual(Array.from(realism.geometry.index.array),[0,1,2]);
  legacy.geometry.dispose();realism.geometry.dispose();
});

test('Mobile shadow silhouettes extend away from the same sun and enclose the collider footprint',()=>{
  const box={x1:2,x2:5,z1:-4,z2:-2,y2:8};const hull=projectedHull(box);
  const dx=-VESPER_SUN.x/VESPER_SUN.y*box.y2,dz=-VESPER_SUN.z/VESPER_SUN.y*box.y2;
  assert.ok(hull.length>=4);
  assert.ok(Math.abs(Math.max(...hull.map(p=>p[0]))-(box.x2+dx))<1e-8);
  assert.ok(Math.abs(Math.min(...hull.map(p=>p[1]))-(box.z1+dz))<1e-8);
  const area=Math.abs(hull.reduce((a,p,i)=>a+p[0]*hull[(i+1)%hull.length][1]-hull[(i+1)%hull.length][0]*p[1],0)/2);
  assert.ok(area>(box.x2-box.x1)*(box.z2-box.z1));
});

test('The opened medical windows pass real rays while the sill, mullion and piers remain solid',()=>{
  const original=[{x1:-12.55,x2:-11.45,y1:0,y2:8.5,z1:11.5,z2:24}];
  const colliders=vesperArtColliders(original),z=11.5+12.5/6;
  const blocked=(height,atZ)=>colliders.some(b=>segmentBox({x:-8,y:height,z:atZ},{x:-16,y:height,z:atZ},
    {x:(b.x1+b.x2)/2,z:(b.z1+b.z2)/2,y:b.y1,hx:(b.x2-b.x1)/2,hz:(b.z2-b.z1)/2,height:b.y2-b.y1})!==null);
  assert.equal(blocked(3.15,z+.6),false,'broken bay has no full-wall proxy');
  assert.equal(blocked(.9,z+.6),true,'solid sill remains cover');
  assert.equal(blocked(3.15,z),true,'the actual metal mullion blocks the ray');
  assert.equal(blocked(3.15,11.5),true,'pier remains solid');
  assert.equal(blocked(1.7,28),false,'the existing main doorway remains clear');
  assert.equal(original.length,1,'the separate visit renderer can retain its own original collision list');
});

test('Detailed W01 art has a finite mobile budget and never mutates traversal colliders',()=>{
  const originalDocument=globalThis.document;
  const ctx={beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillText(){},clearRect(){},drawImage(){}};
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
  const T={...Three,TextureLoader:class {load(){return new Three.Texture();}}};
  const collisions=[{x1:-12.5,x2:-11.5,y1:0,y2:8,z1:14,z2:22}];const before=structuredClone(collisions);
  let art;
  try{
    art=createVesperArt(T,new T.Scene(),{collide:collisions,performance:true});
    assert.equal(art.stats.vehicles,3);assert.ok(art.stats.trees>=10);assert.ok(art.stats.ferns>=30);
    assert.ok(art.stats.draws<=16);assert.ok(art.stats.triangles<150000);
    art.root.traverse(object=>{if(object.geometry){for(const n of object.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});
    assert.deepEqual(collisions,before);
  }finally{art?.dispose();globalThis.document=originalDocument;}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
const context=new Proxy({},{get:(o,k)=>o[k]??(k==='measureText'?()=>({width:10}):k.startsWith('create')?()=>({addColorStop(){},data:new Uint8ClampedArray(4)}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
const {createCyberCity,PODIUM_TOWERS,SKYBRIDGES}=await import('../dist/m03-city.js');
const {createEnemyDestructionFX,robotDeathDuration,robotKnockback}=await import('../dist/enemy-destruction-fx.js');
const meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url),'utf8'));
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('chapter 03 city: towers stand on existing roofs, bridges fly over the avenue, nothing new at walking height inside the bounds',()=>{
 for(const [x1,x2,z1,z2,roof] of PODIUM_TOWERS){
  const host=meta.colliders.find(c=>c.x1<=x1+.01&&c.x2>=x2-.01&&c.z1<=z1+.01&&c.z2>=z2-.01&&c.y2>=6)||meta.colliders.filter(c=>c.label==='structure'&&c.y2>=7).length>0;
  assert.ok(host,'tower over a building: '+[x1,x2,z1,z2]);assert.ok(roof>=7,'starts above the roof');
 }
 for(const b of SKYBRIDGES)assert.ok(b.y>=18,'bridges clear the avenue and its fights');
 const group=new T.Group(),city=createCyberCity(T,group,{advert:()=>{},bounds:meta.bounds}),s=city.stats();
 assert.equal(s.towers,6);assert.ok(s.farTowers>=40);assert.ok(s.vehicles>=60);assert.ok(s.signs>=10);assert.equal(s.bridges,3);
 let triangles=0;group.traverse(o=>{if(o.isMesh){const g=o.geometry;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});
 assert.ok(triangles<60000,'a city for the price of one character: '+triangles);
 // Far towers stay outside the playable bounds.
 let farMesh=null;group.traverse(o=>{if(o.name==='tours lointaines')farMesh=o;});const far=farMesh.geometry.attributes.position,B=meta.bounds;
 for(let i=0;i<far.count;i++){const x=far.getX(i),z=far.getZ(i);assert.ok(x<=B.minX-4||x>=B.maxX+5||z>=B.maxZ+5||z<=B.minZ-4,'far tower inside the play area at '+x+','+z);}
 city.update(1,.016);city.update(2,.016);
 const low=createCyberCity(T,new T.Group(),{low:true,advert:()=>{}}).stats();assert.ok(low.vehicles<s.vehicles&&low.farTowers<s.farTowers);
 assert.match(read('m03-art.js'),/createCyberCity\(T, root, \{ low, rich, advert/);assert.match(read('m03-sector.js'),/cityWindowAtlas\(T, low \? 512 : 1024\)/);
});

test('a destroyed machine is thrown, slammed and blown up in well under a second, with debris and a scorch mark',()=>{
 for(const f of ['probe','stalker','seer','brute','bulwark','sentinel'])assert.ok(robotDeathDuration(f)<=.9,f);
 assert.ok(robotKnockback('stalker').speed>robotKnockback('brute').speed&&robotKnockback('brute').speed>robotKnockback('sentinel').speed,'light machines fly, heavy ones stagger');
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.position.set(0,1.6,10);const sounds=[];
 const fx=createEnemyDestructionFX(T,scene,{camera,onSound:k=>sounds.push(k)});
 const model=new T.Group();model.position.set(0,0,0);scene.add(model);
 fx.kill(model,{id:1,form:'stalker',x:0,z:0,groundY:0});
 assert.equal(sounds[0],'rupture','the kill opens on a hard crack, not a power-down');assert.ok(fx.stats().chunks>=8,'plating torn off at once');
 for(let i=0;i<6;i++)fx.update(.05);
 assert.ok(model.position.z<-.5,'knocked away from the shooter: '+model.position.z);assert.ok(Math.abs(model.rotation.x)>.9,'already on its back');
 for(let i=0;i<8;i++)fx.update(.05);
 assert.equal(fx.stats().falling,0);assert.equal(model.parent,null);assert.ok(fx.stats().explosions>0);assert.equal(sounds.filter(k=>k==='rupture').length,2);
 for(let i=0;i<80;i++)fx.update(.05);assert.ok(fx.stats().burst>=1,'the scorch mark stays for a while');
 fx.reset();assert.equal(fx.stats().burst,0);fx.dispose();
});

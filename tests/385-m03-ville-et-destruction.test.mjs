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

test('chapter 03 objects: every baked prop box becomes a modelled object with the same footprint, collisions untouched',async()=>{
 const {decodeSector}=await import('../dist/m03-sector.js');const {classifySectorProps,createSectorProps}=await import('../dist/m03-props.js');
 const {AREAS}=await import('../dist/m03-layout.js');
 const bin=readFileSync(new URL('../dist/assets/m03/vesper-sector.bin',import.meta.url));
 const sector=decodeSector(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
 const before=JSON.stringify(meta.colliders);
 const {props,drop}=classifySectorProps(meta,sector.world);
 const count=k=>props.filter(p=>p.kind===k).length;
 assert.equal(count('jersey'),28);assert.equal(count('workbench'),7);assert.equal(count('bed'),5);assert.equal(count('barricade'),3);
 assert.equal(count('bollard'),25,'kerb bollards every 12 m, not oil drums');assert.ok(count('lamp')>=12&&count('mast')>=20&&count('medcase')>=6&&count('rack')>=6&&count('cabin')>=4);
 assert.equal(count('drum')+count('bush')+count('post'),0,'no random drums, shrub blocks or anonymous poles');
 assert.ok(props.length>=150);assert.ok(drop.size>40000,'baked boxes and the loose scatter are dropped: '+drop.size);
 // No street furniture inside the annexe or the workshop.
 for(const p of props.filter(p=>p.kind==='lamp'||p.kind==='mast'))assert.ok(!AREAS.some(a=>a.roof&&p.cx>=a.x1&&p.cx<=a.x2&&p.cz>=a.z1&&p.cz<=a.z2),'street object indoors at '+p.cx+','+p.cz);
 T.TextureLoader.prototype.load=function(){return new T.Texture();};
 const group=new T.Group(),r=createSectorProps(T,group,props,{rich:true}).stats();
 assert.ok(r.meshes<=32,'merged per material: '+r.meshes);assert.ok(r.triangles<220000,'triangles '+r.triangles);
 // Every object stays inside its collider (plus a lamp's arm and a bed's IV pole).
 const box=new T.Box3().setFromObject(group);assert.ok(box.max.y<14);
 assert.equal(JSON.stringify(meta.colliders),before,'collisions are not modified');
 const low=createSectorProps(T,new T.Group(),props,{low:true}).stats();assert.ok(low.triangles<r.triangles*.6);
 assert.match(read('m03-art.js'),/createSectorProps\(T, root, propList\.props, \{ low, rich \}\)/);
});

test('chapter 03 plots: paved aprons, a real boulevard, marked yards and a perimeter wall with matching collisions',async()=>{
 const {createSectorGrounds,APRONS,BOULEVARD}=await import('../dist/m03-grounds.js');const L=await import('../dist/m03-layout.js');
 const g=createSectorGrounds(T,new T.Group(),{rich:true}),s=g.stats();
 assert.ok(s.quads>400&&s.meshes<=8);assert.ok(s.bays>=30,'parking bays: '+s.bays);
 for(const [x1,x2] of APRONS)assert.ok(Math.min(Math.abs(x1),Math.abs(x2))>=15,'aprons never cover the avenue or its pavements');
 assert.equal(BOULEVARD.median,-56,'the median sits under the lamp row');
 const box=new T.Box3().setFromObject(g.group);assert.ok(box.min.y>-.06&&box.max.y<4.2);
 const walls=L.extraObstacles().filter(o=>o.look==='perimeter');assert.equal(walls.length,L.PERIMETER.length);
 for(const w of walls)assert.ok(Math.abs(w.x)-w.hx>=77||Math.abs(w.z)-w.hz>=71,'the wall stands on the boundary, outside every route');
 for(const p of L.VAN_PATH)assert.ok(!walls.some(w=>Math.abs(p.x-w.x)<w.hx+3&&Math.abs(p.z-w.z)<w.hz+3));
});

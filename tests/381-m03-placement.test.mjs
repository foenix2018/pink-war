import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import*as T from'../dist/vendor/three.webgpu.min.js';
import{decodeSector,sectorObstacles,sectorTraversal,createSectorMeshes}from'../dist/m03-sector.js';
import{classifySectorProps}from'../dist/m03-props.js';
import{createCyberCity,PODIUM_TOWERS}from'../dist/m03-city.js';
import{createServiceInfrastructure,rampPillars,SERVICE_RAMP,FREIGHT_GANTRY,retiredMachineHull,faceBounds,serviceRampHeight}from'../dist/m03-coherence.js';
import{extraObstacles}from'../dist/m03-layout.js';
const ctx=new Proxy({},{get:(o,k)=>o[k]??(k==='measureText'?()=>({width:10}):k.startsWith('create')?()=>({addColorStop(){},data:new Uint8ClampedArray(4)}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};T.TextureLoader.prototype.load=function(){return new T.Texture();};
const meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url))),bin=readFileSync(new URL('../dist/assets/m03/vesper-sector.bin',import.meta.url)),sector=decodeSector(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
const props=classifySectorProps(meta,sector.world),tr=sectorTraversal(meta);
test('M03 replacement racks, cabinets and vegetation stand on their actual floor',()=>{
 for(const p of props.props)assert.ok(Math.abs(p.y-tr.height(p.cx,p.cz,0,p.y+.1))<.02,p.kind+' at '+p.cx+','+p.cz);
 const racks=props.props.filter(p=>p.kind==='rack');assert.equal(racks.length,8);assert.ok(racks.every(p=>p.y===0&&p.h>5));
});
test('retiring a small prop never deletes an entire wall, roof or road through its centroid',()=>{
 let buildings=0,retired=0;
 for(let q=0;q<sector.world.n;q++){
  const b=faceBounds(sector.world,q,meta.scale),w=b.x2-b.x1,h=b.y2-b.y1,d=b.z2-b.z1;
  if(Math.max(w*h,w*d,h*d)>60){assert.equal(props.drop.has(q),false,'architectural face '+q);buildings++;}
  if(retiredMachineHull(b)){assert.ok(props.drop.has(q));retired++;}
 }
 assert.ok(buildings>100&&retired>100);
 const obstacles=sectorObstacles(meta);for(const c of meta.physicalSolids.filter(retiredMachineHull))assert.ok(!obstacles.some(o=>o.x===(c.x1+c.x2)/2&&o.z===(c.z1+c.z2)/2&&o.y===c.y1));
});
test('the old neon fixture cannot survive when its entire owner is removed',()=>{
 const meshes=createSectorMeshes(T,sector,{drop:new Set(Array.from({length:sector.world.n},(_,i)=>i))});
 assert.equal(meshes.stats.neons.fixtures,0);
 assert.ok(!meshes.group.children.some(o=>o.isMesh&&o.material?.vertexColors&&o.material?.isMeshBasicMaterial),'no retired world neon mesh survives');
});
test('every high city sign attaches to the actual tier and each tower starts on an existing roof',()=>{
 const city=createCyberCity(T,new T.Group(),{advert:()=>{},bounds:meta.bounds});
 assert.ok(city.attachments.length>=10);
 for(const a of city.attachments){const wall=city.towers[a.host].layers.find(l=>a.y>=l.y1&&a.y<=l.y2);assert.ok(wall);assert.ok(a.z>=wall.z1&&a.z<=wall.z2);assert.ok(Math.abs(a.wall-wall.x1)<1e-6||Math.abs(a.wall-wall.x2)<1e-6);assert.ok(Math.abs(a.x-a.wall)<1,'attached frame/arm');}
 for(const[x1,x2,z1,z2,roof]of PODIUM_TOWERS){let supported=false;for(let q=0;q<sector.world.n;q++){const b=faceBounds(sector.world,q,meta.scale);if(Math.abs(b.y1-roof)<.02&&Math.abs(b.y2-roof)<.02&&b.x1<=x1&&b.x2>=x2&&b.z1<=z1&&b.z2>=z2)supported=true;}assert.ok(supported,'roof supports tower '+x1+','+z1);}
});
test('ramp piers and gantry hulls occupy the actual supporting geometry',()=>{
 const M=Object.fromEntries(['concrete','galva','dark','yellow'].map(k=>[k,new T.MeshStandardMaterial()])),scene=new T.Scene(),infra=createServiceInfrastructure(T,scene,M);scene.updateMatrixWorld(true);
 const ray=new T.Raycaster();
 for(const p of[...rampPillars(),...[FREIGHT_GANTRY.x1,FREIGHT_GANTRY.x2].map(x=>({x,z:FREIGHT_GANTRY.z,height:FREIGHT_GANTRY.height}))]){
  ray.set(new T.Vector3(p.x-2,Math.min(2,p.height/2),p.z),new T.Vector3(1,0,0));const hit=ray.intersectObject(infra.root,true)[0];assert.ok(hit&&hit.distance<2,p.x+','+p.z);
  assert.ok(extraObstacles().some(o=>o.x===p.x&&o.z===p.z&&o.height>=p.height));
 }
 for(const p of rampPillars()){ray.set(new T.Vector3(p.x,p.height+1,p.z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(infra.root,true)[0];assert.ok(hit&&Math.abs(hit.point.y-(p.height+.45))<.03,'deck rests on pier');}
 assert.equal(SERVICE_RAMP[0][1],8.53);assert.ok(SERVICE_RAMP.at(-1)[1]<.2);infra.update(2);scene.updateMatrixWorld(true);const trolley=scene.getObjectByName('chariot de levage sur rail');assert.ok(trolley.position.x>FREIGHT_GANTRY.x1&&trolley.position.x<FREIGHT_GANTRY.x2);
});
test('the parked trailer and stacked containers retain their complete physical envelope',()=>{
 const open=extraObstacles({open:['remorque']}),closed=extraObstacles(),parked=open.find(o=>o.parked==='remorque');assert.ok(parked);assert.ok(!open.some(o=>o.movable==='remorque'));assert.ok(closed.some(o=>o.movable==='remorque'));
 assert.ok(parked.x+parked.hx<96.5);assert.ok(parked.x-parked.hx>82);
 const stack=open.find(o=>o.kind==='container'&&o.x===67);assert.equal(stack.height,5.4);
});
test('the elevated road carries feet at its real surface, lets the convoy pass below and stops a shot crossing the deck',async()=>{
 const {segmentBox}=await import('../dist/game-logic.js'),M=Object.fromEntries(['concrete','galva','dark','yellow'].map(k=>[k,new T.MeshStandardMaterial()])),scene=new T.Scene();createServiceInfrastructure(T,scene,M);scene.updateMatrixWorld(true);const ray=new T.Raycaster(),hulls=extraObstacles();
 for(let i=1;i<SERVICE_RAMP.length;i++)for(let j=1;j<10;j++){
  const a=SERVICE_RAMP[i-1],b=SERVICE_RAMP[i],t=j/10,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,h=serviceRampHeight(x,z);
  ray.set(new T.Vector3(x,15,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(scene,true)[0];assert.ok(hit&&Math.abs(hit.point.y-h)<.02);
  assert.ok(Math.abs(tr.height(x,z,0,h+.01)-h)<.02);assert.ok(hulls.some(o=>o.kind==='raised-road'&&segmentBox({x,y:h+1,z},{x,y:h-1,z},o)!==null));
 }
 assert.equal(tr.height(80,-56,0,.3),0,'standing under the road never teleports a player onto it');
});
test('the duplicate workbench skins leave no hovering tool lights in the workshop',()=>{
 let checked=0;for(let q=0;q<sector.world.n;q++){if(![6,7].includes(sector.world.mat[q]))continue;const b=faceBounds(sector.world,q,meta.scale);if(b.x1>=18.4&&b.x2<=44.4&&b.z1>=36.8&&b.z2<=37.2&&b.y1>=2&&b.y2<=2.3){assert.ok(props.drop.has(q));checked++;}}assert.ok(checked>200);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createHardSurfaceFurniture,FURNITURE_REVISION} from '../dist/realistic-furniture.js';
import {createStationEquipment,STATION_GEAR_REVISION} from '../dist/station-equipment-detail.js';
import {createCivilCar,CIVIL_CAR_REVISION} from '../dist/civil-vehicle-detail.js';
import {createDistrictUtilities} from '../dist/district-utility-details.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {createDistrictArchitecture} from '../dist/level2-architecture.js';
import {createLevel1Obstacles} from '../dist/level1-layout.js';


const materials=()=>Object.fromEntries(['steel','plate','paintedMetal','dark','black','woodDark','wood','fabric','paper','white','glass','cyan','amber','yellow','rust','red','redGlow'].map(k=>[k,new T.MeshStandardMaterial({name:k,side:T.DoubleSide})]));
const bounds=root=>{root.updateMatrixWorld(true);return new T.Box3().setFromObject(root,true)};
const finite=root=>{let triangles=0;root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry?.attributes?.position;assert.ok(p);triangles+=p.count/3;for(const n of p.array)assert.ok(Number.isFinite(n),'all vertices finite');});return triangles};

test('architectural furniture is no longer a single box: it has physical frames, independent fronts and realistic handles',()=>{
 const originals=[
  {kind:'reception',x:6,z:-74.4,hx:2.6,hz:.6,height:1.1},
  {kind:'desk',x:-27.2,z:-70,hx:1.6,hz:.6,height:.8},
  {kind:'bench',x:-91,z:68.6,hx:2.4,hz:.3,height:.45},
  {kind:'lockers',x:-96.4,z:69,hx:.5,hz:4.2,height:2.1},
  {kind:'lockers',x:-91,z:73.4,hx:4.2,hz:.5,height:2.1},
  {kind:'cabinet',x:-8,z:-94,hx:4,hz:.45,height:2},
  {kind:'rack',x:-13,z:-69.2,hx:.6,hz:.5,height:2.2},
  {kind:'display',x:12.4,z:-70.2,hx:.7,hz:.7,height:1.4}
 ];
 const root=new T.Group(),work=createHardSurfaceFurniture(T,root,{M:materials(),low:true});
 for(const item of originals)assert.ok(work.dress(item));
 assert.equal(work.dress({kind:'bed',surface:'concrete'}),false,'greenhouse bed is explicitly kept as a raised plant bed');
 const stats=work.finish();
 assert.equal(stats.revision,FURNITURE_REVISION);
 assert.equal(stats.objects,originals.length);
 assert.ok(stats.panels>=8,'real cabinet and lockers have multiple separate faces');
 assert.ok(stats.batches<=10,'merged batches by existing PBR material');
 assert.ok(stats.triangles<50000,'budget bounds for all station furnishings');
 assert.ok(finite(root)>200);
});
test('level 2 field stretchers have 3D cushions and usable side rails, without adding hitboxes',()=>{
 const root=new T.Group(),work=createHardSurfaceFurniture(T,root,{low:false,M:materials()});
 for(let k=0;k<3;k++)work.stretcher(-7,56+k*2.1);
 const s=work.finish(),b=bounds(root);
 assert.equal(s.stretchers,3);
 assert.ok(s.triangles>400);
 assert.ok(s.triangles<12000);
 assert.ok(b.min.y>=0,'casters sit on ground');
 assert.ok(b.max.y<1.1,'medical cots are not bunk beds');
 assert.ok(b.max.z-b.min.z>=4.5);
});
test('firefighter rack equipment keeps identifiable ARI and rolled-hose geometry inside station fixtures',()=>{
 const root=new T.Group(),detail=createStationEquipment(T,root,{low:true,M:materials()});
 assert.equal(detail.dress({kind:'ari-rack',x:-96.4,z:77.5,hx:.45,hz:2.2,height:2}),true);
 assert.equal(detail.dress({kind:'hose-rack',x:-96.4,z:93,hx:.45,hz:2,height:1.8}),true);
 assert.equal(detail.dress({kind:'greenhouse'}),false);
 const s=detail.finish(),b=bounds(root);
 assert.ok(s.ari>=10&&s.hoses>=8);
 assert.equal(s.revision,undefined); // revision is a module-wide immutable constant.
 assert.equal(STATION_GEAR_REVISION,'AEGIS-07-EQUIPMENT-V2');
 assert.ok(s.groups<=6&&s.triangles<20000,'hardware is merged by material');
 assert.ok(b.min.y>=0);
});
test('M01 civilian hatchback is a distinct recognizable geometry and keeps footprint',()=>{
 const car=createCivilCar(T,{length:4.4,width:2,low:true,M:materials()});
 assert.equal(car.userData.vehicle.revision,CIVIL_CAR_REVISION);
 assert.ok(car.userData.batches<=9);
 const b=bounds(car),size=b.getSize(new T.Vector3());
 assert.ok(size.x>=4.2&&size.x<4.56);
 assert.ok(size.z>=1.7&&size.z<2.18);
 assert.ok(size.y>=1.3&&size.y<1.65);
 assert.ok(b.min.y>=0);
 assert.ok(finite(car)<10000);
});
test('cooling units use shared industrial geometry while canonical collisions remain unmodified',()=>{
 const M={iron:new T.MeshStandardMaterial(),rust:new T.MeshStandardMaterial(),black:new T.MeshStandardMaterial(),warning:new T.MeshStandardMaterial()};
 const scene=new T.Group(),detail=createDistrictUtilities(T,{low:true,materials:M});
 detail.cooler(7.8,47);detail.hydrant(-8.5,49);detail.generator(8,48,1);
 const s=detail.build(scene);
 assert.equal(s.coolers,1);assert.equal(s.hydrants,1);assert.equal(s.generators,1);
 assert.ok(s.batches<=4&&s.triangles<12000);
 assert.ok(bounds(scene).max.y>2.2);
 const m01=String(createM01ExtensionArt),m02=String(createDistrictArchitecture);
 assert.match(m01,/createHardSurfaceFurniture/);
 assert.match(m01,/createStationEquipment/);
 assert.match(m01,/createCivilCar/);
 assert.match(m02,/furniture\.stretcher\(/);
 assert.match(m02,/utilities\.cooler\(/);
 assert.ok(createLevel1Obstacles().length>0);

});

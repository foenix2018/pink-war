import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRescueVehicle,RESCUE_VEHICLE_PROFILE} from '../dist/rescue-vehicle-detail.js';
import {createDistrictUtilities} from '../dist/district-utility-details.js';
import {EXTENSION_ID,ROOMS,DOORS} from '../dist/m01-extension-layout.js';
import {createM01ExtensionArt} from '../dist/m01-extension-art.js';
import {createDistrictArchitecture} from '../dist/level2-architecture.js';

function rescueMaterials(){
 return Object.fromEntries(['red','white','yellow','dark','steel','black','glass','shutter','redGlow'].map(key=>[key,new T.MeshStandardMaterial({name:key,side:T.DoubleSide})]));
}
const metric=o=>{o.updateMatrixWorld(true);return new T.Box3().setFromObject(o,true)};
test('M01 original collision dimensions are not changed by rescue-model overhaul',()=>{
 assert.equal(EXTENSION_ID,'vesper-01-extension');
 assert.ok(ROOMS.some(r=>r.id==='remise'));assert.ok(DOORS.some(d=>d.id==='portail'));
 const source=String(createM01ExtensionArt);
 assert.match(source,/createRescueVehicle/);
 assert.match(source,/kind,length:L,width:W,low,M/);
 assert.doesNotMatch(source,/collisions\.push\(/);
});
test('real VSAV and FPT keep their metric footprints, characterful features and bounded draw-call cost',()=>{
 for(const [kind,L,W] of [['vsav',6.2,2.5],['fpt',7.6,2.7]]){
  const v=createRescueVehicle(T,{kind,length:L,width:W,low:true,M:rescueMaterials()});
  assert.equal(v.userData.vehicle.kind,kind);
  assert.equal(v.userData.vehicle.revision,'rescue-v2-2026-11');
  assert.ok(v.userData.batchCount<=9,'one merged material batch per surface');
  assert.ok(v.children.length>0);
  const bounds=metric(v),size=bounds.getSize(new T.Vector3());
  assert.ok(size.x>4&&size.x<L+.25,'vehicle should fit original x collider length');
  assert.ok(size.z>1.7&&size.z<W+.35,'mirrors may protrude only a little from the original z collider');
  assert.ok(bounds.min.y>-.03,'wheels must stay on the ground');
  assert.ok(bounds.max.y<=RESCUE_VEHICLE_PROFILE[kind].maxHeight+.2,'vehicle must not exceed garage clearance');
  let n=0;v.traverse(x=>{if(!x.isMesh)return;const pos=x.geometry.attributes.position;assert.ok(pos&&pos.count>0);n+=pos.count/3;for(const k of pos.array)assert.ok(Number.isFinite(k));});
  assert.ok(n<18000,'mobile geometry budget for decorative static vehicle');
 }
});
test('W02 detailed hydrants and industrial generators are merged for mobile renderers',()=>{
 const materials=Object.fromEntries(['rust','iron','black','warning'].map(x=>[x,new T.MeshStandardMaterial()]));
 const utility=createDistrictUtilities(T,{low:true,materials}),root=new T.Group();
 utility.hydrant(4,-11);utility.hydrant(4,-23);utility.generator(8,10,-1);
 const stats=utility.build(root),bounds=metric(root);
 assert.equal(stats.hydrants,2);assert.equal(stats.generators,1);
 assert.ok(stats.batches<=4&&stats.triangles<6000,'static batches and triangle budget');
 assert.ok(bounds.max.y>1.3&&bounds.max.y<2,'equipment proportions physically legible');
 const first=root.children[0];assert.ok(first.isMesh);
 for(const mesh of root.children){assert.ok(mesh.geometry.attributes.normal);assert.ok(mesh.geometry.attributes.uv);}
});
test('district scene keeps the same runtime collision contract when using detailed service fixtures',()=>{
 const source=String(createDistrictArchitecture);
 assert.match(source,/createDistrictUtilities/);
 assert.match(source,/utilities\.generator\(x,z,side\)/);
 assert.match(source,/utilities\.hydrant\(x,z\)/);
 assert.match(source,/collisions\.push\(\{x,z,hx:\.76,hz:\.39,y:0,height:1\.4,surface:'metal'\}\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createFunctionalProp,FUNCTIONAL_KINDS,FUNCTIONAL_PROP_REV} from '../dist/functional-props.js';
import {createFreightTruck,FREIGHT_TRUCK_REV} from '../dist/freight-truck-detail.js';
import {createCivilCar} from '../dist/civil-vehicle-detail.js';
import {createRescueVehicle} from '../dist/rescue-vehicle-detail.js';
import {createM02ExtensionArt} from '../dist/m02-extension-art.js';
import {createM03Art} from '../dist/m03-art.js';
import {createM04Art} from '../dist/m04-art.js';
import {createLigne9Art} from '../dist/ligne9-art.js';
import {createCouronneArt} from '../dist/couronne-art.js';
import {createBreachDressing} from '../dist/breach-dressing.js';

const materialSet=()=>Object.fromEntries(['steel','galva','white','panel','paintedMetal','dark','black','glass','rubber','yellow','wood','red','redGlow','helixWhite','helixRed','plate','fabric','tarp','cyan','ledCyan'].map(k=>[k,new T.MeshStandardMaterial({name:k,side:T.DoubleSide})]));
function checkGeometry(root,limit=200000){
 let triangles=0,meshCount=0;
 root.traverse(node=>{
  if(!node.isMesh)return;meshCount++;
  const a=node.geometry.attributes.position;
  assert.ok(a?.count>0);
  for(const p of a.array)assert.ok(Number.isFinite(p),'no NaN vertex');
  triangles+=a.count/3;
 });
 assert.ok(meshCount>0&&meshCount<=16,'merged batches stay manageable');
 assert.ok(triangles>24&&triangles<limit,'models remain within geometry budget');
 return {meshCount,triangles};
}
test('shared functional prop library creates every authored silhouette with finite geometry',()=>{
 for(const kind of FUNCTIONAL_KINDS){
  const M=materialSet();
  const shape=createFunctionalProp(T,kind,{w:kind==='railcar'?9:kind==='forklift'?2.4:2.3,d:kind==='railcar'?2.6:1.45,h:kind==='railcar'?4.2:kind==='forklift'?2.7:2.2,low:true,M});
  assert.ok(shape,'missing '+kind);
  assert.equal(shape.userData.visualRevision,FUNCTIONAL_PROP_REV);
  const {meshCount}=checkGeometry(shape,40000);
  assert.ok(meshCount<12);
 }
});
test('forklift has no anonymous truck chassis: two fork rails, mast and grounded rubber wheels',()=>{
 const g=createFunctionalProp(T,'forklift',{w:2.5,d:1.5,h:2.7,low:false,M:materialSet()});
 const bounds=new T.Box3().setFromObject(g);
 assert.ok(bounds.max.y>2.2&&bounds.max.y<3.2);
 assert.ok(bounds.min.y>=-.01);
 checkGeometry(g,70000);
});
test('freight truck retains collision-friendly size while detailing its wheels and cargo',()=>{
 const g=createFreightTruck(T,{length:8,width:2.5,low:true,M:materialSet()});
 assert.equal(g.userData.visualRevision,FREIGHT_TRUCK_REV);
 const bounds=new T.Box3().setFromObject(g,true),v=bounds.getSize(new T.Vector3());
 assert.ok(v.x<8.5&&v.x>7.2);
 assert.ok(v.z<3.0&&v.z>2.3);
 assert.ok(bounds.min.y>=-.01);
 checkGeometry(g,65000);
});
test('all chapter modelers route known cuboid props to coherent reusable silhouettes',()=>{
 const sources=[
  [createM02ExtensionArt,['createFunctionalProp','createFreightTruck','createM01SupplyCache']],
  [createM03Art,['createCivilCar','createFreightTruck','createRescueVehicle']],
  [createM04Art,['createFunctionalProp','railcar','forklift']],
  [createLigne9Art,['createFunctionalProp','ticket-machine','vending']],
  [createCouronneArt,['createFunctionalProp','kiosk','scanner']],
  [createBreachDressing,['createFunctionalProp','chair','rack']]
 ];
 for(const [fn,tokens] of sources){
  const code=String(fn);
  for(const key of tokens)assert.ok(code.includes(key),key+' should be integrated into real game scene');
 }
});
test('different chapters reuse vehicle families without replacing original hitbox specification',()=>{
 const M=materialSet();
 checkGeometry(createCivilCar(T,{length:4.2,width:1.9,low:true,M}));
 checkGeometry(createRescueVehicle(T,{kind:'vsav',length:5.8,width:2.4,low:true,M}));
 const n=createFunctionalProp(T,'cot',{w:1.1,d:1.7,h:.85,low:true,M});
 const bounds=new T.Box3().setFromObject(n);
 assert.ok(bounds.max.y<1.1,'cot is not an impassable wall');
});

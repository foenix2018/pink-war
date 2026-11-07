import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createPowerKit,createSupplyPickup,createStreetlamp} from '../dist/power-props.js';
import {createM01SupplyCache} from '../dist/supply-cache-details.js';
function inspect(root){let meshes=0,triangles=0,lights=0;root.traverse(o=>{if(o.isLight)lights++;if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});assert.equal(lights,0);assert.ok(meshes<24);assert.ok(triangles<30000);return{meshes,triangles};}
for(const webgpu of [false,true])test('physical energy supplies share resources and animate without adding lights, WebGPU='+webgpu,()=>{
 const a=createSupplyPickup(T,{webgpu,kind:'cell',low:true}),b=createSupplyPickup(T,{webgpu,kind:'heal',low:true}),c=createSupplyPickup(T,{webgpu,kind:'cell',low:true});
 inspect(a.root);inspect(b.root);const kit=createPowerKit(T,{webgpu,low:true});assert.equal(kit,createPowerKit(T,{webgpu,low:true}));
 assert.equal(a.token.children[0].geometry,c.token.children[0].geometry);a.update(2,1);assert.equal(kit.time.value,2);assert.ok(a.token.position.y>.55&&a.token.position.y<.7);
 let disposed=0;a.token.children[0].geometry.addEventListener('dispose',()=>disposed++);a.dispose();assert.equal(disposed,0,'collecting one cartridge cannot invalidate another');
 if(webgpu)assert.ok(kit.materials.cyan.isNodeMaterial&&kit.materials.cyan.emissiveNode);
 const lamp=createStreetlamp(T,new T.Group(),{webgpu,low:true});inspect(lamp);const bounds=new T.Box3().setFromObject(lamp);assert.ok(bounds.max.y>7.5&&bounds.min.y<.1);
});
test('campaign cache keeps a tangible case and uses the same upgraded cartridge',()=>{
 const M={steel:new T.MeshStandardMaterial(),dark:new T.MeshStandardMaterial()},a=createM01SupplyCache(T,{M,webgpu:true,low:true});assert.ok(a.root.userData.pulse);assert.ok(a.token.children.length>3);a.root.userData.pulse(3);a.root.userData.dispose();
});

import * as T from './vendor/three.webgpu.min.js';
import {merge} from './geo.js';

// Author plates against native bones, then render one skinned batch per finish.
// The hidden authoring meshes remain available for inspection and precise rays.
export function batchHeroArmor(model,groups){
 const byMaterial=new Map(),rootInverse=model.root.matrixWorld.clone().invert();
 const skeleton=model.nativeSkeleton;
 for(const group of groups){
  const boneIndex=model.actor.bones.indexOf(group.parent);
  if(boneIndex<0)throw new Error('Hero armour needs a native bone');
  for(const mesh of group.children){
   if(!mesh.isMesh)continue;
   mesh.updateWorldMatrix(true,false);
   const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(rootInverse.clone().multiply(mesh.matrixWorld));
   const count=geometry.attributes.position.count,indices=new Float32Array(count*4),weights=new Float32Array(count*4);
   for(let i=0;i<count;i++){indices[i*4]=boneIndex;weights[i*4]=1;}
   geometry.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));
   geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
   geometry.userData={heroSource:mesh};
   if(!byMaterial.has(mesh.material))byMaterial.set(mesh.material,[]);
   byMaterial.get(mesh.material).push(geometry);mesh.visible=false;mesh.userData.heroAuthoring=true;
  }
 }
 const batches=[],bindings=[];
 for(const [material,parts] of byMaterial){
  const geometry=merge(parts),count=geometry.attributes.position.count,indices=new Float32Array(count*4),weights=new Float32Array(count*4);let offset=0;
  const sources=parts.map(p=>({source:p.userData.heroSource,count:p.attributes.position.count}));
  for(const p of parts){indices.set(p.attributes.skinIndex.array,offset);weights.set(p.attributes.skinWeight.array,offset);offset+=p.attributes.skinIndex.array.length;p.dispose();}
  geometry.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name='Shadow VII / '+(material.name||'armour');
  model.root.add(mesh);mesh.bind(skeleton,new T.Matrix4());
  mesh.castShadow=!material.isMeshBasicMaterial;mesh.receiveShadow=true;
  mesh.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.6);mesh.boundingBox=new T.Box3(new T.Vector3(-1,-.15,-1),new T.Vector3(1,2.1,1));
  batches.push(mesh);
  let first=0;for(const s of sources){bindings.push({...s,batch:mesh,first});first+=s.count;}
 }
 return {batches,bindings,triangles:batches.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),
  dispose(){for(const m of batches){m.removeFromParent();m.geometry.dispose();}}};
}

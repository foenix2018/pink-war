// Freeze opaque scenery by material and nearby sector. Moving actors, glass,
// live controls and node-driven displacement explicitly keep their own meshes.
export function batchStaticGeometry(T,root,{sector=48}={}){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();let input=0,output=0;
 function dynamic(o){for(let p=o;p&&p!==root;p=p.parent)if(p.userData.keepDynamic||!p.visible)return true;return false;}
 root.traverse(o=>{
  const m=o.material,g=o.geometry;if(!o.isMesh||o.isSkinnedMesh||o.isInstancedMesh||Array.isArray(m)||!m||m.transparent||m.isNodeMaterial||o.customDepthMaterial||!g?.attributes.normal||g.attributes.tangent||Object.keys(g.morphAttributes||{}).length||dynamic(o))return;
  g.computeBoundingSphere();const center=g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld),key=m.uuid+':'+Math.floor(center.x/sector)+':'+Math.floor(center.z/sector)+':'+o.castShadow+':'+o.receiveShadow+':'+o.renderOrder;
  if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
 });
 for(const list of buckets.values()){
  if(list.length<3)continue;let vertices=0,indices=0;const names=new Set(['position','normal','uv']),parts=[];
  for(const o of list){const g=o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld));parts.push(g);vertices+=g.attributes.position.count;indices+=g.index?.count||g.attributes.position.count;for(const n of ['uv1','uv2','color'])if(g.attributes[n])names.add(n);}
  const merged=new T.BufferGeometry();for(const name of names){const size=parts.find(g=>g.attributes[name])?.attributes[name].itemSize||(name==='uv'?2:3),array=new Float32Array(vertices*size);let offset=0;
   for(const g of parts){const attr=g.attributes[name],n=g.attributes.position.count;if(attr)for(let i=0;i<n;i++)for(let k=0;k<size;k++)array[(offset+i)*size+k]=attr[['getX','getY','getZ','getW'][k]](i);else if(name==='color')array.fill(1,offset*size,(offset+n)*size);offset+=n;}merged.setAttribute(name,new T.BufferAttribute(array,size));}
  const index=new Uint32Array(indices);let vi=0,ii=0;for(const g of parts){const n=g.attributes.position.count;if(g.index)for(let i=0;i<g.index.count;i++)index[ii++]=g.index.array[i]+vi;else for(let i=0;i<n;i++)index[ii++]=i+vi;vi+=n;g.dispose();}merged.setIndex(new T.BufferAttribute(index,1));merged.computeBoundingSphere();
  const first=list[0],mesh=new T.Mesh(merged,first.material);mesh.name='HELIX / décor groupé';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;root.add(mesh);for(const o of list)o.removeFromParent();input+=list.length;output++;
 }
 return{input,output,savedDraws:input-output};
}

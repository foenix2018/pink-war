import {inflateSync} from './vendor/fflate.module.js';

// CC0 Poly Haven meshes, reduced and rigidly baked at build time. The small
// local package is independent of the canonical heroes and weapon models.
export async function createM01Salvage(T,parent,{performance=false}={}){
 const root=new T.Group();root.name='W01 / matériel abandonné CC0';parent.add(root);
 const stats={loaded:0,instances:0,triangles:0,failed:0},colliders=[],textures=[],materials=[],geometries=[];
 const placements={crate:[[-5.2,0,69,.2],[-23.8,0,22.9,-.25]],bin:[[-12.2,0,27.3,.1],[14.2,0,44,-.4]]};
 const decode=(s,Type)=>{const str=atob(s),bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i);const raw=inflateSync(bytes);return new Type(raw.buffer,raw.byteOffset,raw.byteLength/Type.BYTES_PER_ELEMENT);};
 const loader=new T.TextureLoader(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 function map(file,color=false){
  const texture=loader.load('./assets/cc0/'+file);texture.flipY=false;texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;texture.anisotropy=performance?1:4;textures.push(texture);return texture;
 }
 try{
  const response=await fetch('./assets/cc0/m01-salvage.json',{signal:controller.signal});if(!response.ok)throw Error('Salvage HTTP '+response.status);
  const data=await response.json();
  for(const model of data.models){
   const template=new T.Group();
   for(const batch of model.batches){
    const vertices=decode(batch.vertices,Float32Array),indices=decode(batch.indices,Uint32Array),data=new T.InterleavedBuffer(vertices,8),g=new T.BufferGeometry();
    g.setAttribute('position',new T.InterleavedBufferAttribute(data,3,0));g.setAttribute('normal',new T.InterleavedBufferAttribute(data,3,3));g.setAttribute('uv',new T.InterleavedBufferAttribute(data,2,6));g.setIndex(new T.BufferAttribute(indices,1));g.computeBoundingSphere();geometries.push(g);
    const arm=map(batch.maps.arm),m=new T.MeshStandardMaterial({map:map(batch.maps.diff,true),roughnessMap:arm,metalnessMap:arm,aoMap:arm,roughness:1,metalness:1,aoMapIntensity:.65,normalMap:performance?null:map(batch.maps.normal)});
    m.name='Poly Haven / '+model.id;m.normalScale.set(.7,.7);materials.push(m);
    const mesh=new T.Mesh(g,m);mesh.castShadow=!performance;mesh.receiveShadow=true;template.add(mesh);
   }
   for(const [x,y,z,turn] of placements[model.id]||[]){
    const instance=template.clone();instance.position.set(x,y,z);instance.rotation.y=turn;root.add(instance);
    const [w,h,d]=model.size,cos=Math.abs(Math.cos(turn)),sin=Math.abs(Math.sin(turn));
    colliders.push({x,z,y,hx:(w*cos+d*sin)/2,hz:(d*cos+w*sin)/2,height:h,surface: model.id==='bin'?'metal':'wood',campaign:true,story:'cc0-'+model.id});
    stats.instances++;stats.triangles+=model.batches.reduce((s,b)=>s+b.triangles,0);
   }
   stats.loaded++;
  }
 }catch(error){stats.failed++;console.warn('Décor secondaire indisponible',error.message);}
 finally{clearTimeout(timer);}
 return {root,colliders,stats,dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}

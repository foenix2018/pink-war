import {parsePWM} from './blender-models.js';

export async function loadHideoutShowcase(T,{low=false}={}){
 const [meshResponse,materialResponse]=await Promise.all(['showcase.pwm.gz','showcase-materials.json'].map(name=>fetch(new URL('./assets/hideout/'+name,import.meta.url))));
 if(!meshResponse.ok||!materialResponse.ok)throw Error('Présentoirs indisponibles');
 const compressed=await meshResponse.arrayBuffer();let bytes;
 if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;
 else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 else{const {gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
 const definitions=await materialResponse.json(),loader=new T.ObjectLoader();
 const images=await loader.parseImagesAsync(definitions.images),textures=loader.parseTextures(definitions.textures,images);
 for(const texture of Object.values(textures))texture.anisotropy=low?2:4;
 const materials=loader.parseMaterials(definitions.materials,textures),parsed=parsePWM(T,bytes),root=new T.Group();root.name='Armes, tenues et compagnons officiels de Pink Wars';
 // The two mannequin suits are replaced by live Shadow Unit nano-forges.
 // PWM batches mix suits, guns and props by material, so discard only the
 // triangles inside the two original mannequin volumes.
 const mannequinSites=[[-8.9,4.45],[-6.4,4.45]];
 function removeMannequinFaces(geometry){
  const p=geometry.getAttribute('position'),index=geometry.getIndex();
  if(!p||!index)return;
  const keep=[];
  for(let i=0;i<index.count;i+=3){
   const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
   const x=(p.getX(a)+p.getX(b)+p.getX(c))/3;
   const y=(p.getY(a)+p.getY(b)+p.getY(c))/3;
   const z=(p.getZ(a)+p.getZ(b)+p.getZ(c))/3;
   const isOldSuit=y>.16&&y<3.30&&mannequinSites.some(([sx,sz])=>Math.abs(x-sx)<1.14&&Math.abs(z-sz)<1.70);
   if(!isOldSuit)keep.push(a,b,c);
  }
  if(keep.length!==index.count){
   geometry.setIndex(new T.BufferAttribute(new index.array.constructor(keep),1));
   geometry.computeBoundingSphere();
  }
 }
 for(const p of parsed.primitives){removeMannequinFaces(p.geometry);const m=materials[p.material];if(!m)throw Error('Finition de présentoir manquante');const mesh=new T.Mesh(p.geometry,m);mesh.castShadow=!m.transparent&&!m.isMeshBasicMaterial;mesh.receiveShadow=true;root.add(mesh);}
 const snapshot={...definitions.catalogue,source:definitions.source,batches:parsed.primitives.length,triangles:parsed.triangles,downloadBytes:compressed.byteLength,static:true};
 return{root,snapshot:()=>snapshot,dispose(){root.removeFromParent();for(const p of parsed.primitives)p.geometry.dispose();for(const m of Object.values(materials))m.dispose();for(const t of Object.values(textures))t.dispose();}};
}

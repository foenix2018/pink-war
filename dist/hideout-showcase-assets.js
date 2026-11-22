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
 for(const p of parsed.primitives){const m=materials[p.material];if(!m)throw Error('Finition de présentoir manquante');const mesh=new T.Mesh(p.geometry,m);mesh.castShadow=!m.transparent&&!m.isMeshBasicMaterial;mesh.receiveShadow=true;root.add(mesh);}
 const snapshot={...definitions.catalogue,source:definitions.source,batches:parsed.primitives.length,triangles:parsed.triangles,downloadBytes:compressed.byteLength,static:true};
 return{root,snapshot:()=>snapshot,dispose(){root.removeFromParent();for(const p of parsed.primitives)p.geometry.dispose();for(const m of Object.values(materials))m.dispose();for(const t of Object.values(textures))t.dispose();}};
}

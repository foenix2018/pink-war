import {parsePWM} from './blender-models.js';
import {readNanoProfile} from './nano-forge.js';
import {suitStage} from './armor-progression.js';

// Offline captures of the true animated rigs. No extra live rigs in the hideout.
export async function loadHideoutShowcase(T,{low=false,displayOutfits=true}={}){
 async function load(stem){
  const [meshResponse,materialResponse]=await Promise.all([stem+'.pwm.gz',stem+'-materials.json'].map(name=>fetch(new URL('./assets/hideout/'+name,import.meta.url))));
  if(!meshResponse.ok||!materialResponse.ok)throw Error('Présentoir indisponible : '+stem);
  const compressed=await meshResponse.arrayBuffer();let bytes;
  if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;
  else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  else{const{gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
  const definitions=await materialResponse.json(),loader=new T.ObjectLoader(),images=await loader.parseImagesAsync(definitions.images),textures=loader.parseTextures(definitions.textures,images);
  for(const texture of Object.values(textures))texture.anisotropy=low?2:4;
  const materials=loader.parseMaterials(definitions.materials,textures),parsed=parsePWM(T,bytes),root=new T.Group();
  for(const p of parsed.primitives){const m=materials[p.material];if(!m)throw Error('Finition de présentoir manquante');const mesh=new T.Mesh(p.geometry,m);mesh.castShadow=!m.transparent&&!m.isMeshBasicMaterial;mesh.receiveShadow=true;root.add(mesh);}
  const snapshot={...definitions.catalogue,source:definitions.source,batches:parsed.primitives.length,triangles:parsed.triangles,downloadBytes:compressed.byteLength,static:true};
  return{root,snapshot,dispose(){root.removeFromParent();for(const p of parsed.primitives)p.geometry.dispose();for(const m of Object.values(materials))m.dispose();for(const t of Object.values(textures))t.dispose();}};
 }
 const root=new T.Group();root.name='Présentoirs officiels · cinq tenues fabriquées';const common=await load('showcase');root.add(common.root);const outfits=new Map(),requests=new Map();let disposed=false;
 async function setArmorLevel(hero,stage){if(!displayOutfits)return;stage=suitStage(stage);const token=(requests.get(hero)||0)+1;requests.set(hero,token);if(outfits.get(hero)?.stage===stage)return;const p=await load('outfit-'+hero+'-'+stage);if(disposed||requests.get(hero)!==token){p.dispose();return;}outfits.get(hero)?.pack.dispose();root.add(p.root);outfits.set(hero,{stage,pack:p});}
 if(displayOutfits)await Promise.all(['ghju','lylu'].map(hero=>setArmorLevel(hero,readNanoProfile(hero).equippedSuit)));
 return{root,setArmorLevel,snapshot(){const entries=[...outfits.values()];return{...common.snapshot,outfits:entries.flatMap(e=>e.pack.snapshot.outfits),triangles:common.snapshot.triangles+entries.reduce((n,e)=>n+e.pack.snapshot.triangles,0),batches:common.snapshot.batches+entries.reduce((n,e)=>n+e.pack.snapshot.batches,0),downloadBytes:common.snapshot.downloadBytes+entries.reduce((n,e)=>n+e.pack.snapshot.downloadBytes,0),stages:5};},dispose(){disposed=true;common.dispose();for(const e of outfits.values())e.pack.dispose();root.removeFromParent();}};
}

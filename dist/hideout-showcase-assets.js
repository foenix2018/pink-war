import {parsePWM} from './blender-models.js';
import {extractDockCompanions,floatDockCompanions} from './hideout-dock-fx.js';
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
 const root=new T.Group();root.name='Présentoirs officiels · cinq tenues fabriquées';const common=await load('showcase');root.add(common.root);const floating=extractDockCompanions(T,common.root,common.snapshot.companions);alignWorkbenchWeapon(common.root,common.snapshot.weapons);const outfits=new Map(),requests=new Map();let disposed=false;
 async function setArmorLevel(hero,stage){if(!displayOutfits)return;stage=suitStage(stage);const token=(requests.get(hero)||0)+1;requests.set(hero,token);if(outfits.get(hero)?.stage===stage)return;const p=await load('outfit-'+hero+'-'+stage);if(disposed||requests.get(hero)!==token){p.dispose();return;}outfits.get(hero)?.pack.dispose();root.add(p.root);outfits.set(hero,{stage,pack:p});}
 if(displayOutfits)await Promise.all(['ghju','lylu'].map(hero=>setArmorLevel(hero,readNanoProfile(hero).equippedSuit)));
 return{root,setArmorLevel,update(time){floatDockCompanions(floating,time);},snapshot(){const entries=[...outfits.values()];return{...common.snapshot,companionFloat:floating.map(e=>({id:e.entry.id,y:e.group.position.y,triangles:e.triangles})),outfits:entries.flatMap(e=>e.pack.snapshot.outfits),triangles:common.snapshot.triangles+entries.reduce((n,e)=>n+e.pack.snapshot.triangles,0),batches:common.snapshot.batches+entries.reduce((n,e)=>n+e.pack.snapshot.batches,0),downloadBytes:common.snapshot.downloadBytes+entries.reduce((n,e)=>n+e.pack.snapshot.downloadBytes,0),stages:5};},dispose(){disposed=true;for(const e of floating)for(const m of e.group.children)m.geometry.dispose();common.dispose();for(const e of outfits.values())e.pack.dispose();root.removeFromParent();}};
}

// Keep the authentic VORTEX AR-7 at its canonical scale, on the lowered pad.
// The old baked showcase is intentionally preserved for every other weapon.
export function alignWorkbenchWeapon(root,weapons){
 const entry=weapons.find(w=>w.index===8);if(!entry)return;
 const old=entry.bounds,dy=.975-old.min[1],dz=-.95-(old.min[2]+old.max[2])/2;
 if(Math.abs(dy)<.001&&Math.abs(dz)<.001)return;
 let count=0;const epsilon=.002;
 for(const mesh of root.children){if(!mesh.isMesh)continue;const g=mesh.geometry,p=g.attributes.position,ids=g.index,selected=new Set();
  const contains=i=>p.getX(i)>=old.min[0]-epsilon&&p.getX(i)<=old.max[0]+epsilon&&p.getY(i)>=old.min[1]-epsilon&&p.getY(i)<=old.max[1]+epsilon&&p.getZ(i)>=old.min[2]-epsilon&&p.getZ(i)<=old.max[2]+epsilon;
  for(let j=0;j<ids.count;j+=3){const a=ids.getX(j),b=ids.getX(j+1),c=ids.getX(j+2);if(contains(a)&&contains(b)&&contains(c)){selected.add(a);selected.add(b);selected.add(c);count++;}}
  for(const i of selected)p.setXYZ(i,p.getX(i),p.getY(i)+dy,p.getZ(i)+dz);
  if(selected.size){p.needsUpdate=true;g.computeBoundingSphere();g.computeBoundingBox();}
 }
 if(count!==entry.triangles)throw Error('Workbench weapon geometry mismatch: '+count+'/'+entry.triangles);
 entry.bounds={min:[old.min[0],old.min[1]+dy,old.min[2]+dz],max:[old.max[0],old.max[1]+dy,old.max[2]+dz]};
}

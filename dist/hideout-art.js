import {parsePWM} from './blender-models.js';
export async function loadHideoutArt(T,{onProgress=()=>{},low=false}={}){
 const root=new T.Group();root.name='La Planque · modélisation Blender';onProgress(.08,'Géométrie du refuge');
 const [meshResponse,materialResponse,layoutResponse]=await Promise.all(['planque.pwm.gz','materials.json','layout.json'].map(f=>fetch(new URL('./assets/hideout/'+f,import.meta.url))));
 for(const response of [meshResponse,materialResponse,layoutResponse])if(!response.ok)throw Error('Ressource de la planque indisponible ('+response.status+')');
 const compressed=await meshResponse.arrayBuffer();let bytes;
 if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;
 else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 else{const {gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
 const [definitions,layout]=await Promise.all([materialResponse.json(),layoutResponse.json()]);onProgress(.45,'Surfaces, néons et mobilier');
 const parsed=parsePWM(T,bytes),materials=new Map(),textures=[],loader=new T.TextureLoader();
 const maps=new Map();
 for(const [name,m]of Object.entries(definitions)){
  const color=new T.Color(...m.color);let map=null;
  const mapName=m.panorama||m.texture;if(mapName){if(!maps.has(mapName)){const texture=await loader.loadAsync(new URL('./assets/'+(m.panorama?'hideout/':'cc0/')+mapName,import.meta.url).href);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=m.panorama?T.ClampToEdgeWrapping:T.RepeatWrapping;texture.anisotropy=2;maps.set(mapName,texture);textures.push(texture);}map=maps.get(mapName);}
  const material=m.panorama?new T.MeshBasicMaterial({map,color:0xffffff,toneMapped:false}):m.emissive>=2?new T.MeshBasicMaterial({color:color.multiplyScalar(1.7),toneMapped:false}):new T.MeshStandardMaterial({color,map,bumpMap:low?null:map,bumpScale:.015,metalness:m.metalness,roughness:m.roughness,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:m.alpha<1?T.DoubleSide:T.FrontSide,emissive:m.emissive?new T.Color(...m.color):0,emissiveIntensity:m.emissive||0});materials.set(name,material);
 }
 for(const p of parsed.primitives){const mesh=new T.Mesh(p.geometry,materials.get(p.material));mesh.name='Blender / '+p.material;mesh.castShadow=p.material!=='Verre'&&!definitions[p.material]?.emissive;mesh.receiveShadow=true;mesh.userData.interior=!!definitions[p.material]?.interior;mesh.visible=!mesh.userData.interior;root.add(mesh);}
 onProgress(.80,'Préparation de la planque');return{root,layout,materials,triangles:parsed.triangles,batches:parsed.primitives.length,downloadBytes:compressed.byteLength,source:'assets/hideout/PinkWars_Planque.blend',setInterior(value){for(const mesh of root.children)if(mesh.userData.interior)mesh.visible=!!value;},dispose(){root.removeFromParent();for(const p of parsed.primitives)p.geometry.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();}};
}

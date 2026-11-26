import {parsePWM} from './blender-models.js';
import {createHideoutEnhancements,diversifyHideoutScreens} from './hideout-enhancements.js';
import {extendAegisLayout,removeOriginalSideWalls,createAegisExpansion} from './hideout-aegis.js';
export async function loadHideoutArt(T,{onProgress=()=>{},low=false,displayOutfits=true}={}){
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
 async function texture(name,{space='hideout',color=false,scale=1,clamp=false}={}){
  const key=space+'/'+name+'/'+color+'/'+scale;
  if(!maps.has(key))maps.set(key,loader.loadAsync(new URL('./assets/'+space+'/'+name,import.meta.url).href).then(t=>{t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=clamp?T.ClampToEdgeWrapping:T.RepeatWrapping;t.repeat.set(scale,scale);t.anisotropy=low?2:4;textures.push(t);return t;}));
  return maps.get(key);
 }
 await Promise.all(Object.entries(definitions).map(async([name,m])=>{
  const color=new T.Color(...m.color),space=m.panorama||m.textureSpace==='hideout'?'hideout':'cc0',scale=m.uvScale||1;
  const map=m.panorama||m.texture?await texture(m.panorama||m.texture,{space,color:true,scale,clamp:!!m.panorama||m.localUV}):null;
  // On phones retain the weave/tread relief. Smooth metal and ceramic keep their
  // authored normals, colour and roughness without an extra normal-map shader.
  const detailNormal=m.normalMap&&(!low||/^(fabric|deck)-/.test(m.normalMap));
  const [normalMap,roughnessMap]=await Promise.all([detailNormal?texture(m.normalMap,{space,scale}):null,m.roughnessMap?texture(m.roughnessMap,{space,scale}):null]);
  const Kind=m.frost&&!low?T.MeshPhysicalMaterial:T.MeshStandardMaterial;
  const parameters={color:m.localUV?0xffffff:color,map,normalMap,normalScale:new T.Vector2(low?.35:.55,low?.35:.55),roughnessMap,bumpMap:!normalMap&&!low&&!m.localUV?map:null,bumpScale:.009,metalness:m.metalness,roughness:roughnessMap?1:m.roughness,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:m.alpha<1||m.doubleSided?T.DoubleSide:T.FrontSide,emissive:m.localUV?0xffffff:m.emissive?new T.Color(...m.color):0,emissiveMap:m.localUV?map:null,emissiveIntensity:m.localUV?.55:m.emissive||0};
  if(m.frost)Object.assign(parameters,{roughness:.64,metalness:0,emissive:new T.Color(.30,.40,.44),emissiveIntensity:.12});
  if(m.frost&&!low)Object.assign(parameters,{clearcoat:1,clearcoatRoughness:.16,specularIntensity:1.1,transmission:0,thickness:.042});
  const material=m.panorama?new T.MeshBasicMaterial({map,color:0xffffff,toneMapped:false}):m.emissive>=2?new T.MeshBasicMaterial({color:color.multiplyScalar(1.35),toneMapped:false}):new Kind(parameters);materials.set(name,material);
 }));
 for(const p of parsed.primitives){const mesh=new T.Mesh(p.geometry,materials.get(p.material));mesh.name='Blender / '+p.material;mesh.castShadow=p.material!=='Verre'&&!definitions[p.material]?.emissive;mesh.receiveShadow=true;mesh.userData.interior=!!definitions[p.material]?.interior;mesh.visible=!mesh.userData.interior;root.add(mesh);}
 const removedSideFaces=removeOriginalSideWalls(T,parsed.primitives);extendAegisLayout(layout);const aegis=createAegisExpansion(T,layout,materials,{low});root.add(aegis.root);
 const screenArt=layout.enhancementRevision&&parsed.primitives.find(p=>p.material==='Écran sombre');const screens=screenArt?diversifyHideoutScreens(T,screenArt.geometry,materials.get('Écran sombre')):null;if(screens)textures.push(screens.map);
 const extras=layout.enhancementRevision?createHideoutEnhancements(T,layout,materials,{low}):null;if(extras)root.add(extras.root);
 const contacts=addHideoutContacts(T,root,layout);onProgress(.80,'Armes et tenues originales');
 const [{loadHideoutShowcase},{createHideoutCity},{createHideoutDoors}]=await Promise.all([import('./hideout-showcase-assets.js'),import('./hideout-city.js'),import('./hideout-doors.js')]);
 const [showcase,city]=await Promise.all([loadHideoutShowcase(T,{low,displayOutfits,layout}),createHideoutCity(materials,{low})]);root.add(showcase.root);
 const doors=createHideoutDoors(layout,materials);root.add(doors.root);materials.get('Panorama Vesper').map=city.texture;materials.get('Panorama Vesper').needsUpdate=true;
 onProgress(.89,'Préparation de la planque');return{root,layout,materials,triangles:parsed.triangles,batches:parsed.primitives.length,downloadBytes:compressed.byteLength,source:'assets/hideout/PinkWars_Planque.blend',showcase:()=>showcase.snapshot(),updateEnhancements:t=>extras?.update(t),enhancements:()=>({...extras?.snapshot(),screenCount:screens?.count||0,aegis:{...aegis.snapshot(),removedSideFaces}}),setArmorLevel:showcase.setArmorLevel,doorColliders:doors.colliders,updateDoors:doors.update,doors:doors.snapshot,openDoor:doors.open,city:city.snapshot,renderExterior:city.render,windowTarget:city.target,surfaces:{normalMapped:[...materials.values()].filter(m=>m.normalMap).length,roughnessMapped:[...materials.values()].filter(m=>m.roughnessMap).length,contactDraws:1},setInterior(value){aegis.setInterior(value);for(const mesh of root.children)if(mesh.userData.interior)mesh.visible=!!value;},dispose(){root.removeFromParent();city.dispose();doors.dispose();showcase.dispose();extras?.dispose();aegis.dispose();contacts.dispose();for(const p of parsed.primitives)p.geometry.dispose();for(const m of materials.values())m.dispose();for(const t of textures)t.dispose();}};
}

// Static furniture grounding is one instanced draw, also visible on phones where
// real-time shadow maps are disabled. No depth passes or screen-space AO needed.
function addHideoutContacts(T,root,layout){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),g=c.createRadialGradient(64,64,12,64,64,63);g.addColorStop(0,'rgba(1,3,8,.8)');g.addColorStop(.48,'rgba(1,3,8,.48)');g.addColorStop(1,'rgba(1,3,8,0)');c.fillStyle=g;c.fillRect(0,0,128,128);
 const map=new T.CanvasTexture(canvas),geometry=new T.PlaneGeometry(1,1),material=new T.MeshBasicMaterial({map,transparent:true,opacity:.65,depthWrite:false,toneMapped:false});
 const footprints=[[-8.9,-8.5,2.3,3.7],[-6.4,-8.5,2.3,3.7],[0,-8,7.3,3.4],[-2.28,1,1.5,3.7],[2.28,1,1.5,3.7],[0,1,1.6,2.6],[6.25,-9.4,2.7,3],[8.65,-10.45,2.3,1.4],[10,-9.6,1.3,1.8],[5.3,-1.1,1.9,2.1],[9.3,-1.1,1.9,2.1],[7.7,1.2,1.6,1.6],[-2.15,7.3,2.8,2.8],[2.15,7.3,2.8,2.8],[-8.9,4.3,2.2,1.5],[-6.4,4.3,2.2,1.5]];
 if(layout.proportionsRevision){const sizes=[[1.65,2.7],[1.65,2.7],[4.9,2.35],[1.5,3.05],[1.5,3.05],[1.45,2.15],[1.65,1.9],[1.85,1.4],[1.0,1.4],[1.9,layout.proportionsRevision>=2?1.9:2.1],[1.9,layout.proportionsRevision>=2?1.9:2.1],[1.45,1.45],[2.15,2.15],[2.15,2.15]];sizes.forEach(([w,d],i)=>{footprints[i][2]=w;footprints[i][3]=d;});}
 for(const x of (layout.gymRevision?[-10,-8.4,-6.8]:[-10,-8.4,-6.8,6,7.6,9.2]))footprints.push([x,10,1.65,1.3]);
 if(layout.gymRevision)footprints.push([8.75,5.02,2.55,3.3],[10.03,7.65,1.05,3.0],[7.3,10.14,2.9,1.0],[10.1,10.55,1.05,1.2]);
 const mesh=new T.InstancedMesh(geometry,material,footprints.length),o=new T.Object3D();mesh.name='Ombres de contact du mobilier';mesh.renderOrder=1;
 footprints.forEach(([x,z,w,d],i)=>{o.position.set(x,.061,z);o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
 return{dispose(){mesh.dispose();geometry.dispose();material.dispose();map.dispose();}};
}

import {createHeroPartnerActor} from './hero-partner-actor.js';
import {createMapInfoPanel} from './world-info-panel.js';
import { createWorldEffects } from './webgpu-world-fx.js';
import { cascadeGeometry, createCascadeWater } from './water-detail.js';
import {createVesperAltitude} from './vesper-altitude.js';
import {parsePWM} from './blender-models.js';
import {createWorldRadiance} from './world-material-response.js';
import {createGardenFittings,gardenEquipment} from './m09-fittings.js';
import {createGardenControlDisplays} from './m09-control-displays.js';
import {gardenGeometrySectors} from './m09-geometry.js';
import {gardenAqueduct,gardenBasinMap} from './m09-water.js';
import {createElectricPortal,PORTAL_CLOSE_SECONDS} from './electric-portal.js';
import {DATA,INTERACTIONS,DOORS,STAGE_INDEX} from './m09-layout.js';

const scans={
 stone:{name:'concrete_wall_006',scale:.23},
 facade:{name:'concrete_wall_006',scale:.23},
 wetstone:{name:'concrete_wall_006',scale:.23},
 deck:{name:'anti_skid_tiles',scale:.24},
};

// The exported meshes are the Blender scene, in metres. Effects use native TSL
// on WebGPU; the same model remains available with ordinary materials on WebGL.
export function createM09Art(T,scene,{quality='normal',webgpu=false,onPortalClose=()=>{},characterId='ghju',reunion=false}={}){
 const low=quality==='low',root=new T.Group();root.name='N09 · Les Jardins suspendus · Blender';scene.add(root);
 const clock=T.TSL.uniform(0),materials=new Map(),devices=new Map(),portals=[],falls=[],waters=[],mist=[],beams=[];
 const ownedGeometry=new Set(),textures=new Set(),finePlants=[];
 let compiled=null,downloadBytes=0,janus=true,disposed=false,skyMap,equipment,geometrySectors=0;
 const meeting={stage:STAGE_INDEX.meeting,x:2.5,y:34,z:-22};
 const partner=reunion?createHeroPartnerActor(T,scene,{characterId,low,meeting}):null;
 const glow=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
 const sun=new T.DirectionalLight(0xffd5bd,2.35);sun.position.set(170,210,-150);scene.add(sun);
 const fill=new T.DirectionalLight(0xa3bdeb,.95);fill.position.set(-100,65,180);scene.add(fill);
 const ambient=new T.HemisphereLight(0xced6f0,0x46534c,1.32);scene.add(ambient);
 const loader=new T.TextureLoader(),base=new URL('./assets/m09/',import.meta.url);
 const radiance=createWorldRadiance(T,{cool:0xa7aed9,warm:0xfbc2aa,low});
 scene.background=new T.Color(0x716078);scene.fog=new T.FogExp2(0x82768e,.00115);
 scene.environment=radiance;scene.environmentIntensity=.8;
 const skyReady=loader.loadAsync(new URL('jardins-crepuscule.webp',base).href).then(texture=>{
  if(disposed){texture.dispose();return;}
  skyMap=texture;skyMap.colorSpace=T.SRGBColorSpace;skyMap.mapping=T.EquirectangularReflectionMapping;
  scene.background=skyMap;scene.backgroundRotation.y=-.66;
 }).catch(error=>console.warn('M09 / ciel crépusculaire',error));
 const coreLight=new T.PointLight(0xff4598,1900,67,2);coreLight.position.set(-8,59,-102);root.add(coreLight);
 if(!low){const light=new T.PointLight(0x5de7f1,700,55,2);light.position.set(92,52,-50);root.add(light);}
 const altitude=createVesperAltitude(T,root,{district:'gardens',low,webgpu,palette:{mist:0x82768e,horizon:0xa47794,basinEdge:0x302b3e}});

 function addMesh(g,m,p=[0,0,0],parent=root){const mesh=new T.Mesh(g,m);mesh.position.set(...p);parent.add(mesh);return mesh;}
 const fittings=createGardenFittings(T,root,DOORS[0],low);
 const displays=createGardenControlDisplays(T,root,{low});
 let gateTarget=0;
 const gateSigns=fittings.leaves.map(({group,side})=>{
  const panel=createMapInfoPanel(T,{title:side<0?'BIOTECH':'ACCÈS CONTRÔLÉ',subtitle:side<0?'JARDINS SUSPENDUS':'AUTORISATION ORDRE',sector:side<0?'VESPER / RECHERCHE VÉGÉTALE':'ORDRE / SÉCURITÉ',width:2.75,height:.72,low,style:'physical'});
  panel.position.set(0,-1.75,.209);group.add(panel);return panel;
 });

 const ringGeometry=new T.TorusGeometry(.65,.034,8,32);
 const beaconBase=new T.CylinderGeometry(.098,.12,.12,12),beaconLens=new T.CylinderGeometry(.074,.083,.105,12);
 const beaconHousing=new T.MeshStandardMaterial({color:0x38434c,metalness:.67,roughness:.45});
 for(const it of INTERACTIONS){
  const g=new T.Group();g.position.set(it.x,it.y,it.z);g.name='Objectif '+it.number;root.add(g);
  const ring=addMesh(ringGeometry,glow(0xff4e9f),[0,.062,0],g);ring.rotation.x=-Math.PI/2;
  const beaconX=(it.consoleOffset??2.6)+.37;
  addMesh(beaconBase,beaconHousing,[beaconX,1.86,-.29],g);
  const beacon=addMesh(beaconLens,glow(0xff6cb4),[beaconX,1.969,-.29],g);
  devices.set(it.id,{group:g,ring,beacon,done:false,available:false});
 }
 // A soft, layered volume gives waterfall spray a thickness, without a fullscreen fog pass.
 const foamCanvas=document.createElement('canvas');foamCanvas.width=foamCanvas.height=128;const fc=foamCanvas.getContext('2d'),fg=fc.createRadialGradient(64,64,2,64,64,63);fg.addColorStop(0,'rgba(220,247,241,.55)');fg.addColorStop(.45,'rgba(189,228,223,.2)');fg.addColorStop(1,'rgba(189,228,223,0)');fc.fillStyle=fg;fc.fillRect(0,0,128,128);const foamMap=new T.CanvasTexture(foamCanvas);
 const waterFX=createWorldEffects(T,{webgpu,low});
 const cascade=createCascadeWater(T,{webgpu,low,color:0xe1eddf});
 let seed=9;const random=()=>((seed=Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
 const fallsAt=[];
 for(const f of DATA.plan.waterfalls){
  const yaw=f.yaw||0,run=2.35+f.width*.019,bottomZ=f.z+Math.cos(yaw)*run,bottomX=f.x+Math.sin(yaw)*run;
  const mesh=addMesh(cascadeGeometry(T,{width:f.width,height:f.y-f.bottom,run,low}),cascade.material,[f.x,(f.y+f.bottom)/2,f.z]);
  mesh.rotation.y=yaw;mesh.name='Cascade · nappe courbe et courants filtrés';falls.push(mesh);
  fallsAt.push({x:bottomX,z:bottomZ,y:f.bottom,radius:f.width*.70,yaw});
  const count=low?2:4;
  for(let j=0;j<count;j++){
   const lateral=(j/(count-1)-.5)*f.width*.7,position=[bottomX+Math.cos(yaw)*lateral,f.bottom+1.3+random()*1.8,bottomZ-Math.sin(yaw)*lateral];
   const mat=new T.MeshBasicMaterial({map:foamMap,color:0xc8e6e1,transparent:true,opacity:.37,depthWrite:false,toneMapped:false});
   const mistMesh=addMesh(new T.PlaneGeometry(1,1),mat,position);
   mistMesh.scale.set(5.5+random()*5.8,3.2+random()*4.7,1);
   mist.push({mesh:mistMesh,base:mistMesh.position.clone(),phase:random()*6.28});
  }
 }
 for(const [i,p] of DATA.plan.pools.entries()){
  const hit=fallsAt.find(f=>Math.abs(f.y-p.y)<.3&&((f.x-p.x)/p.rx)**2+((f.z-p.z)/p.rz)**2<1.2);
  const deep=i<3?0x183e4b:0x24565d,shallow=0x709a8a;
  const material=waterFX.water({color:deep,shallowColor:shallow,skyColor:0xbca5c6,
    opacity:.95,flow:i<3?.96:.63,foam:hit,shore:p,refraction:false});
  const geometry=new T.RingGeometry(.0001,1,low?56:88,low?5:11);
  geometry.rotateX(-Math.PI/2);
  if(!webgpu){
   const map=gardenBasinMap(T,p,{deep,shallow,foam:hit});
   textures.add(map);material.map=map;material.color.setHex(0xffffff);
   material.normalMap.channel=1;
   const uv=geometry.attributes.uv.clone();
   for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*p.rx/8,uv.getY(j)*p.rz/8);
   geometry.setAttribute('uv1',uv);
  }
  const mesh=addMesh(geometry,material,[p.x,p.y+.036,p.z]);
  mesh.scale.set(p.rx,1,p.rz);mesh.name='Bassin · eau profonde et écume du déversoir';waters.push(mesh);
 }
 // The upper aqueduct feeds the first spillway, beyond the reservoir's natural lip.
 const upstream=DATA.plan.waterfalls[0],sourcePool=DATA.plan.pools.find(p=>p.y===upstream.y);
 const feedMat=waterFX.water({color:0x4c7e7b,skyColor:0xbca5c6,opacity:.95,flow:1.18,refraction:false});
 const feedGeo=gardenAqueduct(T,sourcePool,upstream,low);
 if(!webgpu)feedGeo.setAttribute('uv1',feedGeo.attributes.uv.clone());
 addMesh(feedGeo,feedMat,[upstream.x,upstream.y,upstream.z]).name='Canal du déversoir supérieur';
 const petals=new T.InstancedMesh(new T.PlaneGeometry(.19,.13),new T.MeshStandardMaterial({color:0xff8db6,roughness:.7,side:T.DoubleSide}),low?64:160);petals.name='Pétales dans le vent';petals.frustumCulled=false;root.add(petals);const petalRest=Array.from({length:petals.count},()=>({x:-8+(random()-.5)*52,y:47+random()*25,z:-102+(random()-.5)*52,phase:random()*20})),temp=new T.Object3D();
 const ready=(async()=>{
  const equipmentReady=compressedMesh(T,new URL('equipment.pwm.gz',base)).catch(error=>console.warn('M09 / finition des équipements',error));
  const [asset,matResponse]=await Promise.all([compressedMesh(T,new URL(low?'gardens-low.pwm.gz':'gardens.pwm.gz',base)),fetch(new URL('materials.json',base))]);
  if(!matResponse.ok)throw Error('Matériaux des Jardins indisponibles');
  compiled=asset;downloadBytes=asset.downloadBytes;
  for(const p of compiled.primitives)ownedGeometry.add(p.geometry);
  const defs=await matResponse.json(),cache=new Map();
  const texture=async(path,scale,color=false)=>{const key=path+'/'+scale+'/'+color;if(!cache.has(key))cache.set(key,loader.loadAsync(new URL('./assets/'+path,import.meta.url).href).then(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(scale);t.anisotropy=low?2:6;t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;textures.add(t);return t;}));return cache.get(key);};
  await Promise.all(Object.entries(defs).map(async([name,m])=>{
   const stem=/steel|bronze/.test(name)?'steel':null,scan=scans[name],scale=scan?.scale??m.uvScale??.45;
   const source=channel=>'ligne9/l9-'+scan.name+'_'+channel+'_512.jpg';
   const [map,normalMap,roughnessMap]=await Promise.all([
    scan?texture(source('diff'),scale,true):m.texture?texture((m.textureSpace||'cc0')+'/'+m.texture,scale,true):null,
    scan?(!low||name==='deck')&&texture(source('nor'),scale):m.normalTexture?texture('m09/'+m.normalTexture,scale):stem&&!low?texture('hideout/'+stem+'-normal.jpg',scale):null,
    scan?texture(source('rough'),scale):m.roughTexture?texture('m09/'+m.roughTexture,scale):stem?texture('hideout/'+stem+'-rough.jpg',scale):null,
   ]);
   const Kind=webgpu&&/^(leaf|blossom)/.test(name)?T.MeshStandardNodeMaterial:T.MeshStandardMaterial;
   const relief=name==='deck'?.19:name==='wetstone'?.25:.36;
   const params={color:new T.Color(...m.color),map,normalMap:normalMap||null,normalScale:new T.Vector2(relief,relief),roughnessMap,roughness:roughnessMap?1:m.roughness,metalness:name==='deck'?.21:m.metalness,alphaTest:m.alphaTest||0,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,forceSinglePass:true,side:m.alpha<1||m.doubleSided?T.DoubleSide:T.FrontSide};
   const material=m.emissive>=2?new T.MeshBasicMaterial({color:new T.Color(...m.color),transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:T.DoubleSide,toneMapped:false}):new Kind(params);
   if(m.emissive&&m.emissive<2){material.emissive=new T.Color(...m.color);material.emissiveIntensity=m.emissive;if(map)material.emissiveMap=map;}
   if(Kind===T.MeshStandardNodeMaterial){const {positionLocal,vec3,sin}=T.TSL;material.positionNode=positionLocal.add(vec3(sin(positionLocal.z.mul(.7).add(clock)).mul(.045),0,sin(positionLocal.x.mul(.5).add(clock.mul(.7))).mul(.035)));}
   materials.set(name,material);
  }));
  const steel=materials.get('steel');
  fittings.paint.map=steel.map;fittings.paint.roughnessMap=steel.roughnessMap;fittings.paint.needsUpdate=true;
  for(const p of compiled.primitives){
   const material=materials.get(p.material),smallStems=low&&p.material==='stem';
   const sectors=material.transparent?[p.geometry]:gardenGeometrySectors(T,p.geometry,smallStems?66:undefined);
   for(const geometry of sectors){
    ownedGeometry.add(geometry);
    const mesh=addMesh(geometry,material);mesh.name='Blender / '+p.material;
    mesh.castShadow=!smallStems&&!p.material.startsWith('glass')&&!/rose|cyan|warm|white/.test(p.material);mesh.receiveShadow=true;
    if(smallStems&&geometry.boundingBox)finePlants.push(mesh);
    geometrySectors++;
   }
  }
  const equipmentAsset=await equipmentReady;
  if(equipmentAsset){equipment=gardenEquipment(T,root,equipmentAsset,materials);equipment.setPowered(janus);}
  if(!reunion){
   // Authored actor placements belong to the map preview. The playable level
   // spawns the real, destructible S-19 via the common enemy factory instead.
   const droneAsset=await compressedMesh(T,new URL('surveillance.pwm.gz',base));
   for(const p of droneAsset.primitives){ownedGeometry.add(p.geometry);const mesh=addMesh(p.geometry,materials.get(p.material));mesh.name='Blender / drone de surveillance';}
   const Kind=webgpu?T.MeshBasicNodeMaterial:T.MeshBasicMaterial;
   const beamMaterial=new Kind({color:0xff245d,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
   if(webgpu)beamMaterial.opacityNode=T.TSL.uv().y.mul(.14);
   for(const pos of DATA.plan.drones){
    const origin=new T.Vector3(...pos),nearest=[...DATA.platforms].sort((a,b)=>Math.hypot(a.x-pos[0],a.z-pos[2])-Math.hypot(b.x-pos[0],b.z-pos[2]))[0];
    const dx=pos[0]-nearest.x,dz=pos[2]-nearest.z,ratio=Math.min(1,(nearest.r-3)/Math.max(.1,Math.hypot(dx,dz))),end=new T.Vector3(nearest.x+dx*ratio,nearest.y+.1,nearest.z+dz*ratio),h=origin.distanceTo(end);
    const mesh=addMesh(new T.ConeGeometry(3.5,h,24,1,true),beamMaterial);mesh.name='Volume du projecteur ORDRE';beams.push({mesh,origin,end,h});
   }
  }
  await Promise.all([skyReady,partner?.ready]);
 })();
 function openPortal(x,y,z,{charge=3.2,hold=2.2}={}){const fx=createElectricPortal(T,{height:3.6,low,webgpu,lights:!low});fx.group.position.set(x,y,z);root.add(fx.group);portals.push({fx,age:0,charge,hold,closing:false});}
 function update(t,dt,eye){
  altitude.update(t);clock.value=t;fittings.update(t,dt,gateTarget,eye);
  if(eye?.position)for(const mesh of finePlants){
   // The thin fern stalks are subpixel at this range in the mobile profile.
   // Keep the foliage cards and all larger branches visible at every distance.
   const {min,max}=mesh.geometry.boundingBox,{x,z}=eye.position;
   const dx=Math.max(min.x-x,0,x-max.x),dz=Math.max(min.z-z,0,z-max.z);
   mesh.visible=dx*dx+dz*dz<(mesh.visible?78:72)**2;
  }
  cascade.update(t);waterFX.update(t,eye?.position);coreLight.intensity=(janus?1900:690)*(1+Math.sin(t*1.7)*.035);
  for(const v of devices.values()){v.group.visible=v.available||v.done;v.ring.material.color.setHex(v.done?0x65e6ae:0xff4e9f);v.beacon.material.color.setHex(v.done?0x85e3b1:0xff6cb4);}
  for(const p of mist){p.mesh.position.copy(p.base);p.mesh.position.x+=Math.sin(t*.4+p.phase)*1.2;p.mesh.position.y+=Math.sin(t*.7+p.phase)*.6;if(eye?.quaternion)p.mesh.quaternion.copy(eye.quaternion);}
  for(const [i,b]of beams.entries()){const end=b.end.clone();end.x+=Math.sin(t*.28+i)*1.7;end.z+=Math.cos(t*.22+i)*1.7;const delta=b.origin.clone().sub(end);b.mesh.position.copy(b.origin).add(end).multiplyScalar(.5);b.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());b.mesh.scale.y=delta.length()/b.h;}
  for(let i=0;i<petals.count;i++){const p=petalRest[i],fall=(t*.65+p.phase)%20;temp.position.set(p.x+Math.sin(t*.3+p.phase)*2,p.y-fall,p.z+Math.cos(t*.2+p.phase)*2);temp.rotation.set(t+p.phase,p.phase+t*.2,t*.5);temp.updateMatrix();petals.setMatrixAt(i,temp.matrix);}petals.instanceMatrix.needsUpdate=true;
  partner?.update(t,dt,eye);
  for(let i=portals.length-1;i>=0;i--){const p=portals[i];p.age+=dt;const closingAge=p.age>p.charge+p.hold?p.age-p.charge-p.hold:null;if(closingAge!==null&&!p.closing){p.closing=true;onPortalClose(p.fx.group.position);}p.fx.update(t,{age:p.age,closingAge});if(eye?.position)p.fx.group.lookAt(eye.position.x,p.fx.group.position.y,eye.position.z);if(closingAge>=PORTAL_CLOSE_SECONDS&&closingAge!==null){p.fx.dispose();portals.splice(i,1);}}
 }
 return{root,sun,ready,partner,build(){},update,openPortal,setDoor(id,open){if(id==='access')gateTarget=open?1:0;},setLine(on){janus=on;equipment?.setPowered(on);displays.setState(janus,devices.get('control').done);},adapt(){},markDone(id,done=true){const d=devices.get(id);if(d)d.done=done;if(id==='control')displays.setState(janus,done);},setAvailable(ids){const set=new Set(ids);for(const [id,d]of devices)d.available=set.has(id);},
  stats:()=>({skyline:altitude.stats(),source:'assets/m09/PinkWars_N09_Jardins_Suspendus.blend',triangles:compiled?.triangles||0,batches:compiled?.primitives.length||0,downloadBytes,geometrySectors,duskSky:!!skyMap,equipment:equipment?.stats(),fittings:fittings.stats(),control:displays.stats(),waterfalls:falls.length,pools:waters.length,patrolDrones:beams.length,wind:webgpu,waterShader:webgpu?'TSL → WGSL':'material flow',reunionHero:partner?.hero||null,reunionVisible:!!partner?.visible,partner:partner?.stats()||null,portals:portals.length,physicalGateSigns:gateSigns.length}),
  dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();
   for(const p of gateSigns)p.userData.dispose?.();
   fittings.dispose();displays.dispose();equipment?.dispose();altitude.dispose();partner?.dispose();
   for(const p of portals)p.fx.dispose();
   for(const g of ownedGeometry)g.dispose();
   for(const m of materials.values())m.dispose();
   for(const texture of textures)texture.dispose();
   if(scene.background===skyMap)scene.background=null;
   if(scene.environment===radiance)scene.environment=null;
   sun.removeFromParent();fill.removeFromParent();ambient.removeFromParent();
   skyMap?.dispose();radiance.dispose();foamMap.dispose();cascade.dispose();waterFX.dispose();
   for(const m of [...falls,...waters])m.geometry.dispose();
   for(const p of mist){p.mesh.geometry.dispose();p.mesh.material.dispose();}
   for(const {ring,beacon}of devices.values()){ring.material.dispose();beacon.material.dispose();}
   for(const b of beams)b.mesh.geometry.dispose();
   beams[0]?.mesh.material.dispose();
   ringGeometry.dispose();beaconBase.dispose();beaconLens.dispose();beaconHousing.dispose();
   petals.dispose();petals.geometry.dispose();petals.material.dispose();feedGeo.dispose();
  }
 };
}

async function compressedMesh(T,url){
 const response=await fetch(url);if(!response.ok)throw Error('Modèle indisponible : '+url.pathname);const compressed=await response.arrayBuffer();let bytes;
 if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;
 else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 else{const {gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
 return {...parsePWM(T,bytes),downloadBytes:compressed.byteLength};
}

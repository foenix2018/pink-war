import { createWorldEffects } from './webgpu-world-fx.js';
import { cascadeGeometry, createCascadeWater } from './water-detail.js';
import {createVesperAltitude} from './vesper-altitude.js';
import {parsePWM} from './blender-models.js';
import {bevelBox} from './geo.js';
import {createElectricPortal,PORTAL_CLOSE_SECONDS} from './electric-portal.js';
import {DATA,INTERACTIONS,DOORS} from './m09-layout.js';

// The exported meshes are the Blender scene, in metres. Effects use native TSL
// on WebGPU; the same model remains available with ordinary materials on WebGL.
export function createM09Art(T,scene,{quality='normal',webgpu=false,onPortalClose=()=>{},characterId='ghju',reunion=false}={}){
 const low=quality==='low',root=new T.Group();root.name='N09 · Les Jardins suspendus · Blender';scene.add(root);
 const clock=T.TSL.uniform(0),materials=new Map(),devices=new Map(),portals=[],falls=[],waters=[],mist=[],beams=[];
 let compiled=null,downloadBytes=0,janus=true,npc=null,disposed=false;
 const glow=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
 const sun=new T.DirectionalLight(0xffd0a0,3.2);sun.position.set(170,210,-150);scene.add(sun);
 const fill=new T.DirectionalLight(0x9dbbe7,1.6);fill.position.set(-100,65,180);scene.add(fill);scene.add(new T.HemisphereLight(0xb7cfe3,0x4a3044,1.5));
 scene.fog=new T.FogExp2(0x77566d,.00052);
 const sky=document.createElement('canvas');sky.width=1024;sky.height=512;const ctx=sky.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
 for(const [at,c]of [[0,'#1b2443'],[.35,'#6e466a'],[.49,'#ed9971'],[.55,'#c7796f'],[.7,'#55405a'],[1,'#202c3c']])gradient.addColorStop(at,c);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);const skyMap=new T.CanvasTexture(sky);skyMap.colorSpace=T.SRGBColorSpace;skyMap.mapping=T.EquirectangularReflectionMapping;scene.background=skyMap;scene.environment=skyMap;scene.environmentIntensity=.7;
 const sunOrb=new T.Mesh(new T.SphereGeometry(6.5,32,16),glow(0xffbd69));sunOrb.position.set(100,55,-155);scene.add(sunOrb);
 const coreLight=new T.PointLight(0xff147e,2500,78,2);coreLight.position.set(-8,59,-102);root.add(coreLight);
 if(!low){const light=new T.PointLight(0x5de7f1,700,55,2);light.position.set(92,52,-50);root.add(light);}
 const altitude=createVesperAltitude(T,root,{district:'gardens',low,webgpu});

 function addMesh(g,m,p=[0,0,0],parent=root){const mesh=new T.Mesh(g,m);mesh.position.set(...p);parent.add(mesh);return mesh;}
 const gate=new T.Group();gate.name='Sas ORDRE · vantaux rétractables';root.add(gate);const d=DOORS[0];
 const gatePaint=new T.MeshStandardMaterial({color:0x27343c,metalness:.78,roughness:.38}),gateGlass=new T.MeshStandardMaterial({color:0x213a49,metalness:.4,roughness:.25});
 const gateLeaves=[-1,1].map(side=>{
  const group=new T.Group();group.position.set(d.x+side*2,d.y+4,d.z);gate.add(group);
  addMesh(bevelBox(3.94,8,.28,.12,2),gatePaint,[0,0,0],group);addMesh(bevelBox(3.3,3.5,.05,.08,2),gateGlass,[0,.4,.17],group);
  for(const x of [-1.7,1.7])addMesh(new T.CylinderGeometry(.055,.055,7.2,10),glow(0xff2788),[x,0,.21],group);
  return{group,side};
 });let gateOpen=0,gateTarget=0;
 for(const it of INTERACTIONS){
  const g=new T.Group();g.position.set(it.x,it.y,it.z);g.name='Objectif '+it.number;root.add(g);
  const ring=addMesh(new T.TorusGeometry(.65,.045,8,32),glow(0xff2488),[0,.08,0],g);ring.rotation.x=-Math.PI/2;
  const beacon=addMesh(new T.OctahedronGeometry(.12),glow(0xff6cb4),[it.consoleOffset??2.6,2.35,-.2],g);
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
  const material=waterFX.water({color:i<3?0x1c5359:0x245f60,shallowColor:0x649888,skyColor:0xc4a3ac,
    opacity:.92,flow:i<3?.96:.63,foam:hit});
  const geometry=new T.RingGeometry(.0001,1,low?56:88,low?5:11);
  geometry.rotateX(-Math.PI/2);
  if(!webgpu){
   const uv=geometry.attributes.uv;
   for(let j=0;j<uv.count;j++)uv.setXY(j,uv.getX(j)*p.rx/8,uv.getY(j)*p.rz/8);
  }
  const mesh=addMesh(geometry,material,[p.x,p.y+.036,p.z]);
  mesh.scale.set(p.rx,1,p.rz);mesh.name='Bassin · eau profonde et écume du déversoir';waters.push(mesh);
 }
 // The upper aqueduct feeds the first spillway, beyond the reservoir's natural lip.
 const upstream=DATA.plan.waterfalls[0],feedMat=waterFX.water({color:0x2d6b63,skyColor:0xc4a3ac,opacity:.93,flow:1.38});
 const feedGeo=new T.PlaneGeometry(upstream.width*.95,6.5,12,5).rotateX(-Math.PI/2), feedPos=feedGeo.attributes.position;
 for(let j=0;j<feedPos.count;j++)feedPos.setY(j,-.055-.06*(feedPos.getZ(j)/6.5+.5));
 feedGeo.computeVertexNormals();
 addMesh(feedGeo,feedMat,[upstream.x,upstream.y,upstream.z-3.24]).name='Canal du déversoir supérieur';
 const petals=new T.InstancedMesh(new T.PlaneGeometry(.19,.13),new T.MeshStandardMaterial({color:0xff8db6,roughness:.7,side:T.DoubleSide}),low?64:160);petals.name='Pétales dans le vent';petals.frustumCulled=false;root.add(petals);const petalRest=Array.from({length:petals.count},()=>({x:-8+(random()-.5)*52,y:47+random()*25,z:-102+(random()-.5)*52,phase:random()*20})),temp=new T.Object3D();
 const ready=(async()=>{
  const base=new URL('./assets/m09/',import.meta.url),[meshResponse,matResponse]=await Promise.all([fetch(new URL(low?'gardens-low.pwm.gz':'gardens.pwm.gz',base)),fetch(new URL('materials.json',base))]);
  if(!meshResponse.ok||!matResponse.ok)throw Error('Ressource des Jardins indisponible');const compressed=await meshResponse.arrayBuffer();downloadBytes=compressed.byteLength;
  let bytes;if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();else{const {gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
  compiled=parsePWM(T,bytes);const defs=await matResponse.json(),loader=new T.TextureLoader(),cache=new Map();
  const texture=async(path,scale,color=false)=>{const key=path+'/'+scale+'/'+color;if(!cache.has(key))cache.set(key,loader.loadAsync(new URL('./assets/'+path,import.meta.url).href).then(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(scale);t.anisotropy=low?2:6;t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;return t;}));return cache.get(key);};
  await Promise.all(Object.entries(defs).map(async([name,m])=>{
   const stem=/stone|facade/.test(name)?'concrete':name==='deck'?'deck':/steel|bronze/.test(name)?'steel':null,scale=m.uvScale??(name==='bark'?.32:stem==='concrete'?.16:.45);
   const [map,normalMap,roughnessMap]=await Promise.all([m.texture?texture((m.textureSpace||'cc0')+'/'+m.texture,scale,true):null,m.normalTexture?texture('m09/'+m.normalTexture,scale):stem&&(!low||name==='deck')?texture('hideout/'+stem+'-normal.jpg',scale):null,m.roughTexture?texture('m09/'+m.roughTexture,scale):stem?texture('hideout/'+stem+'-rough.jpg',scale):null]);
   const Kind=webgpu&&/^(leaf|blossom)/.test(name)?T.MeshStandardNodeMaterial:T.MeshStandardMaterial;
   const params={color:new T.Color(...m.color),map,normalMap,normalScale:new T.Vector2(...(name==='deck'?[.22,.22]:name==='wetstone'?[.25,.25]:[.36,.36])),roughnessMap,roughness:roughnessMap?1:m.roughness,metalness:m.metalness,alphaTest:m.alphaTest||0,transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,forceSinglePass:true,side:m.alpha<1||m.doubleSided?T.DoubleSide:T.FrontSide};
   const material=m.emissive>=2?new T.MeshBasicMaterial({color:new T.Color(...m.color),transparent:m.alpha<1,opacity:m.alpha,depthWrite:m.alpha>=1,side:T.DoubleSide,toneMapped:false}):new Kind(params);
   if(m.emissive&&m.emissive<2){material.emissive=new T.Color(...m.color);material.emissiveIntensity=m.emissive;if(map)material.emissiveMap=map;}
   if(Kind===T.MeshStandardNodeMaterial){const {positionLocal,vec3,sin}=T.TSL;material.positionNode=positionLocal.add(vec3(sin(positionLocal.z.mul(.7).add(clock)).mul(.045),0,sin(positionLocal.x.mul(.5).add(clock.mul(.7))).mul(.035)));}
   materials.set(name,material);
  }));
  for(const p of compiled.primitives){const mesh=addMesh(p.geometry,materials.get(p.material));mesh.name='Blender / '+p.material;mesh.castShadow=!p.material.startsWith('glass')&&!/rose|cyan|warm|white/.test(p.material);mesh.receiveShadow=true;}
  if(!reunion){
   // Authored actor placements belong to the map preview. The playable level
   // spawns the real, destructible S-19 via the common enemy factory instead.
   const droneAsset=await compressedMesh(T,new URL('surveillance.pwm.gz',base));
   for(const p of droneAsset.primitives){const mesh=addMesh(p.geometry,materials.get(p.material));mesh.name='Blender / drone de surveillance';}
   const Kind=webgpu?T.MeshBasicNodeMaterial:T.MeshBasicMaterial;
   const beamMaterial=new Kind({color:0xff245d,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
   if(webgpu)beamMaterial.opacityNode=T.TSL.uv().y.mul(.14);
   for(const pos of DATA.plan.drones){
    const origin=new T.Vector3(...pos),nearest=[...DATA.platforms].sort((a,b)=>Math.hypot(a.x-pos[0],a.z-pos[2])-Math.hypot(b.x-pos[0],b.z-pos[2]))[0];
    const dx=pos[0]-nearest.x,dz=pos[2]-nearest.z,ratio=Math.min(1,(nearest.r-3)/Math.max(.1,Math.hypot(dx,dz))),end=new T.Vector3(nearest.x+dx*ratio,nearest.y+.1,nearest.z+dz*ratio),h=origin.distanceTo(end);
    const mesh=addMesh(new T.ConeGeometry(3.5,h,24,1,true),beamMaterial);mesh.name='Volume du projecteur ORDRE';beams.push({mesh,origin,end,h});
   }
  }
  if(reunion){
   const {installPinkWarsSoldier}=await import('./level2-player.js'),{poseUnarmedForInspection}=await import('./rlh-firefighter.js'),{createGlove}=await import('./hands.js');
   const other=characterId==='ghju'?'lylu':'ghju',rig=await installPinkWarsSoldier(T,scene,other);await rig.model.shadowUnit.gear.ready;await rig.model.shadowUnit.suit.ready;
   const gloves=[createGlove(rig.kit.gloves,{mirror:true,sleeve:false,arm:false}),createGlove(rig.kit.gloves,{sleeve:false,arm:false})];rig.model.root.add(...gloves);rig.model.setLevel(9);poseUnarmedForInspection(rig.model,gloves);rig.model.root.visible=true;rig.model.root.position.set(2.5,34,-22);rig.model.root.rotation.y=Math.PI;npc=rig;
  }
 })();
 function openPortal(x,y,z,{charge=3.2,hold=2.2}={}){const fx=createElectricPortal(T,{height:3.6,low,webgpu,lights:!low});fx.group.position.set(x,y,z);root.add(fx.group);portals.push({fx,age:0,charge,hold,closing:false});}
 function update(t,dt,eye,player){
  altitude.update(t);clock.value=t;gateOpen+=(gateTarget-gateOpen)*(1-Math.exp(-dt*3));for(const {group,side}of gateLeaves)group.position.x=d.x+side*(2+gateOpen*4.2);
  cascade.update(t);waterFX.update(t,eye?.position);coreLight.intensity=(janus?2500:850)*(1+Math.sin(t*1.7)*.035);
  for(const v of devices.values()){v.group.visible=v.available||v.done;v.ring.material.color.set(v.done?0x65e6ae:0xff2488);v.beacon.position.y=2.35+Math.sin(t*1.9)*.08;v.beacon.rotation.y=t;}
  for(const p of mist){p.mesh.position.copy(p.base);p.mesh.position.x+=Math.sin(t*.4+p.phase)*1.2;p.mesh.position.y+=Math.sin(t*.7+p.phase)*.6;if(eye?.quaternion)p.mesh.quaternion.copy(eye.quaternion);}
  for(const [i,b]of beams.entries()){const end=b.end.clone();end.x+=Math.sin(t*.28+i)*1.7;end.z+=Math.cos(t*.22+i)*1.7;const delta=b.origin.clone().sub(end);b.mesh.position.copy(b.origin).add(end).multiplyScalar(.5);b.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());b.mesh.scale.y=delta.length()/b.h;}
  for(let i=0;i<petals.count;i++){const p=petalRest[i],fall=(t*.65+p.phase)%20;temp.position.set(p.x+Math.sin(t*.3+p.phase)*2,p.y-fall,p.z+Math.cos(t*.2+p.phase)*2);temp.rotation.set(t+p.phase,p.phase+t*.2,t*.5);temp.updateMatrix();petals.setMatrixAt(i,temp.matrix);}petals.instanceMatrix.needsUpdate=true;
  if(npc&&player)npc.model.root.visible=Math.hypot(player.x-2.5,player.z+22)<55;
  npc?.model.shadowUnit.cape.update(t,'idle',.4);npc?.model.shadowUnit.tabard.update(t,'idle',.4);
  for(let i=portals.length-1;i>=0;i--){const p=portals[i];p.age+=dt;const closingAge=p.age>p.charge+p.hold?p.age-p.charge-p.hold:null;if(closingAge!==null&&!p.closing){p.closing=true;onPortalClose(p.fx.group.position);}p.fx.update(t,{age:p.age,closingAge});if(eye?.position)p.fx.group.lookAt(eye.position.x,p.fx.group.position.y,eye.position.z);if(closingAge>=PORTAL_CLOSE_SECONDS&&closingAge!==null){p.fx.dispose();portals.splice(i,1);}}
 }
 return{root,sun,ready,build(){},update,openPortal,setDoor(id,open){if(id==='access')gateTarget=open?1:0;},setLine:on=>{janus=on;},adapt(){},markDone(id,done=true){const d=devices.get(id);if(d)d.done=done;},setAvailable(ids){const set=new Set(ids);for(const [id,d]of devices)d.available=set.has(id);},
  stats:()=>({skyline:altitude.stats(),source:'assets/m09/PinkWars_N09_Jardins_Suspendus.blend',triangles:compiled?.triangles||0,batches:compiled?.primitives.length||0,downloadBytes,waterfalls:falls.length,pools:waters.length,patrolDrones:beams.length,wind:webgpu,waterShader:webgpu?'TSL → WGSL':'material flow',reunionHero:npc?characterId==='ghju'?'lylu':'ghju':null,reunionVisible:!!npc?.model.root.visible,portals:portals.length}),
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();altitude.dispose();npc?.dispose();for(const p of portals)p.fx.dispose();for(const p of compiled?.primitives||[])p.geometry.dispose();for(const m of materials.values())m.dispose();skyMap.dispose();foamMap.dispose();cascade.dispose();waterFX.dispose();for(const m of [...falls,...waters])m.geometry.dispose();for(const p of mist){p.mesh.geometry.dispose();p.mesh.material.dispose();}feedGeo.dispose();}
 };
}

async function compressedMesh(T,url){
 const response=await fetch(url);if(!response.ok)throw Error('Modèle des surveillants indisponible');const compressed=await response.arrayBuffer();let bytes;
 if(String.fromCharCode(...new Uint8Array(compressed,0,4))==='PWM1')bytes=compressed;
 else if(typeof DecompressionStream!=='undefined')bytes=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 else{const {gunzipSync}=await import('./vendor/fflate.module.js');const raw=gunzipSync(new Uint8Array(compressed));bytes=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);}
 return parsePWM(T,bytes);
}

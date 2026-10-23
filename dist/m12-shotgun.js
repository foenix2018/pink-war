import * as T from './vendor/three.webgpu.min.js';
import {parseKenneyGLB} from './kenney-blasters.js';
import {equipmentSurfaces} from './equipment-surfaces.js';
import {M12_GLB} from './assets/pink-war/m12-model-data.js';

export const M12_FRAME=Object.freeze({id:'m12',muzzle:Object.freeze([0,.124,-.668]),support:Object.freeze([-.036,.016,-.435]),length:.99});
export const M12_HOLD=Object.freeze({palm:Object.freeze([.026,0,0]),rake:-.20,support:M12_FRAME.support});
const cache=new Map();let maps;
function surfaces(){
 if(maps)return maps;const equipment=equipmentSurfaces();maps={...equipment};
 if(typeof document!=='undefined'){
  const loader=new T.TextureLoader();
  for(const [key,file]of [['paint','m12-camouflage.webp'],['finish','m12-roughness.webp']]){
   const t=loader.load(new URL('./assets/pink-war/'+file,import.meta.url).href);t.flipY=false;t.anisotropy=4;
   if(key==='paint')t.colorSpace=T.SRGBColorSpace;maps[key]=t;
  }
 }
 return maps;
}
export function createM12Shotgun(environment=null){
 const key=environment||null;
 if(!cache.has(key)){
  const maps=surfaces(),materials=new Map();
  const material=name=>{
   if(materials.has(name))return materials.get(name);const kind=name?.replace('PW_M12_','');
   const p=kind==='paint'?{color:maps.paint?0xffffff:0x36393d,map:maps.paint||null,roughnessMap:maps.finish||maps.rough,metalness:.60,roughness:.61,clearcoat:.24,clearcoatRoughness:.38}:
    kind==='rubber'?{color:0x151719,metalness:.1,roughness:.85,map:maps.metal,roughnessMap:maps.rough}:
    kind==='silver'?{color:0x92979c,metalness:.90,roughness:.36,map:maps.metal,roughnessMap:maps.rough}:
    kind==='bead'?{color:0xb2b8bd,metalness:.4,roughness:.35}:
    kind==='detail'?{color:0x2d3136,metalness:.66,roughness:.54,map:maps.metal,roughnessMap:maps.rough}:
    {color:0x535a61,metalness:.87,roughness:.40,map:maps.metal,roughnessMap:maps.rough};
   const m=new T.MeshPhysicalMaterial({...p,envMap:environment,envMapIntensity:.55,bumpMap:kind==='paint'?maps.finish||maps.rough:maps.rough,bumpScale:kind==='paint'?.00003:.00008});m.name=name;materials.set(name,m);return m;
  };
  const bytes=Uint8Array.from(atob(M12_GLB),c=>c.charCodeAt(0));
  const master=parseKenneyGLB(bytes.buffer,material);master.name='M-12 / LYLU reference shotgun';
  Object.assign(master.userData,{frame:M12_FRAME,muzzle:[...M12_FRAME.muzzle],integratedEmitter:true,authored:true,designRevision:'3.53'});
  cache.set(key,master);
 }
 const model=cache.get(key).clone(true),pump=model.getObjectByName('M12 pump'),shells=new T.Group();
 shells.name='M12 reload shell';shells.visible=false;model.add(shells);
 // Cartridges only appear during insertion; no floating ammo display on the gun.
 const shellMaterial=new T.MeshStandardMaterial({color:0x687078,roughness:.42,metalness:.65,envMap:environment});
 const cartridge=new T.Mesh(new T.CylinderGeometry(.008,.008,.052,12),shellMaterial);cartridge.rotation.x=Math.PI/2;shells.add(cartridge);
 let cycle=Infinity,lastTime=0,shotLatch=false;
 function animate(state={},dt=0){
  // Shared simulation/recoil events reach FPS, third-person and tracked hands.
  const impulse=Math.max(state.impulse||0,(state.kick||0)*7),shot=impulse>.06;
  if(shot&&!shotLatch)cycle=0;shotLatch=shot;
  if(state.time!==undefined){dt=Math.max(0,Math.min(.1,state.time-lastTime));lastTime=state.time;}
  cycle+=Math.max(0,Math.min(.1,dt));
  const back=cycle<.15?0:cycle<.34?(cycle-.15)/.19:cycle<.43?1:cycle<.64?1-(cycle-.43)/.21:0;
  if(pump)pump.position.z=Math.max(0,back)*.095;
  const reload=state.reloading?state.reloadProgress||0:0;shells.visible=!!state.reloading&&reload>.12&&reload<.9;
  shells.position.set(-.055*(1-reload),reload*.052,-.15);shells.rotation.z=-(1-reload)*.6;
  model.userData.pumpOffset=Math.max(0,back)*.095;
 }
 model.userData.resetAnimation=()=>{cycle=Infinity;lastTime=0;shotLatch=false;if(pump)pump.position.z=0;shells.visible=false;model.userData.pumpOffset=0;};
 model.userData.animate=animate;model.userData.dispose=()=>{cartridge.geometry.dispose();shellMaterial.dispose();};
 return model;
}

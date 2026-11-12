// Actual RLH CMIA ambulance and CCRM Gallin; see docs/vehicules-rlh.md.
import {createAmbulance} from './rlh/ambulance-model.js';
import {createCCRM} from './rlh/ccrm-desautel-v942.js';
import {Assembly} from './geo.js';
export const RESCUE_VEHICLE_PROFILE=Object.freeze({
 vsav:Object.freeze({type:'CMIA',name:'AMBULANCE CMIA',role:'rescue',maxHeight:3.65}),
 fpt:Object.freeze({type:'CCRM',name:'CCRM GALLIN',role:'fire-engine',maxHeight:3.4})
});
function wornPaint(T,material,seed,burnt){
 const size=256,data=new Uint8Array(size*size*4),rough=new Uint8Array(data.length);
 let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,n=random(),scratch=((x*13+y*7)%113<2&&n>.32),chip=n>.994;
  const dust=.89+random()*.10-(y/size)*.06,v=burnt?.18+random()*.14:chip?.34:scratch?.55:dust;
  data.set([255*v,251*v,244*v,255],i);rough.set([200,chip?250:170+random()*65,200,255],i);
 }
 const texture=pixels=>{const t=new T.DataTexture(pixels,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,2);t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;};
 material.map=texture(data);material.map.colorSpace=T.SRGBColorSpace;material.roughnessMap=texture(rough);material.roughness=.86;
 if('clearcoat'in material){material.clearcoat=.14;material.clearcoatRoughness=.7;}
 material.userData.paintWear=true;material.needsUpdate=true;
}
// Merge the closed ambulance body by material, keeping wheels separately animated.
// Source geometries are shared in RLH's bevel cache and must never be disposed here.
function batchClosedBody(T,parent){
 parent.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert(),a=new Assembly(),old=[];
 parent.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!Array.isArray(o.material)){a.add(o.geometry,o.material,new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),false);old.push(o);}});
 for(const o of old)o.removeFromParent();a.build(parent,{name:'RLH / carrosserie fermée'});
 for(const i of a.items)i.geometry.dispose();
}
export function createRescueVehicle(T,{kind,length,width,low=false,burnt=false}={}){
 kind=kind==='ambulance'?'vsav':kind;const info=RESCUE_VEHICLE_PROFILE[kind];
 if(!info)throw Error('Unknown rescue vehicle '+kind);
 if(!(length>4&&width>1.5))throw Error('Invalid rescue vehicle envelope');
 const model=kind==='vsav'?createAmbulance({THREE:T}):createCCRM({THREE:T,fusion:true,poste:false});
 const body=model.rig||model.root;
 const painted=new Set();
 if(kind==='vsav'){
  const colors=new Set([0xe9eef1,0x0062a5,0xdce719,0xc31b24]);body.traverse(o=>{if(o.isMesh&&colors.has(o.material?.color?.getHex()))painted.add(o.material);});
  batchClosedBody(T,model.car);
  for(const wheel of model.wheels)batchClosedBody(T,wheel.roll);
 }else {for(const key of ['rouge','jaune','blanc','bandeJaune'])if(model.materials[key])painted.add(model.materials[key]);batchClosedBody(T,body);}
 let seed=831;for(const mat of painted)wornPaint(T,mat,seed++,burnt);
 body.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(body),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const scale=Math.min(length/size.x,width/size.z);const fit=new T.Group();fit.add(body);body.position.set(-center.x,-bounds.min.y,-center.z);fit.scale.setScalar(scale);
 const g=new T.Group();g.name=info.name+' / RLH · peinture usée';g.add(fit);
 g.userData.vehicle={kind,length,width,height:size.y*scale,role:info.role,revision:'RLH-original-worn-v1',source:kind==='vsav'?'RLH CMIA ambulance-model':'RLH CCRM Gallin V942',sourceCommit:'566da00',uniformScale:scale,paintWear:true};
 let wheelSpin=0;g.userData.updateVehicle=(dt,state={})=>{wheelSpin-=(state.speed||0)*dt/.48;model.update?.(dt,{...state,wheelSpin});};
 return g;
}

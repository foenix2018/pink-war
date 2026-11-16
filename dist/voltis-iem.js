import {createVoltisIEM} from './voltis-iem-model.js';
export const IEM_INDEX=9;
export const IEM_RULES=Object.freeze({id:'iem',name:'VOLTIS IEM',level:10,damage:8,stunSeconds:3,interval:1.3});
export const IEM_FRAME=Object.freeze({id:'iem',muzzle:Object.freeze([0,.13072,-.75488]),support:Object.freeze([0,.025,-.33]),length:1.235});
export const IEM_HOLD=Object.freeze({palm:Object.freeze([0,0,0]),support:IEM_FRAME.support,rake:0});
export const iemAvailable=(mode='arena',chapter=1)=>mode==='arena'||mode==='training'||mode==='campaign'&&Number.isFinite(Number(chapter))&&Number(chapter)>=IEM_RULES.level;
const prototypes=new WeakMap();
export function createIEMWeapon(T){
 let prototype=prototypes.get(T);
 if(!prototype){
  const asset=createVoltisIEM(T,{gpu:false});prototype=asset.root;
  // The accepted long prototype is authored along +X. In game, the palm is
  // the origin and the bore points down -Z, in the same frame as every gun.
  const transform=new T.Matrix4().makeRotationY(Math.PI/2).multiply(new T.Matrix4().makeScale(.4,.4,.4)).multiply(new T.Matrix4().makeTranslation(.12,-.004,0));
  for(const mesh of prototype.children){mesh.geometry.applyMatrix4(transform);mesh.geometry.computeBoundingSphere();}
  prototype.userData.assetStats=asset.stats();prototypes.set(T,prototype);
 }
 const root=prototype.clone();root.name=IEM_RULES.name;
 const glow=[];
 root.traverse(mesh=>{if(mesh.isMesh&&mesh.material.emissive?.getHex()===0x42ddff){mesh.material=mesh.material.clone();glow.push(mesh.material);}});
 Object.assign(root.userData,{frame:IEM_FRAME,muzzle:IEM_FRAME.muzzle,integratedEmitter:true,authoredOptic:true,iem:true,
  updatePulse(value=0){for(const m of glow)m.emissiveIntensity=.18+Math.min(1,Math.max(0,value))*5;}});
 return root;
}

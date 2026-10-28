import * as THREE from './vendor/three.webgpu.min.js';
import {GLTFExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/GLTFExporter.js';
import {USDZExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/USDZExporter.js';
import {GLTFLoader} from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const mat=(c,metal=.55)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:.38});
async function authentic(name){
 const {characterForId}=await import('./characters.js');
 if(name==='GABY'||name==='CARA'){const {createAICompanion}=await import('./ai-companions.js');const scene=new THREE.Scene();const actor=createAICompanion(THREE,scene,name==='GABY'?'ghju':'lylu');return actor?.root||scene.children.find(x=>x.isGroup)}
 if(name==='RECO1'){const {createReco1}=await import('./reco1.js');return createReco1();}
 if(name==='ROBOT LOURD'){const {createEnemyFactory}=await import('./enemies.js');const factory=createEnemyFactory({monster:mat(0x424c59)});return factory.create(false,true,'bulwark')}
 if(name==='GHJU'||name==='LYLU'){
 const {createCharacterKit,createSoldier}=await import('./soldier.js');
 const {buildGun}=await import('./weapons.js');
 const {createSurfaceDetails}=await import('./surfaces.js');
 const profile=characterForId(name.toLowerCase()),kit=createCharacterKit(new THREE.Texture(),createSurfaceDetails());kit.setPalette(profile.armor);
 const palette={steel:mat(profile.armor.steel),dark:mat(profile.armor.dark),armor:mat(profile.armor.rose),armorLight:mat(profile.armor.pearl)};
 const soldier=createSoldier(kit,()=>buildGun({mats:palette,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const o=new THREE.Object3D();p.add(o);return o}}),profile);
 return soldier.root;
 }
 if(['VX-9','NEXUS V9','ARES X9','THORN','NOVA','M–12','VORTEX AR-7'].includes(name)){
 const {createWeaponModels}=await import('./weapons.js');
 const palette={steel:mat(0x9ca2ad),dark:mat(0x171b24),armor:mat(0xdf428f),armorLight:mat(0xe7b9d2)};
 const models=createWeaponModels(palette);
 return models[({'VX-9':0,'NEXUS V9':1,'ARES X9':2,'THORN':3,'NOVA':4,'M–12':6,'VORTEX AR-7':8})[name]];
 }
 throw new Error('Modèle original introuvable.');
}

const loader=new GLTFLoader(),gltfExporter=new GLTFExporter(),usdzExporter=new USDZExporter();
function prepareForExport(root){
 if(!root?.traverse)throw new Error('Le moteur n’a retourné aucun objet 3D.');
 root.updateMatrixWorld(true);
 let count=0;
 root.traverse(item=>{
  if(!item.isMesh&&!item.isSkinnedMesh)return;
  if(!item.geometry?.attributes?.position){item.visible=false;return;}
  if(!item.material){
    item.material=new THREE.MeshStandardMaterial({color:0x777d88,metalness:.4,roughness:.6});
  }else if(Array.isArray(item.material)){
    item.material=item.material.map(m=>m||new THREE.MeshStandardMaterial({color:0x777d88}));
  }
  if(item.isSkinnedMesh&&item.skeleton){item.skeleton.update();}
  count++;
 });
 if(!count)throw new Error('Aucun maillage exploitable dans ce modèle.');
 return root;
}
let last=null;function revoke(){if(last){for(const u of last)URL.revokeObjectURL(u)}last=[]}
window.galleryBuild=async(name)=>{
 const viewer=document.getElementById('viewer'),model=document.getElementById('model'),message=document.getElementById('viewer-message'),ar=document.getElementById('ar-launch');
 revoke();model.removeAttribute('ios-src');model.removeAttribute('src');ar.disabled=true;message.textContent='Préparation du modèle 3D et de la réalité augmentée…';
 let scene;const existing=null;
 try{
 if(existing){scene=(await loader.loadAsync(existing)).scene}else{scene=prepareForExport(await authentic(name));const buffer=await gltfExporter.parseAsync(scene,{binary:true,onlyVisible:true});const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));last.push(url);model.src=url}
 if(existing)model.src=existing;
 try{const usd=await usdzExporter.parseAsync(scene,{maxTextureSize:1024});const url=URL.createObjectURL(new Blob([usd],{type:'model/vnd.usdz+zip'}));last.push(url);model.setAttribute('ios-src',url);}catch(exportError){console.warn('USDZ export unavailable',exportError)}
 ar.disabled=!model.canActivateAR && !model.hasAttribute('ios-src');message.textContent=existing?'Modèle 3D du dépôt · AR iPhone (USDZ) / WebXR si pris en charge.':'Modèle issu des fonctions 3D du moteur du jeu. AR iPhone / WebXR si pris en charge.';
 }catch(e){message.textContent='Erreur de préparation 3D : '+String(e.message||e);ar.disabled=true}
};

import * as THREE from 'https://esm.sh/three@0.170.0';
import {GLTFExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/GLTFExporter.js';
import {USDZExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/USDZExporter.js';
import {GLTFLoader} from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const mat=(c,metal=.55)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:.38});
async function authentic(name){
 if(name==='RECO1'){const {createReco1}=await import('./reco1.js');return createReco1();}
 if(['VX-9','NEXUS V9','ARES X9','THORN','NOVA','M–12','VORTEX AR-7'].includes(name)){
 const {createWeaponModels}=await import('./weapons.js');
 const palette={steel:mat(0x9ca2ad),dark:mat(0x171b24),armor:mat(0xdf428f),armorLight:mat(0xe7b9d2)};
 const models=createWeaponModels(palette);
 return models[({'VX-9':0,'NEXUS V9':1,'ARES X9':2,'THORN':3,'NOVA':4,'M–12':6,'VORTEX AR-7':8})[name]];
 }
 throw new Error('Modèle original non encore isolé du moteur. Aucun substitut affiché.');
}
const loader=new GLTFLoader(),gltfExporter=new GLTFExporter(),usdzExporter=new USDZExporter();
let last=null;function revoke(){if(last){for(const u of last)URL.revokeObjectURL(u)}last=[]}
window.galleryBuild=async(name)=>{
 const viewer=document.getElementById('viewer'),model=document.getElementById('model'),message=document.getElementById('viewer-message'),ar=document.getElementById('ar-launch');
 revoke();model.removeAttribute('ios-src');model.removeAttribute('src');ar.disabled=true;message.textContent='Préparation du modèle 3D et de la réalité augmentée…';
 let scene;const existing=null;
 try{
 if(existing){scene=(await loader.loadAsync(existing)).scene}else{scene=await authentic(name);const buffer=await gltfExporter.parseAsync(scene,{binary:true,onlyVisible:true});const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));last.push(url);model.src=url}
 if(existing)model.src=existing;
 const usd=await usdzExporter.parseAsync(scene,{maxTextureSize:1024});const url=URL.createObjectURL(new Blob([usd],{type:'model/vnd.usdz+zip'}));last.push(url);model.setAttribute('ios-src',url);
 ar.disabled=false;message.textContent=existing?'Modèle 3D du dépôt · AR iPhone (USDZ) / WebXR si pris en charge.':'Modèle issu des fonctions 3D du moteur du jeu. AR iPhone / WebXR si pris en charge.';
 }catch(e){message.textContent='Erreur de préparation 3D : '+String(e.message||e);ar.disabled=true}
};

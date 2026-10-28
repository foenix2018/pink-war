import * as THREE from 'https://esm.sh/three@0.170.0';
import {GLTFExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/GLTFExporter.js';
import {USDZExporter} from 'https://esm.sh/three@0.170.0/examples/jsm/exporters/USDZExporter.js';
import {GLTFLoader} from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
const mat=(c,metal=.55)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:.38});
function build(name){
 const root=new THREE.Group(),pink=name==='GHJU'||name==='GABY',blue=name==='LYLU'||name==='CARA';
 const accent=mat(pink?0xe83f94:blue?0x398dff:0xf04b73),dark=mat(0x222735),steel=mat(0x7e8797),glass=mat(pink?0xffa7d6:0x89d5ff,.2);
 const box=(w,h,d,x,y,z,m)=>{let a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);root.add(a);return a};
 const sphere=(r,x,y,z,m)=>{let a=new THREE.Mesh(new THREE.SphereGeometry(r,24,16),m);a.position.set(x,y,z);root.add(a);return a};
 const link=(a,b,r,m)=>{const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);let o=new THREE.Mesh(new THREE.CylinderGeometry(r*.9,r,d.length(),12),m);o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());root.add(o)};
 if(name==='GABY'||name==='CARA'){sphere(.32,0,1.1,0,dark);sphere(.25,0,1.1,0,accent);sphere(.15,0,1.1,.24,glass);for(let i=0;i<3;i++){let tor=new THREE.Mesh(new THREE.TorusGeometry(.43,.025,8,64),steel);tor.position.y=1.1;tor.rotation.set(i*.7,i*.8,i*.3);root.add(tor)}}
 else if(name==='GHJU'||name==='LYLU'||name==='RECO1'||name==='ROBOT LOURD'){
 const heavy=name==='ROBOT LOURD',enemy=name==='RECO1'||heavy,primary=enemy?mat(heavy?0x666a76:0x4c5558):accent;
 box(heavy?.8:.48,.65,.3,0,1.24,0,primary);box(.4,.2,.32,0,.87,0,dark);
 sphere(heavy?.24:.19,0,1.76,0,steel);box(.32,.09,.13,0,1.77,.17,enemy?accent:glass);
 for(const side of [-1,1]){sphere(.115,side*.34,1.5,0,primary);link([side*.34,1.48,0],[side*.42,1.02,.1],heavy?.13:.09,dark);sphere(.1,side*.42,1.02,.1,steel);link([side*.16,.85,0],[side*.17,.17,0],heavy?.16:.115,dark);box(.22,.13,.35,side*.17,.1,.08,primary)}
 box(.2,.12,.46,0,1.05,.3,dark);box(.08,.08,.4,0,1.05,.7,steel);
 }else{
 box(.25,.25,.8,0,.75,0,dark);box(.32,.18,.6,0,.88,0,accent);box(.17,.17,.33,0,.7,.54,steel);box(.1,.1,.46,0,.85,-.6,steel);box(.1,.2,.12,0,.51,.12,dark);box(.18,.11,.26,0,.52,.33,accent);
 }
 return root;
}
const loader=new GLTFLoader(),gltfExporter=new GLTFExporter(),usdzExporter=new USDZExporter();
let last=null;function revoke(){if(last){for(const u of last)URL.revokeObjectURL(u)}last=[]}
window.galleryBuild=async(name)=>{
 const viewer=document.getElementById('viewer'),model=document.getElementById('model'),message=document.getElementById('viewer-message'),ar=document.getElementById('ar-launch');
 revoke();model.removeAttribute('ios-src');model.removeAttribute('src');ar.disabled=true;message.textContent='Préparation du modèle 3D et de la réalité augmentée…';
 let scene;const existing=window.galleryModels?.[name];
 try{
 if(existing){scene=(await loader.loadAsync(existing)).scene}else{scene=build(name);const buffer=await gltfExporter.parseAsync(scene,{binary:true,onlyVisible:true});const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));last.push(url);model.src=url}
 if(existing)model.src=existing;
 const usd=await usdzExporter.parseAsync(scene,{maxTextureSize:1024});const url=URL.createObjectURL(new Blob([usd],{type:'model/vnd.usdz+zip'}));last.push(url);model.setAttribute('ios-src',url);
 ar.disabled=false;message.textContent=existing?'Modèle 3D du dépôt · AR iPhone (USDZ) / WebXR si pris en charge.':'Modèle 3D de galerie généré depuis les caractéristiques du jeu (non identique au modèle de combat). AR iPhone / WebXR si pris en charge.';
 }catch(e){message.textContent='Erreur de préparation 3D : '+String(e.message||e);ar.disabled=true}
};

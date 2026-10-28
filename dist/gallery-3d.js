// Galerie Pink Wars — aperçu NATIF des objets du moteur, sans proxy ni modèle factice.
// La prévisualisation ne dépend pas des CDN d'export glTF/AR.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';

const $ = id => document.getElementById(id);
const canvas = $('native-model'), viewer = $('viewer'), status = $('viewer-message');
const arButton = $('ar-launch'), modelViewer = $('model');
const renderer = new WebGLRenderer({canvas, antialias: !/iPhone|Android/i.test(navigator.userAgent), alpha: false, powerPreference:'default'});
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
const scene=new T.Scene();scene.background=new T.Color(0x101724);
const camera=new T.PerspectiveCamera(42,1,.025,100);
scene.add(new T.HemisphereLight(0xe9edff,0x18202c,2.7));
const key=new T.DirectionalLight(0xffdeef,3.2);key.position.set(-3,5,4);scene.add(key);
const fill=new T.DirectionalLight(0x7bb9ff,2);fill.position.set(4,2,-3);scene.add(fill);
const rim=new T.DirectionalLight(0xff70bd,1.1);rim.position.set(2,4,5);scene.add(rim);
const base=new T.Mesh(new T.CylinderGeometry(.78,.87,.085,48),new T.MeshStandardMaterial({color:0x253040,metalness:.55,roughness:.5}));
base.position.y=-1.13;scene.add(base);
const grid=new T.GridHelper(3,12,0x6d8ab0,0x314057);grid.position.y=-1.085;grid.material.opacity=.20;grid.material.transparent=true;scene.add(grid);
const pivot=new T.Group();scene.add(pivot);
const palette=(profile)=>({
 steel:new T.MeshStandardMaterial({color:profile?.armor.steel??0x89929c,metalness:.84,roughness:.36}),
 dark:new T.MeshStandardMaterial({color:profile?.armor.dark??0x1b2029,metalness:.55,roughness:.48}),
 armor:new T.MeshStandardMaterial({color:profile?.armor.rose??0xe52d83,metalness:.72,roughness:.38}),
 armorLight:new T.MeshStandardMaterial({color:profile?.armor.pearl??0xf2dfe9,metalness:.7,roughness:.33})
});
let item=null, requestId=0, running=false, autoRotate=true, bearing=.48, elevation=.18, zoom=4.1, previousTime=0, exportUrls=[], arReady=false;
const weaponNames={'VX-9':0,'NEXUS V9':1,'ARES X9':2,'THORN':3,'NOVA':4,'AURORA':5,'M–12':6,'VX-9 DUO':7,'VORTEX AR-7':8};
const enemyForms={'REMPART':'bulwark','SYNTH N-08':'synth','POURSUIVANT':'stalker','BRUTE':'brute','TRAQUEUR':'listener','RAMPANT':'scuttler','SONDE S-03':'probe'};
const surfaceMat=color=>new T.MeshStandardMaterial({color,metalness:.52,roughness:.47});
function clearExports(){for(const u of exportUrls)URL.revokeObjectURL(u);exportUrls=[];}
function setStatus(message){status.textContent=message;}
async function actualObject(name){
 if(name==='GHJU'||name==='LYLU'){
  const [{characterForId},{createCharacterKit,createSoldier},{createSurfaceDetails},{buildGun},{installShadowUnit,applyShadowMaterials}] = await Promise.all([
   import('./characters.js'),import('./soldier.js'),import('./surfaces.js'),import('./weapons.js'),import('./shadow-unit-game.js')]);
  const profile=characterForId(name.toLowerCase());
  const emblem=new T.Texture(),kit=createCharacterKit(emblem,createSurfaceDetails()),mats=palette(profile);
  if(typeof kit.setPalette==='function')kit.setPalette(profile.armor);
  const soldier=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:parent=>{const flash=new T.Object3D();parent.add(flash);return flash;}}),profile);
  applyShadowMaterials(kit,profile);
  installShadowUnit(soldier,profile);
  soldier.root.scale.setScalar(soldier.heightScale);
  soldier.setWeapon(name==='GHJU'?7:6);
  soldier.setLevel(1);
  soldier.animate(0,false,0,0,0,.016,{preview:true});
  return {root:soldier.root,animate:(t,dt)=>soldier.animate(t,false,0,0,0,dt,{preview:true}),source:'Rig et armure Shadow Unit du jeu'};
 }
 if(name==='GABY'||name==='CARA'){
  const {createAICompanion}=await import('./ai-companions.js');
  const actor=createAICompanion(T,scene,name==='GABY'?'ghju':'lylu');
  actor.root.removeFromParent();
  actor.root.position.set(0,0,0);
  return {root:actor.root,animate:(t,dt)=>{actor.root.rotation.y+=dt*.72;},source:'Sphère IA active du jeu',dispose:()=>actor.dispose()};
 }
 if(name==='RECO1'){
  const {createReco1}=await import('./reco1.js');
  const root=createReco1();
  return {root,animate:(t)=>root.userData.animate?.(t,0,false,{},t),source:'RECO1 V10 · modèle et squelette originaux'};
 }
 if(name==='ROBOT LOURD'){
  const {createSentinel}=await import('./sentinel-mk9.js');
  const actor=createSentinel(T,scene,{health:1200});
  actor.root.removeFromParent();
  return {root:actor.root,animate:(t,dt)=>actor.update(dt,{moving:false,awareness:'patrol'}),
    source:'Sentinel MK VIII · modèle blindé original, canons et pods de missiles',dispose:()=>actor.dispose()};
 }
 if(Object.hasOwn(enemyForms,name)){
  const {createEnemyFactory}=await import('./enemies.js');
  const mats={monster:surfaceMat(0x4d5861),cyan:surfaceMat(0x9de9ef),rose:surfaceMat(0xff80b2),pale:surfaceMat(0xffe5f4),violet:surfaceMat(0xac86e6)};
  const form=enemyForms[name],root=createEnemyFactory(mats).create(false,true,form);
  return {root,animate:t=>root.userData.animate?.(t,0,false,{},t),source:'Usine d’ennemis / châssis réel du jeu'};
 }
 if(Object.hasOwn(weaponNames,name)){
  const index=weaponNames[name];
  if(index===4){
   // NOVA est remplacé dans le jeu par son GLB Pink War IV au chargement.
   const {parseKenneyGLB}=await import('./kenney-blasters.js');
   const url=new URL('./assets/pink-war/blaster-p-mk4.glb',import.meta.url);
   const response=await fetch(url);
   if(!response.ok)throw Error('NOVA : fichier Pink War IV introuvable ('+response.status+')');
   return {root:parseKenneyGLB(await response.arrayBuffer()),source:'NOVA MK4 · fichier GLB réellement chargé par le jeu',glb:url.href};
  }
  const {createWeaponModels}=await import('./weapons.js');
  const model=createWeaponModels(palette())[index];
  if(!model)throw Error('Arme absente du moteur');
  return {root:model,source:'Géométrie de l’arme active dans le moteur du jeu'};
 }
 throw Error('Aucun modèle 3D actif n’est associé à '+name);
}
function repairMissingMaterials(root){
 let repaired=0;
 root.traverse(object=>{
  if(!object.isMesh&&!object.isSkinnedMesh&&!object.isLine&&!object.isPoints)return;
  const fallback=new T.MeshStandardMaterial({color:0x8994a5,metalness:.38,roughness:.6});
  if(Array.isArray(object.material)){
   object.material=object.material.map(m=>{if(m?.isMaterial)return m;repaired++;return fallback;});
   if(!object.material.length){object.material=fallback;repaired++;}
  }else if(!object.material?.isMaterial){object.material=fallback;repaired++;}
 });
 return repaired;
}
function fitObject(root){
 if(!root?.traverse)throw Error('Le moteur ne fournit pas de scène 3D.');
 let meshes=0;root.traverse(o=>{if(o.isMesh||o.isSkinnedMesh)meshes++;});
 if(!meshes)throw Error('Aucun maillage réel dans le modèle.');
 root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(root);
 if(bounds.isEmpty())throw Error('Géométrie sans dimensions.');
 const extent=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const holder=new T.Group();holder.add(root);holder.position.copy(center).multiplyScalar(-1);
 pivot.add(holder);
 const max=Math.max(extent.x,extent.y,extent.z,.02);
 pivot.scale.setScalar(2.03/max);
 return meshes;
}
function draw(now){
 if(viewer.hidden||!item){running=false;return;}
 const dt=Math.min(.05,(now-previousTime)/1000||.016);
 previousTime=now;
 const rect=canvas.getBoundingClientRect();
 if(rect.width>0&&rect.height>0){
  const width=Math.max(1,Math.floor(rect.width)),height=Math.max(1,Math.floor(rect.height));
  const dpr=Math.min(devicePixelRatio||1,/iPhone|Android/i.test(navigator.userAgent)?1.3:1.7);
  renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  if(autoRotate)bearing+=dt*.40;
  camera.position.set(zoom*Math.sin(bearing)*Math.cos(elevation),zoom*Math.sin(elevation)+.15,zoom*Math.cos(bearing)*Math.cos(elevation));
  camera.lookAt(0,0,0);
  try{item.animate?.(now/1000,dt);renderer.render(scene,camera);}catch(e){setStatus('Erreur du rendu natif : '+(e.message||e));running=false;return;}
 }
 requestAnimationFrame(draw);
}
function startDraw(){if(!running){running=true;previousTime=performance.now();requestAnimationFrame(draw);}}
window.galleryClose=()=>{requestId++;arReady=false;arButton.textContent='AR · VOIR CHEZ MOI';item?.dispose?.();item=null;pivot.clear();modelViewer.removeAttribute('src');modelViewer.removeAttribute('ios-src');modelViewer.hidden=true;canvas.hidden=false;clearExports();arButton.disabled=true;};
window.galleryToggleRotation=()=>{autoRotate=!autoRotate;$('rotation').textContent=autoRotate?'⟳ ROTATION AUTO : ON':'⟳ ROTATION AUTO : OFF';};
window.galleryBuild=async name=>{
 window.galleryClose();const token=++requestId;
 setStatus('Chargement du modèle actif dans le moteur Pink Wars…');
 arButton.disabled=true;modelViewer.hidden=true;canvas.hidden=false;
 try{
  const entry=await actualObject(name);
  if(token!==requestId||viewer.hidden){entry.dispose?.();return;}
  const repaired=repairMissingMaterials(entry.root);
  const count=fitObject(entry.root);
  item={...entry,name};
  bearing=.45;elevation=.16;zoom=4.1;
  setStatus(entry.source+' · '+count+' maillages'+(repaired?' · '+repaired+' matériaux réparés':'')+' · glisser pour tourner, pincer pour zoomer.');
  arButton.disabled=false;startDraw();
 }catch(e){if(token!==requestId)return;setStatus('Impossible de charger le modèle actif : '+(e.message||e));arButton.disabled=true;console.error('Galerie Pink Wars',name,e);}
};
window.galleryAR=async()=>{
 if(!item)return;
 // Second gesture is essential on Safari iOS: Quick Look refuses activation
 // when dynamic USDZ creation has consumed the initial user interaction.
 if(arReady){
  if(typeof modelViewer.activateAR!=='function'){setStatus('AR indisponible dans ce navigateur.');return;}
  modelViewer.activateAR().catch(e=>setStatus('AR indisponible sur cet appareil : '+(e.message||e)));
  return;
 }
 arButton.disabled=true;
 setStatus('Préparation du vrai modèle 3D pour la réalité augmentée…');
 try{
  await Promise.race([
   customElements.whenDefined('model-viewer'),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Module AR non chargé : connexion à model-viewer indisponible')),8000))
  ]);
  if(!item.glb){
   const {GLTFExporter}=await import('https://esm.sh/three@0.170.0/examples/jsm/exporters/GLTFExporter.js');
   const bytes=await new GLTFExporter().parseAsync(item.root,{binary:true,onlyVisible:true,maxTextureSize:1024});
   const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));exportUrls.push(url);modelViewer.src=url;
  }else modelViewer.src=item.glb;
  if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
   const {USDZExporter}=await import('https://esm.sh/three@0.170.0/examples/jsm/exporters/USDZExporter.js');
   const bytes=await new USDZExporter().parseAsync(item.root,{maxTextureSize:1024});
   const url=URL.createObjectURL(new Blob([bytes],{type:'model/vnd.usdz+zip'}));exportUrls.push(url);modelViewer.setAttribute('ios-src',url);
  }
  modelViewer.hidden=false;canvas.hidden=true;
  await Promise.race([
   new Promise((resolve,reject)=>{modelViewer.addEventListener('load',resolve,{once:true});modelViewer.addEventListener('error',()=>reject(Error('Fichier AR illisible')),{once:true});}),
   new Promise((_,reject)=>setTimeout(()=>reject(Error('Chargement AR non terminé')),15000))
  ]);
  arReady=true;arButton.textContent='LANCER EN AR';
  setStatus('Modèle prêt : appuyer sur « LANCER EN AR » pour le placer dans la pièce.');
 }catch(e){
  canvas.hidden=false;modelViewer.hidden=true;arReady=false;
  setStatus('Le modèle 3D reste visible. AR indisponible : '+(e.message||e));
 }finally{arButton.disabled=!item;}
};
const touches=new Map();let drag=null;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);touches.set(e.pointerId,[e.clientX,e.clientY]);drag=[e.clientX,e.clientY];autoRotate=false;$('rotation').textContent='⟳ ROTATION AUTO : OFF';});
canvas.addEventListener('pointermove',e=>{
 if(!touches.has(e.pointerId))return;
 const old=touches.get(e.pointerId);touches.set(e.pointerId,[e.clientX,e.clientY]);
 if(touches.size===1){bearing-=(e.clientX-old[0])*.009;elevation=Math.max(-1.1,Math.min(1.1,elevation+(e.clientY-old[1])*.006));}
 else if(touches.size===2){const points=[...touches.values()];const dist=Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1]);if(canvas._distance)zoom=Math.max(2,Math.min(8,zoom*canvas._distance/Math.max(5,dist)));canvas._distance=dist;}
});
function release(e){touches.delete(e.pointerId);if(touches.size<2)canvas._distance=0;}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(2,Math.min(8,zoom*(1+Math.sign(e.deltaY)*.07)));},{passive:false});
if(window.galleryPendingName&&!viewer.hidden)window.galleryBuild(window.galleryPendingName);

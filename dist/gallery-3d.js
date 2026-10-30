// Galerie Pink Wars — aperçu NATIF des objets du moteur, sans proxy ni modèle factice.
// La prévisualisation ne dépend pas des CDN d'export glTF/AR.
import * as T from './vendor/three.webgpu.min.js';
import {WebGPURenderer} from './vendor/three.webgpu.min.js';

const $ = id => document.getElementById(id);
const canvas = $('native-model'), viewer = $('viewer'), status = $('viewer-message');
const arButton = $('ar-launch'), modelViewer = $('model');
const renderer = new WebGPURenderer({canvas, antialias: !/iPhone|Android/i.test(navigator.userAgent), alpha: false, forceWebGL:true});
const rendererReady=renderer.init();
const galleryBuildVersion='2026-10-29-gallery-audit-v13';
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.22;
const scene=new T.Scene();scene.background=new T.Color(0x101724);
const camera=new T.PerspectiveCamera(42,1,.025,100);
scene.add(new T.HemisphereLight(0xe9edff,0x18202c,1.65));
const key=new T.DirectionalLight(0xffdeef,2.65);key.position.set(-3,5,4);scene.add(key);
const fill=new T.DirectionalLight(0x7bb9ff,1.15);fill.position.set(4,2,-3);scene.add(fill);
const rim=new T.DirectionalLight(0xff70bd,1.7);rim.position.set(2,4,5);scene.add(rim);
const base=new T.Mesh(new T.CylinderGeometry(.78,.87,.085,48),new T.MeshStandardMaterial({color:0x253040,metalness:.55,roughness:.5}));
base.position.y=-1.13;scene.add(base);
const baseRim=new T.Mesh(new T.TorusGeometry(.807,.009,7,48),new T.MeshBasicMaterial({color:0xf48ac7}));
baseRim.rotation.x=-Math.PI/2;baseRim.position.y=-1.083;scene.add(baseRim);
const contactShadow=new T.Mesh(new T.CircleGeometry(.68,32),new T.MeshBasicMaterial({color:0x020710,opacity:.42,transparent:true,depthWrite:false}));
contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=-1.084;scene.add(contactShadow);
const grid=new T.GridHelper(3,12,0x6d8ab0,0x314057);grid.position.y=-1.085;grid.material.opacity=.20;grid.material.transparent=true;scene.add(grid);
const pivot=new T.Group();scene.add(pivot);
const palette=(profile)=>({
 steel:new T.MeshStandardMaterial({color:profile?.armor.steel??0x89929c,metalness:.84,roughness:.36}),
 dark:new T.MeshStandardMaterial({color:profile?.armor.dark??0x1b2029,metalness:.55,roughness:.48}),
 armor:new T.MeshStandardMaterial({color:profile?.armor.rose??0xe52d83,metalness:.72,roughness:.38}),
 armorLight:new T.MeshStandardMaterial({color:profile?.armor.pearl??0xf2dfe9,metalness:.7,roughness:.33}),
 rose:new T.MeshStandardMaterial({color:profile?.armor.rose??0xe52d83,metalness:.65,roughness:.32}),
 cyan:new T.MeshStandardMaterial({color:0x67dff0,metalness:.3,roughness:.3}),
 pale:new T.MeshStandardMaterial({color:0xe8eaf1,metalness:.25,roughness:.4}),
 violet:new T.MeshStandardMaterial({color:0x9870cf,metalness:.5,roughness:.4}),
 monster:new T.MeshStandardMaterial({color:0x4d5861,metalness:.5,roughness:.5})
});
let arPoseLocked=false;
let item=null, requestId=0, running=false, autoRotate=true, bearing=.48, elevation=.18, zoom=4.1, previousTime=0, exportUrls=[], arReady=false;
let lastCanvasWidth=0,lastCanvasHeight=0,lastPixelRatio=0,renderPending=false,groundTick=0,frameFailure=false;
const tabletOrMobile=/iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
const previewRatioCap=tabletOrMobile?1.22:1.5;
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
  return {root:soldier.root,animate:(t,dt)=>soldier.animate(t,false,0,0,0,dt,{preview:true}),source:'Rig et armure Shadow Unit du jeu',soldier,kit};
 }
 if(name==='GABY'||name==='CARA'){
  const {createAICompanion}=await import('./ai-companions.js');
  const actor=createAICompanion(T,scene,name==='GABY'?'ghju':'lylu');
  actor.root.removeFromParent();
  actor.root.position.set(0,0,0);
  return {root:actor.root,animate:(t,dt)=>actor.preview(dt),source:'Sphère IA articulée du jeu · '+(name==='GABY'?'quatre coques de protection':'six panneaux offensifs'),dispose:()=>actor.dispose()};
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
  const mats=palette();
  const form=enemyForms[name],root=createEnemyFactory(mats).create(false,true,form);
  return {root,animate:t=>root.userData.animate?.(t,0,false,form==='probe'?{yaw:root.rotation.y,motionX:Math.sin(t*.8)*2.4,motionZ:Math.cos(t*.8)*2.2}:{},t),source:form==='probe'?'S-03 / quadrirotor cyberpunk · vol stabilisé · son RLH en jeu':'Usine d’ennemis / châssis réel du jeu'};
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
 let repaired=0;let fallback=null;
 root.traverse(object=>{
  if(!object.isMesh&&!object.isSkinnedMesh&&!object.isLine&&!object.isPoints)return;
  if(!fallback)fallback=new T.MeshStandardMaterial({color:0x8994a5,metalness:.38,roughness:.6});
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
 const holder=new T.Group();holder.add(root);
 const max=Math.max(extent.x,extent.y,extent.z,.02);
 const scale=2.03/max;
 // Put the lowest point of the native model on the pedestal top (y=-1.0875), not at the viewer origin.
 holder.position.set(-center.x,-bounds.min.y+(-1.0875/scale),-center.z);
 pivot.add(holder);
 pivot.scale.setScalar(scale);
 pivot.position.y=0;
 return meshes;
}
function draw(now){
 if(viewer.hidden||!item){running=false;return;}
 const dt=Math.min(.05,(now-previousTime)/1000||.016);
 previousTime=now;
 const rect=canvas.getBoundingClientRect();
 if(rect.width>0&&rect.height>0){
  const width=Math.max(1,Math.floor(rect.width)),height=Math.max(1,Math.floor(rect.height));
  const dpr=Math.min(devicePixelRatio||1,previewRatioCap);
  if(width!==lastCanvasWidth||height!==lastCanvasHeight||dpr!==lastPixelRatio){
   renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
   lastCanvasWidth=width;lastCanvasHeight=height;lastPixelRatio=dpr;
  }
  camera.aspect=width/height;camera.updateProjectionMatrix();
  if(autoRotate)bearing+=dt*.40;
  camera.position.set(zoom*Math.sin(bearing)*Math.cos(elevation),zoom*Math.sin(elevation)+.15,zoom*Math.cos(bearing)*Math.cos(elevation));
  camera.lookAt(0,0,0);
  try{if(!arPoseLocked)item.animate?.(now/1000,dt);
   // Ground every gallery entry on the same pedestal, including animated enemies and weapons.
   // Prefer anatomical foot bones for soldiers; other models use their visible geometry bounds.
   pivot.updateMatrixWorld(true);
   let contactY;
   if((++groundTick)%6===0&&item.soldier?.feet?.length){
    contactY=Math.min(...item.soldier.feet.map(foot=>foot.getWorldPosition(new T.Vector3()).y));
   }else if(groundTick%6===0){
    const visibleBounds=new T.Box3(),partBounds=new T.Box3();
    item.root.traverse(part=>{
     if(!part.isMesh&&!part.isSkinnedMesh||!part.geometry)return;
     for(let ancestor=part;ancestor;ancestor=ancestor.parent){if(!ancestor.visible)return;}
     partBounds.setFromObject(part);
     if(!partBounds.isEmpty())visibleBounds.union(partBounds);
    });
    if(!visibleBounds.isEmpty())contactY=visibleBounds.min.y;
   }
   const pedestalTop=base.position.y+.085/2;
   if(Number.isFinite(contactY))pivot.position.y+=T.MathUtils.clamp(pedestalTop-contactY,-.12,.12);
   if(!renderPending&&!frameFailure){
    renderPending=true;
    renderer.renderAsync(scene,camera).catch(e=>{
     frameFailure=true;
     setStatus('Erreur rendu '+galleryBuildVersion+' : '+(e.message||e)+' · '+String(e.stack||'').slice(0,350));
    }).finally(()=>{renderPending=false;});
   }
  }catch(e){frameFailure=true;setStatus('Erreur du rendu natif : '+(e.message||e));running=false;return;}
 }
 if(frameFailure){running=false;return;}
 requestAnimationFrame(draw);
}
function startDraw(){if(!running){running=true;previousTime=performance.now();requestAnimationFrame(draw);}}
window.galleryClose=()=>{requestId++;arReady=false;groundTick=5;frameFailure=false;arButton.textContent='AR · VOIR CHEZ MOI';item?.dispose?.();item=null;pivot.clear();modelViewer.removeAttribute('src');modelViewer.removeAttribute('ios-src');modelViewer.hidden=true;canvas.hidden=false;clearExports();arButton.disabled=true;};
window.galleryResetView=()=>{bearing=.45;elevation=.16;zoom=4.1;autoRotate=false;$('rotation').textContent='⟳ ROTATION AUTO : OFF';};
window.galleryToggleRotation=()=>{autoRotate=!autoRotate;$('rotation').textContent=autoRotate?'⟳ ROTATION AUTO : ON':'⟳ ROTATION AUTO : OFF';};
window.galleryBuild=async name=>{
 window.galleryClose();const token=++requestId;
 setStatus('Chargement du modèle actif · '+galleryBuildVersion+'…');
 arButton.disabled=true;modelViewer.hidden=true;canvas.hidden=false;
 try{
  await rendererReady;
  const entry=await actualObject(name);
  if(token!==requestId||viewer.hidden){entry.dispose?.();return;}
  const repaired=repairMissingMaterials(entry.root);
  const count=fitObject(entry.root);
  item={...entry,name};
  bearing=.45;elevation=.16;zoom=4.1;groundTick=5;
  setStatus(entry.source+' · '+count+' maillages'+(repaired?' · '+repaired+' matériaux réparés':'')+' · glisser pour tourner, pincer pour zoomer.');
  arButton.disabled=false;startDraw();
 }catch(e){if(token!==requestId)return;setStatus('Échec '+galleryBuildVersion+' · '+name+' : '+(e.message||e)+' · '+String(e.stack||'').slice(0,520));arButton.disabled=true;console.error('Galerie Pink Wars',name,e);}
};
window.galleryAR=async()=>{
 if(!item)return;
 const active=item;
 if(arReady){
  if(/iPhone|iPad|iPod/i.test(navigator.userAgent)){
   const url=modelViewer.getAttribute('ios-src');
   if(!url){setStatus('AR iOS : fichier USDZ absent.');return;}
   const a=document.createElement('a');a.href=url;a.rel='ar';
   const img=document.createElement('img');img.alt='Ouvrir dans Quick Look';a.append(img);
   a.style.cssText='position:absolute;left:-10000px;top:0';document.body.append(a);a.click();a.remove();return;
  }
  if(typeof modelViewer.activateAR==='function'){
   try{await modelViewer.activateAR();}catch(e){setStatus('Échec ouverture AR : '+(e.message||e));}
  }else setStatus('AR indisponible sur ce navigateur.');
  return;
 }
 arPoseLocked=true;
 let inspectionHands=null;
 arButton.disabled=true;
 setStatus('Conversion du modèle '+active.name+' pour la réalité augmentée…');
 try{
  await Promise.race([customElements.whenDefined('model-viewer'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Module AR non chargé')),10000))]);
  const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(isIOS){
   const {USDZExporter}=await import('https://esm.sh/three@0.170.0/examples/jsm/exporters/USDZExporter.js');
   const exportRoot=new T.Group();
   // Explicitly locate the weapon holder: its userData.weaponModels contains all cached gun models.
   const weaponRoots=new Set();
   if(active.name==='GHJU'||active.name==='LYLU')active.root.traverse(node=>{
    if(Array.isArray(node.userData?.weaponModels)){
     // Do not exclude the holder: its direct children include both gloves.
     for(const weapon of node.userData.weaponModels)weaponRoots.add(weapon);
    }
   });
   if(active.soldier){
    // Attach the actual rigged RLH gloves to the character's wrist bones;
    // no guessed XYZ offsets and no weapon grip adapter rotations.
    const {attachNativeARHands}=await import('./gallery-ar-hands.js');
    inspectionHands=attachNativeARHands(active.soldier,active.kit);
    active.soldier.shadowUnit?.cape?.update?.(0,'idle',0);
   }
   active.root.updateMatrixWorld(true);
   active.root.traverse(source=>{
    if(!source.isMesh&&!source.isSkinnedMesh)return;
    if(!source.geometry?.attributes?.position)return;
    // Visibility is inherited: inactive weapon models are hidden by parent groups.
    for(let ancestor=source;ancestor;ancestor=ancestor.parent){
     if(!ancestor.visible)return;
     // The soldier holds a gun rack containing every weapon model; never export that rack as part of a character.
     if(weaponRoots.has(ancestor))return;
    }
    // Geometry belongs to its native rig; export in world coordinates only after filtering.
    const material=Array.isArray(source.material)?source.material[0]:source.material;
    const isCape=/cape|tabard|tissée/i.test(source.name||'');
    const copy=new T.Mesh(source.geometry.clone(),new T.MeshStandardMaterial({color:isCape?new T.Color(0x171820):(material?.color?.clone?.()||new T.Color(0x8994a5)),metalness:isCape?0:Math.min(.8,material?.metalness??.35),roughness:isCape?.98:(material?.roughness??.5),transparent:false,opacity:1,depthWrite:true,side:T.DoubleSide}));
    source.updateWorldMatrix(true,false);
    // Freeze the active pose; skinned geometry must be baked, not exported as an unbound rig.
    if(source.isSkinnedMesh&&typeof source.applyBoneTransform==='function'){
     const pos=copy.geometry.attributes.position,v=new T.Vector3();
     for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);source.applyBoneTransform(i,v);pos.setXYZ(i,v.x,v.y,v.z);}
     pos.needsUpdate=true;copy.geometry.computeVertexNormals();
    }
    copy.applyMatrix4(source.matrixWorld);copy.updateMatrix();exportRoot.add(copy);
   });
   if(!exportRoot.children.length)throw Error('Aucun maillage compatible avec USDZ');
   // A character export must never contain an oversized weapon or stage prop.
   if(active.name==='GHJU'||active.name==='LYLU'){
    const rejects=[];
    for(const mesh of exportRoot.children){const b=new T.Box3().setFromObject(mesh),sz=b.getSize(new T.Vector3());if(sz.x>2.5||sz.y>3.2||sz.z>2.5)rejects.push(mesh);}
    for(const mesh of rejects)exportRoot.remove(mesh);
    if(!exportRoot.children.length)throw Error('Export AR : aucun maillage de personnage après filtrage');
   }
   // Normalize the AR snapshot to the character's actual height, not the hidden weapons' dimensions.
   if(active.name==='GHJU'||active.name==='LYLU'){
    const bounds=new T.Box3().setFromObject(exportRoot),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    if(size.y>.01){const scale=(active.name==='GHJU'?1.7:1.8)/size.y;for(const mesh of exportRoot.children){mesh.position.sub(center).multiplyScalar(scale);mesh.scale.multiplyScalar(scale);}}
   }
   const bytes=await new USDZExporter().parseAsync(exportRoot,{maxTextureSize:1024});
   inspectionHands?.dispose();inspectionHands=null;
   if(active.soldier){active.soldier.gun.visible=true;active.soldier.freeHand.visible=true;}
   const url=URL.createObjectURL(new Blob([bytes],{type:'model/vnd.usdz+zip'}));exportUrls.push(url);modelViewer.setAttribute('ios-src',url);
   // Quick Look opens from the second direct user gesture, after conversion.
  }else{
   if(!active.glb){
    const {GLTFExporter}=await import('https://esm.sh/three@0.170.0/examples/jsm/exporters/GLTFExporter.js');
    const bytes=await new GLTFExporter().parseAsync(active.root,{binary:true,onlyVisible:true,maxTextureSize:1024});
    const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));exportUrls.push(url);modelViewer.src=url;
   }else modelViewer.src=active.glb;
  }
  if(item!==active)throw Error('Modèle changé pendant la préparation');
  arReady=true;arButton.textContent='LANCER EN AR';
  setStatus(isIOS?'Fichier USDZ prêt : appuyer sur LANCER EN AR pour ouvrir Quick Look.':'Modèle GLB prêt : appuyer sur LANCER EN AR.');
 }catch(e){arReady=false;setStatus('AR '+active.name+' : '+(e.message||e)+' · '+String(e.stack||'').slice(0,350));}
 finally{
  inspectionHands?.dispose();
  if(active.soldier){active.soldier.gun.visible=true;active.soldier.freeHand.visible=true;}
  arPoseLocked=false;
  arButton.disabled=!item;
 }
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

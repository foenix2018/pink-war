import * as T from './vendor/three.webgpu.min.js';
import {createWeaponModels,createNovaSight,WEAPON_FRAME,KENNEY_HOLD} from './weapons.js';
import {installKenneyBlasters} from './kenney-blasters.js';
import {installPinkWarsSoldier} from './level2-player.js';
import {poseUnarmedForInspection} from './rlh-firefighter.js';
import {createGlove} from './hands.js';
import {WEAPONS} from './game-logic.js';
import {createCompanionModel} from './companion-model.js';

// Freeze the *visible*, evaluated native model. Preserve skin deformation,
// vertex colours, reflected instances, material groups and both texture UVs.
// Display models have no animation mixer or combat logic in the rendered scene.
export function freezeShowcase(source,{name=source.name,resolveMaterial=null}={}){
 source.updateWorldMatrix(true,true);
 const inverse=source.parent?source.parent.matrixWorld.clone().invert():new T.Matrix4(),groups=new Map();
 const bounds=new T.Box3(),point=new T.Vector3(),normal=new T.Vector3(),matrix=new T.Matrix4(),instance=new T.Matrix4();
 source.traverseVisible(mesh=>{
  if(!mesh.isMesh||mesh.userData.heroAuthoring)return;
  mesh.skeleton?.update();
  const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
  const boneNormals=mesh.isSkinnedMesh?mesh.skeleton.bones.map((_,i)=>new T.Matrix3().getNormalMatrix(new T.Matrix4().copy(mesh.bindMatrixInverse).multiply(new T.Matrix4().fromArray(mesh.skeleton.boneMatrices,i*16)).multiply(mesh.bindMatrix))):null;
  const weightedNormal=new T.Vector3(),boneNormal=new T.Vector3();
  const ranges=Array.isArray(mesh.material)?geometry.groups:[{start:0,count:geometry.index?.count||p.count,materialIndex:0}];
  const count=mesh.isInstancedMesh?mesh.count:1;
  for(let inst=0;inst<count;inst++){
   matrix.copy(inverse).multiply(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(inst,instance);matrix.multiply(instance);}
   const normalMatrix=new T.Matrix3().getNormalMatrix(matrix),reflected=matrix.determinant()<0;
   for(const range of ranges){
    const original=Array.isArray(mesh.material)?mesh.material[range.materialIndex]:mesh.material;
    if(!original||original.opacity===0)continue;
    const material=resolveMaterial?resolveMaterial(original):original;
    if(!groups.has(material))groups.set(material,{material,position:[],normal:[],uv:[],uv1:[],color:[],hasColor:!!material.vertexColors});
    const b=groups.get(material),end=Math.min(range.start+range.count,geometry.index?.count||p.count);
    for(let j=range.start;j+2<end;j+=3)for(const k of reflected?[0,2,1]:[0,1,2]){
     const i=geometry.index?geometry.index.getX(j+k):j+k;
     if(mesh.isSkinnedMesh)mesh.getVertexPosition(i,point);else point.fromBufferAttribute(p,i);
     point.applyMatrix4(matrix);bounds.expandByPoint(point);b.position.push(point.x,point.y,point.z);
     normal.fromBufferAttribute(n,i);
     if(mesh.isSkinnedMesh){
      // Transform a normal with the same weighted bind-space bone matrices.
      const si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;weightedNormal.set(0,0,0);
      for(let a=0;a<4;a++){const weight=sw.getComponent(i,a);if(weight)weightedNormal.addScaledVector(boneNormal.copy(normal).applyMatrix3(boneNormals[si.getComponent(i,a)]),weight);}normal.copy(weightedNormal).normalize();
     }
     normal.applyMatrix3(normalMatrix).normalize();b.normal.push(normal.x,normal.y,normal.z);
     for(const key of ['uv','uv1']){const attr=geometry.attributes[key];b[key].push(attr?attr.getX(i):0,attr?attr.getY(i):0);}
     const c=original.vertexColors?geometry.attributes.color:null,tint=resolveMaterial?original.color:null;
     b.color.push((c?c.getX(i):1)*(tint?.r??1),(c?c.getY(i):1)*(tint?.g??1),(c?c.getZ(i):1)*(tint?.b??1));
    }
   }
  }
 });
 const root=new T.Group();root.name=name;let triangles=0;
 for(const b of groups.values()){
  const g=new T.BufferGeometry();for(const [key,size]of [['position',3],['normal',3],['uv',2],['uv1',2]])g.setAttribute(key,new T.Float32BufferAttribute(b[key],size));if(b.hasColor)g.setAttribute('color',new T.Float32BufferAttribute(b.color,3));
  g.computeBoundingSphere();const mesh=new T.Mesh(g,b.material);mesh.castShadow=!b.material.transparent&&!b.material.isMeshBasicMaterial;mesh.receiveShadow=true;root.add(mesh);triangles+=g.attributes.position.count/3;
 }
 return{root,bounds,triangles,batches:root.children.length,dispose(){root.removeFromParent();for(const m of root.children)m.geometry.dispose();}};
}

// Palette colours live in vertices. Retain original mapped finishes, alpha
// cut-outs, glass and light materials while sharing untextured satin finishes.
export function showcaseMaterialResolver(){
 const cache=new Map(),textureKeys=new WeakMap();
 const textureID=t=>{
  if(!t)return '';if(textureKeys.has(t))return textureKeys.get(t);
  const image=t.image;let source=image?.currentSrc||image?.src;
  if(!source&&image?.data){let hash=2166136261;for(const value of new Uint8Array(image.data.buffer,image.data.byteOffset,image.data.byteLength))hash=Math.imul(hash^value,16777619);source=[image.width,image.height,hash>>>0].join('/');}
  if(!source&&image?.toDataURL)source=image.toDataURL();
  const key=JSON.stringify([source||t.uuid,t.repeat.toArray(),t.offset.toArray(),t.rotation,t.channel,t.flipY,t.wrapS,t.wrapT,t.colorSpace]);textureKeys.set(t,key);return key;
 };
 return original=>{
  const m=original,hasMaps=['map','normalMap','roughnessMap','metalnessMap','aoMap','alphaMap','bumpMap','emissiveMap'].some(k=>m[k]);
  const rough=hasMaps?m.roughness:m.roughness>.65?.85:m.roughness<.2?.16:.4,metal=hasMaps?m.metalness:m.metalness>.4?.75:.08;
  const key=JSON.stringify({basic:!!m.isMeshBasicMaterial,maps:['map','normalMap','roughnessMap','metalnessMap','aoMap','alphaMap','bumpMap','emissiveMap'].map(k=>textureID(m[k])),rough,metal,side:m.side,alpha:m.alphaTest,transparent:m.transparent,opacity:m.opacity,blending:m.blending,depthWrite:m.depthWrite,emission:m.emissive?.getHex(),emissiveIntensity:m.emissiveIntensity,clearcoat:hasMaps?m.clearcoat:0});
  if(!cache.has(key)){const c=m.clone();c.name='Présentoir / '+cache.size;c.color.set(0xffffff);c.vertexColors=true;if(!c.isMeshBasicMaterial){c.roughness=rough;c.metalness=metal;if(!hasMaps&&'clearcoat'in c)c.clearcoat=0;}cache.set(key,c);}
  return cache.get(key);
 };
}

export async function createHideoutShowcase({layout,levels={ghju:1,lylu:1},onProgress=()=>{}}={}){
 const root=new T.Group();root.name='Présentoirs · modèles officiels Pink Wars';
 const sources=[],frozen=[],outfits=new Map(),catalogue=[],companions=[],companionModels=[];
 const shell=c=>new T.MeshStandardMaterial({color:c,metalness:.65,roughness:.4}),light=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
 const mats={armor:shell(0x232630),armorLight:shell(0x616773),dark:shell(0x15171d),steel:shell(0x444a55),suit:shell(0x101218),rose:light(0xff66a5),pale:light(0xdef4ff),white:shell(0xc6d3df),cyan:light(0x61caff),violet:light(0xa575ff)};
 async function productionReady(progress){const deadline=performance.now()+20000;while(progress.loaded+progress.failed<progress.total){if(performance.now()>deadline)throw Error('Chargement des modèles de production interrompu');await new Promise(r=>setTimeout(r,20));}if(progress.failed)throw Error('Modèle de production indisponible');}
 const models=createWeaponModels(mats),weaponSlots=layout.showcase.weapons;
 const production=installKenneyBlasters(models,models.map(m=>[...m.children]),WEAPON_FRAME,(index,skin)=>{if(index===4&&!skin.userData.optic)skin.add(createNovaSight(mats));},KENNEY_HOLD);
 await productionReady(production);
 for(const slot of weaponSlots){
  const model=models[slot.index];
  if(slot.index===7){for(const [i,side]of model.children.entries()){side.position.x=i===0?-.42:.42;side.rotation.y=-Math.PI/2;}}
  const frozenModel=freezeShowcase(model,{name:WEAPONS[slot.index].name});frozen.push(frozenModel);
  const carrier=new T.Group();carrier.add(frozenModel.root);carrier.rotation.y=slot.index===7?0:-Math.PI/2;if(slot.bench&&slot.index!==7)carrier.rotateZ(Math.PI/2);
  if(slot.index===5)carrier.rotation.set(0,0,-Math.PI/2);
  carrier.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(carrier),center=bounds.getCenter(new T.Vector3());
  carrier.position.set(slot.x-center.x,slot.bench?slot.y-bounds.min.y:slot.y-center.y,slot.bench?slot.z-center.z:slot.z-bounds.min.z);root.add(carrier);
  const size=bounds.getSize(new T.Vector3());carrier.updateMatrixWorld(true);const mounted=new T.Box3().setFromObject(carrier);catalogue.push({index:slot.index,id:WEAPONS[slot.index].id,name:WEAPONS[slot.index].name,bench:!!slot.bench,triangles:frozenModel.triangles,size:size.toArray(),bounds:{min:mounted.min.toArray(),max:mounted.max.toArray()},source:'createWeaponModels'});
 }
 for(const slot of layout.showcase.outfits){
  onProgress('Tenue originale de '+slot.hero.toUpperCase());
  const rig=await installPinkWarsSoldier(T,new T.Scene(),slot.hero,mats);sources.push(rig);
  if(!await rig.model.shadowUnit.gear.ready)throw Error('Équipement original indisponible pour '+slot.hero);
  await rig.model.shadowUnit.suit.ready;await productionReady(rig.model.gun.userData.kenneyAssets);
  rig.model.root.visible=true;
  const gloves=[createGlove(rig.kit.gloves,{mirror:true,sleeve:false,arm:false}),createGlove(rig.kit.gloves,{sleeve:false,arm:false})];
  rig.model.root.add(...gloves);rig.model.shadowUnit.armour.restoreAttachments();
  const entry={slot,rig,gloves,frozen:null,carrier:new T.Group(),level:0};root.add(entry.carrier);outfits.set(slot.hero,entry);
  updateOutfit(slot.hero,levels[slot.hero]||1);
 }
 // The charging docks use the same phase-shell models as active companions,
 // at their original metre scale. Capture an evaluated native idle pose.
 for(const slot of layout.showcase.companions){
  const nativeRoot=new T.Group(),model=createCompanionModel(T,nativeRoot,slot.hero==='ghju');companionModels.push(model);
  for(let i=0;i<20;i++)model.update(.05);
  const stats=model.stats(),capture=freezeShowcase(nativeRoot,{name:stats.name+' · modèle officiel'});frozen.push(capture);
  const carrier=new T.Group();carrier.add(capture.root);carrier.position.set(slot.x,slot.y,slot.z);root.add(carrier);carrier.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(carrier);
  companions.push({id:slot.id,hero:slot.hero,name:stats.name,source:'createCompanionModel',revision:stats.revision,petals:stats.petals,pose:'native idle',scale:1,triangles:capture.triangles,size:bounds.getSize(new T.Vector3()).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
 }
 function updateOutfit(hero,level){
  const entry=outfits.get(hero);if(!entry)return;level=Math.max(1,Math.min(5,Math.floor(level)||1));if(entry.level===level)return;
  entry.frozen?.dispose();const {rig,gloves,slot}=entry;
  rig.model.setLevel(level);poseUnarmedForInspection(rig.model,gloves);rig.model.shadowUnit.cape.update(0,'idle',.63);rig.model.shadowUnit.tabard.update(0,'idle',.63);rig.model.root.updateMatrixWorld(true);
  entry.frozen=freezeShowcase(rig.model.root,{name:'Tenue officielle '+hero.toUpperCase()});entry.carrier.clear();entry.carrier.add(entry.frozen.root);entry.carrier.rotation.y=Math.PI;
  entry.carrier.position.set(0,0,0);entry.carrier.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(entry.carrier),center=bounds.getCenter(new T.Vector3());
  entry.carrier.position.set(slot.x-center.x,slot.y-bounds.min.y,slot.z-center.z);entry.level=level;
 }
 return{root,setArmorLevel:updateOutfit,snapshot(){return{weapons:catalogue,companions,outfits:[...outfits].map(([hero,e])=>({hero,level:e.level,source:'installPinkWarsSoldier',pose:'poseUnarmedForInspection',triangles:e.frozen.triangles,batches:e.frozen.batches})),triangles:frozen.reduce((s,f)=>s+f.triangles,0)+[...outfits.values()].reduce((s,e)=>s+e.frozen.triangles,0),batches:frozen.reduce((s,f)=>s+f.batches,0)+[...outfits.values()].reduce((s,e)=>s+e.frozen.batches,0)};},dispose(){root.removeFromParent();for(const f of frozen)f.dispose();for(const e of outfits.values()){e.frozen.dispose();for(const g of e.gloves)g.userData.dispose?.();}for(const model of companionModels)model.dispose();for(const r of sources)r.dispose();for(const m of Object.values(mats))m.dispose();}};
}

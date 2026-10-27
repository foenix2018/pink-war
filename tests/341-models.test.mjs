import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {parseKenneyGLB,MK4_WEAPON_ASSETS} from '../dist/kenney-blasters.js';
import {WEAPON_FRAME,KENNEY_HOLD,buildGun} from '../dist/weapons.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
const buffer=file=>{const b=readFileSync(new URL('../dist/assets/pink-war/'+file,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const kit=()=>createCharacterKit(new T.Texture());
const make=k=>buildGun({mats:Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()])),gloves:k.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}});
test('remaining GLB weapons use the live grip frame and a visible, centred bore',()=>{
 for(const [i,file] of MK4_WEAPON_ASSETS.entries()){
  if(i<=2)continue; // VX-9, NEXUS V9 et ARES X9 sont des modèles originaux, plus des GLB MK4.
  const root=parseKenneyGLB(buffer(file));root.updateMatrixWorld(true);
  assert.equal(root.userData.pinkWarFrame,'grip-metres-v1');assert.equal(root.userData.muzzle[2],WEAPON_FRAME[i].muzzle[2]);
  assert.ok(root.userData.muzzle[1]-KENNEY_HOLD[i].palm[1]>.09&&root.userData.muzzle[1]-KENNEY_HOLD[i].palm[1]<.13,'human grip sits just below the bore, without a long disconnected web');
  const bounds=new T.Box3().setFromObject(root),muzzle=new T.Vector3(...root.userData.muzzle);
  assert.ok(Math.abs(bounds.min.z-muzzle.z)<.004,'barrel, flash and ballistic origin coincide');
  const hits=new T.Raycaster(muzzle.clone().add(new T.Vector3(0,0,-.1)),new T.Vector3(0,0,1)).intersectObject(root,true);
  assert.ok(hits.length,'bore geometry faces the shot direction');assert.ok(hits[0].point.distanceTo(muzzle)<.006,'no upper-ring or front-mounted component blocks the actual aperture');
  let triangles=0,batches=0;root.traverse(o=>{if(!o.isMesh)return;batches++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok(o.geometry.attributes.uv);assert.ok(o.material.name.startsWith('PW_MK4_'));assert.ok(o.material.map||o.material.name.endsWith('energy')||o.material.name.endsWith('glass'));});
  assert.ok(batches<=6);assert.ok(triangles<16000,'five highly detailed hand-held assets have a bounded geometry budget');
  const palm=new T.Vector3(...KENNEY_HOLD[i].palm);assert.ok(bounds.containsPoint(palm),'measured palm intersects the actual grip volume');
 }
});
test('live installation keeps measured hand positions and removes the floating legacy emitter',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async url=>new Response(buffer(String(url).split('/').at(-1)));
 try{
  const gun=make(kit());for(let j=0;j<100&&gun.userData.kenneyAssets.loaded<5;j++)await new Promise(r=>setTimeout(r,10));
  assert.equal(gun.userData.kenneyAssets.loaded,5);assert.equal(gun.userData.kenneyAssets.failed,0);
  assert.equal(gun.userData.weaponModels[0].userData.modelName,'VX-9 Orbital Defense');
  assert.equal(gun.userData.weaponModels[1].userData.modelName,'NEXUS V9');
  assert.equal(gun.userData.weaponModels[2].userData.modelName,'ARES X9');
  assert.ok(gun.userData.weaponModels[2].userData.optimizedDrawCalls<=18,'ARES X9 uses material-grouped draw calls');
  for(let i=0;i<5;i++){
   gun.userData.setVariant(i);gun.userData.setCombatState({ammo:5,capacity:12,heat:1});
   assert.deepEqual(gun.userData.flash.position.toArray(),gun.userData.weaponModels[i].userData.muzzle);
   assert.deepEqual(gun.userData.hand.position.toArray(),i<=3?[0,0,0]:KENNEY_HOLD[i].palm);
   assert.equal(gun.userData.weaponModels[i].scale.x,1,'an originally authored round barrel stays round');
   assert.equal(gun.children.find(c=>c.name==='Dynamic emitter collar').visible,false,'the actual weapon owns its emitter');
   assert.ok(gun.children.find(c=>c.name==='Barrel heat ring').position.distanceTo(gun.userData.flash.position)<.002);
   if(i===1||i===2){
     assert.ok(gun.userData.weaponModels[i].userData.authoredOptic);const optic=gun.userData.optics[i];assert.ok(optic.cfg.y>0 && optic.cfg.y<.30,'magnified sight remains on the receiver');
     const camera=new T.PerspectiveCamera();camera.position.set(0,optic.cfg.y,optic.cfg.z+.18);camera.updateMatrixWorld(true);gun.userData.setSight(true,camera);
     assert.ok(optic.glass.visible&&optic.reticle.visible&&gun.userData.aiming,'a real aligned eye sees the reticle on the installed model');
     camera.position.x=.15;camera.updateMatrixWorld(true);gun.userData.setSight(true,camera);assert.equal(optic.reticle.visible,false,'an off-axis eye loses the sight without moving the tracked weapon');
   }
  }gun.userData.disposeDynamic();
 }finally{globalThis.fetch=previous;}
});
test('the soldier’s replacement suit stays human sized, skinned and under seven material batches',()=>{
 for(const profile of CHARACTERS){const k=kit();k.setPalette(profile.armor);const s=createSoldier(k,()=>make(k),profile);assert.equal(s.armor.generation,4);assert.equal(s.nativeSkeleton.bones.length,34);assert.ok(s.heightScale>.89&&s.heightScale<1.01);assert.ok(s.armor.parts.length<=7);
  let triangles=0;for(const p of s.armor.parts){assert.equal(p.skeleton,s.nativeSkeleton);triangles+=p.geometry.attributes.position.count/3;assert.ok(p.material.map||['suit','glow','lens'].some(k=>p.name.endsWith(k)));const w=p.geometry.attributes.skinWeight;for(let j=0;j<w.count;j++)assert.ok(Math.abs(w.getX(j)+w.getY(j)+w.getZ(j)+w.getW(j)-1)<1e-6,'every visible vertex has a complete binding; no unassigned fragments');}
  assert.ok(triangles<20000);assert.ok(s.actor.parts.every(m=>!m.parent));assert.ok(s.armor.template.items.some(p=>p.tag==='visor'));s.dispose();
 }
});
test('source foot measurements stay root-local on elevated floors with a rotated and scaled soldier',()=>{
 const aKit=kit(),bKit=kit(),a=createSoldier(aKit,()=>make(aKit),CHARACTERS[0]),b=createSoldier(bKit,()=>make(bKit),CHARACTERS[0]);
 b.root.position.set(12,4.8,-33);b.root.rotation.y=.73;b.root.scale.setScalar(b.heightScale);
 for(let j=0;j<25;j++){
  const flight={crouched:j>10,aim:true};a.animate(j*.016,false,0,0,1,.016,flight);b.animate(j*.016,false,0,0,1,.016,flight);
  const A=a.jointPositions(),B=b.jointPositions();for(const joint of ['pelvis','leftHip','rightHip','leftAnkle','rightAnkle'])assert.ok(a.root.worldToLocal(A[joint]).distanceTo(b.root.worldToLocal(B[joint]))<1e-5,joint+': elevation, orientation and avatar height do not change the local planted pose');
 }a.dispose();b.dispose();
});

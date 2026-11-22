import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createHideoutNanoChambers,NANO_ARMOR_TIERS} from '../dist/hideout-nano-chambers.js';

test('five material tiers retain the canonical ten-step game armour progression',()=>{
 assert.deepEqual(NANO_ARMOR_TIERS.map(t=>t.gameLevel),[1,3,5,7,10]);
 assert.match(NANO_ARMOR_TIERS[0].name,/blanc/i);
 assert.match(NANO_ARMOR_TIERS[4].material,/carbotanium.*kevlar.*céramique/i);
});

test('both chambers start empty and have a separate bottom injection and articulated front door',()=>{
 const scene=new T.Scene();
 const forge=createHideoutNanoChambers(T,{scene,low:true,locations:[
  {hero:'ghju',x:-8.9,z:4.45},
  {hero:'lylu',x:-6.4,z:4.45}
 ]});
 assert.equal(scene.children.includes(forge.root),true);
 assert.equal(forge.root.children.length,2);
 assert.equal(forge.phase('ghju').loaded,false);
 assert.equal(forge.phase('lylu').loaded,false);
 assert.equal(forge.recover('ghju'),false,'door stays sealed without completed fabrication');
 assert.equal(forge.equip('ghju'),false,'cannot equip a suit before opening the completed chamber');
 assert.equal(forge.root.getObjectsByProperty('name','Porte avant vitrée / mobile').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Nanites injectées par le tuyau').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Vortex turbulent de nanoparticules').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Vortex volumétrique · sept turbulences').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Micro-vortex · condensation de la pièce').length,2);
 forge.update(1/60,.45);
 assert.equal(forge.phase('ghju').phase,'idle');
 assert.equal(forge.root.children[0].getObjectByName('Nanites injectées par le tuyau').count,0);
 for(const vortex of forge.root.getObjectsByProperty('name','Vortex volumétrique · sept turbulences')){
  assert.ok([...vortex.geometry.attributes.position.array].every(Number.isFinite));
 }
 forge.dispose();
 assert.equal(scene.children.includes(forge.root),false);
});

test('native suit stays fixed above the deck and leaves the capsule after equipment transfer',async()=>{
 const scene=new T.Scene();let animations=0,installedModel=null;
 const installSoldier=async(T,into)=>{
  const root=new T.Group(),feet=[];
  for(const side of [-1,1]){
   const foot=new T.Group();foot.position.x=side*.16;
   const sole=new T.Mesh(new T.BoxGeometry(.22,.20,.36),new T.MeshStandardMaterial());
   sole.position.y=-.14;foot.add(sole);root.add(foot);feet.push(foot);
  }
  const breast=new T.Mesh(new T.BoxGeometry(.6,1.25,.32),new T.MeshStandardMaterial());
  breast.position.y=1.1;root.add(breast);
  const cape=new T.Mesh(new T.PlaneGeometry(.55,.9),new T.MeshStandardMaterial());
  cape.name='Shadow / cape dorsale tissée';cape.position.y=1.25;root.add(cape);
  into.add(root);
  const model={root,feet,shadowUnit:{gear:{ready:Promise.resolve(true)}},setLevel(){},
   animate(){animations++;},dispose(){}};
  installedModel=model;
  return{model,dispose(){root.removeFromParent();}};
 };
 const forge=createHideoutNanoChambers(T,{scene,low:true,
  locations:[{hero:'ghju',x:-8.9,z:4.45}],installSoldier});
 assert.equal(await forge.inject('ghju',5),true);
 const modelRoot=installedModel.root;
 assert.ok(forge.root.children.includes(modelRoot),'original rig is attached to the forge scene');
 const boots=new T.Box3();
 for(const foot of modelRoot.children.filter(o=>o.type==='Group'))boots.expandByObject(foot,true);
 assert.ok(Math.abs(boots.min.y-.315)<.001,'boot soles rest above the inner floor');
 forge.update(14,14);
 assert.equal(forge.phase('ghju').phase,'ready');
 assert.equal(forge.recover('ghju'),true);
 assert.equal(forge.equip('ghju'),true);
 forge.update(.5,14.5);
 assert.equal(forge.phase('ghju').phase,'equipped');
 assert.equal(modelRoot.visible,false,'the suit disappears once equipped');
 assert.equal(animations,1,'combat breathing animation only runs once to establish bind pose');
 assert.equal(await forge.inject('ghju',4),true,'the empty capsule can manufacture again');
 forge.dispose();
});

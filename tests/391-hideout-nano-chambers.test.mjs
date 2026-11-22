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
 assert.equal(forge.root.getObjectsByProperty('name','Porte avant vitrée / mobile').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Nanites injectées par le tuyau').length,2);
 assert.equal(forge.root.getObjectsByProperty('name','Vortex turbulent de nanoparticules').length,2);
 forge.update(1/60,.45);
 assert.equal(forge.phase('ghju').phase,'idle');
 assert.equal(forge.root.children[0].getObjectByName('Nanites injectées par le tuyau').count,0);
 forge.dispose();
 assert.equal(scene.children.includes(forge.root),false);
});

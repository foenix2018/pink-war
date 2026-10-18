import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun} from '../dist/weapons.js';
import {CHARACTERS} from '../dist/characters.js';
import {applyShadowMaterials,installShadowUnit} from '../dist/shadow-unit-game.js';

// The cape uses CanvasTexture but geometry, bone attachment and animation are
// testable headlessly without WebGL/DOM. No image bytes enter the test.
const makeCanvas=()=>({
  width:512,height:1024,
  getContext:()=>({
    createLinearGradient:()=>({addColorStop(){}}),
    fillRect(){},fillStyle:''
  })
});
const previousDocument=globalThis.document;
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return makeCanvas();}};

test.after(()=>{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});

const createHero=profile=>{
  const kit=createCharacterKit(new T.Texture());
  const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan']
    .map(key=>[key,new T.MeshStandardMaterial({color:0x728499})]));
  const makeGun=()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:parent=>{
    const object=new T.Object3D();parent.add(object);return object;
  }});
  const soldier=createSoldier(kit,makeGun,profile);
  return {kit,soldier};
};

for(const profile of CHARACTERS){
  test('Shadow Unit '+profile.id+' remains attached to real AEGIS bones in every tier',()=>{
    const {kit,soldier}=createHero(profile);
    applyShadowMaterials(kit,profile);
    const entry=installShadowUnit(soldier,profile);
    assert.equal(installShadowUnit(soldier,profile),entry,'install once');
    assert.equal(entry.profile,profile.id);
    assert.equal(entry.armour.helmet.parent,soldier.actor.bone('Head'));
    assert.equal(entry.armour.spine.parent,soldier.actor.bone('Spine2'));
    assert.equal(entry.cape.anchor.parent,soldier.body);
    soldier.root.updateMatrixWorld(true);
    const top=entry.cape.anchor.getWorldPosition(new T.Vector3());
    const expected=soldier.root.localToWorld(new T.Vector3(0,1.535,.166));
    assert.ok(top.distanceTo(expected)<1e-5,'cape attachment sits behind the shoulders');
    assert.equal(entry.armour.helmet.name,'Shadow V6 / casque tactique polygonal');
    assert.ok(entry.cape.anchor.children.length,'black cape is present');

    for(const level of [1,7,10,3,1]){
      soldier.setLevel(level);
      const hidden=soldier.armor.parts.some(mesh=>mesh.geometry.userData.shadowHelmetFiltered);
      assert.equal(hidden,true,'base helmet hidden even after armour tier change');
      soldier.animate(level*.09,level%2===0,0,0,0,.016,{sprint:level===10});
      const positions=entry.cape.anchor.children[0].geometry.attributes.position.array;
      assert.ok(positions.every(Number.isFinite),'every cloth vertex stays finite');
    }
    assert.equal(soldier.nativeSkeleton.bones.length,34);
    assert.equal(soldier.equipmentLevel,1);
    assert.equal(kit.armorMaterials.rose.color.getHex(),0x232630);
    // Per-character edge color is independent of the other hero's materials.
    const edges=entry.cape.anchor.children[0].children;
    assert.equal(edges[0].material.color.getHex(),profile.masculine?0x62b8ff:0xf24797);
    soldier.dispose();
  });
}

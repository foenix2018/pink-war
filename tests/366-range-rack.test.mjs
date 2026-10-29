import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {WEAPONS} from '../dist/game-logic.js';
import {ShootingRangeGame,RANGE_ARMORY,RANGE_ARMORY_SLOTS,RANGE_WEAPON_SLOTS,traceRangeArmory} from '../dist/shooting-range.js';
import {createShootingRangeArt} from '../dist/shooting-range-art.js';

test('the eight-bay rack is wider, equally spaced, and selectable at the displayed position',()=>{
  assert.equal(RANGE_WEAPON_SLOTS.length,8);
  assert.ok(RANGE_ARMORY.width>=9,'large cabinet across the rear wall');
  assert.ok(RANGE_ARMORY.height>=2.8,'clearance above long guns');
  assert.equal(RANGE_ARMORY_SLOTS.length,8);
  for(let i=0;i<RANGE_ARMORY_SLOTS.length;i++){
    const slot=RANGE_ARMORY_SLOTS[i],hit=traceRangeArmory({x:slot.x,y:slot.y,z:32.8},{x:0,y:0,z:1});
    assert.equal(hit?.index,slot.index);
    assert.ok(Math.abs(slot.x)+slot.width/2<RANGE_ARMORY.width/2);
    if(i>0)assert.ok(slot.x-slot.width/2>RANGE_ARMORY_SLOTS[i-1].x+RANGE_ARMORY_SLOTS[i-1].width/2,'positive aisle between adjacent weapons');
  }
  assert.equal(WEAPONS[RANGE_WEAPON_SLOTS.at(-1)].id,'vortex');
});
test('ray, direct touch and visual highlight use matching rack slots for both characters',()=>{
  const art=createShootingRangeArt(T,new T.Scene());
  for(const hero of ['ghju','lylu']){
    const game=new ShootingRangeGame(art.obstacles,()=>.5,0,hero);
    Object.assign(game.player,{x:0,z:32.2});
    for(const slot of RANGE_ARMORY_SLOTS){
      const ray=game.armoryTarget({x:slot.x,y:slot.y,z:32.8},{x:0,y:0,z:1});
      const near=game.armoryHandTarget({x:slot.x,y:slot.y,z:slot.z-.17});
      const expected=(hero==='lylu'&&slot.index===7)?null:slot.index;
      assert.equal(ray?.index??null,expected,hero+' / ray / '+slot.index);
      assert.equal(near?.index??null,expected,hero+' / hand / '+slot.index);
      art.setArmoryHover(slot.index);
      const highlight=art.root.getObjectByName('Armoire / arme pointée');
      assert.equal(highlight.position.x,slot.x);
      assert.equal(highlight.position.y,slot.y);
    }
  }
  art.dispose();
});
test('long real weapon silhouettes are fitted inside all eight wider compartments without enlarging them',()=>{
  const art=createShootingRangeArt(T,new T.Scene());
  const geometry=new T.BoxGeometry(1.7,1.3,.52),material=new T.MeshStandardMaterial();
  const sources=Array.from({length:9},()=>{const group=new T.Group();group.add(new T.Mesh(geometry,material));return group;});
  const display=art.root.getObjectByName('Armes exposées / armoire du stand');
  art.setArmoryModels(sources,1,'ghju');
  assert.equal(art.stats().armoryModels,8);
  display.updateWorldMatrix(true,true);
  for(const bay of display.children){
    const slot=RANGE_ARMORY_SLOTS.find(x=>x.index===bay.userData.weaponIndex);
    assert.ok(slot);
    assert.equal(bay.position.x,slot.x);
    if(!bay.children.length)continue;
    const bound=new T.Box3().setFromObject(bay),size=bound.getSize(new T.Vector3());
    assert.ok(size.x<=slot.width+.02,'no horizontal overflow / '+slot.index+': '+size.x);
    assert.ok(size.y<=slot.height+.04,'no vertical overflow / '+slot.index+': '+size.y);
  }
  art.setArmoryModels(sources,2,'lylu');assert.equal(art.stats().armoryModels,7);
  art.dispose();geometry.dispose();material.dispose();
});

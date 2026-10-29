import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.webgpu.min.js';
import {createVortexAR7,updateVortexAmmo} from '../dist/vortex-ar7.js';
import {WEAPONS} from '../dist/game-logic.js';
import {WEAPON_FRAME,OPTICS} from '../dist/weapons.js';

test('VORTEX AR-7 is appended without changing earlier weapon slots',()=>{
 assert.equal(WEAPONS[7].id,'duor9');
 assert.equal(WEAPONS[8].id,'vortex');
 assert.equal(WEAPON_FRAME[8].id,'vortex');
 assert.equal(WEAPONS[8].capacity,36);
 assert.equal(OPTICS.vortex.magnification,1.30);
});

test('approved metallic V5 mesh and translucent optic are in the correct grip frame',()=>{
 const gun=createVortexAR7();
 assert.equal(gun.userData.modelName,'VORTEX AR-7 V5');
 assert.equal(gun.userData.authoredOptic,true);
 assert.equal(gun.userData.integratedEmitter,true);
 const bounds=new THREE.Box3().setFromObject(gun);
 assert.ok(bounds.containsPoint(new THREE.Vector3(0,0,0)));
 assert.ok(Math.abs(bounds.min.z-WEAPON_FRAME[8].muzzle[2])<.035);
 const lens=gun.getObjectByName('VORTEX / optic');
 assert.ok(lens?.material.transparent && lens.material.opacity<.5);
 assert.ok(gun.getObjectByName('VORTEX / solid')?.geometry.attributes.position.count>10000);
});

test('pink 36-cell counters on both flanks reflect actual ammo and remain independent per clone',()=>{
 const gun=createVortexAR7(),other=createVortexAR7();
 const rail=gun.getObjectByName('VORTEX / live pink ammo');
 const otherRail=other.getObjectByName('VORTEX / live pink ammo');
 assert.equal(rail.count,72);
 const color=new THREE.Color(),off=new THREE.Color(0x19141e),on=new THREE.Color(0xff3fa1);
 updateVortexAmmo(gun,18,36);
 rail.getColorAt(17,color);assert.ok(color.getHex()===on.getHex());
 rail.getColorAt(18,color);assert.ok(color.getHex()===off.getHex());
 rail.getColorAt(53,color);assert.ok(color.getHex()===on.getHex());
 rail.getColorAt(54,color);assert.ok(color.getHex()===off.getHex());
 updateVortexAmmo(other,0,36);
 otherRail.getColorAt(0,color);assert.ok(color.getHex()===off.getHex());
 rail.getColorAt(0,color);assert.ok(color.getHex()===on.getHex());
 updateVortexAmmo(gun,36,36);rail.getColorAt(71,color);assert.ok(color.getHex()===on.getHex());
});

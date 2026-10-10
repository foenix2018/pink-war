import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { bevelBox, Assembly, profile, limb } from '../dist/geo.js';
import { WEAPON_FRAME, createWeaponModels, buildGun } from '../dist/weapons.js';
import { createGlove, GRIP } from '../dist/hands.js';
import { createCharacterKit, createSoldier } from '../dist/soldier.js';
import { CHARACTERS } from '../dist/characters.js';

const neon = c => new T.MeshBasicMaterial({ color: c }), solid = c => new T.MeshStandardMaterial({ color: c });
const mats = () => ({ dark: solid(1), steel: solid(2), armor: solid(3), armorLight: solid(4), rose: neon(5), pale: neon(6), violet: neon(7), cyan: neon(8) });
const finite = geometry => Array.from(geometry.attributes.position.array).every(Number.isFinite);
const box = object => new T.Box3().setFromObject(object);
const kit = () => createCharacterKit(new T.Texture());
const flash = parent => { const sprite = new T.Object3D(); parent.add(sprite); return sprite; };

test('bevelBox keeps its metric size, rounds its corners and has unit normals', () => {
  const g = bevelBox(.4, .1, .2, .03, 3); g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  assert.ok(Math.abs(max.x - .2) < 1e-6 && Math.abs(min.y + .05) < 1e-6 && Math.abs(max.z - .1) < 1e-6);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 1e-6);
  // The sharp corner (.2, .05, .1) is cut: no vertex sits in it.
  for (let i = 0; i < p.count; i++) assert.ok(Math.hypot(p.getX(i) - .2, p.getY(i) - .05, p.getZ(i) - .1) > .02);
});

test('an assembly emits one mesh per material and shows only the pieces of the current level', () => {
  const a = new Assembly(), red = solid(1), blue = neon(2), group = new T.Group();
  a.box(red, [.1, .1, .1], [0, 0, 0]); a.box(red, [.1, .1, .1], [1, 0, 0]); a.box(blue, [.1, .1, .1], [2, 0, 0], [0, 0, 0], .01, true, 4);
  a.limb(red, [0, 0, 0], [0, 1, 0], .05, .03, true, 7, 9);
  a.mount(group); assert.equal(group.children.length, 2, 'two materials, two meshes');
  a.setLevel(1); assert.equal(a.count, 2); assert.equal(group.children.length, 1);
  a.setLevel(4); assert.equal(a.count, 3); a.setLevel(7); assert.equal(a.count, 4); a.setLevel(10); assert.equal(a.count, 3);
  for (const mesh of group.children) assert.ok(finite(mesh.geometry));
});

test('a profile is extruded across its width, with the outline along z and y', () => {
  const g = profile([[0, 0], [-.4, 0], [-.4, .1], [0, .1]], .05, .004); g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  assert.ok(Math.abs((max.x - min.x) - .05) < 1e-3 && Math.abs((max.z - min.z) - .408) < 2e-3 && Math.abs((max.y - min.y) - .108) < 2e-3);
  assert.ok(finite(limb([0, 0, 0], [1, 1, 0], .1, .05)));
});

test('every weapon is drawn around the grip: the origin is inside the model and the muzzle is its front', () => {
  const models = createWeaponModels(mats());
  assert.equal(models.length, 5); assert.equal(WEAPON_FRAME.length, 5);
  models.forEach((model, index) => {
    const frame = WEAPON_FRAME[index], b = box(model);
    assert.ok(b.containsPoint(new T.Vector3(0, 0, 0)), `${frame.id}: the palm is inside the weapon's bounds`);
    assert.ok(Math.abs(b.min.z - frame.muzzle[2]) < .03, `${frame.id}: the muzzle is at the front of the model`);
    assert.ok(frame.muzzle[1] > 0 && frame.muzzle[1] < b.max.y + 1e-6, `${frame.id}: the barrel sits above the grip`);
    assert.ok(b.max.z < .21, `${frame.id}: the stock stays short of the shooter's face`);
    let meshes = 0; model.traverse(o => { if (o.isMesh) { meshes++; assert.ok(finite(o.geometry)); } });
    assert.ok(meshes >= 3 && meshes <= 9, `${frame.id}: merged into a handful of meshes (${meshes})`);
    if (frame.support) assert.ok(frame.support[2] < -.15 && frame.support[2] > b.min.z, `${frame.id}: the free hand holds the front half`);
  });
  assert.equal(WEAPON_FRAME.filter(f => !f.support).length, 1, 'only the pistol is one-handed');
});

test('weapons built twice share their geometry', () => {
  const shared = mats(), a = createWeaponModels(shared), b = createWeaponModels(shared);
  a.forEach((model, i) => { assert.notEqual(model, b[i]); assert.equal(model.children[0].geometry, b[i].children[0].geometry); });
});

test('the glove wraps the grip: fingers on the front strap, thumb on the left panel, index on the trigger', () => {
  const gloves = kit().gloves, hand = createGlove(gloves);
  const b = box(hand);
  assert.ok(b.min.x < -.02 && b.max.x > .04, 'palm on the right, fingertips and thumb past the left panel');
  assert.ok(b.min.z < -.04, 'fingers wrap the front of the grip and the index reaches the trigger');
  assert.ok(b.max.z > .09, 'the back of the hand runs to the wrist');
  assert.ok(Math.abs(GRIP.wrist[0] - .03) < 1e-9 && GRIP.wrist[2] > .09);
  hand.traverse(o => { if (o.isMesh) assert.ok(finite(o.geometry)); });
  const count = () => hand.userData.assembly.count;
  hand.userData.setLevel(1); const base = count(); hand.userData.setLevel(4); assert.ok(count() > base, 'the gauntlet appears at level 4');
  const bare = createGlove(gloves, { sleeve: false }); assert.ok(box(bare).max.z < box(hand).max.z, 'no sleeve without a forearm');
  assert.equal(createGlove(gloves, { mirror: true }).scale.x, -1);
});

test('the gun carries the glove, the muzzle glow and a second glove only for two-handed weapons', () => {
  const gun = buildGun({ mats: mats(), gloves: kit().gloves, makeFlash: flash });
  assert.ok(gun.userData.hand && gun.userData.support && gun.userData.flash);
  WEAPON_FRAME.forEach((frame, i) => {
    gun.userData.setVariant(i);
    assert.equal(gun.userData.index, i); assert.deepEqual(gun.userData.flash.position.toArray(), [...frame.muzzle]);
    assert.equal(gun.userData.support.visible, !!frame.support);
    if (frame.support) assert.deepEqual(gun.userData.support.position.toArray(), [...frame.support]);
    assert.equal(gun.children.filter(c => c.visible && c.userData.frame).length, 1, 'one weapon model at a time');
  });
  gun.userData.showSupport = false; gun.userData.setVariant(1); assert.equal(gun.userData.support.visible, false, 'the free controller of a headset is the free hand');
});

// Solved arms must keep their bone lengths and put each wrist exactly on its glove.
test('soldier arms reach the grip and the foregrip of every weapon', () => {
  for (const profileInfo of CHARACTERS) {
    const k = kit(), soldier = createSoldier(k, o => buildGun({ mats: mats(), gloves: k.gloves, sleeve: o.sleeve !== false, makeFlash: flash }), profileInfo);
    const scene = new T.Scene(); scene.add(soldier.root);
    WEAPON_FRAME.forEach((frame, index) => {
      soldier.setWeapon(index); soldier.root.updateMatrixWorld(true);
      const [left, right] = soldier.arms;
      const wrist = (arm) => arm.shoulder.localToWorld(arm.wrist.clone());
      const palm = soldier.gun.userData.hand.localToWorld(new T.Vector3(...GRIP.wrist));
      assert.ok(wrist(right).distanceTo(palm) < 1e-3, `${profileInfo.id}/${frame.id}: the right wrist is on the glove`);
      const other = frame.support ? soldier.gun.userData.support : soldier.root.children.find(c => c.userData.setLevel && c !== soldier.body) || soldier.body.children.find(c => c.userData.setLevel && c !== soldier.gun.parent);
      assert.ok(other, 'a left glove exists');
      const target = other.localToWorld(new T.Vector3(...GRIP.wrist));
      assert.ok(wrist(left).distanceTo(target) < 1e-3, `${profileInfo.id}/${frame.id}: the left wrist is on its glove`);
      for (const arm of soldier.arms) {
        assert.ok(Math.abs(arm.elbow.length() - .31) < 1e-4, 'upper arm keeps its length');
        assert.ok(Math.abs(arm.wrist.clone().sub(arm.elbow).length() - .35) < 1e-4, 'forearm keeps its length');
      }
      assert.equal(soldier.weapon, index);
    });
  }
});

test('the soldier gains armour with each level and keeps a small number of meshes', () => {
  const k = kit(), soldier = createSoldier(k, o => buildGun({ mats: mats(), gloves: k.gloves, sleeve: false, makeFlash: flash }), CHARACTERS[1]);
  let previous = 0;
  for (let level = 1; level <= 10; level++) { soldier.setLevel(level); assert.equal(soldier.equipmentLevel, level); assert.ok(soldier.visibleParts > previous, `level ${level} adds parts`); previous = soldier.visibleParts; assert.ok(soldier.batchCount < 110); }
  soldier.setLevel(99); assert.equal(soldier.equipmentLevel, 10); soldier.setLevel(0); assert.equal(soldier.equipmentLevel, 1);
});

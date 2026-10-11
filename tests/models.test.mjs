import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { bevelBox, Assembly, profile, limb, loft } from '../dist/geo.js';
import { createEnemyFactory } from '../dist/enemies.js';
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
      const other = frame.support ? soldier.gun.userData.support : soldier.rig.children.find(c => c.userData.setLevel && c !== soldier.gun.parent);
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

test('the soldier rig has planted, articulated steps and keeps both hands on the weapon while moving', () => {
  for (const profileInfo of CHARACTERS) {
    const k=kit(),soldier=createSoldier(k,o=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),profileInfo);
    const scene=new T.Scene();scene.add(soldier.root);soldier.root.position.z=-.1;
    soldier.animate(.5,true,0,0,0,.016);soldier.root.updateMatrixWorld(true);
    assert.equal(soldier.hips.parent,soldier.root);assert.equal(soldier.spine.parent,soldier.hips);assert.equal(soldier.body.parent,soldier.spine);
    assert.ok(soldier.legs.some(leg=>Math.abs(leg.rotation.x)>.05),'thighs alternate through the step');
    assert.ok(soldier.knees.some(knee=>Math.abs(knee.rotation.x)>.1),'the knees flex during swing');
    assert.ok(soldier.feet.some(foot=>Math.abs(foot.rotation.x)>.02),'the boot rolls at the ankle');
    for(const [index,frame] of WEAPON_FRAME.entries()){
      soldier.root.position.z-=.1;soldier.setWeapon(index);soldier.animate(.5+index*.02,true,0,0,0,.016);soldier.root.updateMatrixWorld(true);
      const [left,right]=soldier.arms,wrist=arm=>arm.shoulder.localToWorld(arm.wrist.clone());
      const palm=soldier.gun.userData.hand.localToWorld(new T.Vector3(...GRIP.wrist));
      const other=frame.support?soldier.gun.userData.support:soldier.rig.children.find(child=>child.userData.setLevel&&child!==soldier.gun.parent);
      const freePalm=other.localToWorld(new T.Vector3(...GRIP.wrist));
      assert.ok(wrist(right).distanceTo(palm)<1e-3,`${profileInfo.id}/${frame.id}: weapon hand remains on the grip while walking`);
      assert.ok(wrist(left).distanceTo(freePalm)<1e-3,`${profileInfo.id}/${frame.id}: support hand remains aligned while walking`);
    }
    assert.ok([...soldier.legs,...soldier.knees,...soldier.feet].every(bone=>Number.isFinite(bone.rotation.x)));
  }
});

test('RLH-derived joints are anatomical, planted, and respond to crouched fire', () => {
  for (const profileInfo of CHARACTERS) {
    const k=kit(),soldier=createSoldier(k,()=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),profileInfo);
    const positions=()=>soldier.jointPositions();
    soldier.animate(.1,false,0,0,0,.016,{crouched:false});const standing=positions();
    for(let i=0;i<18;i++)soldier.animate(.12+i*.016,false,0,0,1,.016,{crouched:true,firing:true});
    const low=positions();
    for(const side of ['left','right']){
      assert.ok(standing[side+'Hip'].y-low[side+'Hip'].y>.17,side+' hip lowers');
      assert.ok(Math.abs(low[side+'Ankle'].y-standing[side+'Ankle'].y)<.09,side+' ankle stays grounded');
      assert.ok(low[side+'Knee'].y<standing[side+'Knee'].y,side+' knee bends');
      assert.ok(low[side+'Shoulder'].distanceTo(low[side+'Elbow'])>.12,'shoulder-elbow is non-zero');
      assert.ok(low[side+'Elbow'].distanceTo(low[side+'Wrist'])>.12,'elbow-wrist is non-zero');
    }
    for(const position of Object.values(low))assert.ok([position.x,position.y,position.z].every(Number.isFinite));
    soldier.animate(1,true,0,0,1,.05,{crouched:true,firing:true});
    const stepping=positions();
    assert.notDeepEqual(stepping.leftKnee.toArray(),low.leftKnee.toArray(),'low armed locomotion is animated');
  }
});

test('the soldier gains armour with each level and keeps a small number of meshes', () => {
  const k = kit(), soldier = createSoldier(k, o => buildGun({ mats: mats(), gloves: k.gloves, sleeve: false, makeFlash: flash }), CHARACTERS[1]);
  let previous = 0;
  for (let level = 1; level <= 10; level++) { soldier.setLevel(level); assert.equal(soldier.equipmentLevel, level); assert.ok(soldier.visibleParts > previous, `level ${level} adds parts`); previous = soldier.visibleParts; assert.ok(soldier.batchCount < 110); }
  soldier.setLevel(99); assert.equal(soldier.equipmentLevel, 10); soldier.setLevel(0); assert.equal(soldier.equipmentLevel, 1);
});

test('an anatomical loft is sealed from all directions, with outward-facing end caps', () => {
  const g=loft([[-.2,.08,.09],[0,.17,.16],[.2,.07,.08]],20);
  const mesh=new T.Mesh(g,solid(1));mesh.updateMatrixWorld(true);
  assert.ok(finite(g));
  for(const direction of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
    const origin=new T.Vector3(...direction);
    assert.ok(new T.Raycaster(origin,origin.clone().negate().normalize()).intersectObject(mesh).length,`closed at ${direction}`);
  }
});

test('both soldiers keep an opaque, fully enclosing helmet at every armour level', () => {
  for(const character of CHARACTERS) {
    const k=kit(),soldier=createSoldier(k,o=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),character);
    assert.equal(k.materials.skin,undefined,'no face geometry or skin material is generated');
    assert.equal(k.materials.hair,undefined,'hair cannot protrude through the shell');
    for(let level=1;level<=10;level++) {
      soldier.setLevel(level);soldier.root.updateMatrixWorld(true);
      const center=soldier.head.localToWorld(new T.Vector3());
      for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++) {
        if(!x&&!y&&!z)continue;
        const origin=soldier.head.localToWorld(new T.Vector3(x,y,z));
        const hits=new T.Raycaster(origin,center.clone().sub(origin).normalize()).intersectObject(soldier.head,true);
        assert.ok(hits.length,`${character.id}/${level}: helmet is closed from ${x},${y},${z}`);
        assert.ok(hits.every(hit=>!hit.object.material.transparent&&hit.object.material.opacity===1),'visor and shell are fully opaque');
      }
    }
  }
});

test('all hostile variants share detailed geometry and animate their complete legs without extra draw calls', () => {
  const material={monster:solid(1),monsterElite:solid(2),monsterFace:solid(3),rose:neon(4),violet:neon(5),cyan:neon(6)},factory=createEnemyFactory(material);
  for(const elite of [false,true])for(const ranged of [false,true]) {
    const a=factory.create(elite,ranged),b=factory.create(elite,ranged);
    assert.equal(a.children.length,6,'six meshes per enemy, as before the graphical update');
    let triangles=0;
    a.children.forEach((mesh,i)=>{assert.equal(mesh.geometry,b.children[i].geometry,'geometry is shared within an enemy type');assert.ok(finite(mesh.geometry));triangles+=mesh.geometry.attributes.position.count/3;});
    assert.ok(triangles<9500,'detail stays within the mobile geometry budget');
    const before=box(a);assert.ok(before.min.y>=0&&before.max.y<2.8,'boots stay on the ground');
    a.userData.animate(.2,.4,true);a.updateMatrixWorld(true);
    assert.ok(a.userData['leg-1'].rotation.x!==0);
    assert.ok(a.userData['leg-1'].rotation.x===-a.userData.leg1.rotation.x);
    a.userData.animate(0,0,false);assert.ok(a.userData.leg1.rotation.x===0);
  }
});

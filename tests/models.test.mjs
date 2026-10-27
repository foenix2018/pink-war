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
const box = object => { object.updateMatrixWorld(true); return new T.Box3().setFromObject(object,true); };
const kit = () => createCharacterKit(new T.Texture());
const flash = parent => { const sprite = new T.Object3D(); parent.add(sprite); return sprite; };

test('glove digits have individually driven knuckle pivots and visible trigger flexion',()=>{
  const k=kit(),hand=createGlove(k.gloves);
  assert.equal(hand.userData.fingerJoints.length,5);
  const before=hand.userData.fingerJoints[3].rotation.x;
  for(let i=0;i<15;i++)hand.userData.animate({trigger:1,grip:.85},.016);
  assert.ok(Math.abs(hand.userData.fingerJoints[3].rotation.x-before)>.28);
  assert.ok(Math.abs(hand.userData.fingerJoints[0].rotation.x)>.1);
  const first=hand.userData.fingerJoints[0].rotation.x,last=hand.userData.fingerJoints[2].rotation.x;
  assert.notEqual(first,last,'finger curl is staggered rather than uniform');
});

test('RLH gloves retain their anatomical joints, shared detail and private controller poses',()=>{
  const k=kit(),right=createGlove(k.gloves),left=createGlove(k.gloves,{mirror:true});
  const skins=hand=>hand.userData.rlh.userData.parts.map(part=>part.mesh);
  assert.equal(right.userData.source,'RLH V40');
  assert.equal(right.userData.skeleton.bones.length,28,'wrist stages, thumb opposition and finger joints come from RLH');
  assert.equal(right.userData.digitBones.length,5);assert.ok(right.userData.digitBones.every(chain=>chain.length===3));
  assert.notEqual(right.userData.skeleton,left.userData.skeleton);
  assert.ok(skins(right).length<=14,'RLH details are grouped by material rather than one draw per stitch');
  for(const [i,mesh] of skins(right).entries()){
    const g=mesh.geometry,weights=g.attributes.skinWeight,indices=g.attributes.skinIndex;
    assert.ok(indices.array instanceof Float32Array,'shared gloves remain drawable after the WebGPU to WebGL transition');
    assert.equal(g,skins(left)[i].geometry);assert.ok(finite(g));assert.equal(weights.count,g.attributes.position.count);
    for(let v=0;v<weights.count;v++){
      assert.ok(Math.abs(weights.getX(v)+weights.getY(v)+weights.getZ(v)+weights.getW(v)-1)<1e-6);
      for(const read of ['getX','getY','getZ','getW'])assert.ok(indices[read](v)<28);
    }
  }
  const skin=skins(right).find(mesh=>mesh.name==='RLH carbone'),indices=skin.geometry.attributes.skinIndex;
  const bone=right.userData.skeleton.bones.indexOf(right.userData.digitBones[3][1]);
  const vertices=Array.from({length:indices.count},(_,i)=>i).filter(i=>indices.getX(i)===bone);
  assert.ok(vertices.length>0,'index protective plate stays bound to its actual finger bone');
  right.updateMatrixWorld(true);right.userData.skeleton.update();
  const before=vertices.map(vertex=>skin.getVertexPosition(vertex,new T.Vector3()));
  const untouched=left.userData.skeleton.bones.map(b=>b.quaternion.toArray());
  for(let i=0;i<18;i++)right.userData.animate({trigger:1,grip:.8},.016);
  right.updateMatrixWorld(true);right.userData.skeleton.update();
  const travel=vertices.map((vertex,i)=>skin.getVertexPosition(vertex,new T.Vector3()).distanceTo(before[i]));
  assert.ok(Math.max(...travel)>.005,'outer carbon plate moves with trigger flexion instead of floating on the palm');
  assert.deepEqual(left.userData.skeleton.bones.map(b=>b.quaternion.toArray()),untouched);
  const finger=right.userData.rig.doigts.index,tip=finger.artic[2].localToWorld(new T.Vector3(0,finger.d.L[2],0));
  assert.ok(tip.distanceTo(new T.Vector3(0,.032,-.036))<.008,'an adult-length index pad actually meets the existing trigger');
  for(let i=0;i<18;i++)left.userData.animate({trigger:1,grip:.8},.016);
  for(let i=0;i<28;i++)assert.deepEqual(left.userData.skeleton.bones[i].quaternion.toArray(),right.userData.skeleton.bones[i].quaternion.toArray());
  const label=hand=>hand.userData.rlh.userData.parts.find(({part})=>part.key==='label').mesh.material;
  const rightLabel=label(right),leftLabel=label(left);
  right.userData.animate({},.016,-1);assert.equal(label(right),leftLabel,'a VR hand reflected by its controller switches to the readable left label');
  right.userData.animate({},.016,1);assert.equal(label(right),rightLabel);
  for(let i=0;i<18;i++)left.userData.animate({relax:1},.016);
  left.updateMatrixWorld(true);left.userData.skeleton.update();
  for(const mesh of skins(left))for(let v=0;v<mesh.geometry.attributes.position.count;v+=7){
    const point=mesh.getVertexPosition(v,new T.Vector3());assert.ok(mesh.boundingBox.containsPoint(point)&&mesh.boundingSphere.containsPoint(point));
  }
  right.userData.skeleton.computeBoneTexture();let disposed=0;
  right.userData.skeleton.boneTexture.addEventListener('dispose',()=>disposed++);
  let sharedDisposed=0;skin.geometry.addEventListener('dispose',()=>sharedDisposed++);
  right.userData.dispose();right.userData.dispose();assert.equal(disposed,1);assert.equal(sharedDisposed,0);assert.ok(finite(skins(left)[0].geometry));
});

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
  assert.equal(models.length,8);assert.equal(WEAPON_FRAME.length,8);
  models.forEach((model, index) => {
    const frame = WEAPON_FRAME[index], b = box(model);
    assert.ok(b.containsPoint(new T.Vector3(0, 0, 0)), `${frame.id}: the palm is inside the weapon's bounds`);
    if(!frame.melee)assert.ok(Math.abs(b.min.z - frame.muzzle[2]) < .03, `${frame.id}: the muzzle is at the front of the model`);
    assert.ok(frame.muzzle[1] > 0 && frame.muzzle[1] < b.max.y + 1e-6, `${frame.id}: the barrel sits above the grip`);
    assert.ok(b.max.z < (frame.id==='m12'?.35:.21), `${frame.id}: the stock stays short of the shooter's face`);
    let meshes = 0; model.traverse(o => { if (o.isMesh) { meshes++; assert.ok(finite(o.geometry)); } });
    assert.ok(meshes >= 3 && meshes <= (frame.dual||frame.id==='lance'?18:9), `${frame.id}: merged into a handful of meshes (${meshes})`);
    if (frame.support&&!frame.dual) assert.ok(frame.support[2] < -.15 && frame.support[2] > b.min.z, `${frame.id}: the free hand holds the front half`);
  });
  assert.equal(WEAPON_FRAME.filter(f=>!f.support).length,2,'pistol and sabre are one-handed');
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
    if (frame.support) assert.deepEqual(gun.worldToLocal(gun.userData.support.getWorldPosition(new T.Vector3())).toArray(), [...frame.support]);
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
        assert.ok(Math.abs(arm.elbow.length() - arm.fore.position.length()) < 1e-4, 'native upper arm keeps its length');
        assert.ok(Math.abs(arm.wrist.clone().sub(arm.elbow).length() - arm.hand.position.length()) < 1e-4, 'native forearm keeps its length');
      }
      assert.equal(soldier.weapon, index);
    });
  }
});

test('both equipped avatars have calibrated human heights and aligned hip sockets',()=>{
  for(const profileInfo of CHARACTERS){
    const k=kit(),soldier=createSoldier(k,o=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),profileInfo);
    soldier.root.scale.setScalar(soldier.heightScale);
    soldier.animate(.1,false,0,0,0,.016);
    const b=box(soldier.root),measured=b.max.y-b.min.y;
    const desired=profileInfo.masculine?1.80:1.70;
    assert.ok(Math.abs(measured-desired)<.016,profileInfo.id+' should be life-size');
    const j=soldier.jointPositions();
    assert.ok(Math.abs(j.leftHip.x+j.rightHip.x)<.012,'pelvis should be centered');
    assert.ok(Math.abs(j.leftHip.x)<.19&&Math.abs(j.rightHip.x)<.19,'hip sockets should not float outside pelvis');
    assert.ok(j.leftKnee.y<j.leftHip.y&&j.leftAnkle.y<j.leftKnee.y,'leg joints in anatomical order');
  }
});

test('the soldier rig has planted, articulated steps and keeps both hands on the weapon while moving', () => {
  for (const profileInfo of CHARACTERS) {
    const k=kit(),soldier=createSoldier(k,o=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),profileInfo);
    const scene=new T.Scene();scene.add(soldier.root);soldier.root.position.z=-.1;
    soldier.animate(.5,true,0,0,0,.016);soldier.root.updateMatrixWorld(true);
    assert.ok(soldier.hips.parent===soldier.root);assert.ok(soldier.spine.parent===soldier.hips);assert.ok(soldier.body.parent===soldier.actor.bone('Spine1'),'RLH retains its intermediate spine bone');
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

test('recoil travels through braced shoulders and recovers while wrists stay on all weapon grips',()=>{
  for(const profileInfo of CHARACTERS){
    const k=kit(),soldier=createSoldier(k,()=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),profileInfo);
    for(const [index,frame] of WEAPON_FRAME.entries()){
      soldier.setWeapon(index);soldier.animate(.1,false,0,0,0,.016,{firing:true});
      soldier.animate(.116,false,.16,.3,1,.016,{firing:true});
      const kick=soldier._recoilBody;assert.ok(kick>.3);
      assert.ok(Math.abs(soldier.body.rotation.x)>.006,'the native upper torso absorbs the impulse');
      for(let n=0;n<25;n++){
        soldier.animate(.132+n*.016,false,0,.3,0,.016,{firing:true});
        soldier.root.updateMatrixWorld(true);
        const [left,right]=soldier.arms,palm=soldier.gun.userData.hand.localToWorld(new T.Vector3(...GRIP.wrist));
        const other=frame.support?soldier.gun.userData.support:soldier.rig.children.find(child=>child.userData.setLevel&&child!==soldier.gun.parent);
        const freePalm=other.localToWorld(new T.Vector3(...GRIP.wrist));
        assert.ok(right.shoulder.localToWorld(right.wrist.clone()).distanceTo(palm)<1e-3,`${profileInfo.id}/${frame.id}: firing wrist`);
        assert.ok(left.shoulder.localToWorld(left.wrist.clone()).distanceTo(freePalm)<1e-3,`${profileInfo.id}/${frame.id}: supporting wrist`);
      }
      assert.ok(soldier._recoilBody<kick*.01,'shoulders return naturally after the gun settles');
    }
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
      const helmetParts=soldier.armor.parts;
      assert.ok(soldier.armor.template.items.some(i=>i.tag==='closed-helmet'),'the rendered replacement includes a complete opaque shell');
      helmetParts.forEach(mesh=>assert.ok(!mesh.material.transparent&&mesh.material.opacity===1));
      if(level!==1&&level!==10)continue;
      const center=soldier.head.localToWorld(new T.Vector3());
      for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++) {
        if(!x&&!y&&!z)continue;
        const origin=soldier.head.localToWorld(new T.Vector3(x,y,z));
        const hits=new T.Raycaster(origin,center.clone().sub(origin).normalize()).intersectObjects(helmetParts,false);
        assert.ok(hits.length,`${character.id}/${level}: helmet is closed from ${x},${y},${z}`);
        assert.ok(hits.some(hit=>hit.point.distanceTo(center)<.25),'the actual rendered helmet encloses its head center');
        assert.ok(hits.every(hit=>!hit.object.material.transparent&&hit.object.material.opacity===1),'visor and shell are fully opaque');
      }
    }
  }
});

test('hostile chassis share a bounded number of geometry batches while keeping independent skeletons', () => {
  const material={monster:solid(1),monsterElite:solid(2),monsterFace:solid(3),rose:neon(4),violet:neon(5),cyan:neon(6)},factory=createEnemyFactory(material);
  for(const form of ['stalker','scuttler','brute','seer','listener','bulwark'])for(const elite of [false,true])for(const ranged of [false,true]) {
    const a=factory.create(elite,ranged,form),b=factory.create(elite,ranged,form);
    const meshes=a.children.filter(child=>child.isMesh),otherMeshes=b.children.filter(child=>child.isMesh);
    assert.ok(meshes.length<=6,`${form}: shared armour, mechanisms, servos, caution paint and optics with per-enemy alert optics remain within six draw calls`);
    assert.notEqual(a.userData.skeleton,b.userData.skeleton,'enemies must animate independently');
    assert.equal(a.userData.legs.length,form==='scuttler'?6:2);
    let triangles=0;
    meshes.forEach((mesh,i)=>{
      assert.ok(mesh.isSkinnedMesh);assert.equal(mesh.skeleton,a.userData.skeleton);
      assert.equal(mesh.geometry,otherMeshes[i].geometry,'geometry is shared within an enemy type');
      assert.ok(finite(mesh.geometry));triangles+=mesh.geometry.attributes.position.count/3;
      const weights=mesh.geometry.attributes.skinWeight,indices=mesh.geometry.attributes.skinIndex;
      assert.ok(indices.array instanceof Float32Array,'shared enemy indices stay compatible with both renderers');
      for(let vertex=0;vertex<weights.count;vertex++){
        assert.equal(weights.getX(vertex)+weights.getY(vertex)+weights.getZ(vertex)+weights.getW(vertex),1);
        assert.ok(indices.getX(vertex)<a.userData.skeleton.bones.length,'every rigid armour plate follows a real joint');
      }
    });
    assert.ok(triangles<11000,`${form}: detailed geometry stays within the mobile budget (${triangles})`);
    a.userData.animate(0,0,false);a.updateMatrixWorld(true);
    const bounds=box(a),scale=a.scale.y;
    assert.ok(bounds.min.y>=-.005,'feet do not penetrate a level floor');
    assert.ok(bounds.max.y/scale<(form==='scuttler'?1.2:2.4),'each chassis preserves its combat silhouette');
    const otherPose=b.userData.skeleton.bones.map(joint=>joint.quaternion.toArray());
    for(let frame=1;frame<=15;frame++){a.position.z-=.04;a.userData.animate(frame*.016,.4,true);}
    assert.deepEqual(b.userData.skeleton.bones.map(joint=>joint.quaternion.toArray()),otherPose,'moving one clone leaves another untouched');
  }
});

test('enemy knees and ankles plant feet through locomotion and settle when the actor stops',()=>{
  const material={monster:solid(1),monsterElite:solid(2),monsterFace:solid(3),rose:neon(4),violet:neon(5),cyan:neon(6)},factory=createEnemyFactory(material);
  const point=new T.Vector3();
  for(const form of ['stalker','scuttler','brute','seer','listener','bulwark']){
    const actor=factory.create(false,false,form),crawler=form==='scuttler';actor.position.y=4.8;
    actor.userData.animate(0,.3,true);
    let kneeMotion=false,lifted=false;
    for(let frame=1;frame<=100;frame++){
      actor.position.z-=.04;actor.userData.animate(frame*.016,.3,true);actor.updateMatrixWorld(true);
      const floor=actor.position.y+(actor.userData.supportHeight??(crawler?.075:.125))*actor.scale.y;
      const feet=actor.userData.legs.map(leg=>leg.foot.getWorldPosition(point).y);
      assert.ok(feet.every(y=>y>=floor-1e-5),`${form}: ankles never dip under their support surface`);
      assert.ok(feet.filter(y=>Math.abs(y-floor)<1e-5).length>=(crawler?3:1),`${form}: each stride keeps a supporting foot or tripod`);
      if(feet.some(y=>y>floor+.03))lifted=true;
      if(actor.userData.legs.some(leg=>Math.abs(leg.lower.rotation.x)>.02||Math.abs(leg.lower.rotation.z)>.02))kneeMotion=true;
    }
    assert.ok(lifted&&kneeMotion,`${form}: legs bend and clear the ground during swing`);
    // The scene may still pass moving=true while AI waits to attack. Position is
    // the authority: no treadmill gait after velocity decays to rest.
    for(let frame=101;frame<=200;frame++)actor.userData.animate(frame*.016,.3,true);
    assert.equal(actor.userData.motionSpeed,0);
    const stoppedPhase=actor.userData.gaitPhase;
    actor.userData.animate(3.22,.3,true);assert.equal(actor.userData.gaitPhase,stoppedPhase);
    actor.updateMatrixWorld(true);
    const floor=actor.position.y+(actor.userData.supportHeight??(crawler?.075:.125))*actor.scale.y;
    for(const leg of actor.userData.legs)assert.ok(Math.abs(leg.foot.getWorldPosition(point).y-floor)<1e-5,`${form}: all feet settle flat`);
  }
});

test('the complete RLH body keeps native Idle Rifle and Rifle Walk clips with independent poses',()=>{
  const k=kit(),make=()=>createSoldier(k,()=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),CHARACTERS[1]),a=make(),b=make();
  assert.equal(a.nativeSkeleton.bones.length,34);
  assert.ok(a.actor.data.source.includes('RLH Mixamo'));
  assert.notEqual(a.nativeSkeleton,b.nativeSkeleton);
  a.actor.parts.forEach((part,i)=>{assert.equal(part.geometry,b.actor.parts[i].geometry);assert.ok(part.geometry.attributes.skinIndex.array instanceof Float32Array);});
  a.armor.parts.forEach(part=>assert.ok(part.geometry.attributes.skinIndex.array instanceof Float32Array));
  const rifle=a.actor.actions.rifle,walkRifle=a.actor.actions.walkRifle;
  assert.ok(Math.abs(rifle.getClip().duration-3.10)<.001);
  assert.ok(Math.abs(walkRifle.getClip().duration-1.366667)<.001);
  assert.ok(rifle.getClip().tracks.length>=29&&walkRifle.getClip().tracks.length>=35);
  const unchanged=b.nativeSkeleton.bones.map(bone=>bone.quaternion.toArray());
  for(let i=0;i<40;i++)a.animate(i*.016,false,0,0,1,.016,{aim:true});
  assert.equal(a.nativeMotion,'rifle');assert.ok(rifle.getEffectiveWeight()>.99);
  const still=a.jointPositions().leftKnee.clone();
  for(let i=0;i<40;i++){a.root.position.z-=.07;a.animate(.64+i*.016,true,0,0,1,.016,{aim:true});}
  assert.equal(a.nativeMotion,'walkRifle');assert.ok(walkRifle.getEffectiveWeight()>.99);
  assert.ok(Math.abs(a.jointPositions().leftKnee.y-still.y)>.005,'the original armed stride actually bends the leg');
  assert.deepEqual(b.nativeSkeleton.bones.map(bone=>bone.quaternion.toArray()),unchanged);
  k.setPalette(CHARACTERS[0].armor);assert.equal(a.actor.parts.find(p=>p.name==='RLH helmet').material.color.getHex(),CHARACTERS[0].armor.rose);
  k.setPalette(CHARACTERS[1].armor);assert.equal(a.actor.parts.find(p=>p.name==='RLH helmet').material.color.getHex(),CHARACTERS[1].armor.rose);
  a.dispose();b.dispose();
});

test('native RLH wrists meet the seven weapons throughout vertical recharge and crouched armed walking',()=>{
  const k=kit(),soldier=createSoldier(k,()=>buildGun({mats:mats(),gloves:k.gloves,sleeve:false,makeFlash:flash}),CHARACTERS[0]);soldier.root.scale.setScalar(soldier.heightScale);soldier.root.rotation.y=.8;
  for(const [index,frame] of WEAPON_FRAME.entries()){
    soldier.setWeapon(index);
    for(let i=0;i<25;i++){
      soldier.root.position.z-=.04;soldier.animate(i*.016,true,.1,Math.sin(i/24*Math.PI),1,.016,{crouched:i>10,firing:true});soldier.root.updateMatrixWorld(true);
      const targets=[frame.support?soldier.gun.userData.support:soldier.freeHand,soldier.gun.userData.hand];
      soldier.arms.forEach((arm,j)=>{
        const wrist=arm.hand.getWorldPosition(new T.Vector3()),glove=targets[j].localToWorld(new T.Vector3(...GRIP.wrist));
        assert.ok(wrist.distanceTo(glove)<.001,frame.id+': wrist stays attached during the vertical recharge');
        if(j===1||frame.support){const expected=targets[j].getWorldQuaternion(new T.Quaternion()).multiply(targets[j].userData.rlh.quaternion);assert.ok(arm.hand.getWorldQuaternion(new T.Quaternion()).normalize().angleTo(expected.normalize())<1e-5,'the native cuff follows the glove rotation, including vertical recharge');}
        assert.ok(Math.abs(arm.fore.position.length()-arm.upper.userData.length)<1e-6,'bone lengths never stretch');
      });
    }
  }
  soldier.dispose();
});

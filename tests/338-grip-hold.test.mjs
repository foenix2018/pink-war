import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {WEAPON_FRAME, KENNEY_HOLD, buildGun} from '../dist/weapons.js';
import {upgradeKenneyWeapon} from '../dist/kenney-blasters.js';
import {createCharacterKit} from '../dist/soldier.js';

const neon=c=>new T.MeshBasicMaterial({color:c}),solid=c=>new T.MeshStandardMaterial({color:c});
const mats=()=>({dark:solid(1),steel:solid(2),armor:solid(3),armorLight:solid(4),rose:neon(5),pale:neon(6),violet:neon(7),cyan:neon(8)});
const flash=parent=>{const s=new T.Object3D();parent.add(s);return s;};
const near=(a,b,eps=1e-9)=>a.every((v,i)=>Math.abs(v-b[i])<eps);
// The cuff of a glove points along its forearm bone's -y axis.
const cuff=(gun,glove)=>{gun.updateMatrixWorld(true);return new T.Vector3(0,-1,0).transformDirection(glove.userData.rig.forearm.matrixWorld)
  .transformDirection(new T.Matrix4().copy(gun.matrixWorld).invert());};

test('each Kenney blaster has a measured hold: grip below the barrel, raked, foregrip within reach ahead',()=>{
  assert.equal(KENNEY_HOLD.length,5);
  KENNEY_HOLD.forEach((hold,i)=>{
    const frame=WEAPON_FRAME[i];
    assert.ok(hold.slim>.45&&hold.slim<=1,`${frame.id}: narrowed, never widened`);
    assert.ok(hold.rake<-.2&&hold.rake>-.36,`${frame.id}: the hand follows the grip's rake`);
    assert.ok(hold.palm[1]<frame.muzzle[1]-.1,`${frame.id}: the palm is on the grip, under the receiver`);
    assert.ok(hold.palm[2]>frame.muzzle[2]+.2,`${frame.id}: the grip is behind the muzzle`);
    assert.equal(!!hold.support,!!frame.support,`${frame.id}: two hands only on a two-handed weapon`);
    if(hold.support){
      const reach=hold.palm[2]-hold.support[2];
      assert.ok(reach>.15&&reach<.3,`${frame.id}: the free hand is ${reach.toFixed(2)} m ahead of the shooting hand`);
    }
  });
});

test('a loaded Kenney blaster puts the palm on its own grip and both cuffs towards the elbows',()=>{
  const gun=buildGun({mats:mats(),gloves:createCharacterKit(new T.Texture()).gloves,makeFlash:flash});
  const {hand,support}=gun.userData;
  KENNEY_HOLD.forEach((hold,i)=>{
    if(i===2)return; // Le nouveau ARES X9 ne reprend pas l'ancienne poignée Kenney.
    gun.userData.kenneyAssets.loadedByIndex[i]=true;gun.userData.setVariant(i);
    for(let k=0;k<20;k++)gun.userData.animateHands(0,.18,0,.05);
    assert.ok(near(hand.position.toArray(),hold.palm),`${WEAPON_FRAME[i].id}: palm on the grip`);
    assert.ok(near(gun.userData.palm.toArray(),hold.palm));
    assert.equal(hand.rotation.x,hold.rake);
    const arm=cuff(gun,hand);
    assert.ok(arm.y<-.5&&arm.z>.3&&arm.x>0,`${WEAPON_FRAME[i].id}: the shooting cuff heads down and back, away from the eye`);
    if(hold.support){
      assert.ok(near(support.position.toArray(),hold.support),`${WEAPON_FRAME[i].id}: free hand on the foregrip`);
      assert.deepEqual(gun.userData.supportPoint,hold.support);
      const free=cuff(gun,support);
      assert.ok(free.y<-.5&&free.z>.2&&free.x<0,`${WEAPON_FRAME[i].id}: the free cuff heads down, back and left`);
    }
  });
  // Without its Kenney mesh, the native weapon is held by construction, at the origin.
  gun.userData.kenneyAssets.loadedByIndex[2]=false;gun.userData.setVariant(2);
  assert.deepEqual(hand.position.toArray(),[0,0,0]);assert.equal(hand.rotation.x,0);
  assert.deepEqual(support.position.toArray(),[...WEAPON_FRAME[2].support]);
});

test('the free hand closes every finger round a foregrip; the shooting index stays on the trigger',()=>{
  const gun=buildGun({mats:mats(),gloves:createCharacterKit(new T.Texture()).gloves,makeFlash:flash});
  gun.userData.setVariant(2);
  for(let k=0;k<30;k++)gun.userData.animateHands(0,.18,0,.05);
  const {hand,support}=gun.userData;
  assert.ok(support.userData.rig.etat.index>.75,'support index wrapped like the other fingers');
  assert.ok(hand.userData.rig.etat.index<.4,'shooting index rests on the trigger');
});

test('grip buttresses sit on the measured grip, round emitters stay round on a slimmed blaster',()=>{
  KENNEY_HOLD.forEach((hold,i)=>{
    const upgrade=upgradeKenneyWeapon(new T.Group(),WEAPON_FRAME[i],i,hold);
    for(const brace of upgrade.children.filter(c=>c.name==='Grip reinforcement')){
      assert.ok(Math.abs(brace.position.y-(hold.palm[1]+.023))<1e-9&&Math.abs(brace.position.z-(hold.palm[2]+.006))<1e-9);
    }
    const ring=upgrade.children.find(c=>c.name==='Emitter luminescent ring');
    assert.ok(Math.abs(ring.scale.x*hold.slim-1)<1e-9);
  });
});

test('VR keeps the palm on the tracked hand and the free hand on the measured foregrip',()=>{
  const vr=readFileSync(new URL('../dist/vr.js',import.meta.url),'utf8');
  assert.ok(vr.includes('TRACKED_PALM'));
  assert.ok(/c\.gun\.position\.sub\(held\.copy\(palm\)\.applyEuler\(c\.gun\.rotation\)\)\.add\(TRACKED_PALM\)/.test(vr));
  assert.ok(vr.includes('primary.gun.userData.supportPoint||'));
  const scene=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
  assert.ok(!scene.includes('extendForearm'),'no forearm in the flat-screen view');
});

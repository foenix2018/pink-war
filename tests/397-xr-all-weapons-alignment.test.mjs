import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {WEAPON_FRAME,OPTICS,buildGun} from '../dist/weapons.js';
import {trackedBarrelRay,eyeAlignedSight,sightPoint} from '../dist/sight-line.js';
import {VRController,VR_DEFAULTS} from '../dist/vr.js';
import {createCharacterKit} from '../dist/soldier.js';

const neon=c=>new T.MeshBasicMaterial({color:c});
const solid=c=>new T.MeshStandardMaterial({color:c});
const mats=()=>({dark:solid(1),steel:solid(2),armor:solid(3),armorLight:solid(4),
 rose:neon(5),pale:neon(6),violet:neon(7),cyan:neon(8)});
const gloves=()=>createCharacterKit(new T.Texture()).gloves;
const flash=parent=>{const f=new T.Object3D();parent.add(f);return f;};
const guns=()=>buildGun({mats:mats(),gloves:gloves(),sleeve:false,makeFlash:flash});
const FIREARMS=WEAPON_FRAME.map((f,i)=>f.melee?null:i).filter(i=>i!==null);
const near=(a,b,epsilon=1e-6)=>a.distanceTo(b)<=epsilon;

test('all eight ranged weapons follow the actual visible barrel and muzzle in Quest pose',()=>{
 assert.equal(FIREARMS.length,8);
 const rig=new T.Group();rig.position.set(2,.4,-4);rig.rotation.y=.41;
 const controller=new T.Group();controller.position.set(.25,1.29,-.4);rig.add(controller);
 const gun=guns();controller.add(gun);
 for(const index of FIREARMS){
  gun.userData.setVariant(index);
  for(const angle of [-.17,0,.19]){
   gun.rotation.set(angle,.12,-.04);
   const s=trackedBarrelRay(T,gun,{});
   const muzzle=gun.userData.flash.getWorldPosition(new T.Vector3());
   const visibleForward=new T.Vector3(0,0,-1).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion()));
   assert.ok(near(s.origin,muzzle),WEAPON_FRAME[index].id+' muzzle');
   assert.ok(near(s.direction,visibleForward),WEAPON_FRAME[index].id+' barrel axis');
   assert.ok(s.direction.length()>0.9999&&s.direction.length()<1.0001);
  }
 }
});

test('mirrored off-hand DUO pistol shoots from its own visible barrel, never opposite-hand flash',()=>{
 const rig=new T.Group(),left=new T.Group(),right=new T.Group();
 rig.add(left,right);left.position.set(-.3,1.4,-.2);right.position.set(.3,1.4,-.2);
 const l=guns(),r=guns();left.add(l);right.add(r);l.userData.setVariant(7);r.userData.setVariant(7);
 l.scale.x=-1;
 const lshot=trackedBarrelRay(T,l,{}),rshot=trackedBarrelRay(T,r,{});
 assert.ok(lshot.origin.x<rshot.origin.x);
 assert.ok(lshot.origin.distanceTo(l.userData.flash.getWorldPosition(new T.Vector3()))<1e-6);
 assert.ok(rshot.origin.distanceTo(r.userData.flash.getWorldPosition(new T.Vector3()))<1e-6);
 assert.ok(lshot.direction.distanceTo(rshot.direction)<1e-6);
});

test('optic eye pose converges each non-dual ranged weapon onto the sight centre at distance',()=>{
 const eye=new T.Object3D();eye.position.set(.06,1.67,.12);eye.rotation.set(-.10,.31,.02,'YXZ');
 eye.updateMatrixWorld(true);
 const wall={x:0,y:0,z:-35,hx:500,hz:.2,height:50};
 const gun=guns(),rig=new T.Group();rig.add(gun);rig.updateMatrixWorld(true);
 for(const index of FIREARMS.filter(i=>i!==7)){
  gun.userData.setVariant(index);
  const optic=gun.userData.optics[index]?.cfg||OPTICS[WEAPON_FRAME[index].id];
  const aligned=eyeAlignedSight(T,eye.matrixWorld,optic);
  gun.position.copy(aligned.position);
  gun.quaternion.copy(aligned.quaternion);
  const shot=trackedBarrelRay(T,gun,{});
  const target=sightPoint(T,aligned.eye,aligned.forward,{obstacles:[wall]});
  const shotDirection=target.clone().sub(shot.origin).normalize();
  const end=shot.origin.clone().addScaledVector(shotDirection,shot.origin.distanceTo(target));
  assert.ok(near(end,target),WEAPON_FRAME[index].id+' world target');
  assert.ok(Number.isFinite(shotDirection.x)&&Number.isFinite(shotDirection.y)&&Number.isFinite(shotDirection.z));
 }
});

test('VRController raises fire direction with visual barrel after same-frame tracked recoil',()=>{
 const rig=new T.Group(),controller=new T.Group(),camera=new T.PerspectiveCamera();
 rig.add(controller,camera);controller.position.set(.2,1.2,-.4);
 controller.userData.source={handedness:'right'};
 const gun=guns();controller.add(gun);
 const game={weaponIndex:0,weapon:{dual:false}};
 const state=Object.assign(Object.create(VRController.prototype),{
  mode:'xr',settings:VR_DEFAULTS,controllers:[{ray:controller,gun}],
  hooks:{game:()=>game,world:()=>({T,camera,obstacles:[]})}
 });
 for(const index of FIREARMS){
  game.weaponIndex=index;game.weapon.dual=index===7;gun.userData.setVariant(index);
  gun.rotation.set(.16,.14,0);const shot=state.aim();
  const expected=gun.userData.flash.getWorldPosition(new T.Vector3());
  assert.ok(near(shot.origin,expected),WEAPON_FRAME[index].id+' live muzzle');
  assert.ok(near(shot.direction,new T.Vector3(0,0,-1).applyQuaternion(gun.getWorldQuaternion(new T.Quaternion()))),
    WEAPON_FRAME[index].id+' live direction');
 }
});

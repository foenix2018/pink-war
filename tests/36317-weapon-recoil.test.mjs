import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {FIRING_FEEL,createWeaponFeel,recoilPose,dualRecoilPose} from '../dist/weapon-feel.js';
import {ArenaGame} from '../dist/game-logic.js';
import {VRController,VR_DEFAULTS} from '../dist/vr.js';
import {buildGun} from '../dist/weapons.js';
import {createCharacterKit} from '../dist/soldier.js';

function response(id,hz=120){
 const feel=createWeaponFeel();feel.fire(id);let peak=0,settled=0;
 for(let i=0;i<hz*2;i++){feel.update(1/hz);peak=Math.max(peak,feel.state.kick);if(feel.state.kick>.001)settled=(i+1)/hz;}
 return {peak,settled};
}
function gun(){const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial()]));return buildGun({mats,gloves:kit.gloves,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}});}

test('weapon impulses communicate mass, sniper recovery is slower, ADS absorbs rise and magnification does not amplify the camera kick',()=>{
 const results=Object.fromEntries(Object.keys(FIRING_FEEL).map(id=>[id,response(id)]));
 assert.ok(results.m12.peak>results.r9.peak*2);assert.ok(results.r9.peak>results.bloom.peak*1.5);
 assert.ok(results.nova.peak>results.m12.peak);assert.ok(results.lance.settled>results.bloom.settled*1.7);
 const feel=createWeaponFeel();feel.fire('lance');feel.update(.04);
 const hip=recoilPose('lance',feel.state),ads=recoilPose('lance',feel.state,{aiming:1,magnification:6});
 assert.ok(ads.pitch<hip.pitch*.4);assert.ok(ads.z>hip.z*.7&&ads.z<hip.z);
 assert.ok(Math.abs(ads.cameraPitch*6-hip.cameraPitch)<1e-10);
 const braced=createWeaponFeel();braced.fire('m12',1,true);const standing=createWeaponFeel();standing.fire('m12');
 assert.ok(braced.state.pitch<standing.state.pitch);assert.equal(recoilPose('aurora',feel.state).pitch,0);
});

test('a long automatic burst remains bounded, settles at 30/72/90/120 Hz and weapon changes clear the old impulse',()=>{
 const samples=[];
 for(const hz of [30,72,90,120]){
  const feel=createWeaponFeel();feel.fire('m12');for(let i=0;i<hz;i++)feel.update(1/hz);samples.push({...feel.state});
  let next=0;
  for(let i=0;i<hz*8;i++){const t=i/hz;if(t>=next){feel.fire('bloom');next+=.11;}feel.update(1/hz);assert.ok(feel.state.kick<=.18&&feel.state.pitch<=.38&&Math.abs(feel.state.yaw)<=.085);}
  for(let i=0;i<hz*3;i++)feel.update(1/hz);assert.equal(feel.state.kick,0);assert.equal(feel.state.pitch,0);
  feel.fire('nova');feel.reset();assert.equal(feel.state.flash,0);assert.equal(feel.state.kick,0);
 }
 for(const s of samples){assert.ok(Math.abs(s.kick-samples[0].kick)<1e-9);assert.ok(Math.abs(s.pitch-samples[0].pitch)<1e-9);}
});

test('only actual fired rounds drive the impulse; empty, cadence-blocked, reloading and paused weapons do not kick',()=>{
 const g=new ArenaGame([],()=>.5),feel=createWeaponFeel(),origin={x:0,y:1.5,z:0},direction={x:0,y:0,z:-1};
 g.ownedWeapons.add(0);g.selectWeapon(0);g.cooldown=0;g.drainEvents();
 const consume=()=>{const shots=g.drainEvents().filter(e=>e.type==='shot');for(const e of shots)feel.fire(e.weapon,e.power);return shots.length;};
 assert.equal(g.shoot(origin,direction),true);assert.equal(consume(),1);assert.ok(feel.state.kick>0);
 assert.equal(g.shoot(origin,direction),false);assert.equal(consume(),0);
 feel.reset();g.cooldown=0;g.ammo[0]=0;assert.equal(g.shoot(origin,direction),false);assert.equal(consume(),0);assert.equal(feel.state.kick,0);
 g.ammo[0]=12;g.reloadRemaining=1;assert.equal(g.shoot(origin,direction),false);assert.equal(consume(),0);
 g.reloadRemaining=0;g.state='paused';assert.equal(g.shoot(origin,direction),false);assert.equal(consume(),0);assert.equal(feel.state.pitch,0);
});

test('GHJU gloves and muzzles follow their own pistol, and tracked recoil preserves the head pose and physical aiming ray',()=>{
 const weapon=gun();weapon.userData.setVariant(7);const right=weapon.userData.hand.parent,left=weapon.userData.support.parent;
 weapon.userData.setCombatState({time:1.04,dualState:{shotAt:{right:1,left:-Infinity}}});
 assert.ok(right.position.z>.04);assert.equal(left.position.z,0);assert.equal(left.rotation.x,0);
 assert.equal(weapon.userData.hand.parent,right);assert.equal(weapon.userData.flash.parent,right);
 const screenKick=right.position.z;weapon.userData.recoilTracked=true;weapon.userData.setCombatState({time:1.04,dualState:{shotAt:{right:1,left:-Infinity}}});
 assert.ok(right.position.z<screenKick*.5);assert.ok(right.rotation.x>0);
 weapon.userData.setCombatState({time:3,dualState:{shotAt:{right:1,left:2.97}}});assert.equal(right.position.z,0);assert.ok(left.position.z>0);
 assert.equal(dualRecoilPose(Infinity).z,0);weapon.userData.setVariant(6);
 const camera=new T.PerspectiveCamera();camera.position.set(.02,1.7,.03);camera.rotation.y=.2;
 const anchor=new T.Group(),mount=new T.Group(),ray=new T.Group();ray.userData.source={handedness:'right'};anchor.position.set(.25,1.2,-.3);anchor.add(mount);mount.add(weapon);
 const world={T,camera,obstacles:[],renderer:{shadowMap:{},xr:{getCamera:()=>camera}}},g={wave:1,time:1,weapon:{id:'m12',capacity:8,reload:2.8},weaponIndex:6,ammo:{6:7},reloadRemaining:0,charge:0};
 const state=Object.assign(Object.create(VRController.prototype),{mode:'xr',settings:VR_DEFAULTS,controllers:[{ray,gun:weapon,bare:new T.Group(),anchor,level:1}],handPose:{mainTrigger:1,mainGrip:1,sideTrigger:0,sideGrip:0},hooks:{game:()=>g,phase:()=> 'playing',world:()=>world},reloadGesture:0,chargeBuzz:1,shadowTick:0});
 camera.updateMatrixWorld(true);const headBefore=camera.matrix.clone(),headPosition=camera.position.clone(),anchorBefore=anchor.position.clone();
 const feel=createWeaponFeel();feel.fire('m12');feel.update(.04);state.update(.016,.065,feel.state.pitch,feel.state);
 assert.ok(weapon.rotation.x>.05);assert.ok(weapon.position.z<.12);
 assert.ok(camera.position.equals(headPosition));assert.deepEqual(camera.matrix.elements,headBefore.elements);assert.ok(anchor.position.equals(anchorBefore));
 const visualBarrel=new T.Vector3(0,0,-1).applyQuaternion(weapon.getWorldQuaternion(new T.Quaternion()));
 assert.ok(state.aim().direction.distanceTo(visualBarrel)<1e-8,'tracked projectile follows the recoiling gun while the head remains unchanged');
 weapon.userData.disposeDynamic();
});

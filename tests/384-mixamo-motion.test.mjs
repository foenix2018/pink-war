import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {mixamoPlayerMotions,naturalHeroClips} from '../dist/hero-motion.js';
import {rlhFirefighterData} from '../dist/rlh-firefighter.js';

function hero(profile){
 const kit=createCharacterKit(new T.Texture()),mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));
 const m=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);
 installShadowUnit(m,profile);m.root.scale.setScalar(m.heightScale);return m;
}
function reference(model){
 const root=new T.Group(),bones=model.actor.data.bones.map(d=>{const b=new T.Bone();b.name=d.name;b.position.fromArray(d.p);b.quaternion.fromArray(d.q);return b;});
 bones.forEach((b,i)=>(model.actor.data.bones[i].parent<0?root:bones[model.actor.data.bones[i].parent]).add(b));
 const mixer=new T.AnimationMixer(root),actions=Object.fromEntries(model.actor.data.clips.map(c=>{const a=mixer.clipAction(c.animation);a.play();return[c.name,a];}));
 return {sample(){for(const [name,a] of Object.entries(actions)){const source=model.actor.actions[name];a.enabled=true;a.setEffectiveWeight(source.getEffectiveWeight());a.time=source.time;a.timeScale=0;}mixer.update(0);root.updateMatrixWorld(true);return Object.fromEntries(['Hips','LeftFoot','RightFoot'].map(n=>[n,bones.find(b=>b.name==='mixamorig'+n).getWorldPosition(new T.Vector3())]));},bones,dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);}};
}
test('the player library contains actual full-body Mixamo tracks and correctly handed directional clips',()=>{
 const pack=mixamoPlayerMotions();assert.equal(pack.author,'Adobe Mixamo');
 const clips=Object.fromEntries(pack.clips.map(c=>[c.name,c]));
 for(const name of ['walk','walkRifle','walkBack','walkLeft','walkRight','run','runBack','runLeft','runRight','crouchWalk','crouchBack','crouchLeft','crouchRight']){
  const c=clips[name];assert.ok(c&&c.stridePerCycle>.3&&c.duration>.4);
  for(const bone of ['Hips','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot']){
   const track=c.tracks.find(t=>t.name==='mixamorig'+bone+'.quaternion');assert.ok(track);assert.ok(track.values.every(Number.isFinite));
  }
  const position=c.tracks.find(t=>t.name==='mixamorigHips.position');assert.ok(position);
  assert.ok(Math.abs(position.values[0]-position.values.at(-3))<.00001,'root travel is removed while the recorded pelvis sway remains');
  assert.ok(Math.abs(position.values[2]-position.values.at(-1))<.00001);
 }
 assert.ok(clips.walkLeft.sourceDirection[0]<-.99);assert.ok(clips.walkRight.sourceDirection[0]>.99);assert.ok(clips.walk.sourceDirection[2]<-.99);assert.ok(clips.walkBack.sourceDirection[2]>.99);
 const data=rlhFirefighterData(),before=data.clips.map(c=>c.animation.uuid);naturalHeroClips(data);assert.deepEqual(data.clips.map(c=>c.animation.uuid),before,'shared enemy/native source is unmodified');
});
for(const profile of CHARACTERS)for(const fps of [30,60,120])test(`${profile.id}/${fps}: the feet and pelvis follow the imported motions horizontally, including straight travel and side/back transitions`,()=>{
 const m=hero(profile),source=reference(m),dt=1/fps;m.root.position.set(11,3.4,-12);let time=0;
 for(const v of [{x:0,z:-2.2},{x:-1.65,z:0},{x:1.65,z:0},{x:0,z:1.65},{x:1.1,z:-1.55}]){
  for(let i=0;i<fps;i++){
   m.root.position.x+=v.x*dt;m.root.position.z+=v.z*dt;
   m.animate(time+=dt,true,0,0,0,dt,{velocity:v,ground:()=>3.4});
   const expected=source.sample(),j=m.jointPositions();
   for(const [actual,key] of [['pelvis','Hips'],['leftAnkle','LeftFoot'],['rightAnkle','RightFoot']]){
    const p=m.root.worldToLocal(j[actual]);assert.ok(Math.hypot(p.x-expected[key].x,p.z-expected[key].z)<.00002,`${actual}: terrain correction must not redraw recorded horizontal movement`);
   }
   if(m.locomotion.gait.frequency>0)for(const b of [...m.legs,...m.knees,...m.feet]){const a=b.quaternion.toArray(),q=source.bones.find(n=>n.name===b.name).quaternion.toArray();assert.ok(Math.min(Math.hypot(...a.map((v,i)=>v-q[i])),Math.hypot(...a.map((v,i)=>v+q[i])))<.000001,'flat-floor walking retains the actual imported rotations, without IK or generated steps');}
   if(v.x===0&&v.z<0)for(const name of ['walkLeft','walkRight','runLeft','runRight'])assert.equal(m.actor.actions[name].getEffectiveWeight(),0,'straight travel never activates a side motion');
  }
 }
 source.dispose();m.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {equipmentForCharacter,equipmentForLevel} from '../dist/equipment.js';
import {ARMOR_STAGES} from '../dist/armor-progression.js';
import {armorSurfaceAtlas,ARMOR_LABELS} from '../dist/armor-surface.js';
import {rlhFirefighterData} from '../dist/rlh-firefighter.js';
const make=profile=>{
 const kit=createCharacterKit(new T.Texture());kit.setPalette(profile.armor);
 const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(k=>[k,new T.MeshStandardMaterial()]));
 const s=createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:p=>{const f=new T.Object3D();p.add(f);return f;}}),profile);return {s,kit};
};
const count=s=>s.armor.parts.reduce((n,p)=>n+p.geometry.attributes.position.count/3,0);
test('both heroes gain visible geometry at every tier without increasing the seven armour draw batches',()=>{
 for(const hero of CHARACTERS){const {s}=make(hero);let previous=0;
  for(let level=1;level<=10;level++){
   s.setLevel(level);const triangles=count(s);assert.ok(triangles>previous+200,'every level adds substantial geometry');previous=triangles;
   assert.ok(triangles<(level===1?20000:24000),'complete equipment stays within its rendering budget');assert.equal(s.armor.parts.length,7);
   assert.equal(s.armor.level,level);assert.equal(equipmentForCharacter(level,hero.id).module,ARMOR_STAGES[level-1].module);
   assert.ok(ARMOR_STAGES.slice(0,level).every(stage=>s.armor.modules.includes(stage.module)));
   assert.equal(s.root.children.filter(o=>o.userData.suit==='AÉGIS IV').length,7,'no obsolete skinned meshes remain attached');
   for(const mesh of s.armor.parts){assert.equal(mesh.skeleton,s.nativeSkeleton);const w=mesh.geometry.attributes.skinWeight,ix=mesh.geometry.attributes.skinIndex,p=mesh.geometry.attributes.position;
    for(let j=0;j<p.count;j++){assert.ok(Number.isFinite(p.getX(j)+p.getY(j)+p.getZ(j)));assert.ok(Math.abs(w.getX(j)+w.getY(j)+w.getZ(j)+w.getW(j)-1)<1e-6);assert.ok(ix.getX(j)>=0&&ix.getX(j)<34);}
   }
  }
  const g=s.armor.parts.map(p=>p.geometry);s.setLevel(1);s.setLevel(10);assert.deepEqual(s.armor.parts.map(p=>p.geometry),g,'returning to a tier reuses its cached skin');s.setLevel(99);assert.equal(s.equipmentLevel,10);s.dispose();
 }
});
test('each reinforced limb has its own left/right binding, and no mechanism spans a bending joint',()=>{
 const {s}=make(CHARACTERS[0]),items=s.armor.template.items,names=s.nativeSkeleton.bones.map(b=>b.name.replace('mixamorig',''));
 for(const [module,joints] of [['limbs',['LeftArm','RightArm','LeftFoot','RightFoot']],['bracers',['LeftForeArm','RightForeArm']],['cuirass',['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg']],['exo',['LeftUpLeg','RightUpLeg','LeftLeg','RightLeg']],['assault',['LeftArm','RightArm','LeftForeArm','RightForeArm']]]){
  const actual=new Set(items.filter(p=>p.tag===module).map(p=>names[p.bone]));for(const joint of joints)assert.ok(actual.has(joint),module+' follows '+joint);
 }
 assert.ok(items.filter(p=>p.tag==='core').every(p=>names[p.bone]==='Spine2'));
 assert.ok(items.filter(p=>p.tag==='sensors').every(p=>names[p.bone]==='Head'));s.dispose();
});
test('all complete armour vertices remain finite and near their animated bones in native armed poses and crouch',()=>{
 const source=rlhFirefighterData(),clips=source.clips.map(c=>c.duration),{s}=make(CHARACTERS[1]);s.setLevel(10);s.setWeapon(1);
 const p=new T.Vector3(),bone=new T.Vector3();
 for(const motion of [{moving:false},{moving:true},{moving:false,crouched:true},{moving:true,crouched:true},{moving:true,sprint:true}]){
  for(let frame=0;frame<14;frame++){if(motion.moving)s.root.position.z-=(motion.sprint?7:motion.crouched?2:2.6)*.04;s.animate(frame*.04,motion.moving,.2,.0,1,.04,motion);}
  s.root.updateMatrixWorld(true);s.nativeSkeleton.update();
  for(const mesh of s.armor.parts){const ix=mesh.geometry.attributes.skinIndex;
   for(let j=0;j<ix.count;j+=3){mesh.getVertexPosition(j,p).applyMatrix4(mesh.matrixWorld);assert.ok(Number.isFinite(p.x+p.y+p.z));bone.setFromMatrixPosition(s.nativeSkeleton.bones[ix.getX(j)].matrixWorld);assert.ok(p.distanceTo(bone)<.68,'protection remains close to its native joint');}
  }
 }
 assert.equal(s.nativeMotion,'run');assert.deepEqual(source.clips.map(c=>c.duration),clips,'source animation clips remain intact');assert.ok(s.actor.actions.rifle.getClip().duration>3);assert.ok(s.actor.actions.walkRifle.getClip().duration>1);s.dispose();
});
test('nameplates retain their atlas coordinates after baking while pearl grain cannot sample another hero name',()=>{
 const atlas=armorSurfaceAtlas();assert.equal(atlas.image.width,512);assert.equal(atlas.image.height,512);
 for(const hero of CHARACTERS){const {s,kit}=make(hero),labels=s.armor.template.items.filter(p=>p.geometry.userData.armorStencil);
  assert.equal(labels.length,2);for(const label of labels){const uv=label.geometry.attributes.uv;assert.ok(uv.getX(0)>.5,'printing must not be remapped into the metal tile');}
  const front=labels.find(p=>p.level===1).geometry.attributes.uv,r=ARMOR_LABELS[hero.id];assert.ok(Math.abs(front.getY(0)-r[1])<1e-6,'nameplate samples its own hero label');
  for(const item of s.armor.template.items.filter(p=>['rose','pearl'].includes(p.key)&&!p.geometry.userData.armorStencil)){const uv=item.geometry.attributes.uv;for(let i=0;i<uv.count;i++)assert.ok(uv.getX(i)<.5&&uv.getY(i)<.5);}
  assert.equal(kit.armorMaterials.pearl.map,atlas);assert.notEqual(kit.gloves.trim.map,atlas);assert.notEqual(kit.gloves.plate.map,atlas);s.dispose();
 }
});
test('tier switching on one soldier cannot replace another soldier’s armour or weapon and gloves',()=>{
 const {s:a,kit}=make(CHARACTERS[0]),{s:b}=make(CHARACTERS[0]),hand=a.gun.userData.hand,free=a.freeHand,m=kit.gloves.plate;
 a.setLevel(10);b.setLevel(10);assert.equal(a.armor.parts[0].geometry,b.armor.parts[0].geometry);assert.notEqual(a.armor.parts[0].skeleton,b.armor.parts[0].skeleton);
 const bMesh=b.armor.parts[0];a.setLevel(2);assert.equal(b.armor.level,10);assert.equal(b.armor.parts[0],bMesh);assert.equal(a.gun.userData.hand,hand);assert.equal(a.freeHand,free);assert.equal(kit.gloves.plate,m);
 assert.equal(equipmentForLevel(20).level,10);assert.equal(equipmentForLevel(20).unlocked.length,10);a.dispose();b.dispose();
});

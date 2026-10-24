import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun} from '../dist/weapons.js';
import {createGlove,GRIP} from '../dist/hands.js';
import {poseUnarmedForInspection} from '../dist/rlh-firefighter.js';
import {CHARACTERS} from '../dist/characters.js';
import {applyShadowMaterials,installShadowUnit} from '../dist/shadow-unit-game.js';

// Cloth geometry, bone attachment and animation are
// testable headlessly without WebGL/DOM. No image bytes enter the test.
const makeCanvas=()=>({
  width:512,height:1024,
  getContext:()=>({
    createLinearGradient:()=>({addColorStop(){}}),
    fillRect(){},fillStyle:''
  })
});
const previousDocument=globalThis.document;
const makeDocument=()=>({createElement(tag){assert.equal(tag,'canvas');return makeCanvas();}});
const restoreDocument=()=>{
  if(previousDocument===undefined)delete globalThis.document;
  else globalThis.document=previousDocument;
};

const createHero=profile=>{
  const kit=createCharacterKit(new T.Texture());
  const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan']
    .map(key=>[key,new T.MeshStandardMaterial({color:0x728499})]));
  const makeGun=()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:parent=>{
    const object=new T.Object3D();parent.add(object);return object;
  }});
  const soldier=createSoldier(kit,makeGun,profile);
  return {kit,soldier};
};

for(const profile of CHARACTERS){
  test('Shadow Unit '+profile.id+' remains attached to real AEGIS bones in every tier',t=>{
    t.after(restoreDocument);
    // Preserve the original headless test environment while the RLH rig and
    // gloves bake their procedural maps. Stub DOM only for the cape texture.
    const {kit,soldier}=createHero(profile);
    globalThis.document=makeDocument();
    applyShadowMaterials(kit,profile);
    const originalPose=soldier.actor.bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray()}));
    const entry=installShadowUnit(soldier,profile);
    assert.deepEqual(soldier.actor.bones.map(b=>({p:b.position.toArray(),q:b.quaternion.toArray()})),
      originalPose,'authoring armour in bind pose restores the active animation pose');
    assert.equal(installShadowUnit(soldier,profile),entry,'install once');
    assert.equal(entry.profile,profile.id);
    assert.equal(entry.armour.helmet.parent,soldier.actor.bone('Head'));
    assert.equal(entry.armour.spine.parent,soldier.actor.bone('Spine2'));
    assert.equal(entry.cape.anchor.parent,soldier.body);
    assert.equal(entry.tabard,undefined,'front tabard is removed');
    const capeMesh=entry.cape.anchor.children[0];
    assert.ok(capeMesh.material.map.isDataTexture,'woven texture needs no external asset');
    const before=capeMesh.geometry.attributes.position.array.slice();
    soldier.root.updateMatrixWorld(true);
    const bodyIndex=soldier.actor.bones.indexOf(soldier.body);
    const bindBody=new T.Matrix4().fromArray(soldier.actor.data.bones[bodyIndex].inverse).invert();
    const top=new T.Vector3().setFromMatrixPosition(bindBody.multiply(entry.cape.anchor.matrix));
    assert.ok(Math.abs(top.x)<1e-5&&Math.abs(top.y-1.48)<1e-5&&top.z>.13&&top.z<.15,
      'cape seam is centred against the fitted back, below the scapular plates');
    assert.equal(entry.armour.helmet.name,'Shadow V6 / casque tactique polygonal');
    assert.ok(entry.cape.anchor.children.length,'black cape is present');

    for(const level of [1,7,10,3,1]){
      soldier.setLevel(level);
      const hidden=soldier.armor.parts.some(mesh=>mesh.geometry.userData.shadowHelmetFiltered);
      assert.equal(hidden,true,'base helmet hidden even after armour tier change');
      soldier.animate(level*.09,level%2===0,0,0,0,.016,{sprint:level===10});
      const positions=entry.cape.anchor.children[0].geometry.attributes.position.array;
      assert.ok(positions.every(Number.isFinite),'every cloth vertex stays finite');
      for(const group of entry.armour.limbGroups){
        assert.ok(group.parent.isBone,'limb plates follow native skeleton joints');
        group.updateWorldMatrix(true,false);
        assert.ok(group.matrixWorld.elements.every(Number.isFinite));
      }
    }
    assert.equal(soldier.nativeSkeleton.bones.length,34);
    assert.equal(soldier.equipmentLevel,1);
    assert.equal(kit.armorMaterials.rose.color.getHex(),0x232630);
    // Per-character edge color is independent of the other hero's materials.
    const edges=entry.cape.anchor.children[0].children;
    assert.equal(edges[0].material.color.getHex(),profile.masculine?0x62b8ff:0xff1688);
    assert.notDeepEqual(capeMesh.geometry.attributes.position.array,before,'rear cape animates');
    capeMesh.geometry.computeBoundingBox();
    assert.ok(capeMesh.geometry.boundingBox.getSize(new T.Vector3()).x>.40,
      'rear cape covers the back instead of the former narrow strip');
    let disposed=0;
    capeMesh.geometry.addEventListener('dispose',()=>disposed++);
    soldier.dispose();
    assert.equal(disposed,1,'rear cape releases its geometry');
    assert.equal(entry.cape.anchor.parent,null);
    assert.ok(entry.armour.limbGroups.every(group=>group.parent===null));
    restoreDocument();
  });
}

for(const profile of CHARACTERS){
  test('Shadow cloth '+profile.id+' stays fitted in profile while the chest and hips move',()=>{
    const {soldier}=createHero(profile);
    const entry=installShadowUnit(soldier,profile);
    const setBindPose=()=>{
      for(let i=0;i<soldier.actor.bones.length;i++){
        soldier.actor.bones[i].position.fromArray(soldier.actor.data.bones[i].p);
        soldier.actor.bones[i].quaternion.fromArray(soldier.actor.data.bones[i].q);
      }
      soldier.root.updateMatrixWorld(true);
    };
    setBindPose();
    for(const direction of [-1,1]){
      const ray=new T.Raycaster(new T.Vector3(.105,1.45,direction),new T.Vector3(0,0,-direction));
      const hit=ray.intersectObject(entry.armour.spine,true)[0];
      assert.ok(hit&&Math.abs(hit.point.z)<.19&&Math.abs(hit.point.z)>.11,
        'front and back plates are fitted to the undersuit instead of the hidden old shell');
    }
    const hip=soldier.actor.bone('Hips'),samples=[];
    for(const cloth of [entry.cape]){
      cloth.update(0,'idle',0,{symmetric:true});
      const mesh=cloth.anchor.children[0],p=mesh.geometry.attributes.position;
      mesh.updateWorldMatrix(true,false);
      const top=[],waistRow=16,waistIndex=waistRow*25+12;
      for(let i=0;i<25;i++)top.push(new T.Vector3().fromBufferAttribute(p,i));
      const waist=hip.worldToLocal(mesh.localToWorld(new T.Vector3().fromBufferAttribute(p,waistIndex)));
      // These samples were formerly 10–18 cm away from the actual waist.
      const inverseRoot=soldier.root.matrixWorld.clone().invert();
      const rootPoint=new T.Vector3().fromBufferAttribute(p,waistIndex).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot);
      assert.ok(Math.abs(rootPoint.z)>.11&&Math.abs(rootPoint.z)<.145,
        'rear fabric lies within a small clearance of the waist');
      const shoulderDepth=top[12].clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot).z;
      const edgeDepth=top[0].clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inverseRoot).z;
      assert.ok(Math.abs(shoulderDepth)-Math.abs(edgeDepth)>.025,'attachment seam wraps around the torso');
      samples.push({cloth,mesh,p,top,waist,waistIndex});
    }
    // Include a placed/scaled/rotated actor, as in the lobby and companion.
    soldier.root.position.set(9,.7,-12);soldier.root.rotation.y=.73;
    soldier.root.scale.setScalar(soldier.heightScale);
    let clock=0;
    for(const motion of [{},{sprint:true},{crouched:true},{airborne:true,verticalSpeed:2}]){
      for(let frame=0;frame<12;frame++){
        clock+=.04;
        soldier.animate(clock,!!motion.sprint||!!motion.crouched,0,0,0,.04,motion);
        for(const sample of samples){
          const {cloth,mesh,p,top,waist,waistIndex}=sample;
          // Wind can move the free hem, never the attachment seam.
          cloth.update(clock,motion.sprint?'run':motion.crouched?'crouchWalk':'idle',1);
          mesh.updateWorldMatrix(true,false);
          for(let i=0;i<25;i++)assert.ok(top[i].distanceTo(new T.Vector3().fromBufferAttribute(p,i))<1e-5,
            'every top stitch remains fixed to the chest in every pose');
          const current=hip.worldToLocal(mesh.localToWorld(new T.Vector3().fromBufferAttribute(p,waistIndex)));
          assert.ok(current.distanceTo(waist)<.025,'waist follows the pelvis instead of cantilevering from the chest');
          assert.ok(p.array.every(Number.isFinite));
        }
      }
    }
    soldier.dispose();
  });

  test('unarmed inspection '+profile.id+' keeps hands on wrists without stretching the native arms',()=>{
    const {kit,soldier}=createHero(profile);
    soldier.root.scale.setScalar(soldier.heightScale);
    const gloves=[createGlove(kit.gloves,{mirror:true,sleeve:false}),createGlove(kit.gloves,{sleeve:false})];
    for(const glove of gloves)soldier.root.add(glove);
    const lengths=soldier.arms.map(a=>[a.fore.position.length(),a.hand.position.length()]);
    const legLengths=soldier.knees.map((k,i)=>[k.position.length(),soldier.feet[i].position.length()]);
    soldier.animate(1,false,0,0,0,.016,{preview:true});
    poseUnarmedForInspection(soldier,gloves);
    soldier.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      const side=i===0?'Left':'Right',hand=soldier.actor.bone(side+'Hand');
      const wrist=gloves[i].localToWorld(new T.Vector3(...GRIP.wrist));
      assert.ok(wrist.distanceTo(hand.getWorldPosition(new T.Vector3()))<1e-5,'glove wrist matches native wrist');
      assert.deepEqual([soldier.arms[i].fore.position.length(),hand.position.length()],lengths[i]);
      const local=soldier.root.worldToLocal(hand.getWorldPosition(new T.Vector3()));
      assert.ok(Math.abs(local.y-1.005)<.035,'hand rests beside the thigh');
      assert.ok(Math.abs(Math.abs(local.x)-.315)<.035,'arms have a symmetric relaxed stance');
      assert.deepEqual([soldier.knees[i].position.length(),soldier.feet[i].position.length()],legLengths[i],
        'inspection stance preserves leg bone lengths');
    }
    soldier.root.updateMatrixWorld(true);
    const rootInverse=soldier.root.matrixWorld.clone().invert();
    const rightHandFrame=rootInverse.clone().multiply(gloves[1].matrixWorld);
    const leftHandFrame=rootInverse.clone().multiply(gloves[0].matrixWorld);
    for(const point of [[0,0,0],[.03,.05,.09],[-.02,.12,.07]]){
      const right=new T.Vector3(...point).applyMatrix4(rightHandFrame);right.x=-right.x;
      const left=new T.Vector3(...point).applyMatrix4(leftHandFrame);
      assert.ok(right.distanceTo(left)<1e-7,'resting gloves have mirrored positions and orientations');
    }
    assert.equal(soldier.gun.visible,false);
    assert.equal(soldier.freeHand.visible,false);
    for(const glove of gloves)glove.userData.dispose();
    soldier.dispose();
  });
}

for(const profile of CHARACTERS){
  test('Shadow reference '+profile.id+' has mirrored plates and centred, proportionate cloth',()=>{
    const {kit,soldier}=createHero(profile);
    const entry=installShadowUnit(soldier,profile);
    const hands=[createGlove(kit.gloves,{mirror:true,sleeve:false}),createGlove(kit.gloves,{sleeve:false})];
    for(const hand of hands)soldier.root.add(hand);
    poseUnarmedForInspection(soldier,hands);
    entry.armour.syncInspectionSymmetry();soldier.root.updateMatrixWorld(true);
    const inverse=soldier.root.matrixWorld.clone().invert(),a=new T.Vector3(),b=new T.Vector3();
    assert.equal(entry.armour.mirrorPairs.length,8,'shoulders, upper arms, bracers, thighs, shins, knees, pouches and boots are paired');
    for(const {left,right} of entry.armour.mirrorPairs){
      assert.equal(left.children.length,right.children.length);
      for(let batch=0;batch<right.children.length;batch++){
        const r=right.children[batch],l=left.children[batch],rp=r.geometry.attributes.position,lp=l.geometry.attributes.position;
        assert.equal(lp.count,rp.count);
        const rm=inverse.clone().multiply(r.matrixWorld),lm=inverse.clone().multiply(l.matrixWorld);
        for(let i=0;i<rp.count;i++){
          const reflectedIndex=i%3===1?i+1:i%3===2?i-1:i;
          a.fromBufferAttribute(rp,i).applyMatrix4(rm);a.x=-a.x;
          b.fromBufferAttribute(lp,reflectedIndex).applyMatrix4(lm);
          assert.ok(a.distanceTo(b)<1e-6,left.name+' mirrors every vertex in character space');
        }
      }
    }
    // Central plates must be mirrored too, not only equally wide bounding boxes.
    const key=(x,y,z)=>[x,y,z].map(v=>Math.abs(v)<.0000005?'0':v.toFixed(6)).join(',');
    for(const group of [entry.armour.helmet,entry.armour.spine])for(const mesh of group.children){
      const p=mesh.geometry.attributes.position,points=new Set();
      for(let i=0;i<p.count;i++)points.add(key(p.getX(i),p.getY(i),p.getZ(i)));
      for(let i=0;i<p.count;i++)assert.ok(points.has(key(-p.getX(i),p.getY(i),p.getZ(i))),group.name+' has a centred contour');
    }
    const shoulderPair=entry.armour.mirrorPairs.find(p=>p.right.name.includes('épaule'));
    const shoulders=new T.Box3().setFromObject(shoulderPair.left).union(new T.Box3().setFromObject(shoulderPair.right));
    const shoulderWidth=shoulders.getSize(new T.Vector3()).x;
    const helmetWidth=new T.Box3().setFromObject(entry.armour.helmet).getSize(new T.Vector3()).x;
    assert.ok(helmetWidth/shoulderWidth>.39&&helmetWidth/shoulderWidth<.48,'helmet respects the reference shoulder span');
    for(const cloth of [entry.cape]){
      cloth.update(1,'idle',.6,{symmetric:true});
      const p=cloth.anchor.children[0].geometry.attributes.position,columns=24,rows=40;
      cloth.anchor.updateWorldMatrix(true,true);
      const clothFrame=inverse.clone().multiply(cloth.anchor.matrixWorld);
      for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
        const i=row*(columns+1)+col,j=row*(columns+1)+columns-col;
        assert.ok(Math.abs(p.getX(i)+p.getX(j))<1e-7,'cloth remains centred');
        assert.ok(Math.abs(p.getY(i)-p.getY(j))<1e-7,'hem and seams stay level');
        assert.ok(Math.abs(p.getZ(i)-p.getZ(j))<1e-7,'folds have matching depth');
        a.fromBufferAttribute(p,i).applyMatrix4(clothFrame);b.fromBufferAttribute(p,j).applyMatrix4(clothFrame);
        assert.ok(Math.abs(a.x+b.x)<1e-6&&Math.abs(a.y-b.y)<1e-6&&Math.abs(a.z-b.z)<1e-6,
          'cloth is also mirrored and level relative to the actual character');
      }
      const width=p.getX(rows*(columns+1)+columns)-p.getX(rows*(columns+1));
      const ratio=width/shoulderWidth;
      assert.ok(ratio>.58&&ratio<.70,'rear cape width follows the reference silhouette');
    }
    for(const hand of hands)hand.userData.dispose();soldier.dispose();
  });
}

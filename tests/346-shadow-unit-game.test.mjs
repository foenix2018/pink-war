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
  test('Shadow Unit '+profile.id+' remains attached to real AEGIS bones in every tier',()=>{
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
    assert.equal(entry.tabard.anchor.parent,soldier.body);
    const capeMesh=entry.cape.anchor.children[0],tabardMesh=entry.tabard.anchor.children[0];
    assert.ok(capeMesh.material.map.isDataTexture,'woven texture needs no external asset');
    const before=tabardMesh.geometry.attributes.position.array.slice();
    soldier.root.updateMatrixWorld(true);
    const bodyIndex=soldier.actor.bones.indexOf(soldier.body);
    const bindBody=new T.Matrix4().fromArray(soldier.actor.data.bones[bodyIndex].inverse).invert();
    const top=new T.Vector3().setFromMatrixPosition(bindBody.multiply(entry.cape.anchor.matrix));
    assert.ok(top.distanceTo(new T.Vector3(0,1.48,.184))<1e-5,'cape is centred behind the shoulders in bind space');
    assert.equal(entry.armour.helmet.name,'Shadow V6 / casque tactique polygonal');
    assert.ok(entry.cape.anchor.children.length,'black cape is present');

    for(const level of [1,7,10,3,1]){
      soldier.setLevel(level);
      const hidden=soldier.armor.parts.some(mesh=>mesh.geometry.userData.shadowHelmetFiltered);
      assert.equal(hidden,true,'base helmet hidden even after armour tier change');
      soldier.animate(level*.09,level%2===0,0,0,0,.016,{sprint:level===10});
      const positions=entry.cape.anchor.children[0].geometry.attributes.position.array;
      assert.ok(positions.every(Number.isFinite),'every cloth vertex stays finite');
      assert.ok(tabardMesh.geometry.attributes.position.array.every(Number.isFinite),
        'front cloth also stays finite while the armour changes');
      assert.equal(entry.tabard.anchor.parent,soldier.body);
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
    assert.notDeepEqual(tabardMesh.geometry.attributes.position.array,before,'tabard animates');
    capeMesh.geometry.computeBoundingBox();tabardMesh.geometry.computeBoundingBox();
    assert.ok(capeMesh.geometry.boundingBox.getSize(new T.Vector3()).x>.40,
      'rear cape covers the back instead of the former narrow strip');
    assert.ok(tabardMesh.geometry.boundingBox.max.z<=.001,'tabard billows toward the front');
    let disposed=0;
    capeMesh.geometry.addEventListener('dispose',()=>disposed++);
    tabardMesh.geometry.addEventListener('dispose',()=>disposed++);
    soldier.dispose();
    assert.equal(disposed,2,'both cloth panels release their geometry');
    assert.equal(entry.cape.anchor.parent,null);
    assert.equal(entry.tabard.anchor.parent,null);
    assert.ok(entry.armour.limbGroups.every(group=>group.parent===null));
    restoreDocument();
  });
}

for(const profile of CHARACTERS){
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
    for(const cloth of [entry.cape,entry.tabard]){
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
      assert.ok(cloth===entry.tabard?ratio>.44&&ratio<.54:ratio>.58&&ratio<.70,'cloth width follows the reference silhouette');
    }
    for(const hand of hands)hand.userData.dispose();soldier.dispose();
  });
}

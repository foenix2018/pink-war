import * as T from './vendor/three.webgpu.min.js';
import {decompressSync} from './vendor/fflate.module.js';
import {RLH_FIREFIGHTER_GZIP} from './rlh-firefighter-data.js';
import {createGlove,GRIP} from './hands.js';
import {WEAPON_FRAME} from './weapons.js';
import {createAegisArmor} from './aegis-v3.js';
import {createHeroLocomotion,heroGaitReference} from './hero-locomotion.js';
import {createHeroJump} from './hero-jump.js';

let cached;
const kits=new WeakMap(),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function bytes(text){return Uint8Array.from(atob(text),c=>c.charCodeAt(0));}
function array(text,Type){const b=bytes(text);return new Type(b.buffer);}
export function rlhFirefighterData(){
  if(cached)return cached;
  const data=JSON.parse(new TextDecoder().decode(decompressSync(bytes(RLH_FIREFIGHTER_GZIP))));
  for(const part of data.parts){
    const g=new T.BufferGeometry();
    for(const [key,size] of [['position',3],['normal',3],['uv',2],['color',3],['skinWeight',4]]){g.setAttribute(key,new T.BufferAttribute(array(part[key],Float32Array),size));delete part[key];}
    // Float indices keep shared rigs compatible with WebGL after WebGPU has
    // rendered them: WebGPU otherwise promotes Uint16 to Uint32 in-place.
    g.setAttribute('skinIndex',new T.Float32BufferAttribute(array(part.skinIndex,Uint16Array),4));g.setIndex(new T.BufferAttribute(array(part.index,Uint32Array),1));delete part.skinIndex;delete part.index;
    g.computeBoundingBox();g.computeBoundingSphere();part.geometry=g;
  }
  for(const clip of data.clips){clip.tracks=clip.tracks.map(t=>new (t.type==='vector'?T.VectorKeyframeTrack:T.QuaternionKeyframeTrack)(t.name,array(t.times,Float32Array),array(t.values,Float32Array)));clip.animation=new T.AnimationClip(clip.name,clip.duration,clip.tracks);}
  cached=data;return data;
}
export function syncRLHFirefighterMaterials(kit){
  const m=kits.get(kit);if(!m)return;
  const base=kit.materials;
  m.helmet.color.copy(base.rose.color);m.band.color.copy(base.suit.color);
  m.fabric.color.copy(base.suit.color).lerp(base.rose.color,.045);
  m.visor.color.copy(base.visor.color);m.visor.emissive.copy(base.rose.color).multiplyScalar(.012);
  m.reflect.color.copy(base.suit.color);m.stitch.color.copy(base.pearl.color);
}
function materials(kit){
  if(kits.has(kit))return kits.get(kit);
  const surface=kit.materials.steel.envMap,solid=p=>new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,...p});
  const m={fabric:solid({roughness:.93,bumpMap:kit.materials.suit.bumpMap,bumpScale:.00035}),band:solid({roughness:.91,bumpMap:kit.materials.suit.bumpMap,bumpScale:.00035}),reflect:solid({roughness:.93,metalness:0,bumpMap:kit.materials.suit.bumpMap,bumpScale:.00035}),rubber:solid({color:0x22282f,roughness:.9}),detail:solid({color:0xffffff,roughness:.72}),leather:solid({color:0x242a30,roughness:.67}),stitch:solid({roughness:.85}),metal:solid({color:0x9aa6b3,roughness:.32,metalness:.85,envMap:surface,envMapIntensity:.4}),pearl:solid({color:0xbcc6cd,roughness:.45}),helmet:new T.MeshPhysicalMaterial({vertexColors:true,side:T.DoubleSide,roughness:.26,metalness:.2,clearcoat:.65,clearcoatRoughness:.3,envMap:surface,envMapIntensity:.45}),visor:new T.MeshPhysicalMaterial({vertexColors:true,side:T.DoubleSide,color:0x101827,roughness:.17,metalness:.6,clearcoat:.65,emissive:0x000000,envMap:surface,envMapIntensity:.4})};
  kits.set(kit,m);syncRLHFirefighterMaterials(kit);return m;
}
const militaryGeometries=new WeakMap();
function militaryGeometry(part){
  if(militaryGeometries.has(part))return militaryGeometries.get(part);
  const source=part.geometry,p=source.attributes.position,index=source.index,indices=[];
  let removed=0;
  for(let t=0;t<index.count;t+=3){
    const ids=[index.getX(t),index.getX(t+1),index.getX(t+2)];
    // Only the external breathing cylinder/harness is removed. The original
    // jacket is entirely in front of z=.184, and the helmet ends at z=.148.
    const pack=ids.every(i=>p.getZ(i)>.185&&p.getY(i)>1.04&&p.getY(i)<1.72&&Math.abs(p.getX(i))<.24);
    if(pack){removed++;continue;}indices.push(...ids);
  }
  const geometry=removed?source.clone():source;
  if(removed){geometry.setIndex(indices);geometry.userData.removedRescuePackTriangles=removed;}
  militaryGeometries.set(part,geometry);return geometry;
}
export function createRLHFirefighterActor(kit,{includeGloves=true,military=false}={}){
  const data=rlhFirefighterData(),root=new T.Group(),bones=data.bones.map(b=>{const bone=new T.Bone();bone.name=b.name;bone.position.fromArray(b.p);bone.quaternion.fromArray(b.q);return bone;});root.name='RLH pompier complet';
  for(let i=0;i<bones.length;i++){const parent=data.bones[i].parent;(parent<0?root:bones[parent]).add(bones[i]);}
  root.updateMatrixWorld(true);
  const skeleton=new T.Skeleton(bones,data.bones.map(b=>new T.Matrix4().fromArray(b.inverse))),m=materials(kit),parts=[];
  for(const part of data.parts){const mesh=new T.SkinnedMesh(military?militaryGeometry(part):part.geometry,m[part.key]);mesh.name='RLH '+part.key;root.add(mesh);mesh.bind(skeleton,new T.Matrix4());mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.boundingBox=new T.Box3(new T.Vector3(-1,-.2,-1),new T.Vector3(1,2.35,1));mesh.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.8);parts.push(mesh);}
  const byName=new Map(bones.map(b=>[b.name,b])),bone=name=>byName.get('mixamorig'+name);
  const mixer=new T.AnimationMixer(root),actions=Object.fromEntries(data.clips.map(c=>{const a=mixer.clipAction(c.animation);a.play();a.enabled=true;a.setEffectiveWeight(c.name==='idle'?1:0);return [c.name,a];}));
  let state='idle';const weights=Object.fromEntries(Object.keys(actions).map(key=>[key,key==='idle'?1:0]));
  const nativePose=bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));
  const gloves=includeGloves?[createGlove(kit.gloves,{mirror:true,sleeve:false}),createGlove(kit.gloves,{sleeve:false})]:[];
  for(const g of gloves)root.add(g);
  function attachGloves(){root.updateMatrixWorld(true);for(let i=0;i<gloves.length;i++){const b=bone((i===0?'Left':'Right')+'Hand'),g=gloves[i],p=root.worldToLocal(b.getWorldPosition(new T.Vector3()));g.quaternion.copy(root.getWorldQuaternion(new T.Quaternion()).invert().multiply(b.getWorldQuaternion(new T.Quaternion())).multiply(g.userData.rlh.quaternion.clone().invert()));g.userData.setBasePosition(p.sub(new T.Vector3(...GRIP.wrist).multiply(g.scale).applyQuaternion(g.quaternion)).toArray());}}
  const api={root,bones,bone,skeleton,parts,gloves,mixer,actions,data,
    animateNative(time,dt=.016,motion='idle',speed=1){
      const next=actions[motion]?motion:'idle';
      if(next!==state&&['walk','walkRifle','run'].includes(next)){
        const previous=actions[state],oldStrike=api.gaitReference?.[state]?.strike||0,nextStrike=api.gaitReference?.[next]?.strike||0;
        actions[next].time=['walk','walkRifle','run'].includes(state)?((previous.time/previous.getClip().duration-oldStrike+nextStrike+1)%1)*actions[next].getClip().duration:nextStrike*actions[next].getClip().duration;
      }
      state=next;
      for(const [key,a] of Object.entries(actions)){weights[key]+=(Number(key===state)-weights[key])*(1-Math.exp(-dt*11));a.setEffectiveWeight(weights[key]);a.timeScale=key==='idle'||key==='rifle'?1:speed;}
      for(const v of nativePose){v.b.position.copy(v.p);v.b.quaternion.copy(v.q);}
      mixer.update(Math.max(0,dt));
      for(const v of nativePose){v.p.copy(v.b.position);v.q.copy(v.b.quaternion);}
      for(const g of gloves)g.userData.animate({relax:.65},dt);
      attachGloves();
    },
    get motion(){return state;},
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);skeleton.dispose();for(const g of gloves)g.userData.dispose();}
  };
  api.animateNative(0,.016);return api;
}

// Pose a real Mixamo chain. The child's rest offset defines its anatomical axis;
// no scaled or stretched arm/leg geometry is used to meet a target.
function orient(bone,child,target){
  bone.updateWorldMatrix(true,true);const origin=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(origin),to=target.clone().sub(origin);
  if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)return;
  const world=bone.getWorldQuaternion(new T.Quaternion()),parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()).multiply(world)));bone.updateWorldMatrix(false,true);
}
function solveChain(upper,lower,end,target,pole){
  upper.updateWorldMatrix(true,true);const s=upper.getWorldPosition(new T.Vector3()),k=lower.getWorldPosition(new T.Vector3()),w=end.getWorldPosition(new T.Vector3()),a=s.distanceTo(k),b=k.distanceTo(w),direction=target.clone().sub(s),length=direction.length(),d=clamp(length,Math.abs(a-b)+.001,a+b-.001);direction.normalize();
  const normal=pole.clone().sub(s).addScaledVector(direction,-pole.clone().sub(s).dot(direction)).normalize();
  const along=(a*a-b*b+d*d)/(2*d),bend=Math.sqrt(Math.max(0,a*a-along*along)),elbow=s.clone().addScaledVector(direction,along).addScaledVector(normal,bend),wrist=s.clone().addScaledVector(direction,d);
  orient(upper,lower,elbow);orient(lower,end,wrist);return {elbow,wrist,upperLength:a,foreLength:b};
}

// Neutral inspection stance only. Gameplay continues to use the weapon IK.
export function poseUnarmedForInspection(model,gloves,dt=.016){
  const {root,actor}=model;
  // Inspection is a stable, exactly frontal stance, rather than a random
  // frame of the breathing/weapon animation. Movement selections stay native.
  for(let i=0;i<actor.bones.length;i++){
    actor.bones[i].position.fromArray(actor.data.bones[i].p);
    actor.bones[i].quaternion.fromArray(actor.data.bones[i].q);
  }
  root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1,foot=model.feet[i];
    const orientation=foot.getWorldQuaternion(new T.Quaternion());
    const target=root.worldToLocal(foot.getWorldPosition(new T.Vector3()));
    target.x=sign*.185;
    solveChain(model.legs[i],model.knees[i],foot,root.localToWorld(target),
      root.localToWorld(new T.Vector3(sign*.22,.54,-.35)));
    foot.quaternion.copy(foot.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));
  }
  for(let i=0;i<2;i++){
    const side=i===0?'Left':'Right',sign=i===0?-1:1;
    const upper=actor.bone(side+'Arm'),fore=actor.bone(side+'ForeArm'),hand=actor.bone(side+'Hand');
    const target=root.localToWorld(new T.Vector3(sign*.315,1.005,-.020));
    const pole=root.localToWorld(new T.Vector3(sign*.43,1.18,.045));
    solveChain(upper,fore,hand,target,pole);
    const glove=gloves[i];
    glove.userData.animate({relax:.85},dt);
    root.updateMatrixWorld(true);
    const p=root.worldToLocal(hand.getWorldPosition(new T.Vector3()));
    glove.quaternion.copy(root.getWorldQuaternion(new T.Quaternion()).invert()
      .multiply(hand.getWorldQuaternion(new T.Quaternion()))
      .multiply(glove.userData.rlh.quaternion.clone().invert()));
    glove.userData.setBasePosition(p.sub(new T.Vector3(...GRIP.wrist)
      .multiply(glove.scale).applyQuaternion(glove.quaternion)).toArray());
    glove.visible=true;
  }
  // The glove adapter uses one right-hand mesh plus an outer reflection for
  // the left hand. Mirror the complete neutral frame so their resting shapes
  // agree as well as their wrist attachment points.
  gloves[1].updateWorldMatrix(true,false);
  const leftFrame=new T.Matrix4().makeScale(-1,1,1)
    .multiply(root.matrixWorld.clone().invert()).multiply(gloves[1].matrixWorld);
  leftFrame.decompose(gloves[0].position,gloves[0].quaternion,gloves[0].scale);
  model.gun.visible=false;model.freeHand.visible=false;
}

export function createRLHSoldier(kit,createGun,profile){
  const actor=createRLHFirefighterActor(kit,{includeGloves:false,military:true}),{root,bone,data}=actor,targetHeight=profile?.masculine?1.8:1.7;
  // Retain the source rig/clips intact for native animation and foot samples;
  // render the new fitted soldier instead of the former rescue clothing.
  for(const part of actor.parts)part.removeFromParent();
  root.name=profile?.name||'GHJU';for(const glove of actor.gloves)glove.removeFromParent();
  const hips=bone('Hips'),spine=bone('Spine'),body=bone('Spine2'),headBone=bone('Head'),head=new T.Group();head.name='ClosedHelmet';headBone.add(head);
  root.updateMatrixWorld(true);head.position.copy(headBone.worldToLocal(new T.Vector3(0,1.751,.018)));
  const legs=['LeftUpLeg','RightUpLeg'].map(bone),knees=['LeftLeg','RightLeg'].map(bone),feet=['LeftFoot','RightFoot'].map(bone);
  const mount=new T.Group(),gun=createGun({sleeve:false}),rest=createGlove(kit.gloves,{mirror:true,sleeve:false});rest.name='Free RLH hand';root.add(mount,rest);mount.add(gun);gun.scale.setScalar(.88);
  const arms=['Left','Right'].map(side=>({side,shoulder:bone(side+'Arm'),upper:bone(side+'Arm'),fore:bone(side+'ForeArm'),hand:bone(side+'Hand'),elbow:new T.Vector3(),wrist:new T.Vector3()}));
  const armor=createAegisArmor(actor,kit,profile);
  const chestRest=body.getWorldPosition(new T.Vector3());let level=1,weapon=0,anchor=new T.Vector3(),low=0,gait=0,recoilBody=0,carry=0,previewCarry=false;
  const supported=()=>!!WEAPON_FRAME[weapon].dual||!!WEAPON_FRAME[weapon].support&&!previewCarry;
  const soleSamples=[];
  for(const mesh of actor.parts){if(mesh.name!=='RLH rubber')continue;const p=mesh.geometry.attributes.position;
    for(const sign of [-1,1]){const candidates=[];for(let i=0;i<p.count;i++)if(p.getY(i)<.07&&p.getX(i)*sign>.05)candidates.push(i);
      const cells=new Map();for(const i of candidates){const key=Math.floor(p.getX(i)/.012)+','+Math.floor(p.getZ(i)/.012);const previous=cells.get(key);if(previous===undefined||p.getY(i)<p.getY(previous))cells.set(key,i);}for(const index of cells.values())soleSamples.push({mesh,index});
      for(const read of ['getX','getZ'])for(const direction of [-1,1]){let chosen,best=-Infinity;for(const i of candidates){const value=p[read](i)*direction;if(value>best){chosen=i;best=value;}}if(chosen!==undefined)soleSamples.push({mesh,index:chosen});}
    }
  }
  const soleMeshes=[...new Set(soleSamples.map(sample=>sample.mesh))];
  actor.gaitReference=heroGaitReference(data,soleSamples);
  const locomotion=createHeroLocomotion({root,actor,hips,spine,body,legs,knees,feet},solveChain);
  const jump=createHeroJump({root,hips,spine,body,legs,knees,feet,freeArm:arms[0].upper},solveChain,locomotion.footFloor);
  function wristTargets(){root.updateMatrixWorld(true);return [supported()?gun.userData.support.localToWorld(new T.Vector3(...GRIP.wrist)):rest.localToWorld(new T.Vector3(...GRIP.wrist)),gun.userData.hand.localToWorld(new T.Vector3(...GRIP.wrist))];}
  function fitMount(){
    for(let j=0;j<16;j++){
      root.updateMatrixWorld(true);const targets=wristTargets(),move=new T.Vector3(),s=root.getWorldScale(new T.Vector3()).y;let corrections=0;
      for(let i=0;i<2;i++){if(i===0&&!supported())continue;const a=arms[i],center=a.upper.getWorldPosition(new T.Vector3()),delta=center.clone().sub(targets[i]),distance=delta.length(),reach=(a.fore.position.length()+a.hand.position.length())*s-.006*s;if(distance>reach){move.add(delta.normalize().multiplyScalar((distance-reach)/s));corrections++;}}
      if(!corrections)break;move.applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).invert());mount.position.addScaledVector(move,.8/corrections);
    }
  }
  function attachFreeHand(){
    if(!rest.visible)return;root.updateMatrixWorld(true);const hand=arms[0].hand;
    rest.quaternion.copy(root.getWorldQuaternion(new T.Quaternion()).invert().multiply(hand.getWorldQuaternion(new T.Quaternion())).multiply(rest.userData.rlh.quaternion.clone().invert()));
    const position=root.worldToLocal(hand.getWorldPosition(new T.Vector3())).sub(new T.Vector3(...GRIP.wrist).multiply(rest.scale).applyQuaternion(rest.quaternion));rest.userData.setBasePosition(position.toArray());
  }
  function solveArms(){fitMount();const targets=wristTargets();for(let i=0;i<2;i++){const arm=arms[i];
    if(i!==0||supported()){const pole=root.localToWorld(new T.Vector3(i===0?-.55:.55,1.05,.15));solveChain(arm.upper,arm.fore,arm.hand,targets[i],pole);const glove=i===0?gun.userData.support:gun.userData.hand;arm.hand.quaternion.copy(arm.hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(glove.getWorldQuaternion(new T.Quaternion())).multiply(glove.userData.rlh.quaternion));arm.hand.updateWorldMatrix(false,true);}
    arm.elbow.copy(arm.shoulder.worldToLocal(arm.fore.getWorldPosition(new T.Vector3())));arm.wrist.copy(arm.shoulder.worldToLocal(arm.hand.getWorldPosition(new T.Vector3())));arm.upper.userData.length=arm.fore.position.length();arm.fore.userData.length=arm.hand.position.length();}}
  const api={root,hips,spine,body,rig:root,head,hair:new T.Group(),legs,knees,feet,gun,freeHand:rest,arms,pennants:[],actor,armor,nativeSkeleton:actor.skeleton,targetHeight,heightScale:targetHeight/2,measuredUnscaledHeight:2,weapon:0,
    setFootSoles(points){locomotion.setSoles(points);},
    jointPositions(){root.updateWorldMatrix(true,true);const at=o=>o.getWorldPosition(new T.Vector3()),out={pelvis:at(hips),chest:at(body),head:at(head)};for(let i=0;i<2;i++){const side=i===0?'left':'right',prefix=i===0?'Left':'Right';out[side+'Hip']=at(legs[i]);out[side+'Knee']=at(knees[i]);out[side+'Ankle']=at(feet[i]);out[side+'Toe']=at(bone(prefix+'ToeBase'));out[side+'Shoulder']=at(arms[i].upper);out[side+'Elbow']=at(arms[i].fore);out[side+'Wrist']=at(arms[i].hand);}return out;},
    setWeapon(index){weapon=index;this.weapon=index;gun.userData.setVariant(index);rest.visible=!WEAPON_FRAME[index].support;
      anchor.set(.19,1.29,-.32);root.updateMatrixWorld(true);
      for(let j=0;j<75;j++){mount.position.copy(anchor);root.updateMatrixWorld(true);const ws=wristTargets();let fits=true;for(let i=0;i<2;i++){if(i===0&&!WEAPON_FRAME[index].support)continue;const arm=arms[i],p=arm.upper.getWorldPosition(new T.Vector3()),reach=(arm.fore.position.length()+arm.hand.position.length())*root.getWorldScale(new T.Vector3()).y;if(p.distanceTo(ws[i])>reach-.012)fits=false;}if(fits)break;anchor.z+=.008;}
      mount.position.copy(anchor);attachFreeHand();solveArms();
    },
    setLevel(n){level=clamp(Math.floor(Number(n)||1),1,10);armor.setLevel(level);gun.userData.setLevel(level);rest.userData.setLevel(level);},
    get equipmentLevel(){return level;},get visibleParts(){return armor.count;},get batchCount(){return armor.parts.length;},
    animate(time,moving,recoil=0,reload=0,trigger=0,dt=.016,flight={}){
      dt=clamp(dt,0,.08);if(dt===0){actor.skeleton.update();return;}
      const motionState=locomotion.sample(moving,dt,flight,this._lastRootPosition);this._lastRootPosition=root.position.clone();this.locomotion=motionState;
      this.jumpPose=jump.sample(dt,flight);
      const speed=motionState.speed,travelling=moving&&speed>.08,forward=Math.abs(motionState.travelDirection.x)<.85&&!motionState.backward;
      this._runMode=!flight.crouched&&forward&&(!!flight.sprint||speed>(this._runMode?4.8:5.8));
      const run=this._runMode,aiming=trigger>.1||!!flight?.firing||!!flight?.aim,motion=travelling&&!flight.airborne?(run?'run':aiming?'walkRifle':'walk'):aiming?'rifle':'idle';this.nativeMotion=motion;
      previewCarry=!!flight?.preview&&!moving&&!aiming&&!reload&&!WEAPON_FRAME[weapon].melee;
      rest.visible=!supported();gun.userData.support.visible=supported()&&gun.userData.showSupport;
      const cadence=clamp(speed/(run?6.4:2.6),.6,flight.crouched?1.1:1.8);
      actor.animateNative(time,dt,motion,travelling?cadence:1);
      low+=(Number(!!flight?.crouched)-low)*(1-Math.exp(-dt*8));this._low=low;gait+=(Number(travelling)-gait)*(1-Math.exp(-dt*9));this._gaitWeight=gait;
      if(!flight?.airborne&&soleSamples.length){
        root.updateMatrixWorld(true);
        // The legacy skin is now a measurement-only source outside the scene.
        // Retain its former root-local bind frame: world elevation/scale must
        // never be subtracted from the pelvis when climbing stairs or lifts.
        for(const mesh of soleMeshes)mesh.bindMatrixInverse.copy(root.matrixWorld).invert();
        const correction=locomotion.groundTarget(actor.actions.run.getEffectiveWeight());
        hips.position.y-=locomotion.groundCorrection(correction,dt);
      }else if(flight.airborne)hips.position.y-=locomotion.groundOffset();
      root.updateMatrixWorld(true);const footTargets=feet.map(f=>f.getWorldPosition(new T.Vector3())),footQuats=feet.map(f=>f.getWorldQuaternion(new T.Quaternion()));
      const lower=low*.265;
      hips.position.y-=lower;spine.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),low*.25));
      const recoilTarget=clamp(recoil/.16);recoilBody+=(recoilTarget-recoilBody)*(1-Math.exp(-dt*(recoilTarget>recoilBody?34:16)));this._recoilBody=recoilBody;
      body.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),recoilBody*.025));
      if(lower>.001&&!flight?.airborne)for(let i=0;i<2;i++){solveChain(legs[i],knees[i],feet[i],footTargets[i],root.localToWorld(new T.Vector3(i===0?-.12:.12,.55,-.55)));feet[i].quaternion.copy(feet[i].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(footQuats[i]));}
      locomotion.pose(dt,flight);locomotion.plant(dt,flight);
      jump.pose(flight,motionState,!supported());
      root.updateMatrixWorld(true);
      const chest=root.worldToLocal(body.getWorldPosition(new T.Vector3())),delta=chest.clone().sub(chestRest);
      mount.position.copy(anchor).add(delta);mount.position.y-=low*.06;mount.position.z+=recoil*.08;
      if(flight?.preview){mount.position.y-=.14;mount.position.z+=.10;}
      gun.rotation.x=clamp(reload)*Math.PI/2+recoil*.17;
      const lowerWeapon=!aiming&&!reload&&!WEAPON_FRAME[weapon].melee&&!flight?.airborne&&!flight?.crouched;
      carry+=(Number(lowerWeapon)-carry)*(1-Math.exp(-dt*7));
      if(carry>.001){
        gun.rotation.x-=carry*(moving?.48:previewCarry?1.12:.91);
        root.updateMatrixWorld(true);
        const wrist=mount.worldToLocal(gun.userData.hand.localToWorld(new T.Vector3(...GRIP.wrist)));
        const ready=new T.Vector3(previewCarry?.30:.24,moving?1.16:1.075,moving?-.21:-.10).sub(wrist).add(delta);
        mount.position.lerp(ready,carry);
      }
      if(WEAPON_FRAME[weapon].melee){const slash=flight?.saberSwing||{};gun.rotation.set((slash.x||0)-.12,slash.y||0,slash.z||0);}else{gun.rotation.y=gun.rotation.z=0;}
      gun.userData.animateHands(trigger,.18+recoilBody*.3,reload,dt);rest.userData.animate({relax:.65},dt);attachFreeHand();
      solveArms();actor.skeleton.update();
    },
    dispose(){armor.dispose();actor.dispose();rest.userData.dispose();gun.userData.disposeDynamic?.();}
  };
  api.setWeapon(0);api.setLevel(1);api.animate(0,false);
  root.updateMatrixWorld(true);const standingBounds=new T.Box3().setFromObject(root,true);api.measuredUnscaledHeight=standingBounds.max.y-standingBounds.min.y;api.heightScale=targetHeight/api.measuredUnscaledHeight;return api;
}

import {starterWeaponIndex} from './game-logic.js';
// Reuse the real Pink War assets in room-scale AR; no substitute low-poly enemies or guns.
import * as T from './vendor/three.webgpu.min.js';
import { createEnemyFactory } from './enemies.js';
import { createCharacterKit, createSoldier } from './soldier.js';
import {installShadowUnit,applyShadowMaterials} from './shadow-unit-game.js';
import {setKenneyAccent} from './kenney-blasters.js';
import { buildGun } from './weapons.js';
import { createGlove } from './hands.js';
import { createSurfaceDetails } from './surfaces.js';
import { createRuinedRoomMaterials } from './world-art.js';
import { characterForId } from './characters.js';
import { createRoomArchitecture } from './room-art.js';
import { WEAPONS } from './game-logic.js';

function emblemTexture(profile) {
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=128;
  const c=canvas.getContext('2d');
  c.fillStyle=profile.masculine?'#142b42':'#281d33';c.fillRect(0,0,256,128);
  c.strokeStyle=profile.accent;c.lineWidth=5;c.strokeRect(4,4,248,120);
  c.fillStyle=profile.accent;c.beginPath();
  c.moveTo(128,13);c.lineTo(106,39);c.lineTo(84,23);c.lineTo(88,52);c.lineTo(168,52);
  c.lineTo(172,23);c.lineTo(150,39);c.closePath();c.fill();
  c.fillStyle='#fff3fc';c.font='bold 38px monospace';c.textAlign='center';
  c.fillText(profile.name,128,91);c.font='19px monospace';c.fillText('— 07 —',128,116);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return map;
}
function enemyMaterials(profile, surface) {
  const w=profile.world,p=profile.palette;
  const standard=(color,roughness=.56,metalness=.4)=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:surface.coating,envMap:surface.environment,envMapIntensity:.6});
  const basic=color=>new T.MeshBasicMaterial({color,toneMapped:false});
  return {
    steel:standard(p.steel),dark:standard(p.ink),rose:basic(p.rose),pale:basic(p.pale),
    violet:basic(p.violet),cyan:basic(w.cyan),
    monster:standard(w.monster,.54,.5),
    monsterElite:standard(w.monsterElite,.42,.65),
    monsterFace:standard(w.monsterFace,.3,.66),
    armor:standard(w.armor),armorLight:standard(w.armorLight),suit:standard(w.suit),
    white:standard(p.white),visor:standard(w.visor,.15,.8),hair:standard(w.hair)
  };
}
function flashFactory(accent) {
  const material=new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.72,depthWrite:false,blending:T.AdditiveBlending});
  return parent=>{
    const sprite=new T.Mesh(new T.SphereGeometry(.055,8,6),material);
    parent.add(sprite);return sprite;
  };
}
function prepareCharacter(profile,surface) {
  const mats=enemyMaterials(profile,surface),kit=createCharacterKit(emblemTexture(profile),surface);
  kit.setPalette(profile.armor);
  const makeGun=({sleeve=true}={})=>buildGun({mats,gloves:kit.gloves,sleeve,makeFlash:flashFactory(profile.palette.rose)});
  return {mats,kit,makeGun};
}

export async function createAtHomeAssets(scene, hero) {
  const surface=createSurfaceDetails();setKenneyAccent(hero.palette.rose);
  const player=prepareCharacter(hero,surface);
  const other=characterForId(hero.id==='ghju'?'lylu':'ghju');
  const companionKit=prepareCharacter(other,surface);
  const enemyFactory=createEnemyFactory(player.mats);
  const gun=player.makeGun({sleeve:true});
  gun.userData.recoilTracked=true;
  gun.userData.showSupport=false;gun.userData.support.visible=false;
  gun.userData.setVariant(starterWeaponIndex(hero.id));
  const offGun=player.makeGun({sleeve:true});offGun.name='GHJU / pistolet gauche suivi';offGun.scale.x=-1;
  offGun.userData.recoilTracked=true;
  offGun.userData.showSupport=false;offGun.userData.setVariant(starterWeaponIndex(hero.id));offGun.visible=false;
  const freeHand=createGlove(player.kit.gloves,{mirror:true});
  gun.userData.hand.userData.extendForearm();offGun.userData.hand.userData.extendForearm();freeHand.userData.extendForearm();
  // The player sees their actual Pink War gun/gloves in first person.
  // Their sibling is the real animated character model, not a substitute mannequin.
  const companion=createSoldier(companionKit.kit,companionKit.makeGun,other);
  installShadowUnit(companion,other);
  applyShadowMaterials(companionKit.kit,other);
  companion.root.visible=false;scene.add(companion.root);
  const ruin=createRuinedRoomMaterials(hero.palette.rose,{opaque:true});
  const architecture=createRoomArchitecture(scene,hero,ruin);
  const portals=new Map(),offers=new Map();
  const pickupMat=new T.MeshBasicMaterial({color:hero.palette.rose,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false,toneMapped:false});
  const pickupBase=new T.CylinderGeometry(.28,.32,.10,24),pickupBeam=new T.CylinderGeometry(.014,.014,1.4,8);
  const portalMaterial=new T.MeshBasicMaterial({color:hero.palette.rose,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
  const innerMaterial=new T.MeshBasicMaterial({color:hero.palette.violet,transparent:true,opacity:.38,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
  const portal=new T.Group();
  portal.name='Pink War — la Brèche dans le salon';
  const ring=new T.Mesh(new T.TorusGeometry(.82,.075,8,52),portalMaterial);
  ring.position.y=1.13;portal.add(ring);
  const inner=new T.Mesh(new T.TorusGeometry(.61,.024,6,36),innerMaterial);
  inner.position.y=1.13;portal.add(inner);
  const pillar=new T.Mesh(new T.CylinderGeometry(.025,.045,2.24,6),portalMaterial);
  pillar.position.set(-.94,1.13,0);portal.add(pillar);
  const pillar2=pillar.clone();pillar2.position.x=.94;portal.add(pillar2);
  const base=new T.Mesh(new T.TorusGeometry(.7,.022,5,48),innerMaterial);
  base.rotation.x=-Math.PI/2;base.position.y=.035;portal.add(base);
  portal.visible=false;scene.add(portal);
  let lastCompanionAnimation=-1;

  return {
    hero,other,player,gun,offGun,freeHand,portal,companion,architecture,portals,offers,
    makeEnemy(form='stalker',elite=false,ranged=false) {
      return enemyFactory.create(elite,ranged,form);
    },
    setWeapon(index,level=1) {
      gun.userData.setVariant(index);
      gun.userData.setLevel(level);
      offGun.userData.setVariant(index);offGun.userData.setLevel(level);
      companion.setLevel(level);
      companion.setWeapon(index);
    },
    animate(time,dt,level,gunState={}) {
      if(time<lastCompanionAnimation)lastCompanionAnimation=-1;
      const idx=gun.userData.index || 0;
      const dual=idx===7;
      gun.userData.setCombatState?.({...gunState,dualState:dual?{...gunState.dualState,shotAt:{right:gunState.dualState?.shotAt?.right??-Infinity,left:-Infinity}}:null,bladeHeld:idx===5&&(gunState.trigger||0)>.15});
      gun.userData.animateHands?.(gunState.trigger||0,gunState.grip??.64,gunState.reload||0,dt);
      const offGrip=gunState.offGrip||0,offTrigger=gunState.offTrigger||0;
      if(dual){
        offGun.userData.setCombatState({...gunState,dualState:{...gunState.dualState,shotAt:{right:gunState.dualState?.shotAt?.left??-Infinity,left:-Infinity}}});
        offGun.userData.hand.userData.animate({trigger:offTrigger,grip:Math.max(.92,offGrip)},dt,-1);
        offGun.rotation.copy(gun.rotation);offGun.position.copy(gun.position);
        offGun.userData.setFlash(!!gunState.flash,time);
      }
      freeHand.userData.animate?.({trigger:offTrigger,grip:offGrip,relax:(1-offGrip)*(1-offTrigger)*.5},dt);
      gun.userData.setFlash(!!gunState.flash,time);
      if (time-lastCompanionAnimation>.055) {
        companion.animate(time,false,0,0,0,Math.min(.09,time-lastCompanionAnimation),{preview:false});
        lastCompanionAnimation=time;
      }
      inner.rotation.z=time*.19;
      ring.rotation.z=-time*.055;
      for(const [id,gate] of portals){gate.children[1].rotation.z=time*.19+id;gate.scale.setScalar(Math.min(.85,Math.max(.02,(time-gate.userData.openedAt+1)*.75)));}
      for(const item of offers.values()){item.gun.rotation.y=time*.32;item.gun.position.y=1.03+Math.sin(time*2)*.035;}
      portalMaterial.opacity=.56+Math.sin(time*2.1)*.09;
    },
    placeCompanion(point,lookAt) {
      companion.root.visible=true;
      companion.root.position.copy(point);
      companion.root.scale.setScalar(companion.heightScale);
      companion.root.lookAt(lookAt.x,point.y,lookAt.z);
      companion.root.rotateY(Math.PI);
    },
    placePortal(point,lookAt) {
      portal.position.copy(point);
      portal.lookAt(lookAt.x,point.y+1.1,lookAt.z);
      portal.visible=true;
    },
    setPortals(sites,lookAt){
      for(const gate of portals.values())if(gate!==portal)gate.removeFromParent();portals.clear();portal.visible=false;
      sites.forEach((site,i)=>{const gate=i===0?portal:portal.clone();if(i)scene.add(gate);
        gate.position.set(site.x,site.elevation,site.z);gate.rotation.y=site.yaw;gate.visible=true;gate.scale.setScalar(.02);gate.userData.openedAt=site.openedAt;portals.set(site.id,gate);});
    },
    syncOffers(list){
      for(const [index,item] of offers)if(!list.some(o=>o.index===index)){item.root.removeFromParent();item.gun.userData.disposeDynamic?.();offers.delete(index);item.label.geometry.dispose();item.label.material.map.dispose();item.label.material.dispose();}
      for(const offer of list)if(!offers.has(offer.index)){
        const root=new T.Group(),display=player.makeGun({sleeve:false});display.userData.setVariant(offer.index);display.userData.hand.visible=display.userData.support.visible=false;display.userData.showSupport=false;display.scale.setScalar(.7);display.position.y=1.03;root.add(display);
        const base=new T.Mesh(pickupBase,ruin.metal),beam=new T.Mesh(pickupBeam,pickupMat);base.position.y=.05;beam.position.y=.75;root.add(base,beam);
        const cv=document.createElement('canvas');cv.width=512;cv.height=160;const c=cv.getContext('2d');c.fillStyle='#14212be8';c.fillRect(0,0,512,160);c.fillStyle=hero.accent;c.font='bold 44px monospace';c.textAlign='center';c.fillText(WEAPONS[offer.index].name,256,58);c.fillStyle='white';c.font='21px monospace';c.fillText('CLIC JOYSTICK GAUCHE · PRENDRE',256,118);
        const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;const label=new T.Mesh(new T.PlaneGeometry(.8,.25),new T.MeshBasicMaterial({map,side:T.DoubleSide,transparent:true}));label.position.set(0,1.43,0);root.add(label);
        root.position.set(offer.x,offer.elevation,offer.z);scene.add(root);offers.set(offer.index,{root,gun:display,label});
      }
    },
    hideDecor() { portal.visible=false;companion.root.visible=false;for(const gate of portals.values())gate.visible=false;this.syncOffers([]);architecture.resetRoom(); },
    projectRuin(record, immersive=true,viewer) {
      architecture.project(record,viewer);if(record.decor)record.decor.visible=immersive;
    },
    disposeDecor(record) {
      architecture.disposeDecor(record);
    },
    dispose() {
      this.hideDecor();gun.userData.disposeDynamic?.();offGun.userData.disposeDynamic?.();freeHand.userData.dispose?.();
      companion.dispose?.();scene.remove(companion.root,portal);architecture.dispose();
      for(const material of [ruin.concrete,ruin.metal,ruin.road,ruin.glow,portalMaterial,innerMaterial]) material.dispose();
      for(const name of ['concreteMap','metalMap','roadMap']) ruin[name]?.dispose?.();
      for(const geometry of new Set(portal.children.map(child=>child.geometry))) geometry?.dispose();
      pickupBase.dispose();pickupBeam.dispose();pickupMat.dispose();
    }
  };
}

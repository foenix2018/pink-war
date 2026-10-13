// Reuse the real Pink War assets in room-scale AR; no substitute low-poly enemies or guns.
import * as T from './vendor/three.webgpu.min.js';
import { createEnemyFactory } from './enemies.js';
import { createCharacterKit, createSoldier } from './soldier.js';
import { buildGun } from './weapons.js';
import { createGlove } from './hands.js';
import { createSurfaceDetails } from './surfaces.js';
import { createRuinedRoomMaterials } from './world-art.js';
import { characterForId } from './characters.js';

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
  const standard=(color,roughness=.56,metalness=.4)=>new T.MeshStandardMaterial({color,roughness,metalness,roughnessMap:surface.coating});
  const basic=color=>new T.MeshBasicMaterial({color,toneMapped:false});
  return {
    steel:standard(w.steel),dark:standard(p.ink),rose:basic(p.rose),pale:basic(p.pale),
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
  const surface=createSurfaceDetails();
  const player=prepareCharacter(hero,surface);
  const other=characterForId(hero.id==='ghju'?'lylu':'ghju');
  const companionKit=prepareCharacter(other,surface);
  const enemyFactory=createEnemyFactory(player.mats);
  const gun=player.makeGun({sleeve:true});
  gun.userData.showSupport=false;gun.userData.support.visible=false;
  gun.userData.setVariant(0);
  const freeHand=createGlove(player.kit.gloves,{mirror:true});
  // The player sees their actual Pink War gun/gloves in first person.
  // Their sibling is the real animated character model, not a substitute mannequin.
  const companion=createSoldier(companionKit.kit,companionKit.makeGun,other);
  companion.root.visible=false;scene.add(companion.root);
  const ruin=createRuinedRoomMaterials(hero.palette.rose);
  const generated = new Set();
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
    hero,other,player,gun,freeHand,portal,companion,
    makeEnemy(form='stalker',elite=false,ranged=false) {
      return enemyFactory.create(elite,ranged,form);
    },
    setWeapon(index,level=1) {
      gun.userData.setVariant(index);
      gun.userData.setLevel(level);
      companion.setLevel(level);
      companion.setWeapon(index);
    },
    animate(time,dt,level,gunState={}) {
      const idx=gun.userData.index || 0;
      gun.userData.setCombatState?.({...gunState,bladeHeld:idx===5&&(gunState.trigger||0)>.15});
      gun.userData.animateHands?.(gunState.trigger||0,gunState.grip??.64,gunState.reload||0,dt);
      const offGrip=gunState.offGrip||0,offTrigger=gunState.offTrigger||0;
      freeHand.userData.animate?.({trigger:offTrigger,grip:offGrip,relax:(1-offGrip)*(1-offTrigger)*.5},dt);
      gun.userData.flash.visible=!!gunState.flash;
      if (time-lastCompanionAnimation>.055) {
        companion.animate(time,false,0,0,0,Math.min(.09,time-lastCompanionAnimation),{preview:false});
        lastCompanionAnimation=time;
      }
      inner.rotation.z=time*.19;
      ring.rotation.z=-time*.055;
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
    hideDecor() { portal.visible=false;companion.root.visible=false; },
    // Furniture and scanned walls become the original game's cracked concrete/metal
    // in a transparent overlay. Real-world passthrough remains visible for safety.
    projectRuin(record, immersive=true) {
      if (!record?.collider?.geometry) return;
      const previous=record.decor;
      if (previous) { record.collider.remove(previous); previous.geometry.dispose(); record.decor=null; }
      if (!immersive) return;
      const geometry=record.collider.geometry.clone();
      const panel=new T.Mesh(geometry,record.isFloor?ruin.road:ruin.concrete);
      panel.name='Pink War ruin texture on detected real surface';
      const n=geometry.getAttribute('normal');
      if (n?.count) panel.position.set(n.getX(0),n.getY(0),n.getZ(0)).multiplyScalar(.009);
      panel.renderOrder=3;
      record.collider.add(panel);record.decor=panel;
    },
    disposeDecor(record) {
      if (record?.decor) {
        record.collider.remove(record.decor);
        record.decor.geometry.dispose();
        record.decor=null;
      }
    },
    dispose() {
      this.hideDecor();gun.userData.disposeDynamic?.();freeHand.userData.dispose?.();
      companion.dispose?.();scene.remove(companion.root,portal);
      for(const material of [ruin.concrete,ruin.metal,ruin.road,ruin.glow,portalMaterial,innerMaterial]) material.dispose();
      for(const name of ['concreteMap','metalMap','roadMap']) ruin[name]?.dispose?.();
      for(const geometry of new Set(portal.children.map(child=>child.geometry))) geometry?.dispose();
    }
  };
}

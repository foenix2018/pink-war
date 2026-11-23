import {installOutfitStages} from './hero-outfit-stages.js';
// Shared Pink War Shadow Unit skin for the playable GHJU/LYLU soldiers.
// The base Mixamo/RLH rig, weapon hands and combat logic remain unchanged.
import {attachShadowConcept} from './personnage-shadow-concept.js?v=3.74.0';
import {addCapeToOriginalSoldier} from './personnage-cape-addon.js?v=3.74.0';
import {attachHeroGear} from './hero-gear.js';
import {shapeHeroFigure} from './hero-figure.js';
import {applyHexSuit} from './hero-suit.js';

export function applyShadowMaterials(kit,profile){
  // Keep both teams' glow/accent colors while replacing the pale AÉGIS shell
  // with the graphite armour from the isolated Shadow Unit preview.
  const colors={...profile.armor,rose:0x232630,pearl:0x575d68,
    dark:0x15171d,steel:0x444a55,suit:0x101218,
    visor:0x090b10,lens:profile.masculine?0x133758:0x390e28};
  kit.setPalette(colors);
  for(const [key,color] of Object.entries({
    rose:0x232630,pearl:0x616773,dark:0x15171d,steel:0x444a55,suit:0x101218
  })){
    if(kit.armorMaterials?.[key]?.color)kit.armorMaterials[key].color.setHex(color);
    if(kit.materials?.[key]?.color)kit.materials[key].color.setHex(color);
  }
}

export function installShadowUnit(model,profile){
  if(model.shadowUnit)return model.shadowUnit;
  const armour=attachShadowConcept(model,profile);
  const cape=addCapeToOriginalSoldier(model,profile);
  // Torn front tabard and the Blender gear of the concept art (cowl, belt, slung rifle, riveted plates).
  const tabard=addCapeToOriginalSoldier(model,profile,{front:true});
  const gear=attachHeroGear(model,profile,{cape,tabard,armour});
  // GHJU's feminine figure: the rig itself is reshaped last, once every plate and cloth has been fitted in bind pose.
  const figure=shapeHeroFigure(model,profile);
  // The undersuit: honeycomb of small hexagonal cells (plum for GHJU, blue for LYLU) instead of a plain black.
  const suit=applyHexSuit(model,profile);
  const outfits=installOutfitStages(model,profile,{armour,gear});

  // Drive the cape with the soldier's actual animation clock. This covers
  // 3rd-person campaign, arena, stand, outfit, lobby and AT HOME companion.
  // The wearer remains invisible in WebXR FPS, exactly like the source game.
  const animate=model.animate.bind(model);
  model.animate=(time,moving,recoil,reload,trigger,dt,flight={})=>{
    armour.restoreAttachments();
    animate(time,moving,recoil,reload,trigger,dt,flight);
    const locomotion=model.locomotion||{};
    const travelling=(locomotion.speed||0)>.1;
    const movement=flight.airborne?'jump':flight.crouched&&travelling?'crouchWalk':
      model.nativeMotion==='run'?'run':travelling?'walk':'idle';
    cape.update(time,movement,.63,{velocity:locomotion.forward||0,lateral:locomotion.lateral||0,turn:locomotion.turn||0});
    tabard.update(time,movement,.63,{velocity:locomotion.forward||0,lateral:locomotion.lateral||0,turn:locomotion.turn||0});
  };
  const dispose=model.dispose.bind(model);
  model.dispose=()=>{
    outfits.dispose();armour.dispose();
    cape.dispose();tabard.dispose();gear.dispose();suit.dispose();figure?.dispose();
    dispose();
  };
  model.shadowUnit={outfits,armour,cape,tabard,gear,figure,suit,profile:profile.id};
  return model.shadowUnit;
}

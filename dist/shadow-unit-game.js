// Shared Pink War Shadow Unit skin for the playable GHJU/LYLU soldiers.
// The base Mixamo/RLH rig, weapon hands and combat logic remain unchanged.
import {attachShadowConcept} from './personnage-shadow-concept.js?v=3.66.3';
import {addCapeToOriginalSoldier} from './personnage-cape-addon.js?v=3.66.3';

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
  };
  const dispose=model.dispose.bind(model);
  model.dispose=()=>{
    armour.dispose();
    cape.dispose();
    dispose();
  };
  model.shadowUnit={armour,cape,profile:profile.id};
  return model.shadowUnit;
}

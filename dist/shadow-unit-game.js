// Shared Pink War Shadow Unit skin for the playable GHJU/LYLU soldiers.
// The base Mixamo/RLH rig, weapon hands and combat logic remain unchanged.
import {attachShadowConcept} from './personnage-shadow-concept.js?v=3.55';
import {addCapeToOriginalSoldier} from './personnage-cape-addon.js?v=3.55';

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
    const movement=flight.sprint?'run':flight.crouched&&moving?'crouchWalk':
      moving?'walk':flight.airborne?'jump':'idle';
    cape.update(time,movement,.63);
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

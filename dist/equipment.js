import { characterForId } from './characters.js';
import {ARMOR_STAGES} from './armor-progression.js';
// Stage labels describe the actual AÉGIS IV modules, with unchanged combat stats.
export const EQUIPMENT=ARMOR_STAGES;

export function equipmentForLevel(level) {
  const current = Math.max(1, Math.min(10, Math.floor(Number(level) || 1)));
  return { ...EQUIPMENT[current - 1], unlocked: EQUIPMENT.slice(0, current).map(stage => stage.id) };
}

export function equipmentForCharacter(level,id) {
  const stage=equipmentForLevel(level),character=characterForId(id);
  return {...stage,name:character.outfitNames[stage.level]||stage.name,
    addition:stage.addition.replace('champagne',character.finish),
    description:stage.description.replace('ROSE–07',character.name).replace(/rose/g,character.colorWord).replace('champagne',character.finish)};
}

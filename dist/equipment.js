import { characterForId } from './characters.js';
import {ARMOR_STAGES,suitStage} from './armor-progression.js';
// Five fitted material stages; combat capabilities use the same stage specification.
export const EQUIPMENT=ARMOR_STAGES;

export function equipmentForLevel(level) {
  const current = suitStage(level);
  return { ...EQUIPMENT[current - 1], unlocked: EQUIPMENT.slice(0, current).map(stage => stage.id) };
}

export function equipmentForCharacter(level,id) {
  const stage=equipmentForLevel(level),character=characterForId(id);
  return {...stage,name:stage.name,
    addition:stage.addition.replace('champagne',character.finish),
    description:stage.description.replace('ROSE–07',character.name).replace(/rose/g,character.colorWord).replace('champagne',character.finish)};
}

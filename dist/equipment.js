import { characterForId } from './characters.js';
// Every stage adds real geometry to the previous suit. No stat or health changes.
export const EQUIPMENT = Object.freeze([
  {"level": 1, "id": "aube", "name": "Aube", "addition": "Plastron & épaulières", "description": "Le corps, les vêtements, les bottes et le respirateur du pompier RLH sont conservés. Un plastron militaire profilé et des épaulières articulées protègent la tenue sombre. Casque rose fermé."},
  {"level": 2, "id": "sentinelle", "name": "Sentinelle", "addition": "Cellule de poitrine", "description": "Cellule énergétique et témoin de charge intégrés au plastron."},
  {"level": 3, "id": "vigie", "name": "Vigie", "addition": "Renforts de bras & bottes", "description": "Plaques des biceps et des cou-de-pied, séparées des articulations."},
  {"level": 4, "id": "eclaireuse", "name": "Éclaireuse", "addition": "Gantelets & scanner", "description": "Avant-bras protégés par des plaques courbes. Scanner intégré au poignet gauche et gants RLH renforcés."},
  {"level": 5, "id": "rempart", "name": "Rempart", "addition": "Cuissardes & genouillères", "description": "Plaques de cuisse et genouillères convexes articulées, avec des espaces pour plier les jambes."},
  {"level": 6, "id": "spectre", "name": "Spectre", "addition": "Système de survie renforcé", "description": "L’appareil respiratoire RLH reçoit un berceau militaire et deux modules de secours."},
  {"level": 7, "id": "valkyrie", "name": "Valkyrie", "addition": "Jambières & exosquelette", "description": "Protections profilées des tibias et rails latéraux de cuisse, liés aux os des jambes."},
  {"level": 8, "id": "aurora", "name": "Aurora", "addition": "Capteurs de casque", "description": "Deux capteurs compacts complètent le casque de secours fermé."},
  {"level": 9, "id": "seraphine", "name": "Séraphine", "addition": "Gantelets avancés", "description": "Renforts longitudinaux des deux avant-bras sans gêner la paume ni la détente."},
  {"level": 10, "id": "imperatrice", "name": "Impératrice", "addition": "Insignes de commandement", "description": "Couronne du casque et insigne lumineux discret du plastron. L’identité Pink War reste lisible."}
].map(stage => Object.freeze(stage)));

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

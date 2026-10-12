import { characterForId } from './characters.js';
// Every stage adds real geometry to the previous suit. No stat or health changes.
export const EQUIPMENT = Object.freeze([
  { level: 1, id: 'aube', name: 'Aube', addition: 'Tenue RLH & casque fermé', description: 'Veste de pompier, pantalon à bandes réfléchissantes, bottes en cuir, harnais et appareil respiratoire RLH. Casque rose et masque opaques.' },
  { level: 2, id: 'sentinelle', name: 'Sentinelle', addition: 'Balise de poitrine', description: 'Balise énergétique lumineuse fixée au harnais.' },
  { level: 3, id: 'vigie', name: 'Vigie', addition: 'Module de communication', description: 'Module de communication compact à gauche du harnais.' },
  { level: 4, id: 'eclaireuse', name: 'Éclaireuse', addition: 'Gantelets & scanner', description: 'Gantelets renforcés et scanner au poignet gauche.' },
  { level: 5, id: 'rempart', name: 'Rempart', addition: 'Protection de genou', description: 'Renfort technique sur le genou gauche, conservant la liberté du pantalon.' },
  { level: 6, id: 'spectre', name: 'Spectre', addition: 'Cellule de secours', description: 'Cellule lumineuse supplémentaire sur le harnais respiratoire.' },
  { level: 7, id: 'valkyrie', name: 'Valkyrie', addition: 'Module énergétique', description: 'Module énergétique compact à droite de la poitrine.' },
  { level: 8, id: 'aurora', name: 'Aurora', addition: 'Capteur & finition champagne', description: 'Capteur de casque avec finition champagne.' },
  { level: 9, id: 'seraphine', name: 'Séraphine', addition: 'Balise de casque', description: 'Balise de casque métallisée pour les missions avancées.' },
  { level: 10, id: 'imperatrice', name: 'Impératrice', addition: 'Insigne de commandement', description: 'Insigne lumineux de commandement sur le casque fermé.' }
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

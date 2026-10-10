import { characterForId } from './characters.js';
// Every stage adds real geometry to the previous suit. No stat or health changes.
export const EQUIPMENT = Object.freeze([
  { level: 1, id: 'aube', name: 'Aube', addition: 'Tenue & casque fermé', description: 'Combinaison tissée, armure rose satinée et casque intégral à visière opaque.' },
  { level: 2, id: 'sentinelle', name: 'Sentinelle', addition: 'Plastron composite', description: 'Plaques de poitrine sculptées et renforts dorsaux.' },
  { level: 3, id: 'vigie', name: 'Vigie', addition: 'Épaulières & radio', description: 'Épaulières nacrées, antenne de communication et insigne ROSE–07.' },
  { level: 4, id: 'eclaireuse', name: 'Éclaireuse', addition: 'Gantelets & scanner', description: 'Avant-bras blindés et scanner holographique au poignet.' },
  { level: 5, id: 'rempart', name: 'Rempart', addition: 'Jambières & ceinture', description: 'Genouillères, protège-tibias et poches à cellules laser.' },
  { level: 6, id: 'spectre', name: 'Spectre', addition: 'Casque renforcé & capteurs', description: 'Renforts de tempes, filtres blindés et capteurs sur le casque intégral.' },
  { level: 7, id: 'valkyrie', name: 'Valkyrie', addition: 'Réacteur dorsal', description: 'Module énergétique dorsal avec deux cellules pulsantes.' },
  { level: 8, id: 'aurora', name: 'Aurora', addition: 'Hanches & finition champagne', description: 'Plaques de hanche articulées et bordures métalliques champagne.' },
  { level: 9, id: 'seraphine', name: 'Séraphine', addition: 'Ailes tactiques & balises', description: 'Ailettes dorsales repliées, balises et lignes de lumière rose.' },
  { level: 10, id: 'imperatrice', name: 'Impératrice', addition: 'Couronne & halo orbital', description: 'Couronne de commandement, halo holographique et finitions de prestige.' }
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

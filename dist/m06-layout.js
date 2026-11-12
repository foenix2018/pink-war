import {chapterCovers} from './fps-level-layout.js';
// CHAPITRE 06 — « Le Cœur d’Acier » (bible « Les Héritiers du Silence », Acte II, chapitre 6). La fonderie
// automatisée de Vesper-Nord, celle que nomment les bons de fabrication P-0 trouvés sous la Ligne 9 (chapitre 05).
// GHJU y entre avec des techniciens d’AEGIS ; des Brutes sont assemblées sur la chaîne lourde, des Remparts gardent
// les accès, des Sondes surveillent les voies ; au centre, l’unité expérimentale N-08 coordonne les machines et adapte
// leurs tactiques. Sept secteurs reliés sur deux hauteurs : voie ferrée et quai d’arrivée, parc à ferraille, grille,
// halle de coulée (cabine de contrôle à 4,5 m), chaîne lourde (pont roulant à 6 m), cœur de la N-08, quai de
// chargement d’où le camion d’AEGIS part au coucher du soleil vers la forêt des Sources (chapitre 07).
// Mètres ; yaw comme sur les autres pages three.js (0 regarde vers −z, π/2 vers −x). Navigation : couloirs de 4 m
// centrés sur des coordonnées paires, passages d’au moins 4 m centrés sur des coordonnées paires.

export const LEVEL_ID = 'coeur-acier';
export const START = Object.freeze({ x: 0, z: 88, yaw: 0 });
export const HEIGHTS = Object.freeze({ cabine: 4.5, pont: 6 });

const area = (id, x1, x2, z1, z2, label, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, label, ...extra });
// Most specific first.
export const AREAS = Object.freeze([
  area('cabine', -30, -16, 42, 54, 'Cabine de contrôle de la coulée', { roof: 8 }),
  area('quai', -96, -60, -96, -40, 'Quai de chargement · camion d’AEGIS', { roof: 9 }),
  area('coeur', -60, 60, -96, -22, 'Le cœur · salle de coordination N-08', { roof: 16 }),
  area('chaine', 40, 96, -20, 66, 'Chaîne lourde · assemblage des Brutes', { roof: 14 }),
  area('coulee', -30, 40, -20, 66, 'Halle de coulée', { roof: 15 }),
  area('ferraille', -96, -30, 30, 96, 'Parc à ferraille · les machines de 2189'),
  area('voie', -30, 40, 66, 96, 'Voie ferrée de Vesper-Nord · quai d’arrivée')
]);
export const areaAt = (x, z) => AREAS.find(a => x >= a.x1 && x <= a.x2 && z >= a.z1 && z <= a.z2)?.id || null;

// ---------- Walkable heights: the control booth and the crane deck, with their ramps ----------
const floor = (id, x1, x2, z1, z2, height, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, height, ...extra });
export const FLOORS = Object.freeze([
  floor('cabine', -28, -18, 44, 52, HEIGHTS.cabine),
  floor('rampe-cabine', -18, -8, 46, 50, 0, { ramp: 'x', from: HEIGHTS.cabine, to: 0 }),
  floor('pont', 50, 88, -18, -12, HEIGHTS.pont),
  floor('rampe-pont', 88, 94, -18, 2, 0, { ramp: 'z', from: HEIGHTS.pont, to: 0 }),
  floor('palier-pont', 88, 94, -18, -12, HEIGHTS.pont)
]);
export function createTraversal() {
  const on = (f, x, z) => x >= f.x1 && x <= f.x2 && z >= f.z1 && z <= f.z2;
  const h = (f, x, z) => {
    if (!f.ramp) return f.height;
    // The crane ramp starts at the edge of the landing (z −12) and reaches the floor at z 2.
    if (f.id === 'rampe-pont') return z <= -12 ? f.from : f.from + (f.to - f.from) * Math.min(1, (z + 12) / 14);
    return f.from + (f.to - f.from) * Math.min(1, Math.max(0, f.ramp === 'x' ? (x - f.x1) / (f.x2 - f.x1) : (z - f.z1) / (f.z2 - f.z1)));
  };
  return {
    routes: [], lifts: [],
    surfaces(x, z) { return FLOORS.filter(f => on(f, x, z)).map(f => ({ id: f.id, height: h(f, x, z) })); },
    height(x, z, time = 0, max = Infinity) { let v = 0; for (const f of FLOORS) if (on(f, x, z)) { const k = h(f, x, z); if (k <= max + .01) v = Math.max(v, k); } return v; },
    routeForSurface() { return null; }
  };
}

// ---------- Collider helpers ----------
const T = .2;
const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, ...extra });
const at = (kind, x, z, hx, hz, height, extra = {}) => ({ kind, x, z, hx, hz, y: 0, height, ...extra });
function wall(axis, fixed, from, to, height, gaps = [], extra = {}) {
  const spans = [], holes = gaps.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]);
  let cursor = from;
  for (const [a, b] of holes) { if (a > cursor) spans.push([cursor, a]); cursor = Math.max(cursor, b); }
  if (cursor < to) spans.push([cursor, to]);
  return spans.map(([a, b]) => axis === 'x' ? box('wall', a, b, fixed - T, fixed + T, 0, height, { surface: 'concrete', ...extra }) : box('wall', fixed - T, fixed + T, a, b, 0, height, { surface: 'concrete', ...extra }));
}
const wx = (z, x1, x2, h, gaps, extra) => wall('x', z, x1, x2, h, gaps, extra);
const wz = (x, z1, z2, h, gaps, extra) => wall('z', x, z1, z2, h, gaps, extra);

function walls() {
  return [
    // Rail spur: wagons along the south edge, the fence of the scrap yard.
    box('wagons', -28, 38, 96, 99, 0, 4, { surface: 'metal', look: 'wagons' }),
    ...wz(-30, 66, 96, 5, [[84, 6]], { look: 'fence' }),
    // The foundry front: the gate (closed) between the rail spur and the casting hall.
    ...wx(66, -30, 96, 14, [[0, 6]], { look: 'brick' }),
    // Scrap yard edge towards the casting hall (no way through).
    ...wx(30, -96, -30, 5, [], { look: 'fence' }),
    // Casting hall: west wall, the opening to the heavy chain, the north wall with the core door.
    ...wz(-30, -20, 66, 15, [], { look: 'brick' }), ...wz(40, -20, 66, 15, [[30, 6]], { look: 'brick' }),
    ...wx(-20, -60, 96, 16, [[10, 6]], { look: 'brick' }),
    // Heavy chain hall: east wall.
    ...wz(96, -20, 66, 14, [], { look: 'brick' }),
    // The core: west wall with the loading dock door, east wall.
    ...wz(-60, -96, -20, 16, [[-68, 6]], { look: 'brick' }), ...wz(60, -96, -20, 16, [], { look: 'brick' }),
    // Loading dock walls.
    ...wx(-40, -96, -60, 9, [], { look: 'brick' }),
    // Booth and crane deck railings (on the decks only).
    box('rail', -28, -18, 52.1, 52.3, HEIGHTS.cabine, 1.1, { surface: 'metal' }), box('rail', -28.2, -28, 44, 52, HEIGHTS.cabine, 1.1, { surface: 'metal' }),
    box('rail', 50, 88, -11.9, -11.7, HEIGHTS.pont, 1.1, { surface: 'metal' })
  ];
}
// Supports of the raised decks (between them the ground stays walkable).
function supports() {
  const out = [];
  for (const [x, z] of [[-27.4, 44.6], [-18.6, 44.6], [-27.4, 51.4], [-18.6, 51.4]]) out.push(at('pillar', x, z, .3, .3, HEIGHTS.cabine, { surface: 'metal' }));
  for (let x = 52; x <= 86; x += 8.5) out.push(at('pillar', x, -12.6, .35, .35, HEIGHTS.pont, { surface: 'metal' }));
  return out;
}
function props() {
  const out = [], add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, h, { surface, ...extra }));
  // Rail spur: the AEGIS truck, a container, a buffer stop, sleepers stacked.
  add('truck', -18, 84, 1.4, 3.6, 3); add('container', 24, 80, 3, 1.3, 2.7); add('sleepers', 8, 76, 2, 1, 1); add('crates', -8, 74, 1.2, 1.2, 1.4);
  // Scrap yard: mounds of the civilian machines of 2189 (welding arms, site quadrupeds, farm drones).
  for (const [x, z, r] of [[-80, 84, 5], [-60, 76, 4], [-82, 56, 6], [-48, 50, 4], [-66, 38, 4.5], [-86, 36, 3.5], [-44, 88, 3]]) add('scrap', x, z, r, r, 3.2, 'metal', { mound: r });
  add('press', -56, 62, 2.4, 2.4, 4.2);
  // Casting hall: the furnace, two ladles on their stands, ingot moulds, the slag pit wall.
  add('furnace', -12, 4, 6, 5, 10, 'metal', { furnace: true }); add('ladle', 10, 16, 2.4, 2.4, 3.6, 'metal', { round: true }); add('ladle', 24, 36, 2.4, 2.4, 3.6, 'metal', { round: true });
  for (const [x, z] of [[-4, 30], [8, 30], [-4, 50], [8, 50]]) add('moulds', x, z, 3, 1.2, 1.2);
  add('slag', 28, 4, 4, 3, 1.4); add('cabinet', -26, 32, .6, 2, 2.2); add('crates', 30, 58, 1.4, 1.2, 1.6);
  // Heavy chain: the assembly line (low conveyor) with Brute chassis, robot arms, parts racks.
  add('conveyor', 68, 22, 2, 30, 1.2, 'metal', { line: true });
  for (const z of [-4, 12, 28, 44]) { add('robot-arm', 61.6, z, .9, .9, 3.4); add('robot-arm', 74.4, z + 6, .9, .9, 3.4); }
  for (const z of [6, 34]) { add('parts', 48, z, 1.4, 3, 2.4); add('parts', 88, z + 8, 1.4, 3, 2.4); }
  // The core: the N-08 coordination column, cover for the fight, the log terminal.
  add('core', 0, -70, 5, 5, 14, 'metal', { core: true });
  for (const [x, z] of [[-22, -40], [22, -44], [-34, -74], [34, -70], [-14, -88], [16, -90], [0, -36]]) add('mould-block', x, z, 2, 1.2, 1.6);
  add('terminal', 0, -63.4, .8, .6, 1.1);
  // Loading dock: pallets.
  add('pallets', -88, -48, 1.6, 1.2, 1.2); add('pallets', -70, -90, 1.6, 1.2, 1.2);
  return out;
}

// ---------- Doors ----------
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('portail', 'x', 66, 0, 6, 6, { style: 'gate', label: 'Grille de la fonderie' }),
  door('coeur', 'x', -20, 10, 6, 5, { style: 'hazard', label: 'Porte du cœur' }),
  door('quai', 'z', -60, -68, 6, 5, { style: 'hazard', label: 'Quai de chargement' })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .25, d.fixed + .25, 0, d.height + 2, extra) : box('door', d.fixed - .25, d.fixed + .25, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}
export function buildCollisions({ open = [] } = {}) {
  const openSet = new Set(open);
  return [...chapterCovers('m06'), ...walls(), ...supports(), ...props(), ...DOORS.filter(d => !d.open && !openSet.has(d.id)).map(doorCollider)]
    .map(o => ({ ...o, navPad: Math.min(o.hx, o.hz) < .7 ? .7 : 1.3 }));
}

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.4, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('cle', -56, 58.6, 'PRENDRE LA CLÉ DE CHANTIER SUR LA PRESSE'),
  it('commande', 6, 68.6, 'FORCER LA COMMANDE DE LA GRILLE'),
  it('varenne', -23, 48, 'LIBÉRER VARENNE', { y: HEIGHTS.cabine }),
  it('disj-1', 46, 60, 'COUPER LE DISJONCTEUR NORD DE LA CHAÎNE'),
  it('disj-2', 92, 46, 'COUPER LE DISJONCTEUR EST DE LA CHAÎNE'),
  it('disj-3', 46, -14, 'COUPER LE DISJONCTEUR SUD DE LA CHAÎNE'),
  it('kim', 60, -15, 'LIBÉRER KIM DE LA CABINE DU PONT', { y: HEIGHTS.pont }),
  it('noyau', 0, -61.4, 'LIRE LE JOURNAL D’APPRENTISSAGE N-08', { log: 'journal-n08' }),
  // Documents (always readable).
  it('doc-bon', -10, 86, 'LIRE LE BON DE COMMANDE P-0', { log: 'bon-p0' }),
  it('doc-wagon', 30, 92, 'LIRE LA FEUILLE DE WAGON', { log: 'wagon' }),
  it('doc-plaque', -70, 70, 'LIRE LA PLAQUE D’UNE MACHINE DE CHANTIER', { log: 'plaque' }),
  it('doc-cadence', -26, 26, 'LIRE LE TABLEAU DE CADENCE', { log: 'cadence' }),
  it('doc-consigne', 52, 20, 'LIRE LA CONSIGNE DE LA CHAÎNE', { log: 'consigne' }),
  it('doc-requisition', 84, -15, 'LIRE LE BON DE RÉQUISITION', { log: 'requisition', y: HEIGHTS.pont }),
  it('doc-quai', -80, -52, 'LIRE LA FEUILLE DE DÉPART', { log: 'depart' })
]);
export const SUPPLIES = Object.freeze([['heal', 14, 90], ['cell', -24, 74], ['heal', -90, 90], ['cell', -40, 40], ['heal', -20, 60], ['cell', 34, 50],
  ['heal', 90, 60], ['cell', 52, -6], ['heal', 80, -15, 6], ['heal', -50, -30], ['cell', 50, -90], ['heal', -84, -90]].map(([kind, x, z, y = 0]) => Object.freeze({ kind, x, z, y })));

// ---------- Encounters (ORDRE: sondes on the routes, remparts at the accesses, brutes from the chain, the N-08) ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  voie: { wave: 3, units: [unit('probe', 10, 72), unit('probe', -20, 70)] },
  ferraille: { wave: 4, units: [unit('scuttler', -70, 60), unit('scuttler', -64, 66), unit('stalker', -84, 74), unit('probe', -50, 80), unit('scuttler', -76, 46), unit('seer', -40, 60)] },
  portail1: { wave: 4, portal: { x: 30, z: 74 }, units: [unit('bulwark', 30, 74), unit('stalker', 28, 78)] },
  portail2: { wave: 4, portal: { x: -22, z: 78 }, units: [unit('stalker', -22, 78), unit('probe', -20, 74), unit('scuttler', -24, 74)] },
  coulee: { wave: 5, units: [unit('bulwark', 0, 56), unit('stalker', 20, 50), unit('seer', -20, 20), unit('probe', 18, 42), unit('stalker', 32, 24), unit('listener', -10, 40)] },
  chaine: { wave: 5, units: [unit('bulwark', 56, 50), unit('stalker', 84, 20), unit('probe', 70, 56), unit('seer', 88, -6), unit('stalker', 50, -4)] },
  ligne1: { wave: 5, portal: { x: 63, z: 52 }, units: [unit('brute', 63, 52), unit('scuttler', 62, 48)] },
  ligne2: { wave: 6, portal: { x: 80, z: 24 }, units: [unit('brute', 80, 24), unit('stalker', 82, 20)] },
  ligne3: { wave: 6, portal: { x: 56, z: -8 }, units: [unit('brute', 56, -8, { elite: true }), unit('probe', 57, 0), unit('scuttler', 54, -4)] },
  pont: { wave: 6, units: [unit('probe', 80, -6), unit('probe', 80, 8), unit('stalker', 60, 4), unit('seer', 90, 10)] },
  n08: { wave: 7, units: [unit('synth', 0, -52, { elite: true, boss: 2.4, name: 'N-08 · UNITÉ EXPÉRIMENTALE', n08: true })] },
  escorte: { wave: 7, units: [unit('bulwark', -24, -50), unit('bulwark', 24, -54), unit('stalker', -30, -80), unit('stalker', 30, -80)] },
  renfort: { wave: 7, portal: { x: 36, z: -88 }, units: [unit('brute', 36, -88), unit('stalker', 32, -84)] },
  sortie1: { wave: 7, portal: { x: -84, z: -88 }, units: [unit('stalker', -84, -88), unit('probe', -80, -84), unit('scuttler', -88, -84)] },
  sortie2: { wave: 7, portal: { x: -66, z: -48 }, units: [unit('brute', -66, -48), unit('probe', -70, -52)] }
});
export const HOLDS = Object.freeze({ commande: 30, 'disj-1': 16, 'disj-2': 16, 'disj-3': 22, evac: 40 });
export const HOLD_WAVES = Object.freeze({ commande: [[4, 'portail1'], [16, 'portail2']], 'disj-1': [[3, 'ligne1']], 'disj-2': [[3, 'ligne2']], 'disj-3': [[3, 'ligne3']], evac: [[5, 'sortie1'], [22, 'sortie2']] });

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('voie', 'TROUVER UN ACCÈS À LA FONDERIE', 'La grille est verrouillée. Le parc à ferraille est à l’ouest, par la brèche de la clôture.', { x: 0, z: 88, yaw: 0 }),
  stage('ferraille', 'RÉCUPÉRER LA CLÉ DE CHANTIER', 'Une presse à ferraille, au milieu du parc. Des rampants nichent dans les tas.', { x: -36, z: 84, yaw: Math.PI / 2 }),
  stage('portail', 'FORCER LA GRILLE DE LA FONDERIE', 'Commande à droite de la grille. Trente secondes : tenir le quai.', { x: 0, z: 76, yaw: 0 }),
  stage('coulee', 'SÉCURISER LA HALLE DE COULÉE', 'Remparts et traqueurs autour du four.', { x: 0, z: 60, yaw: 0 }),
  stage('varenne', 'LIBÉRER VARENNE', 'Cabine de contrôle, rampe à l’ouest de la halle.', { x: 0, z: 44, yaw: Math.PI / 2 }),
  stage('chaine', 'ARRÊTER LA CHAÎNE LOURDE', 'Trois disjoncteurs : nord, est et sud de la chaîne. Chaque coupure réveille une Brute.', { x: 44, z: 30, yaw: -Math.PI / 2 }),
  stage('pont', 'LIBÉRER KIM SUR LE PONT ROULANT', 'Rampe au sud-est de la chaîne, puis le pont à 6 m.', { x: 90, z: 6, yaw: 0 }),
  stage('coeur', 'ABATTRE LA N-08', 'Elle apprend : change de position quand elle s’adapte.', { x: 10, z: -26, yaw: 0 }),
  stage('noyau', 'LIRE LE JOURNAL D’APPRENTISSAGE', 'Terminal au pied de la colonne de coordination.', { x: 0, z: -56, yaw: 0 }),
  stage('sortie', 'ÉVACUER LES TECHNICIENS', 'Quai de chargement, porte ouest du cœur. Tenir jusqu’au départ du camion.', { x: -54, z: -68, yaw: Math.PI / 2 }),
  stage('fin', 'LE CŒUR D’ACIER', 'Le camion d’AEGIS part vers la forêt des Sources.', { x: -80, z: -66, yaw: Math.PI / 2 })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));

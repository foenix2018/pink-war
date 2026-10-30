// MISSION 04 — « La Brèche Violette » (Tome II M04, W04 « Puits et stations de phase »: cour réacteur → hangar → relais
// → stabilisateurs → portique ; neutraliser 3 stabilisateurs, réactiver 2 relais, boss de portique BS01 ; remparts et
// sondes ; brèche volontaire, signatures humaines). The JANUS energy station East, where the « lot spécial » of the
// convoy was sent (chapter 03). Six linked sectors on three heights: arrival platform and inspection lock, reactor
// court (catwalk at 4.5 m), drone hangar (west relay), server workshop (east relay), maintenance passage, the
// stabiliser ring around the breach with the gantry (deck at 6 m) and its guardian.
// Metres; yaw as on the other three.js pages (0 looks towards −z, π/2 towards −x). Navigation: corridors 4 m wide
// centred on even coordinates, doorways ≥ 3 m centred on even coordinates.

export const LEVEL_ID = 'breche-violette';
export const START = Object.freeze({ x: 0, z: 88, yaw: 0 });
export const HEIGHTS = Object.freeze({ catwalk: 4.5, gantry: 6 });

const area = (id, x1, x2, z1, z2, label, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, label, ...extra });
// Most specific first.
export const AREAS = Object.freeze([
  area('sas', -10, 10, 62, 74, 'Sas d’inspection JANUS', { roof: 4.2 }),
  area('quai', -24, 24, 74, 96, 'Quai d’arrivée · train sanitaire 7'),
  area('maintenance', -2, 2, -42, -30, 'Passage de maintenance', { roof: 4 }),
  area('relais-est', 80, 92, 16, 40, 'Local du relais est', { roof: 4.5 }),
  area('atelier', 40, 92, 0, 56, 'Atelier serveur · mémoire de la station', { roof: 4.5 }),
  area('hangar', -92, -40, 0, 56, 'Hangar de drones', { roof: 12 }),
  area('portique', -24, 24, -96, -82, 'Portique de la brèche'),
  area('anneau', -60, 60, -96, -42, 'Anneau des stabilisateurs · brèche violette'),
  area('cour', -40, 40, -30, 62, 'Cour du réacteur · station énergétique Est')
]);
export const areaAt = (x, z) => AREAS.find(a => x >= a.x1 && x <= a.x2 && z >= a.z1 && z <= a.z2)?.id || null;

// ---------- Walkable heights: the court catwalk, the gantry deck and their ramps ----------
const floor = (id, x1, x2, z1, z2, height, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, height, ...extra });
export const FLOORS = Object.freeze([
  floor('passerelle', -2, 2, -24, 36, HEIGHTS.catwalk),
  floor('rampe-sud', -2, 2, 36, 46, 0, { ramp: 'z', from: HEIGHTS.catwalk, to: 0 }),
  floor('rampe-nord', 2, 12, -24, -20, 0, { ramp: 'x', from: HEIGHTS.catwalk, to: 0 }),
  floor('portique', -20, 20, -95, -86, HEIGHTS.gantry),
  floor('rampe-portique', 20, 32, -95, -91, 0, { ramp: 'x', from: HEIGHTS.gantry, to: 0 })
]);
export function createTraversal() {
  const on = (f, x, z) => x >= f.x1 && x <= f.x2 && z >= f.z1 && z <= f.z2;
  const h = (f, x, z) => f.ramp ? f.from + (f.to - f.from) * Math.min(1, Math.max(0, f.ramp === 'x' ? (x - f.x1) / (f.x2 - f.x1) : (z - f.z1) / (f.z2 - f.z1))) : f.height;
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
    // Platform: the train along the south edge, side walls, the lock.
    box('train', -24, 24, 96, 99, 0, 4.4, { surface: 'metal', look: 'train' }),
    ...wz(-24, 74, 96, 6, [], { look: 'janus' }), ...wz(24, 74, 96, 6, [], { look: 'janus' }),
    ...wx(74, -24, 24, 6, [[0, 4]], { look: 'janus' }), ...wz(-10, 62, 74, 4.6, [], { look: 'panel' }), ...wz(10, 62, 74, 4.6, [], { look: 'panel' }),
    ...wx(62, -40, 40, 8, [[0, 4]], { look: 'janus' }),
    // Court: west to the hangar, east to the workshop, north to the maintenance passage.
    ...wz(-40, -30, 62, 8, [[28, 6]], { look: 'janus' }), ...wz(40, -30, 62, 8, [[28, 4]], { look: 'janus' }),
    ...wx(-30, -40, 40, 6, [[0, 4]], { look: 'janus' }),
    // Drone hangar.
    ...wz(-92, 0, 56, 12, [], { look: 'hangar' }), ...wx(0, -92, -40, 12, [], { look: 'hangar' }), ...wx(56, -92, -40, 12, [], { look: 'hangar' }),
    // Server workshop: corridor (z 26…30), two halls, the relay room.
    ...wz(92, 0, 56, 4.8, [], { look: 'panel' }), ...wx(0, 40, 92, 4.8, [], { look: 'panel' }), ...wx(56, 40, 92, 4.8, [], { look: 'panel' }),
    ...wx(26, 40, 80, 4.8, [[52, 3], [70, 3]], { look: 'panel' }), ...wx(30, 40, 80, 4.8, [[60, 3]], { look: 'panel' }),
    ...wz(80, 0, 56, 4.8, [[28, 4]], { look: 'panel' }), ...wx(16, 80, 92, 4.8, [], { look: 'panel' }), ...wx(40, 80, 92, 4.8, [], { look: 'panel' }),
    // Maintenance passage and the ring hall.
    ...wz(-2, -42, -30, 4.2, [], { look: 'pipes' }), ...wz(2, -42, -30, 4.2, [], { look: 'pipes' }),
    ...wx(-42, -60, 60, 10, [[0, 4]], { look: 'janus' }), ...wz(-60, -96, -42, 10, [], { look: 'janus' }), ...wz(60, -96, -42, 10, [], { look: 'janus' }),
    // Gantry deck railings (on the deck only) and the ramp side.
    box('rail', -20, 20, -86.1, -85.9, HEIGHTS.gantry, 1.1, { surface: 'metal' }), box('rail', -20.1, -19.9, -95, -86, HEIGHTS.gantry, 1.1, { surface: 'metal' }),
    // Catwalk railings over the court.
    box('rail', -2.1, -1.9, -24, 36, HEIGHTS.catwalk, 1.1, { surface: 'metal' }), box('rail', 1.9, 2.1, -20, 36, HEIGHTS.catwalk, 1.1, { surface: 'metal' })
  ];
}
// Supports of the elevated decks (between them the ground stays walkable).
function supports() {
  const out = [];
  for (let z = -20; z <= 32; z += 8) for (const x of [-2.4, 2.4]) out.push(at('pillar', x, z, .3, .3, HEIGHTS.catwalk, { surface: 'metal' }));
  for (const x of [-18, -6, 6, 18]) out.push(at('pillar', x, -86.6, .35, .35, HEIGHTS.gantry, { surface: 'metal' }));
  return out;
}
function props() {
  const out = [], add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, h, { surface, ...extra }));
  // Platform: guard post, benches, cargo.
  add('guard-post', 18, 80, 2, 1.6, 2.8); add('crates', -18, 84, 1.4, 1.2, 1.6); add('bench', -12, 90, 1.6, .4, .5);
  // Lock: two scanner gates.
  for (const x of [-5, 5]) add('scanner', x, 68, .35, 1.4, 2.4);
  // Court: transformers, coolant tanks, containers, a forklift, pipe racks (cover on both sides of the catwalk).
  add('transformer', -26, 44, 3, 2.2, 3.4); add('transformer', 26, 44, 3, 2.2, 3.4); add('tank', -28, 6, 2.4, 2.4, 5, 'metal', { round: true }); add('tank', 28, 6, 2.4, 2.4, 5, 'metal', { round: true });
  add('container', -18, 20, 1.3, 3, 2.7); add('container', 18, -8, 1.3, 3, 2.7); add('forklift', -14, -16, 1, 1.8, 2.2); add('crates', 14, 22, 1.2, 1.2, 1.4); add('crates', -10, 54, 1.2, 1, 1.4);
  add('piperack', -30, -18, 6, .6, 3.2); add('piperack', 30, 32, 6, .6, 3.2); add('generator', 30, -20, 2.2, 1.4, 2.4); add('cabinet', -34, 30, .6, 2, 2.2);
  // Hangar: drone racks in rows, a dismantled drone on its bench, battery stacks.
  for (const z of [10, 22, 34, 46]) { add('rack', -76, z, 6, .7, 3.2); add('rack', -56, z, 6, .7, 3.2); }
  add('workbench', -66, 4.6, 2.4, .8, 1); add('batteries', -88.5, 50, 1.2, 2.4, 1.6);
  // Workshop: server rows in both halls (aisles on the navigation grid), a terminal.
  for (const x of [48, 56, 64, 72]) { add('servers', x, 15, .5, 6, 2.4); add('servers', x, 43, .5, 6, 2.4); }
  add('terminal', 86, 20, .8, .6, 1.1);
  // Ring: the reactor core, three stabiliser cages, the guardian's gantry.
  add('reactor', 0, -64, 6, 6, 9, 'metal', { reactor: true });
  for (const [x, z] of [[-30, -60], [30, -60]]) add('stabilizer', x, z, 1.6, 1.6, 4.2, 'metal', { cage: true });
  add('console', 0, -77.6, 2, .5, 1.1); add('coolant', -46, -80, 3, 3, 4); add('coolant', 46, -80, 3, 3, 4); add('crates', -44, -50, 1.4, 1.2, 1.6); add('crates', 46, -52, 1.2, 1.4, 1.6);
  return out;
}

// ---------- Doors ----------
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('sas', 'x', 62, 0, 4, 3.4, { style: 'janus', label: 'Sas d’inspection' }),
  door('maintenance', 'x', -30, 0, 4, 3.4, { style: 'hazard', label: 'Passage de maintenance' }),
  door('anneau', 'x', -42, 0, 4, 3.4, { style: 'janus', open: true }),
  door('quai', 'x', 74, 0, 4, 3.4, { style: 'janus', open: true })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .25, d.fixed + .25, 0, d.height + 2, extra) : box('door', d.fixed - .25, d.fixed + .25, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}
export function buildCollisions({ open = [] } = {}) {
  const openSet = new Set(open);
  return [...walls(), ...supports(), ...props(), ...DOORS.filter(d => !d.open && !openSet.has(d.id)).map(doorCollider)]
    .map(o => ({ ...o, navPad: Math.min(o.hx, o.hz) < .7 ? .7 : 1.3 }));
}

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.4, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('poste', 18, 77.6, 'PRENDRE LE BADGE DU POSTE DE GARDE'),
  it('scanner', 0, 70, 'PASSER LE BADGE AU SCANNER DU SAS'),
  it('relais-ouest', -89.6, 28, 'RÉACTIVER LE RELAIS OUEST'),
  it('relais-est', 89.6, 28, 'RÉACTIVER LE RELAIS EST'),
  it('stab-1', -30, -57.6, 'NEUTRALISER LE STABILISATEUR 1'),
  it('stab-2', 30, -57.6, 'NEUTRALISER LE STABILISATEUR 2'),
  it('stab-3', 0, -92, 'NEUTRALISER LE STABILISATEUR 3', { y: HEIGHTS.gantry }),
  it('console', 0, -75.6, 'LIRE LE JOURNAL DU RÉACTEUR', { log: 'journal-reacteur' }),
  // Documents (always readable).
  it('doc-billet', -8, 80, 'LIRE LA FEUILLE DE ROUTE DU TRAIN', { log: 'feuille-route' }),
  it('doc-avis', -22.4, 80, 'LIRE L’AVIS JANUS ÉNERGIE', { log: 'avis-janus' }),
  it('doc-plan', -36, 40, 'CONSULTER LE PLAN DE LA STATION', { log: 'plan' }),
  it('doc-drones', -66, 7, 'LIRE LE CARNET DE L’ATELIER DRONES', { log: 'drones' }),
  it('doc-serveur', 60, 6, 'LIRE LE JOURNAL DES SIGNATURES', { log: 'signatures' }),
  it('doc-maintenance', 0, -38, 'LIRE LE RAPPORT DE MAINTENANCE', { log: 'maintenance' }),
  it('doc-badge', -46, -60, 'RAMASSER UN BRACELET D’IDENTIFICATION', { log: 'bracelet' })
]);
export const SUPPLIES = Object.freeze([['heal', -14, 90], ['cell', 6, 50], ['heal', -30, 20], ['cell', 30, 18], ['heal', -84, 40], ['cell', -48, 8],
  ['heal', 86, 36], ['cell', 52, 28], ['heal', -50, -90], ['cell', 50, -90], ['heal', 0, -46], ['cell', -8, 10, 4.5]].map(([kind, x, z, y = 0]) => Object.freeze({ kind, x, z, y })));

// ---------- Encounters (ORDRE: remparts et sondes; JANUS security drones) ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  cour: { wave: 4, units: [unit('bulwark', -20, 34), unit('stalker', 22, 28), unit('probe', 0, 50), unit('seer', -24, 12), unit('stalker', 12, 54)] },
  hangar: { wave: 4, units: [unit('probe', -70, 16), unit('probe', -62, 40), unit('probe', -80, 50), unit('stalker', -50, 28), unit('scuttler', -86, 10)] },
  hangar2: { wave: 4, portal: { x: -66, z: 50 }, units: [unit('stalker', -66, 50), unit('scuttler', -64, 48), unit('scuttler', -68, 48)] },
  atelier: { wave: 5, units: [unit('listener', 60, 8), unit('seer', 76, 46), unit('bulwark', 62, 28), unit('stalker', 52, 50), unit('probe', 70, 20)] },
  atelier2: { wave: 5, portal: { x: 86, z: 34 }, units: [unit('seer', 86, 34), unit('stalker', 84, 22), unit('scuttler', 88, 22)] },
  retour: { wave: 5, units: [unit('bulwark', 0, 20), unit('probe', -16, -10), unit('probe', 16, 0), unit('stalker', -26, -24), unit('stalker', 26, -26)] },
  anneau: { wave: 6, units: [unit('stalker', -40, -50), unit('stalker', 40, -50), unit('probe', 0, -50), unit('seer', -50, -70), unit('seer', 50, -70)] },
  gardien: { wave: 7, units: [unit('bulwark', 0, -80, { elite: true, boss: 7, name: 'GARDIEN DE PORTIQUE BS01', guardian: true })] },
  stab1: { wave: 6, portal: { x: -44, z: -66 }, units: [unit('stalker', -44, -66), unit('scuttler', -42, -64), unit('scuttler', -46, -64)] },
  stab2: { wave: 6, portal: { x: 44, z: -66 }, units: [unit('seer', 44, -66), unit('probe', 46, -62), unit('stalker', 42, -62)] },
  stab3: { wave: 7, portal: { x: -36, z: -88 }, units: [unit('bulwark', -36, -88), unit('probe', -34, -84), unit('stalker', -38, -84), unit('probe', 30, -84)] },
  final: { wave: 7, portal: { x: 36, z: -76 }, units: [unit('brute', 36, -76, { elite: true }), unit('stalker', 34, -72), unit('scuttler', 38, -72)] }
});
export const HOLDS = Object.freeze({ 'relais-ouest': 20, 'relais-est': 20, 'stab-1': 18, 'stab-2': 18, 'stab-3': 24 });
export const HOLD_WAVES = Object.freeze({ 'relais-ouest': [[4, 'hangar2']], 'relais-est': [[4, 'atelier2']], 'stab-1': [[3, 'stab1']], 'stab-2': [[3, 'stab2']], 'stab-3': [[3, 'stab3'], [14, 'final']] });

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('quai', 'PASSER LE SAS D’INSPECTION', 'Le badge du garde est resté au poste, à droite du quai.', { x: 0, z: 88, yaw: 0 }),
  stage('sas', 'PASSER LE BADGE AU SCANNER', 'Scanner entre les deux portiques du sas.', { x: 0, z: 76, yaw: 0 }),
  stage('cour', 'SÉCURISER LA COUR DU RÉACTEUR', 'Remparts et sondes d’ORDRE gardent la cour.', { x: 0, z: 58, yaw: 0 }),
  stage('relais', 'RÉACTIVER LES DEUX RELAIS', 'Relais ouest au fond du hangar de drones, relais est au bout de l’atelier serveur.', { x: 0, z: 30, yaw: 0 }),
  stage('maintenance', 'PRENDRE LE PASSAGE DE MAINTENANCE', 'La porte nord de la cour est déverrouillée. La passerelle domine la cour.', { x: 0, z: 0, yaw: 0 }),
  stage('stabilisateurs', 'NEUTRALISER LES TROIS STABILISATEURS', 'Deux cages de part et d’autre du réacteur, la troisième sur le portique (rampe à l’est).', { x: 0, z: -46, yaw: 0 }),
  stage('gardien', 'ABATTRE LE GARDIEN DE PORTIQUE', 'Son blindage de phase cède à chaque stabilisateur neutralisé.', { x: 0, z: -48, yaw: 0 }),
  stage('journal', 'LIRE LE JOURNAL DU RÉACTEUR', 'Console au pied du réacteur, côté portique.', { x: 0, z: -48, yaw: 0 }),
  stage('fin', 'LA BRÈCHE VIOLETTE', 'La brèche retombe en veille.', { x: 0, z: -76, yaw: 0 })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));

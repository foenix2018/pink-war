// M02 « Sous les Néons » — extension of the existing street (Tome II M02: enclave secourue → galerie marchande →
// tour de transit). Two built areas at the open ends of the street, on free ground of the same arena:
//  - north, prologue: the service lift from the Archives végétales (end of M01) opens into the enclave of the
//    covered market (dispensary, radio room, dormitories, kitchen, barricaded gate onto the street);
//  - south, epilogue: inside the transit tower (HELIX Security checkpoint, data vault, loading dock of the
//    convoy to the Anneau logistique), ending on the chapter's existing choice (civilians or proofs).
// The street spans x −32…33.5, z −75.5…73.5. Navigation rule: corridors 4 m wide centred on even
// coordinates, doorways ≥ 3 m centred on even coordinates.

export const EXTENSION_ID = 'bas-niveaux-02-extension';
export const LIFT_START = Object.freeze({ x: 43, z: 92, yaw: Math.PI / 2 });

const room = (id, x1, x2, z1, z2, ceiling, look, label) => Object.freeze({ id, x1, x2, z1, z2, ceiling, look, label });
export const ROOMS = Object.freeze([
  room('seuil', -14, 12, 74, 80, 0, 'street', 'Seuil de l’enclave'),
  room('marche', -30, 12, 80, 98, 9, 'market', 'Marché couvert · enclave des Bas-Niveaux'),
  room('dispensaire', 12, 28, 80, 90, 3.4, 'clinic', 'Dispensaire des Épars'),
  room('couloir', 12, 40, 90, 94, 3, 'corridor', 'Couloir de service'),
  room('radio', 28, 40, 80, 90, 3.2, 'radio', 'Local radio de l’enclave'),
  room('monte-charge', 40, 46, 88, 96, 3, 'lift', 'Monte-charge des Archives'),
  room('parvis', -14, 12, -82, -75.5, 0, 'street', 'Parvis de la tour de transit'),
  room('tour', -14, 14, -94, -82, 8, 'lobby', 'Hall de la tour de transit · contrôle HELIX'),
  room('coffre', -40, -14, -96, -82, 5, 'vault', 'Coffre de données HELIX'),
  room('quai', 14, 46, -96, -82, 10, 'dock', 'Quai de chargement · convoi HELIX')
]);
export const roomAt = (x, z) => ROOMS.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2)?.id || null;
export const ZONE = Object.freeze(Object.fromEntries(ROOMS.map(r => [r.id, r.z1 > 0 ? 'enclave' : 'tour'])));

// ---------- Walls ----------
const T = .15;
const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, extension: true, ...extra });
const at = (kind, x, z, hx, hz, height, extra = {}) => ({ kind, x, z, hx, hz, y: 0, height, extension: true, ...extra });
function wall(axis, fixed, from, to, height, gaps = [], extra = {}) {
  const spans = [], holes = gaps.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]);
  let cursor = from;
  for (const [a, b] of holes) { if (a > cursor) spans.push([cursor, a]); cursor = Math.max(cursor, b); }
  if (cursor < to) spans.push([cursor, to]);
  return spans.map(([a, b]) => axis === 'x'
    ? box('wall', a, b, fixed - T, fixed + T, 0, height, { surface: 'concrete', ...extra })
    : box('wall', fixed - T, fixed + T, a, b, 0, height, { surface: 'concrete', ...extra }));
}
const wx = (z, x1, x2, h, gaps, extra) => wall('x', z, x1, x2, h, gaps, extra);
const wz = (x, z1, z2, h, gaps, extra) => wall('z', x, z1, z2, h, gaps, extra);

function walls() {
  return [
    // Enclave: the threshold closed between the two street blocks, the covered market, its annexes.
    ...wz(-14.2, 73.5, 80, 9.6, [], { look: 'facade' }), ...wz(12.6, 73.5, 80, 9.6, [], { look: 'facade' }),
    ...wx(80, -30, 12, 9.6, [[0, 6]], { look: 'facade' }), ...wx(80, 12, 40, 3.8, [], { look: 'facade' }),
    ...wz(-30, 80, 98, 9.6, [], { look: 'facade' }), ...wx(98, -30, 46, 9.6, [], { look: 'facade' }),
    ...wz(12, 80, 98, 9.6, [[86, 3], [92, 4]], { surface: 'tile' }),
    ...wx(90, 12, 40, 3.8, [[20, 3], [34, 3]], { surface: 'plaster' }), ...wx(94, 12, 40, 3.8, [], { surface: 'plaster' }),
    ...wz(28, 80, 90, 3.8, [], { surface: 'plaster' }), ...wz(40, 80, 98, 3.8, [[92, 3]], { look: 'facade' }),
    ...wx(88, 40, 46, 3.4, [], { surface: 'metal' }), ...wx(96, 40, 46, 3.4, [], { surface: 'metal' }), ...wz(46, 88, 96, 3.4, [], { surface: 'metal' }),
    // Transit tower: forecourt closed between the blocks, lobby, data vault, loading dock.
    ...wz(-14.2, -82, -75.5, 9, [], { look: 'helix' }), ...wz(12.6, -82, -75.5, 9, [], { look: 'helix' }),
    ...wx(-82, -40, 46, 9, [[0, 6]], { look: 'helix' }),
    ...wz(-40, -96, -82, 9, [], { look: 'helix' }), ...wx(-96, -40, 46, 10, [], { look: 'helix' }),
    ...wz(-14, -96, -82, 8, [[-88, 3]], { look: 'panel' }), ...wz(14, -96, -82, 8, [[-88, 4]], { look: 'panel' }),
    ...wx(-94, -14, 14, 8, [], { look: 'panel' }),
    ...wz(46, -96, -82, 10, [[-90, 8]], { look: 'helix' })
  ];
}

// ---------- Doors ----------
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('monte-charge', 'z', 40, 92, 3, 2.6, { style: 'lift', label: 'Monte-charge' }),
  door('dispensaire', 'x', 90, 20, 3, 2.4, { open: true, style: 'fire' }),
  door('radio', 'x', 90, 34, 3, 2.4, { open: true, style: 'fire' }),
  door('soins', 'z', 12, 86, 3, 2.6, { open: true, style: 'glass' }),
  door('service', 'z', 12, 92, 4, 3, { open: true, style: 'fire' }),
  door('grille', 'x', 80, 0, 6, 4.2, { style: 'gate', label: 'Grille de l’enclave' }),
  door('tour', 'x', -82, 0, 6, 4.2, { style: 'helix', label: 'Accès de la tour de transit' }),
  door('coffre', 'z', -14, -88, 3, 2.8, { style: 'vault', label: 'Coffre HELIX' }),
  door('quai', 'z', 14, -88, 4, 3.2, { open: true, style: 'helix' }),
  door('convoi', 'z', 46, -90, 8, 6, { style: 'gate', label: 'Porte du convoi' })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .2, d.fixed + .2, 0, d.height + 2, extra)
    : box('door', d.fixed - .2, d.fixed + .2, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}

// ---------- Props ----------
function props() {
  const out = [], add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, h, { surface, ...extra }));
  // Covered market: stalls turned into barricades and beds, dormitory tents, kitchen, school corner, water tank.
  for (const [x, z] of [[-24, 84], [-24, 90], [-14, 84], [-14, 90], [4, 90]]) add('stall', x, z, 1.6, .7, 1.1, 'wood');
  for (const [x, z] of [[-26, 95.4], [-18, 95.4], [-10, 95.4]]) add('tent', x, z, 1.6, 1.2, 1.6, 'fabric');
  add('kitchen', 6, 95.6, 2.6, .8, 1, 'metal'); add('tank', 8.6, 84, 1.1, 1.1, 2.6, 'metal'); add('barricade', -6, 82.2, 2, .4, 1.15, 'metal');
  add('school', -27.4, 82.6, .8, 1.4, .8, 'wood');
  // Dispensary: beds, medicine cabinet, desk.
  add('bed', 16, 82, 1.1, .5, .7, 'fabric'); add('bed', 16, 88.2, 1.1, .5, .7, 'fabric'); add('cabinet', 27.4, 85, .5, 1.6, 2.1); add('desk', 22, 82, 1.2, .55, .9, 'wood');
  // Radio room: rack and console, the battery bank.
  add('radio-rack', 39.4, 84, .5, 1.6, 2.2); add('console', 32, 80.6, 1.6, .5, .95); add('batteries', 29, 87.6, .8, .6, 1.1);
  // Tower lobby: HELIX scanner gates (two lanes), security desk, planters.
  for (const x of [-8, 8]) add('scanner', x, -86, .35, 1.6, 2.4); add('security-desk', 0, -91.4, 3, .7, 1.1); add('planter', -11, -84.4, .9, .9, .9, 'concrete'); add('planter', 11, -84.4, .9, .9, .9, 'concrete');
  // Data vault: server rows (aisles on the navigation grid), copy terminal.
  for (const x of [-34, -30, -26]) add('servers', x, -90, .45, 4, 2.6);
  add('terminal', -18.6, -84, .6, .9, 1.1);
  // Loading dock: HELIX trucks, a civilian container, crate stacks, the dock control post.
  add('truck', 26, -91, 4, 1.4, 3.2, 'metal', { vehicle: 'truck' }); add('container', 35, -85, 1.4, 2.4, 2.8, 'metal'); add('crates', 20, -84.4, 1, .8, 1.6);
  add('crates', 32, -94.6, 1.2, .7, 1.4); add('control-post', 44.6, -84.6, .6, .8, 1.2);
  return out;
}

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.3, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('registre-soins', 22, 84, 'LIRE LE REGISTRE DE SOINS', { log: 'registre-soins' }),
  it('batterie', 31, 87.4, 'RACCORDER LE BANC DE BATTERIES'),
  it('radio', 32, 82.4, 'ALLUMER LA RADIO DE L’ENCLAVE', { log: 'radio' }),
  it('manivelle', 4.6, 81.6, 'ACTIONNER LA MANIVELLE DE LA GRILLE'),
  it('badge', 0, -89.4, 'PRENDRE LE BADGE DU POSTE HELIX'),
  it('lecteur', -12.4, -85.2, 'PASSER LE BADGE SUR LE LECTEUR'),
  it('manifeste', -18.6, -86.4, 'CONSULTER LE MANIFESTE DU CONVOI', { log: 'manifeste' }),
  it('commande-quai', 43, -84.6, 'BLOQUER LA PORTE DU CONVOI'),
  // Documents (always readable).
  it('doc-dessins', -27.4, 85.6, 'REGARDER LES DESSINS DE L’ÉCOLE', { log: 'dessins' }),
  it('doc-avis', 2.6, 81.4, 'LIRE L’AVIS DE RECENSEMENT HELIX', { log: 'avis-helix' }),
  it('doc-cuisine', 6, 93.8, 'LIRE LE CARNET DE LA CUISINE', { log: 'cuisine' }),
  it('doc-consignes', -3.6, -89.6, 'LIRE LES CONSIGNES DU POSTE', { log: 'consignes' }),
  it('doc-kessler', -18.6, -93.4, 'LIRE LA NOTE DE LA DIRECTION', { log: 'kessler' }),
  it('doc-bordereau', 20, -86.6, 'LIRE LE BORDEREAU DE CHARGEMENT', { log: 'bordereau' })
]);

// AEGIS supply caches left by the Épars, and HELIX ammunition crates.
export const SUPPLIES = Object.freeze([['heal', 18, 84], ['cell', 34, 85.6], ['heal', -20, 87], ['cell', 8, 88],
  ['heal', -10, -86], ['cell', -22, -94], ['heal', 30, -86], ['cell', 42, -94]].map(([kind, x, z]) => Object.freeze({ kind, x, z })));

// ---------- Encounters (helix: HELIX Security units in white and red) ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  eclaireurs: { wave: 2, units: [unit('synth', -20, 92, { helix: true }), unit('synth', -16, 92, { helix: true }), unit('probe', -8, 88)] },
  grille1: { wave: 2, units: [unit('synth', -24, 92, { helix: true }), unit('synth', -12, 92, { helix: true })] },
  grille2: { wave: 3, units: [unit('stalker', -22, 87), unit('scuttler', -8, 92), unit('seer', -28, 89, { helix: true })] },
  tour: { wave: 3, units: [unit('synth', -6, -88, { helix: true }), unit('synth', 6, -88, { helix: true }), unit('seer', 10, -92, { helix: true }), unit('probe', 0, -85)] },
  coffre: { wave: 3, units: [unit('synth', -28, -84, { helix: true }), unit('listener', -36, -93), unit('probe', -22, -92)] },
  renfort: { wave: 3, units: [unit('brute', 30, -86, { helix: true, elite: true }), unit('synth', 22, -88, { helix: true }), unit('synth', 18, -92, { helix: true })] },
  quai1: { wave: 4, units: [unit('synth', 40, -92, { helix: true }), unit('synth', 40, -88, { helix: true }), unit('stalker', 34, -92)] },
  quai2: { wave: 4, units: [unit('probe', 30, -84), unit('probe', 36, -94), unit('seer', 22, -94, { helix: true })] },
  quai3: { wave: 4, units: [unit('brute', 40, -90, { helix: true, elite: true }), unit('synth', 28, -86, { helix: true }), unit('synth', 18, -94, { helix: true })] }
});

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const PROLOGUE = Object.freeze([
  stage('x-arrivee', 'REJOINDRE LE DISPENSAIRE', 'Le monte-charge s’ouvre sur le couloir de service de l’enclave.', { x: 43, z: 92, yaw: Math.PI / 2 }),
  stage('x-dispensaire', 'LIRE LE REGISTRE DE SOINS', 'Bureau du dispensaire des Épars.', { x: 20, z: 92, yaw: Math.PI }),
  stage('x-radio', 'RALLUMER LA RADIO DE L’ENCLAVE', 'Local radio : raccorder les batteries, puis allumer la radio.', { x: 34, z: 92, yaw: Math.PI }),
  stage('x-eclaireurs', 'REPOUSSER LES ÉCLAIREURS HELIX', 'Ils sont descendus par la verrière du marché.', { x: 10, z: 92, yaw: -Math.PI / 2 }),
  stage('x-grille', 'OUVRIR LA GRILLE DE L’ENCLAVE', 'Manivelle à droite de la grille. Vingt-cinq secondes de manœuvre.', { x: 2, z: 86, yaw: Math.PI })
]);
export const EPILOGUE = Object.freeze([
  stage('x-tour', 'PRENDRE LE CONTRÔLE HELIX', 'Hall de la tour de transit : neutraliser le poste de contrôle.', { x: 0, z: -78, yaw: 0 }),
  stage('x-badge', 'PRENDRE LE BADGE DU POSTE', 'Bureau du poste de sécurité, au fond du hall.', { x: 0, z: -84, yaw: 0 }),
  stage('x-coffre', 'OUVRIR LE COFFRE DE DONNÉES', 'Lecteur de badge à droite de la porte ouest.', { x: -10, z: -88, yaw: Math.PI / 2 }),
  stage('x-manifeste', 'CONSULTER LE MANIFESTE', 'Terminal du coffre, près de l’entrée.', { x: -16, z: -88, yaw: Math.PI / 2 }),
  stage('x-quai', 'BLOQUER LE CONVOI', 'Quai de chargement, poste de commande au fond à l’est. Tenir pendant le verrouillage.', { x: 10, z: -88, yaw: -Math.PI / 2 }),
  stage('x-fin', 'LE CONVOI DES ABSENTS', 'Choisir : les survivants ou les preuves.', { x: 40, z: -88, yaw: -Math.PI / 2 })
]);
export const STAGE = Object.freeze(Object.fromEntries([...PROLOGUE, ...EPILOGUE].map(s => [s.id, s])));
export const HOLDS = Object.freeze({ grille: 25, quai: 50 });
export const HOLD_WAVES = Object.freeze({ grille: [[2, 'grille1'], [12, 'grille2']], quai: [[3, 'quai1'], [20, 'quai2'], [34, 'quai3']] });

export function extensionObstacles({ open = [] } = {}) {
  const openSet = new Set(open);
  return [...walls(), ...props(), ...DOORS.filter(d => !d.open && !openSet.has(d.id)).map(doorCollider)].map(o => ({ ...o }));
}

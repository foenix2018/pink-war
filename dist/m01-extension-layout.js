// M01 « Le Dernier Signal » — extension of the existing quarter (bible §12 M01: « parcours déjà présent, à
// enrichir sans le remplacer »). Two built areas outside the original fence, on free ground of the same arena:
//  - CASERNE 07 (west strip): the rescue station the heroes served in before 2189. Prologue.
//  - ARCHIVES VÉGÉTALES (south strip): the archive building the relay A3 points to. Epilogue.
// Pure data shared by the renderer, the mission flow and the tests. Metres; the original map spans
// x −78…58, z −62…98 (LEVEL1_MAP.bounds). Navigation rule as Ligne 9: corridors 4 m wide centred on even
// coordinates, doorways ≥ 3 m centred on even coordinates (CoverNavigation: 2 m grid, 1.3 m inflation).

export const EXTENSION_ID = 'vesper-01-extension';
export const CASERNE_START = Object.freeze({ x: -89, z: 32, yaw: 0 });

const room = (id, x1, x2, z1, z2, ceiling, look, label, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, ceiling, look, label, ...extra });
export const ROOMS = Object.freeze([
  // Caserne 07.
  room('cour', -97, -80, 28, 44, 0, 'yard', 'Cour · Station AEGIS 07'),
  room('couloir', -84, -80, 44, 74, 3, 'corridor', 'Couloir de la station'),
  room('technique', -97, -84, 44, 52, 3.4, 'technical', 'Local du groupe électrogène'),
  room('cta', -97, -84, 52, 64, 3, 'office', 'Salle de veille · radio'),
  room('vestiaires', -97, -84, 64, 74, 3, 'lockers', 'Vestiaires'),
  room('remise', -97, -80, 74, 96, 7, 'garage', 'Hangar des véhicules'),
  // Archives végétales.
  room('parvis', -2, 14, -68, -62, 0, 'forecourt', 'Parvis des Archives végétales'),
  room('hall', -2, 14, -80, -68, 6, 'hall', 'Hall d’accueil'),
  room('galerie', -30, -2, -80, -76, 3.4, 'gallery', 'Galerie des herbiers'),
  room('bureau', -30, -16, -76, -68, 3.2, 'office', 'Bureau du conservateur'),
  room('serveur', -16, -2, -76, -68, 3.2, 'server', 'Local des copies'),
  room('registres', -30, -14, -97, -80, 5, 'archive', 'Salle des registres'),
  room('herbiers', -14, -2, -97, -80, 5, 'archive', 'Salle des herbiers'),
  room('serre', 14, 42, -97, -68, 10, 'greenhouse', 'Grande serre'),
  room('monte-charge', 42, 48, -84, -76, 3, 'lift', 'Monte-charge des Bas-Niveaux')
]);
export const roomAt = (x, z) => ROOMS.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2)?.id || null;
export const ZONE = Object.freeze(Object.fromEntries(ROOMS.map(r => [r.id, r.z1 > 0 ? 'caserne' : 'archives'])));

// Openings in the original waist-high fence (its colliders are split around them).
export const FENCE_GAPS = Object.freeze([
  Object.freeze({ id: 'caserne', axis: 'z', fixed: -78, from: 84, to: 88 }),
  Object.freeze({ id: 'archives', axis: 'x', fixed: -62, from: 4, to: 8 })
]);
// Split replacement for a fence collider of LEVEL1_MAP when it crosses a gap.
export function splitFence(box) {
  const out = [];
  for (const gap of FENCE_GAPS) {
    const alongZ = gap.axis === 'z';
    if (alongZ ? Math.abs(box.x - gap.fixed) > .2 || box.hz < 5 : Math.abs(box.z - gap.fixed) > .2 || box.hx < 5) continue;
    const c = alongZ ? box.z : box.x, h = alongZ ? box.hz : box.hx, a = c - h, b = c + h;
    for (const [s, e] of [[a, gap.from], [gap.to, b]]) if (e - s > .05)
      out.push(alongZ ? { ...box, z: (s + e) / 2, hz: (e - s) / 2 } : { ...box, x: (s + e) / 2, hx: (e - s) / 2 });
    return out;
  }
  return null;
}

// ---------- Walls ----------
const T = .15;
const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, campaign: true, extension: true, ...extra });
const at = (kind, x, z, hx, hz, height, extra = {}) => ({ kind, x, z, hx, hz, y: 0, height, campaign: true, extension: true, ...extra });
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
    // Caserne 07: yard wall, building shell, inner partitions.
    ...wz(-97, 28, 44, 3, [], { look: 'yard' }), ...wx(28, -97, -80, 3, [], { look: 'yard' }), ...wz(-80, 28, 44, 3, [], { look: 'yard' }),
    ...wx(44, -97, -80, 3.4, [[-82, 3]], { look: 'facade' }),
    ...wz(-97, 44, 96, 7.6, [], { look: 'facade' }), ...wz(-80, 44, 74, 3.4, [], { look: 'facade' }), ...wz(-80, 74, 96, 7.6, [[86, 5]], { look: 'facade' }),
    ...wx(96, -97, -80, 7.6, [], { look: 'facade' }),
    ...wz(-84, 44, 74, 3.4, [[48, 3], [58, 3], [68, 3]], { surface: 'tile' }),
    ...wx(52, -97, -84, 3.4, [], { surface: 'tile' }), ...wx(64, -97, -84, 3.4, [], { surface: 'tile' }),
    ...wx(74, -97, -80, 7.6, [[-82, 3]], { surface: 'tile' }),
    // Archives végétales: forecourt planters' low walls, building shell, rooms, greenhouse.
    ...wz(-2, -68, -62, .9, [], { look: 'low' }), ...wz(14, -68, -62, .9, [], { look: 'low' }),
    ...wx(-68, -30, 14, 6.4, [[6, 4]], { look: 'stone' }),
    ...wz(-30, -97, -68, 6.4, [], { look: 'stone' }), ...wx(-97, -30, 14, 6.4, [], { look: 'stone' }),
    ...wz(-2, -80, -68, 6, [[-78, 4]], { surface: 'plaster' }), ...wx(-80, -2, 14, 6, [], { surface: 'plaster' }),
    ...wz(14, -97, -68, 6.4, [[-74, 4]], { look: 'stone' }),
    ...wx(-76, -30, -2, 3.4, [[-24, 3], [-10, 3]], { surface: 'plaster' }), ...wz(-16, -76, -68, 3.4, [], { surface: 'plaster' }),
    ...wx(-80, -30, -2, 5, [[-22, 3], [-8, 3]], { surface: 'plaster' }), ...wz(-14, -97, -80, 5, [], { surface: 'plaster' }), ...wz(-2, -97, -80, 5, [], { surface: 'plaster' }),
    // Greenhouse: glazed walls on a stone plinth, the service lift beyond.
    ...wx(-68, 14, 42, 10, [], { look: 'glass' }), ...wx(-97, 14, 42, 10, [], { look: 'glass' }), ...wz(42, -97, -68, 10, [[-80, 3]], { look: 'glass' }),
    ...wx(-84, 42, 48, 3, [], { surface: 'metal' }), ...wx(-76, 42, 48, 3, [], { surface: 'metal' }), ...wz(48, -84, -76, 3, [], { surface: 'metal' })
  ];
}

// ---------- Doors ----------
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('service', 'x', 44, -82, 3, 2.4, { open: true, style: 'fire' }),
  door('technique', 'z', -84, 48, 3, 2.4, { open: true, style: 'fire' }),
  door('cta', 'z', -84, 58, 3, 2.4, { open: true, style: 'glass' }),
  door('vestiaires', 'z', -84, 68, 3, 2.4, { open: true, style: 'fire' }),
  door('remise', 'x', 74, -82, 3, 2.6, { open: true, style: 'fire' }),
  door('portail', 'z', -80, 86, 5, 4.2, { style: 'sectional', label: 'Grande porte du hangar' }),
  door('accueil', 'x', -68, 6, 4, 3, { style: 'glass', label: 'Portes d’accueil' }),
  door('bureau', 'x', -76, -24, 3, 2.4, { open: true, style: 'wood' }),
  door('serveur', 'x', -76, -10, 3, 2.4, { open: true, style: 'fire' }),
  door('registres', 'x', -80, -22, 3, 2.6, { open: true, style: 'wood' }),
  door('herbiers', 'x', -80, -8, 3, 2.6, { open: true, style: 'wood' }),
  door('serre', 'z', 14, -74, 4, 3.2, { open: true, style: 'glass' }),
  door('monte-charge', 'z', 42, -80, 3, 2.6, { style: 'lift', label: 'Monte-charge' })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .2, d.fixed + .2, 0, d.height + 2, extra)
    : box('door', d.fixed - .2, d.fixed + .2, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}

// ---------- Props that matter for play (cover, vehicles, machines) ----------
function props() {
  const out = [], add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, h, { surface, ...extra }));
  // Yard: drill tower, fuel tank, the station's light vehicle.
  add('drill-tower', -94, 31, 1.6, 1.6, 12, 'concrete'); add('fuel-tank', -85, 30.5, .9, 1.8, 2.2); add('car', -91, 40, 1, 2.2, 1.5);
  // Generator room: generator set, day tank, switchboard.
  add('generator', -91, 48, 2.6, 1.2, 2.1); add('day-tank', -95.8, 45.6, .7, 1, 1.6); add('switchboard', -96.4, 50.4, .5, 1.1, 2.2);
  // Dispatch room: console along the west wall, radio table, map table.
  add('console', -95.6, 58, .8, 3.6, 1); add('radio-table', -89, 62.8, 1.6, .5, .9); add('map-table', -90, 55.6, 1.2, .8, .95, 'wood');
  // Locker room: lockers, bench.
  add('lockers', -96.4, 69, .5, 4.2, 2.1); add('lockers', -91, 73.4, 4.2, .5, 2.1); add('bench', -91, 68.6, 2.4, .3, .45, 'wood');
  // Apparatus bay: ambulance (VSAV), pump engine (FPT), breathing-apparatus rack, hose rack, workbench.
  add('vsav', -90, 90, 3.1, 1.25, 2.8, 'metal', { vehicle: 'vsav' }); add('fpt', -90.5, 81, 3.8, 1.35, 3.2, 'metal', { vehicle: 'fpt' });
  add('ari-rack', -96.4, 77.5, .45, 2.2, 2); add('hose-rack', -96.4, 93, .45, 2, 1.8); add('workbench', -86, 95.3, 2, .5, .95);
  // Forecourt planters.
  add('planter', 0.4, -65, 1, 1.5, .9, 'concrete'); add('planter', 11.6, -65, 1, 1.5, .9, 'concrete');
  // Hall: reception desk, display case, benches.
  add('reception', 6, -74.4, 2.6, .6, 1.1, 'wood'); add('display', 12.4, -70.2, .7, .7, 1.4, 'glass'); add('bench', 12.6, -77.5, .35, 1.6, .45, 'wood');
  // Curator's office (the bivouac), copy room (server racks).
  add('desk', -27.2, -70, 1.6, .6, .8, 'wood'); add('shelves', -23, -68.55, 5, .35, 2.4, 'wood'); add('stove', -18.6, -73.4, .3, .3, .5);
  for (const x of [-13, -9, -5]) add('rack', x, -69.2, .6, .5, 2.2);
  // Registers room: rolling archive stacks (aisles kept on the navigation grid), copy terminal desk.
  for (const x of [-28, -24, -20]) add('stack', x, -91.5, .4, 4.5, 2.6, 'metal');
  add('terminal-desk', -16.6, -83.4, .8, 1.2, .9);
  // Herbarium cabinets.
  for (const z of [-94, -88]) add('cabinet', -8, z, 4, .45, 2, 'wood');
  // Greenhouse: raised beds, a dry basin, the old tree's trunk.
  for (const [x, z] of [[20, -91], [36, -91], [20, -75], [36, -75]]) add('bed', x, z, 2.6, 3, .8, 'concrete');
  add('basin', 28, -83, 2, 2, .6, 'concrete'); add('trunk', 30.5, -88.5, .5, .5, 6, 'wood');
  return out;
}

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.3, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('main-courante', -93.4, 58, 'LIRE LE JOURNAL DE BORD DU 14/03/2189', { log: 'main-courante' }),
  it('casier', -94.6, 70, 'OUVRIR LE CASIER', { log: 'casier' }),
  it('gazole', -94, 45.4, 'OUVRIR L’ARRIVÉE DE GAZOLE'),
  it('demarreur', -91, 50.4, 'DÉMARRER LE GROUPE ÉLECTROGÈNE'),
  it('porte-remise', -81.2, 91.5, 'COMMANDER LA PORTE DU HANGAR'),
  it('relais-a3', 0, 0, '', { core: true }),
  it('deverrouillage', 8.8, -66.4, 'TIRER LA COMMANDE DE DÉVERROUILLAGE'),
  it('bivouac', -24.6, -72.4, 'EXAMINER LE BIVOUAC', { log: 'bivouac' }),
  it('copie', -18.4, -83.4, 'COPIER LE REGISTRE DES DISPARUS'),
  it('monte-charge', 40.4, -82.6, 'APPELER LE MONTE-CHARGE'),
  // Documents (always readable).
  it('doc-tableau', -87.6, 53.2, 'LIRE LE TABLEAU DE SERVICE', { log: 'tableau' }),
  it('doc-radio', -89, 61.2, 'ÉCOUTER LA RADIO · CANAL 07', { log: 'radio' }),
  it('doc-consignes', -82.4, 79, 'LIRE LES CONSIGNES DE DÉPART', { log: 'consignes' }),
  it('doc-visiteurs', 6, -76, 'LIRE LE REGISTRE DES VISITEURS', { log: 'visiteurs' }),
  it('doc-serveur', -9, -73.4, 'LIRE L’ORDRE DE PURGE', { log: 'serveur' }),
  it('doc-herbier', -8, -91, 'OUVRIR L’HERBIER', { log: 'herbier' })
]);

// AEGIS supply caches (medkit or energy cell + impulse charge), collected by walking over them.
export const SUPPLIES = Object.freeze([['heal', -95, 80.2], ['cell', -86, 93.6], ['heal', -86.4, 62], ['cell', -82, 52],
  ['heal', -20, -70.4], ['cell', -4, -90.6], ['cell', 24, -83], ['heal', 10, -78.6], ['heal', 16.4, -95]].map(([kind, x, z]) => Object.freeze({ kind, x, z })));

// ---------- Encounters ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  nid: { tier: 1, units: [unit('scuttler', -86, 86), unit('scuttler', -84, 78), unit('scuttler', -94, 85.5)] },
  nid2: { tier: 1, units: [unit('scuttler', -82, 70), unit('listener', -82, 62), unit('scuttler', -82, 56)] },
  rue: { tier: 1, units: [unit('probe', -72, 88), unit('stalker', -70, 84), unit('stalker', -70, 92)] },
  route: { tier: 2, units: [unit('stalker', 2, -56), unit('seer', 10, -56), unit('probe', 6, -52)] },
  parvis: { tier: 2, units: [unit('scuttler', 3.6, -66), unit('scuttler', 8.4, -66)] },
  galerie: { tier: 2, units: [unit('scuttler', -20, -78), unit('stalker', -28, -78), unit('listener', -6, -83)] },
  serre: { tier: 2, units: [unit('stalker', 28, -78), unit('seer', 24, -94), unit('brute', 38, -84)] },
  copie1: { tier: 3, portal: { x: 28, z: -71 }, units: [unit('stalker', 26, -71), unit('stalker', 30, -71), unit('synth', 28, -72.5)] },
  copie2: { tier: 3, portal: { x: -26, z: -78 }, units: [unit('scuttler', -28, -78), unit('scuttler', -24, -78), unit('probe', -26, -78)] },
  copie3: { tier: 3, portal: { x: 8, z: -72 }, units: [unit('brute', 8, -72, { elite: true }), unit('seer', 4, -72), unit('stalker', 12, -72)] },
  sortie: { tier: 3, units: [unit('listener', 32, -82), unit('scuttler', 22, -83), unit('scuttler', 34, -70)] }
});

// ---------- Stages (prologue before the original 'approach', epilogue after its 'exit') ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const PROLOGUE = Object.freeze([
  stage('x-cour', 'ENTRER DANS LA STATION 07', 'Porte de service au fond de la cour.', { x: -89, z: 32, yaw: 0 }),
  stage('x-garde', 'LIRE LE JOURNAL DE BORD', 'Salle de veille, deuxième porte à gauche du couloir.', { x: -82, z: 46, yaw: 0 }),
  stage('x-vestiaires', 'OUVRIR LES CASIERS', 'Vestiaires, au bout du couloir à gauche.', { x: -82, z: 58, yaw: 0 }),
  stage('x-groupe', 'RELANCER LE GROUPE ÉLECTROGÈNE', 'Local technique : ouvrir le gazole, puis démarrer. La porte du hangar est électrique.', { x: -82, z: 48, yaw: 0 }),
  stage('x-remise', 'OUVRIR LA PORTE DU HANGAR', 'Boîtier de commande à droite de la grande porte.', { x: -82, z: 76, yaw: 0 }),
  stage('x-sortie', 'REJOINDRE LE QUARTIER DES SECOURS', 'Passer la clôture devant le hangar : l’annexe est à l’est.', { x: -82, z: 86, yaw: Math.PI / 2 })
]);
export const EPILOGUE = Object.freeze([
  stage('x-route', 'REJOINDRE LES ARCHIVES VÉGÉTALES', 'Redescendre de la terrasse ; l’accès est au sud, par la clôture.', { x: 18, z: -16, yaw: Math.PI }),
  stage('x-entree', 'DÉVERROUILLER LES PORTES D’ACCUEIL', 'Commande de déverrouillage manuel, à droite des portes vitrées.', { x: 6, z: -64, yaw: Math.PI }),
  stage('x-bivouac', 'SUIVRE LA TRACE', 'Galerie des herbiers, puis le bureau du conservateur.', { x: 6, z: -70, yaw: Math.PI }),
  stage('x-copie', 'COPIER LE REGISTRE DES DISPARUS', 'Salle des registres, au bout de la galerie. La copie prend une minute et quart : tiens la salle.', { x: -22, z: -78, yaw: Math.PI }),
  stage('x-depart', 'PRENDRE LE MONTE-CHARGE', 'Grande serre, puis le monte-charge des Bas-Niveaux au fond à l’est.', { x: 8, z: -78, yaw: -Math.PI / 2 }),
  stage('x-fin', 'LE DERNIER SIGNAL', 'Destination : Bas-Niveaux.', { x: 45, z: -80, yaw: -Math.PI / 2 })
]);
export const STAGE = Object.freeze(Object.fromEntries([...PROLOGUE, ...EPILOGUE].map(s => [s.id, s])));
export const HOLDS = Object.freeze({ groupe: 30, copie: 75 });
export const HOLD_WAVES = Object.freeze({ groupe: [[3, 'nid'], [16, 'nid2']], copie: [[4, 'copie1'], [30, 'copie2'], [52, 'copie3']] });

// Collision world for an extension state: open doors are left out.
export function extensionObstacles({ open = [] } = {}) {
  const openSet = new Set(open);
  return [...walls(), ...props(), ...DOORS.filter(d => !d.open && !openSet.has(d.id)).map(doorCollider)].map(o => ({ ...o }));
}

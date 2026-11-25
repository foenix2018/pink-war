import { chapterCovers } from './fps-level-layout.js';
// CHAPITRE 08 — « Les ordres de JANUS » (bible, Acte II, chapitre 8). Le complexe industriel JANUS / HELIX de Vesper,
// la nuit, d’après la carte de level design : 01 entrée de service (sud-ouest), 02 quai de livraison et contrôles
// (sud-est, camions JANUS, guérite des badges), 03 ateliers JANUS et passerelles (ouest), 04 centre d’interconnexion
// (centre, cœur réseau HELIX / JANUS), 05 salle de sécurité et drones (ouest), 06 archives HELIX (nord-ouest), la tour
// JANUS (nord, repère), 07 chambre de supervision (nord, salle ronde aux écrans, Kessler), 08 antenne AEGIS (toit
// nord-est, parabole), 09 exfiltration par l’ascenseur de service (est). Le grand bâtiment « Programme industriel HELIX »
// occupe l’est du complexe.
// Mètres ; yaw comme sur les autres pages three.js (0 regarde vers −z). Passages d’au moins 4 m.

export const LEVEL_ID = 'ordres-janus';
export const START = Object.freeze({ x: -25, z: 93, yaw: 0 });
export const HEIGHTS = Object.freeze({ passerelle: 5, toit: 6 });
export const TOWER = Object.freeze({ x: 8, z: -80, r: 17 });
export const CHAMBER = Object.freeze({ x: 55, z: -74, r: 15 });
export const HELIX_BUILDING = Object.freeze({ x1: 48, x2: 76, z1: -30, z2: 45, h: 24 });
export const LIFT = Object.freeze({ x: 88, z: 4, hx: 5, hz: 5 });

const area = (id, x1, x2, z1, z2, label, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, label, ...extra });
// Most specific first.
export const AREAS = Object.freeze([
  area('ascenseur', 76, 98, -20, 20, 'Ascenseur de service · exfiltration', { roof: 12 }),
  area('antenne', 75, 98, -98, -40, 'Antenne AEGIS · toit nord-est'),
  area('supervision', 35, 75, -98, -40, 'Chambre de supervision', { roof: 14 }),
  area('galerie', -35, 35, -55, -30, 'Galerie nord · pied de la tour JANUS', { roof: 9 }),
  area('archives', -98, -35, -98, -40, 'Archives HELIX', { roof: 9 }),
  area('securite', -98, -45, -40, 10, 'Salle de sécurité et drones', { roof: 8 }),
  area('couloir', -45, -5, -20, 0, 'Couloir de sécurité', { roof: 5 }),
  area('centre', -5, 45, -30, 30, 'Centre d’interconnexion', { roof: 16 }),
  area('ateliers', -98, -5, 10, 70, 'Ateliers JANUS et passerelles', { roof: 14 }),
  area('entree', -45, -5, 70, 98, 'Entrée de service'),
  area('quai', -5, 98, 30, 98, 'Quai de livraison et contrôles')
]);
export const areaAt = (x, z) => AREAS.find(a => x >= a.x1 && x <= a.x2 && z >= a.z1 && z <= a.z2)?.id || null;

// ---------- Walkable heights: the workshop catwalk and the roof of the antenna, with their ramps ----------
const floor = (id, x1, x2, z1, z2, height, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, height, ...extra });
export const FLOORS = Object.freeze([
  floor('passerelle', -80, -24, 36, 42, HEIGHTS.passerelle),
  floor('rampe-passerelle', -24, -18, 36, 58, 0, { ramp: 'z', from: HEIGHTS.passerelle, to: 0, start: 42 }),
  floor('palier-passerelle', -24, -18, 36, 42, HEIGHTS.passerelle),
  floor('toit', 80, 97, -97, -74, HEIGHTS.toit),
  floor('rampe-toit', 84, 90, -74, -54, 0, { ramp: 'z', from: HEIGHTS.toit, to: 0, start: -74 })
]);
function rampHeight(f, z) { const k = Math.min(1, Math.max(0, (z - f.start) / (f.z2 - f.start))); return f.from + (f.to - f.from) * k; }
export function createTraversal() {
  const on = (f, x, z) => x >= f.x1 && x <= f.x2 && z >= f.z1 && z <= f.z2;
  const h = (f, x, z) => f.ramp ? rampHeight(f, z) : f.height;
  return {
    routes: [], lifts: [],
    surfaces(x, z) { return FLOORS.filter(f => on(f, x, z)).map(f => ({ id: f.id, height: h(f, x, z) })); },
    height(x, z, time = 0, max = Infinity) { let v = 0; for (const f of FLOORS) if (on(f, x, z)) { const k = h(f, x, z); if (k <= max + .01) v = Math.max(v, k); } return v; },
    routeForSurface() { return null; }
  };
}

// ---------- Collider helpers ----------
const T = .25;
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
  const out = [
    // Service entrance: the gate yard, open on the delivery dock to the east.
    ...wz(-45, 70, 100, 6, [], { look: 'fence' }), ...wx(70, -45, -5, 8, [], { look: 'panel' }), ...wz(-5, 70, 100, 8, [[83, 12]], { look: 'panel' }),
    // Workshops: the dock side with the badge gate (portique) and the maintenance airlock (sas) to the interconnection centre.
    ...wz(-5, 10, 70, 10, [[60, 6], [20, 6]], { look: 'panel' }), ...wx(10, -100, -5, 10, [], { look: 'panel' }),
    // Interconnection centre.
    ...wx(30, -5, 45, 12, [], { look: 'glass' }), ...wz(45, -30, 30, 12, [], { look: 'panel' }), ...wx(-30, -5, 45, 12, [], { look: 'panel' }), ...wz(-5, -30, 10, 12, [[-10, 6]], { look: 'panel' }),
    // Security corridor and room.
    ...wx(0, -45, -5, 6), ...wx(-20, -45, -5, 6), ...wz(-45, -40, 10, 8, [[-10, 20]]), ...wx(-40, -100, -45, 8, [[-70, 6]]),
    // Archives (door to the north gallery), gallery, supervision area, antenna yard.
    ...wx(-40, -45, -35, 8), ...wz(-35, -100, -40, 8, [[-48, 6]]), ...wx(-30, -35, -5, 8), ...wx(-55, -35, 35, 12, [], { look: 'tower' }),
    ...wz(35, -100, -55, 12), ...wz(35, -40, -30, 12), ...wx(-40, 35, 76, 12), ...wz(75, -100, -40, 12, [[-70, 6]]),
    // East corridor down to the service lift; it does not open onto the dock.
    ...wz(76, -40, 20, 14, [], { look: 'panel' }), ...wx(20, 76, 100, 10),
    // Pockets closed between the centre and the HELIX building.
    ...wx(-30, 45, 48, 12), ...wx(40, 45, 48, 12)
  ];
  // The round supervision chamber: a ring of wall segments, entrance to the south.
  for (let a = 0; a < 32; a++) {
    const t = a / 32 * Math.PI * 2, x = CHAMBER.x + Math.cos(t) * CHAMBER.r, z = CHAMBER.z + Math.sin(t) * CHAMBER.r;
    if (Math.sin(t) > .92) continue;                                    // south gap
    out.push(at('chamber-wall', x, z, 1.5, 1.5, 6, { surface: 'glass', look: 'chamber' }));
  }
  // The HELIX building (solid) and the base of the lift shaft.
  out.push(box('helix-building', HELIX_BUILDING.x1, HELIX_BUILDING.x2, HELIX_BUILDING.z1, HELIX_BUILDING.z2, 0, HELIX_BUILDING.h, { surface: 'concrete', look: 'helix' }));
  out.push(box('lift-shaft', LIFT.x - LIFT.hx - .5, LIFT.x + LIFT.hx + .5, LIFT.z + LIFT.hz, LIFT.z + LIFT.hz + 1, 0, 40, { surface: 'metal' }),
    box('lift-shaft', LIFT.x - LIFT.hx - 1, LIFT.x - LIFT.hx - .5, LIFT.z - LIFT.hz, LIFT.z + LIFT.hz + 1, 0, 40, { surface: 'metal' }),
    box('lift-shaft', LIFT.x + LIFT.hx + .5, LIFT.x + LIFT.hx + 1, LIFT.z - LIFT.hz, LIFT.z + LIFT.hz + 1, 0, 40, { surface: 'metal' }),
    box('lift-shaft', LIFT.x - LIFT.hx - 1, LIFT.x - 2, LIFT.z - LIFT.hz - .5, LIFT.z - LIFT.hz, 0, 40, { surface: 'metal' }),
    box('lift-shaft', LIFT.x + 2, LIFT.x + LIFT.hx + 1, LIFT.z - LIFT.hz - .5, LIFT.z - LIFT.hz, 0, 40, { surface: 'metal' }));
  // Railings of the raised decks (on the decks only).
  out.push(box('rail', -80, -24, 35.8, 36, HEIGHTS.passerelle, 1.1, { surface: 'metal' }), box('rail', 80, 97, -73.9, -73.7, HEIGHTS.toit, 1.1, { surface: 'metal' }));
  return out;
}
function supports() {
  const out = [];
  for (let x = -76; x <= -28; x += 8) out.push(at('pillar', x, 41.5, .3, .3, HEIGHTS.passerelle, { surface: 'metal' }));
  for (const [x, z] of [[81, -96], [96, -96], [81, -75], [96, -75], [88, -86]]) out.push(at('pillar', x, z, .35, .35, HEIGHTS.toit, { surface: 'metal' }));
  return out;
}
function props() {
  const out = [], add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, h, { surface, ...extra }));
  // Entrance: the guard post, barriers, crates.
  add('guardhouse', -36, 78, 3, 2.5, 3.2, 'concrete'); add('crates', -14, 90, 1.4, 1.4, 1.6); add('barrier', -25, 74, 3, .3, 1.1);
  // Delivery dock: two JANUS semi-trailers, containers, the badge booth, gates, loading bays.
  add('truck', 40, 78, 1.6, 9, 4.2, 'metal', { yaw: 0 }); add('truck', 64, 72, 1.6, 9, 4.2, 'metal', { yaw: 0 }); add('container', 84, 88, 6, 1.4, 2.8); add('container', 84, 60, 6, 1.4, 2.8);
  add('booth', 12, 64, 2.4, 2, 3, 'glass'); add('crates', 24, 52, 1.4, 1.2, 1.6); add('crates', -2.5 + 8, 40, 1.2, 1.2, 1.4); add('bay-dock', 30, 96, 30, 1.4, 1.4, 'concrete');
  // Workshops: assembly lines with robot arms, parts racks, a forklift.
  for (const z of [22, 58]) { add('assembly', -60, z, 14, 2, 1.2); for (const x of [-70, -56, -42]) { add('robot-arm', x, z - 4, .9, .9, 3.4); add('robot-arm', x + 6, z + 4, .9, .9, 3.4); } }
  add('parts', -88, 48, 1.4, 6, 3); add('parts', -88, 24, 1.4, 6, 3); add('forklift', -30, 28, 1.2, 2, 2.2);
  // Interconnection centre: the network core and the server cabinets around it.
  add('core', 20, 0, 4, 4, 16, 'metal', { core: true });
  for (let a = 0; a < 8; a++) { const t = a / 8 * Math.PI * 2 + .2; add('cabinet', 20 + Math.cos(t) * 12, Math.sin(t) * 12, .7, .7, 2.4); }
  // Security room: rows of consoles, the surveillance desk, the drone racks.
  for (const z of [-28, -14]) add('console-row', -72, z, 12, .8, 1.2);
  add('desk', -82, -30, 3, 1.2, 1.2); add('drone-rack', -92, 2, 1.2, 4, 3);
  // Archives: rows of server racks with aisles.
  for (let x = -90; x <= -50; x += 8) for (const z of [-88, -70]) add('rack', x, z, 1.2, 6, 3.2, 'metal', { look: 'archive' });
  // Supervision chamber: the central console ring.
  add('console-ring', CHAMBER.x, CHAMBER.z, 4.5, 4.5, 1.2, 'metal', { round: true });
  // Antenna roof: the dish pedestal; the cooling units at the foot of the ramp.
  add('dish', 90, -88, 2.2, 2.2, 3, 'metal', { y: HEIGHTS.toit });
  add('cooling', 82, -48, 3, 3, 3); add('cooling', 94, -48, 3, 3, 3);
  // Lift lobby: crates.
  add('crates', 80, -6, 1.2, 1.2, 1.4);
  return out.map(o => o.y ? { ...o } : o);
}

// ---------- Doors ----------
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('portique', 'z', -5, 60, 6, 5, { style: 'gate', label: 'Portique de contrôle' }),
  door('sas', 'z', -5, 20, 6, 5, { style: 'hazard', label: 'Sas de maintenance' }),
  door('securite', 'z', -5, -10, 6, 5, { style: 'hazard', label: 'Couloir de sécurité' }),
  door('archives', 'x', -40, -70, 6, 5, { style: 'hazard', label: 'Archives HELIX' }),
  door('galerie', 'z', -35, -48, 6, 5, { style: 'hazard', label: 'Galerie nord' }),
  door('toit', 'z', 75, -70, 6, 5, { style: 'hazard', label: 'Accès au toit' }),
  door('ascenseur', 'x', LIFT.z - LIFT.hz - .25, LIFT.x, 4, 4, { style: 'lift', label: 'Ascenseur de service' })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .3, d.fixed + .3, 0, d.height + 2, extra) : box('door', d.fixed - .3, d.fixed + .3, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}
export function buildCollisions({ open = [] } = {}) {
  const openSet = new Set(open);
  return [...chapterCovers('m08'), ...walls(), ...supports(), ...props(), ...DOORS.filter(d => !openSet.has(d.id)).map(doorCollider)]
    .map(o => ({ ...o, navPad: Math.min(o.hx, o.hz) < .7 ? .7 : 1.2 }));
}

// ---------- Interactions ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.4, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('badge', 12, 61, 'PRENDRE UN BADGE DE CONTRÔLE DANS LA GUÉRITE'),
  it('atelier', -12, 24, 'DÉVERROUILLER LE SAS DE MAINTENANCE'),
  it('noeud', 14, -6, 'SE CONNECTER AU NŒUD D’INTERCONNEXION'),
  it('surveillance', -82, -26, 'COUPER LA SURVEILLANCE AU PUPITRE'),
  it('extraction', -60, -60, 'COPIER LES ARCHIVES HELIX'),
  it('transmission', 88, -82, 'TRANSMETTRE LES PREUVES À AEGIS', { y: HEIGHTS.toit }),
  it('appel', 84, -10, 'APPELER L’ASCENSEUR DE SERVICE'),
  // Documents (always readable).
  it('doc-manifeste', 16, 61, 'LIRE LE MANIFESTE DE LIVRAISON', { log: 'manifeste' }),
  it('doc-plan', -40, 39, 'LIRE LE PLAN DE MAINTENANCE', { log: 'plan-ateliers', y: HEIGHTS.passerelle }),
  it('doc-securite', -82, -32.5, 'LIRE LE JOURNAL DE SÉCURITÉ', { log: 'journal-securite' }),
  it('doc-archives', -66, -60, 'LIRE LE PROGRAMME DE CONTINUITÉ', { log: 'archives-ia' }),
  it('doc-maj', CHAMBER.x - 6, CHAMBER.z + 4, 'LIRE LA NOTE DE DÉPLOIEMENT DU 17/11/2189', { log: 'maj-17-11' }),
  it('doc-kessler', CHAMBER.x + 6, CHAMBER.z + 4, 'LIRE L’AUTORISATION D’ADRIAN KESSLER', { log: 'autorisation-kessler' }),
  it('doc-ordre', 84, -90, 'LIRE LE JOURNAL DES ÉMISSIONS', { log: 'ordre-continuite', y: HEIGHTS.toit })
]);
export const SUPPLIES = Object.freeze([['heal', -14, 80], ['cell', 30, 62], ['heal', 72, 90], ['cell', -40, 60], ['heal', -84, 36], ['cell', -60, 39, HEIGHTS.passerelle],
  ['heal', 0, 20], ['cell', 36, -20], ['heal', -60, -6], ['cell', -46, -90], ['heal', 0, -44], ['cell', 46, -50], ['heal', 92, -92, HEIGHTS.toit], ['cell', 92, -30], ['heal', 80, 14]]
  .map(([kind, x, z, y = 0]) => Object.freeze({ kind, x, z, y })));

// ---------- Encounters ----------
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  quai: { wave: 4, units: [unit('stalker', 30, 66), unit('probe', 50, 60), unit('se04', 56, 86), unit('stalker', 76, 80), unit('probe', 20, 84), unit('scuttler', 46, 92)] },
  ateliers: { wave: 5, units: [unit('stalker', -36, 50), unit('scuttler', -48, 30), unit('scuttler', -66, 50), unit('probe', -50, 64), unit('seer', -80, 32), unit('stalker', -20, 14), unit('bulwark', -74, 16), unit('stalker', -30, 64), unit('listener', -56, 14)] },
  ateliers2: { wave: 5, portal: { x: -84, z: 60 }, units: [unit('brute', -84, 60)] },
  noeud1: { wave: 5, portal: { x: 36, z: 20 }, units: [unit('stalker', 36, 20), unit('scuttler', 34, 24), unit('probe', 38, 16)] },
  noeud2: { wave: 6, portal: { x: 2, z: -22 }, units: [unit('bulwark', 2, -22), unit('stalker', 6, -24), unit('seer', -1, -18)] },
  noeud3: { wave: 6, portal: { x: 36, z: -20 }, units: [unit('stalker', 36, -20), unit('scuttler', 34, -24), unit('stalker', 38, -16), unit('probe', 32, -16)] },
  securite: { wave: 6, units: [unit('probe', -60, -6), unit('probe', -74, -36), unit('probe', -90, -10), unit('stalker', -64, -22), unit('seer', -90, -34), unit('stalker', -54, 4), unit('probe', -82, 6), unit('bulwark', -70, -2), unit('scuttler', -56, -34)] },
  archives: { wave: 6, units: [unit('stalker', -46, -80), unit('scuttler', -80, -62), unit('seer', -94, -79)] },
  extraction1: { wave: 6, portal: { x: -42, z: -62 }, units: [unit('stalker', -42, -62), unit('scuttler', -44, -58)] },
  extraction2: { wave: 7, portal: { x: -86, z: -95 }, units: [unit('bulwark', -86, -95), unit('stalker', -82, -95), unit('probe', -78, -95)] },
  supervision: { wave: 7, units: [unit('stalker', 42, -50), unit('seer', 70, -60), unit('stalker', 44, -92), unit('probe', 68, -92)] },
  gardien: { wave: 7, units: [unit('synth', CHAMBER.x, CHAMBER.z - 8, { elite: true, boss: 2.4, name: 'JANUS · GARDIEN DE SUPERVISION', n08: true })] },
  toit1: { wave: 7, portal: { x: 82, z: -60 }, units: [unit('stalker', 82, -60), unit('scuttler', 80, -64), unit('probe', 94, -62)] },
  toit2: { wave: 7, portal: { x: 94, z: -44 }, units: [unit('bulwark', 94, -44), unit('stalker', 90, -46), unit('seer', 80, -44)] },
  toit3: { wave: 8, portal: { x: 82, z: -92 }, units: [unit('brute', 82, -92), unit('probe', 86, -94)] },
  toit4: { wave: 8, portal: { x: 80, z: -50 }, units: [unit('stalker', 80, -52), unit('stalker', 92, -56), unit('scuttler', 86, -50), unit('probe', 90, -62)] },
  ascenseur: { wave: 8, units: [unit('stalker', 82, -30), unit('probe', 92, -24)] },
  appel1: { wave: 8, portal: { x: 92, z: 14 }, units: [unit('stalker', 92, 14), unit('scuttler', 80, 12)] },
  appel2: { wave: 8, portal: { x: 80, z: -34 }, units: [unit('bulwark', 80, -34), unit('stalker', 94, -34)] }
});
export const HOLDS = Object.freeze({ noeud: 45, extraction: 30, transmission: 60, appel: 30 });
export const HOLD_WAVES = Object.freeze({ noeud: [[4, 'noeud1'], [18, 'noeud2'], [32, 'noeud3']], extraction: [[4, 'extraction1'], [16, 'extraction2']], transmission: [[4, 'toit1'], [18, 'toit2'], [34, 'toit3'], [46, 'toit4']], appel: [[4, 'appel1'], [16, 'appel2']] });

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('entree', 'S’INFILTRER PAR L’ENTRÉE DE SERVICE', 'La cour de l’entrée de service s’ouvre à l’est sur le quai de livraison.', { x: -25, z: 92, yaw: 0 }),
  stage('quai', 'PRENDRE UN BADGE DE CONTRÔLE', 'La guérite est au milieu du quai, entre les camions JANUS.', { x: -10, z: 84, yaw: -Math.PI / 2 }),
  stage('ateliers', 'TRAVERSER LES ATELIERS JANUS', 'Passerelles au nord des chaînes ; le sas de maintenance est à l’est, côté centre.', { x: -10, z: 60, yaw: Math.PI / 2 }),
  stage('centre', 'SE CONNECTER AU NŒUD D’INTERCONNEXION', 'Le cœur réseau HELIX / JANUS, au centre. Quarante-cinq secondes de connexion.', { x: -10, z: 20, yaw: -Math.PI / 2 }),
  stage('securite', 'COUPER LA SURVEILLANCE', 'Par le couloir ouest jusqu’à la salle de sécurité. Le pupitre est au fond, à l’ouest.', { x: -2, z: -10, yaw: Math.PI / 2 }),
  stage('archives', 'COPIER LES ARCHIVES HELIX', 'Porte nord de la salle de sécurité. Trente secondes de copie.', { x: -70, z: -36, yaw: 0 }),
  stage('supervision', 'ENTRER DANS LA CHAMBRE DE SUPERVISION', 'Par la galerie nord, au pied de la tour JANUS. Lire la note du 17/11/2189 et l’autorisation de Kessler.', { x: -38, z: -48, yaw: -Math.PI / 2 }),
  stage('antenne', 'TRANSMETTRE LES PREUVES À AEGIS', 'Toit nord-est, par la rampe. Une minute d’émission.', { x: 68, z: -48, yaw: -Math.PI / 2 }),
  stage('ascenseur', 'REJOINDRE L’ASCENSEUR DE SERVICE', 'Couloir est, vers le sud. Appeler la cabine, tenir trente secondes, monter à bord.', { x: 86, z: -50, yaw: Math.PI }),
  stage('fin', 'LES ORDRES DE JANUS', 'Les preuves sont chez AEGIS.', { x: LIFT.x, z: LIFT.z, yaw: Math.PI })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));

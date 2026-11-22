// CHAPITRE 07 — « Mémoires locales » : la forêt des Sources jouée avec le moteur de combat commun (ArenaGame).
// La géographie (relief, rivière, gué, moulin, aqueducs, cascade, grotte, Centre de la Cascade, cour d'extraction)
// est celle de foret.js et de la carte du chapitre ; ce module en tire ce dont le moteur a besoin : le sol marchable
// (relief, plancher de la grotte, gué), les collisions (falaise, parois de la grotte, ruines, bâtiments, troncs et
// rochers du parcours), les rencontres d'ORDRE (d'après le budget de m07-story.js), les étapes, les interactions.
// Mètres ; yaw comme sur les autres pages three.js (0 regarde vers −z).
import { terrainHeight, groundHeight, riverInfo, waterY, zoneAt, scatter, PATH, PATH_EAST, CAVE, CHAMBER, POOL, MILL, CENTRE, COURT, AQUEDUCTS, CLIFF_Z } from './foret.js';

export const LEVEL_ID = 'memoires-locales';
export const START = Object.freeze({ x: -84, z: 94, yaw: 0 });
export const EXIT = Object.freeze({ x: 94, z: 54, r: 7 });

// Zones of the map, in the order of the run (labels shown in the HUD). `roof` marks the cave (head lamp, camera ceiling).
export const AREAS = Object.freeze([
  { id: 'lisiere', label: 'La lisière · portail AEGIS' }, { id: 'sousbois', label: 'Sous le couvert' }, { id: 'gue', label: 'Le gué' },
  { id: 'ruines', label: 'Le moulin et l’aqueduc' }, { id: 'cascade', label: 'Derrière la cascade' }, { id: 'grotte', label: 'La grotte · relais', roof: 3.6 },
  { id: 'centre', label: 'Le Centre de la Cascade' }, { id: 'cour', label: 'La cour d’extraction' }, { id: 'aqueduc', label: 'Par l’aqueduc' }
].map(a => Object.freeze(a)));
const ZONE_IDS = { 'La lisière': 'lisiere', 'Sous le couvert': 'sousbois', 'Le gué': 'gue', 'Le moulin et l’aqueduc': 'ruines', 'Derrière la cascade': 'cascade', 'La grotte': 'grotte', 'Le Centre de la Cascade': 'centre', 'La récupération': 'cour', 'Par l’aqueduc': 'aqueduc' };
export const areaAt = (x, z) => ZONE_IDS[zoneAt(x, z)] || 'sousbois';

// ---------- Walkable ground: the relief, the cave floor, and the ford (wading) ----------
export function walkHeight(x, z) {
  const g = groundHeight(x, z), r = riverInfo(x, z);
  return r.d < 6 && z > CLIFF_Z ? Math.max(g, waterY(r.z) - .45) : g;
}
export function createTraversal() {
  return {
    routes: [], lifts: [],
    surfaces(x, z) { return [{ id: areaAt(x, z) === 'grotte' ? 'grotte' : 'sol', height: walkHeight(x, z) }]; },
    height(x, z) { return walkHeight(x, z); },
    routeForSurface() { return null; }
  };
}

// ---------- Collisions ----------
const box = (kind, x, z, hx, hz, height, extra = {}) => ({ kind, x, z, hx, hz, y: 0, height, surface: 'concrete', ...extra });
// The northern cliff (18 m) is a wall, except the cleft to the cave mouth behind the waterfall.
function cliff() {
  const out = [], gapX = CAVE[0][0];
  for (let x = -99; x < 99; x += 4) { if (Math.abs(x + 2 - gapX) < 4.5) continue; out.push(box('cliff', x + 2, CLIFF_Z - 3, 2, 3, 40, { surface: 'rock' })); }
  return out;
}
// The tunnel walls: blocks on both sides of the centreline, and a ring around the relay chamber.
function caveWalls() {
  const out = [], line = [...CAVE];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], L = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (let k = 0; k <= L; k += 1.6) { const x = ax + (bx - ax) * k / L, z = az + (bz - az) * k / L;
      for (const s of [-1, 1]) { const wx = x + nx * 3.1 * s, wz = z + nz * 3.1 * s; if (Math.hypot(wx - CHAMBER.x, wz - CHAMBER.z) < CHAMBER.r + .5) continue; out.push(box('cave-wall', wx, wz, .7, .7, 6, { surface: 'rock' })); } }
  }
  for (let a = 0; a < 28; a++) { const t = a / 28 * Math.PI * 2, x = CHAMBER.x + Math.cos(t) * (CHAMBER.r + .9), z = CHAMBER.z + Math.sin(t) * (CHAMBER.r + .9); if (Math.hypot(x - CAVE[5][0], z - CAVE[5][1]) < 3.2) continue; out.push(box('cave-wall', x, z, .7, .7, 6, { surface: 'rock' })); }
  return out;
}
// Ruins, aqueduct piers, the medical centre and its court, the remnants: the colliders foret.js builds with the world.
// They are recomputed here from the same constants so the simulation never needs the renderer.
function built() {
  const out = [], mx = MILL.x, mz = MILL.z, b = (w, d, x, z, h = 6, ry = 0, kind = 'ruin') => out.push(box(kind, x, z, w / 2, d / 2, h, { yaw: ry, surface: kind === 'ruin' ? 'stone' : 'concrete' }));
  b(12, .8, mx, mz - 5); b(5, .8, mx - 3.5, mz + 5); b(3, .8, mx + 4.5, mz + 5); b(.8, 10, mx - 6, mz); b(.8, 6, mx + 6, mz - 2);
  for (const a of AQUEDUCTS) {
    const dx = a.x1 - a.x0, dz = a.z1 - a.z0, L = Math.hypot(dx, dz), span = L / a.piers;
    for (let i = 0; i <= a.piers; i++) { if (i === a.gap) continue; const x = a.x0 + dx / L * span * i, z = a.z0 + dz / L * span * i; out.push(box('pier', x, z, 1.1, 1.1, 12, { surface: 'stone' })); }
  }
  // Medical centre: four buildings; the court wall with its two gaps.
  for (const [x1, x2, z1, z2, h] of [[34, 66, -42, -20, 8.2], [68, 82, -42, -24, 6.6], [68, 82, -20, -8, 5.6], [32, 42, -16, -8, 4.2]]) out.push(box('building', (x1 + x2) / 2, (z1 + z2) / 2, (x2 - x1) / 2 + .2, (z2 - z1) / 2 + .2, h + CENTRE.y));
  for (const [x1, z1, x2, z2] of [[30, -6, 30, -1], [30, 7, 30, 32], [30, 32, 66, 32], [76, 32, 80, 32], [80, 32, 80, -6]]) out.push(box('court-wall', (x1 + x2) / 2, (z1 + z2) / 2, Math.abs(x2 - x1) / 2 + .35, Math.abs(z2 - z1) / 2 + .35, 1.3 + COURT.y));
  for (const [x, z, n] of [[38, 22, 3], [70, 4, 2], [44, 28, 2], [74, 18, 3], [36, 0, 2]]) out.push(box('crates', x + (n > 1 ? .75 : 0), z + (n > 2 ? .75 : 0), n > 1 ? 1.5 : .8, n > 2 ? 1.5 : .8, 1.1 + COURT.y, { surface: 'metal', cover: true }));
  out.push(box('ambulance', 64, 26, 2.6, 1.3, 2.2 + COURT.y, { surface: 'metal', yaw: .3 }));
  // Remnants: the AEGIS truck, the rusted car, the fallen pylon, the downed ORDRE machine; the fence with its gate.
  out.push(box('truck', -72, 90.5, 4.1, 1.6, 3.5, { surface: 'metal', yaw: Math.PI / 2 - .2 }), box('car', -24, 56, 2.3, 1.2, 1.6, { surface: 'metal', yaw: -.5 }),
    box('pylon', -41, 42, 13.5, 2.4, 2.2, { surface: 'metal', yaw: .9 }), box('machine', 40, 24, 1.6, 1.3, 1.6 + COURT.y, { surface: 'metal', yaw: .7 }));
  out.push(box('fence', -94, 82, 6, .15, 2.6, { surface: 'metal' }), box('fence', -70, 82, 10.5, .15, 2.6, { surface: 'metal' }));
  return out;
}
// Trunks and big rocks near the route and the fights only (the dense forest beyond is drawn, not simulated).
function vegetation() {
  const w = scatter(42), near = (x, z) => z > CLIFF_Z && [...PATH, ...PATH_EAST].some(([px, pz]) => Math.hypot(x - px, z - pz) < 26);   // not on the plateau, above the cave
  const out = [];
  for (const t of w.trees) if (near(t.x, t.z)) out.push(box('trunk', t.x, t.z, .4 * t.s + .15, .4 * t.s + .15, 6, { surface: 'wood', cover: true }));
  for (const r of w.rocks) if (!r.step && r.s > .8 && near(r.x, r.z)) out.push(box('rock', r.x, r.z, .7 * r.s, .7 * r.s, 1.1 * r.s, { surface: 'rock', cover: true }));
  return out;
}
let cached = null;
export function buildCollisions() {
  if (!cached) cached = [...cliff(), ...caveWalls(), ...built(), ...vegetation()].map(o => Object.freeze({ ...o, navPad: Math.min(o.hx, o.hz) < .7 ? .7 : 1.1 }));
  return cached;
}

// Spots placed by hand are nudged, at load, to the nearest free ground: a unit never spawns inside a trunk or a pier.
function blocked(x, z, m) { return buildCollisions().some(b => { const dx = x - b.x, dz = z - b.z, c = Math.cos(b.yaw || 0), s = Math.sin(b.yaw || 0); return Math.abs(dx * c - dz * s) < b.hx + m && Math.abs(dx * s + dz * c) < b.hz + m; }); }
export function freeSpot(x, z, m = 1) {
  if (!blocked(x, z, m)) return { x, z };
  for (let r = .5; r <= 10; r += .5) for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2, px = Math.round((x + Math.cos(t) * r) * 10) / 10, pz = Math.round((z + Math.sin(t) * r) * 10) / 10; if (!blocked(px, pz, m)) return { x: px, z: pz }; }
  return { x, z };
}

// ---------- Interactions, supplies ----------
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.6, label, ...extra });
const relay = { x: CHAMBER.x + 2.4, z: CHAMBER.z - 1.9 };
export const INTERACTIONS = Object.freeze([
  it('treuil', -14, 9, 'ACTIONNER LE TREUIL DE LA PASSERELLE'),
  it('vanne', MILL.x - 3, MILL.z + 2, 'OUVRIR LA VANNE DU MOULIN'),
  it('turbine', CHAMBER.x - 2, CHAMBER.z + 1, 'RELANCER LA TURBINE DU RELAIS'),
  it('liaison', 55, 12, 'OUVRIR LA LIAISON AVEC AEGIS'),
  it('doc-sentier', -80, 70, 'LIRE LE PANNEAU DE L’ANTENNE', { log: 'sentier' }),
  it('doc-epars', -62, 16, 'LIRE LES NOTES D’ÉPARS', { log: 'epars' }),
  it('doc-moulin', MILL.x + 1, MILL.z + 2, 'LIRE LE REGISTRE DU MOULIN', { log: 'moulin' }),
  it('doc-toise', CAVE[0][0] - 1.6, CAVE[0][1] + 2.5, 'LIRE LES MARQUES DANS LA ROCHE', { log: 'toise' }),
  it('doc-relais', relay.x, relay.z + 1.2, 'LIRE LE JOURNAL DU RELAIS', { log: 'relais-grotte' }),
  it('doc-journal', 50, -18.5, 'LIRE LE JOURNAL DU CENTRE', { log: 'journal' }),
  it('doc-dossier', 75, -6.5, 'LIRE LE DOSSIER TRANSCENDANCE', { log: 'dossier' })
].map(i => Object.freeze({ ...i, y: walkHeight(i.x, i.z) })));
export const SUPPLIES = Object.freeze([['heal', -78, 60], ['cell', -66, 22], ['heal', -30, 2], ['cell', 6, -22], ['heal', 18, -44], ['cell', 30, -66],
  ['heal', 44, -88], ['cell', 28, -20], ['heal', 36, 14], ['cell', 74, 10], ['heal', 70, 36], ['cell', 86, 46]].map(([kind, x, z]) => Object.freeze({ kind, x, z, y: walkHeight(x, z) })));

// ---------- Encounters (budget of m07-story.js: 6 · 8 · 14 · 6 · 12 · 4 · 18 · 8 units) ----------
const unit = (form, x, z, extra = {}) => { const p = freeSpot(x, z, form === 'brute' || extra.elite || form === 'bulwark' ? 1.2 : 1); return Object.freeze({ form, x: p.x, z: p.z, ...extra }); };
export const ENCOUNTERS = Object.freeze({
  sousbois: { wave: 3, units: [unit('probe', -72, 40), unit('stalker', -60, 30), unit('scuttler', -66, 20), unit('probe', -50, 10), unit('stalker', -76, 26), unit('scuttler', -56, 22)] },
  gue: { wave: 4, units: [unit('stalker', -6, 14), unit('bulwark', -4, 2), unit('probe', -10, -4)] },
  gue1: { wave: 4, portal: { x: 2, z: 20 }, units: [unit('stalker', 2, 20), unit('scuttler', 0, 18), unit('scuttler', 4, 22)] },
  gue2: { wave: 4, portal: { x: -40, z: -4 }, units: [unit('seer', -40, -4), unit('stalker', -38, -2)] },
  ruines: { wave: 5, units: [unit('bulwark', 22, -24), unit('stalker', 6, -40), unit('stalker', 26, -36), unit('seer', -6, -30), unit('probe', 0, -50), unit('scuttler', 20, -18), unit('scuttler', 24, -30), unit('listener', 2, -24)] },
  ruines2: { wave: 5, portal: { x: -20, z: -40 }, units: [unit('brute', -20, -40), unit('stalker', -16, -38), unit('scuttler', -22, -36), unit('probe', -14, -44), unit('stalker', -24, -44), unit('scuttler', -18, -34)] },
  cascade: { wave: 5, units: [unit('stalker', 8, -52), unit('probe', 26, -50), unit('seer', 30, -56), unit('scuttler', 10, -58), unit('stalker', 34, -48), unit('probe', 20, -46)] },
  grotte: { wave: 6, units: [unit('scuttler', 33, -82), unit('scuttler', 36, -84), unit('scuttler', 41, -86), unit('scuttler', 44, -87)] },
  rampants1: { wave: 6, portal: { x: CHAMBER.x - 3, z: CHAMBER.z + 3 }, units: [unit('scuttler', CHAMBER.x - 3, CHAMBER.z + 3), unit('scuttler', CHAMBER.x - 2, CHAMBER.z + 2), unit('scuttler', CHAMBER.x - 4, CHAMBER.z + 2), unit('scuttler', CHAMBER.x - 3, CHAMBER.z + 1)] },
  rampants2: { wave: 6, portal: { x: CHAMBER.x + 1, z: CHAMBER.z + 3 }, units: [unit('scuttler', CHAMBER.x + 1, CHAMBER.z + 3), unit('stalker', CHAMBER.x + 2, CHAMBER.z + 2), unit('scuttler', CHAMBER.x, CHAMBER.z + 2), unit('scuttler', CHAMBER.x + 1, CHAMBER.z + 1)] },
  centre: { wave: 6, units: [unit('stalker', 46, -14), unit('probe', 60, -14), unit('seer', 76, -4), unit('stalker', 28, -28)] },
  cour1: { wave: 7, portal: { x: 70, z: 22 }, units: [unit('stalker', 70, 22), unit('stalker', 68, 18), unit('scuttler', 72, 26), unit('probe', 66, 24)] },
  cour2: { wave: 7, portal: { x: 40, z: 8 }, units: [unit('bulwark', 40, 8), unit('stalker', 42, 12), unit('seer', 38, 14), unit('scuttler', 44, 6)] },
  cour3: { wave: 7, portal: { x: 62, z: -2 }, units: [unit('brute', 62, -2), unit('stalker', 58, -2), unit('probe', 66, 0), unit('scuttler', 60, 2), unit('scuttler', 64, 2)] },
  cour4: { wave: 7, portal: { x: 48, z: 26 }, units: [unit('stalker', 48, 26), unit('stalker', 52, 28), unit('seer', 46, 22), unit('probe', 54, 24), unit('scuttler', 50, 22)] },
  n08: { wave: 7, units: [unit('synth', 55, 4, { elite: true, boss: 2.4, name: 'SY-05 · UNITÉ EXPÉRIMENTALE', n08: true })] },
  sortie: { wave: 7, units: [unit('stalker', 78, 38), unit('probe', 84, 44), unit('scuttler', 74, 34), unit('stalker', 90, 48)] },
  sortie2: { wave: 7, portal: { x: 88, z: 36 }, units: [unit('brute', 88, 36), unit('stalker', 92, 40), unit('scuttler', 86, 34), unit('probe', 90, 32)] }
});
export const HOLDS = Object.freeze({ treuil: 30, turbine: 45, liaison: 90 });
export const HOLD_WAVES = Object.freeze({ treuil: [[3, 'gue1'], [15, 'gue2']], turbine: [[4, 'rampants1'], [22, 'rampants2']], liaison: [[4, 'cour1'], [24, 'cour2'], [46, 'cour3'], [66, 'cour4']] });

// ---------- Stages ----------
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('lisiere', 'ENTRER DANS LA FORÊT DES SOURCES', 'Le portail d’AEGIS est ouvert. La piste des Tilleuls part vers le nord.', { x: -84, z: 92, yaw: 0 }),
  stage('sousbois', 'TRAVERSER LE SOUS-BOIS', 'Des sondes d’ORDRE survolent la canopée ; des traqueurs fouillent le couvert.', { x: -82, z: 58, yaw: 0 }),
  stage('gue', 'PASSER LE GUÉ', 'Le treuil de la passerelle est sur la rive est. Trente secondes : tenir le gué.', { x: -34, z: 6, yaw: -Math.PI / 2 }),
  stage('ruines', 'OUVRIR LA VANNE DU MOULIN', 'Le moulin est sur la berge est ; l’aqueduc passe au-dessus de la rivière.', { x: -6, z: -4, yaw: 0 }),
  stage('cascade', 'PASSER DERRIÈRE LA CASCADE', 'Un sentier mouillé longe le bassin jusqu’à la fente dans la falaise.', { x: 12, z: -44, yaw: 0 }),
  stage('grotte', 'RELANCER LA TURBINE DU RELAIS', 'Au fond de la galerie, la chambre du relais. Quarante-cinq secondes de remise en route.', { x: CAVE[0][0], z: CAVE[0][1] + 4, yaw: 0 }),
  stage('centre', 'FOUILLER LE CENTRE DE LA CASCADE', 'Le journal à l’entrée du bâtiment principal, le dossier aux archives.', { x: 28, z: -46, yaw: Math.PI }),
  stage('cour', 'TENIR LA COUR D’EXTRACTION', 'Ouvrir la liaison au centre de la cour, tenir quatre-vingt-dix secondes, puis la SY-05.', { x: 34, z: 3, yaw: -Math.PI / 2 }),
  stage('sortie', 'REJOINDRE LA RIVIÈRE PAR L’AQUEDUC', 'Le long de l’aqueduc, vers l’est, jusqu’à la rivière.', { x: 70, z: 32, yaw: -Math.PI / 2 }),
  stage('fin', 'MÉMOIRES LOCALES', 'Exfiltration réussie.', { x: 94, z: 54, yaw: -Math.PI / 2 })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));
export { POOL, CENTRE, COURT };

// COURONNE HELIX — standalone level (cyberpunk setting, sandbox combat in the spirit of the roadmap).
// Book: W09 « Couronne HELIX » (Tome II §23) at dusk on the heights of Vesper (§34), mission path of M10
// (place → lobby → centre de sécurité → terrasse) and the phase anchors owned by HELIX (§27).
// Pure data: floors, stairs, colliders, encounters and objectives, shared by the renderer and the tests.
// Metres, 1 unit = 1 m. The player walks towards -z (yaw 0). Stairs climb towards -z, as the engine's
// stair routes expect (bottomZ > topZ).

export const LEVEL_ID = 'couronne-helix';
export const HEIGHTS = Object.freeze({ ground: 0, terrace: 3, parvis: 6, ancrage: 12 });
export const START = Object.freeze({ x: 0, z: 78, yaw: 0 });
// Last metres of every stair are a flat landing that cuts a notch into the podium below it, so that a
// climbing body reaches the top height before it touches the podium wall (the engine blocks a body
// against any box whose top is above its feet).
export const LANDING = 1.4;

// Raised walkable floors (the ground slab at 0 m is the engine's default height).
export const FLOORS = Object.freeze([
  { id: 'terrasse-est', x1: 30, x2: 40, z1: 14, z2: 50, height: HEIGHTS.terrace },
  { id: 'parvis', x1: -36, x2: 36, z1: -34, z2: 4, height: HEIGHTS.parvis },
  { id: 'ancrage', x1: -32, x2: 32, z1: -86, z2: -34, height: HEIGHTS.ancrage }
].map(Object.freeze));

export const STAIRS = Object.freeze([
  { id: 'grand-escalier', x: 0, halfWidth: 7, bottomZ: 15, topZ: 4, base: 0, height: HEIGHTS.parvis, to: 'parvis' },
  { id: 'rampe-est', x: 35, halfWidth: 2.5, bottomZ: 58, topZ: 50, base: 0, height: HEIGHTS.terrace, to: 'terrasse-est' },
  { id: 'escalier-est', x: 34, halfWidth: 2, bottomZ: 14, topZ: 4, base: HEIGHTS.terrace, height: HEIGHTS.parvis, to: 'parvis' },
  { id: 'montee-ouest', x: -28, halfWidth: 2.5, bottomZ: -22, topZ: -34, base: HEIGHTS.parvis, height: HEIGHTS.ancrage, to: 'ancrage' },
  { id: 'montee-est', x: 28, halfWidth: 2.5, bottomZ: -22, topZ: -34, base: HEIGHTS.parvis, height: HEIGHTS.ancrage, to: 'ancrage' }
].map(Object.freeze));

const rect = (x1, x2, z1, z2) => ({ x1, x2, z1, z2 });
const notchOf = s => rect(s.x - s.halfWidth - .3, s.x + s.halfWidth + .3, s.topZ - LANDING, s.topZ);

// Cover the rectangle minus the holes with as few axis-aligned rectangles as a grid split allows.
export function subtractRects(area, holes) {
  const xs = [...new Set([area.x1, area.x2, ...holes.flatMap(h => [h.x1, h.x2])])].filter(x => x >= area.x1 && x <= area.x2).sort((a, b) => a - b);
  const zs = [...new Set([area.z1, area.z2, ...holes.flatMap(h => [h.z1, h.z2])])].filter(z => z >= area.z1 && z <= area.z2).sort((a, b) => a - b);
  const pieces = [];
  for (let j = 0; j < zs.length - 1; j++) {
    let run = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
      const free = !holes.some(h => cx > h.x1 && cx < h.x2 && cz > h.z1 && cz < h.z2);
      if (free) { if (run) run.x2 = xs[i + 1]; else run = rect(xs[i], xs[i + 1], zs[j], zs[j + 1]); }
      else if (run) { pieces.push(run); run = null; }
    }
    if (run) pieces.push(run);
  }
  return pieces;
}

const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, ...extra });
const at = (kind, x, z, hx, hz, y, height, extra = {}) => ({ kind, x, z, hx, hz, y, height, ...extra });
// Wind screens are high (the Crown is hundreds of metres above the streets); balustrades are low cover.
const SCREEN = 3, RAIL = 1.05;

function podiums() {
  const out = [];
  for (const floor of FLOORS) {
    const holes = STAIRS.filter(s => s.to === floor.id).map(notchOf);
    for (const p of subtractRects(rect(floor.x1, floor.x2, floor.z1, floor.z2), holes))
      out.push(box('podium', p.x1, p.x2, p.z1, p.z2, 0, floor.height, { surface: 'concrete', render: false }));
  }
  return out;
}

// Cheek walls in four steps following the slope: always a balustrade above the treads, never a blind wall.
export const SIDE_STEPS = 4;
function stairSides() {
  const out = [];
  for (const s of STAIRS) for (const side of [-1, 1]) {
    const x = s.x + side * (s.halfWidth + .15), length = s.bottomZ - s.topZ;
    for (let k = 0; k < SIDE_STEPS; k++) {
      const z2 = s.bottomZ - k * length / SIDE_STEPS, z1 = s.bottomZ - (k + 1) * length / SIDE_STEPS;
      out.push(box('stair-side', x - .15, x + .15, z1, z2, 0, stairHeight(s, z1) + RAIL, { surface: 'metal', stair: s.id }));
    }
  }
  return out;
}

// Edges of a floor, with gaps where stairs arrive or leave.
function edge(kind, axis, fixed, from, to, y, height, gaps = [], extra = {}) {
  const out = [];
  let cursor = from;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) {
    if (a > cursor) out.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to) out.push([cursor, to]);
  return out.map(([a, b]) => axis === 'x'
    ? box(kind, a, b, fixed - .15, fixed + .15, y, height, extra)
    : box(kind, fixed - .15, fixed + .15, a, b, y, height, extra));
}

function perimeter() {
  const glass = { surface: 'glass' };
  return [
    // Héliport: three sides of wind screens, the security filter on the fourth.
    ...edge('screen', 'z', -16, 60, 84, 0, SCREEN, [], glass), ...edge('screen', 'z', 16, 60, 84, 0, SCREEN, [], glass),
    ...edge('screen', 'x', 84, -16, 16, 0, SCREEN, [], glass),
    ...edge('filter-wall', 'x', 60, -16, 16, 0, 4.2, [[-4, 4]], { surface: 'concrete' }),
    // Esplanade.
    ...edge('screen', 'x', 60, -40, -16, 0, SCREEN, [], glass), ...edge('screen', 'x', 60, 16, 40, 0, SCREEN, [], glass),
    ...edge('screen', 'z', -40, 4, 60, 0, SCREEN, [], glass), ...edge('screen', 'z', 40, 4, 60, 0, SCREEN, [], glass),
    ...edge('screen', 'x', 4, -40, -36, 0, SCREEN, [], glass), ...edge('screen', 'x', 4, 36, 40, 0, SCREEN, [], glass),
    // Terrasse est (+3): low hedge towards the plaza, screen outside.
    ...edge('hedge', 'z', 30, 14, 50, HEIGHTS.terrace, RAIL, [], { surface: 'plant' }),
    ...edge('rail', 'x', 50, 30, 40, HEIGHTS.terrace, RAIL, [[32.2, 37.8]], { surface: 'metal' }),
    ...edge('rail', 'x', 14, 30, 40, HEIGHTS.terrace, RAIL, [[31.7, 36.3]], { surface: 'metal' }),
    ...edge('screen', 'z', 40, 14, 50, HEIGHTS.terrace, SCREEN, [], glass),
    // Parvis (+6): balustrade over the plaza (cover for the defenders), screens on the sides.
    ...edge('rail', 'x', 3.85, -36, 36, HEIGHTS.parvis, RAIL, [[-7.3, 7.3], [31.7, 36.3]], { surface: 'glass' }),
    ...edge('screen', 'z', -36, -34, 4, HEIGHTS.parvis, SCREEN, [], glass), ...edge('screen', 'z', 36, -34, 4, HEIGHTS.parvis, SCREEN, [], glass),
    // Terrasse de l'ancrage (+12).
    ...edge('screen', 'z', -32, -86, -34, HEIGHTS.ancrage, SCREEN, [], glass), ...edge('screen', 'z', 32, -86, -34, HEIGHTS.ancrage, SCREEN, [], glass),
    ...edge('screen', 'x', -86, -32, 32, HEIGHTS.ancrage, SCREEN, [], glass),
    ...edge('rail', 'x', -33.85, -32, 32, HEIGHTS.ancrage, RAIL, [[-30.8, -25.2], [-20, 20], [25.2, 30.8]], { surface: 'glass' })
  ];
}

function architecture() {
  const p = HEIGHTS.parvis, a = HEIGHTS.ancrage, glass = { surface: 'glass' };
  return [
    // Héliport: HELIX shuttle, cargo, the scanner arches of the filter.
    at('shuttle', -7, 73, 3.2, 5.6, 0, 2.7, { surface: 'metal' }),
    at('crate', 8.5, 68.5, .75, .75, 0, 1.5, { surface: 'metal' }), at('crate', 10.2, 70.4, .75, .75, 0, 1.5, { surface: 'metal' }),
    at('crate', 9.2, 69.6, .75, .75, 1.5, 1.2, { surface: 'metal' }),
    at('scanner', -3.6, 60, .35, .7, 0, 3.4, { surface: 'metal' }), at('scanner', 3.6, 60, .35, .7, 0, 3.4, { surface: 'metal' }),
    // Esplanade: fountain-hologram, planters (low cover), monoliths (high cover), the west colonnade.
    at('fountain', 0, 33, 5, 5, 0, .75, { surface: 'concrete' }),
    ...[[-12, 46], [12, 46], [-12, 21], [12, 21], [-22, 37], [22, 37]].map(([x, z]) => at('planter', x, z, 2.2, .6, 0, .95, { surface: 'plant' })),
    ...[[-20, 28], [20, 28], [-8, 18.5], [8, 18.5], [-18, 52], [18, 52]].map(([x, z]) => at('monolith', x, z, .9, .9, 0, 4.6, { surface: 'concrete' })),
    ...[16, 22, 28, 34, 40, 46, 52].map(z => at('column', -31, z, .45, .45, 0, 5.6, { surface: 'concrete' })),
    at('bench', -36, 31, .5, 2.4, 0, .55, { surface: 'concrete' }), at('bench', -36, 43, .5, 2.4, 0, .55, { surface: 'concrete' }),
    at('kiosk', 26, 54, 1.1, 1.1, 0, 2.6, { surface: 'metal' }),
    // Terrasse est: planters on the deck.
    at('planter', 35, 40, .6, 2.2, HEIGHTS.terrace, .95, { surface: 'plant' }), at('planter', 35, 26, .6, 2.2, HEIGHTS.terrace, .95, { surface: 'plant' }),
    // Parvis: cover in front of the lobby.
    ...[[-12, -4], [12, -4]].map(([x, z]) => at('planter', x, z, 2.4, .6, p, .95, { surface: 'plant' })),
    ...[[-26, -8], [26, -8]].map(([x, z]) => at('sculpture', x, z, 1.1, 1.1, p, 3.4, { surface: 'concrete' })),
    ...[[-6, -10], [6, -10], [-17, 0], [17, 0]].map(([x, z]) => at('barrier', x, z, 1.8, .25, p, 1.1, { surface: 'metal' })),
    at('kiosk', -28, -2, 1.1, 1.1, p, 2.6, { surface: 'metal' }), at('kiosk', 24, -14, 1.1, 1.1, p, 2.6, { surface: 'metal' }),
    // HELIX lobby: glass front with a central entrance, solid sides and back.
    ...edge('glass-wall', 'x', -16.2, -20, 20, p, 9, [[-4, 4]], glass),
    box('lobby-wall', -20, -19.6, -34, -16, p, 9, { surface: 'concrete' }), box('lobby-wall', 19.6, 20, -34, -16, p, 9, { surface: 'concrete' }),
    box('lobby-wall', -20, 20, -34, -33.6, p, 9, { surface: 'concrete' }),
    at('desk', 0, -22.6, 5, .4, p, 1.1, { surface: 'metal' }),
    at('pillar', -10, -25, .45, .45, p, 9, { surface: 'concrete' }), at('pillar', 10, -25, .45, .45, p, 9, { surface: 'concrete' }),
    at('console', 0, -29.4, .9, .4, p, 1.25, { surface: 'metal', console: 'securite' }),
    // Ancrage: the anchor plinth, stabilizers (high cover), the two phase consoles, barriers and crates.
    at('anchor-base', 0, -64, 7, 7, a, 4, { surface: 'metal' }),
    ...[[-15, -52], [15, -52], [-15, -76], [15, -76]].map(([x, z]) => at('stabilizer', x, z, 1.6, 1.6, a, 4.5, { surface: 'metal' })),
    at('console', -11, -45.9, .9, .45, a, 1.25, { surface: 'metal', console: 'ancrage-ouest' }),
    at('console', 11, -45.9, .9, .45, a, 1.25, { surface: 'metal', console: 'ancrage-est' }),
    ...[[-6, -40], [6, -40]].map(([x, z]) => at('barrier', x, z, 2.2, .3, a, 1.05, { surface: 'metal' })),
    ...[[-24, -60], [24, -60]].map(([x, z]) => at('barrier', x, z, .3, 2.2, a, 1.05, { surface: 'metal' })),
    at('barrier', 0, -81, 4, .3, a, 1.05, { surface: 'metal' }),
    ...[[-23, -44], [23, -44], [-24, -80], [24, -80]].map(([x, z]) => at('crate', x, z, .75, .75, a, 1.5, { surface: 'metal' }))
  ];
}

// HELIX security fields across both ascents, lifted from the lobby console.
export const GATES = Object.freeze(STAIRS.filter(s => s.to === 'ancrage').map(s =>
  Object.freeze(at('gate', s.x, s.bottomZ + .4, s.halfWidth + .3, .15, s.base, 3.2, { surface: 'metal', gate: 'securite' }))));

export function buildCollisions({ gatesOpen = false } = {}) {
  return [...podiums(), ...stairSides(), ...perimeter(), ...architecture(), ...(gatesOpen ? [] : GATES)].map(o => ({ ...o }));
}

// Height of the walkable surface under (x, z), ignoring surfaces above `max` (to walk under them).
export function stairHeight(s, z) {
  if (z >= s.bottomZ) return s.base;
  if (z <= s.topZ) return s.height;
  return s.base + (s.height - s.base) * (s.bottomZ - z) / (s.bottomZ - s.topZ);
}
const onStair = (s, x, z) => Math.abs(x - s.x) <= s.halfWidth && z <= s.bottomZ && z >= s.topZ - LANDING;
const onFloor = (f, x, z) => x >= f.x1 && x <= f.x2 && z >= f.z1 && z <= f.z2;

export function createTraversal() {
  const routes = STAIRS.map(s => ({ id: s.id, x: s.x, halfWidth: s.halfWidth, bottomZ: s.bottomZ, topZ: s.topZ, height: s.height, base: s.base }));
  return {
    routes, lifts: [],
    surfaces(x, z) {
      return [...FLOORS.filter(f => onFloor(f, x, z)).map(f => ({ id: f.id, height: f.height })),
        ...STAIRS.filter(s => onStair(s, x, z)).map(s => ({ id: s.id, height: stairHeight(s, z) }))];
    },
    height(x, z, time = 0, max = Infinity) {
      let h = 0;
      for (const f of FLOORS) if (f.height <= max + .01 && onFloor(f, x, z)) h = Math.max(h, f.height);
      for (const s of STAIRS) if (onStair(s, x, z)) { const v = stairHeight(s, z); if (v <= max + .01) h = Math.max(h, v); }
      return h;
    },
    // Machines climb to the player's floor by the stair that serves it (the ascents by the player's side).
    routeForSurface(id, x = 0) {
      if (id === 'terrasse-est') return 'rampe-est';
      if (id === 'parvis') return 'grand-escalier';
      if (id === 'ancrage') return x < 0 ? 'montee-ouest' : 'montee-est';
      return STAIRS.some(s => s.id === id) ? id : null;
    }
  };
}

// Interaction points: stand within `radius` on the same floor.
export const INTERACTIONS = Object.freeze([
  { id: 'securite', x: 0, z: -28.2, y: HEIGHTS.parvis, radius: 2.4, label: 'LEVER LE VERROU DE SÉCURITÉ' },
  { id: 'ancrage-ouest', x: -11, z: -44.6, y: HEIGHTS.ancrage, radius: 2.4, label: 'DÉSYNCHRONISER LE STABILISATEUR OUEST' },
  { id: 'ancrage-est', x: 11, z: -44.6, y: HEIGHTS.ancrage, radius: 2.4, label: 'DÉSYNCHRONISER LE STABILISATEUR EST' }
].map(Object.freeze));

// Encounters. `floor` sets the spawn height; `wave` scales durability and speed like the Arena waves.
// Tactical portals (Tome II PT02) are announced a few seconds before units step out.
const unit = (form, x, z, floor = 'ground', extra = {}) => Object.freeze({ form, x, z, floor, ...extra });
export const ENCOUNTERS = Object.freeze({
  esplanade: Object.freeze({ wave: 3, units: [
    unit('stalker', -10, 40), unit('stalker', 8, 44), unit('scuttler', 2, 26), unit('seer', -20, 24),
    unit('seer', 35, 32, 'terrace'), unit('seer', 37.5, 44, 'terrace'), unit('probe', 0, 41)] }),
  renfortEsplanade: Object.freeze({ wave: 3, portal: { x: -12, z: 14, floor: 'ground' }, units: [
    unit('stalker', -13, 16), unit('stalker', -10, 15), unit('brute', -12, 12, 'ground', { elite: true })] }),
  parvis: Object.freeze({ wave: 5, portal: { x: 0, z: -8, floor: 'parvis' }, units: [
    unit('synth', -10, -6, 'parvis'), unit('seer', 9, -1, 'parvis'), unit('seer', -24, -12, 'parvis'), unit('stalker', 4, -12, 'parvis'),
    unit('stalker', -4, -12, 'parvis'), unit('brute', 0, -7, 'parvis', { elite: true }), unit('probe', 14, -14, 'parvis'), unit('probe', -14, -14, 'parvis')] }),
  ancrage: Object.freeze({ wave: 7, portal: { x: 0, z: -52, floor: 'ancrage' }, units: [
    unit('bulwark', 0, -50, 'ancrage'), unit('seer', -20, -58, 'ancrage'), unit('seer', 20, -58, 'ancrage'), unit('listener', 0, -77, 'ancrage'),
    unit('stalker', -9, -72, 'ancrage'), unit('stalker', 9, -72, 'ancrage'), unit('probe', -10, -62, 'ancrage'), unit('probe', 10, -62, 'ancrage')] }),
  renfortAncrage: Object.freeze({ wave: 7, portal: { x: 0, z: -84, floor: 'ancrage' }, units: [
    unit('brute', -2, -84.2, 'ancrage', { elite: true }), unit('synth', 2, -84.2, 'ancrage'), unit('scuttler', -6, -83, 'ancrage'), unit('scuttler', 6, -83, 'ancrage')] })
});
// Encounter pressure: during a fight, machines of the active group that lost the player go back to searching
// around where the player roughly is (within `range`), instead of returning to patrol mid-stair. Their own
// perception still decides when they actually see, shoot or take cover.
export const PRESSURE_RANGE = 60;
export function keepPressure(game, ids, { range = PRESSURE_RANGE, spread = 3 } = {}) {
  const p = game.player; let pressed = 0;
  for (const e of game.enemies) {
    if (!ids.includes(e.id) || e.awareness === 'engaged' || Math.hypot(e.x - p.x, e.z - p.z) > range) continue;
    const a = (e.id * 2.39996) % (Math.PI * 2);
    Object.assign(e, { awareness: 'search', alertedUntil: game.time + 6, lastKnownX: p.x + Math.cos(a) * spread, lastKnownZ: p.z + Math.sin(a) * spread, lastKnownHeight: p.elevation });
    pressed++;
  }
  return pressed;
}
export const FLOOR_HEIGHT = Object.freeze({ ground: 0, terrace: HEIGHTS.terrace, parvis: HEIGHTS.parvis, ancrage: HEIGHTS.ancrage });

// Stages of the mission, each with its checkpoint (respawn after a defeat).
export const STAGES = Object.freeze([
  { label: 'FRANCHIR LE FILTRE DE SÉCURITÉ', hint: 'Quitte l’héliport par les portiques de contrôle HELIX.', checkpoint: { x: 0, z: 78, yaw: 0 } },
  { label: 'SÉCURISER L’ESPLANADE', hint: 'Neutralise la patrouille ORDRE. Les colonnades à gauche couvrent, la terrasse à droite domine.', checkpoint: { x: 0, z: 64, yaw: 0 } },
  { label: 'PRENDRE LE PARVIS HELIX', hint: 'Monte par le grand escalier ou par la terrasse est. Des renforts arrivent sur le parvis.', checkpoint: { x: 0, z: 22, yaw: 0 } },
  { label: 'LEVER LE VERROU DE SÉCURITÉ', hint: 'Entre dans le hall HELIX et ouvre les champs de sécurité au pupitre central.', checkpoint: { x: 0, z: -2, yaw: 0 } },
  { label: 'DÉSYNCHRONISER L’ANCRAGE', hint: 'Sur la terrasse de l’ancrage, coupe les deux stabilisateurs de phase.', checkpoint: { x: 28, z: -18, yaw: 0 } },
  { label: 'TENIR LA TERRASSE', hint: 'L’ancrage s’éteint. Élimine les dernières machines.', checkpoint: { x: 0, z: -40, yaw: 0 } },
  { label: 'LIAISON COUPÉE', hint: 'La Couronne HELIX ne nourrit plus les portails d’ORDRE.', checkpoint: { x: 0, z: -40, yaw: 0 } }
].map(Object.freeze));

// LIGNE 9 — « La Ligne Noyée » (campaign mission M05, Tome II W05 / B05 / B06, storyboard 05A–05C).
// Pure data shared by the renderer, the mission flow and the tests: rooms, walls, doors, water, props,
// interactions, encounters and stages. Metres, 1 unit = 1 m. The route goes towards +z then west (-x);
// yaw π looks towards +z. The engine's stair routes climb towards -z (bottomZ > topZ): the street stair is
// therefore walked down towards +z.
// Navigation rule (engine CoverNavigation: 2 m grid, obstacles inflated by 1.3 m): corridors are 4 m wide
// and centred on even coordinates, doorways 3 m or more and centred on even coordinates, so that machines
// can follow the player through every passage they are meant to use.

export const LEVEL_ID = 'ligne-9';
export const HEIGHTS = Object.freeze({ ground: 0, rue: 4.2 });
export const START = Object.freeze({ x: 0, z: -92, yaw: Math.PI });
export const LANDING = 1.4;

// Rooms: floor, ceiling and walls dressing; `ceiling` is the clear height.
const room = (id, x1, x2, z1, z2, ceiling, look, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, ceiling, look, ...extra });
export const ROOMS = Object.freeze([
  room('rue', -8, 8, -97, -84, 0, 'street', { floor: HEIGHTS.rue, label: 'Rue des Tanneurs · bouche de la Ligne 9' }),
  room('escalier', -3.3, 3.3, -86, -72, 9, 'stairwell', { label: 'Escalier de la station Halles-Basses' }),
  room('hall', -16, 16, -72, -48, 6, 'hall', { label: 'Salle des billets' }),
  room('local', 16, 26, -66, -56, 3.6, 'technical', { label: 'Local technique' }),
  room('couloir1', -2, 2, -48, -18, 3.4, 'corridor', { label: 'Couloir de correspondance' }),
  room('secours', 2, 14, -42, -30, 3.2, 'aid', { label: 'Poste de secours AEGIS (2189)' }),
  room('couloir2', 2, 40, -22, -18, 3.4, 'corridor', { label: 'Correspondance des Halles' }),
  room('halles', 40, 92, -46, 2, 9, 'market', { label: 'Halles-Basses · marché souterrain' }),
  room('couloirE', 82, 86, 2, 26, 3.4, 'corridor', { label: 'Accès quai 9' }),
  room('abri', 86, 96, 10, 20, 3, 'shelter', { label: 'Abri des Épars' }),
  room('quai', 30, 94, 26, 64, 8, 'platform', { label: 'Quai 9 · direction Orme' }),
  room('tunnel', -60, 30, 34, 38, 3.2, 'service', { label: 'Tunnel technique' }),
  room('ventilation', -24, -12, 38, 46, 4, 'technical', { label: 'Local de ventilation' }),
  room('pompes', -94, -60, 20, 52, 14, 'pumps', { label: 'Salle des pompes P9' }),
  room('couloirEcluse', -78, -74, 52, 64, 3.4, 'corridor', { label: 'Galerie de l’écluse' }),
  room('sas', -90, -62, 64, 78, 10, 'lock', { label: 'Sas de l’écluse' }),
  room('voie', -62, -40, 68, 76, 6, 'lowtrack', { label: 'Voie basse' }),
  room('chambre', -40, 20, 60, 96, 12, 'anchor', { label: 'Nœud JANUS-9' }),
  room('orme', 20, 44, 76, 96, 3.6, 'control', { label: 'Poste de commande Orme' }),
  room('cabine', 44, 50, 82, 90, 3, 'lift', { label: 'Monte-charge de service' })
]);

export const FLOORS = Object.freeze([Object.freeze({ id: 'rue', x1: -8, x2: 8, z1: -97, z2: -84, height: HEIGHTS.rue })]);
export const STAIRS = Object.freeze([Object.freeze({ id: 'escalier-rue', x: 0, halfWidth: 3, bottomZ: -74, topZ: -84, base: 0, height: HEIGHTS.rue, to: 'rue' })]);

// ---------- Collider helpers ----------
const box = (kind, x1, x2, z1, z2, y, height, extra = {}) => ({ kind, x: (x1 + x2) / 2, z: (z1 + z2) / 2, hx: (x2 - x1) / 2, hz: (z2 - z1) / 2, y, height, ...extra });
const at = (kind, x, z, hx, hz, y, height, extra = {}) => ({ kind, x, z, hx, hz, y, height, ...extra });
const T = .15;
// A straight wall with doorways: gaps are [centre, width].
function wall(axis, fixed, from, to, height, gaps = [], extra = {}) {
  const spans = [], holes = gaps.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]);
  let cursor = from;
  for (const [a, b] of holes) { if (a > cursor) spans.push([cursor, a]); cursor = Math.max(cursor, b); }
  if (cursor < to) spans.push([cursor, to]);
  return spans.map(([a, b]) => axis === 'x'
    ? box('wall', a, b, fixed - T, fixed + T, 0, height, { surface: 'tile', ...extra })
    : box('wall', fixed - T, fixed + T, a, b, 0, height, { surface: 'tile', ...extra }));
}
const wx = (z, x1, x2, h, gaps, extra) => wall('x', z, x1, x2, h, gaps, extra);
const wz = (x, z1, z2, h, gaps, extra) => wall('z', x, z1, z2, h, gaps, extra);

function walls() {
  return [
    // Street: facades and a parapet over the stairwell.
    ...wz(-8, -97, -84, 12, [], { surface: 'concrete', look: 'facade' }), ...wz(8, -97, -84, 12, [], { surface: 'concrete', look: 'facade' }),
    ...wx(-97, -8, 8, 12, [], { surface: 'concrete', look: 'facade' }),
    box('parapet', -8, -3.3, -84.15, -83.85, HEIGHTS.rue, 1.1, { surface: 'metal' }), box('parapet', 3.3, 8, -84.15, -83.85, HEIGHTS.rue, 1.1, { surface: 'metal' }),
    // Stairwell shaft.
    ...wz(-3.3, -86, -72, 9), ...wz(3.3, -86, -72, 9),
    // Ticket hall and its technical room.
    ...wx(-72, -16, 16, 6, [[0, 6.6]]), ...wx(-48, -16, 16, 6, [[0, 3]]),
    ...wz(-16, -72, -48, 6), ...wz(16, -72, -48, 6, [[-62, 3]]),
    ...wx(-66, 16, 26, 3.6, [], { surface: 'concrete' }), ...wx(-56, 16, 26, 3.6, [], { surface: 'concrete' }), ...wz(26, -66, -56, 3.6, [], { surface: 'concrete' }),
    // Connecting corridors and the 2189 AEGIS aid post.
    ...wz(-2, -48, -18, 3.4), ...wz(2, -48, -22, 3.4, [[-36, 3]]),
    ...wx(-42, 2, 14, 3.2), ...wx(-30, 2, 14, 3.2), ...wz(14, -42, -30, 3.2),
    ...wx(-22, 2, 40, 3.4), ...wx(-18, -2, 40, 3.4),
    // Halles-Basses.
    ...wz(40, -46, 2, 9, [[-20, 4]], { surface: 'concrete' }), ...wz(92, -46, 2, 9, [], { surface: 'concrete' }),
    ...wx(-46, 40, 92, 9, [], { surface: 'concrete' }), ...wx(2, 40, 92, 9, [[84, 3]], { surface: 'concrete' }),
    // Platform access and the Épars shelter.
    ...wz(82, 2, 26, 3.4), ...wz(86, 2, 26, 3.4, [[14, 3]]),
    ...wx(10, 86, 96, 3, [], { surface: 'concrete' }), ...wx(20, 86, 96, 3, [], { surface: 'concrete' }), ...wz(96, 10, 20, 3, [], { surface: 'concrete' }),
    // Station: platform A, flooded tracks, platform B behind the water.
    ...wx(26, 30, 94, 8, [[84, 4]]), ...wz(94, 26, 64, 8), ...wz(30, 26, 64, 8, [[36, 4]]), ...wx(64, 30, 94, 8),
    // Service tunnel and the ventilation room.
    ...wx(34, -60, 30, 3.2, [], { surface: 'concrete' }), ...wx(38, -60, 30, 3.2, [[-18, 3]], { surface: 'concrete' }),
    ...wz(-24, 38, 46, 4, [], { surface: 'concrete' }), ...wz(-12, 38, 46, 4, [], { surface: 'concrete' }), ...wx(46, -24, -12, 4, [], { surface: 'concrete' }),
    // Pump hall P9.
    ...wz(-60, 20, 52, 14, [[36, 4]], { surface: 'concrete' }), ...wz(-94, 20, 52, 14, [], { surface: 'concrete' }),
    ...wx(20, -94, -60, 14, [], { surface: 'concrete' }), ...wx(52, -94, -60, 14, [[-76, 3]], { surface: 'concrete' }),
    // Lock gallery and lock chamber.
    ...wz(-78, 52, 64, 3.4, [], { surface: 'concrete' }), ...wz(-74, 52, 64, 3.4, [], { surface: 'concrete' }),
    ...wx(64, -90, -62, 10, [[-76, 4]], { surface: 'concrete' }), ...wx(78, -90, -62, 10, [], { surface: 'concrete' }),
    ...wz(-90, 64, 78, 10, [], { surface: 'concrete' }), ...wz(-62, 64, 78, 10, [[72, 8]], { surface: 'concrete' }),
    // Low track and the JANUS-9 chamber.
    ...wx(68, -62, -40, 6, [], { surface: 'concrete' }), ...wx(76, -62, -40, 6, [], { surface: 'concrete' }),
    ...wz(-40, 60, 96, 12, [[72, 8]], { surface: 'concrete' }), ...wx(60, -40, 20, 12, [], { surface: 'concrete' }), ...wx(96, -40, 20, 12, [], { surface: 'concrete' }),
    ...wz(20, 60, 96, 12, [[88, 3]], { surface: 'concrete' }),
    // Orme control post and the service lift.
    ...wx(76, 20, 44, 3.6), ...wx(96, 20, 44, 3.6), ...wz(44, 76, 96, 3.6, [[86, 3]]),
    ...wx(82, 44, 50, 3, [], { surface: 'metal' }), ...wx(90, 44, 50, 3, [], { surface: 'metal' }), ...wz(50, 82, 90, 3, [], { surface: 'metal' })
  ];
}

// Doors: closed ones are colliders filling the doorway (sliding fire doors, the market shutter, the lock gate).
// `open: true` doors are open from the start (they only slide aside as the player comes).
const door = (id, axis, fixed, centre, width, height, extra = {}) => Object.freeze({ id, axis, fixed, centre, width, height, ...extra });
export const DOORS = Object.freeze([
  door('service', 'x', -48, 0, 3, 3, { label: 'Porte de service', style: 'fire' }),
  door('local', 'z', 16, -62, 3, 2.6, { open: true, style: 'fire' }),
  door('secours', 'z', 2, -36, 3, 2.6, { open: true, style: 'fire' }),
  door('halles', 'z', 40, -20, 4, 3.2, { open: true, style: 'glass' }),
  door('rideau', 'x', 2, 84, 3, 3.4, { label: 'Rideau métallique', style: 'shutter' }),
  door('abri', 'z', 86, 14, 3, 2.6, { open: true, style: 'fire' }),
  door('quai', 'x', 26, 84, 4, 3.2, { open: true, style: 'glass' }),
  door('tunnel', 'z', 30, 36, 4, 3, { open: true, style: 'grille' }),
  door('ventilation', 'x', 38, -18, 3, 2.6, { open: true, style: 'fire' }),
  door('pompes', 'z', -60, 36, 4, 3.4, { open: true, style: 'fire' }),
  door('galerie', 'x', 52, -76, 3, 3.2, { label: 'Galerie de l’écluse', style: 'fire' }),
  door('ecluse', 'z', -62, 72, 8, 6, { label: 'Porte d’écluse', style: 'lock' }),
  door('orme', 'z', 20, 88, 3, 3, { label: 'Poste Orme', style: 'fire' }),
  door('cabine', 'z', 44, 86, 3, 2.6, { label: 'Monte-charge', style: 'lift' })
]);
export function doorCollider(d) {
  const half = d.width / 2, extra = { surface: 'metal', door: d.id };
  return d.axis === 'x' ? box('door', d.centre - half, d.centre + half, d.fixed - .2, d.fixed + .2, 0, d.height + 2, extra)
    : box('door', d.fixed - .2, d.fixed + .2, d.centre - half, d.centre + half, 0, d.height + 2, extra);
}

// Water: deep or live water nobody can wade into. Drainable bodies disappear from the colliders once pumped.
const water = (id, x1, x2, z1, z2, level, extra = {}) => Object.freeze({ id, x1, x2, z1, z2, level, ...extra });
export const WATER = Object.freeze([
  water('bassin', 56, 76, -32, -12, -.6, { depth: 3, label: 'Effondrement des Halles' }),
  water('voies', 30, 94, 44, 52, -.5, { depth: 1.4, drainTo: -1.25, label: 'Voies 9 inondées' }),
  water('tunnel', -40, 0, 34, 38, 1.3, { drainable: true, drainTo: -.25, live: true, label: 'Tunnel technique noyé' }),
  water('voie', -62, -40, 68, 76, 1.6, { drainable: true, drainTo: -.25, label: 'Voie basse noyée' })
]);
export function waterCollider(w) { return box('water', w.x1, w.x2, w.z1, w.z2, 0, 1.25, { surface: 'water', water: w.id }); }

// Props that matter for play: cover, pillars, machines. Low cover ≈ 1.05 m, high cover ≥ 1.6 m.
function props() {
  const out = [];
  const add = (kind, x, z, hx, hz, h, surface = 'metal', extra = {}) => out.push(at(kind, x, z, hx, hz, 0, h, { surface, ...extra }));
  // Street: a burnt-out tram stop roof and a barrier (on the street floor).
  out.push(at('bollard', -5, -91, .25, .25, HEIGHTS.rue, .9, { surface: 'metal' }), at('bollard', 5, -91, .25, .25, HEIGHTS.rue, .9, { surface: 'metal' }));
  // Ticket hall: glass booth, a line of turnstiles with two openings, ticket machines, evacuation stretchers.
  add('booth', -11, -64, 3, 4, 3, 'glass');
  out.push(...wx(-56, -16, 16, 1.05, [[-14, 3], [12, 3]], { surface: 'metal', look: 'turnstiles' }).map(b => ({ ...b, kind: 'turnstiles' })));
  for (const z of [-53, -51]) add('ticket-machine', -15.2, z, .6, .55, 1.9);
  add('stretcher', 6, -66, 1.1, .4, .8, 'metal'); add('stretcher', 9, -61, .4, 1.1, .8, 'metal');
  add('crates', 11, -51, .8, .8, 1.3, 'wood');
  // Technical room: switchboard cabinets.
  add('cabinet', 24.6, -63, .6, 1.6, 2.2); add('cabinet', 21, -64.6, 1.6, .6, 2.2);
  // AEGIS aid post: cots and a radio table.
  add('cot', 7, -40.4, 1, .45, .6, 'fabric'); add('cot', 11, -40.4, 1, .45, .6, 'fabric'); add('table', 11, -32, 1.3, .6, .9, 'metal');
  // Halles-Basses: stalls (low), kiosks (high), structural pillars; railings around the collapse.
  for (const [x, z] of [[46, -40], [46, -30], [46, -8], [86, -40], [86, -30], [86, -16], [50, -2], [62, -40], [72, -40], [66, -4], [78, -4]]) add('stall', x, z, 1.3, .6, 1.1, 'wood');
  for (const [x, z] of [[52, -36], [80, -36], [52, -6], [80, -8]]) add('kiosk', x, z, 1, 1, 2.6, 'metal');
  for (const x of [52, 64, 76, 88]) for (const z of [-44, 0]) add('pillar', x, z, .45, .45, 9, 'concrete');
  add('pillar', 52, -20, .45, .45, 9, 'concrete'); add('pillar', 80, -20, .45, .45, 9, 'concrete');
  // Platform: pillar row, benches, a vending machine, platform-edge barrier blocks.
  for (const x of [40, 52, 64, 76]) add('pillar', x, 32, .5, .5, 8, 'tile');
  for (const x of [46, 58, 70]) add('bench', x, 40, 1.2, .35, .5, 'metal');
  add('vending', 89, 28.4, .8, .45, 2, 'metal'); add('barrier', 62, 42.6, 3, .3, 1.05, 'metal');
  // The 4 m service tunnel stays clear (single navigation lane); its cable reels are stored in the ventilation room.
  add('cable-drum', -22.4, 44.6, .8, .8, 1.4, 'wood');
  // Ventilation room: fan housings.
  add('fan', -20, 43, 1.4, 1.4, 2.6); add('fan', -15, 43, 1.2, 1.2, 2.4);
  // Pump hall: three pump volutes (high cover), the control desk (low), the main header pipe.
  for (const z of [26, 36, 46]) add('pump', -86, z, 2.4, 2.4, 4.2, 'metal', { pump: true });
  add('desk', -72, 36, 2.2, .6, 1.1, 'metal'); add('header-pipe', -87.5, 50.4, 5.5, .7, 1.6, 'metal');
  add('crates', -66, 46, .8, .8, 1.4, 'metal'); add('crates', -68, 27, .8, .8, 1.4, 'metal');
  // Lock chamber: winch blocks.
  add('winch', -84, 66, 1.4, .9, 2, 'metal'); add('winch', -84, 76, 1.4, .9, 2, 'metal');
  // JANUS-9 chamber: the anchor column, HELIX racks and scaffolds, ORDRE maintenance frames.
  add('anchor', -10, 80, 2.6, 2.6, 12, 'metal', { anchor: true });
  for (const [x, z] of [[-26, 68], [-26, 88], [6, 70], [6, 90]]) add('rack', x, z, 1.6, .6, 2.4, 'metal');
  for (const [x, z] of [[-18, 80], [-2, 80]]) add('scaffold', x, z, .5, 2, 1.2, 'metal');
  add('crates', -34, 64, .8, .8, 1.4, 'metal'); add('crates', 14, 92, .8, .8, 1.4, 'metal');
  // Orme control post: the old signalling desk.
  add('desk', 32, 84, 3, .7, 1.1, 'metal');
  return out;
}

// Interaction points (stand within `radius`). `log` entries are readable documents (ligne9-story.js).
const it = (id, x, z, label, extra = {}) => Object.freeze({ id, x, z, y: 0, radius: 2.3, label, ...extra });
export const INTERACTIONS = Object.freeze([
  it('tableau', 23.4, -60, 'RÉTABLIR LE COURANT DE SECOURS'),
  it('relais-ouest', 42.5, -44, 'RACCORDER LE RELAIS OUEST'),
  it('relais-est', 89.5, -2, 'RACCORDER LE RELAIS EST'),
  it('pompe-a', 92, 33, 'AMORCER LA POMPE A'),
  it('vanne-1', -62.8, 24, 'OUVRIR LA VANNE 1'),
  it('vanne-2', -91.2, 30, 'OUVRIR LA VANNE 2'),
  it('vanne-3', -62.8, 48, 'OUVRIR LA VANNE 3'),
  it('pupitre-p9', -72, 34.4, 'DÉMARRER LES POMPES P9'),
  it('ecluse', -87.5, 71, 'OUVRIR L’ÉCLUSE'),
  it('preuve-1', -34, 93.5, 'COPIER LE JOURNAL HELIX'),
  it('preuve-2', 14, 62.5, 'COPIER LE JOURNAL ORDRE'),
  it('relais-orme', 21.4, 92, 'TRANSMETTRE PAR L’ANCIEN RELAIS'),
  // Documents (always readable).
  it('doc-avis', -14.8, -70.5, 'LIRE L’AVIS AUX USAGERS', { log: 'avis' }),
  it('doc-guichet', -6.9, -64, 'LIRE LE CARNET DU GUICHET', { log: 'guichet' }),
  it('doc-registre', 11, -33.6, 'LIRE LE REGISTRE D’ÉVACUATION', { log: 'registre' }),
  it('doc-marchande', 66, -5.6, 'LIRE LE MOT DE LA MARCHANDE', { log: 'marchande' }),
  it('doc-abri', 94.5, 15, 'LIRE LE CAHIER DE NIRA', { log: 'abri' }),
  it('doc-ventilation', -22.6, 40.2, 'LIRE L’ORDRE DE MAINTENANCE', { log: 'ventilation' }),
  it('doc-chef', -92.5, 44, 'LIRE LE CARNET DU CHEF DE STATION', { log: 'chef' })
]);

// Encounters: units by chassis; `wave` scales durability and speed like the Arena; `portal` announces an ORDRE
// tactical portal; `emerge` brings crawlers out of the flooded tracks (no portal). `boss` multiplies durability.
const unit = (form, x, z, extra = {}) => Object.freeze({ form, x, z, ...extra });
export const ENCOUNTERS = Object.freeze({
  hall: { wave: 3, units: [unit('scuttler', -6, -54), unit('scuttler', 8, -53), unit('scuttler', 2, -50.5), unit('listener', -4, -60), unit('stalker', 12, -66)] },
  correspondance: { wave: 3, units: [unit('stalker', 24, -20), unit('stalker', 32, -20.5), unit('seer', 37, -19.5), unit('scuttler', 18, -19.5), unit('scuttler', 28, -19.8)] },
  halles: { wave: 4, units: [unit('stalker', 50, -24), unit('stalker', 84, -24), unit('stalker', 70, -38), unit('seer', 84, -42), unit('seer', 60, -4), unit('seer', 88, -6),
    unit('scuttler', 58, -34, { emerge: true }), unit('scuttler', 74, -34, { emerge: true }), unit('scuttler', 66, -10, { emerge: true }), unit('brute', 72, -6), unit('probe', 66, -36)] },
  renfortHalles: { wave: 4, portal: { x: 78, z: -41 }, units: [unit('stalker', 76, -40.5), unit('stalker', 80, -40.5), unit('synth', 78, -38.5), unit('brute', 78, -42.5, { elite: true })] },
  acces: { wave: 4, units: [unit('listener', 84, 20), unit('scuttler', 84, 9), unit('scuttler', 84, 23)] },
  quai: { wave: 5, units: [unit('seer', 40, 30), unit('seer', 70, 30), unit('stalker', 52, 36), unit('stalker', 64, 36), unit('probe', 46, 38), unit('probe', 76, 38)] },
  rampants1: { wave: 5, emerge: true, units: [unit('scuttler', 50, 42.6), unit('scuttler', 58, 42.6), unit('scuttler', 70, 42.6), unit('scuttler', 80, 42.6)] },
  rampants2: { wave: 5, emerge: true, units: [unit('scuttler', 44, 42.6), unit('scuttler', 66, 42.6), unit('scuttler', 74, 42.6), unit('scuttler', 86, 42.6)] },
  rampants3: { wave: 5, emerge: true, units: [unit('brute', 56, 42.4, { elite: true })] },
  tunnel: { wave: 5, units: [unit('scuttler', 12, 36), unit('scuttler', -4, 36), unit('stalker', -22, 36), unit('stalker', -34, 36), unit('listener', -17.5, 40), unit('scuttler', -46, 36)] },
  delestage: { wave: 5, units: [unit('scuttler', -50, 36), unit('scuttler', -54, 36), unit('stalker', -56, 36), unit('scuttler', 4, 36)] },
  pompes: { wave: 6, units: [unit('seer', -90, 22.6), unit('seer', -91.5, 47), unit('stalker', -78, 26), unit('stalker', -78, 46), unit('bulwark', -80, 36), unit('probe', -70, 42)] },
  defense1: { wave: 6, portal: { x: -80, z: 26 }, units: [unit('stalker', -82, 25), unit('stalker', -78, 25), unit('stalker', -80, 28), unit('brute', -80, 24, { elite: true })] },
  defense2: { wave: 6, portal: { x: -80, z: 46 }, units: [unit('synth', -82, 46), unit('synth', -78, 46), unit('seer', -80, 48.5), unit('seer', -76, 48), unit('probe', -80, 44), unit('probe', -74, 46)] },
  ecluse: { wave: 6, portal: { x: -84, z: 71 }, units: [unit('scuttler', -86, 70), unit('scuttler', -86, 74), unit('scuttler', -82, 69), unit('scuttler', -80, 75), unit('stalker', -80, 72), unit('stalker', -78, 70)] },
  chambre: { wave: 7, units: [unit('bulwark', -24, 76), unit('listener', 0, 88, { elite: true, boss: 3, name: 'TRAQUEUR ALPHA' }), unit('seer', -30, 92), unit('seer', 12, 66),
    unit('stalker', -14, 66), unit('stalker', 2, 94), unit('scuttler', -20, 92), unit('scuttler', 10, 80)] },
  surtension: { wave: 7, portal: { x: -10, z: 70 }, units: [unit('probe', -12, 70), unit('probe', -8, 70), unit('probe', -10, 72), unit('synth', -10, 68)] },
  fuite: { wave: 7, units: [unit('stalker', -36, 84), unit('stalker', -36, 90), unit('scuttler', -30, 72), unit('scuttler', -30, 76), unit('scuttler', -34, 66)] }
});

// Stages, each with its checkpoint (respawn after a defeat).
const stage = (id, label, hint, checkpoint) => Object.freeze({ id, label, hint, checkpoint: Object.freeze(checkpoint) });
export const STAGES = Object.freeze([
  stage('descente', 'DESCENDRE DANS LA STATION', 'Prends l’escalier de la bouche de métro, rue des Tanneurs.', { x: 0, z: -92, yaw: Math.PI }),
  stage('courant', 'RÉTABLIR LE COURANT DE SECOURS', 'La porte de service est morte. Le tableau de secours est dans le local technique, à droite des guichets.', { x: 0, z: -70, yaw: Math.PI }),
  stage('correspondance', 'SUIVRE LA CORRESPONDANCE', 'Couloir de correspondance vers les Halles-Basses. Le poste de secours AEGIS est sur la droite.', { x: 0, z: -46, yaw: Math.PI }),
  stage('halles', 'TRAVERSER LES HALLES-BASSES', 'Le sol s’est effondré sur la ligne : contourne le bassin par les allées sèches.', { x: 34, z: -20, yaw: -Math.PI / 2 }),
  stage('relais', 'RACCORDER LES DEUX RELAIS', 'Un boîtier de relais à l’ouest, un à l’est du marché. Ils commandent le rideau du quai.', { x: 44, z: -20, yaw: -Math.PI / 2 }),
  stage('acces', 'REJOINDRE LE QUAI 9', 'Accès quai par le rideau nord. Un traqueur écoute dans le couloir : avance prudemment.', { x: 84, z: 4, yaw: Math.PI }),
  stage('pompeA', 'AMORCER LA POMPE A', 'Le panneau de la pompe A est au bout du quai, côté est. Ne t’approche pas de l’eau sous tension.', { x: 84, z: 30, yaw: Math.PI }),
  stage('tunnel', 'LONGER LE TUNNEL TECHNIQUE', 'Le tunnel technique part du bout ouest du quai et mène à la salle des pompes P9.', { x: 26, z: 36, yaw: Math.PI / 2 }),
  stage('vannes', 'OUVRIR LES TROIS VANNES', 'Vannes 1 et 3 sur le mur est, vanne 2 derrière les pompes. Les pompes ne démarrent pas vannes fermées.', { x: -62, z: 36, yaw: Math.PI / 2 }),
  stage('pompes', 'DÉMARRER LES POMPES P9', 'Pupitre central de la salle. L’amorçage prend une minute et demie : tiens la salle.', { x: -66, z: 36, yaw: Math.PI / 2 }),
  stage('ecluse', 'OUVRIR L’ÉCLUSE', 'Galerie nord, puis le treuil de l’écluse. La porte met quarante-cinq secondes à s’ouvrir.', { x: -76, z: 58, yaw: Math.PI }),
  stage('voie', 'DESCENDRE LA VOIE BASSE', 'L’eau s’est retirée. Suis la voie basse jusqu’à la chambre qui brille.', { x: -64, z: 72, yaw: -Math.PI / 2 }),
  stage('preuves', 'RELEVER LES PREUVES', 'Deux terminaux dans la chambre : journal HELIX au nord-ouest, journal ORDRE au sud-est.', { x: -38, z: 72, yaw: -Math.PI / 2 }),
  stage('fuite', 'REJOINDRE LE POSTE ORME', 'ORDRE inverse les pompes : l’eau remonte. Porte est de la chambre, vite.', { x: -12, z: 66, yaw: -Math.PI / 2 }),
  stage('transmettre', 'TRANSMETTRE ET REMONTER', 'Envoie les preuves à Nira par l’ancien relais, puis prends le monte-charge.', { x: 24, z: 86, yaw: -Math.PI / 2 }),
  stage('fin', 'LIGNE 9 RENDUE AUX VIVANTS', 'Les preuves sont parties. Le monte-charge remonte vers les Bas-Niveaux.', { x: 47, z: 86, yaw: -Math.PI / 2 })
]);
export const STAGE_INDEX = Object.freeze(Object.fromEntries(STAGES.map((s, i) => [s.id, i])));

// Collision world for a mission state: open doors and drained water are left out.
export function buildCollisions({ open = [], drained = [] } = {}) {
  const openSet = new Set(open), drainedSet = new Set(drained);
  return [
    ...podiums(), ...stairSides(), ...walls(), ...props(),
    ...DOORS.filter(d => !d.open && !openSet.has(d.id)).map(doorCollider),
    ...WATER.filter(w => !(w.drainable && drainedSet.has(w.id))).map(waterCollider)
  ].map(o => ({ ...o }));
}

// ---------- Street floor and stair (same scheme as the Couronne HELIX) ----------
const rect = (x1, x2, z1, z2) => ({ x1, x2, z1, z2 });
function subtract(area, hole) {
  const out = [];
  if (hole.z1 > area.z1) out.push(rect(area.x1, area.x2, area.z1, hole.z1));
  if (hole.x1 > area.x1) out.push(rect(area.x1, hole.x1, hole.z1, hole.z2));
  if (hole.x2 < area.x2) out.push(rect(hole.x2, area.x2, hole.z1, hole.z2));
  if (hole.z2 < area.z2) out.push(rect(area.x1, area.x2, hole.z2, area.z2));
  return out;
}
function podiums() {
  const s = STAIRS[0], f = FLOORS[0], notch = rect(s.x - s.halfWidth - .3, s.x + s.halfWidth + .3, s.topZ - LANDING, s.topZ);
  return subtract(rect(f.x1, f.x2, f.z1, f.z2), notch).map(p => box('podium', p.x1, p.x2, p.z1, p.z2, 0, f.height, { surface: 'concrete', render: false }));
}
function stairSides() { return []; }

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
    routeForSurface(id) { return id === 'rue' || id === 'escalier-rue' ? 'escalier-rue' : null; }
  };
}

// Room containing a point (for lighting, sound and dialogue triggers).
export function roomAt(x, z) { return ROOMS.find(r => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2)?.id || null; }

// Encounter pressure, as in the Couronne HELIX: machines of the active groups that lost the player search
// around where he roughly is, within the same room or its neighbours.
export const PRESSURE_RANGE = 45;
export function keepPressure(game, ids, { range = PRESSURE_RANGE, spread = 2.5 } = {}) {
  const p = game.player; let pressed = 0;
  for (const e of game.enemies) {
    if (!ids.includes(e.id) || e.awareness === 'engaged' || Math.hypot(e.x - p.x, e.z - p.z) > range) continue;
    const a = (e.id * 2.39996) % (Math.PI * 2);
    Object.assign(e, { awareness: 'search', alertedUntil: game.time + 6, lastKnownX: p.x + Math.cos(a) * spread, lastKnownZ: p.z + Math.sin(a) * spread, lastKnownHeight: p.elevation });
    pressed++;
  }
  return pressed;
}

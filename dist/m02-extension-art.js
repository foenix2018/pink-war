import { createNeonFixture } from './neon-fixture.js';
import {createLivedInDressing} from './vesper-lived-in.js';
// M02 extension dressing: the enclave of the covered market (stalls turned into barricades and beds, dormitory
// tents, kitchen, school corner, water purifier, dispensary, radio room, the service lift from the Archives) and
// the transit tower held by HELIX Security (black, industrial white, safety red: scanner gates, data vault, loading
// dock of the convoy to the Anneau logistique). Layout in m02-extension-layout.js. Night scene, W02 palette:
// dirty cyan, amber, runoff, low cables, steam. Interiors are lit by a small pool of point lights moved to the
// nearest fixtures; the page dims its moon and sky light indoors with shelterAt(). Textures: CC0 sets already
// shipped (assets/cc0, assets/ligne9).
import {createVesperProps} from './vesper-props.js';
import { ROOMS, DOORS, INTERACTIONS, roomAt } from './m02-extension-layout.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
const roofed = r => r && r.ceiling > 0;
// Share of the moon and sky light that still reaches the eye in each room (1 = outdoors).
const SHELTER = { street: 1, market: .7, clinic: .3, corridor: .25, radio: .28, lift: .22, lobby: .45, vault: .22, dock: .6 };

function canvasTexture(T, w, h, paint, { repeat = false, color = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (color) t.colorSpace = T.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}

export function createM02ExtensionArt(T, scene, { quality = 'normal', accent = 0xff6fb4 } = {}) {
  const low = quality === 'low', rng = seeded(2202);
  const root = new T.Group(); root.name = 'M02 / enclave du marché et tour de transit'; scene.add(root);
  const details = createVesperProps(T, root, {low});
  const animated = [], stats = { meshes: 0, instances: 0, textures: 0, fixtures: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Materials ----------
  const loader = new T.TextureLoader(), cache = new Map();
  const load = (url, srgb) => {
    if (cache.has(url)) return cache.get(url);
    const p = new Promise(resolve => loader.load(url, tex => { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.anisotropy = low ? 2 : 6; if (srgb) tex.colorSpace = T.SRGBColorSpace; stats.textures++; resolve(tex); }, undefined, () => resolve(null)));
    cache.set(url, p); return p;
  };
  const pbr = (maps, { tile = 2, color = 0xffffff, roughness = 1, metalness = 0, label } = {}) => {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness, name: label }); m.userData.tile = tile;
    Promise.all([maps.diff && load(maps.diff, true), maps.nor && !low && load(maps.nor, false), maps.rough && load(maps.rough, false)]).then(([d, n, r]) => {
      if (d) m.map = d; if (n) { m.normalMap = n; m.normalScale = new T.Vector2(.8, .8); } if (r) m.roughnessMap = r; m.needsUpdate = true;
    });
    return m;
  };
  const L9 = name => ({ diff: `./assets/ligne9/l9-${name}_diff_512.jpg`, nor: `./assets/ligne9/l9-${name}_nor_512.jpg`, rough: `./assets/ligne9/l9-${name}_rough_512.jpg` });
  const CC = (name, nor = 'normal') => ({ diff: `./assets/cc0/${name}_diff_512.jpg`, nor: `./assets/cc0/${name}_${nor}_512.jpg`, rough: `./assets/cc0/${name}_rough_512.jpg` });
  const flat = (color, roughness = .6, metalness = .2, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const glow = color => new T.MeshBasicMaterial({ color, toneMapped: false });
  const M = {
    facade: pbr(L9('concrete_wall_006'), { tile: 3, color: 0x8d969a, label: 'béton des Bas-Niveaux' }),
    concrete: pbr(L9('concrete_wall_006'), { tile: 3, color: 0xa29e96, label: 'béton' }),
    plaster: pbr(L9('concrete_wall_006'), { tile: 4, color: 0xc9cfc8, label: 'enduit' }),
    tile: pbr(L9('long_white_tiles'), { tile: 1.6, color: 0xd9e4e0, label: 'faïence' }),
    dirtyTile: pbr(L9('dirty_tiles'), { tile: 1.4, color: 0xa7aea4, label: 'carrelage sale' }),
    floorTile: pbr(L9('worn_tile_floor'), { tile: 2.4, color: 0x9ea4a0, roughness: .85, label: 'dallage' }),
    antiSkid: pbr(L9('anti_skid_tiles'), { tile: 2, color: 0x8f9799, label: 'dalle antidérapante' }),
    slab: pbr(CC('concrete_floor'), { tile: 3, color: 0x8b8d8a, label: 'dalle béton' }),
    asphalt: pbr(CC('asphalt_03'), { tile: 3, color: 0x6f7476, roughness: .55, label: 'enrobé mouillé' }),
    plate: pbr(L9('metal_plate'), { tile: 2, color: 0x939ba0, metalness: .55, roughness: .7, label: 'tôle' }),
    grid: pbr(L9('rusty_metal_grid'), { tile: 1.5, color: 0x9d8f80, metalness: .5, label: 'caillebotis' }),
    shutter: pbr(L9('rusted_shutter'), { tile: 3, color: 0xbfc9cc, metalness: .3, label: 'rideau métallique' }),
    rust: pbr(L9('green_metal_rust'), { tile: 2.5, color: 0x8aa59a, metalness: .45, label: 'acier vert' }),
    corrugated: pbr(CC('corrugated_iron'), { tile: 2, color: 0x8e979a, metalness: .5, label: 'bac acier' }),
    paintedMetal: pbr(CC('rusty_painted_metal'), { tile: 2, color: 0xb9c2c0, metalness: .4, label: 'métal peint' }),
    // HELIX Security: black, industrial white, safety red.
    helixWhite: flat(0xe9ecee, .32, .25, { name: 'blanc HELIX' }), helixBlack: flat(0x0b0d10, .4, .55, { name: 'noir HELIX' }), helixRed: flat(0xc1121f, .4, .3, { name: 'rouge sécurité' }),
    white: flat(0xdedfd8, .5, .2), dark: flat(0x1a1f24, .5, .6), steel: flat(0x737d84, .32, .85), black: flat(0x0c0e10, .7, .3),
    wood: flat(0x5e4630, .85, 0), woodDark: flat(0x392a1d, .85, 0), fabric: flat(0x3f5560, .95, 0), tarp: flat(0x2f6f78, .9, 0, { side: T.DoubleSide }), tarpAmber: flat(0x9a6a2a, .9, 0, { side: T.DoubleSide }),
    blanket: flat(0x8b3b4a, .95, 0), cardboard: flat(0x8a7458, .95, 0), paper: flat(0xe4ddc8, .95, 0, { side: T.DoubleSide }), sheet: flat(0xd8dfdc, .95, 0),
    water: flat(0x13252c, .05, .2, { name: 'ruissellement' }),
    glass: flat(0x8fb1bb, .06, .5, { transparent: true, opacity: .18, depthWrite: false, side: T.DoubleSide }), screenOff: flat(0x0c1216, .2, .3),
    amber: glow(0xffb35c), cyan: glow(0x5fe0f0), green: glow(0x3dff8a), redGlow: glow(0xff3328), helix: glow(0xff2f45), rose: glow(accent)
  };

  // Shared physical surface channels for close-up furniture and equipment.
  for (const [keys,kind] of [
    [['wood','woodDark'],'wood'],[['fabric','blanket','sheet','tarp','tarpAmber'],'fabric'],
    [['steel'],'steel'],[['red','white','yellow','frame','helixWhite','helixBlack','helixRed'],'paint'],
    [['dark','black'],'rubber'],[['cardboard','paper'],'paper']
  ]) for (const key of keys) if (M[key]) details.surface(M[key],kind);

  // ---------- Merged geometry (world-space UVs in metres / tile) ----------
  const geos = new Map();
  const bucket = m => { if (!geos.has(m)) geos.set(m, { p: [], n: [], u: [], i: [] }); return geos.get(m); };
  function quad(m, o, U, V) {
    const g = bucket(m), tile = m.userData.tile || 2, lu = Math.hypot(...U), lv = Math.hypot(...V); if (lu < 1e-4 || lv < 1e-4) return;
    const uh = U.map(c => c / lu), vh = V.map(c => c / lv);
    const n = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]], ln = Math.hypot(...n), base = g.p.length / 3;
    for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      const p = [o[0] + U[0] * a + V[0] * b, o[1] + U[1] * a + V[1] * b, o[2] + U[2] * a + V[2] * b];
      g.p.push(...p); g.n.push(n[0] / ln, n[1] / ln, n[2] / ln);
      g.u.push((p[0] * uh[0] + p[1] * uh[1] + p[2] * uh[2]) / tile, (p[0] * vh[0] + p[1] * vh[1] + p[2] * vh[2]) / tile);
    }
    g.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function box(m, x1, x2, y1, y2, z1, z2, { skip = ['bottom'], top = m } = {}) {
    const a = x2 - x1, b = y2 - y1, c = z2 - z1, s = new Set(skip);
    if (!s.has('+x')) quad(m, [x2, y1, z2], [0, 0, -c], [0, b, 0]);
    if (!s.has('-x')) quad(m, [x1, y1, z1], [0, 0, c], [0, b, 0]);
    if (!s.has('+z')) quad(m, [x1, y1, z2], [a, 0, 0], [0, b, 0]);
    if (!s.has('-z')) quad(m, [x2, y1, z1], [-a, 0, 0], [0, b, 0]);
    if (!s.has('top')) quad(top, [x1, y2, z2], [a, 0, 0], [0, 0, -c]);
    if (!s.has('bottom')) quad(m, [x1, y1, z1], [a, 0, 0], [0, 0, c]);
  }
  const floorRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z2], [x2 - x1, 0, 0], [0, 0, -(z2 - z1)]);
  const ceilRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z1], [x2 - x1, 0, 0], [0, 0, z2 - z1]);
  function flushGeometry() {
    for (const [m, g] of geos) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(g.n, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(g.u, 2)); geo.setIndex(g.p.length / 3 > 65535 ? new T.Uint32BufferAttribute(g.i, 1) : new T.Uint16BufferAttribute(g.i, 1));
      geo.computeBoundingSphere(); const mesh = new T.Mesh(geo, m); mesh.name = 'M02x / ' + (m.name || 'surface'); mesh.receiveShadow = true; mesh.castShadow = !low && !m.transparent; add(mesh);
    }
    geos.clear();
  }
  const cube = new T.BoxGeometry(1, 1, 1), pieces = new Map();
  const piece = (m, x, y, z, sx, sy, sz, ry = 0) => { if (!pieces.has(m)) pieces.set(m, []); pieces.get(m).push([x, y, z, sx, sy, sz, ry]); };
  function flushPieces() {
    const mat = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [m, list] of pieces) {
      const mesh = new T.InstancedMesh(cube, m, list.length); mesh.name = 'M02x / ' + (m.name || 'pièces');
      list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, mat.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; mesh.castShadow = !low && !m.transparent; add(mesh); stats.instances += list.length;
    }
    pieces.clear();
  }
  const cylinder = (m, x, y, z, r, h, { axis = 'y', segments = 16, r2 = r } = {}) => {
    const c = new T.Mesh(new T.CylinderGeometry(r2, r, h, segments), m); c.position.set(x, y, z);
    if (axis === 'x') c.rotation.z = Math.PI / 2; if (axis === 'z') c.rotation.x = Math.PI / 2; c.castShadow = !low; c.receiveShadow = true; return add(c);
  };

  // ---------- Canvas textures: signs, papers ----------
  const FONT = 'system-ui,"Segoe UI",Arial,sans-serif';
  const signTex = (lines, { bg = '#0d3b5e', fg = '#f2f4f2', w = 512, h = 128, border = null } = {}) => canvasTexture(T, w, h, (c, W, H) => {
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, W, H); }
    if (border) { c.strokeStyle = border; c.lineWidth = Math.max(4, H * .05); c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth); }
    const rows = Array.isArray(lines) ? lines : [lines]; c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    rows.forEach((row, k) => { c.font = `${k ? 700 : 900} ${Math.round(H * (k ? .2 : .42) / Math.max(1, rows.length * .7))}px ${FONT}`; c.fillText(row, W / 2, H * (rows.length === 1 ? .52 : (k + .8) / (rows.length + .6)), W * .92); });
  });
  function sign(tex, x, y, z, yaw, w, h, { lit = false, see = false } = {}) {
    const mat = lit ? new T.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: see, alphaTest: see ? .05 : 0 }) : new T.MeshStandardMaterial({ map: tex, roughness: .7, metalness: .05, transparent: see, alphaTest: see ? .05 : 0 });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), mat); mesh.position.set(x, y, z); mesh.rotation.y = yaw; return add(mesh);
  }
  const paperTex = (title, seed) => canvasTexture(T, 128, 180, (c, w, h) => {
    const r = seeded(seed); c.fillStyle = '#e8e1cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b2b2b'; c.font = `800 11px ${FONT}`; c.fillText(title, 8, 16, w - 16);
    c.fillStyle = 'rgba(40,40,40,.65)'; for (let y = 28; y < h - 10; y += 8) c.fillRect(8, y, (w - 16) * (.55 + r() * .45), 2);
  });
  const graffitiTex = (text, color) => canvasTexture(T, 512, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = color; c.font = `900 64px "Marker Felt","Comic Sans MS",${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.save(); c.translate(w / 2, h / 2); c.rotate(-.04); c.fillText(text, 0, 0, w - 30); c.restore();
    c.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${rng() * .6})`; c.fillRect(rng() * w, rng() * h, 2, 2); }
  });
  const drawingTex = canvasTexture(T, 256, 192, (c, w, h) => {
    c.fillStyle = '#efe8d6'; c.fillRect(0, 0, w, h); c.lineWidth = 4;
    c.strokeStyle = '#d14c86'; c.strokeRect(24, 70, 40, 90); c.strokeStyle = '#2f7fd0'; c.strokeRect(80, 40, 36, 120); c.strokeStyle = '#d14c86'; c.strokeRect(130, 90, 46, 70);
    c.fillStyle = '#3f7d3c'; for (const x of [44, 98, 152]) { c.beginPath(); c.arc(x, 64, 10, 0, TAU); c.fill(); }
    c.fillStyle = '#c23a2e'; c.fillRect(186, 130, 56, 28); c.fillStyle = '#1b2a3a'; c.font = `900 18px ${FONT}`; c.fillText('07', 200, 150); c.font = `700 14px ${FONT}`; c.fillText('VESPER AVANT', 20, 24);
  });
  const glowDisc = canvasTexture(T, 64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

  // ---------- Fixtures and the light pool ----------
  const fixtures = [], power = { enclave: false, tower: true };
  const fixture = (kind, x, y, z, { zone = 'tower', color = 0xeaf4ff, intensity = 12, range = 14, axis = 'x', flicker = 0 } = {}) => {
    const f = { kind, x, y, z, zone, color: new T.Color(color), intensity, range, axis, flicker, room: roomAt(x, z), level: 0, phase: rng() * 100 }; fixtures.push(f); return f;
  };
  function placeFixtures() {
    // Enclave: strings of bare bulbs over the stalls, amber lanterns in the tents, cold tubes in the annexes, the radio on batteries.
    for (const x of [-24, -14, -4, 6]) for (const z of [84, 92]) fixture('bulb', x, 4.2, z, { zone: 'enclave', color: 0xffb070, intensity: 16, range: 13, flicker: x === -4 && z === 92 ? .5 : .06 });
    for (const x of [-26, -18, -10]) fixture('lantern', x, 1.9, 95.4, { zone: 'enclave', color: 0xff9a50, intensity: 3, range: 5, flicker: .1 });
    fixture('tube', 20, 3.3, 84, { zone: 'enclave', color: 0xe4fff4, intensity: 18, range: 12 }); fixture('tube', 16, 3.3, 87, { zone: 'enclave', color: 0xe4fff4, intensity: 12, range: 10, flicker: .35 });
    for (const x of [16, 22, 28, 34]) fixture('tube', x, 2.9, 92, { zone: 'enclave', color: 0xdfe9ff, intensity: 14, range: 11, flicker: x === 24 ? .4 : .05 });
    fixture('tube', 34, 3.1, 85, { zone: 'radio', color: 0x9fe3c8, intensity: 12, range: 10 }); fixture('tube', 43, 2.9, 92, { zone: 'lift', color: 0xe8f2ff, intensity: 12, range: 9 });
    // Transit tower: HELIX white light, red security strips in the vault, high bays over the dock.
    for (const x of [-8, 0, 8]) for (const z of [-86, -91]) fixture('panel', x, 7.9, z, { color: 0xf0f6ff, intensity: 16, range: 14 });
    for (const x of [-34, -26, -18]) fixture('strip', x, 4.9, -89, { color: 0xff3a4c, intensity: 7, range: 10, axis: 'z' });
    for (const x of [20, 30, 40]) for (const z of [-86, -93]) fixture('highbay', x, 9.6, z, { color: 0xfff3dc, intensity: 34, range: 18 });
    stats.fixtures = fixtures.length;
  }
  // Before the batteries the enclave runs on its last solar cells: dimmer, flickering more.
  const fixtureLevel = f => f.zone === 'enclave' ? (power.enclave ? 1 : .6) : f.zone === 'radio' ? (power.enclave ? 1 : .25) : f.zone === 'lift' ? 1 : power.tower ? 1 : .2;
  const flickerOf = (f, t) => { if (!f.flicker) return 1; const n = Math.sin(t * 13.1 + f.phase) + Math.sin(t * 29.7 + f.phase * 1.7) * .6 + Math.sin(t * 2.1 + f.phase * .3) * 1.4; return n > 2.2 - f.flicker * 1.4 ? .08 : 1; };
  const fixtureMeshes = [];
  function buildFixtureMeshes() {
    const shapes = { bulb: [.12, .16, .12], lantern: [.18, .26, .18], tube: [1.2, .05, .14], panel: [1.8, .04, .6], strip: [.08, .04, 7.6], highbay: [.7, .2, .7] };
    const byKind = new Map(); for (const f of fixtures) { if (!byKind.has(f.kind)) byKind.set(f.kind, []); byKind.get(f.kind).push(f); }
    const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3();
    for (const [kind, list] of byKind) {
      const mesh = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), list.length); mesh.name = 'M02x / luminaires ' + kind;
      list.forEach((f, i) => { const [sx, sy, sz] = shapes[kind]; mesh.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q, f.axis === 'z' && kind !== 'strip' ? s.set(sz, sy, sx) : s.set(sx, sy, sz))); mesh.setColorAt(i, new T.Color(0x111111));
        if (kind === 'tube') {
          const alongZ = f.axis === 'z';
          for (const side of [-1, 1]) piece(M.steel, f.x + (alongZ ? 0 : side * .58), f.y - .045, f.z + (alongZ ? side * .58 : 0), alongZ ? .19 : .08, .1, alongZ ? .08 : .19);
        }
        if (kind === 'highbay') piece(M.dark, f.x, f.y + .18, f.z, .05, ROOM.quai.ceiling - f.y, .05); });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += list.length; fixtureMeshes.push({ mesh, list });
    }
    // Low cables sagging between the bulbs of the market.
    for (const z of [84, 92]) for (let x = -24; x < 6; x += 10) { const c = new T.Mesh(new T.CylinderGeometry(.015, .015, 10, 4), M.black); c.rotation.z = Math.PI / 2; c.position.set(x + 5, 4.3, z); add(c); }
  }
  const POOL = low ? 2 : 3;
  const pool = Array.from({ length: POOL }, () => { const l = new T.PointLight(0xffffff, 0, 14, 1.6); l.castShadow = false; add(l, scene); return { light: l, fixture: null, level: 0 }; });
  const tmp = new T.Color();
  function updateLights(t, dt, eye) {
    for (const f of fixtures) f.level = fixtureLevel(f) * flickerOf(f, t);
    for (const { mesh, list } of fixtureMeshes) { list.forEach((f, i) => { tmp.copy(f.color).multiplyScalar(Math.max(.05, f.level)); mesh.setColorAt(i, tmp); }); mesh.instanceColor.needsUpdate = true; }
    const here = roomAt(eye.x, eye.z);
    // The street keeps its own lamps: outdoors the pool only serves rooms seen through a nearby doorway.
    const inside = here && roofed(ROOM[here]);
    const scored = here ? fixtures.filter(f => inside || Math.hypot(f.x - eye.x, f.z - eye.z) < 12).filter(f => f.level > .02 && (f.room === here || Math.hypot(f.x - eye.x, f.z - eye.z) < 12))
      .map(f => ({ f, d: Math.hypot(f.x - eye.x, f.y - eye.y, f.z - eye.z) * (f.room === here ? 1 : 1.8) / Math.sqrt(f.intensity / 12) })).sort((a, b) => a.d - b.d).slice(0, POOL).map(s => s.f) : [];
    const wanted = new Set(scored);
    for (const slot of pool) { if (slot.fixture && !wanted.has(slot.fixture)) slot.level = Math.max(0, slot.level - dt * 10); else if (slot.fixture) slot.level = Math.min(1, slot.level + dt * 8); if (slot.level <= 0) slot.fixture = null; }
    for (const f of scored) if (!pool.some(s => s.fixture === f)) { const free = pool.find(s => !s.fixture); if (free) { free.fixture = f; free.level = 0; } }
    for (const slot of pool) { const f = slot.fixture, l = slot.light; if (!f) { l.intensity = 0; continue; } l.position.set(f.x, f.y - .3, f.z); l.color.copy(f.color); l.distance = f.range; l.intensity = f.intensity * f.level * slot.level; }
  }

  // ---------- Rooms: floors, ceilings, roofs ----------
  const FLOOR = { street: M.asphalt, market: M.floorTile, clinic: M.tile, corridor: M.dirtyTile, radio: M.slab, lift: M.grid, lobby: M.antiSkid, vault: M.slab, dock: M.slab };
  function buildRooms() {
    for (const r of ROOMS) {
      // Street rooms lie over the street's own ground and asphalt (y ≤ .007).
      floorRect(FLOOR[r.look] || M.slab, r.x1, r.x2, r.z1, r.z2, r.look === 'street' ? .02 : .004);
      if (!roofed(r)) continue;
      if (r.look === 'market') {
        // Covered market: a steel roof on trusses, a long skylight the HELIX scouts come through.
        ceilRect(M.corrugated, r.x1, -11, r.z1, r.z2, r.ceiling); ceilRect(M.corrugated, -5, r.x2, r.z1, r.z2, r.ceiling);
        ceilRect(M.corrugated, -11, -5, r.z1, 86, r.ceiling); ceilRect(M.corrugated, -11, -5, 94, r.z2, r.ceiling);
        piece(M.glass, -8, r.ceiling, 90, 6, .02, 8); for (let z = 86; z <= 94; z += 2) piece(M.frame || M.steel, -8, r.ceiling - .05, z, 6.2, .08, .1);
        for (let x = -28; x <= 10; x += 6) { piece(M.steel, x, r.ceiling - .6, 89, .18, .18, 18); piece(M.steel, x, r.ceiling - 1.2, 89, .1, .5, .1); }
      } else ceilRect(r.look === 'dock' ? M.corrugated : r.look === 'lobby' || r.look === 'vault' ? M.helixWhite : M.plaster, r.x1, r.x2, r.z1, r.z2, r.ceiling);
      floorRect(M.concrete, r.x1 - .15, r.x2 + .15, r.z1 - .15, r.z2 + .15, r.ceiling + .3);
      for (const [x1, x2, z1, z2] of [[r.x1 - .15, r.x2 + .15, r.z1 - .15, r.z1 - .14], [r.x1 - .15, r.x2 + .15, r.z2 + .14, r.z2 + .15], [r.x1 - .15, r.x1 - .14, r.z1 - .15, r.z2 + .15], [r.x2 + .14, r.x2 + .15, r.z1 - .15, r.z2 + .15]])
        box(M.concrete, x1, x2, r.ceiling, r.ceiling + .3, z1, z2, { skip: ['bottom', 'top'] });
    }
    // Runoff on the threshold and the forecourt: dark wet patches and a gutter.
    for (const [x, z, w, d] of [[-4, 76, 5, 2.2], [6, 78.4, 3, 1.4], [-6, -78, 4, 2.4], [5, -80, 3.4, 1.2]]) piece(M.water, x, .021, z, w, .004, d, rng());
    piece(M.grid, -1, .022, 79.4, 20, .006, .4); piece(M.grid, -1, .022, -76, 20, .006, .4);
    // Upper floors of the transit tower above the lobby, so the street sees a tower.
    box(M.helixBlack, -14, 14, 8.3, 30, -94, -82.2, { skip: ['bottom'] });
    for (let y = 10; y < 30; y += 3) piece(M.helix, 0, y, -82.15, 27.6, .06, .04);
  }

  // ---------- Walls from the colliders, lintels over doorways ----------
  const WALL = { facade: M.facade, helix: M.helixBlack, panel: M.helixWhite };
  const SURFACE = { tile: null, concrete: M.concrete, plaster: M.plaster, metal: M.plate };
  function wallBox(o, y1 = 0, y2 = o.height) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
    const m = WALL[o.look] || SURFACE[o.surface];
    if (m) { box(m, x1, x2, y1, y2, z1, z2); if (o.look === 'helix' && y1 === 0) box(M.helixRed, x1 - .01, x2 + .01, 0, .35, z1 - .01, z2 + .01, { skip: ['bottom', 'top'] }); return; }
    const band = 1.25;
    if (y1 < band) box(M.dirtyTile, x1, x2, y1, Math.min(band, y2), z1, z2, { skip: ['bottom', 'top'] });
    if (y2 > band) box(M.tile, x1, x2, Math.max(band, y1), y2, z1, z2);
  }
  function buildWalls(obstacles) {
    const lines = new Map();
    for (const o of obstacles) {
      if (o.kind !== 'wall' || !o.extension) continue; wallBox(o);
      const axis = o.hx > o.hz ? 'x' : 'z', fixed = axis === 'x' ? o.z : o.x, key = axis + ':' + fixed.toFixed(2);
      if (!lines.has(key)) lines.set(key, []); lines.get(key).push({ o, a: axis === 'x' ? o.x - o.hx : o.z - o.hz, b: axis === 'x' ? o.x + o.hx : o.z + o.hz });
    }
    for (const [key, spans] of lines) {
      const [axis, fixedText] = key.split(':'), fixed = +fixedText; spans.sort((p, q) => p.a - q.a);
      for (let k = 0; k + 1 < spans.length; k++) {
        const left = spans[k], right = spans[k + 1]; if (right.a - left.b < .2) continue;
        const centre = (left.b + right.a) / 2, height = Math.max(left.o.height, right.o.height);
        const d = DOORS.find(d => d.axis === axis && Math.abs(d.fixed - fixed) < .3 && Math.abs(d.centre - centre) < .5);
        const probe = s => axis === 'x' ? ROOM[roomAt(centre, fixed + s)] : ROOM[roomAt(fixed + s, centre)];
        const ceil = r => !r || !roofed(r) ? Infinity : r.ceiling;
        const opening = d ? d.height : Math.min(ceil(probe(.6)), ceil(probe(-.6)));
        if (opening < height - .05) wallBox({ ...left.o, ...(axis === 'x' ? { x: centre, hx: (right.a - left.b) / 2 } : { z: centre, hz: (right.a - left.b) / 2 }) }, opening, height);
        if (d) {
          const frame = d.style === 'helix' || d.style === 'vault' ? M.helixRed : M.dark;
          for (const at of [left.b, right.a]) axis === 'x' ? piece(frame, at, 0, fixed, .12, d.height, .36) : piece(frame, fixed, 0, at, .36, d.height, .12);
          axis === 'x' ? piece(frame, centre, d.height - .02, fixed, right.a - left.b + .24, .12, .36) : piece(frame, fixed, d.height - .02, centre, .36, .12, right.a - left.b + .24);
        }
      }
    }
    // Market facade: rusty shutters of the closed shops on both sides of the gate.
    for (const x of [-24, -16, 8]) piece(M.shutter, x, 0, 79.82, 5, 3.4, .06);
  }

  // ---------- Props ----------
  function vehicle(o) {
    // HELIX convoy truck: white box body with red bands, black cab towards the convoy door (+x).
    const g = new T.Group(); g.position.set(o.x, 0, o.z); root.add(g);
    const L = o.hx * 2, W = o.hz * 2, part = (m, x, y, z, sx, sy, sz) => { const b = new T.Mesh(cube, m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); b.castShadow = !low; b.receiveShadow = true; g.add(b); stats.meshes++; return b; };
    part(M.helixBlack, L / 2 - 1.1, 1.35, 0, 2.1, 1.7, W); part(M.glass, L / 2 - .06, 1.8, 0, .04, .8, W - .3);
    part(M.helixWhite, -.9, 1.7, 0, L - 2.2, 2.6, W); part(M.dark, 0, .45, 0, L - .2, .5, W - .3);
    for (const sz of [-1, 1]) { part(M.helixRed, -.9, 1.1, sz * (W / 2 + .005), L - 2.2, .2, .01); part(M.helix, -.9, 2.9, sz * (W / 2 + .006), L - 2.2, .04, .01); }
    for (const sx of [L / 2 - 1.2, -L / 2 + 1]) for (const sz of [-1, 1]) { const w = new T.Mesh(new T.CylinderGeometry(.48, .48, .32, 18), M.black); w.rotation.x = Math.PI / 2; w.position.set(sx, .48, sz * (W / 2 - .1)); g.add(w); stats.meshes++; }
    const label = new T.Mesh(new T.PlaneGeometry(3.4, .7), new T.MeshStandardMaterial({ map: signTex(['HELIX SECURITY', 'CONVOI 03 · ANNEAU LOGISTIQUE'], { bg: null, fg: '#c1121f', w: 512, h: 128 }), transparent: true, alphaTest: .05 }));
    label.position.set(-.9, 2.1, W / 2 + .012); g.add(label);
    const back = label.clone(); back.position.z = -W / 2 - .012; back.rotation.y = Math.PI; g.add(back);
  }
  const helixLogo = (bg = null) => signTex(['HELIX', 'SECURITY'], { bg, fg: '#ff2f45', w: 512, h: 256 });
  function dress(o) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, h = o.height;
    switch (o.kind) {
      case 'stall': {
        // A market stall turned into a barricade bed: crates, a mattress, a tarp on poles.
        box(M.wood, x1, x2, 0, h, z1, z2); piece(M.sheet, o.x, h, o.z, w - .3, .14, d - .2); piece(M.blanket, o.x + .4, h + .14, o.z, w * .45, .05, d - .3);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) piece(M.steel, o.x + sx * (o.hx - .05), 0, o.z + sz * (o.hz - .05), .05, 2.6, .05);
        const tarp = new T.Mesh(new T.PlaneGeometry(w + .4, d + .6), rng() < .5 ? M.tarp : M.tarpAmber); tarp.rotation.x = -Math.PI / 2 + .12; tarp.position.set(o.x, 2.6, o.z); add(tarp);
        break;
      }
      case 'tent': {
        const g = new T.Mesh(new T.CylinderGeometry(.02, Math.max(o.hx, o.hz) * 1.05, h, 4, 1, true), rng() < .5 ? M.tarp : M.tarpAmber); g.rotation.y = Math.PI / 4; g.scale.set(1, 1, o.hz / o.hx); g.position.set(o.x, h / 2, o.z); add(g);
        piece(M.blanket, o.x, 0, o.z - .4, w * .6, .1, .8); break;
      }
      case 'kitchen': box(M.steel, x1, x2, 0, h, z1, z2); for (const k of [-1, 0, 1]) { cylinder(M.dark, o.x + k * 1.6, h + .22, o.z, .32, .44, { segments: 14 }); } piece(M.amber, o.x - 1.6, h - .02, z1 - .01, .5, .06, .01); break;
      case 'tank': {
        // The purifier the sibling repaired: tank, filter column, a new copper pipe from the Ligne 9 pumps.
        cylinder(M.paintedMetal, o.x, h / 2, o.z, o.hx, h, { segments: 20 }); cylinder(M.steel, o.x - o.hx - .3, 1.1, o.z + .4, .18, 2.2);
        cylinder(flat(0xb86b3c, .35, .9), o.x - o.hx - .1, 1.6, o.z - .5, .05, 2, { axis: 'x' });
        sign(signTex(['EAU POTABLE', 'FILTRE RÉPARÉ · 07'], { bg: '#0f5a6a', fg: '#e8fbff', w: 256, h: 128 }), o.x - o.hx - .02, 1.5, o.z, -Math.PI / 2, .8, .4); break;
      }
      case 'barricade': box(M.plate, x1, x2, 0, h, z1, z2); for (let k = 0; k < 4; k++) piece(M.helixRed, x1 + .3 + k * (w - .6) / 3, h * .4, z2 + .01, .5, .12, .01); break;
      case 'school': box(M.wood, x1, x2, 0, h, z1, z2); for (let k = 0; k < 3; k++) piece(k % 2 ? M.rose : M.cyan, o.x, h, z1 + .3 + k * .9, .2, .04, .05); break;
      case 'bed': box(M.steel, x1, x2, .3, h - .2, z1, z2); piece(M.sheet, o.x, h - .2, o.z, w - .1, .2, d - .1); for (const sx of [-1, 1]) piece(M.steel, o.x + sx * (o.hx - .05), 0, o.z, .05, .3, d); piece(M.steel, x1 + .1, 0, z1 - .2, .04, 1.8, .04); break;
      case 'cabinet': {
        piece(M.white,x2-.035,0,o.z,.07,h,d);
        for(const side of [-1,1])piece(M.white,o.x,0,o.z+side*(o.hz-.035),w,h,.07);
        piece(M.white,o.x,0,o.z,w,.1,d);piece(M.white,o.x,h-.08,o.z,w,.08,d);
        for(let y=.5;y<h-.2;y+=.4)piece(M.steel,o.x,y-.035,o.z,w-.04,.035,d-.08);
        piece(M.glass,x1-.01,.15,o.z,.02,h-.24,d-.12);break;
      }
      case 'desk': box(M.wood, x1, x2, h - .06, h, z1, z2); for (const sx of [-1, 1]) piece(M.woodDark, o.x + sx * (o.hx - .1), 0, o.z, .08, h - .06, d - .1); break;
      case 'radio-rack': box(M.dark, x1, x2, 0, h, z1, z2); for (let k = 0; k < 8; k++) piece(k % 3 ? M.amber : M.green, x1 - .01, .5 + k * .2, o.z + (k % 2 ? .4 : -.4), .01, .04, .12); break;
      case 'console': {
        box(M.plate, x1, x2, 0, h - .05, z1, z2); piece(M.dark, o.x, h - .05, o.z, w, .05, d);
        for (const k of [-1, 1]) details.computer({x: o.x + k * .9, y: h, z: o.z, scale: .82, kind: 'radio', power: 'enclave'});
        break;
      }
      case 'batteries': box(M.dark, x1, x2, 0, h, z1, z2); for (let k = 0; k < 4; k++) piece(M.helixRed, x1 + .2 + k * (w - .4) / 3, h, o.z, .14, .08, .14); break;
      case 'scanner': {
        // HELIX scanner gate: two white posts, a red arch, a sweeping light curtain between them.
        box(M.helixWhite, x1, x2, 0, h, z1, z2); piece(M.helixRed, o.x, h - .2, o.z, w + .04, .2, d + .04);
        const curtain = new T.Mesh(new T.PlaneGeometry(2.6, h - .3), new T.MeshBasicMaterial({ color: 0xff2f45, transparent: true, opacity: .14, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
        curtain.position.set(o.x + (o.x < 0 ? 1.7 : -1.7), (h - .3) / 2, o.z); curtain.rotation.y = 0; add(curtain);
        animated.push(t => { curtain.material.opacity = power.tower ? .1 + .06 * Math.sin(t * 6 + o.x) : 0; });
        break;
      }
      case 'security-desk': box(M.helixWhite, x1, x2, 0, h, z1, z2); piece(M.helixBlack, o.x, h, o.z, w + .1, .05, d + .1); piece(M.helix, o.x, h * .5, z2 + .01, w - .4, .06, .01);
        sign(helixLogo('#0b0d10'), o.x, h * .5 + .25, z2 + .02, 0, 1.2, .6); details.computer({x: o.x, y: h + .05, z: o.z, scale: .9, kind: 'helix', power: 'tower'}); break;
      case 'planter': box(M.helixWhite, x1, x2, 0, h, z1, z2); details.planting(o); break;
      case 'servers': {
        box(M.helixBlack, x1, x2, 0, h, z1, z2);
        for (const face of [x1 - .01, x2 + .01]) for (let k = 0; k < 14; k++) piece(k % 5 ? M.cyan : M.helix, face, .3 + (k % 7) * .32, o.z - o.hz + .5 + Math.floor(k / 7) * (d - 1), .01, .03, .5);
        break;
      }
      case 'terminal': box(M.helixWhite, x1, x2, 0, h, z1, z2); { const s = new T.Mesh(new T.PlaneGeometry(.9, .55), new T.MeshBasicMaterial({ map: signTex(['MANIFESTE · CONVOI 02', 'ACCÈS BADGE NIVEAU 3'], { bg: '#160307', fg: '#ff4d5e', w: 512, h: 300 }), toneMapped: false })); s.position.set(x1 - .02, h + .35, o.z); s.rotation.y = -Math.PI / 2; add(s); piece(M.helixBlack, x1 + .1, h, o.z, .1, .7, 1); } break;
      case 'truck': vehicle(o); break;
      case 'container': {
        box(M.rust, x1, x2, 0, h, z1, z2); for (let k = 0; k < 12; k++) piece(M.dark, x1 - .01, .1, z1 + .2 + k * (d - .4) / 11, .02, h - .2, .04);
        sign(signTex(['C-3', 'CONVOI 03'], { bg: '#e9ecee', fg: '#c1121f', w: 256, h: 128 }), x1 - .02, 2, o.z, -Math.PI / 2, 1.2, .6);
        // Hands knocking from inside: a faint warm light through the air vents.
        for (const z of [o.z - 1, o.z + 1]) piece(M.amber, x1 - .02, h - .4, z, .01, .1, .4); break;
      }
      case 'crates': for (let k = 0; k < 4; k++) {
          const cx = o.x + (k % 2 - .5) * o.hx, base = Math.floor(k / 2) * h / 2, cw = o.hx * .95, ch = h / 2 - .02;
          piece(k % 2 ? M.helixWhite : M.plate, cx, base, o.z, cw, ch, d - .1);
          for (const side of [-1, 1]) piece(M.dark, cx + side * cw * .4, base + .03, z2 - .035, cw * .09, ch - .06, .025);
          piece(M.dark, cx, base + ch * .75, z2 - .03, cw * .64, .025, .025);
          piece(M.plate, cx, base + ch * .18, z2 - .025, cw * .25, .025, .025);
        }
        sign(signTex(['ARCHIVES AEGIS 2189', 'FRAGILE · HELIX'], { bg: '#e9ecee', fg: '#0b0d10', w: 256, h: 128 }), o.x, h * .5, z2 + .02, 0, .8, .4); break;
      case 'control-post':
        box(M.helixBlack, x1, x2, 0, h, z1, z2);
        piece(M.steel, o.x, h - .08, o.z, w + .03, .08, d + .03);
        piece(M.screenOff, o.x, h + .002, o.z, w * .78, .025, d * .72);
        piece(M.helix, o.x, h + .028, o.z - d * .12, w * .55, .01, d * .18);
        for (const sx of [-1, 1]) piece(M.helixWhite, o.x + sx * w * .35, .16, z2 + .01, .035, h * .55, .02);
        break;
      default: break;
    }
  }

  // ---------- Doors ----------
  const doors = new Map();
  const SPEED = { fire: 1.3, glass: 1.8, gate: .3, helix: 1.2, vault: .5, lift: .8 };
  function buildDoors() {
    for (const d of DOORS) {
      const model = details.door(d, {
        paint: d.style === 'wood' ? M.woodDark : d.style === 'helix' ? M.helixWhite : M.plate,
        accent: M.helixRed || M.red, glass: M.glass
      });
      doors.set(d.id, {d, model, state: d.open ? 'auto' : 'closed', open: 0});
    }
  }
  function updateDoors(dt, player) {
    for (const door of doors.values()) {
      const { d } = door; let target = door.state === 'open' ? 1 : 0;
      if (door.state === 'auto') { const dx = d.axis === 'x' ? player.x - d.centre : player.x - d.fixed, dz = d.axis === 'x' ? player.z - d.fixed : player.z - d.centre; target = Math.hypot(dx, dz) < 3.8 ? 1 : 0; }
      door.open += Math.sign(target - door.open) * Math.min(Math.abs(target - door.open), dt * (SPEED[d.style] || 1));
      door.model.update(door.open, door.state === 'closed');
    }
  }

  // ---------- Interaction devices and documents ----------
  const devices = new Map();
  const FACES = ['wall', 'desk', 'console', 'radio-rack', 'batteries', 'security-desk', 'terminal', 'control-post', 'kitchen', 'school', 'crates', 'barricade'];
  function nearestFace(obstacles, x, z) {
    let best = null;
    for (const o of obstacles) {
      if (!o.extension || !FACES.includes(o.kind)) continue;
      const dist = Math.hypot(Math.max(Math.abs(x - o.x) - o.hx, 0), Math.max(Math.abs(z - o.z) - o.hz, 0));
      if (dist < 3 && (!best || dist < best.dist)) best = { o, dist };
    }
    if (!best) return null;
    const { o } = best, ex = x - o.x, ez = z - o.z;
    if (Math.abs(ex) - o.hx > Math.abs(ez) - o.hz) { const sx = Math.sign(ex); return { o, x: o.x + sx * (o.hx + .01), z: Math.max(o.z - o.hz + .3, Math.min(o.z + o.hz - .3, z)), yaw: sx > 0 ? Math.PI / 2 : -Math.PI / 2, top: o.height }; }
    const sz = Math.sign(ez); return { o, x: Math.max(o.x - o.hx + .3, Math.min(o.x + o.hx - .3, x)), z: o.z + sz * (o.hz + .01), yaw: sz > 0 ? 0 : Math.PI, top: o.height };
  }
  function buildDevices(obstacles) {
    let seed = 23;
    for (const it of INTERACTIONS) {
      const at = nearestFace(obstacles, it.x, it.z) || { x: it.x, z: it.z, yaw: 0, top: 1 }, g = new T.Group(); g.position.set(at.x, 0, at.z); g.rotation.y = at.yaw; root.add(g);
      const part = (m, sx, sy, sz, px, py, pz) => { const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m); mesh.position.set(px, py, pz); g.add(mesh); stats.meshes++; return mesh; };
      const lamp = new T.Mesh(new T.BoxGeometry(.07, .07, .04), new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false })); g.add(lamp);
      const table = at.o && ['desk', 'console', 'security-desk', 'terminal', 'kitchen', 'school', 'crates', 'batteries'].includes(at.o.kind);
      let moving = null;
      if (it.id === 'manivelle') { part(M.plate, .4, .5, .2, 0, 1.2, .1); const wheel = new T.Mesh(new T.TorusGeometry(.26, .03, 6, 20), M.helixRed); wheel.position.set(0, 1.2, .3); g.add(wheel); moving = wheel; part(M.steel, .04, .04, .3, .2, 1.2, .35); lamp.position.set(.25, 1.6, .22); }
      else if (it.id === 'doc-dessins') { const b = new T.Mesh(new T.PlaneGeometry(.9, .68), new T.MeshStandardMaterial({ map: drawingTex, roughness: .9 })); b.position.set(0, 1.2, .02); g.add(b); lamp.position.set(.5, .9, .03); }
      else if (it.id === 'badge') { part(M.helixWhite, .1, .02, .15, 0, at.top + .01, -.2); part(M.helix, .1, .021, .03, 0, at.top + .012, -.25); lamp.position.set(.2, at.top + .03, -.2); lamp.scale.setScalar(.5); }
      else if (it.id === 'lecteur' || it.id === 'commande-quai') { part(M.helixBlack, .3, .45, .1, 0, 1.4, .05); const screen = part(M.helix, .2, .14, .01, 0, 1.48, .105); moving = screen; lamp.position.set(0, 1.25, .11); }
      else if (it.id === 'radio') { part(M.dark, .7, .4, .4, 0, at.top + .2, -.2); part(M.amber, .3, .07, .01, -.1, at.top + .28, .005); const ant = new T.Mesh(new T.CylinderGeometry(.01, .01, 1, 4), M.steel); ant.position.set(.25, at.top + .9, -.25); g.add(ant); lamp.position.set(.25, at.top + .35, .01); }
      else if (it.id === 'batterie') { const cable = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.2, 6), M.helixRed); cable.rotation.z = Math.PI / 2; cable.position.set(0, at.top + .1, -.3); g.add(cable); moving = cable; lamp.position.set(.3, at.top + .1, -.3); }
      else if (it.log) {
        const paper = new T.Mesh(new T.PlaneGeometry(.34, .46), new T.MeshStandardMaterial({ map: paperTex(it.label.replace(/^(LIRE|REGARDER|CONSULTER) (LE |LA |L’|LES )?/, ''), seed++), roughness: .9, side: T.DoubleSide }));
        if (table) { paper.rotation.x = -Math.PI / 2; paper.rotation.z = rng() - .5; paper.position.set(0, at.top + .006, -.25); lamp.position.set(.22, at.top + .03, -.25); lamp.scale.setScalar(.5); }
        else { paper.position.set(0, 1.45, .012); lamp.position.set(.22, 1.62, .02); lamp.scale.setScalar(.5); }
        g.add(paper);
      }
      devices.set(it.id, { it, lamp, moving, done: false, available: false, turn: 0 });
    }
  }
  function updateDevices(t, dt, crank) {
    const blink = .5 + .5 * Math.sin(t * 5);
    for (const v of devices.values()) {
      v.lamp.material.color.set(v.done ? 0x3dff8a : v.it.log ? (blink > .3 ? 0xfff2c8 : 0x6a6250) : v.available ? (blink > .5 ? 0xffb35c : 0x5a3a14) : 0x2a1a10);
      if (v.it.id === 'manivelle' && crank) v.moving.rotation.z -= dt * 4;
      else if (v.done && v.moving && v.turn < 1) { v.turn = Math.min(1, v.turn + dt * .8); if (v.it.id === 'manivelle') v.moving.rotation.z = -v.turn * TAU; else if (v.it.id === 'batterie') v.moving.position.y -= dt * .05; else v.moving.material = M.green; }
    }
  }

  // ---------- Signs, posters, belongings ----------
  function buildSigns() {
    sign(signTex(['MARCHÉ COUVERT DES ÉPARS', 'ENCLAVE · EAU · SOINS · ÉCOLE'], { bg: '#06161b', fg: '#5fe0f0', w: 1024, h: 192, border: '#5fe0f0' }), 0, 5.6, 79.8, Math.PI, 8, 1.5, { lit: true });
    sign(graffitiTex('ICI ON PARTAGE L’EAU', '#ffb35c'), -10, 2, 79.82, Math.PI, 3.6, 1.1, { see: true });
    sign(graffitiTex('07 · ON REVIENT', '#8fd0ff'), 8, 2.4, 80.18, 0, 3.4, 1.05, { see: true });
    sign(signTex(['DISPENSAIRE', 'SOINS GRATUITS · ENCLAVE'], { bg: '#e8fbf4', fg: '#127a5a', w: 512, h: 160 }), 11.8, 2.9, 86, -Math.PI / 2, 1.6, .5);
    sign(signTex('LOCAL RADIO', { bg: '#0d3b5e', w: 512, h: 128 }), 34, 2.7, 90.18, 0, 1.2, .3);
    sign(signTex(['MONTE-CHARGE', 'ARCHIVES VÉGÉTALES ↑'], { bg: '#0f7a3e', fg: '#f4fff6', w: 512, h: 160 }), 39.82, 2.9, 92, -Math.PI / 2, 1.6, .5);
    sign(signTex(['ÉCOLE DU MARCHÉ', 'MATIN : LECTURE · SOIR : CALCUL'], { bg: '#2b2350', fg: '#ffd7f0', w: 512, h: 160 }), -29.82, 2.6, 82.6, Math.PI / 2, 1.8, .55);
    sign(signTex(['TOUR DE TRANSIT', 'HELIX SECURITY · ZONE CONTRÔLÉE'], { bg: '#0b0d10', fg: '#ff2f45', w: 1024, h: 192, border: '#ff2f45' }), 0, 6.4, -81.8, 0, 8, 1.5, { lit: true });
    sign(signTex(['CONTRÔLE D’IDENTITÉ', 'SCAN OBLIGATOIRE AVANT L’EAU'], { bg: '#e9ecee', fg: '#0b0d10', w: 512, h: 160 }), 0, 3.6, -93.82, 0, 2.4, .75);
    sign(signTex(['COFFRE DE DONNÉES', 'ACCÈS NIVEAU 3 · JANUS'], { bg: '#160307', fg: '#ff4d5e', w: 512, h: 160 }), -13.82, 3.6, -88, Math.PI / 2, 1.8, .55, { lit: true });
    sign(signTex(['QUAI DE CHARGEMENT', 'CONVOIS → ANNEAU LOGISTIQUE'], { bg: '#e9ecee', fg: '#c1121f', w: 512, h: 160 }), 13.82, 3.9, -88, -Math.PI / 2, 2, .62);
    sign(signTex(['PORTE DU CONVOI', 'DÉPART 04 H 00'], { bg: '#0b0d10', fg: '#ff2f45', w: 512, h: 160 }), 45.8, 6.8, -90, -Math.PI / 2, 2.6, .8, { lit: true });
    sign(graffitiTex('ILS PROTÈGENT LES DONNÉES', '#ff9fcd'), 12.4, 2.2, -78, -Math.PI / 2, 3.2, 1, { see: true });
    sign(graffitiTex('PAS LES GENS', '#8fd0ff'), -14, 2.2, -79, Math.PI / 2, 2.4, .9, { see: true });
    // Belongings of the enclave: water jerrycans, crates of algae, children's shoes by the school corner.
    for (const [x, z, m] of [[-20, 82.2, M.cyan], [-19.4, 82.2, M.paintedMetal], [2, 96.6, M.cardboard], [3, 96.6, M.cardboard], [-28.6, 86.2, M.rose], [-28.2, 86.4, M.cyan]]) piece(m, x, 0, z, .3, .3, .3, rng() * 3);
    // The sibling's kit, left at the dispensary: an AEGIS 07 helmet on the desk.
    { const helmet = new T.Mesh(new T.SphereGeometry(.17, 14, 10, 0, TAU, 0, Math.PI / 2), M.helixRed); helmet.material = flat(0xb5241c, .4, .3); helmet.position.set(21.2, .9, 82.1); add(helmet); }
  }

  // ---------- Vesper 2196: neon, holograms, HELIX scanners (cyberpunk layer) ----------
  const additive = (color, opacity = .6, map = null) => new T.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const neon = (x1, y1, z1, x2, y2, z2, color) => add(createNeonFixture(T, new T.Vector3(x1, y1, z1), new T.Vector3(x2, y2, z2), color, M.steel));
  const steam = [];
  function buildCyber() {
    // Market: dirty-cyan neon outline of the gate, amber stall neons, a holographic « ÉPARS » koi over the kitchen.
    neon(-4, 4.4, 79.75, 4, 4.4, 79.75, 0x5fe0f0); neon(-4, 0, 79.75, -4, 4.4, 79.75, 0x5fe0f0); neon(4, 0, 79.75, 4, 4.4, 79.75, 0x5fe0f0);
    for (const [x, z] of [[-24, 83.1], [-14, 83.1], [4, 89.1]]) neon(x - 1.4, 2.7, z, x + 1.4, 2.7, z, rng() < .5 ? 0xffb35c : 0xff6fb4);
    const koiTex = canvasTexture(T, 256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#7fe7ff'; c.lineWidth = 6; c.beginPath(); c.ellipse(110, 64, 70, 26, 0, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(180, 64); c.lineTo(236, 30); c.lineTo(236, 98); c.closePath(); c.stroke(); c.fillStyle = '#ff6fb4'; c.beginPath(); c.arc(70, 58, 6, 0, TAU); c.fill(); });
    const koi = new T.Mesh(new T.PlaneGeometry(2.4, 1.2), additive(0xffffff, .55, koiTex)); koi.position.set(6, 4, 94); add(koi);
    animated.push((t, dt, eye) => { koi.position.x = 6 + Math.sin(t * .35) * 6; koi.position.y = 4 + Math.sin(t * .9) * .2; koi.lookAt(eye.position.x, koi.position.y, eye.position.z); koi.material.opacity = power.enclave ? .55 : .2; });
    // HELIX holo projector over the market skylight: the census notice in red, flickering.
    const notice = new T.Mesh(new T.PlaneGeometry(3.2, 1.6), additive(0xffffff, .5, signTex(['RECENSEMENT HELIX', 'PRÉSENTEZ-VOUS À LA TOUR DE TRANSIT', 'EAU · SOINS · ANNEAU LOGISTIQUE'], { bg: 'rgba(30,0,6,.4)', fg: '#ff4d5e', w: 512, h: 256, border: '#ff2f45' })));
    notice.position.set(-8, 6.4, 81.2); add(notice);
    animated.push(t => { notice.material.opacity = (.4 + .1 * Math.sin(t * 2)) * (Math.sin(t * 19) > .94 ? .2 : 1); });
    // Steam from the street gutters and the kitchen (W02: steam, runoff).
    const puffMat = new T.SpriteMaterial({ map: glowDisc, color: 0xa9c4cc, transparent: true, opacity: .12, depthWrite: false });
    for (const [x, y, z] of [[-1, .2, 79.4], [6, .2, 79.4], [-6, .2, -76], [4, .2, -76], [6, 1.6, 95.4]]) for (let k = 0; k < (low ? 2 : 4); k++) { const s = new T.Sprite(puffMat.clone()); s.position.set(x + (rng() - .5), y, z); s.userData = { x: s.position.x, y, z, phase: rng() * 6 }; add(s); steam.push(s); }
    // Transit tower: red light curtains over the doorway, a sweeping HELIX scanner on the forecourt, the vault's data glow.
    const scanner = new T.Group(); scanner.position.set(0, 6.2, -82.4); add(scanner);
    const beam = new T.Mesh(new T.ConeGeometry(1.8, 6.2, 24, 1, true), additive(0xff2f45, .12)); beam.position.y = -3.1; scanner.add(beam);
    const spot = new T.Mesh(new T.CircleGeometry(1.8, 28), additive(0xff2f45, .35)); spot.rotation.x = -Math.PI / 2; add(spot);
    animated.push(t => { const a = Math.sin(t * .7) * .6; scanner.rotation.set(.55, a, 0); spot.position.set(Math.sin(a) * 3.4, .02, -79.2 + Math.cos(a) * .3); const on = power.tower; beam.visible = spot.visible = on; beam.material.opacity = .08 + .05 * Math.sin(t * 9); });
    for (const x of [-12, 12]) neon(x, 0, -81.85, x, 8.6, -81.85, 0xff2f45);
    neon(-14, 8.6, -81.85, 14, 8.6, -81.85, 0xff2f45);
    // Big HELIX hologram above the lobby desk, turning: the corporate helix.
    const helixHolo = new T.Group(); helixHolo.position.set(0, 4.2, -90.6); add(helixHolo);
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU * 2, y = k * .12 - 1.4; for (const s of [1, -1]) { const b = new T.Mesh(new T.SphereGeometry(.06, 6, 4), additive(s > 0 ? 0xff2f45 : 0xf0f6ff, .7)); b.position.set(Math.cos(a) * .6 * s, y, Math.sin(a) * .6 * s); helixHolo.add(b); } }
    animated.push((t, dt) => { helixHolo.rotation.y += dt * .6; helixHolo.visible = power.tower; });
    // Data streams rising in the vault aisles.
    const streams = new T.InstancedMesh(cube, additive(0x5fe0f0, .5), low ? 24 : 60), sm = new T.Matrix4(), sp = new T.Vector3(), sq = new T.Quaternion(), ss = new T.Vector3(), flows = [];
    for (let k = 0; k < streams.count; k++) flows.push({ x: [-36, -32, -28, -24][k % 4] + (rng() - .5) * .4, z: -94 + rng() * 8, y: rng() * 4.6, v: .6 + rng() * 1.2 });
    add(streams); stats.instances += streams.count;
    animated.push((t, dt) => { flows.forEach((f, k) => { f.y = (f.y + f.v * dt) % 4.6; streams.setMatrixAt(k, sm.compose(sp.set(f.x, f.y, f.z), sq, ss.set(.03, .25, .03))); }); streams.instanceMatrix.needsUpdate = true; });
    // Billboards of Vesper seen from the street ends: HELIX's slogan over the tower, AEGIS graffiti over the market.
    sign(signTex(['HELIX SECURITY', 'VOTRE SÉCURITÉ, NOTRE MÉMOIRE'], { bg: '#0b0d10', fg: '#ff2f45', w: 1024, h: 256, border: '#ff2f45' }), 0, 20, -82.05, 0, 14, 3.5, { lit: true });
    sign(signTex(['LES ÉPARS', 'ON NE LAISSE PERSONNE'], { bg: '#06161b', fg: '#ff6fb4', w: 1024, h: 256, border: '#5fe0f0' }), -14, 12, 79.75, Math.PI, 10, 2.5, { lit: true });
  }

  const livedIn=createLivedInDressing(T,root,{chapter:2,low,materials:details.M});

  // ---------- Night: how much of the moon and sky reaches the eye indoors ----------
  let shelter = 1; const cachesById = new Map();
  function shelterAt(x, z) { const r = ROOM[roomAt(x, z)]; if (!r) return 1; return SHELTER[r.look] ?? 1; }

  return {
    root, M,
    build(obstacles) {
      placeFixtures(); buildRooms(); buildWalls(obstacles);
      for (const o of obstacles) if (o.extension) { dress(o); details.accessories(o); }
      buildFixtureMeshes(); buildDoors(); buildDevices(obstacles); buildSigns(); buildCyber();
      flushGeometry(); flushPieces(); details.finish(); livedIn.build(obstacles);
    },
    update(t, dt, eye, player = eye.position, { crank = false } = {}) {
      updateLights(t, dt, eye.position); updateDoors(dt, player); updateDevices(t, dt, crank); details.update(power); livedIn.update(t,dt,power);
      for (const s of steam) { const u = s.userData, k = (t * .25 + u.phase) % 1; s.position.set(u.x + Math.sin(t + u.phase) * .3, u.y + k * 3, u.z); s.scale.setScalar(.8 + k * 2.4); s.material.opacity = .14 * (1 - k); }
      for (const f of animated) f(t, dt, eye);
    },
    // Eased factor for the page's moon and hemisphere light (1 outdoors, lower under a roof).
    shelter(eye, dt) { shelter += (shelterAt(eye.x, eye.z) - shelter) * Math.min(1, dt * 2.5); return shelter; },
    shelterAt,
    // Supply caches: a small case with the floating medkit or cell above it (Épars crates in the enclave, HELIX cases in the tower).
    syncPickups(list, t = 0) {
      const live = new Set();
      for (const p of list) {
        live.add(p.id); let o = cachesById.get(p.id);
        if (!o) { o = new T.Group(); const tower = p.z < 0, caseMesh = new T.Mesh(new T.BoxGeometry(.6, .3, .4), tower ? M.helixWhite : M.paintedMetal); caseMesh.position.y = .15; o.add(caseMesh);
          const stripe = new T.Mesh(new T.BoxGeometry(.61, .06, .41), tower ? M.helix : p.kind === 'heal' ? M.rose : M.cyan); stripe.position.y = .22; o.add(stripe);
          const gem = new T.Mesh(new T.OctahedronGeometry(.2, 0), p.kind === 'heal' ? M.rose : glow(0xe8f6ff)); gem.position.y = .75; o.add(gem); o.userData.gem = gem; o.position.set(p.x, p.y || 0, p.z); root.add(o); cachesById.set(p.id, o); }
        o.userData.gem.position.y = .75 + Math.sin(t * 2.4 + p.x) * .08; o.userData.gem.rotation.y = t * 1.8;
      }
      for (const [id, o] of cachesById) if (!live.has(id)) { o.removeFromParent(); cachesById.delete(id); }
    },
    setDoor(id, state) { const d = doors.get(id); if (!d) return; d.state = state ? (d.d.open ? 'auto' : 'open') : 'closed'; if (!state) d.open = 0; },
    setPower(zone, on) { power[zone] = !!on; },
    markDone(id, done = true) { const d = devices.get(id); if (d) { d.done = done; if (!done) { d.turn = 0; if (d.moving) d.moving.rotation.set(0, 0, 0); } } },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { ...stats, details: details.stats(), livedIn: livedIn.stats(), power: { ...power }, shelter: +shelter.toFixed(2), lights: pool.filter(s => s.fixture).length, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])) }; }
  };
}

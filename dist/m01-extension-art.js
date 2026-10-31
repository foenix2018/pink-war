import { createNeonFixture } from './neon-fixture.js';
import {createLivedInDressing} from './vesper-lived-in.js';
// M01 extension dressing: Caserne 07 (red-brick AEGIS rescue station of 2189: apparatus bay with the VSAV 07
// ambulance and the FPT 07 pump engine, dispatch room, lockers, generator room, drill tower) and the Archives
// végétales (stone archive building, galleries, registers, greenhouse). Layout in m01-extension-layout.js.
// Daylight scene: interiors dim the sun and the sky light (eye adaptation) and are lit by a small pool of
// point lights moved to the nearest fixtures. Textures: CC0 sets already shipped (assets/cc0, assets/ligne9).
import {createVesperProps} from './vesper-props.js';
import {createRescueVehicle} from './rescue-vehicle-detail.js';
import {createHardSurfaceFurniture} from './realistic-furniture.js';
import { ROOMS, DOORS, INTERACTIONS, roomAt } from './m01-extension-layout.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const ROOM = Object.fromEntries(ROOMS.map(r => [r.id, r]));
const roofed = r => r && r.ceiling > 0;
// How much of the daylight reaches the eye inside each room (1 = outdoors).
const DAYLIGHT = { yard: 1, forecourt: 1, greenhouse: .85, hall: .45, garage: .3, corridor: .14, technical: .12, office: .24, lockers: .12, gallery: .18, server: .12, archive: .2, lift: .12 };

function canvasTexture(T, w, h, paint, { repeat = false, color = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (color) t.colorSpace = T.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}

export function createM01ExtensionArt(T, scene, { quality = 'normal', camera } = {}) {
  const low = quality === 'low', rng = seeded(707);
  const root = new T.Group(); root.name = 'M01 / Station 07 et Archives végétales'; scene.add(root);
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
    brick: pbr({ diff: './assets/cc0/m01-brick-diff_512.jpg', nor: './assets/cc0/m01-brick-normal_512.jpg', rough: './assets/cc0/m01-brick-orm_512.jpg' }, { tile: 2, color: 0xffe2d2, label: 'brique' }),
    concrete: pbr(L9('concrete_wall_006'), { tile: 3, color: 0xaaa69f, label: 'béton' }),
    stone: pbr(L9('concrete_wall_006'), { tile: 2.4, color: 0xd4c8ad, label: 'pierre des Archives' }),
    plaster: pbr(L9('concrete_wall_006'), { tile: 4, color: 0xe6e0d2, label: 'enduit' }),
    tile: pbr(L9('long_white_tiles'), { tile: 1.6, color: 0xe3e0d6, label: 'faïence' }),
    dirtyTile: pbr(L9('dirty_tiles'), { tile: 1.4, color: 0xbab2a4, label: 'carrelage sale' }),
    floorTile: pbr(L9('worn_tile_floor'), { tile: 2.4, color: 0xaea89e, roughness: .9, label: 'dallage' }),
    slab: pbr(CC('concrete_floor'), { tile: 3, color: 0x9a9890, label: 'dalle béton' }),
    asphalt: pbr(CC('asphalt_03'), { tile: 3, color: 0x8a8a86, label: 'enrobé' }),
    plate: pbr(L9('metal_plate'), { tile: 2, color: 0x9aa0a4, metalness: .55, roughness: .8, label: 'tôle' }),
    grid: pbr(L9('rusty_metal_grid'), { tile: 1.5, color: 0x9d8f80, metalness: .5, label: 'caillebotis' }),
    shutter: pbr(L9('rusted_shutter'), { tile: 3, color: 0xe8ddd0, metalness: .25, label: 'tablier' }),
    rust: pbr(L9('green_metal_rust'), { tile: 2.5, color: 0x9fb0a0, metalness: .45, label: 'acier vert' }),
    corrugated: pbr(CC('corrugated_iron'), { tile: 2, color: 0xa7aaa6, metalness: .5, label: 'bac acier' }),
    paintedMetal: pbr(CC('rusty_painted_metal'), { tile: 2, color: 0xc9c2b4, metalness: .4, label: 'métal peint' }),
    red: flat(0xa3241c, .45, .35), white: flat(0xe8e6df, .5, .2), yellow: flat(0xd8a91f, .55, .2), dark: flat(0x1c2126, .5, .6), steel: flat(0x7a838a, .32, .85),
    black: flat(0x0c0e10, .7, .3), wood: flat(0x6a4c33, .85, 0), woodDark: flat(0x3d2a1c, .85, 0), fabric: flat(0x55603e, .95, 0), blanket: flat(0xb0402e, .95, 0),
    foliage: flat(0x2f4a2c, .9, 0, { side: T.DoubleSide }), soil: flat(0x2b211a, 1, 0), frame: flat(0x2b3a33, .5, .6), cardboard: flat(0x9b8263, .95, 0), paper: flat(0xe4ddc8, .95, 0, { side: T.DoubleSide }),
    glass: flat(0x8fa9b4, .06, .5, { transparent: true, opacity: .2, depthWrite: false, side: T.DoubleSide }), screenOff: flat(0x0c1216, .2, .3),
    amber: glow(0xffb35c), cyan: glow(0x7fe7ff), green: glow(0x3dff8a), redGlow: glow(0xff3328), helix: glow(0xff3a4c)
  };
  M.foliage.name = 'feuillage';
  const furnishings=createHardSurfaceFurniture(T,root,{M,low});

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
      geo.computeBoundingSphere(); const mesh = new T.Mesh(geo, m); mesh.name = 'M01x / ' + (m.name || 'surface'); mesh.receiveShadow = true; mesh.castShadow = !low && !m.transparent; add(mesh);
    }
    geos.clear();
  }
  const cube = new T.BoxGeometry(1, 1, 1), pieces = new Map();
  const piece = (m, x, y, z, sx, sy, sz, ry = 0) => { if (!pieces.has(m)) pieces.set(m, []); pieces.get(m).push([x, y, z, sx, sy, sz, ry]); };
  function flushPieces() {
    const mat = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [m, list] of pieces) {
      const mesh = new T.InstancedMesh(cube, m, list.length); mesh.name = 'M01x / ' + (m.name || 'pièces');
      list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, mat.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; mesh.castShadow = !low && !m.transparent; add(mesh); stats.instances += list.length;
    }
    pieces.clear();
  }
  const cylinder = (m, x, y, z, r, h, { axis = 'y', segments = 16, r2 = r } = {}) => {
    const c = new T.Mesh(new T.CylinderGeometry(r2, r, h, segments), m); c.position.set(x, y, z);
    if (axis === 'x') c.rotation.z = Math.PI / 2; if (axis === 'z') c.rotation.x = Math.PI / 2; c.castShadow = !low; c.receiveShadow = true; return add(c);
  };

  // ---------- Canvas textures: signs, papers, boards ----------
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
  const boardTex = canvasTexture(T, 512, 320, (c, w, h) => {
    c.fillStyle = '#eef0ec'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b2a3a'; c.font = `900 26px ${FONT}`; c.fillText('SERVICE · NUIT DU 17/11/2189', 18, 36);
    c.strokeStyle = '#7b8791'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.strokeRect(18 + k * 122, 56, 112, 240); }
    const cols = [['AMBULANCE 07', 'SOREL', 'QUENTIN', 'AUBRY'], ['CAMION 07', 'DELCOURT', 'LENOIR', 'HADDAD', 'PETIT', 'ROSSI'], ['TECHNIQUE', 'VARENNE', 'KIM', 'LENOIR'], ['VEILLE', 'GHJU', 'LYLU']];
    cols.forEach((col, k) => col.forEach((name, i) => { if (!name) return; c.fillStyle = i ? (name === 'GHJU' ? '#d14c86' : name === 'LYLU' ? '#2f7fd0' : '#c23a2e') : '#1b2a3a'; if (i) c.fillRect(26 + k * 122, 70 + i * 32, 96, 24); c.fillStyle = i ? '#fff' : '#1b2a3a'; c.font = `${i ? 700 : 900} ${i ? 14 : 15}px ${FONT}`; c.fillText(name, 32 + k * 122, (i ? 87 : 76) + i * 32, 90); }));
  });
  const mapTex = canvasTexture(T, 512, 512, (c, w, h) => {
    c.fillStyle = '#e8e2cc'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9a9076'; c.lineWidth = 2;
    for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(rng() * w, 0); c.lineTo(rng() * w, h); c.stroke(); c.beginPath(); c.moveTo(0, rng() * h); c.lineTo(w, rng() * h); c.stroke(); }
    c.strokeStyle = '#2a9bd6'; c.lineWidth = 6; c.beginPath(); c.moveTo(40, 470); c.bezierCurveTo(160, 380, 300, 420, 470, 300); c.stroke();
    c.fillStyle = '#c23a2e'; c.font = `900 22px ${FONT}`; c.fillText('07', 120, 120); c.beginPath(); c.arc(110, 112, 22, 0, TAU); c.strokeStyle = '#c23a2e'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#1b2a3a'; c.font = `700 16px ${FONT}`; c.fillText('LIGNE 9', 300, 400); c.fillText('BAS-NIVEAUX', 330, 250); c.fillText('ORME', 440, 330);
  });
  const glowDisc = canvasTexture(T, 64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  // ---------- Fixtures and the light pool ----------
  const fixtures = [], power = { caserne: false };
  const fixture = (kind, x, y, z, { zone = 'caserne', color = 0xfff1d8, intensity = 12, range = 14, len = 1.2, axis = 'x', flicker = 0 } = {}) => {
    const f = { kind, x, y, z, zone, color: new T.Color(color), intensity, range, len, axis, flicker, room: roomAt(x, z), level: 0, phase: rng() * 100 }; fixtures.push(f); return f;
  };
  function placeFixtures() {
    for (let z = 47; z <= 71; z += 4) fixture('tube', -82, 2.95, z, { axis: 'z', flicker: z === 63 ? .5 : .05 });
    fixture('tube', -90.5, 3.35, 48, {}); fixture('tube', -90.5, 2.95, 55, {}); fixture('tube', -90.5, 2.95, 61, { flicker: .3 }); fixture('tube', -90.5, 2.95, 69, {});
    for (const [x, z] of [[-91, 79], [-85, 79], [-91, 89], [-85, 89]]) fixture('highbay', x, 6.9, z, { intensity: 40, range: 20 });
    for (const [x, z] of [[-81.6, 45], [-81.6, 73], [-79.6, 92]]) fixture('emergency', x, 2.6, z, { zone: 'battery', color: 0x3dff8a, intensity: 2.5, range: 6 });
    // Archives: skylight shafts in the hall, a daylight slit in the gallery, the greenhouse is sunlit.
    for (const z of [-71, -77]) fixture('skylight', 6, 5.95, z, { zone: 'day', color: 0xfff1df, intensity: 34, range: 16 });
    for (const x of [-26, -16, -6]) fixture('slit', x, 3.3, -78, { zone: 'day', color: 0xfff1df, intensity: 16, range: 11 });
    for (const [x, z] of [[-22, -88], [-8, -88], [-23, -72], [-9, -72]]) fixture('slit', x, z > -76 ? 3.1 : 4.9, z, { zone: 'day', color: 0xffeedd, intensity: 26, range: 14 });
    fixture('lamp', -24.6, 1.3, -73.6, { zone: 'camp', color: 0xffa060, intensity: 5, range: 6, flicker: .12 });
    fixture('tube', 45, 2.95, -80, { zone: 'lift', color: 0xe8f2ff, intensity: 8, range: 8 });
    stats.fixtures = fixtures.length;
  }
  const fixtureLevel = (f, t) => {
    if (f.zone === 'day') return 1;
    if (f.zone === 'battery') return power.caserne ? .3 : 1;
    if (f.zone === 'camp') return .9 + .1 * Math.sin(t * 9 + f.phase);
    if (f.zone === 'lift') return liftLit ? 1 : 0;
    return power.caserne ? .85 : 0;
  };
  const flickerOf = (f, t) => { if (!f.flicker) return 1; const n = Math.sin(t * 13.1 + f.phase) + Math.sin(t * 29.7 + f.phase * 1.7) * .6 + Math.sin(t * 2.1 + f.phase * .3) * 1.4; return n > 2.2 - f.flicker * 1.4 ? .08 : 1; };
  let liftLit = false;
  const fixtureMeshes = [];
  function buildFixtureMeshes() {
    const shapes = { tube: [1.2, .05, .14], highbay: [.7, .2, .7], emergency: [.3, .12, .1], skylight: [3, .04, 3], slit: [.4, .04, 2.4], lamp: [.12, .2, .12] };
    const byKind = new Map(); for (const f of fixtures) { if (!byKind.has(f.kind)) byKind.set(f.kind, []); byKind.get(f.kind).push(f); }
    const m = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3();
    for (const [kind, list] of byKind) {
      const mesh = new T.InstancedMesh(cube, new T.MeshBasicMaterial({ toneMapped: false }), list.length); mesh.name = 'M01x / luminaires ' + kind;
      list.forEach((f, i) => { const [sx, sy, sz] = shapes[kind]; mesh.setMatrixAt(i, m.compose(p.set(f.x, f.y, f.z), q, f.axis === 'z' ? s.set(sz, sy, sx) : s.set(sx, sy, sz))); mesh.setColorAt(i, new T.Color(0x111111));
        if (kind === 'tube') piece(M.dark, f.x, f.y + .025, f.z, f.axis === 'z' ? .2 : 1.3, .06, f.axis === 'z' ? 1.3 : .2);
        if (kind === 'tube') {
          const alongZ = f.axis === 'z';
          for (const side of [-1, 1]) piece(M.steel, f.x + (alongZ ? 0 : side * .58), f.y - .045, f.z + (alongZ ? side * .58 : 0), alongZ ? .19 : .08, .1, alongZ ? .08 : .19);
        }
        if (kind === 'highbay') piece(M.dark, f.x, f.y + .18, f.z, .05, ROOM.remise.ceiling - f.y, .05); });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh); stats.instances += list.length; fixtureMeshes.push({ mesh, list });
    }
  }
  const POOL = low ? 2 : 3;
  const pool = Array.from({ length: POOL }, () => { const l = new T.PointLight(0xffffff, 0, 14, 1.6); l.castShadow = false; add(l, scene); return { light: l, fixture: null, level: 0 }; });
  const tmp = new T.Color();
  function updateLights(t, dt, eye) {
    for (const f of fixtures) f.level = fixtureLevel(f, t) * flickerOf(f, t);
    for (const { mesh, list } of fixtureMeshes) { list.forEach((f, i) => { tmp.copy(f.color).multiplyScalar(Math.max(.05, f.level)); mesh.setColorAt(i, tmp); }); mesh.instanceColor.needsUpdate = true; }
    const here = roomAt(eye.x, eye.z);
    // Outdoors the sun lights the scene: the pool only serves rooms (and the doorway the eye stands in).
    const scored = here && roofed(ROOM[here]) || here === 'serre' ? fixtures.filter(f => f.level > .02 && (f.room === here || Math.hypot(f.x - eye.x, f.z - eye.z) < 10))
      .map(f => ({ f, d: Math.hypot(f.x - eye.x, f.y - eye.y, f.z - eye.z) * (f.room === here ? 1 : 1.8) / Math.sqrt(f.intensity / 12) })).sort((a, b) => a.d - b.d).slice(0, POOL).map(s => s.f) : [];
    const wanted = new Set(scored);
    for (const slot of pool) { if (slot.fixture && !wanted.has(slot.fixture)) slot.level = Math.max(0, slot.level - dt * 10); else if (slot.fixture) slot.level = Math.min(1, slot.level + dt * 8); if (slot.level <= 0) slot.fixture = null; }
    for (const f of scored) if (!pool.some(s => s.fixture === f)) { const free = pool.find(s => !s.fixture); if (free) { free.fixture = f; free.level = 0; } }
    for (const slot of pool) { const f = slot.fixture, l = slot.light; if (!f) { l.intensity = 0; continue; } l.position.set(f.x, f.y - .3, f.z); l.color.copy(f.color); l.distance = f.range; l.intensity = f.intensity * f.level * slot.level; }
  }

  // ---------- Rooms: floors, ceilings, roofs ----------
  const FLOOR = { yard: M.asphalt, corridor: M.floorTile, technical: M.slab, office: M.floorTile, lockers: M.floorTile, garage: M.slab, forecourt: M.slab, hall: M.floorTile, gallery: M.floorTile, server: M.slab, archive: M.slab, greenhouse: M.slab, lift: M.grid };
  function buildRooms() {
    for (const r of ROOMS) {
      floorRect(FLOOR[r.look] || M.slab, r.x1, r.x2, r.z1, r.z2, .004);
      if (!roofed(r) || r.look === 'greenhouse') continue;
      ceilRect(r.look === 'garage' ? M.corrugated : M.plaster, r.x1, r.x2, r.z1, r.z2, r.ceiling);
      floorRect(M.concrete, r.x1 - .15, r.x2 + .15, r.z1 - .15, r.z2 + .15, r.ceiling + .3);
      // Roof edges seen from the quarter and the relay terrace.
      for (const [x1, x2, z1, z2] of [[r.x1 - .15, r.x2 + .15, r.z1 - .15, r.z1 - .14], [r.x1 - .15, r.x2 + .15, r.z2 + .14, r.z2 + .15], [r.x1 - .15, r.x1 - .14, r.z1 - .15, r.z2 + .15], [r.x2 + .14, r.x2 + .15, r.z1 - .15, r.z2 + .15]])
        box(M.concrete, x1, x2, r.ceiling, r.ceiling + .3, z1, z2, { skip: ['bottom', 'top'] });
    }
    // Skylights over the hall (glass with a frame), and the yard's painted drill-ground markings.
    for (const z of [-71, -77]) { piece(M.frame, 6, 6.28, z, 3.2, .06, 3.2); piece(M.glass, 6, 6.3, z, 3, .02, 3); }
    for (let x = -95; x <= -82; x += 4.3) piece(M.yellow, x, .006, 36, .12, .004, 14);
    // Closed storeroom behind the hall: roofed over.
    floorRect(M.concrete, -2, 14, -97, -80, 6.4);
  }

  // ---------- Walls from the colliders, lintels over doorways ----------
  const WALL = { facade: M.brick, yard: M.brick, stone: M.stone, low: M.stone, glass: null };
  const SURFACE = { tile: null, concrete: M.concrete, plaster: M.plaster, metal: M.plate };
  function wallBox(o, y1 = 0, y2 = o.height) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
    if (o.look === 'glass') {
      // Greenhouse: stone plinth, mullions, glazing, transom.
      box(M.stone, x1, x2, 0, Math.min(.9, y2), z1, z2); if (y2 <= .9) return;
      piece(M.glass, o.x, .9, o.z, x2 - x1, y2 - .9, z2 - z1);
      const long = Math.max(x2 - x1, z2 - z1), along = x2 - x1 > z2 - z1;
      for (let t = 0; t <= long + 1e-6; t += 2.2) piece(M.frame, along ? x1 + t : o.x, .9, along ? o.z : z1 + t, .12, y2 - .9, .12);
      for (const yy of [3.6, 6.8]) piece(M.frame, o.x, yy, o.z, along ? long : .1, .08, along ? .1 : long);
      return;
    }
    const m = WALL[o.look] || SURFACE[o.surface];
    if (m) { box(m, x1, x2, y1, y2, z1, z2); return; }
    const band = 1.25;
    if (y1 < band) box(M.dirtyTile, x1, x2, y1, Math.min(band, y2), z1, z2, { skip: ['bottom', 'top'] });
    if (y2 > band) box(M.tile, x1, x2, Math.max(band, y1), y2, z1, z2);
  }
  function buildWalls(obstacles) {
    const lines = new Map();
    for (const o of obstacles) {
      if (o.kind !== 'wall') continue; wallBox(o);
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
          for (const at of [left.b, right.a]) axis === 'x' ? piece(M.dark, at, 0, fixed, .12, d.height, .36) : piece(M.dark, fixed, 0, at, .36, d.height, .12);
          axis === 'x' ? piece(M.dark, centre, d.height - .02, fixed, right.a - left.b + .24, .12, .36) : piece(M.dark, fixed, d.height - .02, centre, .36, .12, right.a - left.b + .24);
        }
      }
    }
    // Caserne: white band and cornice on the brick facade, apparatus-bay door frame painted red.
    piece(M.white, -80.2, 3.4, 59, .12, .3, 30); piece(M.white, -80.2, 7.6, 85, .12, .35, 22);
    for (const z of [83.35, 88.65]) piece(M.red, -80, 0, z, .5, 4.4, .3); piece(M.red, -80, 4.2, 86, .5, .3, 5.6);
    // Archives: cornice, stone pilasters on the north facade.
    piece(M.stone, -8, 6.4, -68, 44.6, .4, .7); for (let x = -28; x <= 12; x += 5) if (Math.abs(x - 6) > 2.4) piece(M.stone, x, 0, -67.75, .6, 6.4, .3);
  }

  // ---------- Props ----------
  const rotors = [];
  function vehicle(o, kind) {
    const along=o.hx>o.hz,L=(along?o.hx:o.hz)*2,W=(along?o.hz:o.hx)*2;
    // Keep exactly the authored visual centre and collider envelope. The cab
    // faces the bay opening in its original world orientation.
    const g=createRescueVehicle(T,{
      kind,length:L,width:W,low,M,
      signTexture:(id)=>signTex([id,'AEGIS · VESPER'],{bg:null,fg:kind==='vsav'?'#a3241c':'#e9e3d7',w:512,h:128})
    });
    g.position.set(o.x,0,o.z);
    if(!along)g.rotation.y=Math.PI/2;
    root.add(g);
    stats.meshes+=g.children.length;
    stats.vehicles=(stats.vehicles||0)+1;
  }
  function dress(o) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, h = o.height, along = w >= d;
    // Furniture gets authored, recognizable geometry instead of collision proxies.
    // Greenhouse 'bed' remains a PLANT BED, not a sleeping mattress.
    if(furnishings.dress(o))return;
    switch (o.kind) {
      case 'drill-tower':
        box(M.concrete, x1, x2, 0, h, z1, z2);
        for (let y = 3; y < h; y += 3) { piece(M.black, x2 + .01, y - 1.6, o.z, .02, 1.3, 1.2); piece(M.steel, x2 + .5, y - .1, o.z, 1, .08, 1.8); piece(M.steel, x2 + 1, y - .1, o.z, .05, 1, 1.8); }
        sign(signTex('07', { bg: '#a3241c', w: 256, h: 256 }), x2 + .02, h - 1.4, o.z, Math.PI / 2, 1.4, 1.4); break;
      case 'fuel-tank': { const c = cylinder(M.paintedMetal, o.x, 1.2, o.z, .85, d, { axis: 'z', segments: 20 }); piece(M.dark, o.x, 0, o.z - .8, w, .4, .3); piece(M.dark, o.x, 0, o.z + .8, w, .4, .3); sign(signTex(['GAZOLE', 'CUVE 07'], { bg: '#d8a91f', fg: '#16181a', w: 256, h: 128 }), o.x + .87, 1.3, o.z, Math.PI / 2, .9, .45); c.name = 'cuve'; break; }
      case 'car': {
        piece(M.red, o.x, .35, o.z, w, .7, d); piece(M.red, o.x, 1.05, o.z + .3, w - .1, .5, d * .55); piece(M.glass, o.x, 1.05, o.z + .3, w - .05, .45, d * .56);
        for (const sz of [-1, 1]) for (const sx of [-1, 1]) cylinder(M.black, o.x + sx * (o.hx - .05), .35, o.z + sz * (o.hz - .6), .35, .25, { axis: 'x' });
        piece(M.white, o.x, .7, o.z, w + .01, .12, d - .4); break;
      }
      case 'generator': {
        box(M.rust, x1, x2, .2, h, z1, z2); piece(M.dark, o.x, 0, o.z, w + .2, .2, d + .2);
        for (let k = 0; k < 9; k++) piece(M.black, x1 + .3 + k * (w - .6) / 8, .6, z2 + .01, .06, h - 1, .02);
        const ex = cylinder(M.steel, x1 + .5, h + .6, o.z, .14, 1.2); ex.name = 'échappement';
        const fan = new T.Group(); fan.position.set(x2 + .02, h * .55, o.z); for (let k = 0; k < 4; k++) { const b = new T.Mesh(new T.BoxGeometry(.02, .9, .14), M.steel); b.rotation.x = k / 4 * Math.PI; fan.add(b); } add(fan); rotors.push(fan);
        sign(signTex(['GROUPE ÉLECTROGÈNE', '125 kVA · STATION 07'], { bg: '#d8a91f', fg: '#16181a', w: 512, h: 128 }), o.x, 1.5, z1 - .01, Math.PI, 1.6, .4); break;
      }
      case 'day-tank': box(M.paintedMetal, x1, x2, 0, h, z1, z2); cylinder(M.steel, o.x + .4, 1.4, o.z, .04, 1.4, { axis: 'x' }); break;
      case 'switchboard': box(M.plate, x1, x2, 0, h, z1, z2); for (let k = -1; k <= 1; k++) piece(k ? M.amber : M.redGlow, x2 + .01, h * .8, o.z + k * .4, .02, .05, .05); break;
      case 'console': {
        box(M.white, x1, x2, 0, h - .05, z1, z2); piece(M.dark, o.x, h - .05, o.z, w, .05, d);
        for (let k = -1; k <= 1; k++) details.computer({x: x1 + .55, y: h, z: o.z + k * 1.8, yaw: Math.PI / 2, scale: .82, power: 'caserne'});
        break;
      }
      case 'radio-table': piece(M.steel, o.x, h - .05, o.z, w, .05, d); for (const sx of [-1, 1]) piece(M.steel, o.x + sx * (o.hx - .05), 0, o.z, .05, h - .05, d - .1); piece(M.dark, o.x - .5, h, o.z, .7, .35, .4); piece(M.amber, o.x - .3, h + .2, o.z - .21, .1, .04, .01); break;
      case 'map-table': box(M.wood, x1, x2, 0, h, z1, z2); { const mp = new T.Mesh(new T.PlaneGeometry(w - .2, d - .2), new T.MeshStandardMaterial({ map: mapTex, roughness: .9 })); mp.rotation.x = -Math.PI / 2; mp.position.set(o.x, h + .005, o.z); add(mp); } break;
      case 'lockers': {
        box(M.paintedMetal, x1, x2, 0, h, z1, z2); const n = Math.round(Math.max(w, d) / .6), face = along ? (o.z > 70 ? z1 - .01 : z2 + .01) : (o.x < -90 ? x2 + .01 : x1 - .01);
        for (let k = 0; k < n; k++) { const t = -Math.max(o.hx, o.hz) + (k + .5) * Math.max(w, d) / n; along ? piece(M.dark, o.x + t, .2, face, .02, h - .4, .01) : piece(M.dark, face, .2, o.z + t, .01, h - .4, .02); along ? piece(M.dark, o.x + t, h - .35, face, .3, .03, .01) : piece(M.dark, face, h - .35, o.z + t, .01, .03, .3); }
        break;
      }
      case 'bench': piece(o.surface === 'wood' ? M.wood : M.steel, o.x, h - .06, o.z, w, .06, d); for (const s of [-1, 1]) along ? piece(M.dark, o.x + s * (o.hx - .2), 0, o.z, .06, h - .06, d - .05) : piece(M.dark, o.x, 0, o.z + s * (o.hz - .2), w - .05, h - .06, .06); break;
      case 'vsav': case 'fpt': vehicle(o, o.kind); break;
      case 'ari-rack': box(M.steel, x1, x2, 0, h, z1, z2, { skip: ['bottom', '+x'] }); for (let k = 0; k < 6; k++) for (const y of [.35, 1.15]) cylinder(M.yellow, o.x + .1, y + .35, z1 + .35 + k * (d - .7) / 5, .1, .6); break;
      case 'hose-rack': box(M.steel, x1, x2, 0, h, z1, z2, { skip: ['bottom', '+x'] }); for (let k = 0; k < 4; k++) for (const y of [.5, 1.3]) { const c = cylinder(M.white, o.x + .15, y, z1 + .5 + k * (d - 1) / 3, .28, .12, { axis: 'x', segments: 14 }); c.material = M.white; } break;
      case 'workbench': {
        box(M.wood,x1,x2,h-.06,h,z1,z2);
        for(const sx of [-1,1])for(const sz of [-1,1])piece(M.steel,o.x+sx*(o.hx-.1),0,o.z+sz*(o.hz-.1),.07,h-.06,.07);
        piece(M.steel,o.x,.18,z2-.1,w-.12,.06,.06);
        piece(M.paintedMetal,o.x,h+.16,z2-.025,w-.12,.72,.04);
        for(let col=0;col<24;col++)for(let row=0;row<4;row++)piece(M.dark,x1+.15+col*(w-.3)/23,h+.24+row*.15,z2-.048,.022,.022,.004);
        break;
      }
      case 'planter': box(M.stone, x1, x2, 0, h, z1, z2); piece(M.soil, o.x, h - .05, o.z, w - .2, .06, d - .2); details.planting(o, low ? 4 : 7); break;
      case 'reception': box(M.wood, x1, x2, 0, h, z1, z2); piece(M.woodDark, o.x, h, o.z, w + .1, .05, d + .1); break;
      case 'display': piece(M.woodDark, o.x, 0, o.z, w, .8, d); piece(M.glass, o.x, .8, o.z, w, h - .8, d);  break;
      case 'desk': box(M.wood, x1, x2, h - .06, h, z1, z2); for (const sx of [-1, 1]) piece(M.woodDark, o.x + sx * (o.hx - .1), 0, o.z, .08, h - .06, d - .1); break;
      case 'shelves': {
        // Open bays: books sit on real shelves, visible in front of a thin back.
        piece(M.woodDark,o.x,0,z2-.025,w,h,.05);
        for(const side of [-1,1])piece(M.wood,o.x+side*(o.hx-.035),0,o.z,.07,h,d);
        for(let y=.1;y<h-.1;y+=.45){piece(M.wood,o.x,y,o.z,w,.045,d);
          for(let k=0;k<20;k++){const xx=x1+.25+k*(w-.5)/19,bh=.26+rng()*.09;
            piece(k%3?M.woodDark:M.cardboard,xx,y+.05,z1+.20,.12+rng()*.07,bh,.28);
            piece(M.paper,xx,y+.10,z1+.054,.07,.025,.008);
          }
        }break;
      }
      case 'stove': cylinder(M.dark, o.x, .25, o.z, .22, .5); piece(M.amber, o.x, .5, o.z, .2, .02, .2); break;
      case 'rack': box(M.black, x1, x2, 0, h, z1, z2); for (let k = 0; k < 10; k++) piece(k % 4 ? M.cyan : M.helix, o.x - o.hx + .1 + (k % 5) * .2, .5 + Math.floor(k / 5) * .8, z1 - .01, .05, .03, .01); break;
      case 'stack': box(M.plate, x1, x2, 0, h, z1, z2); for (let y = .3; y < h - .2; y += .55) for (let k = 0; k < 12; k++) for (const s of [-1, 1]) piece(M.cardboard, o.x + s * (o.hx + .01), y, z1 + .4 + k * (d - .8) / 11, .02, .38, .3); break;
      case 'terminal-desk':
        box(M.steel, x1, x2, 0, h, z1, z2);
        piece(M.dark, o.x, h, o.z, w + .02, .035, d + .02);
        for (const side of [-1, 1]) {
          piece(M.dark, o.x + side * w * .35, .14, z2 + .012, w * .25, h * .55, .025);
          piece(M.steel, o.x + side * w * .35, h * .46, z2 + .03, w * .12, .025, .015);
        }
        break;
      case 'cabinet': box(M.woodDark, x1, x2, 0, h, z1, z2); for (let y = .2; y < h - .1; y += .3) for (let k = 0; k < 13; k++) for (const s of [-1, 1]) piece(M.amber, x1 + .3 + k * (w - .6) / 12, y + .12, o.z + s * (o.hz + .005), .12, .02, .01); break;
      case 'bed': box(M.stone, x1, x2, 0, h, z1, z2); piece(M.soil, o.x, h - .05, o.z, w - .3, .06, d - .3); details.planting(o, low ? 7 : 12); break;
      case 'basin': {
        box(M.stone,x1,x2,0,.14,z1,z2);
        for(const [a,b,c,e] of [[x1,x1+.16,z1,z2],[x2-.16,x2,z1,z2],[x1+.16,x2-.16,z1,z1+.16],[x1+.16,x2-.16,z2-.16,z2]])box(M.stone,a,b,.14,h,c,e);
        piece(M.dark,o.x,.14,o.z,w-.32,.014,d-.32);break;
      }
      case 'trunk': details.tree(o); break;
      default: break;
    }
  }
  // ---------- Doors ----------
  const doors = new Map();
  const SPEED = { fire: 1.3, glass: 1.8, wood: 1.4, sectional: .22, lift: .8 };
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
  function nearestFace(obstacles, x, z) {
    let best = null;
    for (const o of obstacles) {
      if (!['wall', 'console', 'radio-table', 'map-table', 'reception', 'desk', 'terminal-desk', 'lockers', 'generator', 'cabinet'].includes(o.kind)) continue;
      const dist = Math.hypot(Math.max(Math.abs(x - o.x) - o.hx, 0), Math.max(Math.abs(z - o.z) - o.hz, 0));
      if (dist < 3 && (!best || dist < best.dist)) best = { o, dist };
    }
    if (!best) return null;
    const { o } = best, ex = x - o.x, ez = z - o.z;
    if (Math.abs(ex) - o.hx > Math.abs(ez) - o.hz) { const sx = Math.sign(ex); return { o, x: o.x + sx * (o.hx + .01), z: Math.max(o.z - o.hz + .3, Math.min(o.z + o.hz - .3, z)), yaw: sx > 0 ? Math.PI / 2 : -Math.PI / 2, top: o.height }; }
    const sz = Math.sign(ez); return { o, x: Math.max(o.x - o.hx + .3, Math.min(o.x + o.hx - .3, x)), z: o.z + sz * (o.hz + .01), yaw: sz > 0 ? 0 : Math.PI, top: o.height };
  }
  function buildDevices(obstacles) {
    let seed = 11;
    for (const it of INTERACTIONS) {
      if (it.core) continue;
      const at = nearestFace(obstacles, it.x, it.z) || { x: it.x, z: it.z, yaw: 0, top: 1 }, g = new T.Group(); g.position.set(at.x, 0, at.z); g.rotation.y = at.yaw; root.add(g);
      const part = (m, sx, sy, sz, px, py, pz) => { const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), m); mesh.position.set(px, py, pz); g.add(mesh); stats.meshes++; return mesh; };
      const lamp = new T.Mesh(new T.BoxGeometry(.07, .07, .04), new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false })); g.add(lamp);
      const table = at.o && ['console', 'radio-table', 'map-table', 'reception', 'desk', 'terminal-desk'].includes(at.o.kind);
      let moving = null;
      if (it.id === 'doc-tableau') { const b = new T.Mesh(new T.PlaneGeometry(1.6, 1), new T.MeshStandardMaterial({ map: boardTex, roughness: .6 })); b.position.set(0, 1.6, .02); g.add(b); lamp.position.set(.85, 1.1, .03); }
      else if (it.id === 'doc-radio') { part(M.dark, .6, .35, .35, 0, at.top + .175, -.15); part(M.amber, .25, .06, .01, -.1, at.top + .25, .03); const ant = new T.Mesh(new T.CylinderGeometry(.01, .01, .9, 4), M.steel); ant.position.set(.22, at.top + .8, -.2); g.add(ant); lamp.position.set(.2, at.top + .3, .03); }
      else if (it.id === 'casier') { const doorLeaf = part(M.paintedMetal, .55, 1.7, .03, .3, 1.05, .32); doorLeaf.rotation.y = -1.1; const photo = new T.Mesh(new T.PlaneGeometry(.18, .13), M.paper); photo.position.set(.05, 1.4, .3); g.add(photo); lamp.position.set(-.3, 1.9, .05); }
      else if (it.id === 'gazole') { const pipe = new T.Mesh(new T.CylinderGeometry(.05, .05, 2.4, 10), M.steel); pipe.position.set(0, 1.2, .25); g.add(pipe); const wheel = new T.Mesh(new T.TorusGeometry(.18, .025, 6, 18), M.redGlow); wheel.position.set(0, 1.1, .4); wheel.material = new T.MeshStandardMaterial({ color: 0xa3241c }); g.add(wheel); moving = wheel; lamp.position.set(.25, 1.5, .3); }
      else if (it.id === 'copie') { part(M.black, .9, .6, .08, 0, at.top + .5, -.2); const s = new T.Mesh(new T.PlaneGeometry(.8, .5), new T.MeshBasicMaterial({ map: signTex(['REGISTRE DES DISPARUS', 'COPIE HORS RÉSEAU'], { bg: '#04161c', fg: '#7fe7ff', w: 512, h: 300 }), toneMapped: false })); s.position.set(0, at.top + .5, -.155); g.add(s); lamp.position.set(.4, at.top + .2, -.1); }
      else if (it.log) {
        const paper = new T.Mesh(new T.PlaneGeometry(.34, .46), new T.MeshStandardMaterial({ map: paperTex(it.label.replace(/^(LIRE|OUVRIR|EXAMINER|ÉCOUTER) (LE |LA |L’|LES )?/, ''), seed++), roughness: .9, side: T.DoubleSide }));
        if (table) { paper.rotation.x = -Math.PI / 2; paper.rotation.z = rng() - .5; paper.position.set(0, at.top + .006, -.25); lamp.position.set(.22, at.top + .03, -.25); lamp.scale.setScalar(.5); }
        else { paper.position.set(0, 1.45, .012); lamp.position.set(.22, 1.62, .02); lamp.scale.setScalar(.5); }
        g.add(paper);
      } else {
        const big = ['demarreur', 'porte-remise'].includes(it.id);
        part(it.id === 'deverrouillage' ? M.red : M.plate, big ? .8 : .45, big ? 1 : .6, .2, 0, 1.4, .1);
        moving = part(it.id === 'deverrouillage' ? M.yellow : M.red, .06, .35, .06, big ? .25 : .12, 1.4, .24);
        part(M.dark, big ? .4 : .2, .2, .01, -.1, 1.65, .21); lamp.position.set(big ? -.28 : -.14, 1.1, .21);
        if (it.id === 'porte-remise') for (const [c, y] of [[M.green, 1.55], [M.redGlow, 1.25]]) part(c, .1, .1, .04, .05, y, .22);
      }
      devices.set(it.id, { it, lamp, moving, done: false, available: false, turn: 0 });
    }
  }
  function updateDevices(t, dt) {
    const blink = .5 + .5 * Math.sin(t * 5);
    for (const v of devices.values()) {
      v.lamp.material.color.set(v.done ? 0x3dff8a : v.it.log ? (blink > .3 ? 0xfff2c8 : 0x6a6250) : v.available ? (blink > .5 ? 0xffb35c : 0x5a3a14) : 0x2a1a10);
      if (v.done && v.moving && v.turn < 1) { v.turn = Math.min(1, v.turn + dt * .8); if (v.it.id === 'gazole') v.moving.rotation.z = -v.turn * TAU * 2; else v.moving.rotation.x = -v.turn * 1.1; }
    }
  }

  // ---------- Signs, posters, belongings ----------
  function buildSigns() {
    sign(signTex(['AEGIS · STATION 07', 'QUARTIER DES SECOURS · VESPER'], { bg: '#e8e6df', fg: '#a3241c', w: 1024, h: 192, border: '#a3241c' }), -79.83, 5.6, 86, Math.PI / 2, 6, 1.1);
    sign(signTex('SORTIE DE SECOURS · NE PAS STATIONNER', { bg: '#a3241c', fg: '#fff', w: 1024, h: 96 }), -79.7, 4.75, 86, Math.PI / 2, 5, .4);
    sign(graffitiTex('07 · ON REVIENT', '#e8e2d0'), -79.83, 1.8, 62, Math.PI / 2, 3.4, 1.05, { see: true });
    sign(signTex(['SALLE DE VEILLE', 'RADIO · CANAL 07'], { bg: '#0d3b5e', w: 512, h: 160 }), -84.17, 2.75, 58, Math.PI / 2, 1.5, .45, { lit: false });
    sign(signTex('VESTIAIRES', { bg: '#0d3b5e', w: 512, h: 128 }), -84.17, 2.75, 68, Math.PI / 2, 1.3, .32);
    sign(signTex(['LOCAL TECHNIQUE', 'GROUPE ÉLECTROGÈNE'], { bg: '#d8a91f', fg: '#16181a', w: 512, h: 160 }), -84.17, 2.75, 48, Math.PI / 2, 1.5, .45);
    sign(signTex('HANGAR', { bg: '#a3241c', fg: '#fff', w: 512, h: 128 }), -82, 2.85, 73.83, Math.PI, 1.3, .32);
    sign(signTex(['RESPIRATEURS · CONTRÔLE AVANT DÉPART', 'PRESSION > 280 BAR'], { bg: '#d8a91f', fg: '#16181a', w: 512, h: 160 }), -96.82, 2.4, 77.5, Math.PI / 2, 1.6, .5);
    sign(signTex(['ARCHIVES VÉGÉTALES', 'DE VESPER · ENTRÉE PUBLIQUE'], { bg: '#e6dcc4', fg: '#2d4a2a', w: 1024, h: 192, border: '#2d4a2a' }), 6, 4.7, -67.82, Math.PI, 7, 1.3);
    sign(signTex(['SALLE DES REGISTRES', 'COPIE DES DISPARUS DE 2189'], { bg: '#2d4a2a', fg: '#e6dcc4', w: 512, h: 160 }), -22, 3.3, -79.83, 0, 1.8, .55);
    sign(signTex('HERBIERS', { bg: '#2d4a2a', fg: '#e6dcc4', w: 512, h: 128 }), -8, 3.3, -79.83, 0, 1.4, .35);
    sign(signTex('GRANDE SERRE', { bg: '#2d4a2a', fg: '#e6dcc4', w: 512, h: 128 }), 13.83, 3.8, -74, -Math.PI / 2, 1.6, .4);
    sign(signTex(['MONTE-CHARGE', 'BAS-NIVEAUX ↓'], { bg: '#0f7a3e', fg: '#f4fff6', w: 512, h: 160 }), 41.82, 3.1, -80, -Math.PI / 2, 1.6, .5);
    sign(graffitiTex('PAS LE RÉSEAU PRINCIPAL', '#8fd0ff'), -29.82, 1.6, -78, Math.PI / 2, 3.2, 1, { see: true });
    // Belongings left in 2189, and the bivouac of three days ago.
    for (const [x, z, m] of [[-95.5, 66, M.yellow], [-94.8, 72.7, M.red], [-86.6, 64.6, M.paintedMetal], [-83, 93.5, M.yellow]]) piece(m, x, 0, z, .45, .35, .35, rng() * 3);
    piece(M.blanket, -25.2, 0, -73.4, 1.9, .08, .8); piece(M.fabric, -25.1, .08, -73.4, 1.8, .06, .7); piece(M.cardboard, -23.6, 0, -74.8, .3, .2, .25); piece(M.steel, -23.2, 0, -74.6, .12, .12, .12);
    const map = new T.Mesh(new T.PlaneGeometry(.9, .9), new T.MeshStandardMaterial({ map: mapTex, roughness: .9 })); map.rotation.x = -Math.PI / 2; map.position.set(-27.2, .81, -70); add(map);
    // Leaves on the greenhouse floor.
    for (let k = 0; k < (low ? 40 : 90); k++) piece(rng() < .5 ? M.foliage : M.soil, 15 + rng() * 26, 0, -96 + rng() * 27, .3, .01, .2, rng() * 3);
    // Greenhouse roof: ribs, glass, and the sun shafts.
    for (let x = 15; x <= 41; x += 2.6) piece(M.frame, x, 9.95, -82.5, .12, .14, 29);
    piece(M.glass, 28, 10, -82.5, 28, .02, 29);
  }

  // ---------- Vesper 2196: neon, holograms, ORDRE scanners (cyberpunk layer) ----------
  const additive = (color, opacity = .6, map = null) => new T.MeshBasicMaterial({ color, map, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const neon = (x1, y1, z1, x2, y2, z2, color) => add(createNeonFixture(T, new T.Vector3(x1, y1, z1), new T.Vector3(x2, y2, z2), color, M.steel));
  function buildCyber() {
    // ORDRE seal projected on the apparatus-bay door: a red hologram that dies when the door opens.
    const sealTex = canvasTexture(T, 512, 512, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.strokeStyle = '#ff3b4e'; c.lineWidth = 10; c.beginPath(); c.arc(w / 2, h / 2 - 30, 150, 0, TAU); c.stroke(); c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2 - 30, 118, 0, TAU); c.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 118, h / 2 - 30 + Math.sin(a) * 118); c.lineTo(w / 2 + Math.cos(a) * 150, h / 2 - 30 + Math.sin(a) * 150); c.stroke(); }
      c.fillStyle = '#ff3b4e'; c.font = `900 64px ${FONT}`; c.textAlign = 'center'; c.fillText('ORDRE', w / 2, h / 2 - 8); c.font = `800 30px ${FONT}`; c.fillText('ZONE CONFISQUÉE', w / 2, h - 70); c.font = `700 22px ${FONT}`; c.fillText('VÉHICULES SAISIS · 17/11/2189', w / 2, h - 36);
    });
    const seal = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), additive(0xffffff, .55, sealTex)); seal.position.set(-79.6, 2.2, 86); seal.rotation.y = Math.PI / 2; add(seal);
    animated.push(t => { const open = doors.get('portail')?.open || 0; seal.visible = open < .15; seal.material.opacity = (.42 + .12 * Math.sin(t * 3)) * (Math.sin(t * 23) > .96 ? .3 : 1); seal.rotation.z = Math.sin(t * .4) * .02; });
    // AEGIS neon on the station: a cyan « 07 » and a vertical « SECOURS » blade.
    const sevenTex = signTex(['07'], { bg: null, fg: '#7fe7ff', w: 256, h: 256 });
    sign(sevenTex, -79.8, 6.4, 79.6, Math.PI / 2, 1.6, 1.6, { lit: true, see: true });
    neon(-79.75, 3.8, 78.6, -79.75, 3.8, 80.6, 0x7fe7ff); neon(-79.75, 7.2, 78.6, -79.75, 7.2, 80.6, 0x7fe7ff);
    const blade = sign(signTex(['SECOURS'], { bg: '#160606', fg: '#ff4d3d', w: 128, h: 512 }), -79.2, 4.6, 92.5, Math.PI / 2, .6, 2.6, { lit: true }); piece(M.dark, -79.45, 3.2, 92.5, .3, 2.8, .7);
    animated.push(t => { blade.material.color.setScalar(Math.sin(t * 17) > .93 ? .35 : 1); });
    // Floor LED guide strips in the corridor (green on batteries, cyan on mains).
    const strip = new T.Mesh(new T.BoxGeometry(.04, .02, 29.4), glow(0x3dff8a)); strip.position.set(-83.7, .03, 59); add(strip);
    const strip2 = strip.clone(); strip2.position.x = -80.3; add(strip2);
    animated.push(() => { const c = power.caserne ? 0x7fe7ff : 0x3dff8a; strip.material.color.set(c); });
    // Holographic city table at the dispatch room: Vesper's blocks over the paper map, live when the station has power.
    const holo = new T.Group(); holo.position.set(-90, 1.05, 55.6); add(holo);
    const blocks = new T.InstancedMesh(cube, additive(0x7fe7ff, .35), 46), mm = new T.Matrix4(), pp = new T.Vector3(), qq = new T.Quaternion(), ss = new T.Vector3();
    for (let k = 0; k < 46; k++) { const h = .08 + rng() * .5; blocks.setMatrixAt(k, mm.compose(pp.set((rng() - .5) * 2, h / 2, (rng() - .5) * 1.4), qq, ss.set(.08 + rng() * .12, h, .08 + rng() * .12))); }
    blocks.instanceMatrix.needsUpdate = true; holo.add(blocks);
    const ping = new T.Mesh(new T.RingGeometry(.05, .08, 24), additive(0xff4d3d, .9)); ping.rotation.x = -Math.PI / 2; ping.position.set(-.6, .02, -.3); holo.add(ping);
    animated.push(t => { holo.visible = power.caserne; holo.rotation.y = Math.sin(t * .2) * .2; ping.scale.setScalar(1 + (t * 1.5 % 1) * 4); ping.material.opacity = .9 * (1 - t * 1.5 % 1); });
    // Archives: green neon of the building, ORDRE scanner sweeping the forecourt, HELIX status ribbons on the copy racks.
    neon(-1.8, 5.9, -67.75, 13.8, 5.9, -67.75, 0x6dff9c); neon(-1.8, 3.6, -67.75, 13.8, 3.6, -67.75, 0x6dff9c);
    const scanner = new T.Group(); scanner.position.set(6, 6.2, -67.4); add(scanner);
    piece(M.dark, 6, 6, -67.6, .5, .4, .5);
    const beam = new T.Mesh(new T.ConeGeometry(1.6, 6, 24, 1, true), additive(0xff3b4e, .12)); beam.position.y = -3; scanner.add(beam);
    const spot = new T.Mesh(new T.CircleGeometry(1.6, 28), additive(0xff3b4e, .35)); spot.rotation.x = -Math.PI / 2; add(spot);
    animated.push(t => { const a = Math.sin(t * .7) * .55; scanner.rotation.set(-.55, a, 0); spot.position.set(6 + Math.sin(a) * 3.4, .02, -64.6 + Math.cos(a) * .4); beam.material.opacity = .08 + .05 * Math.sin(t * 9); });
    // Greenhouse: floating botanical catalogue tags (old HELIX-made holograms, still on batteries).
    for (const [x, z, name] of [[20, -91, 'FOUGÈRE DES TOITS'], [36, -91, 'MOUSSE DE VESPER'], [20, -75, 'LIERRE DES QUAIS'], [36, -75, 'ORCHIDÉE GRISE'], [30.5, -88.5, 'CHÊNE DE LA SERRE · 1998']]) {
      const tag = new T.Mesh(new T.PlaneGeometry(1.6, .5), new T.MeshBasicMaterial({ map: signTex([name, 'ARCHIVES VÉGÉTALES · FICHE'], { bg: 'rgba(8,40,30,.55)', fg: '#9fffcf', w: 512, h: 160, border: '#6dff9c' }), transparent: true, opacity: .8, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      const baseY=name.startsWith('CHÊNE')?2.4:1.9; tag.name='M01 / catalogue botanique '+name; tag.position.set(x,baseY,z); add(tag); animated.push((t, dt, eye) => { tag.position.y=baseY+Math.sin(t*1.3+x)*.025; tag.lookAt(eye.position.x, tag.position.y, eye.position.z); });
    }
    // Vesper beyond the walls: neon advertising on the Archives' blind side wall, seen from the relay terrace.
    sign(signTex(['HELIX', 'LA MÉMOIRE DE VESPER EST EN SÉCURITÉ'], { bg: '#06121a', fg: '#ff4d5e', w: 1024, h: 256, border: '#ff4d5e' }), -30.2, 8.2, -84, -Math.PI / 2, 9, 2.25, { lit: true });
    piece(M.dark, -30.4, 6.4, -84, .3, 4, 9.6);
  }

  const livedIn=createLivedInDressing(T,root,{chapter:1,low,materials:details.M});

  // ---------- Daylight adaptation inside the buildings ----------
  let adapt = 1; const cachesById = new Map();
  function daylightAt(x, z) { const r = ROOM[roomAt(x, z)]; if (!r) return 1; if (r.id === 'remise') return doors.get('portail')?.open > .5 ? .55 : DAYLIGHT.garage; return DAYLIGHT[r.look] ?? 1; }

  return {
    root, M,
    build(obstacles) {
      placeFixtures(); buildRooms(); buildWalls(obstacles);
      for (const o of obstacles) if (o.extension) { dress(o); if (o.kind !== 'bed') details.accessories(o); }
      buildFixtureMeshes(); buildDoors(); buildDevices(obstacles); buildSigns(); buildCyber();
      flushGeometry(); flushPieces(); furnishings.finish(); details.finish(); livedIn.build(obstacles);
    },
    update(t, dt, eye, player = eye.position) {
      updateLights(t, dt, eye.position); updateDoors(dt, player); updateDevices(t, dt); details.update(power); livedIn.update(t,dt,power);
      for (const r of rotors) r.rotation.x += (power.caserne ? 14 : 0) * dt;
      for (const f of animated) f(t, dt, eye);
    },
    // Scale the sun and sky light after the atmosphere has set them for the frame.
    adapt(atmosphere, eye, dt) {
      const target = daylightAt(eye.x, eye.z); adapt += (target - adapt) * Math.min(1, dt * 2.5);
      atmosphere.sun.intensity *= adapt; atmosphere.ambient.intensity *= .25 + .75 * adapt;
      return adapt;
    },
    // AEGIS supply caches: a small case with the floating medkit or cell above it.
    syncPickups(list, t = 0, accent = 0xff6fb4) {
      const live = new Set();
      for (const p of list) {
        live.add(p.id); let o = cachesById.get(p.id);
        if (!o) { o = new T.Group(); const caseMesh = new T.Mesh(new T.BoxGeometry(.6, .3, .4), M.paintedMetal); caseMesh.position.y = .15; o.add(caseMesh); const stripe = new T.Mesh(new T.BoxGeometry(.61, .06, .41), p.kind === 'heal' ? glow(accent) : M.cyan); stripe.position.y = .22; o.add(stripe);
          const gem = new T.Mesh(new T.OctahedronGeometry(.2, 0), p.kind === 'heal' ? glow(accent) : glow(0xe8f6ff)); gem.position.y = .75; o.add(gem); o.userData.gem = gem; o.position.set(p.x, p.y || 0, p.z); root.add(o); cachesById.set(p.id, o); }
        o.userData.gem.position.y = .75 + Math.sin(t * 2.4 + p.x) * .08; o.userData.gem.rotation.y = t * 1.8;
      }
      for (const [id, o] of cachesById) if (!live.has(id)) { o.removeFromParent(); cachesById.delete(id); }
    },
    setDoor(id, state) { const d = doors.get(id); if (!d) return; d.state = state ? (d.d.open ? 'auto' : 'open') : 'closed'; if (!state) d.open = 0; if (id === 'monte-charge' && state) liftLit = true; },
    setPower(on) { power.caserne = !!on; },
    markDone(id, done = true) { const d = devices.get(id); if (d) { d.done = done; if (!done) { d.turn = 0; if (d.moving) d.moving.rotation.set(0, 0, 0); } } },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    daylightAt,
    stats() { return { ...stats, furniture: {...furnishings.stats}, details: details.stats(), livedIn: livedIn.stats(), power: power.caserne, adapt: +adapt.toFixed(2), lights: pool.filter(s => s.fixture).length, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])) }; }
  };
}

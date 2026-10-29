// Mission 03 — the night Vesper sector of the visitor map, baked by tools/bake-m03-vesper.mjs (quads quantised to the
// centimetre, one colour and one material index per quad) and rebuilt here for three.js: one mesh per material family,
// planar world UVs, CC0 surfaces, neon and lit windows emissive, sign atlas redrawn from the page's labels.
// Colliders and walkable surfaces (stairway, A3 deck) come from the same bake.

// Material indices of the visitor renderer (vesper-level1-v7.html, MAT and V4_MAT).
export const MAT = Object.freeze({ CONCRETE: 0, METAL: 1, ROAD: 2, WINDOW: 3, PLANT: 4, PINK: 5, CYAN: 6, AMBER: 7, SOIL: 8, WET: 9, WHITE: 10, RIFT: 11, RED: 12, BRICK: 13, FABRIC: 14, HOLO: 15, CERAMIC: 16, SIGN: 30 });
export const EMISSIVE = new Set([MAT.PINK, MAT.CYAN, MAT.AMBER, MAT.RIFT, MAT.RED, MAT.HOLO]);

export async function fetchSector(base = './assets/m03/') {
  const [meta, bin] = await Promise.all([fetch(base + 'vesper-sector.json').then(r => { if (!r.ok) throw new Error('vesper-sector.json ' + r.status); return r.json(); }),
    fetch(base + 'vesper-sector.bin').then(r => { if (!r.ok) throw new Error('vesper-sector.bin ' + r.status); return r.arrayBuffer(); })]);
  return decodeSector(meta, bin);
}
export function decodeSector(meta, bin) {
  const [o0, o1, o2, o3, o4, o5, o6, o7, o8] = meta.offsets, n = meta.quads, pn = meta.portalQuads, dn = meta.droneQuads;
  return { meta,
    world: { n, pos: new Int16Array(bin, o0, n * 12), col: new Uint8Array(bin, o1, n * 3), mat: new Uint8Array(bin, o2, n) },
    portal: { n: pn, pos: new Int16Array(bin, o3, pn * 12), col: new Uint8Array(bin, o4, pn * 3), mat: new Uint8Array(bin, o5, pn) },
    drone: { n: dn, pos: new Int16Array(bin, o6, dn * 12), col: new Uint8Array(bin, o7, dn * 3), mat: new Uint8Array(bin, o8, dn) } };
}

// ---------- Collision and walkable surfaces (game-logic obstacle format) ----------
export function sectorObstacles(meta, extra = []) {
  const out = meta.colliders.map(c => ({ x: (c.x1 + c.x2) / 2, z: (c.z1 + c.z2) / 2, hx: (c.x2 - c.x1) / 2, hz: (c.z2 - c.z1) / 2, y: Math.max(0, c.y1), height: c.y2 - Math.max(0, c.y1),
    surface: c.label === 'barrière béton' ? 'concrete' : 'metal', sector: true,
    // Thin walls, barriers and posts keep a narrower margin in the machines' navigation grid (doorways stay open).
    navPad: Math.min(c.x2 - c.x1, c.z2 - c.z1) < 1.4 ? .7 : 1.3 }));
  return [...out, ...extra];
}
// Height of the walkable surfaces: the stairway rises towards −z, the decks are reached from the stairway.
export function sectorTraversal(meta, extraFloors = []) {
  const stairs = meta.stairs.map((s, k) => ({ id: 'escalier-' + k, ...s })), decks = meta.decks.map((d, k) => ({ id: 'pont-' + k, x1: d.x1, x2: d.x2, z1: d.z1, z2: d.z2, height: d.h }));
  const floors = [...decks, ...extraFloors];
  const onStair = (s, x, z) => x >= s.x1 && x <= s.x2 && z <= s.zStart && z >= s.zEnd;
  const stairHeight = (s, z) => s.height * Math.min(1, Math.max(0, (s.zStart - z) / (s.zStart - s.zEnd)));
  const onFloor = (f, x, z) => x >= f.x1 && x <= f.x2 && z >= f.z1 && z <= f.z2;
  const rampHeight = (f, x, z) => f.ramp ? f.from + (f.to - f.from) * Math.min(1, Math.max(0, f.ramp === 'x' ? (x - f.x1) / (f.x2 - f.x1) : (z - f.z1) / (f.z2 - f.z1))) : f.height;
  return {
    routes: stairs.map(s => ({ id: s.id, x: (s.x1 + s.x2) / 2, halfWidth: (s.x2 - s.x1) / 2, bottomZ: s.zStart, topZ: s.zEnd, height: s.height, base: 0 })), lifts: [],
    surfaces(x, z) { return [...floors.filter(f => onFloor(f, x, z)).map(f => ({ id: f.id, height: rampHeight(f, x, z) })), ...stairs.filter(s => onStair(s, x, z)).map(s => ({ id: s.id, height: stairHeight(s, z) }))]; },
    height(x, z, time = 0, max = Infinity) {
      let h = 0;
      for (const f of floors) if (onFloor(f, x, z)) { const v = rampHeight(f, x, z); if (v <= max + .01) h = Math.max(h, v); }
      for (const s of stairs) if (onStair(s, x, z)) { const v = stairHeight(s, z); if (v <= max + .01) h = Math.max(h, v); }
      return h;
    },
    routeForSurface(id) { return id && (id.startsWith('escalier') || id.startsWith('pont')) ? 'escalier-0' : null; }
  };
}

// ---------- Rendering ----------
function canvasTexture(T, w, h, paint) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
// The visitor page's sign atlas (createAtlas), redrawn from the labels kept by the bake.
function signAtlas(T, labels) {
  return canvasTexture(T, 1024, 1024, (g) => {
    g.fillStyle = '#09111b'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 16; i++) {
      const x = i % 4 * 256, y = Math.floor(i / 4) * 256, label = labels[i] || '';
      g.save(); g.translate(x, y); g.strokeStyle = '#7597a5'; g.lineWidth = 3; g.strokeRect(6, 6, 244, 244);
      g.fillStyle = '#152430'; g.fillRect(9, 9, 238, 238); g.fillStyle = i % 5 === 2 ? '#ec467b' : '#c0dee5'; g.fillRect(12, 12, 6, 232);
      g.fillStyle = '#7d9aa8'; g.font = '700 15px monospace'; g.fillText('VESPER  //  ARCHIVES', 23, 45);
      g.fillStyle = '#edf6fb'; g.font = 'bold 26px Arial'; g.textAlign = 'center';
      label.split(' / ').forEach((part, j) => { const lines = ['']; for (const word of part.split(' ')) { if (g.measureText(lines.at(-1) + ' ' + word).width > 202 && lines.at(-1)) lines.push(word); else lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word; }
        lines.forEach((line, k) => g.fillText(line, 128, 105 + j * 55 + k * 30)); });
      g.strokeStyle = '#df347e'; g.lineWidth = 3; g.beginPath(); g.moveTo(23, 213); g.lineTo(230, 213); g.stroke();
      g.textAlign = 'left'; g.fillStyle = '#7d9aa8'; g.font = '14px monospace'; g.fillText('UNIT.03     //    HORS RESEAU', 22, 238); g.restore();
    }
  });
}
// Lit windows at night: a grid of panes, a share of them warm or cold, some flickering in the material via emissive.
function windowTextures(T) {
  let seed = 3031; const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const emissive = canvasTexture(T, 256, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = r(); if (v < .62) continue;
      c.fillStyle = v > .93 ? '#ff5aa8' : v > .86 ? '#7fe7ff' : v > .74 ? '#ffc890' : '#f2e2c0'; c.globalAlpha = .35 + r() * .65; c.fillRect(x * 32 + 4, y * 32 + 5, 24, 20); }
    c.globalAlpha = 1;
  });
  const color = canvasTexture(T, 256, 256, (c, w, h) => {
    c.fillStyle = '#1a242c'; c.fillRect(0, 0, w, h); c.fillStyle = '#0c1318';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) c.fillRect(x * 32 + 4, y * 32 + 5, 24, 20);
  });
  for (const t of [emissive, color]) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  return { emissive, color };
}

export function createSectorMeshes(T, sector, { quality = 'normal', tile = {} } = {}) {
  const low = quality === 'low', group = new T.Group(); group.name = 'M03 / Vesper, secteur 03 (carte de visite cuite)';
  const loader = new T.TextureLoader(), textures = new Map();
  const tex = (url, srgb = true) => {
    if (textures.has(url)) return textures.get(url);
    const t = loader.load(url, () => {}, undefined, () => {}); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = low ? 2 : 6; if (srgb) t.colorSpace = T.SRGBColorSpace;
    textures.set(url, t); return t;
  };
  const cc = name => './assets/cc0/' + name, l9 = (name, ch) => `./assets/ligne9/l9-${name}_${ch}_512.jpg`;
  const win = windowTextures(T), signs = signAtlas(T, sector.meta.signLabels || []);
  const std = (o) => new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: .05, ...o });
  // Vertex colours of the visitor page are a paint tint; textures carry the surface. Tile = metres per texture repeat.
  const FAMILY = {
    [MAT.CONCRETE]: { m: std({ map: tex(cc('vesper-concrete_diff_512.jpg')), roughness: .92 }), tile: 3.2, lift: 1.9 },
    [MAT.METAL]: { m: std({ map: tex(cc('vesper-steel_diff_512.jpg')), roughness: .42, metalness: .62, normalMap: low ? null : tex(l9('metal_plate', 'nor'), false) }), tile: 2.4, lift: 1.8 },
    [MAT.ROAD]: { m: std({ map: tex(cc('vesper-asphalt_diff_512.jpg')), roughness: .5, metalness: .15 }), tile: 4, lift: 2.2 },
    [MAT.WINDOW]: { m: std({ map: win.color, emissiveMap: win.emissive, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: .18, metalness: .55 }), tile: 6, lift: 1.4 },
    [MAT.PLANT]: { m: std({ roughness: 1, metalness: 0 }), tile: 2, lift: 1.25 },
    [MAT.SOIL]: { m: std({ map: tex(cc('vesper-asphalt_diff_512.jpg')), roughness: 1 }), tile: 2.5, lift: 1.5 },
    [MAT.WET]: { m: std({ map: tex(cc('vesper-asphalt_diff_512.jpg')), roughness: .08, metalness: .45 }), tile: 3, lift: 1.6 },
    [MAT.WHITE]: { m: std({ map: tex(cc('vesper-paint_diff_512.jpg')), roughness: .6 }), tile: 2, lift: 1.35 },
    [MAT.BRICK]: { m: std({ map: tex(cc('m01-brick-diff_512.jpg')), normalMap: low ? null : tex(cc('m01-brick-normal_512.jpg'), false), roughness: .9 }), tile: 2.2, lift: 2.1 },
    [MAT.FABRIC]: { m: std({ roughness: 1, side: T.DoubleSide }), tile: 1, lift: 1.4 },
    [MAT.CERAMIC]: { m: std({ map: tex(l9('long_white_tiles', 'diff')), roughness: .35 }), tile: 1.6, lift: 1.5 },
    [MAT.SIGN]: { m: new T.MeshBasicMaterial({ map: signs, toneMapped: false }), tile: 1, lift: 1, signs: true }
  };
  const neon = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const stats = { quads: 0, meshes: 0, emissiveQuads: 0 };
  const signUv = new Map((sector.meta.signs || []).map(([i, u0, v0, u1, v1]) => [i, [u0, v0, u1, v1]]));

  function build(src, filter, material, { tile: t = 2, lift = 1, emissive = false, signsUv = false, dropEvery = 0 }) {
    const idx = []; for (let i = 0; i < src.n; i++) if (filter(src.mat[i]) && !(dropEvery && i % dropEvery === 0)) idx.push(i);
    if (!idx.length) return null;
    const P = new Float32Array(idx.length * 12), N = new Float32Array(idx.length * 12), C = new Float32Array(idx.length * 12), U = new Float32Array(idx.length * 8), I = new Uint32Array(idx.length * 6);
    const s = sector.meta.scale;
    idx.forEach((q, k) => {
      const p = src.pos, b = q * 12;
      const ax = p[b], ay = p[b + 1], az = p[b + 2], ux = p[b + 3] - ax, uy = p[b + 4] - ay, uz = p[b + 5] - az, vx = p[b + 6] - ax, vy = p[b + 7] - ay, vz = p[b + 8] - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const len = Math.hypot(nx, ny, nz) || 1; nx /= len; ny /= len; nz /= len;
      const cr = src.col[q * 3] / 255 * lift, cg = src.col[q * 3 + 1] / 255 * lift, cb = src.col[q * 3 + 2] / 255 * lift;
      for (let v = 0; v < 4; v++) {
        const x = p[b + v * 3] * s, y = p[b + v * 3 + 1] * s, z = p[b + v * 3 + 2] * s, o = k * 12 + v * 3;
        P[o] = x; P[o + 1] = y; P[o + 2] = z; N[o] = nx; N[o + 1] = ny; N[o + 2] = nz; C[o] = Math.min(1, cr); C[o + 1] = Math.min(1, cg); C[o + 2] = Math.min(1, cb);
        const uvo = k * 8 + v * 2;
        if (signsUv) { const r = signUv.get(q) || [0, 0, 1, 1]; U[uvo] = v === 1 || v === 2 ? r[2] : r[0]; U[uvo + 1] = 1 - (v >= 2 ? r[3] : r[1]); }
        else if (Math.abs(ny) > .65) { U[uvo] = x / t; U[uvo + 1] = z / t; }
        else if (Math.abs(nz) > .6) { U[uvo] = x / t; U[uvo + 1] = y / t; }
        else { U[uvo] = z / t; U[uvo + 1] = y / t; }
      }
      const base = k * 4; I.set([base, base + 1, base + 2, base, base + 2, base + 3], k * 6);
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3));
    geo.setAttribute('color', new T.BufferAttribute(C, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2)); geo.setIndex(new T.BufferAttribute(I, 1));
    geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, material); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.receiveShadow = !emissive; mesh.castShadow = false;
    group.add(mesh); stats.meshes++; stats.quads += idx.length; if (emissive) stats.emissiveQuads += idx.length; return mesh;
  }
  for (const [m, f] of Object.entries(FAMILY)) build(sector.world, x => x === +m, f.m, { tile: f.tile, lift: f.lift, signsUv: f.signs, dropEvery: low && +m === MAT.PLANT ? 3 : 0 });
  // Neon tubes, signs and holograms: unlit, slightly brightened so they read as light sources.
  const neonMesh = build(sector.world, x => EMISSIVE.has(x), neon, { lift: 1.45, emissive: true });
  const portal = new T.Group(); portal.position.set(sector.meta.portal.x, sector.meta.portal.y, sector.meta.portal.z); group.add(portal);
  const portalWorld = { ...sector.portal };
  const rebuildInto = (parent, src) => { const before = group.children.length; build(src, x => !EMISSIVE.has(x), FAMILY[MAT.METAL].m, { lift: 1.6 }); build(src, x => EMISSIVE.has(x), neon, { lift: 1.6, emissive: true });
    for (const child of group.children.slice(before)) { group.remove(child); parent.add(child); } };
  rebuildInto(portal, portalWorld);
  // Drones of the visitor page circle over the avenue.
  const droneTemplate = new T.Group(); rebuildInto(droneTemplate, sector.drone);
  const drones = (sector.meta.drones || []).slice(0, low ? 4 : 7).map(d => { const o = droneTemplate.clone(); group.add(o); return { o, ...d }; });
  return { group, stats, neonMesh, portal, drones, FAMILY,
    update(t) {
      portal.rotation.y = t * sector.meta.portal.spin;
      for (const d of drones) d.o.position.set(d.x + Math.sin(t * .65 + d.phase) * d.r, d.y + Math.sin(t * 2 + d.phase) * .35, d.z + Math.cos(t * .65 + d.phase) * d.r);
    } };
}

// Points along neon geometry, for light halos and the light pool: centres of large emissive quads.
export function neonSpots(sector, { minArea = .35, max = 220 } = {}) {
  const out = [], s = sector.meta.scale, src = sector.world;
  for (let q = 0; q < src.n; q++) {
    if (!EMISSIVE.has(src.mat[q])) continue;
    const b = q * 12, p = src.pos;
    const ux = (p[b + 3] - p[b]) * s, uy = (p[b + 4] - p[b + 1]) * s, uz = (p[b + 5] - p[b + 2]) * s, vx = (p[b + 6] - p[b]) * s, vy = (p[b + 7] - p[b + 1]) * s, vz = (p[b + 8] - p[b + 2]) * s;
    const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); if (area < minArea) continue;
    const x = (p[b] + p[b + 6]) / 2 * s, y = (p[b + 1] + p[b + 7]) / 2 * s, z = (p[b + 2] + p[b + 8]) / 2 * s;
    if (out.some(o => Math.hypot(o.x - x, o.y - y, o.z - z) < 4)) continue;
    out.push({ x, y, z, area, r: src.col[q * 3] / 255, g: src.col[q * 3 + 1] / 255, b: src.col[q * 3 + 2] / 255, mat: src.mat[q] });
  }
  return out.sort((a, b) => b.area - a.area).slice(0, max);
}

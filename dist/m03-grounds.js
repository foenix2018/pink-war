// MISSION 03 — defined ground for the plots beside the avenue. The visitor map left them as one bare base plane
// strewn with debris; here every plot is a paved apron with slab joints, the cross street of the lamp row (z −56) is
// a real two-lane boulevard with a median, the service yards have painted bays and hatched keep-clear zones, and the
// sector is closed by a perimeter wall (matching collision boxes are in m03-layout.js: PERIMETER).
// Flat quads a few centimetres under the walking plane: no collision, no effect on the mission.
import { PERIMETER } from './m03-layout.js';

function canvasTexture(T, w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; }
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

// Paved plots [x1, x2, z1, z2] on both sides of the avenue (its pavements end at |x| = 15) and the boulevard.
export const APRONS = Object.freeze([[-77.2, -15.05, -51, 71.2], [-77.2, -15.05, -123, -61], [15.05, 77.2, -29.6, 71.2], [15.05, 62, -51, -29.6], [15.05, 62, -123, -61]]);
export const BOULEVARD = Object.freeze({ z1: -61, z2: -51, median: -56, spans: [[-77.2, -15.05], [15.05, 62]] });

export function createSectorGrounds(T, root, { low = false, rich = false } = {}) {
  const group = new T.Group(); group.name = 'M03 / sols des parcelles, boulevard, enceinte'; root.add(group);
  const r = seeded(5150), Mat = rich ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
  // 8 m of slabs per repeat: 4 m slabs, sawn joints, a few stains and patches.
  const slab = canvasTexture(T, low ? 256 : 512, low ? 256 : 512, (c, w, h) => {
    c.fillStyle = '#5d6369'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { c.globalAlpha = .05 + r() * .07; c.fillStyle = r() < .5 ? '#3a4046' : '#7c838a'; c.fillRect(r() * w, r() * h, 2 + r() * 10, 2 + r() * 10); }
    c.globalAlpha = .1; for (let i = 0; i < 5; i++) { c.fillStyle = '#2c3136'; c.beginPath(); c.ellipse(r() * w, r() * h, 20 + r() * 40, 12 + r() * 26, r() * 3, 0, 6.3); c.fill(); }
    c.globalAlpha = 1; c.fillStyle = '#25292e'; for (const k of [0, .5]) { c.fillRect(k * w - 2, 0, 4, h); c.fillRect(0, k * h - 2, w, 4); }
    c.globalAlpha = .5; c.fillStyle = '#8b9299'; for (const k of [0, .5]) { c.fillRect(k * w + 2, 0, 1, h); c.fillRect(0, k * h + 2, w, 1); } c.globalAlpha = 1;
  });
  const asphalt = canvasTexture(T, 256, 256, (c, w, h) => { c.fillStyle = '#2a2d31'; c.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { c.globalAlpha = .08 + r() * .1; c.fillStyle = r() < .5 ? '#16181b' : '#474c52'; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } c.globalAlpha = 1; });
  const mats = {
    apron: new Mat({ map: slab, roughness: .82, metalness: .02, ...(rich ? { clearcoat: .25, clearcoatRoughness: .5 } : {}) }),
    road: new Mat({ map: asphalt, roughness: .5, metalness: .12, ...(rich ? { clearcoat: .6, clearcoatRoughness: .22 } : {}) }),
    paint: new T.MeshStandardMaterial({ color: 0xd8dcdf, roughness: .6 }), yellow: new T.MeshStandardMaterial({ color: 0xd9a81c, roughness: .6 }),
    kerb: new Mat({ color: 0x8b9096, roughness: .85 }), wall: new Mat({ map: slab, color: 0x9aa0a6, roughness: .9 }), steel: new T.MeshStandardMaterial({ color: 0x3a424b, roughness: .45, metalness: .75 }),
    red: new T.MeshBasicMaterial({ color: 0xff2f45, toneMapped: false })
  };
  for (const m of Object.values(mats)) m.userData.webgpuPhysical = rich && !!m.isMeshPhysicalMaterial;
  const buckets = new Map(), stats = { quads: 0, bays: 0 };
  const bucket = m => { let b = buckets.get(m); if (!b) buckets.set(m, b = { P: [], N: [], U: [], I: [], n: 0 }); return b; };
  // Horizontal quad at height y; uv in metres / tile.
  const flat = (m, x1, x2, z1, z2, y, tile = 8) => { const b = bucket(m); b.P.push(x1, y, z2, x2, y, z2, x2, y, z1, x1, y, z1); for (let k = 0; k < 4; k++) b.N.push(0, 1, 0); b.U.push(x1 / tile, z2 / tile, x2 / tile, z2 / tile, x2 / tile, z1 / tile, x1 / tile, z1 / tile); b.I.push(b.n, b.n + 1, b.n + 2, b.n, b.n + 2, b.n + 3); b.n += 4; stats.quads++; };
  const solid = (m, x1, x2, y1, y2, z1, z2, tile = 8) => { const b = bucket(m), q = (p, n, uv) => { b.P.push(...p); for (let k = 0; k < 4; k++) b.N.push(...n); b.U.push(...uv); b.I.push(b.n, b.n + 1, b.n + 2, b.n, b.n + 2, b.n + 3); b.n += 4; stats.quads++; };
    const w = x2 - x1, d = z2 - z1, u = (a, e) => [a / tile, y1 / tile, e / tile, y1 / tile, e / tile, y2 / tile, a / tile, y2 / tile];
    q([x1, y1, z2, x2, y1, z2, x2, y2, z2, x1, y2, z2], [0, 0, 1], u(x1, x2)); q([x2, y1, z1, x1, y1, z1, x1, y2, z1, x2, y2, z1], [0, 0, -1], u(x1, x2));
    q([x2, y1, z2, x2, y1, z1, x2, y2, z1, x2, y2, z2], [1, 0, 0], u(z1, z2)); q([x1, y1, z1, x1, y1, z2, x1, y2, z2, x1, y2, z1], [-1, 0, 0], u(z1, z2));
    q([x1, y2, z2, x2, y2, z2, x2, y2, z1, x1, y2, z1], [0, 1, 0], [x1 / tile, z2 / tile, x2 / tile, z2 / tile, x2 / tile, z1 / tile, x1 / tile, z1 / tile]); void w; void d; };

  // Aprons.
  for (const [x1, x2, z1, z2] of APRONS) flat(mats.apron, x1, x2, z1, z2, -.045);
  // Boulevard: asphalt, median under the lamp row, kerbs, lane dashes, stop lines and zebra at the avenue.
  const B = BOULEVARD;
  for (const [x1, x2] of B.spans) {
    flat(mats.road, x1, x2, B.z1, B.z2, -.05, 4); solid(mats.kerb, x1, x2, -.05, .1, B.median - .7, B.median + .7);
    for (const z of [B.z1, B.z2]) solid(mats.kerb, x1, x2, -.05, .06, z - .12, z + .12);
    for (const lane of [B.z1 + 2.2, B.z2 - 2.2]) for (let x = x1 + 2; x < x2 - 3; x += 6) flat(mats.paint, x, x + 3, lane - .07, lane + .07, -.04);
    const near = x1 < 0 ? x2 : x1, dir = x1 < 0 ? -1 : 1;
    flat(mats.paint, near + dir * 4.6, near + dir * 5, B.z1 + .4, B.median - .8, -.04); flat(mats.paint, near + dir * 4.6, near + dir * 5, B.median + .8, B.z2 - .4, -.04);
    for (let z = B.z1 + .6; z < B.z2 - .8; z += 1) if (Math.abs(z + .3 - B.median) > 1) flat(mats.paint, near + dir * .8, near + dir * 3.8, z, z + .5, -.04);
  }
  // Service yards: bays against the perimeter wall, hatched keep-clear in front of the warehouse fronts.
  const bays = (x, z1, z2, dir, depth = 5.2) => { for (let z = z1; z <= z2 + .01; z += 2.9) { flat(mats.paint, Math.min(x, x + dir * depth), Math.max(x, x + dir * depth), z - .06, z + .06, -.035); stats.bays++; } flat(mats.paint, x + dir * depth - .06, x + dir * depth + .06, z1, z2, -.035); };
  bays(-76.8, 14, 48.8, 1); bays(76.8, 46, 69.2, -1); bays(-76.8, -118, -92, 1); bays(61.6, -120, -96, -1);
  const hatch = (x1, x2, z1, z2) => { flat(mats.yellow, x1, x2, z1, z1 + .12, -.035); flat(mats.yellow, x1, x2, z2 - .12, z2, -.035); flat(mats.yellow, x1, x1 + .12, z1, z2, -.035); flat(mats.yellow, x2 - .12, x2, z1, z2, -.035);
    for (let z = z1 + 1; z < z2 - .4; z += 1.4) flat(mats.yellow, x1 + .3, x2 - .3, z, z + .14, -.035); };
  hatch(-29.6, -24, -20, -3); hatch(17.2, 22.4, -29, -2); hatch(-22.6, -17.2, -86, -66); hatch(17.2, 21.4, -88, -68);
  // Yellow kerb line where the plots meet the avenue pavements.
  for (const [x1, x2, z1, z2] of APRONS) { const x = x1 < 0 ? x2 : x1; flat(mats.yellow, x - .08, x + .08, z1, z2, -.04); }
  // Perimeter wall: concrete panels with pilasters, a steel capping and a red marker light every 24 m.
  for (const w of PERIMETER) {
    const x1 = w.x - w.hx, x2 = w.x + w.hx, z1 = w.z - w.hz, z2 = w.z + w.hz, H = w.height;
    solid(mats.wall, x1, x2, -.05, H, z1, z2, 4); solid(mats.steel, x1 - .06, x2 + .06, H, H + .1, z1 - .06, z2 + .06);
    const alongX = w.hx > w.hz, len = alongX ? x2 - x1 : z2 - z1;
    for (let k = 0; k <= len; k += 6) { const a = (alongX ? x1 : z1) + Math.min(k, len - .3);
      if (alongX) solid(mats.wall, a - .3, a + .3, -.05, H + .25, z1 - .12, z2 + .12, 4); else solid(mats.wall, x1 - .12, x2 + .12, -.05, H + .25, a - .3, a + .3, 4);
      if (k % 24 === 0) { if (alongX) solid(mats.red, a - .08, a + .08, H + .25, H + .4, (z1 + z2) / 2 - .08, (z1 + z2) / 2 + .08); else solid(mats.red, (x1 + x2) / 2 - .08, (x1 + x2) / 2 + .08, H + .25, H + .4, a - .08, a + .08); } }
  }
  for (const [material, b] of buckets) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(b.P), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(b.N), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.U), 2));
    g.setIndex(new T.BufferAttribute(b.n > 65535 ? new Uint32Array(b.I) : new Uint16Array(b.I), 1)); g.computeBoundingSphere(); g.userData.webgpuShape = 'ground';
    const mesh = new T.Mesh(g, material); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.receiveShadow = true; mesh.userData.webgpuShape = 'ground'; group.add(mesh);
  }
  return { group, stats: () => ({ ...stats, meshes: buckets.size }) };
}

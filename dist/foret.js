// PROTOTYPE — forêt des Sources (chapitre 07 « Mémoires locales », docs/pink-wars/SCENARIO_CH07_MEMOIRES_LOCALES.md).
// Banc d'essai de performance, sans combat : un vallon de 200 × 200 m avec sous-bois, rivière et gué, moulin et
// aqueduc en ruine, cascade, bassin et entrée de grotte praticable. Tout est généré ici (aucun modèle téléchargé).
// Principes : la végétation est dessinée en série (InstancedMesh) par espèce et par niveau de détail ; toutes les
// 0,1 s, chaque instance est rangée dans le bon niveau (proche / moyen / image plate) et écartée si elle sort du
// champ de vision. Le feuillage est découpé (alphaTest), jamais transparent. L'eau défile par décalage de texture,
// sans réflexion calculée. Fonctionne avec WebGPU et avec le repli WebGL ; ?quality=low|high, ?bench=1.
import * as T from './vendor/three.webgpu.min.js';
import {WebGLRenderer} from './vendor/three.module.min.js';
import {createCompatibleRenderer,graphicsProfile,renderPixelRatio} from './renderer-policy.js';

const params = new URLSearchParams(globalThis.location?.search ?? '');
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Value noise (deterministic) for the terrain and the textures.
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v);
}
const fbm = (x, z) => noise(x, z) * .5 + noise(x * 2.1, z * 2.1) * .25 + noise(x * 4.3, z * 4.3) * .125;

// ---------------------------------------------------------------- Terrain ----------------------------------------
export const HALF = 100, CLIFF_Z = -66, CLIFF_H = 18, POOL = { z: -59, r: 9 };
export const riverX = z => 13 * Math.sin(z * .034) + 5 * Math.sin(z * .09 + 1);
const base0 = z => 2.2 - z * .012;                         // the valley falls gently towards the south
export const waterY = z => z < CLIFF_Z - 3 ? base0(-72) + CLIFF_H - .55 : base0(Math.max(z, POOL.z)) - .6;
const PATH = [[6, 96], [4, 76], [riverX(55) - 9, 58], [riverX(55) + 9, 52], [24, 40], [27, 24], [12, 6], [riverX(-10) - 10, -12], [riverX(-35) - 11, -36], [riverX(-55) - 9, -55], [riverX(-62) + 3, -64.5]];
function pathDistance(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// Cave: a curved tunnel that starts behind the waterfall and runs under the plateau.
const CAVE = (() => { const x0 = riverX(-62) + 7.5; return [[x0, -70], [x0 + 1.5, -73.5], [x0 + 5, -80], [x0 + 4, -87], [x0, -92]]; })();
const CAVE_FLOOR = waterY(POOL.z) + .55;
function caveDistance(x, z) {
  let best = 1e9;
  for (let i = 0; i < CAVE.length - 1; i++) {
    const [ax, az] = CAVE[i], [bx, bz] = CAVE[i + 1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
export function terrainHeight(x, z) {
  const d = Math.abs(x - riverX(z)), side = Math.abs(x);
  let h = base0(z) + 7 * smooth(30, 95, side) + (fbm(x * .045, z * .045) - .45) * 2.6;
  h += CLIFF_H * smooth(CLIFF_Z, CLIFF_Z - 6, z) + (z < CLIFF_Z - 6 ? (fbm(x * .08, z * .08) - .5) * 2 : 0);
  // Riverbed (below the waterfall) and channel on the plateau (above).
  const bed = waterY(z) - .85, carve = 1 - smooth(2.5, 6.5, d);
  h = lerp(h, Math.min(h, bed), carve);
  // Plunge pool.
  const pd = Math.hypot(x - riverX(POOL.z), z - POOL.z);
  if (z > CLIFF_Z - 1) h = lerp(h, Math.min(h, waterY(POOL.z) - 1.4), 1 - smooth(POOL.r - 3, POOL.r + 2, pd));
  // A cleft in the cliff leads to the cave mouth.
  if (z < CLIFF_Z + 1 && z > CLIFF_Z - 7) { h = lerp(h, Math.min(h, CAVE_FLOOR - .15), 1 - smooth(2.6, 3.6, Math.abs(x - CAVE[0][0] - 1.5 * clamp((CAVE[0][1] - z) / 5, 0, 1)))); }
  // Paths are flattened a little.
  const p = pathDistance(x, z); if (p < 2.2 && z > CLIFF_Z) h = lerp(h, base0(z) + (fbm(x * .045, z * .045) - .45) * 1.2 + 7 * smooth(30, 95, side), (1 - p / 2.2) * .45);
  return h;
}
// Walking height: the cave floor wins inside the tunnel footprint.
export function groundHeight(x, z) { return z < CLIFF_Z && caveDistance(x, z) < 2 ? CAVE_FLOOR : terrainHeight(x, z); }
export function zoneAt(x, z) {
  if (z < CLIFF_Z && caveDistance(x, z) < 2.6) return 'La grotte';
  if (Math.hypot(x - riverX(POOL.z), z - POOL.z) < 20) return 'Derrière la cascade';
  if (z > 8 && z < 44 && x > 8) return 'Le moulin et l’aqueduc';
  if (z > 44 && z < 66) return 'Le gué';
  if (z > 76) return 'La lisière';
  return 'Sous le couvert';
}

// ---------------------------------------------------------------- Textures --------------------------------------
function canvasTexture(w, h, draw, { repeat = 1, alpha = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  if (repeat !== 1) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); }
  if (alpha) t.premultiplyAlpha = false; return t;
}
const groundDetail = () => canvasTexture(256, 256, (g, w, h) => {
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x * .06, y * .06) * .6 + hash(x, y) * .4, v = 150 + n * 105, i = (y * w + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, { repeat: 48 });
const stoneTexture = () => canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#8d8a80'; g.fillRect(0, 0, w, h); const r = rng(7);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 5; col++) {
    const x = col * 52 + (row % 2) * 26, y = row * 32, s = 105 + r() * 50;
    g.fillStyle = `rgb(${s},${s - 4},${s - 14})`; g.fillRect(x + 2, y + 2, 48, 28);
    g.fillStyle = `rgba(60,90,40,${r() * .5})`; g.fillRect(x + 2, y + 2 + r() * 14, 48, 6 + r() * 8);
  }
  g.strokeStyle = 'rgba(40,40,36,.55)'; g.lineWidth = 3;
  for (let row = 0; row <= 8; row++) { g.beginPath(); g.moveTo(0, row * 32); g.lineTo(w, row * 32); g.stroke(); }
});
const waterTexture = (streak) => canvasTexture(128, 256, (g, w, h) => {
  g.fillStyle = streak ? 'rgba(220,240,245,0.42)' : '#2f6a73'; g.fillRect(0, 0, w, h); const r = rng(streak ? 3 : 5);
  for (let i = 0; i < (streak ? 190 : 90); i++) {
    const x = r() * w, y = r() * h, len = streak ? 30 + r() * 120 : 6 + r() * 18;
    g.strokeStyle = streak ? `rgba(235,248,255,${.25 + r() * .55})` : `rgba(170,215,220,${.15 + r() * .35})`;
    g.lineWidth = streak ? 1 + r() * 3 : 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (streak ? 0 : (r() - .5) * 10), y + len); g.stroke();
  }
}, { alpha: streak });
function plantTexture(kind) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = rng(kind.length * 31);
    if (kind === 'fern') {
      for (let f = 0; f < 7; f++) {
        const a = -Math.PI / 2 + (f - 3) * .32, len = 50 + r() * 14; g.strokeStyle = '#3f6b2a'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(64, 126); const ex = 64 + Math.cos(a) * len, ey = 126 + Math.sin(a) * len; g.quadraticCurveTo(64 + Math.cos(a) * len * .5, 126 + Math.sin(a) * len * .7, ex, ey); g.stroke();
        for (let k = 1; k < 12; k++) {
          const t = k / 12, px = lerp(64, ex, t), py = lerp(126, ey, t), l = (1 - t) * 13 + 2;
          g.fillStyle = `rgb(${60 + r() * 30},${110 + r() * 40},${40 + r() * 20})`;
          for (const s of [-1, 1]) { g.beginPath(); g.ellipse(px + Math.cos(a + s * 1.3) * l * .6, py + Math.sin(a + s * 1.3) * l * .6, l * .7, 2.2, a + s * 1.3, 0, TAU); g.fill(); }
        }
      }
    } else if (kind === 'grass') {
      for (let b = 0; b < 46; b++) {
        const x = 8 + r() * 112, top = 20 + r() * 70, bend = (r() - .5) * 22; g.strokeStyle = `rgb(${70 + r() * 50},${120 + r() * 50},${40 + r() * 25})`; g.lineWidth = 1.5 + r() * 1.5;
        g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + bend * .3, (128 + top) / 2, x + bend, top); g.stroke();
      }
    } else {
      // Far tree impostor: conifer or broadleaf silhouette with shading.
      const conifer = kind === 'imp-conifer';
      g.fillStyle = '#4a3423'; g.fillRect(60, 96, 8, 32);
      for (let i = 0; i < 900; i++) {
        let x, y, inside;
        do {
          x = r() * w; y = r() * 112;
          inside = conifer ? Math.abs(x - 64) < (y / 112) * 46 + 2 && y > 4 : Math.hypot((x - 64) / 54, (y - 52) / 50) < 1 - r() * .12;
        } while (!inside);
        const light = (1 - x / w) * .35 + (1 - y / 112) * .25;
        g.fillStyle = conifer ? `rgb(${30 + light * 60},${68 + light * 80},${42 + light * 40})` : `rgb(${52 + light * 70},${92 + light * 90},${38 + light * 30})`;
        g.beginPath(); g.arc(x, y, 3 + r() * 4, 0, TAU); g.fill();
      }
    }
  }, { alpha: true });
}

// ---------------------------------------------------------------- Geometry builders ------------------------------
function paint(geometry, color, jitter = 0, seed = 1) {
  const r = rng(seed), p = geometry.attributes.position, c = new Float32Array(p.count * 3), col = new T.Color(color);
  for (let i = 0; i < p.count; i++) { const k = 1 + (r() - .5) * jitter; c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; }
  geometry.setAttribute('color', new T.BufferAttribute(c, 3)); return geometry;
}
function merge(parts) {
  const geos = parts.map(g => g.index ? g.toNonIndexed() : g);
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of geos) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count;
  }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('color', new T.BufferAttribute(col, 3));
  out.computeBoundingSphere(); return out;
}
function lumpy(geometry, amount, seed) {
  const r = rng(seed), p = geometry.attributes.position, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + (noise(v.x * 2 + seed, v.y * 2 + v.z * 2) - .5) * amount + (r() - .5) * amount * .3; p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  geometry.computeVertexNormals(); return geometry;
}
function conifer(lod) {
  const parts = [paint(new T.CylinderGeometry(.18, .3, 3, lod ? 5 : 7).translate(0, 1.5, 0), 0x4b3424, .2, 3)];
  const tiers = lod ? 3 : 5, seg = lod ? 6 : 9;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, rad = 2.6 * (1 - t * .75), y = 2.2 + i * (lod ? 2.2 : 1.35);
    parts.push(paint(lumpy(new T.ConeGeometry(rad, lod ? 3.2 : 2.6, seg, 1, true), lod ? .1 : .22, i + 3).translate(0, y + 1.2, 0), 0x2c5a37, .35, 11 + i));
  }
  return merge(parts);
}
function broadleaf(lod) {
  const parts = [paint(new T.CylinderGeometry(.22, .38, 3.4, lod ? 5 : 7).translate(0, 1.7, 0), 0x5a4330, .2, 5)];
  if (!lod) for (const [a, l] of [[.6, 1.6], [-.8, 1.4], [2.2, 1.5]]) parts.push(paint(new T.CylinderGeometry(.07, .14, l, 5).translate(0, l / 2, 0).rotateZ(.7).rotateY(a).translate(0, 2.8, 0), 0x5a4330, .2, 7));
  const blobs = lod ? [[0, 5, 0, 2.8]] : [[0, 5.2, 0, 2.3], [1.3, 4.4, .4, 1.7], [-1.2, 4.6, -.5, 1.8], [.2, 6.3, -.3, 1.6]];
  blobs.forEach(([x, y, z, s], i) => parts.push(paint(lumpy(new T.IcosahedronGeometry(s, lod ? 0 : 1), .35, i + 20).translate(x, y, z), 0x3f7a33, .4, 30 + i)));
  return merge(parts);
}
function withUV(parts) {
  const geos = parts.map(g => g.toNonIndexed()); let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o * 3); uv.set(g.attributes.uv.array, o * 2); const c = g.attributes.position.count; for (let i = 0; i < c; i++) nor.set([0, 1, 0], (o + i) * 3); o += c; }
  // Plants and impostors are lit from above whatever side is seen: no dark back faces.
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.computeBoundingSphere(); return out;
}
const rock = (seed, detail = 2) => {
  const g = paint(lumpy(new T.IcosahedronGeometry(1, detail), .5, seed).scale(1, .62, 1), 0x77756c, .3, seed), p = g.attributes.position, c = g.attributes.color, mossy = new T.Color(0x4f6b2e);
  for (let i = 0; i < p.count; i++) { const k = smooth(.15, .55, p.getY(i)) * .8; c.setXYZ(i, lerp(c.getX(i), mossy.r, k), lerp(c.getY(i), mossy.g, k), lerp(c.getZ(i), mossy.b, k)); }
  return g;
};

// ---------------------------------------------------------------- Instanced vegetation with LOD ------------------
// Each kind keeps its instances (position, rotation, scale, tint) and three meshes (near, mid, far). update() files
// every visible instance into one of them; invisible ones are skipped entirely.
function vegetation(scene, kind, instances, meshes, { near, mid, far, radius = 4 }) {
  const m4 = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), up = new T.Vector3(0, 1, 0), col = new T.Color(), sphere = new T.Sphere();
  for (const m of meshes) if (m) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  return {
    kind, count: instances.length, visible: 0,
    update(camera, frustum, quality) {
      const counts = meshes.map(() => 0); const cx = camera.position.x, cz = camera.position.z;
      const nearD = near * quality, midD = mid * quality, farD = far;
      for (const it of instances) {
        const d = Math.hypot(it.x - cx, it.z - cz); if (d > farD) continue;
        sphere.center.set(it.x, it.y + radius * it.s, it.z); sphere.radius = radius * 1.6 * it.s;
        if (!frustum.intersectsSphere(sphere)) continue;
        const level = d < nearD ? 0 : d < midD ? 1 : 2, mesh = meshes[level]; if (!mesh) continue;
        const i = counts[level]++; if (i >= mesh.instanceMatrix.count) continue;
        q.setFromAxisAngle(up, level === 2 ? Math.atan2(cx - it.x, cz - it.z) : it.r);
        m4.compose(p.set(it.x, it.y, it.z), q, s.set(it.s, it.s, it.s)); mesh.setMatrixAt(i, m4);
        if (mesh.instanceColor) mesh.setColorAt(i, col.setScalar(it.tint));
      }
      let visible = 0;
      meshes.forEach((m, i) => { if (!m) return; m.count = Math.min(counts[i], m.instanceMatrix.count); visible += m.count; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
      this.visible = visible;
    }
  };
}
function instanced(geometry, material, max, { shadow = false } = {}) {
  const m = new T.InstancedMesh(geometry, material, max); m.instanceMatrix.setUsage(T.DynamicDrawUsage);
  m.setColorAt(0, new T.Color(1, 1, 1)); m.castShadow = shadow; m.receiveShadow = false; return m;
}

// ---------------------------------------------------------------- World ------------------------------------------
export function scatter(seed = 42) {
  const r = rng(seed), trees = [], ferns = [], grass = [], rocks = [];
  const free = (x, z, margin) => {
    const d = Math.abs(x - riverX(z));
    if (d < 7 + margin || pathDistance(x, z) < 3 + margin) return false;
    if (Math.hypot(x - riverX(POOL.z), z - POOL.z) < POOL.r + 6) return false;
    if (z > CLIFF_Z - 9 && z < CLIFF_Z + 2) return false;                         // cliff face
    if (x > 12 && x < 42 && z > 12 && z < 40) return false;                       // mill clearing
    if (Math.abs(z - 31) < 3.5 && x > -32 && x < 44) return false;                // under the aqueduct
    return true;
  };
  for (let i = 0; i < 9000 && trees.length < 2600; i++) {
    const x = (r() - .5) * 2 * (HALF - 2), z = (r() - .5) * 2 * (HALF - 2);
    if (!free(x, z, 1.5) || fbm(x * .05 + 9, z * .05) < .36) continue;
    trees.push({ x, z, y: terrainHeight(x, z) - .1, r: r() * TAU, s: .75 + r() * .7, tint: .8 + r() * .35, conifer: z < -20 ? r() < .7 : r() < .35 });
  }
  for (let i = 0; i < 14000 && ferns.length < 6000; i++) {
    const x = (r() - .5) * 2 * HALF, z = (r() - .5) * 2 * HALF; if (!free(x, z, -2.5)) continue;
    ferns.push({ x, z, y: terrainHeight(x, z) - .05, r: r() * TAU, s: .6 + r() * .7, tint: .75 + r() * .4 });
  }
  for (let i = 0; i < 26000 && grass.length < 12000; i++) {
    const x = (r() - .5) * 2 * HALF, z = (r() - .5) * 2 * HALF; if (!free(x, z, -4.5) && Math.abs(x - riverX(z)) < 4.5) continue;
    if (z < CLIFF_Z) continue;
    grass.push({ x, z, y: terrainHeight(x, z) - .03, r: r() * TAU, s: .6 + r() * .6, tint: .8 + r() * .35 });
  }
  for (let i = 0; i < 520; i++) {
    const z = (r() - .5) * 2 * HALF, near = r() < .55, x = near ? riverX(z) + (r() - .5) * 15 : (r() - .5) * 2 * HALF;
    if (pathDistance(x, z) < 2.5) continue;
    rocks.push({ x, z, y: terrainHeight(x, z) - .15, r: r() * TAU, s: .4 + r() * 1.5, tint: .75 + r() * .35 });
  }
  // The ford: stepping stones across the river.
  for (let k = 0; k <= 7; k++) { const t = k / 7, z = lerp(57, 53, t), x = lerp(riverX(55) - 6, riverX(55) + 6, t); rocks.push({ x, z, y: waterY(z) - .35, r: k, s: .9, tint: .9, step: true }); }
  return { trees, ferns, grass, rocks };
}

function terrainMesh(quality) {
  const seg = quality === 'low' ? 140 : 220, g = new T.PlaneGeometry(HALF * 2, HALF * 2, seg, seg).rotateX(-Math.PI / 2), p = g.attributes.position;
  const c = new Float32Array(p.count * 3), moss = new T.Color(0x47612f), grassC = new T.Color(0x5d7a36), mud = new T.Color(0x5b4a35), stone = new T.Color(0x77736a), dirt = new T.Color(0x806a4b), k = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainHeight(x, z); p.setY(i, h);
    const slope = Math.min(1, (Math.abs(terrainHeight(x + 1, z) - h) + Math.abs(terrainHeight(x, z + 1) - h)) * .55);
    k.copy(grassC).lerp(moss, fbm(x * .07, z * .07));
    if (Math.abs(x - riverX(z)) < 6.5) k.lerp(mud, 1 - smooth(3.5, 6.5, Math.abs(x - riverX(z))));
    k.lerp(stone, smooth(.35, .8, slope));
    const pd = pathDistance(x, z); if (pd < 2.2 && z > CLIFF_Z) k.lerp(dirt, (1 - pd / 2.2) * .85);
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map: groundDetail(), roughness: .95 })); m.receiveShadow = true; m.name = 'terrain'; return m;
}
function riverMesh() {
  // Ribbon below the waterfall, a channel on the plateau; uv.y runs along the flow.
  const make = (z0, z1, width, step) => {
    const pos = [], uv = [], idx = []; let n = 0, along = 0, prev = null;
    for (let z = z0; z <= z1 + 1e-6; z += step) {
      const x = riverX(z), y = waterY(z); if (prev) along += Math.hypot(x - prev[0], z - prev[1]); prev = [x, z];
      const w = z < CLIFF_Z ? width * .7 : Math.hypot(x - riverX(POOL.z), z - POOL.z) < POOL.r ? width * 1.6 : width;
      pos.push(x - w / 2, y, z, x + w / 2, y, z); uv.push(0, along / 7, 1, along / 7);
      if (n) idx.push(n * 2 - 2, n * 2, n * 2 - 1, n * 2 - 1, n * 2, n * 2 + 1); n++;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const tex = waterTexture(false); tex.wrapS = tex.wrapT = T.RepeatWrapping;
  const mat = new T.MeshStandardMaterial({ map: tex, color: 0x9fd0d4, roughness: .12, metalness: .15, transparent: true, opacity: .86, depthWrite: false });
  const group = new T.Group(); group.name = 'rivière';
  group.add(new T.Mesh(make(POOL.z - 2, HALF, 11, 1.5), mat), new T.Mesh(make(-HALF, CLIFF_Z - 4, 7, 2), mat));
  const pool = new T.Mesh(new T.CircleGeometry(POOL.r + 1.5, 40).rotateX(-Math.PI / 2), mat); pool.position.set(riverX(POOL.z), waterY(POOL.z) + .01, POOL.z); group.add(pool);
  return { group, tex };
}
function waterfall(scene, quality) {
  const xw = (riverX(CLIFF_Z - 6) + riverX(POOL.z)) / 2, top = waterY(CLIFF_Z - 6) + .2, bottom = waterY(POOL.z), h = top - bottom;
  // The curtain leaves the lip of the cliff and falls slightly outwards, in front of the rock face.
  const curtain = new T.PlaneGeometry(1, 1, 12, 16), cp = curtain.attributes.position;
  for (let k = 0; k < cp.count; k++) {
    const u = cp.getX(k) + .5, t = .5 - cp.getY(k), x = xw + (u - .5) * lerp(7, 9.5, t), bow = Math.sin(u * Math.PI) * .8;
    cp.setXYZ(k, x, lerp(top, bottom, t), lerp(CLIFF_Z - 6.6, CLIFF_Z + .2, Math.pow(t, .8)) + bow);
  }
  curtain.computeVertexNormals();
  const t1 = waterTexture(true), t2 = waterTexture(true); for (const t of [t1, t2]) { t.wrapS = t.wrapT = T.RepeatWrapping; } t1.repeat.set(3, 1.5); t2.repeat.set(5, 2.4);
  const mk = (tex, opacity) => new T.Mesh(curtain, new T.MeshStandardMaterial({ map: tex, color: 0xf2fbff, transparent: true, opacity, depthWrite: false, side: T.DoubleSide, roughness: .3, emissive: 0x30474d }));
  const back = mk(t1, .95), front = mk(t2, .7); scene.add(back, front); front.position.z = .25;
  // Mist and foam: a few hundred points that rise and fade, recycled.
  const count = quality === 'low' ? 160 : 420, pos = new Float32Array(count * 3), seeds = new Float32Array(count), r = rng(9);
  for (let i = 0; i < count; i++) seeds[i] = r();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const puff = canvasTexture(64, 64, (c, w) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, { alpha: true });
  const mist = new T.Points(g, new T.PointsMaterial({ map: puff, size: 1.6, transparent: true, opacity: .55, depthWrite: false, color: 0xeef8fb, sizeAttenuation: true }));
  mist.frustumCulled = false; scene.add(mist);
  return {
    x: xw, z: POOL.z - 7, update(t) {
      t1.offset.y = (t * .9) % 1; t2.offset.y = (t * 1.6) % 1;
      for (let i = 0; i < count; i++) {
        const life = (t * .35 + seeds[i]) % 1, a = seeds[i] * TAU * 7;
        pos[i * 3] = xw + Math.cos(a) * (2 + life * 5) * (seeds[(i + 7) % count] + .4); pos[i * 3 + 1] = bottom + life * 4.5; pos[i * 3 + 2] = POOL.z - 6 + Math.sin(a) * (1.5 + life * 3);
      }
      g.attributes.position.needsUpdate = true;
    }
  };
}
function ruins(scene, colliders) {
  const tex = stoneTexture(); tex.wrapS = tex.wrapT = T.RepeatWrapping;
  const stone = new T.MeshStandardMaterial({ map: tex, color: 0xb9b3a2, roughness: .92 }), moss = new T.MeshStandardMaterial({ color: 0x4d6a30, roughness: 1 });
  const group = new T.Group(); group.name = 'ruines'; scene.add(group);
  const block = (w, h, d, x, z, y = null, ry = 0, mat = stone) => {
    const geo = new T.BoxGeometry(w, h, d); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 3, uv.getY(i) * h / 3);
    const m = new T.Mesh(geo, mat); const gy = y ?? terrainHeight(x, z) - .3; m.position.set(x, gy + h / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m);
    colliders.push({ x, z, hx: w / 2 + .35, hz: d / 2 + .35, ry, top: gy + h }); return m;
  };
  // The mill: four broken walls, a fallen gable, the wheel axle.
  const mx = 30, mz = 24;
  block(12, 5.5, .8, mx, mz - 5); block(5, 3.2, .8, mx - 3.5, mz + 5); block(3, 6.2, .8, mx + 4.5, mz + 5);
  block(.8, 4.4, 10, mx - 6, mz); block(.8, 2.2, 6, mx + 6, mz - 2);
  block(3, .6, 2, mx + 2, mz + 1.5, null, .4); block(1.6, 1.2, 1.4, mx - 2, mz + 2.5, null, .9); block(2.2, .8, 1.2, mx + 8.5, mz + 7, null, .2);
  const wheel = new T.Mesh(new T.TorusGeometry(2.4, .25, 6, 18), new T.MeshStandardMaterial({ color: 0x4b3a2a, roughness: .9 })); wheel.position.set(mx - 7.4, terrainHeight(mx - 7, mz) + 2, mz + 1); wheel.rotation.set(0, Math.PI / 2, .3); group.add(wheel);
  // The aqueduct over the river: piers and arches, a gap where it fell.
  const az = 31, y0 = 8.4;
  for (let i = 0; i < 9; i++) {
    const x = -30 + i * 8.5; if (i === 4) continue;
    const g = terrainHeight(x, az); block(1.6, y0 - g + 1, 2.2, x, az, g - .6);
    if (i < 8 && i !== 3) {
      const arch = new T.Mesh(new T.TorusGeometry(3.45, .55, 6, 14, Math.PI), stone); arch.position.set(x + 4.25, y0 - .4, az); arch.scale.set(1, .85, 2); arch.castShadow = true; group.add(arch);
      block(8.5, 1.3, 2.4, x + 4.25, az, y0);
    }
  }
  for (const [x, z, s] of [[5.5, 33, 1.4], [8, 28.5, 1.1], [3.2, 29, .9]]) { const b = block(2 * s, 1.2 * s, 1.5 * s, x, z, null, x); b.rotation.z = .4; }
  // Moss caps.
  for (const m of [...group.children]) if (m.geometry?.type === 'BoxGeometry' && m.scale.y > 0) { const cap = new T.Mesh(new T.BoxGeometry(m.geometry.parameters.width + .1, .12, m.geometry.parameters.depth + .1), moss); cap.position.copy(m.position); cap.position.y += m.geometry.parameters.height / 2; cap.rotation.y = m.rotation.y; group.add(cap); }
  return group;
}
function cave(scene) {
  const pts = CAVE.map(([x, z], i) => new T.Vector3(x, CAVE_FLOOR + 1.9 - i * .15, z));
  const curve = new T.CatmullRomCurve3(pts), geo = new T.TubeGeometry(curve, 48, 2.3, 12, false);
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = fbm(v.x * .6, v.z * .6 + v.y), k = .07 + n * .12, wet = v.y < CAVE_FLOOR + .4 ? .08 : 0;
    p.setXYZ(i, v.x + (n - .5) * .7, v.y + (n - .5) * .4, v.z + (noise(v.y, v.x) - .5) * .6); c[i * 3] = k; c[i * 3 + 1] = k * .97 + wet; c[i * 3 + 2] = k * .92 + wet * 1.5;
  }
  geo.setAttribute('color', new T.BufferAttribute(c, 3)); geo.computeVertexNormals();
  const tube = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, side: T.BackSide, roughness: .85 })); tube.name = 'grotte'; scene.add(tube);
  // Mouth: a rough rock arch, and the independent relay glowing at the far end.
  const relay = new T.Mesh(new T.BoxGeometry(.9, 1.6, .5), new T.MeshStandardMaterial({ color: 0x223038, emissive: 0x3fd0ff, emissiveIntensity: 1.6 }));
  const end = curve.getPoint(.97); relay.position.set(end.x, CAVE_FLOOR + .8, end.z); scene.add(relay);
  const glow = new T.PointLight(0x58d8ff, 6, 14, 1.6); glow.position.set(end.x, CAVE_FLOOR + 1.6, end.z + 1); scene.add(glow);
  return { relay, glow };
}
function sky(scene) {
  const g = new T.SphereGeometry(600, 24, 12), p = g.attributes.position, c = new Float32Array(p.count * 3), top = new T.Color(0x6f9fc4), hz = new T.Color(0xcfd8c6), k = new T.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 600; k.copy(hz).lerp(top, clamp(y * 1.6, 0, 1)); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  g.setAttribute('color', new T.BufferAttribute(c, 3));
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); m.renderOrder = -1; scene.add(m); return m;
}
function sunbeams(scene) {
  // Light shafts in the clearings: additive tapered quads, very cheap.
  const tex = canvasTexture(32, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(.25, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { alpha: true });
  const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: .55 });
  for (const [x, z] of [[18, 70], [-22, 30], [30, 24], [-6, -20], [riverX(-48) + 8, -48]]) {
    const m = new T.Mesh(new T.PlaneGeometry(3.5, 22), mat); m.position.set(x, terrainHeight(x, z) + 10, z); m.rotation.set(0, .6, .35); scene.add(m);
    const m2 = m.clone(); m2.rotation.y += Math.PI / 2; scene.add(m2);
  }
}

// ---------------------------------------------------------------- Player and controls ----------------------------
function controls(canvas) {
  const keys = new Set(), look = { yaw: 0, pitch: 0 }, move = { x: 0, z: 0 }, touch = new Map();
  addEventListener('keydown', e => keys.add(e.code)); addEventListener('keyup', e => keys.delete(e.code));
  canvas.addEventListener('click', () => { if (!matchMedia('(pointer:coarse)').matches) canvas.requestPointerLock?.(); });
  addEventListener('mousemove', e => { if (document.pointerLockElement !== canvas) return; look.yaw -= e.movementX * .0023; look.pitch = clamp(look.pitch - e.movementY * .0023, -1.3, 1.3); });
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') return; touch.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, left: e.clientX < innerWidth / 2 }); });
  canvas.addEventListener('pointermove', e => {
    const t = touch.get(e.pointerId); if (!t) return;
    if (t.left) { move.x = clamp((e.clientX - t.sx) / 60, -1, 1); move.z = clamp((e.clientY - t.sy) / 60, -1, 1); }
    else { look.yaw -= (e.clientX - t.x) * .005; look.pitch = clamp(look.pitch - (e.clientY - t.y) * .005, -1.3, 1.3); }
    t.x = e.clientX; t.y = e.clientY;
  });
  const end = e => { const t = touch.get(e.pointerId); if (t?.left) move.x = move.z = 0; touch.delete(e.pointerId); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  return {
    look, input() {
      let x = move.x, z = move.z;
      if (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp')) z -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const l = Math.hypot(x, z); return { x: l > 1 ? x / l : x, z: l > 1 ? z / l : z, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    }
  };
}
function blockedBy(x, z, colliders, trunks) {
  for (const c of colliders) {
    const dx = x - c.x, dz = z - c.z, cos = Math.cos(-c.ry), sin = Math.sin(-c.ry), lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) return true;
  }
  const cell = trunks.get(`${Math.floor(x / 6)},${Math.floor(z / 6)}`);
  if (cell) for (const t of cell) if (Math.hypot(x - t.x, z - t.z) < .55 * t.s + .35) return true;
  return false;
}

// ---------------------------------------------------------------- Boot -------------------------------------------
export async function boot() {
  const quality = ['low', 'balanced', 'high'].includes(params.get('quality')) ? params.get('quality') : (matchMedia('(pointer:coarse)').matches ? 'low' : 'balanced');
  const profile = graphicsProfile({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, platform: navigator.platform, gpu: !!navigator.gpu, rendererHint: params.get('renderer') }, quality);
  const { renderer, canvas } = await createCompatibleRenderer({ canvas: $('game'), WebGPU: T.WebGPURenderer, WebGL: WebGLRenderer, profile });
  const backend = renderer.isWebGLRenderer ? 'WebGL' : renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGPU (repli WebGL2)';
  renderer.setPixelRatio(renderPixelRatio(profile, devicePixelRatio, innerWidth, innerHeight)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const shadows = quality === 'high'; renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(); scene.fog = new T.FogExp2(0xb8c7b4, quality === 'low' ? .019 : .014);
  const camera = new T.PerspectiveCamera(70, innerWidth / innerHeight, .1, 650);
  const skyDome = sky(scene);
  const hemi = new T.HemisphereLight(0xcfe4f2, 0x3a4a2a, 1.5); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff0d4, 2.4); sun.position.set(40, 70, 30); scene.add(sun, sun.target);
  if (shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 }); sun.shadow.bias = -.0006; }
  scene.add(terrainMesh(quality));
  const river = riverMesh(); scene.add(river.group);
  const fall = waterfall(scene, quality), colliders = [];
  ruins(scene, colliders); const grotte = cave(scene); sunbeams(scene);

  // Vegetation.
  const world = scatter(42), Q = { low: .65, balanced: 1, high: 1.35 }[quality];
  const leaf = new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  const imp = kind => new T.MeshStandardMaterial({ map: plantTexture(kind), alphaTest: .5, roughness: 1 });
  const plant = kind => new T.MeshStandardMaterial({ map: plantTexture(kind), alphaTest: .45, roughness: 1 });
  const con = world.trees.filter(t => t.conifer), brd = world.trees.filter(t => !t.conifer);
  const impostor = (w, h) => withUV([new T.PlaneGeometry(w, h).translate(0, h / 2, 0), new T.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(Math.PI)]);
  const kinds = [
    vegetation(scene, 'conifères', con, [instanced(conifer(0), leaf, con.length, { shadow: shadows }), instanced(conifer(1), leaf, con.length, { shadow: shadows }), instanced(impostor(6, 10.5), imp('imp-conifer'), con.length)], { near: 28, mid: 62, far: 260, radius: 4 }),
    vegetation(scene, 'feuillus', brd, [instanced(broadleaf(0), leaf, brd.length, { shadow: shadows }), instanced(broadleaf(1), leaf, brd.length, { shadow: shadows }), instanced(impostor(7.5, 8.5), imp('imp-broadleaf'), brd.length)], { near: 28, mid: 62, far: 260, radius: 4 }),
    vegetation(scene, 'fougères', world.ferns, [instanced(withUV([0, 1, 2, 3, 4, 5].map(i => new T.PlaneGeometry(1.4, 1.1).translate(0, .55, 0).rotateY(i * Math.PI / 3 + (i > 2 ? Math.PI : 0)))), plant('fern'), 3500), null, null], { near: 32, mid: 32, far: 32, radius: .7 }),
    vegetation(scene, 'herbes', world.grass, [instanced(withUV([0, 1, 2, 3].map(i => new T.PlaneGeometry(1.2, .7).translate(0, .35, 0).rotateY(i * Math.PI / 2))), plant('grass'), 6000), null, null], { near: 22, mid: 22, far: 22, radius: .4 }),
    vegetation(scene, 'rochers', world.rocks, [instanced(rock(3, 2), new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 }), world.rocks.length), instanced(rock(5, 1), new T.MeshStandardMaterial({ vertexColors: true, roughness: .95 }), world.rocks.length), null], { near: 45, mid: 140, far: 140, radius: 1 })
  ];
  const trunks = new Map(); for (const t of world.trees) { const k = `${Math.floor(t.x / 6)},${Math.floor(t.z / 6)}`; (trunks.get(k) || trunks.set(k, []).get(k)).push(t); }

  // Player.
  const ctl = controls(canvas), player = { x: 6, z: 96, y: 0 }; ctl.look.yaw = 0;
  const frustum = new T.Frustum(), pv = new T.Matrix4();
  let audio = null;
  function startAudio() {
    if (audio) return; try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(), buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const gain = ctx.createGain(); gain.gain.value = 0; src.connect(f).connect(gain).connect(ctx.destination); src.start(); audio = { ctx, gain };
    } catch {}
  }
  addEventListener('pointerdown', startAudio, { once: true }); addEventListener('keydown', startAudio, { once: true });

  // Bench: an automatic walk along the path, frame times recorded.
  const bench = params.get('bench') ? { t: 0, frames: [], done: false, duration: Number(params.get('bench')) > 1 ? Number(params.get('bench')) : 40 } : null;
  const route = new T.CatmullRomCurve3([...PATH.map(([x, z]) => new T.Vector3(x, 0, z)), new T.Vector3(CAVE[1][0], 0, CAVE[1][1]), new T.Vector3(CAVE[3][0], 0, CAVE[3][1])]);

  let last = performance.now(), refresh = 0, fpsAcc = 0, fpsN = 0, fps = 0, time = 0;
  const hud = $('hud'), zone = $('zone');
  const stats = () => ({ backend, quality, fps: Math.round(fps), calls: renderer.info.render.drawCalls ?? renderer.info.render.calls, triangles: renderer.info.render.triangles,
    instances: Object.fromEntries(kinds.map(k => [k.kind, k.visible])), total: Object.fromEntries(kinds.map(k => [k.kind, k.count])), zone: zoneAt(player.x, player.z), player: { ...player } });
  function frame(now) {
    const raw = now - last, dt = Math.min(.05, raw / 1000); last = now; time += dt;
    if (bench && !bench.done) {
      bench.t += dt; const u = clamp(bench.t / bench.duration, 0, 1), p = route.getPointAt(u), q = route.getPointAt(Math.min(1, u + .01));
      player.x = p.x; player.z = p.z; ctl.look.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); ctl.look.pitch = -.05; if (bench.t > .5) bench.frames.push(raw);
      if (u >= 1) { bench.done = true; const f = [...bench.frames].sort((a, b) => a - b); bench.result = { frames: f.length, avgMs: f.reduce((a, b) => a + b, 0) / f.length, p95Ms: f[Math.floor(f.length * .95)], ...stats(), calls: bench.maxCalls, triangles: bench.maxTris, avgTriangles: Math.round(bench.sumTris / bench.n) }; }
    } else {
      const inp = ctl.input(), sp = (inp.run ? 7 : 3.6) * (Math.abs(player.x - riverX(player.z)) < 4 && player.z > CLIFF_Z ? .55 : 1);
      const sin = Math.sin(ctl.look.yaw), cos = Math.cos(ctl.look.yaw), dx = (inp.x * cos + inp.z * sin) * sp * dt, dz = (-inp.x * sin + inp.z * cos) * sp * dt;
      const tryMove = (nx, nz) => {
        if (Math.abs(nx) > HALF - 1 || Math.abs(nz) > HALF - 1) return false;
        const inCave = nz < CLIFF_Z && caveDistance(nx, nz) < 2, gh = groundHeight(nx, nz);
        if (!inCave && gh - player.y > 1.2 && player.y > 0) return false;     // the cliff is not climbable
        if (nz < CLIFF_Z - 1 && !inCave && player.z >= CLIFF_Z - 1 && caveDistance(player.x, player.z) >= 2) return false;
        if (blockedBy(nx, nz, colliders, trunks)) return false; player.x = nx; player.z = nz; return true;
      };
      if (!tryMove(player.x + dx, player.z + dz)) { tryMove(player.x + dx, player.z); tryMove(player.x, player.z + dz); }
    }
    const gy = groundHeight(player.x, player.z), wy = Math.abs(player.x - riverX(player.z)) < 6 ? waterY(player.z) - .45 : -1e9;
    player.y = lerp(player.y || gy, Math.max(gy, wy), Math.min(1, dt * 12));
    camera.position.set(player.x, player.y + 1.65, player.z); camera.rotation.set(ctl.look.pitch, ctl.look.yaw, 0, 'YXZ');
    skyDome.position.copy(camera.position);
    camera.updateMatrixWorld(); pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    if ((refresh -= dt) <= 0) { refresh = .1; for (const k of kinds) k.update(camera, frustum, Q); }
    river.tex.offset.y = (river.tex.offset.y - dt * .35) % 1; fall.update(time);
    grotte.glow.intensity = 5 + Math.sin(time * 3) * 1.2;
    if (shadows) { sun.position.set(player.x + 40, 70, player.z + 30); sun.target.position.set(player.x, 0, player.z); }
    const inCave = zoneAt(player.x, player.z) === 'La grotte'; scene.fog.density = inCave ? .06 : quality === 'low' ? .019 : .014;
    // Inside the cave the sky no longer lights the rock: only the relay does.
    const shade = inCave ? clamp((CAVE[0][1] - player.z) / 6, 0, 1) : 0; hemi.intensity = lerp(1.5, .12, shade); sun.intensity = lerp(2.4, 0, shade);
    if (audio) audio.gain.gain.value = .22 * clamp(1 - Math.hypot(player.x - fall.x, player.z - fall.z) / 70, 0, 1) + .03;
    renderer.render(scene, camera);
    if (bench && !bench.done) { const c = renderer.info.render.drawCalls ?? renderer.info.render.calls, t3 = renderer.info.render.triangles; bench.maxCalls = Math.max(bench.maxCalls || 0, c); bench.maxTris = Math.max(bench.maxTris || 0, t3); bench.sumTris = (bench.sumTris || 0) + t3; bench.n = (bench.n || 0) + 1; }
    fpsAcc += dt; fpsN++; if (fpsAcc > .5) { fps = fpsN / fpsAcc; fpsAcc = fpsN = 0; const s = stats(); hud.textContent = `${s.backend} · qualité ${quality} · ${s.fps} i/s · ${s.calls} appels · ${(s.triangles / 1000).toFixed(0)} k triangles · arbres ${s.instances['conifères'] + s.instances['feuillus']}/${world.trees.length}`; zone.textContent = s.zone; }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { renderer.setPixelRatio(renderPixelRatio(profile, devicePixelRatio, innerWidth, innerHeight)); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
  window.__FORET = { scene, stats, get bench() { return bench?.result || null; }, teleport(x, z, yaw = 0) { player.x = x; player.z = z; player.y = groundHeight(x, z); ctl.look.yaw = yaw; refresh = 0; }, look(yaw, pitch = 0) { ctl.look.yaw = yaw; ctl.look.pitch = pitch; refresh = 0; } };
  requestAnimationFrame(frame);
  return window.__FORET;
}

import { createCascadeWater } from './water-detail.js';
import { createChapterHorizon } from './chapter-horizon.js';
import {addHideoutDebrief} from './hideout-links.js';
import {inertialMove,PLAYER_SPEEDS,TOUCH_SPEED_MULTIPLIER,touchAnalogSprint} from './locomotion.js';
import {frameDelta} from './frame-timing.js';
import {createFPSMotion} from './fps-motion.js';
import {microSurfaceMaps} from './fps-environments.js';
import {createWorldEffects} from './webgpu-world-fx.js';
import {rendererLabel} from './renderer-policy.js';
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
import {linesFor,lineSeconds,logFor,ENDING} from './m07-story.js';
import {softCube,softEnough} from './soft-pieces.js';
import {createMapInfoPanel} from './world-info-panel.js';
import {createM07Hud} from './m07-hud.js?v=2';
import {configureNanoForge,discoverNanoBlueprint,nanoSnapshot} from './nano-forge.js';
import {createNanoForgeFX} from './nano-forge-fx.js';

const params = new URLSearchParams(globalThis.location?.search ?? '');
if(params.has('debug'))document.body.classList.add('m07-debug');
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
// Layout of the chapter 07 map (north up = −z): the AEGIS gate and the old road in the south-west, the undergrowth on
// the west side, the ford in the middle, the mill on the east bank and the aqueduct across the upper river, the
// waterfall under the northern cliff, the cave and the relay behind it to the north-east, the medical centre of the
// VEILLE team on the east bank with its extraction court, the exfiltration along a second aqueduct down to the river,
// which leaves the valley to the east. Vesper's ruins stand on the southern horizon.
export const HALF = 100, CLIFF_Z = -66, CLIFF_H = 18, POOL = { x: 18, z: -59, r: 9 };
const RIVER_CTRL = [[8, -104], [12, -88], [17, -75], [18, -66], [18, -59], [12, -46], [2, -32], [-12, -16], [-21, 0], [-22, 12], [-16, 26], [-4, 40], [16, 50], [42, 56], [70, 60], [104, 64]];
export const RIVER = (() => {
  const c = new T.CatmullRomCurve3(RIVER_CTRL.map(([x, z]) => new T.Vector3(x, 0, z))), n = 220, pts = [];
  let s = 0, prev = null;
  for (let i = 0; i <= n; i++) { const p = c.getPoint(i / n); if (prev) s += Math.hypot(p.x - prev.x, p.z - prev.z); pts.push({ x: p.x, z: p.z, s }); prev = p; }
  return pts;
})();
// Nearest point of the river centreline: distance, and the z of that point (the water level follows it).
const riverGrid = new Map(), RG = 12;
for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1]; for (const p of [a, b]) for (let gx = -1; gx <= 1; gx++) for (let gz = -1; gz <= 1; gz++) { const k = `${Math.floor(p.x / RG) + gx},${Math.floor(p.z / RG) + gz}`; if (!riverGrid.has(k)) riverGrid.set(k, new Set()); riverGrid.get(k).add(i); } }
export function riverInfo(x, z) {
  const cell = riverGrid.get(`${Math.floor(x / RG)},${Math.floor(z / RG)}`), list = cell ? [...cell] : null;
  let best = 1e9, bz = 0, bx = 0;
  const test = i => { const a = RIVER[i], b = RIVER[i + 1], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1), px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz); if (d < best) { best = d; bz = pz; bx = px; } };
  if (list && list.length) for (const i of list) test(i); else for (let i = 0; i < RIVER.length - 1; i++) test(i);
  if (best > RG) for (let i = 0; i < RIVER.length - 1; i++) test(i);
  return { d: best, x: bx, z: bz };
}
// x of the river at a given z on its northern, north-south stretch (waterfall, plateau).
export function riverX(z) { for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1]; if (z >= a.z && z <= b.z) return lerp(a.x, b.x, (z - a.z) / (b.z - a.z || 1)); } return RIVER[RIVER.length - 1].x; }
const base0 = z => 2.2 - z * .012;                         // the valley falls gently towards the south
// Water level along the river, by the z of the river point: the plateau above the cliff, then the valley.
export const waterY = z => z < CLIFF_Z - 3 ? base0(-72) + CLIFF_H - .55 : base0(Math.max(z, POOL.z)) - .6;
export const waterAt = (x, z) => waterY(riverInfo(x, z).z);
// The main route, numbered like the map: 01 gate, 02 undergrowth, 03 ford, 04 mill and aqueduct, 05 waterfall, 06 cave,
// 07 medical centre, 08 extraction court, 09 exfiltration along the aqueduct.
export const PATH = [[-84, 94], [-86, 76], [-80, 54], [-72, 34], [-62, 18], [-48, 8], [-34, 5], [-15, 8], [-6, -4], [0, -18], [8, -34], [14, -46], [24, -52], [27.5, -64.5]];
export const PATH_EAST = [[27.5, -62], [34, -52], [44, -44], [52, -12], [54, 8], [62, 22], [72, 32], [84, 42], [96, 52]];
function segDistance(list, x, z) {
  let best = 1e9;
  for (let i = 0; i < list.length - 1; i++) {
    const [ax, az] = list[i], [bx, bz] = list[i + 1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
function pathDistance(x, z) { return Math.min(segDistance(PATH, x, z), segDistance(PATH_EAST, x, z)); }
// Cave: a curved tunnel that starts behind the waterfall, runs north-east under the plateau to the relay chamber.
export const CAVE = (() => { const x0 = POOL.x + 7.5; return [[x0, -70], [x0 + 1.5, -73.5], [x0 + 5, -80], [x0 + 10, -85], [x0 + 18, -88], [x0 + 26, -90]]; })();
export const CHAMBER = { x: CAVE[5][0] + 4, z: CAVE[5][1] - 1, r: 5.5 };
const CAVE_FLOOR = waterY(POOL.z) + .55;
function caveDistance(x, z) { return Math.min(segDistance(CAVE, x, z), Math.max(0, Math.hypot(x - CHAMBER.x, z - CHAMBER.z) - CHAMBER.r + 2)); }
// Flat platforms: the gate and the old road, the medical centre and its court.
export const MILL = { x: 12, z: -28 }, CENTRE = { x1: 30, x2: 84, z1: -44, z2: -6, y: 3.8 }, COURT = { x1: 30, x2: 80, z1: -6, z2: 32, y: 3.2 };
const PADS = [{ x1: -100, x2: -60, z1: 80, z2: 100, y: null, blend: 20 }, { ...CENTRE, blend: 10 }, { ...COURT, blend: 9 }];
const ROAD = [[-104, 84], [-70, 90], [-40, 97], [-10, 104]];
export const AQUEDUCTS = [{ x0: -44, z0: -44, x1: 44, z1: -50, piers: 11, gap: 5, top: 10.5 }, { x0: 66, z0: 36, x1: 100, z1: 52, piers: 6, gap: -1, top: 9 }];
export function terrainHeight(x, z) {
  const r = riverInfo(x, z), d = r.d;
  let h = base0(z) + 4.5 * smooth(28, 115, d) + (fbm(x * .045, z * .045) - .45) * 2.6;
  h += CLIFF_H * smooth(CLIFF_Z, CLIFF_Z - 6, z) + (z < CLIFF_Z - 6 ? (fbm(x * .08, z * .08) - .5) * 2 : 0);
  // Platforms (blended over their margin), before the river so the riverbed always wins near the water.
  for (const p of PADS) {
    const ox = Math.max(p.x1 - x, 0, x - p.x2), oz = Math.max(p.z1 - z, 0, z - p.z2), w = 1 - smooth(0, p.blend, Math.hypot(ox, oz));
    if (w > 0) h = lerp(h, p.y ?? base0(z) + .4, w);
  }
  if (segDistance(ROAD, x, z) < 5) h = lerp(h, base0(z) + .3, 1 - smooth(3, 5, segDistance(ROAD, x, z)));
  // Riverbed (below the waterfall) and channel on the plateau (above).
  const bed = waterY(r.z) - .85, carve = 1 - smooth(2.5, 6.5, d);
  h = lerp(h, Math.min(h, bed), carve);
  // Banks never dip below the water they hold (lower river; and on the plateau, beside the upper channel).
  if (d > 6.5 && (r.z > POOL.z || z < CLIFF_Z - 6)) h = Math.max(h, waterY(r.z) + .25 + .2 * smooth(6.5, 12, d));
  // Plunge pool.
  const pd = Math.hypot(x - POOL.x, z - POOL.z);
  if (z > CLIFF_Z - 1) h = lerp(h, Math.min(h, waterY(POOL.z) - 1.4), 1 - smooth(POOL.r - 3, POOL.r + 2, pd));
  // A cleft in the cliff leads to the cave mouth.
  if (z < CLIFF_Z + 1 && z > CLIFF_Z - 7) { h = lerp(h, Math.min(h, CAVE_FLOOR - .15), 1 - smooth(2.6, 3.6, Math.abs(x - CAVE[0][0] - 1.5 * clamp((CAVE[0][1] - z) / 5, 0, 1)))); }
  // Paths are flattened a little.
  const p = pathDistance(x, z); if (p < 2.2 && z > CLIFF_Z && d > 5) h = lerp(h, h - (fbm(x * .2, z * .2) - .5) * .5 - .1, (1 - p / 2.2) * .45);
  return h;
}
// Walking height: the cave floor wins inside the tunnel footprint and the relay chamber.
export function groundHeight(x, z) { return z < CLIFF_Z && caveDistance(x, z) < 2 ? CAVE_FLOOR : terrainHeight(x, z); }
const inRect = (r, x, z, m = 0) => x > r.x1 - m && x < r.x2 + m && z > r.z1 - m && z < r.z2 + m;
export function zoneAt(x, z) {
  if (z < CLIFF_Z && caveDistance(x, z) < 2.6) return 'La grotte';
  if (Math.hypot(x - POOL.x, z - POOL.z) < 20) return 'Derrière la cascade';
  if (inRect(CENTRE, x, z, 2)) return 'Le Centre de la Cascade';
  if (inRect(COURT, x, z, 2)) return 'La récupération';
  if (x > 64 && z > 30) return 'Par l’aqueduc';
  if (Math.hypot(x - MILL.x, z - MILL.z) < 22 || (z < -36 && z > -56 && x > -48 && x < 48)) return 'Le moulin et l’aqueduc';
  if (Math.hypot(x + 21, z - 6) < 16) return 'Le gué';
  if (x < -56 && z > 70) return 'La lisière';
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
// Trees. Every part is welded (indexed) before lighting so the normals are smooth: no faceted low-poly look. Trunks
// taper and lean, conifer tiers droop with ragged skirts, broadleaf crowns are clusters of noisy leaf masses, darker in
// their own shade and lighter where the sun hits the top.
function bentTrunk(h, r0, r1, segs, seed, color) {
  const g = weld(new T.CylinderGeometry(r1, r0, h, segs, 6, true).translate(0, h / 2, 0)), p = g.attributes.position, lean = (noise(seed, 3.1) - .5) * .5, v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const t = v.y / h, a = Math.atan2(v.z, v.x), bark = 1 + (noise(a * 3 + seed, v.y * 2.2) - .5) * .22;
    p.setXYZ(i, v.x * bark + lean * t * t * h * .25, v.y, v.z * bark + lean * .4 * t * t * h * .25);
  }
  g.computeVertexNormals(); return paint(g, color, .25, seed);
}
function leafMass(radius, detail, seed, shade, light) {
  const g = weld(new T.IcosahedronGeometry(radius, detail)), p = g.attributes.position, c = new Float32Array(p.count * 3), v = new T.Vector3(), k = new T.Color(), lo = new T.Color(shade), hi = new T.Color(light);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const n = fbm(v.x * .9 + seed, v.y * .9 + v.z * .7), f = 1 + (n - .5) * .75 + (noise(v.x * 3.4 + seed, v.z * 3.4 + v.y * 3.4) - .5) * .2;
    v.multiplyScalar(f); if (v.y < -radius * .3) v.y = -radius * .3 + (v.y + radius * .3) * .45; p.setXYZ(i, v.x, v.y, v.z);
    k.copy(lo).lerp(hi, clamp(.5 + v.y / radius * .55, 0, 1) * (.75 + n * .35)); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeVertexNormals(); return g;
}
function conifer(lod) {
  const parts = [bentTrunk(lod ? 4 : 5, .32, .12, lod ? 6 : 9, 3, 0x4b3424)];
  const tiers = lod ? 4 : 7, seg = lod ? 8 : 13, shade = new T.Color(0x1d4029), tip = new T.Color(0x3f7a45), k = new T.Color();
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers, rad = 2.7 * (1 - t * .78), hgt = lod ? 2.6 : 2.1, y = 1.9 + i * (lod ? 1.75 : 1.02);
    const g = weld(new T.ConeGeometry(rad, hgt, seg, 3, true)), p = g.attributes.position, c = new Float32Array(p.count * 3), v = new T.Vector3();
    for (let q = 0; q < p.count; q++) {
      v.fromBufferAttribute(p, q); const a = Math.atan2(v.z, v.x), rim = clamp((-v.y / hgt) + .5, 0, 1);
      // Branch tips: the skirt droops and is ragged, the radius waves around the tier.
      const wave = 1 + (noise(a * 2.6 + i * 7, i) - .5) * .35 * rim, droop = rim * rim * (.25 + noise(a * 5 + i, 2) * .45);
      p.setXYZ(q, v.x * wave, v.y - droop, v.z * wave);
      k.copy(shade).lerp(tip, rim * .8 + (1 - t) * .1); c[q * 3] = k.r; c[q * 3 + 1] = k.g; c[q * 3 + 2] = k.b;
    }
    g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeVertexNormals(); parts.push(g.translate(0, y + hgt / 2, 0));
  }
  return merge(parts);
}
function broadleaf(lod) {
  const parts = [bentTrunk(lod ? 3.6 : 4.2, .42, .2, lod ? 6 : 9, 5, 0x5a4330)];
  if (!lod) for (const [a, l, tilt] of [[.6, 2.2, .75], [-.9, 1.9, .7], [2.3, 2, .8], [3.6, 1.6, .9]]) parts.push(paint(weld(new T.CylinderGeometry(.06, .16, l, 6).translate(0, l / 2, 0).rotateZ(tilt).rotateY(a).translate(0, 3.1, 0)), 0x5a4330, .2, 7));
  for (const g of parts) if (!g.attributes.normal || g.index) g.computeVertexNormals();
  // Crown: leaf masses spread on an ellipsoid around (0, 5.4, 0).
  const masses = lod ? [[0, 5.4, 0, 2.3], [1.2, 4.7, .6, 1.5], [-1.1, 4.9, -.7, 1.6]] : [[0, 5.6, 0, 1.9], [1.5, 5, .5, 1.5], [-1.4, 5.1, -.6, 1.55], [.4, 4.6, 1.6, 1.35], [-.5, 4.5, -1.6, 1.3], [1.1, 6.4, -.9, 1.25], [-1, 6.5, .8, 1.2], [.1, 7.1, .1, 1.1], [2.1, 4.2, -.7, 1.05], [-2, 4.3, .9, 1]];
  masses.forEach(([x, y, z, r], n) => parts.push(leafMass(r, lod ? 0 : 1, 20 + n * 3.7, 0x2a5424, 0x6a9e3c).translate(x, y, z)));
  return merge(parts);
}
function withUV(parts) {
  const geos = parts.map(g => g.toNonIndexed()); let n = 0; for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o * 3); uv.set(g.attributes.uv.array, o * 2); const c = g.attributes.position.count; for (let i = 0; i < c; i++) nor.set([0, 1, 0], (o + i) * 3); o += c; }
  // Plants and impostors are lit from above whatever side is seen: no dark back faces.
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2)); out.computeBoundingSphere(); return out;
}
// Rocks: a welded (indexed) sphere so the normals are smooth, displaced by coherent noise, flattened, with a flat
// sitting face, darker cracks and moss on top. The near and far versions share the same shape (no pop).
function weld(geometry) {
  // Indexed input (cylinders, cones) is walked through its own index so the triangles keep their corners.
  const p = geometry.attributes.position, map = new Map(), index = [], pos = [], src = geometry.index, total = src ? src.count : p.count;
  for (let n = 0; n < total; n++) {
    const i = src ? src.getX(n) : n;
    const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; let j = map.get(key);
    if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); } index.push(j);
  }
  const out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setIndex(index); return out;
}
const rock = (seed, detail = 3) => {
  const g = weld(new T.IcosahedronGeometry(1, detail)), p = g.attributes.position, v = new T.Vector3(), c = new Float32Array(p.count * 3);
  const stone = new T.Color(0x86837a), crack = new T.Color(0x3f3d39), moss = new T.Color(0x55712f), lichen = new T.Color(0x9a9878), k = new T.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = fbm(v.x * 1.1 + seed, v.y * 1.1 + v.z * .9 + seed * .3), fine = noise(v.x * 5 + seed, v.z * 5 + v.y * 5);
    v.multiplyScalar(1 + (n - .5) * .6 + (fine - .5) * .1); v.y *= .6; if (v.y < -.22) v.y = -.22 + (v.y + .22) * .12;
    p.setXYZ(i, v.x, v.y, v.z);
    k.copy(stone).lerp(lichen, smooth(.55, .75, fine) * .35).lerp(crack, clamp((.42 - n) * 2.2, 0, .75)).lerp(moss, smooth(.08, .42, v.y) * (.55 + n * .4));
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
};

// ---------------------------------------------------------------- Instanced vegetation with LOD ------------------
// Each kind keeps its instances (position, rotation, scale, tint) and three meshes (near, mid, far). update() files
// every visible instance into one of them; invisible ones are skipped entirely.
function vegetation(scene, kind, instances, meshes, { near, mid, far, radius = 4, fade = false }) {
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
        // Small plants grow in over the last quarter of their radius instead of popping in.
        const grow = fade ? clamp((farD - d) / (farD * .25), 0, 1) : 1, sc = it.s * grow;
        m4.compose(p.set(it.x, it.y, it.z), q, s.set(sc * (it.sx || 1), sc, sc * (it.sz || 1))); mesh.setMatrixAt(i, m4);
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
    const d = riverInfo(x, z).d;
    if (d < 7 + margin || pathDistance(x, z) < 3 + margin) return false;
    if (Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 6) return false;
    if (z > CLIFF_Z - 9 && z < CLIFF_Z + 2) return false;                         // cliff face
    if (Math.hypot(x - MILL.x, z - MILL.z) < 13) return false;                     // mill clearing
    for (const a of AQUEDUCTS) if (segDistance([[a.x0, a.z0], [a.x1, a.z1]], x, z) < 3.5 + Math.max(0, margin)) return false;   // under the aqueducts
    if (inRect(CENTRE, x, z, 4 + margin) || inRect(COURT, x, z, 4 + margin)) return false;   // the medical centre and its court
    if (x < -58 && z > 78) return false;                                           // the gate and the road
    if (segDistance(ROAD, x, z) < 6 + margin) return false;
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
    const x = (r() - .5) * 2 * HALF, z = (r() - .5) * 2 * HALF; if (!free(x, z, -4.5) && riverInfo(x, z).d < 4.5) continue;
    if (z < CLIFF_Z) continue;
    grass.push({ x, z, y: terrainHeight(x, z) - .03, r: r() * TAU, s: .6 + r() * .6, tint: .8 + r() * .35 });
  }
  for (let i = 0; i < 900 && rocks.length < 460; i++) {
    const rp = RIVER[Math.floor(r() * RIVER.length)], near = r() < .55, x = near ? rp.x + (r() - .5) * 15 : (r() - .5) * 2 * HALF, z = near ? rp.z + (r() - .5) * 15 : (r() - .5) * 2 * HALF, s = .4 + r() * 1.4;
    if (inRect(CENTRE, x, z, 3) || inRect(COURT, x, z, 3) || (x < -58 && z > 78)) continue;
    if (pathDistance(x, z) < 2.5 + s) continue;
    if (z > CLIFF_Z - 9 && z < CLIFF_Z + 2) continue;                                   // nothing hangs on the cliff face
    const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => terrainHeight(x + a * s, z + b * s));
    if (Math.max(...around) - Math.min(...around) > .9 * s + .4) continue;            // too steep to sit on
    // Sunk by a third of its height on the lowest side: it rests in the ground, it never floats.
    rocks.push({ x, z, y: Math.min(...around, terrainHeight(x, z)) - .18 * s, r: r() * TAU, s, sx: .8 + r() * .6, sz: .8 + r() * .6, tint: .8 + r() * .3 });
  }
  // The ford: stepping stones across the river.
  for (let k = 0; k <= 7; k++) { const t = k / 7, z = lerp(4.5, 7.5, t), x = lerp(-28, -15, t); rocks.push({ x, z, y: waterAt(x, z) - .3, r: k * 1.7, s: .85, sx: 1.2, sz: 1, tint: .95, step: true }); }
  return { trees, ferns, grass, rocks };
}

function terrainMesh(quality) {
  const seg = quality === 'low' ? 140 : 220, g = new T.PlaneGeometry(HALF * 2, HALF * 2, seg, seg).rotateX(-Math.PI / 2), p = g.attributes.position;
  const c = new Float32Array(p.count * 3), moss = new T.Color(0x47612f), grassC = new T.Color(0x5d7a36), mud = new T.Color(0x5b4a35), stone = new T.Color(0x77736a), dirt = new T.Color(0x806a4b), k = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainHeight(x, z); p.setY(i, h);
    const slope = Math.min(1, (Math.abs(terrainHeight(x + 1, z) - h) + Math.abs(terrainHeight(x, z + 1) - h)) * .55);
    k.copy(grassC).lerp(moss, fbm(x * .07, z * .07));
    const rd = riverInfo(x, z).d; if (rd < 6.5) k.lerp(mud, 1 - smooth(3.5, 6.5, rd));
    if (inRect(CENTRE, x, z, 1) || inRect(COURT, x, z, 1) || segDistance(ROAD, x, z) < 4) k.lerp(stone, .55);
    k.lerp(stone, smooth(.35, .8, slope));
    const pd = pathDistance(x, z); if (pd < 2.2 && z > CLIFF_Z) k.lerp(dirt, (1 - pd / 2.2) * .85);
    c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
  }
  g.setAttribute('color', new T.BufferAttribute(c, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map: groundDetail(), roughness: .95 })); m.receiveShadow = true; m.name = 'terrain'; return m;
}
function riverMesh({webgpu=false,low=false}={}) {
  // Ribbon below the waterfall, a channel on the plateau; uv.y runs along the flow.
  const make = (from, to, width) => {
    const pos = [], uv = [], idx = []; let n = 0;
    const list = RIVER.filter(p => p.z >= from && p.z <= to);
    for (let i = 0; i < list.length; i++) {
      const p = list[i], a = list[Math.max(0, i - 1)], b = list[Math.min(list.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
      const y=waterY(p.z), distance=Math.abs(p.z-POOL.z);
      const widened=Math.max(0,1-(distance/(POOL.r+1.3))**2)**.67*(POOL.r+1.25);
      const w=p.z<CLIFF_Z?width*.7:Math.max(width,widened*2);
      pos.push(p.x-nx*w/2,y,p.z-nz*w/2,p.x+nx*w/2,y,p.z+nz*w/2);
      uv.push(0,p.s/7,w/6,p.s/7);
      if(n)idx.push(n*2-2,n*2-1,n*2,n*2-1,n*2+1,n*2);
      n++;
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const fx=createWorldEffects(T,{webgpu,low});
  const mat=fx.water({color:0x254d50,shallowColor:0x639887,skyColor:0xac999c,opacity:.86,flow:1.28,
    foam:{x:POOL.x,z:POOL.z-5,radius:6.8}});
  const group=new T.Group();group.name='Rivière · un seul lit jusqu’au bassin';
  group.add(new T.Mesh(make(CLIFF_Z-.08,200,11),mat),new T.Mesh(make(-200,CLIFF_Z-4,7),mat));
  return {group,fx};
}

function waterfall(scene, quality, webgpu) {
  const xw = (riverX(CLIFF_Z - 6) + POOL.x) / 2, top = waterY(CLIFF_Z - 6) + .2, bottom = waterY(POOL.z), h = top - bottom;
  // The curtain leaves the lip of the cliff and falls slightly outwards, in front of the rock face.
  const curtain = new T.PlaneGeometry(1, 1, 12, 16), cp = curtain.attributes.position;
  for (let k = 0; k < cp.count; k++) {
    const u = cp.getX(k) + .5, t = .5 - cp.getY(k), x = xw + (u - .5) * lerp(7, 9.5, t), bow = Math.sin(u * Math.PI) * .8;
    cp.setXYZ(k, x, lerp(top, bottom, t), lerp(CLIFF_Z - 6.6, CLIFF_Z + .2, Math.pow(t, .8)) + bow);
  }
  curtain.computeVertexNormals();
  const flow=createCascadeWater(T,{webgpu,low:quality==='low',color:0xe7dbcc});
  const sheet=new T.Mesh(curtain,flow.material);sheet.name='Cascade des Sources · nappe unique';scene.add(sheet);
  // A foot of irregular, water-darkened rock replaces the bare curtain edge.
  const stone=lumpy(new T.IcosahedronGeometry(1,1),.38,223);
  const wet=new T.MeshStandardMaterial({color:0x4a5852,roughness:.57,metalness:.035,normalMap:microSurfaceMaps(T).normal,normalScale:new T.Vector2(.17,.17)});
  const rocks=new T.InstancedMesh(stone,wet,quality==='low'?14:22),pose=new T.Object3D(),shape=rng(293);
  for(let i=0;i<rocks.count;i++){
    const side=i%2?1:-1, bank=4.1+shape()*4.4;
    pose.position.set(xw+side*bank,bottom-.42+shape()*.42,POOL.z-6.3+shape()*4.1);
    pose.rotation.set(shape()*.4,shape()*TAU,shape()*.4);
    pose.scale.set(1+shape()*1.5,.38+shape()*.74,.65+shape()*.93);pose.updateMatrix();
    rocks.setMatrixAt(i,pose.matrix);
  }
  rocks.name='Cascade des Sources · enrochements humides';rocks.computeBoundingSphere();scene.add(rocks);
  // Mist and foam: a few hundred points that rise and fade, recycled.
  const count = quality === 'low' ? 160 : 420, pos = new Float32Array(count * 3), seeds = new Float32Array(count), r = rng(9);
  for (let i = 0; i < count; i++) seeds[i] = r();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const puff = canvasTexture(64, 64, (c, w) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, { alpha: true });
  const mist = new T.Points(g, new T.PointsMaterial({ map: puff, size: 1.6, transparent: true, opacity: .55, depthWrite: false, color: 0xffe2cc, sizeAttenuation: true }));
  mist.frustumCulled = false; scene.add(mist);
  return {
    x: xw, z: POOL.z - 7, update(t) {
      flow.update(t);
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
  const mx = MILL.x, mz = MILL.z;
  block(12, 5.5, .8, mx, mz - 5); block(5, 3.2, .8, mx - 3.5, mz + 5); block(3, 6.2, .8, mx + 4.5, mz + 5);
  block(.8, 4.4, 10, mx - 6, mz); block(.8, 2.2, 6, mx + 6, mz - 2);
  block(3, .6, 2, mx + 2, mz + 1.5, null, .4); block(1.6, 1.2, 1.4, mx - 2, mz + 2.5, null, .9); block(2.2, .8, 1.2, mx + 8.5, mz + 7, null, .2);
  const wheel = new T.Mesh(new T.TorusGeometry(2.4, .25, 6, 18), new T.MeshStandardMaterial({ color: 0x4b3a2a, roughness: .9 })); wheel.position.set(mx - 7.4, terrainHeight(mx - 7, mz) + 2, mz + 1); wheel.rotation.set(0, Math.PI / 2, .3); group.add(wheel);
  // The aqueducts: one across the upper river near the waterfall (a span has fallen), one along the exfiltration route.
  for (const a of AQUEDUCTS) {
    const dx = a.x1 - a.x0, dz = a.z1 - a.z0, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ry = -Math.atan2(dz, dx), span = L / a.piers;
    let top = 0; for (let k = 0; k <= 40; k++) { const x = a.x0 + dx * k / 40, z = a.z0 + dz * k / 40; top = Math.max(top, terrainHeight(x, z) + 3.4, waterAt(x, z) + 6.5); }
    for (let i = 0; i <= a.piers; i++) {
      const x = a.x0 + ux * span * i, z = a.z0 + uz * span * i; if (i === a.gap) continue;
      const g = terrainHeight(x, z); block(1.6, top - g + 1, 2.2, x, z, g - .6, ry);
      if (i < a.piers && i !== a.gap - 1) {
        const cx = x + ux * span / 2, cz = z + uz * span / 2;
        const arch = new T.Mesh(new T.TorusGeometry(3.45, .55, 6, 14, Math.PI), stone); arch.position.set(cx, top - .4, cz); arch.rotation.y = ry; arch.scale.set(span / 8.5, .85, 2); arch.castShadow = true; group.add(arch);
        block(span, 1.3, 2.4, cx, cz, top, ry);
      }
    }
    if (a.gap > 0) { const fx = a.x0 + ux * span * a.gap, fz = a.z0 + uz * span * a.gap; for (const [ox, oz, s] of [[-2, 1.5, 1.4], [1.5, -1.2, 1.1], [3, 2.4, .9]]) { const b = block(2 * s, 1.2 * s, 1.5 * s, fx + ox, fz + oz, null, ox); b.rotation.z = .4; } }
  }
  // Moss caps.
  for (const m of [...group.children]) if (m.geometry?.type === 'BoxGeometry' && m.scale.y > 0) { const cap = new T.Mesh(new T.BoxGeometry(m.geometry.parameters.width + .1, .12, m.geometry.parameters.depth + .1), moss); cap.position.copy(m.position); cap.position.y += m.geometry.parameters.height / 2; cap.rotation.copy(m.rotation); group.add(cap); }
  // One draw call per material instead of one per stone.
  const merged = mergeStatic([...group.children]); group.clear(); for (const m of merged) group.add(m);
  return group;
}
// The Centre de la Cascade, the VEILLE team's medical antenna, swallowed by the forest; its extraction court to the
// south (the N-08 lands there), the servers wing and the archives wing to the east, water tanks and a mast on the roof.
function medicalCentre(scene, colliders) {
  const concreteTex = canvasTexture(256, 256, (g, w, h) => { const img = g.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * .05, y * .05) * .55 + hash(x, y) * .25 + (y % 64 < 2 ? -.25 : 0), v = 120 + n * 110, i = (y * w + x) * 4; img.data[i] = v; img.data[i + 1] = v * .98; img.data[i + 2] = v * .93; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); });
  concreteTex.wrapS = concreteTex.wrapT = T.RepeatWrapping;
  const concrete = new T.MeshStandardMaterial({ map: concreteTex, color: 0xb8b2a6, roughness: .95 }), dark = new T.MeshStandardMaterial({ color: 0x15181b, roughness: .7 }),
    moss = new T.MeshStandardMaterial({ color: 0x46622c, roughness: 1 }), metal = new T.MeshStandardMaterial({ color: 0x6d7479, roughness: .5, metalness: .6 }),
    pink = new T.MeshBasicMaterial({ color: 0xff4fa8 }), cyan = new T.MeshBasicMaterial({ color: 0x5fd8ff }), yellow = new T.MeshStandardMaterial({ color: 0xd8b23a, roughness: .7 }), rust = new T.MeshStandardMaterial({ color: 0x6e4a2e, roughness: .9, metalness: .3 });
  const parts = [], glows = [];
  const slab = (w, h, d, x, z, y, mat = concrete, ry = 0, solid = true) => {
    const geo = new T.BoxGeometry(w, h, d), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 4, uv.getY(i) * h / 4);
    const m = new T.Mesh(geo, mat); m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; parts.push(m);
    if (solid) colliders.push({ x, z, hx: w / 2 + .35, hz: d / 2 + .35, ry, top: y + h }); return m;
  };
  const Y = CENTRE.y, YC = COURT.y;
  // A building: walls, two floors of dark windows on every face, roof slab (optionally broken), moss on the cornice.
  const building = (x1, x2, z1, z2, h, { glow = null, broken = false, door = null } = {}) => {
    const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    slab(w, h, d, cx, cz, Y - .4);
    for (const [fx, fz, len, ry] of [[cx, z2 + .06, w, 0], [cx, z1 - .06, w, 0], [x2 + .06, cz, d, Math.PI / 2], [x1 - .06, cz, d, Math.PI / 2]]) {
      for (let fl = 0; fl < Math.floor(h / 3.4); fl++) for (let k = 1.6; k < len - 1.2; k += 3.2) {
        const off = k - len / 2, wx = ry ? fx : fx + off, wz = ry ? fz + off : fz, lit = glow && (k * 7 + fl * 3) % 5 < 2.2;
        slab(ry ? .08 : 1.8, 1.3, ry ? 1.8 : .08, wx, wz, Y + 1.3 + fl * 3.4, lit ? glow : dark, 0, false);
        if (lit) glows.push([wx, Y + 2 + fl * 3.4, wz, glow === pink ? 0xff4fa8 : 0x5fd8ff]);
      }
    }
    slab(w + .6, .5, d + .6, cx, cz, Y + h - .4, concrete, 0, false);
    if (broken) for (let k = 0; k < 6; k++) slab(2 + hash(k, x1) * 3, .5, 1.5 + hash(x1, k) * 2, x2 - 2 - hash(k, 3) * 6, z1 + 2 + hash(4, k) * (d - 4), Y + h - .4 - hash(k, k) * 2.4, concrete, k, false);
    for (let k = 0; k < 9; k++) slab(1.2 + hash(k, z1) * 3, .25, .5, x1 + hash(z1, k) * w, z2 + .3, Y + h - 1.2 - hash(k, 9) * 3, moss, 0, false);   // ivy runs
    if (door) { slab(3, 3.2, .3, door[0], door[1], Y - .2, dark, 0, false); slab(3.6, .4, .5, door[0], door[1] + .1, Y + 3, concrete, 0, false); }
  };
  building(34, 66, -42, -20, 8.2, { broken: true, door: [50, -19.8] });           // main block, roof caved in at the east end
  building(68, 82, -42, -24, 6.6, { glow: pink, door: [75, -23.8] });             // servers
  building(68, 82, -20, -8, 5.6, { glow: pink, door: [75, -7.8] });               // archives (Transcendance project)
  building(32, 42, -16, -8, 4.2);                                                  // store
  // Roof: water tanks on legs, a lattice mast with a red light, a few solar panels.
  for (const [x, z] of [[40, -36], [45, -36]]) { slab(.2, 2, .2, x - 1, z - 1, Y + 7.8, metal, 0, false); slab(.2, 2, .2, x + 1, z + 1, Y + 7.8, metal, 0, false); const t = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 2.8, 16), metal); t.position.set(x, Y + 11.2, z); parts.push(t); }
  for (let k = 0; k < 8; k++) slab(.12, 1.6, .12, 60 + (k % 2) * .9, -38 + (k > 3 ? .9 : 0), Y + 7.8 + Math.floor(k / 2) * 1.6, metal, 0, false);
  glows.push([60.5, Y + 14.4, -37.5, 0xff2a2a]);
  for (let k = 0; k < 4; k++) slab(2.4, .1, 1.4, 54 + k * 2.6, -26, Y + 8.4, dark, 0, false);
  // The sign of the VEILLE medical antenna above the entrance.
  const sign = canvasTexture(1024, 256, (g, w, h) => { g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8303c'; g.fillRect(60, 70, 120, 36); g.fillRect(102, 28, 36, 120);
    g.fillStyle = '#20262b'; g.font = 'bold 96px system-ui,sans-serif'; g.fillText('VEILLE', 220, 118); g.font = 'bold 44px system-ui,sans-serif'; g.fillText('CENTRE DE LA CASCADE', 220, 176); g.font = '34px system-ui,sans-serif'; g.fillText('(ANTENNE MÉDICALE)', 220, 222);
    g.fillStyle = 'rgba(70,90,40,.55)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(hash(i, 1) * w, hash(1, i) * 40 + (i % 2 ? 0 : h - 30), 10 + hash(i, i) * 30, 0, TAU); g.fill(); } });
  const plate = new T.Mesh(new T.PlaneGeometry(14, 3.5), new T.MeshStandardMaterial({ map: sign, roughness: .8 })); plate.position.set(50, Y + 6.4, -19.7); scene.add(plate);
  // The extraction court: low wall with two gaps (west entry, south-east towards the aqueduct), helipad, crates, a wreck.
  const wall = (x1, z1, x2, z2) => { const L = Math.hypot(x2 - x1, z2 - z1); slab(L, 1.3, .6, (x1 + x2) / 2, (z1 + z2) / 2, YC - .3, concrete, -Math.atan2(z2 - z1, x2 - x1)); };
  wall(30, -6, 30, -1); wall(30, 7, 30, 32); wall(30, 32, 66, 32); wall(76, 32, 80, 32); wall(80, 32, 80, -6);
  const pad = new T.Mesh(new T.RingGeometry(6.2, 6.8, 48).rotateX(-Math.PI / 2), yellow); pad.position.set(55, YC + .03, 12); scene.add(pad);
  for (const [w, d, x, z] of [[1, 6, 52.5, 12], [1, 6, 57.5, 12], [4, 1, 55, 12]]) { const m = new T.Mesh(new T.BoxGeometry(w, .02, d), yellow); m.position.set(x, YC + .03, z); scene.add(m); }
  for (const [x, z, n] of [[38, 22, 3], [70, 4, 2], [44, 28, 2], [74, 18, 3], [36, 0, 2]]) for (let k = 0; k < n; k++) slab(1.4, 1.1, 1.4, x + (k % 2) * 1.5, z + (k > 1 ? 1.5 : 0), YC - .1, k % 2 ? rust : metal);
  // A VEILLE ambulance, burnt out, nose against the wall.
  slab(5, 2.2, 2.4, 64, 26, YC - .1, new T.MeshStandardMaterial({ color: 0x8a8278, roughness: .9 }), .3); slab(1.6, 1.5, 2.3, 61.6, 26.7, YC + .1, dark, .3, false);
  // Floodlight poles at the corners of the court (dead).
  for (const [x, z] of [[31.5, 30.5], [78.5, 30.5], [78.5, -4.5]]) { slab(.25, 7, .25, x, z, YC - .2, metal, 0, false); slab(1.6, .5, .4, x, z, YC + 6.6, dark, 0, false); }
  for (const m of mergeStatic(parts)) scene.add(m);
  const lights = glows.map(([x, y, z, c]) => { const m = new T.Mesh(new T.SphereGeometry(.12, 6, 4), new T.MeshBasicMaterial({ color: c, fog: false })); m.position.set(x, y, z); scene.add(m); return m; });
  return { lights, pink, cyan };
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
  // The relay chamber at the end of the tunnel: a vault of wet rock, a glowing pool, the VEILLE relay on its rack.
  { const g = new T.SphereGeometry(CHAMBER.r + 1.2, 28, 18), q = g.attributes.position, cc = new Float32Array(q.count * 3), w = new T.Vector3();
    for (let i = 0; i < q.count; i++) { w.fromBufferAttribute(q, i); const n = fbm(w.x * .5 + 3, w.z * .5 + w.y), k = .06 + n * .11; q.setXYZ(i, w.x * (1 + (n - .5) * .25), Math.max(-1.2, w.y * .62 + (n - .5) * .6), w.z * (1 + (n - .5) * .25)); cc[i * 3] = k; cc[i * 3 + 1] = k * .98; cc[i * 3 + 2] = k * .95; }
    g.setAttribute('color', new T.BufferAttribute(cc, 3)); g.computeVertexNormals();
    const vault = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, side: T.BackSide, roughness: .85 })); vault.position.set(CHAMBER.x, CAVE_FLOOR + 1.2, CHAMBER.z); scene.add(vault);
    const pool = new T.Mesh(new T.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x0a3442, emissive: 0x1a8fb0, emissiveIntensity: .9, roughness: .05, metalness: .3 })); pool.position.set(CHAMBER.x - 2.2, CAVE_FLOOR + .03, CHAMBER.z + 2); scene.add(pool);
    const rack = new T.Mesh(new T.BoxGeometry(1.8, 2.4, .8), new T.MeshStandardMaterial({ color: 0x1b242a, roughness: .5, metalness: .6 })); rack.position.set(CHAMBER.x + 2.4, CAVE_FLOOR + 1.2, CHAMBER.z - 2.6); scene.add(rack);
    for (let k = 0; k < 6; k++) { const led = new T.Mesh(new T.BoxGeometry(1.2, .06, .02), new T.MeshBasicMaterial({ color: k % 2 ? 0x3fd0ff : 0x9ff0ff })); led.position.set(CHAMBER.x + 2.4, CAVE_FLOOR + .5 + k * .3, CHAMBER.z - 2.19); scene.add(led); }
    for (let k = 0; k < 4; k++) { const cable = new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(new T.Vector3(CHAMBER.x + 2 + k * .2, CAVE_FLOOR + 2.3, CHAMBER.z - 2.4), new T.Vector3(CHAMBER.x + k, CAVE_FLOOR + 4.4, CHAMBER.z - 1), new T.Vector3(CHAMBER.x - 3 + k, CAVE_FLOOR + 3.6, CHAMBER.z + 3)), 12, .05, 5), new T.MeshStandardMaterial({ color: 0x111316 })); scene.add(cable); } }
  const relay = new T.Mesh(new T.BoxGeometry(.9, 1.6, .5), new T.MeshStandardMaterial({ color: 0x223038, emissive: 0x3fd0ff, emissiveIntensity: 1.6 }));
  const end = { x: CHAMBER.x + 2.4, z: CHAMBER.z - 1.9 }; relay.position.set(end.x, CAVE_FLOOR + .8, end.z); scene.add(relay);
  const glow = new T.PointLight(0x58d8ff, 60, 18, 1.4); glow.position.set(end.x, CAVE_FLOOR + 1.6, end.z + 1); scene.add(glow);
  const fill = new T.PointLight(0x3a8cff, 30, 16, 1.4); fill.position.set(CHAMBER.x - 2, CAVE_FLOOR + 2.4, CHAMBER.z + 2); scene.add(fill);
  return { relay, glow };
}
// Sunset: the sun sits low in the west-north-west, behind the cliff; the light is long, orange and warm.
export const SUN_DIR = new T.Vector3(-.78, .16, -.6).normalize();
function sky(scene) {
  const m = new T.Group(); scene.add(m);
  // The sun disc and its halo, always at the same place in the sky.
  const halo = canvasTexture(128, 128, (gc, w) => { const gr = gc.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,245,220,1)'); gr.addColorStop(.12, 'rgba(255,214,150,.95)'); gr.addColorStop(.4, 'rgba(255,150,80,.28)'); gr.addColorStop(1, 'rgba(255,120,60,0)'); gc.fillStyle = gr; gc.fillRect(0, 0, w, w); }, { alpha: true });
  const disc = new T.Sprite(new T.SpriteMaterial({ map: halo, fog: false, depthWrite: false, blending: T.AdditiveBlending, transparent: true }));
  disc.scale.set(150, 150, 1); disc.position.copy(SUN_DIR).multiplyScalar(560); m.add(disc);
  return m;
}
function sunbeams(scene) {
  // Low, slanted light shafts through the canopy: additive tapered quads, very cheap.
  const tex = canvasTexture(32, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,170,90,0)'); gr.addColorStop(.3, 'rgba(255,170,90,.3)'); gr.addColorStop(.7, 'rgba(255,170,90,.12)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { alpha: true });
  const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false, opacity: .38 });
  const tilt = Math.atan2(Math.hypot(SUN_DIR.x, SUN_DIR.z), SUN_DIR.y), heading = Math.atan2(SUN_DIR.x, SUN_DIR.z);
  for (const [x, z] of [[-70, 60], [-60, 20], [-30, 0], [8, -20], [20, -48], [40, -24], [60, 18], [-40, 40]]) {
    const geo = new T.PlaneGeometry(3, 34).translate(0, 17, 0).rotateX(tilt * .8);
    const m = new T.Mesh(geo, mat); m.position.set(x, terrainHeight(x, z) + 3.5, z); m.rotation.y = heading; scene.add(m);
  }
}
// Merge static meshes that share a material into one draw call each.
function mergeStatic(meshes) {
  const byMat = new Map();
  for (const m of meshes) { m.updateMatrixWorld(true); (byMat.get(m.material) || byMat.set(m.material, []).get(m.material)).push(m); }
  const out = [];
  for (const [mat, list] of byMat) {
    const geos = list.map(m => { const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld); return g; });
    let n = 0; for (const g of geos) n += g.attributes.position.count;
    const attrs = ['position', 'normal', 'uv', 'color'].filter(a => geos.every(g => g.attributes[a]));
    const out1 = new T.BufferGeometry();
    for (const a of attrs) { const size = geos[0].attributes[a].itemSize, arr = new Float32Array(n * size); let o = 0; for (const g of geos) { arr.set(g.attributes[a].array, o); o += g.attributes[a].array.length; } out1.setAttribute(a, new T.BufferAttribute(arr, size)); }
    out1.computeBoundingSphere(); const mesh = new T.Mesh(out1, mat); mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true; out.push(mesh);
  }
  return out;
}
// The world of 2189, abandoned for seven years: the old forest road, a rusted car, the AEGIS truck back from the
// foundry (chapter 06), a fallen power pylon, the sign of the Tilleuls research antenna, ORDRE's dead surveillance
// mast, and an ORDRE machine shot down in the ruins. Everything is merged into a handful of draw calls.
function remnants(scene, colliders) {
  const parts = [], glow = [];
  const rust = new T.MeshStandardMaterial({ vertexColors: true, roughness: .85, metalness: .35 });
  const add = (geo, color, x, y, z, ry = 0, rz = 0, rx = 0, jitter = .25, seed = 1) => { const m = new T.Mesh(paint(geo, color, jitter, seed), rust); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parts.push(m); return m; };
  // Thick pieces are rounded (soft-pieces.js); thin bars and slabs stay plain boxes.
  const shape = (w, h, d) => softEnough(w, h, d) ? softCube(T).clone().scale(w, h, d) : new T.BoxGeometry(w, h, d);
  const box = (w, h, d, color, x, y, z, ry = 0, rz = 0, rx = 0) => add(shape(w, h, d), color, x, y, z, ry, rz, rx);
  const ground = (x, z) => terrainHeight(x, z);
  // Cracked asphalt of the old road at the edge of the forest (pieces tilted by roots).
  for (let k = 0; k < 26; k++) { const t = k / 25, seg = Math.min(ROAD.length - 2, Math.floor(t * (ROAD.length - 1))), u = t * (ROAD.length - 1) - seg, x = lerp(ROAD[seg][0], ROAD[seg + 1][0], u), z = lerp(ROAD[seg][1], ROAD[seg + 1][1], u); box(4.2, .14, 5.5, k % 3 ? 0x3b3b3c : 0x2f3033, x, ground(x, z) + .05, z, .05 * Math.sin(k * 3), .04 * Math.cos(k * 2), .03 * Math.sin(k)); }
  // The AEGIS truck (back from the foundry): cab, box body, wheels, a pink and blue stripe faded by the sun.
  { const x = -72, z = 90.5, y = ground(x, z), ry = Math.PI / 2 - .2;
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
    const local = []; const lb = (w, h, d, c, px, py, pz) => { const m = new T.Mesh(paint(shape(w, h, d), c, .12, 3), rust); m.position.set(px, py, pz); g.add(m); local.push(m); };
    lb(2.5, 1.9, 2.2, 0x55616a, 0, 1.55, -2.7); lb(2.6, 2.6, 5, 0x6c7880, 0, 1.9, .9); lb(2.62, .25, 5.02, 0x8a3d6a, 0, 2.25, .9); lb(2.63, .12, 5.03, 0x3c6b9a, 0, 1.95, .9);
    for (const [px, pz] of [[-1.25, -2.6], [1.25, -2.6], [-1.25, 2.2], [1.25, 2.2]]) { const w = new T.Mesh(paint(new T.CylinderGeometry(.55, .55, .4, 12).rotateZ(Math.PI / 2), 0x1b1b1b, .1, 4), rust); w.position.set(px, .55, pz); g.add(w); local.push(w); }
    g.updateMatrixWorld(true); for (const m of local) { g.remove(m); m.applyMatrix4(g.matrixWorld); parts.push(m); } scene.remove(g);
    colliders.push({ x, z: z - .9, hx: 1.6, hz: 4.1, ry }); }
  // A rusted car swallowed by ferns, doors missing.
  { const x = -24, z = 56, y = ground(x, z); box(1.9, .8, 4.2, 0x7a4a2e, x, y + .55, z, -.5, .06); box(1.7, .7, 2.1, 0x6a3f28, x - .1, y + 1.25, z + .2, -.5, .06); colliders.push({ x, z, hx: 1.2, hz: 2.3, ry: -.5 }); }
  // A fallen high-voltage pylon across the undergrowth, with its cables.
  { const x = -41, z = 42, y = ground(x, z) + .6;
    for (let k = 0; k < 4; k++) { const len = 26; box(.25, .25, len, 0x5d5a55, x + (k % 2 ? 1.8 : -1.8), y + (k > 1 ? 1.8 : 0), z, .9, 0, 0); }
    for (let k = 0; k < 10; k++) box(3.8, .14, .14, 0x5d5a55, x + Math.sin(.9) * (k * 2.6 - 12), y + .9, z + Math.cos(.9) * (k * 2.6 - 12), .9 + Math.PI / 2, .7 * (k % 2 ? 1 : -1));
    box(9, .6, .6, 0x4f4c48, x + Math.sin(.9) * 14, y + 3, z + Math.cos(.9) * 14, .9, .35);
    colliders.push({ x, z, hx: 2.4, hz: 13.5, ry: .9 }); }
  // The research antenna sign, half eaten by moss.
  { const x = -80, z = 70, y = ground(x, z); box(.14, 2.2, .14, 0x4a4036, x - .8, y + 1.1, z); box(.14, 2.2, .14, 0x4a4036, x + .8, y + 1.1, z);
    const plate=createMapInfoPanel(T,{title:'ANTENNE DE RECHERCHE',subtitle:'DES TILLEULS · ÉQUIPE VEILLE · 2,4 KM ↑',sector:'CHAPITRE 07 / MÉMOIRES LOCALES',width:2.2,height:1.1,accent:'#60e5ff',low:params.get('quality')==='low'});
    plate.position.set(x, y + 1.7, z + .08); plate.rotation.y = .25; scene.add(plate); }
  // ORDRE's surveillance mast, dead, leaning over the river; its red eye still blinks.
  { const x = -34, z = -14, y = ground(x, z); box(.5, 14, .5, 0x3a3d42, x, y + 7, z, 0, -.18); box(1.6, .9, 1.6, 0x24272c, x + 1.3, y + 13.6, z, 0, -.18);
    glow.push([x + 1.3 + .9, y + 13.6, z, 0xff2a2a]); }
  // The ORDRE machine shot down in the mill court: legs folded, chassis cracked, sensor still red.
  { const x = 40, z = 24, y = ground(x, z); box(2.6, 1.2, 1.8, 0x2c2f35, x, y + .7, z, .7, .3); box(1, .8, 1, 0x1f2227, x + 1.4, y + 1, z + 1, .7, .5);
    for (const [a, l] of [[.2, 2.2], [1.4, 2], [2.6, 2.3], [4, 1.9]]) box(.25, .25, l, 0x3a3d43, x + Math.cos(a) * 1.3, y + .35, z + Math.sin(a) * 1.3, a, 0, .4);
    glow.push([x + 1.9, y + 1.1, z + 1.3, 0xff3b4e]); colliders.push({ x, z, hx: 1.6, hz: 1.3, ry: .7 }); }
  // Rusted barrels and a collapsed fence along the river path.
  for (let k = 0; k < 6; k++) { const x = -38 - (k % 3) * 1.1, z = 12 + Math.floor(k / 3) * 1.2; add(new T.CylinderGeometry(.35, .35, .9, 10), k % 2 ? 0x6e4a2c : 0x4b5a3a, x, ground(x, z) + .3, z, k, k % 3 ? 1.4 : 0, 0, .3, 9 + k); }
  for (let k = 0; k < 12; k++) { const x = 72 + k * 2.2, z = 46 - k * .2; box(.1, 1.2, .1, 0x5a5048, x, ground(x, z) + .5, z, 0, (k % 4 === 1 ? .9 : 0) + .05 * k); }
  // The AEGIS perimeter at the edge of the forest: posts, mesh panels, the gate left open, painted AEGIS panels.
  for (let x = -100; x <= -58; x += 3) { if (x > -88 && x < -81) continue; box(.16, 2.6, .16, 0x3d4248, x, ground(x, 82) + 1.3, 82); for (const y of [.35, 1.3, 2.3]) box(3, .06, .06, 0x7a838b, x + 1.5, ground(x + 1.5, 82) + y, 82); for (let k = 0; k < 6; k++) box(.03, 2.1, .03, 0x6a737a, x + .25 + k * .5, ground(x + 1.5, 82) + 1.25, 82); }
  for (const x of [-88, -80.5]) { box(.4, 3.4, .4, 0x2e3237, x, ground(x, 82) + 1.7, 82); glow.push([x, ground(x, 82) + 3.5, 82.2, 0xff4fa3]); }
  box(5, 2.4, .06, 0x2f343a, -92, ground(-92, 82.5) + 1.3, 82.08, 0, 0, 0);
  for (const m of mergeStatic(parts)) { m.castShadow = true; scene.add(m); }
  for (const [x, label] of [[-95, 'AEGIS'], [-68, 'AEGIS']]) { const plate = createMapInfoPanel(T, { title: label, subtitle: 'ZONE DE TRANSIT · ACCÈS RESTREINT', sector: 'FORÊT DES SOURCES', width: 3.6, height: 1.2, accent: '#ff4fa3', low: params.get('quality') === 'low' }); plate.position.set(x, ground(x, 82) + 1.6, 82.12); scene.add(plate); }
  // Emissive dots (one small mesh each) and a blink driven from the frame loop.
  const lights = glow.map(([x, y, z, c]) => { const m = new T.Mesh(new T.SphereGeometry(.16, 8, 6), new T.MeshBasicMaterial({ color: c, fog: false })); m.position.set(x, y, z); scene.add(m); return m; });
  return { lights };
}
// Vesper on the southern horizon: towers in silhouette, a few lit windows and pink beacons. Unaffected by the fog.
function skyline(scene) {
  const r = rng(77), parts = [], dark = new T.MeshBasicMaterial({ vertexColors: true, fog: false });
  for (let i = 0; i < 70; i++) {
    const a = (r() - .5) * 1.5 + Math.PI, d = 330 + r() * 120, w = 10 + r() * 22, h = 30 + r() * 120 * (r() < .2 ? 2 : 1), broken = r() < .35;
    const g = paint(new T.BoxGeometry(w, h, w * (.6 + r()), 2, 6, 2), new T.Color().setHSL(.78, .22, .035 + r() * .03).getHex(), .15, i);
    if (broken) { const pp = g.attributes.position; for (let k = 0; k < pp.count; k++) if (pp.getY(k) > h * .2) pp.setY(k, pp.getY(k) - (pp.getX(k) > 0 ? h * (.15 + r() * .25) : r() * h * .08)); }
    const m = new T.Mesh(g, dark); m.position.set(Math.sin(a) * d, h / 2 - 6, -Math.cos(a) * d); m.rotation.y = r() * TAU; parts.push(m);
  }
  for (const m of mergeStatic(parts)) scene.add(m);
  const pts = [], cols = [], c = new T.Color();
  for (const m of parts) { const h = m.geometry.parameters?.height || 60; for (let k = 0; k < 6; k++) { pts.push(m.position.x + (r() - .5) * 12, m.position.y - h / 2 + r() * h, m.position.z + (r() - .5) * 12); c.set(r() < .25 ? 0xff4fa3 : r() < .5 ? 0x5fb8ff : 0xffc27a); cols.push(c.r, c.g, c.b); } }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  scene.add(new T.Points(g, new T.PointsMaterial({ size: 3.4, vertexColors: true, fog: false, sizeAttenuation: true })));
}
// ORDRE's probes patrolling above the canopy: a body, a red eye, slow loops. They cannot see under the trees.
function probes(scene) {
  const list = [], body = new T.MeshStandardMaterial({ color: 0x2a2d33, metalness: .6, roughness: .4 }), eye = new T.MeshBasicMaterial({ color: 0xff3045, fog: false });
  for (const [cx, cz, r, h, sp] of [[0, 20, 38, 24, .11], [-30, -30, 26, 28, -.14], [35, -40, 20, 30, .17]]) {
    const g = new T.Group(); g.add(new T.Mesh(new T.CylinderGeometry(.8, .5, .5, 10), body)); const e = new T.Mesh(new T.SphereGeometry(.22, 8, 6), eye); e.position.set(0, -.2, .75); g.add(e);
    const ring = new T.Mesh(new T.TorusGeometry(1.15, .08, 6, 20), body); ring.rotation.x = Math.PI / 2; g.add(ring); scene.add(g); list.push({ g, cx, cz, r, h, sp, a: cx });
  }
  return { update(t) { for (const p of list) { const a = p.a + t * p.sp; p.g.position.set(p.cx + Math.cos(a) * p.r, terrainHeight(p.cx, p.cz) + p.h + Math.sin(t * 1.3 + p.a) * .6, p.cz + Math.sin(a) * p.r); p.g.rotation.y = -a + (p.sp > 0 ? 0 : Math.PI); } } };
}
// Dust and ash in the low light, around the player only.
function motes(scene, count) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), r = rng(31); for (let i = 0; i < count; i++) seed[i] = r();
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const pts = new T.Points(g, new T.PointsMaterial({ color: 0xffd2a0, size: .04, transparent: true, opacity: .45, depthWrite: false })); pts.frustumCulled = false; scene.add(pts);
  return { update(t, p) { for (let i = 0; i < count; i++) { const s = seed[i], a = s * 977; pos[i * 3] = p.x + ((a * 13.1 + t * .3) % 24) - 12; pos[i * 3 + 1] = p.y + ((s * 7 + t * .08 * (s + .3)) % 6); pos[i * 3 + 2] = p.z + ((a * 7.7 + t * .2) % 24) - 12; } g.attributes.position.needsUpdate = true; } };
}

// ---------------------------------------------------------------- Player and controls ----------------------------
function controls(canvas) {
  const keys = new Set(), look = { yaw: 0, pitch: 0 }, move = { x: 0, z: 0 }, touch = new Map(), virtual = { x: 0, z: 0, run: false };let jumpPressed=false;
  addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(e.code==='Space'&&!e.repeat)jumpPressed=true;
   });
   addEventListener('keyup',e=>keys.delete(e.code));
   addEventListener('blur',()=>{keys.clear();jumpPressed=false;});
   canvas.addEventListener('contextmenu',e=>e.preventDefault());
   canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button===2){e.preventDefault();jumpPressed=true;canvas.requestPointerLock?.().catch?.(()=>{});}
   });
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
    look,
    consumeJump(){const jump=jumpPressed;jumpPressed=false;return jump;},
    setVirtualMove(x,z){virtual.x=clamp(x,-1,1);virtual.z=clamp(z,-1,1);},
    setVirtualRun(value){virtual.run=!!value;},
    input() {
      let x = move.x+virtual.x, z = move.z+virtual.z;
      if (keys.has('KeyW') || keys.has('KeyZ') || keys.has('ArrowUp')) z -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('KeyQ') || keys.has('ArrowLeft')) x -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const l = Math.hypot(x, z); return { x: l > 1 ? x / l : x, z: l > 1 ? z / l : z, touchMoving:!!(move.x||move.z||virtual.x||virtual.z), run: keys.has('ShiftLeft') || keys.has('ShiftRight') || virtual.run || touchAnalogSprint(move.x+virtual.x,move.z+virtual.z) };
    }
  };
}
function blockedBy(x, z, colliders, trunks) {
  for (const c of colliders) {
    const dx = x - c.x, dz = z - c.z, cos = Math.cos(-c.ry), sin = Math.sin(-c.ry), lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (Math.abs(lx) < c.hx && Math.abs(lz) < c.hz) return true;
  }
  const cx = Math.floor(x / 6), cz = Math.floor(z / 6);
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const cell = trunks.get(`${cx + a},${cz + b}`);
    if (cell) for (const t of cell) if (Math.hypot(x - t.x, z - t.z) < t.radius + .35) return true;
  }
  return false;
}

// ---------------------------------------------------------------- The N-08 in the extraction court ------------------
// Chapter 07 is still played unarmed: the SY-05 (N-08) landing is staged. It drops into the court on its thrusters,
// scans, and is brought down by the AEGIS charge (Tomas): sparks, legs folding, eye going out.
function createN08(scene) {
  const g = new T.Group(); g.visible = false; scene.add(g);
  const body = new T.MeshStandardMaterial({ color: 0x2b2f36, metalness: .7, roughness: .35 }), trim = new T.MeshStandardMaterial({ color: 0x8a1f2c, metalness: .4, roughness: .5 }), eyeMat = new T.MeshBasicMaterial({ color: 0xff2a3a });
  const torso = new T.Mesh(new T.CapsuleGeometry(1.2, 1.6, 6, 14), body); torso.rotation.z = Math.PI / 2; torso.position.y = 3.2; g.add(torso);
  const head = new T.Mesh(new T.BoxGeometry(1.1, .8, 1.2), body); head.position.set(1.9, 3.6, 0); g.add(head);
  const eye = new T.Mesh(new T.SphereGeometry(.22, 10, 8), eyeMat); eye.position.set(2.48, 3.62, 0); g.add(eye);
  const band = new T.Mesh(new T.TorusGeometry(1.25, .08, 6, 24), trim); band.rotation.y = Math.PI / 2; band.position.y = 3.2; g.add(band);
  const legs = []; for (const [x, z] of [[1, 1.1], [1, -1.1], [-1, 1.1], [-1, -1.1]]) { const l = new T.Group(); l.position.set(x, 3, z); const up = new T.Mesh(new T.BoxGeometry(.3, 2.2, .3), body); up.position.y = -1.1; up.rotation.z = Math.sign(x) * .35; l.add(up); const lo = new T.Mesh(new T.BoxGeometry(.25, 2, .25), trim); lo.position.set(Math.sign(x) * .75, -2.6, Math.sign(z) * .2); l.add(lo); g.add(l); legs.push(l); }
  const flame = new T.Mesh(new T.ConeGeometry(.6, 2.4, 10), new T.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: .8, blending: T.AdditiveBlending, depthWrite: false })); flame.rotation.x = Math.PI; flame.position.y = 1.2; g.add(flame);
  const sparks = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(new Float32Array(120 * 3), 3)), new T.PointsMaterial({ color: 0xffc46a, size: .14, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sparks.visible = false; g.add(sparks);
  const at = { x: 55, z: 12 }, ground = COURT.y; let state = 'idle', t0 = 0, now = 0;
  const api = {
    get down() { return state === 'down'; },
    land() { if (state === 'idle') { state = 'landing'; t0 = now; g.visible = true; } return state !== 'landing'; },
    update(t, dt) {
      now = t; if (state === 'idle') return;
      const k = t - t0;
      if (state === 'landing') { const u = Math.min(1, k / 5); g.position.set(at.x, ground + 28 * (1 - u) * (1 - u), at.z); g.rotation.y = 1.2 + u * .6; flame.visible = true; flame.scale.y = .8 + .3 * Math.sin(t * 30); if (u >= 1) { state = 'scan'; t0 = t; } }
      else if (state === 'scan') { flame.visible = false; g.rotation.y = 1.8 + Math.sin(k * .8) * .9; eye.scale.setScalar(1 + .3 * Math.sin(t * 9)); if (k > 18) { state = 'falling'; t0 = t; sparks.visible = true; } }
      else if (state === 'falling') { const u = Math.min(1, k / 1.6); g.rotation.z = u * .5; g.position.y = ground - u * 1.2; for (const l of legs) l.rotation.x = u * .9; eye.material.color.setRGB(1 - u * .8, .16 * (1 - u), .2 * (1 - u));
        const p = sparks.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const a = i * 2.4 + t * 6, r = (k * 3 + i % 7) % 4; p.setXYZ(i, Math.cos(a) * r * .6, 3 + Math.sin(a * 1.3) * r * .5, Math.sin(a) * r * .6); } p.needsUpdate = true;
        if (u >= 1) { state = 'down'; sparks.visible = false; } }
    }
  };
  return api;
}

// Beyond the playable square (±100 m): wooded hills on a coarse terrain, and conifer impostors on them.
function skirt(scene, terrain, impostorGeometry, impostorMaterial, quality) {
  const shade = new T.Color(), nearColor = new T.Color(), rangeColor = new T.Color();
  const dark = new T.Color(0x2e4424), light = new T.Color(0x4a5a34);
  const outer = (x, z) => {
    const e = Math.max(Math.abs(x), Math.abs(z)), cx = clamp(x,-HALF,HALF), cz = clamp(z,-HALF,HALF);
    const edge = terrainHeight(cx,cz), u = smooth(HALF,HALF+140,e);
    return edge + (6 + fbm(x*.012,z*.012)*55*(z<0?1.4:.8))*u;
  };
  // Reuse the exact edge vertices of the playable terrain, with the same UVs
  // and normals, then gradually open their ring into the surrounding valley.
  const src=terrain.geometry.attributes, stride=Math.sqrt(src.position.count), last=stride-1;
  const border=[];
  for(let i=0;i<last;i++)border.push(i);
  for(let i=0;i<last;i++)border.push(i*stride+last);
  for(let i=0;i<last;i++)border.push(last*stride+last-i);
  for(let i=0;i<last;i++)border.push((last-i)*stride);
  const position=[],color=[],uv=[],indices=[],perimeter=border.length,rings=quality==='low'?12:18;
  for(let ring=0;ring<=rings;ring++){
    const t=(ring/rings)**1.6;
    for(let j=0;j<perimeter;j++){
      const b=border[j], edgeX=src.position.getX(b), edgeZ=src.position.getZ(b), edgeR=Math.hypot(edgeX,edgeZ);
      const scale=1+t*(740/edgeR-1),x=edgeX*scale,z=edgeZ*scale;
      const y=ring===0?src.position.getY(b):outer(x,z);
      nearColor.fromBufferAttribute(src.color,b);
      shade.copy(nearColor).lerp(rangeColor.copy(dark).lerp(light,fbm(x*.02,z*.02)),smooth(0,.18,t));
      position.push(x,y,z);color.push(shade.r,shade.g,shade.b);
      uv.push(src.uv.getX(b)+(x-edgeX)/(2*HALF),src.uv.getY(b)-(z-edgeZ)/(2*HALF));
      if(ring){
        const a=(ring-1)*perimeter,c=ring*perimeter,next=(j+1)%perimeter;
        indices.push(a+j,a+next,c+j,a+next,c+next,c+j);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(position,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const normal=geometry.attributes.normal;
  border.forEach((b,i)=>normal.setXYZ(i,src.normal.getX(b),src.normal.getY(b),src.normal.getZ(b)));
  const ground=new T.Mesh(geometry,terrain.material);
  ground.name='Forêt · vallon continu';scene.add(ground);
  const r = rng(404), count = quality === 'low' ? 900 : 2200, trees = new T.InstancedMesh(impostorGeometry, impostorMaterial, count), m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), pos = new T.Vector3(); let n = 0;
  for (let i = 0; i < count * 4 && n < count; i++) { const x = (r() - .5) * 560, z = (r() - .5) * 560; if (Math.max(Math.abs(x), Math.abs(z)) < HALF + 4) continue; if (z > 160 && Math.abs(x) < 200) continue;
    const s = 1.1 + r() * 1.3; trees.setMatrixAt(n++, m4.compose(pos.set(x, outer(x, z) - .3, z), q.setFromAxisAngle(new T.Vector3(0, 1, 0), r() * TAU), sc.set(s, s * (.9 + r() * .4), s))); }
  trees.count = n; trees.instanceMatrix.needsUpdate = true; trees.computeBoundingSphere(); scene.add(trees);
}

// ---------------------------------------------------------------- Story layer --------------------------------------
// The chapter 07 scenes (m07-story.js) play where they happen; documents are read on the spot (E or the button).
function createStory(characterId, relay, n08 = { land: () => true, down: true }) {
  const sub = $('sub'), prompt = $('prompt'), doc = $('doc'), queue = [], seen = new Set();
  let line = null, left = 0, near = null;
  const say = id => { if (seen.has(id)) return; seen.add(id); queue.push(...linesFor(id, characterId)); };
  const cave0 = CAVE[0];
  const SCENES = [
    ['lisiere', () => true],
    ['sousBois', (x, z) => x < -50 && z < 76],
    ['traqueur', (x, z) => x < -46 && z < 40 && seen.has('sousBois')],
    ['gue', (x, z) => Math.hypot(x + 21, z - 6) < 16],
    ['treuil', (x, z) => Math.hypot(x + 15, z - 8) < 5 && seen.has('gue')],
    ['ruines', (x, z) => Math.hypot(x - MILL.x, z - MILL.z) < 20],
    ['vanne', (x, z) => Math.hypot(x - MILL.x, z - MILL.z) < 9 && seen.has('ruines')],
    ['vanneOk', (x, z) => z < -40 && seen.has('vanne')],
    ['cascade', (x, z) => Math.hypot(x - POOL.x, z - POOL.z) < 22],
    ['toise', (x, z) => Math.hypot(x - cave0[0], z - cave0[1]) < 6],
    ['grotte', (x, z) => z < CAVE[1][1] && caveDistance(x, z) < 2.6],
    ['rampants', (x, z) => Math.hypot(x - CAVE[3][0], z - CAVE[3][1]) < 4],
    ['turbine', (x, z) => Math.hypot(x - CHAMBER.x, z - CHAMBER.z) < CHAMBER.r + 1],
    ['turbineOk', (x, z) => Math.hypot(x - relay.position.x, z - relay.position.z) < 5],
    ['centre', (x, z) => inRect(CENTRE, x, z, 6) && seen.has('turbineOk')],
    ['dossier', (x, z) => Math.hypot(x - 75, z + 6.5) < 4 && seen.has('centre')],
    ['protection', (x, z) => seen.has('dossier') && Math.hypot(x - 50, z + 18.5) < 5],
    ['recuperation', (x, z) => inRect(COURT, x, z, -2) && seen.has('protection')],
    ['liaison', () => seen.has('recuperation') && !queue.length],
    ['n08', () => seen.has('liaison') && !queue.length && n08.land()],
    ['n08Ok', () => seen.has('n08') && n08.down],
    ['fin', (x, z) => seen.has('n08Ok') && x > 86 && z > 46]
  ];
  const DOCS = [
    { id: 'sentier', x: -80, z: 70 }, { id: 'epars', x: -62, z: 16 }, { id: 'moulin', x: MILL.x - 3, z: MILL.z + 4.6 },
    { id: 'toise', x: cave0[0] - 1.6, z: cave0[1] + 2.5 }, { id: 'relais-grotte', x: relay.position.x, z: relay.position.z + 1.2 },
    { id: 'journal', x: 50, z: -18.5 }, { id: 'dossier', x: 75, z: -6.5 }
  ];
  const open = id => {
    const d = logFor(id, characterId); if (!d) return;
    doc.querySelector('small').textContent = d.stamp; doc.querySelector('h2').textContent = d.title;
    doc.querySelector('.lines').replaceChildren(...d.lines.map(t => Object.assign(document.createElement('p'), { textContent: t })));
    doc.querySelector('.foot').textContent = d.footer; doc.hidden = false; document.exitPointerLock?.();
  };
  doc.querySelector('button').onclick = () => { doc.hidden = true; };
  prompt.onclick = () => near && open(near.id);
  addEventListener('keydown', e => { if (e.code === 'KeyE' && near && doc.hidden) open(near.id); else if (e.code === 'Escape' || (e.code === 'KeyE' && !doc.hidden)) doc.hidden = true; });
  let ended = false;
  return {
    seen,
    update(p, dt) {
      for (const [id, test] of SCENES) if (!seen.has(id) && test(p.x, p.z)) say(id);
      if (!ended && seen.has('fin') && !queue.length && !line) { ended = true; $('fin').hidden = false; $('fin').querySelector('p').textContent = ENDING.next;addHideoutDebrief($('fin'),{level:7,characterId}); }
      if (line && (left -= dt) <= 0) line = null;
      if (!line && queue.length) { line = queue.shift(); left = lineSeconds(line.text); sub.hidden = false; sub.querySelector('b').textContent = line.speaker.name; sub.querySelector('b').style.color = line.speaker.color; sub.querySelector('span').textContent = line.text; }
      if (!line) sub.hidden = true;
      near = DOCS.find(d => Math.hypot(p.x - d.x, p.z - d.z) < 3.2) || null;
      prompt.hidden = !near || !doc.hidden; if (near) prompt.textContent = 'E · LIRE : ' + logFor(near.id, characterId).title;
    }
  };
}

// The whole forest world (sky, light, terrain, water, ruins, medical centre, cave, remnants, vegetation, hills), shared by
// the exploration prototype (boot below) and the combat chapter (niveau7.js). update() animates it and culls the vegetation.
export function buildForestWorld(scene, { quality = 'balanced', webgpu = false, shadows = false, fog = null } = {}) {
  const FOG = fog ?? (quality === 'low' ? .016 : .012);
  if (!scene.fog) scene.fog = new T.FogExp2(0xb27a63, FOG);
  const horizon = createChapterHorizon(T,scene,{chapter:7,low:quality==='low',webgpu});
  const skyDome = sky(scene);
  const hemi = new T.HemisphereLight(0xb79ac4, 0x4a3a2a, 1.7); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffa765, 3.1); sun.position.copy(SUN_DIR).multiplyScalar(120); scene.add(sun, sun.target);
  if (shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); sun.shadow.bias = -.0006; }
  const micro=microSurfaceMaps(T),terrain=terrainMesh(quality);terrain.material.normalMap=micro.normal;terrain.material.normalScale=new T.Vector2(.16,.16);scene.add(terrain);
  const radiance=new Uint8Array(64*32*4);for(let y=0;y<32;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,k=y/31;radiance.set([Math.round(70+60*k),Math.round(91+9*k),Math.round(113-37*k),255],i);}const env=new T.DataTexture(radiance,64,32);env.colorSpace=T.SRGBColorSpace;env.mapping=T.EquirectangularReflectionMapping;env.needsUpdate=true;scene.environment=env;scene.environmentIntensity=.4;
  const river = riverMesh({webgpu,low:quality==='low'}); scene.add(river.group);
  const fall = waterfall(scene, quality, webgpu), colliders = [];
  ruins(scene, colliders); const centre = medicalCentre(scene, colliders); const grotte = cave(scene); sunbeams(scene);
  const relics = remnants(scene, colliders); skyline(scene); const drones = probes(scene), dust = motes(scene, quality === 'low' ? 120 : 260);

  // Vegetation.
  const world = scatter(42), Q = { low: .65, balanced: 1, high: 1.35 }[quality];
  const leaf = new T.MeshStandardMaterial({ vertexColors: true, roughness: .9 });
  const imp = kind => new T.MeshStandardMaterial({ map: plantTexture(kind), alphaTest: .5, roughness: 1 });
  const plant = kind => new T.MeshStandardMaterial({ map: plantTexture(kind), alphaTest: .45, roughness: 1 });
  const con = world.trees.filter(t => t.conifer), brd = world.trees.filter(t => !t.conifer);
  const impostor = (w, h) => withUV([new T.PlaneGeometry(w, h).translate(0, h / 2, 0), new T.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(Math.PI)]);
  const kinds = [
    vegetation(scene, 'conifères', con, [instanced(conifer(0), leaf, con.length, { shadow: shadows }), instanced(conifer(1), leaf, con.length, { shadow: shadows }), instanced(impostor(6, 10.5), imp('imp-conifer'), con.length)], { near: 32, mid: 75, far: 260, radius: 4 }),
    vegetation(scene, 'feuillus', brd, [instanced(broadleaf(0), leaf, brd.length, { shadow: shadows }), instanced(broadleaf(1), leaf, brd.length, { shadow: shadows }), instanced(impostor(7.5, 8.5), imp('imp-broadleaf'), brd.length)], { near: 32, mid: 75, far: 260, radius: 4 }),
    vegetation(scene, 'fougères', world.ferns, [instanced(withUV([0, 1, 2, 3, 4, 5].map(i => new T.PlaneGeometry(1.4, 1.1).translate(0, .55, 0).rotateY(i * Math.PI / 3 + (i > 2 ? Math.PI : 0)))), plant('fern'), 3500), null, null], { near: 34, mid: 34, far: 34, radius: .7, fade: true }),
    vegetation(scene, 'herbes', world.grass, [instanced(withUV([0, 1, 2, 3].map(i => new T.PlaneGeometry(1.2, .7).translate(0, .35, 0).rotateY(i * Math.PI / 2))), plant('grass'), 6000), null, null], { near: 24, mid: 24, far: 24, radius: .4, fade: true }),
    vegetation(scene, 'rochers', world.rocks, [instanced(rock(3, 3), new T.MeshStandardMaterial({ vertexColors: true, roughness: .95,normalMap:micro.normal,normalScale:new T.Vector2(.2,.2) }), world.rocks.length), instanced(rock(3, 1), new T.MeshStandardMaterial({ vertexColors: true, roughness: .95,normalMap:micro.normal,normalScale:new T.Vector2(.2,.2) }), world.rocks.length), null], { near: 50, mid: 160, far: 160, radius: 1.2 })
  ];
  skirt(scene, terrain, impostor(6, 10.5), imp('imp-conifer'), quality);
  // Trunks and rocks block the player (the stepping stones of the ford stay walkable).
  const trunks = new Map();
  for (const t of [...world.trees.map(t => ({ x: t.x, z: t.z, radius: .4 * t.s + .15 })), ...world.rocks.filter(r => !r.step && r.s > .55).map(r => ({ x: r.x, z: r.z, radius: .82 * r.s * Math.max(r.sx, r.sz) }))]) { const k = `${Math.floor(t.x / 6)},${Math.floor(t.z / 6)}`; (trunks.get(k) || trunks.set(k, []).get(k)).push(t); }

  const cull = new T.PerspectiveCamera(100, 1.6, .1, 650), frustum = new T.Frustum(), pv = new T.Matrix4(), lastView = { q: new T.Quaternion(), x: 1e9, z: 1e9 };
  let refresh = 0;
  return {
    skyDome, horizon, hemi, sun, terrain, river, fall, colliders, centre, grotte, relics, drones, dust, world, kinds, trunks, Q, FOG,
    // Per frame: water, waterfall, beacons, probes, dust, cave darkness, vegetation levels of detail.
    update({ time, dt, camera, player, aspect = 1.6 }) {
      river.fx.update(time, camera.position); skyDome.position.copy(camera.position);
      cull.aspect = aspect * 1.25; cull.updateProjectionMatrix(); cull.position.copy(camera.position); cull.quaternion.copy(camera.quaternion); cull.updateMatrixWorld();
      pv.multiplyMatrices(cull.projectionMatrix, cull.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
      if (camera.quaternion.angleTo(lastView.q) > .07 || Math.hypot(camera.position.x - lastView.x, camera.position.z - lastView.z) > 1.2) { refresh = 0; lastView.q.copy(camera.quaternion); lastView.x = camera.position.x; lastView.z = camera.position.z; }
      if ((refresh -= dt) <= 0) { refresh = .1; for (const k of kinds) k.update(camera, frustum, Q); }
      fall.update(time);
      grotte.glow.intensity = 52 + Math.sin(time * 3) * 10; drones.update(time); dust.update(time, camera.position);
      for (const [k, l] of [...relics.lights, ...centre.lights].entries()) l.visible = Math.sin(time * (2 + k) + k) > -.2;
      const inCave = zoneAt(player.x, player.z) === 'La grotte'; scene.fog.density = inCave ? .06 : FOG; horizon.setOutside(!inCave); skyDome.visible=!inCave;
      const shade = inCave ? clamp((CAVE[0][1] - player.z) / 6, 0, 1) : 0; hemi.intensity = lerp(1.7, .1, shade); sun.intensity = lerp(3.1, 0, shade);
      if (shadows) { sun.position.set(player.x + SUN_DIR.x * 120, SUN_DIR.y * 120, player.z + SUN_DIR.z * 120); sun.target.position.set(player.x, 0, player.z); }
      return inCave;
    }
  };
}

// ---------------------------------------------------------------- Boot -------------------------------------------
export async function boot() {
  const quality = ['low', 'balanced', 'high'].includes(params.get('quality')) ? params.get('quality') : (matchMedia('(pointer:coarse)').matches ? 'low' : 'balanced');
  const profile = graphicsProfile({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, platform: navigator.platform, gpu: !!navigator.gpu, rendererHint: params.get('renderer') }, quality);
  const { renderer, canvas } = await createCompatibleRenderer({ canvas: $('game'), WebGPU: T.WebGPURenderer, WebGL: WebGLRenderer, profile });
  const backend = rendererLabel(renderer);
  renderer.setPixelRatio(renderPixelRatio(profile, devicePixelRatio, innerWidth, innerHeight)); renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const shadows = quality === 'high'; renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const FOG = quality === 'low' ? .016 : .012; const scene = new T.Scene(); scene.fog = new T.FogExp2(0xb27a63, FOG);
  const camera = new T.PerspectiveCamera(70, innerWidth / innerHeight, .1, 900);
  const cull = new T.PerspectiveCamera(100, innerWidth / innerHeight * 1.25, .1, 650), lastView = { yaw: 0, pitch: 0, x: 0, z: 0 };
  const W = buildForestWorld(scene, { quality, webgpu: backend === 'WebGPU', shadows, fog: FOG });
  const { skyDome, horizon, hemi, sun, river, fall, colliders, centre, grotte, relics, drones, dust, world, kinds, trunks, Q } = W;
  // Player.
  const planarVelocity={x:0,z:0},motion=createFPSMotion();let actualVelocity={x:0,z:0};
  const ctl = controls(canvas), player = { x: -84, z: 95, y: 0 }; ctl.look.yaw = 0;
   let terrainY=groundHeight(player.x,player.z),jumpOffset=0,jumpVelocity=0;
  const characterId = params.get('character') === 'lylu' ? 'lylu' : 'ghju', n08 = createN08(scene), story = createStory(characterId, grotte.relay, n08);
  // This chapter remains unarmed exploration. Its recovered schematic travels
  // with the same hero to the next combat chapter, where the workshop is available.
  const nanoEvents=[],nanoGame={characterId,mode:'campaign',missionLevel:7,time:0,state:'playing',player:{x:player.x,z:player.z,elevation:0,hp:100},ownedWeapons:new Set(),isWeaponAvailable:()=>false,event:(type,data)=>nanoEvents.push({type,...data})};
  configureNanoForge(nanoGame);nanoGame.nano.placed=true;
  const nanoPoint={x:grotte.relay.position.x+.8,y:CAVE_FLOOR,z:grotte.relay.position.z+1.3};
  if(!nanoGame.nano.profile.discovered.includes('spectral'))nanoGame.nano.plans.push({id:'spectral',name:'Filtre de récupération spectral',blueprints:['spectral'],...nanoPoint});
  const nanoFx=createNanoForgeFX(T,{scene,camera,workshopAvailable:false});
  const nanoStyle=document.createElement('link');nanoStyle.rel='stylesheet';nanoStyle.href=new URL('./nano-forge.css',import.meta.url).href;document.head.append(nanoStyle);
  const gameplayHud=createM07Hud({characterId,onMove:(x,z)=>ctl.setVirtualMove(x,z),onRun:value=>ctl.setVirtualRun(value),onInteract:()=>{const button=$('prompt');if(button&&!button.hidden&&$('doc').hidden)button.click();}});
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
  const route = new T.CatmullRomCurve3([...PATH, ...CAVE.slice(1), [CHAMBER.x, CHAMBER.z], ...CAVE.slice(1).reverse(), ...PATH_EAST].map(([x, z]) => new T.Vector3(x, 0, z)));

  let debugView = null;
  let last = performance.now(), refresh = 0, fpsAcc = 0, fpsN = 0, fps = 0, time = 0;
  const hud = $('hud'), zone = $('zone');
  const stats = () => ({ backend, quality, fps: Math.round(fps), calls: renderer.info.render.drawCalls ?? renderer.info.render.calls, triangles: renderer.info.render.triangles,
    fpsUpgrade:{inertia:true,water:river.fx.stats(),microSurfaces:true},instances: Object.fromEntries(kinds.map(k => [k.kind, k.visible])), total: Object.fromEntries(kinds.map(k => [k.kind, k.count])), zone: zoneAt(player.x, player.z), player: { ...player } });
  function frame(now) {
    const raw = now - last, dt = frameDelta(raw / 1000); last = now;
    if(gameplayHud.paused){requestAnimationFrame(frame);return;}
    time += dt;
    if (bench && !bench.done) {
      bench.t += dt; const u = clamp(bench.t / bench.duration, 0, 1), p = route.getPointAt(u), q = route.getPointAt(Math.min(1, u + .01));
      player.x = p.x; player.z = p.z; ctl.look.yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z)); ctl.look.pitch = -.05; if (bench.t > .5) bench.frames.push(raw);
      if (u >= 1) { bench.done = true; const f = [...bench.frames].sort((a, b) => a - b); bench.result = { frames: f.length, avgMs: f.reduce((a, b) => a + b, 0) / f.length, p95Ms: f[Math.floor(f.length * .95)], ...stats(), calls: bench.maxCalls, triangles: bench.maxTris, avgTriangles: Math.round(bench.sumTris / bench.n), updateMs: bench.cpuUpdate / bench.n, renderMs: bench.cpuRender / bench.n }; }
    } else {
      const inp = ctl.input(), sp = (inp.run ? PLAYER_SPEEDS.sprint : PLAYER_SPEEDS.walk) * (riverInfo(player.x, player.z).d < 4 && player.z > CLIFF_Z ? .55 : 1);
      const sideSpeed=inp.x*Math.min(sp*PLAYER_SPEEDS.side,PLAYER_SPEEDS.strafeMax),forwardSpeed=inp.z*sp*(inp.z>0?PLAYER_SPEEDS.back:1);
      const sin = Math.sin(ctl.look.yaw), cos = Math.cos(ctl.look.yaw),previous={x:player.x,z:player.z},travel=inertialMove(planarVelocity,(sideSpeed*cos+forwardSpeed*sin)*(inp.touchMoving?TOUCH_SPEED_MULTIPLIER:1),(-sideSpeed*sin+forwardSpeed*cos)*(inp.touchMoving?TOUCH_SPEED_MULTIPLIER:1),dt,{grounded:jumpOffset<=.015}),dx=travel.x,dz=travel.z;
      const tryMove = (nx, nz) => {
        if (Math.abs(nx) > HALF - 1 || Math.abs(nz) > HALF - 1) return false;
        const inCave = nz < CLIFF_Z && caveDistance(nx, nz) < 2, gh = groundHeight(nx, nz);
        if (!inCave && gh - terrainY > 1.2 && terrainY > 0) return false;     // the cliff is not climbable
        if (nz < CLIFF_Z - 1 && !inCave && player.z >= CLIFF_Z - 1 && caveDistance(player.x, player.z) >= 2) return false;
        if (blockedBy(nx, nz, colliders, trunks)) return false; player.x = nx; player.z = nz; return true;
      };
      const moveSteps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
      for(let i=0;i<moveSteps;i++){
        if (!tryMove(player.x + dx/moveSteps, player.z + dz/moveSteps)) { tryMove(player.x + dx/moveSteps, player.z); tryMove(player.x, player.z + dz/moveSteps); }
      }
      actualVelocity={x:(player.x-previous.x)/Math.max(dt,.001),z:(player.z-previous.z)/Math.max(dt,.001)};
      if(Math.abs(player.x-previous.x)<Math.abs(dx)*.35)planarVelocity.x=0;if(Math.abs(player.z-previous.z)<Math.abs(dz)*.35)planarVelocity.z=0;
    }
    const gy = groundHeight(player.x, player.z), ri = riverInfo(player.x, player.z), wy = ri.d < 6 ? waterY(ri.z) - .45 : -1e9;
    terrainY=lerp(terrainY,Math.max(gy,wy),Math.min(1,dt*12));
    // Chapter 07 is an exploration map without weapons; keep the requested PC
    // jump physics while retaining its original terrain-following controller.
    if(ctl.consumeJump()&&jumpOffset<=.015)jumpVelocity=6.2;
    if(jumpOffset>0||jumpVelocity>0){
      jumpOffset+=jumpVelocity*dt;jumpVelocity-=17.5*dt;
      if(jumpOffset<=0){jumpOffset=0;jumpVelocity=0;}
    }
    player.y=terrainY+jumpOffset;
    Object.assign(nanoGame.player,{x:player.x,z:player.z,elevation:player.y});nanoGame.time=time;
    if(zoneAt(player.x,player.z)==='La grotte'&&Math.hypot(player.x-nanoPoint.x,player.z-nanoPoint.z)<1.8&&Math.abs(player.y-nanoPoint.y)<1.2&&discoverNanoBlueprint(nanoGame,'spectral'))nanoGame.nano.plans.length=0;
    for(const event of nanoEvents.splice(0))nanoFx.handle(event);nanoFx.update(nanoGame,dt);
    camera.position.set(player.x, player.y + 1.65, player.z); camera.rotation.set(ctl.look.pitch, ctl.look.yaw, 0, 'YXZ');
    if(!bench){const pose=motion.update({time,dt,velocity:actualVelocity,yaw:ctl.look.yaw,pitch:ctl.look.pitch,grounded:jumpOffset<=.015,verticalSpeed:jumpVelocity});camera.position.y+=pose.cameraY;camera.rotation.z+=pose.cameraRoll;}
    if (debugView) { camera.position.set(debugView[0], debugView[1], debugView[2]); camera.lookAt(debugView[3], debugView[4], debugView[5]); }
    river.fx.update(time,camera.position);
    skyDome.position.copy(camera.position);
    camera.updateMatrixWorld();
    // Culling uses a wider view than the screen, and is redone as soon as the view turns or moves: nothing pops at the edges.
    cull.position.copy(camera.position); cull.quaternion.copy(camera.quaternion); cull.updateMatrixWorld();
    pv.multiplyMatrices(cull.projectionMatrix, cull.matrixWorldInverse); frustum.setFromProjectionMatrix(pv);
    const turned = Math.abs(ctl.look.yaw - lastView.yaw) > .07 || Math.abs(ctl.look.pitch - lastView.pitch) > .07 || Math.hypot(player.x - lastView.x, player.z - lastView.z) > 1.2;
    if (turned) { refresh = 0; Object.assign(lastView, { yaw: ctl.look.yaw, pitch: ctl.look.pitch, x: player.x, z: player.z }); }
    const t0 = performance.now(); if ((refresh -= dt) <= 0) { refresh = .1; for (const k of kinds) k.update(camera, frustum, Q); } const t1 = performance.now();
    fall.update(time);
    grotte.glow.intensity = 52 + Math.sin(time * 3) * 10; drones.update(time); dust.update(time, camera.position);
    for (const [k, l] of [...relics.lights, ...centre.lights].entries()) l.visible = Math.sin(time * (2 + k) + k) > -.2;
    n08.update(time, dt);
    story.update(player, dt);
    gameplayHud.update({zone:zoneAt(player.x,player.z),canInteract:!$('prompt').hidden&&!$('doc').hidden,finished:!$('fin').hidden});
    if (shadows) { sun.position.set(player.x + SUN_DIR.x * 120, SUN_DIR.y * 120, player.z + SUN_DIR.z * 120); sun.target.position.set(player.x, 0, player.z); }
    const inCave = zoneAt(player.x, player.z) === 'La grotte'; scene.fog.density = debugView ? .0025 : inCave ? .06 : FOG; horizon.setOutside(!inCave || debugView);
    // Inside the cave the sky no longer lights the rock: only the relay does.
    const shade = inCave ? clamp((CAVE[0][1] - player.z) / 6, 0, 1) : 0; hemi.intensity = lerp(1.7, .1, shade); sun.intensity = lerp(3.1, 0, shade);
    if (audio) audio.gain.gain.value = .22 * clamp(1 - Math.hypot(player.x - fall.x, player.z - fall.z) / 70, 0, 1) + .03;
    renderer.render(scene, camera); const t2 = performance.now();
    if (bench && !bench.done) { bench.cpuUpdate = (bench.cpuUpdate || 0) + t1 - t0; bench.cpuRender = (bench.cpuRender || 0) + t2 - t1; const c = renderer.info.render.drawCalls ?? renderer.info.render.calls, t3 = renderer.info.render.triangles; bench.maxCalls = Math.max(bench.maxCalls || 0, c); bench.maxTris = Math.max(bench.maxTris || 0, t3); bench.sumTris = (bench.sumTris || 0) + t3; bench.n = (bench.n || 0) + 1; }
    fpsAcc += dt; fpsN++; if (fpsAcc > .5) { fps = fpsN / fpsAcc; fpsAcc = fpsN = 0; const s = stats(); hud.textContent = `${s.backend} · qualité ${quality} · ${s.fps} i/s · ${s.calls} appels · ${(s.triangles / 1000).toFixed(0)} k triangles · arbres ${s.instances['conifères'] + s.instances['feuillus']}/${world.trees.length}`; zone.textContent = s.zone; }
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { renderer.setPixelRatio(renderPixelRatio(profile, devicePixelRatio, innerWidth, innerHeight)); renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); cull.aspect = camera.aspect * 1.25; cull.updateProjectionMatrix(); });
  window.__FORET = { scene, stats, story, view(v) { debugView = v; }, nano:()=>nanoSnapshot(nanoGame), hud: gameplayHud, get bench() { return bench?.result || null; }, teleport(x, z, yaw = 0) { player.x = x; player.z = z; terrainY=groundHeight(x,z);player.y=terrainY;jumpOffset=0;jumpVelocity=0;ctl.look.yaw=yaw; refresh = 0; }, look(yaw, pitch = 0) { ctl.look.yaw = yaw; ctl.look.pitch = pitch; refresh = 0; } };
  requestAnimationFrame(frame);
  return window.__FORET;
}

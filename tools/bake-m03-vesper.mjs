// Bakes the night Vesper sector of the visitor map (vesper-level1-v7.html?chapter=3, procedural « visite » renderer)
// into a compact binary for the three.js mission 03 page.
//   1. node tools/bake-m03-vesper.mjs extract <url> <out.json>   (needs Playwright + Chromium; the dist folder served at <url>)
//   2. node tools/bake-m03-vesper.mjs bake <in.json> dist/assets/m03
// The visitor geometry is made of quads only (Mesh.quad in the page): each quad is stored as 4 positions quantised to
// the centimetre (Int16), one sRGB-ish colour (3 × Uint8) and one material index (Uint8), sorted by material.
// Colliders: the page's own boxes plus every axis-aligned solid box found in the geometry that stands on the ground.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const [mode, a, b] = process.argv.slice(2);

async function extract(url, out) {
  const require = createRequire('/opt/node-tools/node_modules/');
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox']});
  const page = await (await browser.newContext({viewport: {width: 640, height: 360}})).newPage();
  await page.goto(url, {waitUntil: 'load'});
  await page.waitForFunction(() => { try { return staticMesh.vertexCount > 1000 && interactions.length > 0; } catch { return false; } }, null, {timeout: 600000});
  const data = await page.evaluate(() => ({v: Array.from(staticMesh.v), i: Array.from(staticMesh.i), pv: Array.from(portalMesh.v), dv: Array.from(droneMesh.v),
    collide, stairs, decks, signs: textureSigns.slice(0, 16), drones: drones.map(d => ({...d})), bounds: worldBounds}));
  fs.writeFileSync(out, JSON.stringify(data)); await browser.close();
}

function quads(v) {
  const n = v.length / 48, pos = new Int16Array(n * 12), col = new Uint8Array(n * 3), mat = new Uint8Array(n), uv = [];
  for (let q = 0; q < n; q++) {
    const base = q * 48;
    for (let k = 0; k < 4; k++) for (let c = 0; c < 3; c++) pos[q * 12 + k * 3 + c] = Math.round(v[base + k * 12 + c] * 100);
    for (let c = 0; c < 3; c++) col[q * 3 + c] = Math.round(Math.min(1, Math.max(0, v[base + 6 + c])) * 255);
    mat[q] = v[base + 11];
    uv.push([v[base + 9], v[base + 10], v[base + 2 * 12 + 9], v[base + 2 * 12 + 10]]);
  }
  return {n, pos, col, mat, uv};
}
function sortByMaterial({n, pos, col, mat, uv}) {
  const order = Array.from({length: n}, (_, i) => i).sort((p, q) => mat[p] - mat[q] || p - q);
  const P = new Int16Array(n * 12), C = new Uint8Array(n * 3), M = new Uint8Array(n), U = [];
  order.forEach((src, dst) => { P.set(pos.subarray(src * 12, src * 12 + 12), dst * 12); C.set(col.subarray(src * 3, src * 3 + 3), dst * 3); M[dst] = mat[src]; U.push(uv[src]); });
  const ranges = {}; for (let i = 0; i < n; i++) { const m = M[i]; ranges[m] ||= [i, 0]; ranges[m][1]++; }
  return {n, pos: P, col: C, mat: M, uv: U, ranges};
}
// Axis-aligned boxes emitted by Mesh.box: six consecutive quads over eight corners.
function boxes(v) {
  const out = [], n = v.length / 48;
  for (let q = 0; q + 6 <= n; q++) {
    const xs = new Set(), ys = new Set(), zs = new Set(), m0 = v[q * 48 + 11];
    let same = true;
    for (let k = 0; k < 24; k++) { const o = (q * 4 + k) * 12; if (v[o + 11] !== m0) { same = false; break; } xs.add(v[o].toFixed(3)); ys.add(v[o + 1].toFixed(3)); zs.add(v[o + 2].toFixed(3)); }
    if (!same || xs.size !== 2 || ys.size !== 2 || zs.size !== 2) continue;
    const [x1, x2] = [...xs].map(Number).sort((p, r) => p - r), [y1, y2] = [...ys].map(Number).sort((p, r) => p - r), [z1, z2] = [...zs].map(Number).sort((p, r) => p - r);
    out.push({x1, x2, y1, y2, z1, z2, mat: m0}); q += 5;
  }
  return out;
}
const SOLID_MATS = new Set([0, 1, 2, 3, 8, 9, 10, 13, 14, 16]);
function colliders(found, page, stairs = []) {
  const list = page.map(c => ({...c, source: 'page'}));
  for (const c of found) {
    const w = c.x2 - c.x1, d = c.z2 - c.z1, h = c.y2 - c.y1;
    if (!SOLID_MATS.has(c.mat) || c.y1 > 1.1 || h < .95 || Math.min(w, d) < .22 || w * d < .12) continue;
    // Steps of a stairway are walked on, not bumped into.
    if (stairs.some(st => c.x2 > st.x1 - .3 && c.x1 < st.x2 + .3 && c.z2 > st.zEnd - .3 && c.z1 < st.zStart + .3)) continue;
    // Skip what already sits inside a page collider.
    if (list.some(p => c.x1 >= p.x1 - .05 && c.x2 <= p.x2 + .05 && c.z1 >= p.z1 - .05 && c.z2 <= p.z2 + .05 && c.y2 <= p.y2 + .05)) continue;
    list.push({x1: c.x1, x2: c.x2, y1: Math.max(0, c.y1), y2: c.y2, z1: c.z1, z2: c.z2, label: 'géométrie', source: 'mesh'});
  }
  return list.map(c => Object.fromEntries(Object.entries(c).map(([k, val]) => [k, typeof val === 'number' ? +val.toFixed(3) : val])));
}

function bake(input, outDir) {
  const d = JSON.parse(fs.readFileSync(input, 'utf8'));
  fs.mkdirSync(outDir, {recursive: true});
  const world = sortByMaterial(quads(d.v)), portal = quads(d.pv), drone = quads(d.dv);
  const signs = []; for (let i = 0; i < world.n; i++) if (world.mat[i] === 30) signs.push([i, ...world.uv[i].map(x => +x.toFixed(4))]);
  const parts = [world.pos, world.col, world.mat, portal.pos, portal.col, portal.mat, drone.pos, drone.col, drone.mat];
  const offsets = []; let at = 0;
  for (const p of parts) { at = Math.ceil(at / 4) * 4; offsets.push(at); at += p.byteLength; }
  const bin = Buffer.alloc(at); parts.forEach((p, k) => Buffer.from(p.buffer, p.byteOffset, p.byteLength).copy(bin, offsets[k]));
  fs.writeFileSync(path.join(outDir, 'vesper-sector.bin'), bin);
  const meta = {version: 1, scale: .01, quads: world.n, portalQuads: portal.n, droneQuads: drone.n, offsets, ranges: world.ranges, signs, signLabels: d.signs,
    colliders: colliders(boxes(d.v), d.collide, d.stairs), stairs: d.stairs, decks: d.decks, drones: d.drones.map(r => Object.fromEntries(Object.entries(r).map(([k, val]) => [k, +(+val).toFixed(3)]))),
    portal: {x: 0, y: 11, z: -111, spin: .052}, bounds: d.bounds};
  fs.writeFileSync(path.join(outDir, 'vesper-sector.json'), JSON.stringify(meta));
  console.log('quads', world.n, 'bytes', bin.length, 'colliders', meta.colliders.length, '(page', d.collide.length + ')');
}

if (mode === 'extract') await extract(a, b);
else if (mode === 'bake') bake(a, b);
else console.log('usage: extract <url> <out.json> | bake <in.json> <outDir>');

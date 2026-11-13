// MISSION 03 — realistic street and interior objects in place of the baked boxes of the visitor map.
// The sector was baked from a page whose props are one to three plain boxes each (a jersey barrier was a grey cube, a
// street lamp a dark stick, a tree a green column). Each collider of the sector is classified (label, size, the
// materials and colours of the quads inside it), its baked quads are dropped from the sector meshes, and a modelled
// object is built in its place: same footprint, same height, same collision box (physics is not touched).
// All parts are merged per material: about twenty draw calls for the whole set.
import { roundedBox } from './webgpu-upgrade.js';
import { AREAS, sectorPropOffset, DEPOT, FACTORY } from './m03-layout.js';
import {faceBounds,inside,retiredDecoration} from './m03-coherence.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

// ---------- Classification ----------
// Returns [{ kind, c (collider), cx, cz, y, h, len, wid, along ('x'|'z'), face (yaw toward the avenue) }] and the set of
// world quads to drop.
export function classifySectorProps(meta, world, { bounds = meta.bounds } = {}) {
  const s = meta.scale, n = world?.n || 0, cells = new Map(), C = 4, out = [], drop = new Set();
  const cellKey = (x, z) => Math.floor(x / C) + ',' + Math.floor(z / C);
  const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0; const b = i * 12;
    for (let k = 0; k < 4; k++) { x += world.pos[b + k * 3]; y += world.pos[b + k * 3 + 1]; z += world.pos[b + k * 3 + 2]; }
    cx[i] = x / 4 * s; cy[i] = y / 4 * s; cz[i] = z / 4 * s;
    if(retiredDecoration(faceBounds(world,i,s))||world.mat[i]===4&&AREAS.some(a=>a.roof&&cx[i]>=a.x1&&cx[i]<=a.x2&&cz[i]>=a.z1&&cz[i]<=a.z2&&cy[i]<a.roof))drop.add(i);
    const key = cellKey(cx[i], cz[i]); let list = cells.get(key); if (!list) cells.set(key, list = []); list.push(i);
  }
  const quadsIn = (c, pad = .06, top = .3) => {
    const res = [];
    for (let gx = Math.floor((c.x1 - pad) / C); gx <= Math.floor((c.x2 + pad) / C); gx++) for (let gz = Math.floor((c.z1 - pad) / C); gz <= Math.floor((c.z2 + pad) / C); gz++)
      for (const i of cells.get(gx + ',' + gz) || []) if (cx[i] >= c.x1 - pad && cx[i] <= c.x2 + pad && cz[i] >= c.z1 - pad && cz[i] <= c.z2 + pad && cy[i] >= Math.max(0, c.y1) - .15 && cy[i] <= c.y2 + top) res.push(i);
    return res;
  };
  for (const c of meta.colliders) {
    if (!(c.x2 > bounds.minX && c.x1 < bounds.maxX && c.z2 > bounds.minZ && c.z1 < bounds.maxZ)) continue;
    const w = c.x2 - c.x1, d = c.z2 - c.z1, y = Math.max(0, c.y1), h = c.y2 - y, lo = Math.min(w, d), hi = Math.max(w, d);
    const quads = quadsIn(c), mats = {}; let red = 0, plant = 0, cyan = 0, amber = 0, white = 0;
    for (const i of quads) { const m = world.mat[i]; mats[m] = (mats[m] || 0) + 1; const r = world.col[i * 3], g = world.col[i * 3 + 1], b = world.col[i * 3 + 2];
      if (m === 4) plant++; if (r > 200 && g < 60) red++; if (m === 6 || (b > 230 && r < 80)) cyan++; if (m === 7) amber++; if (m === 10) white++; }
    const total = quads.length || 1, label = c.label;
    let kind = null;
    if (label === 'barrière béton') kind = 'jersey';
    else if (label === 'établi') kind = 'workbench';
    else if (label === 'lit médical') kind = 'bed';
    else if (label === 'barricade') kind = 'barricade';
    else if (label !== 'géométrie') kind = null;
    else if (lo >= 2.8 && h <= 7 && plant / total > .45) kind = 'cabin';
    else if (lo >= .45 && hi <= 1.2 && h <= 1.3 && white > 0 && red > 0) kind = 'medcase';
    else if (lo >= .6 && hi <= 1.25 && h >= 1.2 && h <= 1.9 && cyan > 0) kind = 'vending';
    else if (lo >= 1.4 && hi <= 2.4 && h <= 1.3 && quads.length >= 20) kind = 'generator';
    else if (lo >= .55 && hi <= 1.05 && h >= 4 && h <= 5.5 && y > .3 && (cyan || amber)) kind = 'rack';
    else if (lo >= .7 && hi <= .9 && h <= 1.25 && y < .1) kind = 'bollard';
    else if (lo >= .45 && hi <= .9 && h >= 7.5 && h <= 13 && plant / total > .4) kind = 'tree';
    else if (lo >= .45 && hi <= .9 && h >= 7.5 && h <= 13) kind = 'lamp';
    else if (lo >= .5 && hi <= .7 && h >= 1.3 && h <= 6.2) kind = 'mast';
    if (!kind) continue;
    // Inside the annexe or the workshop a pole is a structural column or a service riser, never a street lamp.
    const indoor = AREAS.some(a => a.roof && (c.x1 + c.x2) / 2 >= a.x1 && (c.x1 + c.x2) / 2 <= a.x2 && (c.z1 + c.z2) / 2 >= a.z1 && (c.z1 + c.z2) / 2 <= a.z2);
    // The row at z −56 carries the viaduct (« route haute »): piers, not lamps. Other tall poles are steel stanchions.
    if (kind === 'lamp') kind = Math.abs((c.z1 + c.z2) / 2 + 56) < 1.5 ? 'pier' : 'stanchion';
    if (indoor && (kind === 'lamp' || kind === 'tree')) kind = 'column';
    else if (indoor && kind === 'mast') kind = 'riser';
    // Centroids can sit inside a small prop while the actual face spans a wall
    // or ceiling. Retire only complete owned faces, never a whole building face.
    const owned={...c,y1:Math.max(0,c.y1)-.15,y2:c.y2+.3};
    if(kind==='rack'){owned.x1-=.2;owned.x2+=.2;owned.z1-=.2;owned.z2+=.2;}
    if(kind==='lamp'||kind==='post'&&h>4.5){owned.x1-=3.2;owned.x2+=3.2;owned.y2+=.5;}
    for(let gx=Math.floor(owned.x1/C);gx<=Math.floor(owned.x2/C);gx++)for(let gz=Math.floor(owned.z1/C);gz<=Math.floor(owned.z2/C);gz++)for(const i of cells.get(gx+','+gz)||[])if(inside(faceBounds(world,i,s),owned,.06))drop.add(i);
    const along = w >= d ? 'x' : 'z', mx = (c.x1 + c.x2) / 2, mz = (c.z1 + c.z2) / 2;
    const offset=sectorPropOffset(c);
    const ground=Math.max(0,...meta.decks.filter(f=>mx>=f.x1&&mx<=f.x2&&mz>=f.z1&&mz<=f.z2&&f.h<=y+.1).map(f=>f.h));
    out.push({ kind, c, cx: mx+offset.x, cz: mz+offset.z, y:ground, h:c.y2-ground, len: hi, wid: lo, along, face: mx > 0 ? -Math.PI / 2 : Math.PI / 2 });
  }
  // Loose scatter of the visitor map (thousands of tiny debris quads and floating foliage sown at random over the
  // ground): dropped, so the ground reads as a paved, maintained sector. Anything that belongs to a collider (walls,
  // furniture, vehicles), every light and sign, and the road surface are kept.
  const KEEP = new Set([2, 5, 6, 7, 9, 11, 12, 15, 17]), colCells = new Map();
  for (const c of meta.colliders) for (let gx = Math.floor((c.x1 - .15) / C); gx <= Math.floor((c.x2 + .15) / C); gx++) for (let gz = Math.floor((c.z1 - .15) / C); gz <= Math.floor((c.z2 + .15) / C); gz++) { const k = gx + ',' + gz; let l = colCells.get(k); if (!l) colCells.set(k, l = []); l.push(c); }
  const owned = i => (colCells.get(cellKey(cx[i], cz[i])) || []).some(c => cx[i] >= c.x1 - .15 && cx[i] <= c.x2 + .15 && cz[i] >= c.z1 - .15 && cz[i] <= c.z2 + .15 && cy[i] <= c.y2 + .5);
  let scatter = 0;
  for (let i = 0; i < n; i++) {
    // The depot is rebuilt as an interior (m03-depot.js): its baked closed hull goes.
    if (cx[i] > DEPOT.x1 - .3 && cx[i] < DEPOT.x2 + .3 && cz[i] > DEPOT.z1 - .3 && cz[i] < DEPOT.z2 + .3 && cy[i] < DEPOT.height + .3) { drop.add(i); continue; }
    if (cx[i] > FACTORY.x1 - .3 && cx[i] < FACTORY.x2 - .7 && cz[i] > FACTORY.z1 - .3 && cz[i] < FACTORY.z2 + .3 && cy[i] < FACTORY.height + .3) { drop.add(i); continue; } // the plant, rebuilt as an interior (its east-face balconies stay)
    if (drop.has(i) || cx[i] < bounds.minX || cx[i] > bounds.maxX || cz[i] < bounds.minZ || cz[i] > bounds.maxZ) continue;
    const m = world.mat[i]; if (KEEP.has(m)) continue;
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; const b = i * 12;
    for (let k = 0; k < 4; k++) for (let a = 0; a < 3; a++) { const v = world.pos[b + k * 3 + a] * s; if (v < lo[a]) lo[a] = v; if (v > hi[a]) hi[a] = v; }
    const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    const loosePlant = m === 4 && ext < 3, debris = ext < .7 && hi[1] < 3 && hi[1] > .02;
    if ((loosePlant || debris) && !owned(i)) { drop.add(i); scatter++; }
  }
  return { props: out, drop, scatter };
}

// ---------- Geometry helpers ----------
function merged(T) {
  const buckets = new Map(), m4 = new T.Matrix4(), n3 = new T.Matrix3(), v = new T.Vector3();
  return {
    add(material, geometry, matrix) { let list = buckets.get(material); if (!list) buckets.set(material, list = []); list.push([geometry, matrix.clone()]); },
    build(group, name) {
      let triangles = 0;
      for (const [material, list] of buckets) {
        let vertices = 0, indices = 0;
        for (const [g] of list) { vertices += g.attributes.position.count; indices += g.index ? g.index.count : g.attributes.position.count; }
        const P = new Float32Array(vertices * 3), N = new Float32Array(vertices * 3), U = new Float32Array(vertices * 2), Col = new Float32Array(vertices * 3), I = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
        let vo = 0, io = 0; const hasColor = list.some(([g]) => g.attributes.color);
        for (const [g, matrix] of list) {
          n3.getNormalMatrix(matrix); const p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv, col = g.attributes.color;
          for (let i = 0; i < p.count; i++) {
            v.set(p.getX(i), p.getY(i), p.getZ(i)).applyMatrix4(matrix); P.set([v.x, v.y, v.z], (vo + i) * 3);
            if (nn) { v.set(nn.getX(i), nn.getY(i), nn.getZ(i)).applyMatrix3(n3).normalize(); N.set([v.x, v.y, v.z], (vo + i) * 3); }
            if (uv) { U[(vo + i) * 2] = uv.getX(i); U[(vo + i) * 2 + 1] = uv.getY(i); }
            if (hasColor) { if (col) Col.set([col.getX(i), col.getY(i), col.getZ(i)], (vo + i) * 3); else Col.set([1, 1, 1], (vo + i) * 3); }
          }
          if (g.index) for (let k = 0; k < g.index.count; k++) I[io + k] = g.index.getX(k) + vo; else for (let k = 0; k < p.count; k++) I[io + k] = vo + k;
          vo += p.count; io += g.index ? g.index.count : p.count;
        }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setAttribute('uv', new T.BufferAttribute(U, 2));
        if (hasColor) geo.setAttribute('color', new T.BufferAttribute(Col, 3));
        geo.setIndex(new T.BufferAttribute(I, 1)); geo.computeBoundingSphere(); geo.userData.webgpuShape = 'prop';
        const mesh = new T.Mesh(geo, material); mesh.name = name + ' · ' + (material.name || 'matière'); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.userData.webgpuShape = 'prop';
        group.add(mesh); triangles += indices / 3;
      }
      return { meshes: buckets.size, triangles };
    }
  };
}

export function createSectorProps(T, root, props, { low = false, rich = false } = {}) {
  const group = new T.Group(); group.name = 'M03 / objets du secteur (modélisés)'; root.add(group);
  const rng = seeded(300311), seg = low ? .6 : 1, S = n => Math.max(6, Math.round(n * seg));
  const loader = new T.TextureLoader(), cache = new Map();
  const tex = (url, srgb = true, repeat = 1) => { const key = url + repeat; if (cache.has(key)) return cache.get(key); const t = loader.load(url, () => {}, undefined, () => {}); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 8; cache.set(key, t); return t; };
  const canvas = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; };
  const Mat = rich ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
  const mat = (name, o, phys = {}) => { const m = new Mat({ ...o, ...(rich ? phys : {}) }); m.name = name; if (rich) m.userData.webgpuPhysical = true; return m; };
  const glow = (name, color) => { const m = new T.MeshBasicMaterial({ color, toneMapped: false }); m.name = name; return m; };
  const nor = (url, k = .8) => (low ? {} : { normalMap: tex(url, false), normalScale: new T.Vector2(k, k) });
  const cc = n => './assets/cc0/' + n, l9 = (n, ch) => `./assets/ligne9/l9-${n}_${ch}_512.jpg`;
  const hazard = canvas(256, 64, (c, w, h) => { c.fillStyle = '#e8b11c'; c.fillRect(0, 0, w, h); c.fillStyle = '#121212'; for (let x = -h; x < w + h; x += 48) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 24, h); c.lineTo(x + 24 + h, 0); c.lineTo(x + h, 0); c.closePath(); c.fill(); } });
  hazard.wrapS = T.RepeatWrapping;
  const stripes = canvas(256, 32, (c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#d8dcdf' : '#c4182a'; c.fillRect(x, 0, 32, h); } });
  const cross = canvas(256, 256, (c, w, h) => { c.fillStyle = '#eef2f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8172b'; c.fillRect(w * .38, h * .16, w * .24, h * .68); c.fillRect(w * .16, h * .38, w * .68, h * .24); c.fillStyle = '#5b6468'; c.font = '700 22px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('SOINS · 救急', w / 2, h * .95); });
  const vendingTex = canvas(256, 512, (c, w, h) => {
    c.fillStyle = '#04070b'; c.fillRect(0, 0, w, h); const r = seeded(77);
    const g = c.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, '#ff3d9a'); g.addColorStop(1, '#7a1bff'); c.fillStyle = g; c.fillRect(0, 0, w, 86);
    c.fillStyle = '#fff'; c.font = '900 40px "Arial Narrow",system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('NEO·COLA', w / 2, 56);
    for (let row = 0; row < 6; row++) for (let col = 0; col < 4; col++) { const x = 14 + col * 58, y = 104 + row * 62, hue = ['#ff4fa1', '#5fe0f0', '#ffb35c', '#9df27a', '#c06bff'][Math.floor(r() * 5)];
      c.fillStyle = '#0f1822'; c.fillRect(x, y, 50, 54); c.fillStyle = hue; c.fillRect(x + 14, y + 8, 22, 38); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x + 16, y + 10, 4, 34); c.fillStyle = '#9fb3c2'; c.font = '700 11px system-ui'; c.fillText((1 + row) * 10 + col + '¥', x + 25, y + 53); }
    c.fillStyle = '#16212c'; c.fillRect(0, h - 60, w, 60); c.fillStyle = '#5fe0f0'; c.fillRect(w - 70, h - 46, 46, 30);
  });
  const monitorTex = canvas(256, 160, (c, w, h) => { c.fillStyle = '#021014'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3dffa0'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x < w; x += 4) { const k = x % 64, y = k > 22 && k < 30 ? (k === 24 ? 20 : k === 26 ? 110 : 60) : 62 + Math.sin(x * .3) * 2; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.fillStyle = '#5fe0f0'; c.font = '700 26px system-ui'; c.fillText('82', 14, 140); c.fillStyle = '#ffb35c'; c.fillText('97%', 150, 140); });
  const M = {
    concrete: mat('béton', { map: tex(cc('vesper-concrete_diff_512.jpg'), true, 1), color: 0xb7b3aa, roughness: .92, metalness: 0, ...nor(l9('concrete_wall_006', 'nor'), 1) }),
    stripe: mat('bande réfléchissante', { map: stripes, roughness: .35, metalness: .1, emissive: 0x200508, emissiveIntensity: .4 }, { clearcoat: .8, clearcoatRoughness: .1 }),
    rust: mat('acier rouillé', { map: tex(cc('rusty_painted_metal_diff_512.jpg')), color: 0xffffff, roughness: .7, metalness: .25, ...nor(cc('rusty_painted_metal_normal_512.jpg'), 1) }),
    drumBlue: mat('fût peint', { map: tex(cc('vesper-steel_diff_512.jpg')), color: 0x4f7fb8, roughness: .5, metalness: .12, ...nor(cc('rusty_painted_metal_normal_512.jpg'), 1) }, { clearcoat: .25, clearcoatRoughness: .4 }),
    drumRed: mat('fût rouge', { map: tex(cc('vesper-steel_diff_512.jpg')), color: 0xc04a3a, roughness: .5, metalness: .12, ...nor(cc('rusty_painted_metal_normal_512.jpg'), 1) }, { clearcoat: .25, clearcoatRoughness: .4 }),
    steel: mat('acier sombre', { map: tex(cc('vesper-steel_diff_512.jpg')), color: 0x6b747e, roughness: .34, metalness: .7 }, { clearcoat: .3, clearcoatRoughness: .3 }),
    galva: mat('acier galvanisé', { map: tex(cc('vesper-steel_diff_512.jpg')), color: 0xb5bdc2, roughness: .32, metalness: .9 }),
    chrome: mat('chrome', { color: 0xd9dee2, roughness: .14, metalness: 1 }),
    enamel: mat('émail blanc', { color: 0xe8edeb, roughness: .32, metalness: .08 }, { clearcoat: .7, clearcoatRoughness: .1 }),
    crossPanel: mat('croix de soins', { map: cross, roughness: .35, metalness: 0 }, { clearcoat: .7, clearcoatRoughness: .1 }),
    mattress: mat('matelas', { color: 0x5b8aa5, roughness: .9, metalness: 0 }, { sheen: 1, sheenRoughness: .6, sheenColor: 0xbfe0f0 }),
    linen: mat('drap', { color: 0xe6ebe8, roughness: .95, metalness: 0 }, { sheen: .8, sheenRoughness: .7, sheenColor: 0xffffff }),
    wood: mat('bois d’établi', { color: 0x8a6440, roughness: .72, metalness: 0, map: tex(cc('vesper-paint_diff_512.jpg')) }, { clearcoat: .2, clearcoatRoughness: .5 }),
    yellow: mat('peinture industrielle', { map: tex(cc('vesper-steel_diff_512.jpg')), color: 0xe0a92a, roughness: .45, metalness: .1, ...nor(cc('rusty_painted_metal_normal_512.jpg'), .7) }, { clearcoat: .4, clearcoatRoughness: .25 }),
    dark: mat('caoutchouc et plastique', { color: 0x16191d, roughness: .82, metalness: .05 }),
    cardboard: mat('carton', { color: 0xa47e52, roughness: .96, metalness: 0 }),
    hazard: mat('bandes de danger', { map: hazard, roughness: .5, metalness: .2 }, { clearcoat: .5, clearcoatRoughness: .2 }),
    sandbag: mat('sacs de sable', { color: 0x8a7756, roughness: 1, metalness: 0, ...nor(l9('concrete_wall_006', 'nor'), .6) }, { sheen: .5, sheenRoughness: .9, sheenColor: 0xc8b48a }),
    bark: mat('écorce', { color: 0x4b3b2d, roughness: .96, metalness: 0, ...nor(l9('concrete_wall_006', 'nor'), 1.4) }),
    leaves: mat('feuillage', { vertexColors: true, roughness: .78, metalness: 0 }, { sheen: .6, sheenRoughness: .5, sheenColor: 0x9fd08a }),
    glass: mat('verre', { color: 0x0e161d, roughness: .05, metalness: .2, transparent: true, opacity: .5 }, { clearcoat: 1, clearcoatRoughness: .02 }),
    cabinA: mat('module blanc', { map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0xd9dee0, roughness: .5, metalness: .2, ...nor(cc('corrugated_iron_normal_512.jpg'), 1) }, { clearcoat: .3, clearcoatRoughness: .35 }),
    cabinB: mat('module bleu', { map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0x4f86a8, roughness: .5, metalness: .2, ...nor(cc('corrugated_iron_normal_512.jpg'), 1) }, { clearcoat: .3, clearcoatRoughness: .35 }),
    cabinC: mat('module orange', { map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0xc7743a, roughness: .5, metalness: .2, ...nor(cc('corrugated_iron_normal_512.jpg'), 1) }, { clearcoat: .3, clearcoatRoughness: .35 }),
    vending: new T.MeshBasicMaterial({ map: vendingTex, toneMapped: false }), monitor: new T.MeshBasicMaterial({ map: monitorTex, toneMapped: false }),
    warm: glow('lumière chaude', 0xffd9a0), red: glow('feu rouge', 0xff2433), amber: glow('feu orange', 0xffa62b), cyan: glow('témoin cyan', 0x5fe0f0), green: glow('feu vert', 0x3dff8a)
  };
  M.vending.name = 'façade de distributeur'; M.monitor.name = 'écran de moniteur';
  const out = merged(T), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), pv = new T.Vector3(), sv = new T.Vector3(1, 1, 1);
  let frame = new T.Matrix4();
  // Places a part in the current object's frame (x along the object's length, y up, z across, origin on the ground).
  const put = (material, geometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    m4.compose(pv.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sv.set(sx, sy, sz)); out.add(material, geometry, frame.clone().multiply(m4));
  };
  const geo = new Map(), g = (key, make) => { if (!geo.has(key)) geo.set(key, make()); return geo.get(key); };
  const box = (w, h, d, r = 0) => g(`b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r}`, () => r > 0 && !low ? roundedBox(T, w, h, d, Math.min(r, Math.min(w, h, d) * .45)) : new T.BoxGeometry(w, h, d));
  const cyl = (rt, rb, h, n = 16) => g(`c${rt},${rb},${h},${n}`, () => new T.CylinderGeometry(rt, rb, h, S(n)));
  const sph = (r, n = 16) => g(`s${r},${n}`, () => new T.SphereGeometry(r, S(n), Math.max(4, Math.round(S(n) * .6))));
  const stats = {};
  const begin = (p, yaw = 0) => { frame = new T.Matrix4().compose(pv.set(p.cx, p.y, p.cz), q.setFromEuler(e.set(0, yaw, 0)), sv.set(1, 1, 1)); stats[p.kind] = (stats[p.kind] || 0) + 1; };
  const longYaw = p => p.along === 'x' ? 0 : Math.PI / 2; // local +x follows the long side

  // ---------- Models ----------
  const jerseyGeo = g('jersey', () => {
    const s = new T.Shape(); s.moveTo(-.30, 0); s.lineTo(.30, 0); s.lineTo(.30, .075); s.lineTo(.17, .32); s.bezierCurveTo(.12, .55, .1, .9, .1, 1.04); s.lineTo(.08, 1.1); s.lineTo(-.08, 1.1); s.lineTo(-.1, 1.04); s.bezierCurveTo(-.1, .9, -.12, .55, -.17, .32); s.lineTo(-.30, .075); s.closePath();
    const geo = new T.ExtrudeGeometry(s, { depth: 1.94, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: low ? 1 : 3, curveSegments: low ? 6 : 14 });
    geo.translate(0, 0, -.97); geo.rotateY(Math.PI / 2); return geo;
  });
  function jersey(p) {
    const t = rng(); begin(p, longYaw(p) + (t - .5) * .06);
    put(M.concrete, jerseyGeo, 0, 0, 0, 0, 0, (rng() - .5) * .03);
    put(M.stripe, box(1.4, .09, .005), 0, .72, .127, 0, 0, 0); put(M.stripe, box(1.4, .09, .005), 0, .72, -.127, 0, Math.PI, 0);
    for (const x of [-.55, .55]) put(M.dark, box(.28, .07, .62), x, .035, 0);                // fork slots
    put(M.galva, g('loop', () => new T.TorusGeometry(.06, .012, 6, 14, Math.PI)), 0, 1.1, 0, 0, 0, 0);
  }
  const drumGeo = g('drum', () => { const pts = []; const R = .29, H = .88; pts.push(new T.Vector2(0, 0), new T.Vector2(R - .01, 0), new T.Vector2(R, .015));
    for (const k of [.1, .33, .66, .9]) { const y = H * k; pts.push(new T.Vector2(R, y - .02), new T.Vector2(R + .012, y - .008), new T.Vector2(R + .012, y + .008), new T.Vector2(R, y + .02)); }
    pts.push(new T.Vector2(R, H - .015), new T.Vector2(R - .012, H), new T.Vector2(R - .03, H - .01), new T.Vector2(0, H - .01)); return new T.LatheGeometry(pts, S(28)); });
  function drum(p) {
    begin(p, rng() * TAU); const m = [M.drumBlue, M.rust, M.drumRed][Math.floor(rng() * 3)], tilt = rng() < .2;
    if (tilt) put(m, drumGeo, 0, .29, 0, 0, 0, Math.PI / 2); else put(m, drumGeo, 0, 0, 0, (rng() - .5) * .04, 0, (rng() - .5) * .04);
    if (!tilt) { put(M.galva, cyl(.035, .035, .02, 10), .14, .885, .08); put(M.galva, cyl(.025, .025, .02, 8), -.16, .885, -.05); }
    if (!tilt && rng() < .5) put(M.cardboard, box(.34, .22, .3, .01), (rng() - .5) * .1, .99, (rng() - .5) * .1, 0, rng(), 0);
  }
  function lamp(p) {
    const H = p.h, toward = p.cx > 0 ? Math.PI : 0; begin(p, toward);
    put(M.concrete, box(.62, .32, .62, .04), 0, .16, 0); put(M.steel, box(.4, .16, .4, .03), 0, .4, 0);
    for (const [x, z] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) put(M.galva, cyl(.022, .022, .07, 8), x, .5, z);
    put(M.steel, cyl(.085, .14, H - .5, 18), 0, .48 + (H - .5) / 2, 0); put(M.dark, box(.2, .5, .14, .03), 0, 1.5, .14);
    put(M.steel, cyl(.11, .11, .14, 18), 0, H * .62, 0);
    const reach = Math.min(2.6, H * .26), arm = g('arm' + reach.toFixed(2), () => { const c = new T.CatmullRomCurve3([new T.Vector3(0, 0, 0), new T.Vector3(.1, .55, 0), new T.Vector3(.6, .95, 0), new T.Vector3(reach, 1.0, 0)]); return new T.TubeGeometry(c, S(24), .06, S(10), false); });
    put(M.steel, arm, 0, H - 1, 0);
    put(M.steel, box(.85, .14, .36, .05), reach + .3, H - .02, 0, 0, 0, -.05); put(M.warm, box(.66, .02, .24), reach + .32, H - .1, 0, 0, 0, -.05);
    put(M.dark, box(.08, .55, .08), 0, H * .45, -.1);
  }
  function tree(p) {
    begin(p, rng() * TAU); const H = p.h, trunkH = H * .5;
    put(M.concrete, box(1.4, .42, 1.4, .05), 0, .21, 0); put(M.dark, box(1.24, .06, 1.24), 0, .42, 0);
    put(M.bark, cyl(.11, .19, trunkH, 12), 0, .42 + trunkH / 2, 0, (rng() - .5) * .08, 0, (rng() - .5) * .08);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + rng(), l = 1 + rng() * .8; put(M.bark, cyl(.04, .08, l, 8), Math.cos(a) * l * .35, .42 + trunkH * (.75 + k * .07) + l * .3, Math.sin(a) * l * .35, Math.sin(a) * .7, 0, -Math.cos(a) * .7); }
    const blobs = low ? 4 : 7;
    for (let k = 0; k < blobs; k++) { const a = rng() * TAU, r = k ? .8 + rng() * 1.1 : 0, size = 1.1 + rng() * .9, y = .42 + trunkH + .6 + rng() * (H - trunkH - 1.8);
      put(M.leaves, canopy(Math.floor(rng() * 4)), Math.cos(a) * r, y, Math.sin(a) * r, rng(), rng() * TAU, 0, size, size * (.75 + rng() * .3), size); }
  }
  function canopy(variant) {
    return g('canopy' + variant, () => {
      const geo = new T.IcosahedronGeometry(1, low ? 2 : 3), p = geo.attributes.position, col = new Float32Array(p.count * 3), r = seeded(9001 + variant), v = new T.Vector3();
      const base = [[.16, .3, .17], [.2, .36, .19], [.13, .26, .16], [.24, .38, .2]][variant];
      for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)); const n = .78 + .22 * Math.sin(v.x * 5.1 + variant) * Math.sin(v.y * 4.3) * Math.cos(v.z * 4.7) + (r() - .5) * .14; v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
        const shade = .65 + .45 * Math.max(0, v.y) + (r() - .5) * .2; col.set([base[0] * shade, base[1] * shade * (1 + (r() - .5) * .2), base[2] * shade], i * 3); }
      geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo;
    });
  }
  function bush(p) {
    begin(p, 0); const w = p.c.x2 - p.c.x1, d = p.c.z2 - p.c.z1, h = Math.min(p.h, 5.5), count = Math.min(low ? 8 : 16, Math.round(w * d * h / 9) + 4);
    for (let k = 0; k < Math.min(3, Math.round(w * d / 14)); k++) put(M.bark, cyl(.07, .14, h * .6, 8), (rng() - .5) * w * .5, h * .3, (rng() - .5) * d * .5, (rng() - .5) * .2, 0, (rng() - .5) * .2);
    for (let k = 0; k < count; k++) { const s = .7 + rng() * Math.min(1.6, Math.min(w, d) * .3), y = s * .55 + rng() * Math.max(0, h - s * 1.4);
      put(M.leaves, canopy(Math.floor(rng() * 4)), (rng() - .5) * (w - s), y, (rng() - .5) * (d - s), rng(), rng() * TAU, 0, s, s * (.8 + rng() * .3), s); }
  }
  function post(p) {
    const H = p.h, toward = p.cx > 0 ? -Math.PI / 2 : Math.PI / 2; begin(p, toward);
    if (H < 2.4) { // street bollard with a lit ring
      put(M.steel, cyl(.13, .15, H - .16, 20), 0, (H - .16) / 2, 0); put(M.steel, sph(.13, 18), 0, H - .16, 0, 0, 0, 0, 1, .6, 1);
      put(M.amber, cyl(.152, .152, .05, 20), 0, H * .72, 0); put(M.galva, cyl(.17, .19, .06, 20), 0, .03, 0); return;
    }
    put(M.galva, cyl(.17, .2, .08, 18), 0, .04, 0); put(M.steel, cyl(.07, .09, H, 16), 0, H / 2, 0);
    if (H < 4.5) { // traffic signal
      put(M.dark, box(.34, 1.0, .3, .05), 0, H - .55, .2); put(M.dark, box(.5, 1.14, .04, .02), 0, H - .55, .04);
      [M.red, M.amber, M.green].forEach((m, k) => { put(m, cyl(.1, .1, .02, 16), 0, H - .24 - k * .31, .36, Math.PI / 2, 0, 0); put(M.dark, cyl(.12, .12, .14, 16), 0, H - .24 - k * .31, .4, Math.PI / 2, 0, 0, 1, 1, 1); });
      put(M.galva, box(.6, .4, .02, .02), 0, H * .55, .09);
    } else { // slim street light with an LED bar
      put(M.steel, box(1.2, .07, .07), .55, H - .05, 0); put(M.dark, box(.62, .08, .16, .03), 1.0, H - .1, 0); put(M.warm, box(.54, .015, .1), 1.0, H - .145, 0);
      put(M.dark, box(.16, .36, .1, .02), 0, 2.2, .1);
    }
  }
  function rack(p) {
    begin(p, longYaw(p)); const L = p.len - .1, D = p.wid - .1, H = p.h, y0 = 0;
    for (const x of [-L / 2, L / 2]) for (const z of [-D / 2, D / 2]) put(M.yellow, box(.06, H, .06), x, y0 + H / 2, z);
    for (let k = 0; k < 4; k++) { const y = y0 + .15 + k * (H - .3) / 3; put(M.galva, box(L, .04, D), 0, y, 0); put(M.steel, box(L, .06, .04), 0, y + .03, D / 2);
      if (k < 3) for (let b = 0; b < 2 + Math.floor(rng() * 2); b++) { const w = .25 + rng() * .3, h = .2 + rng() * .3; put(rng() < .5 ? M.cardboard : M.dark, box(w, h, D * .7, .01), -L / 2 + .2 + rng() * (L - .4), y + .02 + h / 2, (rng() - .5) * .1, 0, (rng() - .5) * .2, 0); } }
    put(rng() < .5 ? M.cyan : M.amber, box(L * .8, .02, .02), 0, y0 + H - .05, D / 2 + .02);
  }
  function workbench(p) {
    begin(p, longYaw(p)); const L = Math.min(p.len, 2.9), D = Math.min(p.wid, 1.2), top = .92;
    put(M.wood, box(L, .06, D * .82, .015), 0, top, 0); put(M.steel, box(L, .06, .04), 0, top - .06, D * .41);
    for (const x of [-L / 2 + .06, L / 2 - .06]) for (const z of [-D * .38, D * .38]) put(M.steel, box(.05, top - .03, .05), x, (top - .03) / 2, z);
    put(M.galva, box(L - .1, .03, D * .7), 0, .2, 0);
    put(M.drumRed, box(.52, .62, D * .72, .02), L / 2 - .4, .52, 0); for (let k = 0; k < 4; k++) put(M.chrome, box(.22, .015, .02), L / 2 - .4, .3 + k * .15, D * .37);
    put(M.steel, box(.18, .12, .3, .02), -L / 2 + .3, top + .09, D * .3); put(M.steel, box(.05, .05, .32), -L / 2 + .3, top + .19, D * .3); put(M.chrome, cyl(.012, .012, .32, 8), -L / 2 + .3, top + .1, D * .48, Math.PI / 2, 0, 0);
    put(M.galva, box(L, .9, .02), 0, top + .5, -D * .42); for (let k = 0; k < 8; k++) put(rng() < .5 ? M.steel : M.drumRed, box(.03, .18 + rng() * .14, .02), -L / 2 + .2 + k * (L - .4) / 7, top + .55, -D * .4);
    put(M.dark, box(.4, .14, .26, .03), .2, top + .1, .05, 0, rng(), 0); put(M.yellow, box(.18, .08, .1, .02), -.4, top + .07, 0, 0, rng(), 0);
  }
  function medcase(p) {
    begin(p, p.face); const W = Math.min(.82, p.len), D = Math.min(.55, p.wid), H = Math.min(p.h, 1.05);
    put(M.enamel, box(W, H - .06, D, .03), 0, .06 + (H - .06) / 2, 0); for (const x of [-W / 2 + .06, W / 2 - .06]) put(M.dark, box(.05, .06, D - .06), x, .03, 0);
    put(M.crossPanel, box(W * .7, (H - .06) * .58, .01), 0, .06 + (H - .06) * .58, D / 2 + .006);
    put(M.dark, box(.006, H - .16, .006), 0, .06 + (H - .06) / 2, D / 2 + .004); for (const x of [-.06, .06]) put(M.chrome, box(.02, .14, .03, .008), x, .06 + (H - .06) * .5, D / 2 + .02);
    put(M.red, box(.06, .02, .02), W / 2 - .08, H - .04, D / 2 + .005);
  }
  function bed(p) {
    begin(p, longYaw(p)); const L = 2.05, W = .95, deck = .58;
    for (const x of [-L / 2 + .12, L / 2 - .12]) for (const z of [-W / 2 + .08, W / 2 - .08]) { put(M.chrome, cyl(.02, .02, deck - .12, 8), x, (deck - .12) / 2 + .1, z); put(M.dark, cyl(.06, .06, .04, 14), x, .06, z, Math.PI / 2, 0, 0); }
    put(M.galva, box(L, .06, W, .02), 0, deck, 0); put(M.mattress, box(L - .1, .16, W - .08, .06), 0, deck + .11, 0); put(M.linen, box(L * .62, .04, W - .04, .02), .3, deck + .2, 0);
    put(M.linen, box(.34, .12, W * .6, .05), -L / 2 + .3, deck + .25, 0, 0, 0, -.12);
    put(M.enamel, box(.05, .52, W, .03), -L / 2, deck + .2, 0); put(M.enamel, box(.05, .34, W, .03), L / 2, deck + .1, 0);
    for (const z of [-W / 2 - .02, W / 2 + .02]) { put(M.chrome, cyl(.012, .012, L * .55, 8), -.15, deck + .34, z, 0, 0, Math.PI / 2); for (const x of [-.65, .35]) put(M.chrome, cyl(.012, .012, .3, 8), x, deck + .2, z); }
    put(M.chrome, cyl(.012, .012, 1.9, 8), -L / 2 - .1, .95, W / 2 + .18); put(M.dark, cyl(.18, .18, .02, 5), -L / 2 - .1, .02, W / 2 + .18);
    put(M.glass, box(.12, .2, .05, .02), -L / 2 - .1, 1.72, W / 2 + .18); put(M.linen, cyl(.003, .003, .9, 4), -L / 2 + .05, 1.25, W / 2 + .05, 0, 0, .5);
    put(M.dark, box(.36, .26, .06, .02), -L / 2 - .1, 1.35, -W / 2 - .2, 0, .4, 0); put(M.monitor, box(.3, .19, .005), -L / 2 - .08, 1.35, -W / 2 - .165, 0, .4, 0);
    put(M.chrome, cyl(.014, .014, 1.3, 8), -L / 2 - .1, .65, -W / 2 - .2); put(M.dark, cyl(.2, .2, .02, 5), -L / 2 - .1, .02, -W / 2 - .2);
  }
  function generator(p) {
    begin(p, longYaw(p)); const L = Math.min(2.1, p.len), D = Math.min(1.1, p.wid), H = Math.min(1.05, p.h);
    put(M.steel, box(L, .1, D, .02), 0, .05, 0); for (const x of [-L / 2 + .1, L / 2 - .1]) put(M.dark, box(.12, .08, D + .06), x, .04, 0);
    put(M.yellow, box(L - .1, H - .14, D - .06, .06), 0, .1 + (H - .14) / 2, 0);
    for (let k = 0; k < 9; k++) put(M.dark, box(.04, (H - .14) * .55, .01), -L / 2 + .2 + k * .06, .1 + (H - .14) * .5, D / 2 - .025);
    for (let k = 0; k < 9; k++) put(M.dark, box(.04, (H - .14) * .55, .01), L / 2 - .7 + k * .06, .1 + (H - .14) * .5, -D / 2 + .025);
    put(M.dark, box(.42, .3, .02, .02), .2, H * .62, D / 2 - .025); [M.green, M.amber, M.red].forEach((m, k) => put(m, cyl(.018, .018, .01, 10), .06 + k * .1, H * .7, D / 2 - .01, Math.PI / 2, 0, 0));
    put(M.hazard, box(.5, .08, .005), -.3, H - .2, D / 2 - .02);
    put(M.galva, cyl(.05, .05, .5, 12), L / 2 - .3, H + .2, -D / 4); put(M.dark, cyl(.06, .06, .06, 12), L / 2 - .3, H + .46, -D / 4);
    put(M.steel, cyl(.06, .06, .05, 12), -L / 2 + .35, H - .02, -D / 4); put(M.dark, g('cable', () => new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, .5, 0), new T.Vector3(.4, .1, .2), new T.Vector3(1, .02, .5), new T.Vector3(1.6, .02, .4)]), 16, .025, 6)), L / 2 - .1, 0, D / 2 - .1);
  }
  function vending(p) {
    begin(p, p.face); const W = Math.min(.95, p.len), D = Math.min(.75, p.wid), H = Math.min(1.85, p.h);
    put(M.steel, box(W, H, D, .03), 0, H / 2, 0); put(M.vending, box(W * .66, H * .82, .005), -W * .1, H * .52, D / 2 + .004);
    put(M.glass, box(W * .68, H * .84, .02, .01), -W * .1, H * .52, D / 2 + .016); put(M.dark, box(W * .2, H * .5, .02, .01), W * .36, H * .58, D / 2 + .01);
    put(M.cyan, box(W * .14, .05, .01), W * .36, H * .72, D / 2 + .022); put(M.dark, box(W * .7, .14, .05, .01), -W * .1, .18, D / 2 + .02); put(M.cyan, box(W, .02, .02), 0, H - .02, D / 2 + .01);
  }
  function barricade(p) {
    begin(p, longYaw(p)); const L = p.len;
    for (const x of [-L / 2 + .2, L / 2 - .2]) { put(M.galva, box(.05, 1.1, .05), x, .55, .25, -.3, 0, 0); put(M.galva, box(.05, 1.1, .05), x, .55, -.25, .3, 0, 0); put(M.amber, sph(.07, 12), x, 1.16, 0); }
    for (const y of [.55, .9]) put(M.hazard, box(L - .1, .2, .03, .01), 0, y, 0);
    for (let k = 0; k < Math.floor(L / .55); k++) { put(M.sandbag, box(.52, .16, .32, .07), -L / 2 + .3 + k * .55, .08, .38, 0, (rng() - .5) * .2, 0); if (k % 2) put(M.sandbag, box(.52, .16, .32, .07), -L / 2 + .55 + k * .55, .23, .38, 0, (rng() - .5) * .3, 0); }
  }
  function column(p) { // concrete column with base, capital and a cable tray
    begin(p, 0); const H = p.h, w = Math.max(.42, p.wid * .9);
    put(M.concrete, box(w + .16, .3, w + .16, .03), 0, .15, 0); put(M.concrete, box(w, H - .6, w, .04), 0, .3 + (H - .6) / 2, 0); put(M.concrete, box(w + .2, .3, w + .2, .03), 0, H - .15, 0);
    put(M.hazard, box(w + .01, .3, w + .01), 0, .55, 0); put(M.galva, box(.12, H - .9, .06), w / 2 + .04, .45 + (H - .9) / 2, 0); put(M.dark, box(.2, .26, .1, .02), w / 2 + .1, 1.4, 0); put(M.green, box(.03, .03, .01), w / 2 + .15, 1.48, .05);
  }
  function riser(p) { // vertical service pipe with flanges, a valve wheel and a gauge
    begin(p, rng() * TAU); const H = p.h, r = .11;
    put(M.galva, cyl(.2, .22, .08, 18), 0, .04, 0); put(M.drumRed, cyl(r, r, H - .1, 18), 0, .08 + (H - .1) / 2, 0);
    for (let y = .5; y < H - .2; y += 1.4) put(M.galva, cyl(r + .04, r + .04, .06, 18), 0, y, 0);
    put(M.galva, cyl(.04, .04, .22, 10), .2, 1.1, 0, 0, 0, Math.PI / 2); put(M.steel, g('wheel', () => new T.TorusGeometry(.12, .015, 6, 20)), .32, 1.1, 0, 0, Math.PI / 2, 0);
    put(M.enamel, cyl(.06, .06, .03, 16), 0, 1.5, r + .02, Math.PI / 2, 0, 0); put(M.dark, cyl(.065, .065, .02, 16), 0, 1.5, r + .005, Math.PI / 2, 0, 0);
  }
  // Kerb bollard of the avenue (one every 12 m on both pavements): chamfered concrete block, steel cap, amber marker.
  function bollard(p) {
    begin(p, 0); put(M.concrete, box(.66, .8, .66, .06), 0, .4, 0); put(M.steel, box(.7, .06, .7, .02), 0, .83, 0);
    put(M.stripe, box(.662, .1, .662), 0, .55, 0); put(M.amber, box(.3, .04, .3), 0, .875, 0); put(M.dark, box(.74, .05, .74), 0, .025, 0);
  }
  // ORDRE surveillance mast (same model everywhere, height from the map): base plate, mast, camera head, status light.
  function mast(p) {
    begin(p, p.face); const H = p.h;
    put(M.concrete, box(.58, .18, .58, .03), 0, .09, 0); put(M.galva, cyl(.16, .18, .06, 16), 0, .21, 0);
    for (const [x, z] of [[-.11, -.11], [.11, -.11], [-.11, .11], [.11, .11]]) put(M.galva, cyl(.018, .018, .05, 6), x, .26, z);
    put(M.steel, cyl(.055, .075, H - .5, 14), 0, .24 + (H - .5) / 2, 0); put(M.dark, box(.2, .34, .14, .02), 0, 1.35, .1); put(M.red, box(.04, .04, .01), 0, 1.46, .172);
    put(M.steel, box(.34, .06, .06), .12, H - .28, 0); put(M.enamel, box(.2, .16, .34, .04), .3, H - .34, .04, .28, 0, 0); put(M.dark, cyl(.05, .05, .04, 12), .3, H - .4, .22, Math.PI / 2 + .28, 0, 0);
    put(M.red, sph(.045, 10), 0, H - .02, 0); put(M.galva, cyl(.012, .012, .5, 6), -.08, H + .06, 0);
  }
  // Site cabin / freight module filling its collider: corrugated shell, corner castings, door, lit window, unit.
  function cabin(p) {
    begin(p, 0); const w = p.c.x2 - p.c.x1 - .2, d = p.c.z2 - p.c.z1 - .2, levels = p.h > 4.4 ? 2 : 1, hh = Math.min(2.9, p.h / levels);
    for (let k = 0; k < levels; k++) { const y0 = k * hh, body = [M.cabinA, M.cabinB, M.cabinC][(stats.cabin + k) % 3];
      put(body, box(w, hh - .16, d, .04), 0, y0 + .12 + (hh - .16) / 2, 0); put(M.steel, box(w + .06, .1, d + .06), 0, y0 + .05, 0); put(M.steel, box(w + .06, .08, d + .06), 0, y0 + hh - .04, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(M.steel, box(.16, hh, .16), sx * (w / 2 - .06), y0 + hh / 2, sz * (d / 2 - .06));
      const front = d / 2 + .012; put(M.dark, box(1.0, hh * .72, .03, .01), -w * .28, y0 + .1 + hh * .36, front); put(M.chrome, box(.04, .16, .03), -w * .28 + .36, y0 + hh * .42, front + .02);
      put(M.warm, box(Math.min(1.6, w * .3), hh * .28, .02), w * .18, y0 + hh * .6, front); put(M.steel, box(Math.min(1.7, w * .32), hh * .3, .03), w * .18, y0 + hh * .6, front - .008);
      put(M.hazard, box(w * .9, .12, .01), 0, y0 + .2, front); put(M.enamel, box(.7, .5, .3, .04), w * .36, y0 + hh * .78, -d / 2 - .16); }
    if (levels === 2) { for (let k = 0; k < 9; k++) put(M.galva, box(.9, .04, .26), w / 2 + .5, .16 + k * hh / 9, -d / 2 + .5 + k * .3); put(M.galva, box(1, .04, 1.2), w / 2 + .5, hh, d / 2 - .6); put(M.galva, box(.04, 1, 1.2), w / 2 + 1, hh + .5, d / 2 - .6); }
    put(M.galva, cyl(.03, .03, 1.6, 8), -w / 2 + .4, levels * hh + .8, -d / 2 + .4); put(M.red, sph(.05, 10), -w / 2 + .4, levels * hh + 1.62, -d / 2 + .4);
  }
  function pier(p) { // viaduct pier: plinth, shaft with chamfers, flared head, impact band, number plate
    begin(p, 0); const H = p.h, w = .74;
    put(M.concrete, box(1.3, .5, 1.3, .06), 0, .25, 0); put(M.concrete, box(w, H - 1.4, w, .07), 0, .5 + (H - 1.4) / 2, 0);
    put(M.concrete, box(w + .5, .45, w + .2, .05), 0, H - .68, 0); put(M.concrete, box(w + 1.3, .45, w + .3, .05), 0, H - .23, 0);
    put(M.hazard, box(w + .01, .5, w + .01), 0, 1.1, 0); put(M.enamel, box(.3, .2, .01), 0, 2.1, w / 2 + .006); put(M.galva, box(.06, H - 2, .06), w / 2 + .03, 1.2 + (H - 2) / 2, -.2); put(M.cyan, box(.5, .03, .03), 0, H - 1, w / 2 + .12);
  }
  function stanchion(p) { // steel H-stanchion on a base plate
    begin(p, 0); const H = p.h;
    put(M.galva, box(.5, .03, .5), 0, .015, 0); for (const z of [-.14, .14]) put(M.steel, box(.3, H, .025), 0, H / 2, z); put(M.steel, box(.02, H, .28), 0, H / 2, 0);
    for (let y = 2.5; y < H; y += 3) put(M.steel, box(.3, .02, .28), 0, y, 0); put(M.yellow, box(.31, .8, .3), 0, .42, 0);
  }
  const build = { jersey, drum, lamp, tree, bush, bollard, mast, cabin, pier, stanchion, post, rack, workbench, medcase, bed, generator, vending, barricade, column, riser };
  for (const p of props) build[p.kind]?.(p);
  const result = out.build(group, 'M03 objets');
  for (const gg of geo.values()) gg.dispose?.();
  return { group, stats: () => ({ ...stats, meshes: result.meshes, triangles: Math.round(result.triangles) }), materials: M };
}

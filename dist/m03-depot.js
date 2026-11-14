// MISSION 03 — the three added places, drawn to match their collision boxes in m03-layout.js:
//  · the Directoire logistics depot (interior of the east warehouse): steel-clad shell with a dock door on the avenue,
//    polished slab with painted aisles, pallet racks loaded with boxes, containers, crates, roof trusses, high-bay
//    lamps, the energy-cell pallets of the convoy;
//  · the substation under the viaduct: fenced transformer bay, switchgear cabinets, cable trench;
//  · the holding yard: two locked modules with barred windows, a guard post, floodlights.
// Static boxes merged per material; returns the light sources for the level's light pool and the lamps for shafts.
import { DEPOT, FACTORY, RETENTION_MODULES, INTERACTIONS, extraObstacles } from './m03-layout.js';

function canvasTexture(T, w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; }
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

export function createAddedPlaces(T, root, { low = false, rich = false } = {}) {
  const group = new T.Group(); group.name = 'M03 / dépôt, poste électrique, cour de rétention'; root.add(group);
  const r = seeded(77031), loader = new T.TextureLoader(), Mat = rich ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
  const tex = (url, srgb = true) => { const t = loader.load(url, () => {}, undefined, () => {}); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 8; return t; };
  const cc = n => './assets/cc0/' + n, phys = (c, cr) => rich ? { clearcoat: c, clearcoatRoughness: cr } : {};
  const floorTex = canvasTexture(T, 512, 512, (c, w, h) => { c.fillStyle = '#6a7076'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.globalAlpha = .04 + r() * .06; c.fillStyle = r() < .5 ? '#474c52' : '#8b9299'; c.fillRect(r() * w, r() * h, 3 + r() * 14, 2 + r() * 6); } c.globalAlpha = 1; c.fillStyle = '#3b4046'; c.fillRect(0, 0, w, 3); c.fillRect(0, 0, 3, h); });
  const boxTex = canvasTexture(T, 256, 256, (c, w, h) => { c.fillStyle = '#a98558'; c.fillRect(0, 0, w, h); c.fillStyle = '#8d6c44'; c.fillRect(0, h * .46, w, h * .08); c.strokeStyle = '#6f5333'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.fillStyle = '#2a2018'; c.font = '700 22px system-ui,sans-serif'; c.fillText('DIRECTOIRE', 18, 60); c.font = '600 15px system-ui,sans-serif'; c.fillText('ANNEAU LOGISTIQUE · LOT 02', 18, 86); c.fillRect(170, 160, 60, 60); c.fillStyle = '#a98558'; for (let i = 0; i < 6; i++) c.fillRect(174 + i * 9, 164, 4, 52); });
  const M = {
    clad: new Mat({ map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0x8f9aa3, roughness: .5, metalness: .35, ...(low ? {} : { normalMap: tex(cc('corrugated_iron_normal_512.jpg'), false) }), ...phys(.25, .4) }),
    inner: new Mat({ map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0xc9d0d4, roughness: .6, metalness: .2, ...(low ? {} : { normalMap: tex(cc('corrugated_iron_normal_512.jpg'), false) }) }),
    floor: new Mat({ map: floorTex, roughness: .32, metalness: .08, ...phys(.6, .18) }),
    concrete: new Mat({ map: tex(cc('vesper-concrete_diff_512.jpg')), color: 0xb9b6ae, roughness: .9 }),
    rackBlue: new Mat({ color: 0x2f5f9a, roughness: .45, metalness: .3, ...phys(.4, .3) }), rackOrange: new Mat({ color: 0xd9701e, roughness: .45, metalness: .3, ...phys(.4, .3) }),
    steel: new Mat({ map: tex(cc('vesper-steel_diff_512.jpg')), color: 0x69737d, roughness: .4, metalness: .75 }), dark: new T.MeshStandardMaterial({ color: 0x191d22, roughness: .8, metalness: .1 }),
    cardboard: new T.MeshStandardMaterial({ map: boxTex, roughness: .95 }), wood: new T.MeshStandardMaterial({ color: 0x9a7448, roughness: .85 }),
    wrap: new Mat({ color: 0xcfe0e8, roughness: .2, metalness: 0, transparent: true, opacity: .55, ...phys(.8, .1) }),
    contA: new Mat({ map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0x5a8fae, roughness: .5, metalness: .2 }), contB: new Mat({ map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0xc0573f, roughness: .5, metalness: .2 }),
    module: new Mat({ map: tex(cc('corrugated_iron_diff_512.jpg')), color: 0x4d5560, roughness: .55, metalness: .3 }), trafo: new Mat({ color: 0x6f7c84, roughness: .45, metalness: .5, ...phys(.35, .3) }),
    yellow: new T.MeshStandardMaterial({ color: 0xe0a51c, roughness: .55 }), white: new T.MeshStandardMaterial({ color: 0xd9dde0, roughness: .6 }), red: new T.MeshStandardMaterial({ color: 0xb5161e, roughness: .5 }),
    lamp: new T.MeshBasicMaterial({ color: 0xfff1d8, toneMapped: false }), cell: new T.MeshBasicMaterial({ color: 0x5fe0f0, toneMapped: false }), alarm: new T.MeshBasicMaterial({ color: 0xff2f45, toneMapped: false }), amber: new T.MeshBasicMaterial({ color: 0xffb35c, toneMapped: false })
  };
  for (const m of Object.values(M)) m.userData.webgpuPhysical = !!m.isMeshPhysicalMaterial;
  const buckets = new Map(), stats = { boxes: 0, racks: 0, pallets: 0, lamps: 0 };
  const solid = (m, x1, x2, y1, y2, z1, z2, tile = 2) => {
    let b = buckets.get(m); if (!b) buckets.set(m, b = { P: [], N: [], U: [], I: [], n: 0 }); stats.boxes++;
    const q = (p, n, uv) => { b.P.push(...p); for (let k = 0; k < 4; k++) b.N.push(...n); b.U.push(...uv); b.I.push(b.n, b.n + 1, b.n + 2, b.n, b.n + 2, b.n + 3); b.n += 4; };
    const u = (a, e) => [a / tile, y1 / tile, e / tile, y1 / tile, e / tile, y2 / tile, a / tile, y2 / tile], t = [x1 / tile, z2 / tile, x2 / tile, z2 / tile, x2 / tile, z1 / tile, x1 / tile, z1 / tile];
    q([x1, y1, z2, x2, y1, z2, x2, y2, z2, x1, y2, z2], [0, 0, 1], u(x1, x2)); q([x2, y1, z1, x1, y1, z1, x1, y2, z1, x2, y2, z1], [0, 0, -1], u(x1, x2));
    q([x2, y1, z2, x2, y1, z1, x2, y2, z1, x2, y2, z2], [1, 0, 0], u(z1, z2)); q([x1, y1, z1, x1, y1, z2, x1, y2, z2, x1, y2, z1], [-1, 0, 0], u(z1, z2));
    q([x1, y2, z2, x2, y2, z2, x2, y2, z1, x1, y2, z1], [0, 1, 0], t); q([x1, y1, z1, x2, y1, z1, x2, y1, z2, x1, y1, z2], [0, -1, 0], t);
  };
  const lights = [], lamps = [];

  // ---------- Depot ----------
  const D = DEPOT, obstacles = extraObstacles();
  for (const o of obstacles.filter(o => o.look === 'depot')) { // shell: cladding outside, lighter lining inside
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, y1 = o.y || 0, y2 = y1 + o.height;
    solid(M.clad, x1, x2, y1, y2, z1, z2, 3);
    if (y1 === 0) solid(M.concrete, x1 - .05, x2 + .05, 0, .9, z1 - .05, z2 + .05); // plinth
  }
  solid(M.floor, D.x1 + .6, D.x2 - .6, -.04, .012, D.z1 + .6, D.z2 - .6, 6);
  solid(M.clad, D.x1, D.x2, D.height - .5, D.height, D.z1, D.z2, 3); // roof slab (the tower stands on it)
  // Dock door: frame, hazard jambs, rolled shutter box, threshold plate.
  const dz1 = D.door.z1, dz2 = D.door.z2;
  for (const z of [dz1 - .25, dz2]) { solid(M.yellow, D.x1 - .08, D.x1 + .68, 0, D.door.height, z, z + .25); }
  solid(M.steel, D.x1 - .2, D.x1 + .8, D.door.height, D.door.height + .7, dz1 - .25, dz2 + .25); solid(M.steel, D.x1 - .6, D.x1 + 1.2, -.02, .02, dz1, dz2);
  solid(M.alarm, D.x1 - .22, D.x1 - .2, D.door.height + .2, D.door.height + .5, dz1 + 2.6, dz2 - 2.6);
  // Aisle markings: yellow lanes along the cross aisle and the three rack aisles.
  for (const z of [dz1 - .4, dz2 + .3]) solid(M.yellow, D.x1 + 1, D.x2 - 2, .012, .016, z, z + .1);
  for (const x of [26.5, 33.5, 40.5]) for (const [a, b] of [[D.z1 + 1.2, dz1 - .6], [dz2 + .6, D.z2 - 1.2]]) { solid(M.yellow, x - .05, x + .05, .012, .016, a, b); }
  // Roof structure: trusses every 6 m, purlins, high-bay lamps over the aisles.
  for (let x = D.x1 + 3; x < D.x2 - 1; x += 6) { solid(M.steel, x - .12, x + .12, D.height - 1.5, D.height - 1.2, D.z1 + .6, D.z2 - .6); solid(M.steel, x - .1, x + .1, D.height - .9, D.height - .5, D.z1 + .6, D.z2 - .6);
    for (let z = D.z1 + 2; z < D.z2 - 1; z += 4) solid(M.steel, x - .06, x + .06, D.height - 1.2, D.height - .9, z - .06, z + .06); }
  for (const z of [-27, -21, -15, -9, -3]) solid(M.steel, D.x1 + .6, D.x2 - .6, D.height - .55, D.height - .45, z - .08, z + .08);
  for (const x of [26.5, 33.5, 40.5, 48]) for (const z of [-24, -15, -6]) {
    solid(M.dark, x - .03, x + .03, D.height - 2.1, D.height - 1.5, z - .03, z + .03); solid(M.dark, x - .32, x + .32, D.height - 2.4, D.height - 2.1, z - .32, z + .32); solid(M.lamp, x - .26, x + .26, D.height - 2.43, D.height - 2.4, z - .26, z + .26);
    lights.push({ x, y: D.height - 2.6, z, color: 0xfff1d8, intensity: 30, range: 16 }); lamps.push({ x, y: D.height - 2.45, z, color: 0xfff1d8, radius: 2.4 }); stats.lamps++;
  }
  // Pallet racks (collision: at('rack', …)): uprights, beams on three levels, loaded pallets.
  for (const o of obstacles.filter(o => o.look === 'depot-rack')) {
    stats.racks++; const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, H = o.height;
    for (const z of [z1 + .05, (z1 + z2) / 2, z2 - .05]) for (const x of [x1 + .05, x2 - .05]) solid(M.rackBlue, x - .05, x + .05, 0, H, z - .05, z + .05);
    for (const z of [z1 + .05, (z1 + z2) / 2, z2 - .05]) for (let y = .5; y < H; y += .9) solid(M.rackBlue, x1 + .06, x2 - .06, y, y + .04, z - .02, z + .02);
    for (const y of [.12, 1.5, 2.9]) { for (const x of [x1 + .05, x2 - .05]) solid(M.rackOrange, x - .04, x + .04, y, y + .12, z1, z2);
      for (let z = z1 + .25; z < z2 - 1; z += 1.25) { if (r() < .14) continue; stats.pallets++; const hgt = .5 + r() * .7;
        solid(M.wood, x1 + .08, x2 - .08, y + .12, y + .24, z, z + 1.05); solid(r() < .75 ? M.cardboard : M.wrap, x1 + .12, x2 - .12, y + .24, y + .24 + hgt, z + .05, z + 1, 1); } }
    solid(M.yellow, x1 - .1, x2 + .1, 0, .4, z1 - .16, z1 - .06); solid(M.yellow, x1 - .1, x2 + .1, 0, .4, z2 + .06, z2 + .16);
  }
  // Containers and crates.
  obstacles.filter(o => o.kind === 'container' && o.x > D.x1 && o.x < D.x2 && o.z > D.z1 && o.z < D.z2).forEach((o, i) => { const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
    solid(i ? M.contB : M.contA, x1, x2, .12, o.height, z1, z2, 2.4); for (const x of [x1 + .07, x2 - .07]) for (const z of [z1 + .07, z2 - .07]) solid(M.steel, x - .09, x + .09, 0, o.height + .04, z - .09, z + .09);
    for (const k of [-.5, .5]) solid(M.dark, o.x + k - .02, o.x + k + .02, .3, o.height - .3, z2, z2 + .04); });
  for (const o of obstacles.filter(o => o.look === 'depot-crate')) { solid(M.wood, o.x - o.hx, o.x + o.hx, 0, .14, o.z - o.hz, o.z + o.hz); solid(M.cardboard, o.x - o.hx + .04, o.x + o.hx - .04, .14, o.height, o.z - o.hz + .04, o.z + o.hz - .04, 1); }
  // The convoy's energy cells behind the control: two pallets of glowing cells.
  const cell = INTERACTIONS.find(i => i.id === 'cellules');
  for (const dz of [-1.6, 1.6]) { const x = cell.x + 1.3, z = cell.z + dz; solid(M.wood, x - .55, x + .55, 0, .14, z - .5, z + .5);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { solid(M.dark, x - .5 + a * .34, x - .22 + a * .34, .14, .7, z - .46 + b * .32, z - .2 + b * .32); solid(M.cell, x - .46 + a * .34, x - .26 + a * .34, .7, .72, z - .42 + b * .32, z - .24 + b * .32); } }
  lights.push({ x: cell.x + 1.2, y: 1, z: cell.z, color: 0x5fe0f0, intensity: 8, range: 7 });

  // ---------- Reconditioning plant ----------
  const F = FACTORY;
  for (const o of obstacles.filter(o => o.look === 'factory')) { const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, y1 = o.y || 0;
    solid(M.clad, x1, x2, y1, y1 + o.height, z1, z2, 3); if (y1 === 0) solid(M.concrete, x1 - .05, x2 + .05, 0, .9, z1 - .05, z2 + .05); }
  solid(M.floor, F.x1 + .6, F.x2 - .6, -.04, .012, F.z1 + .6, F.z2 - .6, 6); solid(M.clad, F.x1, F.x2, F.height - .5, F.height, F.z1, F.z2, 3);
  for (const x of [F.door.x1 - .25, F.door.x2]) solid(M.yellow, x, x + .25, 0, F.door.height, F.z2 - .68, F.z2 + .08);
  solid(M.steel, F.door.x1 - .25, F.door.x2 + .25, F.door.height, F.door.height + .7, F.z2 - .8, F.z2 + .2); solid(M.alarm, F.door.x1 + 2.6, F.door.x2 - 2.6, F.door.height + .2, F.door.height + .5, F.z2 + .2, F.z2 + .22);
  // Assembly line: steel frame, rubber belt, rollers, gantries with welding heads, robot frames being rebuilt.
  const L = F.line;
  solid(M.steel, L.x1, L.x2, .75, .95, L.z - .9, L.z + .9); solid(M.dark, L.x1 + .1, L.x2 - .1, .95, 1.02, L.z - .75, L.z + .75);
  for (let x = L.x1 + .5; x < L.x2; x += 2) for (const z of [L.z - .82, L.z + .82]) solid(M.steel, x - .06, x + .06, 0, .75, z - .06, z + .06);
  for (const x of [-48, -41, -34]) {
    for (const z of [L.z - 1.6, L.z + 1.6]) solid(M.yellow, x - .12, x + .12, 0, 4.2, z - .12, z + .12); solid(M.yellow, x - .14, x + .14, 4.2, 4.5, L.z - 1.8, L.z + 1.8);
    solid(M.steel, x - .2, x + .2, 3, 4.2, L.z - .2, L.z + .2); solid(M.cell, x - .05, x + .05, 2.9, 3, L.z - .05, L.z + .05); lights.push({ x, y: 2.6, z: L.z, color: 0x5fe0f0, intensity: 6, range: 5 });
    // robot frame on the belt: legs, hip block, torso cage, head with a dark optic
    solid(M.dark, x - .55, x + .55, 1.02, 1.12, L.z - .5, L.z + .5);
    for (const s of [-1, 1]) { solid(M.steel, x + s * .22 - .07, x + s * .22 + .07, 1.12, 1.9, L.z - .07, L.z + .07); solid(M.steel, x + s * .42 - .06, x + s * .42 + .06, 2.2, 2.9, L.z - .06, L.z + .06); }
    solid(M.trafo, x - .35, x + .35, 1.9, 2.15, L.z - .22, L.z + .22); for (let k = 0; k < 4; k++) solid(M.steel, x - .32, x + .32, 2.2 + k * .2, 2.24 + k * .2, L.z - .2, L.z + .2);
    solid(M.trafo, x - .18, x + .18, 3.05, 3.35, L.z - .16, L.z + .16); solid(M.alarm, x - .1, x + .1, 3.18, 3.24, L.z - .17, L.z - .16);
  }
  // Pillars, parts racks, the control pulpit at the end of the line, roof trusses and lamps.
  for (const o of obstacles.filter(o => o.look === 'factory-pillar')) { solid(M.concrete, o.x - o.hx, o.x + o.hx, 0, F.height - .5, o.z - o.hz, o.z + o.hz, 3); solid(M.yellow, o.x - o.hx - .01, o.x + o.hx + .01, 0, 1.2, o.z - o.hz - .01, o.z + o.hz + .01); }
  for (const o of obstacles.filter(o => o.look === 'factory-rack')) { const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
    for (const x of [x1, (x1 + x2) / 2, x2]) for (const z of [z1, z2]) solid(M.rackOrange, x - .04, x + .04, 0, o.height, z - .04, z + .04);
    for (const y of [.1, 1.3, 2.5]) { solid(M.steel, x1, x2, y, y + .05, z1, z2); for (let x = x1 + .2; x < x2 - .5; x += .8) if (r() < .8) solid(r() < .5 ? M.trafo : M.dark, x, x + .5 + r() * .2, y + .05, y + .35 + r() * .4, z1 + .1, z2 - .1); } }
  const pu = obstacles.find(o => o.look === 'factory-pulpit');
  solid(M.steel, pu.x - pu.hx, pu.x + pu.hx, 0, 1, pu.z - pu.hz, pu.z + pu.hz); solid(M.dark, pu.x - pu.hx - .1, pu.x + pu.hx, 1, 1.25, pu.z - pu.hz, pu.z + pu.hz);
  for (let k = 0; k < 3; k++) solid([M.cell, M.amber, M.alarm][k], pu.x - pu.hx - .11, pu.x - pu.hx - .1, 1.05, 1.2, pu.z - .9 + k * .6, pu.z - .5 + k * .6);
  for (let x = F.x1 + 3; x < F.x2 - 1; x += 6) solid(M.steel, x - .12, x + .12, F.height - 2, F.height - 1.6, F.z1 + .6, F.z2 - .6);
  for (const x of [-52, -44, -36, -28]) for (const z of [-82, -70]) { solid(M.dark, x - .32, x + .32, F.height - 7.4, F.height - 7.1, z - .32, z + .32); solid(M.lamp, x - .26, x + .26, F.height - 7.43, F.height - 7.4, z - .26, z + .26);
    solid(M.dark, x - .02, x + .02, F.height - 7.1, F.height - .5, z - .02, z + .02); lights.push({ x, y: F.height - 7.6, z, color: 0xfff1d8, intensity: 30, range: 18 }); lamps.push({ x, y: F.height - 7.45, z, color: 0xfff1d8, radius: 2.6 }); stats.lamps++; }
  for (let x = F.x1 + 1; x < F.x2 - 1; x += 1.6) solid(M.yellow, x, x + .8, .012, .016, L.z - 2.4, L.z - 2.3); for (let x = F.x1 + 1; x < F.x2 - 1; x += 1.6) solid(M.yellow, x, x + .8, .012, .016, L.z + 2.3, L.z + 2.4);

  // ---------- Substation under the viaduct ----------
  const tr = INTERACTIONS.find(i => i.id === 'transfo'), tx = tr.x, tz = tr.z;
  solid(M.concrete, tx - 4.6, tx + 2.2, -.04, .12, tz - 4.4, tz - .9, 3);
  for (const k of [0, 1]) { const x = tx - 3.6 + k * 3; solid(M.trafo, x, x + 2.2, .12, 2.3, tz - 3.9, tz - 1.9); for (let f = 0; f < 7; f++) solid(M.steel, x + .1 + f * .3, x + .2 + f * .3, .3, 2.1, tz - 1.9, tz - 1.7);
    for (const i of [.4, 1.1, 1.8]) { solid(M.white, x + i - .08, x + i + .08, 2.3, 2.95, tz - 3 - .08, tz - 3 + .08); solid(M.steel, x + i - .12, x + i + .12, 2.95, 3.02, tz - 3 - .12, tz - 3 + .12); } }
  solid(M.dark, tx + .9, tx + 1.9, .12, 2.1, tz - 3.6, tz - 2.9); solid(M.amber, tx + 1.1, tx + 1.2, 1.6, 1.7, tz - 2.9, tz - 2.88); solid(M.alarm, tx + 1.5, tx + 1.6, 1.6, 1.7, tz - 2.9, tz - 2.88);
  for (let x = tx - 4.6; x <= tx + 2.21; x += 1.7) solid(M.steel, x - .03, x + .03, 0, 2.2, tz - .93, tz - .87);   // fence posts, open on the device side
  for (const y of [.5, 1.3, 2.1]) solid(M.steel, tx - 4.6, tx - 1.2, y, y + .03, tz - .92, tz - .88);
  solid(M.yellow, tx - 4.6, tx + 2.2, .12, .13, tz - .9, tz - .78); solid(M.dark, tx + 2.2, tx + 30, -.02, .02, tz - 2.6, tz - 2.2);          // cable trench cover toward the avenue
  lights.push({ x: tx - 1, y: 2.6, z: tz - 1.4, color: 0xffb35c, intensity: 10, range: 9 });

  // ---------- Holding yard ----------
  RETENTION_MODULES.forEach((m, i) => {
    solid(M.module, m.x1, m.x2, .15, 2.9, m.z1, m.z2, 2.4); solid(M.steel, m.x1 - .05, m.x2 + .05, 0, .15, m.z1 - .05, m.z2 + .05); solid(M.steel, m.x1 - .05, m.x2 + .05, 2.9, 3, m.z1 - .05, m.z2 + .05);
    const zf = m.z2, cx = (m.x1 + m.x2) / 2;
    solid(M.dark, cx - .55, cx + .55, .2, 2.3, zf, zf + .05); solid(M.red, cx - .6, cx + .6, 2.3, 2.42, zf, zf + .06); solid(M.alarm, cx + .32, cx + .42, 1.2, 1.3, zf + .05, zf + .07);
    for (const sx of [-2.4, 2.4]) { solid(M.dark, cx + sx - .6, cx + sx + .6, 1.4, 2.1, zf, zf + .03); for (let b = 0; b < 6; b++) solid(M.steel, cx + sx - .5 + b * .2, cx + sx - .46 + b * .2, 1.4, 2.1, zf + .03, zf + .06); }
    solid(M.white, m.x1 + .3, m.x1 + 1.5, 2.3, 2.7, zf, zf + .02); solid(M.dark, m.x2 - .5, m.x2 - .2, 3, 3.5, m.z1 + .3, m.z1 + .6); solid(M.lamp, m.x2 - .55, m.x2 - .15, 3.5, 3.56, m.z1 + .2, m.z1 + .7);
    lights.push({ x: cx, y: 3.4, z: zf + 2, color: i ? 0xff6a5a : 0xfff1d8, intensity: 14, range: 12 });
  });
  const cu = INTERACTIONS.find(i => i.id === 'cellule'); // guard post beside the lock
  solid(M.module, cu.x + 3, cu.x + 5.2, .1, 2.5, cu.z - 1, cu.z + 1.2, 2.4); solid(M.dark, cu.x + 3, cu.x + 3.04, 1, 1.9, cu.z - .6, cu.z + .8); solid(M.steel, cu.x + 2.9, cu.x + 5.3, 2.5, 2.6, cu.z - 1.1, cu.z + 1.3);
  for (const [x, z] of [[45.5, 45.5], [75, 45.5], [45.5, 69.5], [75, 69.5]]) { solid(M.steel, x - .08, x + .08, 0, 7, z - .08, z + .08); solid(M.dark, x - .5, x + .5, 7, 7.2, z - .3, z + .3); solid(M.lamp, x - .44, x + .44, 6.97, 7, z - .24, z + .24); lamps.push({ x, y: 6.95, z, color: 0xdfeaff, radius: 3 }); lights.push({ x, y: 6.6, z, color: 0xdfeaff, intensity: 18, range: 16 }); }

  for (const [material, b] of buckets) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(b.P), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(b.N), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.U), 2));
    g.setIndex(new T.BufferAttribute(b.n > 65535 ? new Uint32Array(b.I) : new Uint16Array(b.I), 1)); g.computeBoundingSphere(); g.userData.webgpuShape = 'place';
    const mesh = new T.Mesh(g, material); mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.userData.webgpuShape = 'place'; group.add(mesh);
  }
  return { group, lights, lamps, stats: () => ({ ...stats, meshes: buckets.size }) };
}

// CHAPITRE 06 — set dressing of the foundry: the yards, the halls and the core are filled so the place feels worked in.
// Two kinds of pieces. Props with a footprint come from DRESSING (m06-layout.js, placed once with collisions): masts,
// barrels, crushed cars, tyres, barriers, consoles, cabinets, container stacks, and (Blender, reused from chapter 4) the
// substation transformers and the drone racks of the core. Everything overhead or flush with a wall (crane runways, pipes,
// columns, lamps, vents, perimeter fence) has no collision. Static pieces go through the art's merged/instanced helpers;
// barrels, tyres and steam are their own instanced meshes. No dynamic light is added (the pooled lights stay in charge).
import { DRESSING, AREAS } from './m06-layout.js';
import { loadBlenderModels } from './blender-models.js';

const TAU = Math.PI * 2;

export function buildDressing({ T, M, box, piece, add, low, stats, animated }) {
  let seed = 4242; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = list => list[Math.floor(rnd() * list.length)];
  const cyl = new Map(); // material → [x, y, z, radius, height]
  const addCyl = (m, x, y, z, r, h) => { if (!cyl.has(m)) cyl.set(m, []); cyl.get(m).push([x, y, z, r, h]); };
  const deferred = [];
  const m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), up = new T.Vector3(0, 1, 0);

  for (const o of DRESSING) {
    const { x, z, hx, hz, kind } = o;
    switch (kind) {
      case 'barrels': {
        const mats = [M.rust, M.yellow, M.graphite, M.aegis];
        for (let i = 0; i < 4; i++) { const bx = x + (i % 2 - .5) * .75 + (rnd() - .5) * .12, bz = z + (Math.floor(i / 2) - .5) * .75 + (rnd() - .5) * .12; addCyl(pick(mats), bx, 0, bz, .3, .9); if (rnd() < .3) addCyl(M.dark, bx, .9, bz, .3, .05); }
        piece(M.rust, x, 0, z, hx * 2 - .1, .1, hz * 2 - .1); // the pallet under them
        break;
      }
      case 'cars': {
        const c1 = pick([M.rust, M.graphite, M.aegis, M.yellow]), c2 = pick([M.rust, M.graphite, M.aegis]), c3 = pick([M.plate, M.rust, M.aegis]);
        piece(c1, x, 0, z, hx * 1.9, .85, hz * 1.9, .03); piece(M.dark, x, .1, z, hx * 1.2, .2, hz * 1.5); piece(c2, x + .1, .85, z, hx * 1.8, .8, hz * 1.85, -.05); piece(c3, x - .15, 1.65, z, hx * 1.7, .7, hz * 1.8, .08);
        piece(M.glass, x - .15, 2.1, z, hx * .8, .35, hz * 1.5, .08); piece(M.dark, x + hx * .9, .25, z + hz * .8, .5, .5, .1);
        break;
      }
      case 'tires': for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + rnd(), px = x + Math.cos(a) * .6, pz = z + Math.sin(a) * .6; for (let k = 0; k < 4; k++) addCyl(M.black, px, k * .32, pz, .52, .32); } break;
      case 'mast':
        piece(M.dark, x, 0, z, 1.1, .4, 1.1); piece(M.steel, x, .4, z, .28, 11.4, .28); piece(M.dark, x, 11.5, z, 3.2, .35, .5, .5); piece(M.steel, x, 11, z, .5, .5, .5);
        for (let i = 0; i < 4; i++) piece(M.ledWhite, x + (i - 1.5) * .7 * Math.cos(.5), 11.85, z + (i - 1.5) * .7 * Math.sin(.5), .5, .45, .12, .5);
        break;
      case 'jersey': piece(M.slab, x, 0, z, hx * 2, .9, hz * 2); piece(M.yellow, x, .55, z + hz + .01, hx * 2 - .2, .12, .02); piece(M.slab, x, .9, z, hx * 2 - .5, .15, hz * 1.2); break;
      case 'console':
        piece(M.dark, x, 0, z, hx * 2, 1.0, hz * 2); piece(M.graphite, x, 1.0, z - .1, hx * 2 - .1, .3, hz * 1.2); piece(M.screen, x, 1.1, z - hz * .55, hx * 1.6, .55, .05);
        for (let i = 0; i < 4; i++) piece(i % 2 ? M.ledYellow : M.ledRed, x - hx + .3 + i * .3, 1.0, z + hz * .8, .08, .05, .05);
        break;
      case 'cabinet-row':
        for (let i = 0; i < 3; i++) { const cx = x + (i - 1) * (hx * 2 / 3); piece(M.graphite, cx, 0, z, hx * 2 / 3 - .06, 2.2, hz * 2); piece(M.dark, cx, .6, z + hz + .01, hx * 2 / 3 - .3, 1.3, .03); for (let k = 0; k < 4; k++) piece(k % 2 ? M.ledBlue : M.ledYellow, cx - .35 + k * .22, 1.9, z + hz + .02, .08, .08, .03); }
        break;
      case 'container-stack':
        for (let k = 0; k < 2; k++) { const m = k ? pick([M.graphite, M.rust]) : pick([M.rust, M.corrugated]); box(m, x - hx, x + hx, k * 2.7, k * 2.7 + 2.7, z - hz, z + hz); for (let r = 0; r < 9; r++) piece(M.dark, x - hx + .3 + r * (hx * 2 - .6) / 8, k * 2.7 + .1, z + hz + .01, .05, 2.5, .02); }
        break;
      case 'server': { // coordination monoliths of the N-08: dark slabs ribbed with LED columns
        const along = hx >= hz, w = along ? hx * 2 : hz * 2, d = along ? hz * 2 : hx * 2, ry = along ? 0 : Math.PI / 2, h = o.height;
        piece(M.black, x, 0, z, along ? w : d, .3, along ? d : w); piece(M.graphite, x, .3, z, along ? w - .1 : d - .1, h - .5, along ? d - .1 : w - .1); piece(M.dark, x, h - .2, z, along ? w + .1 : d + .1, .25, along ? d + .1 : w + .1);
        for (let k = 0; k < 4; k++) { const off = (k - 1.5) * (w / 4.4); for (const side of [-1, 1]) { const px = along ? x + off : x + side * (d / 2 + .01), pz = along ? z + side * (d / 2 + .01) : z + off; piece(k % 3 ? M.ledRed : M.ledBlue, px, .9, pz, along ? .06 : .02, h - 1.8, along ? .02 : .06); } }
        void ry; break;
      }
      case 'transformer': case 'drone-rack': deferred.push(o); break;
      default: break;
    }
  }

  // ---------- Overhead and wall-flush dressing (no collision) ----------
  const hall = (x1, x2, z1, z2, roof, runX) => {
    const zc = (z1 + z2) / 2, len = z2 - z1;
    for (const x of runX) { piece(M.yellow, x, roof - 4.2, zc, .6, .7, len); for (let z = z1 + 4; z < z2; z += 12) piece(M.dark, x, roof - 5, z, .5, .8, .5); }   // crane runways
    const bz = zc + (z2 - z1) * .12; piece(M.yellow, (x1 + x2) / 2, roof - 3.9, bz, x2 - x1 - 2, .8, 1.4); piece(M.dark, (x1 + x2) / 2 + 4, roof - 5.2, bz, 2.2, 1.3, 2);
    piece(M.black, (x1 + x2) / 2 + 4, roof - 10.6, bz, .08, 5.4, .08); piece(M.steel, (x1 + x2) / 2 + 4, roof - 11.4, bz, .5, .8, .35); piece(M.yellow, (x1 + x2) / 2 + 4, roof - 12.1, bz, 1.6, .7, .5);   // hoist, rope, hook, spreader
    for (let z = z1 + 6; z < z2; z += 12) { piece(M.steel, x1 + .35, 0, z, .5, roof - .8, .8); piece(M.steel, x2 - .35, 0, z, .5, roof - .8, .8); piece(M.dark, x1 + .3, roof - 3.5, z, .4, .3, 5); piece(M.dark, x2 - .3, roof - 3.5, z, .4, .3, 5); }   // wall columns, wall brackets
    for (const [y, m] of [[5.6, M.rust], [7.8, M.steel]]) { piece(m, x1 + .55, y, zc, .35, .35, len - 2); piece(m, x2 - .55, y, zc, .35, .35, len - 2); }   // pipe runs
    for (let z = z1 + 3; z < z2; z += 12) for (let x = x1 + 9; x < x2 - 6; x += 14) { piece(M.black, x, roof - 7.6, z, .05, 2.4, .05); piece(M.dark, x, roof - 8.0, z, 1.4, .4, 1.4); piece(M.ledWhite, x, roof - 8.04, z, 1.0, .05, 1.0); }   // hanging work lamps
    for (let z = z1 + 10; z < z2 - 4; z += 24) { piece(M.dark, x1 + .3, 8.6, z, .35, 2.2, 2.2); piece(M.steel, x1 + .55, 9.2, z, .05, 1.8, 1.8); }   // wall louvres
  };
  hall(-30, 40, -20, 66, 15, [-26, 36]); hall(40, 96, -20, 66, 14, [44, 92]);
  // The core: long walls only (its roof is 16 m), cable trays and server pillars along the sides.
  for (let z = -90; z < -26; z += 12) { piece(M.steel, -59.55, 0, z, .5, 15.2, .8); piece(M.steel, 59.55, 0, z, .5, 15.2, .8); piece(M.dark, -59.6, 11.5, z, .4, .3, 5); piece(M.dark, 59.6, 11.5, z, .4, .3, 5); }
  for (const x of [-59.2, 59.2]) for (const y of [4, 6.2, 8.4]) piece(y > 6 ? M.steel : M.rust, x, y, -60, .35, .35, 66);
  for (let x = -48; x <= 48; x += 16) for (let z = -86; z < -30; z += 14) { piece(M.black, x, 12.2, z, .05, 2.6, .05); piece(M.dark, x, 11.8, z, 1.6, .4, 1.6); piece(M.ledWhite, x, 11.76, z, 1.2, .05, 1.2); }
  // Perimeter fence of the scrap yard and the rail spur: posts, two wires, barbed top.
  for (let z = 34; z <= 96; z += 4) { piece(M.dark, -97.6, 0, z, .12, 3.2, .12); }
  piece(M.steel, -97.6, 1.0, 65, .03, .03, 62); piece(M.steel, -97.6, 2.0, 65, .03, .03, 62); piece(M.steel, -97.6, 3.1, 65, .03, .06, 62);
  for (let x = -94; x <= -32; x += 4) piece(M.dark, x, 0, 97.6, .12, 3.2, .12);
  piece(M.steel, -63, 1.0, 97.6, 62, .03, .03); piece(M.steel, -63, 2.0, 97.6, 62, .03, .03); piece(M.steel, -63, 3.1, 97.6, 62, .06, .03);
  // Rail spur: signal masts with their lamps, a buffer stop, a second line of sleepers.
  for (const x of [-26, 34]) { piece(M.dark, x, 0, 94, .2, 4.2, .2); piece(M.black, x, 3.6, 94, .6, 1.5, .4); piece(M.ledRed, x, 4.5, 93.78, .25, .25, .05); piece(M.ledYellow, x, 3.9, 93.78, .25, .25, .05); }
  for (let x = 20; x < 36; x += 1.2) piece(M.rust, x, 0, 94.8, .25, .06, 2.4); for (const z of [93.8, 95.2]) piece(M.steel, 28, .02, z, 16, .12, .12);
  piece(M.yellow, 36.5, 0, 94.5, .5, 1.2, 1.6);

  // ---------- Floor decals: oil, soot, rust bleed, cracks (four instanced quads, no depth write) ----------
  const decalTex = (paint) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); paint(g); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 6; return t; };
  const blob = (g, cx, cy, r, color, n = 26) => { for (let i = 0; i < n; i++) { const a = rnd() * TAU, d = rnd() * r * .55, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d, rr = r * (.2 + rnd() * .45), gr = g.createRadialGradient(px, py, 0, px, py, rr); gr.addColorStop(0, color(.55)); gr.addColorStop(1, color(0)); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fill(); } };
  const decals = [
    { tex: decalTex(g => { blob(g, 128, 128, 120, a => `rgba(10,8,7,${a})`, 34); blob(g, 118, 132, 60, a => `rgba(60,40,70,${a * .35})`, 8); }), rough: .18, n: low ? 22 : 46 },                // oil, with a faint sheen
    { tex: decalTex(g => blob(g, 128, 128, 126, a => `rgba(18,14,12,${a * .8})`, 40)), rough: .95, n: low ? 18 : 40 },                                                                     // soot
    { tex: decalTex(g => { blob(g, 128, 128, 110, a => `rgba(120,58,24,${a * .7})`, 30); }), rough: .9, n: low ? 12 : 26 },                                                                   // rust bleed
    { tex: decalTex(g => { g.strokeStyle = 'rgba(12,10,9,.8)'; g.lineCap = 'round'; for (let k = 0; k < 5; k++) { let x = 128, y = 128, a = rnd() * TAU; g.lineWidth = 3 - k * .4; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 14; i++) { a += (rnd() - .5) * 1.1; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); } g.stroke(); } }), rough: .9, n: low ? 10 : 24 } // cracks
  ];
  const floors = AREAS.filter(a => a.id !== 'cabine'), quadGeo = new T.PlaneGeometry(1, 1); quadGeo.rotateX(-Math.PI / 2);
  decals.forEach((d, di) => {
    const mat = new T.MeshStandardMaterial({ map: d.tex, transparent: true, depthWrite: false, roughness: d.rough, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const mesh = new T.InstancedMesh(quadGeo, mat, d.n); mesh.renderOrder = 1;
    for (let i = 0; i < d.n; i++) { const a = floors[Math.floor(rnd() * floors.length)], k = (di === 3 ? 2 : 1.6) + rnd() * (di === 1 ? 5 : 3.4);
      m4.compose(p.set(a.x1 + 3 + rnd() * (a.x2 - a.x1 - 6), .015 + di * .002, a.z1 + 3 + rnd() * (a.z2 - a.z1 - 6)), q.setFromAxisAngle(up, rnd() * TAU), s.set(k, 1, k * (.6 + rnd() * .6))); mesh.setMatrixAt(i, m4); }
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); add(mesh);
  });

  // ---------- The core: cables to the column, data rings on the floor, a holographic band, wall screens ----------
  {
    const C = { x: 0, z: -70, top: 14 }, cableMat = M.black;
    for (const [ex, ey, ez] of [[-59.4, 12, -82], [-59.4, 9, -56], [59.4, 12, -84], [59.4, 9, -52], [-30, 15.7, -94], [30, 15.7, -94], [-22, 15.7, -30], [24, 15.7, -30], [0, 15.7, -95], [-45, 15.7, -70], [45, 15.7, -66]]) {
      const a = new T.Vector3(C.x + Math.sign(ex || 1) * 1.4, C.top - 1, C.z + Math.sign(ez - C.z) * 1.2), b = new T.Vector3(ex, ey, ez), mid = a.clone().lerp(b, .5); mid.y = Math.min(a.y, b.y) - 4 - Math.abs(ex) * .04;
      const tube = new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), low ? 14 : 28, .22 + rnd() * .16, low ? 5 : 8, false), cableMat); add(tube);
    }
    const ringMat = new T.MeshBasicMaterial({ color: 0xff3b4e, transparent: true, opacity: .5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false });
    const rings = [[11.5, 11.8], [15, 15.15], [19, 19.1]].map(([r1, r2]) => { const r = new T.Mesh(new T.RingGeometry(r1, r2, 96), ringMat.clone()); r.rotation.x = -Math.PI / 2; r.position.set(C.x, .03, C.z); add(r); return r; });
    for (let k = 0; k < 16; k++) { const ang = k / 16 * TAU; piece(M.ledRed, C.x + Math.cos(ang) * 15.3, .02, C.z + Math.sin(ang) * 15.3, .08, .01, 3.4, -ang); }   // radial spokes
    const holo = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 1024, 128);
      g.font = 'bold 30px monospace'; g.fillStyle = 'rgba(255,80,90,.95)'; for (let i = 0; i < 4; i++) g.fillText('SY-05 · MODÈLE ' + (17 + i) + ' · ADAPTATION ' + (62 + i * 9) + ' %', 20 + i * 256 - (i ? 0 : 0), 44 + (i % 2) * 40);
      g.fillStyle = 'rgba(255,170,90,.8)'; for (let i = 0; i < 96; i++) { const h = 6 + rnd() * 34; g.fillRect(8 + i * 10.6, 124 - h, 6, h); }
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.set(2, 1); return t; })();
    const band = new T.Mesh(new T.CylinderGeometry(7.5, 7.5, 2.4, 64, 1, true), new T.MeshBasicMaterial({ map: holo, transparent: true, opacity: .85, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false }));
    band.position.set(C.x, 11.6, C.z); add(band);
    const screenTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 288; const g = c.getContext('2d'); g.fillStyle = '#1a0608'; g.fillRect(0, 0, 512, 288); g.strokeStyle = 'rgba(255,90,90,.25)'; for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 288); g.stroke(); } for (let y = 0; y < 288; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      for (const [col, base] of [['#ff4a52', 200], ['#ffb05a', 140], ['#7ac8ff', 90]]) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); let y = base; for (let x = 0; x <= 512; x += 16) { y += (rnd() - .5) * 26; g.lineTo(x, Math.max(20, Math.min(270, y))); } g.stroke(); }
      g.fillStyle = '#ff6a70'; g.font = 'bold 22px monospace'; g.fillText('ANALYSE DES COMBATS · VESPER', 16, 30); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
    const screenMat = new T.MeshBasicMaterial({ map: screenTex, toneMapped: false });
    for (const [x, z, ry] of [[-59.55, -84, Math.PI / 2], [-59.55, -40, Math.PI / 2], [59.55, -78, -Math.PI / 2], [59.55, -36, -Math.PI / 2]]) { const sc = new T.Mesh(new T.PlaneGeometry(7, 3.9), screenMat); sc.position.set(x, 6.5, z); sc.rotation.y = ry; add(sc); piece(M.dark, x, 4.4, z, ry > 0 ? .2 : .2, 4.2, 7.4); }
    animated.push(t => { band.rotation.y = t * .18; holo.offset.x = (t * .03) % 1; rings.forEach((r, i) => { r.material.opacity = .28 + .22 * Math.sin(t * 2 - i * .9); }); });
  }

  // ---------- Instanced cylinders (barrels, tyres) ----------
  const geo = new T.CylinderGeometry(1, 1, 1, low ? 8 : 14);
  for (const [m, list] of cyl) {
    const mesh = new T.InstancedMesh(geo, m, list.length);
    list.forEach(([x, y, z, r, h], i) => mesh.setMatrixAt(i, m4.compose(p.set(x, y + h / 2, z), q.identity(), s.set(r, h, r))));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; add(mesh); stats.instances += list.length;
  }

  // ---------- Steam leaking from the pipe runs ----------
  {
    const vents = [[-29, 7, 8], [-29, 7, 40], [39, 7, 20], [39, 7, 52], [95, 7, 10], [95, 7, 40], [-58, 5, -50], [58, 5, -70]], per = low ? 4 : 7;
    const puff = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: 0xdad2c8, transparent: true, opacity: .16, depthWrite: false }), vents.length * per);
    puff.frustumCulled = false; add(puff);
    const side = new T.Vector3();
    animated.push(t => { let i = 0; for (const [x, y, z] of vents) for (let k = 0; k < per; k++) { const u = (t * .22 + k / per + x * .01 + z * .013) % 1; side.set(-Math.sign(x) * u * 1.6, y + u * 3.4, z); m4.compose(p.set(x + side.x, side.y, z), q.identity(), s.setScalar(.25 + u * .9)); puff.setMatrixAt(i++, m4); } puff.instanceMatrix.needsUpdate = true; });
  }

  // ---------- Blender models reused from chapter 4: substation transformers and the drone racks of the core ----------
  const alias = { steel: M.steel, paintGrey: M.aegis, label: M.white, dark: M.dark, porcelain: M.white, copper: M.rust, alu: M.steel, pipeRed: M.rust, warn: M.yellow,
    paintBlue: M.aegis, paintOrange: M.rust, galv: M.steel, caseGrey: M.graphite, black: M.black, glass: M.glass, ledRed: M.ledRed, ledGreen: M.ledBlue, paintWhite: M.white, rubber: M.soot };
  const fallback = () => { for (const o of deferred) box(o.kind === 'drone-rack' ? M.paintBlue || M.aegis : M.aegis, o.x - o.hx, o.x + o.hx, 0, o.height, o.z - o.hz, o.z + o.hz); };
  const ready = deferred.length ? loadBlenderModels(T, { files: { transformer: 'transformer', rack: 'drone_rack' }, M: alias, base: './assets/m04/models/', low }) : Promise.resolve(null);
  return { deferred, ready, fallback, count: DRESSING.length, alias };
}

// MISSION 04 dressing: the JANUS energy station East at night (W04 palette: technical blue, maintenance yellow,
// magenta reserved to the breach and its anchors). Arrival platform and medical train, inspection lock, reactor court
// with its catwalk, drone hangar, server workshop, maintenance passage, the stabiliser ring around the violet breach
// and the guardian's gantry. Merged geometry with world UVs (CC0 sets already shipped), instanced pieces, a small pool
// of point lights moved to the nearest fixtures, the breach (beam, rings, sparks) driven by breach(v), shared signage.
import { AREAS, DOORS, INTERACTIONS, FLOORS, HEIGHTS, areaAt } from './m04-layout.js';
import { createSignage } from './signage.js';
import {createFunctionalProp} from './functional-props.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function canvasTexture(T, w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

export function createM04Art(T, scene, { quality = 'normal', accent = 0xff6fb4 } = {}) {
  const low = quality === 'low', rng = seeded(404);
  const root = new T.Group(); root.name = 'M04 / Le Protocole Interdit'; scene.add(root);
  const animated = [], stats = { meshes: 0, instances: 0, lights: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Night sky with the breach's glow, fog, moon and sky light ----------
  scene.background = new T.Color(0x07061a);
  scene.fog = new T.FogExp2(0x120d26, low ? .010 : .0085);
  const sky = new T.HemisphereLight(0x7479c4, 0x262030, 2.2); scene.add(sky);
  const moon = new T.DirectionalLight(0xb4bfe6, 1.5); moon.position.set(40, 70, 50); scene.add(moon);
  const skyTex = canvasTexture(T, 16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); for (const [a, col] of [[0, '#020210'], [.45, '#0d0a26'], [.72, '#3a1450'], [.86, '#6a1d5e'], [1, '#14081a']]) g.addColorStop(a, col); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  add(new T.Mesh(new T.SphereGeometry(400, 24, 12), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false })));

  // ---------- Materials ----------
  const loader = new T.TextureLoader();
  const tex = (url, srgb = true) => { const t = loader.load(url); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 6; return t; };
  const L9 = n => `./assets/ligne9/l9-${n}_diff_512.jpg`, CC = n => `./assets/cc0/${n}_diff_512.jpg`;
  const std = (color, roughness = .6, metalness = .2, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const tiled = (url, color, roughness, metalness, tile, extra = {}) => { const m = std(color, roughness, metalness, { map: tex(url), ...extra }); m.userData.tile = tile; return m; };
  const glow = color => new T.MeshBasicMaterial({ color, toneMapped: false });
  const additive = (color, opacity = .6) => new T.MeshBasicMaterial({ color, transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide });
  const M = {
    concrete: tiled(L9('concrete_wall_006'), 0x8f949c, .9, .02, 3), slab: tiled(CC('concrete_floor'), 0x7d8288, .85, .05, 3), asphalt: tiled(CC('vesper-asphalt'), 0x6c7076, .55, .1, 4),
    plate: tiled(L9('metal_plate'), 0x8a95a3, .45, .65, 2), grid: tiled(L9('rusty_metal_grid'), 0x8c8f96, .5, .55, 1.5), shutter: tiled(L9('rusted_shutter'), 0xa9b4be, .55, .4, 3),
    panel: tiled(L9('long_white_tiles'), 0xc7ced8, .4, .2, 1.6), antiSkid: tiled(L9('anti_skid_tiles'), 0x7f868e, .7, .2, 2), corrugated: tiled(CC('corrugated_iron'), 0x7a8592, .45, .6, 2),
    steel: tiled(CC('vesper-steel'), 0x9aa3ad, .35, .8, 2),
    blue: std(0x1d4f8c, .45, .4), yellow: std(0xe0b21e, .5, .2), dark: std(0x161b24, .5, .6), black: std(0x0b0d10, .6, .3), white: std(0xdfe3e8, .4, .2), rust: std(0x6e4530, .8, .4),
    glass: std(0x6f8fb0, .05, .6, { transparent: true, opacity: .3 }),
    ledBlue: glow(0x4aa8ff), ledCyan: glow(0x5fe0f0), ledYellow: glow(0xffc23a), ledMagenta: glow(0xff3fb4), ledRed: glow(0xff3328), ledWhite: glow(0xe8f2ff), screen: glow(0x2a7fd0)
  };

  // ---------- Merged geometry with world UVs ----------
  const geos = new Map();
  const bucket = m => { if (!geos.has(m)) geos.set(m, { p: [], n: [], u: [], i: [] }); return geos.get(m); };
  function quad(m, o, U, V) {
    const g = bucket(m), tile = m.userData.tile || 2, lu = Math.hypot(...U), lv = Math.hypot(...V); if (lu < 1e-4 || lv < 1e-4) return;
    const uh = U.map(c => c / lu), vh = V.map(c => c / lv), n = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]], ln = Math.hypot(...n), base = g.p.length / 3;
    for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const p = [o[0] + U[0] * a + V[0] * b, o[1] + U[1] * a + V[1] * b, o[2] + U[2] * a + V[2] * b]; g.p.push(...p); g.n.push(n[0] / ln, n[1] / ln, n[2] / ln); g.u.push((p[0] * uh[0] + p[1] * uh[1] + p[2] * uh[2]) / tile, (p[0] * vh[0] + p[1] * vh[1] + p[2] * vh[2]) / tile); }
    g.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function box(m, x1, x2, y1, y2, z1, z2, { skip = ['bottom'], top = m } = {}) {
    const a = x2 - x1, b = y2 - y1, c = z2 - z1, s = new Set(skip);
    if (!s.has('+x')) quad(m, [x2, y1, z2], [0, 0, -c], [0, b, 0]); if (!s.has('-x')) quad(m, [x1, y1, z1], [0, 0, c], [0, b, 0]);
    if (!s.has('+z')) quad(m, [x1, y1, z2], [a, 0, 0], [0, b, 0]); if (!s.has('-z')) quad(m, [x2, y1, z1], [-a, 0, 0], [0, b, 0]);
    if (!s.has('top')) quad(top, [x1, y2, z2], [a, 0, 0], [0, 0, -c]); if (!s.has('bottom')) quad(m, [x1, y1, z1], [a, 0, 0], [0, 0, c]);
  }
  const floorRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z2], [x2 - x1, 0, 0], [0, 0, -(z2 - z1)]);
  const ceilRect = (m, x1, x2, z1, z2, y) => quad(m, [x1, y, z1], [x2 - x1, 0, 0], [0, 0, z2 - z1]);
  function flushGeometry() {
    for (const [m, g] of geos) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(g.n, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(g.u, 2));
      geo.setIndex(g.p.length / 3 > 65535 ? new T.Uint32BufferAttribute(g.i, 1) : new T.Uint16BufferAttribute(g.i, 1)); geo.computeBoundingSphere(); const mesh = new T.Mesh(geo, m); mesh.receiveShadow = true; add(mesh); }
    geos.clear();
  }
  const cube = new T.BoxGeometry(1, 1, 1), pieces = new Map();
  const piece = (m, x, y, z, sx, sy, sz, ry = 0) => { if (!pieces.has(m)) pieces.set(m, []); pieces.get(m).push([x, y, z, sx, sy, sz, ry]); };
  function flushPieces() {
    const mat = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [m, list] of pieces) { const mesh = new T.InstancedMesh(cube, m, list.length); list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, mat.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; add(mesh); stats.instances += list.length; }
    pieces.clear();
  }
  const cylinder = (m, x, y, z, r, h, { segments = 20, r2 = r, axis = 'y' } = {}) => { const c = new T.Mesh(new T.CylinderGeometry(r2, r, h, segments), m); c.position.set(x, y, z); if (axis === 'x') c.rotation.z = Math.PI / 2; if (axis === 'z') c.rotation.x = Math.PI / 2; return add(c); };

  // ---------- Grounds, roofs ----------
  const FLOOR = { quai: M.antiSkid, sas: M.panel, cour: M.slab, hangar: M.slab, atelier: M.antiSkid, 'relais-est': M.grid, maintenance: M.grid, anneau: M.plate, portique: M.plate };
  function buildGrounds() {
    const ground = new T.Mesh(new T.PlaneGeometry(220, 220), M.asphalt); ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; M.asphalt.map.repeat?.set(30, 30); add(ground);
    for (const a of AREAS) { if (a.id === 'portique') continue; floorRect(FLOOR[a.id] || M.slab, a.x1, a.x2, a.z1, a.z2, .006); if (a.roof) { ceilRect(a.id === 'hangar' ? M.corrugated : M.panel, a.x1, a.x2, a.z1, a.z2, a.roof); floorRect(M.concrete, a.x1 - .2, a.x2 + .2, a.z1 - .2, a.z2 + .2, a.roof + .3); } }
    // Yellow maintenance markings, the lane through the court, hazard hatching at the breach.
    for (let z = -26; z < 60; z += 4) piece(M.yellow, -6, .008, z, .14, .004, 2);
    for (let z = -26; z < 60; z += 4) piece(M.yellow, 6, .008, z, .14, .004, 2);
    for (let a = 0; a < 40; a++) { const ang = a / 40 * TAU; piece(a % 2 ? M.yellow : M.black, Math.cos(ang) * 9.5, .009, -64 + Math.sin(ang) * 9.5, 1.4, .004, .6, -ang); }
    for (const x of [-39.6, 39.6]) piece(M.ledBlue, x, .02, 16, .08, .03, 90);
    piece(M.ledYellow, 0, .02, 95.4, 46, .03, .1);
    // Hangar skylights.
    for (let z = 8; z < 56; z += 12) { piece(M.glass, -66, 12.25, z, 30, .05, 4); piece(M.ledBlue, -66, 11.9, z, 28, .05, .12); }
  }
  // Catwalk, ramps and the gantry deck.
  function buildDecks() {
    for (const f of FLOORS) {
      if (f.ramp) {
        const len = f.ramp === 'x' ? f.x2 - f.x1 : f.z2 - f.z1, mid = new T.Vector3((f.x1 + f.x2) / 2, (f.from + f.to) / 2, (f.z1 + f.z2) / 2);
        const deck = new T.Mesh(new T.BoxGeometry(f.ramp === 'x' ? Math.hypot(len, f.from - f.to) : f.x2 - f.x1, .16, f.ramp === 'z' ? Math.hypot(len, f.from - f.to) : f.z2 - f.z1), M.grid);
        deck.position.copy(mid); const slope = Math.atan2(f.from - f.to, len); if (f.ramp === 'x') deck.rotation.z = slope; else deck.rotation.x = -slope; add(deck);
      } else { box(M.grid, f.x1, f.x2, f.height - .16, f.height, f.z1, f.z2, { skip: [] }); box(M.yellow, f.x1, f.x2, f.height - .3, f.height - .16, f.z1, f.z2, { skip: ['top', 'bottom'] }); }
    }
    // Railings.
    for (const [x, z1, z2] of [[-2, -24, 36], [2, -20, 36]]) { piece(M.steel, x, HEIGHTS.catwalk + 1, (z1 + z2) / 2, .06, .06, z2 - z1); for (let z = z1; z <= z2; z += 2) piece(M.steel, x, HEIGHTS.catwalk, z, .05, 1, .05); piece(M.ledCyan, x, HEIGHTS.catwalk + .02, (z1 + z2) / 2, .04, .03, z2 - z1); }
    piece(M.steel, 0, HEIGHTS.gantry + 1, -86, 40, .06, .06); piece(M.steel, -20, HEIGHTS.gantry + 1, -90.5, .06, .06, 9); piece(M.ledMagenta, 0, HEIGHTS.gantry + .02, -86, 40, .03, .04);
    for (let x = -20; x <= 20; x += 2) piece(M.steel, x, HEIGHTS.gantry, -86, .05, 1, .05);
    for (let z = -20; z <= 32; z += 8) for (const x of [-2.4, 2.4]) piece(M.dark, x, 0, z, .5, HEIGHTS.catwalk - .16, .5);
    for (const x of [-18, -6, 6, 18]) piece(M.dark, x, 0, -86.6, .6, HEIGHTS.gantry - .16, .6);
  }
  // Walls from the colliders, lintels over the doorways, technical blue LED bands.
  const WALL = { janus: M.concrete, panel: M.panel, hangar: M.corrugated, pipes: M.plate, train: null };
  function buildWalls(obstacles) {
    const lines = new Map();
    for (const o of obstacles) {
      if (o.kind !== 'wall') continue;
      const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
      box(WALL[o.look] || M.concrete, x1, x2, 0, o.height, z1, z2);
      if (o.look === 'janus') { box(M.blue, x1 - .01, x2 + .01, 2.6, 2.9, z1 - .01, z2 + .01, { skip: ['top', 'bottom'] }); box(M.ledBlue, x1 - .02, x2 + .02, 2.7, 2.78, z1 - .02, z2 + .02, { skip: ['top', 'bottom'] }); box(M.yellow, x1 - .01, x2 + .01, 0, .3, z1 - .01, z2 + .01, { skip: ['top', 'bottom'] }); }
      if (o.look === 'pipes') for (const y of [1.2, 2.2, 3.2]) piece(M.steel, o.x + (o.x < 0 ? .35 : -.35), y, o.z, .22, .22, o.hz * 2);
      const axis = o.hx > o.hz ? 'x' : 'z', fixed = axis === 'x' ? o.z : o.x, key = axis + ':' + fixed.toFixed(2);
      if (!lines.has(key)) lines.set(key, []); lines.get(key).push({ o, a: axis === 'x' ? x1 : z1, b: axis === 'x' ? x2 : z2 });
    }
    for (const [key, spans] of lines) {
      const [axis, f] = key.split(':'), fixed = +f; spans.sort((p, q) => p.a - q.a);
      for (let k = 0; k + 1 < spans.length; k++) {
        const left = spans[k], right = spans[k + 1]; if (right.a - left.b < .2) continue;
        const centre = (left.b + right.a) / 2, h = Math.max(left.o.height, right.o.height), d = DOORS.find(d => d.axis === axis && Math.abs(d.fixed - fixed) < .4 && Math.abs(d.centre - centre) < .6), open = d ? d.height : 4;
        const m = WALL[left.o.look] || M.concrete;
        if (open < h - .05) axis === 'x' ? box(m, left.b, right.a, open, h, fixed - .2, fixed + .2) : box(m, fixed - .2, fixed + .2, open, h, left.b, right.a);
        for (const at of [left.b, right.a]) axis === 'x' ? piece(M.yellow, at, 0, fixed, .14, open, .5) : piece(M.yellow, fixed, 0, at, .5, open, .14);
      }
    }
  }

  // ---------- Props ----------
  const breach = { level: 1, target: 1 }, relays = new Map(), stabs = [];
  function dress(o) {
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, h = o.height;
    // All stages share the same hard-surface silhouettes, independent of PBR palette.
    const shared={bench:'bench',scanner:'scanner',transformer:'generator',
      forklift:'forklift',generator:'generator',cabinet:'cabinet',
      rack:'rack',workbench:'workbench',batteries:'batteries',servers:'servers',
      terminal:'terminal',console:'console'};
    if(shared[o.kind]){
      const model=createFunctionalProp(T,shared[o.kind],{w,d,h,low,M});
      model.position.set(o.x,0,o.z);add(model);return;
    }
    switch (o.kind) {
      case 'train': {
        for(const [x,name] of [[-16,'LOCO'],[-4,'SAN'],[9,'SAN'],[20,'FRET']]){
          const lw=name==='FRET'?7:11;
          const vehicle=createFunctionalProp(T,'railcar',{w:lw,d:2.5,h:4.2,low,
            M:{...M,paintedMetal:name==='LOCO'?M.dark:M.white,
              white:name==='LOCO'?M.dark:M.white,glass:M.glass||M.screenOff,
              ledCyan:name==='SAN'?M.ledYellow:M.ledBlue}});
          vehicle.name='M04 / wagon '+name;vehicle.position.set(x,0,97.55);add(vehicle);
        }
        break;
      }
      case 'guard-post': box(M.white, x1, x2, 0, h, z1, z2); box(M.glass, x1 - .02, x2 + .02, 1.1, 2.2, z1 - .02, z1, { skip: ['top', 'bottom'] }); piece(M.ledBlue, o.x, h, o.z, w, .1, d); break;
      case 'crates': for (let k = 0; k < 4; k++) piece(k % 2 ? M.plate : M.yellow, o.x + (k % 2 - .5) * o.hx, Math.floor(k / 2) * h / 2, o.z, o.hx * .95, h / 2 - .02, d - .1); break;
      case 'bench': piece(M.steel, o.x, .45, o.z, w, .06, d); piece(M.dark, o.x - o.hx + .2, 0, o.z, .08, .45, d); piece(M.dark, o.x + o.hx - .2, 0, o.z, .08, .45, d); break;
      case 'scanner': box(M.white, x1, x2, 0, h, z1, z2); piece(M.ledBlue, o.x, h - .2, o.z, w + .04, .12, d + .04); { const c = new T.Mesh(new T.PlaneGeometry(2.2, h - .3), additive(0x4aa8ff, .14)); c.position.set(o.x + (o.x < 0 ? 1.6 : -1.6), (h - .3) / 2, o.z); c.rotation.y = Math.PI / 2; add(c); animated.push(t => { c.material.opacity = .1 + .06 * Math.sin(t * 5 + o.x); }); } break;
      case 'transformer': box(M.dark, x1, x2, 0, h, z1, z2); for (let k = 0; k < 6; k++) piece(M.steel, x1 + .4 + k * (w - .8) / 5, h, o.z, .22, .9, d - .4); piece(M.ledYellow, o.x, h * .6, z2 + .01, w * .6, .1, .02); break;
      case 'tank': cylinder(M.white, o.x, h / 2, o.z, o.hx, h); cylinder(M.blue, o.x, h * .75, o.z, o.hx + .03, .3); piece(M.steel, o.x - o.hx - .4, 0, o.z, .2, h + 1, .2); break;
      case 'container': box(M.blue, x1, x2, 0, h, z1, z2); for (let k = 0; k < 9; k++) piece(M.dark, x1 - .01, .1, z1 + .3 + k * (d - .6) / 8, .02, h - .2, .05); break;
      case 'forklift': piece(M.yellow, o.x, .3, o.z, w, 1.2, d * .7); piece(M.dark, o.x, 1.5, o.z + .2, w * .9, .9, d * .4); piece(M.steel, o.x, 0, o.z - o.hz + .1, w * .8, 2.2, .1); break;
      case 'piperack': for (const y of [1.2, 2.2, 3]) piece(M.steel, o.x, y, o.z, w, .3, .3); for (let k = -1; k <= 1; k++) piece(M.dark, o.x + k * o.hx * .9, 0, o.z, .2, h, .2); piece(M.ledYellow, o.x, 3.3, o.z, w, .04, .04); break;
      case 'generator': cylinder(M.rust, o.x, h / 2, o.z, o.hz, w, { axis: 'x' }); piece(M.dark, o.x, 0, o.z, w, .3, d); break;
      case 'cabinet': box(M.panel, x1, x2, 0, h, z1, z2); piece(M.ledCyan, x2 + .01, h * .7, o.z, .02, .1, d * .7); break;
      case 'rack': {
        box(M.dark, x1, x2, 0, .2, z1, z2); for (const y of [1, 2.2]) piece(M.steel, o.x, y, o.z, w, .08, d);
        for (let k = 0; k < 5; k++) for (const y of [1.08, 2.28]) { const dx = o.x - o.hx + 1.1 + k * (w - 2.2) / 4; piece(M.white, dx, y, o.z, .9, .3, .9); piece(M.ledRed, dx, y + .3, o.z, .2, .05, .2); }
        for (const s of [-1, 1]) piece(M.dark, o.x + s * o.hx, 0, o.z, .12, h, .12); break;
      }
      case 'workbench': box(M.steel, x1, x2, .85, .95, z1, z2); piece(M.white, o.x, .95, o.z, 1, .35, 1); for (const s of [-1, 1]) piece(M.dark, o.x + s * (o.hx - .1), 0, o.z, .08, .85, d - .1); break;
      case 'batteries': for (let k = 0; k < 4; k++) piece(M.dark, o.x, 0, o.z - o.hz + .6 + k * (d - 1.2) / 3, w, h, .9); piece(M.ledYellow, o.x + o.hx + .01, h * .7, o.z, .02, .1, d * .8); break;
      case 'servers': box(M.black, x1, x2, 0, h, z1, z2); { const leds = []; for (const face of [x1 - .01, x2 + .01]) for (let k = 0; k < 18; k++) leds.push([face, .3 + (k % 6) * .34, o.z - o.hz + .6 + Math.floor(k / 6) * (d - 1.2) / 2]); for (const [x, y, z] of leds) piece(rng() < .8 ? M.ledCyan : M.ledMagenta, x, y, z, .01, .03, .4); } break;
      case 'terminal': box(M.panel, x1, x2, 0, h, z1, z2); piece(M.screen, o.x, h + .1, z2 + .02, w * .8, .5, .02); break;
      case 'reactor': {
        cylinder(M.dark, o.x, 1.5, o.z, o.hx, 3, { segments: 32 }); cylinder(M.steel, o.x, 3.3, o.z, o.hx - .6, .6, { segments: 32 }); cylinder(M.blue, o.x, 6, o.z, o.hx - 1.2, 4.8, { segments: 32, r2: o.hx - 2 });
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; piece(M.yellow, o.x + Math.cos(a) * (o.hx + .2), 0, o.z + Math.sin(a) * (o.hx + .2), .5, 3.2, .5, -a); }
        break;
      }
      case 'stabilizer': {
        const g = new T.Group(); g.position.set(o.x, 0, o.z); add(g);
        const base = new T.Mesh(new T.CylinderGeometry(o.hx, o.hx + .2, .6, 16), M.dark); base.position.y = .3; g.add(base);
        for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, bar = new T.Mesh(new T.BoxGeometry(.12, h, .12), M.steel); bar.position.set(Math.cos(a) * (o.hx - .1), h / 2, Math.sin(a) * (o.hx - .1)); g.add(bar); }
        const core = new T.Mesh(new T.OctahedronGeometry(.7, 1), glow(0xff3fb4)); core.position.y = h * .55; g.add(core);
        const ring = new T.Mesh(new T.TorusGeometry(1.1, .06, 6, 32), glow(0xff3fb4)); ring.position.y = h * .55; g.add(ring);
        const top = new T.Mesh(new T.CylinderGeometry(o.hx, o.hx, .3, 16), M.dark); top.position.y = h; g.add(top);
        stabs.push({ g, core, ring, off: 0, id: 'stab-' + (stabs.length + 1) }); break;
      }
      case 'console': box(M.dark, x1, x2, 0, h - .05, z1, z2); piece(M.screen, o.x, h, o.z - o.hz + .2, w * .8, .5, .04); piece(M.ledMagenta, o.x, h - .1, z2 + .01, w * .9, .05, .02); break;
      case 'coolant': cylinder(M.white, o.x, h / 2, o.z, o.hx, h); cylinder(M.ledCyan, o.x, h + .05, o.z, o.hx * .5, .1); break;
      case 'pillar': case 'rail': break;
      default: break;
    }
  }
  // The third stabiliser stands on the gantry deck.
  function gantryStabilizer() { dress({ kind: 'stabilizer', x: 0, z: -92.4, hx: 1.4, hz: 1.4, height: 3.6 }); stabs.at(-1).g.position.y = HEIGHTS.gantry; }
  function buildRelays() {
    for (const [id, x, z, side] of [['relais-ouest', -91.6, 28, 1], ['relais-est', 91.6, 28, -1]]) {
      const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; add(g);
      const cab = new T.Mesh(new T.BoxGeometry(2.6, 2.6, .8), M.dark); cab.position.set(0, 1.3, .4); g.add(cab);
      const lamps = []; for (let k = 0; k < 6; k++) { const l = new T.Mesh(new T.BoxGeometry(.25, .12, .05), glow(0x3a1414)); l.position.set(-.9 + k * .36, 2.2, .83); g.add(l); lamps.push(l); }
      const coil = new T.Mesh(new T.TorusGeometry(.5, .08, 8, 24), glow(0x203040)); coil.position.set(0, 1.2, .85); g.add(coil);
      relays.set(id, { lamps, coil, on: false });
    }
  }
  // The breach: a violet column over the reactor, rotating rings, sparks rising.
  const breachParts = {};
  function buildBreach() {
    const g = new T.Group(); g.position.set(0, 0, -64); add(g);
    const column = new T.Mesh(new T.CylinderGeometry(1.4, 3.2, 90, 24, 1, true), additive(0xc23cff, .32)); column.position.y = 50; g.add(column);
    const core = new T.Mesh(new T.CylinderGeometry(.6, .9, 90, 16, 1, true), additive(0xff6ad5, .5)); core.position.y = 50; g.add(core);
    const rings = []; for (let k = 0; k < 4; k++) { const r = new T.Mesh(new T.TorusGeometry(3.4 + k * 1.3, .08, 6, 48), additive(k % 2 ? 0xff3fb4 : 0x9a5cff, .7)); r.position.y = 10 + k * 4; r.rotation.x = Math.PI / 2; g.add(r); rings.push(r); }
    const sparkGeo = new T.BufferGeometry(), N = low ? 80 : 220, pos = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) seeds.push({ a: rng() * TAU, r: 1 + rng() * 5, y: rng() * 40, v: 2 + rng() * 5 });
    sparkGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const sparks = new T.Points(sparkGeo, new T.PointsMaterial({ color: 0xff8ae0, size: .22, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); g.add(sparks);
    const light = new T.PointLight(0xc23cff, 120, 70, 1.6); light.position.set(0, 12, 0); g.add(light);
    Object.assign(breachParts, { g, column, core, rings, sparks, seeds, pos, light });
  }
  function updateBreach(t, dt) {
    breach.level += (breach.target - breach.level) * Math.min(1, dt * .8); const v = breach.level, b = breachParts; if (!b.g) return;
    b.column.material.opacity = .06 + .28 * v * (.85 + .15 * Math.sin(t * 7)); b.core.material.opacity = .1 + .45 * v; b.light.intensity = 25 + 110 * v;
    b.rings.forEach((r, k) => { r.rotation.z += dt * (.4 + k * .2) * (k % 2 ? -1 : 1) * (.3 + v); r.scale.setScalar(1 + .06 * Math.sin(t * 2 + k)); r.material.opacity = .15 + .6 * v; });
    b.seeds.forEach((s, i) => { s.y += s.v * dt * (.3 + v); if (s.y > 44) s.y = 0; s.a += dt * .6; b.pos[i * 3] = Math.cos(s.a) * s.r; b.pos[i * 3 + 1] = s.y; b.pos[i * 3 + 2] = Math.sin(s.a) * s.r; });
    b.sparks.geometry.attributes.position.needsUpdate = true; b.sparks.material.opacity = .2 + .7 * v;
    for (const s of stabs) { s.core.rotation.y = t * 2; s.ring.rotation.x = t * 1.4; s.off += ((done.has(s.id) ? 1 : 0) - s.off) * Math.min(1, dt * 2); const c = s.off > .5 ? 0x3dff8a : 0xff3fb4; s.core.material.color.set(c); s.ring.material.color.set(c); s.core.scale.setScalar(1 - .4 * s.off); }
  }
  const done = new Set();

  // ---------- Doors ----------
  const doors = new Map();
  function buildDoors() {
    for (const d of DOORS) {
      const g = new T.Group(); add(g); const panels = [];
      for (const dir of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(d.axis === 'x' ? d.width / 2 : .12, d.height, d.axis === 'x' ? .12 : d.width / 2), d.style === 'hazard' ? M.yellow : M.white); m.position.set(d.axis === 'x' ? d.centre + dir * d.width / 4 : d.fixed, d.height / 2, d.axis === 'x' ? d.fixed : d.centre + dir * d.width / 4); g.add(m);
        const band = new T.Mesh(new T.BoxGeometry(d.axis === 'x' ? d.width / 2 : .14, .14, d.axis === 'x' ? .14 : d.width / 2), d.style === 'hazard' ? M.black : M.ledBlue); band.position.copy(m.position); band.position.y = d.height * .55; g.add(band); panels.push({ m, band, dir, base: m.position.clone() }); }
      const lamp = new T.Mesh(new T.BoxGeometry(.14, .14, .14), glow(0xff3328)); lamp.position.set(d.axis === 'x' ? d.centre + d.width / 2 + .4 : d.fixed + .3, d.height + .3, d.axis === 'x' ? d.fixed + .3 : d.centre + d.width / 2 + .4); g.add(lamp);
      doors.set(d.id, { d, panels, lamp, state: d.open ? 'auto' : 'closed', open: 0 });
    }
  }
  function updateDoors(dt, p) {
    for (const door of doors.values()) {
      const { d } = door; let target = door.state === 'open' ? 1 : 0;
      if (door.state === 'auto') target = Math.hypot(p.x - (d.axis === 'x' ? d.centre : d.fixed), p.z - (d.axis === 'x' ? d.fixed : d.centre)) < 4.5 ? 1 : 0;
      door.open += Math.sign(target - door.open) * Math.min(Math.abs(target - door.open), dt * 1.4);
      for (const pn of door.panels) for (const o of [pn.m, pn.band]) { if (d.axis === 'x') o.position.x = pn.base.x + pn.dir * d.width / 2 * door.open; else o.position.z = pn.base.z + pn.dir * d.width / 2 * door.open; }
      door.lamp.material.color.set(door.state === 'closed' ? 0xff3328 : 0x3dff8a);
    }
  }

  // ---------- Interaction markers ----------
  const devices = new Map();
  function buildDevices() {
    for (const it of INTERACTIONS) {
      const g = new T.Group(); g.position.set(it.x, it.y || 0, it.z); add(g);
      const gem = new T.Mesh(new T.OctahedronGeometry(.13, 0), glow(0xffb35c)); gem.position.y = 1.9; g.add(gem);
      const ring = new T.Mesh(new T.RingGeometry(.5, .58, 28), additive(0xffb35c, .35)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
      if (it.id.startsWith('doc-')) { const paper = new T.Mesh(new T.PlaneGeometry(.3, .4), std(0xe8e1cf, .9, 0, { side: T.DoubleSide })); paper.position.set(0, 1.15, 0); paper.rotation.x = -.3; g.add(paper); }
      devices.set(it.id, { it, g, gem, ring, done: false, available: false });
    }
  }
  function updateDevices(t) {
    const blink = .5 + .5 * Math.sin(t * 5);
    for (const d of devices.values()) {
      const doc = !!d.it.log, color = d.done ? 0x3dff8a : doc ? 0xe8f6ff : d.available ? 0xffb35c : 0x3a2a1a;
      d.gem.material.color.set(color); d.ring.material.color.set(color); d.gem.visible = d.available || doc || d.done; d.ring.visible = d.gem.visible && !d.done;
      d.gem.position.y = 1.9 + Math.sin(t * 2 + d.it.x) * .08; d.gem.rotation.y = t * 1.6; d.ring.material.opacity = d.available ? .25 + .35 * blink : .2;
    }
  }

  // ---------- Signage (W04: technical blue, maintenance yellow, JANUS violet) ----------
  const signs = createSignage(T, { root, low });
  function buildSigns() {
    signs.neon(['STATION ÉNERGÉTIQUE EST', 'JANUS · SECTEUR DE CALCUL'], { color: '#9a7bff', color2: '#ff4fa1', kanji: '位相', w: 12, h: 2.4, x: 0, y: 5.6, z: 74.34, yaw: 0 });
    signs.advert('janus', { w: 9, h: 3.6, x: -23.7, y: 6.5, z: 86, yaw: Math.PI / 2 });
    signs.wayfinding('SAS D’INSPECTION', { sub: 'BADGE JANUS OBLIGATOIRE', jp: '検査区域', picto: 'eye', arrow: 0, color: '#4aa8ff', w: 3.4, h: .8, x: 8, y: 3.4, z: 74.34, yaw: 0 });
    signs.hazard('CONTRÔLE D’IDENTITÉ', { sub: 'TOUT ACCÈS EST ENREGISTRÉ PAR ORDRE', picto: 'eye', w: 1.6, h: .8, x: -9.75, y: 2, z: 68, yaw: Math.PI / 2 });
    signs.wayfinding('HANGAR DE DRONES', { sub: 'RELAIS OUEST · SECTEUR 3', jp: '格納庫', picto: 'bolt', arrow: Math.PI / 2, color: '#ffc23a', w: 3.4, h: .8, x: -12, y: 3.4, z: 60, yaw: Math.PI });
    signs.wayfinding('ATELIER SERVEUR', { sub: 'RELAIS EST · SECTEUR 4', jp: '電算室', picto: 'bolt', arrow: -Math.PI / 2, color: '#4aa8ff', w: 3.4, h: .8, x: 12, y: 3.4, z: 60, yaw: Math.PI });
    signs.wayfinding('ANNEAU DE LA COLONNE', { sub: 'PASSAGE DE MAINTENANCE · SECTEUR 5–6', jp: '位相環', picto: 'phase', arrow: 0, color: '#ff4fa1', w: 3.8, h: .8, x: 8, y: 4, z: -29.75, yaw: 0 });
    signs.hazard('ZONE DE SYNCHRONISATION', { sub: 'PERSONNEL JANUS UNIQUEMENT', picto: 'phase', w: 1.6, h: .8, x: -3.6, y: 2.2, z: -29.75, yaw: 0 });
    signs.blade('危険', { color: '#ffc23a', sub: 'DANGER', x: -38.5, y: 5, z: 50, yaw: Math.PI / 2 });
    signs.blade('格納庫', { color: '#4aa8ff', sub: 'HANGAR', x: -40.6, y: 6.5, z: 23, yaw: 0 });
    signs.blade('電算', { color: '#5fe0f0', sub: 'SERVEURS', x: 40.6, y: 4, z: 23.5, yaw: 0 });
    signs.blade('位相', { color: '#ff4fa1', sub: 'PHASE', x: -59.5, y: 7, z: -50, yaw: Math.PI / 2 });
    signs.neon(['GARDIEN DE PORTIQUE', 'BS01 · ACCÈS INTERDIT'], { color: '#ff3b4e', kanji: '門', w: 7, h: 1.6, x: 0, y: 9.5, z: -95.7, yaw: 0 });
    signs.advert('ordre', { w: 6, h: 2.4, x: 59.7, y: 6.5, z: -70, yaw: -Math.PI / 2 });
    signs.advert('helix', { w: 6, h: 2.2, x: -59.7, y: 6.5, z: -78, yaw: Math.PI / 2, holo: false });
    signs.hazard('DRONES EN CHARGE', { sub: 'NE PAS TOUCHER LES RACKS', picto: 'bolt', w: 1.4, h: .7, x: -91.75, y: 2.4, z: 16, yaw: Math.PI / 2 });
    signs.hazard('BAIE 4', { sub: 'TECHNICIENS · ACCÈS JANUS', picto: 'eye', w: 1.2, h: .6, x: 60, y: 2.4, z: 25.75, yaw: Math.PI });
    for (const [id, x, z, yaw] of [['relais-ouest', -91.75, 24.6, Math.PI / 2], ['relais-est', 91.75, 31.4, -Math.PI / 2]]) signs.wayfinding(id === 'relais-ouest' ? 'RELAIS OUEST' : 'RELAIS EST', { sub: 'RÉSEAU DE SECOURS 400 V', jp: '中継', picto: 'bolt', arrow: null, color: '#ffc23a', w: 2.4, h: .6, x, y: 3.1, z, yaw });
  }

  // ---------- Light pool ----------
  const sources = [];
  for (const a of AREAS) if (a.roof) for (let x = a.x1 + 6; x < a.x2; x += 12) for (let z = a.z1 + 6; z < a.z2; z += 12) sources.push({ x, y: a.roof - .4, z, color: new T.Color(a.id === 'hangar' ? 0xdfe8ff : 0xcfe2ff), intensity: a.id === 'hangar' ? 26 : 12, range: a.id === 'hangar' ? 22 : 13 });
  for (const [x, z] of [[-30, 50], [30, 50], [-30, 10], [30, 10], [-30, -24], [30, -24], [10, 93], [-16, 80], [16, 80], [-40, -60], [40, -60], [-12, -50]]) sources.push({ x, y: 9, z, color: new T.Color(0xffd9a0), intensity: 22, range: 24 });
  function buildFixtures() {
    for (const s of sources) {
      if (s.y > 8.5) { const pole = new T.Mesh(new T.CylinderGeometry(.1, .14, s.y, 8), M.steel); pole.position.set(s.x, s.y / 2, s.z); add(pole); piece(M.ledYellow, s.x, s.y, s.z, 1.4, .16, .5); }
      else piece(M.ledWhite, s.x, s.y + .25, s.z, 1.4, .06, .3);
    }
  }
  const POOL = low ? 3 : 6, pool = Array.from({ length: POOL }, () => { const l = new T.PointLight(0xffffff, 0, 14, 1.6); add(l, scene); return { l, s: null, level: 0 }; });
  function updatePool(dt, e) {
    const wanted = sources.map(s => ({ s, d: Math.hypot(s.x - e.x, s.y - e.y, s.z - e.z) / Math.sqrt(s.intensity / 10) })).filter(o => o.d < 28).sort((a, b) => a.d - b.d).slice(0, POOL).map(o => o.s), set = new Set(wanted);
    for (const slot of pool) { if (slot.s && !set.has(slot.s)) slot.level = Math.max(0, slot.level - dt * 6); else if (slot.s) slot.level = Math.min(1, slot.level + dt * 5); if (slot.level <= 0) slot.s = null; }
    for (const s of wanted) if (!pool.some(p => p.s === s)) { const free = pool.find(p => !p.s); if (free) { free.s = s; free.level = 0; } }
    for (const slot of pool) { const s = slot.s; if (!s) { slot.l.intensity = 0; continue; } slot.l.position.set(s.x, s.y - .4, s.z); slot.l.color.copy(s.color); slot.l.distance = s.range; slot.l.intensity = s.intensity * slot.level; }
    stats.lights = pool.filter(p => p.s).length;
  }

  // ---------- ORDRE tactical portals ----------
  const portals = [];
  function openPortal(x, y, z, { charge = 3.2, hold = 2.2 } = {}) {
    const g = new T.Group(); g.position.set(x, y, z);
    const ring = new T.Mesh(new T.RingGeometry(1.5, 1.85, 40), additive(0xff3b4e, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
    const membrane = new T.Mesh(new T.CircleGeometry(1.6, 40), additive(0xff2d55, 0)); membrane.position.y = 1.7; g.add(membrane);
    const frame = new T.Mesh(new T.TorusGeometry(1.7, .12, 8, 40), M.dark); frame.position.y = 1.7; g.add(frame);
    add(g); portals.push({ group: g, ring, membrane, frame, age: 0, charge, hold });
  }
  function updatePortals(t, dt, e) {
    for (let i = portals.length - 1; i >= 0; i--) { const p = portals[i]; p.age += dt; const c = Math.min(1, p.age / p.charge), end = p.charge + p.hold;
      p.ring.material.opacity = .9 * (.5 + .5 * Math.sin(t * 12)) * (p.age < end ? 1 : 0); p.ring.scale.setScalar(.6 + .5 * c);
      p.membrane.material.opacity = p.age > p.charge * .7 ? Math.min(.75, (p.age - p.charge * .7) * 1.2) * Math.max(0, 1 - (p.age - end) * 1.5) : 0; p.frame.rotation.z = t * 2; p.group.lookAt(e.x, p.group.position.y, e.z);
      if (p.age > end + .8) { root.remove(p.group); portals.splice(i, 1); } }
  }

  return {
    root, M, openPortal,
    build(obstacles) {
      buildGrounds(); buildDecks(); buildWalls(obstacles); for (const o of obstacles) dress(o); gantryStabilizer(); buildRelays(); buildBreach(); buildDoors(); buildDevices(); buildSigns(); buildFixtures();
      flushGeometry(); flushPieces();
    },
    update(t, dt, eye, player) {
      const e = eye.position; updatePool(dt, e); updateBreach(t, dt); updatePortals(t, dt, e); updateDevices(t); if (player) updateDoors(dt, player);
      for (const [, r] of relays) { r.lamps.forEach((l, k) => l.material.color.set(r.on ? (Math.sin(t * 6 + k) > 0 ? 0x3dff8a : 0x1a6a3a) : 0x3a1414)); r.coil.material.color.set(r.on ? 0x5fe0f0 : 0x203040); r.coil.rotation.z += dt * (r.on ? 4 : 0); }
      for (const f of animated) f(t, dt); signs.update(t);
    },
    setDoor(id, open) { const d = doors.get(id); if (d) d.state = open ? (d.d.open ? 'auto' : 'open') : 'closed'; },
    setPower(id, on) { const r = relays.get(id); if (r) r.on = !!on; },
    breach(v) { breach.target = Math.max(0, Math.min(1, v)); },
    markDone(id, isDone = true) { const d = devices.get(id); if (d) d.done = isDone; if (id.startsWith('stab-')) { if (isDone) done.add(id); else done.delete(id); } },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { ...stats, portals: portals.length, breach: +breach.level.toFixed(2), signs: signs.stats().signs, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])) }; }
  };
}

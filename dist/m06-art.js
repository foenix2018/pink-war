import {createFPSChapter} from './fps-environments.js';
import {createElectricPortal,PORTAL_CLOSE_SECONDS} from './electric-portal.js';
import {createFloorRampHardware} from './stair-hardware.js';
import {createIndustrialLightBatch} from './industrial-light.js';
import {createIndustrialDoor} from './industrial-door.js';
import {createModernSwitch,switchVariant} from './modern-switch.js';
import {createLevelNeons} from './level-neons.js';
// CHAPITRE 06 dressing: the automated foundry of Vesper-Nord, late afternoon (the same day ends at sunset in the
// forest of chapter 07). Rail spur and arrival platform, the scrap yard of the civilian machines of 2189 (welding arms,
// site quadrupeds, farm drones: the P-0 prototypes of chapter 05), the gate, the casting hall (furnace, molten metal,
// ladles, the control booth), the heavy chain (Brutes on the line, robot arms, the crane deck), the core of the N-08,
// the loading dock. Palette: sooty brick and steel, molten orange, ORDRE red. Same building blocks as chapter 04
// (merged geometry with world UVs, instanced pieces, pooled point lights, doors, markers, portals, shared signage).
import { AREAS, DOORS, INTERACTIONS, FLOORS, HEIGHTS } from './m06-layout.js';
import { createSignage } from './signage.js';
import { createFunctionalProp } from './functional-props.js';
import { softCube, splitPieces } from './soft-pieces.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function canvasTexture(T, w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

export function createM06Art(T, scene, { quality = 'normal', webgpu=false, onPortalClose=()=>{}, accent = 0xff6fb4 } = {}) {
  const low = quality === 'low', rng = seeded(606);
  const root = new T.Group(); root.name = 'M06 / Le Cœur d’Acier'; scene.add(root);
  let fpsChapter=null;
  const animated = [], stats = { meshes: 0, instances: 0, lights: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Late afternoon: low sun through smoke, sooty haze ----------
  scene.background = new T.Color(0x6b4a3a);
  scene.fog = new T.FogExp2(0x8a5d45, low ? .011 : .009);
  const sky = new T.HemisphereLight(0xffc89a, 0x3a2a22, 1.2); scene.add(sky);
  const sun = new T.DirectionalLight(0xffb070, 2.6); sun.position.set(-70, 45, 40); scene.add(sun);
  const skyTex = canvasTexture(T, 16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); for (const [a, col] of [[0, '#2b2a4a'], [.4, '#6a4a5a'], [.62, '#c9764a'], [.74, '#f0a868'], [.82, '#8a5d45'], [1, '#2a1c16']]) g.addColorStop(a, col); c.fillStyle = g; c.fillRect(0, 0, w, h); });
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
    brick: tiled(L9('concrete_wall_006'), 0x8a5a48, .92, .02, 2.5), concrete: tiled(L9('concrete_wall_006'), 0x7d7670, .9, .02, 3), slab: tiled(CC('concrete_floor'), 0x6e6862, .88, .05, 3),
    asphalt: tiled(CC('vesper-asphalt'), 0x5e5a56, .6, .1, 4), plate: tiled(L9('metal_plate'), 0x7a7470, .5, .65, 2), grid: tiled(L9('rusty_metal_grid'), 0x8c7a6a, .55, .55, 1.5),
    shutter: tiled(L9('rusted_shutter'), 0x9a8270, .6, .4, 3), antiSkid: tiled(L9('anti_skid_tiles'), 0x6a6460, .75, .2, 2), corrugated: tiled(CC('corrugated_iron'), 0x7a6a5a, .5, .55, 2),
    steel: tiled(CC('vesper-steel'), 0x8a8a8a, .38, .8, 2),
    soot: std(0x1c1816, .85, .3), yellow: std(0xd9a21e, .55, .2), dark: std(0x181614, .55, .6), black: std(0x0b0a09, .6, .3), white: std(0xbdb6ac, .5, .2), rust: std(0x6e3e26, .85, .45),
    graphite: std(0x3a3f45, .55, .7), aegis: std(0x55616a, .6, .4), glass: std(0x9a8a7a, .1, .5, { transparent: true, opacity: .25 }),
    molten: glow(0xff8a2a), moltenHot: glow(0xffd27a), ledRed: glow(0xff3328), ledYellow: glow(0xffc23a), ledWhite: glow(0xfff0d8), ledBlue: glow(0x4aa8ff), ledMagenta: glow(0xff3fb4), screen: glow(0xc04a2a)
  };

  const neons=createLevelNeons(T,root,{low,floorHeights:[0,...FLOORS.map(f=>f.height).filter(Number.isFinite)],metal:M.steel,back:M.dark,materials:Object.entries(M).filter(([name])=>name.startsWith('led')).map(([,m])=>m)});

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
    if(top===m&&neons.box(m,[a,b,c],[(x1+x2)/2,(y1+y2)/2,(z1+z2)/2]))return;
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
  const piece = (m, x, y, z, sx, sy, sz, ry = 0) => { if(neons.box(m,[sx,sy,sz],[x,y+sy/2,z],[0,ry,0]))return; if (!pieces.has(m)) pieces.set(m, []); pieces.get(m).push([x, y, z, sx, sy, sz, ry]); };
  // Thick pieces get rounded edges (soft-pieces.js); thin strips, rails and LEDs stay plain.
  const softSplit = all => { const { soft, plain } = splitPieces(all); return [[softCube(T), soft], [cube, plain]].filter(([, l]) => l.length); };
  function flushPieces() {
    const mat = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), s = new T.Vector3();
    for (const [m, all] of pieces) for (const [geo, list] of softSplit(all)) { const mesh = new T.InstancedMesh(geo, m, list.length); list.forEach(([x, y, z, sx, sy, sz, ry], i) => mesh.setMatrixAt(i, mat.compose(p.set(x, y + sy / 2, z), q.setFromEuler(e.set(0, ry, 0)), s.set(sx, sy, sz))));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.receiveShadow = true; add(mesh); stats.instances += list.length; }
    pieces.clear();
  }
  const cylinder = (m, x, y, z, r, h, { segments = 20, r2 = r, axis = 'y' } = {}) => { const c = new T.Mesh(new T.CylinderGeometry(r2, r, h, segments), m); c.position.set(x, y, z); if (axis === 'x') c.rotation.z = Math.PI / 2; if (axis === 'z') c.rotation.x = Math.PI / 2; return add(c); };

  // ---------- Grounds, roofs (skylights broken: light shafts come through) ----------
  const FLOOR = { voie: M.asphalt, ferraille: M.asphalt, coulee: M.slab, chaine: M.antiSkid, coeur: M.plate, quai: M.slab, cabine: M.grid };
  function buildGrounds() {
    const ground = new T.Mesh(new T.PlaneGeometry(220, 220), M.asphalt); ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; M.asphalt.map.repeat?.set(30, 30); add(ground);
    for (const a of AREAS) {
      if (a.id === 'cabine') continue; floorRect(FLOOR[a.id] || M.slab, a.x1, a.x2, a.z1, a.z2, .006);
      if (a.roof) {
        // Corrugated roof with a missing strip every 12 m: the low sun cuts through.
        for (let z = a.z1; z < a.z2; z += 12) ceilRect(M.corrugated, a.x1, a.x2, z, Math.min(a.z2, z + 9), a.roof);
        for (let z = a.z1 + 9; z < a.z2; z += 12) { piece(M.steel, (a.x1 + a.x2) / 2, a.roof - .3, z + 1.5, a.x2 - a.x1, .3, .25); if (!low) shaft((a.x1 + a.x2) / 2, a.roof, z + 1.5, a.x2 - a.x1); }
        // Roof trusses.
        for (let x = a.x1 + 6; x < a.x2; x += 12) piece(M.rust, x, a.roof - 1.2, (a.z1 + a.z2) / 2, .3, .3, a.z2 - a.z1);
      }
    }
    // Rails of the spur and the line markings.
    for (const z of [97, 98.4]) piece(M.steel, 5, .02, z, 70, .12, .12);
    for (let x = -28; x < 38; x += 1.2) piece(M.rust, x, 0, 97.7, .25, .06, 2.4);
    for (let z = -16; z < 62; z += 4) piece(M.yellow, 60, .008, z, .14, .004, 2), piece(M.yellow, 76, .008, z, .14, .004, 2);
    for (let a = 0; a < 40; a++) { const ang = a / 40 * TAU; piece(a % 2 ? M.yellow : M.black, Math.cos(ang) * 9, .009, -70 + Math.sin(ang) * 9, 1.4, .004, .6, -ang); }
  }
  function shaft(x, y, z, len) {
    const m = new T.Mesh(new T.PlaneGeometry(len, y * 1.4), additive(0xffb070, .07)); m.position.set(x - 6, y * .5, z + 4); m.rotation.set(-.55, 0, .35); add(m);
  }
  // Booth deck, crane deck, ramps.
  function buildDecks() {
    for (const f of FLOORS) {
      if (f.ramp) {
        createFloorRampHardware(T,root,{...f,z1:f.id==='rampe-pont'?-12:f.z1},{low,materials:{steel:M.steel,dark:M.dark,tread:M.grid}});
        if(f.id==='rampe-pont')box(M.grid,f.x1,f.x2,f.from-.16,f.from,f.z1,-12,{skip:[]});
      } else { box(M.grid, f.x1, f.x2, f.height - .16, f.height, f.z1, f.z2, { skip: [] }); box(M.yellow, f.x1, f.x2, f.height - .3, f.height - .16, f.z1, f.z2, { skip: ['top', 'bottom'] }); }
    }
    // Booth: glass front, consoles. Crane: the bridge beams and the cab where Kim hides.
    box(M.glass, -28, -18, HEIGHTS.cabine, HEIGHTS.cabine + 2.4, 43.9, 44, { skip: ['top', 'bottom'] }); piece(M.dark, -23, HEIGHTS.cabine, 51.4, 8, 1, .8); piece(M.screen, -23, HEIGHTS.cabine + 1.02, 51.2, 6, .4, .05);
    piece(M.steel, -18, HEIGHTS.cabine + 1, 48, .06, .06, 8);
    for (const z of [-18.6, -11.4]) piece(M.yellow, 69, 12.6, z, 44, .6, .6);
    piece(M.steel, 69, HEIGHTS.pont + 1, -11.8, 38, .06, .06); for (let x = 50; x <= 88; x += 2) piece(M.steel, x, HEIGHTS.pont, -11.8, .05, 1, .05);
    box(M.yellow, 56, 64, HEIGHTS.pont, HEIGHTS.pont + 2.6, -18, -15.2); box(M.glass, 56.05, 63.95, HEIGHTS.pont + 1, HEIGHTS.pont + 2.4, -15.25, -15.15, { skip: ['top', 'bottom'] });
    for (const [x, z] of [[-27.4, 44.6], [-18.6, 44.6], [-27.4, 51.4], [-18.6, 51.4]]) piece(M.dark, x, 0, z, .5, HEIGHTS.cabine - .16, .5);
    for (let x = 52; x <= 86; x += 8.5) piece(M.dark, x, 0, -12.6, .6, HEIGHTS.pont - .16, .6);
  }
  // Walls from the colliders (sooty brick, chain-link fences), lintels over the openings.
  const WALL = { brick: M.brick, fence: null, wagons: null };
  function buildWalls(obstacles) {
    const lines = new Map();
    for (const o of obstacles) {
      if (o.kind !== 'wall') continue;
      const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
      if (o.look === 'fence') {
        // Chain-link fence: posts and a see-through mesh, barbed wire on top.
        const len = Math.max(o.hx, o.hz) * 2, along = o.hx > o.hz;
        for (let k = 0; k <= len; k += 3) piece(M.steel, along ? x1 + k : o.x, 0, along ? o.z : z1 + k, .1, o.height, .1);
        const net = new T.Mesh(new T.PlaneGeometry(len, o.height - .4), new T.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .6, metalness: .6 }));
        net.position.set(o.x, (o.height - .4) / 2, o.z); if (!along) net.rotation.y = Math.PI / 2; fenceTex.repeat.set(len / 2, (o.height - .4) / 2); add(net);
        piece(M.rust, o.x, o.height - .3, o.z, along ? len : .05, .05, along ? .05 : len); continue;
      }
      box(WALL[o.look] || M.brick, x1, x2, 0, o.height, z1, z2);
      box(M.soot, x1 - .01, x2 + .01, 0, .9, z1 - .01, z2 + .01, { skip: ['top', 'bottom'] });
      const axis = o.hx > o.hz ? 'x' : 'z', fixed = axis === 'x' ? o.z : o.x, key = axis + ':' + fixed.toFixed(2);
      if (!lines.has(key)) lines.set(key, []); lines.get(key).push({ o, a: axis === 'x' ? x1 : z1, b: axis === 'x' ? x2 : z2 });
    }
    for (const [key, spans] of lines) {
      const [axis, f] = key.split(':'), fixed = +f; spans.sort((p, q) => p.a - q.a);
      for (let k = 0; k + 1 < spans.length; k++) {
        const left = spans[k], right = spans[k + 1]; if (right.a - left.b < .2) continue;
        const centre = (left.b + right.a) / 2, h = Math.max(left.o.height, right.o.height), d = DOORS.find(d => d.axis === axis && Math.abs(d.fixed - fixed) < .4 && Math.abs(d.centre - centre) < .6), open = d ? d.height : 6;
        if (open < h - .05) axis === 'x' ? box(M.brick, left.b, right.a, open, h, fixed - .2, fixed + .2) : box(M.brick, fixed - .2, fixed + .2, open, h, left.b, right.a);
        for (const at of [left.b, right.a]) axis === 'x' ? piece(M.yellow, at, 0, fixed, .14, open, .5) : piece(M.yellow, fixed, 0, at, .5, open, .14);
      }
    }
  }
  const fenceTex = canvasTexture(T, 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(150,140,130,.95)'; c.lineWidth = 2.2; for (let k = -64; k < 128; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, 64); c.stroke(); c.beginPath(); c.moveTo(k + 64, 0); c.lineTo(k, 64); c.stroke(); } });
  fenceTex.wrapS = fenceTex.wrapT = T.RepeatWrapping;

  // ---------- Props ----------
  const line = { running: true, chassis: [], arms: [] }, forge = {}, learnt = { ring: null, level: 0 };
  // Rounded volumes (soft-pieces.js) for the vehicles and machines, so nothing reads as a raw cube.
  const soft = (m, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, parent = root) => { const o = new T.Mesh(softCube(T), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); o.castShadow = !low; parent.add(o); stats.meshes++; return o; };
  const tube = (m, a, b, r, parent = root, segs = 10) => { const A = new T.Vector3(...a), B = new T.Vector3(...b), len = A.distanceTo(B), o = new T.Mesh(new T.CylinderGeometry(r, r, len, segs), m); o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), B.clone().sub(A).normalize()); parent.add(o); stats.meshes++; return o; };
  const joint = (m, p, r, parent = root) => { const o = new T.Mesh(new T.SphereGeometry(r, 12, 8), m); o.position.set(...p); parent.add(o); stats.meshes++; return o; };
  function aegisTruck(x, z, w, d) {
    // AEGIS truck back from the Ligne 9 run: cab with windscreen, box body with faded pink and blue bands, wheels with hubs.
    const g = new T.Group(); g.position.set(x, 0, z); add(g); const cabZ = -d / 2 + .9;
    soft(M.graphite, 0, 1.75, cabZ, w * .96, 1.9, 1.8, 0, 0, 0, g); soft(M.glass, 0, 2.25, cabZ - .9, w * .8, .8, .08, -.12, 0, 0, g);
    soft(M.aegis, 0, 2.05, .85, w, 2.5, d - 1.9, 0, 0, 0, g); soft(M.ledMagenta, 0, 2.55, .85, w + .04, .14, d - 2, 0, 0, 0, g); soft(M.ledBlue, 0, 2.25, .85, w + .04, .08, d - 2, 0, 0, 0, g);
    soft(M.dark, 0, .7, 0, w * .9, .4, d - .2, 0, 0, 0, g); soft(M.steel, 0, .8, -d / 2 - .05, w * .9, .3, .2, 0, 0, 0, g);
    for (const s of [-1, 1]) { soft(M.ledWhite, s * w * .32, 1.3, -d / 2 - .12, .3, .16, .06, 0, 0, 0, g); soft(M.ledRed, s * w * .4, 1.2, d / 2 + .02, .2, .3, .05, 0, 0, 0, g); }
    for (const [s, zz] of [[-1, cabZ], [1, cabZ], [-1, d / 2 - 1], [1, d / 2 - 1], [-1, d / 2 - 2.1], [1, d / 2 - 2.1]]) {
      const wheel = new T.Mesh(new T.CylinderGeometry(.52, .52, .42, 20), M.black); wheel.rotation.z = Math.PI / 2; wheel.position.set(s * (w / 2 - .12), .52, zz); g.add(wheel);
      const hub = new T.Mesh(new T.CylinderGeometry(.24, .24, .44, 12), M.steel); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); g.add(hub);
    }
  }
  // The P-0 prototypes, thrown away: a welding arm on its base, a site quadruped's leg, a farm drone with its rotors.
  function weldingArm(px, py, pz, ry, tilt) {
    const g = new T.Group(); g.position.set(px, py, pz); g.rotation.set(tilt, ry, tilt * .5); add(g);
    const base = new T.Mesh(new T.CylinderGeometry(.55, .65, .45, 16), M.yellow); base.position.y = .22; g.add(base);
    joint(M.graphite, [0, .55, 0], .28, g); tube(M.yellow, [0, .55, 0], [.35, 1.9, .2], .16, g); joint(M.graphite, [.35, 1.9, .2], .22, g);
    tube(M.yellow, [.35, 1.9, .2], [1.6, 2.2, .5], .12, g); joint(M.graphite, [1.6, 2.2, .5], .14, g); tube(M.steel, [1.6, 2.2, .5], [1.9, 1.8, .6], .05, g);
    for (const s of [-1, 1]) tube(M.dark, [.1 * s, .7, .15], [.4, 1.7, .3 + .1 * s], .03, g, 6);
  }
  function quadrupedLeg(px, py, pz, ry) {
    const g = new T.Group(); g.position.set(px, py, pz); g.rotation.y = ry; add(g);
    soft(M.rust, 0, .35, 0, .9, .5, .7, 0, 0, .2, g); joint(M.graphite, [.4, .55, 0], .2, g); tube(M.yellow, [.4, .55, 0], [1.4, 1.2, .1], .14, g); joint(M.graphite, [1.4, 1.2, .1], .17, g);
    tube(M.yellow, [1.4, 1.2, .1], [2.3, .2, .2], .11, g); soft(M.dark, 2.35, .12, .2, .5, .16, .4, 0, 0, 0, g);
    tube(M.steel, [.5, .7, .15], [1.3, 1.3, .2], .04, g, 6);
  }
  function farmDrone(px, py, pz, ry, roll) {
    const g = new T.Group(); g.position.set(px, py, pz); g.rotation.set(roll, ry, roll * .6); add(g);
    soft(M.white, 0, 0, 0, .9, .32, .9, 0, 0, 0, g); soft(M.graphite, 0, -.25, 0, .5, .25, .5, 0, 0, 0, g);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4, ex = Math.cos(a) * 1.05, ez = Math.sin(a) * 1.05; tube(M.graphite, [0, 0, 0], [ex, .05, ez], .05, g, 6); const ring = new T.Mesh(new T.TorusGeometry(.38, .03, 6, 20), M.graphite); ring.rotation.x = Math.PI / 2; ring.position.set(ex, .08, ez); g.add(ring); if (k !== 2) { const blade = new T.Mesh(new T.BoxGeometry(.7, .01, .06), M.dark); blade.position.set(ex, .1, ez); blade.rotation.y = rng() * TAU; g.add(blade); } }
    tube(M.steel, [-.3, -.35, 0], [-.3, -.35, .9], .03, g, 6); tube(M.steel, [.3, -.35, 0], [.3, -.35, .9], .03, g, 6);
  }
  // The Brutes on the heavy chain are the game's own Brute model (enemies.js), inert, given by the page.
  function dressLine(factory, { count = 7 } = {}) {
    if (!factory?.create) return 0; let made = 0;
    for (const c of line.chassis) {
      if (made >= count) break;
      let model = null; try { model = factory.create(false, false, 'brute'); } catch { model = null; }
      if (!model) continue;
      model.traverse?.(o => { if (o.isMesh) { o.castShadow = !low; o.frustumCulled = true; } });
      model.scale.setScalar(.95); model.rotation.y = Math.PI; model.position.set(0, 0, 0);
      for (const child of [...c.g.children]) child.visible = false; c.g.add(model); c.real = model; made++;
    }
    stats.realBrutes = made; return made;
  }
  function scrapMound(x, z, r) {
    // A heap of the converted civilian machines: welding arms, quadruped legs, farm drone rotors, rusted plates.
    const n = low ? 14 : 26;
    for (let k = 0; k < n; k++) {
      const a = rng() * TAU, d = rng() * r * .85, h = (1 - d / r) * 2.6, s = .5 + rng() * 1.1, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const kind = k % 4, mat = [M.rust, M.yellow, M.graphite, M.plate][kind];
      piece(mat, px, h * rng(), pz, s * (kind === 1 ? 2.2 : 1.2), s * .5, s * (kind === 1 ? .4 : 1), rng() * TAU);
    }
    // Recognisable machines on the heap (the P-0 prototypes): welding arms, quadruped legs, farm drones.
    const top = 2.2;
    weldingArm(x + (rng() - .5) * r * .6, top * .55, z + (rng() - .5) * r * .6, rng() * TAU, (rng() - .5) * .9);
    quadrupedLeg(x + (rng() - .5) * r * .7, top * .4, z + (rng() - .5) * r * .7, rng() * TAU);
    if (!low) { farmDrone(x + (rng() - .5) * r * .5, top * .8, z + (rng() - .5) * r * .5, rng() * TAU, (rng() - .5) * 1.2); weldingArm(x + (rng() - .5) * r * .9, .1, z + (rng() - .5) * r * .9, rng() * TAU, 1.2); }
  }
  function chassis(x, z, stage) {
    // A Brute in assembly: legs, torso frame, and (from stage 2) armour and the red reactor.
    const g = new T.Group(); g.position.set(x, 1.2, z); add(g);
    for (const s of [-1, 1]) { const leg = new T.Mesh(new T.BoxGeometry(.5, 1.8, .6), M.graphite); leg.position.set(s * .6, .9, 0); g.add(leg); }
    const torso = new T.Mesh(new T.BoxGeometry(1.9, 1.3, 1.2), stage > 0 ? M.graphite : M.steel); torso.position.y = 2.4; g.add(torso);
    if (stage > 1) { const plate = new T.Mesh(new T.BoxGeometry(2.1, .9, .2), M.dark); plate.position.set(0, 2.5, .7); g.add(plate); const core = new T.Mesh(new T.SphereGeometry(.22, 10, 8), M.ledRed); core.position.set(0, 2.5, .82); g.add(core); }
    for (const s of [-1, 1]) { const arm = new T.Mesh(new T.BoxGeometry(.4, 1.6, .45), M.graphite); arm.position.set(s * 1.25, 2.1, 0); g.add(arm); }
    line.chassis.push({ g, z0: z });
  }
  function dress(o) {
    if(o.kind==='fps-cover')return;
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, h = o.height;
    switch (o.kind) {
      case 'wagons': for (const [x, c] of [[-20, M.rust], [-4, M.graphite], [12, M.rust], [28, M.corrugated]]) { const car = createFunctionalProp(T, 'railcar', { w: 14, d: 2.6, h: 4, low, M: { ...M, paintedMetal: c, white: c, glass: M.glass, ledCyan: M.ledYellow } }); car.position.set(x, 0, 97.5); add(car); } break;
      case 'truck': aegisTruck(o.x, o.z, w, d); break;
      case 'container': box(M.rust, x1, x2, 0, h, z1, z2); for (let k = 0; k < 9; k++) piece(M.dark, x1 + .3 + k * (w - .6) / 8, .1, z2 + .01, .05, h - .2, .02); break;
      case 'sleepers': for (let k = 0; k < 6; k++) piece(M.rust, o.x, k * .16, o.z, w, .15, d * (.6 + (k % 2) * .3)); break;
      case 'crates': case 'pallets': for (let k = 0; k < 4; k++) piece(k % 2 ? M.plate : M.rust, o.x + (k % 2 - .5) * o.hx, Math.floor(k / 2) * h / 2, o.z, o.hx * .95, h / 2 - .02, d - .1); break;
      case 'scrap': scrapMound(o.x, o.z, o.mound); break;
      case 'press': box(M.yellow, x1, x2, 0, h * .4, z1, z2); box(M.dark, x1 + .3, x2 - .3, h * .4, h, z1 + .3, z2 - .3); piece(M.steel, o.x, h, o.z, w * .6, .3, d * .6); break;
      case 'furnace': {
        box(M.brick, x1, x2, 0, h * .7, z1, z2); cylinder(M.soot, o.x, h * .7 + 4, o.z, 1.6, 8, { r2: 1.2 });
        const mouth = new T.Mesh(new T.PlaneGeometry(4, 2.6), M.moltenHot); mouth.position.set(o.x, 1.8, z2 + .02); add(mouth);
        const glowPlane = new T.Mesh(new T.PlaneGeometry(9, 6), additive(0xff7a22, .35)); glowPlane.position.set(o.x, 2.5, z2 + .3); add(glowPlane);
        // A channel of molten metal runs from the furnace to the moulds.
        const channel = new T.Mesh(new T.BoxGeometry(1.2, .1, 20), M.molten); channel.position.set(o.x + 6, .08, z2 + 10); add(channel);
        const light = new T.PointLight(0xff7a2a, 160, 40, 1.4); light.position.set(o.x, 3, z2 + 3); add(light);
        Object.assign(forge, { mouth, glowPlane, channel, light }); break;
      }
      case 'ladle': cylinder(M.soot, o.x, h / 2, o.z, o.hx, h, { r2: o.hx * 1.15 }); { const top = new T.Mesh(new T.CircleGeometry(o.hx * 1.05, 24), M.molten); top.rotation.x = -Math.PI / 2; top.position.set(o.x, h + .01, o.z); add(top); } piece(M.steel, o.x, h, o.z, w + 1.2, .3, .3); break;
      case 'moulds': for (let k = 0; k < 3; k++) { piece(M.dark, x1 + .9 + k * (w - 1.8) / 2, 0, o.z, 1.6, h, d); piece(k === 1 ? M.molten : M.soot, x1 + .9 + k * (w - 1.8) / 2, h, o.z, 1.2, .02, d - .4); } break;
      case 'slag': box(M.soot, x1, x2, 0, h, z1, z2); piece(M.molten, o.x, h, o.z, w - 1, .02, d - 1); break;
      case 'cabinet': case 'terminal': { const prop = createFunctionalProp(T, o.kind, { w, d, h, low, M }); prop.position.set(o.x, 0, o.z); add(prop); break; }
      case 'conveyor': {
        box(M.dark, x1, x2, 0, h - .1, z1, z2); box(M.black, x1 + .1, x2 - .1, h - .1, h, z1, z2, { skip: ['bottom'] });
        for (let z = z1; z < z2; z += 1.5) piece(M.steel, o.x, h, z, w, .02, .08);
        for (let k = 0; k < 7; k++) chassis(o.x, z1 + 3 + k * (d - 6) / 6, k % 3);
        break;
      }
      case 'robot-arm': {
        const g = new T.Group(); g.position.set(o.x, 0, o.z); add(g);
        const base = new T.Mesh(new T.CylinderGeometry(.8, .9, .6, 14), M.yellow); base.position.y = .3; g.add(base);
        const a1 = new T.Group(); a1.position.y = .6; g.add(a1); const s1 = new T.Mesh(new T.BoxGeometry(.4, 2, .4), M.yellow); s1.position.y = 1; a1.add(s1);
        const a2 = new T.Group(); a2.position.y = 2; a1.add(a2); const s2 = new T.Mesh(new T.BoxGeometry(.3, .3, 2), M.yellow); s2.position.z = o.x < 68 ? 1 : -1; a2.add(s2);
        const tip = new T.Mesh(new T.SphereGeometry(.12, 8, 6), M.moltenHot); tip.position.z = o.x < 68 ? 2 : -2; a2.add(tip);
        line.arms.push({ a1, a2, tip, phase: rng() * TAU }); break;
      }
      case 'parts': { const rack = createFunctionalProp(T, 'rack', { w: d, d: w, h, low, M }); rack.rotation.y = Math.PI / 2; rack.position.set(o.x, 0, o.z); add(rack); }
        box(M.dark, x1, x2, 0, .2, z1, z2); for (const y of [.9, 1.8]) piece(M.steel, o.x, y, o.z, w, .08, d); for (let k = 0; k < 6; k++) piece(k % 2 ? M.graphite : M.rust, o.x, .98 + (k % 2) * .9, z1 + .5 + Math.floor(k / 2) * (d - 1) / 2, w * .8, .5, .6); break;
      case 'core': {
        cylinder(M.dark, o.x, 1.5, o.z, o.hx, 3, { segments: 32 }); cylinder(M.graphite, o.x, 8, o.z, o.hx - 1.6, 10, { segments: 24, r2: o.hx - 2.4 });
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; piece(M.yellow, o.x + Math.cos(a) * (o.hx + .2), 0, o.z + Math.sin(a) * (o.hx + .2), .5, 3.2, .5, -a); }
        const eye = new T.Mesh(new T.SphereGeometry(1.1, 20, 14), M.ledRed); eye.position.set(o.x, 9, o.z); add(eye);
        const rings = []; for (let k = 0; k < 3; k++) { const r = new T.Mesh(new T.TorusGeometry(3.6 + k, .07, 6, 48), additive(0xff3b4e, .55)); r.position.set(o.x, 5 + k * 3, o.z); r.rotation.x = Math.PI / 2; add(r); rings.push(r); }
        Object.assign(forge, { eye, rings }); break;
      }
      case 'mould-block': box(M.soot, x1, x2, 0, h, z1, z2); piece(M.rust, o.x, h, o.z, w, .05, d); break;
      default: break;
    }
  }
  // Forge sparks, the line moving, the N-08 core breathing, the ring on the spot the N-08 has learnt.
  function buildEffects() {
    const N = low ? 90 : 240, pos = new Float32Array(N * 3), seeds = []; for (let i = 0; i < N; i++) seeds.push({ x: -12 + (rng() - .5) * 8, z: 9 + rng() * 14, y: rng() * 4, v: 1 + rng() * 3, a: rng() * TAU });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const sparks = new T.Points(geo, new T.PointsMaterial({ color: 0xffb050, size: .14, transparent: true, opacity: .95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })); add(sparks);
    Object.assign(forge, { sparks, seeds, pos });
    const ring = new T.Mesh(new T.RingGeometry(6.4, 7, 64), additive(0xff3b4e, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; add(ring); learnt.ring = ring;
  }
  function updateEffects(t, dt) {
    const f = forge;
    if (f.mouth) { const k = .85 + .15 * Math.sin(t * 9) * Math.sin(t * 3.1); f.glowPlane.material.opacity = .25 + .15 * k; f.light.intensity = 130 + 50 * k; }
    if (f.sparks) { f.seeds.forEach((s, i) => { s.y += s.v * dt; s.a += dt; if (s.y > 6) s.y = 0; f.pos[i * 3] = s.x + Math.cos(s.a) * .4; f.pos[i * 3 + 1] = s.y; f.pos[i * 3 + 2] = s.z + Math.sin(s.a) * .4; }); f.sparks.geometry.attributes.position.needsUpdate = true; }
    if (f.eye) { f.eye.scale.setScalar(1 + .08 * Math.sin(t * 4)); f.rings.forEach((r, k) => { r.rotation.z += dt * (.5 + k * .3) * (k % 2 ? -1 : 1); }); }
    const speed = line.running ? 1 : 0;
    for (const c of line.chassis) { c.g.position.z += dt * .35 * speed; if (c.g.position.z > 52) c.g.position.z = -8; }
    for (const a of line.arms) { a.a1.rotation.y = Math.sin(t * .9 * speed + a.phase) * .8; a.a2.rotation.x = Math.sin(t * 1.7 * speed + a.phase) * .4; a.tip.visible = line.running && Math.sin(t * 13 + a.phase) > .2; }
    if (learnt.ring) { learnt.level = Math.max(0, learnt.level - dt * .12); learnt.ring.material.opacity = .15 + .6 * learnt.level * (.6 + .4 * Math.sin(t * 8)); learnt.ring.visible = learnt.level > .01; }
  }

  // ---------- Doors ----------
  const doors = new Map();
  function buildDoors() {
    for(const d of DOORS){
      const model=createIndustrialDoor(T,root,d,{low,materials:{paint:d.style==='hazard'?M.yellow:M.plate,steel:M.steel,dark:M.dark,glass:M.glass}});
      doors.set(d.id,{d,model,state:d.open?'auto':'closed',open:0});
    }
  }
  function updateDoors(dt, p) {
    for (const door of doors.values()) {
      const { d } = door; let target = door.state === 'open' ? 1 : 0;
      if (door.state === 'auto') target = Math.hypot(p.x - (d.axis === 'x' ? d.centre : d.fixed), p.z - (d.axis === 'x' ? d.fixed : d.centre)) < 4.5 ? 1 : 0;
      door.open += Math.sign(target - door.open) * Math.min(Math.abs(target - door.open), dt * 1.4);
      door.model.update(door.open,door.state==='closed');
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
      let control=null;
      if(["commande", "disj-1", "disj-2", "disj-3"].includes(it.id)){
        const mount=new T.Group();mount.rotation.y=Math.abs(it.x)>40?-Math.sign(it.x)*Math.PI/2:0;g.add(mount);
        const post=new T.Mesh(new T.CylinderGeometry(.055,.085,1.12,8),M.dark);post.position.y=.56;mount.add(post);
        control=createModernSwitch(T,mount,{y:1.35,z:.06,scale:.72,variant:switchVariant(it.id),id:it.id,label:it.id.replaceAll('-',' '),onLabel:/disj|stab|balise/.test(it.id)?'CIRCUIT ISOLÉ':'VALIDÉ',low});
      }
      devices.set(it.id, { it, g, gem, ring, control, done: false, available: false });
    }
  }
  function updateDevices(t, dt) {
    const blink = .5 + .5 * Math.sin(t * 5);
    for (const d of devices.values()) {
      d.control?.setState(d.done,{available:d.available,dt});
      const doc = !!d.it.log, color = d.done ? 0x3dff8a : doc ? 0xe8f6ff : d.available ? 0xffb35c : 0x3a2a1a;
      d.gem.material.color.set(color); d.ring.material.color.set(color); d.gem.visible = d.available || doc || d.done; d.ring.visible = d.gem.visible && !d.done;
      d.gem.position.y = 1.9 + Math.sin(t * 2 + d.it.x) * .08; d.gem.rotation.y = t * 1.6; d.ring.material.opacity = d.available ? .25 + .35 * blink : .2;
    }
  }

  // ---------- Signage (rust, hazard yellow, ORDRE red) ----------
  const signs = createSignage(T, { root, low });
  function buildSigns() {
    signs.neon(['FONDERIE DE VESPER-NORD', 'PRODUCTION CONTINUE'], { color: '#ff8a2a', color2: '#ff3b4e', kanji: '鋳造', w: 12, h: 2.4, x: 0, y: 9.4, z: 66.34, yaw: 0 });
    signs.advert('ordre', { w: 8, h: 3.2, x: 30, y: 9, z: 66.34, yaw: 0 });
    signs.hazard('CHANTIER INTERDIT', { sub: 'AUCUN PERSONNEL HUMAIN', picto: 'eye', w: 1.6, h: .8, x: -30.25, y: 2, z: 80, yaw: -Math.PI / 2 });
    signs.wayfinding('HALLE DE COULÉE', { sub: 'FOUR 1 · POCHES · MOULES', jp: '鋳造場', picto: 'bolt', arrow: 0, color: '#ff8a2a', w: 3.4, h: .8, x: -8, y: 7, z: 66.34, yaw: 0 });
    signs.wayfinding('CHAÎNE LOURDE', { sub: 'ASSEMBLAGE · BRUTES', jp: '組立', picto: 'bolt', arrow: -Math.PI / 2, color: '#ffc23a', w: 3.4, h: .8, x: 39.75, y: 7, z: 36, yaw: -Math.PI / 2 });
    signs.hazard('MÉTAL EN FUSION', { sub: 'DISTANCE 3 M', picto: 'phase', w: 1.6, h: .8, x: -18.25, y: 2.4, z: 18, yaw: -Math.PI / 2 });
    signs.neon(['CŒUR · COORDINATION', 'UNITÉ N-08'], { color: '#ff3b4e', kanji: '心', w: 7, h: 1.6, x: 10, y: 7.6, z: -19.66, yaw: Math.PI });
    signs.hazard('ACCÈS AU CŒUR', { sub: 'COORDINATION ACTIVE', picto: 'eye', w: 1.6, h: .8, x: 16, y: 2.4, z: -19.75, yaw: 0 });
    signs.wayfinding('QUAI DE CHARGEMENT', { sub: 'EXPÉDITIONS · WAGONS', jp: '出荷', picto: 'bolt', arrow: Math.PI / 2, color: '#ffc23a', w: 3.4, h: .8, x: -59.75, y: 6, z: -60, yaw: Math.PI / 2 });
    signs.blade('鋳造', { color: '#ff8a2a', sub: 'FONDERIE', x: -30.6, y: 8, z: 60, yaw: 0 });
    signs.blade('組立', { color: '#ffc23a', sub: 'CHAÎNE', x: 40.6, y: 8, z: 50, yaw: 0 });
    signs.advert('helix', { w: 6, h: 2.2, x: 95.7, y: 8, z: 20, yaw: -Math.PI / 2, holo: false });
  }

  // ---------- Light pool ----------
  const sources = [];
  for (const a of AREAS) if (a.roof) for (let x = a.x1 + 6; x < a.x2; x += 12) for (let z = a.z1 + 6; z < a.z2; z += 12) sources.push({ indoor: true, x, y: a.roof - .4, z, color: new T.Color(a.id === 'chaine' ? 0xffd2a0 : 0xffc890), intensity: a.id === 'hangar' ? 26 : 12, range: a.id === 'hangar' ? 22 : 13 });
  for (const [x, z] of [[-20, 80], [20, 80], [-60, 70], [-80, 44], [-50, 40], [-80, -60], [-20, -40], [20, -40], [-30, -84], [30, -84]]) sources.push({ x, y: 9, z, color: new T.Color(0xffc890), intensity: 22, range: 24 });
  function buildFixtures() {
    const indoor=[],outdoor=[];
    for(const s of sources){
      if(!s.indoor){const pole=new T.Mesh(new T.CylinderGeometry(.09,.14,s.y,8),M.steel);pole.position.set(s.x,s.y/2,s.z);add(pole);}
      (s.indoor?indoor:outdoor).push({position:[s.x,s.y+.10,s.z],size:s.indoor?[1,.25,1]:[1.3,.24,.55],color:s.color});
    }
    createIndustrialLightBatch(T,root,indoor,{kind:'highbay',low});createIndustrialLightBatch(T,root,outdoor,{kind:'sodium',low});
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
  function openPortal(x,y,z,{charge=3.2,hold=2.2}={}){
    const effect=createElectricPortal(T,{height:3.6,low,webgpu}),group=effect.group;
    group.position.set(x,y,z);add(group);
    const p={effect,group,age:0,charge,hold,closing:false};portals.push(p);return p;
  }
  function updatePortals(t,dt,eye){
    for(let i=portals.length-1;i>=0;i--){
      const p=portals[i];p.age+=dt;const end=p.charge+p.hold,closingAge=p.age>=end?p.age-end:null;
      if(closingAge!==null&&!p.closing){p.closing=true;onPortalClose(p.group.position);}
      if(eye)p.group.lookAt(eye.x,p.group.position.y,eye.z);
      p.effect.update(t,{age:p.age,closingAge});
      if(closingAge!==null&&closingAge>=PORTAL_CLOSE_SECONDS){p.effect.dispose();portals.splice(i,1);}
    }
  }


  return {
    root, M, openPortal,
    build(obstacles) {
      buildGrounds(); buildDecks(); buildWalls(obstacles); for (const o of obstacles) dress(o); buildEffects(); buildDoors(); buildDevices(); buildSigns(); buildFixtures();
      neons.meshes(); neons.build(); flushGeometry(); flushPieces();
      fpsChapter=createFPSChapter(T,root,{chapter:'m06',obstacles:obstacles,areas:AREAS,low,webgpu});
    },
    update(t, dt, eye, player) {
      fpsChapter?.update(t,dt,eye.position);
      const e = eye.position; updatePool(dt, e); updateEffects(t, dt); updatePortals(t, dt, e); updateDevices(t, dt); if (player) updateDoors(dt, player);
      for (const f of animated) f(t, dt); signs.update(t);
    },
    setDoor(id, open) { const d = doors.get(id); if (d) d.state = open ? (d.d.open ? 'auto' : 'open') : 'closed'; },
    setLine(on) { line.running = !!on; },
    dressLine,
    adapt(spot) { if (!learnt.ring) return; learnt.ring.position.set(spot.x, .05, spot.z); learnt.level = 1; },
    markDone(id, isDone = true) { const d = devices.get(id); if (d) d.done = isDone; },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { ...stats, fps:fpsChapter?.stats(), neons:neons.stats(), portals: portals.length, line: line.running, chassis: line.chassis.length, signs: signs.stats().signs, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])) }; }
  };
}

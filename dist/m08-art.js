import {createWorldEffects} from './webgpu-world-fx.js';
import {createPhotoResponse,metricGround} from './world-material-response.js';
import {createFPSChapter} from './fps-environments.js';
import {createElectricPortal,PORTAL_CLOSE_SECONDS} from './electric-portal.js';
import {createFloorRampHardware} from './stair-hardware.js';
import {createIndustrialLightBatch} from './industrial-light.js';
import {createIndustrialDoor} from './industrial-door.js';
import {createModernSwitch,switchVariant} from './modern-switch.js';
import {createLevelNeons} from './level-neons.js';
// CHAPITRE 08 dressing: the JANUS / HELIX industrial complex of Vesper at night, from the level design map. Wet
// asphalt and steel, magenta neon of JANUS, cyan of the HELIX servers, sodium lamps on the dock. The centrepieces are
// Blender models (tools/blender/m08_assets.py): the JANUS tower and its glowing core, the round supervision chamber,
// the AEGIS dish, the HELIX archive racks, the assembly arms, the JANUS semi-trailers, the roof coolers. Around them:
// the HELIX building with its lit floors, the lift shaft, catwalks, rain, a city skyline and searchlights.
import { AREAS, DOORS, INTERACTIONS, FLOORS, HEIGHTS, TOWER, CHAMBER, HELIX_BUILDING, LIFT } from './m08-layout.js';
import { createSignage } from './signage.js';
import { createFunctionalProp } from './functional-props.js';
import { softCube, splitPieces } from './soft-pieces.js';
import { loadBlenderModels } from './blender-models.js';

const TAU = Math.PI * 2;
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
function canvasTexture(T, w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }

export function createM08Art(T, scene, { quality = 'normal', webgpu=false, onPortalClose=()=>{}, accent = 0xff6fb4 } = {}) {
  const low = quality === 'low', rng = seeded(606);
  const root = new T.Group(); root.name = 'M08 / Les ordres de JANUS'; scene.add(root);
  let fpsChapter=null;
  const animated = [], stats = { meshes: 0, instances: 0, lights: 0 };
  const add = (o, parent = root) => { parent.add(o); stats.meshes++; return o; };

  // ---------- Night over Vesper: wet haze lit from below by the city, magenta and cyan ----------
  scene.background = new T.Color(0x07060d);
  scene.fog = new T.FogExp2(0x1a1024, low ? .0105 : .0085);
  const sky = new T.HemisphereLight(0x9a88c8, 0x3a2430, 1.7); scene.add(sky); scene.add(new T.AmbientLight(0x4a3a5a, .7));
  const sun = new T.DirectionalLight(0x9fb0ff, 1.5); sun.position.set(60, 90, -40); scene.add(sun);   // moonlight through the clouds
  const skyTex = canvasTexture(T, 16, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); for (const [a, col] of [[0, '#05040b'], [.45, '#0f0a1e'], [.62, '#2a1236'], [.72, '#5a1f4a'], [.8, '#1a1024'], [1, '#08060c']]) g.addColorStop(a, col); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  add(new T.Mesh(new T.SphereGeometry(2400, 32, 16), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false })));

  // ---------- Materials ----------
  const loader = new T.TextureLoader(),photo=createPhotoResponse(T,{low});
  const tex = (url, srgb = true) => { const t = loader.load(url); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = low ? 2 : 6; return t; };
  const L9 = n => `./assets/ligne9/l9-${n}_diff_512.jpg`, CC = n => `./assets/cc0/${n}_diff_512.jpg`;
  const std = (color, roughness = .6, metalness = .2, extra = {}) => new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const tiled = (url, color, roughness, metalness, tile, extra = {}) => { const m = std(color, roughness, metalness, { map: tex(url), ...extra }); m.userData.tile = tile; return photo.bind(m,url); };
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

  // ---------- Night materials ----------
  M.wet = std(0x6a6474, .26, .3, { map: tex(CC('vesper-asphalt')) }); M.wet.userData.tile = 4;
  M.concreteDark = tiled(L9('concrete_wall_006'), 0x7a7482, .88, .05, 3);
  M.panel = tiled(L9('metal_plate'), 0x8a8494, .45, .6, 2.5);
  M.window = new T.MeshBasicMaterial({ color: 0x9fc8ff, toneMapped: false, transparent: true, opacity: .55 });
  M.windowPink = new T.MeshBasicMaterial({ color: 0xff7ad0, toneMapped: false, transparent: true, opacity: .6 });
  M.puddle = std(0x0c0b12, .04, .6);
  M.screen = glow(0x3aa0ff); M.ledPink = M.ledMagenta; M.paintGrey = M.aegis; M.rubber = M.black; M.concrete = M.concreteDark;

  // ---------- Grounds, roofs ----------
  const FLOOR = { entree: M.wet, quai: M.wet, antenne: M.wet, ateliers: M.antiSkid, centre: M.plate, securite: M.slab, couloir: M.slab, archives: M.plate, galerie: M.slab, supervision: M.plate, ascenseur: M.plate };
  function buildGrounds() {
    const ground = new T.Mesh(metricGround(T, 220, 220, M.wet.userData.tile), M.wet); ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; add(ground);
    for (const a of AREAS) {
      floorRect(FLOOR[a.id] || M.slab, a.x1, a.x2, a.z1, a.z2, .006);
      if (a.roof) {
        for (let z = a.z1; z < a.z2; z += 12) ceilRect(M.corrugated, a.x1, a.x2, z, Math.min(a.z2, z + 10), a.roof);
        for (let x = a.x1 + 6; x < a.x2; x += 12) piece(M.dark, x, a.roof - 1, (a.z1 + a.z2) / 2, .35, .35, a.z2 - a.z1);
        for (let z = a.z1 + 6; z < a.z2; z += 12) piece(M.ledMagenta, (a.x1 + a.x2) / 2, a.roof - .25, z, a.x2 - a.x1 - 2, .05, .08);
      }
    }
    // Rain puddles on the open grounds, lane markings on the dock, hazard ring around the network core.
    for (const a of AREAS.filter(a => !a.roof)) for (let k = 0; k < (low ? 6 : 14); k++) { const x = a.x1 + 3 + rng() * (a.x2 - a.x1 - 6), z = a.z1 + 3 + rng() * (a.z2 - a.z1 - 6), r = 1 + rng() * 3; piece(M.puddle, x, .012, z, r * 2, .004, r * (1 + rng()), rng() * TAU); }
    for (let x = 0; x < 92; x += 4) piece(M.yellow, x, .01, 46, 2.2, .004, .14);
    for (const x of [28, 52]) for (let z = 50; z < 96; z += 4) piece(M.yellow, x, .01, z, .14, .004, 2.2);
    for (let k = 0; k < 40; k++) { const ang = k / 40 * TAU; piece(k % 2 ? M.yellow : M.black, 20 + Math.cos(ang) * 8, .009, Math.sin(ang) * 8, 1.3, .004, .6, -ang); }
  }
  // Catwalk of the workshops and the antenna roof, with their ramps.
  function buildDecks() {
    for (const f of FLOORS) {
      if (f.ramp) { createFloorRampHardware(T, root, { ...f, z1: f.start }, { low, materials: { steel: M.steel, dark: M.dark, tread: M.grid } }); continue; }
      box(M.grid, f.x1, f.x2, f.height - .16, f.height, f.z1, f.z2, { skip: [] }); box(M.yellow, f.x1, f.x2, f.height - .3, f.height - .16, f.z1, f.z2, { skip: ['top', 'bottom'] });
      piece(M.ledMagenta, (f.x1 + f.x2) / 2, f.height - .32, f.z2 + .02, f.x2 - f.x1, .04, .04);
    }
    for (let x = -76; x <= -28; x += 8) piece(M.dark, x, 0, 41.5, .5, HEIGHTS.passerelle - .16, .5);
    for (const [x, z] of [[81, -96], [96, -96], [81, -75], [96, -75], [88, -86]]) piece(M.dark, x, 0, z, .6, HEIGHTS.toit - .16, .6);
    piece(M.steel, -52, HEIGHTS.passerelle + 1, 42.1, 56, .06, .06); for (let x = -80; x <= -24; x += 2) piece(M.steel, x, HEIGHTS.passerelle, 42.1, .05, 1, .05);
    // Decorative catwalks high in the workshops (as on the map), not walkable.
    for (const z of [18, 62]) { box(M.grid, -96, -8, 7.8, 8, z - 1, z + 1, { skip: [] }); piece(M.yellow, -52, 8.6, z + 1, 88, .05, .05); piece(M.yellow, -52, 8.6, z - 1, 88, .05, .05); }
  }
  // Walls from the colliders (sooty brick, chain-link fences), lintels over the openings.
  const WALL = { panel: M.panel, glass: M.glass, tower: M.concreteDark, chamber: null };
  function buildWalls(obstacles) {
    const lines = new Map();
    for (const o of obstacles) {
      if (o.kind !== 'wall') continue; if (o.look === 'chamber') continue;
      const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz;
      if (o.look === 'fence') {
        // Chain-link fence: posts and a see-through mesh, barbed wire on top.
        const len = Math.max(o.hx, o.hz) * 2, along = o.hx > o.hz;
        for (let k = 0; k <= len; k += 3) piece(M.steel, along ? x1 + k : o.x, 0, along ? o.z : z1 + k, .1, o.height, .1);
        const net = new T.Mesh(new T.PlaneGeometry(len, o.height - .4), new T.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .6, metalness: .6 }));
        net.position.set(o.x, (o.height - .4) / 2, o.z); if (!along) net.rotation.y = Math.PI / 2; fenceTex.repeat.set(len / 2, (o.height - .4) / 2); add(net);
        piece(M.rust, o.x, o.height - .3, o.z, along ? len : .05, .05, along ? .05 : len); continue;
      }
      box(WALL[o.look] || M.concreteDark, x1, x2, 0, o.height, z1, z2);
      box(M.dark, x1 - .01, x2 + .01, 0, .9, z1 - .01, z2 + .01, { skip: ['top', 'bottom'] });
      if (o.height > 7) piece(M.ledMagenta, o.x, o.height - .6, o.z, o.hx > o.hz ? o.hx * 2 : .44, .06, o.hx > o.hz ? .44 : o.hz * 2);
      const axis = o.hx > o.hz ? 'x' : 'z', fixed = axis === 'x' ? o.z : o.x, key = axis + ':' + fixed.toFixed(2);
      if (!lines.has(key)) lines.set(key, []); lines.get(key).push({ o, a: axis === 'x' ? x1 : z1, b: axis === 'x' ? x2 : z2 });
    }
    for (const [key, spans] of lines) {
      const [axis, f] = key.split(':'), fixed = +f; spans.sort((p, q) => p.a - q.a);
      for (let k = 0; k + 1 < spans.length; k++) {
        const left = spans[k], right = spans[k + 1]; if (right.a - left.b < .2) continue;
        const centre = (left.b + right.a) / 2, h = Math.max(left.o.height, right.o.height), d = DOORS.find(d => d.axis === axis && Math.abs(d.fixed - fixed) < .4 && Math.abs(d.centre - centre) < .6), open = d ? d.height : 6;
        if (open < h - .05) axis === 'x' ? box(M.concreteDark, left.b, right.a, open, h, fixed - .2, fixed + .2) : box(M.concreteDark, fixed - .2, fixed + .2, open, h, left.b, right.a);
        for (const at of [left.b, right.a]) axis === 'x' ? piece(M.yellow, at, 0, fixed, .14, open, .5) : piece(M.yellow, fixed, 0, at, .5, open, .14);
      }
    }
  }
  const fenceTex = canvasTexture(T, 64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(150,140,130,.95)'; c.lineWidth = 2.2; for (let k = -64; k < 128; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, 64); c.stroke(); c.beginPath(); c.moveTo(k + 64, 0); c.lineTo(k, 64); c.stroke(); } });
  fenceTex.wrapS = fenceTex.wrapT = T.RepeatWrapping;


  // ---------- Props ----------
  const effects = { core: null, ring: null, drones: [], searchlights: [], rain: null }, learnt = { ring: null, level: 0 };
  const soft = (m, x, y, z, sx, sy, sz, ry = 0, parent = root) => { const o = new T.Mesh(softCube(T), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.y = ry; parent.add(o); stats.meshes++; return o; };
  const deferred = []; let modelsReady = Promise.resolve();
  const BLENDER = { truck: 'truck', 'robot-arm': 'arm', rack: 'rack', cooling: 'cooling', dish: 'dish' };
  function fallbackModels(list) { for (const o of list) box(o.kind === 'rack' ? M.graphite : o.kind === 'truck' ? M.white : M.steel, o.x - o.hx, o.x + o.hx, o.y || 0, (o.y || 0) + o.height, o.z - o.hz, o.z + o.hz); }
  function dress(o) {
    if (o.kind === 'fps-cover') return;
    const x1 = o.x - o.hx, x2 = o.x + o.hx, z1 = o.z - o.hz, z2 = o.z + o.hz, w = o.hx * 2, d = o.hz * 2, h = o.height;
    if (BLENDER[o.kind]) { deferred.push(o); return; }
    switch (o.kind) {
      case 'guardhouse': box(M.concreteDark, x1, x2, 0, h, z1, z2); box(M.glass, x1 - .02, x2 + .02, 1.1, 2.4, z2 - .02, z2 + .02, { skip: ['top', 'bottom', '-x', '+x'] }); piece(M.dark, o.x, h, o.z, w + .6, .25, d + .6); piece(M.ledWhite, o.x, h - .1, z2 + .25, w * .6, .06, .1); break;
      case 'crates': case 'pallets': for (let k = 0; k < 4; k++) piece(k % 2 ? M.plate : M.graphite, o.x + (k % 2 - .5) * o.hx, Math.floor(k / 2) * h / 2, o.z, o.hx * .95, h / 2 - .02, d - .1); break;
      case 'barrier': for (let k = 0; k < 8; k++) piece(k % 2 ? M.yellow : M.black, x1 + (k + .5) * w / 8, .8, o.z, w / 8, .18, .18); piece(M.dark, x1, 0, o.z, .3, 1.1, .3); piece(M.ledRed, x1, 1.1, o.z, .15, .1, .15); break;
      case 'container': box(o.x > 80 ? M.rust : M.graphite, x1, x2, 0, h, z1, z2); for (let k = 0; k < 11; k++) piece(M.dark, x1 + .3 + k * (w - .6) / 10, .1, z2 + .01, .05, h - .2, .02); break;
      case 'booth': box(M.glass, x1, x2, 0, h, z1, z2, { skip: ['bottom'] }); piece(M.dark, o.x, 0, o.z, w - .4, 1, d - .4); piece(M.screen, o.x, 1, o.z - d / 2 + .5, 1.2, .6, .05); piece(M.ledMagenta, o.x, h, o.z, w + .2, .08, d + .2); break;
      case 'bay-dock': box(M.concreteDark, x1, x2, 0, h, z1, z2); piece(M.yellow, o.x, h, z1 + .1, w, .02, .2); for (let x = x1 + 4; x < x2; x += 8) { piece(M.dark, x, h, z2 - .3, 3, 4, .2); piece(M.ledWhite, x, h + 4.2, z2 - .4, 2, .08, .2); } break;
      case 'assembly': box(M.dark, x1, x2, 0, .9, z1, z2); for (let x = x1 + .5; x < x2; x += .9) piece(M.steel, x, .9, o.z, .12, .1, d - .2); piece(M.ledMagenta, o.x, .7, z2 + .02, w, .05, .03); piece(M.ledMagenta, o.x, .7, z1 - .02, w, .05, .03); for (let x = x1 + 3; x < x2 - 2; x += 6) soft(M.graphite, x, 1.35, o.z, 1.8, .9, 1.4); break;
      case 'parts': for (let y = 0; y < 3; y++) { piece(M.steel, o.x, y * 1, o.z, w, .06, d); for (let k = 0; k < 5; k++) piece(k % 2 ? M.yellow : M.graphite, o.x, y + .06, z1 + .6 + k * (d - 1.2) / 4, w * .7, .5, .7); } for (const s of [-1, 1]) piece(M.steel, o.x, 0, o.z + s * (d / 2 - .1), w, 3, .1); break;
      case 'forklift': soft(M.yellow, o.x, .8, o.z + .3, 1.8, 1, 2.6); soft(M.dark, o.x, 1.8, o.z + .5, 1.4, 1.2, 1.4); piece(M.steel, o.x, 0, o.z - 1.6, 1.4, 2.4, .12); for (const s of [-1, 1]) piece(M.steel, o.x + s * .4, .1, o.z - 2.3, .14, .08, 1.4); break;
      case 'core': {
        // The network core of HELIX / JANUS: a glowing magenta column in a glass sleeve, three rotating data rings.
        cylinder(M.dark, o.x, .6, o.z, o.hx + .8, 1.2, { segments: 32 }); cylinder(M.ledMagenta, o.x, h / 2, o.z, o.hx * .45, h, { segments: 24 });
        const sleeve = new T.Mesh(new T.CylinderGeometry(o.hx * .8, o.hx * .8, h - 1.4, 32, 1, true), new T.MeshStandardMaterial({ color: 0x9fb8d8, roughness: .05, metalness: .3, transparent: true, opacity: .22, side: T.DoubleSide })); sleeve.position.set(o.x, h / 2 + .7, o.z); add(sleeve);
        const rings = []; for (let k = 0; k < 3; k++) { const r = new T.Mesh(new T.TorusGeometry(o.hx + .4 + k * .6, .06, 6, 64), additive(k === 1 ? 0x6fd8ff : 0xff4fb4, .8)); r.position.set(o.x, 3 + k * 4, o.z); r.rotation.x = Math.PI / 2; add(r); rings.push(r); }
        const light = new T.PointLight(0xff4fb4, 120, 30, 1.4); light.position.set(o.x, 6, o.z); add(light); effects.core = { rings, light }; break;
      }
      case 'cabinet': { const prop = createFunctionalProp(T, 'cabinet', { w, d, h, low, M }); prop.position.set(o.x, 0, o.z); add(prop); break; }
      case 'console-row': box(M.dark, x1, x2, 0, 1, z1, z2); for (let x = x1 + 1; x < x2 - .5; x += 2) { piece(M.screen, x, 1.05, o.z - .2, 1.6, .9, .05); piece(M.ledBlue, x, 1, z2 + .02, .8, .03, .02); } break;
      case 'desk': box(M.graphite, x1, x2, 0, h, z1, z2); for (const k of [-1, 0, 1]) piece(M.screen, o.x + k * 1.9, h, o.z - .4, 1.7, 1, .05, k * -.25); piece(M.ledRed, o.x, h, z2, w, .03, .04); break;
      case 'drone-rack': for (let y = 0; y < 3; y++) { piece(M.steel, o.x, y * 1, o.z, w, .06, d); for (let k = 0; k < 3; k++) { const dz = z1 + 1.2 + k * (d - 2.4) / 2; soft(M.graphite, o.x, y + .3, dz, .9, .25, .9); piece(M.ledRed, o.x + .46, y + .3, dz, .02, .08, .08); } } break;
      case 'helix-building': helixBuilding(o); break;
      case 'lift-shaft': box(M.dark, x1, x2, o.y || 0, (o.y || 0) + Math.min(h, 22), z1, z2); break;
      case 'pillar': piece(M.dark, o.x, 0, o.z, w, h, d); break;
      case 'rail': piece(M.steel, o.x, o.y || 0, o.z, w, h, d); break;
      default: break;
    }
  }
  // The HELIX building: dark concrete, lit floors behind ribbon windows, magenta trims, roof coolers, the big sign.
  function helixBuilding(o) {
    const { x1, x2, z1, z2, h } = HELIX_BUILDING;
    box(M.concreteDark, x1, x2, 0, h, z1, z2);
    for (let y = 3; y < h - 2; y += 4) {
      piece(rng() < .3 ? M.windowPink : M.window, (x1 + x2) / 2, y, z2 + .03, x2 - x1 - 2, 1.1, .04); piece(M.window, (x1 + x2) / 2, y, z1 - .03, x2 - x1 - 2, 1.1, .04);
      piece(M.window, x1 - .03, y, (z1 + z2) / 2, .04, 1.1, z2 - z1 - 2); piece(rng() < .3 ? M.windowPink : M.window, x2 + .03, y, (z1 + z2) / 2, .04, 1.1, z2 - z1 - 2);
      piece(M.dark, (x1 + x2) / 2, y + 1.6, z2 + .2, x2 - x1, .4, .4);
    }
    piece(M.ledMagenta, (x1 + x2) / 2, h, z2 + .1, x2 - x1, .1, .1); piece(M.ledMagenta, x1 - .1, h, (z1 + z2) / 2, .1, .1, z2 - z1);
    for (const [x, z] of [[54, -20], [68, -20], [54, 0], [68, 0], [54, 20], [68, 20]]) deferred.push({ kind: 'cooling', x, z, y: h, yaw: 0, hx: 3, hz: 3, height: 3 });
  }

  // ---------- Effects: rain, searchlights from the tower, patrolling drones, the city skyline ----------
  function buildEffects() {
    // Rain: streaks recycled in a box around the eye.
    const N = low ? 700 : 1800, pos = new Float32Array(N * 6), seeds = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { seeds[i * 3] = rng() * 40 - 20; seeds[i * 3 + 1] = rng() * 24; seeds[i * 3 + 2] = rng() * 40 - 20; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const rain = new T.LineSegments(geo, new T.LineBasicMaterial({ color: 0x9aa8c8, transparent: true, opacity: .32, depthWrite: false })); rain.frustumCulled = false; add(rain);
    effects.rain = { rain, pos, seeds, N };
    // Two searchlights sweeping from the top of the tower.
    for (let k = 0; k < 2; k++) { const cone = new T.Mesh(new T.ConeGeometry(14, 120, 24, 1, true), additive(k ? 0x9fd8ff : 0xffb0e0, .05)); cone.geometry.translate(0, -60, 0); cone.position.set(TOWER.x, 76, TOWER.z); add(cone); effects.searchlights.push(cone); }
    // Drones patrolling the security room and the dock.
    for (const [cx, cz, r, y, sp] of [[-70, -18, 10, 6, .4], [-62, -26, 7, 5, -.55], [40, 70, 18, 11, .25]]) {
      const g = new T.Group(); soft(M.graphite, 0, 0, 0, .9, .3, .9, 0, g); for (const s of [-1, 1]) for (const t of [-1, 1]) soft(M.dark, s * .6, .05, t * .6, .5, .05, .5, 0, g);
      const eye = new T.Mesh(new T.SphereGeometry(.1, 8, 6), M.ledRed); eye.position.set(0, -.1, .46); g.add(eye); const beam = new T.Mesh(new T.ConeGeometry(1.4, 5, 16, 1, true), additive(0xff3b4e, .06)); beam.geometry.translate(0, -2.5, 0); beam.position.y = -.2; g.add(beam);
      add(g); effects.drones.push({ g, cx, cz, r, y, sp });
    }
    // Vesper at night: towers in silhouette around the complex, lit windows, pink beacons.
    const winTex = canvasTexture(T, 64, 128, (c, w, h) => { c.fillStyle = '#05050a'; c.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 6) for (let x = 3; x < w; x += 6) { if (rng() < .38) { c.fillStyle = rng() < .2 ? '#ff6fc8' : rng() < .5 ? '#ffd9a0' : '#7fc8ff'; c.fillRect(x, y, 3, 3); } } });
    winTex.wrapS = winTex.wrapT = T.RepeatWrapping; winTex.magFilter = T.NearestFilter;
    const cityMat = new T.MeshBasicMaterial({ map: winTex, fog: false, color: 0x8f8fa8 }), beacon = new T.MeshBasicMaterial({ color: 0xff3fb4, fog: false });
    for (let i = 0; i < (low ? 40 : 90); i++) {
      const a = rng() * TAU, d = 260 + rng() * 420, wdt = 18 + rng() * 40, hgt = 40 + rng() * 180 * (rng() < .25 ? 1.8 : 1), g = new T.BoxGeometry(wdt, hgt, wdt * (.6 + rng() * .6));
      const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * wdt / 14, uv.getY(k) * hgt / 26);
      const m = new T.Mesh(g, cityMat); m.position.set(Math.cos(a) * d, hgt / 2 - 4, Math.sin(a) * d); m.rotation.y = rng() * TAU; add(m);
      if (rng() < .4) { const b = new T.Mesh(new T.SphereGeometry(1.4, 8, 6), beacon); b.position.set(m.position.x, hgt, m.position.z); add(b); }
    }
  }
  function updateEffects(t, dt, eye) {
    const c = effects.core; if (c) { c.rings.forEach((r, k) => { r.rotation.z += dt * (.6 + k * .35) * (k % 2 ? -1 : 1); r.position.y = 3 + k * 4 + Math.sin(t * 1.3 + k) * .4; }); c.light.intensity = 110 + 30 * Math.sin(t * 3); }
    effects.searchlights.forEach((s, k) => { s.rotation.set(.55 + .12 * Math.sin(t * .3 + k), t * (.22 + k * .07) + k * Math.PI, 0, 'YXZ'); });
    for (const d of effects.drones) { const a = t * d.sp; d.g.position.set(d.cx + Math.cos(a) * d.r, d.y + Math.sin(t * 1.7 + d.cx) * .3, d.cz + Math.sin(a) * d.r); d.g.rotation.y = -a; }
    const R = effects.rain; if (R && eye) {
      const indoor = !!AREAS.find(a => a.roof && eye.x >= a.x1 && eye.x <= a.x2 && eye.z >= a.z1 && eye.z <= a.z2); R.rain.visible = !indoor;
      for (let i = 0; i < R.N; i++) { let y = R.seeds[i * 3 + 1] - dt * 22; if (y < 0) y += 24; R.seeds[i * 3 + 1] = y; const x = eye.x + R.seeds[i * 3], z = eye.z + R.seeds[i * 3 + 2], yy = eye.y - 4 + y; R.pos.set([x, yy, z, x + .05, yy + .9, z], i * 6); }
      R.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (learnt.ring) { learnt.level = Math.max(0, learnt.level - dt * .12); learnt.ring.material.opacity = .15 + .6 * learnt.level * (.6 + .4 * Math.sin(t * 8)); learnt.ring.visible = learnt.level > .01; }
  }
  // ---------- Blender centrepieces ----------
  function loadModels() {
    const list = deferred.splice(0);
    modelsReady = loadBlenderModels(T, { files: { tower: 'janus_tower', ring: 'supervision_ring', dish: 'dish', rack: 'server_rack', arm: 'robot_arm', truck: 'semi_truck', cooling: 'cooling_unit' }, M, base: './assets/m08/models/', low }).then(lib => {
      lib.place('tower', [{ x: TOWER.x, z: TOWER.z, yaw: 0 }], root); lib.place('ring', [{ x: CHAMBER.x, z: CHAMBER.z, yaw: 0 }], root);
      for (const [kind, key] of Object.entries(BLENDER)) lib.place(key, list.filter(o => o.kind === kind).map(o => ({ x: o.x, y: o.y || 0, z: o.z, yaw: o.yaw || 0 })), root);
      stats.blender = lib.stats;
    }).catch(error => { console.warn('M08 / modèles Blender indisponibles, volumes de repli', error); fallbackModels(list); flushGeometry(); });
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


  const devices = new Map();
  function buildDevices() {
    for (const it of INTERACTIONS) {
      const g = new T.Group(); g.position.set(it.x, it.y || 0, it.z); add(g);
      const gem = new T.Mesh(new T.OctahedronGeometry(.13, 0), glow(0xffb35c)); gem.position.y = 1.9; g.add(gem);
      const ring = new T.Mesh(new T.RingGeometry(.5, .58, 28), additive(0xffb35c, .35)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; g.add(ring);
      if (it.id.startsWith('doc-')) { const paper = new T.Mesh(new T.PlaneGeometry(.3, .4), std(0xe8e1cf, .9, 0, { side: T.DoubleSide })); paper.position.set(0, 1.15, 0); paper.rotation.x = -.3; g.add(paper); }
      let control=null;
      if(["badge", "atelier", "surveillance", "appel"].includes(it.id)){
        const mount=new T.Group();mount.rotation.y=Math.abs(it.x)>40?-Math.sign(it.x)*Math.PI/2:0;g.add(mount);
        const post=new T.Mesh(new T.CylinderGeometry(.055,.085,1.12,8),M.dark);post.position.y=.56;mount.add(post);
        control=createModernSwitch(T,mount,{y:1.35,z:.06,scale:.72,variant:switchVariant(it.id),id:it.id,label:it.id.replaceAll('-',' '),onLabel:it.id==='surveillance'?'SURVEILLANCE COUPÉE':'VALIDÉ',low});
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


  // ---------- Signage (JANUS magenta, HELIX cyan, AEGIS) ----------
  const signs = createSignage(T, { root, low });
  function buildSigns() {
    signs.neon(['JANUS', 'PROGRAMME INDUSTRIEL HELIX'], { color: '#ff4fb4', color2: '#ff9ad8', kanji: 'ヤヌス', w: 16, h: 4, x: 62, y: 14, z: 45.4, yaw: 0 });
    signs.neon(['CENTRE D’INTERCONNEXION', 'CŒUR RÉSEAU HELIX / JANUS'], { color: '#6fd8ff', color2: '#ff4fb4', kanji: '接続', w: 9, h: 2, x: 20, y: 9, z: 30.4, yaw: 0 });
    signs.neon(['HELIX', 'ARCHIVES INDUSTRIELLES'], { color: '#6fd8ff', color2: '#ffffff', kanji: '記録', w: 8, h: 2, x: -70, y: 6.2, z: -39.6, yaw: 0 });
    signs.neon(['AEGIS'], { color: '#9fd8ff', color2: '#ff4fb4', kanji: '盾', w: 5, h: 1.6, x: 88, y: 10, z: -97.6, yaw: 0 });
    signs.neon(['SALLE DE SÉCURITÉ', 'SURVEILLANCE ACTIVE'], { color: '#ff3b4e', kanji: '警備', w: 6, h: 1.6, x: -45.3, y: 6, z: -10, yaw: Math.PI / 2 });
    signs.advert('helix', { w: 6, h: 2.6, x: 75.6, y: 7, z: -10, yaw: -Math.PI / 2, holo: false });
    signs.advert('ordre', { w: 8, h: 3.2, x: -20, y: 7.5, z: 70.3, yaw: 0 });
    signs.wayfinding('QUAI DE LIVRAISON', { sub: 'CONTRÔLE DES BADGES', jp: '搬入', picto: 'bolt', arrow: Math.PI / 2, color: '#ffc890', w: 3.4, h: .8, x: -5.3, y: 5, z: 83, yaw: -Math.PI / 2 });
    signs.wayfinding('ATELIERS JANUS', { sub: 'ASSEMBLAGE · MAINTENANCE', jp: '工房', picto: 'bolt', arrow: 0, color: '#ffc23a', w: 3.4, h: .8, x: -5.3, y: 6, z: 60, yaw: Math.PI / 2 });
    signs.wayfinding('ASCENSEUR DE SERVICE', { sub: 'SORTIE DU COMPLEXE', jp: '昇降機', picto: 'arrow', arrow: Math.PI, color: '#ff8ad0', w: 3.4, h: .8, x: 76.3, y: 5, z: -30, yaw: Math.PI / 2 });
    signs.hazard('ZONE CONTRÔLÉE', { sub: 'BADGE OBLIGATOIRE', picto: 'eye', w: 1.6, h: .8, x: 12, y: 2.6, z: 66.1, yaw: 0 });
    signs.hazard('HAUTE TENSION', { sub: 'NŒUD JANUS', picto: 'bolt', w: 1.6, h: .8, x: 20, y: 2.4, z: 9.2, yaw: 0 });
  }
  // ---------- Light pool ----------
  const sources = [];
  for (const a of AREAS) if (a.roof) for (let x = a.x1 + 6; x < a.x2; x += 12) for (let z = a.z1 + 6; z < a.z2; z += 12) sources.push({ indoor: true, x, y: a.roof - .4, z, color: new T.Color(a.id === 'archives' || a.id === 'centre' ? 0x9fd0ff : a.id === 'securite' ? 0xff8a9a : 0xffd8c0), intensity: 26, range: 22 });
  for (const [x, z] of [[-35, 92], [-15, 76], [10, 92], [30, 56], [56, 92], [80, 66], [92, 50], [84, -50], [94, -62], [-12, 50]]) sources.push({ x, y: 9, z, color: new T.Color(0xffb070), intensity: 30, range: 26 });
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



  const ring = new T.Mesh(new T.RingGeometry(6.4, 7, 64), additive(0xff3b4e, 0)); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; add(ring); learnt.ring = ring;

  return {
    root, M, sun, openPortal, get ready() { return Promise.all([photo.ready, modelsReady]); },
    build(obstacles) {
      buildGrounds(); buildDecks(); buildWalls(obstacles); for (const o of obstacles) dress(o); loadModels();
      buildEffects(); buildDoors(); buildDevices(); buildSigns(); buildFixtures();
      neons.meshes(); neons.build(); flushGeometry(); flushPieces();
    },
    update(t, dt, eye, player) {
      const e = eye.position; updatePool(dt, e); updateEffects(t, dt, e); updatePortals(t, dt, e); updateDevices(t, dt); if (player) updateDoors(dt, player);
      for (const f of animated) f(t, dt); signs.update(t);
    },
    setDoor(id, open) { const d = doors.get(id); if (d) d.state = open ? 'open' : 'closed'; },
    adapt(spot) { if (!learnt.ring) return; learnt.ring.position.set(spot.x, (spot.y || 0) + .05, spot.z); learnt.level = 1; },
    markDone(id, isDone = true) { const d = devices.get(id); if (d) d.done = isDone; },
    setAvailable(list) { const set = new Set(list); for (const [id, d] of devices) d.available = set.has(id); },
    stats() { return { ...stats, photo: photo.stats(), neons: neons.stats(), portals: portals.length, signs: signs.stats().signs, doors: Object.fromEntries([...doors].map(([k, v]) => [k, +v.open.toFixed(2)])) }; }
  };
}
